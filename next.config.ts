import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Nécessaire pour que les polices et l'image de fond auto-hébergées
  // utilisées par le générateur de PDF (@react-pdf/renderer, lues depuis le
  // disque via fs) soient bien copiées dans le build `standalone` déployé
  // sur Hostinger.
  outputFileTracingIncludes: {
    "/api/invitations/*/pdf": ["./src/assets/fonts/**", "./src/assets/images/**"],
  },
};

export default nextConfig;
