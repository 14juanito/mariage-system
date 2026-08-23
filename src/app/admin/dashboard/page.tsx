import { requireAdminPage } from "@/modules/auth/service";
import { getDashboardStats } from "@/modules/wedding/service";
import { DashboardLive } from "@/components/shared/dashboard-live";
import { DashboardSearch } from "@/components/shared/dashboard-search";

export const metadata = { title: "Tableau de bord — Mariage System" };

export default async function DashboardPage() {
  const ctx = await requireAdminPage();
  const stats = await getDashboardStats(ctx.weddingId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Tableau de bord</h1>
          <p className="text-sm text-text-secondary mt-1">Vue d&apos;ensemble de {ctx.weddingLabel}.</p>
        </div>
        <DashboardSearch />
      </div>
      <DashboardLive initialStats={stats} />
    </div>
  );
}
