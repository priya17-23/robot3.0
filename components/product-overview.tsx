import {
  BookOpen,
  Brain,
  Camera,
  Clock,
  Code2,
  Database,
  FileText,
  Layers,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Type,
  UserRound,
} from "lucide-react";

const coreFeatures = [
  {
    icon: FileText,
    title: "Resume or job description interviews",
    body: "Choose resume-based prep or target a specific role with JD-based sessions.",
  },
  {
    icon: Brain,
    title: "NLP extraction and skill matching",
    body: "Skills, projects, and technologies are parsed and aligned so questions stay on-topic.",
  },
  {
    icon: Sparkles,
    title: "Offline LLM (Ollama)",
    body: "Personalized technical, HR, and coding questions run locally—no cloud required for generation.",
  },
  {
    icon: UserRound,
    title: "AI avatar interviewer",
    body: "An avatar-led flow simulates real interview pressure and natural back-and-forth.",
  },
  {
    icon: Layers,
    title: "Project deep questioning",
    body: "Follow-ups on why you picked stacks, tradeoffs, and what you would do differently.",
  },
  {
    icon: Clock,
    title: "Rounds and duration",
    body: "Configure how many rounds you want and how long each segment should run.",
  },
  {
    icon: Code2,
    title: "Coding round with validation",
    body: "Submissions are checked with test cases and output validation for reliable scoring.",
  },
  {
    icon: Mic,
    title: "Voice explanation of your solution",
    body: "After coding, explain your approach out loud—like a real onsite loop.",
  },
  {
    icon: MessageSquare,
    title: "LLM checks reasoning vs code",
    body: "Clarity and consistency between what you said and what you built are evaluated together.",
  },
  {
    icon: Database,
    title: "RAG over a local knowledge base",
    body: "Retrieval-augmented generation grounds answers and improves consistency offline.",
  },
  {
    icon: Camera,
    title: "Optional presence monitoring",
    body: "Basic face detection and presence tracking for a fair, focused session—opt in only.",
  },
  {
    icon: BookOpen,
    title: "Feedback and downloadable report",
    body: "Technical, coding, and communication feedback with a report you can keep and compare over time.",
  },
];

const extendedFeatures = [
  {
    icon: TrendingUp,
    title: "Adaptive difficulty",
    body: "Follow-ups scale up or down based on how well you are doing in the current session.",
  },
  {
    icon: Timer,
    title: "Time pressure modes",
    body: "Practice mode or strict timers per question to match real interview pacing.",
  },
  {
    icon: Target,
    title: "Weak-topic remediation",
    body: "Short targeted drills on gaps surfaced from skill match, tests, and evaluations.",
  },
  {
    icon: Layers,
    title: "Hint ladder for coding",
    body: "Progressive hints before full solutions, with usage reflected in your report.",
  },
  {
    icon: Type,
    title: "Text or voice explanations",
    body: "Type your walkthrough when voice is not practical—same evaluation path.",
  },
  {
    icon: FileText,
    title: "Transcript in the report",
    body: "Questions, answers, and code snapshots together for easier review.",
  },
  {
    icon: Shield,
    title: "Privacy-first controls",
    body: "Local-first processing with Ollama; clear data deletion for session artifacts.",
  },
];

export function ProductOverview() {
  return (
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-20 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="text-center space-y-4 max-w-3xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-400/90">
            Product overview
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Placement interview prep, personalized and realistic
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            PlacementPrep AI combines NLP, a local LLM, and an avatar-led experience so students can rehearse
            full loops—technical, HR, and coding—with feedback that mirrors what interviewers care about.
          </p>
        </header>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400 shrink-0" />
            Core system capabilities
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-5 shadow-lg shadow-black/20"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="space-y-1.5 min-w-0">
                    <p className="font-medium text-slate-100 text-sm leading-snug">{title}</p>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-400/90 shrink-0" />
            Planned enhancements
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-2xl">
            These items extend the baseline experience with realism, learning loops, and accessibility—without
            changing your offline-first architecture.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extendedFeatures.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-200/90 ring-1 ring-amber-500/25">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="space-y-1.5 min-w-0">
                    <p className="font-medium text-slate-100 text-sm leading-snug">{title}</p>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="rounded-2xl border border-slate-700/50 bg-slate-950/60 px-5 py-4 text-center text-xs text-slate-400">
          <strong className="font-medium text-slate-300">PlacementPrep AI</strong>
          {" — "}
          Optional camera features are framed as presence assist only, not proctoring claims. Prefer local storage
          and explicit export for interview reports.
        </footer>
      </div>
    </section>
  );
}
