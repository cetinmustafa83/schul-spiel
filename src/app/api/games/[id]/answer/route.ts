import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { catchRoute, errorResponse, json, answerSchema, ApiError } from "@/lib/api";
import { getLadder, fallbackWinnings, levelWinnings, totalLevels } from "@/lib/game/ladder";
import { parseJokerState, serializeJokerState, type JokerState } from "@/lib/game/jokers";
import { buildClientQuestion } from "@/app/api/games/route";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return errorResponse("NOT_FOUND", 404);
    if (game.status !== "in_progress") return errorResponse("GAME_OVER", 409, "Dieses Spiel ist bereits beendet.");

    const body = await req.json().catch(() => null);
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { questionRef, optionIndex } = parsed.data;

    // Verify the questionRef matches the current level (anti-cheat: no replay/skip).
    const expectedRef = `${game.id}.${game.currentLevel}`;
    if (questionRef !== expectedRef) {
      return errorResponse("INVALID_MOVE", 400, "Diese Frage passt nicht zum aktuellen Spielstand.");
    }

    const gq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: id, level: game.currentLevel } },
      include: { question: { include: { subject: true, topic: true } } },
    });
    if (!gq) return errorResponse("NOT_FOUND", 404);
    if (gq.answeredIndex != null) return errorResponse("INVALID_MOVE", 400, "Diese Frage wurde schon beantwortet.");

    // Map the client-side optionIndex (in shuffled order) back to canonical.
    const order = JSON.parse(gq.optionOrder) as number[];
    if (optionIndex < 0 || optionIndex > 3) return errorResponse("VALIDATION", 400, "Ungültige Antwort.");
    const canonicalAnswered = order[optionIndex];
    const correct = canonicalAnswered === gq.question.correctIndex ? 1 : 0;

    const now = new Date();
    await db.gameQuestion.update({
      where: { gameId_level: { gameId: id, level: game.currentLevel } },
      data: { answeredIndex: optionIndex, correct, answeredAt: now },
    });

    // Update anonymous question stats.
    const stat = await db.questionStat.findUnique({ where: { questionId: gq.questionId } });
    if (stat) {
      const counts = JSON.parse(stat.optCountsJson || "{}") as Record<string, number>;
      counts[String(canonicalAnswered)] = (counts[String(canonicalAnswered)] ?? 0) + 1;
      await db.questionStat.update({
        where: { questionId: gq.questionId },
        data: {
          answered: { increment: 1 },
          correct: { increment: correct },
          optCountsJson: JSON.stringify(counts),
        },
      });
    }

    // Topic mastery + XP + review deck are tracked client-side via LokiJS.
    // Skip server-side writes for these (no server player record in browser mode).

    const ladder = await getLadder();
    const currentLevel = game.currentLevel;
    const isLastLevel = currentLevel >= totalLevels(ladder);

    // Build explanation payload — revealed only after answer.
    const reveal = {
      correctIndex: gq.question.correctIndex,
      answeredCanonical: canonicalAnswered,
      answeredShuffled: optionIndex,
      correct: correct === 1,
      explanation: gq.question.explanation,
      optionOrder: order,
      canonicalOptions: [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD],
      // shuffledOptions aligned to the client
      shuffledOptions: order.map((idx) => [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD][idx]),
      topic: { code: gq.question.topic.code, label: gq.question.topic.label },
      questionId: gq.questionId,
      topicId: gq.question.topicId,
    };

    // If wrong: end game with fallback winnings.
    // (Review deck is added client-side via LokiJS.)
    if (correct !== 1) {
      const fallback = fallbackWinnings(ladder, currentLevel - 1);
      await db.game.update({
        where: { id },
        data: {
          status: "finished",
          winnings: fallback,
          endedAt: now,
        },
      });
      return json({
        ok: true,
        correct: false,
        reveal,
        game: {
          status: "finished",
          winnings: fallback,
          reason: "wrong_answer",
        },
        next: null,
      });
    }

    // Correct: advance or finish.
    if (isLastLevel) {
      const winnings = levelWinnings(ladder, currentLevel);
      await db.game.update({
        where: { id },
        data: {
          status: "finished",
          winnings,
          endedAt: now,
          currentLevel: currentLevel, // stay at last level
        },
      });
      return json({
        ok: true,
        correct: true,
        reveal,
        game: {
          status: "finished",
          winnings,
          reason: "summit_reached",
        },
        next: null,
      });
    }

    // Advance.
    const nextLevel = currentLevel + 1;
    await db.game.update({
      where: { id },
      data: { currentLevel: nextLevel },
    });
    const nextQuestion = await buildClientQuestion(id, nextLevel);
    const jokers: JokerState = parseJokerState(game.jokersJson);
    return json({
      ok: true,
      correct: true,
      reveal,
      game: { status: "in_progress", level: nextLevel },
      next: nextQuestion,
      jokers,
    });
  });
}
