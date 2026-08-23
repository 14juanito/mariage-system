"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  RotateCcw,
  Ban,
  CheckCircle2,
  Users,
  MessageCircle,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { GuestFormDialog } from "@/components/shared/guest-form-dialog";
import { ResetCheckInDialog } from "@/components/shared/reset-checkin-dialog";
import { deleteGuestAction } from "@/modules/guests/actions";
import { toggleInvitationStatusAction } from "@/modules/invitations/actions";
import type { GuestListItem, TableWithOccupancy } from "@/types";
import { formatTimeFr } from "@/lib/utils";
import { guestDisplayName } from "@/lib/guest";
import { buildInvitationMessage, whatsappShareUrl, mailtoShareUrl } from "@/lib/share";

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function GuestsTable({
  initialGuests,
  tables: initialTables,
  weddingLabel,
}: {
  initialGuests: GuestListItem[];
  tables: TableWithOccupancy[];
  weddingLabel: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);
  const [guests, setGuests] = useState(initialGuests);
  const [tables, setTables] = useState(initialTables);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<GuestListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<GuestListItem | null>(null);

  const refresh = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guests${q ? `?q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTables = useCallback(async () => {
    const res = await fetch("/api/tables", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables);
    }
  }, []);

  function refreshAll(q: string) {
    refresh(q);
    refreshTables();
  }

  useEffect(() => {
    refresh(debouncedQuery);
  }, [debouncedQuery, refresh]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  function copyLink(token: string) {
    const url = `${window.location.origin}/invitation/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Lien copié"),
      () => toast.error("Impossible de copier le lien"),
    );
  }

  function handleToggleStatus(invitationId: string) {
    startTransition(async () => {
      const result = await toggleInvitationStatusAction(invitationId);
      if (result.success) {
        toast.success(result.message);
        refreshAll(debouncedQuery);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteGuestAction(deleteTarget.id);
      if (result.success) {
        toast.success(result.message ?? "Invité supprimé");
        setDeleteTarget(null);
        refreshAll(debouncedQuery);
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasAnyGuests = initialGuests.length > 0 || guests.length > 0 || query.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Rechercher un invité…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Rechercher un invité"
          />
        </div>
        <GuestFormDialog tables={tables} onSaved={() => refreshAll(debouncedQuery)} />
      </div>

      {!hasAnyGuests ? (
        <EmptyState
          icon={Users}
          title="Aucun invité pour le moment"
          description="Ajoutez votre premier invité pour générer automatiquement son invitation et son QR code."
          action={<GuestFormDialog tables={tables} onSaved={() => refreshAll(debouncedQuery)} />}
        />
      ) : (
        <>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : guests.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description={`Aucun invité ne correspond à « ${query} ».`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invité</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Invitation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => {
                  const inv = guest.invitation;
                  return (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <button
                          className="text-left hover:underline underline-offset-2"
                          onClick={() => router.push(`/admin/guests/${guest.id}`)}
                        >
                          <p className="font-medium">{guestDisplayName(guest)}</p>
                          {guest.partyType === "COUPLE" ? (
                            <p className="text-xs text-text-secondary">2 places</p>
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell>
                        {guest.table ? (
                          <span className="text-sm text-text-primary">
                            Table {guest.table.number}
                            {guest.table.name ? ` · ${guest.table.name}` : ""}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inv ? (
                          <Badge variant={inv.status === "ACTIVE" ? "secondary" : "outline"}>
                            {inv.status === "ACTIVE" ? "Générée" : "Désactivée"}
                          </Badge>
                        ) : (
                          <span className="text-text-secondary text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inv?.viewedAt ? (
                          <Badge variant="outline">Consultée</Badge>
                        ) : (
                          <span className="text-text-secondary text-sm">Non consultée</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inv?.checkedIn ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" />
                            {inv.checkedInAt ? formatTimeFr(inv.checkedInAt) : "Présent"}
                          </Badge>
                        ) : (
                          <Badge variant="warning">En attente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-2 rounded-md hover:bg-ivory focus-ring text-text-secondary"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {inv ? (
                              <>
                                <DropdownMenuItem onClick={() => copyLink(inv.token)}>
                                  <Copy className="h-4 w-4" /> Copier le lien
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`${appUrl}/invitation/${inv.token}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" /> Voir l&apos;invitation
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`/api/invitations/${inv.token}/pdf`}>
                                    <Download className="h-4 w-4" /> Télécharger le PDF
                                  </a>
                                </DropdownMenuItem>
                                {guest.phone ? (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={whatsappShareUrl(
                                        guest.phone,
                                        buildInvitationMessage(
                                          guestDisplayName(guest),
                                          weddingLabel,
                                          `${appUrl}/invitation/${inv.token}`,
                                        ),
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <MessageCircle className="h-4 w-4" /> Envoyer par WhatsApp
                                    </a>
                                  </DropdownMenuItem>
                                ) : null}
                                {guest.email ? (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={mailtoShareUrl(
                                        guest.email,
                                        weddingLabel,
                                        buildInvitationMessage(
                                          guestDisplayName(guest),
                                          weddingLabel,
                                          `${appUrl}/invitation/${inv.token}`,
                                        ),
                                      )}
                                    >
                                      <Mail className="h-4 w-4" /> Envoyer par e-mail
                                    </a>
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            <GuestFormDialog
                              guest={guest}
                              tables={tables}
                              onSaved={() => refreshAll(debouncedQuery)}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                              }
                            />
                            {inv ? (
                              <DropdownMenuItem onClick={() => handleToggleStatus(inv.id)}>
                                {inv.status === "ACTIVE" ? (
                                  <>
                                    <Ban className="h-4 w-4" /> Désactiver l&apos;invitation
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" /> Réactiver l&apos;invitation
                                  </>
                                )}
                              </DropdownMenuItem>
                            ) : null}
                            {inv?.checkedIn ? (
                              <DropdownMenuItem onClick={() => setResetTarget(guest)}>
                                <RotateCcw className="h-4 w-4" /> Réinitialiser le check-in
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onClick={() => setDeleteTarget(guest)}>
                              <Trash2 className="h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet invité ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? guestDisplayName(deleteTarget) : ""} et son invitation seront définitivement
              supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resetTarget?.invitation ? (
        <ResetCheckInDialog
          invitationId={resetTarget.invitation.id}
          guestName={guestDisplayName(resetTarget)}
          open={Boolean(resetTarget)}
          onOpenChange={(open) => !open && setResetTarget(null)}
          onDone={() => refreshAll(debouncedQuery)}
        />
      ) : null}
    </div>
  );
}
