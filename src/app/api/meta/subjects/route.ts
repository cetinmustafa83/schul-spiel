import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return catchRoute(async () => {
    const rows = await db.subject.findMany({
      where: { active: 1 },
      orderBy: { sort: "asc" },
      include: { topics: { orderBy: { code: "asc" } } },
    });
    return json({
      items: rows.map((s) => ({
        id: s.id,
        code: s.code,
        label: s.label,
        icon: s.icon,
        color: s.color,
        sort: s.sort,
        topics: s.topics.map((t) => ({ id: t.id, code: t.code, label: t.label })),
      })),
    });
  });
}
