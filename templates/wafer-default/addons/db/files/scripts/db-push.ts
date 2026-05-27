import { requirePreparedDatabaseUrl, runScript } from "./_db";

const databaseUrl = await requirePreparedDatabaseUrl();

await runScript("_db:push:app", {
  ...process.env,
  DATABASE_URL: databaseUrl,
});
