import { spawn } from "node:child_process";

const port = "4310";
let serverLogs = "";

await run("build");

const child = spawn(process.execPath, ["run", "start"], {
  env: {
    ...process.env,
    DATABASE_NAME: "",
    DATABASE_URL: "",
    PG_BOOTSTRAP_URL: "",
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
  await waitForRoute(`http://127.0.0.1:${port}/`);
  await waitForRoute(`http://127.0.0.1:${port}/app`);
  await waitForRoute(`http://127.0.0.1:${port}/app/settings`);

  const [home, app, missing, settings, health, healthz] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/`),
    fetch(`http://127.0.0.1:${port}/app`),
    fetch(`http://127.0.0.1:${port}/does-not-exist`),
    fetch(`http://127.0.0.1:${port}/app/settings`),
    fetch(`http://127.0.0.1:${port}/health`),
    fetch(`http://127.0.0.1:${port}/healthz`),
  ]);

  const homeMarkup = await home.text();
  const appMarkup = await app.text();
  const missingMarkup = await missing.text();
  const settingsMarkup = await settings.text();

  if (!home.ok || !homeMarkup.includes("Ship the first version on Wafer")) {
    throw new Error(`Expected / to return 200, got ${home.status}`);
  }

  if (!app.ok || !appMarkup.includes("Server functions over a plain service layer")) {
    throw new Error(`Expected /app to return 200, got ${app.status}`);
  }

  if (!missingMarkup.includes("This page does not exist.")) {
    throw new Error("Expected the production 404 page to render custom not-found copy.");
  }

  if (!settings.ok || !settingsMarkup.includes("Configuration detected")) {
    throw new Error(`Expected /app/settings to return 200, got ${settings.status}`);
  }

  if (health.status !== 503) {
    throw new Error(`Expected /health to return 503, got ${health.status}`);
  }

  if (healthz.status !== 503) {
    throw new Error(`Expected /healthz to return 503, got ${healthz.status}`);
  }

  const payload = (await health.json()) as { status?: string };
  const healthzPayload = (await healthz.json()) as { status?: string };

  if (payload.status !== "waiting-for-database") {
    throw new Error("Expected /health to return a status field.");
  }

  if (healthzPayload.status !== "waiting-for-database") {
    throw new Error("Expected /healthz to mirror /health.");
  }

  console.log(
    `smoke passed: / => ${home.status}, /app => ${app.status}, /404 => ${missing.status}, /app/settings => ${settings.status}, /health => ${health.status} (${payload.status}), /healthz => ${healthz.status} (${healthzPayload.status})`
  );
} catch (error) {
  throw new Error(
    `${error instanceof Error ? error.message : "Smoke failed"}\n\n${serverLogs}`.trim()
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(resolve, 1_000);
  });
}

async function run(scriptName: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", scriptName], {
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
