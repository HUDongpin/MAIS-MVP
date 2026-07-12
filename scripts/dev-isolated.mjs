#!/usr/bin/env node
// Launch `next dev` in an isolated build dir + owned port so parallel MAIS
// sessions never rewrite the shared root `.next` (which breaks other sessions'
// `next start` with 400s on hashed chunks and TS6053 during tsc gates).
//
// Usage:
//   node scripts/dev-isolated.mjs [--port 3210] [--dist .tmp/dev-<label>]
// Env overrides: DEV_ISOLATED_PORT, NEXT_DIST_DIR
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

const port = argValue("--port") ?? process.env.DEV_ISOLATED_PORT ?? String(3200 + (process.pid % 300));
const distDir =
  argValue("--dist") ??
  process.env.NEXT_DIST_DIR ??
  path.join(".tmp", `dev-${process.pid}`);

if (path.resolve(distDir) === path.resolve(".next")) {
  console.error("dev-isolated: refuse to use the shared .next dir; pass --dist under .tmp/");
  process.exit(1);
}

const nextBin = require.resolve("next/dist/bin/next");
console.log(`dev-isolated: NEXT_DIST_DIR=${distDir} port=${port}`);
const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: distDir }
});
child.on("exit", (code) => process.exit(code ?? 0));
