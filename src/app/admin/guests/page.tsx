import { requireAdminPage } from "@/modules/auth/service";
import { listGuests } from "@/modules/guests/service";
import { listTablesWithOccupancy } from "@/modules/tables/service";
import { GuestsTable } from "@/components/shared/guests-table";

export const metadata = { title: "Invités — Mariage System" };

export default async function GuestsPage() {
  const ctx = await requireAdminPage();
  const [guests, tables] = await Promise.all([
    listGuests(ctx.weddingId),
    listTablesWithOccupancy(ctx.weddingId),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Invités</h1>
        <p className="text-sm text-text-secondary mt-1">
          Ajoutez, recherchez et gérez vos invités et leurs invitations.
        </p>
      </div>
      <GuestsTable initialGuests={guests} tables={tables} weddingLabel={ctx.weddingLabel} />
    </div>
  );
}
