import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { catchRoute, errorResponse, json } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  return catchRoute(async () => {
    const { slug } = await params;
    const page = await db.contentPage.findUnique({ where: { slug } });
    if (!page) return errorResponse("NOT_FOUND", 404, "Diese Seite gibt es nicht.");
    return json({ page });
  });
}
