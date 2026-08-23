import { requireAdminPage } from "@/modules/auth/service";
import { listInvitations } from "@/modules/invitations/service";
import { InvitationsList } from "@/components/shared/invitations-list";

export const metadata = { title: "Invitations — Mariage System" };

export default async function InvitationsPage() {
  const ctx = await requireAdminPage();
  const invitations = await listInvitations(ctx.weddingId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Invitations</h1>
        <p className="text-sm text-text-secondary mt-1">Suivez le statut de chaque invitation générée.</p>
      </div>
      <InvitationsList invitations={invitations} />
    </div>
  );
}
