#!/usr/bin/env node
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
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
const PROCESS_CWD_INSPECTION_TIMEOUT_MS = 10_000;
const execFileAsync = promisify(execFile);

async function main() {
  process.exitCode = await runNextCleanBuild({ buildArgs: process.argv.slice(2) });
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
    .map((processInfo) => `- pid ${processInfo.pid}: ${processInfo.command}`)
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
  buildArgs = [],
  env = process.env,
  repoRoot = REPO_ROOT,
  lockTimeoutMs = 5_000,
  operations = {}
} = {}) {
  const normalizedBuildArgs = normalizeNextBuildArgs(buildArgs);
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
      return await spawnBuild(config, env, normalizedBuildArgs);
    }
  );
}

export function normalizeNextBuildArgs(buildArgs = []) {
  if (buildArgs.length === 0) return [];
  if (buildArgs.length === 1 && buildArgs[0] === "--webpack") return ["--webpack"];
  throw new Error(
    `Unsupported Next build arguments: ${buildArgs.join(" ")}. ` +
    "The parity wrapper accepts only the default Turbopack build or one explicit --webpack flag."
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
      // Parallel worktrees can make macOS lsof exceed two seconds even when
      // it returns valid cwd evidence. Keep the guard fail-closed, but allow
      // enough time for that read-only inspection before declaring it absent.
      timeout: PROCESS_CWD_INSPECTION_TIMEOUT_MS
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
  // A shell coordinator can contain a future `next start` command in its
  // command text while it is still waiting for the current build to finish.
  // It is not itself a Next process; the real child is detected separately
  // once the shell executes that command.
  if (/^(?:[^\s]+\/)?(?:sh|bash|zsh)\s+-c(?:\s|$)/.test(normalizedCommand)) {
    return null;
  }
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

async function spawnNextBuild(config, env, buildArgs = []) {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  return await runCommand(process.execPath, [nextBin, "build", ...buildArgs], {
    cwd: config.repoRoot,
    env
  });
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
