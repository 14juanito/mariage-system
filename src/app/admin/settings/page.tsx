import { requireAdminPage } from "@/modules/auth/service";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StaffManager } from "@/components/shared/staff-manager";

export const metadata = { title: "Paramètres — Mariage System" };

export default async function SettingsPage() {
  const ctx = await requireAdminPage();

  const staff = await prisma.weddingStaff.findMany({
    where: { weddingId: ctx.weddingId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Paramètres</h1>
        <p className="text-sm text-text-secondary mt-1">Gérez les comptes ayant accès à ce mariage.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Équipe</CardTitle>
          <CardDescription>
            Les comptes « Accueil » ne peuvent que scanner les invitations — ils n&apos;ont accès ni aux invités,
            ni aux paramètres, ni à la génération d&apos;invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffManager
            staff={staff.map((s) => ({ id: s.id, userId: s.userId, role: s.role, user: s.user }))}
            currentUserId={ctx.userId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
