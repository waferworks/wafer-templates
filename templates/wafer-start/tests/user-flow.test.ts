import { describe, expect, test } from "bun:test";

import { createUserService } from "@/server/services/user-service";
import { createInMemoryUserRepository } from "./support/user-repository";

describe("wafer-start user flow", () => {
  test("creates one app user per provider identity and reuses it on repeat sign-ins", async () => {
    const service = createUserService(createInMemoryUserRepository());

    const first = await service.ensureIdentityUser({
      provider: "clerk",
      providerUserId: "user_123",
    });
    const second = await service.ensureIdentityUser({
      provider: "clerk",
      providerUserId: "user_123",
    });

    expect(first.id).toBe(second.id);
  });

  test("creates distinct app users for distinct provider identities", async () => {
    const service = createUserService(createInMemoryUserRepository());

    const first = await service.ensureIdentityUser({
      provider: "clerk",
      providerUserId: "user_123",
    });
    const second = await service.ensureIdentityUser({
      provider: "workos",
      providerUserId: "user_123",
    });

    expect(first.id).not.toBe(second.id);
  });
});
