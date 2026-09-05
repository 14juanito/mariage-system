/**
 * Rate limiting en mémoire (token bucket), sans dépendance externe.
 *
 * ⚠️ Portée réelle sur Vercel (serverless) : le compteur vit dans la mémoire
 * d'une instance de fonction. Plusieurs instances tournant en parallèle ont
 * chacune leur propre compteur, et une instance recyclée repart à zéro. La
 * limite effective est donc « N fois la limite configurée » plutôt qu'une
 * limite globale stricte.
 *
 * C'est acceptable ici parce que ce module n'est pas ce qui garantit la
 * sécurité : il ne fait que freiner le bruit (bruteforce de login, scans
 * répétés). Les deux garanties fortes sont ailleurs et restent intactes :
 *   - le hash bcrypt + les sessions en base pour l'authentification ;
 *   - l'UPDATE atomique conditionnel pour la règle « une invitation = une
 *     entrée » (voir modules/check-in/service.ts).
 *
 * Pour une limite globale stricte, remplacer ce store par un store partagé
 * (Upstash Redis, ou une table Postgres) derrière la même API publique.
 */

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

// Purge périodique pour éviter une fuite mémoire sur un process long-lived.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit(
  key: string,
  { capacity, refillPerSecond }: { capacity: number; refillPerSecond: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };

  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }

  buckets.set(key, bucket);
  const missing = 1 - bucket.tokens;
  return { allowed: false, retryAfterMs: Math.ceil((missing / refillPerSecond) * 1000) };
}
