import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json, trainingAnswerSchema } from "@/lib/api";
import { buildTrainingQuestion } from "@/app/api/training/route";
import { addToReviewDeck } from "@/lib/game/leitner";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const session = await db.trainingSession.findUnique({ where: { id } });
    if (!session || session.playerId !== p.id) return errorResponse("NOT_FOUND", 404);
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return errorResponse("NOT_FOUND", 404);

    const body = await req.json().catch(() => null);
    const parsed = trainingAnswerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { sessionId, questionRef, optionIndex } = parsed.data;
    if (sessionId !== id) return errorResponse("INVALID_MOVE", 400, "Session-ID passt nicht.");

    const currentLevel = session.currentIndex + 1;
    const expectedRef = `${sessionId}.${currentLevel}`;
    if (questionRef !== expectedRef) return errorResponse("INVALID_MOVE", 400, "Diese Frage passt nicht zum aktuellen Stand.");

    const gq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: id, level: currentLevel } },
      include: { question: { include: { subject: true, topic: true } } },
    });
    if (!gq) return errorResponse("NOT_FOUND", 404);
    if (gq.answeredIndex != null) return errorResponse("INVALID_MOVE", 400, "Bereits beantwortet.");

    const order = JSON.parse(gq.optionOrder) as number[];
    const canonicalAnswered = order[optionIndex];
    const correct = canonicalAnswered === gq.question.correctIndex ? 1 : 0;

    await db.gameQuestion.update({
      where: { gameId_level: { gameId: id, level: currentLevel } },
      data: { answeredIndex: optionIndex, correct, answeredAt: new Date() },
    });

    // Update topic mastery + XP.
    await db.topicMastery.upsert({
      where: { playerId_topicId: { playerId: p.id, topicId: gq.question.topicId } },
      update: { attempts: { increment: 1 }, correct: { increment: correct } },
      create: { playerId: p.id, topicId: gq.question.topicId, attempts: 1, correct },
    });
    await db.player.update({
      where: { id: p.id },
      data: { xp: { increment: correct ? 5 : 1 } },
    });
    await db.trainingSession.update({
      where: { id },
      data: {
        currentIndex: { increment: 1 },
        correctCount: { increment: correct },
      },
    });

    if (correct !== 1) {
      await addToReviewDeck(p.id, gq.questionId);
    }

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

    const nextIndex = currentLevel; // already incremented
    const isLast = nextIndex >= session.length;
    const next = isLast ? null : await buildTrainingQuestion(id, nextIndex + 1);

    if (isLast) {
      await db.trainingSession.update({
        where: { id },
        data: { endedAt: new Date() },
      });
      await db.game.update({
        where: { id },
        data: { status: "finished", endedAt: new Date() },
      });
    }

    return json({
      ok: true,
      correct: correct === 1,
      reveal,
      next,
      finished: isLast,
      correctCount: session.correctCount + correct,
      total: session.length,
    });
  });
}
