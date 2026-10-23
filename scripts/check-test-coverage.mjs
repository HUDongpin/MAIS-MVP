import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";

import { collectTests, readQuarantine } from "./run-discovered-tests.mjs";

/**
 * Fails when a test file exists that no gate would ever run.
 *
 * This is the guard that keeps the 2026-10-19 drift from returning. At that
 * audit, 335 of 668 test files were unreachable from any npm script, runner or
 * workflow — including 80 under `lib/server` — and several had been red for
 * weeks because nothing executed them. Fixing the backlog once is not enough;
 * without a check, the next hand-enumerated gate starts the same drift again.
 *
 * A test file is considered covered when it is:
 *   - under a root covered by a discovery gate (`DISCOVERY_ROOTS`), or
 *   - named in `package.json` / a `scripts/run-*.mjs` runner / a workflow, or
 *   - explicitly quarantined in `scripts/test-quarantine.json`.
 *
 * Anything else is reported. The intent is that adding a test under a covered
 * root needs no bookkeeping at all, and adding one outside those roots forces a
 * deliberate choice: wire it up, or quarantine it with a reason and an owner.
 */

/** Roots whose tests run via `scripts/run-discovered-tests.mjs`. */
const DISCOVERY_ROOTS = ["lib", "app", "tests"];

/**
 * `components/**` is covered by the pre-existing `run-component-tests.mjs`,
 * which discovers recursively and deliberately excludes
 * `components/visualizations/three` while the visualization stream is in
 * flight. That exclusion is recorded there, so treat the rest of `components`
 * as covered and surface the excluded subtree here.
 */
const COMPONENT_ROOT = "components";
const COMPONENT_EXCLUDED = join("components", "visualizations", "three");

const REFERENCE_FILES = ["package.json"];
const REFERENCE_GLOB_DIRS = [join("scripts"), join(".github", "workflows")];

function readReferenceHaystack() {
  const parts = [];
  for (const file of REFERENCE_FILES) {
    if (existsSync(file)) parts.push(readFileSync(file, "utf8"));
  }
  for (const dir of REFERENCE_GLOB_DIRS) {
    if (!existsSync(dir)) continue;
    for (const entry of collectAllFiles(dir)) {
      if (/\.(mjs|ya?ml)$/u.test(entry)) parts.push(readFileSync(entry, "utf8"));
    }
  }
  return parts.join("\n");
}

function collectAllFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectAllFiles(path));
    else found.push(path);
  }
  return found;
}

function isUnderDiscoveryRoot(relativePath) {
  return DISCOVERY_ROOTS.some(
    (root) => relativePath === root || relativePath.startsWith(`${root}${sep}`)
  );
}

function isCoveredByComponentGate(relativePath) {
  if (!relativePath.startsWith(`${COMPONENT_ROOT}${sep}`)) return false;
  return !relativePath.startsWith(`${COMPONENT_EXCLUDED}${sep}`);
}

/**
 * A runner may name a test by its source path or by its compiled `.test.js`
 * output, so both spellings count as a reference.
 */
function isNamedInAGate(relativePath, haystack) {
  const posix = relativePath.split(sep).join("/");
  const compiled = posix.replace(/\.test\.tsx?$/u, ".test.js");
  const basename = posix.split("/").pop() ?? posix;
  const compiledBasename = compiled.split("/").pop() ?? compiled;
  return (
    haystack.includes(posix) ||
    haystack.includes(compiled) ||
    haystack.includes(basename) ||
    haystack.includes(compiledBasename)
  );
}

function main() {
  const quarantine = readQuarantine();
  const haystack = readReferenceHaystack();

  const roots = [...DISCOVERY_ROOTS, COMPONENT_ROOT];
  const allTests = roots.flatMap((root) => collectTests(root)).sort();

  const uncovered = [];
  const excludedSubtree = [];

  for (const path of allTests) {
    const posix = path.split(sep).join("/");
    if (quarantine.paths.has(posix)) continue;
    if (isCoveredByComponentGate(path)) continue;
    if (isUnderDiscoveryRoot(path)) continue;
    if (isNamedInAGate(path, haystack)) continue;

    if (posix.startsWith(COMPONENT_EXCLUDED.split(sep).join("/"))) excludedSubtree.push(posix);
    else uncovered.push(posix);
  }

  console.log(`Checked ${allTests.length} test files across ${roots.join(", ")}.`);
  console.log(`Quarantined: ${quarantine.entries.length}`);

  if (excludedSubtree.length) {
    // Reported, not failed: the exclusion is recorded in run-component-tests.mjs
    // with its reason, and failing here would just duplicate that decision.
    console.log(
      `\nNote: ${excludedSubtree.length} test files under ${COMPONENT_EXCLUDED} are excluded by ` +
        "run-component-tests.mjs while the visualization stream is in flight."
    );
  }

  if (!uncovered.length) {
    console.log("\n✓ Every test file is reachable by a gate or explicitly quarantined.");
    return;
  }

  console.error(`\n✗ ${uncovered.length} test file(s) are not reachable by any gate:\n`);
  for (const path of uncovered) console.error(`  ${path}`);
  console.error(
    "\nWire each one into a gate, move it under a discovery root " +
      `(${DISCOVERY_ROOTS.join(", ")}), or add it to scripts/test-quarantine.json ` +
      "with a reason and an owning lane."
  );
  process.exit(1);
}

main();
