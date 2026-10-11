import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/crypto";

export const SESSION_COOKIE = "wg_session";
const SESSION_TTL_DAYS = 30;

export interface SessionPlayer {
  id: string;
  displayName: string;
  tag: string;
  schoolType: string;
  grade: number;
  avatarId: number | null;
  xp: number;
}

async function hashToken(token: string): Promise<string> {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(playerId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash, playerId, expiresAt },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = await hashToken(token);
    await db.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentPlayer(): Promise<SessionPlayer | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const tokenHash = await hashToken(token);
    const session = await db.session.findUnique({
      where: { tokenHash },
      include: { player: true },
    });
    if (!session || !session.player) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { tokenHash } }).catch(() => {});
      return null;
    }
    // Sliding expiry: refresh on each use.
    const newExpiry = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.session.update({
      where: { tokenHash },
      data: { expiresAt: newExpiry },
    }).catch(() => {});
    await db.player.update({
      where: { id: session.player.id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
    return {
      id: session.player.id,
      displayName: session.player.displayName,
      tag: session.player.tag,
      schoolType: session.player.schoolType,
      grade: session.player.grade,
      avatarId: session.player.avatarId,
      xp: session.player.xp,
    };
  } catch {
    return null;
  }
}

export async function requirePlayer(): Promise<SessionPlayer> {
  const p = await getCurrentPlayer();
  if (!p) throw new Error("UNAUTHORIZED");
  return p;
}

/** Re-export verifySecret for callers that want to compare PINs. */
export { verifySecret, hashSecret };
