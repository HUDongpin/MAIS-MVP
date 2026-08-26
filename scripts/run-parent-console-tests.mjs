import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

import {
  assertParentConsoleTestManifest,
  expectedParentConsoleSupportTestCount,
  expectedParentConsoleTestCount,
  expectedParentDomainTestCount,
  expectedParentSecurityLifecycleTestCount,
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

function finalTapMetric(output, label) {
  const matches = Array.from(output.matchAll(new RegExp(`^# ${label} (\\d+)$`, "gmu")));
  const value = matches.at(-1)?.[1];
  return value === undefined ? null : Number(value);
}

function runCompiledTests(compiledTestFiles) {
  const result = spawnSync("node", [
    "--test",
    "--test-concurrency=1",
    "--test-reporter=tap",
    ...compiledTestFiles
  ], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const summary = {
    tests: finalTapMetric(output, "tests"),
    pass: finalTapMetric(output, "pass"),
    fail: finalTapMetric(output, "fail"),
    cancelled: finalTapMetric(output, "cancelled"),
    skipped: finalTapMetric(output, "skipped"),
    todo: finalTapMetric(output, "todo")
  };
  if (Object.values(summary).some((value) => value === null)) {
    throw new Error(`Parent console TAP summary is incomplete: ${JSON.stringify(summary)}`);
  }
  if (
    summary.tests !== expectedParentConsoleTestCount ||
    summary.pass !== expectedParentConsoleTestCount ||
    summary.fail !== 0 ||
    summary.cancelled !== 0 ||
    summary.skipped !== 0 ||
    summary.todo !== 0
  ) {
    throw new Error(
      `Parent console TAP summary did not match the declared complete gate: ${JSON.stringify(summary)}; ` +
      `expected ${expectedParentConsoleTestCount} tests/pass and zero fail/cancelled/skipped/todo.`
    );
  }
  console.log(
    `Parent console TAP runtime verified: ${summary.tests} tests, ${summary.pass} passed, ` +
    `${summary.skipped} skipped.`
  );
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
    `+ ${expectedParentSecurityLifecycleTestCount} security/lifecycle = ` +
    `${expectedParentConsoleTestCount} expected runtime tests.`
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
  const passed = runCompiledTests(compiledTestFiles);
  if (!passed) throw new Error("Parent console Node tests failed.");
} catch (error) {
  if (!process.exitCode) process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  cleanup();
}
