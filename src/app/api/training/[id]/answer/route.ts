import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, errorResponse, json, trainingAnswerSchema } from "@/lib/api";
import { buildTrainingQuestion } from "@/app/api/training/route";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    const game = await db.game.findUnique({
      where: { id },
      include: { questions: { select: { level: true }, orderBy: { level: "desc" }, take: 1 } },
    });
    if (!game) return errorResponse("NOT_FOUND", 404);

    const body = await req.json().catch(() => null);
    const parsed = trainingAnswerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { sessionId, questionRef, optionIndex } = parsed.data;
    if (sessionId !== id) return errorResponse("INVALID_MOVE", 400, "Session-ID passt nicht.");

    const currentLevel = game.currentLevel;
    const totalQuestions = game.questions[0]?.level ?? 0;
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

    // Topic mastery + XP + review deck tracked client-side via LokiJS.
    // Skip server-side writes.

    const reveal = {
      correctIndex: gq.question.correctIndex,
      answeredShuffled: optionIndex,
      correct: correct === 1,
      explanation: gq.question.explanation,
      optionOrder: order,
      shuffledOptions: order.map((idx) => [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD][idx]),
      canonicalOptions: [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD],
      topic: { code: gq.question.topic.code, label: gq.question.topic.label },
      questionId: gq.questionId,
      topicId: gq.question.topicId,
    };

    const nextIndex = currentLevel + 1;
    const isLast = nextIndex > totalQuestions;
    const next = isLast ? null : await buildTrainingQuestion(id, nextIndex);

    if (!isLast) {
      await db.game.update({
        where: { id },
        data: { currentLevel: nextIndex },
      });
    } else {
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
      correctCount: 0, // tracked client-side via LokiJS
      total: totalQuestions,
    });
  });
}
