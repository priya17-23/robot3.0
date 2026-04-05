"use client";

import * as React from "react";
import {
  Brain,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { cancelBrowserSpeech } from "@/lib/browser-tts";
import {
  adjustDifficulty,
  buildPerformanceAnalysis,
  pickQuestion,
  scoreMcq,
  scoreOpenByKeywords,
  type AdaptiveQuestion,
  type Difficulty,
  type PerformanceAnalysis,
} from "@/lib/adaptive-interview";
import type { InterviewHistoryMessage } from "@/lib/interview-openai-types";

export type InterviewLlmMode = "local" | "ollama" | "openai";

type AdaptiveInterviewPanelProps = {
  /** Same TTS path as the 3D avatar so jaw sync stays correct */
  speakPrompt: (text: string) => void;
  stopSpeaking: () => void;
  speechSupported: boolean;
  /** Shown to the model (e.g. selected 3D persona name + role) */
  interviewerPersona: string;
};

/** Narrow DOM typings: `SpeechRecognition` is missing in some TS lib configurations. */
type SpeechRecognitionResultItem = { transcript: string; confidence: number };

type SpeechRecognitionResultListItem = {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultListItem> & { length: number };
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function scoreMcqSubmission(
  q: AdaptiveQuestion,
  selectedChoiceId: string | null,
  transcript: string,
): { score: number; correct: boolean } {
  if (q.type !== "mcq" || !q.choices) return { score: 0, correct: false };
  const correct = q.choices.find((c) => c.correct);
  if (!correct) return { score: 0, correct: false };

  if (selectedChoiceId) {
    const ok = selectedChoiceId === correct.id;
    return { score: scoreMcq(ok), correct: ok };
  }

  const lower = transcript.toLowerCase();
  const label = correct.label.toLowerCase();
  const words = label.split(/\s+/).filter((x) => x.length > 3);
  const hit = words.some((w) => lower.includes(w));
  if (hit) return { score: 82, correct: true };
  return { score: scoreMcq(false), correct: false };
}

function difficultyLabel(d: Difficulty): string {
  if (d === 1) return "Easier + hints available";
  if (d === 2) return "Standard";
  return "Challenging";
}

export function AdaptiveInterviewPanel({
  speakPrompt,
  stopSpeaking,
  speechSupported,
  interviewerPersona,
}: AdaptiveInterviewPanelProps) {
  const [active, setActive] = React.useState(false);
  const [difficulty, setDifficulty] = React.useState<Difficulty>(2);
  const [usedIds, setUsedIds] = React.useState<Set<string>>(() => new Set());
  const [question, setQuestion] = React.useState<AdaptiveQuestion | null>(null);
  const [phase, setPhase] = React.useState<"idle" | "listen" | "done">("idle");
  const [hintVisible, setHintVisible] = React.useState(false);
  const [hintUsedThisRound, setHintUsedThisRound] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [manualText, setManualText] = React.useState("");
  const [selectedChoice, setSelectedChoice] = React.useState<string | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<PerformanceAnalysis | null>(null);
  const [lastRecognitionConfidence, setLastRecognitionConfidence] = React.useState<number | null>(null);
  const [srSupported, setSrSupported] = React.useState(false);
  const [llmMode, setLlmMode] = React.useState<InterviewLlmMode>("ollama");
  const remoteLlm = llmMode === "ollama" || llmMode === "openai";
  const [resumeNotes, setResumeNotes] = React.useState("");
  const [jobNotes, setJobNotes] = React.useState("");
  const [loadingAi, setLoadingAi] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  /** Q&A pairs sent to OpenAI (for display; threadRef is source of truth) */
  const [memoryPairs, setMemoryPairs] = React.useState(0);

  const rmsRef = React.useRef<number[]>([]);
  const audioCleanupRef = React.useRef<(() => void) | null>(null);
  const recRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const rafRef = React.useRef<number | null>(null);
  /** Conversation memory for ChatGPT: alternating assistant questions and user answers */
  const threadRef = React.useRef<InterviewHistoryMessage[]>([]);

  React.useEffect(() => {
    setSrSupported(!!getSpeechRecognitionCtor());
  }, []);

  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      audioCleanupRef.current?.();
      recRef.current?.stop();
      cancelBrowserSpeech();
    };
  }, []);

  const stopRecordingPipeline = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioCleanupRef.current?.();
    audioCleanupRef.current = null;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setRecording(false);
  }, []);

  const startRecordingPipeline = React.useCallback(async () => {
    rmsRef.current = [];
    setTranscript("");
    setLastRecognitionConfidence(null);

    const SR = getSpeechRecognitionCtor();
    if (SR) {
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      let finals = "";
      let lastConf = 0;
      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const chunk = res[0].transcript;
          if (res.isFinal) {
            finals += chunk;
            const c = res[0].confidence;
            if (typeof c === "number" && !Number.isNaN(c)) lastConf = c;
          } else {
            interim += chunk;
          }
        }
        setTranscript(`${finals}${interim}`.trim());
        if (lastConf > 0) setLastRecognitionConfidence(lastConf);
      };
      recognition.onerror = () => {
        /* keep partial transcript */
      };
      try {
        recognition.start();
        recRef.current = recognition;
      } catch {
        recRef.current = null;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i];
          sum += v * v;
        }
        rmsRef.current.push(Math.sqrt(sum / buf.length));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      audioCleanupRef.current = () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    } catch {
      /* mic denied — STT-only or typed answer still works */
    }

    setRecording(true);
  }, []);

  const loadAiQuestion = React.useCallback(
    async (overrideDifficulty?: Difficulty) => {
    const level = overrideDifficulty ?? difficulty;
    setLoadingAi(true);
    setApiError(null);
    try {
      const url =
        llmMode === "openai" ? "/api/interview/question" : "/api/interview/question-ollama";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: level,
          resumeContext: resumeNotes.trim(),
          jobContext: jobNotes.trim(),
          interviewerPersona,
          history: threadRef.current,
        }),
      });
      const data = (await res.json()) as { error?: string; question?: AdaptiveQuestion };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.question) {
        throw new Error("Invalid response: missing question");
      }
      setQuestion(data.question);
      speakPrompt(data.question.prompt);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Could not load question");
      setQuestion(null);
    } finally {
      setLoadingAi(false);
    }
  },
  [difficulty, resumeNotes, jobNotes, interviewerPersona, speakPrompt, llmMode],
);

  const drawQuestion = React.useCallback(
    (d: Difficulty, used: Set<string>) => {
      let q = pickQuestion(d, used);
      if (!q) {
        speakPrompt("You have completed this difficulty band. I will reset the question set.");
        const cleared = new Set<string>();
        setUsedIds(cleared);
        q = pickQuestion(d, cleared);
        setQuestion(q);
        if (q) speakPrompt(q.prompt);
        return;
      }
      setQuestion(q);
      speakPrompt(q.prompt);
    },
    [speakPrompt],
  );

  const beginSession = React.useCallback(async () => {
    stopSpeaking();
    setActive(true);
    setAnalysis(null);
    setPhase("idle");
    setHintVisible(false);
    setHintUsedThisRound(false);
    setSelectedChoice(null);
    setManualText("");
    setTranscript("");
    setApiError(null);
    const used = new Set<string>();
    setUsedIds(used);
    setDifficulty(2);

    if (remoteLlm) {
      threadRef.current = [];
      setMemoryPairs(0);
      await loadAiQuestion(2);
    } else {
      drawQuestion(2, used);
    }
  }, [drawQuestion, stopSpeaking, remoteLlm, loadAiQuestion]);

  const revealHint = React.useCallback(() => {
    if (!question?.hint) return;
    setHintVisible(true);
    setHintUsedThisRound(true);
    speakPrompt(`Hint: ${question.hint}`);
  }, [question, speakPrompt]);

  const submitAnswer = React.useCallback(() => {
    if (!question) return;
    stopRecordingPipeline();

    const textBody = `${transcript}\n${manualText}`.trim();

    if (remoteLlm) {
      threadRef.current = [
        ...threadRef.current,
        { role: "assistant", content: question.prompt },
        { role: "user", content: textBody || "(no answer provided)" },
      ];
      setMemoryPairs(threadRef.current.length / 2);
    }

    let contentScore = 0;
    if (question.type === "mcq") {
      const { score } = scoreMcqSubmission(question, selectedChoice, textBody);
      contentScore = score;
    } else {
      contentScore = scoreOpenByKeywords(textBody, question.keywords);
    }

    const analysisResult = buildPerformanceAnalysis({
      transcript: textBody,
      recognitionConfidence: lastRecognitionConfidence,
      rmsSamples: rmsRef.current,
      contentScore,
      hintUsed: hintUsedThisRound,
    });

    setAnalysis(analysisResult);
    const nextD = adjustDifficulty(difficulty, analysisResult.overallScore);
    setDifficulty(nextD);

    const usedNext = new Set(usedIds);
    usedNext.add(question.id);
    setUsedIds(usedNext);

    const recap = `Your overall band is ${analysisResult.overallScore} out of 100. Next, I will tune difficulty to ${difficultyLabel(nextD)}.`;
    speakPrompt(recap);

    setPhase("done");
  }, [
    question,
    transcript,
    manualText,
    selectedChoice,
    lastRecognitionConfidence,
    hintUsedThisRound,
    difficulty,
    usedIds,
    stopRecordingPipeline,
    speakPrompt,
    remoteLlm,
  ]);

  const nextQuestion = React.useCallback(async () => {
    stopSpeaking();
    setPhase("idle");
    setAnalysis(null);
    setHintVisible(false);
    setHintUsedThisRound(false);
    setSelectedChoice(null);
    setManualText("");
    setTranscript("");
    setApiError(null);
    if (remoteLlm) {
      await loadAiQuestion();
    } else {
      drawQuestion(difficulty, usedIds);
    }
  }, [difficulty, usedIds, drawQuestion, stopSpeaking, remoteLlm, loadAiQuestion]);

  const resetSession = React.useCallback(() => {
    stopRecordingPipeline();
    stopSpeaking();
    setActive(false);
    setQuestion(null);
    setAnalysis(null);
    setUsedIds(new Set());
    setDifficulty(2);
    setPhase("idle");
    threadRef.current = [];
    setApiError(null);
    setLoadingAi(false);
    setMemoryPairs(0);
  }, [stopRecordingPipeline, stopSpeaking]);

  return (
    <div className="rounded-2xl border border-emerald-800/50 bg-slate-900/50 p-4 space-y-3 ring-1 ring-emerald-500/15">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
        <p className="text-xs font-medium text-emerald-300/95 uppercase tracking-wide">
          Adaptive interview (demo)
        </p>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        <strong className="font-medium text-slate-300">Ollama</strong> (default) runs fully offline: Next.js calls{" "}
        <code className="text-slate-500">/api/interview/question-ollama</code> → your machine at{" "}
        <code className="text-slate-500">127.0.0.1:11434</code>. Pull a model first, e.g.{" "}
        <code className="text-slate-500">ollama pull llama3.2</code>.{" "}
        <strong className="font-medium text-slate-300">Local bank</strong> needs no LLM.{" "}
        <strong className="font-medium text-slate-300">OpenAI</strong> needs internet +{" "}
        <code className="text-slate-500">OPENAI_API_KEY</code>.
      </p>

      {!active ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 text-[11px]">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="qsrc"
                checked={llmMode === "ollama"}
                onChange={() => setLlmMode("ollama")}
                className="accent-emerald-500"
              />
              Ollama — local LLM (offline, remembers Q&amp;A)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="qsrc"
                checked={llmMode === "local"}
                onChange={() => setLlmMode("local")}
                className="accent-emerald-500"
              />
              Local question bank (no API)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="qsrc"
                checked={llmMode === "openai"}
                onChange={() => setLlmMode("openai")}
                className="accent-emerald-500"
              />
              OpenAI / ChatGPT (cloud)
            </label>
          </div>
          {remoteLlm ? (
            <div className="space-y-2">
              <label className="block text-[11px] text-slate-500">Resume / background (optional)</label>
              <textarea
                value={resumeNotes}
                onChange={(e) => setResumeNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                placeholder="Paste skills, projects, education…"
              />
              <label className="block text-[11px] text-slate-500">Job description (optional)</label>
              <textarea
                value={jobNotes}
                onChange={(e) => setJobNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                placeholder="Paste role expectations, stack, seniority…"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void beginSession()}
            disabled={(!speechSupported && llmMode === "local") || loadingAi}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loadingAi ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            Start adaptive session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 ring-1 ring-slate-600">
              Level: {difficultyLabel(difficulty)}
            </span>
            {remoteLlm ? (
              <span className="rounded-full bg-violet-950/60 px-2 py-0.5 ring-1 ring-violet-600/50 text-violet-200">
                {llmMode === "ollama" ? "Ollama" : "OpenAI"} · {memoryPairs} past Q&amp;A in memory
              </span>
            ) : null}
            {!srSupported ? (
              <span className="text-amber-200/90">Speech recognition unavailable—use text.</span>
            ) : null}
          </div>

          {apiError ? (
            <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-lg px-2 py-1.5">
              {apiError}
            </p>
          ) : null}

          {loadingAi ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden />
              {llmMode === "openai" ? "Fetching question from OpenAI…" : "Asking Ollama for next question…"}
            </div>
          ) : null}

          {question ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 space-y-2">
              <p className="font-medium text-slate-100">{question.prompt}</p>
              {question.type === "mcq" && question.choices ? (
                <ul className="space-y-1.5">
                  {question.choices.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChoice(c.id)}
                        className={[
                          "w-full text-left rounded-lg px-2 py-1.5 border transition-colors",
                          selectedChoice === c.id
                            ? "border-emerald-500/70 bg-emerald-950/40"
                            : "border-slate-700 hover:border-slate-500",
                        ].join(" ")}
                      >
                        {c.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {hintVisible && question.hint ? (
                <p className="text-slate-400 italic border-l-2 border-amber-500/60 pl-2">{question.hint}</p>
              ) : null}
              {question.hint && !hintVisible ? (
                <button
                  type="button"
                  onClick={revealHint}
                  className="inline-flex items-center gap-1.5 text-[11px] text-amber-200/90 hover:text-amber-100"
                >
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                  Show hint (lowers score slightly)
                </button>
              ) : null}
            </div>
          ) : null}

          {phase !== "done" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {!recording ? (
                  <button
                    type="button"
                    onClick={startRecordingPipeline}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                  >
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                    Record answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      stopRecordingPipeline();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-700/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-100"
                  >
                    <MicOff className="h-3.5 w-3.5" aria-hidden />
                    Stop recording
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={loadingAi}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Submit &amp; analyze
                </button>
              </div>
              <label className="block text-[11px] text-slate-500">Typed answer (optional, merges with speech)</label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                placeholder="Or type your answer here…"
              />
              {transcript ? (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Live transcript: </span>
                  {transcript}
                </p>
              ) : null}
            </div>
          ) : null}

          {analysis && phase === "done" ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3 space-y-2 text-[11px]">
              <p className="text-slate-100 font-medium">
                Overall: {analysis.overallScore}/100 · Content: {analysis.contentScore}/100
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2 text-slate-300">
                <li>
                  <span className="text-slate-500">Confidence </span>
                  {analysis.confidence.score}/100 — {analysis.confidence.label}
                  <span className="block text-slate-500">{analysis.confidence.detail}</span>
                </li>
                <li>
                  <span className="text-slate-500">Clarity </span>
                  {analysis.speechClarity.score}/100 — {analysis.speechClarity.label}
                  <span className="block text-slate-500">{analysis.speechClarity.detail}</span>
                </li>
                <li>
                  <span className="text-slate-500">Tone / hesitation </span>
                  {analysis.toneHesitation.score}/100 — {analysis.toneHesitation.label.replace(/_/g, " ")}
                  <span className="block text-slate-500">{analysis.toneHesitation.detail}</span>
                </li>
                <li>
                  <span className="text-slate-500">Sentiment (lexicon) </span>
                  {analysis.sentiment.score}/100 — {analysis.sentiment.label}
                  <span className="block text-slate-500">{analysis.sentiment.detail}</span>
                </li>
                <li className="sm:col-span-2">
                  <span className="text-slate-500">Voice modulation (energy dynamics) </span>
                  {analysis.voiceModulation.score}/100 — {analysis.voiceModulation.label}
                  <span className="block text-slate-500">{analysis.voiceModulation.detail}</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void nextQuestion()}
                  disabled={loadingAi}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loadingAi ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <SkipForward className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Next question
                </button>
                <button
                  type="button"
                  onClick={resetSession}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  End session
                </button>
              </div>
            </div>
          ) : null}

          {active && phase !== "done" ? (
            <button
              type="button"
              onClick={resetSession}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2"
            >
              End session
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
