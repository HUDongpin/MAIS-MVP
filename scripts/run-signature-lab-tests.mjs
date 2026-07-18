/**
 * run-signature-lab-tests.mjs — Phase 0 QA gates for signature labs.
 *
 * Two gates, both from the migration plan §6:
 *
 *   1. MATH  — run each ported bench's `audit-*.mjs`, which re-implements the
 *              lab's mathematics independently of React/canvas and checks it
 *              numerically. A bench whose audit fails does not ship.
 *   2. CONTRACT — compile and run `data/signatureLabAssignments.test.ts`, the
 *              pure-data invariants that keep the assignment table honest.
 *
 * Run:  npm run test:signature-labs
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";

// Audits live beside the labs they prove (matching upstream): each audit reads
// its sibling `<Name>Lab.jsx` to check lesson structure, so it must stay a
// sibling, not sit in a subdirectory.
const auditsDir = "components/visualizations/signature";
const outputDir = join(".tmp", `signature-lab-tests-${process.pid}-${Date.now()}`);
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

// --- Gate 1: math audits --------------------------------------------------
console.log("== Signature lab math audits ==");
const auditFiles = readdirSync(auditsDir)
  .filter((name) => name.startsWith("audit-") && name.endsWith(".mjs"))
  .sort();

if (auditFiles.length === 0) fail(`No audit-*.mjs proofs found in ${auditsDir}`);

for (const file of auditFiles) {
  console.log(`\n-- ${file}`);
  // Run each audit with its own directory as CWD so audits that read their
  // sibling `<Name>Lab.jsx` via a bare/relative path (not all use
  // import.meta.url) resolve it regardless of where the gate is invoked from.
  if (!run("node", [file], { cwd: auditsDir })) fail(`${file} reported a math failure`);
}

if (process.exitCode === 1) {
  console.error("\nMath gate failed — not running the contract test.");
  process.exit(1);
}

// --- Gate 2: assignment contract test -------------------------------------
console.log("\n== Signature lab contract test ==");
mkdirSync(".tmp", { recursive: true });
cleanup();

try {
  // Full-project compile + @/ alias symlinks, mirroring `test:mvp`. This is the
  // proven way to run a node --test file that imports through the `@/` alias:
  // tsc does not rewrite path aliases, so the compiled output resolves `@/x`
  // via node_modules/@/x -> the compiled x directory.
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

  if (!run("node", ["--test", join(outputDir, "data/signatureLabAssignments.test.js")])) {
    fail("contract test failed");
  }
} finally {
  cleanup();
}

if (process.exitCode === 1) process.exit(1);
console.log("\n✓ Signature lab gates passed (math audits + assignment contract).");
