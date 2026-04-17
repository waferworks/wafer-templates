import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { type CreateTodoInput, type Todo, createTodoInputSchema } from "@/shared/schemas";

import { todos } from "./schema";

export interface TodoRepository {
  list(): Promise<Todo[]>;
  create(input: CreateTodoInput): Promise<Todo>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

type TodoRow = {
  id: string;
  title: string;
  createdAt: Date;
};

export function createTodoRepository(databaseUrl = process.env.DATABASE_URL): TodoRepository {
  if (!databaseUrl) {
    return createUnavailableTodoRepository(
      "DATABASE_URL is required. Wafer sets it automatically for running apps."
    );
  }

  const sql = postgres(databaseUrl, {
    prepare: false,
  });
  const db = drizzle(sql, { schema: { todos } });

  return {
    async list() {
      const rows = await db.select().from(todos).orderBy(desc(todos.createdAt));
      return rows.map(mapTodoRow);
    },
    async create(input) {
      const value = createTodoInputSchema.parse(input);
      const [row] = await db.insert(todos).values({ title: value.title }).returning();

      return mapTodoRow(row);
    },
    async healthCheck() {
      try {
        await sql`select 1`;
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await sql.end({ timeout: 1 });
    },
  };
}

export function createInMemoryTodoRepository(initialTodos: Todo[] = []): TodoRepository {
  const todosById = new Map(initialTodos.map((todo) => [todo.id, todo]));

  return {
    async list() {
      return Array.from(todosById.values()).sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      );
    },
    async create(input) {
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

function createUnavailableTodoRepository(message: string): TodoRepository {
  return {
    async list() {
      throw new Error(message);
    },
    async create() {
      throw new Error(message);
    },
    async healthCheck() {
      return false;
    },
    async close() {},
  };
}

function mapTodoRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}
