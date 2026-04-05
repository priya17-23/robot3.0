import { NextResponse } from "next/server";
import {
  buildInterviewSystemPrompt,
  interviewUserPrompt,
  parseJsonFromLlm,
  sanitizeInterviewHistory,
} from "@/lib/interview-llm-prompt";
import {
  rawToAdaptiveQuestion,
  type InterviewHistoryMessage,
  type RawInterviewQuestionJson,
} from "@/lib/interview-openai-types";
import type { Difficulty } from "@/lib/adaptive-interview";

export const runtime = "nodejs";

const DEFAULT_BASE = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";
const REQUEST_MS = 180_000;

export async function POST(req: Request) {
  try {
    const base = (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

    const body = (await req.json()) as {
      difficulty?: number;
      resumeContext?: string;
      jobContext?: string;
      interviewerPersona?: string;
      history?: InterviewHistoryMessage[];
    };

    const difficulty = Math.min(3, Math.max(1, Number(body.difficulty) || 2)) as Difficulty;
    const resumeContext = String(body.resumeContext ?? "").slice(0, 12000);
    const jobContext = String(body.jobContext ?? "").slice(0, 12000);
    const interviewerPersona = String(body.interviewerPersona ?? "").slice(0, 500);
    const sanitizedHistory = sanitizeInterviewHistory(Array.isArray(body.history) ? body.history : []);

    const system = buildInterviewSystemPrompt(difficulty, resumeContext, jobContext, interviewerPersona);
    const userMsg = interviewUserPrompt(sanitizedHistory.length === 0);

    const messages = [
      { role: "system" as const, content: system },
      ...sanitizedHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMsg },
    ];

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_MS);

    let res: Response;
    try {
      res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          format: "json",
          options: { temperature: 0.65 },
        }),
      });
    } catch (e) {
      clearTimeout(t);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json({ error: "Ollama request timed out. Try a smaller model or increase timeout." }, { status: 504 });
      }
      const msg = e instanceof Error ? e.message : "Network error";
      return NextResponse.json(
        {
          error: `Cannot reach Ollama at ${base}. Start Ollama locally and pull a model (e.g. ollama pull ${model}). ${msg}`,
        },
        { status: 503 },
      );
    } finally {
      clearTimeout(t);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Ollama HTTP ${res.status}: ${errText.slice(0, 400) || res.statusText}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { message?: { content?: string }; error?: string };
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }

    const text = data.message?.content;
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Empty response from Ollama" }, { status: 502 });
    }

    let parsed: RawInterviewQuestionJson;
    try {
      parsed = parseJsonFromLlm(text) as RawInterviewQuestionJson;
    } catch (parseErr) {
      const hint = parseErr instanceof Error ? parseErr.message : "parse error";
      return NextResponse.json(
        { error: `Invalid JSON from model: ${hint}. Raw (truncated): ${text.slice(0, 280)}` },
        { status: 502 },
      );
    }

    const question = rawToAdaptiveQuestion(parsed, difficulty);

    return NextResponse.json({
      question,
      model: `ollama:${model}`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[interview/question-ollama]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
