import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const publicHtmlPath = path.join(projectRoot, "index.html");
const distClientRoot = path.join(projectRoot, "dist", "client");
const distClientHtmlPath = path.join(distClientRoot, "index.html");

export function shouldUseViteMiddleware() {
  return process.env.NODE_ENV !== "production";
}

export function assertProductionBuildExists() {
  if (!existsSync(distClientHtmlPath)) {
    throw new Error("Production build is missing. Run bun run build before bun run start.");
  }
}

export async function createViteMiddlewareServer(port: number) {
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

export async function handleDevelopmentRequest(
  vite: Awaited<ReturnType<typeof createViteMiddlewareServer>>,
  request: IncomingMessage,
  response: ServerResponse
) {
  const url = request.url ?? "/";
  const isHead = request.method === "HEAD";

  if (isHtmlRequest(url)) {
    const template = await readFile(publicHtmlPath, "utf8");
    const html = await vite.transformIndexHtml(url, template);

    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(isHead ? undefined : html);
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

export async function handleProductionRequest(request: IncomingMessage, response: ServerResponse) {
  if (!isClientMethod(request.method)) {
    writeNotFound(response);
    return;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = decodePathname(url.pathname);
  const isHead = request.method === "HEAD";

  if (!pathname) {
    writeNotFound(response);
    return;
  }

  if (pathname !== "/") {
    const assetPath = safeJoin(distClientRoot, pathname.slice(1));

    if (assetPath && (await fileExists(assetPath))) {
      await serveFile(response, assetPath, isHead);
      return;
    }

    if (!isAppShellPath(pathname)) {
      writeNotFound(response);
      return;
    }
  }

  await serveFile(response, distClientHtmlPath, isHead);
}

function isClientMethod(method = "GET") {
  return method === "GET" || method === "HEAD";
}

function isHtmlRequest(url: string) {
  const pathname = url.split("?")[0] ?? "/";

  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/node_modules/")
  ) {
    return false;
  }

  return pathname === "/" || !pathname.includes(".");
}

function decodePathname(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function isAppShellPath(pathname: string) {
  return pathname === "/" || !path.basename(pathname).includes(".");
}

function safeJoin(root: string, relativePath: string) {
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function writeNotFound(response: ServerResponse) {
  response.statusCode = 404;
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end("Not found");
}

async function serveFile(response: ServerResponse, filePath: string, headOnly = false) {
  const body = await readFile(filePath);

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(filePath));
  response.end(headOnly ? undefined : body);
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
