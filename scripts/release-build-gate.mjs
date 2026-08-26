#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TMP_ROOT = path.join(REPO_ROOT, ".tmp");
const DEFAULT_TSCONFIG_PATH = "tsconfig.next.json";
const RELEASE_BUILD_CHILD_BASE_ENV_KEYS = Object.freeze([
  "CI",
  "COLORTERM",
  "COMSPEC",
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NODE_OPTIONS",
  "NO_COLOR",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "WINDIR"
]);
const RELEASE_BUILD_CHILD_OVERRIDE_KEYS = new Set([
  "MAIS_RELEASE_SHA",
  "NEXT_DIST_DIR",
  "NEXT_TELEMETRY_DISABLED",
  "NEXT_TSCONFIG_PATH"
]);
export const REQUIRED_BUILD_OUTPUTS = Object.freeze([
  "BUILD_ID",
  "server/app/api/auth/login/route.js",
  "server/app/api/dashboard/route.js",
  "server/app/api/gamification/summary/route.js",
  "server/app/api/rewards/route.js",
  "server/app/dashboard/page.js"
]);

export async function runReleaseBuildGate(options = {}) {
  const parentEnv = options.env ?? process.env;
  const config = buildReleaseBuildGateConfig(options, parentEnv);
  const startedAt = new Date().toISOString();
  const result = await withRestoredReleaseBuildInputs(
    { repoRoot: REPO_ROOT, tsconfigPath: config.tsconfigPath },
    () => runCommand(
      process.execPath,
      ["scripts/next-clean-build.mjs"],
      {
        cwd: REPO_ROOT,
        env: buildReleaseBuildChildEnvironment(parentEnv, {
          NEXT_DIST_DIR: config.distDir,
          NEXT_TELEMETRY_DISABLED: "1",
          NEXT_TSCONFIG_PATH: config.tsconfigPath
        })
      }
    )
  );

  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Release build gate failed.",
        `Isolated NEXT_DIST_DIR: ${config.distDir}`,
        summarizeOutput(result)
      ].join("\n")
    );
  }

  const outputChecks = await verifyBuildOutputs(config.absoluteDistDir);

  if (config.cleanup) {
    await fs.rm(config.absoluteDistDir, { recursive: true, force: true });
  }

  return {
    cleanup: config.cleanup,
    completedAt: new Date().toISOString(),
    distDir: config.distDir,
    outputChecks,
    runId: config.runId,
    startedAt,
    tsconfigPath: config.tsconfigPath
  };
}

export function buildReleaseBuildChildEnvironment(env = {}, overrides = {}) {
  const childEnv = {};
  for (const key of RELEASE_BUILD_CHILD_BASE_ENV_KEYS) {
    if (typeof env?.[key] === "string") childEnv[key] = env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (!RELEASE_BUILD_CHILD_OVERRIDE_KEYS.has(key) || typeof value !== "string") {
      throw new Error("Release build environment override was rejected.");
    }
    childEnv[key] = value;
  }
  return childEnv;
}

export async function snapshotFile(absolutePath) {
  const content = await fs.readFile(absolutePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });

  return {
    absolutePath,
    content
  };
}

export async function withRestoredReleaseBuildInputs({ repoRoot = REPO_ROOT, tsconfigPath }, action) {
  const snapshots = await Promise.all([
    snapshotFile(path.resolve(repoRoot, tsconfigPath)),
    snapshotFile(path.join(repoRoot, "next-env.d.ts"))
  ]);

  try {
    return await action();
  } finally {
    await Promise.all(snapshots.map((snapshot) => restoreFileSnapshot(snapshot)));
  }
}

export async function restoreFileSnapshot(snapshot) {
  if (snapshot.content === null) {
    await fs.rm(snapshot.absolutePath, { force: true });
    return;
  }

  await fs.writeFile(snapshot.absolutePath, snapshot.content);
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

  return {
    absoluteDistDir,
    cleanup: options.cleanup ?? env.MAIS_RELEASE_BUILD_GATE_KEEP_DIST_DIR !== "1",
    distDir,
    runId,
    tsconfigPath: options.tsconfigPath ?? env.NEXT_TSCONFIG_PATH ?? DEFAULT_TSCONFIG_PATH
  };
}

export async function verifyBuildOutputs(absoluteDistDir) {
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
