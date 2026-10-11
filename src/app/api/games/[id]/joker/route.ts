import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json, jokerSchema, ApiError } from "@/lib/api";
import { parseJokerState, serializeJokerState, fiftyFifty, audiencePoll, phoneLumi, type JokerState } from "@/lib/game/jokers";
import { trackOfSchoolType, type PlayerContext, pickQuestionForLevel, tierForLevel } from "@/lib/game/selection";
import { buildClientQuestion, shuffleOrder } from "@/app/api/games/route";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const game = await db.game.findUnique({ where: { id } });
    if (!game || game.playerId !== p.id) return errorResponse("NOT_FOUND", 404);
    if (game.status !== "in_progress") return errorResponse("GAME_OVER", 409, "Dieses Spiel ist bereits beendet.");

    const body = await req.json().catch(() => null);
    const parsed = jokerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { type } = parsed.data;

    const state: JokerState = parseJokerState(game.jokersJson);
    if (!state[type]) {
      return errorResponse("INVALID_MOVE", 400, "Diesen Joker hast du in diesem Spiel schon benutzt.");
    }

    const gq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: id, level: game.currentLevel } },
      include: { question: { include: { subject: true } } },
    });
    if (!gq) return errorResponse("NOT_FOUND", 404);
    if (gq.answeredIndex != null) {
      return errorResponse("INVALID_MOVE", 400, "Die Frage wurde schon beantwortet — kein Joker mehr möglich.");
    }

    // Mark joker as used.
    state[type] = false;
    await db.game.update({
      where: { id },
      data: { jokersJson: serializeJokerState(state) },
    });
    await db.gameQuestion.update({
      where: { gameId_level: { gameId: id, level: game.currentLevel } },
      data: { jokerUsed: type },
    });

    const order = JSON.parse(gq.optionOrder) as number[];
    // canonical correct index → its position in the shuffled array
    const correctShuffled = order.indexOf(gq.question.correctIndex);

    if (type === "FIFTY_FIFTY") {
      const eliminatedCanonical = fiftyFifty(gq.question.correctIndex);
      const eliminatedShuffled = eliminatedCanonical.map((c) => order.indexOf(c));
      return json({
        type,
        jokers: state,
        eliminated: eliminatedShuffled, // client-side indices to hide
      });
    }

    if (type === "AUDIENCE") {
      const stat = await db.questionStat.findUnique({ where: { questionId: gq.questionId } });
      const optCounts = stat ? JSON.parse(stat.optCountsJson || "{}") as Record<string, number> : {};
      const dist = audiencePoll(gq.question.correctIndex, game.currentLevel, {
        answered: stat?.answered ?? 0,
        correct: stat?.correct ?? 0,
        optCounts,
      });
      // dist is indexed canonically; remap to shuffled positions for the client.
      const shuffledDist = order.map((canonicalIdx) => dist[canonicalIdx]);
      return json({
        type,
        jokers: state,
        poll: shuffledDist, // 4 percentages aligned to client's options
      });
    }

    if (type === "PHONE") {
      const { suggests, confidence, phrase } = phoneLumi(gq.question.correctIndex, game.currentLevel);
      const suggestsShuffled = order.indexOf(suggests);
      return json({
        type,
        jokers: state,
        suggests: suggestsShuffled,
        confidence,
        phrase,
      });
    }

    if (type === "SWITCH") {
      // Replace the current question with a fresh one of the same level/tier,
      // excluding all questions already used in this game.
      const used = await db.gameQuestion.findMany({
        where: { gameId: id },
        select: { questionId: true },
      });
      const usedIds = used.map((u) => u.questionId);
      const track = trackOfSchoolType(game.track) === "basic" ? "basic" : trackOfSchoolType(game.track);
      // The track in the Game table is a string ("basic"/"mid"/"advanced") — pass through directly.
      const ctx: PlayerContext = { playerId: p.id, grade: game.gradeAtStart, track: game.track as "basic" | "mid" | "advanced" };
      const tier = tierForLevel(game.currentLevel);
      const picked = await pickQuestionForLevel(ctx, game.currentLevel, tier, usedIds, [], null, 0, new Set());
      if (!picked) {
        // Couldn't find a replacement — refund the joker.
        state[type] = true;
        await db.game.update({ where: { id }, data: { jokersJson: serializeJokerState(state) } });
        return errorResponse("INVALID_MOVE", 503, "Leider keine passende Ersatz-Frage gefunden — der Joker bleibt dir erhalten.");
      }
      // Replace the game question row.
      const newOrder = shuffleOrder(id, game.currentLevel);
      await db.gameQuestion.update({
        where: { gameId_level: { gameId: id, level: game.currentLevel } },
        data: {
          questionId: picked.questionId,
          optionOrder: JSON.stringify(newOrder),
        },
      });
      const newQ = await buildClientQuestion(id, game.currentLevel);
      return json({
        type,
        jokers: state,
        newQuestion: newQ,
      });
    }

    return errorResponse("VALIDATION", 400, "Unbekannter Joker.");
  });
}
