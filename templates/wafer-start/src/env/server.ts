import { authPaths } from "@/app/auth";
import { z } from "zod";

const runtimeModes = ["direct", "bootstrap", "unconfigured"] as const;

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalTrimmedString = z.preprocess(normalizeString, z.string().optional());
const optionalUrl = z.preprocess(normalizeString, z.string().url().optional());

const serverEnvSchema = z
  .object({
    APP_DATABASE_MODE: z.enum(runtimeModes).optional(),
    CLERK_PUBLISHABLE_KEY: optionalTrimmedString,
    CLERK_SECRET_KEY: optionalTrimmedString,
    CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalTrimmedString,
    CLERK_SIGN_IN_URL: optionalTrimmedString,
    DATABASE_NAME: optionalTrimmedString,
    DATABASE_URL: optionalUrl,
    HOST: optionalTrimmedString,
    PG_BOOTSTRAP_URL: optionalUrl,
    PORT: optionalTrimmedString,
    VITE_CLERK_PUBLISHABLE_KEY: optionalTrimmedString,
    VITE_CLERK_SIGN_IN_URL: optionalTrimmedString,
  })
  .superRefine((value, ctx) => {
    if (value.PG_BOOTSTRAP_URL && !value.DATABASE_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_NAME is required when PG_BOOTSTRAP_URL is set.",
        path: ["DATABASE_NAME"],
      });
    }

    if (value.DATABASE_NAME && !value.PG_BOOTSTRAP_URL && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PG_BOOTSTRAP_URL is required when DATABASE_NAME is set without DATABASE_URL.",
        path: ["PG_BOOTSTRAP_URL"],
      });
    }

    const clerkPublishableKey = value.VITE_CLERK_PUBLISHABLE_KEY ?? value.CLERK_PUBLISHABLE_KEY;
    const clerkConfigured = Boolean(clerkPublishableKey || value.CLERK_SECRET_KEY);

    if (clerkConfigured && !clerkPublishableKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A Clerk publishable key is required when CLERK auth is configured. Set VITE_CLERK_PUBLISHABLE_KEY.",
        path: ["VITE_CLERK_PUBLISHABLE_KEY"],
      });
    }

    if (clerkConfigured && !value.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "CLERK_SECRET_KEY is required when Clerk auth is configured alongside the publishable key.",
        path: ["CLERK_SECRET_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;
type RawEnv = Record<string, string | undefined>;

export function readServerEnv(env: RawEnv = process.env) {
  const parsed = serverEnvSchema.parse(env);

  return {
    ...parsed,
    CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
      parsed.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? authPaths.afterSignIn,
    CLERK_SIGN_IN_URL:
      parsed.VITE_CLERK_SIGN_IN_URL ?? parsed.CLERK_SIGN_IN_URL ?? authPaths.signIn,
    HOST: parsed.HOST || "127.0.0.1",
    PORT: parsed.PORT || "3000",
  };
}

export function readClerkEnv(env: RawEnv = process.env) {
  const parsed = readServerEnv(env);
  const clerkPublishableKey = parsed.VITE_CLERK_PUBLISHABLE_KEY ?? parsed.CLERK_PUBLISHABLE_KEY;

  return {
    clerkPublishableKey,
    clerkSecretKey: parsed.CLERK_SECRET_KEY,
    clerkSignInFallbackRedirectUrl: parsed.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    clerkSignInUrl: parsed.CLERK_SIGN_IN_URL,
    enabled: Boolean(clerkPublishableKey && parsed.CLERK_SECRET_KEY),
  };
}

export function isClerkEnabled(env: RawEnv = process.env) {
  return readClerkEnv(env).enabled;
}

export function buildDatabaseUrl(bootstrapUrl: string, databaseName: string) {
  const url = new URL(bootstrapUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function resolveConfiguredDatabaseUrl(env: RawEnv = process.env) {
  const parsed = readServerEnv(env);

  if (parsed.DATABASE_URL) {
    return parsed.DATABASE_URL;
  }

  if (!parsed.PG_BOOTSTRAP_URL || !parsed.DATABASE_NAME) {
    return undefined;
  }

  return buildDatabaseUrl(parsed.PG_BOOTSTRAP_URL, parsed.DATABASE_NAME);
}

export function resolveDatabaseMode(env: RawEnv = process.env) {
  const parsed = readServerEnv(env);

  if (parsed.APP_DATABASE_MODE) {
    return parsed.APP_DATABASE_MODE;
  }

  if (parsed.DATABASE_URL) {
    return "direct" as const;
  }

  if (parsed.PG_BOOTSTRAP_URL && parsed.DATABASE_NAME) {
    return "bootstrap" as const;
  }

  return "unconfigured" as const;
}

export function resolveVisibleDatabaseName(env: RawEnv = process.env) {
  const parsed = readServerEnv(env);

  if (parsed.DATABASE_NAME) {
    return parsed.DATABASE_NAME;
  }

  if (!parsed.DATABASE_URL) {
    return undefined;
  }

  const pathname = new URL(parsed.DATABASE_URL).pathname.replace(/^\//, "");
  return pathname || undefined;
}
