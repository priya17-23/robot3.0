/** Browser speech synthesis helpers shared by the avatar and adaptive interview UI. */

import type { VoiceHint } from "@/lib/interviewer-avatars";

export function pickInterviewerVoice(hint: VoiceHint = "neutral"): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined") return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  const en = (v: SpeechSynthesisVoice) => v.lang.startsWith("en");
  const prefer = (substr: string) =>
    voices.find((v) => v.name.includes(substr) && en(v));

  if (hint === "female") {
    return (
      prefer("Google UK English Female") ??
      prefer("Microsoft Aria") ??
      prefer("Microsoft Zira") ??
      prefer("Samantha") ??
      prefer("Karen") ??
      voices.find((v) => /female/i.test(v.name) && en(v)) ??
      voices.find((v) => en(v)) ??
      voices[0]
    );
  }

  if (hint === "male") {
    return (
      prefer("Google UK English Male") ??
      prefer("Microsoft Guy") ??
      prefer("Microsoft David") ??
      prefer("Daniel") ??
      voices.find((v) => /male/i.test(v.name) && en(v)) ??
      voices.find((v) => en(v)) ??
      voices[0]
    );
  }

  return (
    prefer("Google UK English Male") ??
    prefer("Microsoft Guy") ??
    prefer("Daniel") ??
    voices.find((v) => v.lang.startsWith("en-US")) ??
    voices.find((v) => en(v)) ??
    voices[0]
  );
}

export function cancelBrowserSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export type SpeakHandlers = {
  onStart?: (text: string) => void;
  onEnd?: () => void;
  onError?: () => void;
};

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  voiceHint?: VoiceHint;
};

/**
 * Speaks text with interviewer-style settings. Cancels any in-flight utterance.
 * Returns a Promise that settles when playback ends or errors.
 */
export function speakInterviewer(
  text: string,
  handlers: SpeakHandlers = {},
  options: SpeakOptions = {},
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = options.rate ?? 0.9;
    u.pitch = options.pitch ?? 0.98;
    const voice = pickInterviewerVoice(options.voiceHint ?? "neutral");
    if (voice) u.voice = voice;
    u.onstart = () => handlers.onStart?.(text);
    const done = () => {
      handlers.onEnd?.();
      resolve();
    };
    u.onend = done;
    u.onerror = () => {
      handlers.onError?.();
      resolve();
    };
    window.speechSynthesis.speak(u);
  });
}
