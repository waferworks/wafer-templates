import { type TodoRepository, createUnavailableTodoRepository } from "@/server/db/todo-repository";
import { type CreateTodoInput, type Todo, createTodoInputSchema } from "@/shared/schemas";

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
    async healthCheck() {
      return true;
    },
    async close() {},
  };
}

export { createUnavailableTodoRepository };
