"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { resetCheckInAction } from "@/modules/check-in/actions";

export function ResetCheckInDialog({
  invitationId,
  guestName,
  open,
  onOpenChange,
  onDone,
}: {
  invitationId: string;
  guestName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await resetCheckInAction(formData);
      if (result.success) {
        toast.success(result.message ?? "Check-in réinitialisé");
        onOpenChange(false);
        onDone?.();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le check-in</DialogTitle>
          <DialogDescription>
            {guestName} pourra à nouveau être scanné(e) à l&apos;entrée. Cette action est enregistrée dans le
            journal d&apos;audit.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <input type="hidden" name="invitationId" value={invitationId} />
          <div className="space-y-2">
            <Label htmlFor="reason">Motif de la réinitialisation</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              placeholder="Ex. Erreur de scan lors du contrôle."
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Réinitialisation…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
