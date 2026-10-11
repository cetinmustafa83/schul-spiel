"use client";

import { cn } from "@/lib/utils";

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
  variant?: "rail" | "compact";
  className?: string;
}

export function LadderRail({ ladder, currentLevel, variant = "rail", className }: LadderRailProps) {
  const steps = [...ladder].sort((a, b) => b.level - a.level); // 15 → 1

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

  return (
    <div className={cn("ladder-rail nice-scroll max-h-[60vh] overflow-y-auto pr-1", className)} aria-label="Taler-Leiter">
      <ol className="flex flex-col gap-1">
        {steps.map((s) => {
          const isCurrent = s.level === currentLevel;
          const isPast = s.level < currentLevel;
          return (
            <li
              key={s.level}
              className={cn(
                "station flex items-center justify-between rounded-xl px-3 py-1.5 text-sm",
                isCurrent && "current bg-gold/10 border border-gold/40",
                !isCurrent && "border border-transparent",
                s.isSafe && !isCurrent && "safe"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    isCurrent ? "bg-gold text-bg0" : isPast ? "bg-mint/20 text-mint" : s.isSafe ? "bg-mint/20 text-mint" : "bg-bg2/60 text-ink-dim"
                  )}
                >
                  {s.level}
                </span>
                {s.isSafe && <span aria-hidden>⛺</span>}
                {s.label && <span className="text-[10px] text-ink-dim">{s.label}</span>}
              </span>
              <span
                className={cn(
                  "font-display tabular-nums",
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

function formatTaler(n: number): string {
  return new Intl.NumberFormat("de-DE").format(n);
}
