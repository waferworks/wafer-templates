import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DefaultNotFound() {
  return (
    <div className="mx-auto flex min-h-[45svh] max-w-xl flex-col items-start justify-center gap-5 rounded-[var(--radius-panel)] border border-[color:var(--border)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-card)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">404</p>
        <h1 className="font-[Iowan_Old_Style,Georgia,serif] text-3xl font-semibold text-[var(--text)]">
          This page does not exist.
        </h1>
        <p className="max-w-lg text-sm leading-6 text-[var(--muted)]">
          The route may have moved, or this app has not added it yet. Use the links below to get
          back to a known screen.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={buttonVariants({ variant: "default" })}
          onClick={() => window.history.back()}
          type="button"
        >
          Go back
        </button>
        <Link
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "border border-[color:var(--border)]"
          )}
          to="/"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
