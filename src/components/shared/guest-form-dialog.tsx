"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Plus, User, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { guestSeatCount } from "@/lib/guest";
import { createGuestAction, updateGuestAction } from "@/modules/guests/actions";
import type { GuestListItem, TableWithOccupancy } from "@/types";

type PartyType = "SINGLE" | "COUPLE";

export function GuestFormDialog({
  guest,
  tables,
  onSaved,
  trigger,
}: {
  guest?: GuestListItem;
  tables: TableWithOccupancy[];
  onSaved?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [partyType, setPartyType] = useState<PartyType>(guest?.partyType ?? "SINGLE");
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(guest);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateGuestAction(guest!.id, formData)
        : await createGuestAction(formData);

      if (result.success) {
        toast.success(result.message ?? "Enregistré", {
          description: isEdit ? undefined : "L'invitation a été générée automatiquement.",
        });
        setOpen(false);
        formRef.current?.reset();
        onSaved?.();
      } else {
        setError(result.error);
      }
    });
  }

  function seatsAvailable(table: TableWithOccupancy) {
    // Si on édite un invité déjà assis à cette table, ses places actuelles
    // ne doivent pas compter comme "prises" pour lui-même.
    const reclaimed = isEdit && guest?.tableId === table.id ? guestSeatCount(guest) : 0;
    return table.remaining + reclaimed;
  }

  const neededSeats = partyType === "COUPLE" ? 2 : 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPartyType(guest?.partyType ?? "SINGLE");
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Plus className="h-4 w-4" />
            Ajouter un invité
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'invité" : "Ajouter un invité"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de cet invité."
              : "Quelques informations suffisent — son invitation sera générée automatiquement."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-error">{error}</p> : null}

          <input type="hidden" name="partyType" value={partyType} />

          <div className="space-y-2">
            <Label>Invité seul ou en couple ?</Label>
            <div className="inline-flex rounded-md bg-ivory p-1 w-full">
              <button
                type="button"
                onClick={() => setPartyType("SINGLE")}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  partyType === "SINGLE" ? "bg-white text-eucalyptus shadow-sm" : "text-text-secondary",
                )}
              >
                <User className="h-3.5 w-3.5" /> Seul
              </button>
              <button
                type="button"
                onClick={() => setPartyType("COUPLE")}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  partyType === "COUPLE" ? "bg-white text-eucalyptus shadow-sm" : "text-text-secondary",
                )}
              >
                <Users className="h-3.5 w-3.5" /> Couple
              </button>
            </div>
          </div>

          {partyType === "SINGLE" ? (
            <div className="grid grid-cols-[6rem_1fr_1fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="civility">Civilité</Label>
                <select
                  id="civility"
                  name="civility"
                  defaultValue={guest?.civility ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  <option value="">—</option>
                  <option value="MR">M.</option>
                  <option value="MME">Mme</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" name="firstName" defaultValue={guest?.firstName} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" name="lastName" defaultValue={guest?.lastName} required />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom du couple</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Ex. Mbaya"
                defaultValue={guest?.partyType === "COUPLE" ? guest.lastName : ""}
                required
                autoFocus
              />
              <p className="text-xs text-text-secondary">
                Affiché comme « Couple {"{"}Nom{"}"} » — une seule invitation, deux places.
              </p>
              {/* Le prénom "Couple" est forcé côté serveur — pas de champ visible ici. */}
              <input type="hidden" name="firstName" value="Couple" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tableId">Table</Label>
            <select
              id="tableId"
              name="tableId"
              defaultValue={guest?.tableId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              <option value="">— Aucune table assignée —</option>
              {tables.map((table) => {
                const available = seatsAvailable(table);
                const full = available < neededSeats;
                return (
                  <option key={table.id} value={table.id} disabled={full}>
                    Table {table.number}
                    {table.name ? ` — ${table.name}` : ""} ({available}/{table.capacity} place
                    {available > 1 ? "s" : ""} libre{available > 1 ? "s" : ""}
                    {full ? " — complète" : ""})
                  </option>
                );
              })}
            </select>
            {tables.length === 0 ? (
              <p className="text-xs text-text-secondary">
                Aucune table créée pour le moment — configurez-les depuis « Tables ».
              </p>
            ) : null}
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-sage font-medium select-none">
              Champs optionnels
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={guest?.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={guest?.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={guest?.notes ?? ""} />
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Générer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
