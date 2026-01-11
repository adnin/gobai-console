import * as React from "react";
import { cn } from "@/lib/utils";

type DataTableProps = {
  /**
   * Zebra-striping is helpful for dense, scan-heavy tables.
   * Keep it subtle (muted/10) so it still feels premium.
   */
  zebra?: boolean;
  /** Slightly tighter rows for ops-heavy screens. */
  dense?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * DataTable
 * - Expensive feel: white surface, hairline borders, tinted header, subtle hover
 * - Consistent padding/typography (no per-page table styling needed)
 */
export function DataTable({ zebra, dense, className, children }: DataTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
      <table
        className={cn(
          "w-full text-sm",
          // Header
          "[&_thead]:bg-muted/30",
          "[&_thead_tr]:border-b [&_thead_tr]:border-border/70",
          "[&_thead_th]:px-4 [&_thead_th]:text-left [&_thead_th]:align-middle [&_thead_th]:text-[12px] [&_thead_th]:font-semibold [&_thead_th]:text-muted-foreground",
          dense ? "[&_thead_th]:py-2.5" : "[&_thead_th]:py-3",
          // Body
          "[&_tbody_tr]:border-b [&_tbody_tr]:border-border/60 [&_tbody_tr:last-child]:border-0",
          "[&_tbody_tr:hover]:bg-muted/20",
          // Cells
          "[&_tbody_td]:px-4 [&_tbody_td]:align-middle",
          dense ? "[&_tbody_td]:py-2.5" : "[&_tbody_td]:py-3",
          // Zebra (subtle)
          zebra ? "[&_tbody_tr:nth-child(odd)]:bg-muted/10" : "",
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}
