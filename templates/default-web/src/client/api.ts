import { hc } from "hono/client";

import {
  type CreateTodoInput,
  createTodoInputSchema,
  todoListResponseSchema,
  todoResponseSchema,
} from "@/shared/schemas";

import type { AppType } from "@/server/index";

const client = hc<AppType>("/");

export async function listTodos() {
  const response = await client.api.todos.$get();
  const payload = await response.json();

  if (!response.ok) {
    throw new Error("Could not load todos.");
  }

  return todoListResponseSchema.parse(payload).todos;
}

export async function createTodo(input: CreateTodoInput) {
  const payload = createTodoInputSchema.parse(input);
  const response = await client.api.todos.$post({
    json: payload,
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error("Could not create the todo.");
  }

  return todoResponseSchema.parse(body).todo;
}
