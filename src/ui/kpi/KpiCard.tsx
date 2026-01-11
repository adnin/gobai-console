import * as React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTrend = "up" | "down" | "flat";

export type KpiCardProps = {
  title: string;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional delta badge such as "+8% WoW" */
  deltaLabel?: React.ReactNode;
  deltaTrend?: KpiTrend;
  loading?: boolean;
  className?: string;
};

const trendIcon: Record<KpiTrend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export function KpiCard({
  title,
  value,
  subtitle,
  deltaLabel,
  deltaTrend = "flat",
  loading = false,
  className,
}: KpiCardProps) {
  const TrendIcon = trendIcon[deltaTrend];

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded-md bg-muted/70" />
        </div>
      ) : (
        <>
          <div className="mt-4 text-3xl font-semibold leading-tight">{value ?? "—"}</div>
          {subtitle ? <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div> : null}
        </>
      )}

      {!loading && deltaLabel ? (
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            deltaTrend === "up" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
            deltaTrend === "down" && "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200",
            deltaTrend === "flat" && "bg-muted text-muted-foreground"
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{deltaLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
