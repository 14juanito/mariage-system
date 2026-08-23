"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/modules/auth/service";
import { guestSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { generateInvitation } from "@/modules/invitations/service";
import { assertTableCapacity } from "@/modules/tables/service";
import { guestSeatCount } from "@/lib/guest";

export type ActionResult = { success: true; message?: string } | { success: false; error: string };

function fieldErrors(parsed: ReturnType<typeof guestSchema.safeParse>): string {
  if (parsed.success) return "";
  return parsed.error.issues[0]?.message ?? "Données invalides.";
}

function readGuestForm(formData: FormData) {
  return guestSchema.safeParse({
    civility: formData.get("civility"),
    partyType: formData.get("partyType") || "SINGLE",
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    tableId: formData.get("tableId"),
    notes: formData.get("notes"),
  });
}

export async function createGuestAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = readGuestForm(formData);
  if (!parsed.success) return { success: false, error: fieldErrors(parsed) };

  const data = parsed.data;
  // Un couple s'enregistre sous un seul nom de famille — jamais deux prénoms/noms distincts.
  if (data.partyType === "COUPLE") data.firstName = "Couple";

  if (data.tableId) {
    const check = await assertTableCapacity(data.tableId, ctx.weddingId, guestSeatCount(data));
    if (!check.ok) return { success: false, error: check.error };
  }

  const guest = await prisma.guest.create({
    data: {
      weddingId: ctx.weddingId,
      civility: data.civility as "MR" | "MME" | undefined,
      partyType: data.partyType,
      firstName: data.firstName!,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      tableId: data.tableId,
      notes: data.notes,
    },
  });

  await generateInvitation(guest.id, ctx.weddingId, ctx.userId);

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "guest.create",
    targetType: "guest",
    targetId: guest.id,
  });

  revalidatePath("/admin/guests");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/tables");
  return { success: true, message: "Invité ajouté et invitation générée." };
}

export async function updateGuestAction(guestId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = readGuestForm(formData);
  if (!parsed.success) return { success: false, error: fieldErrors(parsed) };

  const guest = await prisma.guest.findFirst({ where: { id: guestId, weddingId: ctx.weddingId } });
  if (!guest) return { success: false, error: "Invité introuvable." };

  const data = parsed.data;
  if (data.partyType === "COUPLE") data.firstName = "Couple";

  if (data.tableId) {
    const check = await assertTableCapacity(data.tableId, ctx.weddingId, guestSeatCount(data), guestId);
    if (!check.ok) return { success: false, error: check.error };
  }

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      civility: data.civility as "MR" | "MME" | undefined,
      partyType: data.partyType,
      firstName: data.firstName!,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      tableId: data.tableId ?? null,
      notes: data.notes,
    },
  });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "guest.update",
    targetType: "guest",
    targetId: guestId,
  });

  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${guestId}`);
  revalidatePath("/admin/tables");
  return { success: true, message: "Invité mis à jour." };
}

export async function deleteGuestAction(guestId: string): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const guest = await prisma.guest.findFirst({ where: { id: guestId, weddingId: ctx.weddingId } });
  if (!guest) return { success: false, error: "Invité introuvable." };

  await prisma.guest.delete({ where: { id: guestId } });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "guest.delete",
    targetType: "guest",
    targetId: guestId,
    metadata: { firstName: guest.firstName, lastName: guest.lastName },
  });

  revalidatePath("/admin/guests");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/tables");
  return { success: true, message: "Invité supprimé." };
}
