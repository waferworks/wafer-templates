import { Gear, Rows } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { buildTitle } from "@/app/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadRuntimeInfo } from "@/server/functions/runtime-info";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [{ title: buildTitle("Settings") }],
  }),
  loader: async ({ location }) => {
    const forceError =
      new URLSearchParams(location.searchStr).get("forceError") === "1" &&
      process.env.WAFER_START_TEST_ROUTE_ERROR === "1";

    if (forceError) {
      throw new Error("forced route error");
    }

    return loadRuntimeInfo();
  },
  component: AppSettingsPage,
});

function AppSettingsPage() {
  const runtime = Route.useLoaderData();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-cyan-700">
            <Gear className="size-4" weight="fill" />
            Second loader example
          </div>
          <CardTitle>Runtime contract</CardTitle>
          <CardDescription>
            This page exists mostly to teach the pattern for a second nested app route with its own
            loader-backed read.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-700">
          <p>
            Route file: <code>src/routes/app.settings.tsx</code>
          </p>
          <p>
            Loader read: <code>src/server/functions/runtime-info.ts</code>
          </p>
          <p>
            Parent shell: <code>src/routes/app.tsx</code>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-stone-950 text-stone-50">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-emerald-300">
            <Rows className="size-4" weight="duotone" />
            Config view
          </div>
          <CardTitle className="text-stone-50">Database mode</CardTitle>
          <CardDescription className="text-stone-300">
            Agents can use this page as the reference point for nested routes that only need a
            loader read and no mutation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-stone-300">
          <p>
            Configuration detected:{" "}
            <span className="font-semibold text-stone-50">
              {runtime.databaseConfigured ? "yes" : "not yet"}
            </span>
          </p>
          <p>
            This page keeps the loader-backed example without exposing concrete database names or
            infrastructure details to the browser.
          </p>
          <p>
            `DATABASE_URL` wins over bootstrap mode. If it is absent, the app falls back to the
            Wafer bootstrap variables during startup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
