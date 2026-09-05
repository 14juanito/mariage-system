import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/modules/auth/service";
import { getGuest } from "@/modules/guests/service";
import { listTablesWithOccupancy } from "@/modules/tables/service";
import { generateQrSvg } from "@/modules/invitations/qr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuestDetailActions } from "@/components/shared/guest-detail-actions";
import { formatTimeFr } from "@/lib/utils";
import { guestDisplayName } from "@/lib/guest";
import { getAppUrl } from "@/lib/app-url";

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdminPage();
  const [guest, tables] = await Promise.all([
    getGuest(ctx.weddingId, id),
    listTablesWithOccupancy(ctx.weddingId),
  ]);
  if (!guest) notFound();

  const qrSvg = guest.invitation ? await generateQrSvg(guest.invitation.token) : null;
  const appUrl = getAppUrl();
  const invitationUrl = guest.invitation ? `${appUrl}/invitation/${guest.invitation.token}` : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link
        href="/admin/guests"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux invités
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{guestDisplayName(guest)}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {guest.partyType === "COUPLE" ? "Couple — 2 places" : "1 place"}
            {guest.table ? ` · Table ${guest.table.number}${guest.table.name ? ` (${guest.table.name})` : ""}` : ""}
            {guest.phone ? ` · ${guest.phone}` : ""}
            {guest.email ? ` · ${guest.email}` : ""}
          </p>
        </div>
        <GuestDetailActions guest={guest} tables={tables} weddingLabel={ctx.weddingLabel} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {guest.invitation ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={guest.invitation.status === "ACTIVE" ? "secondary" : "outline"}>
                    {guest.invitation.status === "ACTIVE" ? "Générée" : "Désactivée"}
                  </Badge>
                  <Badge variant={guest.invitation.viewedAt ? "outline" : "outline"}>
                    {guest.invitation.viewedAt ? "Consultée" : "Non consultée"}
                  </Badge>
                  <Badge variant={guest.invitation.checkedIn ? "success" : "warning"}>
                    {guest.invitation.checkedIn
                      ? `Présent — ${guest.invitation.checkedInAt ? formatTimeFr(guest.invitation.checkedInAt) : ""}`
                      : "En attente"}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="secondary" asChild>
                    <a href={invitationUrl!} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Voir
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={`/api/invitations/${guest.invitation.token}/pdf`}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-secondary">Aucune invitation générée.</p>
            )}
          </CardContent>
        </Card>

        {qrSvg ? (
          <Card>
            <CardHeader>
              <CardTitle>QR code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <div className="w-40 h-40" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="text-xs text-text-secondary text-center">
                Scanné à l&apos;accueil pour valider l&apos;entrée — une seule entrée par invitation.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {guest.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{guest.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
