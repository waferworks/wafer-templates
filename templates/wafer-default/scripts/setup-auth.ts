import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { installAddon } from "./add";

interface PackageJson {
  name?: string;
  waferAddons?: string[];
}

export interface AuthEnvDefaults {
  signInUrl?: string;
  signInFallbackRedirectUrl?: string;
  signUpFallbackRedirectUrl?: string;
}

export interface SetupAuthOptions {
  rootDir?: string;
  dryRun?: boolean;
  clerkAppId?: string;
  skipLogin?: boolean;
  skipLink?: boolean;
  skipVerify?: boolean;
  skipInstall?: boolean;
  relink?: boolean;
  clerkBin?: string;
}

const authAddonName = "auth-clerk";
const clerkAppIdRegex = /\bapp_[A-Za-z0-9_-]+\b/;
const clerkAppIdValueRegex = /^app_[A-Za-z0-9_-]+$/;
const defaultAuthEnv: Required<AuthEnvDefaults> = {
  signInUrl: "/sign-in",
  signInFallbackRedirectUrl: "/",
  signUpFallbackRedirectUrl: "/",
};
const fallbackWaferClerkAuthConfigPatch = {
  auth_email: { used_for_sign_in: true, used_for_sign_up: true },
  auth_password: { used_for_sign_in: false, used_for_sign_up: false },
  auth_phone_number: { used_for_sign_in: false, used_for_sign_up: false },
  auth_username: { used_for_sign_in: false, used_for_sign_up: false },
};

export async function setupAuth(options: SetupAuthOptions = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const clerkBin = options.clerkBin ?? "clerk";

  console.log(
    "Clerk is an external auth provider that handles sign-in emails and sessions, so your app does not have to build auth itself."
  );
  console.log(
    "This setup asks you to sign into Clerk once in your browser, then creates and configures the auth project for you."
  );

  if (!(await hasAuthAddon(rootDir))) {
    await installAuthAddon(rootDir, Boolean(options.dryRun));
  }

  if (!options.skipInstall) {
    await runOrPrint("bun", ["install"], rootDir, Boolean(options.dryRun));
  }

  if (!options.dryRun && !(await commandExists(clerkBin))) {
    throw new Error(
      [
        "Clerk CLI is required for browser-based auth setup.",
        "Wafer runtimes include it by default.",
        "For local setup, install it once with: bun add -g clerk",
        "Then rerun: bun run setup:auth",
      ].join("\n")
    );
  }

  if (!options.skipLogin) {
    console.log("Next step: Clerk will ask you to finish sign-in in your browser.");
    await runClerkAgentCommand(clerkBin, ["auth", "login"], rootDir, Boolean(options.dryRun));
  }

  if (!options.skipLink && (options.relink || !(await hasClerkProjectLink(rootDir)))) {
    const clerkAppId =
      options.clerkAppId ??
      (await createClerkAppForProject(clerkBin, rootDir, Boolean(options.dryRun)));
    console.log("Next step: connect this app to the Clerk auth project.");
    await runClerkAgentCommand(
      clerkBin,
      ["link", "--app", clerkAppId],
      rootDir,
      Boolean(options.dryRun)
    );
  } else if (!options.skipLink) {
    console.log("Found a Clerk project link; skipping Clerk app creation.");
  }

  await configureClerkAuthDefaults(clerkBin, rootDir, Boolean(options.dryRun));
  await runClerkAgentCommand(clerkBin, ["env", "pull"], rootDir, Boolean(options.dryRun));
  await writeAuthEnvDefaults(
    path.join(rootDir, ".env.local"),
    defaultAuthEnv,
    Boolean(options.dryRun)
  );

  await runClerkAgentCommand(clerkBin, ["doctor"], rootDir, Boolean(options.dryRun));

  if (!options.skipVerify) {
    await runOrPrint("bun", ["run", "build"], rootDir, Boolean(options.dryRun));
    await runOrPrint("bun", ["run", "test"], rootDir, Boolean(options.dryRun));
    await runOrPrint("bun", ["run", "smoke"], rootDir, Boolean(options.dryRun));
  }

  console.log("Auth setup finished. Open /sign-in to try Clerk.");
}

export async function hasAuthAddon(rootDir: string) {
  const packageJson = JSON.parse(
    await readFile(path.join(rootDir, "package.json"), "utf8")
  ) as PackageJson;
  return packageJson.waferAddons?.includes(authAddonName) ?? false;
}

export async function hasClerkProjectLink(rootDir: string) {
  return fileExists(path.join(rootDir, ".clerk", "config.json"));
}

export function mergeAuthEnvDefaults(contents: string, defaults: AuthEnvDefaults = defaultAuthEnv) {
  const lines = contents.trimEnd() ? contents.trimEnd().split(/\r?\n/) : [];
  const next = [...lines];

  appendMissing(next, "VITE_CLERK_SIGN_IN_URL", defaults.signInUrl ?? defaultAuthEnv.signInUrl);
  appendMissing(
    next,
    "VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
    defaults.signInFallbackRedirectUrl ?? defaultAuthEnv.signInFallbackRedirectUrl
  );
  appendMissing(
    next,
    "VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
    defaults.signUpFallbackRedirectUrl ?? defaultAuthEnv.signUpFallbackRedirectUrl
  );

  const publishableKey = readEnvValue(next, "CLERK_PUBLISHABLE_KEY");
  if (publishableKey && !hasEnvKey(next, "VITE_CLERK_PUBLISHABLE_KEY")) {
    next.push(`VITE_CLERK_PUBLISHABLE_KEY=${publishableKey}`);
  }

  return `${next.join("\n")}\n`;
}

export function buildWaferClerkAuthConfigPatch(config: unknown) {
  if (!isRecord(config)) {
    throw new Error("Clerk config pull did not return a JSON object.");
  }

  const emailKey = findConfigKey(config, ["auth_email", "auth_email_address"]);
  if (!emailKey) {
    throw new Error(
      [
        "Could not find Clerk email auth settings in config pull output.",
        "Run: clerk config schema --keys auth_email auth_email_address auth_username auth_password",
        "Then update setup-auth.ts to match the current Clerk CLI schema.",
      ].join("\n")
    );
  }

  const patch: Record<string, Record<string, boolean>> = {
    [emailKey]: { used_for_sign_in: true, used_for_sign_up: true },
  };

  for (const key of [
    findConfigKey(config, ["auth_username"]),
    findConfigKey(config, ["auth_phone_number", "auth_phone"]),
    findConfigKey(config, ["auth_password"]),
  ]) {
    if (!key) {
      continue;
    }

    patch[key] = { used_for_sign_in: false, used_for_sign_up: false };
  }

  return patch;
}

export function extractClerkAppId(output: string) {
  const fromJson = extractClerkAppIdFromJson(output);
  if (fromJson) {
    return fromJson;
  }

  return output.match(clerkAppIdRegex)?.[0];
}

async function createClerkAppForProject(clerkBin: string, rootDir: string, dryRun: boolean) {
  const appName = await getClerkAppName(rootDir);
  console.log("Next step: create the Clerk auth project for this app.");

  if (dryRun) {
    await runClerkAgentCommand(clerkBin, ["apps", "create", appName], rootDir, true);
    return "app_dry_run";
  }

  const output = await runClerkAgentCommandWithOutput(
    clerkBin,
    ["apps", "create", appName],
    rootDir
  );
  const appId = extractClerkAppId(output);

  if (!appId) {
    throw new Error(
      [
        "Clerk created an app, but Wafer could not read the new app id from the CLI output.",
        "Run: clerk apps list",
        "Then rerun: bun run setup:auth -- --app app_xxx",
      ].join("\n")
    );
  }

  return appId;
}

async function getClerkAppName(rootDir: string) {
  const packageJsonPath = path.join(rootDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
  const name =
    packageJson.name && packageJson.name !== "wafer-default"
      ? packageJson.name
      : path.basename(rootDir);

  return normalizeClerkAppName(name);
}

function normalizeClerkAppName(name: string) {
  return (
    name
      .replace(/^@/, "")
      .replaceAll("/", "-")
      .replace(/[^A-Za-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "wafer-app"
  );
}

function extractClerkAppIdFromJson(output: string) {
  try {
    return findClerkAppId(JSON.parse(output));
  } catch {
    return undefined;
  }
}

function findClerkAppId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.match(clerkAppIdRegex)?.[0];
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const appId = findClerkAppId(item);
      if (appId) {
        return appId;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["id", "app_id", "application_id"]) {
    const appId = findClerkAppId(value[key]);
    if (appId) {
      return appId;
    }
  }

  for (const item of Object.values(value)) {
    const appId = findClerkAppId(item);
    if (appId) {
      return appId;
    }
  }

  return undefined;
}

async function configureClerkAuthDefaults(clerkBin: string, rootDir: string, dryRun: boolean) {
  console.log("Next step: configure Clerk for Wafer's email-code sign-in default.");

  if (dryRun) {
    await runClerkAgentCommand(
      clerkBin,
      ["config", "patch", "--dry-run", "--json", JSON.stringify(fallbackWaferClerkAuthConfigPatch)],
      rootDir,
      true
    );
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "wafer-clerk-config-"));
  const beforePath = path.join(tempDir, "before.json");
  const afterPath = path.join(tempDir, "after.json");

  try {
    await runClerkAgentCommand(
      clerkBin,
      ["config", "pull", "--output", beforePath],
      rootDir,
      false
    );
    const beforeConfig = JSON.parse(await readFile(beforePath, "utf8"));
    const patch = buildWaferClerkAuthConfigPatch(beforeConfig);
    const patchJson = JSON.stringify(patch);

    await runClerkAgentCommand(
      clerkBin,
      ["config", "patch", "--dry-run", "--json", patchJson],
      rootDir,
      false
    );
    await runClerkAgentCommand(
      clerkBin,
      ["config", "patch", "--json", patchJson, "--yes"],
      rootDir,
      false
    );
    await runClerkAgentCommand(clerkBin, ["config", "pull", "--output", afterPath], rootDir, false);
    const afterConfig = JSON.parse(await readFile(afterPath, "utf8"));
    verifyClerkAuthConfigPatch(afterConfig, patch);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

function verifyClerkAuthConfigPatch(
  config: unknown,
  patch: Record<string, Record<string, boolean>>
) {
  if (!isRecord(config)) {
    throw new Error("Clerk config verification did not return a JSON object.");
  }

  for (const [section, flags] of Object.entries(patch)) {
    const current = config[section];
    if (!isRecord(current)) {
      throw new Error(`Clerk config did not retain "${section}" after patch.`);
    }

    for (const [flag, value] of Object.entries(flags)) {
      if (current[flag] !== value) {
        throw new Error(
          [
            `Clerk config did not retain "${section}.${flag}" after patch.`,
            "Run: clerk config schema",
            "Then update setup-auth.ts to match the current Clerk CLI schema.",
          ].join("\n")
        );
      }
    }
  }
}

async function installAuthAddon(rootDir: string, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] bun run add ${authAddonName}`);
    return;
  }

  const result = await installAddon({ rootDir, addonName: authAddonName });
  console.log(`installed add-on: ${result.addonName}`);
  for (const file of result.copiedFiles) {
    console.log(`copied ${file}`);
  }
  for (const file of result.patchedFiles) {
    console.log(`patched ${file}`);
  }
}

async function writeAuthEnvDefaults(filePath: string, defaults: AuthEnvDefaults, dryRun: boolean) {
  const contents = await readOptionalFile(filePath);
  const next = mergeAuthEnvDefaults(contents, defaults);

  if (next === contents) {
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] update ${path.basename(filePath)} with Wafer Clerk route defaults`);
    return;
  }

  await writeFile(filePath, next);
}

async function readOptionalFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string) {
  if (command.includes(path.sep)) {
    try {
      await access(command, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn([command, "--version"], {
      stdout: "ignore",
      stderr: "ignore",
    });
  } catch {
    return false;
  }

  return (await child.exited) === 0;
}

async function runOrPrint(command: string, args: string[], cwd: string, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] ${[command, ...args].join(" ")}`);
    return;
  }

  const child = Bun.spawn([command, ...args], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;

  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${code}`);
  }
}

async function runWithOutput(command: string, args: string[], cwd: string) {
  const child = Bun.spawn([command, ...args], {
    cwd,
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    child.stdout ? new Response(child.stdout).text() : "",
    child.stderr ? new Response(child.stderr).text() : "",
    child.exited,
  ]);

  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }

  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${code}`);
  }

  return `${stdout}\n${stderr}`;
}

async function runClerkAgentCommand(command: string, args: string[], cwd: string, dryRun: boolean) {
  const commandArgs = [...args, "--mode", "agent"];

  try {
    await runOrPrint(command, commandArgs, cwd, dryRun);
  } catch (error) {
    throw new Error(addClerkRecoveryGuidance(error));
  }
}

async function runClerkAgentCommandWithOutput(command: string, args: string[], cwd: string) {
  const commandArgs = [...args, "--mode", "agent"];

  try {
    return await runWithOutput(command, commandArgs, cwd);
  } catch (error) {
    throw new Error(addClerkRecoveryGuidance(error));
  }
}

function addClerkRecoveryGuidance(error: unknown) {
  const baseMessage = error instanceof Error ? error.message : String(error);
  return [
    baseMessage,
    "If Clerk reported an unknown --mode option, update Clerk CLI with: bun add -g clerk",
    "If Clerk cannot create or link the app automatically, run: clerk apps list",
    "Then rerun: bun run setup:auth -- --app app_xxx",
  ].join("\n");
}

function appendMissing(lines: string[], key: string, value: string) {
  if (!hasEnvKey(lines, key)) {
    lines.push(`${key}=${value}`);
  }
}

function hasEnvKey(lines: string[], key: string) {
  return lines.some((line) => line.trimStart().startsWith(`${key}=`));
}

function readEnvValue(lines: string[], key: string) {
  const line = lines.find((candidate) => candidate.trimStart().startsWith(`${key}=`));
  return line?.slice(line.indexOf("=") + 1).trim() || undefined;
}

function findConfigKey(config: Record<string, unknown>, candidates: string[]) {
  return candidates.find((key) => Object.hasOwn(config, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseArgs(args: string[]) {
  const clerkAppId = readFlagValue(args, ["--app", "--clerk-app"]);

  if (clerkAppId && !clerkAppIdValueRegex.test(clerkAppId)) {
    throw new Error(`Invalid Clerk app id "${clerkAppId}". Expected app_xxx.`);
  }

  return {
    clerkAppId,
    dryRun: args.includes("--dry-run"),
    relink: args.includes("--relink"),
    skipLogin: args.includes("--skip-login"),
    skipLink: args.includes("--skip-link"),
    skipVerify: args.includes("--skip-verify"),
    skipInstall: args.includes("--skip-install"),
  } satisfies SetupAuthOptions;
}

function readFlagValue(args: string[], flags: string[]) {
  for (let index = 0; index < args.length; index += 1) {
    if (flags.includes(args[index] ?? "")) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${args[index]} requires a value.`);
      }

      return value;
    }
  }

  return undefined;
}

if (import.meta.main) {
  setupAuth(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
