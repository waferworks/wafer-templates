import { desc } from "drizzle-orm";

import { type CreateTodoInput, type Todo, createTodoInputSchema } from "@/shared/schemas";

import { ServiceUnavailableError } from "../errors";
import { createDatabaseConnection } from "./connection";
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
    return createUnavailableTodoRepository();
  }

  const { db, sql } = createDatabaseConnection(databaseUrl);

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

export function createUnavailableTodoRepository(): TodoRepository {
  return {
    async list() {
      throw new ServiceUnavailableError(
        "DATABASE_URL is required. Wafer sets it automatically for running apps."
      );
    },
    async create() {
      throw new ServiceUnavailableError(
        "DATABASE_URL is required. Wafer sets it automatically for running apps."
      );
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
