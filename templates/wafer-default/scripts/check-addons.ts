import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { copyTemplateSource } from "./template-copy";

interface Scenario {
  addons: string[];
  databaseMode?: "bootstrap" | "unavailable";
  name: string;
}

const scenarios: Scenario[] = [
  { addons: ["db"], name: "db" },
  { addons: ["db", "example-feature"], name: "db-example-feature" },
  {
    addons: ["db", "example-feature"],
    databaseMode: "bootstrap",
    name: "db-example-feature-bootstrap",
  },
  { addons: ["auth-clerk"], name: "auth-clerk" },
  { addons: ["db", "example-feature", "auth-clerk"], name: "all" },
];

const targetDir = await mkdtemp(path.join(os.tmpdir(), "wafer-default-addons-"));

for (const scenario of scenarios) {
  if (shouldSkipScenario(scenario)) {
    console.log(`skipping ${scenario.name}: set PG_BOOTSTRAP_URL to check bootstrap DB mode`);
    continue;
  }

  const appDir = path.join(targetDir, scenario.name);

  await copyTemplateSource(process.cwd(), appDir);

  for (const addon of scenario.addons) {
    await run("bun", ["run", "add", addon], appDir);
  }

  const scenarioEnv = envFor(scenario.addons, scenario);
  await run("bun", ["install"], appDir);
  await run("bun", ["run", "lint"], appDir, scenarioEnv);
  if (scenario.databaseMode === "bootstrap") {
    await run("bun", ["run", "db:migrate"], appDir, scenarioEnv);
  }
  await run("bun", ["run", "build"], appDir, scenarioEnv);
  await run("bun", ["run", "test"], appDir, scenarioEnv);
  await run("bun", ["run", "smoke"], appDir, {
    ...scenarioEnv,
    SMOKE_PATHS: smokePathsFor(scenario.addons, scenario),
  });

  console.log(`add-on scenario passed: ${scenario.name}`);
}

console.log(`add-on checks passed in ${targetDir}`);

function smokePathsFor(addons: string[], scenario?: Scenario) {
  const checks: string[] = [];

  if (addons.includes("example-feature")) {
    checks.push("/todos");
    checks.push(
      scenario?.databaseMode === "bootstrap"
        ? "/api/todos=>200"
        : "/api/todos=>503::Database connection unavailable"
    );
  }
  if (addons.includes("auth-clerk")) {
    checks.push("/sign-in");
    checks.push("/api/auth/session::isConfigured");
  }

  return checks.join(",");
}

function shouldSkipScenario(scenario: Scenario) {
  return scenario.databaseMode === "bootstrap" && !process.env.PG_BOOTSTRAP_URL;
}

function envFor(addons: string[], scenario?: Scenario): Record<string, string> {
  const env: Record<string, string> = {};

  if (addons.includes("db")) {
    if (scenario?.databaseMode === "bootstrap") {
      env.PG_BOOTSTRAP_URL = process.env.PG_BOOTSTRAP_URL ?? "";
      env.DATABASE_NAME = `wafer_default_${scenario.name.replace(/[^a-z0-9]+/g, "_")}_${process.pid}`;
      return env;
    }

    env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:1/wafer_default";
  }

  return env;
}

async function run(command: string, args: string[], cwd: string, env: Record<string, string> = {}) {
  const child = Bun.spawn([command, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;

  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${code}`);
  }
}
