import { requireAdminPage } from "@/modules/auth/service";
import { listTablesWithOccupancy, nextAvailableTableNumber } from "@/modules/tables/service";
import { TablesManager } from "@/components/shared/tables-manager";

export const metadata = { title: "Tables — Mariage System" };

export default async function TablesPage() {
  const ctx = await requireAdminPage();
  const [tables, nextNumber] = await Promise.all([
    listTablesWithOccupancy(ctx.weddingId),
    nextAvailableTableNumber(ctx.weddingId),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Tables</h1>
        <p className="text-sm text-text-secondary mt-1">
          Organisez le placement de vos invités — 10 places maximum par table.
        </p>
      </div>
      <TablesManager tables={tables} nextNumber={nextNumber} />
    </div>
  );
}
