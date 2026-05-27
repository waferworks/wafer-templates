import { createRoute } from "@tanstack/react-router";

import { siteConfig } from "@/app/site";
import { buttonVariants } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";

import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const actions: Array<{ href: string; label: string }> = [
    // addon:home-actions
  ];
  const capabilities = [
    ["Static pages", "Edit React routes without installing optional stacks."],
    ["Server API", "Mount Hono routes when an app needs backend behavior."],
    ["Add-ons", "Install DB, an example feature, or auth only when requested."],
  ];

  return (
    <main className="space-y-8">
      <section className="max-w-2xl space-y-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {siteConfig.name}
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            {siteConfig.description} Start with static pages and a tiny Hono runtime, then add
            database, an example feature, or auth only when the app needs them.
          </p>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => (
                <a
                  className={buttonVariants({ variant: "outline" })}
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Card className="py-0 shadow-sm">
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
