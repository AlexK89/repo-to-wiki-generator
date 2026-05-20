#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const apiDir = join(rootDir, "api");

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

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

const entries = await collectTsEntries(apiDir);
if (entries.length === 0) {
  console.log("[build-api] No api/**/*.ts entries found, skipping.");
  process.exit(0);
}

console.log(`[build-api] Bundling ${entries.length} api function(s)`);

for (const entryPath of entries) {
  const relativeEntry = relative(rootDir, entryPath);
  const outputPath = entryPath.replace(/\.ts$/, ".mjs");

  await build({
    entryPoints: [entryPath],
    outfile: outputPath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    sourcemap: false,
    external: dependencies,
    logLevel: "warning",
    legalComments: "none",
    tsconfig: join(rootDir, "tsconfig.server.json"),
  });

  const outputStats = await stat(outputPath);
  console.log(
    `[build-api] ✓ ${relativeEntry} → ${relative(rootDir, outputPath)} (${formatBytes(outputStats.size)})`,
  );
}
