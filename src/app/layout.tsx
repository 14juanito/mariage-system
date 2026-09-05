import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Great_Vibes } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Calligraphie utilisée uniquement pour les prénoms des mariés sur la page
// publique d'invitation (papeterie noir & or) — next/font l'auto-héberge au
// build, donc pas de requête réseau à l'exécution.
const script = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mariage System — Gestion d'invitations",
  description: "Plateforme de gestion d'invitations de mariage et de check-in QR.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#29483B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${script.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
