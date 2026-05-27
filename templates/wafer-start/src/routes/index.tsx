import { createFileRoute } from "@tanstack/react-router";

import { buildTitle, siteConfig } from "@/app/site";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: buildTitle("Home") },
      {
        name: "description",
        content:
          "A Wafer-ready TanStack Start starter with one obvious route-loader and server-function path.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const capabilities = [
    ["Product routes", "Public content starts at `/`; the example app stays under `/app`."],
    ["Server functions", "Use Start loaders and server functions when the app needs backend work."],
    [
      "Example wiring",
      "Database and Clerk are scaffolded, with an example feature showing the patterns.",
    ],
  ];

  return (
    <main className="space-y-8">
      <section className="max-w-2xl space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Wafer-ready start</p>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {siteConfig.name}
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            {siteConfig.description} It starts with the full app shape: routes, server functions,
            auth scaffolding, database access, and a product surface an agent can extend.
          </p>
        </div>
      </section>

      <Card className="rounded-2xl py-0 shadow-sm">
        <CardContent className="grid gap-0 divide-y divide-border p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {capabilities.map(([title, description]) => (
            <div className="space-y-2 p-5" key={title}>
              <h2 className="text-sm font-medium text-foreground">{title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
