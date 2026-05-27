import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  createTodoInputSchema,
  todoIdParamSchema,
  todoListResponseSchema,
  todoResponseSchema,
} from "@/shared/schemas";

import type { AppBindings } from "../index";

const todosRoute = new Hono<AppBindings>()
  .get("/", async (c) => {
    const todos = await c.var.todoService.listTodos();

    return c.json(todoListResponseSchema.parse({ todos }));
  })
  .post("/", zValidator("json", createTodoInputSchema), async (c) => {
    const todo = await c.var.todoService.createTodo(c.req.valid("json"));

    return c.json(todoResponseSchema.parse({ todo }), 201);
  })
  .delete("/:id", zValidator("param", todoIdParamSchema), async (c) => {
    await c.var.todoService.deleteTodo(c.req.valid("param").id);

    return c.body(null, 204);
  });

export default todosRoute;
