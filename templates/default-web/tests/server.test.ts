import { describe, expect, test } from "bun:test";

import { buildApp, getServerConfig } from "../src/server/index";
import {
  createInMemoryTodoRepository,
  createUnavailableTodoRepository,
} from "./support/todo-repository";

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
    const unavailableApp = buildApp(createUnavailableTodoRepository());
    const healthyApp = buildApp(createInMemoryTodoRepository());

    expect((await unavailableApp.request("/health")).status).toBe(503);
    expect((await healthyApp.request("/health")).status).toBe(200);
  });

  test("rejects invalid todo payloads through the public API", async () => {
    const app = buildApp(createInMemoryTodoRepository());

    const response = await app.request("/api/todos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "",
      }),
    });

    expect(response.status).toBe(400);
  });

  test("returns a service-unavailable error when todos cannot be loaded", async () => {
    const app = buildApp(createUnavailableTodoRepository());

    const response = await app.request("/api/todos");
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("DATABASE_URL");
  });
});
