import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Connect, Plugin, ViteDevServer } from "vite";

type ApiRoute = {
  filePath: string;
  pattern: RegExp;
};

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const sourceDir = join(rootDir, "api-src");

const collectTsEntries = async (directory: string): Promise<string[]> => {
  const entries: string[] = [];
  const items = await readdir(directory, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(directory, item.name);
    if (item.isDirectory()) {
      entries.push(...(await collectTsEntries(fullPath)));
    } else if (item.isFile() && item.name.endsWith(".ts")) {
      entries.push(fullPath);
    }
  }

  return entries;
};

const buildRoutePattern = (filePath: string): RegExp => {
  const relativeFromSource = relative(sourceDir, filePath).replace(/\.ts$/, "");
  const segments = relativeFromSource.split("/").map((segment) => {
    if (segment.startsWith("[") && segment.endsWith("]")) return "([^/]+)";
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp(`^/api/${segments.join("/")}/?$`);
};

const loadDotEnv = async () => {
  const envPath = join(rootDir, ".env.local");
  if (!existsSync(envPath)) return;

  const contents = await readFile(envPath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const createApiMiddleware = (
  server: ViteDevServer,
  routes: ApiRoute[],
): Connect.NextHandleFunction => {
  return async (request, response, next) => {
    if (!request.url?.startsWith("/api/")) return next();

    const pathname = request.url.split("?")[0];
    const match = routes.find((route) => route.pattern.test(pathname));

    if (!match) {
      response.statusCode = 404;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "Not found", url: request.url }));
      return;
    }

    try {
      const handlerModule = await server.ssrLoadModule(match.filePath);
      const handler = handlerModule.default;
      if (typeof handler !== "function") {
        throw new Error(`No default export in ${match.filePath}`);
      }
      await handler(request, response);
    } catch (error) {
      console.error(`[api] Error handling ${request.url}:`, error);
      if (!response.headersSent) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
        );
      }
    }
  };
};

export const apiDevPlugin = (): Plugin => ({
  name: "cubic-api-dev",
  apply: "serve",
  configResolved: async () => {
    await loadDotEnv();
  },
  configureServer: async (server) => {
    const files = await collectTsEntries(sourceDir);
    const routes: ApiRoute[] = files.map((filePath) => ({
      filePath,
      pattern: buildRoutePattern(filePath),
    }));

    console.log(
      `[api-dev] Loaded ${routes.length} route(s) from api-src/:`,
    );
    for (const route of routes) {
      console.log(`  ${route.pattern} → ${relative(rootDir, route.filePath)}`);
    }

    server.middlewares.use(createApiMiddleware(server, routes));
  },
});
