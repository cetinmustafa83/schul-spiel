import { NextResponse } from "next/server";
import { getLadder } from "@/lib/game/ladder";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const ladder = await getLadder();
    return json({ items: ladder });
  });
}
