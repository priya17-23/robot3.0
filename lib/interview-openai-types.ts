import type { AdaptiveQuestion, Difficulty } from "@/lib/adaptive-interview";

export type InterviewHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InterviewQuestionRequest = {
  difficulty: Difficulty;
  resumeContext: string;
  jobContext: string;
  interviewerPersona: string;
  history: InterviewHistoryMessage[];
};

/** Raw JSON from the model (validated server-side). */
export type RawInterviewQuestionJson = {
  type?: string;
  question?: string;
  hint?: string;
  keywords?: string[];
  choices?: { id?: string; label?: string; correct?: boolean }[];
};

export function rawToAdaptiveQuestion(raw: RawInterviewQuestionJson, difficulty: Difficulty): AdaptiveQuestion {
  const type = raw.type === "mcq" ? "mcq" : "open";
  const prompt = (raw.question ?? "Describe a project you contributed to and your specific responsibilities.").trim();

  const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (type === "mcq" && Array.isArray(raw.choices) && raw.choices.length >= 2) {
    const choices = raw.choices
      .map((c, i) => ({
        id: (c.id && String(c.id)) || String.fromCharCode(97 + i),
        label: String(c.label ?? `Option ${i + 1}`),
        correct: Boolean(c.correct),
      }))
      .slice(0, 6);
    const correctCount = choices.filter((c) => c.correct).length;
    if (correctCount !== 1) {
      choices.forEach((c, i) => {
        c.correct = i === 0;
      });
    }
    return {
      id,
      difficulty,
      type: "mcq",
      prompt,
      hint: raw.hint?.trim() || undefined,
      choices,
    };
  }

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean).slice(0, 12)
    : undefined;

  return {
    id,
    difficulty,
    type: "open",
    prompt,
    hint: raw.hint?.trim() || undefined,
    keywords: keywords?.length ? keywords : undefined,
  };
}
