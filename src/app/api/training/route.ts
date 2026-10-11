import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json, trainingStartSchema, ApiError } from "@/lib/api";
import { trackOfSchoolType, type PlayerContext } from "@/lib/game/selection";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const body = await req.json().catch(() => ({}));
    const parsed = trainingStartSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { subjectFilter, topicFilter, length } = parsed.data;
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    const track = trackOfSchoolType(player.schoolType);
    const column = track === "basic" ? "introGradeHs" : track === "advanced" ? "introGradeGy" : "introGradeRs";

    // Build the eligible pool.
    const where: Record<string, unknown> = {
      status: "published",
      AND: [{ [column]: { not: null } }],
    };
    if (subjectFilter && subjectFilter.length > 0) {
      where.subject = { code: { in: subjectFilter } };
    }
    if (topicFilter && topicFilter.length > 0) {
      where.topic = { code: { in: topicFilter } };
    }
    const rows = await db.question.findMany({
      where: where as never,
      select: { id: true, subjectId: true, [column]: true },
      take: 500,
    });
    const eligible = rows
      .map((r) => ({
        id: r.id,
        introGrade: (r as Record<string, unknown>)[column] as number | null,
        subjectId: r.subjectId,
      }))
      .filter((r) => r.introGrade != null && r.introGrade <= player.grade);

    if (eligible.length === 0) {
      return errorResponse("VALIDATION", 503, "Keine passenden Fragen gefunden. Bitte wähle ein anderes Fach oder eine andere Klasse.");
    }

    // Pick `length` random questions with subject diversity.
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(length, shuffled.length));
    const sessionId = randomBytes(8).toString("hex");
    const session = await db.trainingSession.create({
      data: {
        id: sessionId,
        playerId: p.id,
        subjectFilter: subjectFilter ? JSON.stringify(subjectFilter) : null,
        topicFilter: topicFilter ? JSON.stringify(topicFilter) : null,
        length: picked.length,
        currentIndex: 0,
        correctCount: 0,
      },
    });

    // Pre-persist GameQuestion rows for training too (so the answer endpoint is consistent).
    await db.game.create({
      data: {
        id: sessionId,
        playerId: p.id,
        mode: "TRAINING",
        gradeAtStart: player.grade,
        track,
        currentLevel: 1,
        status: "in_progress",
        winnings: 0,
        jokersJson: JSON.stringify({ FIFTY_FIFTY: false, AUDIENCE: false, PHONE: false, SWITCH: false }),
        timerMode: "off",
        questions: {
          create: picked.map((q, idx) => ({
            level: idx + 1,
            questionId: q.id,
            optionOrder: JSON.stringify(shuffleOrder(sessionId, idx + 1)),
          })),
        },
      },
    });

    const first = await buildTrainingQuestion(sessionId, 1);
    return json({
      sessionId,
      length: picked.length,
      currentIndex: 0,
      correctCount: 0,
      question: first,
    });
  });
}

function shuffleOrder(sessionId: string, level: number): number[] {
  let h = 2166136261;
  const seed = `${sessionId}|${level}`;
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

export async function buildTrainingQuestion(sessionId: string, level: number) {
  const gq = await db.gameQuestion.findUnique({
    where: { gameId_level: { gameId: sessionId, level } },
    include: { question: { include: { subject: true, topic: true } } },
  });
  if (!gq) return null;
  const order = JSON.parse(gq.optionOrder) as number[];
  const opts = [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD];
  const shuffled = order.map((idx) => opts[idx]);
  return {
    ref: `${sessionId}.${level}`,
    level,
    subject: {
      code: gq.question.subject.code,
      label: gq.question.subject.label,
      icon: gq.question.subject.icon,
      color: gq.question.subject.color,
    },
    topic: { code: gq.question.topic.code, label: gq.question.topic.label },
    difficulty: gq.question.difficulty,
    text: gq.question.text,
    options: shuffled,
  };
}
