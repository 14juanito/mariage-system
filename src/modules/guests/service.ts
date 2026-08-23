import "server-only";
import { prisma } from "@/lib/prisma";

export async function listGuests(weddingId: string, query?: string) {
  return prisma.guest.findMany({
    where: {
      weddingId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      table: true,
      invitation: { include: { checkIns: { orderBy: { scannedAt: "desc" }, take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGuest(weddingId: string, guestId: string) {
  return prisma.guest.findFirst({
    where: { id: guestId, weddingId },
    include: { table: true, invitation: { include: { checkIns: true } } },
  });
}
