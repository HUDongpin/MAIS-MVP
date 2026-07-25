import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `accommodations-tests-${process.pid}-${Date.now()}`);
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

// Compiled tests import runtime modules via the "@/..." path alias. Because this
// runner only compiles the listed test files and their imports, the emitted JS
// lives under the outDir tree; point node_modules/@ back at that compiled tree so
// "@/lib/..." resolves to the compiled output (not the untranspiled source).
function linkPathAlias() {
  const nodeModulesDir = join(outputDir, "node_modules");
  mkdirSync(nodeModulesDir, { recursive: true });
  // The link lives in <outDir>/node_modules/, so ".." points back at <outDir>,
  // the root of the compiled tree ("@/lib/..." -> "<outDir>/lib/...").
  try {
    symlinkSync("..", join(nodeModulesDir, "@"), "dir");
  } catch (error) {
    if (!(error && error.code === "EEXIST")) throw error;
  }
}

mkdirSync(".tmp", { recursive: true });
cleanup();

try {
  const compiled = run(tscBin, ["-p", "tsconfig.accommodations.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  linkPathAlias();

  const passed = run("node", [
    "--test",
    join(outputDir, "lib/accommodations.test.js"),
    join(outputDir, "lib/server/userStore/accommodationsPersistence.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
