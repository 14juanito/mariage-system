"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/modules/auth/service";
import { weddingSchema, createStaffSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/modules/auth/service";
import type { ActionResult } from "@/modules/guests/actions";

export async function updateWeddingAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = weddingSchema.safeParse({
    brideName: formData.get("brideName"),
    groomName: formData.get("groomName"),
    weddingDate: formData.get("weddingDate"),
    weddingTime: formData.get("weddingTime"),
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress"),
    welcomeMessage: formData.get("welcomeMessage"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await prisma.wedding.update({
    where: { id: ctx.weddingId },
    data: { ...parsed.data, weddingDate: new Date(parsed.data.weddingDate) },
  });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "wedding.update",
    targetType: "wedding",
    targetId: ctx.weddingId,
  });

  revalidatePath("/admin/wedding");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Informations du mariage mises à jour." };
}

export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    const alreadyStaff = await prisma.weddingStaff.findUnique({
      where: { weddingId_userId: { weddingId: ctx.weddingId, userId: existing.id } },
    });
    if (alreadyStaff) return { success: false, error: "Ce compte a déjà accès à ce mariage." };
    await prisma.weddingStaff.create({
      data: { weddingId: ctx.weddingId, userId: existing.id, role: parsed.data.role },
    });
  } else {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { email: parsed.data.email, name: parsed.data.name, passwordHash },
    });
    await prisma.weddingStaff.create({
      data: { weddingId: ctx.weddingId, userId: user.id, role: parsed.data.role },
    });
  }

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "staff.create",
    targetType: "user",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/admin/settings");
  return { success: true, message: "Compte ajouté à l'équipe." };
}

export async function removeStaffAction(staffId: string): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const staff = await prisma.weddingStaff.findFirst({ where: { id: staffId, weddingId: ctx.weddingId } });
  if (!staff) return { success: false, error: "Membre introuvable." };
  if (staff.userId === ctx.userId) return { success: false, error: "Vous ne pouvez pas vous retirer vous-même." };

  await prisma.weddingStaff.delete({ where: { id: staffId } });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "staff.remove",
    targetType: "user",
    targetId: staff.userId,
  });

  revalidatePath("/admin/settings");
  return { success: true, message: "Membre retiré de l'équipe." };
}
