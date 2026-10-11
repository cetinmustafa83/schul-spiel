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
 * 3D Animated Mountain Ladder — SVG path winding up the mountain
 * with a glowing marker that climbs to the current position.
 *
 * - variant="mountain": full SVG mountain visualization (desktop)
 * - variant="rail": compact list (mobile / sidebar)
 * - variant="compact": just current + next
 */
export function LadderRail({ ladder, currentLevel, variant = "rail", className, reducedMotion = false }: LadderRailProps) {
  if (variant === "compact") {
    const current = ladder.find((s) => s.level === currentLevel);
    const next = ladder.find((s) => s.level === currentLevel + 1);
    return (
      <div className={cn("rounded-2xl border border-border bg-bg1/60 p-3", className)}>
        <div className="flex items-center justify-between text-xs text-ink-dim">
          <span>Aktuell</span>
          <span>Nächste Stufe</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-display text-lg">
          <span className="text-gold">{formatTaler(current?.amount ?? 0)}</span>
          <span className="text-ink-dim">→</span>
          <span className="text-ink">{next ? formatTaler(next.amount) : "🏆"}</span>
        </div>
      </div>
    );
  }

  if (variant === "mountain") {
    return <MountainLadder ladder={ladder} currentLevel={currentLevel} className={className} reducedMotion={reducedMotion} />;
  }

  // Default rail
  return <RailLadder ladder={ladder} currentLevel={currentLevel} className={className} reducedMotion={reducedMotion} />;
}

function RailLadder({ ladder, currentLevel, className, reducedMotion }: { ladder: LadderStep[]; currentLevel: number; className?: string; reducedMotion?: boolean }) {
  const steps = [...ladder].sort((a, b) => b.level - a.level); // 15 → 1
  const currentRef = useRef<HTMLLIElement>(null);

  // Pulse the current station
  useEffect(() => {
    if (!currentRef.current || reducedMotion) return;
    const tl = gsap.to(currentRef.current, {
      scale: 1.03,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { tl.kill(); };
  }, [currentLevel, reducedMotion]);

  return (
    <div className={cn("ladder-rail nice-scroll max-h-[60vh] overflow-y-auto pr-1", className)} aria-label="Taler-Leiter">
      <ol className="flex flex-col gap-1">
        {steps.map((s) => {
          const isCurrent = s.level === currentLevel;
          const isPast = s.level < currentLevel;
          return (
            <li
              key={s.level}
              ref={isCurrent ? currentRef : null}
              className={cn(
                "station flex items-center justify-between rounded-xl px-3 py-1.5 text-sm transition-all",
                isCurrent && "current bg-gold/10 border border-gold/40",
                !isCurrent && "border border-transparent",
                s.isSafe && !isCurrent && "safe"
              )}
              style={{ transformOrigin: "center" }}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                    isCurrent ? "bg-gold text-bg0 shadow-[0_0_12px_rgba(255,200,61,0.5)]" : isPast ? "bg-mint/20 text-mint" : s.isSafe ? "bg-mint/20 text-mint" : "bg-bg2/60 text-ink-dim"
                  )}
                >
                  {s.level}
                </span>
                {s.isSafe && <span aria-hidden>⛺</span>}
                {s.label && <span className="text-[10px] text-ink-dim">{s.label}</span>}
              </span>
              <span
                className={cn(
                  "font-display tabular-nums transition-all",
                  isCurrent ? "text-gold" : isPast ? "text-mint" : s.isSafe ? "text-mint" : "text-ink-dim"
                )}
              >
                {formatTaler(s.amount)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MountainLadder({ ladder, currentLevel, className, reducedMotion }: { ladder: LadderStep[]; currentLevel: number; className?: string; reducedMotion?: boolean }) {
  const markerRef = useRef<SVGGElement>(null);
  const beaconRef = useRef<SVGCircleElement>(null);

  // 15 stations along a winding path
  const N = ladder.length;
  const pathPoints = ladder.map((s, i) => {
    const t = i / (N - 1);
    const x = 50 + Math.sin(t * Math.PI * 1.8) * 80;
    const y = 380 - t * 340;
    return { x, y, level: s.level };
  });

  // Animate marker to current position
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

  // Beacon pulse at summit
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
          <linearGradient id="path-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FFC83D" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFC83D" stopOpacity="1" />
          </linearGradient>
          <filter id="marker-glow">
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
          opacity="0.3"
        />

        {/* Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#path-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 4"
          opacity="0.7"
        />

        {/* Stations */}
        {pathPoints.map((p) => {
          const step = ladder.find((s) => s.level === p.level)!;
          const isCurrent = step.level === currentLevel;
          const isPast = step.level < currentLevel;
          return (
            <g key={p.level}>
              <circle
                cx={p.x}
                cy={p.y}
                r={step.isSafe ? 5 : 4}
                fill={isPast ? "#3DDBA4" : step.isSafe ? "#3DDBA4" : "#2A2766"}
                stroke={isCurrent ? "#FFC83D" : "transparent"}
                strokeWidth="2"
              />
              {step.isSafe && <text x={p.x + 8} y={p.y + 3} fontSize="8" fill="#3DDBA4">⛺</text>}
              <text
                x={p.x - 18}
                y={p.y + 3}
                fontSize="7"
                fill={isCurrent ? "#FFC83D" : isPast ? "#3DDBA4" : "#BDB8E6"}
                textAnchor="end"
                className="font-mono"
              >
                {formatTaler(step.amount)}
              </text>
            </g>
          );
        })}

        {/* Summit beacon */}
        <circle ref={beaconRef} cx={pathPoints[N - 1]?.x} cy={pathPoints[N - 1]?.y} r="5" fill="#FFC83D" opacity="0.6" />

        {/* Current marker (climbing) */}
        <g ref={markerRef}>
          <circle r="10" fill="#FFC83D" filter="url(#marker-glow)" opacity="0.4" />
          <circle r="6" fill="#FFC83D" stroke="#1A1238" strokeWidth="1.5" />
          <circle r="2.5" fill="#1A1238" />
        </g>
      </svg>
    </div>
  );
}
