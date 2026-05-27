import {
  type CreateTodoInput,
  createTodoInputSchema,
  todoListResponseSchema,
  todoResponseSchema,
} from "@/shared/schemas";

export async function listTodos() {
  const response = await fetch("/api/todos");

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not load todos."));
  }

  const payload = await response.json();
  return todoListResponseSchema.parse(payload).todos;
}

export async function createTodo(input: CreateTodoInput) {
  const payload = createTodoInputSchema.parse(input);
  const response = await fetch("/api/todos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not create the todo."));
  }

  const body = await response.json();
  return todoResponseSchema.parse(body).todo;
}

export async function deleteTodo(id: string) {
  const response = await fetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Could not delete the todo."));
  }
}

async function readErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => undefined);
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string" &&
    body.error.trim()
  ) {
    return body.error;
  }

  return fallback;
}
