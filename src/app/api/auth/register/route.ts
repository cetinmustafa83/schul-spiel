import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { hashSecret, isPinTrivial, randomTag } from "@/lib/crypto";
import { checkSpielername, generateRettungscode } from "@/lib/german";
import { catchRoute, errorResponse, json, registerSchema } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  return catchRoute(async () => {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION", 400, parsed.error.issues[0]?.message ?? "Eingabe ungültig.");
    }
    const { displayName, schoolType, grade, pin, avatarId } = parsed.data;

    const nameCheck = checkSpielername(displayName);
    if (!nameCheck.ok) {
      return errorResponse("VALIDATION", 400, nameCheck.reason);
    }

    if (isPinTrivial(pin)) {
      return errorResponse("VALIDATION", 400, "Bitte wähle eine PIN, die nicht so leicht zu erraten ist (z. B. nicht 1234 oder 0000).");
    }

    const st = await db.schoolType.findUnique({ where: { code: schoolType } });
    if (!st || st.active !== 1) {
      return errorResponse("VALIDATION", 400, "Diese Schulform kennen wir nicht. Bitte wähle eine aus der Liste.");
    }
    const g = await db.grade.findUnique({ where: { grade } });
    if (!g || g.selectable !== 1) {
      return errorResponse("VALIDATION", 400, "Bitte wähle eine Klasse zwischen 5 und 8.");
    }

    if (avatarId != null) {
      const a = await db.avatar.findUnique({ where: { id: avatarId } });
      if (!a) {
        return errorResponse("VALIDATION", 400, "Diesen Avatar gibt es nicht.");
      }
    }

    let tag = randomTag();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.player.findUnique({
        where: { displayName_tag: { displayName, tag } },
      });
      if (!existing) break;
      tag = randomTag();
    }
    const collision = await db.player.findUnique({
      where: { displayName_tag: { displayName, tag } },
    });
    if (collision) {
      return errorResponse("HANDLE_TAKEN", 409);
    }

    const rescueCode = generateRettungscode();

    const player = await db.player.create({
      data: {
        displayName,
        tag,
        schoolType,
        grade,
        pinHash: hashSecret(pin),
        rescueHash: hashSecret(rescueCode.toUpperCase()),
        avatarId: avatarId ?? null,
        prefsJson: JSON.stringify({
          sound: true,
          music: false,
          reducedMotion: false,
          textScale: 100,
          dyslexia: false,
          timer: "off",
        }),
      },
    });

    await createSession(player.id);

    return json({
      id: player.id,
      handle: `${displayName}#${tag}`,
      displayName,
      tag,
      schoolType,
      grade,
      avatarId: player.avatarId,
      xp: player.xp,
      rescueCode,
    });
  });
}
