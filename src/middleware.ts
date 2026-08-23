import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Garde-fou rapide (Edge runtime, sans accès DB) : redirige immédiatement les
 * requêtes /admin/* sans cookie de session vers /login. La vérification
 * réelle (session valide en base + rôle) est faite côté serveur Node dans
 * `admin/layout.tsx` et dans chaque Server Action / route API via
 * `requireRole()` — jamais seulement côté UI.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies.has("mariage_session");

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
