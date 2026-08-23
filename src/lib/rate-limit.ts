/**
 * Rate limiting en mémoire (token bucket) — suffisant pour un déploiement
 * mono-instance sur hébergement mutualisé. Pas de dépendance externe (Redis)
 * requise, ce qui reste compatible avec l'offre Hostinger Premium.
 *
 * Point d'évolution documenté : si l'app tourne un jour en plusieurs instances,
 * remplacer ce module par un store partagé (ex. Redis) derrière la même API.
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
