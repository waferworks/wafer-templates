import type { AppUser, EnsureIdentityUserInput } from "@/shared/schemas";

import type { UserRepository } from "@/server/db/user-repository";

export interface UserService {
  ensureIdentityUser(input: EnsureIdentityUserInput): Promise<AppUser>;
  close(): Promise<void>;
}

export function createUserService(repository: UserRepository): UserService {
  return {
    async ensureIdentityUser(input) {
      return repository.ensureIdentityUser(input);
    },
    async close() {
      await repository.close();
    },
  };
}
