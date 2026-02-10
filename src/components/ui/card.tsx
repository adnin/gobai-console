import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-border/90 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_rgba(15,23,42,0.04)]",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-5", className)} {...rest} />
  );
}

export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return (
    <h3 data-slot="card-title" className={cn("font-semibold leading-none tracking-tight", className)} {...rest} />
  );
}

export function CardDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className, ...rest } = props;
  return (
    <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...rest} />
  );
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...rest} />;
}

export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div data-slot="card-footer" className={cn("flex items-center p-5 pt-0", className)} {...rest} />
  );
}
