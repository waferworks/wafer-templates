type RawEnv = Record<string, string | undefined>;

export interface ServerEnv {
  HOST: string;
  PORT: string;
}

function readOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function readServerEnv(env: RawEnv = process.env): ServerEnv {
  return {
    HOST: readOptionalString(env.HOST) ?? "127.0.0.1",
    PORT: readOptionalString(env.PORT) ?? "3000",
  };
}

export function parsePort(value: string | undefined) {
  const raw = value ?? "3000";

  if (!/^\d+$/.test(raw)) {
    return 3000;
  }

  const parsed = Number(raw);
  return parsed >= 1 && parsed <= 65535 ? parsed : 3000;
}
