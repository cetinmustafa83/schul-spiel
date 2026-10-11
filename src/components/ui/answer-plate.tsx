"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnswerPlateProps {
  letter: "A" | "B" | "C" | "D";
  shape: "▲" | "●" | "■" | "◆";
  text: string;
  state?: "idle" | "selected" | "locked" | "correct" | "wrong" | "eliminated";
  onClick?: () => void;
  disabled?: boolean;
  index?: number; // for keyboard shortcut hint
}

const IDLE_COLOR: Record<AnswerPlateProps["letter"], string> = {
  A: "#7C6CFF",
  B: "#31B7E6",
  C: "#F2A93B",
  D: "#E86CB5",
};

export function AnswerPlate({
  letter,
  shape,
  text,
  state = "idle",
  onClick,
  disabled = false,
  index,
}: AnswerPlateProps) {
  const idleColor = IDLE_COLOR[letter];
  const plateClass = `plate-${letter}`;

  const bg =
    state === "correct"
      ? "bg-mint/20 border-mint plate-glow-mint"
      : state === "wrong"
      ? "bg-coral/20 border-coral plate-glow-coral"
      : state === "eliminated"
      ? "bg-bg2/30 border-border opacity-40 line-through"
      : state === "selected"
      ? "bg-bg2 border-gold plate-glow-gold"
      : state === "locked"
      ? "bg-bg2 border-gold plate-glow-gold animate-pulse"
      : "bg-bg1/80 border-border plate-glow hover:border-gold/50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "selected" || state === "locked"}
      aria-label={`Antwort ${letter}: ${text}${state === "correct" ? " (richtig)" : state === "wrong" ? " (falsch)" : ""}`}
      className={cn(
        "tap-target group relative flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 sm:py-4 text-left transition-all duration-200",
        "min-h-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg0",
        bg,
        plateClass,
        disabled && state === "idle" && "cursor-not-allowed opacity-60",
      )}
      style={{
        // Per-letter accent border on the left
        borderLeftColor: state === "idle" ? idleColor : undefined,
        borderLeftWidth: state === "idle" ? 4 : 2,
      }}
    >
      {/* Letter + shape badge */}
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold",
          state === "correct" && "bg-mint text-bg0",
          state === "wrong" && "bg-coral text-bg0",
          state === "eliminated" && "bg-bg2/50 text-ink-dim",
          state === "idle" && "bg-bg2/70 text-ink",
          (state === "selected" || state === "locked") && "bg-gold text-bg0",
        )}
        style={{ color: state === "idle" ? idleColor : undefined }}
      >
        {state === "correct" ? "✓" : state === "wrong" ? "✕" : letter}
      </span>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm" style={{ color: idleColor }}>
        {shape}
      </span>
      <span className="flex-1 text-sm sm:text-base text-ink font-medium leading-tight">
        {text}
      </span>
      {typeof index === "number" && (
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 text-[10px] text-ink-dim">
          {index + 1}
        </kbd>
      )}
    </button>
  );
}

interface QuestionCardProps {
  subject: { code: string; label: string; icon?: string | null; color?: string | null };
  level?: number;
  difficulty?: number;
  text: string;
  timer?: ReactNode;
  children?: ReactNode;
}

export function QuestionCard({ subject, level, difficulty, text, timer, children }: QuestionCardProps) {
  return (
    <div className="relative rounded-3xl border border-border bg-bg1/80 p-5 sm:p-6 backdrop-blur plate-glow">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-bg2/60 px-3 py-1 font-medium text-ink">
          <span aria-hidden>{subject.icon ?? "📚"}</span>
          {subject.label}
        </span>
        <div className="flex items-center gap-2 text-ink-dim">
          {typeof level === "number" && (
            <span className="rounded-full bg-bg2/40 px-2 py-0.5">Stufe {level}</span>
          )}
          {typeof difficulty === "number" && (
            <span className="inline-flex gap-0.5" title={`Schwierigkeit ${difficulty}/5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn("h-2 w-2 rounded-full", i < difficulty ? "bg-gold" : "bg-border")}
                />
              ))}
            </span>
          )}
          {timer}
        </div>
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug text-ink" style={{ fontSize: "clamp(1.15rem, 2vw + 0.6rem, 1.85rem)" }}>
        {text}
      </h2>
      {children}
    </div>
  );
}
