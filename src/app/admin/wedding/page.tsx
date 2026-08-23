import { requireAdminPage } from "@/modules/auth/service";
import { getWedding } from "@/modules/wedding/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WeddingForm } from "./wedding-form";

export const metadata = { title: "Mon mariage — Mariage System" };

export default async function WeddingPage() {
  const ctx = await requireAdminPage();
  const wedding = await getWedding(ctx.weddingId);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Mon mariage</h1>
        <p className="text-sm text-text-secondary mt-1">
          Ces informations apparaissent sur toutes les invitations générées.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Détails de l&apos;événement</CardTitle>
          <CardDescription>Noms, date, lieu et message d&apos;accueil.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeddingForm wedding={wedding} />
        </CardContent>
      </Card>
    </div>
  );
}
