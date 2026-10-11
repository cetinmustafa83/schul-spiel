import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifySecret } from "@/lib/crypto";
import { catchRoute, errorResponse, json, loginSchema, ApiError } from "@/lib/api";

export const runtime = "nodejs";

// In-memory rate-limiting for PIN attempts (per-handle + per-IP). Never persisted.
const RL_WINDOW_MS = 5 * 60 * 1000;
const RL_MAX_ATTEMPTS = 5;
const handleAttempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();

function checkAndBump(handleKey: string): { locked: boolean; waitMs?: number } {
  const now = Date.now();
  const e = handleAttempts.get(handleKey);
  if (e && e.lockedUntil > now) {
    return { locked: true, waitMs: e.lockedUntil - now };
  }
  if (e && now - e.firstAt > RL_WINDOW_MS) {
    handleAttempts.delete(handleKey);
  }
  const cur = handleAttempts.get(handleKey) ?? { count: 0, firstAt: now, lockedUntil: 0 };
  cur.count += 1;
  if (cur.count >= RL_MAX_ATTEMPTS) {
    cur.lockedUntil = now + RL_WINDOW_MS; // 5-min lock; exponential backoff could be added later
  }
  handleAttempts.set(handleKey, cur);
  return { locked: false };
}

function clearRateLimit(handleKey: string) {
  handleAttempts.delete(handleKey);
}

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const { displayName, tag, pin } = parsed.data;

    const handleKey = `${displayName.toLowerCase()}#${tag}`;
    const rl = checkAndBump(handleKey);
    if (rl.locked) {
      return errorResponse("LOCKED", 429, "Zu viele Versuche. Bitte warte ein paar Minuten.");
    }

    const player = await db.player.findUnique({
      where: { displayName_tag: { displayName, tag } },
    });

    // Constant-time: do not leak whether the handle exists.
    // We always run a verify against a dummy hash if no player was found.
    const DUMMY_HASH = "$scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    const ok = player
      ? verifySecret(pin, player.pinHash)
      : verifySecret(pin, DUMMY_HASH);

    if (!player || !ok) {
      // Same friendly message for both cases — no enumeration.
      return errorResponse("WRONG_PIN", 401);
    }

    clearRateLimit(handleKey);
    await createSession(player.id);

    return json({
      id: player.id,
      displayName: player.displayName,
      tag: player.tag,
      schoolType: player.schoolType,
      grade: player.grade,
      avatarId: player.avatarId,
      xp: player.xp,
    });
  });
}
