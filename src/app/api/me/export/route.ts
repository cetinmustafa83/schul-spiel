import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);
    const games = await db.game.findMany({
      where: { playerId: p.id, mode: "GIPFEL" },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    const trainingSessions = await db.trainingSession.findMany({
      where: { playerId: p.id },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    const badges = await db.playerBadge.findMany({
      where: { playerId: p.id },
      include: { badge: true },
    });
    const seenQuestions = await db.seenQuestion.count({ where: { playerId: p.id } });
    const reviewDeck = await db.reviewDeckItem.findMany({ where: { playerId: p.id } });
    const topicMastery = await db.topicMastery.findMany({
      where: { playerId: p.id },
      include: { topic: true },
    });
    const data = {
      exportedAt: new Date().toISOString(),
      player: {
        displayName: player.displayName,
        tag: player.tag,
        schoolType: player.schoolType,
        grade: player.grade,
        avatarId: player.avatarId,
        xp: player.xp,
        leaderboardOptin: player.leaderboardOptin === 1,
        createdAt: player.createdAt,
        lastActiveAt: player.lastActiveAt,
        prefs: player.prefsJson ? JSON.parse(player.prefsJson) : {},
      },
      games: games.map((g) => ({
        id: g.id,
        mode: g.mode,
        gradeAtStart: g.gradeAtStart,
        track: g.track,
        currentLevel: g.currentLevel,
        status: g.status,
        winnings: g.winnings,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
      })),
      trainingSessions: trainingSessions.map((t) => ({
        id: t.id,
        subjectFilter: t.subjectFilter,
        topicFilter: t.topicFilter,
        length: t.length,
        currentIndex: t.currentIndex,
        correctCount: t.correctCount,
        startedAt: t.startedAt,
        endedAt: t.endedAt,
      })),
      badges: badges.map((b) => ({
        code: b.badge.code,
        label: b.badge.label,
        description: b.badge.description,
        icon: b.badge.icon,
        earnedAt: b.earnedAt,
      })),
      seenQuestions,
      reviewDeck: reviewDeck.map((r) => ({
        questionId: r.questionId,
        box: r.box,
        dueAt: r.dueAt,
        answeredCount: r.answeredCount,
      })),
      topicMastery: topicMastery.map((tm) => ({
        topic: tm.topic.code,
        attempts: tm.attempts,
        correct: tm.correct,
      })),
    };
    return json(data);
  });
}
