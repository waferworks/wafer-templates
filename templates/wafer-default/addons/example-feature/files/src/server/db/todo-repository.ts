import { desc, eq } from "drizzle-orm";

import { type CreateTodoInput, type Todo, createTodoInputSchema } from "@/shared/schemas";

import { ServiceUnavailableError } from "../errors";
import { createDatabaseConnection } from "./connection";
import { todos } from "./schema";

export interface TodoRepository {
  list(): Promise<Todo[]>;
  create(input: CreateTodoInput): Promise<Todo>;
  deleteById(id: string): Promise<void>;
  close(): Promise<void>;
}

type TodoRow = {
  id: string;
  title: string;
  createdAt: Date;
};

export function createTodoRepository(databaseUrl = process.env.DATABASE_URL): TodoRepository {
  const { db, sql } = createDatabaseConnection(databaseUrl);

  return {
    async list() {
      try {
        const rows = await db.select().from(todos).orderBy(desc(todos.createdAt));
        return rows.map(mapTodoRow);
      } catch {
        throw unavailableDatabase();
      }
    },
    async create(input) {
      const value = createTodoInputSchema.parse(input);

      try {
        const [row] = await db.insert(todos).values({ title: value.title }).returning();
        return mapTodoRow(row);
      } catch {
        throw unavailableDatabase();
      }
    },
    async deleteById(id) {
      try {
        await db.delete(todos).where(eq(todos.id, id));
      } catch {
        throw unavailableDatabase();
      }
    },
    async close() {
      await sql.end({ timeout: 1 });
    },
  };
}

function unavailableDatabase() {
  return new ServiceUnavailableError(
    "Database connection unavailable. Configure database env and run migrations."
  );
}

function mapTodoRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}
