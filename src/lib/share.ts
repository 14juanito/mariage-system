/**
 * Envoi direct du lien d'invitation par WhatsApp / e-mail — pas de service
 * d'envoi (aucune API tierce, aucun secret) : on ouvre simplement le client
 * WhatsApp/e-mail de l'utilisateur avec le message déjà rempli, comme un
 * "mailto:"/"wa.me" classique. Reste 100% compatible hébergement mutualisé.
 */

/** Garde uniquement les chiffres (indicatif inclus) — format attendu par wa.me. */
export function sanitizePhoneForWhatsapp(phone: string) {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
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
