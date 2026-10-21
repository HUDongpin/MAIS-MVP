import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Discovery-based test gate.
 *
 * Existing gates enumerate their test files by hand inside `package.json`. That
 * means a new test is invisible until somebody remembers to add it to a 40-line
 * shell string, and tests nobody runs rot silently. The 2026-10-19 audit found
 * 335 of 668 test files unreachable from any npm script, runner, or workflow —
 * including 80 under `lib/server`, which holds the auth, session, rate-limiting
 * and content-safety logic. Several were already red, each one broken by a
 * rename nobody noticed, because nothing ran them.
 *
 * Discovery, rather than a hand-kept list, is the point: a new test under a
 * covered root is picked up by existing it, so the same drift cannot restart.
 *
 * Usage:
 *   node scripts/run-discovered-tests.mjs --roots lib,app
 *   node scripts/run-discovered-tests.mjs --roots lib --report
 *   node scripts/run-discovered-tests.mjs --self-test
 *
 * `--report` runs each file in its own process with a timeout and prints a
 * per-file pass/fail/timeout table instead of gating. Use it to survey a root
 * before adding it to CI, so a new gate never lands red on someone else's work.
 *
 * ## Why tsx rather than a tsc pre-compile
 *
 * `run-component-tests.mjs` and the `test:question-bank`/`test:mvp` gates compile
 * the project to CommonJS and run the emitted `.test.js`. That works for those
 * suites but misreports others: `lib/aiTutorCapacity.test.ts` passes under tsx
 * and fails under the CommonJS emit, because the test is written against ESM
 * semantics. A gate that reports a passing test as broken is worse than no gate,
 * so this runner executes the TypeScript sources directly with `--import tsx`,
 * which is already how `test:scorm`, `test:teacher-notice-outbox` and
 * `test:source-regressions` run. tsx resolves the `@/*` alias from
 * `tsconfig.json`, so no symlink scaffolding is needed either.
 *
 * ## Quarantine
 *
 * Quarantine lives in `scripts/test-quarantine.json` as data, not as a code
 * edit, so every exclusion carries a reason and an owning lane and shows up in
 * review. `scripts/check-test-coverage.mjs` reads the same file, so a
 * quarantined test is excluded from the gate but still accounted for — it
 * cannot silently vanish.
 */

const QUARANTINE_PATH = join("scripts", "test-quarantine.json");
const PER_FILE_TIMEOUT_MS = 120_000;
// `.test.js` is deliberately absent: `check-test-coverage.mjs` maps a `.test.ts`
// source to its compiled `.test.js` name when matching gate references, so
// treating that suffix as a SOURCE too would count build output as a test file.
// Hand-written JavaScript tests use an explicit module suffix.
const TEST_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs", ".test.cjs"];

export function parseArgs(argv) {
  const args = { roots: [], report: false, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") args.report = true;
    else if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--roots") {
      args.roots = (argv[index + 1] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
    }
  }
  return args;
}

export function readQuarantine(path = QUARANTINE_PATH) {
  if (!existsSync(path)) return { entries: [], paths: new Set() };
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const entries = Array.isArray(parsed?.quarantined) ? parsed.quarantined : [];
  for (const entry of entries) {
    if (typeof entry?.path !== "string" || !entry.path.trim()) {
      throw new Error(`${path}: every quarantine entry needs a "path".`);
    }
    if (typeof entry?.reason !== "string" || !entry.reason.trim()) {
      throw new Error(`${path}: ${entry.path} is quarantined with no "reason".`);
    }
    if (typeof entry?.owner !== "string" || !entry.owner.trim()) {
      throw new Error(`${path}: ${entry.path} is quarantined with no "owner" lane.`);
    }
  }
  return { entries, paths: new Set(entries.map((entry) => entry.path)) };
}

export function isTestFile(name) {
  return TEST_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/** Recursively collect test SOURCES under `dir`, newest-path-sorted for stable runs. */
export function collectTests(dir, { readDir = readdirSync } = {}) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readDir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".tmp") continue;
      found.push(...collectTests(path, { readDir }));
    } else if (isTestFile(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

export function partitionByQuarantine(paths, quarantinePaths) {
  const active = [];
  const quarantined = [];
  for (const path of paths) {
    const normalized = path.split(sep).join("/");
    (quarantinePaths.has(normalized) ? quarantined : active).push(path);
  }
  return { active, quarantined };
}

function selfTest() {
  const assert = (condition, message) => {
    if (!condition) {
      console.error(`✗ ${message}`);
      process.exit(1);
    }
  };

  assert(isTestFile("session.test.ts"), ".test.ts is a test file");
  assert(isTestFile("Foo.test.tsx"), ".test.tsx is a test file");
  assert(isTestFile("lesson.test.mjs"), ".test.mjs is a test file");
  assert(isTestFile("lesson.test.cjs"), ".test.cjs is a test file");
  assert(!isTestFile("session.test.js"), "compiled .test.js output is not a source test file");
  assert(!isTestFile("session.ts"), "a plain source file is not a test file");
  assert(!isTestFile("testimonials.ts"), "a name merely containing 'test' is not a test file");

  assert(parseArgs(["--roots", "lib,app", "--report"]).roots.length === 2, "--roots parses a list");
  assert(parseArgs(["--report"]).report === true, "--report is recognized");
  assert(parseArgs([]).roots.length === 0, "no roots parses empty");

  const partitioned = partitionByQuarantine(
    [join("lib", "a.test.ts"), join("lib", "b.test.ts")],
    new Set(["lib/a.test.ts"])
  );
  assert(partitioned.quarantined.length === 1, "a quarantined path is partitioned out");
  assert(partitioned.active.length === 1, "an unlisted path stays active");

  const quarantine = readQuarantine();
  assert(quarantine.paths instanceof Set, "the quarantine file parses");
  for (const entry of quarantine.entries) {
    assert(
      existsSync(entry.path),
      `quarantined path ${entry.path} no longer exists — remove the stale entry`
    );
  }

  console.log("✓ run-discovered-tests self-test passed.");
}

// Only act as a CLI when invoked directly. `check-test-coverage.mjs` imports
// `readQuarantine`/`collectTests` from here, and an import must not run the gate.
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (!invokedDirectly) {
  // Imported as a library: stop before the CLI body below.
} else {
  main();
}

function main() {
const args = parseArgs(process.argv.slice(2));

if (args.selfTest) {
  selfTest();
  process.exit(0);
}

if (!args.roots.length) {
  console.error("Usage: node scripts/run-discovered-tests.mjs --roots lib,app [--report]");
  process.exit(1);
}

const quarantine = readQuarantine();
const discovered = args.roots.flatMap((root) => collectTests(root)).sort();

if (!discovered.length) {
  console.error(`\n✗ No tests discovered under ${args.roots.join(", ")} — the gate would pass vacuously.`);
  process.exit(1);
}

const { active, quarantined } = partitionByQuarantine(discovered, quarantine.paths);

if (args.report) {
  // Per-file isolation: one hanging or env-dependent suite must not hide the
  // state of every other file, which is the whole point of surveying a root
  // before it becomes a gate.
  const results = { passed: [], failed: [], timedOut: [] };
  console.log(`Surveying ${active.length} test files (timeout ${PER_FILE_TIMEOUT_MS / 1000}s each)…\n`);
  for (const path of active) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", path], {
      encoding: "utf8",
      timeout: PER_FILE_TIMEOUT_MS,
      env: process.env
    });
    if (result.signal === "SIGTERM" || result.error?.code === "ETIMEDOUT") {
      results.timedOut.push(path);
      console.log(`TIMEOUT  ${path}`);
    } else if (result.status === 0) {
      results.passed.push(path);
    } else {
      results.failed.push(path);
      console.log(`FAIL     ${path}`);
    }
  }
  console.log(`\npassed:    ${results.passed.length}`);
  console.log(`failed:    ${results.failed.length}`);
  console.log(`timed out: ${results.timedOut.length}`);
  console.log(`quarantined (skipped): ${quarantined.length}`);
  process.exit(0);
}

if (!active.length) {
  console.error(`\n✗ Every discovered test under ${args.roots.join(", ")} is quarantined.`);
  process.exit(1);
}

console.log(
  `Running ${active.length} test files from ${args.roots.join(", ")}` +
    `${quarantined.length ? ` (${quarantined.length} quarantined)` : ""}…\n`
);

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=4", ...active],
  { stdio: "inherit", env: process.env }
);
if (result.error) throw result.error;

// Any non-zero status, not just 1 — a crashed runner must not print success.
if (result.status !== 0) {
  console.error("\n✗ Discovered tests failed.");
  process.exit(result.status ?? 1);
}
console.log("\n✓ Discovered tests passed.");
}
