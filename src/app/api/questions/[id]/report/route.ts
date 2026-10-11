import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const reportSchema = z.object({
  reason: z.enum(["unklar", "falsch", "unpassend"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const { id } = await params;
    const questionId = parseInt(id, 10);
    if (isNaN(questionId)) return errorResponse("VALIDATION", 400, "Ungültige Frage-ID.");
    const body = await req.json().catch(() => null);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    // No player id stored (PRD §14.5: question_reports has no player_id column).
    await db.questionReport.create({
      data: { questionId, reason: parsed.data.reason },
    });
    return json({ ok: true });
  });
}
