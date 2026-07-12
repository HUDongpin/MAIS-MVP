#!/usr/bin/env node
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_NEXT_DIST_DIR = ".next";
const execFileAsync = promisify(execFile);

async function main() {
  const config = buildCleanBuildConfig(process.env);
  await assertSharedNextBuildIsIsolated(config, process.env);

  if (process.env.MAIS_SKIP_NEXT_CLEAN_BUILD !== "1") {
    await fs.rm(config.nextBuildDir, { recursive: true, force: true });
  }

  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  const exitCode = await runCommand(process.execPath, [nextBin, "build"], { cwd: REPO_ROOT });
  process.exitCode = exitCode;
}

export function buildCleanBuildConfig(env = process.env) {
  const distDir = env.NEXT_DIST_DIR?.trim() || DEFAULT_NEXT_DIST_DIR;
  const nextBuildDir = path.resolve(REPO_ROOT, distDir);
  assertSafeNextBuildDir(nextBuildDir);
  return {
    distDir,
    nextBuildDir,
    repoRoot: REPO_ROOT,
    usesSharedNextDir: path.relative(REPO_ROOT, nextBuildDir) === DEFAULT_NEXT_DIST_DIR
  };
}

function assertSafeNextBuildDir(nextBuildDir) {
  const relativePath = toPosix(path.relative(REPO_ROOT, nextBuildDir));
  if (!relativePath || relativePath === "." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to clean unsafe Next build directory: ${nextBuildDir}`);
  }

  const allowed = relativePath === ".next"
    || relativePath.startsWith(".next-")
    || relativePath.startsWith(".tmp/")
    || relativePath.includes("/next-dist");

  if (!allowed) {
    throw new Error(
      `Refusing to clean non-generated Next build directory: ${relativePath}. Use .next, .next-*, .tmp/*, or */next-dist.`
    );
  }
}

export async function assertSharedNextBuildIsIsolated(config, env = process.env) {
  if (!config.usesSharedNextDir) return [];
  if (env.MAIS_ALLOW_SHARED_NEXT_BUILD_WITH_ACTIVE_NEXT === "1") return [];

  const conflicts = await findActiveNextProcesses({
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
      "Active Next.js processes for this repository were detected before a shared .next build.",
      "Stop the existing dev/build/start process, or run this build with an isolated NEXT_DIST_DIR under .tmp/.",
      "This guard prevents .next manifest/cache contention such as missing pages-manifest.json.",
      summary
    ].join("\n")
  );
}

export async function findActiveNextProcesses({ currentPid = process.pid, repoRoot = REPO_ROOT } = {}) {
  let stdout = "";
  try {
    const result = await execFileAsync("ps", ["-axo", "pid=,ppid=,command="], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    stdout = result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not inspect local processes before shared .next build: ${message}`);
  }

  return parseActiveNextProcesses(stdout, { currentPid, repoRoot });
}

export function parseActiveNextProcesses(output, { currentPid = process.pid, repoRoot = REPO_ROOT } = {}) {
  return output
    .split(/\r?\n/)
    .map((line) => parseProcessLine(line))
    .filter(Boolean)
    .filter((processInfo) => processInfo.pid !== currentPid)
    .filter((processInfo) => isRepoNextProcess(processInfo.command, repoRoot));
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

function isRepoNextProcess(command, repoRoot) {
  const normalizedCommand = toPosix(command);
  const normalizedRoot = toPosix(repoRoot);
  if (!normalizedCommand.includes(normalizedRoot)) return false;

  const binaryMarkers = [
    `${normalizedRoot}/node_modules/.bin/next`,
    `${normalizedRoot}/node_modules/next/dist/bin/next`
  ];

  const marker = binaryMarkers.find((value) => normalizedCommand.includes(value));
  if (!marker) return false;

  const afterMarker = normalizedCommand.slice(normalizedCommand.indexOf(marker) + marker.length);
  return /\b(?:dev|build|start)\b/.test(afterMarker);
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
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
