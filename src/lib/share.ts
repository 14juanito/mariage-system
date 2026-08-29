/**
 * Envoi direct du lien d'invitation par WhatsApp / e-mail — pas de service
 * d'envoi (aucune API tierce, aucun secret) : on ouvre simplement le client
 * WhatsApp/e-mail de l'utilisateur avec le message déjà rempli, comme un
 * "mailto:"/"wa.me" classique. Reste 100% compatible hébergement mutualisé.
 */

/**
 * Indicatif par défaut utilisé quand un numéro est saisi au format local
 * (ex. « 0813337193 », sans indicatif) — mariage basé à Kinshasa, RDC (+243).
 */
const DEFAULT_COUNTRY_CODE = "243";

/**
 * Convertit un numéro saisi dans n'importe quel format courant vers le
 * format international attendu par wa.me (indicatif + numéro, sans « + »,
 * sans le 0 initial local). Sans cette conversion, un numéro local comme
 * « 0813337193 » ouvre bien une page wa.me mais « Ouvrir l'app » ne trouve
 * aucun compte, car ce n'est pas un numéro international valide.
 */
export function sanitizePhoneForWhatsapp(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;
  // Déjà un indicatif inconnu (numéro international saisi sans "+") : laissé tel quel.
  return digits;
}

export function buildInvitationMessage(guestGreeting: string, weddingLabel: string, url: string) {
  return `Bonjour ${guestGreeting}, ${weddingLabel} ont le plaisir de vous inviter à leur mariage. Découvrez votre invitation ici : ${url}`;
}

export function whatsappShareUrl(phone: string, message: string) {
  const digits = sanitizePhoneForWhatsapp(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function mailtoShareUrl(email: string, weddingLabel: string, message: string) {
  const subject = `Invitation au mariage — ${weddingLabel}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
