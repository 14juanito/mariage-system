import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        eucalyptus: "#29483B",
        sage: "#7F927D",
        "soft-sage": "#B8C8B5",
        ivory: "#F6F3EA",
        beige: "#D8CCB8",
        champagne: "#C9B995",
        success: "#3E7A52",
        error: "#B3524A",
        warning: "#C79A4B",
        "text-primary": "#26322B",
        "text-secondary": "#5C6B60",
        border: "#E4DCC8",
        input: "#E4DCC8",
        ring: "#7F927D",
        background: "#F6F3EA",
        foreground: "#26322B",
        primary: {
          DEFAULT: "#29483B",
          foreground: "#F6F3EA",
        },
        secondary: {
          DEFAULT: "#7F927D",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#EFEAD9",
          foreground: "#5C6B60",
        },
        accent: {
          DEFAULT: "#C9B995",
          foreground: "#26322B",
        },
        destructive: {
          DEFAULT: "#B3524A",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#26322B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#26322B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        soft: "0 2px 12px -4px rgba(41, 72, 59, 0.12)",
        card: "0 1px 3px rgba(41, 72, 59, 0.08), 0 1px 2px rgba(41, 72, 59, 0.06)",
      },
      spacing: {
        18: "4.5rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Entrée plus marquée pour la page publique d'invitation.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Flottement très discret pour les ornements décoratifs du hero.
        drift: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-6px) rotate(1.5deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "rise-in": "rise-in 0.7s cubic-bezier(0.16,1,0.3,1) both",
        drift: "drift 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
