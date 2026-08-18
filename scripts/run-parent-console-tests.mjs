import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `parent-console-tests-${process.pid}-${Date.now()}`);
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
  const compiled = run(tscBin, ["-p", "tsconfig.parent-console.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  linkPathAlias();

  const passed = run("node", [
    "--test",
    join(outputDir, "app/api/auth/register/routeTeacherInviteGate.test.js"),
    join(outputDir, "lib/server/authRouteGuards.test.js"),
    join(outputDir, "lib/server/demoAccountAccess.test.js"),
    join(outputDir, "lib/server/internalCaliforniaFastLogin.test.js"),
    join(outputDir, "lib/server/sessionRevocation.test.js"),
    join(outputDir, "lib/server/userStoreDemoLoginGate.test.js"),
    join(outputDir, "lib/server/userStoreRetiredExampleLock.test.js"),
    join(outputDir, "lib/server/contentSafetySeed.test.js"),
    join(outputDir, "lib/server/userStoreParentNoticePersistence.test.js"),
    join(outputDir, "lib/server/questionStore.test.js"),
    join(outputDir, "app/api/questions/routeQuestionStore.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
