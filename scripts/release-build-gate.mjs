#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertNoQaOnlyInstrumentationBytesSync,
  assertNoQaOnlyInstrumentationSync
} from "./assert-no-qa-only-instrumentation.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TMP_ROOT = path.join(REPO_ROOT, ".tmp");
const DEFAULT_TSCONFIG_PATH = "tsconfig.next.json";
const REQUIRED_BUILD_OUTPUTS = [
  "BUILD_ID",
  "server/app/api/auth/login/route.js",
  "server/app/api/dashboard/route.js",
  "server/app/api/gamification/summary/route.js",
  "server/app/api/rewards/route.js",
  "server/app/dashboard.html"
];

export async function runReleaseBuildGate(options = {}) {
  assertNoQaOnlyInstrumentationSync({
    env: process.env,
    mode: "release",
    root: REPO_ROOT
  });
  const config = buildReleaseBuildGateConfig(options, process.env);
  const startedAt = new Date().toISOString();
  const tsconfigSnapshot = await snapshotFile(path.resolve(REPO_ROOT, config.tsconfigPath));
  let result;

  try {
    result = await runCommand(
      process.execPath,
      ["scripts/next-clean-build.mjs"],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          NEXT_DIST_DIR: config.distDir,
          NEXT_TSCONFIG_PATH: config.tsconfigPath
        }
      }
    );
  } finally {
    await restoreFileSnapshot(tsconfigSnapshot);
  }

  // A clean preflight is not enough if the source tree changes while Next is
  // running. Refuse the output unless the release source is still free of both
  // QA markers and residual instrumentation sentinels after the child exits.
  assertNoQaOnlyInstrumentationSync({
    env: process.env,
    mode: "release",
    root: REPO_ROOT
  });

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Release build gate failed.",
        `Isolated NEXT_DIST_DIR: ${config.distDir}`,
        summarizeOutput(result)
      ].join("\n")
    );
  }

  // The build child can transiently instrument a clean source tree, emit those
  // bytes, and restore the source before this process regains control. Scan the
  // actual isolated output tree itself before trusting even one expected file.
  // The shared byte scanner also rejects symlinks, hardlinks, special entries,
  // unreadable files, and directory/file identity races.
  const outputInstrumentationScan = assertNoQaOnlyInstrumentationBytesSync({
    label: "release build output",
    root: config.absoluteDistDir
  });
  const outputChecks = await verifyBuildOutputs(config.absoluteDistDir);

  if (config.cleanup) {
    await fs.rm(config.absoluteDistDir, { recursive: true, force: true });
  }

  return {
    cleanup: config.cleanup,
    completedAt: new Date().toISOString(),
    distDir: config.distDir,
    outputInstrumentationScan,
    outputChecks,
    runId: config.runId,
    startedAt,
    tsconfigPath: config.tsconfigPath
  };
}

export async function snapshotFile(absolutePath) {
  const resolved = path.resolve(absolutePath);
  if (!isInside(resolved, REPO_ROOT) || resolved === REPO_ROOT) {
    throw new Error(`Release build tsconfig must stay inside the repository: ${resolved}`);
  }
  const before = await fs.lstat(resolved, { bigint: true });
  assertSafeRegularFile(before, `Release build tsconfig ${resolved}`);
  const canonical = await fs.realpath(resolved);
  if (canonical !== resolved) {
    throw new Error(`Release build tsconfig must not traverse a symlink: ${resolved}`);
  }
  const handle = await fs.open(
    resolved,
    fsConstants.O_RDWR | (fsConstants.O_NOFOLLOW ?? 0)
  );
  try {
    const opened = await handle.stat({ bigint: true });
    if (!sameExactIdentity(before, opened)) {
      throw new Error(`Release build tsconfig changed before it could be snapshotted: ${resolved}`);
    }
    const content = await handle.readFile();
    const afterRead = await handle.stat({ bigint: true });
    const afterPath = await fs.lstat(resolved, { bigint: true });
    if (!sameExactIdentity(opened, afterRead) || !sameExactIdentity(afterRead, afterPath)) {
      throw new Error(`Release build tsconfig changed while it was being snapshotted: ${resolved}`);
    }
    return {
      absolutePath: resolved,
      content,
      handle,
      identity: afterRead,
      originalMode: Number(afterRead.mode & 0o777n)
    };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

export async function restoreFileSnapshot(snapshot) {
  const { handle } = snapshot;
  try {
    const [opened, currentPath] = await Promise.all([
      handle.stat({ bigint: true }),
      fs.lstat(snapshot.absolutePath, { bigint: true })
    ]);
    assertSafeRegularFile(opened, `Open release build tsconfig ${snapshot.absolutePath}`);
    assertSafeRegularFile(currentPath, `Release build tsconfig path ${snapshot.absolutePath}`);
    if (
      !sameObjectIdentity(snapshot.identity, opened) ||
      !sameObjectIdentity(opened, currentPath)
    ) {
      throw new Error(
        `Refusing to restore release build tsconfig because its pathname identity changed: ${snapshot.absolutePath}`
      );
    }
    await handle.truncate(0);
    if (snapshot.content.length > 0) {
      const { bytesWritten } = await handle.write(
        snapshot.content,
        0,
        snapshot.content.length,
        0
      );
      if (bytesWritten !== snapshot.content.length) {
        throw new Error(`Could not restore every release build tsconfig byte: ${snapshot.absolutePath}`);
      }
    }
    await handle.chmod(snapshot.originalMode);
    await handle.sync();
    const [restored, restoredPath] = await Promise.all([
      handle.stat({ bigint: true }),
      fs.lstat(snapshot.absolutePath, { bigint: true })
    ]);
    if (
      !sameObjectIdentity(snapshot.identity, restored) ||
      !sameObjectIdentity(restored, restoredPath) ||
      restored.size !== BigInt(snapshot.content.length)
    ) {
      throw new Error(`Release build tsconfig identity changed during restoration: ${snapshot.absolutePath}`);
    }
    const reread = Buffer.alloc(snapshot.content.length);
    let offset = 0;
    while (offset < reread.length) {
      const { bytesRead } = await handle.read(reread, offset, reread.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const finalIdentity = await handle.stat({ bigint: true });
    if (
      offset !== snapshot.content.length ||
      !reread.equals(snapshot.content) ||
      !sameExactIdentity(restored, finalIdentity)
    ) {
      throw new Error(`Release build tsconfig bytes changed during restoration: ${snapshot.absolutePath}`);
    }
  } finally {
    await handle.close().catch(() => undefined);
  }
}

function assertSafeRegularFile(identity, label) {
  if (identity.isSymbolicLink() || !identity.isFile() || identity.nlink !== 1n) {
    throw new Error(`${label} must be one regular non-symlink, non-hardlinked file.`);
  }
}

function sameObjectIdentity(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.isFile() === right.isFile();
}

function sameExactIdentity(left, right) {
  return sameObjectIdentity(left, right) &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

export function buildReleaseBuildGateConfig(options = {}, env = process.env) {
  const runId = sanitizePathSegment(options.runId ?? env.MAIS_RELEASE_BUILD_GATE_RUN_ID ?? timestampRunId());
  const distDir = toPosix(
    options.distDir
      ?? env.MAIS_RELEASE_BUILD_GATE_DIST_DIR
      ?? path.join(".tmp", `release-build-gate-next-${runId}`)
  );
  const absoluteDistDir = path.resolve(REPO_ROOT, distDir);
  assertSafeBuildGateDistDir(absoluteDistDir);

  const tsconfigPath = normalizeTsconfigPath(
    options.tsconfigPath ?? env.NEXT_TSCONFIG_PATH ?? DEFAULT_TSCONFIG_PATH
  );

  return {
    absoluteDistDir,
    cleanup: options.cleanup ?? env.MAIS_RELEASE_BUILD_GATE_KEEP_DIST_DIR !== "1",
    distDir,
    runId,
    tsconfigPath
  };
}

function normalizeTsconfigPath(value) {
  const raw = String(value).trim();
  if (!raw) throw new Error("Release build tsconfig path cannot be empty.");
  const absolute = path.resolve(REPO_ROOT, raw);
  if (!isInside(absolute, REPO_ROOT) || absolute === REPO_ROOT) {
    throw new Error(`Release build tsconfig must stay inside the repository: ${absolute}`);
  }
  if (path.dirname(absolute) !== REPO_ROOT || !/^tsconfig(?:[.][a-zA-Z0-9_-]+)*[.]json$/.test(path.basename(absolute))) {
    throw new Error(`Release build tsconfig must be one root tsconfig*.json file: ${raw}`);
  }
  return toPosix(path.relative(REPO_ROOT, absolute));
}

async function verifyBuildOutputs(absoluteDistDir) {
  const checks = [];
  for (const relativePath of REQUIRED_BUILD_OUTPUTS) {
    const absolutePath = path.join(absoluteDistDir, relativePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    checks.push({
      path: relativePath,
      present: Boolean(stat?.isFile())
    });
  }

  const missing = checks.filter((check) => !check.present);
  if (missing.length > 0) {
    throw new Error(
      [
        "Release build gate did not produce required dashboard deployment outputs:",
        ...missing.map((check) => `- ${check.path}`)
      ].join("\n")
    );
  }

  return checks;
}

function assertSafeBuildGateDistDir(absoluteDistDir) {
  if (!isInside(absoluteDistDir, TMP_ROOT)) {
    throw new Error(`Release build gate distDir must stay under .tmp: ${absoluteDistDir}`);
  }
  const relativePath = toPosix(path.relative(REPO_ROOT, absoluteDistDir));
  if (!relativePath.startsWith(".tmp/") || !relativePath.includes("-next")) {
    throw new Error(`Release build gate distDir must be a generated .tmp/*-next* path: ${relativePath}`);
  }
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function parseArgs(argv) {
  const args = {
    cleanup: undefined,
    distDir: undefined,
    json: false,
    runId: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dist-dir") {
      args.distDir = argv[++index];
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--keep-dist-dir") {
      args.cleanup = false;
    } else if (arg === "--run-id") {
      args.runId = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function summarizeOutput(result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output) return "Command produced no output.";
  return output.split("\n").slice(-80).join("\n");
}

function timestampRunId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function sanitizePathSegment(value) {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized) throw new Error("Run id cannot be empty.");
  return sanitized;
}

function isInside(absolutePath, root) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReleaseBuildGate(parseArgs(process.argv.slice(2)))
    .then((record) => {
      if (process.argv.includes("--json")) {
        console.log(JSON.stringify(record, null, 2));
        return;
      }
      console.log("Release build gate passed");
      console.log(`Isolated Next dist: ${record.distDir}`);
      console.log(`Cleanup: ${record.cleanup ? "yes" : "no"}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
