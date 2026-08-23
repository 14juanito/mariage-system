"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Copy, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { GuestFormDialog } from "@/components/shared/guest-form-dialog";
import { deleteGuestAction } from "@/modules/guests/actions";
import type { GuestListItem, TableWithOccupancy } from "@/types";
import { guestDisplayName } from "@/lib/guest";
import { buildInvitationMessage, whatsappShareUrl, mailtoShareUrl } from "@/lib/share";

export function GuestDetailActions({
  guest,
  tables,
  weddingLabel,
}: {
  guest: GuestListItem;
  tables: TableWithOccupancy[];
  weddingLabel: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // NEXT_PUBLIC_APP_URL (pas window.location.origin) car ce composant est
  // aussi rendu côté serveur pour le HTML initial — `window` n'existe pas
  // à ce moment-là. Ne sert que pour composer les liens wa.me/mailto.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const invitationUrl = guest.invitation ? `${appUrl}/invitation/${guest.invitation.token}` : "";

  function copyLink() {
    if (!guest.invitation) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/invitation/${guest.invitation.token}`)
      .then(() => toast.success("Lien copié"));
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGuestAction(guest.id);
      if (result.success) {
        toast.success("Invité supprimé");
        router.push("/admin/guests");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 shrink-0 justify-end">
      {guest.invitation ? (
        <Button size="sm" variant="secondary" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> Copier le lien
        </Button>
      ) : null}
      {guest.invitation && guest.phone ? (
        <Button size="sm" variant="secondary" asChild>
          <a
            href={whatsappShareUrl(
              guest.phone,
              buildInvitationMessage(guestDisplayName(guest), weddingLabel, invitationUrl),
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </Button>
      ) : null}
      {guest.invitation && guest.email ? (
        <Button size="sm" variant="secondary" asChild>
          <a
            href={mailtoShareUrl(
              guest.email,
              weddingLabel,
              buildInvitationMessage(guestDisplayName(guest), weddingLabel, invitationUrl),
            )}
          >
            <Mail className="h-3.5 w-3.5" /> E-mail
          </a>
        </Button>
      ) : null}
      <GuestFormDialog
        guest={guest}
        tables={tables}
        onSaved={() => router.refresh()}
        trigger={
          <Button size="sm" variant="secondary">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        }
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet invité ?</AlertDialogTitle>
            <AlertDialogDescription>
              {guestDisplayName(guest)} et son invitation seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
