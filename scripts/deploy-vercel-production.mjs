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
import {
  MAIS_GITHUB_REPOSITORY,
  verifyGithubCandidateChecks
} from "./github-candidate-checks.mjs";
import { runVercelStagingBuildGate } from "./vercel-staging-build-gate.mjs";
import {
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  readCurrentVercelProductionDeployment,
  readVercelProductionAliasBindings,
  verifyVercelProviderDeployment
} from "./vercel-provider-evidence.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SCOPE = APPROVED_VERCEL_TEAM_SLUG;
const DEFAULT_PROJECT = APPROVED_VERCEL_PROJECT_NAME;
const PRODUCTION_EVIDENCE_ROOT = path.join(
  REPO_ROOT,
  ".tmp",
  "vercel-production-evidence"
);
const PRODUCTION_READ_ONLY_ORIGINS = Object.freeze([
  "https://www.mais.ac",
  "https://www.mais.hk"
]);
const PRODUCTION_CHILD_BASE_ENV_KEYS = Object.freeze([
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
const PRODUCTION_CHILD_PURPOSE_ENV_KEYS = Object.freeze({
  git: Object.freeze([]),
  github: Object.freeze([
    "GITHUB_TOKEN"
  ]),
  preflight: Object.freeze([
    "GITHUB_ACTIONS",
    "GITHUB_EVENT_NAME",
    "GITHUB_REF",
    "GITHUB_REF_PROTECTED",
    "GITHUB_REPOSITORY",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_RUN_ID",
    "GITHUB_SHA",
    "GITHUB_WORKFLOW_REF",
    "MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT",
    "VERCEL_TOKEN"
  ]),
  schema: Object.freeze([
    "GITHUB_ACTIONS",
    "GITHUB_EVENT_NAME",
    "GITHUB_REF",
    "GITHUB_REF_PROTECTED",
    "GITHUB_REPOSITORY",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_RUN_ID",
    "GITHUB_SHA",
    "GITHUB_WORKFLOW_REF",
    "MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT",
    "MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM",
    "VERCEL_TOKEN"
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

export function buildProductionChildEnvironment(purpose, env = process.env) {
  const purposeKeys = PRODUCTION_CHILD_PURPOSE_ENV_KEYS[purpose];
  if (!purposeKeys) {
    throw new Error("Production child environment purpose was rejected.");
  }
  const childEnv = {};
  for (const key of [...PRODUCTION_CHILD_BASE_ENV_KEYS, ...purposeKeys]) {
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
  if (purpose === "schema") {
    Object.assign(childEnv, {
      MAIS_PRODUCTION_SCHEMA_ENV_SOURCE: "vercel-api-pull-v1"
    });
  }
  return childEnv;
}

export async function deployProduction(options = {}) {
  const scope = validateVercelIdentifier(options.scope ?? process.env.VERCEL_SCOPE ?? DEFAULT_SCOPE, "scope");
  const project = validateVercelIdentifier(options.project ?? process.env.VERCEL_PROJECT_NAME ?? DEFAULT_PROJECT, "project");
  if (![APPROVED_VERCEL_TEAM_ID, APPROVED_VERCEL_TEAM_SLUG].includes(scope) || project !== APPROVED_VERCEL_PROJECT_NAME) {
    throw new Error("Vercel production target is not the approved MAIS project/team; details redacted.");
  }
  const candidateSha = await readCleanCandidateSha({
    cwd: REPO_ROOT,
    runCommand: runGithubVerifierCommand
  });
  const productionExecutionContext = options.dryRun
    ? { environment: "offline", serialized: false }
    : assertProductionDeploymentExecutionContext({ candidateSha, env: process.env });

  let localBuildGate = null;
  if (!options.dryRun) {
    await runPreflight();
    localBuildGate = await runReleaseBuildGate({
      runId: options.runId ? `production-${options.runId}` : undefined
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
    : { status: "not-run", reason: "offline-source-plan-only" };
  const stagingBuildEvidence = stagingBuildGate
    ? buildSafeStagingBuildEvidence(stagingBuildGate, candidateSha)
    : { status: "not-run", reason: "offline-source-plan-only" };

  if (options.dryRun) {
    return {
      candidateSha,
      deployed: false,
      dryRun: true,
      dryRunScope: "offline-source-plan-only",
      forbiddenPathCount: staging.forbiddenPathCount,
      buildEvidence,
      productionOrigins: [...PRODUCTION_READ_ONLY_ORIGINS],
      productionExecutionContext,
      providerGitShaVerified: false,
      project,
      scope,
      stagingPackage,
      stagingBuildEvidence,
      stagingFileCount: staging.fileCount,
      stagingTotalBytes: staging.totalBytes,
      target: "production"
    };
  }

  const preDeployGithubEvidence = await verifyGithubCandidateChecks({
    candidateSha,
    env: buildProductionChildEnvironment("github"),
    expectedTreeSha: staging.sourceTreeObject,
    repoRoot: REPO_ROOT,
    runCommand: runGithubVerifierCommand
  });
  const previousProductionDeployment = await readCurrentVercelProductionDeployment({
    env: buildProductionChildEnvironment("vercel")
  });
  const productionSchemaApplyEvidence = await runTeacherNoticeProductionSchemaGate({
    candidateSha,
    expectedTreeSha: staging.sourceTreeObject,
    mode: "apply"
  });

  const deployArgs = [
    "deploy",
    staging.stagingDir,
    "-y",
    "--prod",
    "--skip-domain",
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
      env: buildProductionChildEnvironment("vercel")
    });
  } finally {
    await releasePreparedVercelStagingSeal(staging);
  }
  if (deployResult.exitCode !== 0) {
    throw new Error(formatCommandFailure("vercel deploy --prod", deployResult));
  }

  const deploymentUrl = extractDeploymentUrl(`${deployResult.stdout}\n${deployResult.stderr}`);
  if (!deploymentUrl) {
    throw new Error(
      "Vercel production deploy returned no deployment URL; command details redacted."
    );
  }

  const inspectResult = await runCommand(
    "vercel",
    ["inspect", deploymentUrl, "--wait", "--timeout", "5m", "--scope", scope, "--format=json"],
    {
      cwd: REPO_ROOT,
      env: buildProductionChildEnvironment("vercel")
    }
  );
  if (inspectResult.exitCode !== 0) {
    throw new Error("Vercel production inspect failed; command details redacted.");
  }
  const deploymentEvidence = parseVercelInspectEvidence(inspectResult.stdout, {
    candidateSha,
    deploymentUrl,
    target: "production"
  });
  const prePromotionProviderEvidence = await verifyVercelProviderDeployment({
    candidateSha,
    deploymentId: deploymentEvidence.deploymentId,
    deploymentUrl,
    env: buildProductionChildEnvironment("vercel"),
    expectedStaging: staging,
    requireProductionAliases: false,
    target: "production"
  });

  const deploymentReadOnlySmoke = await runDeploymentReadOnlySmoke(deploymentUrl, {
    approvedVercelDeploymentHost: new URL(prePromotionProviderEvidence.deploymentUrl).hostname,
    env: buildProductionChildEnvironment("smoke")
  });
  if (previousProductionDeployment.deploymentId === deploymentEvidence.deploymentId) {
    throw new Error("Vercel production promotion target was already live; details redacted.");
  }
  const prePromotionAliasBindings = await readVercelProductionAliasBindings({
    env: buildProductionChildEnvironment("vercel")
  });
  try {
    assertProductionAliasBindingsMatchDeployment(
      prePromotionAliasBindings,
      previousProductionDeployment
    );
  } catch {
    await restorePreviousProductionDeployment({
      candidateDeploymentId: deploymentEvidence.deploymentId,
      previousProductionDeployment,
      scope
    });
    throw new Error(
      "Candidate deployment unexpectedly changed production aliases; the prior deployment was restored and rechecked."
    );
  }
  const prePromotionSchemaEvidence = await runTeacherNoticeProductionSchemaGate({
    candidateSha,
    expectedTreeSha: staging.sourceTreeObject,
    mode: "preflight",
    targetFingerprint: productionSchemaApplyEvidence.targetFingerprint
  });
  const prePromotionGithubEvidence = await verifyGithubCandidateChecks({
    candidateSha,
    env: buildProductionChildEnvironment("github"),
    expectedTreeSha: staging.sourceTreeObject,
    repoRoot: REPO_ROOT,
    runCommand: runGithubVerifierCommand
  });
  const finalPrePromotionAliasBindings = await readVercelProductionAliasBindings({
    env: buildProductionChildEnvironment("vercel")
  });
  try {
    assertProductionAliasBindingsMatchDeployment(
      finalPrePromotionAliasBindings,
      previousProductionDeployment
    );
  } catch {
    await restorePreviousProductionDeployment({
      candidateDeploymentId: deploymentEvidence.deploymentId,
      previousProductionDeployment,
      scope
    });
    throw new Error(
      "Production aliases changed at the final pre-promotion check; the prior deployment was restored when safe."
    );
  }
  const record = await executeRequiredPostPromotionTransaction({
    execute: async () => {
      const promoteResult = await runCommand(
        "vercel",
        ["promote", deploymentUrl, "-y", "--timeout", "5m", "--scope", scope],
        {
          cwd: REPO_ROOT,
          env: buildProductionChildEnvironment("vercel")
        }
      );
      if (promoteResult.exitCode !== 0) {
        throw new Error("Vercel production promotion failed; command details redacted.");
      }
      const promotedProviderEvidence = await verifyVercelProviderDeployment({
        candidateSha,
        deploymentId: deploymentEvidence.deploymentId,
        deploymentUrl,
        env: buildProductionChildEnvironment("vercel"),
        expectedStaging: staging,
        requireProductionAliases: true,
        target: "production"
      });

      const productionReadOnlySmokes = [];
      for (const productionOrigin of PRODUCTION_READ_ONLY_ORIGINS) {
        productionReadOnlySmokes.push(await runDeploymentReadOnlySmoke(productionOrigin, {
          env: buildProductionChildEnvironment("smoke")
        }));
      }
      const finalProductionDeployment = await readCurrentVercelProductionDeployment({
        env: buildProductionChildEnvironment("vercel")
      });
      if (
        finalProductionDeployment.deploymentId !== deploymentEvidence.deploymentId ||
        finalProductionDeployment.deploymentUrl !== prePromotionProviderEvidence.deploymentUrl
      ) {
        throw new Error("Production aliases did not remain bound to the verified candidate.");
      }

      return persistRequiredProductionDeploymentRecord({
        record: {
          candidateSha,
          deployedAt: new Date().toISOString(),
          deploymentEvidence,
          deploymentId: deploymentEvidence.deploymentId,
          deploymentReadOnlySmoke,
          deploymentUrl,
          finalProductionDeployment,
          finalPrePromotionAliasBindings,
          inspectVerified: true,
          buildEvidence,
          productionOrigins: [...PRODUCTION_READ_ONLY_ORIGINS],
          productionExecutionContext,
          productionReadOnlySmokes,
          preDeployGithubEvidence,
          prePromotionGithubEvidence,
          prePromotionSchemaEvidence,
          prePromotionProviderEvidence,
          previousProductionDeployment,
          promotedProviderEvidence,
          productionSchemaApplyEvidence,
          providerSourceVerified: true,
          providerGitShaVerified: true,
          project,
          promotionVerified: true,
          scope,
          stagingPackage,
          stagingBuildEvidence,
          stagingFileCount: staging.fileCount,
          stagingTotalBytes: staging.totalBytes,
          target: "production"
        },
        staging
      });
    },
    rollback: () =>
      restorePreviousProductionDeployment({
        candidateDeploymentId: deploymentEvidence.deploymentId,
        previousProductionDeployment,
        scope
      })
  });

  return record;
}

export async function executeRequiredPostPromotionTransaction({ execute, rollback }) {
  if (typeof execute !== "function" || typeof rollback !== "function") {
    throw new Error("Production post-promotion transaction was invalid.");
  }
  try {
    return await execute();
  } catch {
    await rollback();
    throw new Error(
      "Production post-promotion verification failed; the previous deployment was restored and rechecked."
    );
  }
}

export function buildProductionDeploymentRecordRelativePath({
  candidateSha,
  productionExecutionContext
}) {
  const runId = String(productionExecutionContext?.runId ?? "");
  const runAttempt = productionExecutionContext?.runAttempt;
  if (
    !/^[a-f0-9]{40}$/u.test(String(candidateSha ?? "")) ||
    productionExecutionContext?.environment !== "production" ||
    productionExecutionContext?.serialized !== true ||
    !/^[1-9][0-9]{0,19}$/u.test(runId) ||
    !Number.isSafeInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 999_999
  ) {
    throw new Error("Production deployment record binding was invalid.");
  }
  return path.posix.join(
    ".tmp",
    "vercel-production-evidence",
    `run-${runId}-attempt-${runAttempt}-${candidateSha}.json`
  );
}

export async function persistRequiredProductionDeploymentRecord({
  operations = {},
  record,
  staging
}) {
  const relativePath = buildProductionDeploymentRecordRelativePath({
    candidateSha: record?.candidateSha,
    productionExecutionContext: record?.productionExecutionContext
  });
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  if (path.dirname(absolutePath) !== PRODUCTION_EVIDENCE_ROOT) {
    throw new Error("Production deployment record path was invalid.");
  }
  const persistedRecord = {
    ...record,
    deploymentRecord: {
      path: relativePath,
      persisted: true,
      schemaVersion: 1
    }
  };
  const serialized = serializeSafeDeploymentRecord(persistedRecord, staging);
  const makeDirectory = operations.makeDirectory ?? fs.mkdir;
  const writeFile = operations.writeFile ?? fs.writeFile;
  if (typeof makeDirectory !== "function" || typeof writeFile !== "function") {
    throw new Error("Production deployment record operations were invalid.");
  }
  await makeDirectory(PRODUCTION_EVIDENCE_ROOT, { recursive: true });
  await writeFile(absolutePath, serialized, { encoding: "utf8", flag: "wx" });
  return persistedRecord;
}

const productionSchemaPlans = new Set([
  "[]",
  '["webhook-v2-to-v3"]',
  '["webhook-install-v3"]',
  '["heartbeat-v1-to-v2"]',
  '["heartbeat-install-v2"]',
  '["webhook-v2-to-v3","heartbeat-v1-to-v2"]',
  '["webhook-v2-to-v3","heartbeat-install-v2"]',
  '["webhook-install-v3","heartbeat-v1-to-v2"]',
  '["webhook-install-v3","heartbeat-install-v2"]'
]);

function expectedProductionSchemaPlan({ heartbeatState, webhookState }) {
  if (
    !["empty", "upgradeable", "exact"].includes(webhookState) ||
    !["empty", "v1", "exact"].includes(heartbeatState)
  ) {
    return null;
  }
  const operations = [];
  if (webhookState === "upgradeable") operations.push("webhook-v2-to-v3");
  if (webhookState === "empty") operations.push("webhook-install-v3");
  if (heartbeatState === "v1") operations.push("heartbeat-v1-to-v2");
  if (heartbeatState === "empty") operations.push("heartbeat-install-v2");
  return operations;
}

function safeProductionSchemaSnapshot(payload, { candidateSha, expectedTreeSha }) {
  const operations = Array.isArray(payload?.operations) ? payload.operations : null;
  const statistics = payload?.statistics;
  const expectedOperations = expectedProductionSchemaPlan({
    heartbeatState: payload?.heartbeatState,
    webhookState: payload?.webhookState
  });
  if (
    payload?.schemaVersion !== 2 ||
    payload?.candidateSha !== candidateSha ||
    payload?.expectedTreeSha !== expectedTreeSha ||
    payload?.projectId !== APPROVED_VERCEL_PROJECT_ID ||
    payload?.projectName !== APPROVED_VERCEL_PROJECT_NAME ||
    payload?.teamId !== APPROVED_VERCEL_TEAM_ID ||
    payload?.teamSlug !== APPROVED_VERCEL_TEAM_SLUG ||
    !/^[a-f0-9]{64}$/u.test(String(payload?.targetFingerprint ?? "")) ||
    !Number.isSafeInteger(payload?.postgresMajor) ||
    payload.postgresMajor < 16 ||
    !expectedOperations ||
    !operations ||
    !productionSchemaPlans.has(JSON.stringify(operations)) ||
    JSON.stringify(operations) !== JSON.stringify(expectedOperations) ||
    !statistics ||
    !/^(?:0|[1-9][0-9]{0,29})$/u.test(String(statistics.tableBytes ?? "")) ||
    !/^(?:0|[1-9][0-9]{0,29})$/u.test(String(statistics.indexBytes ?? "")) ||
    !/^(?:0|[1-9][0-9]{0,29})$/u.test(String(statistics.rowEstimate ?? "")) ||
    !/^[a-f0-9]{64}$/u.test(String(payload?.preflightDigest ?? "")) ||
    typeof payload?.requiredConfirmation !== "string" ||
    !payload.requiredConfirmation.startsWith(
      "confirm:teacher-notice-production-schema:v2:"
    ) ||
    payload.requiredConfirmation.length > 1_024
  ) {
    throw new Error("Teacher notice production schema gate evidence was invalid.");
  }
  return {
    candidateSha,
    expectedTreeSha,
    heartbeatState: payload.heartbeatState,
    operations: [...operations],
    postgresMajor: payload.postgresMajor,
    preflightDigest: payload.preflightDigest,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    statistics: {
      indexBytes: String(statistics.indexBytes),
      rowEstimate: String(statistics.rowEstimate),
      tableBytes: String(statistics.tableBytes)
    },
    targetFingerprint: payload.targetFingerprint,
    teamId: APPROVED_VERCEL_TEAM_ID,
    webhookState: payload.webhookState
  };
}

export function parseTeacherNoticeProductionSchemaGateEvidence(output, expected) {
  try {
    const candidateSha = String(expected?.candidateSha ?? "").trim().toLowerCase();
    const expectedTreeSha = String(expected?.expectedTreeSha ?? "").trim().toLowerCase();
    const mode = expected?.mode;
    const normalized = String(output ?? "").trim();
    if (
      !/^[a-f0-9]{40}$/u.test(candidateSha) ||
      !/^[a-f0-9]{40}$/u.test(expectedTreeSha) ||
      (mode !== "apply" && mode !== "preflight") ||
      Buffer.byteLength(normalized, "utf8") > 64 * 1_024
    ) {
      throw new Error("invalid expected binding");
    }
    const payload = JSON.parse(normalized);
    if (payload?.ok !== true || payload?.network !== true || payload?.mode !== mode) {
      throw new Error("invalid gate envelope");
    }
    if (mode === "preflight") {
      if (payload?.mutation !== false) throw new Error("invalid preflight envelope");
      const safe = safeProductionSchemaSnapshot(payload, {
        candidateSha,
        expectedTreeSha
      });
      if (
        expected?.targetFingerprint !== undefined &&
        (safe.targetFingerprint !== expected.targetFingerprint ||
          safe.webhookState !== "exact" ||
          safe.heartbeatState !== "exact" ||
          safe.operations.length !== 0)
      ) {
        throw new Error("pre-promotion schema attestation changed");
      }
      return { ...safe, mode: "preflight", mutation: false, network: true };
    }

    if (
      payload?.mutation !== true ||
      payload?.candidateSha !== candidateSha ||
      payload?.expectedTreeSha !== expectedTreeSha ||
      payload?.projectId !== APPROVED_VERCEL_PROJECT_ID ||
      payload?.teamId !== APPROVED_VERCEL_TEAM_ID ||
      !productionSchemaPlans.has(JSON.stringify(payload?.operations)) ||
      !/^[a-f0-9]{64}$/u.test(String(payload?.preflightDigest ?? "")) ||
      !/^[a-f0-9]{64}$/u.test(String(payload?.targetFingerprint ?? ""))
    ) {
      throw new Error("invalid apply evidence");
    }
    const sameConnectionPostflight = safeProductionSchemaSnapshot(
      payload.sameConnectionPostflight,
      { candidateSha, expectedTreeSha }
    );
    const postflight = safeProductionSchemaSnapshot(payload.postflight, {
      candidateSha,
      expectedTreeSha
    });
    if (
      postflight.targetFingerprint !== payload.targetFingerprint ||
      sameConnectionPostflight.targetFingerprint !== payload.targetFingerprint ||
      postflight.webhookState !== "exact" ||
      sameConnectionPostflight.webhookState !== "exact" ||
      postflight.heartbeatState !== "exact" ||
      sameConnectionPostflight.heartbeatState !== "exact" ||
      postflight.operations.length !== 0 ||
      sameConnectionPostflight.operations.length !== 0 ||
      postflight.postgresMajor !== sameConnectionPostflight.postgresMajor
    ) {
      throw new Error("invalid exact postflight");
    }
    return {
      candidateSha,
      expectedTreeSha,
      mode: "apply",
      mutation: true,
      network: true,
      operations: [...payload.operations],
      postflight,
      preflightDigest: payload.preflightDigest,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      sameConnectionPostflight,
      targetFingerprint: payload.targetFingerprint,
      teamId: APPROVED_VERCEL_TEAM_ID
    };
  } catch {
    throw new Error("Teacher notice production schema gate evidence was invalid.");
  }
}

async function runTeacherNoticeProductionSchemaGate({
  candidateSha,
  expectedTreeSha,
  mode,
  targetFingerprint
}) {
  const result = await runCommand(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/teacher-notice-production-schema-gate.mjs",
      mode === "apply" ? "--apply" : "--preflight",
      `--candidate-sha=${candidateSha}`,
      `--expected-tree-sha=${expectedTreeSha}`
    ],
    {
      cwd: REPO_ROOT,
      env: buildProductionChildEnvironment("schema")
    }
  );
  if (result.exitCode !== 0) {
    throw new Error("Teacher notice production schema gate failed; details redacted.");
  }
  return parseTeacherNoticeProductionSchemaGateEvidence(result.stdout, {
    candidateSha,
    expectedTreeSha,
    mode,
    targetFingerprint
  });
}

export function assertProductionDeploymentExecutionContext({ candidateSha, env }) {
  const normalizedCandidateSha = String(candidateSha ?? "").trim().toLowerCase();
  const expectedWorkflow =
    `${MAIS_GITHUB_REPOSITORY}/.github/workflows/production-deploy.yml@refs/heads/main`;
  const runId = String(env?.GITHUB_RUN_ID ?? "");
  const runAttempt = String(env?.GITHUB_RUN_ATTEMPT ?? "");
  if (
    !/^[a-f0-9]{40}$/u.test(normalizedCandidateSha) ||
    env?.CI !== "true" ||
    env?.GITHUB_ACTIONS !== "true" ||
    env?.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env?.GITHUB_REF !== "refs/heads/main" ||
    env?.GITHUB_REF_PROTECTED !== "true" ||
    env?.GITHUB_REPOSITORY !== MAIS_GITHUB_REPOSITORY ||
    String(env?.GITHUB_SHA ?? "").toLowerCase() !== normalizedCandidateSha ||
    env?.GITHUB_WORKFLOW_REF !== expectedWorkflow ||
    env?.MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT !==
      "github-actions-serialized-v1" ||
    !/^[1-9][0-9]{0,19}$/u.test(runId) ||
    !/^[1-9][0-9]{0,5}$/u.test(runAttempt)
  ) {
    throw new Error(
      "Production deployment requires the serialized protected-main GitHub workflow."
    );
  }
  return {
    environment: "production",
    event: "workflow_dispatch",
    repository: MAIS_GITHUB_REPOSITORY,
    runAttempt: Number(runAttempt),
    runId,
    serialized: true,
    workflow: ".github/workflows/production-deploy.yml"
  };
}

export function classifyProductionRollbackAction({
  candidateDeploymentId,
  currentDeploymentId,
  previousDeploymentId
}) {
  const pattern = /^dpl_[A-Za-z0-9]{8,128}$/u;
  if (
    !pattern.test(String(candidateDeploymentId ?? "")) ||
    !pattern.test(String(currentDeploymentId ?? "")) ||
    !pattern.test(String(previousDeploymentId ?? "")) ||
    candidateDeploymentId === previousDeploymentId
  ) {
    throw new Error("Production rollback evidence was invalid; details redacted.");
  }
  if (currentDeploymentId === previousDeploymentId) return "already-restored";
  if (currentDeploymentId === candidateDeploymentId) return "restore-previous";
  throw new Error("Production aliases changed outside this deployment; rollback was not attempted.");
}

export function classifyProductionRollbackBindings({
  candidateDeploymentId,
  currentBindings,
  previousBindings
}) {
  const deploymentPattern = /^dpl_[A-Za-z0-9]{8,128}$/u;
  const expectedOrigins = [...PRODUCTION_READ_ONLY_ORIGINS];
  const isValidBindings = (bindings) =>
    Array.isArray(bindings) &&
    bindings.length === expectedOrigins.length &&
    bindings.every((binding, index) =>
      binding?.origin === expectedOrigins[index] &&
      deploymentPattern.test(String(binding?.deploymentId ?? ""))
    );
  if (
    !deploymentPattern.test(String(candidateDeploymentId ?? "")) ||
    !isValidBindings(currentBindings) ||
    !isValidBindings(previousBindings)
  ) {
    throw new Error("Production rollback evidence was invalid; details redacted.");
  }
  const previousDeploymentIds = new Set(previousBindings.map(({ deploymentId }) => deploymentId));
  if (previousDeploymentIds.size !== 1 || previousDeploymentIds.has(candidateDeploymentId)) {
    throw new Error("Production rollback evidence was invalid; details redacted.");
  }
  const previousDeploymentId = previousBindings[0].deploymentId;
  if (currentBindings.some(({ deploymentId }) =>
    deploymentId !== previousDeploymentId && deploymentId !== candidateDeploymentId
  )) {
    throw new Error("Production aliases changed outside this deployment; rollback was not attempted.");
  }
  return currentBindings.every(({ deploymentId }) => deploymentId === previousDeploymentId)
    ? "already-restored"
    : "restore-previous";
}

function productionAliasBindingsForDeployment(deployment) {
  return PRODUCTION_READ_ONLY_ORIGINS.map((origin) => ({
    origin,
    deploymentId: deployment.deploymentId,
    deploymentUrl: deployment.deploymentUrl
  }));
}

function assertProductionAliasBindingsMatchDeployment(bindings, deployment) {
  const expected = productionAliasBindingsForDeployment(deployment);
  if (
    !Array.isArray(bindings) ||
    bindings.length !== expected.length ||
    bindings.some((binding, index) =>
      binding?.origin !== expected[index].origin ||
      binding?.deploymentId !== expected[index].deploymentId ||
      binding?.deploymentUrl !== expected[index].deploymentUrl
    )
  ) {
    throw new Error("Production aliases changed before promotion; promotion was not attempted.");
  }
}

async function restorePreviousProductionDeployment({
  candidateDeploymentId,
  previousProductionDeployment,
  scope
}) {
  const currentBindings = await readVercelProductionAliasBindings({
    env: buildProductionChildEnvironment("vercel")
  });
  const action = classifyProductionRollbackBindings({
    candidateDeploymentId,
    currentBindings,
    previousBindings: productionAliasBindingsForDeployment(previousProductionDeployment)
  });
  if (action === "restore-previous") {
    const rollbackResult = await runCommand(
      "vercel",
      [
        "promote",
        previousProductionDeployment.deploymentUrl,
        "-y",
        "--timeout",
        "5m",
        "--scope",
        scope
      ],
      {
        cwd: REPO_ROOT,
        env: buildProductionChildEnvironment("vercel")
      }
    );
    if (rollbackResult.exitCode !== 0) {
      throw new Error("Production rollback command failed; details redacted.");
    }
  }
  const restored = await readCurrentVercelProductionDeployment({
    env: buildProductionChildEnvironment("vercel")
  });
  if (
    restored.deploymentId !== previousProductionDeployment.deploymentId ||
    restored.deploymentUrl !== previousProductionDeployment.deploymentUrl
  ) {
    throw new Error("Production rollback alias verification failed; details redacted.");
  }
  for (const productionOrigin of PRODUCTION_READ_ONLY_ORIGINS) {
    await runDeploymentReadOnlySmoke(productionOrigin, {
      env: buildProductionChildEnvironment("smoke")
    });
  }
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
    runCommand: runGithubVerifierCommand
  });
  let treeResult;
  try {
    treeResult = await runCommand("git", ["rev-parse", `${candidateSha}^{tree}`], {
      cwd: REPO_ROOT,
      env: buildProductionChildEnvironment("git")
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
    runCommand: runGithubVerifierCommand
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
    ["scripts/release-env-guard.mjs", "production-workflow-staged-publish"],
    {
      cwd: REPO_ROOT,
      env: buildProductionChildEnvironment("preflight")
    }
  );
  if (preflight.exitCode !== 0) {
    throw new Error("Staged production publish preflight failed; command details redacted.");
  }
}

function runGithubVerifierCommand(command, args, options = {}) {
  if (command !== "git") {
    return Promise.reject(new Error("GitHub verifier command was rejected."));
  }
  return runCommand(command, args, {
    cwd: options.cwd,
    env: buildProductionChildEnvironment("git")
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
    return Promise.reject(new Error("Production command requires an explicit child environment."));
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
    stagingRoot: undefined
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
  const record = await deployProduction(args);

  if (args.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (record.dryRun) {
    console.log("Vercel Production offline source plan generated; build and network gates were not run");
    console.log(`Candidate SHA: ${record.candidateSha}`);
    console.log(`Files: ${record.stagingFileCount}`);
    return;
  }

  console.log("Vercel Production deployment verified");
  console.log(`Candidate SHA: ${record.candidateSha}`);
  console.log(`Deployment ID: ${record.deploymentId}`);
  console.log(`Deployment URL: ${record.deploymentUrl}`);
  console.log(`Read-only smoke passed before promotion and on ${record.productionOrigins.join(", ")}`);
  console.log(`Files: ${record.stagingFileCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Production deployment failed; details redacted.");
    process.exitCode = 1;
  });
}
