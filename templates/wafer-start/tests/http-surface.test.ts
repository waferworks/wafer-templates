import { spawn } from "node:child_process";

import { afterAll, describe, expect, test } from "bun:test";

const port = "4321";
let serverPid: number | undefined;
let serverLogs = "";

describe("wafer-start http surface", () => {
  afterAll(async () => {
    if (!serverPid) {
      return;
    }

    try {
      process.kill(serverPid, "SIGTERM");
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  test("serves /health and nested /app/settings through the dev server", async () => {
    const child = spawn(process.execPath, ["run", "dev"], {
      env: {
        ...process.env,
        DATABASE_NAME: "",
        DATABASE_URL: "",
        PG_BOOTSTRAP_URL: "",
        PORT: port,
        WAFER_START_TEST_ROUTE_ERROR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverPid = child.pid;
    serverLogs = "";
    child.stdout?.on("data", (chunk) => {
      serverLogs += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      serverLogs += chunk.toString();
    });

    try {
      await waitForRoute(`http://127.0.0.1:${port}/app/settings`);

      const [health, healthz, notFound, routeError, settings, signIn] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/health`),
        fetch(`http://127.0.0.1:${port}/healthz`),
        fetch(`http://127.0.0.1:${port}/does-not-exist`),
        fetch(`http://127.0.0.1:${port}/app/settings?forceError=1`),
        fetch(`http://127.0.0.1:${port}/app/settings`),
        fetch(`http://127.0.0.1:${port}/sign-in`),
      ]);

      expect(health.status).toBe(503);
      expect(healthz.status).toBe(503);
      expect([200, 404]).toContain(notFound.status);
      expect(await notFound.text()).toContain("This page does not exist.");
      expect(routeError.status).toBe(500);
      expect(await routeError.text()).toContain("Something went wrong while rendering this route.");
      expect(settings.status).toBe(200);
      expect(await settings.text()).toContain("<title>Settings | wafer-start</title>");
      expect(signIn.status).toBe(200);
      expect(await signIn.text()).toContain("is scaffolded, but not enabled yet");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : "HTTP surface test failed"}\n\n${serverLogs}`
      );
    }
  }, 15_000);
});

async function waitForRoute(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}
