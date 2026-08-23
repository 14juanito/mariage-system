"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Heart,
  Users,
  Ticket,
  Table2,
  ScanLine,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/wedding", label: "Mon mariage", icon: Heart },
  { href: "/admin/guests", label: "Invités", icon: Users },
  { href: "/admin/tables", label: "Tables", icon: Table2 },
  { href: "/admin/invitations", label: "Invitations", icon: Ticket },
  { href: "/admin/check-in", label: "Check-in", icon: ScanLine },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

const CHECKIN_LINKS = [{ href: "/admin/check-in", label: "Check-in", icon: ScanLine }];

export function AdminNav({
  role,
  userName,
  weddingLabel,
}: {
  role: "ADMIN" | "CHECKIN";
  userName: string;
  weddingLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = role === "ADMIN" ? ADMIN_LINKS : CHECKIN_LINKS;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-soft-sage/50 bg-white">
        <div className="px-6 py-6 border-b border-soft-sage/40">
          <p className="text-xs tracking-[0.25em] uppercase text-sage">Mariage System</p>
          <p className="font-display text-lg font-semibold text-eucalyptus mt-1 truncate">{weddingLabel}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-eucalyptus text-ivory" : "text-text-secondary hover:bg-ivory hover:text-text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-soft-sage/40">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar>
              <AvatarFallback>{initials(userName.split(" ")[0] ?? "U", userName.split(" ")[1] ?? "")}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
              <p className="text-xs text-text-secondary">{role === "ADMIN" ? "Administrateur" : "Accueil"}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-ivory hover:text-error transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-soft-sage/50 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.25em] uppercase text-sage">Mariage System</p>
          <p className="font-display text-base font-semibold text-eucalyptus truncate">{weddingLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-md text-text-primary hover:bg-ivory focus-ring"
          aria-label="Ouvrir le menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-30 bg-eucalyptus/30 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)}>
          <nav
            className="absolute top-[57px] left-0 right-0 bg-white border-b border-soft-sage/50 p-3 space-y-1 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                    active ? "bg-eucalyptus text-ivory" : "text-text-secondary hover:bg-ivory",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-error hover:bg-ivory transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </>
  );
}
