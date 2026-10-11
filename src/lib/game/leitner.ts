import { db } from "@/lib/db";

/**
 * Leitner-system spaced-repetition deck (PRD §5.5).
 * Boxes 1→4 with intervals: 1 day / 3 days / 7 days / 21 days.
 * Intervals are stored in the `settings` table (key `leitner_intervals`).
 */

const DEFAULT_INTERVALS_DAYS = [1, 3, 7, 21];

export async function leitnerIntervals(): Promise<number[]> {
  const setting = await db.setting.findUnique({ where: { key: "leitner_intervals" } });
  if (!setting) return DEFAULT_INTERVALS_DAYS;
  try {
    const parsed = JSON.parse(setting.value);
    if (Array.isArray(parsed) && parsed.length === 4) return parsed as number[];
  } catch {
    // fall through
  }
  return DEFAULT_INTERVALS_DAYS;
}

/** Adds a missed question to the deck (or resets it to box 1 if already present). */
export async function addToReviewDeck(playerId: string, questionId: number): Promise<void> {
  const existing = await db.reviewDeckItem.findUnique({
    where: { playerId_questionId: { playerId, questionId } },
  });
  const intervals = await leitnerIntervals();
  const dueAt = new Date(Date.now() + intervals[0] * 24 * 60 * 60 * 1000);
  if (existing) {
    await db.reviewDeckItem.update({
      where: { playerId_questionId: { playerId, questionId } },
      data: { box: 1, dueAt, answeredCount: 0 },
    });
  } else {
    await db.reviewDeckItem.create({
      data: { playerId, questionId, box: 1, dueAt, answeredCount: 0 },
    });
  }
}

export async function countDue(playerId: string): Promise<number> {
  return db.reviewDeckItem.count({
    where: { playerId, dueAt: { lte: new Date() } },
  });
}

export async function fetchDue(playerId: string, limit = 20): Promise<{ questionId: number }[]> {
  return db.reviewDeckItem.findMany({
    where: { playerId, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take: limit,
    select: { questionId: true },
  });
}

/** Mark a review item as answered correctly (advance) or wrong (reset). */
export async function markReviewAnswer(playerId: string, questionId: number, correct: boolean): Promise<void> {
  const existing = await db.reviewDeckItem.findUnique({
    where: { playerId_questionId: { playerId, questionId } },
  });
  if (!existing) return;
  const intervals = await leitnerIntervals();
  let nextBox: number;
  if (correct) {
    nextBox = Math.min(4, existing.box + 1);
    if (nextBox === 4) {
      // Graduated — remove from deck.
      await db.reviewDeckItem.delete({
        where: { playerId_questionId: { playerId, questionId } },
      });
      return;
    }
  } else {
    nextBox = 1;
  }
  const dueAt = new Date(Date.now() + intervals[nextBox - 1] * 24 * 60 * 60 * 1000);
  await db.reviewDeckItem.update({
    where: { playerId_questionId: { playerId, questionId } },
    data: { box: nextBox, dueAt, answeredCount: { increment: 1 } },
  });
}
