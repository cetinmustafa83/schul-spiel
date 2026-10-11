"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { formatTaler } from "@/lib/german";

export interface LadderStep {
  level: number;
  amount: number;
  isSafe: boolean;
  tier: "A" | "B" | "C";
  label?: string | null;
}

interface LadderRailProps {
  ladder: LadderStep[];
  currentLevel: number;
  variant?: "rail" | "compact" | "mountain";
  className?: string;
  reducedMotion?: boolean;
}

/**
 * Premium ladder — Millionaire-inspired vertical prize ladder.
 *
 * - variant="rail": compact sidebar list (desktop right sidebar)
 * - variant="compact": just current + next
 * - variant="mountain": SVG mountain path visualization (desktop hero)
 */
export function LadderRail({ ladder, currentLevel, variant = "rail", className, reducedMotion = false }: LadderRailProps) {
  if (variant === "compact") {
    const current = ladder.find((s) => s.level === currentLevel);
    const next = ladder.find((s) => s.level === currentLevel + 1);
    return (
      <div className={cn("rounded-2xl border border-border bg-bg1/60 p-4", className)}>
        <div className="flex items-center justify-between text-xs text-ink-dim">
          <span>Aktuell</span>
          <span>Nächste Stufe</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-display text-lg">
          <span className="text-ink">{formatTaler(current?.amount ?? 0)}</span>
          <span className="text-ink-dim/50">→</span>
          <span className="text-ink-dim">{next ? formatTaler(next.amount) : "🏆"}</span>
        </div>
      </div>
    );
  }

  if (variant === "mountain") {
    return <MountainLadder ladder={ladder} currentLevel={currentLevel} className={className} reducedMotion={reducedMotion} />;
  }

  return <RailLadder ladder={ladder} currentLevel={currentLevel} className={className} reducedMotion={reducedMotion} />;
}

// ============================================================================
// Rail Ladder — Millionaire-style vertical prize list
// ============================================================================

function RailLadder({ ladder, currentLevel, className, reducedMotion }: { ladder: LadderStep[]; currentLevel: number; className?: string; reducedMotion?: boolean }) {
  const steps = [...ladder].sort((a, b) => b.level - a.level); // 15 → 1
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!currentRef.current || reducedMotion) return;
    const tl = gsap.to(currentRef.current, {
      opacity: 0.85,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [currentLevel, reducedMotion]);

  return (
    <div className={cn("nice-scroll max-h-[60vh] overflow-y-auto pr-1", className)} aria-label="Taler-Leiter">
      <ol className="flex flex-col gap-0.5">
        {steps.map((s) => {
          const isCurrent = s.level === currentLevel;
          const isPast = s.level < currentLevel;
          const isFuture = s.level > currentLevel;

          return (
            <li
              key={s.level}
              ref={isCurrent ? currentRef : null}
              className={cn(
                "station relative flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all overflow-hidden",
                isCurrent && "current",
                !isCurrent && "border border-transparent",
              )}
              style={isCurrent ? {
                background: "linear-gradient(90deg, rgba(106,122,154,0.3), rgba(106,122,154,0.08))",
                border: "1px solid rgba(160,170,200,0.5)",
                boxShadow: "0 0 16px rgba(106,122,154,0.25), inset 0 0 12px rgba(106,122,154,0.12)",
              } : isPast ? {
                background: "rgba(61,219,164,0.04)",
              } : undefined}
            >
              {/* Diamond bullet (Millionaire-style) */}
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "text-[11px] transition-all",
                    isCurrent ? "text-ink" : isPast ? "text-mint/80" : s.isSafe ? "text-mint/50" : "text-ink-dim/30"
                  )}
                  style={isCurrent ? { filter: "drop-shadow(0 0 4px rgba(160,170,200,0.6))" } : undefined}
                  aria-hidden
                >
                  ◆
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums font-mono transition-all",
                    isCurrent ? "text-ink font-bold" : isPast ? "text-mint/70" : s.isSafe ? "text-mint/50" : "text-ink-dim/40"
                  )}
                >
                  {String(s.level).padStart(2, "0")}
                </span>
                {s.isSafe && (
                  <span className="text-[9px] text-mint/60" aria-hidden>⛺</span>
                )}
                {s.label && <span className="text-[9px] text-ink-dim/40 uppercase tracking-wider">{s.label}</span>}
              </span>
              <span
                className={cn(
                  "font-display tabular-nums transition-all",
                  isCurrent ? "text-ink font-bold text-base" : isPast ? "text-mint/80" : s.isSafe ? "text-mint/60" : "text-ink-dim/60"
                )}
              >
                {formatTaler(s.amount)}
              </span>

              {/* Active-level left edge accent */}
              {isCurrent && (
                <div
                  className="pointer-events-none absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2"
                  style={{
                    background: "linear-gradient(to bottom, transparent, rgba(160,170,200,0.8), transparent)",
                    boxShadow: "0 0 8px rgba(160,170,200,0.6)",
                  }}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ============================================================================
// Mountain Ladder — SVG mountain path visualization
// ============================================================================

function MountainLadder({ ladder, currentLevel, className, reducedMotion }: { ladder: LadderStep[]; currentLevel: number; className?: string; reducedMotion?: boolean }) {
  const markerRef = useRef<SVGGElement>(null);
  const beaconRef = useRef<SVGCircleElement>(null);

  const N = ladder.length;
  const pathPoints = ladder.map((s, i) => {
    const t = i / (N - 1);
    const x = 50 + Math.sin(t * Math.PI * 1.8) * 80;
    const y = 380 - t * 340;
    return { x, y, level: s.level };
  });

  useEffect(() => {
    if (!markerRef.current) return;
    const target = pathPoints.find((p) => p.level === currentLevel);
    if (!target) return;
    if (reducedMotion) {
      gsap.set(markerRef.current, { x: target.x, y: target.y });
      return;
    }
    gsap.to(markerRef.current, {
      x: target.x,
      y: target.y,
      duration: 0.8,
      ease: "power2.out",
    });
  }, [currentLevel, reducedMotion]);

  useEffect(() => {
    if (!beaconRef.current || reducedMotion) return;
    const tl = gsap.to(beaconRef.current, {
      attr: { r: 8 },
      opacity: 0.4,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [reducedMotion]);

  const pathD = pathPoints.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 200 420" className="w-full h-auto" aria-label="Berg-Leiter">
        <defs>
          <linearGradient id="path-grad-v2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#6a7a9a" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#6a7a9a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#a0aac8" stopOpacity="1" />
          </linearGradient>
          <filter id="marker-glow-v2">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Mountain silhouette */}
        <path
          d="M 20 420 L 100 80 L 180 420 Z"
          fill="#1C1A44"
          opacity="0.4"
        />
        <path
          d="M 40 420 L 100 120 L 160 420 Z"
          fill="#12102B"
          opacity="0.6"
        />

        {/* Snow cap */}
        <path
          d="M 80 140 L 100 80 L 120 140 L 110 135 L 100 145 L 90 135 Z"
          fill="#F5F3FF"
          opacity="0.25"
        />

        {/* Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#path-grad-v2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="5 3"
          opacity="0.8"
        />

        {/* Stations */}
        {pathPoints.map((p) => {
          const step = ladder.find((s) => s.level === p.level)!;
          const isCurrent = step.level === currentLevel;
          const isPast = step.level < currentLevel;
          const isSafe = step.isSafe;
          return (
            <g key={p.level}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isSafe ? 5 : 4}
                fill={isPast ? "#3DDBA4" : isSafe ? "#3DDBA4" : "#2A2766"}
                stroke={isCurrent ? "#a0aac8" : "transparent"}
                strokeWidth="2"
                style={isCurrent ? { filter: "drop-shadow(0 0 4px rgba(160,170,200,0.8))" } : undefined}
              />
              {isSafe && <text x={p.x + 8} y={p.y + 3} fontSize="7" fill="#3DDBA4">⛺</text>}
              <text
                x={p.x - 18}
                y={p.y + 3}
                fontSize="7"
                fill={isCurrent ? "#F5F3FF" : isPast ? "#3DDBA4" : "#BDB8E6"}
                textAnchor="end"
                className="font-mono"
                opacity={isCurrent ? 1 : 0.7}
              >
                {formatTaler(step.amount)}
              </text>
            </g>
          );
        })}

        {/* Summit beacon */}
        <circle ref={beaconRef} cx={pathPoints[N - 1]?.x} cy={pathPoints[N - 1]?.y} r="5" fill="#a0aac8" opacity="0.5" />

        {/* Current marker */}
        <g ref={markerRef}>
          <circle r="10" fill="#a0aac8" filter="url(#marker-glow-v2)" opacity="0.4" />
          <circle r="6" fill="#a0aac8" stroke="#1A1238" strokeWidth="1.5" />
          <circle r="2.5" fill="#1A1238" />
        </g>
      </svg>
    </div>
  );
}
