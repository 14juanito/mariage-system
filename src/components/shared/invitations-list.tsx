"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, Ban, CheckCircle2, Ticket } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { toggleInvitationStatusAction } from "@/modules/invitations/actions";
import { formatTimeFr } from "@/lib/utils";
import type { Invitation, Guest } from "@prisma/client";

type InvitationWithGuest = Invitation & { guest: Guest };

type FilterKey = "all" | "generated" | "viewed" | "present" | "awaited" | "disabled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "viewed", label: "Consultées" },
  { key: "present", label: "Présentes" },
  { key: "awaited", label: "En attente" },
  { key: "disabled", label: "Désactivées" },
];

function matchesFilter(inv: InvitationWithGuest, filter: FilterKey) {
  switch (filter) {
    case "viewed":
      return Boolean(inv.viewedAt);
    case "present":
      return inv.checkedIn;
    case "awaited":
      return !inv.checkedIn && inv.status === "ACTIVE";
    case "disabled":
      return inv.status === "DISABLED";
    default:
      return true;
  }
}

export function InvitationsList({ invitations }: { invitations: InvitationWithGuest[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [, startTransition] = useTransition();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const filtered = useMemo(() => invitations.filter((inv) => matchesFilter(inv, filter)), [invitations, filter]);

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invitation/${token}`).then(() => toast.success("Lien copié"));
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleInvitationStatusAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Aucune invitation pour le moment"
        description="Les invitations sont générées automatiquement lorsque vous ajoutez un invité."
      />
    );
  }

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
      <TabsList className="flex-wrap h-auto">
        {FILTERS.map((f) => (
          <TabsTrigger key={f.key} value={f.key}>
            {f.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={filter}>
        {filtered.length === 0 ? (
          <EmptyState icon={Ticket} title="Aucun résultat" description="Aucune invitation ne correspond à ce filtre." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Consultée</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.guest.firstName} {inv.guest.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "ACTIVE" ? "secondary" : "outline"}>
                      {inv.status === "ACTIVE" ? "Active" : "Désactivée"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {inv.viewedAt ? formatTimeFr(inv.viewedAt) : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {inv.checkedIn ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        {inv.checkedInAt ? formatTimeFr(inv.checkedInAt) : ""}
                      </Badge>
                    ) : (
                      <Badge variant="warning">En attente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => copyLink(inv.token)} aria-label="Copier le lien">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" asChild aria-label="Voir">
                        <a href={`${appUrl}/invitation/${inv.token}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" asChild aria-label="Télécharger le PDF">
                        <a href={`/api/invitations/${inv.token}/pdf`}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggle(inv.id)}
                        aria-label={inv.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
                      >
                        {inv.status === "ACTIVE" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
}
