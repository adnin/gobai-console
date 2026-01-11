import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional actions (buttons/links). */
  actions?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : null}

      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <div className="max-w-[52ch] text-sm text-muted-foreground">{description}</div>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
