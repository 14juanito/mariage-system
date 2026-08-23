"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createStaffAction, removeStaffAction } from "@/modules/wedding/actions";

type StaffMember = {
  id: string;
  userId: string;
  role: "ADMIN" | "CHECKIN";
  user: { name: string; email: string };
};

export function StaffManager({ staff, currentUserId }: { staff: StaffMember[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createStaffAction(formData);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeStaffAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un membre de l&apos;équipe</DialogTitle>
              <DialogDescription>
                Un compte ADMIN peut tout gérer. Un compte ACCUEIL ne peut que scanner les invitations.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe temporaire</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="CHECKIN"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  <option value="CHECKIN">Accueil (check-in uniquement)</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Ajout…" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.user.name}</TableCell>
              <TableCell className="text-text-secondary">{member.user.email}</TableCell>
              <TableCell>
                <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                  {member.role === "ADMIN" ? "Administrateur" : "Accueil"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={member.userId === currentUserId}
                  onClick={() => handleRemove(member.id)}
                  aria-label="Retirer"
                  title={member.userId === currentUserId ? "Vous ne pouvez pas vous retirer vous-même" : undefined}
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
