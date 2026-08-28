import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildPreviewChildEnvironment,
  buildSafeBuildEvidence,
  buildSafeStagingBuildEvidence,
  buildStagingPackageEvidence,
  parseVercelInspectEvidence,
  runCommand
} from "./deploy-vercel-preview.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const sourcePath = path.join(repoRoot, "scripts", "deploy-vercel-preview.mjs");

test("preview child environments grant only purpose-specific configuration", () => {
  const fixture = {
    PATH: "/fixture/bin",
    CI: "true",
    LANG: "en_US.UTF-8",
    VERCEL_TOKEN: "fixture-vercel-token-not-real",
    GITHUB_TOKEN: "fixture-github-token-not-real",
    GH_TOKEN: "fixture-gh-token-not-real",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM: "fixture-confirmation-not-real",
    POSTGRES_URL: "postgres://fixture:not-real@example.invalid/db",
    RESEND_API_KEY: "fixture-resend-key-not-real",
    AWS_SECRET_ACCESS_KEY: "fixture-aws-secret-not-real",
    DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: "fixture-bypass-not-real",
    VERCEL_AUTOMATION_BYPASS_SECRET: "fixture-automation-bypass-not-real",
    MAIS_RELEASE_SOURCE_ROOT: "/fixture/source",
    MAIS_RELEASE_SOURCE_KIND: "clean-worktree",
    VERCEL_STAGING_ROOT: ".tmp/vercel-staging"
  };

  const gitEnv = buildPreviewChildEnvironment("git", fixture);
  assert.equal(gitEnv.PATH, fixture.PATH);
  assert.equal(gitEnv.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(gitEnv.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(gitEnv.GIT_CONFIG_KEY_0, "core.fsmonitor");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_0, "false");
  assert.equal(gitEnv.GIT_CONFIG_KEY_1, "core.hooksPath");
  assert.equal(gitEnv.GIT_CONFIG_VALUE_1, "/dev/null");
  assert.equal(gitEnv.VERCEL_TOKEN, undefined);

  const preflightEnv = buildPreviewChildEnvironment("preflight", fixture);
  assert.equal(preflightEnv.MAIS_RELEASE_SOURCE_ROOT, fixture.MAIS_RELEASE_SOURCE_ROOT);
  assert.equal(preflightEnv.MAIS_RELEASE_SOURCE_KIND, fixture.MAIS_RELEASE_SOURCE_KIND);
  assert.equal(preflightEnv.VERCEL_STAGING_ROOT, fixture.VERCEL_STAGING_ROOT);
  assert.equal(preflightEnv.VERCEL_TOKEN, undefined);

  const vercelEnv = buildPreviewChildEnvironment("vercel", fixture);
  assert.equal(vercelEnv.VERCEL_TOKEN, fixture.VERCEL_TOKEN);
  assert.equal(vercelEnv.GITHUB_TOKEN, undefined);

  const smokeEnv = buildPreviewChildEnvironment("smoke", fixture);
  assert.equal(
    smokeEnv.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET,
    fixture.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
  );
  assert.equal(
    smokeEnv.VERCEL_AUTOMATION_BYPASS_SECRET,
    fixture.VERCEL_AUTOMATION_BYPASS_SECRET
  );
  assert.equal(smokeEnv.VERCEL_TOKEN, undefined);

  for (const scoped of [gitEnv, preflightEnv, vercelEnv, smokeEnv]) {
    assert.equal(scoped.GITHUB_TOKEN, undefined);
    assert.equal(scoped.GH_TOKEN, undefined);
    assert.equal(scoped.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM, undefined);
    assert.equal(scoped.POSTGRES_URL, undefined);
    assert.equal(scoped.RESEND_API_KEY, undefined);
    assert.equal(scoped.AWS_SECRET_ACCESS_KEY, undefined);
  }
  assert.throws(
    () => buildPreviewChildEnvironment("unknown", fixture),
    /purpose was rejected/u
  );
});

test("preview runCommand uses the supplied child environment instead of inheriting", async () => {
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

test("preview deploy binds a clean candidate SHA to Vercel metadata and uses only the read-only smoke", async () => {
  const source = await readFile(sourcePath, "utf8");
  const candidateIndex = source.indexOf("const candidateSha = await readCleanCandidateSha({");
  const preflightIndex = source.indexOf("await runPreflight();", candidateIndex);
  const localBuildGateIndex = source.indexOf("localBuildGate = await runReleaseBuildGate", preflightIndex);
  const stagingIndex = source.indexOf("const staging = await prepareVercelStaging", localBuildGateIndex);
  const stagingBuildIndex = source.indexOf("await runVercelStagingBuildGate", stagingIndex);
  const finalSourceCheckIndex = source.indexOf("await assertFinalStagingSource(candidateSha, staging);", stagingIndex);
  const stagingEvidenceIndex = source.indexOf("const stagingPackage = buildStagingPackageEvidence(staging, candidateSha);", finalSourceCheckIndex);
  const dryRunIndex = source.indexOf("if (options.dryRun)", stagingEvidenceIndex);
  const deployArgsIndex = source.indexOf("const deployArgs = [", dryRunIndex);
  const sealIndex = source.indexOf("await sealPreparedVercelStaging(staging);", deployArgsIndex);
  const deployIndex = source.indexOf("deployResult = await runCommand(\"vercel\"", sealIndex);
  const releaseSealIndex = source.indexOf("await releasePreparedVercelStagingSeal(staging);", deployIndex);
  const preDeploySourceCheckIndex = source.lastIndexOf("await assertFinalStagingSource(candidateSha, staging);", deployIndex);
  const preDeployPackageCheckIndex = source.lastIndexOf("await verifyPreparedVercelStaging(staging);", deployIndex);
  const inspectIndex = source.indexOf("[\"inspect\", deploymentUrl", deployIndex);
  const providerEvidenceIndex = source.indexOf("const providerEvidence = await verifyVercelProviderDeployment", inspectIndex);
  const smokeIndex = source.indexOf("const deploymentReadOnlySmoke = await runDeploymentReadOnlySmoke(", inspectIndex);
  const recordIndex = source.indexOf("deploymentReadOnlySmoke,", smokeIndex);

  assert.notEqual(candidateIndex, -1, "Preview deploy should derive the candidate from its clean Git HEAD.");
  assert.match(
    source.slice(candidateIndex, preflightIndex),
    /cwd: REPO_ROOT,[\s\S]*runCommand: runPreviewGitCommand/u
  );
  assert.notEqual(preflightIndex, -1, "Preview deploy should run release preflight.");
  assert.notEqual(localBuildGateIndex, -1, "Preview deploy should run an isolated release build gate.");
  assert.notEqual(stagingIndex, -1, "Preview deploy should prepare pruned staging.");
  assert.ok(stagingBuildIndex > stagingIndex && stagingBuildIndex < finalSourceCheckIndex);
  assert.notEqual(finalSourceCheckIndex, -1, "Preview deploy should recheck final HEAD and tree after staging.");
  assert.notEqual(stagingEvidenceIndex, -1, "Preview deploy should create bounded staging provenance evidence.");
  assert.notEqual(dryRunIndex, -1, "Preview deploy should support dry-run after local planning.");
  assert.notEqual(deployArgsIndex, -1, "Preview deploy should construct Vercel arguments after the source recheck.");
  assert.notEqual(deployIndex, -1, "Preview deploy should create a Vercel deployment.");
  assert.ok(preDeploySourceCheckIndex > deployArgsIndex && preDeploySourceCheckIndex < deployIndex);
  assert.ok(preDeployPackageCheckIndex > preDeploySourceCheckIndex && preDeployPackageCheckIndex < sealIndex);
  assert.ok(sealIndex < deployIndex && deployIndex < releaseSealIndex);
  assert.notEqual(inspectIndex, -1, "Preview deploy should inspect the deployment.");
  assert.notEqual(smokeIndex, -1, "Preview deploy should run the read-only deployment smoke.");
  assert.notEqual(recordIndex, -1, "Preview evidence should record the read-only smoke.");
  assert.ok(candidateIndex < preflightIndex && preflightIndex < localBuildGateIndex);
  assert.ok(localBuildGateIndex < stagingIndex && stagingIndex < finalSourceCheckIndex);
  assert.ok(finalSourceCheckIndex < stagingEvidenceIndex && stagingEvidenceIndex < dryRunIndex);
  assert.ok(dryRunIndex < deployArgsIndex && deployArgsIndex < deployIndex);
  assert.ok(releaseSealIndex < inspectIndex && inspectIndex < providerEvidenceIndex);
  assert.ok(providerEvidenceIndex < smokeIndex && smokeIndex < recordIndex);

  const dryRunBlock = source.slice(dryRunIndex, deployArgsIndex);
  assert.match(dryRunBlock, /candidateSha/u, "Dry-run should report the internally derived candidate SHA.");
  assert.match(dryRunBlock, /deployed: false/u);
  assert.match(dryRunBlock, /providerGitShaVerified: false/u);
  assert.match(dryRunBlock, /stagingPackage/u);
  assert.match(dryRunBlock, /buildEvidence/u);
  assert.match(dryRunBlock, /stagingBuildEvidence/u);
  assert.doesNotMatch(dryRunBlock, /stagingDir|localBuildGate/u);
  assert.doesNotMatch(dryRunBlock, /runDeploymentReadOnlySmoke|runCommand\("vercel"/u);
  assert.match(source.slice(candidateIndex, localBuildGateIndex), /if \(!options\.dryRun\)/u);

  const deployArgsBlock = source.slice(deployArgsIndex, deployIndex);
  assert.match(deployArgsBlock, /"--meta",\s*`maisCandidateSha=\$\{candidateSha\}`/u);
  assert.match(deployArgsBlock, /"--env",\s*`MAIS_RELEASE_SHA=\$\{candidateSha\}`/u);
  assert.doesNotMatch(deployArgsBlock, /githubCommitSha/u);
  assert.doesNotMatch(source, /candidate-sha|candidateSha:\s*options|MAIS_CANDIDATE_SHA/u);

  assert.match(source, /from "\.\/deployment-read-only-smoke\.mjs"/u);
  assert.match(source.slice(inspectIndex, smokeIndex), /"--format=json"/u);
  assert.match(source.slice(inspectIndex, smokeIndex), /parseVercelInspectEvidence/u);
  assert.match(source.slice(inspectIndex, smokeIndex), /verifyVercelProviderDeployment/u);
  assert.match(
    source.slice(smokeIndex, recordIndex),
    /approvedVercelDeploymentHost:\s*new URL\(providerEvidence\.deploymentUrl\)\.hostname/u,
    "The smoke may send credentials only to the provider-verified immutable deployment host."
  );
  assert.match(source, /APPROVED_VERCEL_PROJECT_NAME/u);
  assert.match(source, /APPROVED_VERCEL_TEAM_(?:ID|SLUG)/u);
  assert.match(source, /deploymentId: deploymentEvidence\.deploymentId/u);
  assert.match(source, /stagingPackage,/u);
  assert.doesNotMatch(source, /localBuildGate,|stagingDir: staging\.stagingDir/u);
  assert.doesNotMatch(source, /record\.stagingDir/u);
  assert.doesNotMatch(source, /path\.join\(staging\.stagingDir,\s*"vercel-preview-deployment\.json"/u);
  assert.match(source, /path\.dirname\(staging\.stagingDir\)/u);
  assert.match(source, /deploymentReadOnlySmoke,[\s\S]*providerGitShaVerified: false/u);
  assert.doesNotMatch(source, /dashboard-smoke-auth-precheck|dashboard-latency-smoke|dashboard-ui-loading-smoke|ai-tutor-live-latency-smoke/u);
});

test("preview staging/build evidence is allowlisted, relative, and never claims provider-native Git proof", () => {
  const candidateSha = "a".repeat(40);
  const sourceTreeObject = "b".repeat(40);
  const rawStaging = {
    candidateSha,
    excludedPolicy: {
      dataEase: true,
      localSecretsAndGeneratedOutputs: true,
      publicQuestionIllustrations: true
    },
    fileCount: 42,
    gitSourceVerified: true,
    manifestPath: "vercel-staging-manifest.json",
    manifestRawSha1: "c".repeat(40),
    manifestSha256: "d".repeat(64),
    objectFormat: "sha1",
    secret: "fixture-secret-must-not-survive",
    sourceManifestRoot: "e".repeat(64),
    sourceTreeObject,
    stagingDir: "/private/owner/worktree/.tmp/vercel-staging/run",
    totalBytes: 2048,
    trackedEntryCount: 100
  };
  const stagingPackage = buildStagingPackageEvidence(rawStaging, candidateSha);
  assert.deepEqual(stagingPackage, {
    sourceKind: "clean-head-tracked-regular-blobs",
    gitSourceVerified: true,
    candidateSha,
    sourceTreeObject,
    objectFormat: "sha1",
    trackedEntryCount: 100,
    fileCount: 42,
    totalBytes: 2048,
    sourceManifestAlgorithm: "sha256-canonical-json-lines-v2",
    sourceManifestRoot: "e".repeat(64),
    manifest: {
      schemaVersion: 2,
      path: "vercel-staging-manifest.json",
      rawSha1: "c".repeat(40),
      sha256: "d".repeat(64)
    },
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    }
  });
  assert.doesNotMatch(JSON.stringify(stagingPackage), /private\/owner|fixture-secret|providerGit/u);

  const buildEvidence = buildSafeBuildEvidence({
    cleanup: true,
    completedAt: "2026-08-24T12:00:01.000Z",
    distDir: "/private/owner/build",
    outputChecks: [{ path: "BUILD_ID", present: true }],
    runId: "fixture-secret-must-not-survive",
    startedAt: "2026-08-24T12:00:00.000Z",
    tsconfigPath: "/private/owner/tsconfig.json"
  });
  assert.deepEqual(buildEvidence, {
    cleanup: true,
    completedAt: "2026-08-24T12:00:01.000Z",
    outputChecks: [{ path: "BUILD_ID", present: true }],
    startedAt: "2026-08-24T12:00:00.000Z"
  });
  assert.doesNotMatch(JSON.stringify(buildEvidence), /private\/owner|fixture-secret/u);

  const stagingBuildEvidence = buildSafeStagingBuildEvidence({
    candidateSha,
    cleanup: true,
    completedAt: "2026-08-24T12:02:00.000Z",
    outputChecks: [{ path: "server/app/parent/page.js", present: true }],
    sourceKind: "verified-private-staging-copy",
    startedAt: "2026-08-24T12:01:00.000Z",
    privatePath: "/private/build-copy"
  }, candidateSha);
  assert.equal(stagingBuildEvidence.sourceKind, "verified-private-staging-copy");
  assert.doesNotMatch(JSON.stringify(stagingBuildEvidence), /private\/build-copy/u);

  assert.throws(
    () => buildStagingPackageEvidence({ ...rawStaging, manifestPath: "/private/manifest.json" }, candidateSha),
    /staging package evidence/u
  );
  assert.throws(
    () => buildStagingPackageEvidence({ ...rawStaging, candidateSha: "f".repeat(40) }, candidateSha),
    /staging package evidence/u
  );
});

test("preview inspect JSON returns only exact immutable candidate evidence and redacts failures", () => {
  const candidateSha = "a".repeat(40);
  const deploymentUrl = "https://candidate-preview.vercel.app";
  const payload = {
    id: "dpl_PreviewFixture123",
    url: "candidate-preview.vercel.app",
    readyState: "READY",
    target: "preview",
    meta: { maisCandidateSha: candidateSha }
  };
  assert.deepEqual(
    parseVercelInspectEvidence(JSON.stringify(payload), { candidateSha, deploymentUrl, target: "preview" }),
    {
      candidateSha,
      deploymentId: payload.id,
      deploymentUrl,
      metadataVerified: true,
      providerGitShaVerified: false,
      readyState: "READY",
      target: "preview"
    }
  );

  const privateDiagnostic = "private-cli-output-must-not-leak";
  assert.throws(
    () => parseVercelInspectEvidence(privateDiagnostic, { candidateSha, deploymentUrl, target: "preview" }),
    (error) => {
      assert.match(error.message, /inspect evidence failed/u);
      assert.match(error.message, /details redacted/u);
      assert.doesNotMatch(error.message, new RegExp(privateDiagnostic, "u"));
      return true;
    }
  );
  assert.throws(
    () => parseVercelInspectEvidence(JSON.stringify({ ...payload, id: "dpl_Other" }), {
      candidateSha,
      deploymentUrl,
      target: "production"
    }),
    /inspect evidence failed/u
  );
});

test("preview inspect accepts current CLI metadata omission without claiming metadata proof", () => {
  const candidateSha = "a".repeat(40);
  const deploymentUrl = "https://candidate-preview.vercel.app";
  const evidence = parseVercelInspectEvidence(JSON.stringify({
    id: "dpl_PreviewFixture123",
    url: "candidate-preview.vercel.app",
    readyState: "READY",
    target: "preview"
  }), {
    candidateSha,
    deploymentUrl,
    target: "preview"
  });

  assert.equal(evidence.metadataVerified, false);
  assert.equal(evidence.providerGitShaVerified, false);
});
