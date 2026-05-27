import { type IncomingMessage, type ServerResponse, createServer } from "node:http";

import { parsePort, readServerEnv } from "@/env/server";

import { buildApp, runCleanupTasks } from "./app";
import {
  assertProductionBuildExists,
  createViteMiddlewareServer,
  handleDevelopmentRequest,
  handleProductionRequest,
  shouldUseViteMiddleware,
} from "./static";

export function getServerConfig() {
  const env = readServerEnv();

  return {
    host: env.HOST,
    port: parsePort(env.PORT),
  };
}

export async function startServer() {
  const app = buildApp();
  const config = getServerConfig();
  const vite = shouldUseViteMiddleware() ? await createViteMiddlewareServer(config.port) : null;

  if (!vite) {
    assertProductionBuildExists();
  }

  const server = createServer(async (request, response) => {
    try {
      const appResponse = await app.fetch(await toRequest(request, config.port));

      if (!shouldServeClientRequest(request, appResponse, config.port)) {
        await writeResponse(response, appResponse);
        return;
      }

      if (vite) {
        await handleDevelopmentRequest(vite, request, response);
        return;
      }

      await handleProductionRequest(request, response);
    } catch (error) {
      if (vite && error instanceof Error) {
        vite.ssrFixStacktrace(error);
      }

      console.error(error);
      response.statusCode = 500;
      response.setHeader("content-type", "text/plain; charset=utf-8");
      response.end("Unexpected server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });

  console.log(`wafer-default listening on http://${config.host}:${config.port}`);

  const shutdown = async () => {
    await runCleanupTasks();
    await vite?.close();
    server.close();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

function shouldServeClientRequest(request: IncomingMessage, response: Response, port: number) {
  const method = request.method ?? "GET";
  const pathname = new URL(request.url ?? "/", `http://127.0.0.1:${port}`).pathname;

  return (
    response.status === 404 &&
    (method === "GET" || method === "HEAD") &&
    pathname !== "/api" &&
    !pathname.startsWith("/api/")
  );
}

async function toRequest(request: IncomingMessage, port: number) {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const method = request.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);

  return new Request(url, {
    method,
    headers,
    body,
  });
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function writeResponse(response: ServerResponse, webResponse: Response) {
  response.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();
  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      break;
    }

    response.write(Buffer.from(chunk.value));
  }

  response.end();
}
