"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Table2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { createTableAction, renameTableAction, deleteTableAction } from "@/modules/tables/actions";
import { guestDisplayName } from "@/lib/guest";
import type { TableWithOccupancy } from "@/types";

export function TablesManager({
  tables,
  nextNumber,
}: {
  tables: TableWithOccupancy[];
  nextNumber: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TableFormDialog nextNumber={nextNumber} />
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="Aucune table pour le moment"
          description="Créez vos tables (10 places maximum chacune) pour organiser le placement de vos invités."
          action={<TableFormDialog nextNumber={nextNumber} />}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>
                    Table {table.number}
                    {table.name ? ` — ${table.name}` : ""}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Users className="h-3.5 w-3.5 text-text-secondary" />
                    <Badge variant={table.occupied >= table.capacity ? "warning" : "outline"}>
                      {table.occupied}/{table.capacity} places
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <TableFormDialog
                    nextNumber={nextNumber}
                    table={table}
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Modifier la table">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <DeleteTableButton tableId={table.id} tableNumber={table.number} guestCount={table.guests.length} />
                </div>
              </CardHeader>
              <CardContent>
                {table.guests.length === 0 ? (
                  <p className="text-sm text-text-secondary">Aucun invité assis ici pour le moment.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-text-primary">
                    {table.guests.map((guest) => (
                      <li key={guest.id} className="flex items-center justify-between">
                        <span>{guestDisplayName(guest)}</span>
                        {guest.partyType === "COUPLE" ? (
                          <span className="text-xs text-text-secondary">2 places</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TableFormDialog({
  table,
  nextNumber,
  trigger,
}: {
  table?: TableWithOccupancy;
  nextNumber: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(table);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit ? await renameTableAction(table!.id, formData) : await createTableAction(formData);
      if (result.success) {
        toast.success(result.message ?? "Enregistré");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" /> Créer une table
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la table" : "Créer une table"}</DialogTitle>
          <DialogDescription>10 places maximum par table.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="number">Numéro</Label>
              <Input
                id="number"
                name="number"
                type="number"
                min={1}
                defaultValue={table?.number ?? nextNumber}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom (optionnel)</Label>
              <Input id="name" name="name" placeholder="Ex. VIP, Famille…" defaultValue={table?.name ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTableButton({
  tableId,
  tableNumber,
  guestCount,
}: {
  tableId: string;
  tableNumber: number;
  guestCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTableAction(tableId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Supprimer la table" disabled={isPending}>
          <Trash2 className="h-3.5 w-3.5 text-error" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la table {tableNumber} ?</AlertDialogTitle>
          <AlertDialogDescription>
            {guestCount > 0
              ? `Cette table contient encore ${guestCount} invité(s) — retirez-les d'abord depuis leur fiche.`
              : "Cette table est vide et peut être supprimée sans impact."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={guestCount > 0}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
