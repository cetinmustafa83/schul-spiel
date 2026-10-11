import { createHash } from "crypto";
import { db } from "@/lib/db";
import { trackOfSchoolType, type PlayerContext } from "@/lib/game/selection";
import { pickQuestionForLevel, tierForLevel } from "@/lib/game/selection";

/**
 * Tagesquiz — 5 questions per day, same for all players of the same
 * (track + grade). Deterministic seed by date + track + grade (PRD §5.5).
 *
 * Selection uses the same HARD INVARIANT: only questions whose intro grade
 * ≤ player grade are eligible.
 */

function berlinDayKey(d: Date = new Date()): string {
  // Europe/Berlin = UTC+1 (or UTC+2 DST). For determinism we use a stable
  // approximation: shift by +1 hour and slice to YYYY-MM-DD. The browser-side
  // also computes the same day key, so they always agree.
  const shifted = new Date(d.getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return berlinDayKey();
}

function seededRandom(seed: string): () => number {
  // Mulberry32 PRNG seeded by a string hash.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function buildDaily(playerId: string, schoolType: string, grade: number): Promise<{ questionIds: number[]; day: string }> {
  const day = todayKey();
  const track = trackOfSchoolType(schoolType);
  const ctx: PlayerContext = { playerId, grade, track };
  const rng = seededRandom(`${day}|${track}|${grade}`);

  // Fetch a broad candidate pool (grade-appropriate) and pick 5 deterministically.
  const column = track === "basic" ? "introGradeHs" : track === "advanced" ? "introGradeGy" : "introGradeRs";

  // Already-answered today?
  const already = await db.dailyAnswer.findMany({
    where: { playerId, day },
    select: { questionId: true },
  });
  const alreadySet = new Set(already.map((a) => a.questionId));

  const candidates = await db.question.findMany({
    where: {
      status: "published",
      AND: [{ [column]: { not: null } }],
      id: { notIn: Array.from(alreadySet) },
    },
    select: { id: true, subjectId: true, [column]: true, difficulty: true },
    take: 500,
  });
  const eligible = candidates
    .map((r) => {
      const ig = (r as Record<string, unknown>)[column] as number | null;
      return { id: r.id, subjectId: r.subjectId, introGrade: ig, difficulty: r.difficulty };
    })
    .filter((r) => r.introGrade != null && r.introGrade <= grade);

  // Pick 5 with subject diversity using the seeded RNG.
  const picked: number[] = [];
  const usedSubjects: number[] = [];
  const lastSubjects: number[] = [];
  while (picked.length < 5 && eligible.length > 0) {
    const idx = Math.floor(rng() * eligible.length);
    const c = eligible[idx];
    if (picked.includes(c.id)) {
      eligible.splice(idx, 1);
      continue;
    }
    // Avoid 2 consecutive from the same subject.
    if (lastSubjects.length >= 2 && lastSubjects[lastSubjects.length - 1] === c.subjectId && lastSubjects[lastSubjects.length - 2] === c.subjectId) {
      eligible.splice(idx, 1);
      continue;
    }
    picked.push(c.id);
    usedSubjects.push(c.subjectId);
    lastSubjects.push(c.subjectId);
    eligible.splice(idx, 1);
  }

  // Fallback: if we couldn't pick 5 (small DB), pad with whatever's eligible.
  while (picked.length < 5 && eligible.length > 0) {
    const c = eligible.shift();
    if (c && !picked.includes(c.id)) picked.push(c.id);
  }

  return { questionIds: picked, day };
}

/** Check if a daily question has already been answered today by this player. */
export async function isDailyAnswered(playerId: string, questionId: number, day: string): Promise<boolean> {
  const row = await db.dailyAnswer.findUnique({
    where: { playerId_day_questionId: { playerId, day, questionId } },
  });
  return !!row;
}
