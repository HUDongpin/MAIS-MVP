#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TMP_ROOT = path.join(REPO_ROOT, ".tmp");
const VERCEL_STAGING_ROOT = path.join(TMP_ROOT, "vercel-staging");
const DEFAULT_MIN_FREE_GB = 20;
const DEFAULT_DIRTY_TREE_MAP_MAX_AGE_MINUTES = 120;
const DEFAULT_VERCEL_SCOPE = "peter-dongpin-hu-s-projects";
const DIRTY_ROOT_DEPLOY_OVERRIDE = "MAIS_ALLOW_DIRTY_ROOT_DEPLOY";
const RELEASE_SOURCE_CLEAN_GATE = "coordination/release-intake/assert-release-source-clean.mjs";
const WORKTREE_LIFECYCLE_GATE = "coordination/release-intake/assert-worktree-lifecycle.mjs";
const REQUIRED_PRODUCTION_ENV = [
  "AUTH_SESSION_SECRET",
  "POSTGRES_URL",
  "HK_MATH_STORAGE_PROVIDER",
  "RESEND_API_KEY",
  "PASSWORD_RESET_FROM",
  "PASSWORD_RESET_BASE_URL",
  "HK_MATH_EXPOSE_LOCAL_RESET_LINKS",
  "QWEN_API_KEY",
  "QWEN_API_URL",
  "QWEN_TEXT_MODEL",
  "AI_TUTOR_TOTAL_DEADLINE_MS",
  "AI_TUTOR_EDGE_RESPONSE_RESERVE_MS",
  "AI_TUTOR_PROVIDER_TIMEOUT_MS",
  "AI_TUTOR_LATENCY_ALERT_P95_MS",
  "AI_TUTOR_LATENCY_ALERT_TIMEOUT_RATE"
];

function parseArgs(argv) {
  const modes = argv.filter((arg) => !arg.startsWith("-"));
  return {
    mode: modes[0] ?? "all",
    json: argv.includes("--json")
  };
}

function fail(message) {
  throw new Error(message);
}

function parsePositiveNumber(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(`Invalid positive number: ${value}`);
  }
  return parsed;
}

function availableBytes() {
  const output = execFileSync("df", ["-k", REPO_ROOT], { encoding: "utf8" });
  const lines = output.trim().split(/\n/);
  const columns = lines.at(-1)?.trim().split(/\s+/) ?? [];
  const availableKiB = Number(columns[3]);
  if (!Number.isFinite(availableKiB)) {
    fail(`Could not parse available disk space from df output:\n${output}`);
  }
  return availableKiB * 1024;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isInside(absolutePath, root) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeResolve(candidate) {
  return path.resolve(REPO_ROOT, candidate);
}

function assertNotDefaultNextDist(label, absolutePath) {
  const defaultNext = path.join(REPO_ROOT, ".next");
  if (absolutePath === defaultNext || isInside(absolutePath, defaultNext)) {
    fail(`${label} must not point at the shared .next directory for release E2E.`);
  }
}

function assertTmpScoped(label, absolutePath) {
  if (process.env.MAIS_ALLOW_EXTERNAL_ARTIFACTS === "1") return;
  if (!isInside(absolutePath, TMP_ROOT)) {
    fail(`${label} must stay under .tmp unless MAIS_ALLOW_EXTERNAL_ARTIFACTS=1 is set: ${absolutePath}`);
  }
}

function configuredE2eRoot() {
  const runId = process.env.PLAYWRIGHT_RUN_ID?.trim() || "release-preflight";
  return process.env.PLAYWRIGHT_E2E_ROOT?.trim() || path.join(".tmp", `e2e-run-${runId}`);
}

function assertE2eIsolation() {
  const configPath = path.join(REPO_ROOT, "playwright.config.ts");
  const config = fs.readFileSync(configPath, "utf8");
  for (const needle of ["PLAYWRIGHT_NEXT_DIST_DIR", "NEXT_DIST_DIR", "NEXT_TSCONFIG_PATH"]) {
    if (!config.includes(needle)) {
      fail(`playwright.config.ts is missing release isolation wiring: ${needle}`);
    }
  }

  const e2eRoot = configuredE2eRoot();
  const nextDist = process.env.PLAYWRIGHT_NEXT_DIST_DIR?.trim() || path.join(e2eRoot, "next-dist");
  const rootPath = safeResolve(e2eRoot);
  const nextDistPath = safeResolve(nextDist);

  assertNotDefaultNextDist("PLAYWRIGHT_E2E_ROOT", rootPath);
  assertNotDefaultNextDist("PLAYWRIGHT_NEXT_DIST_DIR", nextDistPath);
  assertTmpScoped("PLAYWRIGHT_E2E_ROOT", rootPath);
  assertTmpScoped("PLAYWRIGHT_NEXT_DIST_DIR", nextDistPath);

  if (process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1" && isLocalBaseURL(process.env.PLAYWRIGHT_BASE_URL)) {
    if (process.env.MAIS_ALLOW_SHARED_LOCAL_E2E_SERVER !== "1") {
      fail(
        [
          "PLAYWRIGHT_SKIP_WEBSERVER=1 with a local PLAYWRIGHT_BASE_URL is blocked for release E2E.",
          "Use the Playwright webServer path or startIsolatedApp so NEXT_DIST_DIR is controlled.",
          "For a deliberate one-off local probe, set MAIS_ALLOW_SHARED_LOCAL_E2E_SERVER=1."
        ].join("\n")
      );
    }
  }

  return {
    e2eRoot: rootPath,
    nextDist: nextDistPath
  };
}

function isLocalBaseURL(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function assertVercelStagingRoot() {
  const configured = process.env.VERCEL_STAGING_ROOT?.trim() || VERCEL_STAGING_ROOT;
  const stagingRoot = safeResolve(configured);
  if (stagingRoot === REPO_ROOT) {
    fail("VERCEL_STAGING_ROOT must not be the repository root.");
  }
  if (process.env.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING !== "1" && !isInside(stagingRoot, VERCEL_STAGING_ROOT)) {
    fail(`VERCEL_STAGING_ROOT must stay under .tmp/vercel-staging: ${stagingRoot}`);
  }
  return stagingRoot;
}

function assertDisk() {
  const minFreeGB = parsePositiveNumber(process.env.MAIS_RELEASE_MIN_FREE_GB, DEFAULT_MIN_FREE_GB);
  const freeBytes = availableBytes();
  const minBytes = minFreeGB * 1024 ** 3;
  if (freeBytes < minBytes) {
    fail(`Release guard failed: only ${formatBytes(freeBytes)} free; need at least ${minFreeGB} GB.`);
  }
  return {
    freeBytes,
    minFreeGB
  };
}

function shouldRun(mode, target) {
  return mode === "all" || mode === target;
}

function shouldRunRootDeploy(mode) {
  return mode === "root-deploy" || mode === "direct-deploy";
}

function shouldRunVercelEnv(mode) {
  return mode === "env" || mode === "vercel-env";
}

function shouldRunPublish(mode) {
  return mode === "publish" || mode === "prepublish";
}

function shouldRunStagedPublish(mode) {
  return mode === "staged-publish" || mode === "staging-publish";
}

function shouldRunPreviewRelease(mode) {
  return mode === "preview" || mode === "preview-release";
}

function shouldRunRuntimeRelease(mode) {
  return mode === "runtime-release" || shouldRunPreviewRelease(mode) || mode === "production";
}

function shouldRunReleaseSourceGates(mode) {
  return (
    shouldRunRuntimeRelease(mode) ||
    shouldRunRootDeploy(mode) ||
    shouldRunPublish(mode) ||
    shouldRunStagedPublish(mode)
  );
}

function gitOutput(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
}

function summarizeGitStatus() {
  const statusLines = gitOutput(["status", "--porcelain=v1"])
    .split("\n")
    .filter(Boolean);
  const untrackedFiles = gitOutput(["ls-files", "--others", "--exclude-standard"])
    .split("\n")
    .filter(Boolean);

  const summary = {
    statusEntries: statusLines.length,
    trackedModified: 0,
    trackedDeleted: 0,
    untrackedStatusEntries: 0,
    untrackedFiles: untrackedFiles.length
  };

  for (const line of statusLines) {
    const indexStatus = line[0] ?? " ";
    const worktreeStatus = line[1] ?? " ";
    if (line.startsWith("??")) {
      summary.untrackedStatusEntries += 1;
      continue;
    }
    if (indexStatus === "D" || worktreeStatus === "D") {
      summary.trackedDeleted += 1;
    } else {
      summary.trackedModified += 1;
    }
  }

  return summary;
}

function assertCleanRootForDirectDeploy() {
  const summary = summarizeRootDeployReadiness();
  if (summary.clean || summary.dirtyOverride) {
    return summary;
  }

  fail(formatDirtyRootDeployBlock(summary));
}

function summarizeRootDeployReadiness() {
  const summary = summarizeGitStatus();
  const dirty =
    summary.statusEntries > 0 ||
    summary.trackedModified > 0 ||
    summary.trackedDeleted > 0 ||
    summary.untrackedFiles > 0;

  if (!dirty) {
    return {
      ...summary,
      clean: true,
      dirtyOverride: false
    };
  }

  if (process.env[DIRTY_ROOT_DEPLOY_OVERRIDE] === "1") {
    return {
      ...summary,
      clean: false,
      dirtyOverride: true
    };
  }

  return {
    ...summary,
    clean: false,
    dirtyOverride: false
  };
}

function formatDirtyRootDeployBlock(summary) {
  return [
    "Direct root deploy is blocked because the worktree is dirty.",
    `Status entries: ${summary.statusEntries}`,
    `Tracked modified: ${summary.trackedModified}`,
    `Tracked deleted: ${summary.trackedDeleted}`,
    `Untracked status entries: ${summary.untrackedStatusEntries}`,
    `Untracked files: ${summary.untrackedFiles}`,
    "Use the A22 clean worktree, clean clone, reviewed release slice, or pruned staging path instead.",
    `Set ${DIRTY_ROOT_DEPLOY_OVERRIDE}=1 only for an explicit owner-approved emergency exception.`
  ].join("\n");
}

function parseVercelJsonOutput(output) {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    fail(`Vercel CLI did not return JSON output:\n${output}`);
  }
  try {
    return JSON.parse(output.slice(jsonStart));
  } catch (error) {
    fail(`Could not parse Vercel CLI JSON output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function listVercelEnvs() {
  const scope = process.env.VERCEL_SCOPE?.trim() || DEFAULT_VERCEL_SCOPE;
  const output = execFileSync("vercel", ["env", "ls", "--scope", scope, "--format", "json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  const parsed = parseVercelJsonOutput(output);
  if (!Array.isArray(parsed.envs)) {
    fail("Vercel env list JSON is missing the envs array.");
  }
  return {
    scope,
    envs: parsed.envs
  };
}

function assertVercelEnvReadiness() {
  const result = summarizeVercelEnvReadiness();
  if (result.missing.length > 0) {
    fail(formatVercelEnvBlock(result));
  }
  return result;
}

function summarizeVercelEnvReadiness() {
  const inventory = listVercelEnvs();
  const target = process.env.MAIS_RELEASE_ENV_TARGET?.trim() || "production";
  const required = REQUIRED_PRODUCTION_ENV;
  const present = [];
  const missing = [];

  for (const key of required) {
    const exists = inventory.envs.some((env) => {
      const targets = Array.isArray(env.target) ? env.target : [];
      return env.key === key && targets.includes(target);
    });
    if (exists) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  const result = {
    scope: inventory.scope,
    target,
    required,
    present,
    missing,
    envCount: inventory.envs.length
  };

  return result;
}

function formatVercelEnvBlock(result) {
  return [
    `Vercel ${result.target} environment is missing required release variables:`,
    ...result.missing.map((key) => `- ${key}`),
    "This check only inspects variable names and target environments; it does not read secret values.",
    "S19 must complete redacted Vercel environment parity before publish."
  ].join("\n");
}

function assertDirtyTreeMapCurrent() {
  const maxAgeMinutes = parsePositiveNumber(
    process.env.MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES,
    DEFAULT_DIRTY_TREE_MAP_MAX_AGE_MINUTES
  );
  const args = [
    "scripts/refresh-dirty-tree-map.mjs",
    "--assert-current",
    "--max-age-minutes",
    String(maxAgeMinutes),
    "--json"
  ];

  if (process.env.MAIS_DIRTY_TREE_MAP_JSON?.trim()) {
    args.splice(2, 0, "--latest-json", process.env.MAIS_DIRTY_TREE_MAP_JSON.trim());
  }

  try {
    const output = execFileSync(process.execPath, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    });
    const jsonStart = output.indexOf("{");
    if (jsonStart === -1) {
      fail(`Dirty-tree map guard did not return JSON:\n${output}`);
    }
    return JSON.parse(output.slice(jsonStart));
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    const stdout = error?.stdout?.toString?.() ?? "";
    const message = error instanceof Error ? error.message : String(error);
    fail(
      [
        "Runtime release preflight requires a fresh A25 dirty-tree map.",
        stdout.trim(),
        stderr.trim(),
        message
      ].filter(Boolean).join("\n")
    );
  }
}

function resolveGateScript(envName, defaultRelativePath) {
  const override = process.env[envName]?.trim();
  if (!override) return path.join(REPO_ROOT, defaultRelativePath);

  if (process.env.NODE_ENV !== "test" || process.env.MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS !== "1") {
    fail(`${envName} is only supported for release-env-guard tests.`);
  }

  return path.resolve(REPO_ROOT, override);
}

function runNodeGate(label, envName, defaultRelativePath, args = []) {
  const scriptPath = resolveGateScript(envName, defaultRelativePath);
  try {
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024
    });
    return {
      label,
      passed: true,
      script: path.relative(REPO_ROOT, scriptPath) || scriptPath,
      output: output.trim()
    };
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    const stdout = error?.stdout?.toString?.() ?? "";
    const message = error instanceof Error ? error.message : String(error);
    const details = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    if (details) {
      const heading = `${label} failed.`;
      fail(details.startsWith(heading) ? details : [heading, details].join("\n"));
    }
    fail([`${label} failed.`, message].join("\n"));
  }
}

function assertReleaseSourceGates() {
  const releaseSourceClean = runNodeGate(
    "A22 release-source clean gate",
    "MAIS_RELEASE_SOURCE_CLEAN_GATE",
    RELEASE_SOURCE_CLEAN_GATE
  );
  const strictWorktreeLifecycle = runNodeGate(
    "A25 strict worktree lifecycle gate",
    "MAIS_WORKTREE_LIFECYCLE_GATE",
    WORKTREE_LIFECYCLE_GATE,
    ["--strict"]
  );

  return {
    releaseSourceClean,
    strictWorktreeLifecycle
  };
}

function assertPublishReadiness() {
  const dirtyTreeMap = assertDirtyTreeMapCurrent();
  const e2e = assertE2eIsolation();
  const stagingRoot = assertVercelStagingRoot();
  const rootDeploy = summarizeRootDeployReadiness();
  const vercelEnv = summarizeVercelEnvReadiness();
  const blockers = [];

  if (!rootDeploy.clean && !rootDeploy.dirtyOverride) {
    blockers.push(formatDirtyRootDeployBlock(rootDeploy));
  }
  if (vercelEnv.missing.length > 0) {
    blockers.push(formatVercelEnvBlock(vercelEnv));
  }

  const result = {
    dirtyTreeMap,
    e2e,
    stagingRoot,
    rootDeploy,
    vercelEnv
  };

  if (blockers.length > 0) {
    fail(["Production publish preflight failed:", ...blockers].join("\n\n"));
  }

  return result;
}

function assertStagedPublishReadiness() {
  const dirtyTreeMap = assertDirtyTreeMapCurrent();
  const e2e = assertE2eIsolation();
  const stagingRoot = assertVercelStagingRoot();
  const vercelEnv = assertVercelEnvReadiness();

  return {
    dirtyTreeMap,
    e2e,
    stagingRoot,
    vercelEnv
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = {
    mode: args.mode,
    disk: assertDisk(),
    e2e: shouldRun(args.mode, "e2e") ? assertE2eIsolation() : undefined,
    dirtyTreeMap: shouldRunRuntimeRelease(args.mode) ? assertDirtyTreeMapCurrent() : undefined,
    releaseSource: shouldRunReleaseSourceGates(args.mode) ? assertReleaseSourceGates() : undefined,
    stagingRoot: shouldRun(args.mode, "staging") || shouldRunPreviewRelease(args.mode) ? assertVercelStagingRoot() : undefined,
    rootDeploy: shouldRunRootDeploy(args.mode) ? assertCleanRootForDirectDeploy() : undefined,
    vercelEnv: shouldRunVercelEnv(args.mode) ? assertVercelEnvReadiness() : undefined,
    publish: shouldRunPublish(args.mode) ? assertPublishReadiness() : undefined,
    stagedPublish: shouldRunStagedPublish(args.mode) ? assertStagedPublishReadiness() : undefined
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Release environment guard passed (${args.mode})`);
  console.log(`Free disk: ${formatBytes(result.disk.freeBytes)} (minimum ${result.disk.minFreeGB} GB)`);
  if (result.e2e) {
    console.log(`E2E root: ${path.relative(REPO_ROOT, result.e2e.e2eRoot)}`);
    console.log(`Next dist: ${path.relative(REPO_ROOT, result.e2e.nextDist)}`);
  }
  if (result.stagingRoot) {
    console.log(`Vercel staging root: ${path.relative(REPO_ROOT, result.stagingRoot)}`);
  }
  if (result.dirtyTreeMap) {
    console.log(`A25 dirty-tree map: ${result.dirtyTreeMap.latestJson}`);
    console.log(`Dirty-tree map generated at: ${result.dirtyTreeMap.generatedAt}`);
  }
  if (result.releaseSource) {
    console.log("A22 release-source clean gate: passed");
    console.log("A25 strict worktree lifecycle gate: passed");
  }
  if (result.rootDeploy) {
    console.log(
      result.rootDeploy.clean
        ? "Direct root deploy preflight: clean worktree"
        : "Direct root deploy preflight: dirty override active"
    );
    console.log(`Status entries: ${result.rootDeploy.statusEntries}`);
    console.log(`Untracked files: ${result.rootDeploy.untrackedFiles}`);
  }
  if (result.vercelEnv) {
    console.log(`Vercel env target: ${result.vercelEnv.target}`);
    console.log(`Required variables present: ${result.vercelEnv.present.length}/${result.vercelEnv.required.length}`);
  }
  if (result.publish) {
    console.log("Production publish preflight passed");
    console.log(`A25 dirty-tree map: ${result.publish.dirtyTreeMap.latestJson}`);
    console.log(`E2E root: ${path.relative(REPO_ROOT, result.publish.e2e.e2eRoot)}`);
    console.log(`Vercel env target: ${result.publish.vercelEnv.target}`);
  }
  if (result.stagedPublish) {
    console.log("Staged production publish preflight passed");
    console.log(`A25 dirty-tree map: ${result.stagedPublish.dirtyTreeMap.latestJson}`);
    console.log(`E2E root: ${path.relative(REPO_ROOT, result.stagedPublish.e2e.e2eRoot)}`);
    console.log(`Vercel staging root: ${path.relative(REPO_ROOT, result.stagedPublish.stagingRoot)}`);
    console.log(`Vercel env target: ${result.stagedPublish.vercelEnv.target}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
