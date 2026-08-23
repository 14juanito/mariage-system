import { randomUUID } from "crypto";

/**
 * Token d'invitation : UUID v4 (122 bits d'entropie), jamais un ID séquentiel.
 * Utilisé dans l'URL publique /invitation/[token] et encodé dans le QR code.
 */
export function generateInvitationToken() {
  return randomUUID();
}
