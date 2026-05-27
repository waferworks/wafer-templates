import { auth } from "@clerk/tanstack-react-start/server";
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { authPaths } from "@/app/auth";
import { readClerkEnv } from "@/env/server";
import { ServiceUnavailableError } from "@/server/errors";
import { getUserService } from "@/server/runtime";
import type { AppUser, EnsureIdentityUserInput } from "@/shared/schemas";

type AuthReaderResult = {
  userId: string | null;
};

type AuthReader = () => Promise<AuthReaderResult> | AuthReaderResult;

interface BuildAppAuthStateOptions {
  ensureIdentityUser?: (identity: EnsureIdentityUserInput) => Promise<AppUser>;
  loadIdentityProfile?: (userId: string) => Promise<EnsureIdentityUserInput>;
}

export interface AppAuthState {
  authEnabled: boolean;
  appUserId: string | null;
  userId: string | null;
}

export async function buildAppAuthState(
  readAuth: AuthReader = auth,
  env: Record<string, string | undefined> = process.env,
  options: BuildAppAuthStateOptions = {}
): Promise<AppAuthState> {
  if (!readClerkEnv(env).enabled) {
    return {
      authEnabled: false,
      appUserId: null,
      userId: null,
    };
  }

  const { userId } = await readAuth();

  if (!userId) {
    throw redirect({
      href: authPaths.signIn,
    });
  }

  const ensureIdentityUser = options.ensureIdentityUser ?? getUserService().ensureIdentityUser;
  const loadIdentityProfile = options.loadIdentityProfile ?? loadClerkIdentityProfile;

  try {
    const identity = await loadIdentityProfile(userId);
    const appUser = await ensureIdentityUser(identity);

    return {
      authEnabled: true,
      appUserId: appUser.id,
      userId,
    };
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return {
        authEnabled: true,
        appUserId: null,
        userId,
      };
    }

    throw error;
  }
}

export const loadAppAuth = createServerFn({ method: "GET" }).handler(async () => {
  return buildAppAuthState();
});

async function loadClerkIdentityProfile(userId: string): Promise<EnsureIdentityUserInput> {
  const user = await clerkClient().users.getUser(userId);
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return {
    provider: "clerk",
    providerUserId: user.id,
    primaryEmail,
    displayName: displayName || user.username || undefined,
  };
}
