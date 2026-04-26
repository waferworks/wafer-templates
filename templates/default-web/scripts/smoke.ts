const port = Number.parseInt(process.env.PORT ?? "4321", 10);
const server = Bun.spawn(["bun", "run", "src/server/index.ts"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
  },
  stdout: "pipe",
  stderr: "pipe",
});

try {
  await waitForReady(port);

  const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
  if (pageResponse.status !== 200) {
    throw new Error(`Expected GET / to return 200, got ${pageResponse.status}.`);
  }

  const html = await pageResponse.text();
  if (!html.includes("default-web")) {
    throw new Error("Expected GET / to return the app shell.");
  }

  const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
  if (![200, 503].includes(healthResponse.status)) {
    throw new Error(`Expected GET /health to return 200 or 503, got ${healthResponse.status}.`);
  }

  const healthPayload = (await healthResponse.json()) as { status?: unknown };
  if (typeof healthPayload.status !== "string") {
    throw new Error("Expected GET /health to return a JSON body with a status field.");
  }

  console.log(
    `smoke passed: / => 200, /health => ${healthResponse.status} (${healthPayload.status})`
  );
} finally {
  server.kill();
  await server.exited;
}

async function waitForReady(port: number) {
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        return;
      }
    } catch {}

    await Bun.sleep(150);
  }

  const stdout = server.stdout ? await new Response(server.stdout).text() : "";
  const stderr = server.stderr ? await new Response(server.stderr).text() : "";

  throw new Error(`Timed out waiting for the app to boot.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}
