import { spawn } from "node:child_process";

import { getDatabaseMode } from "../src/server/db/bootstrap";
import { createTodoRepository } from "../src/server/db/todo-repository";
import { createTodoService } from "../src/server/services/todo-service";

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

  const repository = createTodoRepository();
  const service = createTodoService(repository);

  try {
    await service.createTodo({ title: todoTitle });
    const todos = await service.listTodos();

    if (!todos.some((todo) => todo.title === todoTitle)) {
      throw new Error(`Expected DB-backed service to include "${todoTitle}".`);
    }
  } finally {
    await service.close();
  }

  console.log(
    `smoke:db passed: /health => ${health.status} (${healthPayload.status}), /healthz => ${healthz.status} (${healthzPayload.status}), mode => ${expectedMode}, mutation => ok`
  );
} catch (error) {
  throw new Error(
    `${error instanceof Error ? error.message : "DB smoke failed"}\n\n${serverLogs}`.trim()
  );
} finally {
  await stopChild(child);
}

process.exit(0);

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

async function stopChild(child: ReturnType<typeof spawn>) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await new Promise<void>((resolve) => {
    const resolveTimer = setTimeout(resolve, 2_000);
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 1_000);

    child.once("exit", () => {
      clearTimeout(resolveTimer);
      clearTimeout(killTimer);
      resolve();
    });
  });
}
