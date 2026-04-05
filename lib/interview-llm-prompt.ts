import type { Difficulty } from "@/lib/adaptive-interview";
import type { InterviewHistoryMessage } from "@/lib/interview-openai-types";

export function difficultyLabelForLlm(d: Difficulty): string {
  if (d === 1) return "easy (shorter, more guided; include a helpful hint when useful)";
  if (d === 2) return "standard placement level";
  return "challenging (deeper follow-ups, system design or nuanced behavioral)";
}

export function buildInterviewSystemPrompt(
  difficulty: Difficulty,
  resumeContext: string,
  jobContext: string,
  interviewerPersona: string,
): string {
  return `You are a mock placement interviewer for students. You speak as: ${interviewerPersona || "a professional interviewer"}.

Difficulty for this turn: ${difficultyLabelForLlm(difficulty)}.

Candidate resume / background (may be empty):
${resumeContext || "(none provided)"}

Target role / job description (may be empty):
${jobContext || "(none provided)"}

You MUST remember the full conversation history. Ask ONE next question that naturally follows what was already discussed—probe deeper, clarify tradeoffs, or move to an adjacent topic the candidate mentioned. Do not repeat a question that was already asked.

Respond with a single JSON object ONLY (no markdown fences), with this shape:
{
  "type": "open" | "mcq",
  "question": "string — the exact question to read aloud",
  "hint": "optional string — brief hint if difficulty is easy or candidate may be stuck",
  "keywords": ["optional strings for open questions — concepts a strong answer might mention"],
  "choices": [optional, only if type is mcq — exactly 3 or 4 items: {"id":"a","label":"text","correct":true|false}, exactly ONE correct true]
}

Prefer "open" for behavioral and discussion; use "mcq" for quick knowledge checks. Keep questions concise.`;
}

export function interviewUserPrompt(historyEmpty: boolean): string {
  return historyEmpty
    ? "Start the mock interview: ask the first question now as JSON."
    : "The candidate answered your last question. Ask the next appropriate interview question as JSON, using the conversation so far.";
}

export function sanitizeInterviewHistory(history: InterviewHistoryMessage[]): InterviewHistoryMessage[] {
  return history
    .filter(
      (m): m is InterviewHistoryMessage =>
        m != null &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 8000),
    }))
    .slice(-24);
}

/** Ollama / local models sometimes wrap JSON in markdown—strip and parse. */
export function parseJsonFromLlm(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        /* fall through */
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON from model output");
  }
}
