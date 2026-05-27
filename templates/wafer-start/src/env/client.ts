import { authPaths } from "@/app/auth";

type ClientEnv = Record<string, unknown>;

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readClientEnv(env: ClientEnv = import.meta.env) {
  return {
    clerkPublishableKey:
      normalizeString(env.VITE_CLERK_PUBLISHABLE_KEY) ?? normalizeString(env.CLERK_PUBLISHABLE_KEY),
    clerkSignInUrl:
      normalizeString(env.VITE_CLERK_SIGN_IN_URL) ??
      normalizeString(env.CLERK_SIGN_IN_URL) ??
      authPaths.signIn,
  };
}

export function isClerkEnabledClient(env: ClientEnv = import.meta.env) {
  return Boolean(readClientEnv(env).clerkPublishableKey);
}
