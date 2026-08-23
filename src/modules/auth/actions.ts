"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { createSession, destroySession, verifyPassword } from "./service";
import { writeAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export type LoginState = { error?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = rateLimit(`login:${ip}`, { capacity: 5, refillPerSecond: 5 / 60 });
  if (!allowed) {
    return { error: "Trop de tentatives. Merci de réessayer dans une minute." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Adresse e-mail ou mot de passe invalide." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !valid) {
    await writeAuditLog({ action: "auth.login_failed", metadata: { email: parsed.data.email } });
    return { error: "Identifiants incorrects." };
  }

  await createSession(user.id);
  await writeAuditLog({ userId: user.id, action: "auth.login_success" });

  redirect("/admin/dashboard");
}

export async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}
