import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/session";
import { verifySecret } from "@/lib/crypto";
import { catchRoute, errorResponse, json } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  grade: z.number().int().min(5).max(8).optional(),
  schoolType: z.string().min(2).max(4).optional(),
  avatarId: z.number().int().positive().optional(),
  prefs: z.object({
    sound: z.boolean().optional(),
    music: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    textScale: z.number().int().min(100).max(150).optional(),
    dyslexia: z.boolean().optional(),
    timer: z.enum(["off", "relaxed", "challenge"]).optional(),
  }).optional(),
  displayName: z.string().min(3).max(20).optional(),
});

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const player = await db.player.findUnique({
      where: { id: p.id },
      include: { avatar: true },
    });
    if (!player) return errorResponse("NOT_FOUND", 404);
    const prefs = player.prefsJson ? JSON.parse(player.prefsJson) : {};
    return json({
      id: player.id,
      displayName: player.displayName,
      tag: player.tag,
      schoolType: player.schoolType,
      grade: player.grade,
      avatarId: player.avatarId,
      avatar: player.avatar,
      xp: player.xp,
      leaderboardOptin: player.leaderboardOptin === 1,
      prefs,
      createdAt: player.createdAt,
      lastActiveAt: player.lastActiveAt,
    });
  });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const data = parsed.data;
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);

    const updates: Record<string, unknown> = {};
    if (data.grade != null) {
      const g = await db.grade.findUnique({ where: { grade: data.grade } });
      if (!g || g.selectable !== 1) return errorResponse("VALIDATION", 400, "Diese Klasse ist nicht verfügbar.");
      updates.grade = data.grade;
    }
    if (data.schoolType != null) {
      const st = await db.schoolType.findUnique({ where: { code: data.schoolType } });
      if (!st) return errorResponse("VALIDATION", 400, "Diese Schulform kennen wir nicht.");
      updates.schoolType = data.schoolType;
    }
    if (data.avatarId != null) {
      const a = await db.avatar.findUnique({ where: { id: data.avatarId } });
      if (!a) return errorResponse("VALIDATION", 400, "Diesen Avatar gibt es nicht.");
      updates.avatarId = data.avatarId;
    }
    if (data.prefs) {
      const existing = player.prefsJson ? JSON.parse(player.prefsJson) : {};
      updates.prefsJson = JSON.stringify({ ...existing, ...data.prefs });
    }
    if (data.displayName != null) {
      // Allow only changing display name — keep tag the same. (PRD §8.7: handle uniqueness.)
      updates.displayName = data.displayName;
    }
    await db.player.update({ where: { id: p.id }, data: updates });
    return json({ ok: true });
  });
}

const deleteSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

export async function DELETE(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const p = await getCurrentPlayer();
    if (!p) return errorResponse("UNAUTHORIZED", 401);
    const body = await req.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION", 400, "PIN fehlt oder ist ungültig.");
    const player = await db.player.findUnique({ where: { id: p.id } });
    if (!player) return errorResponse("NOT_FOUND", 404);
    const ok = verifySecret(parsed.data.pin, player.pinHash);
    if (!ok) return errorResponse("WRONG_PIN", 401, "PIN falsch. Löschung abgebrochen.");
    // Cascade deletes all related gameplay rows (privacy requirement).
    await db.player.delete({ where: { id: p.id } });
    return json({ ok: true });
  });
}
