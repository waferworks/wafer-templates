import { defineConfig } from "drizzle-kit";

import { resolveConfiguredDatabaseUrl } from "./src/env/database";

const databaseUrl = resolveConfiguredDatabaseUrl();

if (!databaseUrl) {
  throw new Error("Configure DATABASE_URL or set both PG_BOOTSTRAP_URL and DATABASE_NAME.");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
