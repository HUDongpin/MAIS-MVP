import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildProductionDeploymentRecordRelativePath,
  buildProductionChildEnvironment,
  buildSafeBuildEvidence,
  buildSafeStagingBuildEvidence,
  buildStagingPackageEvidence,
  assertProductionDeploymentExecutionContext,
  classifyProductionRollbackBindings,
  classifyProductionRollbackAction,
  executeRequiredPostPromotionTransaction,
  parseTeacherNoticeProductionSchemaGateEvidence,
  parseVercelInspectEvidence,
  persistRequiredProductionDeploymentRecord,
  runCommand
} from "./deploy-vercel-production.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const sourcePath = path.join(repoRoot, "scripts", "deploy-vercel-production.mjs");

test("production child environments grant only purpose-specific credentials", () => {
  const fixture = {
    PATH: "/fixture/bin",
    CI: "true",
    LANG: "en_US.UTF-8",
    GITHUB_TOKEN: "fixture-github-token-not-real",
    GH_TOKEN: "fixture-gh-token-not-real",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
    POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real",
    AWS_SECRET_ACCESS_KEY: "fixture-aws-secret-not-real",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_REPOSITORY: "HUDongpin/MAIS-MVP",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_ID: "123",
    GITHUB_SHA: "a".repeat(40),
    GITHUB_WORKFLOW_REF:
      "HUDongpin/MAIS-MVP/.github/workflows/production-deploy.yml@refs/heads/main",
    MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "github-actions-serialized-v1",
    MAIS_ALLOW_EXTERNAL_ARTIFACTS: "1",
    MAIS_ALLOW_EXTERNAL_VERCEL_STAGING: "1",
    MAIS_OWNER_APPROVED_PRUNED_STAGING: "1",
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
    DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: "fixture-bypass-not-real",
    VERCEL_AUTOMATION_BYPASS_SECRET: "fixture-automation-bypass-not-real"
  };

  const gitEnv = buildProductionChildEnvironment("git", fixture);
  assert.equal(gitEnv.PATH, fixture.PATH);
  assert.equal(gitEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(gitEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(gitEnv.GIT_CONFIG_COUNT, "2");
  assert.equal(gitEnv.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_0, "false");
  assert.equal(gitEnv.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(gitEnv.GIT_NO_LAZY_FETCH, "1");
  assert.equal(gitEnv.GIT_OPTIONAL_LOCKS, "0");
  assert.equal(gitEnv.GIT_TERMINAL_PROMPT, "0");
  assert.equal(gitEnv.VERCEL_TOKEN, undefined);

  const githubEnv = buildProductionChildEnvironment("github", fixture);
  assert.equal(githubEnv.GITHUB_TOKEN, fixture.GITHUB_TOKEN);
  assert.equal(githubEnv.GH_TOKEN, undefined);
  assert.equal(githubEnv.VERCEL_TOKEN, undefined);
  assert.equal(githubEnv.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM, undefined);

  const vercelEnv = buildProductionChildEnvironment("vercel", fixture);
  assert.equal(vercelEnv.VERCEL_TOKEN, fixture.VERCEL_TOKEN);
  assert.equal(vercelEnv.GITHUB_TOKEN, undefined);
  assert.equal(vercelEnv.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM, undefined);

  const schemaEnv = buildProductionChildEnvironment("schema", fixture);
  assert.equal(schemaEnv.VERCEL_TOKEN, fixture.VERCEL_TOKEN);
  assert.equal(
    schemaEnv.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM,
    fixture.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM
  );
  assert.equal(schemaEnv.MAIS_PRODUCTION_SCHEMA_ENV_SOURCE, "vercel-api-pull-v1");
  for (const key of [
    "CI",
    "GITHUB_ACTIONS",
    "GITHUB_EVENT_NAME",
    "GITHUB_REF",
    "GITHUB_REF_PROTECTED",
    "GITHUB_REPOSITORY",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_RUN_ID",
    "GITHUB_SHA",
    "GITHUB_WORKFLOW_REF",
    "MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT"
  ]) {
    assert.equal(schemaEnv[key], fixture[key], key);
  }
  assert.equal(schemaEnv.GITHUB_TOKEN, undefined);

  const smokeEnv = buildProductionChildEnvironment("smoke", fixture);
  assert.equal(
    smokeEnv.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET,
    fixture.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
  );
  assert.equal(
    smokeEnv.VERCEL_AUTOMATION_BYPASS_SECRET,
    fixture.VERCEL_AUTOMATION_BYPASS_SECRET
  );
  assert.equal(smokeEnv.GITHUB_TOKEN, undefined);
  assert.equal(smokeEnv.VERCEL_TOKEN, undefined);

  const preflightEnv = buildProductionChildEnvironment("preflight", fixture);
  assert.equal(preflightEnv.VERCEL_TOKEN, fixture.VERCEL_TOKEN);
  assert.equal(preflightEnv.GITHUB_ACTIONS, "true");
  assert.equal(preflightEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(preflightEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(preflightEnv.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(preflightEnv.GIT_CONFIG_VALUE_0, "false");
  assert.equal(preflightEnv.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(preflightEnv.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(preflightEnv.GITHUB_TOKEN, undefined);
  assert.equal(preflightEnv.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM, undefined);
  assert.equal(preflightEnv.MAIS_ALLOW_EXTERNAL_ARTIFACTS, undefined);
  assert.equal(preflightEnv.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING, undefined);
  assert.equal(preflightEnv.MAIS_OWNER_APPROVED_PRUNED_STAGING, undefined);
  assert.equal(preflightEnv.PLAYWRIGHT_SKIP_WEBSERVER, undefined);

  for (const scoped of [gitEnv, githubEnv, vercelEnv, schemaEnv, smokeEnv, preflightEnv]) {
    assert.equal(scoped.POSTGRES_URL, undefined);
    assert.equal(scoped.RESEND_API_KEY, undefined);
    assert.equal(scoped.AWS_SECRET_ACCESS_KEY, undefined);
    assert.equal(scoped.GH_TOKEN, undefined);
  }
});

test("production runCommand uses the supplied child environment instead of inheriting", async () => {
  const result = await runCommand(
    process.execPath,
    [
      "-e",
      "process.stdout.write(JSON.stringify({allowed:process.env.MAIS_TEST_ALLOWED,home:process.env.HOME??null}))"
    ],
    {
      cwd: repoRoot,
      env: { MAIS_TEST_ALLOWED: "fixture-allowed" }
    }
  );

  assert.equal(result.exitCode, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    allowed: "fixture-allowed",
    home: null
  });
  await assert.rejects(
    runCommand(process.execPath, ["-e", ""], { cwd: repoRoot }),
    /explicit child environment/u
  );
});

test("required production record has a stable run-owned safe path and write failure rolls back", async () => {
  const candidateSha = "a".repeat(40);
  const productionExecutionContext = {
    environment: "production",
    runAttempt: 2,
    runId: "123456789",
    serialized: true
  };
  const expectedPath =
    `.tmp/vercel-production-evidence/run-123456789-attempt-2-${candidateSha}.json`;
  assert.equal(
    buildProductionDeploymentRecordRelativePath({
      candidateSha,
      productionExecutionContext
    }),
    expectedPath
  );

  let writtenPath;
  let writtenPayload;
  let writeOptions;
  const persisted = await persistRequiredProductionDeploymentRecord({
    record: {
      candidateSha,
      deploymentId: "dpl_FixtureProductionRecord123",
      productionExecutionContext
    },
    staging: { stagingDir: "/private/fixture-staging" },
    operations: {
      makeDirectory: async () => {},
      writeFile: async (target, payload, options) => {
        writtenPath = target;
        writtenPayload = payload;
        writeOptions = options;
      }
    }
  });
  assert.deepEqual(persisted.deploymentRecord, {
    path: expectedPath,
    persisted: true,
    schemaVersion: 1
  });
  assert.equal(path.relative(repoRoot, writtenPath), expectedPath);
  assert.equal(writeOptions.flag, "wx");
  assert.equal(JSON.parse(writtenPayload).deploymentRecord.path, expectedPath);
  assert.doesNotMatch(writtenPayload, /fixture-github-token|fixture-vercel-token|fixture-confirmation/u);
  assert.doesNotMatch(writtenPayload, new RegExp(repoRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));

  let rollbackCount = 0;
  await assert.rejects(
    executeRequiredPostPromotionTransaction({
      execute: () =>
        persistRequiredProductionDeploymentRecord({
          record: {
            candidateSha,
            deploymentId: "dpl_FixtureProductionRecord123",
            productionExecutionContext
          },
          staging: { stagingDir: "/private/fixture-staging" },
          operations: {
            makeDirectory: async () => {},
            writeFile: async () => {
              throw new Error("synthetic evidence write failure");
            }
          }
        }),
      rollback: async () => {
        rollbackCount += 1;
      }
    }),
    /previous deployment was restored/u
  );
  assert.equal(rollbackCount, 1);
});

test("real production deploys require the serialized protected-main GitHub workflow", () => {
  const candidateSha = "a".repeat(40);
  const base = {
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REF_PROTECTED: "true",
    GITHUB_REPOSITORY: "HUDongpin/MAIS-MVP",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_ID: "123456789",
    GITHUB_SHA: candidateSha,
    GITHUB_WORKFLOW_REF: "HUDongpin/MAIS-MVP/.github/workflows/production-deploy.yml@refs/heads/main",
    MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "github-actions-serialized-v1"
  };
  assert.deepEqual(
    assertProductionDeploymentExecutionContext({ candidateSha, env: base }),
    {
      environment: "production",
      event: "workflow_dispatch",
      repository: "HUDongpin/MAIS-MVP",
      runAttempt: 1,
      runId: "123456789",
      serialized: true,
      workflow: ".github/workflows/production-deploy.yml"
    }
  );
  for (const changed of [
    { GITHUB_ACTIONS: "false" },
    { GITHUB_EVENT_NAME: "push" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_REF_PROTECTED: "false" },
    { GITHUB_REPOSITORY: "attacker/fork" },
    { GITHUB_SHA: "b".repeat(40) },
    { GITHUB_WORKFLOW_REF: "HUDongpin/MAIS-MVP/.github/workflows/other.yml@refs/heads/main" },
    { MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "local" }
  ]) {
    assert.throws(
      () => assertProductionDeploymentExecutionContext({
        candidateSha,
        env: { ...base, ...changed }
      }),
      /serialized protected-main GitHub workflow/u
    );
  }
});

test("production schema gate evidence is exact, target-bound, and strips confirmation authority", () => {
  const candidateSha = "a".repeat(40);
  const expectedTreeSha = "b".repeat(40);
  const targetFingerprint = "c".repeat(64);
  const exactPostflight = {
    schemaVersion: 3,
    candidateSha,
    expectedTreeSha,
    projectId: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
    projectName: "mais-mvp",
    teamId: "team_i9xhhYXUeYBOCLcfWBjTqlYG",
    teamSlug: "peter-dongpin-hu-s-projects",
    targetFingerprint,
    postgresMajor: 16,
    outboxState: "exact",
    webhookState: "exact",
    heartbeatState: "exact",
    operations: [],
    statistics: { tableBytes: "4096", indexBytes: "2048", rowEstimate: "8" },
    preflightDigest: "d".repeat(64),
    requiredConfirmation:
      `confirm:teacher-notice-production-schema:v3:${candidateSha}:must-not-be-recorded`
  };
  const applyPayload = {
    candidateSha,
    expectedTreeSha,
    operations: [
      "outbox-install-v2",
      "webhook-install-v3",
      "heartbeat-install-v2"
    ],
    preflightDigest: "e".repeat(64),
    projectId: "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1",
    teamId: "team_i9xhhYXUeYBOCLcfWBjTqlYG",
    targetFingerprint,
    postflight: exactPostflight,
    sameConnectionPostflight: {
      ...exactPostflight,
      statistics: { tableBytes: "8192", indexBytes: "4096", rowEstimate: "7" },
      preflightDigest: "f".repeat(64)
    },
    mode: "apply",
    mutation: true,
    network: true,
    ok: true
  };
  const applied = parseTeacherNoticeProductionSchemaGateEvidence(
    JSON.stringify(applyPayload),
    { candidateSha, expectedTreeSha, mode: "apply" }
  );
  assert.deepEqual(applied.operations, applyPayload.operations);
  assert.equal(applied.targetFingerprint, targetFingerprint);
  assert.equal(applied.postflight.outboxState, "exact");
  assert.equal(applied.postflight.webhookState, "exact");
  assert.equal(applied.sameConnectionPostflight.statistics.rowEstimate, "7");
  assert.equal(applied.postflight.statistics.rowEstimate, "8");
  assert.doesNotMatch(JSON.stringify(applied), /requiredConfirmation|must-not-be-recorded/u);

  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({
        ...applyPayload,
        sameConnectionPostflight: undefined,
        sameConnectionPostflightDigest: exactPostflight.preflightDigest
      }),
      { candidateSha, expectedTreeSha, mode: "apply" }
    ),
    /schema gate evidence/u
  );

  const preflightPayload = {
    ...exactPostflight,
    mode: "preflight",
    mutation: false,
    network: true,
    ok: true
  };
  const preflight = parseTeacherNoticeProductionSchemaGateEvidence(
    JSON.stringify(preflightPayload),
    { candidateSha, expectedTreeSha, mode: "preflight", targetFingerprint }
  );
  assert.equal(preflight.webhookState, "exact");
  assert.equal(preflight.outboxState, "exact");
  assert.deepEqual(preflight.operations, []);
  assert.doesNotMatch(JSON.stringify(preflight), /requiredConfirmation/u);
  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({ ...preflightPayload, targetFingerprint: "f".repeat(64) }),
      { candidateSha, expectedTreeSha, mode: "preflight", targetFingerprint }
    ),
    /schema gate evidence/u
  );

  const migratingHeartbeat = parseTeacherNoticeProductionSchemaGateEvidence(
    JSON.stringify({
      ...exactPostflight,
      heartbeatState: "v1",
      operations: ["heartbeat-v1-to-v2"],
      mode: "preflight",
      mutation: false,
      network: true,
      ok: true
    }),
    { candidateSha, expectedTreeSha, mode: "preflight" }
  );
  assert.equal(migratingHeartbeat.heartbeatState, "v1");
  assert.deepEqual(migratingHeartbeat.operations, ["heartbeat-v1-to-v2"]);

  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({
        ...preflightPayload,
        heartbeatState: "partial",
        operations: []
      }),
      { candidateSha, expectedTreeSha, mode: "preflight" }
    ),
    /schema gate evidence/u
  );
  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({
        ...preflightPayload,
        heartbeatState: "v1",
        operations: []
      }),
      { candidateSha, expectedTreeSha, mode: "preflight" }
    ),
    /schema gate evidence/u
  );
  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({
        ...preflightPayload,
        schemaVersion: 2,
        requiredConfirmation:
          `confirm:teacher-notice-production-schema:v2:${candidateSha}:legacy`
      }),
      { candidateSha, expectedTreeSha, mode: "preflight" }
    ),
    /schema gate evidence/u
  );
  assert.throws(
    () => parseTeacherNoticeProductionSchemaGateEvidence(
      JSON.stringify({ ...preflightPayload, outboxState: undefined }),
      { candidateSha, expectedTreeSha, mode: "preflight" }
    ),
    /schema gate evidence/u
  );
});

test("production deploy proves one clean candidate, smokes before promotion, then checks both fixed domains", async () => {
  const source = await readFile(sourcePath, "utf8");
  const candidateIndex = source.indexOf("const candidateSha = await readCleanCandidateSha({");
  const preflightIndex = source.indexOf("await runPreflight();", candidateIndex);
  const localBuildGateIndex = source.indexOf("localBuildGate = await runReleaseBuildGate", preflightIndex);
  const stagingIndex = source.indexOf("const staging = await prepareVercelStaging", localBuildGateIndex);
  const stagingBuildIndex = source.indexOf("await runVercelStagingBuildGate", stagingIndex);
  const finalSourceCheckIndex = source.indexOf("await assertFinalStagingSource(candidateSha, staging);", stagingIndex);
  const stagingEvidenceIndex = source.indexOf("const stagingPackage = buildStagingPackageEvidence(staging, candidateSha);", finalSourceCheckIndex);
  const dryRunIndex = source.indexOf("if (options.dryRun)", stagingEvidenceIndex);
  const preDeployGithubIndex = source.indexOf("const preDeployGithubEvidence = await verifyGithubCandidateChecks", dryRunIndex);
  const previousDeploymentIndex = source.indexOf(
    "const previousProductionDeployment = await readCurrentVercelProductionDeployment({",
    dryRunIndex
  );
  const schemaApplyIndex = source.indexOf("const productionSchemaApplyEvidence = await runTeacherNoticeProductionSchemaGate", previousDeploymentIndex);
  const deployArgsIndex = source.indexOf("const deployArgs = [", dryRunIndex);
  const sealIndex = source.indexOf("await sealPreparedVercelStaging(staging);", deployArgsIndex);
  const deployIndex = source.indexOf("deployResult = await runCommand(\"vercel\"", sealIndex);
  const releaseSealIndex = source.indexOf("await releasePreparedVercelStagingSeal(staging);", deployIndex);
  const preDeploySourceCheckIndex = source.lastIndexOf("await assertFinalStagingSource(candidateSha, staging);", deployIndex);
  const preDeployPackageCheckIndex = source.lastIndexOf("await verifyPreparedVercelStaging(staging);", deployIndex);
  const inspectIndex = source.indexOf("[\"inspect\", deploymentUrl", deployIndex);
  const prePromotionProviderIndex = source.indexOf("const prePromotionProviderEvidence = await verifyVercelProviderDeployment", inspectIndex);
  const deploymentSmokeIndex = source.indexOf("const deploymentReadOnlySmoke = await runDeploymentReadOnlySmoke(", inspectIndex);
  const prePromotionAliasIndex = source.indexOf(
    "const prePromotionAliasBindings = await readVercelProductionAliasBindings({",
    deploymentSmokeIndex
  );
  const schemaReattestIndex = source.indexOf("const prePromotionSchemaEvidence = await runTeacherNoticeProductionSchemaGate", prePromotionAliasIndex);
  const unexpectedAliasRollbackIndex = source.indexOf("await restorePreviousProductionDeployment({", prePromotionAliasIndex);
  const prePromotionGithubIndex = source.indexOf("const prePromotionGithubEvidence = await verifyGithubCandidateChecks", prePromotionAliasIndex);
  const finalPrePromotionAliasIndex = source.indexOf(
    "const finalPrePromotionAliasBindings = await readVercelProductionAliasBindings({",
    prePromotionGithubIndex
  );
  const finalPrePromotionAliasAssertionIndex = source.indexOf(
    "assertProductionAliasBindingsMatchDeployment(",
    finalPrePromotionAliasIndex
  );
  const finalPrePromotionAliasRestoreIndex = source.indexOf(
    "await restorePreviousProductionDeployment({",
    finalPrePromotionAliasAssertionIndex
  );
  const promoteIndex = source.indexOf("[\"promote\", deploymentUrl", deploymentSmokeIndex);
  const promotedProviderIndex = source.indexOf("promotedProviderEvidence = await verifyVercelProviderDeployment", promoteIndex);
  const domainSmokeIndex = source.indexOf("productionReadOnlySmokes = []", promoteIndex);
  const domainLoopIndex = source.indexOf("for (const productionOrigin of PRODUCTION_READ_ONLY_ORIGINS)", domainSmokeIndex);
  const persistenceIndex = source.indexOf("return persistRequiredProductionDeploymentRecord({", domainLoopIndex);
  const rollbackIndex = source.indexOf("rollback: () =>", persistenceIndex);
  const recordIndex = source.indexOf("productionReadOnlySmokes,", domainLoopIndex);

  assert.notEqual(candidateIndex, -1, "Production deploy should derive the candidate from clean HEAD.");
  assert.notEqual(
    preflightIndex,
    -1,
    "Production deploy should run its serialized-workflow staged-publish preflight."
  );
  assert.notEqual(localBuildGateIndex, -1, "Production deploy should run an isolated build gate.");
  assert.notEqual(stagingIndex, -1, "Production deploy should prepare pruned staging.");
  assert.ok(stagingBuildIndex > stagingIndex && stagingBuildIndex < finalSourceCheckIndex);
  assert.notEqual(finalSourceCheckIndex, -1, "Production deploy should recheck final HEAD and tree after staging.");
  assert.notEqual(stagingEvidenceIndex, -1, "Production deploy should bind staging manifest evidence.");
  assert.notEqual(dryRunIndex, -1, "Production deploy should have a no-network dry-run return.");
  assert.notEqual(deployArgsIndex, -1);
  assert.notEqual(deployIndex, -1);
  assert.ok(preDeploySourceCheckIndex > deployArgsIndex && preDeploySourceCheckIndex < deployIndex);
  assert.ok(preDeployPackageCheckIndex > preDeploySourceCheckIndex && preDeployPackageCheckIndex < sealIndex);
  assert.ok(sealIndex < deployIndex && deployIndex < releaseSealIndex);
  assert.notEqual(inspectIndex, -1);
  assert.notEqual(deploymentSmokeIndex, -1, "Deployment URL should pass read-only smoke before promotion.");
  assert.notEqual(previousDeploymentIndex, -1, "Production deploy should capture the exact prior alias deployment.");
  assert.notEqual(schemaApplyIndex, -1, "Production schema apply must finish before the first Vercel write.");
  assert.notEqual(preDeployGithubIndex, -1, "Production deploy should verify current-main exact-SHA checks before any provider write.");
  assert.notEqual(prePromotionAliasIndex, -1, "Production deploy should recheck aliases immediately before promotion.");
  assert.notEqual(schemaReattestIndex, -1, "Production schema must be re-attested immediately before promotion.");
  assert.ok(
    unexpectedAliasRollbackIndex > prePromotionAliasIndex && unexpectedAliasRollbackIndex < promoteIndex,
    "An unexpected alias mutation caused by deploy must restore the captured prior deployment."
  );
  assert.notEqual(prePromotionGithubIndex, -1, "Production deploy should recheck current-main exact-SHA checks before promotion.");
  assert.notEqual(
    finalPrePromotionAliasIndex,
    -1,
    "Production deploy should reread the live aliases after all slow re-attestation work."
  );
  assert.notEqual(
    finalPrePromotionAliasAssertionIndex,
    -1,
    "The final pre-promotion alias read must still match the originally captured deployment."
  );
  assert.match(
    source.slice(finalPrePromotionAliasAssertionIndex, finalPrePromotionAliasRestoreIndex),
    /finalPrePromotionAliasBindings,[\s\S]*previousProductionDeployment/u
  );
  assert.ok(
    finalPrePromotionAliasRestoreIndex > finalPrePromotionAliasAssertionIndex &&
      finalPrePromotionAliasRestoreIndex < promoteIndex,
    "A candidate or split alias mutation at the final check must enter the guarded restore path."
  );
  assert.notEqual(promoteIndex, -1);
  assert.notEqual(domainSmokeIndex, -1);
  assert.notEqual(domainLoopIndex, -1, "Both fixed production domains should be smoked after promotion.");
  assert.notEqual(
    persistenceIndex,
    -1,
    "Required deployment evidence must persist inside the post-promotion transaction."
  );
  assert.notEqual(rollbackIndex, -1, "A post-promotion failure should restore and recheck the prior deployment.");
  assert.notEqual(recordIndex, -1);
  assert.ok(candidateIndex < preflightIndex && preflightIndex < localBuildGateIndex);
  assert.ok(localBuildGateIndex < stagingIndex && stagingIndex < finalSourceCheckIndex);
  assert.ok(finalSourceCheckIndex < stagingEvidenceIndex && stagingEvidenceIndex < dryRunIndex);
  assert.ok(dryRunIndex < preDeployGithubIndex && preDeployGithubIndex < previousDeploymentIndex);
  assert.ok(previousDeploymentIndex < schemaApplyIndex && schemaApplyIndex < deployArgsIndex);
  assert.ok(deployArgsIndex < deployIndex);
  assert.ok(releaseSealIndex < inspectIndex && inspectIndex < prePromotionProviderIndex);
  assert.ok(prePromotionProviderIndex < deploymentSmokeIndex && deploymentSmokeIndex < prePromotionAliasIndex);
  assert.ok(prePromotionAliasIndex < schemaReattestIndex && schemaReattestIndex < prePromotionGithubIndex);
  assert.ok(prePromotionGithubIndex < finalPrePromotionAliasIndex);
  assert.ok(finalPrePromotionAliasIndex < finalPrePromotionAliasAssertionIndex);
  assert.ok(finalPrePromotionAliasAssertionIndex < promoteIndex);
  assert.ok(promoteIndex < promotedProviderIndex);
  assert.ok(
    promotedProviderIndex < domainLoopIndex &&
      domainLoopIndex < persistenceIndex &&
      persistenceIndex < recordIndex &&
      recordIndex < rollbackIndex
  );

  assert.match(source, /const PRODUCTION_READ_ONLY_ORIGINS = Object\.freeze\(\[\s*"https:\/\/www\.mais\.ac",\s*"https:\/\/www\.mais\.hk"\s*\]\);/u);
  assert.match(source.slice(deployArgsIndex, deployIndex), /"--skip-domain"/u);
  assert.match(source.slice(deployArgsIndex, deployIndex), /"--meta",\s*`maisCandidateSha=\$\{candidateSha\}`/u);
  assert.match(source.slice(deployArgsIndex, deployIndex), /"--env",\s*`MAIS_RELEASE_SHA=\$\{candidateSha\}`/u);
  assert.doesNotMatch(source.slice(deployArgsIndex, deployIndex), /githubCommitSha/u);

  const dryRunBlock = source.slice(dryRunIndex, deployArgsIndex);
  assert.match(dryRunBlock, /candidateSha/u);
  assert.match(dryRunBlock, /productionOrigins: \[\.\.\.PRODUCTION_READ_ONLY_ORIGINS\]/u);
  assert.match(dryRunBlock, /deployed: false/u);
  assert.match(dryRunBlock, /dryRunScope: "offline-source-plan-only"/u);
  assert.match(dryRunBlock, /providerGitShaVerified: false/u);
  assert.match(dryRunBlock, /stagingPackage/u);
  assert.match(dryRunBlock, /buildEvidence/u);
  assert.match(dryRunBlock, /stagingBuildEvidence/u);
  assert.match(source, /reason: "offline-source-plan-only"/u);
  assert.doesNotMatch(dryRunBlock, /stagingDir|localBuildGate/u);
  assert.doesNotMatch(dryRunBlock, /runDeploymentReadOnlySmoke|runCommand\("vercel"/u);
  assert.match(source.slice(candidateIndex, localBuildGateIndex), /if \(!options\.dryRun\)/u);
  assert.match(
    source,
    /\["scripts\/release-env-guard\.mjs", "production-workflow-staged-publish"\]/u
  );
  const schemaRunner = source.slice(
    source.indexOf("async function runTeacherNoticeProductionSchemaGate"),
    source.indexOf("export function assertProductionDeploymentExecutionContext")
  );
  assert.match(schemaRunner, /runCommand\(\s*process\.execPath/u);
  assert.doesNotMatch(schemaRunner, /node_modules["'],\s*["']\.bin/u);
  assert.doesNotMatch(schemaRunner, /["']--vercel-env-run["']/u);
  assert.doesNotMatch(
    source,
    /\["scripts\/release-env-guard\.mjs", "staged-publish"\]/u
  );
  assert.match(
    source.slice(preDeployGithubIndex, previousDeploymentIndex),
    /env: buildProductionChildEnvironment\("github"\)[\s\S]*runCommand: runGithubVerifierCommand/u
  );
  assert.match(
    source.slice(prePromotionGithubIndex, promoteIndex),
    /env: buildProductionChildEnvironment\("github"\)[\s\S]*runCommand: runGithubVerifierCommand/u
  );
  assert.match(
    source.slice(finalPrePromotionAliasIndex, promoteIndex),
    /env: buildProductionChildEnvironment\("vercel"\)/u
  );
  assert.match(
    source,
    /function runGithubVerifierCommand[\s\S]*if \(command !== "git"\)[\s\S]*buildProductionChildEnvironment\("git"\)/u
  );

  const cliArgumentParser = source.slice(
    source.indexOf("function parseArgs(argv)"),
    source.indexOf("async function main()")
  );
  assert.doesNotMatch(cliArgumentParser, /candidate-sha|MAIS_CANDIDATE_SHA/u);
  assert.doesNotMatch(source, /candidateSha:\s*options/u);
  assert.doesNotMatch(source, /production-base-url|MAIS_PRODUCTION_SMOKE_BASE_URL/u);
  assert.doesNotMatch(source, /dashboard-smoke-auth-precheck|dashboard-latency-smoke|dashboard-ui-loading-smoke|ai-tutor-live-latency-smoke/u);
  assert.match(source, /from "\.\/deployment-read-only-smoke\.mjs"/u);
  assert.match(source.slice(inspectIndex, deploymentSmokeIndex), /"--format=json"/u);
  assert.match(source.slice(inspectIndex, deploymentSmokeIndex), /parseVercelInspectEvidence/u);
  assert.match(source.slice(inspectIndex, deploymentSmokeIndex), /verifyVercelProviderDeployment/u);
  assert.match(
    source.slice(deploymentSmokeIndex, promoteIndex),
    /approvedVercelDeploymentHost:\s*new URL\(prePromotionProviderEvidence\.deploymentUrl\)\.hostname/u,
    "The smoke may send credentials only to the provider-verified immutable deployment host."
  );
  assert.match(source.slice(promoteIndex, domainSmokeIndex), /requireProductionAliases: true/u);
  assert.match(source.slice(rollbackIndex), /previousProductionDeployment/u);
  assert.match(source, /APPROVED_VERCEL_PROJECT_NAME/u);
  assert.match(source, /APPROVED_VERCEL_TEAM_(?:ID|SLUG)/u);
  assert.match(source, /deploymentId: deploymentEvidence\.deploymentId/u);
  assert.match(source, /stagingPackage,/u);
  assert.doesNotMatch(source, /localBuildGate,|stagingDir: staging\.stagingDir/u);
  assert.doesNotMatch(source, /record\.stagingDir/u);
  assert.doesNotMatch(source, /path\.join\(staging\.stagingDir,\s*"vercel-production-deployment\.json"/u);
  assert.match(source, /\.tmp["']?,[\s\S]*vercel-production-evidence/u);
  assert.match(source, /deploymentRecord:\s*\{[\s\S]*path: relativePath,[\s\S]*persisted: true/u);
  assert.match(source, /finalPrePromotionAliasBindings,[\s\S]*preDeployGithubEvidence,[\s\S]*prePromotionGithubEvidence,[\s\S]*prePromotionSchemaEvidence,[\s\S]*productionSchemaApplyEvidence,[\s\S]*providerGitShaVerified: true/u);
});

test("production staging evidence rejects absolute manifests and strips build paths and arbitrary fields", () => {
  const candidateSha = "1".repeat(40);
  const staging = {
    candidateSha,
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    },
    fileCount: 8,
    gitSourceVerified: true,
    manifestPath: "vercel-staging-manifest.json",
    manifestRawSha1: "2".repeat(40),
    manifestSha256: "3".repeat(64),
    objectFormat: "sha1",
    sourceManifestRoot: "4".repeat(64),
    sourceTreeObject: "5".repeat(40),
    stagingDir: "/Volumes/private/staging",
    totalBytes: 99,
    trackedEntryCount: 9,
    token: "fixture-secret"
  };
  const evidence = buildStagingPackageEvidence(staging, candidateSha);
  assert.equal(evidence.manifest.path, "vercel-staging-manifest.json");
  assert.equal(evidence.sourceTreeObject, staging.sourceTreeObject);
  assert.doesNotMatch(JSON.stringify(evidence), /Volumes|fixture-secret|providerGit/u);
  assert.throws(
    () => buildStagingPackageEvidence({ ...staging, sourceManifestRoot: "bad" }, candidateSha),
    /staging package evidence/u
  );

  const build = buildSafeBuildEvidence({
    cleanup: false,
    completedAt: "2026-08-24T12:01:00.000Z",
    outputChecks: [{ path: "server/app/dashboard/page.js", present: true }],
    privatePath: "/Volumes/private/build",
    startedAt: "2026-08-24T12:00:00.000Z"
  });
  assert.equal(build.cleanup, false);
  assert.doesNotMatch(JSON.stringify(build), /Volumes|privatePath/u);

  const stagingBuild = buildSafeStagingBuildEvidence({
    candidateSha,
    cleanup: true,
    completedAt: "2026-08-24T12:03:00.000Z",
    outputChecks: [{ path: "server/app/parent/page.js", present: true }],
    sourceKind: "verified-private-staging-copy",
    startedAt: "2026-08-24T12:02:00.000Z",
    privatePath: "/Volumes/private/staging-build"
  }, candidateSha);
  assert.equal(stagingBuild.sourceKind, "verified-private-staging-copy");
  assert.doesNotMatch(JSON.stringify(stagingBuild), /Volumes|privatePath/u);
});

test("production inspect JSON binds immutable provider fields while marking Git SHA unverified", () => {
  const candidateSha = "c".repeat(40);
  const deploymentUrl = "https://candidate-production.vercel.app";
  const payload = {
    id: "dpl_ProductionFixture123",
    url: "candidate-production.vercel.app",
    readyState: "READY",
    target: "production",
    meta: { maisCandidateSha: candidateSha }
  };
  const evidence = parseVercelInspectEvidence(JSON.stringify(payload), {
      candidateSha,
      deploymentUrl,
      target: "production"
    });
  assert.equal(evidence.deploymentId, payload.id);
  assert.equal(evidence.providerGitShaVerified, false);

  for (const changed of [
    { readyState: "BUILDING" },
    { target: "preview" },
    { url: "older.vercel.app" },
    { meta: { maisCandidateSha: "d".repeat(40) } },
    { meta: {} }
  ]) {
    assert.throws(
      () => parseVercelInspectEvidence(JSON.stringify({ ...payload, ...changed }), {
        candidateSha,
        deploymentUrl,
        target: "production"
      }),
      /inspect evidence failed/u
    );
  }
});

test("production rollback restores only this candidate and never overwrites unrelated alias drift", () => {
  const candidateDeploymentId = "dpl_CandidateRollbackFixture123";
  const previousDeploymentId = "dpl_PreviousRollbackFixture123";
  assert.equal(classifyProductionRollbackAction({
    candidateDeploymentId,
    currentDeploymentId: candidateDeploymentId,
    previousDeploymentId
  }), "restore-previous");
  assert.equal(classifyProductionRollbackAction({
    candidateDeploymentId,
    currentDeploymentId: previousDeploymentId,
    previousDeploymentId
  }), "already-restored");
  assert.throws(() => classifyProductionRollbackAction({
    candidateDeploymentId,
    currentDeploymentId: "dpl_UnrelatedConcurrentFixture123",
    previousDeploymentId
  }), /outside this deployment/i);

  const previousBindings = [
    { origin: "https://www.mais.ac", deploymentId: previousDeploymentId },
    { origin: "https://www.mais.hk", deploymentId: previousDeploymentId }
  ];
  assert.equal(classifyProductionRollbackBindings({
    candidateDeploymentId,
    currentBindings: [
      { origin: "https://www.mais.ac", deploymentId: candidateDeploymentId },
      { origin: "https://www.mais.hk", deploymentId: candidateDeploymentId }
    ],
    previousBindings
  }), "restore-previous");
  assert.equal(classifyProductionRollbackBindings({
    candidateDeploymentId,
    currentBindings: [
      { origin: "https://www.mais.ac", deploymentId: candidateDeploymentId },
      { origin: "https://www.mais.hk", deploymentId: previousDeploymentId }
    ],
    previousBindings
  }), "restore-previous");
  assert.equal(classifyProductionRollbackBindings({
    candidateDeploymentId,
    currentBindings: previousBindings,
    previousBindings
  }), "already-restored");
  assert.throws(() => classifyProductionRollbackBindings({
    candidateDeploymentId,
    currentBindings: [
      { origin: "https://www.mais.ac", deploymentId: candidateDeploymentId },
      { origin: "https://www.mais.hk", deploymentId: "dpl_UnrelatedConcurrentFixture123" }
    ],
    previousBindings
  }), /outside this deployment/i);
});
