import { and, sql as drizzleSql, eq } from "drizzle-orm";

import { resolveConfiguredDatabaseUrl } from "@/env/server";
import { ServiceUnavailableError } from "@/server/errors";
import {
  type AppUser,
  type EnsureIdentityUserInput,
  appUserSchema,
  ensureIdentityUserInputSchema,
} from "@/shared/schemas";

import { createDatabaseConnection } from "./connection";
import { authIdentities, users } from "./schema";

export interface UserRepository {
  ensureIdentityUser(input: EnsureIdentityUserInput): Promise<AppUser>;
  close(): Promise<void>;
}

type UserRow = {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  createdAt: Date;
};

export function createUserRepository(databaseUrl = resolveConfiguredDatabaseUrl()): UserRepository {
  if (!databaseUrl) {
    return createUnavailableUserRepository();
  }

  const { db, sql: client } = createDatabaseConnection(databaseUrl);

  return {
    async ensureIdentityUser(input) {
      const value = validateEnsureIdentityUserInput(input);

      return db.transaction(async (tx) => {
        // Serialize first-time provisioning per external identity so duplicate sign-ins
        // cannot race into multiple app-owned users.
        await tx.execute(
          drizzleSql`select pg_advisory_xact_lock(hashtext(${`${value.provider}:${value.providerUserId}`}))`
        );

        const [existing] = await tx
          .select({
            user: users,
          })
          .from(authIdentities)
          .innerJoin(users, eq(authIdentities.userId, users.id))
          .where(
            and(
              eq(authIdentities.provider, value.provider),
              eq(authIdentities.providerUserId, value.providerUserId)
            )
          )
          .limit(1);

        if (existing?.user) {
          return mapUserRow(existing.user);
        }

        const [user] = await tx
          .insert(users)
          .values({
            primaryEmail: value.primaryEmail ?? null,
            displayName: value.displayName ?? null,
          })
          .returning();

        if (!user) {
          throw new Error("Expected user insert to return a row.");
        }

        await tx.insert(authIdentities).values({
          userId: user.id,
          provider: value.provider,
          providerUserId: value.providerUserId,
          primaryEmail: value.primaryEmail ?? null,
        });

        return mapUserRow(user);
      });
    },
    async close() {
      await client.end({ timeout: 1 });
    },
  };
}

export function createUnavailableUserRepository(): UserRepository {
  return {
    async ensureIdentityUser() {
      throw new ServiceUnavailableError(
        "The database is not configured yet. Set DATABASE_URL or the Wafer bootstrap vars."
      );
    },
    async close() {},
  };
}

export function validateEnsureIdentityUserInput(input: EnsureIdentityUserInput) {
  return ensureIdentityUserInputSchema.parse(input);
}

function mapUserRow(row: UserRow): AppUser {
  return appUserSchema.parse({
    id: row.id,
    primaryEmail: row.primaryEmail,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
  });
}
