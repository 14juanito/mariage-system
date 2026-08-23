"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateWeddingAction } from "@/modules/wedding/actions";
import type { Wedding } from "@prisma/client";

export function WeddingForm({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const [dateValue] = useState(wedding.weddingDate.toISOString().slice(0, 10));

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateWeddingAction(formData);
      if (result.success) {
        toast.success(result.message ?? "Enregistré");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="brideName">Prénom de la mariée</Label>
          <Input id="brideName" name="brideName" defaultValue={wedding.brideName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="groomName">Prénom du marié</Label>
          <Input id="groomName" name="groomName" defaultValue={wedding.groomName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weddingDate">Date</Label>
          <Input id="weddingDate" name="weddingDate" type="date" defaultValue={dateValue} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weddingTime">Heure</Label>
          <Input id="weddingTime" name="weddingTime" type="time" defaultValue={wedding.weddingTime} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venueName">Lieu</Label>
          <Input id="venueName" name="venueName" defaultValue={wedding.venueName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venueAddress">Adresse</Label>
          <Input id="venueAddress" name="venueAddress" defaultValue={wedding.venueAddress} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="welcomeMessage">Message d&apos;accueil</Label>
        <Textarea
          id="welcomeMessage"
          name="welcomeMessage"
          rows={4}
          defaultValue={wedding.welcomeMessage}
          required
        />
        <p className="text-xs text-text-secondary">
          Affiché sur chaque invitation (page publique et PDF). Restez concis et chaleureux.
        </p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
