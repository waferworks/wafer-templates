import { createServerFn } from "@tanstack/react-start";

import { ServiceUnavailableError } from "@/server/errors";
import { getTodoService } from "@/server/runtime";
import type { TodoService } from "@/server/services/todo-service";
import {
  type CreateTodoInput,
  type TodoPageState,
  createTodoInputSchema,
  todoPageStateSchema,
} from "@/shared/schemas";

export async function buildTodoPageState(service: TodoService): Promise<TodoPageState> {
  try {
    return todoPageStateSchema.parse({
      databaseStatus: "ok",
      todos: await service.listTodos(),
    });
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return todoPageStateSchema.parse({
        databaseStatus: "waiting-for-database",
        todos: [],
        message: error.message,
      });
    }

    throw error;
  }
}

export const loadTodoPage = createServerFn({ method: "GET" }).handler(async () => {
  return buildTodoPageState(getTodoService());
});

export const createTodoAction = createServerFn({ method: "POST" })
  .inputValidator((input: CreateTodoInput) => createTodoInputSchema.parse(input))
  .handler(async ({ data }) => {
    return getTodoService().createTodo(data);
  });
