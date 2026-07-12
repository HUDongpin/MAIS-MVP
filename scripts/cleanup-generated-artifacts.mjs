#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const EXACT_GENERATED_DIRS = new Set([".next", ".tmp"]);
const GENERATED_DIR_PREFIXES = [".next-", ".s11"];
const GENERATED_FILE_PATTERNS = [
  /^tsconfig\.playwright-.*\.tmp.*\.json$/,
  /^tsconfig\..+\.tmp\.json$/
];
const APPLY_SKIP_PATTERNS = [
  /^\.s11-parent-audit-next\d+$/
];
const CLEANUP_SCOPES = new Set(["all", "vercel-staging", "next-builds", "release-build-gates", "tmp-scratch"]);

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    json: false,
    scope: "all"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--scope") {
      args.scope = parseCleanupScope(argv[++index]);
    } else if (arg.startsWith("--scope=")) {
      args.scope = parseCleanupScope(arg.slice("--scope=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.apply && argv.includes("--dry-run")) {
    throw new Error("Use either --dry-run or --apply, not both.");
  }

  return args;
}

function parseCleanupScope(value) {
  if (!value || !CLEANUP_SCOPES.has(value)) {
    throw new Error(`Invalid cleanup scope: ${value ?? ""}. Expected one of: ${Array.from(CLEANUP_SCOPES).join(", ")}.`);
  }
  return value;
}

function isGeneratedDirectory(name) {
  return EXACT_GENERATED_DIRS.has(name) || GENERATED_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isGeneratedFile(name) {
  return GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(name));
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

async function pathSize(absolutePath) {
  let total = 0;
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) {
      total += await pathSize(childPath);
    } else if (entry.isFile()) {
      const stat = await fs.stat(childPath);
      total += stat.size;
    }
  }
  return total;
}

async function generatedTargets(scope) {
  if (scope === "vercel-staging") {
    return await vercelStagingTargets();
  }
  if (scope === "next-builds") {
    return await nextBuildTargets();
  }
  if (scope === "release-build-gates") {
    return await releaseBuildGateTargets();
  }
  if (scope === "tmp-scratch") {
    return await existingDirectoryTargets([".tmp"]);
  }

  const targets = [];
  const entries = await fs.readdir(REPO_ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && isGeneratedDirectory(entry.name)) {
      const absolutePath = path.join(REPO_ROOT, entry.name);
      const bytes = await pathSize(absolutePath);
      if (entry.name === ".tmp" && bytes === 0) continue;
      targets.push({
        path: entry.name,
        type: "directory",
        bytes
      });
      continue;
    }

    if (entry.isFile() && isGeneratedFile(entry.name)) {
      const absolutePath = path.join(REPO_ROOT, entry.name);
      const stat = await fs.stat(absolutePath);
      targets.push({
        path: entry.name,
        type: "file",
        bytes: stat.size
      });
    }
  }

  return sortTargets(targets);
}

async function vercelStagingTargets() {
  return await existingDirectoryTargets([path.join(".tmp", "vercel-staging")]);
}

async function nextBuildTargets() {
  const relativePaths = new Set([".next", path.join(".tmp", "next-build-cache-backups")]);
  const tmpDir = path.join(REPO_ROOT, ".tmp");
  try {
    const tmpEntries = await fs.readdir(tmpDir, { withFileTypes: true });
    for (const entry of tmpEntries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (
        name.startsWith("next-") ||
        name.includes("-next") ||
        /^a22-current-version-build-/.test(name)
      ) {
        relativePaths.add(path.join(".tmp", name));
      }

      if (name.startsWith("e2e-run-")) {
        relativePaths.add(path.join(".tmp", name, "next-dist"));
      }
    }
    await collectNestedNextDist(path.join(tmpDir, "e2e-isolated"), ".tmp/e2e-isolated", relativePaths);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  return await existingDirectoryTargets(Array.from(relativePaths));
}

async function releaseBuildGateTargets() {
  const relativePaths = new Set();
  const tmpDir = path.join(REPO_ROOT, ".tmp");
  try {
    const tmpEntries = await fs.readdir(tmpDir, { withFileTypes: true });
    for (const entry of tmpEntries) {
      if (entry.isDirectory() && /^release-build-gate-next-/.test(entry.name)) {
        relativePaths.add(path.join(".tmp", entry.name));
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  return await existingDirectoryTargets(Array.from(relativePaths));
}

async function collectNestedNextDist(absoluteDirectory, relativeDirectory, relativePaths) {
  let entries;
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const absolutePath = path.join(absoluteDirectory, entry.name);
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.name === "next-dist") {
      relativePaths.add(relativePath);
      continue;
    }
    await collectNestedNextDist(absolutePath, relativePath, relativePaths);
  }
}

async function existingDirectoryTargets(relativePaths) {
  const targets = [];
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const target = await directoryTargetIfExists(absolutePath, relativePath);
    if (target) targets.push(target);
  }

  return sortTargets(targets);
}

async function directoryTargetIfExists(absolutePath, relativePath) {
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) return null;
    return {
      path: toPosix(relativePath),
      type: "directory",
      bytes: await pathSize(absolutePath)
    };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = await generatedTargets(args.scope);
  const skippedTargets = [];

  if (args.apply) {
    for (const target of targets) {
      if (shouldSkipApplyTarget(target)) {
        skippedTargets.push({
          ...target,
          reason: "skipped anomalous dataless generated directory; remove separately after preserving evidence"
        });
        continue;
      }
      await fs.rm(path.join(REPO_ROOT, target.path), {
        recursive: target.type === "directory",
        force: true,
        maxRetries: 10,
        retryDelay: 200
      });
    }
    await fs.mkdir(path.join(REPO_ROOT, ".tmp"), { recursive: true });
  }

  const summary = {
    dryRun: args.dryRun,
    apply: args.apply,
    scope: args.scope,
    targetCount: targets.length,
    totalBytes: targets.reduce((total, target) => total + target.bytes, 0),
    skippedTargets,
    targets
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(args.apply ? "Generated artifact cleanup apply complete" : "Generated artifact cleanup dry run");
  console.log(`Scope: ${args.scope}`);
  console.log(`Targets: ${summary.targetCount}`);
  console.log(`Reclaimable: ${formatBytes(summary.totalBytes)}`);
  for (const target of targets) {
    console.log(`- ${target.path} (${target.type}, ${formatBytes(target.bytes)})`);
  }
  for (const target of skippedTargets) {
    console.log(`Skipped: ${target.path} (${target.reason})`);
  }
  if (!args.apply) {
    console.log("No files were removed. After preserving needed Playwright traces/reports, rerun with --apply to delete these targets.");
  }
}

function sortTargets(targets) {
  return targets.sort((left, right) => {
    if (left.bytes !== right.bytes) return right.bytes - left.bytes;
    return left.path.localeCompare(right.path);
  });
}

function shouldSkipApplyTarget(target) {
  return target.type === "directory" && APPLY_SKIP_PATTERNS.some((pattern) => pattern.test(target.path));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
