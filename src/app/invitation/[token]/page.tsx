import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { markInvitationViewed } from "@/modules/invitations/service";
import { formatDateFr } from "@/lib/utils";
import { guestDisplayNameStylized, guestSalutation } from "@/lib/guest";

export const metadata = { title: "Vous êtes invité·e — Mariage System" };

export default async function PublicInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { guest: { include: { table: true } }, wedding: true },
  });

  if (!invitation) notFound();

  if (invitation.status === "DISABLED") {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Invitation indisponible</h1>
          <p className="mt-2 text-sm text-text-secondary">
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

  const details = [
    { label: "Date", value: formatDateFr(wedding.weddingDate), capitalize: true },
    { label: "Heure", value: wedding.weddingTime },
    { label: "Lieu", value: wedding.venueName },
    { label: "Adresse", value: wedding.venueAddress },
    ...(guest.table
      ? [{ label: "Table", value: `N°${guest.table.number}${guest.table.name ? ` — ${guest.table.name}` : ""}` }]
      : []),
  ];

  return (
    <main className="min-h-screen bg-ivory overflow-x-hidden">
      <div className="relative overflow-hidden bg-eucalyptus text-ivory px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <svg
          className="absolute -top-10 -right-16 opacity-25 motion-safe:animate-drift"
          width="260"
          height="260"
          viewBox="0 0 260 260"
          fill="none"
        >
          <path
            d="M10 30 C 80 60, 140 110, 180 200 M40 20 C 90 60, 130 100, 160 170 M70 15 C 100 45, 125 80, 145 135"
            stroke="#C9B995"
            strokeWidth="1.5"
          />
        </svg>
        <svg
          className="absolute -bottom-8 -left-12 opacity-15 motion-safe:animate-drift [animation-delay:1.5s]"
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M10 10 C 60 20, 120 50, 180 100"
            stroke="#B8C8B5"
            strokeWidth="1.5"
          />
        </svg>
        <div className="relative z-10 max-w-md mx-auto text-center animate-rise-in">
          <p className="text-xs tracking-[0.35em] uppercase text-champagne">
            {wedding.brideName} &amp; {wedding.groomName}
          </p>
          <p className="mt-6 font-display text-lg italic text-soft-sage">ont le plaisir de vous inviter</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-14 sm:-mt-16 pb-16">
        <div
          className="rounded-lg bg-white shadow-soft border border-soft-sage/50 px-6 py-10 sm:px-10 sm:py-12 text-center animate-rise-in [animation-delay:150ms]"
        >
          <p className="text-xs tracking-[0.25em] uppercase text-sage animate-rise-in [animation-delay:250ms]">
            {salutation}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary animate-rise-in [animation-delay:320ms]">
            {namePrefix ? `${namePrefix} ` : ""}
            {nameEmphasized}
          </h1>

          <div className="mx-auto my-6 h-px w-12 bg-champagne animate-rise-in [animation-delay:400ms]" />

          <p className="text-sm leading-relaxed text-text-secondary animate-rise-in [animation-delay:450ms]">
            {wedding.welcomeMessage}
          </p>

          <dl className="mt-8 space-y-3 text-left border-t border-b border-soft-sage/40 py-6">
            {details.map((detail, i) => (
              <div
                key={detail.label}
                className="flex justify-between gap-4 animate-rise-in"
                style={{ animationDelay: `${520 + i * 70}ms` }}
              >
                <dt className="text-xs uppercase tracking-wide text-sage shrink-0">{detail.label}</dt>
                <dd
                  className={`text-sm font-medium text-text-primary text-right ${detail.capitalize ? "capitalize" : ""}`}
                >
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={`/api/invitations/${token}/pdf`}
            className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-eucalyptus px-5 py-3.5 text-sm font-medium text-ivory shadow-card transition-all duration-300 hover:bg-eucalyptus/90 hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 animate-rise-in"
            style={{ animationDelay: `${520 + details.length * 70 + 80}ms` }}
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
            Télécharger mon invitation
          </a>

          <p
            className="mt-4 text-[11px] text-text-secondary animate-rise-in"
            style={{ animationDelay: `${520 + details.length * 70 + 160}ms` }}
          >
            Présentez cette invitation (écran ou papier) à l&apos;entrée le jour J.
          </p>
        </div>
      </div>
    </main>
  );
}
