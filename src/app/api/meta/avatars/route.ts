import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const rows = await db.avatar.findMany({
      orderBy: { id: "asc" },
    });
    return json({ items: rows });
  });
}
