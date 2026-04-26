import { z } from "zod";

export const ensureIdentityUserInputSchema = z.object({
  provider: z.string().trim().min(1).max(64),
  providerUserId: z.string().trim().min(1).max(191),
  primaryEmail: z.string().email().optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const appUserSchema = z.object({
  id: z.string().uuid(),
  primaryEmail: z.string().email().nullable(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
});

export const authIdentitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(),
  providerUserId: z.string(),
  primaryEmail: z.string().email().nullable(),
  createdAt: z.string(),
});

export const createTodoInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the todo a title.")
    .max(120, "Keep it under 120 characters."),
});

export const todoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
});

export const todoPageStateSchema = z.object({
  databaseStatus: z.enum(["ok", "waiting-for-database"]),
  todos: z.array(todoSchema),
  message: z.string().optional(),
});

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "waiting-for-database"]),
});

export const runtimeInfoSchema = z.object({
  databaseConfigured: z.boolean(),
});

export type EnsureIdentityUserInput = z.infer<typeof ensureIdentityUserInputSchema>;
export type AppUser = z.infer<typeof appUserSchema>;
export type AuthIdentity = z.infer<typeof authIdentitySchema>;
export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type Todo = z.infer<typeof todoSchema>;
export type TodoPageState = z.infer<typeof todoPageStateSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>;
