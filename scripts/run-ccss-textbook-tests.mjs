/**
 * run-ccss-textbook-tests.mjs — Phase 0 QA gates for the ported CCSS
 * textbook lessons (mirrors run-signature-lab-tests.mjs).
 *
 *   1. CLASS AUDIT — ported lesson bodies must not use Tailwind-4-only syntax
 *                    (MAIS runs Tailwind 3.4; lessons are never hand-edited).
 *   2. CONTRACT   — compile and run `data/ccssLessonAssignments.test.ts`, the
 *                    pure-data invariants that keep the assignment table honest.
 *
 * Run:  npm run test:ccss-textbook
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(".tmp", `ccss-textbook-tests-${process.pid}-${Date.now()}`);
const tscBin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, ...options });
  if (result.error) throw result.error;
  return result.status === 0;
}

function cleanup() {
  try {
    rmSync(outputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    console.warn(`Warning: could not remove ${outputDir}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exitCode = 1;
}

// --- Gate 1: Tailwind class audit ------------------------------------------
console.log("== CCSS lesson class audit ==");
if (!run("node", ["scripts/audit-ccss-lesson-classes.mjs"])) fail("class audit failed");

if (process.exitCode === 1) {
  console.error("\nClass audit failed — not running the contract test.");
  process.exit(1);
}

// --- Gate 2: assignment contract test --------------------------------------
console.log("\n== CCSS lesson assignment contract test ==");
mkdirSync(".tmp", { recursive: true });
cleanup();

try {
  const compiled = run(tscBin, [
    "-p",
    "tsconfig.json",
    "--outDir",
    outputDir,
    "--noEmit",
    "false",
    "--incremental",
    "false",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node"
  ]);
  if (!compiled) {
    fail("tsc failed to compile the contract test");
    process.exit(1);
  }

  const aliasRoot = join(outputDir, "node_modules", "@");
  mkdirSync(aliasRoot, { recursive: true });
  for (const dir of ["data", "lib", "components", "types"]) {
    try {
      symlinkSync(join("..", "..", dir), join(aliasRoot, dir));
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }

  if (!run("node", ["--test", join(outputDir, "data/ccssLessonAssignments.test.js")])) {
    fail("contract test failed");
  }
} finally {
  cleanup();
}

if (process.exitCode === 1) process.exit(1);
console.log("\n✓ CCSS textbook gates passed (class audit + assignment contract).");
