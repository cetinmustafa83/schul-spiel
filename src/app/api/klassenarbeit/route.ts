import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { z } from "zod";
import { trackOfSchoolType, introGradeColumn } from "@/lib/game/selection";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const startSchema = z.object({
  playerName: z.string().min(1).max(40),
  schoolType: z.string().min(2).max(4),
  grade: z.number().int().min(5).max(8),
  subjectCode: z.string().min(2).max(4),
  length: z.number().int().min(5).max(25).default(10),
});

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { playerName, schoolType, grade, subjectCode, length } = parsed.data;

    const track = trackOfSchoolType(schoolType);
    const column = introGradeColumn(track);

    // Build eligible pool — subject + grade filtered
    const rows = await db.question.findMany({
      where: {
        status: "published",
        subject: { code: subjectCode },
        AND: [{ [column]: { not: null } }],
      },
      select: {
        id: true,
        [column]: true,
        difficulty: true,
      },
      take: 500,
    });

    // Filter by grade (HARD INVARIANT)
    const eligible = rows
      .map((r) => ({
        id: r.id,
        introGrade: (r as Record<string, unknown>)[column] as number | null,
        difficulty: (r as { difficulty: number }).difficulty,
      }))
      .filter((r) => r.introGrade != null && r.introGrade <= grade);

    if (eligible.length === 0) {
      return errorResponse("VALIDATION", 503, "Keine Fragen für dieses Fach und diese Klasse gefunden.");
    }

    // Sort by difficulty (easy to hard) — simulates a real exam progression
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    shuffled.sort((a, b) => a.difficulty - b.difficulty);
    const picked = shuffled.slice(0, Math.min(length, shuffled.length));

    const sessionId = randomBytes(8).toString("hex");
    const syntheticPlayerId = `browser-${playerName}`;

    // Ensure Player exists for FK
    await db.player.upsert({
      where: { id: syntheticPlayerId },
      update: { lastActiveAt: new Date() },
      create: {
        id: syntheticPlayerId,
        displayName: playerName,
        tag: "0000",
        schoolType,
        grade,
        pinHash: "$scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        rescueHash: "$scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        xp: 0,
      },
    });

    // Create game as KLASSENARBEIT mode
    await db.game.create({
      data: {
        id: sessionId,
        playerId: syntheticPlayerId,
        mode: "KLASSENARBEIT",
        gradeAtStart: grade,
        track,
        currentLevel: 1,
        status: "in_progress",
        winnings: 0,
        jokersJson: JSON.stringify({ FIFTY_FIFTY: false, AUDIENCE: false, SWITCH: false }),
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

    // Return ALL questions at once (exam mode — student can navigate freely)
    const allQuestions = await Promise.all(
      picked.map(async (_, idx) => {
        const gq = await db.gameQuestion.findUnique({
          where: { gameId_level: { gameId: sessionId, level: idx + 1 } },
          include: { question: { include: { subject: true, topic: true } } },
        });
        if (!gq) return null;
        const order = JSON.parse(gq.optionOrder) as number[];
        const opts = [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD];
        const shuffledOpts = order.map((idx2) => opts[idx2]);
        return {
          ref: `${sessionId}.${idx + 1}`,
          level: idx + 1,
          subject: {
            code: gq.question.subject.code,
            label: gq.question.subject.label,
            icon: gq.question.subject.icon,
            color: gq.question.subject.color,
          },
          topic: { code: gq.question.topic.code, label: gq.question.topic.label },
          difficulty: gq.question.difficulty,
          text: gq.question.text,
          options: shuffledOpts,
        };
      })
    );

    const validQuestions = allQuestions.filter(Boolean) as NonNullable<typeof allQuestions[number]>[];

    return json({
      sessionId,
      length: validQuestions.length,
      questions: validQuestions,
      subjectCode,
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

// Grade a submitted exam — returns results with correct/incorrect per question
export async function GET(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return errorResponse("VALIDATION", 400, "sessionId fehlt.");

    const game = await db.game.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { level: "asc" },
          include: { question: { include: { subject: true, topic: true } } },
        },
      },
    });

    if (!game) return errorResponse("NOT_FOUND", 404);

    const results = game.questions.map((gq) => {
      const order = JSON.parse(gq.optionOrder) as number[];
      const opts = [gq.question.optA, gq.question.optB, gq.question.optC, gq.question.optD];
      const shuffledOpts = order.map((idx) => opts[idx]);
      const correctShuffled = order.indexOf(gq.question.correctIndex);
      return {
        ref: `${sessionId}.${gq.level}`,
        level: gq.level,
        text: gq.question.text,
        options: shuffledOpts,
        correctIndex: correctShuffled,
        answeredIndex: gq.answeredIndex,
        correct: gq.correct === 1,
        explanation: gq.question.explanation,
        topic: { code: gq.question.topic.code, label: gq.question.topic.label },
        difficulty: gq.question.difficulty,
        questionId: gq.questionId,
        topicId: gq.question.topicId,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const total = results.length;

    return json({
      sessionId,
      results,
      correctCount,
      total,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      grade: getGrade(correctCount, total),
    });
  });
}

function getGrade(correct: number, total: number): string {
  if (total === 0) return "-";
  const pct = (correct / total) * 100;
  if (pct >= 95) return "1 (sehr gut)";
  if (pct >= 80) return "2 (gut)";
  if (pct >= 65) return "3 (befriedigend)";
  if (pct >= 50) return "4 (ausreichend)";
  if (pct >= 30) return "5 (mangelhaft)";
  return "6 (ungenügend)";
}
