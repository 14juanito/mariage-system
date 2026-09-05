import { PrismaClient } from "@prisma/client";

// Évite de recréer une nouvelle connexion à chaque hot-reload en dev,
// et reste compatible avec un hébergement mutualisé à ressources limitées.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Laisse à la base le temps de sortir de veille.
 *
 * Neon suspend le calcul après quelques minutes d'inactivité et met plusieurs
 * secondes à redémarrer. Le délai de connexion par défaut de Prisma (5 s)
 * expire avant, et la requête échoue sur « Can't reach database server » —
 * une panne réseau apparente, alors que la base est seulement endormie.
 *
 * Le risque est concret le jour de l'événement : après un creux d'activité,
 * le premier scan de QR code à l'accueil tomberait sur cette erreur. Vercel
 * applique le même correctif dans sa variable POSTGRES_PRISMA_URL.
 *
 * Une valeur déjà présente dans l'URL est respectée.
 */
function withConnectTimeout(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }
    return parsed.toString();
  } catch {
    // Chaîne non analysable : la laisser telle quelle plutôt que d'empêcher
    // le démarrage. Prisma produira son propre message si elle est invalide.
    return url;
  }
}

const datasourceUrl = withConnectTimeout(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
