import path from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import {
  buildDatabaseUrl,
  readServerEnv,
  resolveConfiguredDatabaseUrl,
  resolveDatabaseMode,
  resolveVisibleDatabaseName,
} from "@/env/server";
import { ServiceUnavailableError } from "@/server/errors";

import { createDatabaseConnection } from "./connection";

type EnvShape = Record<string, string | undefined>;

export function resolveDatabaseUrl(env: EnvShape = process.env) {
  return resolveConfiguredDatabaseUrl(env);
}

export function getDatabaseMode(env: EnvShape = process.env) {
  return resolveDatabaseMode(env);
}

export function getVisibleDatabaseName(env: EnvShape = process.env) {
  return resolveVisibleDatabaseName(env);
}

export function requireDatabaseUrl(env: EnvShape = process.env) {
  const databaseUrl = resolveDatabaseUrl(env);

  if (!databaseUrl) {
    throw new ServiceUnavailableError(
      "Configure DATABASE_URL or set both PG_BOOTSTRAP_URL and DATABASE_NAME."
    );
  }

  return databaseUrl;
}

export async function ensureDatabaseReady(env: EnvShape = process.env) {
  const parsed = readServerEnv(env);

  if (parsed.DATABASE_URL) {
    return parsed.DATABASE_URL;
  }

  const bootstrapUrl = parsed.PG_BOOTSTRAP_URL;
  const databaseName = parsed.DATABASE_NAME;

  if (!bootstrapUrl || !databaseName) {
    return undefined;
  }

  const targetUrl = buildDatabaseUrl(bootstrapUrl, databaseName);

  const sql = postgres(bootstrapUrl, { max: 1, prepare: false });

  try {
    const rows = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;

    if (!rows[0]?.exists) {
      try {
        await sql.unsafe(`create database ${quoteIdentifier(databaseName)}`);
      } catch (error) {
        if (!isDuplicateDatabaseError(error)) {
          throw error;
        }
      }
    }

    return targetUrl;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function migrateDatabase(databaseUrl: string) {
  const { db, sql } = createDatabaseConnection(databaseUrl);

  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function prepareDatabase(env: EnvShape = process.env) {
  const databaseUrl = await ensureDatabaseReady(env);

  if (!databaseUrl) {
    return undefined;
  }

  await migrateDatabase(databaseUrl);
  return databaseUrl;
}
function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isDuplicateDatabaseError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P04";
}
