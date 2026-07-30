import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `account-erasure-tests-${process.pid}-${Date.now()}`);
const tscBin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
}

function cleanup() {
  try {
    rmSync(outputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: could not remove ${outputDir}: ${message}`);
  }
}

// Compiled tests import runtime modules via the "@/..." path alias; point
// node_modules/@ back at the compiled tree so "@/lib/..." resolves to the
// emitted JS rather than the untranspiled source.
function linkPathAlias() {
  const nodeModulesDir = join(outputDir, "node_modules");
  mkdirSync(nodeModulesDir, { recursive: true });
  try {
    symlinkSync("..", join(nodeModulesDir, "@"), "dir");
  } catch (error) {
    if (!(error && error.code === "EEXIST")) throw error;
  }
}

mkdirSync(".tmp", { recursive: true });
cleanup();

try {
  const compiled = run(tscBin, ["-p", "tsconfig.account-erasure.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  linkPathAlias();

  // The completeness test reads lib/server/userStore.ts from the repo root, so
  // it must run with cwd at the repo root (node --test does not change it).
  const passed = run("node", [
    "--test",
    join(outputDir, "lib/server/userStore/accountErasurePersistence.test.js"),
    join(outputDir, "lib/server/mediaObjectStore.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
