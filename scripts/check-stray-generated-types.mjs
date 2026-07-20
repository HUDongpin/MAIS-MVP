#!/usr/bin/env node
// Pre-build guard against stale Next "types/validator.ts" dirs left in the repo
// tree by earlier builds. tsc's `**/*.ts` include does NOT skip non-dot dirs, so
// a stray `<some-dir>/types/validator.ts` referencing a since-deleted route gets
// swept into the type-check and fails `next build` with a cryptic
// "Cannot find module .../page.js" error before any test runs — exactly what a
// leftover private/tmp/*-next dir did. This turns that into a clear, early failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const ROUTE_SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const ROUTE_MODULE_PATTERN = /\/(page|route|layout|default|not-found|error|loading|template)\.(js|jsx|ts|tsx)$/;
const FALLBACK_EXCLUDE_DIRS = [
  "node_modules",
  "private",
  "Users",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var"
];

// Directory names we never descend into: dot-dirs and node_modules are never
// swept by tsc's `**/*.ts`, and the rest mirror the release tsconfig's `exclude`
// so we scan exactly the space a build would type-check. Reading the excludes
// from tsconfig keeps this in sync (a dir that is excluded there cannot break
// the build, so flagging it would be a false positive).
export function buildPruneMatchers({ repoRoot = REPO_ROOT, tsconfigName = "tsconfig.next.json" } = {}) {
  const exact = new Set(["node_modules"]);
  const globs = [];
  let usedTsconfig = false;
  try {
    const { config, error } = ts.readConfigFile(path.join(repoRoot, tsconfigName), (file) => ts.sys.readFile(file));
    if (!error && Array.isArray(config?.exclude)) {
      usedTsconfig = true;
      for (const entry of config.exclude) {
        const first = String(entry).split("/")[0];
        if (!first || first === "**") continue;
        if (first.includes("*")) {
          const source = `^${first.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`;
          globs.push(new RegExp(source));
        } else {
          exact.add(first);
        }
      }
    }
  } catch {
    // fall through to the fallback list
  }
  if (!usedTsconfig) FALLBACK_EXCLUDE_DIRS.forEach((name) => exact.add(name));
  return { exact, globs };
}

function isPrunedDir(name, matchers) {
  if (name.startsWith(".")) return true; // dot-dirs are skipped by tsc's `**/*.ts`
  if (matchers.exact.has(name)) return true;
  return matchers.globs.some((re) => re.test(name));
}

function collectStrayValidators(dir, matchers, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (isPrunedDir(entry.name, matchers)) continue;
      collectStrayValidators(path.join(dir, entry.name), matchers, out);
    } else if (entry.isFile() && entry.name === "validator.ts" && path.basename(dir) === "types") {
      out.push(path.join(dir, entry.name));
    }
  }
}

function analyzeValidator(validatorPath) {
  let text;
  try {
    text = fs.readFileSync(validatorPath, "utf8");
  } catch {
    return null;
  }
  // Only Next-generated route validators carry this shape; skip anything else so
  // a hand-written types/validator.ts is never misread.
  if (!/AppPageConfig|AppRouteHandlerConfig/.test(text) && !/as typeof import\(/.test(text)) return null;

  const dir = path.dirname(validatorPath);
  const missing = [];
  const seen = new Set();
  const importPattern = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importPattern.exec(text))) {
    const specifier = match[1];
    if (!ROUTE_MODULE_PATTERN.test(specifier)) continue;
    const base = path.resolve(dir, specifier).replace(/\.(js|jsx|ts|tsx)$/, "");
    if (seen.has(base)) continue;
    seen.add(base);
    if (!ROUTE_SOURCE_EXTENSIONS.some((ext) => fs.existsSync(base + ext))) missing.push(specifier);
  }
  return { validatorPath, missing };
}

export function findStrayGeneratedTypes({ repoRoot = REPO_ROOT } = {}) {
  const matchers = buildPruneMatchers({ repoRoot });
  const validators = [];
  collectStrayValidators(repoRoot, matchers, validators);

  const broken = [];
  const strayValid = [];
  for (const validatorPath of validators) {
    const analysis = analyzeValidator(validatorPath);
    if (!analysis) continue;
    const relativePath = toPosix(path.relative(repoRoot, analysis.validatorPath));
    if (analysis.missing.length > 0) broken.push({ path: relativePath, missing: analysis.missing });
    else strayValid.push(relativePath);
  }
  return { broken, strayValid };
}

export function assertNoBrokenStrayGeneratedTypes({ repoRoot = REPO_ROOT, logger = console } = {}) {
  const result = findStrayGeneratedTypes({ repoRoot });

  if (result.strayValid.length > 0) {
    logger.warn?.(
      `check-stray-generated-types: ${result.strayValid.length} stray Next type dir(s) sit in the type-checked tree ` +
        "(currently valid, but delete them or add them to the tsconfig `exclude` before they go stale):\n" +
        result.strayValid.map((p) => `  - ${p}`).join("\n")
    );
  }

  if (result.broken.length > 0) {
    const detail = result.broken
      .map(({ path: p, missing }) => `  - ${p}\n      references deleted route(s): ${missing.join(", ")}`)
      .join("\n");
    throw new Error(
      "Refusing to build: stray Next generated types reference deleted routes. They are swept into the type-check by " +
        '`**/*.ts` and will fail the build with a cryptic "Cannot find module .../page.js" error. Delete the stray build ' +
        "dir(s) or add them to the tsconfig `exclude`:\n" +
        detail
    );
  }

  return result;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const repoRoot = process.cwd();
  try {
    const { broken, strayValid } = assertNoBrokenStrayGeneratedTypes({ repoRoot });
    if (broken.length === 0 && strayValid.length === 0) {
      console.log("check-stray-generated-types: no stray Next generated types in the type-checked tree.");
    }
    process.exitCode = 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
