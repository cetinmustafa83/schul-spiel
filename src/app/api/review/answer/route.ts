import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json, trainingAnswerSchema } from "@/lib/api";
import { markReviewAnswer } from "@/lib/game/leitner";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const body = await req.json().catch(() => null);
    const parsed = trainingAnswerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { sessionId, questionRef, optionIndex } = parsed.data;
    const session = await db.trainingSession.findUnique({ where: { id: sessionId } });
    if (!session || session.playerId !== p.id) return errorResponse("NOT_FOUND", 404);
    // For review sessions, "level" = currentIndex + 1 in the Game table.
    const game = await db.game.findUnique({ where: { id: sessionId } });
    if (!game) return errorResponse("NOT_FOUND", 404);

    const currentLevel = game.currentLevel;
    const expectedRef = `${sessionId}.${currentLevel}`;
    if (questionRef !== expectedRef) return errorResponse("INVALID_MOVE", 400, "Diese Frage passt nicht zum aktuellen Stand.");

    const gq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: sessionId, level: currentLevel } },
      include: { question: { include: { subject: true, topic: true } } },
    });
    if (!gq) return errorResponse("NOT_FOUND", 404);
    if (gq.answeredIndex != null) return errorResponse("INVALID_MOVE", 400, "Bereits beantwortet.");

    const order = JSON.parse(gq.optionOrder) as number[];
    const canonicalAnswered = order[optionIndex];
    const correct = canonicalAnswered === gq.question.correctIndex ? 1 : 0;

    await db.gameQuestion.update({
      where: { gameId_level: { gameId: sessionId, level: currentLevel } },
      data: { answeredIndex: optionIndex, correct, answeredAt: new Date() },
    });
    // Mark in review deck (advance or reset).
    await markReviewAnswer(p.id, gq.questionId, correct === 1);
    // XP for review answers (small).
    await db.player.update({
      where: { id: p.id },
      data: { xp: { increment: correct ? 3 : 0 } },
    });

    const nextLevel = currentLevel + 1;
    await db.game.update({
      where: { id: sessionId },
      data: { currentLevel: nextLevel },
    });

    const reveal = {
      correctIndex: gq.question.correctIndex,
      answeredShuffled: optionIndex,
      correct: correct === 1,
      explanation: gq.question.explanation,
      optionOrder: order,
      shuffledOptions: order.map((idx) => [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD][idx]),
      canonicalOptions: [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD],
      topic: { code: gq.question.topic.code, label: gq.question.topic.label },
    };

    // Build next question
    const nextGq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: sessionId, level: nextLevel } },
      include: { question: { include: { subject: true, topic: true } } },
    });
    let next = null;
    let finished = false;
    if (!nextGq) {
      finished = true;
      await db.game.update({
        where: { id: sessionId },
        data: { status: "finished", endedAt: new Date() },
      });
    } else {
      const nextOrder = JSON.parse(nextGq.optionOrder) as number[];
      const nextOpts = [nextGq.question.optA, nextGq.question.optB, nextGq.question.optC, nextGq.question.optD];
      next = {
        ref: `${sessionId}.${nextLevel}`,
        level: nextLevel,
        subject: {
          code: nextGq.question.subject.code,
          label: nextGq.question.subject.label,
          icon: nextGq.question.subject.icon,
          color: nextGq.question.subject.color,
        },
        topic: { code: nextGq.question.topic.code, label: nextGq.question.topic.label },
        difficulty: nextGq.question.difficulty,
        text: nextGq.question.text,
        options: nextOrder.map((idx) => nextOpts[idx]),
      };
    }

    return json({ ok: true, correct: correct === 1, reveal, next, finished });
  });
}
