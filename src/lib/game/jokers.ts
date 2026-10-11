import { db } from "@/lib/db";
import { trackOfSchoolType } from "@/lib/game/selection";

/**
 * JokerService — every joker result is generated server-side.
 * Joker state is stored on the Game record (jokersJson).
 *
 * PRD §5.3:
 *   - 50:50 (FIFTY_FIFTY) — remove two wrong answers.
 *   - Klassen-Umfrage (AUDIENCE) — animated bar chart. Real stats when
 *     ≥ 30 answers exist, else difficulty-based model.
 *   - Lumi fragen (PHONE) — Lumi gives an opinion. Correctness prob
 *     decreases with ladder level (95% → 60%).
 *   - Frage tauschen (SWITCH) — replace the current question with a fresh
 *     one of the same level/tier (counts as used).
 */

export type JokerType = "FIFTY_FIFTY" | "AUDIENCE" | "PHONE" | "SWITCH";

export interface JokerState {
  FIFTY_FIFTY: boolean;
  AUDIENCE: boolean;
  PHONE: boolean;
  SWITCH: boolean;
}

export function freshJokerState(): JokerState {
  return { FIFTY_FIFTY: true, AUDIENCE: true, PHONE: true, SWITCH: true };
}

export function parseJokerState(json: string | null): JokerState {
  if (!json) return freshJokerState();
  try {
    const obj = JSON.parse(json);
    return {
      FIFTY_FIFTY: !!obj.FIFTY_FIFTY,
      AUDIENCE: !!obj.AUDIENCE,
      PHONE: !!obj.PHONE,
      SWITCH: !!obj.SWITCH,
    };
  } catch {
    return freshJokerState();
  }
}

export function serializeJokerState(s: JokerState): string {
  return JSON.stringify(s);
}

/** 50:50 — returns the two option indices that should be eliminated. */
export function fiftyFifty(correctIndex: number): number[] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  // Shuffle and pick 2
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  return wrong.slice(0, 2);
}

/** Audience joker — returns percentages for the four options. */
export function audiencePoll(correctIndex: number, level: number, stats?: { answered: number; correct: number; optCounts: Record<string, number> }): number[] {
  // If we have ≥ 30 real answers, blend them with the difficulty model.
  let realDist: number[] | null = null;
  if (stats && stats.answered >= 30) {
    const counts = [0, 0, 0, 0];
    for (const [k, v] of Object.entries(stats.optCounts)) {
      const idx = parseInt(k, 10);
      if (idx >= 0 && idx <= 3) counts[idx] = v;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    if (total > 0) realDist = counts.map((c) => Math.round((c / total) * 100));
  }
  if (realDist) {
    // Normalise to 100
    const sum = realDist.reduce((a, b) => a + b, 0) || 1;
    return realDist.map((p) => Math.round((p / sum) * 100));
  }
  // Difficulty-based model: higher level = more spread/noise.
  const tier = level <= 5 ? "A" : level <= 10 ? "B" : "C";
  const baseCorrect = tier === "A" ? 65 : tier === "B" ? 50 : 38;
  const noise = (tier === "A" ? 8 : tier === "B" ? 12 : 18);
  const correct = Math.max(20, Math.min(80, baseCorrect + Math.floor((Math.random() - 0.5) * 2 * noise)));
  const remaining = 100 - correct;
  const others = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  const parts = others.map(() => Math.random());
  const sum = parts.reduce((a, b) => a + b, 0) || 1;
  const dist = [0, 0, 0, 0];
  dist[correctIndex] = correct;
  others.forEach((idx, i) => {
    dist[idx] = Math.round((parts[i] / sum) * remaining);
  });
  // Fix rounding to sum to 100
  const diff = 100 - dist.reduce((a, b) => a + b, 0);
  dist[others[0]] += diff;
  return dist;
}

/** Phone joker (Lumi fragen) — returns Lumi's suggested index + phrase. */
export function phoneLumi(correctIndex: number, level: number): { suggests: number; confidence: "high" | "medium" | "low"; phrase: string } {
  // Correctness prob decreases with ladder level: 95% at level 1 → 60% at level 15.
  const p = Math.max(0.55, 0.95 - (level - 1) * 0.025);
  const correct = Math.random() < p;
  const suggests = correct ? correctIndex : pickWrong(correctIndex);
  let confidence: "high" | "medium" | "low";
  let phrase: string;
  if (level <= 5) {
    confidence = "high";
    phrase = "Ich bin mir ziemlich sicher, dass es diese Antwort ist …";
  } else if (level <= 10) {
    confidence = "medium";
    phrase = "Hmm, ich tippe auf diese Option, aber ganz sicher bin ich mir nicht.";
  } else {
    confidence = "low";
    phrase = "Puh, das ist knifflig. Ich würde sagen … diese hier?";
  }
  return { suggests, confidence, phrase };
}

function pickWrong(correct: number): number {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct);
  return wrong[Math.floor(Math.random() * wrong.length)];
}

/**
 * Phone-joker phrase pool — pulled from the `phrases` table if available.
 * Falls back to the deterministic phrases above when the DB is empty.
 */
export async function lumiPhrase(kind: "cheer" | "encourage" | "thinking" | "phone_high" | "phone_low"): Promise<string | null> {
  const rows = await db.phrase.findMany({ where: { kind } });
  if (rows.length === 0) return null;
  return rows[Math.floor(Math.random() * rows.length)].text;
}
