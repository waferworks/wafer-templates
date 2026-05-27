import { describe, expect, test } from "bun:test";

import { buildApp, getServerConfig } from "../src/server/index";

describe("wafer-default base", () => {
  test("uses Wafer host and PORT-based config", () => {
    const originalPort = process.env.PORT;
    const originalHost = process.env.HOST;

    try {
      process.env.HOST = "0.0.0.0";
      process.env.PORT = "4312";

      expect(getServerConfig()).toEqual({
        host: "0.0.0.0",
        port: 4312,
      });
    } finally {
      restoreEnv("PORT", originalPort);
      restoreEnv("HOST", originalHost);
    }
  });

  test("normalizes blank host and invalid PORT config", () => {
    const originalPort = process.env.PORT;
    const originalHost = process.env.HOST;

    try {
      process.env.HOST = " ";
      process.env.PORT = "not-a-port";

      expect(getServerConfig()).toEqual({
        host: "127.0.0.1",
        port: 3000,
      });
    } finally {
      restoreEnv("PORT", originalPort);
      restoreEnv("HOST", originalHost);
    }
  });

  test("rejects partially numeric PORT config", () => {
    const originalPort = process.env.PORT;

    try {
      process.env.PORT = "3000abc";

      expect(getServerConfig().port).toBe(3000);

      process.env.PORT = "70000";
      expect(getServerConfig().port).toBe(3000);
    } finally {
      restoreEnv("PORT", originalPort);
    }
  });

  test("reports process health without requiring a database", async () => {
    const app = buildApp();
    const response = await app.request("/health");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ status: "ok" });
  });

  test("keeps an API surface ready for add-ons", async () => {
    const app = buildApp();
    const response = await app.request("/api");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ status: "ok" });
  });
});

function restoreEnv(key: "HOST" | "PORT", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
