import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const items = await db.joker.findMany({
      where: { enabled: 1 },
      orderBy: { code: "asc" },
    });
    return json({ items });
  });
}
