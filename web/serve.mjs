import {
  createReadStream,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(root, "..");
const publicRoot = join(projectRoot, "public");
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

createServer((request, response) => {
  const requestPath = decodeURIComponent(
    new URL(request.url || "/", "http://localhost").pathname,
  );
  const isPublicAsset = requestPath.startsWith("/public/");
  let filePath = isPublicAsset
    ? normalize(join(projectRoot, requestPath))
    : normalize(join(root, requestPath));

  const allowedRoot = isPublicAsset ? resolve(publicRoot) : resolve(root);
  if (
    filePath !== allowedRoot &&
    !filePath.startsWith(`${allowedRoot}${sep}`)
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    if (
      isPublicAsset &&
      requestPath.startsWith("/public/assets/goubuli/") &&
      requestPath.endsWith("/")
    ) {
      const files = readdirSync(filePath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
      response.writeHead(200, {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ files }));
      return;
    }
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
