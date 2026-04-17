import { describe, expect, test } from "bun:test";

import { createInMemoryTodoRepository } from "../src/server/db/client";
import { buildApp, getServerConfig } from "../src/server/index";

describe("default-web API", () => {
  test("uses Wafer host and PORT-based config", () => {
    process.env.PORT = "4312";

    expect(getServerConfig()).toEqual({
      host: "127.0.0.1",
      port: 4312,
    });
  });

  test("creates and lists todos through the public routes", async () => {
    const app = buildApp(createInMemoryTodoRepository());

    const createResponse = await app.request("/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Ship the first template",
      }),
    });

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request("/api/todos");
    const payload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(payload.todos).toHaveLength(1);
    expect(payload.todos[0].title).toBe("Ship the first template");
  });

  test("reports database health from the repository abstraction", async () => {
    const unavailableApp = buildApp({
      async list() {
        return [];
      },
      async create() {
        throw new Error("DATABASE_URL is required.");
      },
      async healthCheck() {
        return false;
      },
      async close() {},
    });
    const healthyApp = buildApp(createInMemoryTodoRepository());

    expect((await unavailableApp.request("/health")).status).toBe(503);
    expect((await healthyApp.request("/health")).status).toBe(200);
  });
});
