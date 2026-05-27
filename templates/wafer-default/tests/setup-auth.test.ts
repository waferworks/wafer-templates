import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { hasAuthAddon, mergeAuthEnvDefaults, setupAuth } from "../scripts/setup-auth";
import { copyTemplateSource } from "../scripts/template-copy";

const templateRoot = path.resolve(import.meta.dir, "..");

describe("auth setup", () => {
  test("adds Clerk route defaults and mirrors non-Vite publishable keys", () => {
    const env = mergeAuthEnvDefaults(
      "CLERK_PUBLISHABLE_KEY=pk_test_123\nCLERK_SECRET_KEY=sk_test_123\n"
    );

    expect(env).toContain("VITE_CLERK_SIGN_IN_URL=/sign-in");
    expect(env).toContain("VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/");
    expect(env).toContain("VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/");
    expect(env).not.toContain("VITE_CLERK_SIGN_UP_URL=");
    expect(env).toContain("VITE_CLERK_PUBLISHABLE_KEY=pk_test_123");
    expect(env).toContain("CLERK_SECRET_KEY=sk_test_123");
  });

  test("keeps existing Clerk route choices", () => {
    const env = mergeAuthEnvDefaults("VITE_CLERK_SIGN_IN_URL=/login\n");

    expect(env).toContain("VITE_CLERK_SIGN_IN_URL=/login");
    expect(env).not.toContain("VITE_CLERK_SIGN_IN_URL=/sign-in");
  });

  test("dry run leaves the template unchanged", async () => {
    const rootDir = await copyTemplate();
    const hadAuthAddon = await hasAuthAddon(rootDir);

    await setupAuth({
      dryRun: true,
      rootDir,
      skipInstall: true,
      skipLogin: true,
      skipVerify: true,
    });

    expect(await hasAuthAddon(rootDir)).toBe(hadAuthAddon);
  });

  test("runs the Clerk browser login, app create/link, config, env pull, and doctor flow", async () => {
    const rootDir = await copyTemplate();
    const { binPath, logPath } = await writeFakeClerk(rootDir);

    await setupAuth({
      clerkBin: binPath,
      rootDir,
      skipInstall: true,
      skipVerify: true,
    });

    const log = (await readFile(logPath, "utf8")).trim().split("\n");
    const env = await readFile(path.join(rootDir, ".env.local"), "utf8");

    expect(log[0]).toBe("auth login --mode agent");
    expect(log[1]).toBe("apps create my-app --mode agent");
    expect(log[2]).toBe("link --app app_fake123 --mode agent");
    expect(log[3]?.startsWith("config pull --output ")).toBe(true);
    expect(log[3]).toEndWith("--mode agent");
    expect(log[4]).toContain('config patch --dry-run --json {"auth_email"');
    expect(log[4]).toContain('"auth_username":{"used_for_sign_in":false,"used_for_sign_up":false}');
    expect(log[4]).toContain('"auth_password":{"used_for_sign_in":false,"used_for_sign_up":false}');
    expect(log[5]).toContain("config patch --json");
    expect(log[5]).toContain("--yes --mode agent");
    expect(log[6]?.startsWith("config pull --output ")).toBe(true);
    expect(log[6]).toEndWith("--mode agent");
    expect(log[7]).toBe("env pull --mode agent");
    expect(log[8]).toBe("doctor --mode agent");
    expect(await hasAuthAddon(rootDir)).toBe(true);
    expect(env).toContain("CLERK_SECRET_KEY=sk_test_fake");
    expect(env).toContain("VITE_CLERK_PUBLISHABLE_KEY=pk_test_fake");
  });

  test("adds recovery guidance when Clerk CLI cannot run agent mode", async () => {
    const rootDir = await copyTemplate();
    const { binPath } = await writeFakeClerk(rootDir, {
      failCommand: "auth login --mode agent",
    });

    await expect(
      setupAuth({
        clerkBin: binPath,
        rootDir,
        skipInstall: true,
        skipVerify: true,
      })
    ).rejects.toThrow("update Clerk CLI with: bun add -g clerk");
  });

  test("uses an explicit Clerk app id instead of creating a new app", async () => {
    const rootDir = await copyTemplate();
    const { binPath, logPath } = await writeFakeClerk(rootDir);

    await setupAuth({
      clerkAppId: "app_existing123",
      clerkBin: binPath,
      rootDir,
      skipInstall: true,
      skipVerify: true,
    });

    const log = (await readFile(logPath, "utf8")).trim().split("\n");
    expect(log).not.toContain("apps create my-app --mode agent");
    expect(log[1]).toBe("link --app app_existing123 --mode agent");
  });

  test("extracts Clerk app ids from agent output", async () => {
    const { extractClerkAppId } = await import("../scripts/setup-auth");

    expect(extractClerkAppId('{"id":"app_json123"}')).toBe("app_json123");
    expect(extractClerkAppId('{"data":{"application":{"id":"app_nested123"}}}')).toBe(
      "app_nested123"
    );
    expect(extractClerkAppId("Created application app_text123")).toBe("app_text123");
  });

  test("parses an explicit Clerk app id for CLI fallback", async () => {
    const { parseArgs } = await import("../scripts/setup-auth");

    expect(parseArgs(["--app", "app_existing123"]).clerkAppId).toBe("app_existing123");
    expect(parseArgs(["--clerk-app", "app_named123"]).clerkAppId).toBe("app_named123");
    expect(() => parseArgs(["--app", "--skip-login"])).toThrow("--app requires a value");
    expect(() => parseArgs(["--app", "not-an-app"])).toThrow("Invalid Clerk app id");
  });

  test("detects when the auth add-on is installed", async () => {
    const rootDir = await copyTemplate();
    const packagePath = path.join(rootDir, "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

    packageJson.waferAddons = ["auth-clerk"];
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

    expect(await hasAuthAddon(rootDir)).toBe(true);
  });
});

async function copyTemplate() {
  const parentDir = await mkdtemp(path.join(os.tmpdir(), "wafer-default-auth-"));
  const rootDir = path.join(parentDir, "my-app");
  await mkdir(rootDir);
  await copyTemplateSource(templateRoot, rootDir);
  return rootDir;
}

async function writeFakeClerk(rootDir: string, options: { failCommand?: string } = {}) {
  const binDir = path.join(rootDir, "bin");
  const binPath = path.join(binDir, "clerk");
  const logPath = path.join(rootDir, "clerk.log");

  await mkdir(binDir, { recursive: true });
  await writeFile(
    binPath,
    `#!/bin/sh
args="$*"
printf "%s\\n" "$args" >> ${shellQuote(logPath)}
if [ "$args" = ${shellQuote(options.failCommand ?? "__never__")} ]; then
  echo "unknown option: --mode" >&2
  exit 2
fi
if [ "$args" = "apps create my-app --mode agent" ]; then
  printf '{"id":"app_fake123","name":"my-app"}\\n'
fi
if [ "$args" = "env pull --mode agent" ]; then
  printf "CLERK_PUBLISHABLE_KEY=pk_test_fake\\nCLERK_SECRET_KEY=sk_test_fake\\n" > .env.local
fi
if [ "$1 $2" = "config pull" ]; then
  output=""
  while [ "$#" -gt 0 ]; do
    if [ "$1" = "--output" ]; then
      output="$2"
      break
    fi
    shift
  done
  printf '{"auth_email":{"used_for_sign_in":true,"used_for_sign_up":true},"auth_username":{"used_for_sign_in":false,"used_for_sign_up":false},"auth_phone_number":{"used_for_sign_in":false,"used_for_sign_up":false},"auth_password":{"used_for_sign_in":false,"used_for_sign_up":false}}\\n' > "$output"
fi
exit 0
`
  );
  await chmod(binPath, 0o755);

  return { binPath, logPath };
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
