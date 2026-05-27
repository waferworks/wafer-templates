import {
  type UserRepository,
  createUnavailableUserRepository,
  validateEnsureIdentityUserInput,
} from "@/server/db/user-repository";
import type { AppUser } from "@/shared/schemas";

export function createInMemoryUserRepository(initialUsers: AppUser[] = []): UserRepository {
  const usersById = new Map(initialUsers.map((user) => [user.id, user]));
  const identityToUserId = new Map<string, string>();

  return {
    async ensureIdentityUser(input) {
      const value = validateEnsureIdentityUserInput(input);
      const identityKey = `${value.provider}:${value.providerUserId}`;
      const existingUserId = identityToUserId.get(identityKey);

      if (existingUserId) {
        const existingUser = usersById.get(existingUserId);

        if (!existingUser) {
          throw new Error(`Missing app user for identity ${identityKey}`);
        }

        return existingUser;
      }

      const user = {
        id: crypto.randomUUID(),
        primaryEmail: value.primaryEmail ?? null,
        displayName: value.displayName ?? null,
        createdAt: new Date().toISOString(),
      };

      usersById.set(user.id, user);
      identityToUserId.set(identityKey, user.id);

      return user;
    },
    async close() {},
  };
}

export { createUnavailableUserRepository };
