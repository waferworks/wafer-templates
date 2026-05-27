import { createServer } from "node:net";

const defaultSmokePort = 4321;

type PortAvailabilityChecker = (port: number) => Promise<boolean>;

export interface SmokePathCheck {
  path: string;
  includes?: string;
  status: number;
}

export async function resolveSmokePort(
  value = process.env.PORT,
  preferredPort = defaultSmokePort,
  isAvailable: PortAvailabilityChecker = isPortAvailable
) {
  const explicitPort = parsePort(value);
  if (explicitPort) {
    return explicitPort;
  }

  if (await isAvailable(preferredPort)) {
    return preferredPort;
  }

  return findAvailablePort(preferredPort + 1, isAvailable);
}

async function main() {
  const port = await resolveSmokePort();
  let output = "";
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

  void collectOutput(server.stdout, (chunk) => {
    output += chunk;
  });
  void collectOutput(server.stderr, (chunk) => {
    output += chunk;
  });

  try {
    await waitForReady(port);

    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    if (pageResponse.status !== 200) {
      throw new Error(`Expected GET / to return 200, got ${pageResponse.status}.`);
    }

    const html = await pageResponse.text();
    if (!html.includes("wafer-default")) {
      throw new Error("Expected GET / to return the app shell.");
    }

    const missingResponse = await fetch(`http://127.0.0.1:${port}/missing-route`);
    if (missingResponse.status !== 200) {
      throw new Error(`Expected GET /missing-route to return 200, got ${missingResponse.status}.`);
    }

    const missingHtml = await missingResponse.text();
    if (!missingHtml.includes("wafer-default")) {
      throw new Error("Expected GET /missing-route to return the app shell.");
    }

    for (const path of ["/assets/missing.js", "/%"]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.status !== 404) {
        throw new Error(`Expected GET ${path} to return 404, got ${response.status}.`);
      }
    }

    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    if (healthResponse.status !== 200) {
      throw new Error(`Expected GET /health to return 200, got ${healthResponse.status}.`);
    }

    const healthPayload = (await healthResponse.json()) as { status?: unknown };
    if (healthPayload.status !== "ok") {
      throw new Error('Expected GET /health to return { status: "ok" }.');
    }

    const extraChecks = parseSmokePaths(process.env.SMOKE_PATHS);
    for (const check of extraChecks) {
      const response = await fetch(`http://127.0.0.1:${port}${check.path}`);
      if (response.status !== check.status) {
        throw new Error(
          `Expected GET ${check.path} to return ${check.status}, got ${response.status}.`
        );
      }

      const body = check.includes ? await response.text() : "";
      if (check.includes && !body.includes(check.includes)) {
        throw new Error(`Expected GET ${check.path} to include "${check.includes}".`);
      }
    }

    const extraSummary =
      extraChecks.length > 0
        ? `, ${extraChecks.map((check) => `${check.path} => ${check.status}`).join(", ")}`
        : "";
    console.log(
      `smoke passed: / => 200, /missing-route => 200, missing assets => 404, /health => 200 (ok)${extraSummary}`
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

    throw new Error(`Timed out waiting for the app to boot.\n${output}`);
  }
}

async function collectOutput(
  stream: ReadableStream<Uint8Array> | null,
  onChunk: (chunk: string) => void
) {
  if (!stream) {
    return;
  }

  const reader = stream.getReader();
  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      return;
    }

    onChunk(Buffer.from(chunk.value).toString("utf8"));
  }
}

export function parseSmokePaths(value: string | undefined): SmokePathCheck[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawPath, rawIncludes] = entry.split("::");
      const [rawTarget, rawStatus] = rawPath?.split("=>") ?? [];
      const path = rawTarget?.trim();
      const includes = rawIncludes?.trim() || undefined;
      const status = parseExpectedStatus(rawStatus);

      if (!path) {
        throw new Error(
          `Invalid SMOKE_PATHS entry "${entry}". Expected /path, /path::text, or /path=>status::text.`
        );
      }

      return { path, includes, status };
    });
}

function parseExpectedStatus(value: string | undefined) {
  if (!value) {
    return 200;
  }

  const status = Number(value.trim());
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error(`Invalid SMOKE_PATHS status "${value}".`);
  }

  return status;
}

function parsePort(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const port = Number(value);
  return port >= 1 && port <= 65535 ? port : null;
}

async function isPortAvailable(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function findAvailablePort(startPort: number, isAvailable: PortAvailabilityChecker) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isAvailable(port)) {
      return port;
    }
  }

  throw new Error("Could not resolve an available smoke-test port.");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
