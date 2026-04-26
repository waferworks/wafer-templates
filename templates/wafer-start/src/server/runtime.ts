import { createTodoRepository } from "@/server/db/todo-repository";
import { createUserRepository } from "@/server/db/user-repository";
import { createTodoService } from "@/server/services/todo-service";
import { createUserService } from "@/server/services/user-service";

const todoService = createTodoService(createTodoRepository());
const userService = createUserService(createUserRepository());

export function getTodoService() {
  return todoService;
}

export function getUserService() {
  return userService;
}
