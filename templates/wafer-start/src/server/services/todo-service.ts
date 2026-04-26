import type { CreateTodoInput, Todo } from "@/shared/schemas";

import type { TodoRepository } from "@/server/db/todo-repository";

export interface TodoService {
  listTodos(): Promise<Todo[]>;
  createTodo(input: CreateTodoInput): Promise<Todo>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

export function createTodoService(repository: TodoRepository): TodoService {
  return {
    async listTodos() {
      return repository.list();
    },
    async createTodo(input) {
      return repository.create(input);
    },
    async healthCheck() {
      return repository.healthCheck();
    },
    async close() {
      await repository.close();
    },
  };
}
