import "server-only";
import { prisma } from "@/lib/prisma";
import { guestSeatCount, TABLE_CAPACITY } from "@/lib/guest";

export async function listTablesWithOccupancy(weddingId: string) {
  const tables = await prisma.table.findMany({
    where: { weddingId },
    include: { guests: true },
    orderBy: { number: "asc" },
  });

  return tables.map((table) => {
    const occupied = table.guests.reduce((sum, g) => sum + guestSeatCount(g), 0);
    return {
      id: table.id,
      number: table.number,
      name: table.name,
      occupied,
      capacity: TABLE_CAPACITY,
      remaining: Math.max(TABLE_CAPACITY - occupied, 0),
      guests: table.guests,
    };
  });
}

/** Occupation actuelle d'une table (places prises), pour la vérification serveur avant assignation. */
export async function getTableOccupancy(tableId: string) {
  const guests = await prisma.guest.findMany({ where: { tableId }, select: { partyType: true } });
  return guests.reduce((sum, g) => sum + guestSeatCount(g), 0);
}

/**
 * Vérifie que l'ajout de `seatsToAdd` places sur `tableId` ne dépasse pas le
 * plafond de 10 — recalculé côté serveur à chaque fois, jamais fait confiance
 * à l'affichage client. `excludeGuestId` sert lors d'une modification : on ne
 * compte pas les places déjà occupées par l'invité qu'on est en train d'éditer.
 */
export async function assertTableCapacity(
  tableId: string,
  weddingId: string,
  seatsToAdd: number,
  excludeGuestId?: string,
) {
  const table = await prisma.table.findFirst({ where: { id: tableId, weddingId } });
  if (!table) return { ok: false as const, error: "Table introuvable." };

  const guests = await prisma.guest.findMany({
    where: { tableId, ...(excludeGuestId ? { NOT: { id: excludeGuestId } } : {}) },
    select: { partyType: true },
  });
  const occupied = guests.reduce((sum, g) => sum + guestSeatCount(g), 0);

  if (occupied + seatsToAdd > TABLE_CAPACITY) {
    const remaining = Math.max(TABLE_CAPACITY - occupied, 0);
    return {
      ok: false as const,
      error: `La table n°${table.number} n'a plus assez de places (${remaining} restante(s) sur ${TABLE_CAPACITY}).`,
    };
  }

  return { ok: true as const };
}

export async function nextAvailableTableNumber(weddingId: string) {
  const last = await prisma.table.findFirst({ where: { weddingId }, orderBy: { number: "desc" } });
  return (last?.number ?? 0) + 1;
}
