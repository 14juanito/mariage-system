import { NextResponse } from "next/server";
import { getSessionContext } from "@/modules/auth/service";
import { getDashboardStats } from "@/modules/wedding/service";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const stats = await getDashboardStats(ctx.weddingId);
  return NextResponse.json(stats);
}
