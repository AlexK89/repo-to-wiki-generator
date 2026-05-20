#!/usr/bin/env node
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const sourceDir = join(rootDir, "api-src");
const distDir = join(rootDir, "dist");
const outputDir = join(rootDir, ".vercel", "output");
const staticDir = join(outputDir, "static");
const functionsDir = join(outputDir, "functions");

const collectTsEntries = async (directory) => {
  const entries = [];
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

const dependencies = await import(join(rootDir, "package.json"), {
  with: { type: "json" },
}).then((module) => Object.keys(module.default.dependencies ?? {}));

const FUNCTION_DURATIONS = {
  "analyze.ts": 300,
  "jobs/[id].ts": 300,
  "wiki/[id].ts": 60,
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await cp(distDir, staticDir, { recursive: true });

const entries = await collectTsEntries(sourceDir);
console.log(`[build-output] Bundling ${entries.length} function(s)`);

for (const entryPath of entries) {
  const relativeFromSource = relative(sourceDir, entryPath);
  const routePath = relativeFromSource.replace(/\.ts$/, "");
  const functionDir = join(functionsDir, "api", `${routePath}.func`);
  const handlerPath = join(functionDir, "index.mjs");

  await mkdir(dirname(handlerPath), { recursive: true });
  await build({
    entryPoints: [entryPath],
    outfile: handlerPath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    external: dependencies,
    logLevel: "warning",
    legalComments: "none",
    tsconfig: join(rootDir, "tsconfig.server.json"),
  });

  const maxDuration = FUNCTION_DURATIONS[relativeFromSource] ?? 60;
  await writeFile(
    join(functionDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
        maxDuration,
      },
      null,
      2,
    ),
  );

  const handlerStats = await stat(handlerPath);
  console.log(
    `[build-output] ✓ api/${routePath} (${(handlerStats.size / 1024).toFixed(1)} kB, ${maxDuration}s)`,
  );
}

await writeFile(
  join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "^/api(/.*)?$", status: 404 },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("[build-output] Wrote .vercel/output/config.json");
