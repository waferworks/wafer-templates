import type { CreateTodoInput, Todo } from "@/shared/schemas";

import type { TodoRepository } from "../db/todo-repository";

export interface TodoService {
  listTodos(): Promise<Todo[]>;
  createTodo(input: CreateTodoInput): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;
}

export function createTodoService(repository: TodoRepository): TodoService {
  return {
    async listTodos() {
      return repository.list();
    },
    async createTodo(input) {
      return repository.create(input);
    },
    async deleteTodo(id) {
      await repository.deleteById(id);
    },
  };
}
