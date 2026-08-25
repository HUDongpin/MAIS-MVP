#!/usr/bin/env node
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  captureGeneratedTarget,
  removeCapturedGeneratedTarget,
  validateGeneratedTargetPath,
  withGeneratedCleanupLock
} from "./cleanup-generated-artifacts.mjs";
import { assertNoBrokenStrayGeneratedTypes } from "./check-stray-generated-types.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_NEXT_DIST_DIR = ".next";
const BUILD_ATTESTATION_FILENAME = "mais-build-attestation.json";
const BUILD_ATTESTATION_ARTIFACT_PATHS = Object.freeze([
  "BUILD_ID",
  "required-server-files.json",
  "server/app-paths-manifest.json"
]);
export const BUILD_ARTIFACT_TREE_EXCLUSIONS = Object.freeze([
  BUILD_ATTESTATION_FILENAME,
  "cache/**",
  "diagnostics/**",
  "trace",
  "trace-build"
]);
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const BUILD_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const execFileAsync = promisify(execFile);

async function main() {
  process.exitCode = await runNextCleanBuild();
}

export function buildCleanBuildConfig(env = process.env, { repoRoot = REPO_ROOT } = {}) {
  const distDir = env.NEXT_DIST_DIR?.trim() || DEFAULT_NEXT_DIST_DIR;
  let validatedTarget;
  try {
    validatedTarget = validateGeneratedTargetPath({ repoRoot, relativePath: distDir });
  } catch (error) {
    const unsafe = /non-relative|path traversal|outside the repository/.test(error?.message ?? "");
    if (unsafe) {
      throw new Error(`Refusing to clean unsafe Next build directory: ${distDir}`);
    }
    throw new Error(
      `Refusing to clean non-generated Next build directory: ${distDir}. ` +
      "Use .next, a top-level .next-* directory, or a generated path under .tmp/."
    );
  }
  assertSafeNextBuildDir(validatedTarget.relativePath, validatedTarget.absolutePath);
  return {
    distDir: validatedTarget.relativePath,
    nextBuildDir: validatedTarget.absolutePath,
    repoRoot: validatedTarget.repoRoot,
    usesSharedNextDir: validatedTarget.relativePath === DEFAULT_NEXT_DIST_DIR
  };
}

function assertSafeNextBuildDir(relativePath, nextBuildDir) {
  const allowed = relativePath === ".next"
    || (relativePath.startsWith(".next-") && !relativePath.includes("/"))
    || relativePath.startsWith(".tmp/");

  if (!allowed) {
    throw new Error(
      `Refusing to clean non-generated Next build directory: ${relativePath}. Use .next, a top-level .next-* directory, or a generated path under .tmp/.`
    );
  }
}

export async function cleanNextBuildDirectory(config) {
  let capturedTarget;
  try {
    capturedTarget = await captureGeneratedTarget({
      repoRoot: config.repoRoot,
      relativePath: config.distDir,
      expectedType: "directory"
    });
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }

  await removeCapturedGeneratedTarget(capturedTarget);
  return true;
}

export async function assertSharedNextBuildIsIsolated(
  config,
  _env = process.env,
  { findActiveNextProcesses: findProcesses = findActiveNextProcesses } = {}
) {
  const conflicts = await findProcesses({
    currentPid: process.pid,
    repoRoot: config.repoRoot
  });

  if (!conflicts.length) return [];

  const summary = conflicts
    .slice(0, 6)
    .map((processInfo) => `- pid ${processInfo.pid}: active Next.js process`)
    .join("\n");

  throw new Error(
    [
      "Active Next.js processes for this repository were detected before a clean build.",
      "Stop the existing dev/build/start process before retrying.",
      "This guard prevents Next build manifest/cache contention such as missing pages-manifest.json.",
      summary
    ].join("\n")
  );
}

export async function runNextCleanBuild({
  env = process.env,
  repoRoot = REPO_ROOT,
  lockTimeoutMs = 5_000,
  operations = {}
} = {}) {
  const config = buildCleanBuildConfig(env, { repoRoot });
  const findProcesses = operations.findActiveNextProcesses ?? findActiveNextProcesses;
  const cleanBuildDir = operations.cleanNextBuildDirectory ?? cleanNextBuildDirectory;
  const spawnBuild = operations.spawnNextBuild ?? spawnNextBuild;
  const checkStrayGeneratedTypes = operations.checkStrayGeneratedTypes ?? assertNoBrokenStrayGeneratedTypes;

  return await withGeneratedCleanupLock(
    {
      repoRoot: config.repoRoot,
      timeoutMs: lockTimeoutMs,
      retryDelayMs: Math.min(50, lockTimeoutMs)
    },
    async () => {
      await assertSharedNextBuildIsIsolated(config, env, {
        findActiveNextProcesses: findProcesses
      });
      // Fail fast with a clear message instead of a cryptic "Cannot find module
      // .../page.js" deep in a stray build's generated types. Set
      // MAIS_SKIP_STRAY_TYPES_CHECK=1 to bypass if it ever false-positives.
      if (env.MAIS_SKIP_STRAY_TYPES_CHECK !== "1") {
        checkStrayGeneratedTypes({ repoRoot: config.repoRoot });
      }
      await cleanBuildDir(config);
      return await spawnBuild(config, env);
    }
  );
}

export async function findActiveNextProcesses({
  currentPid = process.pid,
  repoRoot = REPO_ROOT,
  processOutput,
  resolveProcessCwd = resolveProcessCwdEvidence
} = {}) {
  let stdout = processOutput;
  if (stdout === undefined) {
    try {
      const result = await execFileAsync("ps", ["-axo", "pid=,ppid=,command="], {
        encoding: "utf8",
        maxBuffer: 1024 * 1024
      });
      stdout = result.stdout;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not inspect local processes before clean Next build: ${message}`);
    }
  }

  const candidates = parseProcessRows(stdout)
    .filter((processInfo) => processInfo.pid !== currentPid)
    .filter((processInfo) => classifyNextCommand(processInfo.command));
  const cwdByPid = new Map();
  const unavailableEvidence = new Map();

  for (const processInfo of candidates) {
    const command = classifyNextCommand(processInfo.command);
    if (command.absoluteBinaryPath) continue;

    let evidence;
    try {
      evidence = await resolveProcessCwd(processInfo.pid);
    } catch (error) {
      evidence = {
        state: "unavailable",
        detail: error instanceof Error ? error.message : String(error)
      };
    }

    if (evidence?.state === "resolved" && evidence.cwd) {
      cwdByPid.set(processInfo.pid, evidence.cwd);
    } else if (evidence?.state !== "gone") {
      unavailableEvidence.set(processInfo.pid, evidence?.detail ?? "cwd evidence unavailable");
    }
  }

  const conflicts = parseActiveNextProcesses(stdout, { currentPid, repoRoot, cwdByPid });
  const conflictPids = new Set(conflicts.map((processInfo) => processInfo.pid));
  const unresolved = candidates.filter((processInfo) => {
    if (!unavailableEvidence.has(processInfo.pid) || conflictPids.has(processInfo.pid)) return false;
    return !conflictPids.has(processInfo.ppid);
  });
  if (unresolved.length > 0) {
    const processInfo = unresolved[0];
    throw new Error(
      `Could not determine the working directory for active Next.js candidate pid ${processInfo.pid}; ` +
      `refusing a clean build: ${unavailableEvidence.get(processInfo.pid)}`
    );
  }

  return conflicts;
}

export function parseActiveNextProcesses(
  output,
  {
    currentPid = process.pid,
    repoRoot = REPO_ROOT,
    cwdByPid = new Map()
  } = {}
) {
  const processRows = parseProcessRows(output)
    .filter((processInfo) => processInfo.pid !== currentPid);
  const candidates = processRows.filter((processInfo) => classifyNextCommand(processInfo.command));
  const matchingPids = new Set();

  for (const processInfo of candidates) {
    const command = classifyNextCommand(processInfo.command);
    if (command.absoluteBinaryPath) {
      if (isPathInsideRepo(command.absoluteBinaryPath, repoRoot)) matchingPids.add(processInfo.pid);
      continue;
    }

    const processCwd = cwdForPid(cwdByPid, processInfo.pid);
    if (processCwd && isPathInsideRepo(processCwd, repoRoot)) matchingPids.add(processInfo.pid);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of candidates) {
      if (matchingPids.has(processInfo.pid) || !matchingPids.has(processInfo.ppid)) continue;
      if (classifyNextCommand(processInfo.command).kind !== "next-server") continue;
      matchingPids.add(processInfo.pid);
      changed = true;
    }
  }

  return candidates.filter((processInfo) => matchingPids.has(processInfo.pid));
}

function parseProcessRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => parseProcessLine(line))
    .filter(Boolean);
}

function parseProcessLine(line) {
  const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (!match) return null;
  return {
    command: match[3],
    pid: Number(match[1]),
    ppid: Number(match[2])
  };
}

async function resolveProcessCwdEvidence(pid) {
  if (process.platform === "linux") {
    try {
      const cwd = await fs.readlink(`/proc/${pid}/cwd`);
      return { state: "resolved", cwd: path.resolve(cwd) };
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ESRCH") return { state: "gone" };
      return {
        state: "unavailable",
        detail: error instanceof Error ? error.message : String(error)
      };
    }
  }

  if (process.platform === "win32") {
    return {
      state: "unavailable",
      detail: "portable PID cwd inspection is unavailable on win32"
    };
  }

  try {
    const result = await execFileAsync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 2_000
    });
    const cwdLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("n"));
    if (cwdLine?.slice(1)) {
      return { state: "resolved", cwd: path.resolve(cwdLine.slice(1)) };
    }
  } catch (error) {
    if (!isProcessAlive(pid)) return { state: "gone" };
    return {
      state: "unavailable",
      detail: error instanceof Error ? error.message : String(error)
    };
  }

  if (!isProcessAlive(pid)) return { state: "gone" };
  return { state: "unavailable", detail: "lsof returned no cwd record" };
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function classifyNextCommand(command) {
  const normalizedCommand = toPosix(command.trim());
  if (/^next-server\s+\(v[^)]+\)/.test(normalizedCommand)) {
    return { kind: "next-server", absoluteBinaryPath: null };
  }

  const binaryMatch = normalizedCommand.match(
    /(?:^|\s)((?:\.\/)?[^\s]*node_modules\/(?:\.bin\/next|next\/dist\/bin\/next))\s+(?:dev|build|start)\b/
  );
  if (!binaryMatch) return null;
  const binaryPath = binaryMatch[1];
  return {
    kind: "next-cli",
    absoluteBinaryPath: path.isAbsolute(binaryPath) ? path.resolve(binaryPath) : null
  };
}

function cwdForPid(cwdByPid, pid) {
  if (cwdByPid instanceof Map) return cwdByPid.get(pid);
  return cwdByPid?.[pid];
}

function isPathInsideRepo(candidatePath, repoRoot) {
  const relativePath = path.relative(path.resolve(repoRoot), path.resolve(candidatePath));
  return relativePath === "" || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

async function spawnNextBuild(config, env) {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  const buildStartedAt = new Date().toISOString();
  const sourceBefore = await captureBuildSourceState({ repoRoot: config.repoRoot, env });
  const exitCode = await runCommand(process.execPath, [nextBin, "build"], {
    cwd: config.repoRoot,
    env
  });
  if (exitCode !== 0) return exitCode;

  const sourceAfter = await captureBuildSourceState({ repoRoot: config.repoRoot, env });
  await writeBuildAttestation({
    config,
    sourceBefore,
    sourceAfter,
    buildStartedAt,
    completedAt: new Date().toISOString()
  });
  return exitCode;
}

export async function captureBuildSourceState({ repoRoot = REPO_ROOT, env = process.env } = {}) {
  try {
    const [{ stdout: headOutput }, { stdout: statusOutput }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024
      }),
      execFileAsync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024
      })
    ]);
    const candidateSha = headOutput.trim().toLowerCase();
    if (!COMMIT_SHA_PATTERN.test(candidateSha)) {
      throw new Error("git returned an invalid commit SHA");
    }
    const status = statusOutput.replaceAll("\r\n", "\n");
    return {
      candidateSha,
      clean: status.length === 0,
      statusFingerprint: createHash("sha256").update(status, "utf8").digest("hex")
    };
  } catch {
    const environmentSha = [env.VERCEL_GIT_COMMIT_SHA, env.GITHUB_SHA]
      .find((value) => COMMIT_SHA_PATTERN.test(String(value ?? "").toLowerCase()));
    return {
      candidateSha: environmentSha ? String(environmentSha).toLowerCase() : null,
      clean: null,
      statusFingerprint: null
    };
  }
}

export async function writeBuildAttestation({
  config,
  sourceBefore,
  sourceAfter,
  buildStartedAt,
  completedAt = new Date().toISOString()
}) {
  const { artifacts, artifactDigests } = await captureBuildAttestationArtifacts(config);
  const artifactTree = await captureBuildArtifactTree(config);
  const buildId = artifacts.get("BUILD_ID").toString("utf8").trim();
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new Error("Next build completed without a valid BUILD_ID for release attestation.");
  }

  const candidateSha = COMMIT_SHA_PATTERN.test(String(sourceBefore?.candidateSha ?? ""))
    ? sourceBefore.candidateSha
    : null;
  const sourceTreeStable = Boolean(
    candidateSha &&
    candidateSha === sourceAfter?.candidateSha &&
    sourceBefore?.statusFingerprint &&
    sourceBefore.statusFingerprint === sourceAfter?.statusFingerprint
  );
  const attestation = {
    schemaVersion: 3,
    candidateSha,
    buildId,
    distDir: config.distDir,
    sourceTreeClean: sourceBefore?.clean === true && sourceAfter?.clean === true,
    sourceTreeStable,
    buildStartedAt,
    completedAt,
    artifactDigests,
    artifactTree
  };

  const targetPath = path.join(config.nextBuildDir, BUILD_ATTESTATION_FILENAME);
  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(attestation, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
    await fs.rename(temporaryPath, targetPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  return attestation;
}

export async function verifyBuildAttestationArtifactDigests({ config, attestation }) {
  if (
    attestation?.schemaVersion !== 3 ||
    !isExactArtifactDigestRecord(attestation.artifactDigests) ||
    !isValidBuildArtifactTree(attestation.artifactTree)
  ) {
    throw new Error("Build attestation artifact digests are invalid.");
  }

  const [{ artifactDigests }, artifactTree] = await Promise.all([
    captureBuildAttestationArtifacts(config),
    captureBuildArtifactTree(config)
  ]);
  for (const relativePath of BUILD_ATTESTATION_ARTIFACT_PATHS) {
    if (attestation.artifactDigests[relativePath] !== artifactDigests[relativePath]) {
      throw new Error(`Build attestation artifact digest mismatch: ${relativePath}.`);
    }
  }
  if (
    attestation.artifactTree.root !== artifactTree.root ||
    attestation.artifactTree.fileCount !== artifactTree.fileCount ||
    attestation.artifactTree.totalBytes !== artifactTree.totalBytes
  ) {
    throw new Error("Build attestation artifact tree mismatch.");
  }
  return true;
}

export async function captureBuildArtifactTree(config) {
  const files = [];
  await collectBuildArtifactFiles(config.nextBuildDir, "", files);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  if (files.length === 0) {
    throw new Error("Next build completed without release artifacts.");
  }

  const rootHash = createHash("sha256");
  let totalBytes = 0;
  for (const file of files) {
    const contents = await fs.readFile(file.absolutePath);
    const size = contents.byteLength;
    const digest = createHash("sha256").update(contents).digest("hex");
    totalBytes += size;
    rootHash.update("file\0", "utf8");
    rootHash.update(file.relativePath, "utf8");
    rootHash.update("\0", "utf8");
    rootHash.update(String(size), "utf8");
    rootHash.update("\0", "utf8");
    rootHash.update(digest, "utf8");
    rootHash.update("\n", "utf8");
  }

  return {
    algorithm: "sha256",
    exclusions: [...BUILD_ARTIFACT_TREE_EXCLUSIONS],
    fileCount: files.length,
    totalBytes,
    root: rootHash.digest("hex")
  };
}

async function collectBuildArtifactFiles(absoluteDirectory, relativeDirectory, files) {
  let entries;
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    throw new Error("Next build artifact tree is unavailable.");
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    if (isExcludedBuildArtifactPath(relativePath)) continue;
    if (
      relativePath.includes("\\") ||
      relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..") ||
      /[\u0000-\u001f\u007f]/u.test(relativePath)
    ) {
      throw new Error("Next build artifact path is invalid.");
    }
    const absolutePath = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      await collectBuildArtifactFiles(absolutePath, relativePath, files);
    } else if (entry.isFile()) {
      files.push({ absolutePath, relativePath });
    } else {
      throw new Error("Next build artifact tree contains an unsupported file type.");
    }
  }
}

function isExcludedBuildArtifactPath(relativePath) {
  return relativePath === BUILD_ATTESTATION_FILENAME ||
    relativePath.startsWith(`${BUILD_ATTESTATION_FILENAME}.`) ||
    relativePath === "cache" ||
    relativePath.startsWith("cache/") ||
    relativePath === "diagnostics" ||
    relativePath.startsWith("diagnostics/") ||
    relativePath === "trace" ||
    relativePath === "trace-build";
}

async function captureBuildAttestationArtifacts(config) {
  const artifacts = new Map();
  const artifactDigests = {};
  for (const relativePath of BUILD_ATTESTATION_ARTIFACT_PATHS) {
    let contents;
    try {
      contents = await fs.readFile(
        path.join(config.nextBuildDir, ...relativePath.split("/"))
      );
    } catch {
      throw new Error(`Next build completed without required release artifact: ${relativePath}.`);
    }
    artifacts.set(relativePath, contents);
    artifactDigests[relativePath] = createHash("sha256").update(contents).digest("hex");
  }
  return { artifacts, artifactDigests };
}

function isExactArtifactDigestRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const paths = Object.keys(value);
  return paths.length === BUILD_ATTESTATION_ARTIFACT_PATHS.length
    && BUILD_ATTESTATION_ARTIFACT_PATHS.every(
      (relativePath) => Object.hasOwn(value, relativePath)
        && typeof value[relativePath] === "string"
        && SHA256_PATTERN.test(value[relativePath])
    );
}

function isValidBuildArtifactTree(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.algorithm === "sha256" &&
    Array.isArray(value.exclusions) &&
    value.exclusions.length === BUILD_ARTIFACT_TREE_EXCLUSIONS.length &&
    value.exclusions.every(
      (entry, index) => entry === BUILD_ARTIFACT_TREE_EXCLUSIONS[index]
    ) &&
    Number.isSafeInteger(value.fileCount) &&
    value.fileCount > 0 &&
    Number.isSafeInteger(value.totalBytes) &&
    value.totalBytes >= 0 &&
    typeof value.root === "string" &&
    SHA256_PATTERN.test(value.root)
  );
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
