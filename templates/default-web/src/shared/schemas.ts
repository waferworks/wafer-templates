import { z } from "zod";

export const createTodoInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the todo a short title.")
    .max(120, "Keep the title under 120 characters."),
});

export const todoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
});

export const todoListResponseSchema = z.object({
  todos: z.array(todoSchema),
});

export const todoResponseSchema = z.object({
  todo: todoSchema,
});

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type Todo = z.infer<typeof todoSchema>;
