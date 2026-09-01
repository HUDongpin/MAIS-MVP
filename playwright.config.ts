import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";
const e2eTeacherInviteCode =
  process.env.HK_MATH_E2E_TEACHER_INVITE_CODE?.trim() || "e2e-teacher-invite";
const runId = sanitizePathSegment(process.env.PLAYWRIGHT_RUN_ID ?? `${port}-${process.pid}`);
const e2eRuntimeRoot = path.resolve(".tmp", "china-lesson-e2e-runtime");
const e2eOwnedRunRoot = path.join(e2eRuntimeRoot, "runs", runId);
const e2eOwnedOutputRoot = path.join(e2eRuntimeRoot, "outputs", runId);
const e2eQuarantineRoot = path.join(e2eRuntimeRoot, "quarantine", runId);
const e2eRunRootInput = resolveConfiguredGeneratedPath(
  "PLAYWRIGHT_E2E_ROOT",
  process.env.PLAYWRIGHT_E2E_ROOT,
  e2eOwnedRunRoot
);
const e2eRunRoot = e2eRunRootInput.absolute;
const e2eNextDistInput = resolveConfiguredGeneratedPath(
  "PLAYWRIGHT_NEXT_DIST_DIR",
  process.env.PLAYWRIGHT_NEXT_DIST_DIR,
  path.join(e2eRunRoot, "next-dist")
);
const e2eNextDistDir = e2eNextDistInput.absolute;
const e2eNextDistEnvPath = path.relative(path.resolve("."), e2eNextDistDir).replace(/\\/g, "/");
const e2eNextTsconfigInput = resolveConfiguredGeneratedPath(
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
  path.join(e2eRunRoot, "tsconfig.playwright.tmp.json")
);
const e2eNextTsconfigPath = e2eNextTsconfigInput.absolute;
const e2eNextTsconfigEnvPath = path.relative(path.resolve("."), e2eNextTsconfigPath).replace(/\\/g, "/");
const e2eDbInput = resolveConfiguredGeneratedPath(
  "HK_MATH_DB_PATH",
  process.env.HK_MATH_DB_PATH,
  path.join(e2eRunRoot, "db", "hk-math.sqlite")
);
const e2eDbPath = e2eDbInput.absolute;
const e2eOutputInput = resolveConfiguredGeneratedPath(
  "PLAYWRIGHT_OUTPUT_DIR",
  process.env.PLAYWRIGHT_OUTPUT_DIR,
  path.join(e2eRunRoot, "test-results")
);
const e2eOutputDir = e2eOutputInput.absolute;
const e2eReportInput = resolveConfiguredGeneratedPath(
  "PLAYWRIGHT_REPORT_DIR",
  process.env.PLAYWRIGHT_REPORT_DIR,
  path.join(e2eRunRoot, "playwright-report")
);
const e2eReportDir = e2eReportInput.absolute;
process.env.PLAYWRIGHT_RUN_ID = runId;
process.env.PLAYWRIGHT_E2E_ROOT = e2eRunRoot;
process.env.PLAYWRIGHT_NEXT_DIST_DIR = e2eNextDistDir;
process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH = e2eNextTsconfigPath;
process.env.HK_MATH_DB_PATH = e2eDbPath;
process.env.PLAYWRIGHT_OUTPUT_DIR = e2eOutputDir;
process.env.PLAYWRIGHT_REPORT_DIR = e2eReportDir;
const disabledProviderEnv = [
  "LLM_API_KEY=",
  "OPENAI_API_KEY=",
  "LLM_MODEL=",
  "OPENAI_MODEL=",
  "LLM_API_URL=",
  "DEEPSEEK_API_KEY=",
  "DEEPSEEK_MODEL=",
  "DEEPSEEK_API_URL=",
  "QWEN_API_KEY=",
  "QWEN_API_URL=",
  "QWEN_MODEL=",
  "QWEN_TEXT_MODEL=qwen3.8-max",
  "AI_TUTOR_QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_API_URL=",
  "QWEN_REALTIME_MODEL=",
  "QWEN_REALTIME_API_URL=",
  "AI_TUTOR_PROVIDER_PROFILE=offline-fixture"
].join(" ");
const isolatedStatefulSpecs = [
  "tests/e2e/rewards.spec.ts",
  "tests/e2e/gamification.spec.ts",
  "tests/e2e/fishing-game.spec.ts",
  "tests/e2e/adventure-island.spec.ts",
  "tests/e2e/parent-console-stress.spec.ts",
  "tests/e2e/teacher-parent-p1-regressions.spec.ts"
];
const selectedSpecArgs = process.argv
  .slice(2)
  .map((arg) => arg.replace(/\\/g, "/"))
  .map((arg) => arg.replace(/:\d+(?::\d+)?$/u, ""))
  .filter((arg) => arg.endsWith(".spec.ts") || arg.includes("tests/e2e/"));
const runsOnlyIsolatedStatefulSpecs =
  selectedSpecArgs.length > 0 &&
  selectedSpecArgs.every((arg) => isolatedStatefulSpecs.some((spec) => arg === spec || arg.endsWith(`/${spec}`)));
const useGlobalWebServer = !process.env.PLAYWRIGHT_SKIP_WEBSERVER && !runsOnlyIsolatedStatefulSpecs;

assertSafeE2eGeneratedPath("PLAYWRIGHT_E2E_ROOT", e2eRunRoot);
assertSafeE2eGeneratedPath("PLAYWRIGHT_NEXT_DIST_DIR", e2eNextDistDir);
assertSafeE2eGeneratedPath("PLAYWRIGHT_OUTPUT_DIR", e2eOutputDir);
assertSafeE2eGeneratedPath("PLAYWRIGHT_REPORT_DIR", e2eReportDir);
assertSafeE2eGeneratedPath("HK_MATH_DB_PATH", e2eDbPath);
assertSafeE2eGeneratedPath("PLAYWRIGHT_NEXT_TSCONFIG_PATH", e2eNextTsconfigPath);
const e2eNextDistCleanupRoot = assertRunOwnedCleanupPaths();
assertRequiredE2eRuntimePaths();

function sanitizePathSegment(value: string) {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
  return sanitized === "." || sanitized === ".." ? "default" : sanitized;
}

function assertNoRawParentTraversal(label: string, value: string) {
  if (value.split(/[\\/]+/u).includes("..")) {
    throw new Error(`${label} must not contain parent traversal (..).`);
  }
}

function resolveConfiguredGeneratedPath(label: string, configuredValue: string | undefined, fallback: string) {
  const rawValue = configuredValue?.trim() || fallback;
  assertNoRawParentTraversal(label, rawValue);
  return { label, raw: rawValue, absolute: path.resolve(rawValue) };
}

function isPathInside(absolutePath: string, root: string) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePhysicalPath(value: string) {
  const absolutePath = path.resolve(value);
  const missingSegments: string[] = [];
  let existingAncestor = absolutePath;

  while (true) {
    try {
      fs.lstatSync(existingAncestor);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) {
        throw new Error(`Could not resolve an existing ancestor for Playwright path: ${absolutePath}`);
      }
      missingSegments.unshift(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }

  let physicalAncestor: string;
  try {
    physicalAncestor = fs.realpathSync(existingAncestor);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not resolve Playwright path ${absolutePath}: ${reason}`);
  }
  return path.resolve(physicalAncestor, ...missingSegments);
}

function assertSafeE2eGeneratedPath(label: string, value: string) {
  const absolutePath = path.resolve(value);
  const defaultNextDir = path.resolve(".next");
  const tmpDir = path.resolve(".tmp");
  const physicalPath = resolvePhysicalPath(absolutePath);
  const physicalDefaultNextDir = resolvePhysicalPath(defaultNextDir);
  const physicalTmpDir = resolvePhysicalPath(tmpDir);

  if (
    absolutePath === defaultNextDir
    || isPathInside(absolutePath, defaultNextDir)
    || physicalPath === physicalDefaultNextDir
    || isPathInside(physicalPath, physicalDefaultNextDir)
  ) {
    throw new Error(`${label} must not point at the shared .next directory for Playwright release runs.`);
  }

  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS !== "1") {
    if (!isPathInside(absolutePath, tmpDir)) {
      throw new Error(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set.`);
    }
    if (!isPathInside(physicalPath, physicalTmpDir)) {
      throw new Error(`${label} must resolve under the worktree .tmp directory: ${physicalPath}`);
    }
  }
}

function isStrictPathInside(absolutePath: string, root: string) {
  return absolutePath !== root && isPathInside(absolutePath, root);
}

function pathStaysWithinPhysicalRoot(value: string, root: string, allowRoot: boolean) {
  const absolutePath = path.resolve(value);
  const absoluteRoot = path.resolve(root);
  const physicalPath = resolvePhysicalPath(absolutePath);
  const physicalRoot = resolvePhysicalPath(absoluteRoot);
  const lexicalMatch = allowRoot
    ? isPathInside(absolutePath, absoluteRoot)
    : isStrictPathInside(absolutePath, absoluteRoot);
  const physicalMatch = allowRoot
    ? isPathInside(physicalPath, physicalRoot)
    : isStrictPathInside(physicalPath, physicalRoot);
  return lexicalMatch && physicalMatch;
}

function assertRunOwnedCleanupPaths() {
  if (!pathStaysWithinPhysicalRoot(e2eRunRoot, e2eOwnedRunRoot, true)) {
    throw new Error(
      `PLAYWRIGHT_E2E_ROOT must stay within its run-owned cleanup root (${e2eOwnedRunRoot}): ${e2eRunRoot}`
    );
  }

  if (pathStaysWithinPhysicalRoot(e2eNextDistDir, e2eRunRoot, false)) {
    return e2eRunRoot;
  }
  if (pathStaysWithinPhysicalRoot(e2eNextDistDir, e2eOwnedOutputRoot, false)) {
    return e2eOwnedOutputRoot;
  }
  throw new Error(
    "PLAYWRIGHT_NEXT_DIST_DIR must be a strict descendant of PLAYWRIGHT_E2E_ROOT " +
    `or its run-owned output root (${e2eOwnedOutputRoot}): ${e2eNextDistDir}`
  );
}

function assertRequiredE2eRuntimePaths() {
  const configuredRoot = process.env.MAIS_E2E_REQUIRED_WRITE_ROOT?.trim();
  if (!configuredRoot) return;

  assertNoRawParentTraversal("MAIS_E2E_REQUIRED_WRITE_ROOT", configuredRoot);

  if (Object.prototype.hasOwnProperty.call(process.env, "MAIS_ALLOW_EXTERNAL_ARTIFACTS")) {
    throw new Error(
      "MAIS_ALLOW_EXTERNAL_ARTIFACTS must be unset when MAIS_E2E_REQUIRED_WRITE_ROOT is enabled."
    );
  }

  const requiredRoot = resolvePhysicalPath(configuredRoot);
  const repoRoot = resolvePhysicalPath(".");
  if (!isPathInside(repoRoot, requiredRoot)) {
    throw new Error(`Playwright worktree must stay under MAIS_E2E_REQUIRED_WRITE_ROOT: ${requiredRoot}`);
  }

  const generatedPaths = [
    ["PLAYWRIGHT_E2E_ROOT", e2eRunRoot],
    ["PLAYWRIGHT_NEXT_DIST_DIR", e2eNextDistDir],
    ["PLAYWRIGHT_OUTPUT_DIR", e2eOutputDir],
    ["PLAYWRIGHT_REPORT_DIR", e2eReportDir],
    ["HK_MATH_DB_PATH", e2eDbPath],
    ["PLAYWRIGHT_NEXT_TSCONFIG_PATH", e2eNextTsconfigPath]
  ] as const;
  for (const [label, value] of generatedPaths) {
    const absolutePath = path.resolve(value);
    if (!isPathInside(absolutePath, requiredRoot)) {
      throw new Error(`${label} must stay under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${absolutePath}`);
    }
    const physicalPath = resolvePhysicalPath(absolutePath);
    if (!isPathInside(physicalPath, requiredRoot)) {
      throw new Error(`${label} must resolve under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${physicalPath}`);
    }
  }

  const runRoot = path.resolve(e2eRunRoot);
  const physicalRunRoot = resolvePhysicalPath(runRoot);
  const runtimePathVariables = [
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_CACHE_HOME",
    "NODE_COMPILE_CACHE",
    "PLAYWRIGHT_BROWSERS_PATH",
    "npm_config_cache",
    "npm_config_logs_dir"
  ] as const;
  for (const label of runtimePathVariables) {
    const value = process.env[label]?.trim();
    if (!value) {
      throw new Error(`${label} is required when MAIS_E2E_REQUIRED_WRITE_ROOT is enabled.`);
    }
    assertNoRawParentTraversal(label, value);
    const absolutePath = path.resolve(value);
    if (!isPathInside(absolutePath, requiredRoot)) {
      throw new Error(`${label} must stay under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${absolutePath}`);
    }
    const physicalPath = resolvePhysicalPath(absolutePath);
    if (!isPathInside(physicalPath, requiredRoot)) {
      throw new Error(`${label} must resolve under MAIS_E2E_REQUIRED_WRITE_ROOT (${requiredRoot}): ${physicalPath}`);
    }
    if (
      isPathInside(absolutePath, runRoot)
      || isPathInside(runRoot, absolutePath)
      || isPathInside(physicalPath, physicalRunRoot)
      || isPathInside(physicalRunRoot, physicalPath)
    ) {
      throw new Error(`${label} must stay outside PLAYWRIGHT_E2E_ROOT so webServer cleanup cannot remove it.`);
    }
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function cleanupGeneratedPathsCommand(
  values: readonly {
    label: string;
    raw: string;
    absolute: string;
    allowedRoot: string;
    allowRoot: boolean;
  }[],
  quarantineRoot: string
) {
  const cleanupTargets = values.map((value) => ({
    label: value.label,
    raw: value.raw,
    canonical: value.absolute,
    allowedRoot: path.resolve(value.allowedRoot),
    allowRoot: value.allowRoot
  }));
  const script = `
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const targets = ${JSON.stringify(cleanupTargets)};
const runtimeRoot = ${JSON.stringify(e2eRuntimeRoot)};
const quarantineRoot = ${JSON.stringify(path.resolve(quarantineRoot))};

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  if (relative === "") return true;
  if (relative.startsWith("..")) return false;
  return !path.isAbsolute(relative);
}

function isStrictInside(candidate, root) {
  if (candidate === root) return false;
  return isInside(candidate, root);
}

function hasParentTraversal(value) {
  return value.split(/[\\\\/]+/u).includes("..");
}

function resolvePhysicalWithoutSymlinkAncestors(value) {
  const absolutePath = path.resolve(value);
  const missingSegments = [];
  let existingAncestor = absolutePath;

  while (true) {
    try {
      fs.lstatSync(existingAncestor);
      break;
    } catch (error) {
      if (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) {
        throw new Error("Could not resolve cleanup target ancestor: " + absolutePath);
      }
      missingSegments.unshift(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }

  let cursor = existingAncestor;
  while (true) {
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      throw new Error("Refusing Playwright cleanup through symlinked ancestor: " + cursor);
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return path.resolve(fs.realpathSync(existingAncestor), ...missingSegments);
}

function assertOwnerOnlyDirectory(value, label) {
  const stat = fs.lstatSync(value);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(label + " must be a real directory: " + value);
  }
  if (typeof process.getuid === "function") {
    if (stat.uid !== process.getuid()) {
      throw new Error(label + " must be owned by the cleanup process: " + value);
    }
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error(label + " must be owner-only (0700): " + value);
  }
  return stat;
}

const repoRoot = fs.realpathSync(process.cwd());
const tmpRoot = path.join(repoRoot, ".tmp");
const physicalTmpRoot = resolvePhysicalWithoutSymlinkAncestors(tmpRoot);
const physicalRuntimeRoot = resolvePhysicalWithoutSymlinkAncestors(runtimeRoot);
const defaultNextDir = path.join(repoRoot, ".next");
const physicalDefaultNextDir = resolvePhysicalWithoutSymlinkAncestors(defaultNextDir);
const configuredHome = process.env.HOME?.trim();
const physicalHome = configuredHome
  ? resolvePhysicalWithoutSymlinkAncestors(configuredHome)
  : null;
const configuredRequiredRoot = process.env.MAIS_E2E_REQUIRED_WRITE_ROOT?.trim();
if (configuredRequiredRoot) {
  if (hasParentTraversal(configuredRequiredRoot)) {
    throw new Error("MAIS_E2E_REQUIRED_WRITE_ROOT must not contain parent traversal (..)." );
  }
  if (Object.prototype.hasOwnProperty.call(process.env, "MAIS_ALLOW_EXTERNAL_ARTIFACTS")) {
    throw new Error("MAIS_ALLOW_EXTERNAL_ARTIFACTS must be unset when MAIS_E2E_REQUIRED_WRITE_ROOT is enabled.");
  }
}
const requiredRoot = configuredRequiredRoot
  ? resolvePhysicalWithoutSymlinkAncestors(configuredRequiredRoot)
  : null;

if (!isInside(physicalRuntimeRoot, physicalTmpRoot) || physicalRuntimeRoot === physicalTmpRoot) {
  throw new Error("Playwright cleanup runtime must remain below the worktree .tmp directory: " + physicalRuntimeRoot);
}
if (!isInside(quarantineRoot, runtimeRoot) || quarantineRoot === runtimeRoot) {
  throw new Error("Playwright cleanup quarantine must remain below its dedicated runtime: " + quarantineRoot);
}
fs.mkdirSync(quarantineRoot, { recursive: true, mode: 0o700 });
const physicalQuarantineParent = resolvePhysicalWithoutSymlinkAncestors(quarantineRoot);
if (!isInside(physicalQuarantineParent, physicalRuntimeRoot) || physicalQuarantineParent === physicalRuntimeRoot) {
  throw new Error("Playwright cleanup quarantine resolved outside its dedicated runtime: " + physicalQuarantineParent);
}
assertOwnerOnlyDirectory(physicalQuarantineParent, "Playwright cleanup quarantine parent");
const invocationQuarantine = fs.mkdtempSync(path.join(physicalQuarantineParent, "cleanup-"));
const physicalInvocationQuarantine = resolvePhysicalWithoutSymlinkAncestors(invocationQuarantine);
if (!isInside(physicalInvocationQuarantine, physicalQuarantineParent)) {
  throw new Error("Playwright invocation quarantine escaped its owner-only parent: " + physicalInvocationQuarantine);
}
assertOwnerOnlyDirectory(physicalInvocationQuarantine, "Playwright invocation quarantine");
if (requiredRoot) {
  if (!isInside(repoRoot, requiredRoot)) {
    throw new Error("Playwright worktree must stay under MAIS_E2E_REQUIRED_WRITE_ROOT: " + requiredRoot);
  }
  if (!isInside(physicalRuntimeRoot, requiredRoot)) {
    throw new Error("Playwright cleanup runtime must stay under MAIS_E2E_REQUIRED_WRITE_ROOT: " + requiredRoot);
  }
  if (!isInside(physicalInvocationQuarantine, requiredRoot)) {
    throw new Error("Playwright cleanup quarantine must stay under MAIS_E2E_REQUIRED_WRITE_ROOT: " + requiredRoot);
  }
}

for (const target of targets) {
  if (hasParentTraversal(target.raw)) {
    throw new Error(target.label + " must not contain parent traversal (..)." );
  }
  const resolvedRawTarget = path.resolve(target.raw);
  if (resolvedRawTarget !== target.canonical || path.resolve(target.canonical) !== target.canonical) {
    throw new Error(target.label + " cleanup target changed after canonical validation: " + target.canonical);
  }

  const absoluteAllowedRoot = path.resolve(target.allowedRoot);
  if (absoluteAllowedRoot !== target.allowedRoot) {
    throw new Error(target.label + " cleanup root must be canonical: " + target.allowedRoot);
  }
  const physicalAllowedRoot = resolvePhysicalWithoutSymlinkAncestors(absoluteAllowedRoot);
  const physicalTarget = resolvePhysicalWithoutSymlinkAncestors(target.canonical);
  const lexicalAllowed = target.allowRoot
    ? isInside(target.canonical, absoluteAllowedRoot)
    : isStrictInside(target.canonical, absoluteAllowedRoot);
  const physicalAllowed = target.allowRoot
    ? isInside(physicalTarget, physicalAllowedRoot)
    : isStrictInside(physicalTarget, physicalAllowedRoot);
  if (!lexicalAllowed || !physicalAllowed) {
    throw new Error(target.label + " cleanup target escaped its run-owned root: " + physicalTarget);
  }

  const filesystemRoot = path.parse(physicalTarget).root;
  if (
    physicalTarget === filesystemRoot
    || isInside(repoRoot, physicalTarget)
    || physicalTarget === physicalTmpRoot
    || physicalTarget === physicalRuntimeRoot
    || physicalTarget === physicalQuarantineParent
    || physicalTarget === physicalInvocationQuarantine
    || (physicalHome ? isInside(physicalHome, physicalTarget) : false)
  ) {
    throw new Error("Refusing broad Playwright cleanup target: " + physicalTarget);
  }
  if (
    target.canonical === defaultNextDir
    || isInside(target.canonical, defaultNextDir)
    || physicalTarget === physicalDefaultNextDir
    || isInside(physicalTarget, physicalDefaultNextDir)
  ) {
    throw new Error("Refusing Playwright cleanup of the shared .next directory: " + physicalTarget);
  }

  if (!isInside(target.canonical, runtimeRoot) || !isInside(physicalTarget, physicalRuntimeRoot)) {
    throw new Error("Playwright cleanup target must remain under its dedicated runtime: " + physicalTarget);
  }
  if (requiredRoot) {
    if (!isInside(target.canonical, requiredRoot) || !isInside(physicalTarget, requiredRoot)) {
      throw new Error("Playwright cleanup target must remain under MAIS_E2E_REQUIRED_WRITE_ROOT: " + physicalTarget);
    }
  }

  let targetStat;
  try {
    targetStat = fs.lstatSync(physicalTarget);
  } catch (error) {
    if (error) {
      if (error.code === "ENOENT") continue;
    }
    throw error;
  }
  if (targetStat.isSymbolicLink()) {
    throw new Error("Refusing Playwright cleanup of a symlink target: " + physicalTarget);
  }

  if (process.env.NODE_ENV === "test") {
    if (process.env.PLAYWRIGHT_CLEANUP_TEST_SWAP_BEFORE_RENAME === target.label) {
      const heldOriginal = physicalTarget + ".path-safety-held-original";
      if (fs.existsSync(heldOriginal)) {
        throw new Error("Synthetic cleanup race hold path already exists: " + heldOriginal);
      }
      fs.renameSync(physicalTarget, heldOriginal);
      fs.mkdirSync(physicalTarget, { recursive: true, mode: 0o700 });
      fs.writeFileSync(path.join(physicalTarget, "replacement-marker.txt"), "synthetic race replacement");
    }
  }

  const quarantinedTarget = path.join(physicalInvocationQuarantine, process.pid + "-" + randomUUID());
  try {
    fs.renameSync(physicalTarget, quarantinedTarget);
  } catch (error) {
    if (error) {
      if (error.code === "ENOENT") continue;
    }
    throw error;
  }

  const quarantinedStat = fs.lstatSync(quarantinedTarget);
  if (quarantinedStat.dev !== targetStat.dev || quarantinedStat.ino !== targetStat.ino) {
    throw new Error(target.label + " identity changed before quarantine deletion; preserved without recursive removal.");
  }
  if (quarantinedStat.isSymbolicLink()) {
    fs.unlinkSync(quarantinedTarget);
  } else if (quarantinedStat.isDirectory()) {
    fs.rmSync(quarantinedTarget, { recursive: true, force: true });
  } else {
    fs.unlinkSync(quarantinedTarget);
  }
}
fs.rmdirSync(physicalInvocationQuarantine);
`;
  return `node -e ${shellQuote(script)}`;
}

// Extra build-output globs the e2e temp tsconfig excludes on top of the
// canonical set. These are non-dot dirs `**/*.ts` would otherwise sweep;
// `.tmp` is intentionally NOT here because the temp config's own dist-types
// include lives under it.
const e2eTempTsconfigHardeningExcludes = [
  ".next-*",
  ".s??-*",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var",
  "var/**/*",
  "MAIS-MVP-*",
  "MAIS-MVP-*/**/*"
];

// Reuse tsconfig.json's own `exclude` as the single source of truth so the
// generated e2e temp tsconfig can't drift out of sync with it. That drift once
// dropped `private/**/*` here and let a stale private/tmp/*-next validator.ts
// (referencing a since-deleted route) fail the e2e build before any test ran.
// tsconfig.json is the right base — it's the config the custom-distDir build
// actually uses, and unlike tsconfig.next.json it does not exclude `.tmp`,
// where the temp config's dist-types include lives.
function e2eTempTsconfigExcludeGlobs() {
  const baseTsconfigPath = path.resolve("tsconfig.json");
  const { config, error } = ts.readConfigFile(baseTsconfigPath, (file) => ts.sys.readFile(file));
  const canonical = Array.isArray(config?.exclude) ? (config.exclude as string[]) : null;
  if (error || !canonical) {
    throw new Error(
      `Could not read \`exclude\` from ${baseTsconfigPath} for the e2e temp tsconfig` +
      `${error ? `: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}` : "."}`
    );
  }
  return Array.from(new Set([...canonical, ...e2eTempTsconfigHardeningExcludes]));
}

// E2E builds use a custom NEXT_DIST_DIR. Including the shared `.next/types`
// can mix stale route artifacts from another worktree into this run.
function writeTempTsconfigCommand(tsconfigPath: string, nextDistDir: string) {
  const tsconfigDir = path.dirname(path.resolve(tsconfigPath));
  const pathFromTsconfigDir = (target: string) => {
    const relative = path.relative(tsconfigDir, path.resolve(target)).replace(/\\/g, "/");
    return relative || ".";
  };
  const repoGlobFromTsconfigDir = (glob: string) => {
    const repoPrefix = pathFromTsconfigDir(".");
    return repoPrefix === "." ? glob : `${repoPrefix}/${glob}`;
  };
  const content = JSON.stringify({
    extends: repoGlobFromTsconfigDir("tsconfig.json"),
    compilerOptions: {
      baseUrl: pathFromTsconfigDir("."),
      paths: { "@/*": ["*"] },
      plugins: [{ name: "next" }]
    },
    include: [
      repoGlobFromTsconfigDir("next-env.d.ts"),
      repoGlobFromTsconfigDir("**/*.ts"),
      repoGlobFromTsconfigDir("**/*.tsx"),
      `${pathFromTsconfigDir(nextDistDir)}/types/**/*.ts`
    ],
    exclude: e2eTempTsconfigExcludeGlobs().map(repoGlobFromTsconfigDir)
  }, null, 2);
  const script = `require("fs").writeFileSync(${JSON.stringify(tsconfigPath)}, ${JSON.stringify(content)})`;
  return `node -e ${shellQuote(script)}`;
}

// Only honour the override when it parses to a positive finite number. An empty
// or malformed value must fall back to the default rather than reaching Playwright
// as 0 or NaN: 0 means "no timeout", which would silently restore the unbounded
// waits this setting exists to prevent.
function resolveActionTimeoutMs() {
  const fallback = process.env.CI ? 90_000 : 45_000;
  const raw = process.env.PLAYWRIGHT_ACTION_TIMEOUT_MS?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `playwright.config: ignoring PLAYWRIGHT_ACTION_TIMEOUT_MS="${raw}" (want a positive number of ms); using ${fallback}.`
    );
    return fallback;
  }
  return parsed;
}

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: e2eOutputDir,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  // These are long, sequential teacher/parent journeys (navigate → create →
  // upload → publish → export in a single test). The default 30s per-test /
  // 5s expect timeouts are fine locally but too tight on the 2-core CI runner,
  // where a publish→POST→router.push round-trip alone can exceed 5s. Give CI
  // headroom; the flows themselves are verified working (POST 201 + navigation).
  timeout: process.env.CI ? 120_000 : 60_000,
  expect: { timeout: process.env.CI ? 15_000 : 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: e2eReportDir }]],
  use: {
    baseURL,
    channel: browserChannel || undefined,
    // Playwright's actionTimeout defaults to 0 (no timeout), and page.waitForResponse
    // inherits it. A matcher that can never fire therefore waits out the whole test
    // timeout instead of failing: a stale teacher-console-stress matcher (it awaited
    // POST /api/teacher/reports/save while the view posts the saved-reports alias)
    // burned 12 minutes per run and hid every later step in the spec.
    //
    // Sized from measurement, not guesswork. Re-running the suites with an 8s bound:
    // no *action* failed anywhere (actions settle on DOM interaction, so they never
    // wait on a slow backend) — only waitForResponse calls did, in the heaviest case
    // profile-avatar-upload's governed media-storage round trip. That spec passes at
    // the value below, so the slowest legitimate wait is between 8s and 45s. Verified
    // separately that this does bound waitForResponse: an unmatchable matcher fails
    // in 45.0s rather than running to the test timeout.
    //
    // Override when a suite has a justified slower wait, so the bound can never
    // become a trap for specs CI does not run:
    //   PLAYWRIGHT_ACTION_TIMEOUT_MS=120000 npx playwright test ...
    actionTimeout: resolveActionTimeoutMs(),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: !useGlobalWebServer
    ? undefined
    : {
        command: [
          cleanupGeneratedPathsCommand(
            [
              { ...e2eRunRootInput, allowedRoot: e2eOwnedRunRoot, allowRoot: true },
              { ...e2eNextDistInput, allowedRoot: e2eNextDistCleanupRoot, allowRoot: false }
            ],
            e2eQuarantineRoot
          ),
          `rm -f ${shellQuote(e2eNextTsconfigPath)}`,
          `mkdir -p ${shellQuote(path.dirname(e2eDbPath))} ${shellQuote(path.dirname(e2eNextTsconfigPath))} ${shellQuote(e2eOutputDir)}`,
          writeTempTsconfigCommand(e2eNextTsconfigPath, e2eNextDistDir),
          `node scripts/with-next-env-restore.mjs -- env NEXT_DIST_DIR=${shellQuote(e2eNextDistEnvPath)} NEXT_TSCONFIG_PATH=${shellQuote(e2eNextTsconfigEnvPath)} ${disabledProviderEnv} NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true npm run build`,
          `rm -f ${shellQuote(e2eNextTsconfigPath)}`,
          `env NEXT_DIST_DIR=${shellQuote(e2eNextDistEnvPath)} ${disabledProviderEnv} AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH=${shellQuote(e2eDbPath)} HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true TEACHER_INVITE_CODES=${shellQuote(e2eTeacherInviteCode)} AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 HK_MATH_E2E_LOGIN_IDENTIFIER_MAX=400 npm run start -- --hostname 127.0.0.1 --port ${port}`
        ].join(" && "),
        url: baseURL,
        gracefulShutdown: { signal: "SIGTERM", timeout: 20_000 },
        reuseExistingServer: false,
        timeout: 600_000
      },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"], isMobile: true }
    }
  ]
});
