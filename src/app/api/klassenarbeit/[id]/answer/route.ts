import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, errorResponse, json, answerSchema } from "@/lib/api";

export const runtime = "nodejs";

/**
 * POST /api/klassenarbeit/[id]/answer
 * Records a single answer for a Klassenarbeit exam question.
 * Used by the exam-run screen when the student navigates between questions.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    const { questionRef, optionIndex } = parsed.data;

    const game = await db.game.findUnique({ where: { id } });
    if (!game) return errorResponse("NOT_FOUND", 404);
    if (game.mode !== "KLASSENARBEIT") return errorResponse("NOT_FOUND", 404);

    // questionRef = `${sessionId}.${level}`
    const parts = questionRef.split(".");
    const level = Number(parts[1]);
    if (!Number.isFinite(level)) return errorResponse("VALIDATION", 400, "Ungültige Frage-Referenz.");

    const gq = await db.gameQuestion.findUnique({
      where: { gameId_level: { gameId: id, level } },
      include: { question: true },
    });
    if (!gq) return errorResponse("NOT_FOUND", 404);

    const order = JSON.parse(gq.optionOrder) as number[];
    const canonicalAnswered = order[optionIndex];
    const correct = canonicalAnswered === gq.question.correctIndex ? 1 : 0;

    await db.gameQuestion.update({
      where: { gameId_level: { gameId: id, level } },
      data: { answeredIndex: optionIndex, correct, answeredAt: new Date() },
    });

    return json({ ok: true, correct: correct === 1 });
  });
}
