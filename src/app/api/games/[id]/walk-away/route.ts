import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { getLadder, walkAwayWinnings } from "@/lib/game/ladder";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const game = await db.game.findUnique({ where: { id } });
    if (!game || game.playerId !== p.id) return errorResponse("NOT_FOUND", 404);
    if (game.status !== "in_progress") return errorResponse("GAME_OVER", 409, "Dieses Spiel ist bereits beendet.");
    // Walking away is available from level 2 onwards (PRD §5.2).
    if (game.currentLevel < 2) {
      return errorResponse("INVALID_MOVE", 400, "Du kannst frühestens nach der ersten Frage aussteigen.");
    }
    const ladder = await getLadder();
    const winnings = walkAwayWinnings(ladder, game.currentLevel);
    await db.game.update({
      where: { id },
      data: {
        status: "finished",
        winnings,
        endedAt: new Date(),
      },
    });
    return json({
      ok: true,
      reason: "walked_away",
      winnings,
      level: game.currentLevel,
    });
  });
}
