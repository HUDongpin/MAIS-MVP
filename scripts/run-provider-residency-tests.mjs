import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * Data-residency gate tests.
 *
 * Wired as its own gate on purpose: `lib/server/llmProvider.test.ts` — the
 * closest existing suite — is referenced by no script and no workflow, so it has
 * never run in CI. A residency control that nothing exercises is worse than no
 * control, because it reads like a guarantee in an audit.
 */

const outputDir = join(".tmp", `provider-residency-tests-${process.pid}-${Date.now()}`);
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
// node_modules/@ back at the compiled tree so it resolves to emitted JS rather
// than untranspiled source.
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
  const compiled = run(tscBin, ["-p", "tsconfig.provider-residency.json", "--outDir", outputDir]);
  if (!compiled) process.exit(process.exitCode);

  linkPathAlias();

  const passed = run("node", ["--test", join(outputDir, "lib/server/providerResidency.test.js")]);
  if (!passed) process.exit(process.exitCode);

  console.log("✓ Provider residency tests passed.");
} finally {
  cleanup();
}
