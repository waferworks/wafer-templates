import { createRouter } from "@tanstack/react-router";

import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { DefaultNotFound } from "@/components/default-not-found";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: DefaultNotFound,
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
