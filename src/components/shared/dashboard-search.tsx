"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { guestDisplayName } from "@/lib/guest";
import type { GuestListItem } from "@/types";

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 250);
  const [results, setResults] = useState<GuestListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/guests?q=${encodeURIComponent(debounced)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { guests: [] }))
      .then((data) => {
        if (!cancelled) setResults(data.guests ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
      <Input
        placeholder="Rechercher un invité…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="pl-9"
        aria-label="Rechercher un invité depuis le tableau de bord"
      />

      {open && query.trim() ? (
        <div className="absolute z-20 mt-1.5 w-full rounded-md border border-soft-sage/60 bg-white shadow-soft max-h-80 overflow-y-auto animate-fade-in">
          {loading ? (
            <p className="px-4 py-3 text-sm text-text-secondary">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">Aucun invité ne correspond à « {query} ».</p>
          ) : (
            <ul className="divide-y divide-soft-sage/30">
              {results.map((guest) => (
                <li key={guest.id}>
                  <Link
                    href={`/admin/guests/${guest.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-ivory transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{guestDisplayName(guest)}</p>
                      <p className="text-xs text-text-secondary">
                        {guest.table ? `Table ${guest.table.number}` : "Sans table"}
                      </p>
                    </div>
                    {guest.invitation?.checkedIn ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning shrink-0" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
