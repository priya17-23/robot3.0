import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildInterviewSystemPrompt,
  interviewUserPrompt,
  sanitizeInterviewHistory,
} from "@/lib/interview-llm-prompt";
import {
  rawToAdaptiveQuestion,
  type InterviewHistoryMessage,
  type RawInterviewQuestionJson,
} from "@/lib/interview-openai-types";
import type { Difficulty } from "@/lib/adaptive-interview";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server missing OPENAI_API_KEY. Add it to .env.local and restart the dev server." },
        { status: 503 },
      );
    }

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userPrompt = interviewUserPrompt(sanitizedHistory.length === 0);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildInterviewSystemPrompt(difficulty, resumeContext, jobContext, interviewerPersona),
        },
        ...sanitizedHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    }

    let parsed: RawInterviewQuestionJson;
    try {
      parsed = JSON.parse(text) as RawInterviewQuestionJson;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    const question = rawToAdaptiveQuestion(parsed, difficulty);

    return NextResponse.json({
      question,
      model: MODEL,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[interview/question]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
