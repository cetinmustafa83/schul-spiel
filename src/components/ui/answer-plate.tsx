"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnswerPlateProps {
  letter: "A" | "B" | "C" | "D";
  shape: "▲" | "●" | "■" | "◆";
  text: string;
  state?: "idle" | "selected" | "locked" | "correct" | "wrong" | "eliminated";
  onClick?: () => void;
  disabled?: boolean;
  index?: number;
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
  const ref = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // 3D tilt on mouse move (only when interactive)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || state !== "idle") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - y) * 12;
    const rotY = (x - 0.5) * 12;
    gsap.to(innerRef.current, {
      rotateX: rotX,
      rotateY: rotY,
      duration: 0.15,
      ease: "power2.out",
    });
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.6,
        background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${idleColor}40, transparent 60%)`,
        duration: 0.15,
      });
    }
  }, [disabled, state, idleColor]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || state !== "idle") return;
    gsap.to(innerRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: "elastic.out(1, 0.5)",
    });
    if (glowRef.current) {
      gsap.to(glowRef.current, { opacity: 0, duration: 0.3 });
    }
  }, [disabled, state]);

  const handleClick = useCallback(() => {
    if (disabled || state !== "idle") return;
    // Press-down bounce
    gsap.timeline()
      .to(innerRef.current, { scale: 0.92, duration: 0.08, ease: "power2.in" })
      .to(innerRef.current, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    onClick?.();
  }, [disabled, state, onClick]);

  const bg =
    state === "correct"
      ? "bg-mint/20 border-mint"
      : state === "wrong"
      ? "bg-coral/20 border-coral"
      : state === "eliminated"
      ? "bg-bg2/30 border-border opacity-40 line-through"
      : state === "selected"
      ? "bg-bg2 border-gold"
      : state === "locked"
      ? "bg-bg2 border-gold"
      : "bg-bg1/80 border-border hover:border-gold/50";

  return (
    <button
      type="button"
      ref={ref}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      data-answer-plate
      aria-pressed={state === "selected" || state === "locked"}
      aria-label={`Antwort ${letter}: ${text}${state === "correct" ? " (richtig)" : state === "wrong" ? " (falsch)" : ""}`}
      className={cn(
        "tap-target group relative w-full rounded-2xl border-2 px-4 py-3 sm:py-4 text-left transition-colors duration-200",
        "min-h-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg0",
        bg,
        plateClass,
        disabled && state === "idle" && "cursor-not-allowed opacity-60",
      )}
      style={{ perspective: "800px", borderLeftColor: state === "idle" ? idleColor : undefined, borderLeftWidth: state === "idle" ? 4 : 2 }}
    >
      {/* Glow trail overlay */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
        aria-hidden="true"
      />

      {/* 3D inner content */}
      <div ref={innerRef} className="relative flex items-center gap-3" style={{ transformStyle: "preserve-3d" }}>
        {/* Letter + shape badge */}
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-lg",
            state === "correct" && "bg-mint text-bg0",
            state === "wrong" && "bg-coral text-bg0",
            state === "eliminated" && "bg-bg2/50 text-ink-dim",
            state === "idle" && "bg-bg2/70 text-ink",
            (state === "selected" || state === "locked") && "bg-gold text-bg0",
          )}
          style={{ color: state === "idle" ? idleColor : undefined, transform: "translateZ(20px)" }}
        >
          {state === "correct" ? "✓" : state === "wrong" ? "✕" : letter}
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm" style={{ color: idleColor, transform: "translateZ(15px)" }}>
          {shape}
        </span>
        <span className="flex-1 text-sm sm:text-base text-ink font-medium leading-tight" style={{ transform: "translateZ(10px)" }}>
          {text}
        </span>
        {typeof index === "number" && (
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 text-[10px] text-ink-dim" style={{ transform: "translateZ(5px)" }}>
            {index + 1}
          </kbd>
        )}
      </div>

      {/* Shine effect on hover for idle state */}
      {state === "idle" && !disabled && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="absolute -inset-y-2 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-500 group-hover:translate-x-[400%] group-hover:opacity-100"
          />
        </div>
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
  const ref = useRef<HTMLDivElement>(null);

  // Ambient pulse — gives the card a "living" feel
  useEffect(() => {
    if (!ref.current) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    gsap.to(ref.current, {
      boxShadow: "0 12px 32px rgba(255, 200, 61, 0.15), 0 8px 24px rgba(0, 0, 0, 0.35)",
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-3xl border border-border bg-bg1/80 p-5 sm:p-6 backdrop-blur"
      style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)" }}
    >
      <div data-question-header className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
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
                  className={cn("h-2 w-2 rounded-full transition-all", i < difficulty ? "bg-gold" : "bg-border")}
                />
              ))}
            </span>
          )}
          {timer}
        </div>
      </div>
      <h2 data-question-text className="font-display text-xl sm:text-2xl font-semibold leading-snug text-ink" style={{ fontSize: "clamp(1.15rem, 2vw + 0.6rem, 1.85rem)" }}>
        {text}
      </h2>
      {children}
    </div>
  );
}
