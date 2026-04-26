import { ArrowRight, Lightning, Stack } from "@phosphor-icons/react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buildTitle } from "@/app/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-none bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.28),_transparent_40%),linear-gradient(135deg,#fff7ed_0%,#fffbeb_42%,#ffffff_100%)]">
          <CardHeader className="space-y-4 pb-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              <Lightning className="size-4" weight="fill" />
              Start fast, leave cleanly
            </div>
            <CardTitle className="max-w-2xl text-4xl leading-tight sm:text-5xl">
              Ship the first version on Wafer without trapping the app there forever.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-stone-700">
              `wafer-start` keeps one Start app for the landing page and product surface, uses route
              loaders for reads, server functions for mutations, and keeps the DB layer boring
              enough to survive a later move to a bigger host.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              to="/app"
            >
              Open the example app
              <ArrowRight className="size-4" weight="bold" />
            </Link>
            <span className="text-sm text-stone-600">
              The app route reads and writes Postgres through the shared server layer.
            </span>
          </CardContent>
        </Card>

        <Card className="bg-stone-950 text-stone-50">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
              <Stack className="size-4" weight="duotone" />
              Runtime shape
            </div>
            <CardTitle className="text-stone-50">What this starter assumes</CardTitle>
            <CardDescription className="text-stone-300">
              One Start app, one route tree, and one data path that agents can follow without
              guessing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-300">
            <p>Public content lives at `/`. Product UI lives at `/app`.</p>
            <p>Route loaders fetch page reads. Server functions handle mutations and actions.</p>
            <p>Add auth later and `/app` becomes the default protected subtree.</p>
            <p>
              Services and repositories stay plain TypeScript so the app can outgrow Wafer later.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
