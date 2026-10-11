import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { countDue } from "@/lib/game/leitner";
import { getLadder } from "@/lib/game/ladder";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    const games = await db.game.findMany({
      where: { playerId: p.id, mode: "GIPFEL", status: "finished" },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, currentLevel: true, winnings: true, startedAt: true, endedAt: true },
    });
    const trainingSessions = await db.trainingSession.findMany({
      where: { playerId: p.id, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { id: true, length: true, correctCount: true, startedAt: true, endedAt: true },
    });
    const badges = await db.playerBadge.findMany({
      where: { playerId: p.id },
      include: { badge: true },
    });
    const topicMastery = await db.topicMastery.findMany({
      where: { playerId: p.id },
      include: { topic: { include: { subject: true } } },
    });
    const ranks = await db.rank.findMany({ orderBy: { minXp: "asc" } });
    const dueCount = await countDue(p.id);
    const ladder = await getLadder();

    const totalGames = games.length;
    const totalWinnings = games.reduce((s, g) => s + g.winnings, 0);
    const bestLevel = games.reduce((m, g) => Math.max(m, g.currentLevel), 0);
    const bestWinnings = games.reduce((m, g) => Math.max(m, g.winnings), 0);
    const trainingCorrect = trainingSessions.reduce((s, t) => s + t.correctCount, 0);
    const trainingTotal = trainingSessions.reduce((s, t) => s + t.length, 0);

    const currentRank = (() => {
      let r = ranks[0];
      for (const x of ranks) if (player.xp >= x.minXp) r = x;
      return r;
    })();
    const nextRank = ranks.find((x) => x.minXp > player.xp);
    const xpToNext = nextRank ? nextRank.minXp - player.xp : 0;
    const xpProgress = nextRank
      ? (player.xp - (currentRank?.minXp ?? 0)) / (nextRank.minXp - (currentRank?.minXp ?? 1))
      : 1;

    return json({
      player: {
        displayName: player.displayName,
        tag: player.tag,
        schoolType: player.schoolType,
        grade: player.grade,
        avatarId: player.avatarId,
        xp: player.xp,
        rank: currentRank,
        nextRank,
        xpToNext,
        xpProgress,
      },
      stats: {
        totalGames,
        totalWinnings,
        bestLevel,
        bestWinnings,
        trainingCorrect,
        trainingTotal,
        dueCount,
      },
      ladder,
      games,
      trainingSessions,
      badges: badges.map((b) => ({
        code: b.badge.code,
        label: b.badge.label,
        description: b.badge.description,
        icon: b.badge.icon,
        earnedAt: b.earnedAt,
      })),
      topicMastery: topicMastery.map((tm) => ({
        topic: { code: tm.topic.code, label: tm.topic.label },
        subject: { code: tm.topic.subject.code, label: tm.topic.subject.label, icon: tm.topic.subject.icon, color: tm.topic.subject.color },
        attempts: tm.attempts,
        correct: tm.correct,
        accuracy: tm.attempts > 0 ? tm.correct / tm.attempts : 0,
      })),
    });
  });
}
