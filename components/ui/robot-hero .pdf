"use client";

import * as React from "react";
import Image from "next/image";
import { Bot, ExternalLink, Github, Sparkles } from "lucide-react";

type RobotHeroProps = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  githubHref?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function RobotHero({
  title = "AI Yoga Robot",
  subtitle = "A smooth, responsive robot head that follows your cursor—ready to evolve into an AI coach.",
  ctaLabel = "Start a session",
  ctaHref = "#",
  githubHref = "https://github.com/",
}: RobotHeroProps) {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const targetRef = React.useRef({ x: 0, y: 0 }); // target rotation (deg)
  const currentRef = React.useRef({ x: 0, y: 0 }); // current rotation (deg)
  const rafRef = React.useRef<number | null>(null);

  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const startAnimationLoop = React.useCallback(() => {
    if (prefersReducedMotion) return;
    if (rafRef.current != null) return;

    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;

      const nextX = lerp(current.x, target.x, 0.12);
      const nextY = lerp(current.y, target.y, 0.12);

      currentRef.current = { x: nextX, y: nextY };
      setTilt({ x: nextX, y: nextY });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [prefersReducedMotion]);

  const stopAnimationLoop = React.useCallback(() => {
    if (rafRef.current == null) return;
    window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => stopAnimationLoop();
  }, [stopAnimationLoop]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const nx = clamp((x - midX) / midX, -1, 1);
    const ny = clamp((y - midY) / midY, -1, 1);

    // "Head follows cursor": rotate up/down with y, left/right with x.
    const maxTilt = 14; // deg
    const rotateY = nx * maxTilt;
    const rotateX = -ny * maxTilt;

    targetRef.current = { x: rotateX, y: rotateY };
    startAnimationLoop();
  }

  function handlePointerLeave() {
    targetRef.current = { x: 0, y: 0 };
    startAnimationLoop();
  }

  const robotImage =
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80";

  return (
    <section className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/40">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Advanced smooth cursor tracking</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            {title}
          </h1>

          <p className="max-w-xl text-slate-300 text-sm sm:text-base">{subtitle}</p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{ctaLabel}</span>
            </a>

            <a
              href={githubHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs sm:text-sm font-medium text-slate-200 hover:border-sky-400 hover:text-sky-300 transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative h-[320px] sm:h-[380px] md:h-[420px] flex items-center justify-center"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div className="pointer-events-none absolute inset-6 rounded-3xl bg-sky-500/10 blur-3xl" />

          <div
            className="relative rounded-3xl border border-slate-700/60 bg-slate-900/70 shadow-2xl shadow-sky-500/30 overflow-hidden aspect-[4/5] w-[72%] max-w-xs"
            style={{
              transform: prefersReducedMotion
                ? undefined
                : `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-slate-950/40 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-white/10 backdrop-blur">
              <Bot className="h-3.5 w-3.5 text-sky-300" />
              <span>AI Coach</span>
            </div>

            <Image
              src={robotImage}
              alt="Futuristic robot head"
              fill
              priority
              sizes="(max-width: 768px) 70vw, 320px"
              className="object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

