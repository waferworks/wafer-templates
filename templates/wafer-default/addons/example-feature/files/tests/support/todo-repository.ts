import { type CreateTodoInput, type Todo, createTodoInputSchema } from "@/shared/schemas";

import type { TodoRepository } from "@/server/db/todo-repository";
import { ServiceUnavailableError } from "@/server/errors";

export function createInMemoryTodoRepository(initialTodos: Todo[] = []): TodoRepository {
  const todosById = new Map(initialTodos.map((todo) => [todo.id, todo]));

  return {
    async list() {
      return Array.from(todosById.values()).sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      );
    },
    async create(input: CreateTodoInput) {
      const value = createTodoInputSchema.parse(input);
      const todo = {
        id: crypto.randomUUID(),
        title: value.title,
        createdAt: new Date().toISOString(),
      };

      todosById.set(todo.id, todo);

      return todo;
    },
    async deleteById(id: string) {
      todosById.delete(id);
    },
    async close() {},
  };
}

export function createUnavailableTodoRepository(): TodoRepository {
  return {
    async list() {
      throw new ServiceUnavailableError("DATABASE_URL is required.");
    },
    async create() {
      throw new ServiceUnavailableError("DATABASE_URL is required.");
    },
    async deleteById() {
      throw new ServiceUnavailableError("DATABASE_URL is required.");
    },
    async close() {},
  };
}
