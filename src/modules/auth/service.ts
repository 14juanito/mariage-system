import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "@/types";

const COOKIE_NAME = "mariage_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h — journée de mariage incluse confortablement

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET manquant ou trop court dans les variables d'environnement.");
  }
  return s;
}

function sign(sessionId: string) {
  return createHmac("sha256", secret()).update(sessionId).digest("hex");
}

function packCookie(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

function unpackCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const [sessionId, signature] = raw.split(".");
  if (!sessionId || !signature) return null;
  const expected = sign(sessionId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sessionId;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: (await headers()).get("user-agent")?.slice(0, 255),
    },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, packCookie(session.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const sessionId = unpackCookie(store.get(COOKIE_NAME)?.value);
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

/**
 * Renvoie le contexte de session courant : utilisateur + mariage + rôle.
 * Le rôle est résolu via wedding_staff. Pour le MVP (un mariage par
 * déploiement), on prend la première appartenance de l'utilisateur —
 * le modèle reste prêt pour plusieurs mariages sans migration.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const store = await cookies();
  const sessionId = unpackCookie(store.get(COOKIE_NAME)?.value);
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          staffOf: { include: { wedding: true }, take: 1 },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const staff = session.user.staffOf[0];
  if (!staff) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    weddingId: staff.wedding.id,
    weddingLabel: `${staff.wedding.brideName} & ${staff.wedding.groomName}`,
    role: staff.role,
  };
}

export async function requireRole(...roles: Array<"ADMIN" | "CHECKIN">) {
  const ctx = await getSessionContext();
  if (!ctx || !roles.includes(ctx.role)) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx;
}

/**
 * Garde de page (Server Component) : redirige plutôt que de lever une
 * exception, car ici on rend une page — pas une mutation. Le rôle CHECKIN
 * n'a accès à aucune page admin autre que /admin/check-in (section 16).
 */
export async function requireAdminPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "ADMIN") redirect("/admin/check-in");
  return ctx;
}

export async function requireStaffPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}
