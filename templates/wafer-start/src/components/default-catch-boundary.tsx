import {
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  });
  const router = useRouter();

  console.error(error);

  return (
    <div className="mx-auto flex min-h-[45svh] max-w-2xl flex-col justify-center gap-5 rounded-[var(--radius-panel)] border border-[color:var(--border-strong)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-card)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Route error
        </p>
        <h1 className="font-[Iowan_Old_Style,Georgia,serif] text-3xl font-semibold text-[var(--text)]">
          The app hit an unexpected route error.
        </h1>
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          Retry the route first. If the problem persists, go back or return home and inspect the
          server logs for the full error details.
        </p>
      </div>
      <div className="rounded-[calc(var(--radius-panel)-10px)] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm leading-6 text-[var(--text-soft)]">
          Something went wrong while rendering this route.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={buttonVariants({ variant: "default" })}
          onClick={() => {
            router.invalidate();
          }}
          type="button"
        >
          Try again
        </button>
        {isRoot ? (
          <Link
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "border border-[color:var(--border)]"
            )}
            to="/"
          >
            Home
          </Link>
        ) : (
          <button
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "border border-[color:var(--border)]"
            )}
            onClick={() => window.history.back()}
            type="button"
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
