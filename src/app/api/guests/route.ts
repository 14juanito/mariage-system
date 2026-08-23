import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/modules/auth/service";
import { listGuests } from "@/modules/guests/service";

export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const guests = await listGuests(ctx.weddingId, query);
  return NextResponse.json({ guests });
}
