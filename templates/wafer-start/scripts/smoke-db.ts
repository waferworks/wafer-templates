import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { getDefaultSerovalPlugins } from "@tanstack/start-client-core";
import { toJSONAsync } from "seroval";

import { getDatabaseMode } from "../src/server/db/bootstrap";

const port = "4311";
const todoTitle = "DB smoke todo";
const expectedMode = getDatabaseMode(process.env);
let serverLogs = "";

if (expectedMode === "unconfigured") {
  throw new Error(
    "Configure DATABASE_URL or set PG_BOOTSTRAP_URL plus DATABASE_NAME before running bun run smoke:db."
  );
}

await run("db:migrate", process.env);
await run("build");

const child = spawn(process.execPath, ["run", "start"], {
  env: {
    ...process.env,
    PORT: port,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout?.on("data", (chunk) => {
  serverLogs += chunk.toString();
});
child.stderr?.on("data", (chunk) => {
  serverLogs += chunk.toString();
});

try {
  await waitForRoute(`http://127.0.0.1:${port}/app`);

  const [health, healthz, settings] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/health`),
    fetch(`http://127.0.0.1:${port}/healthz`),
    fetch(`http://127.0.0.1:${port}/app/settings`),
  ]);

  if (health.status !== 200) {
    throw new Error(`Expected /health to return 200, got ${health.status}`);
  }

  const healthPayload = (await health.json()) as { status?: string };
  const healthzPayload = (await healthz.json()) as { status?: string };

  if (healthPayload.status !== "ok") {
    throw new Error(`Expected /health to return ok, got ${healthPayload.status ?? "missing"}`);
  }

  if (healthz.status !== 200) {
    throw new Error(`Expected /healthz to return 200, got ${healthz.status}`);
  }

  if (healthzPayload.status !== "ok") {
    throw new Error(`Expected /healthz to return ok, got ${healthzPayload.status ?? "missing"}`);
  }

  const settingsMarkup = await settings.text();

  if (!settingsMarkup.includes("Configuration detected")) {
    throw new Error("Expected /app/settings to render the settings example page.");
  }

  const response = await fetch(
    `http://127.0.0.1:${port}${getServerFunctionPath("createTodoAction")}`,
    {
      body: await serializePayload({
        data: {
          title: todoTitle,
        },
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-tsr-serverfn": "true",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Expected createTodoAction to return 200, got ${response.status}\n${await response.text()}`
    );
  }

  const app = await fetch(`http://127.0.0.1:${port}/app`);
  const appMarkup = await app.text();

  if (!app.ok || !appMarkup.includes(todoTitle)) {
    throw new Error(`Expected /app to include the DB-backed todo "${todoTitle}".`);
  }

  console.log(
    `smoke:db passed: /health => ${health.status} (${healthPayload.status}), /healthz => ${healthz.status} (${healthzPayload.status}), mode => ${expectedMode}, mutation => ok`
  );
} catch (error) {
  throw new Error(
    `${error instanceof Error ? error.message : "DB smoke failed"}\n\n${serverLogs}`.trim()
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(resolve, 1_000);
  });
}

function getServerFunctionPath(functionName: string) {
  const dir = path.resolve(process.cwd(), ".output/server/_ssr");
  const file = fs.readdirSync(dir).find((entry) => entry.startsWith("todos-"));

  if (!file) {
    throw new Error("Could not find the built todos server-function bundle.");
  }

  const source = fs.readFileSync(path.join(dir, file), "utf8");
  const match = source.match(
    new RegExp(
      `${functionName}_createServerFn_handler = createServerRpc\\([\\s\\S]*?id: "([a-f0-9]+)"`
    )
  );

  if (!match?.[1]) {
    throw new Error(`Could not find the built server-function id for ${functionName}.`);
  }

  return `/_serverFn/${match[1]}`;
}

async function serializePayload(data: unknown) {
  return JSON.stringify(await toJSONAsync(data, { plugins: getDefaultSerovalPlugins() }));
}

async function run(scriptName: string, env: NodeJS.ProcessEnv = process.env) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", scriptName], {
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? 1}`));
    });
  });
}

async function waitForRoute(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}
