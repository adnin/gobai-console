import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      data-slot="card"
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}
      {...rest}
    />
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...rest} />
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
  return <div data-slot="card-content" className={cn("p-4 pt-0", className)} {...rest} />;
}

export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div data-slot="card-footer" className={cn("flex items-center p-4 pt-0", className)} {...rest} />
  );
}
