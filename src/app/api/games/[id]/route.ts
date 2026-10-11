import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { catchRoute, errorResponse, json } from "@/lib/api";
import { getLadder } from "@/lib/game/ladder";
import { parseJokerState, type JokerState } from "@/lib/game/jokers";
import { buildClientQuestion } from "@/app/api/games/route";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const game = await db.game.findUnique({ where: { id } });
    if (!game || game.playerId !== "") return errorResponse("NOT_FOUND", 404);
    const ladder = await getLadder();
    const jokers: JokerState = parseJokerState(game.jokersJson);
    const question = game.status === "in_progress"
      ? await buildClientQuestion(id, game.currentLevel)
      : null;
    return json({
      gameId: game.id,
      mode: game.mode,
      level: game.currentLevel,
      status: game.status,
      winnings: game.winnings,
      jokers,
      timerMode: game.timerMode,
      ladder,
      question,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
    });
  });
}
