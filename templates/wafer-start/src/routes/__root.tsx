import { ClerkProvider, Show, UserButton } from "@clerk/tanstack-react-start";
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
/// <reference types="vite/client" />
import type * as React from "react";

import { authPaths } from "@/app/auth";
import { buildTitle, siteConfig } from "@/app/site";
import { isClerkEnabledClient } from "@/env/client";

import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: buildTitle(),
      },
      {
        name: "description",
        content: siteConfig.description,
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const clerkEnabled = isClerkEnabledClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLandingPage = pathname === "/";

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <OptionalClerkProvider enabled={clerkEnabled}>
          <div
            className={
              isLandingPage
                ? "mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16"
                : "mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-12 pt-5 sm:px-8"
            }
          >
            {!isLandingPage ? <AppHeader clerkEnabled={clerkEnabled} /> : null}
            <main className="flex-1">{children}</main>
          </div>
        </OptionalClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppHeader({ clerkEnabled }: { clerkEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-10 mb-8 rounded-full border border-border bg-card/85 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-xl font-semibold tracking-normal text-foreground" to="/">
          {siteConfig.name}
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              activeProps={{
                className: "bg-primary text-primary-foreground",
              }}
              activeOptions={{ exact: true }}
              className="rounded-full px-4 py-2 transition hover:bg-muted hover:text-foreground"
              to="/"
            >
              Home
            </Link>
            <Link
              activeProps={{
                className: "bg-primary text-primary-foreground",
              }}
              className="rounded-full px-4 py-2 transition hover:bg-muted hover:text-foreground"
              to="/app"
            >
              App
            </Link>
          </nav>
          <HeaderAuthControls enabled={clerkEnabled} />
        </div>
      </div>
    </header>
  );
}

function OptionalClerkProvider({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}

function HeaderAuthControls({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="rounded-full border border-border bg-muted px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
        Auth ready
      </span>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <a
            className="rounded-full border border-border px-4 py-2 text-sm transition hover:bg-muted"
            href={authPaths.signIn}
          >
            Continue
          </a>
        </div>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
