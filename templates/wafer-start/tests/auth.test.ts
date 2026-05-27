import { describe, expect, test } from "bun:test";
import { isRedirect } from "@tanstack/react-router";

import { ServiceUnavailableError } from "@/server/errors";
import { buildAppAuthState } from "@/server/functions/auth";

describe("wafer-start auth scaffold", () => {
  test("leaves the app route public when Clerk is not configured", async () => {
    await expect(buildAppAuthState(undefined, {})).resolves.toEqual({
      authEnabled: false,
      appUserId: null,
      userId: null,
    });
  });

  test("returns the signed-in provider user and app user when auth is configured", async () => {
    await expect(
      buildAppAuthState(
        () => ({
          userId: "user_123",
        }),
        {
          CLERK_SECRET_KEY: "sk_test_123",
          VITE_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        },
        {
          ensureIdentityUser: async (identity) => ({
            id: "app-user-123",
            primaryEmail: identity.primaryEmail ?? null,
            displayName: identity.displayName ?? null,
            createdAt: new Date().toISOString(),
          }),
          loadIdentityProfile: async (userId) => ({
            provider: "clerk",
            providerUserId: userId,
            primaryEmail: "hello@example.com",
            displayName: "Hello Example",
          }),
        }
      )
    ).resolves.toEqual({
      authEnabled: true,
      appUserId: "app-user-123",
      userId: "user_123",
    });
  });

  test("redirects signed-out users to the starter sign-in route when Clerk is configured", async () => {
    try {
      await buildAppAuthState(
        () => ({
          userId: null,
        }),
        {
          CLERK_SECRET_KEY: "sk_test_123",
          VITE_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        }
      );
    } catch (error) {
      expect(isRedirect(error)).toBeTrue();

      if (!isRedirect(error)) {
        throw error;
      }

      expect(error.options.href).toBe("/sign-in");
      return;
    }

    throw new Error("expected buildAppAuthState() to redirect signed-out users");
  });

  test("keeps the auth boundary working when user provisioning is unavailable", async () => {
    await expect(
      buildAppAuthState(
        () => ({
          userId: "user_123",
        }),
        {
          CLERK_SECRET_KEY: "sk_test_123",
          VITE_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        },
        {
          ensureIdentityUser: async () => {
            throw new ServiceUnavailableError("db unavailable");
          },
          loadIdentityProfile: async (userId) => ({
            provider: "clerk",
            providerUserId: userId,
          }),
        }
      )
    ).resolves.toEqual({
      authEnabled: true,
      appUserId: null,
      userId: "user_123",
    });
  });
});
