import { basename, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const args = new Map<string, string>();
for (let i = 2; i < Bun.argv.length; i += 1) {
  const current = Bun.argv[i];
  const next = Bun.argv[i + 1];
  if (current.startsWith("--")) {
    args.set(current.slice(2), next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) i += 1;
  }
}

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = normalize(join(projectRoot, args.get("root") ?? "."));
const port = Number(args.get("port") ?? Bun.env.PORT ?? 3000);
const isDist = basename(root) === "dist";

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function contentType(pathname: string) {
  const dot = pathname.lastIndexOf(".");
  return dot >= 0 ? mimeTypes[pathname.slice(dot).toLowerCase()] : undefined;
}

function responseForFile(pathname: string) {
  const file = Bun.file(pathname);
  const headers = new Headers();
  const type = contentType(pathname);
  if (type) headers.set("content-type", type);
  headers.set("cache-control", isDist ? "public, max-age=300" : "no-store");

  return new Response(file, {
    headers,
  });
}

function createServer(listenPort: number) {
  return Bun.serve({
    port: listenPort,
    async fetch(request) {
      const url = new URL(request.url);
      const requestPath = decodeURIComponent(url.pathname);
      const pathname = requestPath === "/" ? "/index.html" : requestPath;
      const absolutePath = normalize(join(root, pathname));

      if (relative(root, absolutePath).startsWith("..")) {
        return new Response("Forbidden", { status: 403 });
      }

      const file = Bun.file(absolutePath);
      if (await file.exists()) {
        return responseForFile(absolutePath);
      }

      return new Response("Not found", { status: 404 });
    },
  });
}

let server: ReturnType<typeof Bun.serve> | undefined;
let selectedPort = port;

for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    selectedPort = port + attempt;
    server = createServer(selectedPort);
    break;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "EADDRINUSE") {
      throw error;
    }
  }
}

if (!server) {
  throw new Error(`No available port found from ${port} to ${port + 19}`);
}

console.log(`Serving ${root} at http://localhost:${server.port}`);
