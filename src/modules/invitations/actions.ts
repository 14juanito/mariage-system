"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/modules/auth/service";
import { toggleInvitationStatus } from "./service";
import type { ActionResult } from "@/modules/guests/actions";

export async function toggleInvitationStatusAction(invitationId: string): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN");
  const updated = await toggleInvitationStatus(invitationId, ctx.weddingId, ctx.userId);

  revalidatePath("/admin/guests");
  revalidatePath("/admin/invitations");

  return {
    success: true,
    message: updated.status === "DISABLED" ? "Invitation désactivée." : "Invitation réactivée.",
  };
}
