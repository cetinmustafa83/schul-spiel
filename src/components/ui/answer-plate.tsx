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

// Muted, sophisticated accent colors — neutral palette
const IDLE_COLOR: Record<AnswerPlateProps["letter"], string> = {
  A: "#6a7a9a",  // muted slate blue
  B: "#5a8a9a",  // muted teal
  C: "#9a8a6a",  // muted bronze
  D: "#8a6a8a",  // muted plum
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
    const rotX = (0.5 - y) * 8;
    const rotY = (x - 0.5) * 8;
    gsap.to(innerRef.current, {
      rotateX: rotX,
      rotateY: rotY,
      duration: 0.15,
      ease: "power2.out",
    });
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.5,
        background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${idleColor}30, transparent 60%)`,
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
      .to(innerRef.current, { scale: 0.94, duration: 0.08, ease: "power2.in" })
      .to(innerRef.current, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
    onClick?.();
  }, [disabled, state, onClick]);

  // State-based styling
  const isActive = state === "selected" || state === "locked";
  const isCorrect = state === "correct";
  const isWrong = state === "wrong";
  const isEliminated = state === "eliminated";

  return (
    <button
      type="button"
      ref={ref}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      data-answer-plate
      aria-pressed={isActive}
      aria-label={`Antwort ${letter}: ${text}${isCorrect ? " (richtig)" : isWrong ? " (falsch)" : ""}`}
      className={cn(
        "tap-target group relative w-full min-h-[64px] transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg0",
        disabled && state === "idle" && "cursor-not-allowed opacity-60",
      )}
      style={{ perspective: "800px" }}
    >
      {/* Glow trail overlay */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0"
        aria-hidden="true"
      />

      {/* 3D inner content — stadium shape with pointed ends (Millionaire-style) */}
      <div
        ref={innerRef}
        className={cn(
          "relative flex items-center gap-3 px-5 py-3 sm:py-4 transition-colors duration-200",
        )}
        style={{
          transformStyle: "preserve-3d",
          // Stadium shape with pointed ends using clip-path
          clipPath: "polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)",
          background: isCorrect
            ? "linear-gradient(135deg, rgba(61,219,164,0.15), rgba(61,219,164,0.05))"
            : isWrong
            ? "linear-gradient(135deg, rgba(255,107,122,0.15), rgba(255,107,122,0.05))"
            : isEliminated
            ? "rgba(20,20,40,0.3)"
            : isActive
            ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
            : "linear-gradient(135deg, rgba(40,38,80,0.6), rgba(28,26,68,0.8))",
          // Neon glow border via box-shadow
          boxShadow: isCorrect
            ? "0 0 16px rgba(61,219,164,0.4), inset 0 0 16px rgba(61,219,164,0.1), 0 8px 24px rgba(0,0,0,0.35)"
            : isWrong
            ? "0 0 16px rgba(255,107,122,0.4), inset 0 0 16px rgba(255,107,122,0.1), 0 8px 24px rgba(0,0,0,0.35)"
            : isActive
            ? "0 0 20px rgba(255,255,255,0.3), inset 0 0 16px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.35)"
            : "0 0 8px rgba(106,122,154,0.15), inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.35)",
          opacity: isEliminated ? 0.4 : 1,
          filter: isEliminated ? "blur(2px)" : "none",
        }}
      >
        {/* Letter + shape badge */}
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold transition-all",
            isCorrect && "bg-mint text-bg0",
            isWrong && "bg-coral text-bg0",
            isEliminated && "bg-bg2/50 text-ink-dim",
            state === "idle" && "bg-bg2/60 text-ink",
            isActive && "bg-ink text-bg0",
          )}
          style={{ color: state === "idle" ? idleColor : undefined, transform: "translateZ(20px)" }}
        >
          {isCorrect ? "✓" : isWrong ? "✕" : letter}
        </span>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs" style={{ color: idleColor, transform: "translateZ(15px)" }}>
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

      {/* Neon border outline (separate element for cleaner stroke) */}
      {!isEliminated && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            clipPath: "polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)",
            border: "1px solid",
            borderColor: isCorrect
              ? "rgba(61,219,164,0.6)"
              : isWrong
              ? "rgba(255,107,122,0.6)"
              : isActive
              ? "rgba(255,255,255,0.4)"
              : "rgba(106,122,154,0.25)",
          }}
        />
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
      boxShadow: "0 12px 40px rgba(106,122,154,0.15), 0 0 24px rgba(106,122,154,0.08), 0 8px 24px rgba(0,0,0,0.35)",
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  return (
    <div
      ref={ref}
      data-question-text
      className="relative rounded-3xl p-5 sm:p-6 backdrop-blur"
      style={{
        background: "linear-gradient(135deg, rgba(40,38,80,0.7), rgba(28,26,68,0.9))",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid rgba(106,122,154,0.2)",
      }}
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
                  className={cn("h-2 w-2 rounded-full transition-all", i < difficulty ? "bg-ink-dim" : "bg-border")}
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
