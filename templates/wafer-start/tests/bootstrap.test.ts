import { describe, expect, test } from "bun:test";

import { prepareDatabaseEnv } from "@/../scripts/_shared";
import {
  isClerkEnabled,
  readClerkEnv,
  readServerEnv,
  resolveConfiguredDatabaseUrl,
} from "@/env/server";
import { getDatabaseMode, resolveDatabaseUrl } from "@/server/db/bootstrap";

describe("database bootstrap", () => {
  test("normalizes blank values to undefined and supplies host defaults", () => {
    expect(
      readServerEnv({
        DATABASE_NAME: "",
        DATABASE_URL: "",
        HOST: "",
        PG_BOOTSTRAP_URL: "",
        PORT: "",
      })
    ).toMatchObject({
      DATABASE_NAME: undefined,
      DATABASE_URL: undefined,
      HOST: "127.0.0.1",
      PG_BOOTSTRAP_URL: undefined,
      PORT: "3000",
    });
  });

  test("prefers DATABASE_URL when it exists", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://db.example.com/app",
        DATABASE_NAME: "ignored",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/wafer",
      })
    ).toBe("postgresql://db.example.com/app");
  });

  test("derives the same direct-or-bootstrap URL in the env helper", () => {
    expect(
      resolveConfiguredDatabaseUrl({
        DATABASE_NAME: "hello_app",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/wafer",
      })
    ).toBe("postgresql://postgres@localhost/hello_app");
  });

  test("derives a project database URL from bootstrap vars", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_NAME: "hello_app",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/wafer",
      })
    ).toBe("postgresql://postgres@localhost/hello_app");
  });

  test("returns undefined when no database config is present", () => {
    expect(resolveDatabaseUrl({})).toBeUndefined();
  });

  test("rejects partial bootstrap config", () => {
    expect(() =>
      readServerEnv({
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/wafer",
      })
    ).toThrow("DATABASE_NAME is required");
  });

  test("preserves unrelated env vars in the runtime wrappers", async () => {
    const env = await prepareDatabaseEnv(
      { migrate: false },
      {
        CUSTOM_SECRET: "keep-me",
        DATABASE_NAME: "",
        DATABASE_URL: "",
        PG_BOOTSTRAP_URL: "",
      }
    );

    expect(env.CUSTOM_SECRET).toBe("keep-me");
    expect(env.APP_DATABASE_MODE).toBe("unconfigured");
  });

  test("preserves bootstrap mode when startup overlays DATABASE_URL", () => {
    expect(
      getDatabaseMode({
        APP_DATABASE_MODE: "bootstrap",
        DATABASE_NAME: "hello_app",
        DATABASE_URL: "postgresql://postgres@localhost/hello_app",
        PG_BOOTSTRAP_URL: "postgresql://postgres@localhost/wafer",
      })
    ).toBe("bootstrap");
  });

  test("treats Clerk auth as disabled when its keys are absent", () => {
    expect(readClerkEnv({})).toMatchObject({
      clerkSignInFallbackRedirectUrl: "/app",
      clerkSignInUrl: "/sign-in",
      enabled: false,
    });
    expect(isClerkEnabled({})).toBeFalse();
  });

  test("enables Clerk auth when both keys are present", () => {
    expect(
      readClerkEnv({
        CLERK_SECRET_KEY: "sk_test_123",
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      })
    ).toMatchObject({
      clerkPublishableKey: "pk_test_123",
      clerkSecretKey: "sk_test_123",
      enabled: true,
    });
  });

  test("rejects partial Clerk config", () => {
    expect(() =>
      readServerEnv({
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      })
    ).toThrow("CLERK_SECRET_KEY is required");
  });
});
