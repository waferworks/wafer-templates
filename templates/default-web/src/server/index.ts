import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";
import { logger } from "hono/logger";

import { type TodoRepository, createTodoRepository } from "./db/client";
import todosRoute from "./routes/todos";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const publicHtmlPath = path.join(projectRoot, "public", "index.html");
const distClientRoot = path.join(projectRoot, "dist", "client");
const distClientHtmlPath = path.join(distClientRoot, "public", "index.html");

export interface AppBindings {
  Variables: {
    todoRepository: TodoRepository;
  };
}

export function getServerConfig() {
  const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);

  return {
    host: "127.0.0.1" as const,
    port: Number.isFinite(parsedPort) ? parsedPort : 3000,
  };
}

export function buildApp(todoRepository: TodoRepository = createTodoRepository()) {
  const app = new Hono<AppBindings>();

  app.use("*", logger());
  app.use("*", async (c, next) => {
    c.set("todoRepository", todoRepository);
    await next();
  });

  const routes = app
    .get("/health", async (c) => {
      const healthy = await c.var.todoRepository.healthCheck();

      return c.json(
        {
          status: healthy ? "ok" : "waiting-for-database",
        },
        healthy ? 200 : 503
      );
    })
    .get("/healthz", async (c) => c.redirect("/health"))
    .route("/api/todos", todosRoute);

  routes.onError((error, c) => {
    const isUnavailable = error instanceof Error && error.message.includes("DATABASE_URL");

    return c.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      isUnavailable ? 503 : 500
    );
  });

  return routes;
}

export const app = buildApp();
export type AppType = typeof app;

if (import.meta.main) {
  await startServer();
}

async function startServer(todoRepository: TodoRepository = createTodoRepository()) {
  const app = buildApp(todoRepository);
  const config = getServerConfig();
  const vite = shouldUseViteMiddleware() ? await createViteMiddlewareServer(config.port) : null;

  const server = createServer(async (request, response) => {
    try {
      if (shouldHandleWithApp(request.url)) {
        await writeResponse(response, await app.fetch(toRequest(request, config.port)));
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

      response.statusCode = 500;
      response.setHeader("content-type", "text/plain; charset=utf-8");
      response.end(error instanceof Error ? error.message : "Unexpected server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });

  console.log(`default-web listening on http://${config.host}:${config.port}`);

  const shutdown = async () => {
    await todoRepository.close();
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

function shouldUseViteMiddleware() {
  return process.env.NODE_ENV !== "production" || !existsSync(distClientHtmlPath);
}

function shouldHandleWithApp(url: string | undefined) {
  return url === "/health" || url === "/healthz" || Boolean(url?.startsWith("/api/"));
}

async function createViteMiddlewareServer(port: number) {
  const { createServer } = await import("vite");

  return createServer({
    server: {
      middlewareMode: true,
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
    appType: "custom",
  });
}

async function handleDevelopmentRequest(
  vite: Awaited<ReturnType<typeof createViteMiddlewareServer>>,
  request: IncomingMessage,
  response: ServerResponse
) {
  const url = request.url ?? "/";

  if (isHtmlRequest(url)) {
    const template = await readFile(publicHtmlPath, "utf8");
    const html = await vite.transformIndexHtml(url, template);

    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    vite.middlewares(request, response, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function handleProductionRequest(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  if (pathname !== "/") {
    const assetPath = safeJoin(distClientRoot, pathname.slice(1));

    if (assetPath && (await fileExists(assetPath))) {
      await serveFile(response, assetPath);
      return;
    }
  }

  await serveFile(response, distClientHtmlPath);
}

function isHtmlRequest(url: string) {
  const pathname = url.split("?")[0] ?? "/";

  return pathname === "/" || !pathname.includes(".");
}

function safeJoin(root: string, relativePath: string) {
  const candidate = path.resolve(root, relativePath);

  return candidate.startsWith(root) ? candidate : null;
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function serveFile(response: ServerResponse, filePath: string) {
  const body = await readFile(filePath);

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(filePath));
  response.end(body);
}

function contentTypeFor(filePath: string) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".map")) return "application/json; charset=utf-8";

  return "application/octet-stream";
}

function toRequest(request: IncomingMessage, port: number) {
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
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : (Readable.toWeb(request) as unknown as BodyInit);

  return new Request(url, {
    method,
    headers,
    body,
  });
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
