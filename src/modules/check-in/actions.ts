"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/modules/auth/service";
import { resetCheckIn } from "./service";
import { resetCheckInSchema } from "@/lib/validation";
import type { ActionResult } from "@/modules/guests/actions";

export async function resetCheckInAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN"); // jamais accessible au rôle CHECKIN

  const parsed = resetCheckInSchema.safeParse({
    invitationId: formData.get("invitationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await resetCheckIn(parsed.data.invitationId, ctx.userId, ctx.weddingId, parsed.data.reason);

  revalidatePath("/admin/guests");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/invitations");

  return { success: true, message: "Check-in réinitialisé." };
}
