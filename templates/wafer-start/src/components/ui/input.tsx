import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "flex h-12 w-full rounded-full border border-[color:var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-soft)]",
      className
    )}
    ref={ref}
    {...props}
  />
));

Input.displayName = "Input";
