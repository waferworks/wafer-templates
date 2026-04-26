import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ServiceUnavailableError } from "../errors";
import { todos } from "./schema";

export function createDatabaseConnection(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new ServiceUnavailableError(
      "DATABASE_URL is required. Wafer sets it automatically for running apps."
    );
  }

  const sql = postgres(databaseUrl, {
    prepare: false,
  });
  const db = drizzle(sql, { schema: { todos } });

  return { db, sql };
}
