"use client";

import * as React from "react";
import { Loader2, MessageCircle, Send, Square, Volume2 } from "lucide-react";

export type RobotChatProvider = "openai" | "ollama";

type ChatTurn = { role: "user" | "assistant"; content: string };

type RobotAiChatProps = {
  speakPrompt: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  /** e.g. "Maya Chen — Technical lead" */
  personaLine: string;
};

export function RobotAiChat({ speakPrompt, stopSpeaking, isSpeaking, personaLine }: RobotAiChatProps) {
  const [provider, setProvider] = React.useState<RobotChatProvider>("openai");
  const [messages, setMessages] = React.useState<ChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [readAloud, setReadAloud] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = React.useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    const nextHistory = [...messages, { role: "user" as const, content: q }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch("/api/robot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          messages: nextHistory,
          persona: personaLine,
        }),
      });
      const data = (await res.json()) as { error?: string; reply?: string };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.reply) {
        throw new Error("No reply in response");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
      if (readAloud) {
        speakPrompt(data.reply);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, personaLine, readAloud, speakPrompt]);

  const clearChat = React.useCallback(() => {
    stopSpeaking();
    setMessages([]);
    setError(null);
  }, [stopSpeaking]);

  return (
    <div className="rounded-2xl border border-sky-800/45 bg-slate-900/50 p-4 space-y-3 ring-1 ring-sky-500/15">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-sky-400 shrink-0" aria-hidden />
        <p className="text-xs font-medium text-sky-300/95 uppercase tracking-wide">Ask the robot anything</p>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Cloud-style Q&amp;A: pick <strong className="font-medium text-slate-300">OpenAI</strong> (needs{" "}
        <code className="text-slate-500">OPENAI_API_KEY</code>) or <strong className="font-medium text-slate-300">Ollama</strong>{" "}
        offline. The avatar can read answers aloud. Conversation is kept for follow-ups.
      </p>

      <div className="flex flex-col gap-2 text-[11px]">
        <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="radio"
            name="chatprov"
            checked={provider === "openai"}
            onChange={() => setProvider("openai")}
            className="accent-sky-500"
          />
          OpenAI (cloud)
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="radio"
            name="chatprov"
            checked={provider === "ollama"}
            onChange={() => setProvider("ollama")}
            className="accent-sky-500"
          />
          Ollama (local)
        </label>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={readAloud}
          onChange={(e) => setReadAloud(e.target.checked)}
          className="accent-sky-500 rounded"
        />
        Read answers aloud (robot voice)
      </label>

      <div
        ref={listRef}
        className="max-h-52 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/50 px-2 py-2 space-y-2 text-[11px]"
      >
        {messages.length === 0 ? (
          <p className="text-slate-500 italic px-1 py-2">Ask a question to start…</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={[
                "rounded-lg px-2 py-1.5",
                m.role === "user" ? "bg-slate-800/80 text-slate-100 ml-4" : "bg-sky-950/40 text-slate-200 mr-4 border border-sky-900/40",
              ].join(" ")}
            >
              <span className="text-[10px] uppercase tracking-wide text-slate-500 block mb-0.5">
                {m.role === "user" ? "You" : "Robot"}
              </span>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 px-1 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-rose-300 bg-rose-950/35 border border-rose-800/50 rounded-lg px-2 py-1.5">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Type your question… (Enter to send, Shift+Enter for newline)"
          className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 resize-y"
        />
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-45"
            title="Send"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => speakPrompt(messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "")}
            disabled={isSpeaking || !messages.some((m) => m.role === "assistant")}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            title="Replay last answer"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={stopSpeaking}
          disabled={!isSpeaking}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 disabled:opacity-35"
        >
          <Square className="h-3 w-3" aria-hidden />
          Stop speech
        </button>
        <button
          type="button"
          onClick={clearChat}
          className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2"
        >
          Clear conversation
        </button>
      </div>
    </div>
  );
}
