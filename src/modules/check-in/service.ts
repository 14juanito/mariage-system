// Pas de garde `import "server-only"` ici (contrairement aux autres modules) :
// ce fichier est exécuté directement par scripts/test-concurrent-scan.ts (hors
// Next.js) pour le test critique anti double-scan. Il n'est jamais importé
// depuis un composant "use client" dans l'application.
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { guestDisplayName } from "@/lib/guest";
import type { ScanOutcome } from "@/types";

/**
 * Cœur anti double-scan (voir plan d'architecture, section 13/37).
 *
 * Une seule requête UPDATE conditionnelle et atomique : elle ne peut
 * réussir (affectedRows === 1) que pour la première requête à atteindre
 * une invitation encore `checked_in = false`. InnoDB verrouille la ligne
 * pendant l'UPDATE ; toute requête concurrente sur le même token attend
 * puis échoue à matcher la condition une fois la première commitée.
 * → Un seul scan peut jamais recevoir VALID, même en cas de scans
 *   strictement simultanés depuis deux appareils différents.
 */
export async function scanInvitationToken(
  token: string,
  scannedById: string,
): Promise<ScanOutcome> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { guest: true },
  });

  if (!invitation) {
    return { result: "INVALID" };
  }

  const guestName = guestDisplayName(invitation.guest);

  if (invitation.status === "DISABLED") {
    await recordCheckIn(invitation.id, invitation.guestId, invitation.weddingId, scannedById, "DISABLED");
    await writeAuditLog({
      weddingId: invitation.weddingId,
      userId: scannedById,
      action: "check_in.scan_disabled",
      targetType: "invitation",
      targetId: invitation.id,
    });
    return { result: "DISABLED", guestName };
  }

  const now = new Date();
  const { count } = await prisma.invitation.updateMany({
    where: { token, status: "ACTIVE", checkedIn: false },
    data: { checkedIn: true, checkedInAt: now, checkedById: scannedById },
  });

  if (count === 1) {
    await recordCheckIn(invitation.id, invitation.guestId, invitation.weddingId, scannedById, "VALID");
    await writeAuditLog({
      weddingId: invitation.weddingId,
      userId: scannedById,
      action: "check_in.scan_valid",
      targetType: "invitation",
      targetId: invitation.id,
    });
    return { result: "VALID", guestName, scannedAt: now.toISOString() };
  }

  // count === 0 : quelqu'un d'autre a gagné la course, ou déjà scanné avant.
  const fresh = await prisma.invitation.findUnique({ where: { token } });
  await recordCheckIn(invitation.id, invitation.guestId, invitation.weddingId, scannedById, "ALREADY_USED");
  await writeAuditLog({
    weddingId: invitation.weddingId,
    userId: scannedById,
    action: "check_in.scan_already_used",
    targetType: "invitation",
    targetId: invitation.id,
  });

  return {
    result: "ALREADY_USED",
    guestName,
    firstScanAt: fresh?.checkedInAt?.toISOString(),
  };
}

async function recordCheckIn(
  invitationId: string,
  guestId: string,
  weddingId: string,
  scannedById: string,
  result: "VALID" | "ALREADY_USED" | "INVALID" | "DISABLED",
) {
  await prisma.checkIn.create({
    data: { invitationId, guestId, weddingId, scannedById, result },
  });
}

export async function resetCheckIn(invitationId: string, adminId: string, weddingId: string, reason: string) {
  const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, weddingId } });
  if (!invitation) throw new Error("Invitation introuvable.");

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { checkedIn: false, checkedInAt: null, checkedById: null },
  });

  await writeAuditLog({
    weddingId,
    userId: adminId,
    action: "check_in.reset",
    targetType: "invitation",
    targetId: invitationId,
    metadata: { reason },
  });
}
