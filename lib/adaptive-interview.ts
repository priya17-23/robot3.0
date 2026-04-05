export type Difficulty = 1 | 2 | 3;

export type AdaptiveQuestion = {
  id: string;
  difficulty: Difficulty;
  type: "mcq" | "open";
  prompt: string;
  hint?: string;
  choices?: { id: string; label: string; correct: boolean }[];
  /** For open prompts: optional keywords for lightweight content scoring */
  keywords?: string[];
};

export type ToneHesitationLabel = "fluent" | "some_hesitation" | "hesitant";

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export type PerformanceAnalysis = {
  overallScore: number;
  contentScore: number;
  confidence: { score: number; label: string; detail: string };
  speechClarity: { score: number; label: string; detail: string };
  toneHesitation: { score: number; label: ToneHesitationLabel; detail: string };
  sentiment: { score: number; label: SentimentLabel; detail: string };
  voiceModulation: { score: number; label: string; detail: string };
  fillerCount: number;
  hintUsed: boolean;
};

const POSITIVE_LEX = new Set([
  "confident",
  "clear",
  "comfortable",
  "prepared",
  "happy",
  "excited",
  "enjoy",
  "solid",
  "sure",
  "definitely",
  "strong",
  "good",
  "great",
  "well",
  "learned",
  "improved",
]);

const NEGATIVE_LEX = new Set([
  "nervous",
  "unsure",
  "difficult",
  "hard",
  "struggle",
  "confused",
  "forgot",
  "bad",
  "worried",
  "scared",
  "stuck",
  "no idea",
  "don't know",
  "cant",
  "can't",
]);

const FILLER_RE =
  /\b(um|uh|erm|er|like|you know|i mean|sort of|kind of|basically|actually)\b/gi;

export function countFillers(text: string): number {
  const m = text.toLowerCase().match(FILLER_RE);
  return m ? m.length : 0;
}

/** Lexicon-based polarity in [-1, 1] for transparent client-side sentiment. */
export function sentimentPolarity(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (POSITIVE_LEX.has(w)) pos++;
    if (NEGATIVE_LEX.has(w)) neg++;
  }
  const t = pos + neg;
  if (t === 0) return 0;
  return (pos - neg) / t;
}

export function sentimentLabel(polarity: number): SentimentLabel {
  if (polarity > 0.25) return "positive";
  if (polarity < -0.25) return "negative";
  if (polarity === 0) return "neutral";
  return "mixed";
}

export function scoreMcq(correct: boolean): number {
  return correct ? 100 : 35;
}

export function scoreOpenByKeywords(text: string, keywords: string[] | undefined): number {
  if (!keywords?.length) {
    const trimmed = text.trim();
    if (trimmed.length < 8) return 25;
    if (trimmed.length < 40) return 55;
    return 72;
  }
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k.toLowerCase()));
  return Math.round((hits.length / keywords.length) * 100);
}

/** RMS samples in [0, ~1]; returns mean energy and variability (modulation proxy). */
export function summarizeVoiceModulation(rmsSamples: number[]): {
  meanRms: number;
  variability: number;
} {
  if (!rmsSamples.length) return { meanRms: 0, variability: 0 };
  const mean = rmsSamples.reduce((a, b) => a + b, 0) / rmsSamples.length;
  const variance =
    rmsSamples.reduce((s, x) => s + (x - mean) ** 2, 0) / rmsSamples.length;
  const stdev = Math.sqrt(variance);
  const variability = mean > 0.008 ? stdev / mean : stdev * 80;
  return { meanRms: mean, variability };
}

export function buildPerformanceAnalysis(input: {
  transcript: string;
  recognitionConfidence: number | null;
  rmsSamples: number[];
  contentScore: number;
  hintUsed: boolean;
}): PerformanceAnalysis {
  const t = input.transcript.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const fillers = countFillers(t);
  const fillerRatio = words > 0 ? fillers / words : 0;

  const { meanRms, variability } = summarizeVoiceModulation(input.rmsSamples);

  // Confidence: level + stability (modulation) — heuristic proxy, not clinical
  const levelScore = Math.min(100, Math.round(meanRms * 420 + words * 2.5));
  const modBoost = Math.min(25, variability * 35);
  const confRaw = Math.round(levelScore * 0.65 + modBoost);
  const confidenceScore = Math.max(0, Math.min(100, confRaw));
  const confidenceLabel =
    confidenceScore >= 70 ? "Strong vocal presence" : confidenceScore >= 45 ? "Moderate presence" : "Quiet or uneven level";

  // Clarity: length + STT confidence
  let clarityScore = 40;
  if (words >= 25) clarityScore += 30;
  else if (words >= 12) clarityScore += 18;
  else if (words >= 5) clarityScore += 8;
  if (input.recognitionConfidence != null) {
    clarityScore = Math.round(clarityScore * 0.45 + input.recognitionConfidence * 100 * 0.55);
  }
  clarityScore = Math.max(0, Math.min(100, clarityScore));
  const clarityLabel =
    clarityScore >= 72 ? "Clear structure" : clarityScore >= 50 ? "Adequate detail" : "Very brief or hard to parse";

  // Hesitation from fillers + short answers
  const hesitationPenalty = Math.min(55, fillerRatio * 220 + (words < 8 ? 22 : 0));
  const toneScore = Math.max(0, Math.round(100 - hesitationPenalty));
  let toneLabel: ToneHesitationLabel = "fluent";
  if (toneScore < 55) toneLabel = "hesitant";
  else if (toneScore < 75) toneLabel = "some_hesitation";

  const pol = sentimentPolarity(t);
  const sentLabel = sentimentLabel(pol);
  const sentimentScore = Math.round(50 + pol * 50);

  const modScore = Math.max(0, Math.min(100, Math.round(40 + variability * 45 + meanRms * 120)));
  const modLabel =
    modScore >= 62 ? "Expressive dynamics" : modScore >= 42 ? "Steady delivery" : "Flat or very soft";

  const blended =
    input.contentScore * 0.38 +
    confidenceScore * 0.18 +
    clarityScore * 0.18 +
    toneScore * 0.14 +
    sentimentScore * 0.07 +
    modScore * 0.05;

  const hintPenalty = input.hintUsed ? 8 : 0;
  const overallScore = Math.max(0, Math.min(100, Math.round(blended - hintPenalty)));

  return {
    overallScore,
    contentScore: input.contentScore,
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      detail: `Mic level proxy ${(meanRms * 100).toFixed(0)}% · ${words} words`,
    },
    speechClarity: {
      score: clarityScore,
      label: clarityLabel,
      detail:
        input.recognitionConfidence != null
          ? `STT confidence ~${Math.round(input.recognitionConfidence * 100)}%`
          : "STT confidence n/a",
    },
    toneHesitation: {
      score: toneScore,
      label: toneLabel,
      detail: `${fillers} filler token(s); ${(fillerRatio * 100).toFixed(0)}% filler rate`,
    },
    sentiment: {
      score: sentimentScore,
      label: sentLabel,
      detail: `Lexicon polarity ${pol.toFixed(2)} (−1 negative … +1 positive)`,
    },
    voiceModulation: {
      score: modScore,
      label: modLabel,
      detail: `RMS variability CV≈${variability.toFixed(2)} (energy dynamics)`,
    },
    fillerCount: fillers,
    hintUsed: input.hintUsed,
  };
}

export function adjustDifficulty(current: Difficulty, performanceScore: number): Difficulty {
  if (performanceScore >= 78) return Math.min(3, current + 1) as Difficulty;
  if (performanceScore < 48) return Math.max(1, current - 1) as Difficulty;
  return current;
}

export const ADAPTIVE_QUESTION_BANK: AdaptiveQuestion[] = [
  {
    id: "e-mcq-1",
    difficulty: 1,
    type: "mcq",
    prompt: "What does Big O describe?",
    hint: "Think about how work grows as input size grows—not the exact milliseconds.",
    choices: [
      { id: "a", label: "Exact runtime in seconds on a machine", correct: false },
      { id: "b", label: "How resource usage scales with input size", correct: true },
      { id: "c", label: "Memory used by the compiler only", correct: false },
    ],
  },
  {
    id: "e-open-1",
    difficulty: 1,
    type: "open",
    prompt: "In one or two sentences, what is a REST API?",
    hint: "Mention HTTP, resources, and statelessness if you can.",
    keywords: ["http", "resource", "stateless", "client", "server", "json"],
  },
  {
    id: "m-mcq-1",
    difficulty: 2,
    type: "mcq",
    prompt: "Which structure is best for O(1) average lookups by key?",
    choices: [
      { id: "a", label: "Sorted array", correct: false },
      { id: "b", label: "Hash map / dictionary", correct: true },
      { id: "c", label: "Linked list", correct: false },
    ],
  },
  {
    id: "m-open-1",
    difficulty: 2,
    type: "open",
    prompt: "How would you prevent double-submits on a payments button?",
    keywords: ["idempotent", "token", "disable", "debounce", "queue", "lock", "transaction"],
  },
  {
    id: "h-mcq-1",
    difficulty: 3,
    type: "mcq",
    prompt: "In a distributed system, what does CAP sacrifice when you guarantee partition tolerance and availability?",
    choices: [
      { id: "a", label: "Consistency (linearizability)", correct: true },
      { id: "b", label: "Network bandwidth only", correct: false },
      { id: "c", label: "Nothing—CAP is obsolete", correct: false },
    ],
  },
  {
    id: "h-open-1",
    difficulty: 3,
    type: "open",
    prompt: "Sketch how you would design a rate limiter for a public API.",
    keywords: ["token", "bucket", "sliding", "redis", "counter", "window", "per", "ip", "header", "429"],
  },
];

export function questionsForDifficulty(d: Difficulty): AdaptiveQuestion[] {
  return ADAPTIVE_QUESTION_BANK.filter((q) => q.difficulty === d);
}

export function pickQuestion(
  d: Difficulty,
  used: Set<string>,
): AdaptiveQuestion | null {
  const pool = questionsForDifficulty(d).filter((q) => !used.has(q.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
