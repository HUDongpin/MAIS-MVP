import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  parseInspectedDeploymentUrl,
  runGoogleOAuthLegalApprovalGate,
  runGoogleOAuthSyntheticGate
} from "./deploy-vercel-production.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const sourcePath = path.join(repoRoot, "scripts", "deploy-vercel-production.mjs");

test("production deploy gates promotion and final domain on dashboard latency smoke", async () => {
  const source = await readFile(sourcePath, "utf8");
  const inspectIndex = source.indexOf("vercel\", [\"inspect\", deploymentUrl");
  const preflightIndex = source.indexOf("await runPreflight();");
  const googleOAuthLegalApprovalGateIndex = source.indexOf("const googleOAuthLegalApprovalGate = await runGoogleOAuthLegalApprovalGate();", preflightIndex);
  const googleOAuthSyntheticGateIndex = source.indexOf("const googleOAuthSyntheticGate = await runGoogleOAuthSyntheticGate();", preflightIndex);
  const authPrecheckIndex = source.indexOf("assertDashboardSmokeAuthReady(", preflightIndex);
  const localBuildGateIndex = source.indexOf("const localBuildGate = await runReleaseBuildGate", authPrecheckIndex);
  const stagingIndex = source.indexOf("const staging = await prepareVercelStaging", localBuildGateIndex);
  const googleOAuthStagedLegalApprovalGateIndex = source.indexOf(
    "const googleOAuthStagedLegalApprovalGate = await runGoogleOAuthLegalApprovalGate({",
    stagingIndex
  );
  const aiTutorGateIndex = source.indexOf("const aiTutorLatencyGate = await runAITutorLatencyGate(deploymentUrl);");
  const dashboardGateIndex = source.indexOf("const dashboardLatencyGate = await runDashboardLatencyGate(deploymentUrl,");
  const dashboardUiGateIndex = source.indexOf("const dashboardUiLoadingGate = await runDashboardUiLoadingGate(deploymentUrl,");
  const promoteIndex = source.indexOf("vercel\", [\"promote\", deploymentUrl");
  const productionDashboardGateIndex = source.indexOf("productionDashboardLatencyGate = await runDashboardLatencyGate(productionBaseUrl,");
  const productionDashboardUiGateIndex = source.indexOf("productionDashboardUiLoadingGate = await runDashboardUiLoadingGate(productionBaseUrl,");
  const productionGooglePublicPageGateIndex = source.indexOf("productionGooglePublicPageGate = await runGooglePublicPageGate();");
  const deploymentGoogleOAuthCanonicalHandoffGateIndex = source.indexOf("const deploymentGoogleOAuthCanonicalHandoffGate = await runGoogleOAuthStartGate(deploymentUrl,");
  const productionGoogleOAuthGateIndex = source.indexOf("productionGoogleOAuthStartGate = await runGoogleOAuthStartGate(undefined,");
  const postPromotionTryIndex = source.indexOf("try {", promoteIndex);
  const postPromotionCatchIndex = source.indexOf("} catch (gateError) {", postPromotionTryIndex);
  const rollbackCallIndex = source.indexOf("await rollbackAfterFailedPromotion(scope, previousProductionDeploymentUrl, gateError);", postPromotionCatchIndex);
  const rollbackFunctionIndex = source.indexOf("async function rollbackAfterFailedPromotion(scope, previousProductionDeploymentUrl, gateError)");
  const rollbackCommandIndex = source.indexOf('"rollback", previousProductionDeploymentUrl, "-y", "--timeout", "5m", "--scope", scope', rollbackFunctionIndex);
  const dashboardFunctionIndex = source.indexOf("async function runDashboardLatencyGate(baseUrl,");
  const dashboardFunctionEnd = source.indexOf("async function runDashboardUiLoadingGate(baseUrl,", dashboardFunctionIndex);
  const dashboardUiFunctionIndex = source.indexOf("async function runDashboardUiLoadingGate(baseUrl,");
  const dashboardUiFunctionEnd = source.indexOf("function extractDeploymentUrl", dashboardUiFunctionIndex);
  const dashboardSmokeIndex = source.indexOf("\"scripts/dashboard-latency-smoke.mjs\"", dashboardFunctionIndex);
  const dashboardUiSmokeIndex = source.indexOf("\"scripts/dashboard-ui-loading-smoke.mjs\"", dashboardUiFunctionIndex);
  const recordIndex = source.indexOf("dashboardLatencyGate,", dashboardGateIndex);
  const uiRecordIndex = source.indexOf("dashboardUiLoadingGate,", dashboardUiGateIndex);
  const productionRecordIndex = source.indexOf("productionDashboardLatencyGate,", productionDashboardGateIndex);
  const productionUiRecordIndex = source.indexOf("productionDashboardUiLoadingGate,", productionDashboardUiGateIndex);
  const defaultProductionBaseUrlIndex = source.indexOf("const DEFAULT_PRODUCTION_SMOKE_BASE_URL = \"https://mais.ac\";");
  const dryRunProductionBaseUrlIndex = source.indexOf("productionBaseUrl,", source.indexOf("if (options.dryRun)"));
  const dryRunReturnIndex = source.indexOf("return {", source.indexOf("if (options.dryRun)"));
  const previousProductionCaptureIndex = source.indexOf("const previousProductionDeploymentUrl = await resolveCurrentProductionDeploymentUrl(", dryRunReturnIndex);
  const deployIndex = source.indexOf("const deployArgs = [", authPrecheckIndex);
  const authImportIndex = source.indexOf("import { assertDashboardSmokeAuthReady } from \"./dashboard-smoke-auth-precheck.mjs\";");
  const buildGateImportIndex = source.indexOf("import { runReleaseBuildGate } from \"./release-build-gate.mjs\";");
  const googleOAuthProbeImportIndex = source.indexOf("import { probeGoogleOAuthStart } from \"./prod-certification.mjs\";");
  const googlePublicPageProbeImportIndex = source.indexOf("probeGooglePublicPageContracts");
  const googlePublicPageGateFunctionIndex = source.indexOf("async function runGooglePublicPageGate()");
  const googleOAuthLegalApprovalGateFunctionIndex = source.indexOf("async function runGoogleOAuthLegalApprovalGate(");
  const googleOAuthLegalApprovalCommandIndex = source.indexOf('["run", "check:google-oauth-legal-approval", "--", "--json"]', googleOAuthLegalApprovalGateFunctionIndex);
  const googleOAuthLegalApprovalSourceRootIndex = source.indexOf('"--source-root", sourceRoot', googleOAuthLegalApprovalGateFunctionIndex);
  const googleOAuthSyntheticGateFunctionIndex = source.indexOf("async function runGoogleOAuthSyntheticGate(");
  const googleOAuthSyntheticCommandIndex = source.indexOf('["run", "test:google-oauth"]', googleOAuthSyntheticGateFunctionIndex);

  assert.notEqual(preflightIndex, -1, "Production deploy should run staged publish preflight.");
  assert.notEqual(googleOAuthLegalApprovalGateIndex, -1, "Production deploy should require exact-hash owner and counsel approval evidence.");
  assert.notEqual(googleOAuthSyntheticGateIndex, -1, "Production deploy should run the complete local Google OAuth semantic gate.");
  assert.notEqual(localBuildGateIndex, -1, "Production deploy should run a local isolated release build gate.");
  assert.notEqual(stagingIndex, -1, "Production deploy should prepare pruned staging after the build gate.");
  assert.notEqual(googleOAuthStagedLegalApprovalGateIndex, -1, "Production deploy should revalidate legal approval against the exact staged source.");
  assert.notEqual(inspectIndex, -1, "Production deploy should inspect deployment before smoke gates.");
  assert.notEqual(aiTutorGateIndex, -1, "Production deploy should keep the AI Tutor latency gate.");
  assert.notEqual(dashboardGateIndex, -1, "Production deploy should run the pre-promotion dashboard latency gate.");
  assert.notEqual(dashboardUiGateIndex, -1, "Production deploy should run the pre-promotion dashboard UI loading gate.");
  assert.notEqual(promoteIndex, -1, "Production deploy should promote only after gates pass.");
  assert.notEqual(productionDashboardGateIndex, -1, "Production deploy should run a post-promotion production-domain dashboard latency gate.");
  assert.notEqual(productionDashboardUiGateIndex, -1, "Production deploy should run a post-promotion production-domain dashboard UI loading gate.");
  assert.notEqual(productionGooglePublicPageGateIndex, -1, "Production deploy should run the Google public URL P0 contract after promotion.");
  assert.notEqual(deploymentGoogleOAuthCanonicalHandoffGateIndex, -1, "Production deploy should probe the candidate deployment's canonical OAuth handoff before promotion.");
  assert.notEqual(productionGoogleOAuthGateIndex, -1, "Production deploy should rerun the redacted Google OAuth start gate after promotion.");
  assert.notEqual(postPromotionTryIndex, -1, "Post-promotion production gates should be rollback-protected.");
  assert.notEqual(postPromotionCatchIndex, -1, "Post-promotion production gate failures should be caught.");
  assert.notEqual(rollbackCallIndex, -1, "Post-promotion production gate failures should trigger automatic rollback.");
  assert.notEqual(rollbackFunctionIndex, -1, "Production deploy should define a rollback helper.");
  assert.notEqual(rollbackCommandIndex, -1, "Automatic rollback should be non-interactive, scoped, and completion-bounded.");
  assert.notEqual(dashboardFunctionEnd, -1, "Dashboard gate function should be bounded.");
  assert.notEqual(dashboardUiFunctionIndex, -1, "Production deploy should define a dashboard UI loading gate.");
  assert.notEqual(dashboardUiFunctionEnd, -1, "Dashboard UI loading gate function should be bounded.");
  assert.notEqual(defaultProductionBaseUrlIndex, -1, "Production-domain smoke should have a default base URL.");
  assert.notEqual(dryRunProductionBaseUrlIndex, -1, "Dry-run output should report the production-domain smoke target.");
  assert.notEqual(authPrecheckIndex, -1, "Production deploy should require dashboard smoke auth before real deploy.");
  assert.notEqual(deployIndex, -1, "Production deploy should build deploy args after auth precheck.");
  assert.notEqual(previousProductionCaptureIndex, -1, "Production deploy should capture the currently live deployment before creating a candidate.");
  assert.notEqual(authImportIndex, -1, "Production deploy should import the shared dashboard smoke auth precheck.");
  assert.notEqual(buildGateImportIndex, -1, "Production deploy should import the release build gate.");
  assert.notEqual(googleOAuthProbeImportIndex, -1, "Production deploy should import the shared redacted Google OAuth probe.");
  assert.notEqual(googlePublicPageProbeImportIndex, -1, "Production deploy should import the shared Google public URL contract probe.");
  assert.notEqual(googlePublicPageGateFunctionIndex, -1, "Production deploy should define a Google public URL gate backed by the shared probe.");
  assert.notEqual(googleOAuthLegalApprovalGateFunctionIndex, -1, "Production deploy should define the local legal-approval gate.");
  assert.notEqual(googleOAuthLegalApprovalCommandIndex, -1, "The legal-approval gate should invoke the private-manifest verifier.");
  assert.notEqual(googleOAuthLegalApprovalSourceRootIndex, -1, "The legal-approval gate should support an explicit staged source root.");
  assert.notEqual(googleOAuthSyntheticGateFunctionIndex, -1, "Production deploy should define a local Google OAuth semantic gate.");
  assert.notEqual(googleOAuthSyntheticCommandIndex, -1, "The local OAuth semantic gate should invoke the complete synthetic verifier.");
  assert.ok(preflightIndex < googleOAuthLegalApprovalGateIndex, "Staged publish preflight should run before the legal-approval gate.");
  assert.ok(googleOAuthLegalApprovalGateIndex < googleOAuthSyntheticGateIndex, "Exact-hash legal approval must pass before OAuth behavior is tested for production.");
  assert.ok(googleOAuthSyntheticGateIndex < authPrecheckIndex, "OAuth account-link policy must pass before dashboard auth readiness is checked.");
  assert.ok(authPrecheckIndex < localBuildGateIndex, "Real deploy auth readiness should be checked before the expensive local build gate.");
  assert.ok(localBuildGateIndex < stagingIndex, "Local build gate should pass before staging.");
  assert.match(
    source.slice(stagingIndex, googleOAuthStagedLegalApprovalGateIndex),
    /dryRun:\s*false/u,
    "Production dry-run must materialize the local staging tree so exact deploy bytes can be approved."
  );
  assert.ok(stagingIndex < googleOAuthStagedLegalApprovalGateIndex, "Staged legal approval should run only after staging is prepared.");
  assert.ok(googleOAuthStagedLegalApprovalGateIndex < dryRunReturnIndex, "Dry-run should report staged legal approval only after it passes.");
  assert.ok(dryRunReturnIndex < previousProductionCaptureIndex, "Dry-run must not inspect or mutate live deployment state.");
  assert.ok(previousProductionCaptureIndex < deployIndex, "Rollback target must be captured before the candidate deployment is created.");
  assert.ok(inspectIndex < deploymentGoogleOAuthCanonicalHandoffGateIndex, "Deployment inspect should complete before the candidate OAuth handoff gate.");
  assert.ok(deploymentGoogleOAuthCanonicalHandoffGateIndex < aiTutorGateIndex, "Candidate OAuth canonical handoff should pass before latency gates.");
  assert.ok(aiTutorGateIndex < dashboardGateIndex, "Pre-promotion dashboard gate should run after AI Tutor gate.");
  assert.ok(dashboardGateIndex < dashboardUiGateIndex, "Pre-promotion dashboard UI loading gate should run after dashboard API latency gate.");
  assert.ok(dashboardUiGateIndex < promoteIndex, "Pre-promotion dashboard UI loading gate must run before production promotion.");
  assert.ok(promoteIndex < productionDashboardGateIndex, "Production-domain dashboard smoke should run after promotion.");
  assert.ok(productionDashboardGateIndex < productionDashboardUiGateIndex, "Production-domain UI loading smoke should run after production-domain API smoke.");
  assert.ok(deploymentGoogleOAuthCanonicalHandoffGateIndex < promoteIndex, "A bad candidate OAuth canonical handoff must not be promoted.");
  assert.ok(promoteIndex < postPromotionTryIndex, "Rollback protection should begin after promotion succeeds.");
  assert.ok(postPromotionTryIndex < productionGooglePublicPageGateIndex, "Google public URL verification should run inside rollback protection.");
  assert.ok(productionGooglePublicPageGateIndex < productionDashboardGateIndex, "Google public URL verification should be the first post-promotion P0 gate.");
  assert.ok(postPromotionTryIndex < productionDashboardGateIndex, "Every production-domain gate should be inside rollback protection.");
  assert.ok(productionDashboardUiGateIndex < productionGoogleOAuthGateIndex, "Google OAuth live behavior must be rechecked after the production alias is promoted.");
  assert.ok(productionGoogleOAuthGateIndex < postPromotionCatchIndex, "The full canonical OAuth gate should run before leaving rollback protection.");
  assert.ok(productionGooglePublicPageGateIndex < postPromotionCatchIndex, "A Google public URL failure should enter the rollback catch path.");
  assert.ok(postPromotionCatchIndex < rollbackCallIndex, "The catch path should immediately request automatic rollback.");
  assert.match(source.slice(preflightIndex, localBuildGateIndex), /if \(!options\.dryRun\)/, "Dry-run should skip dashboard smoke auth precheck.");
  assert.ok(authPrecheckIndex < deployIndex, "Dashboard smoke auth precheck should run before creating a production deployment.");
  assert.ok(dashboardSmokeIndex > dashboardFunctionIndex, "Dashboard gate should invoke dashboard-latency-smoke.");
  assert.ok(dashboardUiSmokeIndex > dashboardUiFunctionIndex, "Dashboard UI gate should invoke dashboard-ui-loading-smoke.");
  assert.match(source.slice(dashboardFunctionIndex, dashboardFunctionEnd), /--base-url", baseUrl, "--json"/);
  assert.match(source.slice(dashboardUiFunctionIndex, dashboardUiFunctionEnd), /--base-url", baseUrl, "--json"/);
  assert.match(source.slice(dashboardGateIndex, promoteIndex), /production domains were not promoted/);
  assert.match(source.slice(dashboardUiGateIndex, promoteIndex), /Dashboard UI loading gate failed/);
  assert.match(source.slice(dashboardFunctionIndex, dashboardFunctionEnd), /current production domains remain on the previous production deployment/);
  assert.match(source.slice(dashboardFunctionIndex, dashboardFunctionEnd), /production-domain smoke did not pass/);
  assert.match(source.slice(dashboardUiFunctionIndex, dashboardUiFunctionEnd), /current production domains remain on the previous production deployment/);
  assert.match(source.slice(dashboardUiFunctionIndex, dashboardUiFunctionEnd), /production-domain UI loading smoke did not pass/);
  assert.match(source.slice(preflightIndex, localBuildGateIndex), /context: "Production deploy"/);
  assert.match(source.slice(dryRunReturnIndex, deployIndex), /googleOAuthLegalApprovalGate/);
  assert.match(source.slice(dryRunReturnIndex, deployIndex), /googleOAuthStagedLegalApprovalGate/);
  assert.match(source.slice(dryRunReturnIndex, deployIndex), /googleOAuthSyntheticGate/);
  assert.match(source.slice(dryRunReturnIndex, deployIndex), /localBuildGate/);
  assert.ok(recordIndex > dashboardGateIndex, "Deployment record should include dashboard latency evidence.");
  assert.ok(uiRecordIndex > dashboardUiGateIndex, "Deployment record should include dashboard UI loading evidence.");
  assert.ok(productionRecordIndex > productionDashboardGateIndex, "Deployment record should include production-domain dashboard latency evidence.");
  assert.ok(productionUiRecordIndex > productionDashboardUiGateIndex, "Deployment record should include production-domain dashboard UI loading evidence.");
  assert.ok(source.indexOf("deploymentGoogleOAuthCanonicalHandoffGate,", deploymentGoogleOAuthCanonicalHandoffGateIndex) > deploymentGoogleOAuthCanonicalHandoffGateIndex, "Deployment record should label pre-promotion evidence as canonical handoff evidence.");
  assert.ok(source.indexOf("productionGoogleOAuthStartGate,", productionGoogleOAuthGateIndex) > productionGoogleOAuthGateIndex, "Deployment record should include post-promotion OAuth evidence.");
  assert.ok(source.indexOf("productionGooglePublicPageGate,", productionGooglePublicPageGateIndex) > productionGooglePublicPageGateIndex, "Deployment record should include post-promotion Google public URL evidence.");
  assert.ok(source.indexOf("googleOAuthLegalApprovalGate,", recordIndex) > recordIndex, "Deployment record should include the pre-deploy exact-hash legal approval gate.");
  assert.ok(source.indexOf("googleOAuthStagedLegalApprovalGate,", recordIndex) > recordIndex, "Deployment record should include exact staged-source legal approval evidence.");
  assert.ok(source.indexOf("googleOAuthSyntheticGate,", recordIndex) > recordIndex, "Deployment record should include the pre-deploy OAuth semantic-gate evidence.");
  assert.match(source.slice(googlePublicPageGateFunctionIndex, rollbackFunctionIndex), /await probeGooglePublicPageContracts\(\)/, "The deployment gate should reuse the production certification probe.");
  assert.match(source.slice(googlePublicPageGateFunctionIndex, rollbackFunctionIndex), /automatic rollback will be requested/i, "Public URL contract failure should explicitly request rollback.");
  assert.match(source.slice(deploymentGoogleOAuthCanonicalHandoffGateIndex, promoteIndex), /canonical-handoff gate failed/i);
  assert.match(source.slice(deploymentGoogleOAuthCanonicalHandoffGateIndex), /never records authorization parameters or cookie values/i);
  assert.match(source.slice(rollbackFunctionIndex), /Automatic Vercel rollback completed/i);
  assert.match(source.slice(rollbackFunctionIndex), /Automatic Vercel rollback also failed/i);
});

test("production deploy parses and normalizes the pinned rollback deployment URL", () => {
  assert.equal(
    parseInspectedDeploymentUrl(JSON.stringify({
      id: "dpl_previous",
      url: "mais-previous-owner.vercel.app"
    })),
    "https://mais-previous-owner.vercel.app"
  );
  assert.throws(
    () => parseInspectedDeploymentUrl(JSON.stringify({ id: "dpl_missing_url" })),
    /did not identify a Vercel deployment URL/i
  );
  assert.throws(
    () => parseInspectedDeploymentUrl(JSON.stringify({ url: "https://example.com" })),
    /did not identify a Vercel deployment URL/i
  );
});

test("production deploy fails closed before build when the Google OAuth semantic gate is red", async () => {
  await assert.rejects(
    () => runGoogleOAuthSyntheticGate({
      runCommandFn: async () => ({
        exitCode: 1,
        stdout: "account-link security contract failed",
        stderr: ""
      })
    }),
    /production build and deployment were not started[\s\S]*email collisions require explicit MAIS account linking/i
  );
});

test("production deploy fails closed before build when exact-hash legal approval is absent", async () => {
  await assert.rejects(
    () => runGoogleOAuthLegalApprovalGate({
      runCommandFn: async () => ({
        exitCode: 1,
        stdout: JSON.stringify({ ready: false, blockers: ["owner approval missing"] }),
        stderr: ""
      })
    }),
    /production build and deployment were not started[\s\S]*owner and counsel must approve the exact current privacy policy and terms of service digests/i
  );
});

test("production legal approval gate forwards the staged source root without recording its path", async () => {
  const stagedSourceRoot = path.join(repoRoot, ".tmp", "vercel-staging", "release-fixture");
  let invocation;

  const result = await runGoogleOAuthLegalApprovalGate({
    sourceRoot: stagedSourceRoot,
    runCommandFn: async (...args) => {
      invocation = args;
      return {
        exitCode: 0,
        stdout: JSON.stringify({ ready: true, blockers: [] }),
        stderr: ""
      };
    }
  });

  assert.deepEqual(invocation, [
    "npm",
    [
      "run",
      "check:google-oauth-legal-approval",
      "--",
      "--json",
      "--source-root",
      stagedSourceRoot
    ],
    { cwd: repoRoot }
  ]);
  assert.equal(result.status, "passed");
  assert.equal(result.source, "vercel-staging");
  assert.doesNotMatch(JSON.stringify(result), new RegExp(stagedSourceRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
