import { requirePreparedDatabaseUrl, runScript } from "./_shared";

const databaseUrl = await requirePreparedDatabaseUrl();

await runScript("_db:push:app", {
  ...process.env,
  DATABASE_URL: databaseUrl,
});
