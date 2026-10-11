import { db } from "@/lib/db";

/**
 * Ladder math — all values DB-driven via `ladder_levels`.
 * Falls back to the PRD §5.2 default ladder if the table is empty (dev safety).
 */

export interface LadderStep {
  level: number;
  amount: number;
  isSafe: boolean;
  tier: "A" | "B" | "C";
  label?: string | null;
}

const DEFAULT_LADDER: LadderStep[] = [
  { level: 1, amount: 50, isSafe: false, tier: "A" },
  { level: 2, amount: 100, isSafe: false, tier: "A" },
  { level: 3, amount: 200, isSafe: false, tier: "A" },
  { level: 4, amount: 300, isSafe: false, tier: "A" },
  { level: 5, amount: 500, isSafe: true, tier: "A", label: "Sicherheitsstufe 1" },
  { level: 6, amount: 1000, isSafe: false, tier: "B" },
  { level: 7, amount: 2000, isSafe: false, tier: "B" },
  { level: 8, amount: 4000, isSafe: false, tier: "B" },
  { level: 9, amount: 8000, isSafe: false, tier: "B" },
  { level: 10, amount: 16000, isSafe: true, tier: "B", label: "Sicherheitsstufe 2" },
  { level: 11, amount: 32000, isSafe: false, tier: "C" },
  { level: 12, amount: 64000, isSafe: false, tier: "C" },
  { level: 13, amount: 125000, isSafe: false, tier: "C" },
  { level: 14, amount: 250000, isSafe: false, tier: "C" },
  { level: 15, amount: 500000, isSafe: false, tier: "C", label: "Gipfel" },
];

let cache: LadderStep[] | null = null;

export async function getLadder(): Promise<LadderStep[]> {
  if (cache) return cache;
  const rows = await db.ladderLevel.findMany({ orderBy: { level: "asc" } });
  if (rows.length === 0) {
    cache = DEFAULT_LADDER;
    return cache;
  }
  cache = rows.map((r) => ({
    level: r.level,
    amount: r.amount,
    isSafe: r.isSafe === 1,
    tier: r.tier as "A" | "B" | "C",
    label: r.label,
  }));
  return cache;
}

/**
 * Returns the highest safe level reached at or below `level`, or 0 if none.
 * Used when a player answers wrongly: they fall back to the highest safe
 * level's winnings.
 */
export function fallbackWinnings(ladder: LadderStep[], reachedLevel: number): number {
  let amount = 0;
  for (const step of ladder) {
    if (step.level > reachedLevel) break;
    if (step.isSafe) amount = step.amount;
  }
  return amount;
}

/** Winnings if the player successfully answers the given level. */
export function levelWinnings(ladder: LadderStep[], level: number): number {
  return ladder.find((s) => s.level === level)?.amount ?? 0;
}

/** Winnings when walking away at level N (after answering N-1 correctly). */
export function walkAwayWinnings(ladder: LadderStep[], currentLevel: number): number {
  // currentLevel is the next question to answer; walking away keeps the previous.
  if (currentLevel <= 1) return 0;
  return levelWinnings(ladder, currentLevel - 1);
}

export function totalLevels(ladder: LadderStep[]): number {
  return ladder.length;
}
