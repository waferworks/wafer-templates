import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resolveConfiguredDatabaseUrl } from "../../env/database";
import { ServiceUnavailableError } from "../errors";
import * as schema from "./schema";

export function createDatabaseConnection(databaseUrl = resolveConfiguredDatabaseUrl()) {
  if (!databaseUrl) {
    throw new ServiceUnavailableError(
      "Configure DATABASE_URL or set both PG_BOOTSTRAP_URL and DATABASE_NAME."
    );
  }

  const sql = postgres(databaseUrl, {
    prepare: false,
  });
  const db = drizzle(sql, { schema });

  return { db, sql };
}
