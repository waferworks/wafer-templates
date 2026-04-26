import { Lock, LockOpen } from "@phosphor-icons/react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { loadAppAuth } from "@/server/functions/auth";

export const Route = createFileRoute("/app")({
  loader: async () => loadAppAuth(),
  component: AppLayout,
});

function AppLayout() {
  const authState = Route.useLoaderData();
  const authStatusLabel = !authState.authEnabled
    ? "Auth off"
    : authState.appUserId
      ? "Auth on"
      : "Auth on, user sync waiting";
  const authStatusCopy = !authState.authEnabled
    ? "Add auth keys later and this `/app` subtree becomes protected without redesigning the route tree."
    : authState.appUserId
      ? "This `/app` subtree required a signed-in session on the server and mapped that provider identity into an app-owned user record before the page rendered."
      : "The signed-in session is valid, but the app-owned user record is waiting on a configured database. Once persistence is available, the starter provisions a `users` row plus the matching provider identity.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {authState.authEnabled ? (
              <Lock className="size-4 text-emerald-700" weight="duotone" />
            ) : (
              <LockOpen className="size-4 text-amber-700" weight="duotone" />
            )}
            {authState.authEnabled ? "Protected app surface" : "Auth optional until configured"}
          </p>
          <p className="text-sm text-stone-700">{authStatusCopy}</p>
        </div>
        <p className="rounded-full border border-stone-300/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-600">
          {authStatusLabel}
        </p>
      </div>
      {authState.authEnabled ? (
        <div className="rounded-3xl border border-stone-300/80 bg-white/80 px-5 py-4 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">App user boundary</p>
          <p className="mt-1">
            {authState.appUserId
              ? `This session is linked to app user ${authState.appUserId}. Internal tables can point at that user ID instead of a provider-specific identifier.`
              : "No app user is available yet because the database layer is still in degraded mode."}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <Link
          activeProps={{ className: "bg-stone-950 text-stone-50" }}
          activeOptions={{ exact: true }}
          className="rounded-full border border-stone-300/80 px-4 py-2 transition hover:bg-white/80"
          to="/app"
        >
          Todos
        </Link>
        <Link
          activeProps={{ className: "bg-stone-950 text-stone-50" }}
          className="rounded-full border border-stone-300/80 px-4 py-2 transition hover:bg-white/80"
          to="/app/settings"
        >
          Settings
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
