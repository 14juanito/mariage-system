"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Ticket, Eye, CheckCircle2, Clock } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { DashboardStats } from "@/types";
import { formatTimeFr } from "@/lib/utils";

const POLL_INTERVAL_MS = 5000;

export function DashboardLive({ initialStats }: { initialStats: DashboardStats }) {
  const [stats, setStats] = useState(initialStats);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let backoff = POLL_INTERVAL_MS;

    async function poll() {
      if (document.visibilityState !== "visible") {
        schedule(POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) {
          const data: DashboardStats = await res.json();
          if (!cancelled) setStats(data);
          backoff = POLL_INTERVAL_MS;
        } else {
          backoff = Math.min(backoff * 2, 60000);
        }
      } catch {
        backoff = Math.min(backoff * 2, 60000);
      }
      schedule(backoff);
    }

    function schedule(delay: number) {
      if (cancelled) return;
      timeoutRef.current = setTimeout(poll, delay);
    }

    schedule(POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Invités" value={stats.totalGuests} icon={Users} />
        <StatCard label="Invitations générées" value={stats.invitationsGenerated} icon={Ticket} />
        <StatCard label="Invitations consultées" value={stats.invitationsViewed} icon={Eye} />
        <StatCard label="Présents" value={stats.present} icon={CheckCircle2} tone="success" />
        <StatCard label="En attente" value={stats.awaited} icon={Clock} tone="warning" />
      </div>

      <div className="rounded-lg border border-soft-sage/60 bg-white p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-3">Dernière arrivée</p>
        {stats.lastCheckIn ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-text-primary">{stats.lastCheckIn.guestName}</p>
              <p className="text-sm text-text-secondary">{formatTimeFr(stats.lastCheckIn.scannedAt)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Aucune arrivée enregistrée pour le moment.</p>
        )}
      </div>
    </div>
  );
}
