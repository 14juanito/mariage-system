import "server-only";
import { prisma } from "@/lib/prisma";
import { generateInvitationToken } from "./token";
import { writeAuditLog } from "@/lib/audit";

export async function generateInvitation(guestId: string, weddingId: string, actorId: string) {
  const existing = await prisma.invitation.findUnique({ where: { guestId } });
  if (existing) return existing;

  const invitation = await prisma.invitation.create({
    data: {
      guestId,
      weddingId,
      token: generateInvitationToken(),
    },
  });

  await writeAuditLog({
    weddingId,
    userId: actorId,
    action: "invitation.generate",
    targetType: "invitation",
    targetId: invitation.id,
  });

  return invitation;
}

export async function listInvitations(weddingId: string) {
  return prisma.invitation.findMany({
    where: { weddingId },
    include: { guest: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function markInvitationViewed(token: string) {
  // Best-effort : une invitation déjà vue n'est pas ré-écrite (évite un
  // UPDATE inutile à chaque visite).
  await prisma.invitation.updateMany({
    where: { token, viewedAt: null },
    data: { viewedAt: new Date() },
  });
}

export async function toggleInvitationStatus(invitationId: string, weddingId: string, actorId: string) {
  const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, weddingId } });
  if (!invitation) throw new Error("Invitation introuvable.");

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: invitation.status === "ACTIVE" ? "DISABLED" : "ACTIVE" },
  });

  await writeAuditLog({
    weddingId,
    userId: actorId,
    action: updated.status === "DISABLED" ? "invitation.disable" : "invitation.enable",
    targetType: "invitation",
    targetId: invitationId,
  });

  return updated;
}
