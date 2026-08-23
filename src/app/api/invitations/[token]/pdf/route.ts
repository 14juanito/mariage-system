import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderInvitationPdf } from "@/modules/invitations/pdf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { guest: { include: { table: true } }, wedding: true },
  });

  if (!invitation || invitation.status === "DISABLED") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const pdfBuffer = await renderInvitationPdf({
    brideName: invitation.wedding.brideName,
    groomName: invitation.wedding.groomName,
    guestFirstName: invitation.guest.firstName,
    guestLastName: invitation.guest.lastName,
    guestCivility: invitation.guest.civility,
    guestPartyType: invitation.guest.partyType,
    weddingDate: invitation.wedding.weddingDate,
    weddingTime: invitation.wedding.weddingTime,
    venueName: invitation.wedding.venueName,
    venueAddress: invitation.wedding.venueAddress,
    welcomeMessage: invitation.wedding.welcomeMessage,
    tableNumber: invitation.guest.table?.number,
    tableName: invitation.guest.table?.name,
    token: invitation.token,
  });

  const fileName = `invitation-${invitation.guest.firstName}-${invitation.guest.lastName}.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
