import { Hono } from "hono";
import { logger } from "hono/logger";

// addon:server-imports
import { ServiceUnavailableError } from "./errors";
import { buildHealthResponse } from "./health";

export interface AppBindings {
  Variables: {
    // addon:app-variables
    base: "wafer-default";
  };
}

export interface AppOptions extends Record<never, never> {
  // addon:app-options
}

const cleanupTasks: Array<() => Promise<void> | void> = [];

export function registerCleanup(task: () => Promise<void> | void) {
  cleanupTasks.push(task);
}

export async function runCleanupTasks() {
  await Promise.all(cleanupTasks.map((task) => task()));
}

export function buildApp(options: AppOptions = {}) {
  const app = new Hono<AppBindings>();

  app.use("*", logger());
  // addon:server-services

  app
    .get("/health", () => buildHealthResponse())
    .get("/healthz", (c) => c.redirect("/health"))
    .get("/api", (c) => c.json({ status: "ok" }));

  // addon:server-routes

  app.onError((error, c) => {
    if (error instanceof ServiceUnavailableError) {
      return c.json({ error: error.message }, error.status);
    }

    console.error(error);
    return c.json({ error: "Unexpected server error" }, 500);
  });

  return app;
}

export type AppType = ReturnType<typeof buildApp>;
