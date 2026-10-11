import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashSecret, isPinTrivial, verifySecret } from "@/lib/crypto";
import { catchRoute, errorResponse, json, resetPinSchema } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const body = await req.json().catch(() => null);
    const parsed = resetPinSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const { displayName, tag, rescueCode, newPin } = parsed.data;

    if (isPinTrivial(newPin)) {
      return errorResponse("VALIDATION", 400, "Bitte wähle eine PIN, die nicht so leicht zu erraten ist.");
    }

    const player = await db.player.findUnique({
      where: { displayName_tag: { displayName, tag } },
    });
    // Constant-time: always run a verify against a dummy hash.
    const DUMMY_HASH = "$scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    const ok = player ? verifySecret(rescueCode.toUpperCase(), player.rescueHash) : verifySecret(rescueCode.toUpperCase(), DUMMY_HASH);
    if (!player || !ok) {
      return errorResponse("WRONG_PIN", 401, "Spielname, Tag oder Rettungscode stimmen nicht.");
    }
    await db.player.update({
      where: { id: player.id },
      data: { pinHash: hashSecret(newPin), failedLogins: 0, lockedUntil: null },
    });
    return json({ ok: true });
  });
}
