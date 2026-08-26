#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertCleanCandidateSha,
  parseVercelInspectEvidence,
  readCleanCandidateSha,
  runDeploymentReadOnlySmoke
} from "./deployment-read-only-smoke.mjs";
import {
  prepareVercelStaging,
  releasePreparedVercelStagingSeal,
  sealPreparedVercelStaging,
  verifyPreparedVercelStaging
} from "./prepare-vercel-staging.mjs";
import { runReleaseBuildGate } from "./release-build-gate.mjs";
import { runVercelStagingBuildGate } from "./vercel-staging-build-gate.mjs";
import {
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  verifyVercelProviderDeployment
} from "./vercel-provider-evidence.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SCOPE = APPROVED_VERCEL_TEAM_SLUG;
const DEFAULT_PROJECT = APPROVED_VERCEL_PROJECT_NAME;
const DEFAULT_TARGET = "preview";
const PREVIEW_CHILD_BASE_ENV_KEYS = Object.freeze([
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
const PREVIEW_CHILD_PURPOSE_ENV_KEYS = Object.freeze({
  git: Object.freeze([]),
  preflight: Object.freeze([
    "MAIS_CANONICAL_RELEASE_ROOT",
    "MAIS_DIRTY_TREE_MAP_JSON",
    "MAIS_DIRTY_TREE_MAP_MAX_AGE_MINUTES",
    "MAIS_RELEASE_MIN_FREE_GB",
    "MAIS_RELEASE_SOURCE_KIND",
    "MAIS_RELEASE_SOURCE_ROOT",
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_RUN_ID",
    "VERCEL_STAGING_ROOT"
  ]),
  smoke: Object.freeze([
    "DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET",
    "VERCEL_AUTOMATION_BYPASS_SECRET"
  ]),
  vercel: Object.freeze([
    "VERCEL_TELEMETRY_DISABLED",
    "VERCEL_TOKEN"
  ])
});

export { parseVercelInspectEvidence };

export function buildPreviewChildEnvironment(purpose, env = process.env) {
  const purposeKeys = PREVIEW_CHILD_PURPOSE_ENV_KEYS[purpose];
  if (!purposeKeys) {
    throw new Error("Preview child environment purpose was rejected.");
  }
  const childEnv = {};
  for (const key of [...PREVIEW_CHILD_BASE_ENV_KEYS, ...purposeKeys]) {
    if (typeof env?.[key] === "string") childEnv[key] = env[key];
  }
  if (purpose === "git" || purpose === "preflight") {
    Object.assign(childEnv, {
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_KEY_0: "core.fsmonitor",
      GIT_CONFIG_KEY_1: "core.hooksPath",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_VALUE_0: "false",
      GIT_CONFIG_VALUE_1: "/dev/null",
      GIT_NO_LAZY_FETCH: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0"
    });
  }
  return childEnv;
}

export async function deployPreview(options = {}) {
  const scope = validateVercelIdentifier(options.scope ?? process.env.VERCEL_SCOPE ?? DEFAULT_SCOPE, "scope");
  const project = validateVercelIdentifier(options.project ?? process.env.VERCEL_PROJECT_NAME ?? DEFAULT_PROJECT, "project");
  const target = options.target ?? process.env.VERCEL_TARGET ?? DEFAULT_TARGET;

  if (target !== "preview") {
    throw new Error("This wrapper only creates Preview deployments. Use the production wrapper for production.");
  }
  if (![APPROVED_VERCEL_TEAM_ID, APPROVED_VERCEL_TEAM_SLUG].includes(scope) || project !== APPROVED_VERCEL_PROJECT_NAME) {
    throw new Error("Vercel preview target is not the approved MAIS project/team; details redacted.");
  }

  const candidateSha = await readCleanCandidateSha({
    cwd: REPO_ROOT,
    runCommand: runPreviewGitCommand
  });
  let localBuildGate = null;
  if (!options.dryRun) {
    await runPreflight();
    localBuildGate = await runReleaseBuildGate({
      runId: options.runId ? `preview-${options.runId}` : undefined
    });
  }

  const staging = await prepareVercelStaging({
    runId: options.runId,
    stagingRoot: options.stagingRoot,
    dryRun: options.dryRun
  });
  const stagingBuildGate = options.dryRun
    ? null
    : await runVercelStagingBuildGate({ dependenciesRoot: REPO_ROOT, staging });
  await assertFinalStagingSource(candidateSha, staging);
  const stagingPackage = buildStagingPackageEvidence(staging, candidateSha);
  const buildEvidence = localBuildGate
    ? buildSafeBuildEvidence(localBuildGate)
    : { status: "not-run", reason: "offline-plan" };
  const stagingBuildEvidence = stagingBuildGate
    ? buildSafeStagingBuildEvidence(stagingBuildGate, candidateSha)
    : { status: "not-run", reason: "offline-plan" };

  if (options.dryRun) {
    return {
      candidateSha,
      deployed: false,
      dryRun: true,
      forbiddenPathCount: staging.forbiddenPathCount,
      buildEvidence,
      providerGitShaVerified: false,
      project,
      scope,
      stagingPackage,
      stagingBuildEvidence,
      stagingFileCount: staging.fileCount,
      stagingTotalBytes: staging.totalBytes,
      target
    };
  }

  const deployArgs = [
    "deploy",
    staging.stagingDir,
    "-y",
    "--target",
    target,
    "--scope",
    scope,
    "--project",
    project,
    "--meta",
    `maisCandidateSha=${candidateSha}`,
    "--env",
    `MAIS_RELEASE_SHA=${candidateSha}`,
    "--no-wait"
  ];

  await assertFinalStagingSource(candidateSha, staging);
  await verifyPreparedVercelStaging(staging);
  await sealPreparedVercelStaging(staging);
  let deployResult;
  try {
    deployResult = await runCommand("vercel", deployArgs, {
      cwd: REPO_ROOT,
      env: buildPreviewChildEnvironment("vercel")
    });
  } finally {
    await releasePreparedVercelStagingSeal(staging);
  }
  if (deployResult.exitCode !== 0) {
    throw new Error(formatCommandFailure("vercel deploy", deployResult));
  }

  const deploymentUrl = extractDeploymentUrl(`${deployResult.stdout}\n${deployResult.stderr}`);
  if (!deploymentUrl) {
    throw new Error("Vercel preview deploy returned no deployment URL; command details redacted.");
  }

  const inspectResult = await runCommand(
    "vercel",
    ["inspect", deploymentUrl, "--wait", "--timeout", "5m", "--scope", scope, "--format=json"],
    {
      cwd: REPO_ROOT,
      env: buildPreviewChildEnvironment("vercel")
    }
  );
  if (inspectResult.exitCode !== 0) {
    throw new Error("Vercel preview inspect failed; command details redacted.");
  }
  const deploymentEvidence = parseVercelInspectEvidence(inspectResult.stdout, {
    candidateSha,
    deploymentUrl,
    target
  });
  const providerEvidence = await verifyVercelProviderDeployment({
    candidateSha,
    deploymentId: deploymentEvidence.deploymentId,
    deploymentUrl,
    expectedStaging: staging,
    env: buildPreviewChildEnvironment("vercel"),
    requireProductionAliases: false,
    target
  });

  const deploymentReadOnlySmoke = await runDeploymentReadOnlySmoke(deploymentUrl, {
    approvedVercelDeploymentHost: new URL(providerEvidence.deploymentUrl).hostname,
    env: buildPreviewChildEnvironment("smoke")
  });
  const record = {
    candidateSha,
    deployedAt: new Date().toISOString(),
    deploymentEvidence,
    deploymentId: deploymentEvidence.deploymentId,
    deploymentReadOnlySmoke,
    providerEvidence,
    providerSourceVerified: true,
    deploymentUrl,
    dryRun: false,
    inspectVerified: true,
    buildEvidence,
    providerGitShaVerified: false,
    project,
    scope,
    stagingPackage,
    stagingBuildEvidence,
    stagingFileCount: staging.fileCount,
    stagingTotalBytes: staging.totalBytes,
    target
  };

  await fs.writeFile(
    path.join(
      path.dirname(staging.stagingDir),
      `${path.basename(staging.stagingDir)}-vercel-preview-deployment.json`
    ),
    serializeSafeDeploymentRecord(record, staging)
  );

  return record;
}

export function buildStagingPackageEvidence(staging, candidateSha) {
  const fail = () => {
    throw new Error("Invalid staging package evidence; details redacted.");
  };
  const objectFormat = staging?.objectFormat;
  const oidPattern = objectFormat === "sha1" ? /^[0-9a-f]{40}$/u : null;
  const manifestPath = String(staging?.manifestPath ?? "");
  const pathSegments = manifestPath.split("/");
  if (
    !oidPattern ||
    !oidPattern.test(candidateSha) ||
    staging?.candidateSha !== candidateSha ||
    !oidPattern.test(String(staging?.sourceTreeObject ?? "")) ||
    staging?.gitSourceVerified !== true ||
    !/^[0-9a-f]{64}$/u.test(String(staging?.sourceManifestRoot ?? "")) ||
    !/^[0-9a-f]{40}$/u.test(String(staging?.manifestRawSha1 ?? "")) ||
    !/^[0-9a-f]{64}$/u.test(String(staging?.manifestSha256 ?? "")) ||
    manifestPath !== "vercel-staging-manifest.json" ||
    pathSegments.includes("..") ||
    !Number.isSafeInteger(staging?.trackedEntryCount) ||
    staging.trackedEntryCount < 1 ||
    !Number.isSafeInteger(staging?.fileCount) ||
    staging.fileCount < 1 ||
    staging.fileCount > staging.trackedEntryCount ||
    !Number.isSafeInteger(staging?.totalBytes) ||
    staging.totalBytes < 0 ||
    staging?.excludedPolicy?.dataEase !== true ||
    staging?.excludedPolicy?.publicQuestionIllustrations !== true ||
    staging?.excludedPolicy?.localSecretsAndGeneratedOutputs !== true
  ) {
    fail();
  }
  return {
    sourceKind: "clean-head-tracked-regular-blobs",
    gitSourceVerified: true,
    candidateSha,
    sourceTreeObject: staging.sourceTreeObject,
    objectFormat,
    trackedEntryCount: staging.trackedEntryCount,
    fileCount: staging.fileCount,
    totalBytes: staging.totalBytes,
    sourceManifestAlgorithm: "sha256-canonical-json-lines-v2",
    sourceManifestRoot: staging.sourceManifestRoot,
    manifest: {
      schemaVersion: 2,
      path: manifestPath,
      rawSha1: staging.manifestRawSha1,
      sha256: staging.manifestSha256
    },
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    }
  };
}

export function buildSafeBuildEvidence(buildGate) {
  const outputChecks = Array.isArray(buildGate?.outputChecks)
    ? buildGate.outputChecks.map((check) => {
      const relativePath = String(check?.path ?? "");
      if (
        !relativePath ||
        relativePath.startsWith("/") ||
        relativePath.includes("\\") ||
        relativePath.split("/").includes("..") ||
        typeof check?.present !== "boolean"
      ) {
        throw new Error("Invalid local build evidence; details redacted.");
      }
      return { path: relativePath, present: check.present };
    })
    : null;
  if (
    typeof buildGate?.cleanup !== "boolean" ||
    !isIsoTimestamp(buildGate?.startedAt) ||
    !isIsoTimestamp(buildGate?.completedAt) ||
    !outputChecks
  ) {
    throw new Error("Invalid local build evidence; details redacted.");
  }
  return {
    cleanup: buildGate.cleanup,
    completedAt: buildGate.completedAt,
    outputChecks,
    startedAt: buildGate.startedAt
  };
}

export function buildSafeStagingBuildEvidence(buildGate, candidateSha) {
  const build = buildSafeBuildEvidence(buildGate);
  if (
    buildGate?.candidateSha !== candidateSha ||
    buildGate?.sourceKind !== "verified-private-staging-copy" ||
    build.cleanup !== true
  ) {
    throw new Error("Invalid staging build evidence; details redacted.");
  }
  return {
    ...build,
    candidateSha,
    sourceKind: "verified-private-staging-copy"
  };
}

async function assertFinalStagingSource(candidateSha, staging) {
  if (staging?.candidateSha !== candidateSha || staging?.gitSourceVerified !== true) {
    throw new Error("Final staging source verification failed; details redacted.");
  }
  await assertCleanCandidateSha(candidateSha, {
    cwd: REPO_ROOT,
    runCommand: runPreviewGitCommand
  });
  let treeResult;
  try {
    treeResult = await runCommand("git", ["rev-parse", `${candidateSha}^{tree}`], {
      cwd: REPO_ROOT,
      env: buildPreviewChildEnvironment("git")
    });
  } catch {
    throw new Error("Final staging source verification failed; details redacted.");
  }
  if (
    treeResult.exitCode !== 0 ||
    treeResult.stdout.trim().toLowerCase() !== staging.sourceTreeObject
  ) {
    throw new Error("Final staging source verification failed; details redacted.");
  }
  await assertCleanCandidateSha(candidateSha, {
    cwd: REPO_ROOT,
    runCommand: runPreviewGitCommand
  });
}

function serializeSafeDeploymentRecord(record, staging) {
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  for (const forbidden of [REPO_ROOT, staging?.stagingDir]) {
    if (forbidden && serialized.includes(forbidden)) {
      throw new Error("Local deployment record contained an absolute path; details redacted.");
    }
  }
  return serialized;
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

function validateVercelIdentifier(value, label) {
  const normalized = String(value ?? "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u.test(normalized)) {
    throw new Error(`Vercel ${label} is invalid; details redacted.`);
  }
  return normalized;
}

async function runPreflight() {
  const preflight = await runCommand(
    process.execPath,
    ["scripts/release-env-guard.mjs", "preview"],
    {
      cwd: REPO_ROOT,
      env: buildPreviewChildEnvironment("preflight")
    }
  );
  if (preflight.exitCode !== 0) {
    throw new Error("Preview release preflight failed; command details redacted.");
  }
}

function runPreviewGitCommand(command, args, options = {}) {
  if (command !== "git") {
    return Promise.reject(new Error("Preview Git verifier command was rejected."));
  }
  return runCommand(command, args, {
    cwd: options.cwd,
    env: buildPreviewChildEnvironment("git")
  });
}

function extractDeploymentUrl(output) {
  const urls = output.match(/https:\/\/[^\s)\]]+/g) ?? [];
  const cleaned = urls.map((url) => url.replace(/[.,;]+$/, ""));
  return (
    cleaned.find((url) => /\.vercel\.app(?:\/)?$/u.test(url)) ??
    cleaned.find((url) => !url.includes("://vercel.com/")) ??
    null
  );
}

export function runCommand(command, args, options = {}) {
  if (!options.env || typeof options.env !== "object" || Array.isArray(options.env)) {
    return Promise.reject(new Error("Preview command requires an explicit child environment."));
  }
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
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function formatCommandFailure(label, result) {
  const exitCode = Number.isInteger(result?.exitCode) ? result.exitCode : "unknown";
  return `${label} failed with exit code ${exitCode}; command details redacted.`;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    project: undefined,
    runId: undefined,
    scope: undefined,
    stagingRoot: undefined,
    target: DEFAULT_TARGET
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--run-id") {
      args.runId = argv[++index];
    } else if (arg === "--scope") {
      args.scope = argv[++index];
    } else if (arg === "--project") {
      args.project = argv[++index];
    } else if (arg === "--staging-root") {
      args.stagingRoot = argv[++index];
    } else if (arg === "--target") {
      args.target = argv[++index];
    } else {
      throw new Error(arg.startsWith("--")
        ? `Unknown argument flag: ${arg.split("=", 1)[0]}`
        : "Unknown argument.");
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const record = await deployPreview(args);

  if (args.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (record.dryRun) {
    console.log("Vercel Preview dry run passed");
    console.log(`Candidate SHA: ${record.candidateSha}`);
    console.log(`Target: ${record.target}`);
    console.log(`Files: ${record.stagingFileCount}`);
    console.log(`Forbidden paths: ${record.forbiddenPathCount}`);
    return;
  }

  console.log("Vercel Preview deployment verified");
  console.log(`Candidate SHA: ${record.candidateSha}`);
  console.log(`Deployment ID: ${record.deploymentId}`);
  console.log(`Preview URL: ${record.deploymentUrl}`);
  console.log("Read-only deployment smoke: passed");
  console.log(`Files: ${record.stagingFileCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Preview deployment failed; details redacted.");
    process.exitCode = 1;
  });
}
