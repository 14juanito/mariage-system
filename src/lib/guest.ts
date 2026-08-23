import type { Civility, PartyType } from "@prisma/client";

/** Plafond de places par table (règle métier fixe : 1 table = 10 places). */
export const TABLE_CAPACITY = 10;

export type GuestNameParts = {
  civility: Civility | null;
  partyType: PartyType;
  firstName: string;
  lastName: string;
};

export function civilityLabel(civility: Civility | null | undefined) {
  if (civility === "MR") return "M.";
  if (civility === "MME") return "Mme";
  return "";
}

/**
 * Nom d'affichage unique, utilisé partout (tableau, fiche invité, PDF, page
 * publique, résultat de scan) — pour un couple, seul le nom de famille est
 * enregistré et affiché comme « Couple NOM », jamais les deux prénoms/noms.
 */
export function guestDisplayName(guest: GuestNameParts) {
  if (guest.partyType === "COUPLE") {
    return `Couple ${guest.lastName}`;
  }
  const prefix = civilityLabel(guest.civility);
  return [prefix, guest.firstName, guest.lastName].filter(Boolean).join(" ");
}

/**
 * Variante « papeterie » du nom d'affichage, utilisée sur la page publique et
 * le PDF : seul le nom de famille (ou le nom du couple) est en capitales,
 * comme sur un faire-part classique — jamais le nom entier en majuscules.
 */
export function guestDisplayNameStylized(guest: GuestNameParts) {
  if (guest.partyType === "COUPLE") {
    return { prefix: "Couple", emphasized: guest.lastName.toUpperCase() };
  }
  const prefix = [civilityLabel(guest.civility), guest.firstName].filter(Boolean).join(" ");
  return { prefix, emphasized: guest.lastName.toUpperCase() };
}

/** Formule de politesse adaptée à la civilité / au type d'invité. */
export function guestSalutation(guest: Pick<GuestNameParts, "civility" | "partyType">) {
  if (guest.partyType === "COUPLE") return "Chers";
  if (guest.civility === "MR") return "Cher";
  if (guest.civility === "MME") return "Chère";
  return "Cher · Chère";
}

/** Nombre de places occupées à table : 2 pour un couple, 1 sinon. */
export function guestSeatCount(guest: Pick<GuestNameParts, "partyType">) {
  return guest.partyType === "COUPLE" ? 2 : 1;
}
