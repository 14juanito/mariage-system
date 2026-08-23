import { NextResponse } from "next/server";
import { getSessionContext } from "@/modules/auth/service";
import { listTablesWithOccupancy } from "@/modules/tables/service";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const tables = await listTablesWithOccupancy(ctx.weddingId);
  return NextResponse.json({ tables });
}
