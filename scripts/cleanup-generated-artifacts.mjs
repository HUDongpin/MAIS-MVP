#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const CLEANUP_SCOPES = new Set(["all", "vercel-staging", "next-builds", "release-build-gates", "tmp-scratch"]);
const CAPTURED_TARGET = Symbol("captured-generated-target");

export function validateGeneratedTargetPath({
  repoRoot = REPO_ROOT,
  relativePath
}) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing generated cleanup for a non-relative target: ${relativePath ?? ""}`);
  }

  const inputParts = toPosix(relativePath).split("/");
  if (inputParts.includes("..")) {
    throw new Error(`Refusing generated cleanup path traversal: ${relativePath}`);
  }

  const resolvedRepoRoot = path.resolve(repoRoot);
  const absolutePath = path.resolve(resolvedRepoRoot, relativePath);
  const normalizedRelativePath = toPosix(path.relative(resolvedRepoRoot, absolutePath));
  if (
    !normalizedRelativePath ||
    normalizedRelativePath === "." ||
    normalizedRelativePath.startsWith("../") ||
    path.isAbsolute(normalizedRelativePath)
  ) {
    throw new Error(`Refusing generated cleanup outside the repository: ${relativePath}`);
  }

  const [topLevelName] = normalizedRelativePath.split("/");
  const allowed = topLevelName === ".next"
    || topLevelName === ".tmp"
    || topLevelName.startsWith(".next-");
  if (!allowed) {
    throw new Error(
      `Refusing generated cleanup outside the allowlist (.next, top-level .next-*, .tmp): ${normalizedRelativePath}`
    );
  }

  return {
    absolutePath,
    relativePath: normalizedRelativePath,
    repoRoot: resolvedRepoRoot
  };
}

export async function captureGeneratedTarget({
  repoRoot = REPO_ROOT,
  relativePath,
  expectedType = "directory"
}) {
  if (!relativePath || !["directory", "file"].includes(expectedType)) {
    throw new Error("A generated target requires a relative path and an expected file type.");
  }

  const validatedTarget = validateGeneratedTargetPath({ repoRoot, relativePath });
  const resolvedRepoRoot = validatedTarget.repoRoot;
  const repoRootStat = await fs.lstat(resolvedRepoRoot, { bigint: true });
  if (repoRootStat.isSymbolicLink()) {
    throw new Error(`Refusing generated cleanup through a symbolic link repository root: ${resolvedRepoRoot}`);
  }
  if (!repoRootStat.isDirectory()) {
    throw new Error(`Generated cleanup repository root is not a directory: ${resolvedRepoRoot}`);
  }

  const absolutePath = validatedTarget.absolutePath;
  const normalizedRelativePath = validatedTarget.relativePath;

  const canonicalRepoRoot = await fs.realpath(resolvedRepoRoot);
  const pathParts = normalizedRelativePath.split("/");
  const identities = [{
    path: resolvedRepoRoot,
    identity: fileIdentity(repoRootStat)
  }];
  let currentPath = resolvedRepoRoot;

  for (let index = 0; index < pathParts.length; index += 1) {
    currentPath = path.join(currentPath, pathParts[index]);
    const currentStat = await fs.lstat(currentPath, { bigint: true });
    if (currentStat.isSymbolicLink()) {
      throw new Error(`Refusing generated cleanup through a symbolic link: ${currentPath}`);
    }

    const isTarget = index === pathParts.length - 1;
    if (!isTarget && !currentStat.isDirectory()) {
      throw new Error(`Refusing generated cleanup through a non-directory ancestor: ${currentPath}`);
    }
    identities.push({
      path: currentPath,
      identity: fileIdentity(currentStat)
    });
  }

  const targetStat = await fs.lstat(absolutePath, { bigint: true });
  if (!matchesExpectedType(targetStat, expectedType)) {
    throw new Error(`Refusing generated cleanup because target is not a ${expectedType}: ${absolutePath}`);
  }

  const canonicalTarget = await fs.realpath(absolutePath);
  if (!isPathInside(canonicalRepoRoot, canonicalTarget)) {
    throw new Error(`Refusing generated cleanup outside the canonical repository root: ${canonicalTarget}`);
  }

  return {
    absolutePath,
    canonicalRepoRoot,
    canonicalTarget,
    expectedType,
    identities,
    relativePath: normalizedRelativePath,
    repoRoot: resolvedRepoRoot,
    targetIdentity: fileIdentity(targetStat)
  };
}

export async function removeCapturedGeneratedTarget(capturedTarget, { fsApi = fs } = {}) {
  const validatedTarget = validateGeneratedTargetPath({
    repoRoot: capturedTarget?.repoRoot,
    relativePath: capturedTarget?.relativePath
  });
  if (
    validatedTarget.absolutePath !== capturedTarget.absolutePath ||
    validatedTarget.repoRoot !== capturedTarget.repoRoot
  ) {
    throw new Error(`Refusing generated cleanup because captured path metadata changed: ${capturedTarget?.relativePath ?? ""}`);
  }

  await assertCapturedTargetCurrent(capturedTarget, fsApi);

  const quarantinePath = path.join(
    path.dirname(capturedTarget.absolutePath),
    `.mais-cleanup-quarantine-${path.basename(capturedTarget.absolutePath)}-${process.pid}-${crypto.randomUUID()}`
  );
  let movedToQuarantine = false;

  try {
    await fsApi.rename(capturedTarget.absolutePath, quarantinePath);
    movedToQuarantine = true;

    await assertCapturedAncestorsCurrent(capturedTarget, fsApi);
    const canonicalQuarantinePath = await fsApi.realpath(quarantinePath);
    if (!isPathInside(capturedTarget.canonicalRepoRoot, canonicalQuarantinePath)) {
      throw new Error(`Generated cleanup quarantine escaped the repository: ${capturedTarget.relativePath}`);
    }
    const quarantinedStat = await fsApi.lstat(quarantinePath, { bigint: true });
    if (!sameFileIdentity(fileIdentity(quarantinedStat), capturedTarget.targetIdentity)) {
      throw new Error(`Generated cleanup target changed during quarantine rename: ${capturedTarget.relativePath}`);
    }

    await fsApi.rm(quarantinePath, {
      recursive: capturedTarget.expectedType === "directory",
      force: false,
      maxRetries: 10,
      retryDelay: 200
    });
    movedToQuarantine = false;
  } catch (error) {
    if (movedToQuarantine) {
      await restoreQuarantinedTarget(quarantinePath, capturedTarget.absolutePath, fsApi);
    }
    throw error;
  }
}

export async function withGeneratedCleanupLock(
  {
    repoRoot = REPO_ROOT,
    timeoutMs = 5_000,
    retryDelayMs = 50
  },
  task
) {
  if (
    typeof task !== "function" ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 60_000 ||
    !Number.isFinite(retryDelayMs) ||
    retryDelayMs <= 0 ||
    retryDelayMs > timeoutMs
  ) {
    throw new Error("Generated cleanup lock requires a task and bounded positive timeout values.");
  }

  const canonicalRepoRoot = await fs.realpath(path.resolve(repoRoot));
  const lockRoot = path.join(os.tmpdir(), "mais-generated-cleanup-locks");
  const lockName = crypto.createHash("sha256").update(canonicalRepoRoot).digest("hex");
  const lockPath = path.join(lockRoot, lockName);
  const deadline = Date.now() + timeoutMs;
  await fs.mkdir(lockRoot, { recursive: true });

  while (true) {
    try {
      await fs.mkdir(lockPath);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for generated cleanup lock: ${canonicalRepoRoot}`);
      }
      await delay(Math.min(retryDelayMs, Math.max(1, deadline - Date.now())));
    }
  }

  try {
    return await task();
  } finally {
    try {
      await fs.rmdir(lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

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

async function generatedTargets(scope, repoRoot = REPO_ROOT) {
  if (scope === "vercel-staging") {
    return await vercelStagingTargets(repoRoot);
  }
  if (scope === "next-builds") {
    return await nextBuildTargets(repoRoot);
  }
  if (scope === "release-build-gates") {
    return await releaseBuildGateTargets(repoRoot);
  }
  if (scope === "tmp-scratch") {
    return await existingDirectoryTargets([".tmp"], repoRoot);
  }

  const relativePaths = new Set([".next", ".tmp"]);
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".next-")) relativePaths.add(entry.name);
  }

  const targets = await existingDirectoryTargets(Array.from(relativePaths), repoRoot);
  return sortTargets(targets.filter((target) => target.path !== ".tmp" || target.bytes > 0));
}

async function vercelStagingTargets(repoRoot) {
  return await existingDirectoryTargets([path.join(".tmp", "vercel-staging")], repoRoot);
}

async function nextBuildTargets(repoRoot) {
  const relativePaths = new Set([".next", path.join(".tmp", "next-build-cache-backups")]);
  const tmpDir = path.join(repoRoot, ".tmp");
  try {
    const tmpEntries = await fs.readdir(tmpDir, { withFileTypes: true });
    for (const entry of tmpEntries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (
        (name.startsWith("next-") && name !== "next-dist") ||
        name.includes("-next") ||
        /^a22-current-version-build-/.test(name)
      ) {
        relativePaths.add(path.join(".tmp", name));
      }

    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  return await existingDirectoryTargets(Array.from(relativePaths), repoRoot);
}

async function releaseBuildGateTargets(repoRoot) {
  const relativePaths = new Set();
  const tmpDir = path.join(repoRoot, ".tmp");
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

  return await existingDirectoryTargets(Array.from(relativePaths), repoRoot);
}

async function existingDirectoryTargets(relativePaths, repoRoot = REPO_ROOT) {
  const targets = [];
  for (const relativePath of relativePaths) {
    const validatedTarget = validateGeneratedTargetPath({ repoRoot, relativePath });
    const target = await directoryTargetIfExists(
      validatedTarget.absolutePath,
      validatedTarget.relativePath,
      validatedTarget.repoRoot
    );
    if (target) targets.push(target);
  }

  return sortTargets(targets);
}

async function directoryTargetIfExists(absolutePath, relativePath, repoRoot) {
  try {
    const capturedTarget = await captureGeneratedTarget({
      repoRoot,
      relativePath,
      expectedType: "directory"
    });
    return attachCapturedTarget({
      path: toPosix(relativePath),
      type: "directory",
      bytes: await pathSize(absolutePath)
    }, capturedTarget);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await runGeneratedArtifactCleanup({
    repoRoot: REPO_ROOT,
    scope: args.scope,
    apply: args.apply
  });

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(args.apply ? "Generated artifact cleanup apply complete" : "Generated artifact cleanup dry run");
  console.log(`Scope: ${args.scope}`);
  console.log(`Targets: ${summary.targetCount}`);
  console.log(`Reclaimable: ${formatBytes(summary.totalBytes)}`);
  for (const target of summary.targets) {
    console.log(`- ${target.path} (${target.type}, ${formatBytes(target.bytes)})`);
  }
  for (const target of summary.skippedTargets) {
    console.log(`Skipped: ${target.path} (${target.reason})`);
  }
  if (!args.apply) {
    console.log("No files were removed. After preserving needed Playwright traces/reports, rerun with --apply to delete these targets.");
  }
}

export async function runGeneratedArtifactCleanup({
  repoRoot = REPO_ROOT,
  scope = "all",
  apply = false,
  lockTimeoutMs = 5_000
} = {}) {
  const parsedScope = parseCleanupScope(scope);
  const execute = async () => {
    const targets = await generatedTargets(parsedScope, repoRoot);
    const skippedTargets = [];

    if (apply) {
      for (const target of targets) {
        validateGeneratedTargetPath({ repoRoot, relativePath: target.path });
        const capturedTarget = target[CAPTURED_TARGET];
        if (!capturedTarget) {
          throw new Error(`Generated cleanup target was not safely captured: ${target.path}`);
        }
        await removeCapturedGeneratedTarget(capturedTarget);
      }
      await fs.mkdir(path.join(repoRoot, ".tmp"), { recursive: true });
    }

    return {
      dryRun: !apply,
      apply,
      scope: parsedScope,
      targetCount: targets.length,
      totalBytes: targets.reduce((total, target) => total + target.bytes, 0),
      skippedTargets,
      targets
    };
  };

  if (!apply) return await execute();
  return await withGeneratedCleanupLock(
    { repoRoot, timeoutMs: lockTimeoutMs, retryDelayMs: Math.min(50, lockTimeoutMs) },
    execute
  );
}

function sortTargets(targets) {
  return targets.sort((left, right) => {
    if (left.bytes !== right.bytes) return right.bytes - left.bytes;
    return left.path.localeCompare(right.path);
  });
}

function attachCapturedTarget(target, capturedTarget) {
  Object.defineProperty(target, CAPTURED_TARGET, {
    configurable: false,
    enumerable: false,
    value: capturedTarget,
    writable: false
  });
  return target;
}

function fileIdentity(stat) {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other"
  };
}

async function assertCapturedTargetCurrent(capturedTarget, fsApi = fs) {
  for (const capturedPath of capturedTarget.identities) {
    let currentStat;
    try {
      currentStat = await fsApi.lstat(capturedPath.path, { bigint: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`Generated cleanup target changed since capture: ${capturedTarget.relativePath}`);
      }
      throw error;
    }

    if (
      currentStat.isSymbolicLink() ||
      !sameFileIdentity(fileIdentity(currentStat), capturedPath.identity)
    ) {
      throw new Error(`Generated cleanup target changed since capture: ${capturedTarget.relativePath}`);
    }
  }

  const canonicalRepoRoot = await fsApi.realpath(capturedTarget.repoRoot);
  const canonicalTarget = await fsApi.realpath(capturedTarget.absolutePath);
  if (
    canonicalRepoRoot !== capturedTarget.canonicalRepoRoot ||
    canonicalTarget !== capturedTarget.canonicalTarget ||
    !isPathInside(canonicalRepoRoot, canonicalTarget)
  ) {
    throw new Error(`Generated cleanup target changed since capture: ${capturedTarget.relativePath}`);
  }
}

async function assertCapturedAncestorsCurrent(capturedTarget, fsApi = fs) {
  for (const capturedPath of capturedTarget.identities.slice(0, -1)) {
    const currentStat = await fsApi.lstat(capturedPath.path, { bigint: true });
    if (
      currentStat.isSymbolicLink() ||
      !sameFileIdentity(fileIdentity(currentStat), capturedPath.identity)
    ) {
      throw new Error(`Generated cleanup ancestor changed during quarantine: ${capturedTarget.relativePath}`);
    }
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.type === right.type;
}

async function restoreQuarantinedTarget(quarantinePath, targetPath, fsApi = fs) {
  try {
    await fsApi.lstat(targetPath);
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    await fsApi.rename(quarantinePath, targetPath);
  } catch {
    // Preserve the quarantined target for manual recovery if a concurrent writer
    // made the original path unavailable between validation and rollback.
  }
}

function matchesExpectedType(stat, expectedType) {
  return expectedType === "directory" ? stat.isDirectory() : stat.isFile();
}

function isPathInside(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
