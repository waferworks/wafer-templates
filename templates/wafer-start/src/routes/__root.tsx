import { ClerkProvider, Show, UserButton } from "@clerk/tanstack-react-start";
import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
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

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--canvas)] text-[var(--text)] antialiased">
        <OptionalClerkProvider enabled={clerkEnabled}>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-12 pt-5 sm:px-8">
            <header className="sticky top-0 z-10 mb-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-overlay)] px-5 py-4 shadow-[var(--shadow-floating)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                  className="font-[Iowan_Old_Style,Georgia,serif] text-xl font-semibold tracking-tight text-[var(--text)]"
                  to="/"
                >
                  {siteConfig.name}
                </Link>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <nav className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
                    <Link
                      activeProps={{
                        className: "bg-[var(--surface-strong)] text-[var(--text-inverse)]",
                      }}
                      activeOptions={{ exact: true }}
                      className="rounded-full px-4 py-2 transition hover:bg-[var(--surface-muted)]"
                      to="/"
                    >
                      Home
                    </Link>
                    <Link
                      activeProps={{
                        className: "bg-[var(--surface-strong)] text-[var(--text-inverse)]",
                      }}
                      className="rounded-full px-4 py-2 transition hover:bg-[var(--surface-muted)]"
                      to="/app"
                    >
                      App
                    </Link>
                  </nav>
                  <HeaderAuthControls enabled={clerkEnabled} />
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </OptionalClerkProvider>
        <Scripts />
      </body>
    </html>
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
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-amber-700">
        Auth ready
      </span>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex items-center gap-2">
          <a
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface-muted)]"
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
