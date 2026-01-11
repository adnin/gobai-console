import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm " +
  "placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  // error state (works with aria-invalid or data-invalid)
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/25 " +
  "data-[invalid=true]:border-destructive data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/25";

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
  }
) {
  const { className, invalid, ...rest } = props;

  return (
    <select
      data-slot="select"
      data-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid ? true : rest["aria-invalid"]}
      className={cn(base, className)}
      {...rest}
    />
  );
}
