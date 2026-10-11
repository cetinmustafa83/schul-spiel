import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { buildDaily, todayKey } from "@/lib/game/daily";

export const runtime = "nodejs";

/**
 * GET /api/daily — get today's 5 daily-quiz questions for this player's
 * (track + grade). The questions are deterministic by date+track+grade,
 * so all players with the same track+grade see the same questions.
 *
 * This endpoint returns the 5 questions in shuffled option order. Each
 * question's `ref` is just `${day}.${idx}` for client display.
 */
export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);
    const { questionIds, day } = await buildDaily(p.id, player.schoolType, player.grade);
    if (questionIds.length === 0) {
      return json({ day, items: [] });
    }
    // Mark which questions are already answered today by this player.
    const answered = await db.dailyAnswer.findMany({
      where: { playerId: p.id, day },
      select: { questionId: true, correct: true },
    });
    const answeredMap = new Map(answered.map((a) => [a.questionId, a.correct === 1]));

    const rows = await db.question.findMany({
      where: { id: { in: questionIds } },
      include: { subject: true, topic: true },
    });
    // Preserve the deterministic order.
    const ordered = questionIds.map((qid) => rows.find((r) => r.id === qid)!).filter(Boolean);
    const items = ordered.map((q, idx) => {
      const order = shuffleOrder(`${day}|${player.schoolType}|${player.grade}`, idx);
      const opts = [q.optA, q.optB, q.optC, q.optD];
      const shuffled = order.map((i) => opts[i]);
      return {
        ref: `${day}.${idx}`,
        idx,
        questionId: q.id,
        subject: { code: q.subject.code, label: q.subject.label, icon: q.subject.icon, color: q.subject.color },
        topic: { code: q.topic.code, label: q.topic.label },
        difficulty: q.difficulty,
        text: q.text,
        options: shuffled,
        answered: answeredMap.has(q.id),
        correct: answeredMap.get(q.id) ?? false,
      };
    });
    return json({ day, items });
  });
}

function shuffleOrder(seed: string, idx: number): number[] {
  let h = 2166136261;
  const s = `${seed}|${idx}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rng = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
