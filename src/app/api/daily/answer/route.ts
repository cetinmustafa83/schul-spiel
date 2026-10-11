import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json, dailyAnswerSchema } from "@/lib/api";
import { todayKey } from "@/lib/game/daily";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const body = await req.json().catch(() => null);
    const parsed = dailyAnswerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { day, questionRef, optionIndex } = parsed.data;

    // Parse ref to find the questionId
    const refParts = questionRef.split(".");
    if (refParts.length !== 2) return errorResponse("VALIDATION", 400, "Ungültige Referenz.");
    const idx = parseInt(refParts[1], 10);
    if (isNaN(idx) || idx < 0 || idx > 10) return errorResponse("VALIDATION", 400, "Ungültige Frage.");

    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    // Build the daily questions (deterministic) — then find the questionId at idx.
    const { buildDaily } = await import("@/lib/game/daily");
    const { questionIds } = await buildDaily(p.id, player.schoolType, player.grade);
    if (idx >= questionIds.length) return errorResponse("VALIDATION", 400, "Frage nicht gefunden.");
    const questionId = questionIds[idx];

    // Check already answered.
    const existing = await db.dailyAnswer.findUnique({
      where: { playerId_day_questionId: { playerId: p.id, day, questionId } },
    });
    if (existing) return errorResponse("INVALID_MOVE", 400, "Du hast diese Frage heute schon beantwortet.");

    const question = await db.question.findUnique({
      where: { id: questionId },
      include: { subject: true, topic: true },
    });
    if (!question) return errorResponse("NOT_FOUND", 404);

    // Verify the optionIndex is for the same shuffled order used in GET /api/daily.
    const order = shuffleOrder(`${day}|${player.schoolType}|${player.grade}`, idx);
    const canonicalAnswered = order[optionIndex];
    const correct = canonicalAnswered === question.correctIndex ? 1 : 0;

    await db.dailyAnswer.create({
      data: { playerId: p.id, day, questionId, correct, answeredAt: new Date() },
    });
    // XP for daily (small bonus).
    await db.player.update({
      where: { id: p.id },
      data: { xp: { increment: correct ? 8 : 2 } },
    });
    // Topic mastery
    await db.topicMastery.upsert({
      where: { playerId_topicId: { playerId: p.id, topicId: question.topicId } },
      update: { attempts: { increment: 1 }, correct: { increment: correct } },
      create: { playerId: p.id, topicId: question.topicId, attempts: 1, correct },
    });

    const reveal = {
      correctIndex: question.correctIndex,
      answeredShuffled: optionIndex,
      correct: correct === 1,
      explanation: question.explanation,
      optionOrder: order,
      shuffledOptions: order.map((i) => [question.optA, question.optB, question.optC, question.optD][i]),
      canonicalOptions: [question.optA, question.optB, question.optC, question.optD],
      topic: { code: question.topic.code, label: question.topic.label },
    };

    return json({ ok: true, correct: correct === 1, reveal });
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
