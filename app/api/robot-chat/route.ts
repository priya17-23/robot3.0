import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OLLAMA_DEFAULT_BASE = "http://127.0.0.1:11434";
const OLLAMA_DEFAULT_MODEL = "llama3.2";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const REQUEST_MS = 120_000;

type ChatTurn = { role: "user" | "assistant"; content: string };

function sanitizeMessages(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const m of raw) {
    if (
      m != null &&
      typeof m === "object" &&
      (m as ChatTurn).role &&
      ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant") &&
      typeof (m as ChatTurn).content === "string"
    ) {
      const c = (m as ChatTurn).content.trim();
      if (c.length) out.push({ role: (m as ChatTurn).role, content: c.slice(0, 12000) });
    }
  }
  return out.slice(-40);
}

function buildSystemPrompt(personaLine: string): string {
  return `You are ${personaLine}, a capable AI assistant embodied as a futuristic placement-prep robot avatar on the user's screen.

The user may ask anything: coding, algorithms, system design, interview behavior, career advice, study plans, definitions, debugging ideas, or general knowledge.

Rules:
- Be accurate; if uncertain, say so briefly.
- Prefer concise answers; offer to go deeper if the topic warrants it.
- Plain text only: no markdown headings, no **bold**, no \`code fences\`. Short bullet lines with a leading "- " are OK for lists.
- This reply may be read aloud by text-to-speech, so avoid symbols that sound bad when spoken.`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      provider?: string;
      messages?: ChatTurn[];
      persona?: string;
    };

    const provider = body.provider === "openai" ? "openai" : "ollama";
    const history = sanitizeMessages(body.messages);
    const personaLine = String(body.persona ?? "a helpful AI interviewer robot").slice(0, 400);
    const system = buildSystemPrompt(personaLine);

    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY is not set. Use Ollama mode for offline, or add the key to .env.local." },
          { status: 503 },
        );
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.55,
        max_tokens: 1200,
        messages: [
          { role: "system", content: system },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      const reply = completion.choices[0]?.message?.content?.trim();
      if (!reply) {
        return NextResponse.json({ error: "Empty reply from OpenAI" }, { status: 502 });
      }
      return NextResponse.json({ reply, provider: "openai", model: OPENAI_MODEL });
    }

    const base = (process.env.OLLAMA_BASE_URL ?? OLLAMA_DEFAULT_BASE).replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL ?? OLLAMA_DEFAULT_MODEL;

    const ollamaMessages = [
      { role: "system" as const, content: system },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
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
          messages: ollamaMessages,
          stream: false,
          options: { temperature: 0.55, num_predict: 900 },
        }),
      });
    } catch (e) {
      clearTimeout(t);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json({ error: "Ollama request timed out." }, { status: 504 });
      }
      const msg = e instanceof Error ? e.message : "Network error";
      return NextResponse.json(
        { error: `Cannot reach Ollama at ${base}. Run ollama serve and pull a model. ${msg}` },
        { status: 503 },
      );
    } finally {
      clearTimeout(t);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Ollama HTTP ${res.status}: ${errText.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { message?: { content?: string }; error?: string };
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }
    const reply = data.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: "Empty reply from Ollama" }, { status: 502 });
    }

    return NextResponse.json({ reply, provider: "ollama", model: `ollama:${model}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[robot-chat]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
