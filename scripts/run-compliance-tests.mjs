import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `compliance-tests-${process.pid}-${Date.now()}`);
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

// Compiled tests resolve runtime modules through the "@/..." alias; point
// <outDir>/node_modules/@ back at the compiled tree so they load the emitted JS.
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
  if (!run(tscBin, ["-p", "tsconfig.compliance.json", "--outDir", outputDir])) process.exit(process.exitCode);
  linkPathAlias();
  const passed = run("node", [
    "--test",
    join(outputDir, "lib/server/userStoreAccountDeletion.test.js"),
    join(outputDir, "lib/legal/parentalConsent.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
