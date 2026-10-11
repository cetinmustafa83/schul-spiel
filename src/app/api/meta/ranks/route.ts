import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const items = await db.rank.findMany({ orderBy: { minXp: "asc" } });
    return json({ items });
  });
}
