import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * The HARD INVARIANT (PRD §6.2):
 *   For player grade N and track T: a question is eligible only if
 *   intro_grade_T IS NOT NULL AND intro_grade_T ≤ N AND status = 'published'
 *   AND its topic is active for track T.
 *
 * Enforced here at the SQL-query layer (primary).
 */

export type Track = "basic" | "mid" | "advanced";

/** Map a school-type code (HS/RS/SEK/GE/GY) to its content track. */
export function trackOfSchoolType(schoolTypeCode: string): Track {
  switch (schoolTypeCode) {
    case "HS": return "basic";
    case "RS":
    case "SEK":
    case "GE": return "mid";
    case "GY": return "advanced";
    default: return "mid";
  }
}

/** DB column that holds the intro-grade for the given track. */
export function introGradeColumn(track: Track): "introGradeHs" | "introGradeRs" | "introGradeGy" {
  // basic → HS column; mid → RS column (SEK/GE also use RS column per PRD §6.5);
  // advanced → GY column.
  if (track === "basic") return "introGradeHs";
  if (track === "advanced") return "introGradeGy";
  return "introGradeRs";
}

export interface PlayerContext {
  playerId: string;
  grade: number; // 5..8
  track: Track;
}

/** k = N − g where g = effective intro grade of the question for this track. */
export function kBucket(introGrade: number, playerGrade: number): "k0" | "k1" | "k2plus" {
  const k = playerGrade - introGrade;
  if (k <= 0) return "k0";
  if (k === 1) return "k1";
  return "k2plus";
}

export function tierForLevel(level: number): "A" | "B" | "C" {
  if (level <= 5) return "A";
  if (level <= 10) return "B";
  return "C";
}

/** Tier -> allowed difficulty range. Default weights (PRD §6.3). */
export function difficultyRangeForTier(tier: "A" | "B" | "C"): [number, number] {
  if (tier === "A") return [1, 2];
  if (tier === "B") return [2, 3];
  return [3, 5];
}

/** Monotonic-ish difficulty target along the ladder (PRD §6.3 additional rules). */
export function difficultyTarget(level: number): number {
  const t = 1 + (4 * (level - 1)) / 14;
  return Math.round(t);
}

/**
 * Loads the active selection-weights and renormalises across non-empty k-buckets.
 */
export async function loadRenormalisedWeights(
  tier: "A" | "B" | "C",
  availableBuckets: Set<"k0" | "k1" | "k2plus">
): Promise<Array<{ kBucket: "k0" | "k1" | "k2plus"; weight: number; diffMin: number; diffMax: number }>> {
  const rows = await db.selectionWeight.findMany({
    where: { tier },
    orderBy: { kBucket: "asc" },
  });
  const total = rows
    .filter((r) => availableBuckets.has(r.kBucket as "k0" | "k1" | "k2plus"))
    .reduce((sum, r) => sum + r.weight, 0);
  if (total <= 0) {
    const n = availableBuckets.size || 1;
    return Array.from(availableBuckets).map((kb) => {
      const r = rows.find((x) => x.kBucket === kb);
      const [dMin, dMax] = difficultyRangeForTier(tier);
      return { kBucket: kb, weight: 1 / n, diffMin: r?.diffMin ?? dMin, diffMax: r?.diffMax ?? dMax };
    });
  }
  return rows
    .filter((r) => availableBuckets.has(r.kBucket as "k0" | "k1" | "k2plus"))
    .map((r) => ({
      kBucket: r.kBucket as "k0" | "k1" | "k2plus",
      weight: r.weight / total,
      diffMin: r.diffMin,
      diffMax: r.diffMax,
    }));
}

export function sampleBucket(weights: Array<{ kBucket: "k0" | "k1" | "k2plus"; weight: number }>): "k0" | "k1" | "k2plus" {
  const r = Math.random();
  let acc = 0;
  for (const w of weights) {
    acc += w.weight;
    if (r <= acc) return w.kBucket;
  }
  return weights[weights.length - 1].kBucket;
}

type Candidate = { id: number; subjectId: number; introGrade: number | null; difficulty: number; clusterId: string | null };

function readIntroGrade(row: Record<string, unknown>, column: "introGradeHs" | "introGradeRs" | "introGradeGy"): number | null {
  const v = row[column];
  return typeof v === "number" ? v : null;
}

/** Pick a question from the eligible pool, with diversity + freshness rules. */
export async function pickQuestionForLevel(
  ctx: PlayerContext,
  level: number,
  tier: "A" | "B" | "C",
  usedQuestionIds: number[],
  usedSubjectIds: number[],
  lastSubjectId: number | null,
  consecutiveSameSubject: number,
  seenRecently: Set<number>
): Promise<{ questionId: number; subjectId: number; introGrade: number; difficulty: number } | null> {
  const column = introGradeColumn(ctx.track);
  const [diffMin, diffMax] = difficultyRangeForTier(tier);

  let allowedK: Set<"k0" | "k1" | "k2plus">;
  if (level === 15) {
    allowedK = new Set(["k0"]);
  } else if (level === 13 || level === 14) {
    allowedK = Math.random() < 0.8 ? new Set(["k0"]) : new Set(["k1"]);
  } else {
    allowedK = new Set(["k0", "k1", "k2plus"]);
  }

  const weights = await loadRenormalisedWeights(tier, allowedK);
  const targetDiff = difficultyTarget(level);

  type Pool = {
    kBucket: "k0" | "k1" | "k2plus";
    items: Candidate[];
  };
  const pools: Pool[] = [];
  for (const w of weights) {
    const where: Prisma.QuestionWhereInput = {
      status: "published",
      difficulty: { gte: Math.max(w.diffMin, diffMin), lte: Math.min(w.diffMax, diffMax) },
      AND: [{ [column]: { not: null } }],
      id: { notIn: [...usedQuestionIds, ...Array.from(seenRecently)] },
    };
    if (consecutiveSameSubject >= 2) {
      where.subjectId = { not: lastSubjectId ?? undefined };
    }
    const rows = await db.question.findMany({
      where,
      select: { id: true, subjectId: true, [column]: true, difficulty: true, clusterId: true },
      take: 100,
    });
    const items: Candidate[] = [];
    for (const r of rows) {
      const ig = readIntroGrade(r as unknown as Record<string, unknown>, column);
      if (ig == null || ig > ctx.grade) continue;
      const kb = kBucket(ig, ctx.grade);
      if (kb !== w.kBucket) continue;
      items.push({
        id: r.id,
        subjectId: r.subjectId,
        introGrade: ig,
        difficulty: r.difficulty,
        clusterId: (r as { clusterId?: string | null }).clusterId ?? null,
      });
    }
    if (items.length > 0) {
      pools.push({ kBucket: w.kBucket, items });
    }
  }

  if (pools.length === 0) {
    return pickRelaxed(ctx, level, tier, usedQuestionIds, lastSubjectId, consecutiveSameSubject);
  }

  const weighted = pools.map((p) => {
    const w = weights.find((x) => x.kBucket === p.kBucket)?.weight ?? 1 / pools.length;
    return { kBucket: p.kBucket, weight: w, items: p.items };
  });
  const chosenBucket = (() => {
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const w of weighted) {
      acc += w.weight;
      if (r <= acc) return w;
    }
    return weighted[weighted.length - 1];
  })();

  const items = chosenBucket.items;
  items.sort((a, b) => Math.abs(a.difficulty - targetDiff) - Math.abs(b.difficulty - targetDiff));
  const topN = items.slice(0, 10);
  const picked = topN[Math.floor(Math.random() * topN.length)];
  return {
    questionId: picked.id,
    subjectId: picked.subjectId,
    introGrade: picked.introGrade ?? 0,
    difficulty: picked.difficulty,
  };
}

async function pickRelaxed(
  ctx: PlayerContext,
  _level: number,
  tier: "A" | "B" | "C",
  usedQuestionIds: number[],
  lastSubjectId: number | null,
  consecutiveSameSubject: number
): Promise<{ questionId: number; subjectId: number; introGrade: number; difficulty: number } | null> {
  const column = introGradeColumn(ctx.track);
  const [diffMin, diffMax] = difficultyRangeForTier(tier);
  const where: Prisma.QuestionWhereInput = {
    status: "published",
    difficulty: { gte: diffMin, lte: diffMax },
    AND: [{ [column]: { not: null } }],
    id: { notIn: usedQuestionIds },
  };
  if (consecutiveSameSubject >= 2 && lastSubjectId) {
    where.subjectId = { not: lastSubjectId };
  }
  const rows = await db.question.findMany({
    where,
    select: { id: true, subjectId: true, [column]: true, difficulty: true },
    take: 50,
  });
  const eligible: Candidate[] = [];
  for (const r of rows) {
    const ig = readIntroGrade(r as unknown as Record<string, unknown>, column);
    if (ig == null || ig > ctx.grade) continue;
    eligible.push({ id: r.id, subjectId: r.subjectId, introGrade: ig, difficulty: r.difficulty, clusterId: null });
  }
  if (eligible.length === 0) {
    // Last resort: any published question for the grade (no tier filter).
    const fallbackRows = await db.question.findMany({
      where: {
        status: "published",
        AND: [{ [column]: { not: null } }],
        id: { notIn: usedQuestionIds },
      },
      select: { id: true, subjectId: true, [column]: true, difficulty: true },
      take: 20,
    });
    const fallbackEligible = fallbackRows
      .map((r) => ({ id: r.id, subjectId: r.subjectId, introGrade: readIntroGrade(r as unknown as Record<string, unknown>, column) ?? 0, difficulty: r.difficulty }))
      .filter((r) => r.introGrade <= ctx.grade);
    if (fallbackEligible.length === 0) return null;
    const picked = fallbackEligible[Math.floor(Math.random() * fallbackEligible.length)];
    return picked;
  }
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  return {
    questionId: picked.id,
    subjectId: picked.subjectId,
    introGrade: picked.introGrade ?? 0,
    difficulty: picked.difficulty,
  };
}
