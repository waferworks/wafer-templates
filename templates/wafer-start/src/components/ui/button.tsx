import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--surface-strong)] px-5 py-3 text-[var(--text-inverse)] shadow-[var(--shadow-button)] hover:opacity-95",
        ghost:
          "px-4 py-3 text-[var(--text-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
  )
);

Button.displayName = "Button";
