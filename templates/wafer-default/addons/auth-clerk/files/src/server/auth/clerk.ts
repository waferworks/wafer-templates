import { createClerkClient } from "@clerk/backend";

export interface ClerkServerEnv {
  clerkSecretKey?: string;
  clerkPublishableKey?: string;
  authorizedParties: string[];
}

export interface ClerkAuthContext {
  sessionId: string | null;
  userId: string;
  orgId: string | null;
}

export function readClerkServerEnv(env: Record<string, string | undefined> = process.env) {
  return {
    authorizedParties: parseList(env.CLERK_AUTHORIZED_PARTIES),
    clerkPublishableKey:
      env.CLERK_PUBLISHABLE_KEY?.trim() || env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || undefined,
    clerkSecretKey: env.CLERK_SECRET_KEY?.trim() || undefined,
  } satisfies ClerkServerEnv;
}

export function isClerkServerConfigured(env: Record<string, string | undefined> = process.env) {
  const config = readClerkServerEnv(env);
  return Boolean(config.clerkSecretKey && config.clerkPublishableKey);
}

export async function authenticateClerkRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env
): Promise<ClerkAuthContext | null> {
  const config = readClerkServerEnv(env);

  if (!config.clerkSecretKey || !config.clerkPublishableKey) {
    return null;
  }

  const client = createClerkClient({
    publishableKey: config.clerkPublishableKey,
    secretKey: config.clerkSecretKey,
  });
  const state = await client.authenticateRequest(request, {
    authorizedParties: config.authorizedParties.length > 0 ? config.authorizedParties : undefined,
  });

  if (!state.isAuthenticated) {
    return null;
  }

  const auth = state.toAuth();
  if (!auth.userId) {
    return null;
  }

  return {
    orgId: auth.orgId ?? null,
    sessionId: auth.sessionId ?? null,
    userId: auth.userId,
  };
}

function parseList(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}
