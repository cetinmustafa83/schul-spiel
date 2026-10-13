import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { getLadder } from "@/lib/game/ladder";
import { z } from "zod";

export const runtime = "nodejs";

const PLACEHOLDER_HASH =
  "$scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

const querySchema = z.object({
  playerName: z.string().min(1).max(40),
  schoolType: z.string().min(2).max(4),
  grade: z.coerce.number().int().min(5).max(8),
});

export async function GET(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      playerName: url.searchParams.get("playerName") ?? "",
      schoolType: url.searchParams.get("schoolType") ?? "",
      grade: url.searchParams.get("grade") ?? "",
    });
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const { playerName, schoolType, grade } = parsed.data;
    const playerId = `browser-${playerName}`;

    await db.player.upsert({
      where: { id: playerId },
      update: { schoolType, grade, lastActiveAt: new Date() },
      create: {
        id: playerId,
        displayName: playerName,
        tag: "0000",
        schoolType,
        grade,
        pinHash: PLACEHOLDER_HASH,
        rescueHash: PLACEHOLDER_HASH,
        xp: 0,
      },
    });

    const games = await db.game.findMany({
      where: { playerId, mode: "GIPFEL", status: "finished" },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, currentLevel: true, winnings: true, startedAt: true, endedAt: true },
    });
    const ranks = await db.rank.findMany({ orderBy: { minXp: "asc" } });
    const ladder = await getLadder();

    const totalGames = games.length;
    const totalWinnings = games.reduce((s, g) => s + g.winnings, 0);
    const bestLevel = games.reduce((m, g) => Math.max(m, g.currentLevel), 0);
    const bestWinnings = games.reduce((m, g) => Math.max(m, g.winnings), 0);

    const player = await db.player.findUnique({ where: { id: playerId } });
    const xp = player?.xp ?? 0;

    const currentRank = (() => {
      let r = ranks[0];
      for (const x of ranks) if (xp >= x.minXp) r = x;
      return r;
    })();
    const nextRank = ranks.find((x) => x.minXp > xp);

    return json({
      player: {
        displayName: playerName,
        tag: "0000",
        schoolType,
        grade,
        avatarId: player?.avatarId ?? null,
        xp,
        rank: currentRank,
        nextRank,
      },
      stats: {
        totalGames,
        totalWinnings,
        bestLevel,
        bestWinnings,
      },
      ladder,
      games,
    });
  });
}
