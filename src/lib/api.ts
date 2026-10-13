import { NextResponse } from "next/server";
import { z } from "zod";

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
  NOT_FOUND: "Hier gibt es nichts zu sehen.",
  CONFLICT: "Das ging schief. Bitte lade die Seite neu.",
  VALIDATION: "Bitte überprüfe deine Eingabe.",
  GAME_OVER: "Dieses Spiel ist bereits beendet.",
  INVALID_MOVE: "Das geht jetzt nicht.",
};

export function errorResponse(code: string, status?: number, message?: string): NextResponse {
  const statusValue = status ?? (code === "NOT_FOUND" ? 404 : code === "CONFLICT" || code === "GAME_OVER" ? 409 : 400);
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

export const answerSchema = z.object({
  questionRef: z.string().min(1),
  optionIndex: z.number().int().min(0).max(3),
});

export const jokerSchema = z.object({
  type: z.enum(["FIFTY_FIFTY", "AUDIENCE", "PHONE", "SWITCH"]),
});
