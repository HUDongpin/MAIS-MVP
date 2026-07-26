import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `lesson-menu-tests-${process.pid}-${Date.now()}`);
const tscBin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env
  });

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

// The compiled test imports the hook through the "@/..." path alias. Only the
// listed test file and its imports are compiled, so the emitted JS lives under
// the outDir tree; point node_modules/@ back at that tree so "@/components/..."
// resolves to the compiled output rather than the untranspiled source.
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
  const compiled = run(tscBin, ["-p", "tsconfig.lesson-menu.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  linkPathAlias();

  const passed = run("node", [
    "--test",
    join(outputDir, "components/lesson/lessonMenuFocus.test.js")
  ]);
  if (!passed) process.exit(process.exitCode);
} finally {
  cleanup();
}
