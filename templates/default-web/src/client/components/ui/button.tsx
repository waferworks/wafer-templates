import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/client/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-stone-950 px-5 py-3 text-stone-50 shadow-lg shadow-stone-950/10 hover:bg-stone-800",
        ghost: "px-4 py-3 text-stone-700 hover:bg-stone-200/70",
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
