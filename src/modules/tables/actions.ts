"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/modules/auth/service";
import { tableSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import type { ActionResult } from "@/modules/guests/actions";

export async function createTableAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = tableSchema.safeParse({
    number: formData.get("number"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const existing = await prisma.table.findUnique({
    where: { weddingId_number: { weddingId: ctx.weddingId, number: parsed.data.number } },
  });
  if (existing) {
    return { success: false, error: `La table n°${parsed.data.number} existe déjà.` };
  }

  const table = await prisma.table.create({
    data: { weddingId: ctx.weddingId, number: parsed.data.number, name: parsed.data.name },
  });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "table.create",
    targetType: "table",
    targetId: table.id,
  });

  revalidatePath("/admin/tables");
  revalidatePath("/admin/guests");
  return { success: true, message: `Table n°${parsed.data.number} créée.` };
}

export async function renameTableAction(tableId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const parsed = tableSchema.safeParse({
    number: formData.get("number"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const table = await prisma.table.findFirst({ where: { id: tableId, weddingId: ctx.weddingId } });
  if (!table) return { success: false, error: "Table introuvable." };

  const conflict = await prisma.table.findFirst({
    where: { weddingId: ctx.weddingId, number: parsed.data.number, NOT: { id: tableId } },
  });
  if (conflict) return { success: false, error: `La table n°${parsed.data.number} existe déjà.` };

  await prisma.table.update({ where: { id: tableId }, data: parsed.data });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "table.update",
    targetType: "table",
    targetId: tableId,
  });

  revalidatePath("/admin/tables");
  revalidatePath("/admin/guests");
  return { success: true, message: "Table mise à jour." };
}

export async function deleteTableAction(tableId: string): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");

  const table = await prisma.table.findFirst({
    where: { id: tableId, weddingId: ctx.weddingId },
    include: { _count: { select: { guests: true } } },
  });
  if (!table) return { success: false, error: "Table introuvable." };

  if (table._count.guests > 0) {
    return {
      success: false,
      error: `Cette table contient encore ${table._count.guests} invité(s). Retirez-les avant de la supprimer.`,
    };
  }

  await prisma.table.delete({ where: { id: tableId } });

  await writeAuditLog({
    weddingId: ctx.weddingId,
    userId: ctx.userId,
    action: "table.delete",
    targetType: "table",
    targetId: tableId,
  });

  revalidatePath("/admin/tables");
  return { success: true, message: "Table supprimée." };
}
