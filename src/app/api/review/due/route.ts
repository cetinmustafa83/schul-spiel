import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { fetchDue } from "@/lib/game/leitner";
import { trackOfSchoolType } from "@/lib/game/selection";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/review/due — returns up to 20 due review questions, wrapped in a
 * fresh "review session" game (mode=REVIEW) so the answer endpoint can
 * reuse the gameQuestion structure.
 */
export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    const dueIds = (await fetchDue(p.id, 20)).map((d) => d.questionId);
    if (dueIds.length === 0) {
      return json({ sessionId: null, length: 0, dueCount: 0, question: null });
    }
    const track = trackOfSchoolType(player.schoolType);
    const sessionId = randomBytes(8).toString("hex");
    await db.game.create({
      data: {
        id: sessionId,
        playerId: p.id,
        mode: "REVIEW",
        gradeAtStart: player.grade,
        track,
        currentLevel: 1,
        status: "in_progress",
        winnings: 0,
        jokersJson: JSON.stringify({ FIFTY_FIFTY: false, AUDIENCE: false, PHONE: false, SWITCH: false }),
        timerMode: "off",
        questions: {
          create: dueIds.map((qid, idx) => ({
            level: idx + 1,
            questionId: qid,
            optionOrder: JSON.stringify(shuffleOrder(sessionId, idx + 1)),
          })),
        },
      },
    });
    const first = await buildReviewQuestion(sessionId, 1);
    return json({
      sessionId,
      length: dueIds.length,
      currentIndex: 0,
      question: first,
    });
  });
}

function shuffleOrder(sessionId: string, level: number): number[] {
  let h = 2166136261;
  const seed = `${sessionId}|${level}|review`;
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

async function buildReviewQuestion(sessionId: string, level: number) {
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
