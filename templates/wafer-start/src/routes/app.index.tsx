import { createFileRoute } from "@tanstack/react-router";

import { buildTitle } from "@/app/site";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: buildTitle("App") }],
  }),
  component: AppIndexPage,
});

function AppIndexPage() {
  return <p className="sr-only">App shell ready for product routes.</p>;
}
