import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Component test gate.
 *
 * `components/**\/*.test.ts` had accumulated for a long time with no runner:
 * `test:visualizations` globs only `components/visualizations/*.test.js` (top
 * level, no subdirectories) and nothing else in the repo referenced the rest.
 * Tests nobody runs rot silently — when this gate was first assembled four of
 * the `components/lesson` suites were red, every one of them a stale assertion
 * left behind by an intentional change (the CCSS textbook port moving lesson
 * content out of the California seeds, and an `interactive-lesson` branch added
 * ahead of two source-shape regexes).
 *
 * Discovery, rather than a hand-kept list, is the point: a new
 * `components/**` test is picked up by existing it, so the same drift cannot
 * start again.
 *
 * Compilation follows the pattern the other gates use — compile the project to
 * a scratch dir, then symlink `@/*` to the COMPILED output (not the TS sources)
 * so `node --test` can resolve the path alias. Override the app's `jsx:
 * preserve` setting for this Node-only output: preserving JSX emits `.jsx`
 * files that CommonJS cannot load, which would prevent component tests from
 * importing and rendering production TSX modules.
 */

const outputDir = join(".tmp", `component-tests-${process.pid}-${Date.now()}`);
const tscBin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

/**
 * `components/visualizations/three/**` is deliberately not in this gate yet: it
 * carries ~1770 passing assertions but also 8 pre-existing failures owned by the
 * in-flight visualization stream. Including it would land CI red on someone
 * else's work. Drop this entry once that stream is green.
 */
const excludedDirs = [join("components", "visualizations", "three")];

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

function collectTests(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      found.push(...collectTests(path));
    } else if (entry.name.endsWith(".test.js")) {
      found.push(path);
    }
  }
  return found;
}

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
    "node",
    "--jsx",
    "react-jsx"
  ]);
  if (!compiled) {
    console.error("\n✗ tsc failed to compile the component tests.");
    process.exit(process.exitCode ?? 1);
  }

  const aliasRoot = join(outputDir, "node_modules", "@");
  mkdirSync(aliasRoot, { recursive: true });
  for (const dir of ["app", "data", "lib", "components", "types"]) {
    try {
      symlinkSync(join("..", "..", dir), join(aliasRoot, dir));
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }

  const isExcluded = (path) => {
    const rel = relative(outputDir, path);
    return excludedDirs.some((dir) => rel === dir || rel.startsWith(`${dir}${sep}`));
  };

  const tests = collectTests(join(outputDir, "components"))
    .filter((path) => !isExcluded(path))
    .sort();

  if (!tests.length) {
    console.error("\n✗ No component tests were discovered — the gate would pass vacuously.");
    process.exit(1);
  }

  console.log(`Running ${tests.length} component test files…\n`);
  if (!run("node", ["--test", ...tests])) {
    console.error("\n✗ Component tests failed.");
  }
} finally {
  cleanup();
}

// Any non-zero status, not just 1 — a crashed runner must not print success.
if (process.exitCode) process.exit(process.exitCode);
console.log("\n✓ Component tests passed.");
