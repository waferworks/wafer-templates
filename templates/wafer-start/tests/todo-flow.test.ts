import { describe, expect, test } from "bun:test";

import { buildTodoPageState } from "@/server/functions/todos";
import { createTodoService } from "@/server/services/todo-service";

import {
  createInMemoryTodoRepository,
  createUnavailableTodoRepository,
} from "./support/todo-repository";

describe("wafer-start todo flow", () => {
  test("lists newly created todos through the service layer", async () => {
    const service = createTodoService(createInMemoryTodoRepository());

    await service.createTodo({
      title: "Ship the Start template",
    });

    const todos = await service.listTodos();

    expect(todos).toHaveLength(1);
    expect(todos[0]?.title).toBe("Ship the Start template");
  });

  test("returns a waiting state when the database is unavailable", async () => {
    const service = createTodoService(createUnavailableTodoRepository());

    await expect(service.healthCheck()).resolves.toBeFalse();

    const state = await buildTodoPageState(service);

    expect(state.databaseStatus).toBe("waiting-for-database");
    expect(state.todos).toHaveLength(0);
    expect(state.message).toContain("database");
  });
});
