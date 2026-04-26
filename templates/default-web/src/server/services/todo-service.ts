import type { CreateTodoInput, Todo } from "@/shared/schemas";

import { type TodoRepository, createTodoRepository } from "../db/todo-repository";

export interface TodoService {
  listTodos(): Promise<Todo[]>;
  createTodo(input: CreateTodoInput): Promise<Todo>;
  healthCheck(): Promise<boolean>;
}

export function createTodoService(
  repository: TodoRepository = createTodoRepository()
): TodoService {
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
  };
}
