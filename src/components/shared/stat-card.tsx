import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-soft-sage/60 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-text-primary">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            tone === "success" && "bg-success/10 text-success",
            tone === "warning" && "bg-warning/15 text-[#8a6a25]",
            tone === "default" && "bg-eucalyptus/10 text-eucalyptus",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
