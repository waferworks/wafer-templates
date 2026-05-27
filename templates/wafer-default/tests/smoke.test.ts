import { describe, expect, test } from "bun:test";

import { parseSmokePaths, resolveSmokePort } from "../scripts/smoke";

describe("smoke script", () => {
  test("chooses an available port when the preferred smoke port is busy", async () => {
    const checkedPorts: number[] = [];
    const preferredPort = 4567;

    const port = await resolveSmokePort(undefined, preferredPort, async (candidate) => {
      checkedPorts.push(candidate);
      return candidate !== preferredPort;
    });

    expect(port).toBe(preferredPort + 1);
    expect(checkedPorts).toEqual([preferredPort, preferredPort + 1]);
  });

  test("honors an explicit PORT value", async () => {
    await expect(resolveSmokePort("4545", 1234)).resolves.toBe(4545);
  });

  test("ignores invalid explicit PORT values", async () => {
    await expect(resolveSmokePort("4545abc", 1234, async () => true)).resolves.toBe(1234);
    await expect(resolveSmokePort("70000", 1234, async () => true)).resolves.toBe(1234);
  });

  test("parses optional route checks", () => {
    expect(parseSmokePaths("/todos,/sign-in::Sign in,/api/todos=>503::DATABASE_URL")).toEqual([
      { path: "/todos", includes: undefined, status: 200 },
      { path: "/sign-in", includes: "Sign in", status: 200 },
      { path: "/api/todos", includes: "DATABASE_URL", status: 503 },
    ]);
  });
});
