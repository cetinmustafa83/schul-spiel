import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  return catchRoute(async () => {
    await destroySession();
    return json({ ok: true });
  });
}
