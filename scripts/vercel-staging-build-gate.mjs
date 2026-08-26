import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { verifyPreparedVercelStaging } from "./prepare-vercel-staging.mjs";
import { buildReleaseBuildChildEnvironment } from "./release-build-gate.mjs";

const REQUIRED_STAGING_BUILD_OUTPUTS = Object.freeze([
  "BUILD_ID",
  "server/app/parent/page.js",
  "server/app/api/parent/foundation/route.js",
  "server/app/api/parent/messages/route.js",
  "server/app/api/parent/notices/[recipientId]/ack/route.js",
  "server/app/api/health/teacher-notices/route.js",
  "server/app/api/cron/teacher-notice-email/route.js"
]);
const BUILD_OUTPUT_LIMIT_BYTES = 4 * 1024 * 1024;

export async function runVercelStagingBuildGate({
  dependenciesRoot = process.cwd(),
  env = process.env,
  operations = {},
  staging
}) {
  const verifyStaging = operations.verifyStaging ?? verifyPreparedVercelStaging;
  const runBuild = operations.runBuild ?? runCommand;
  const startedAt = new Date().toISOString();
  await verifyStaging(staging);
  const candidateSha = String(staging?.candidateSha ?? "");
  if (!/^[a-f0-9]{40}$/u.test(candidateSha)) {
    throw new Error("Vercel staging build gate received an invalid candidate; details redacted.");
  }

  const dependencyModules = await requireDependencyModules(dependenciesRoot);
  const ownedPrefix = path.join(os.tmpdir(), "mais-vercel-staging-build-");
  const ownedRoot = await fs.mkdtemp(ownedPrefix);
  const sourceRoot = path.join(ownedRoot, "source");
  const distRelative = ".next-staging-validation";
  const distAbsolute = path.join(sourceRoot, distRelative);
  try {
    await fs.cp(staging.stagingDir, sourceRoot, {
      recursive: true,
      errorOnExist: true,
      force: false,
      preserveTimestamps: true
    });
    await fs.symlink(dependencyModules, path.join(sourceRoot, "node_modules"), "dir");
    const nextBin = path.join(dependencyModules, "next", "dist", "bin", "next");
    const nextStat = await fs.stat(nextBin).catch(() => null);
    if (!nextStat?.isFile()) {
      throw new Error("Vercel staging build dependencies are incomplete; details redacted.");
    }
    const result = await runBuild(process.execPath, [nextBin, "build"], {
      cwd: sourceRoot,
      env: buildReleaseBuildChildEnvironment(env, {
        MAIS_RELEASE_SHA: candidateSha,
        NEXT_DIST_DIR: distRelative,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_TSCONFIG_PATH: "tsconfig.next.json"
      })
    });
    if (result?.exitCode !== 0) {
      throw new Error("Vercel staging package did not pass its isolated production build; output redacted.");
    }
    const outputChecks = await verifyBuildOutputs(distAbsolute);
    await verifyStaging(staging);
    return {
      candidateSha,
      cleanup: true,
      completedAt: new Date().toISOString(),
      outputChecks,
      sourceKind: "verified-private-staging-copy",
      startedAt
    };
  } finally {
    await removeOwnedTempDirectory(ownedRoot, ownedPrefix);
  }
}

async function requireDependencyModules(dependenciesRoot) {
  const requested = path.resolve(dependenciesRoot, "node_modules");
  const real = await fs.realpath(requested).catch(() => null);
  const stat = real ? await fs.stat(real).catch(() => null) : null;
  if (!real || !stat?.isDirectory()) {
    throw new Error("Vercel staging build dependencies are unavailable; details redacted.");
  }
  return real;
}

async function verifyBuildOutputs(distAbsolute) {
  const checks = [];
  for (const relativePath of REQUIRED_STAGING_BUILD_OUTPUTS) {
    const stat = await fs.stat(path.join(distAbsolute, relativePath)).catch(() => null);
    checks.push({ path: relativePath, present: Boolean(stat?.isFile()) });
  }
  if (checks.some((check) => !check.present)) {
    throw new Error("Vercel staging build omitted a required parent/health output; details redacted.");
  }
  return checks;
}

async function removeOwnedTempDirectory(ownedRoot, ownedPrefix) {
  const parent = path.dirname(ownedPrefix);
  const basePrefix = path.basename(ownedPrefix);
  const relative = path.relative(parent, ownedRoot);
  if (
    path.dirname(ownedRoot) !== parent ||
    !path.basename(ownedRoot).startsWith(basePrefix) ||
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Vercel staging build cleanup target was not owned by this run.");
  }
  await fs.rm(ownedRoot, { recursive: true, force: true });
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let outputBytes = 0;
    const account = (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > BUILD_OUTPUT_LIMIT_BYTES) {
        child.kill("SIGTERM");
      }
    };
    child.stdout.on("data", account);
    child.stderr.on("data", account);
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1 }));
  });
}
