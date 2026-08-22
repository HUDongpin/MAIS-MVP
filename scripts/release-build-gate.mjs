#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const config = buildReleaseBuildGateConfig(options, process.env);
  const startedAt = new Date().toISOString();
  const generatedFileSnapshots = await Promise.all([
    snapshotFile(path.resolve(REPO_ROOT, config.tsconfigPath)),
    snapshotFile(path.resolve(REPO_ROOT, "next-env.d.ts"))
  ]);
  let result;

  try {
    const buildCommand = buildReleaseBuildCommand(config);
    result = await runCommand(
      buildCommand.command,
      buildCommand.args,
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
    await Promise.all(generatedFileSnapshots.map((snapshot) => restoreFileSnapshot(snapshot)));
  }

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
    bundler: config.bundler,
    cleanup: config.cleanup,
    completedAt: new Date().toISOString(),
    distDir: config.distDir,
    outputChecks,
    runId: config.runId,
    startedAt,
    tsconfigPath: config.tsconfigPath
  };
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
  const bundler = options.bundler ?? env.MAIS_RELEASE_BUILD_GATE_BUNDLER ?? "turbopack";
  if (bundler !== "turbopack" && bundler !== "webpack") {
    throw new Error(`Unknown release build bundler: ${bundler}`);
  }

  return {
    absoluteDistDir,
    bundler,
    cleanup: options.cleanup ?? env.MAIS_RELEASE_BUILD_GATE_KEEP_DIST_DIR !== "1",
    distDir,
    runId,
    tsconfigPath: options.tsconfigPath ?? env.NEXT_TSCONFIG_PATH ?? DEFAULT_TSCONFIG_PATH
  };
}

export function buildReleaseBuildCommand(config) {
  return {
    command: process.execPath,
    args: [
      "scripts/next-clean-build.mjs",
      ...(config.bundler === "webpack" ? ["--webpack"] : [])
    ]
  };
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

export function parseArgs(argv) {
  const args = {
    bundler: undefined,
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
    } else if (arg === "--webpack") {
      args.bundler = "webpack";
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
      console.log(`Bundler: ${record.bundler}`);
      console.log(`Isolated Next dist: ${record.distDir}`);
      console.log(`Cleanup: ${record.cleanup ? "yes" : "no"}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
