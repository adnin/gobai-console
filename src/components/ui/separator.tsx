import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div data-slot="separator" className={cn("h-px w-full bg-border", className)} {...rest} />;
}
