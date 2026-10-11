import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const rows = await db.schoolType.findMany({
      where: { active: 1 },
      orderBy: { sort: "asc" },
    });
    return json({ items: rows });
  });
}
