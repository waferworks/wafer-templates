import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  createTodoInputSchema,
  todoListResponseSchema,
  todoResponseSchema,
} from "@/shared/schemas";

import type { AppBindings } from "../index";

const todosRoute = new Hono<AppBindings>()
  .get("/", async (c) => {
    const todos = await c.var.todoRepository.list();

    return c.json(todoListResponseSchema.parse({ todos }));
  })
  .post("/", zValidator("json", createTodoInputSchema), async (c) => {
    const todo = await c.var.todoRepository.create(c.req.valid("json"));

    return c.json(todoResponseSchema.parse({ todo }), 201);
  });

export default todosRoute;
