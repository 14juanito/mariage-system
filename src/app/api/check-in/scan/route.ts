import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/modules/auth/service";
import { scanInvitationToken } from "@/modules/check-in/service";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.role !== "ADMIN" && ctx.role !== "CHECKIN")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Limite raisonnable même pour un usage scanner intensif (rafale de scans manuels).
  const { allowed } = rateLimit(`scan:${ctx.userId}`, { capacity: 20, refillPerSecond: 3 });
  if (!allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const rawToken = typeof body?.token === "string" ? body.token : "";

  // Le contenu scanné peut être l'URL complète ou juste le token.
  const token = rawToken.includes("/invitation/") ? rawToken.split("/invitation/").pop()! : rawToken;

  if (!token) {
    return NextResponse.json({ result: "INVALID" });
  }

  const outcome = await scanInvitationToken(token.trim(), ctx.userId);
  return NextResponse.json(outcome);
}
