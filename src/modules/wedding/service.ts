import "server-only";
import { prisma } from "@/lib/prisma";
import { guestDisplayName } from "@/lib/guest";

export async function getWedding(weddingId: string) {
  return prisma.wedding.findUniqueOrThrow({ where: { id: weddingId } });
}

export async function getDashboardStats(weddingId: string) {
  const [totalGuests, invitationsGenerated, invitationsViewed, present, lastCheckIn] = await Promise.all([
    prisma.guest.count({ where: { weddingId } }),
    prisma.invitation.count({ where: { weddingId } }),
    prisma.invitation.count({ where: { weddingId, viewedAt: { not: null } } }),
    prisma.invitation.count({ where: { weddingId, checkedIn: true } }),
    prisma.checkIn.findFirst({
      where: { weddingId, result: "VALID" },
      orderBy: { scannedAt: "desc" },
      include: { invitation: { include: { guest: true } } },
    }),
  ]);

  return {
    totalGuests,
    invitationsGenerated,
    invitationsViewed,
    present,
    awaited: Math.max(invitationsGenerated - present, 0),
    lastCheckIn: lastCheckIn
      ? {
          guestName: guestDisplayName(lastCheckIn.invitation.guest),
          scannedAt: lastCheckIn.scannedAt.toISOString(),
        }
      : null,
  };
}

/** Arrivées par heure — pour le graphique optionnel du dashboard. */
export async function getArrivalsByHour(weddingId: string) {
  const checkIns = await prisma.checkIn.findMany({
    where: { weddingId, result: "VALID" },
    select: { scannedAt: true },
  });

  const buckets = new Map<string, number>();
  for (const c of checkIns) {
    const key = `${String(c.scannedAt.getHours()).padStart(2, "0")}:00`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));
}
