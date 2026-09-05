import type { NextConfig } from "next";

// Les composants client ne peuvent lire que des variables NEXT_PUBLIC_*,
// figées au build. Sur Vercel, l'URL de production n'est connue que via
// VERCEL_PROJECT_PRODUCTION_URL (non exposée au client) : on la recopie ici
// pour que les liens d'invitation partagés par WhatsApp/e-mail contiennent
// bien un domaine, au lieu d'une URL relative inutilisable hors du site.
// Une valeur explicite reste prioritaire (cas d'un domaine personnalisé).
const publicAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

const nextConfig: NextConfig = {
  ...(publicAppUrl ? { env: { NEXT_PUBLIC_APP_URL: publicAppUrl } } : {}),
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Le générateur de PDF (@react-pdf/renderer) lit ses polices et l'image de
  // fond depuis le disque via `fs`. Le tracing de Next ne détecte pas ces
  // lectures dynamiques : sans cette liste, les fichiers sont absents du
  // bundle de la fonction serverless sur Vercel et la génération échoue.
  outputFileTracingIncludes: {
    "/api/invitations/*/pdf": ["./src/assets/fonts/**", "./src/assets/images/**"],
  },
};

export default nextConfig;
