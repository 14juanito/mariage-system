import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { markInvitationViewed } from "@/modules/invitations/service";
import { formatDatePoster } from "@/lib/utils";
import { guestDisplayNameStylized, guestSalutation } from "@/lib/guest";

export const metadata = { title: "Vous êtes invité·e — Mariage System" };

// Papeterie noir & or (fond noir profond, dorure métallique, calligraphie
// ivoire) — cette palette est locale à la page publique d'invitation et au
// PDF ; le back-office admin garde la charte sage/ivoire d'origine.
const GOLD_GRADIENT = "linear-gradient(135deg, #EFD9A0 0%, #C9A24B 45%, #8A6A28 100%)";
// Noir mesuré sur l'image de fond fournie (public/images/fond-invitation.jpg)
// — utilisé comme couleur de page pour que les bords de l'image (affichée en
// `contain`) se fondent sans liseré visible.
const BG_BLACK = "#151515";

/** Ornement Art déco horizontal — losange central flanqué de volutes symétriques. */
function ArtDecoDivider({ id }: { id: string }) {
  return (
    <svg width="220" height="20" viewBox="0 0 220 20" fill="none" aria-hidden="true" className="mx-auto">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A6A28" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#C9A24B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8A6A28" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d="M0 10 H88 M132 10 H220" stroke={`url(#${id})`} strokeWidth="0.9" />
      <path d="M110 2 L118 10 L110 18 L102 10 Z" stroke="#C9A24B" strokeWidth="0.9" />
      <circle cx="110" cy="10" r="2" fill="#C9A24B" />
      <path d="M88 10 C 94 6, 100 6, 102 10 M118 10 C 120 6, 126 6, 132 10" stroke="#C9A24B" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Alliances entrelacées, rendu vectoriel doré. Un trait fin plus clair en
 * vis-à-vis de chaque anneau simule un reflet métallique, et deux
 * étincelles ponctuent l'ensemble pour un rendu plus « bijou ».
 */
function RingsOrnament({ id }: { id: string }) {
  return (
    <svg width="92" height="56" viewBox="0 0 92 56" fill="none" aria-hidden="true" className="mx-auto">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EFD9A0" />
          <stop offset="45%" stopColor="#C9A24B" />
          <stop offset="100%" stopColor="#8A6A28" />
        </linearGradient>
      </defs>
      <ellipse cx="34" cy="28" rx="19" ry="19" stroke={`url(#${id})`} strokeWidth="3" />
      <path d="M22 17 A 19 19 0 0 1 42 13" stroke="#EFD9A0" strokeWidth="1.4" />

      <ellipse cx="58" cy="28" rx="19" ry="19" stroke={`url(#${id})`} strokeWidth="3" />
      <path d="M46 17 A 19 19 0 0 1 66 13" stroke="#EFD9A0" strokeWidth="1.4" />

      <path d="M78 12 L79.4 15.6 L83 17 L79.4 18.4 L78 22 L76.6 18.4 L73 17 L76.6 15.6 Z" fill="#EFD9A0" />
      <path d="M12 40 L12.9 42.2 L15 43 L12.9 43.8 L12 46 L11.1 43.8 L9 43 L11.1 42.2 Z" fill="#EFD9A0" />
    </svg>
  );
}

export default async function PublicInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { guest: { include: { table: true } }, wedding: true },
  });

  if (!invitation) notFound();

  if (invitation.status === "DISABLED") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center" style={{ backgroundColor: BG_BLACK }}>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4EFE2]">Invitation indisponible</h1>
          <p className="mt-2 text-sm text-[#C9C3B4]">
            Cette invitation n&apos;est plus active. Contactez les mariés si vous pensez qu&apos;il s&apos;agit
            d&apos;une erreur.
          </p>
        </div>
      </main>
    );
  }

  await markInvitationViewed(token);
  const { guest, wedding } = invitation;
  const { prefix: namePrefix, emphasized: nameEmphasized } = guestDisplayNameStylized(guest);
  const salutation = guestSalutation(guest);
  const { month, day, weekday } = formatDatePoster(wedding.weddingDate);

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-10 sm:py-16" style={{ backgroundColor: BG_BLACK }}>
      <div className="mx-auto max-w-md animate-rise-in">
        {/* Cadre doré + fleurs fournis par le porteur de projet — ratio
            verrouillé sur l'image d'origine pour ne jamais la rogner, avec
            le contenu recentré dans la zone sombre qu'elle laisse libre.
            Seuls le « héros » (noms des mariés) vit dans le cadre : le reste
            (date, infos, bouton) est sous le cadre, sur le même noir, pour
            ne jamais chevaucher le motif quelle que soit la longueur des
            textes (adresse, message de bienvenue…). */}
        <div className="relative aspect-[736/1030] w-full">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/images/fond-invitation.jpg)",
              backgroundSize: "contain",
              backgroundPosition: "top center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="relative flex h-full flex-col items-center justify-center px-14 pt-6 text-center sm:px-16">
            <div
              className="flex items-center justify-center gap-3 animate-rise-in"
              style={{ animationDelay: "160ms" }}
            >
              <span className="font-script text-4xl leading-none text-[#F4EFE2] sm:text-5xl">
                {wedding.brideName}
              </span>
            </div>
            <p
              className="mt-1 animate-rise-in font-display text-2xl font-semibold text-[#C9A24B]"
              style={{ animationDelay: "220ms" }}
            >
              &amp;
            </p>
            <div className="mt-1 animate-rise-in" style={{ animationDelay: "260ms" }}>
              <span className="font-script text-4xl leading-none text-[#F4EFE2] sm:text-5xl">
                {wedding.groomName}
              </span>
            </div>
          </div>
        </div>

        <div className="relative px-9 pb-14 pt-2 text-center sm:px-14">
          <p
            className="animate-rise-in text-[10px] tracking-[0.25em] uppercase text-[#C9A24B]"
            style={{ animationDelay: "320ms" }}
          >
            {salutation}
          </p>
          <h1
            className="mt-2 animate-rise-in font-display text-xl font-semibold text-[#F4EFE2]"
            style={{ animationDelay: "360ms" }}
          >
            {namePrefix ? `${namePrefix} ` : ""}
            {nameEmphasized}
          </h1>

          <div
            className="mt-7 flex items-baseline justify-center gap-2 animate-rise-in"
            style={{ animationDelay: "420ms" }}
          >
            <span className="font-display text-base font-semibold text-[#F4EFE2]">{weekday}</span>
            <span className="font-display text-4xl font-bold leading-none text-[#C9A24B] sm:text-5xl">{day}</span>
            <span className="font-display text-base font-semibold text-[#F4EFE2]">{month}</span>
          </div>
          <p
            className="mt-2 animate-rise-in text-sm font-semibold tracking-widest text-[#F4EFE2]"
            style={{ animationDelay: "460ms" }}
          >
            {wedding.weddingTime}
          </p>

          <div className="mt-8 animate-rise-in" style={{ animationDelay: "500ms" }}>
            <ArtDecoDivider id="divider-1" />
          </div>

          <p
            className="mx-auto mt-6 max-w-sm animate-rise-in font-display text-base italic leading-relaxed text-[#C9C3B4]"
            style={{ animationDelay: "540ms" }}
          >
            {wedding.welcomeMessage}
          </p>

          <div className="mt-7 animate-rise-in space-y-1" style={{ animationDelay: "580ms" }}>
            <p className="text-[13px] font-medium text-[#F4EFE2]">{wedding.venueName}</p>
            <p className="text-[11px] text-[#C9C3B4]">{wedding.venueAddress}</p>
            {guest.table ? (
              <p className="!mt-2 text-base font-semibold tracking-wide text-[#C9A24B]">
                Table N°{guest.table.number}
                {guest.table.name ? ` — ${guest.table.name}` : ""}
              </p>
            ) : null}
          </div>

          <div className="mt-8 animate-rise-in" style={{ animationDelay: "620ms" }}>
            <RingsOrnament id="rings" />
          </div>

          <a
            href={`/api/invitations/${token}/pdf`}
            className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-sm px-5 py-3.5 text-sm font-medium text-[#0B0B0C] shadow-[0_4px_20px_-6px_rgba(201,162,75,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_rgba(201,162,75,0.65)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C] animate-rise-in"
            style={{ backgroundImage: GOLD_GRADIENT, animationDelay: "660ms" }}
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            Télécharger mon invitation
          </a>

          <p className="mt-4 animate-rise-in text-[10px] text-[#C9C3B4]" style={{ animationDelay: "700ms" }}>
            Présentez cette invitation (écran ou papier) à l&apos;entrée le jour J.
          </p>

          <p
            className="mt-6 animate-rise-in text-[8.5px] font-semibold tracking-[0.3em] uppercase text-[#C9A24B]"
            style={{ animationDelay: "740ms" }}
          >
            Une invitation · Une entrée
          </p>
        </div>
      </div>
    </main>
  );
}
