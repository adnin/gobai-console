import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type SlotProps = {
  children: React.ReactElement;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

function Slot({ children, className, ...props }: SlotProps) {
  if (!React.isValidElement(children)) return null;
  const child = children as React.ReactElement<any>;
  const childProps = (child.props ?? {}) as { className?: string };
  return React.cloneElement(child, {
    ...(props as Record<string, unknown>),
    className: cn(childProps.className, className),
  });
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,box-shadow,background-color,border-color] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:translate-y-px",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/85",
        outline:
          "border border-border bg-background text-foreground hover:border-primary/30 hover:bg-accent/80",
        ghost:
          "border border-transparent text-muted-foreground hover:bg-accent/75 hover:text-accent-foreground",
        destructive:
          "border border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = {
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
