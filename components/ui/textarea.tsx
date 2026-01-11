import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// Matches Input focus ring + error styles.
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[96px] w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm transition-colors",
          "border-border placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive/50 focus-visible:ring-destructive/30",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
