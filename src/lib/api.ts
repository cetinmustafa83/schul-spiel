import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Centralised API helpers: unified JSON responses, error handling, and
 * validation. Routes that need auth should call `requirePlayerCookie()` from
 * `lib/session` directly.
 */

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Du bist nicht eingeloggt. Bitte melde dich an.",
  WRONG_PIN: "Das hat nicht geklappt. Versuche es später nochmal.",
  LOCKED: "Zu viele Versuche. Bitte warte ein paar Minuten.",
  HANDLE_TAKEN: "Dieser Spielname ist schon vergeben. Wähle einen anderen.",
  NOT_FOUND: "Hier gibt es nichts zu sehen.",
  CONFLICT: "Das ging schief. Bitte lade die Seite neu.",
  VALIDATION: "Bitte überprüfe deine Eingabe.",
  RATE_LIMIT: "Langsam, langsam. Versuche es gleich nochmal.",
  GAME_OVER: "Dieses Spiel ist bereits beendet.",
  INVALID_MOVE: "Das geht jetzt nicht.",
};

export function errorResponse(code: string, status?: number, message?: string): NextResponse {
  const statusValue = status ?? (code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "CONFLICT" || code === "GAME_OVER" ? 409 : 400);
  return NextResponse.json(
    { code, message: message ?? FRIENDLY_MESSAGES[code] ?? "Etwas ist schiefgelaufen." },
    { status: statusValue }
  );
}

export function catchRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((err: unknown) => {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.status, err.message);
    }
    console.error("[api] uncaught", err);
    return errorResponse("INTERNAL", 500, "Interner Fehler — bitte versuche es später nochmal.");
  });
}

export function rateLimited(): boolean {
  // Simple in-memory per-IP rate limiter for PIN attempts.
  return false; // Hook for future; the auth route uses its own counter.
}

// Validation schemas ------------------------------------------------------

export const registerSchema = z.object({
  displayName: z.string().min(3).max(20),
  schoolType: z.string().min(2).max(4),
  grade: z.number().int().min(5).max(8),
  pin: z.string().regex(/^\d{4}$/),
  avatarId: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  displayName: z.string().min(3).max(20),
  tag: z.string().regex(/^\d{4}$/),
  pin: z.string().regex(/^\d{4}$/),
});

export const resetPinSchema = z.object({
  displayName: z.string().min(3).max(20),
  tag: z.string().regex(/^\d{4}$/),
  rescueCode: z.string().min(8),
  newPin: z.string().regex(/^\d{4}$/),
});

export const answerSchema = z.object({
  questionRef: z.string().min(1),
  optionIndex: z.number().int().min(0).max(3),
});

export const jokerSchema = z.object({
  type: z.enum(["FIFTY_FIFTY", "AUDIENCE", "PHONE", "SWITCH"]),
});

export const trainingStartSchema = z.object({
  subjectFilter: z.array(z.string()).optional(),
  topicFilter: z.array(z.string()).optional(),
  length: z.number().int().min(3).max(30).optional().default(10),
});

export const trainingAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionRef: z.string().min(1),
  optionIndex: z.number().int().min(0).max(3),
});

export const dailyAnswerSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questionRef: z.string().min(1),
  optionIndex: z.number().int().min(0).max(3),
});
