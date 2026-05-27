import { Outlet, createFileRoute } from "@tanstack/react-router";

import { loadAppAuth } from "@/server/functions/auth";

export const Route = createFileRoute("/app")({
  loader: async () => loadAppAuth(),
  component: AppLayout,
});

function AppLayout() {
  Route.useLoaderData();

  return <Outlet />;
}
