import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

import {
  assertParentConsoleTestManifest,
  expectedParentConsoleSupportTestCount,
  expectedParentConsoleTestCount,
  expectedParentDomainTestCount,
  parentConsoleTestFiles
} from "./parent-console-test-manifest.mjs";

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
  assertParentConsoleTestManifest(process.cwd());
  console.log(
    `Parent console Node manifest: ${parentConsoleTestFiles.length} explicit files; ` +
    `${expectedParentDomainTestCount} parent-domain + ${expectedParentConsoleSupportTestCount} preserved support ` +
    `= ${expectedParentConsoleTestCount} expected tests.`
  );

  const contractsPassed = run("node", [
    "--test",
    "--test-concurrency=1",
    "scripts/parent-console-gates.test.mjs",
    "scripts/with-next-env-restore.test.mjs",
    "scripts/playwright-config-path-safety.test.mjs"
  ]);
  if (!contractsPassed) throw new Error("Parent console tooling contracts failed.");

  const compiled = run(tscBin, ["-p", "tsconfig.parent-console.json", "--outDir", outputDir]);
  if (!compiled) throw new Error("Parent console TypeScript compilation failed.");

  linkPathAlias();

  const compiledTestFiles = parentConsoleTestFiles.map((relativePath) =>
    join(outputDir, relativePath.replace(/\.(?:ts|tsx)$/u, ".js"))
  );
  const passed = run("node", [
    "--test",
    ...compiledTestFiles
  ]);
  if (!passed) throw new Error("Parent console Node tests failed.");
} catch (error) {
  if (!process.exitCode) process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  cleanup();
}
