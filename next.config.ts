import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
