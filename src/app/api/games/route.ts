import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { z } from "zod";
import { pickQuestionForLevel, tierForLevel, trackOfSchoolType, type PlayerContext } from "@/lib/game/selection";
import { getLadder, totalLevels } from "@/lib/game/ladder";
import { freshJokerState, serializeJokerState } from "@/lib/game/jokers";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const startSchema = z.object({
  mode: z.enum(["GIPFEL", "TRAINING", "DAILY", "REVIEW"]).default("GIPFEL"),
  timerMode: z.enum(["off", "relaxed", "challenge"]).default("off"),
});

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);

    const body = await req.json().catch(() => ({}));
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const { mode, timerMode } = parsed.data;
    if (mode !== "GIPFEL") {
      return errorResponse("VALIDATION", 400, "Dieser Modus wird hier nicht unterstützt. Nutze die jeweiligen Endpunkte für Training/Tagesquiz/Wiederholung.");
    }

    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    const track = trackOfSchoolType(player.schoolType);
    const ctx: PlayerContext = { playerId: player.id, grade: player.grade, track };
    const ladder = await getLadder();
    const N = totalLevels(ladder);

    // Build N questions for the ladder.
    const usedQuestionIds: number[] = [];
    const usedSubjectIds: number[] = [];
    let lastSubjectId: number | null = null;
    let consecutiveSameSubject = 0;

    // Load "seen recently" set (last 10 games OR last 60 days).
    const recentGameIds = (await db.game.findMany({
      where: { playerId: player.id, mode: "GIPFEL", startedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { id: true },
    })).map((g) => g.id);
    const seenRows = recentGameIds.length > 0
      ? await db.gameQuestion.findMany({
          where: { gameId: { in: recentGameIds } },
          select: { questionId: true },
        })
      : [];
    const seenRecently = new Set<number>(seenRows.map((s) => s.questionId));

    const questions: Array<{ questionId: number; subjectId: number; introGrade: number; difficulty: number; level: number }> = [];
    for (let level = 1; level <= N; level++) {
      const tier = tierForLevel(level);
      let picked = await pickQuestionForLevel(
        ctx,
        level,
        tier,
        usedQuestionIds,
        usedSubjectIds,
        lastSubjectId,
        consecutiveSameSubject,
        seenRecently,
      );
      if (!picked) {
        picked = await pickQuestionForLevel(
          ctx,
          level,
          tier,
          usedQuestionIds,
          usedSubjectIds,
          null,
          0,
          new Set(),
        );
      }
      if (!picked) {
        return errorResponse("VALIDATION", 503, "Für deine Klasse und Schulform gibt es leider noch nicht genug Fragen. Bitte versuche es später nochmal.");
      }
      if (lastSubjectId === picked.subjectId) {
        consecutiveSameSubject++;
      } else {
        consecutiveSameSubject = 1;
        lastSubjectId = picked.subjectId;
      }
      usedSubjectIds.push(picked.subjectId);
      usedQuestionIds.push(picked.questionId);
      questions.push({ ...picked, level });
    }

    // Persist game + game questions.
    const gameId = randomBytes(8).toString("hex");
    const now = new Date();
    await db.game.create({
      data: {
        id: gameId,
        playerId: player.id,
        mode: "GIPFEL",
        gradeAtStart: player.grade,
        track,
        currentLevel: 1,
        status: "in_progress",
        winnings: 0,
        jokersJson: serializeJokerState(freshJokerState()),
        timerMode,
        startedAt: now,
        questions: {
          create: questions.map((q) => ({
            level: q.level,
            questionId: q.questionId,
            optionOrder: JSON.stringify(shuffleOrder(gameId, q.level)),
          })),
        },
      },
    });

    // Add all game questions to the player's seen-history.
    for (const q of questions) {
      await db.seenQuestion.upsert({
        where: { playerId_questionId: { playerId: player.id, questionId: q.questionId } },
        update: { lastSeenAt: now },
        create: { playerId: player.id, questionId: q.questionId, lastSeenAt: now },
      });
    }

    const first = await buildClientQuestion(gameId, 1);
    return json({ gameId, mode: "GIPFEL", level: 1, ladder, question: first, jokers: freshJokerState(), timerMode });
  });
}

/** Shuffle [0,1,2,3] using a deterministic seed per (gameId, level). */
export function shuffleOrder(gameId: string, level: number): number[] {
  let h = 2166136261;
  const seed = `${gameId}|${level}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rng = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Build the client-facing question payload (shuffled options, no answers). */
export async function buildClientQuestion(gameId: string, level: number) {
  const gq = await db.gameQuestion.findUnique({
    where: { gameId_level: { gameId, level } },
    include: { question: { include: { subject: true } } },
  });
  if (!gq) return null;
  const order = JSON.parse(gq.optionOrder) as number[];
  const opts = [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD];
  const shuffled = order.map((idx) => opts[idx]);
  return {
    ref: `${gameId}.${level}`,
    level,
    subject: {
      code: gq.question.subject.code,
      label: gq.question.subject.label,
      icon: gq.question.subject.icon,
      color: gq.question.subject.color,
    },
    difficulty: gq.question.difficulty,
    text: gq.question.text,
    options: shuffled,
  };
}
