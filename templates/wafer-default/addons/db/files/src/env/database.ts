const runtimeModes = ["direct", "bootstrap", "unconfigured"] as const;

type DatabaseMode = (typeof runtimeModes)[number];
type RawEnv = Record<string, string | undefined>;

export interface DatabaseEnv {
  APP_DATABASE_MODE?: DatabaseMode;
  DATABASE_NAME?: string;
  DATABASE_URL?: string;
  PG_BOOTSTRAP_URL?: string;
}

function readOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function readOptionalUrl(value: string | undefined, key: string) {
  const trimmed = readOptionalString(value);
  if (!trimmed) {
    return undefined;
  }

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

function readOptionalMode(value: string | undefined) {
  const mode = readOptionalString(value);
  if (!mode) {
    return undefined;
  }

  if ((runtimeModes as readonly string[]).includes(mode)) {
    return mode as DatabaseMode;
  }

  throw new Error(`APP_DATABASE_MODE must be one of: ${runtimeModes.join(", ")}.`);
}

export function readDatabaseEnv(env: RawEnv = process.env): DatabaseEnv {
  const parsed = {
    APP_DATABASE_MODE: readOptionalMode(env.APP_DATABASE_MODE),
    DATABASE_NAME: readOptionalString(env.DATABASE_NAME),
    DATABASE_URL: readOptionalUrl(env.DATABASE_URL, "DATABASE_URL"),
    PG_BOOTSTRAP_URL: readOptionalUrl(env.PG_BOOTSTRAP_URL, "PG_BOOTSTRAP_URL"),
  };

  if (parsed.PG_BOOTSTRAP_URL && !parsed.DATABASE_NAME) {
    throw new Error("DATABASE_NAME is required when PG_BOOTSTRAP_URL is set.");
  }

  if (parsed.DATABASE_NAME && !parsed.PG_BOOTSTRAP_URL && !parsed.DATABASE_URL) {
    throw new Error("PG_BOOTSTRAP_URL is required when DATABASE_NAME is set without DATABASE_URL.");
  }

  return parsed;
}

export function buildDatabaseUrl(bootstrapUrl: string, databaseName: string) {
  const url = new URL(bootstrapUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function resolveConfiguredDatabaseUrl(env: RawEnv = process.env) {
  const parsed = readDatabaseEnv(env);

  if (parsed.DATABASE_URL) {
    return parsed.DATABASE_URL;
  }

  if (!parsed.PG_BOOTSTRAP_URL || !parsed.DATABASE_NAME) {
    return undefined;
  }

  return buildDatabaseUrl(parsed.PG_BOOTSTRAP_URL, parsed.DATABASE_NAME);
}

export function resolveDatabaseMode(env: RawEnv = process.env): DatabaseMode {
  const parsed = readDatabaseEnv(env);

  if (parsed.APP_DATABASE_MODE) {
    return parsed.APP_DATABASE_MODE;
  }

  if (parsed.DATABASE_URL) {
    return "direct";
  }

  if (parsed.PG_BOOTSTRAP_URL && parsed.DATABASE_NAME) {
    return "bootstrap";
  }

  return "unconfigured";
}
