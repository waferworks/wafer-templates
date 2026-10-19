import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resolveConfiguredDatabaseUrl } from "../../env/database";
import { ServiceUnavailableError } from "../errors";
import * as schema from "./schema";

const serverQueryOptions = ["host", "port", "user"];

export function createDatabaseConnection(databaseUrl = resolveConfiguredDatabaseUrl()) {
  if (!databaseUrl) {
    throw new ServiceUnavailableError(
      "Configure DATABASE_URL or set both PG_BOOTSTRAP_URL and DATABASE_NAME."
    );
  }

  const { url, server } = splitServerQueryOptions(databaseUrl);
  const sql = postgres(url, {
    ...server,
    prepare: false,
  });
  const db = drizzle(sql, { schema });

  return { db, sql };
}

// libpq URLs can name the server and role in the query, as in the Unix socket URL
// `postgresql:///app?host=/run/postgresql&user=app`. postgres.js would send those to
// PostgreSQL as settings, which it rejects, so they become connection options instead.
function splitServerQueryOptions(databaseUrl: string) {
  const queryStart = databaseUrl.indexOf("?");
  const query = new URLSearchParams(queryStart === -1 ? "" : databaseUrl.slice(queryStart + 1));

  if (!serverQueryOptions.some((key) => query.has(key))) {
    return { url: databaseUrl, server: {} };
  }

  const host = query.get("host") || undefined;
  const port = Number(query.get("port")) || undefined;
  const user = query.get("user") || undefined;
  for (const key of serverQueryOptions) {
    query.delete(key);
  }

  const base = databaseUrl.slice(0, queryStart);
  const settings = query.toString();

  return {
    url: settings ? `${base}?${settings}` : base,
    server: { host, port, user },
  };
}
