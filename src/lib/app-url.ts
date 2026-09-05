import "server-only";

/**
 * URL publique de l'application, utilisée pour construire les liens
 * d'invitation et le contenu des QR codes.
 *
 * Ordre de résolution :
 *  1. `NEXT_PUBLIC_APP_URL` — valeur explicite, prioritaire (domaine
 *     personnalisé notamment) ;
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — domaine de production fourni
 *     automatiquement par Vercel, stable d'un déploiement à l'autre ;
 *  3. en développement uniquement, `http://localhost:3000`.
 *
 * En production, si aucune des deux premières n'est disponible, on lève une
 * erreur au lieu de se rabattre sur localhost. Un QR code est imprimé puis
 * distribué : une mauvaise URL ne se corrige plus après coup, alors qu'une
 * erreur visible au déploiement se corrige en une minute.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain.replace(/\/$/, "")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "URL publique introuvable : définissez NEXT_PUBLIC_APP_URL. " +
        "Sans elle, les QR codes générés pointeraient vers une adresse invalide.",
    );
  }

  return "http://localhost:3000";
}
