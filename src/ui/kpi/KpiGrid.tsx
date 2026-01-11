import * as React from "react";
import { cn } from "@/lib/utils";

type KpiGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function KpiGrid({ children, className }: KpiGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
