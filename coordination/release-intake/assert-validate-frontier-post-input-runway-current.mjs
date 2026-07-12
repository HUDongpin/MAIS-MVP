#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS,
  buildValidateFrontierPostInputRunway,
  stableValidateFrontierPostInputRunwayProjection
} from "./generate-validate-frontier-post-input-runway.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-post-input-runway-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function sorted(value) {
  return [...(value ?? [])].sort();
}

function phaseById(payload, id) {
  return (payload.phaseRows ?? []).find((row) => row.id === id);
}

function checkById(payload, id) {
  return (payload.checks ?? []).find((row) => row.id === id);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.dirtyMap,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.transitionForecast,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.authorizationRoundValidationPlan,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.validateFrontierCapsule,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22OwnerInputLandingRunway,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CleanSourceValidationQueue,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationDryRun,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationCurrentGate,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.sevenStepClosureBridge,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestJson,
    VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.dirtyMap);
  const transition = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.transitionForecast);
  const validationPlan = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.authorizationRoundValidationPlan);
  const capsule = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.validateFrontierCapsule);
  const a22Runway = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22OwnerInputLandingRunway);
  const a22Queue = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CleanSourceValidationQueue);
  const a22CandidateMutationDryRun = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationDryRun);
  const a22CandidateMutationCurrentGate = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationCurrentGate);
  const bridge = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.sevenStepClosureBridge);
  const recorded = readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestJson);
  const current = buildValidateFrontierPostInputRunway();
  const markdown = readText(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestMarkdown);

  fail(
    failures,
    sameJson(
      stableValidateFrontierPostInputRunwayProjection(recorded),
      stableValidateFrontierPostInputRunwayProjection(current)
    ),
    "A25/A22 validate frontier post-input runway is stale"
  );

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const frontier = recorded.frontier ?? {};
  const boundary = recorded.boundary ?? {};
  const commandChains = recorded.commandChains ?? {};
  const expectedOwnerFrontierRows = count(transition.summary?.combinedFrontierOwnerRows);
  const expectedA25FocusRows = count(transition.summary?.a25CurrentFocusRows);
  const expectedRunwayStatus = expectedOwnerFrontierRows === 0
    ? a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified"
      ? "waiting-for-a22-typecheck-build-remediation"
      : "waiting-for-a22-candidate-mutation-owner-input"
    : "waiting-for-owner-frontier-approval";

  fail(failures, recorded.runwayKind === "a25-a22-validate-frontier-post-input-runway", "runwayKind is invalid");
  fail(failures, recorded.runwayStatus === expectedRunwayStatus, "runwayStatus must match current frontier phase");
  fail(failures, recorded.currentStep === "owner-input", "currentStep must be owner-input");
  fail(failures, recorded.dirtyMapStatusSignature === expectedSignature, "dirty map signature is stale");
  fail(failures, recorded.expandedStatusEntries === expectedEntries, "expanded dirty entry count is stale");
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, (summary.sourceCurrentnessFailures ?? -1) === 0, "summary.sourceCurrentnessFailures must be 0");

  fail(failures, transition.forecastStatus === "current-frontier-projection-ready", "transition forecast source must be ready");
  fail(failures, capsule.capsuleStatus === "waiting-for-owner-frontier-input", "validate frontier capsule source must wait for owner input");
  fail(
    failures,
    ["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(a22Runway.runwayStatus),
    "A22 owner-input landing runway source must be ready or already recorded"
  );
  fail(
    failures,
    [
      "waiting-top-candidate-root-parity-owner-input",
      "waiting-top-candidate-candidate-mutation-owner-input",
      "waiting-top-candidate-typecheck-build-remediation",
      "fallback-candidate-green-await-clean-source-selection-review"
    ].includes(a22Queue.queueStatus),
    "A22 clean-source queue source must wait on the current root-parity recovery frontier"
  );
  fail(failures, bridge.summary?.validateExitReady === false, "seven-step bridge validateExitReady must be false");
  fail(failures, a22Queue.summary?.releaseSourceEligibleNow === false, "A22 releaseSourceEligibleNow must be false");

  fail(failures, summary.ownerInputGroups === 2, "summary.ownerInputGroups must be 2");
  fail(failures, summary.ownerFrontierRows === expectedOwnerFrontierRows, "summary.ownerFrontierRows must match transition");
  fail(failures, summary.a25FocusRows === expectedA25FocusRows, "summary.a25FocusRows must match transition");
  fail(failures, summary.a22SelectedActionRows === 4, "summary.a22SelectedActionRows must be 4");
  fail(failures, summary.pendingCanonicalAuthorizationRows === count(transition.summary?.currentPendingCanonicalAuthorizationRows), "summary.pendingCanonicalAuthorizationRows must match transition");
  fail(failures, summary.projectedPendingCanonicalAuthorizationRows === count(transition.summary?.projectedPendingCanonicalAuthorizationRows), "summary.projectedPendingCanonicalAuthorizationRows must match transition");
  fail(failures, summary.validAuthorizationRows === count(transition.summary?.currentValidAuthorizationRows), "summary.validAuthorizationRows must match transition");
  fail(failures, summary.projectedValidAuthorizationRows === count(transition.summary?.projectedValidAuthorizationRows), "summary.projectedValidAuthorizationRows must match transition");
  fail(failures, summary.phaseRows === 7, "summary.phaseRows must be 7");
  fail(failures, summary.safeRunnablePreflightRows === 1, "summary.safeRunnablePreflightRows must be 1");
  fail(failures, summary.blockedPhaseRows === 6, "summary.blockedPhaseRows must be 6");
  fail(failures, summary.a25SafePostInputValidationCommands === 5, "summary.a25SafePostInputValidationCommands must be 5");
  fail(failures, summary.a25DeferredAggregateValidationCommands === 8, "summary.a25DeferredAggregateValidationCommands must be 8");
  fail(failures, summary.a22PostOwnerInputValidationCommands === 8, "summary.a22PostOwnerInputValidationCommands must be 8");
  fail(failures, summary.a22CandidateGateRerunCommands >= 19, "summary.a22CandidateGateRerunCommands must be at least 19");
  fail(
    failures,
    ["dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(summary.a22CandidateMutationExecutorStatus),
    "summary.a22CandidateMutationExecutorStatus must block on owner candidate mutation input or be post-extraction verified"
  );
  fail(failures, summary.a22CandidateMutationRecordedInstructionRows === 4, "summary.a22CandidateMutationRecordedInstructionRows must be 4");
  fail(failures, summary.a22CandidateMutationApplyPermitted === false, "summary.a22CandidateMutationApplyPermitted must be false");
  fail(failures, summary.a22CandidateMutationRows === 0, "summary.a22CandidateMutationRows must be 0");
  fail(failures, summary.a22CandidateMutationCurrentGateFailures === 0, "summary.a22CandidateMutationCurrentGateFailures must be 0");
  fail(failures, summary.candidateFocusedSmokePassed === true, "top candidate focused smoke must be true");
  fail(failures, summary.candidateTypeCheckPassed === false, "top candidate type-check must remain false");
  fail(failures, summary.candidateBuildPassed === false, "top candidate build must remain false");
  fail(failures, summary.cleanupAuthorizedRows === 0, "summary.cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "summary.executableRows must be 0");
  fail(failures, summary.failedChecks === 0, "summary.failedChecks must be 0");

  fail(failures, frontier.ownerFrontierRows === expectedOwnerFrontierRows, "frontier.ownerFrontierRows must match transition");
  fail(failures, frontier.a25FocusRows === expectedA25FocusRows, "frontier.a25FocusRows must match transition");
  fail(failures, frontier.a22SelectedActionRows === 4, "frontier.a22SelectedActionRows must be 4");
  fail(
    failures,
    sameJson(sorted(frontier.a25FocusApprovalIds), sorted(transition.currentState?.a25CurrentFocusApprovalIds ?? [])),
    "frontier.a25FocusApprovalIds must match transition source"
  );
  fail(
    failures,
    sameJson(sorted(frontier.a22ApprovalIds), sorted(transition.currentState?.a22ApprovalIds ?? [])),
    "frontier.a22ApprovalIds must match transition source"
  );

  const expectedPhaseIds = [
    "preflight-currentness",
    "owner-frontier-approval-required",
    "a25-canonical-authorization-validation",
    "a22-owner-input-recording-and-guarded-extraction-dry-run",
    "a22-candidate-gate-rerun-after-extraction",
    "a25-deferred-aggregate-validation",
    "merge-cleanup-deploy-decision-gate"
  ];
  fail(failures, sameJson((recorded.phaseRows ?? []).map((row) => row.id), expectedPhaseIds), "phase ids/order are invalid");
  fail(failures, phaseById(recorded, "preflight-currentness")?.safeRunnableNow === true, "preflight must be the only safe-now row");
  const a22OwnerInputPhase = phaseById(recorded, "a22-owner-input-recording-and-guarded-extraction-dry-run");
  fail(
    failures,
    ["dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(a22OwnerInputPhase?.candidateMutationDryRunState?.executorStatus),
    "A22 owner-input phase must expose owner-candidate-mutation-input blocker or post-extraction verified state"
  );
  fail(failures, a22OwnerInputPhase?.candidateMutationDryRunState?.recordedInstructionRows === 4, "A22 owner-input phase candidate mutation recordedInstructionRows must be 4");
  fail(failures, a22OwnerInputPhase?.candidateMutationDryRunState?.applyPermitted === false, "A22 owner-input phase candidate mutation applyPermitted must be false");
  fail(failures, a22OwnerInputPhase?.candidateMutationDryRunState?.candidateMutationRows === 0, "A22 owner-input phase candidateMutationRows must be 0");
  fail(failures, a22OwnerInputPhase?.candidateMutationDryRunState?.currentGateFailures === 0, "A22 owner-input phase candidate mutation currentGateFailures must be 0");
  for (const phaseId of expectedPhaseIds.slice(1)) {
    fail(failures, phaseById(recorded, phaseId)?.safeRunnableNow === false, `${phaseId}: safeRunnableNow must be false`);
  }
  for (const phase of recorded.phaseRows ?? []) {
    fail(failures, String(phase.stopCondition ?? "").length > 0, `${phase.id}: stopCondition must be populated`);
    fail(failures, phase.boundary?.evidenceOnly === true, `${phase.id}: boundary.evidenceOnly must be true`);
    fail(failures, phase.boundary?.mergeAuthorized === false, `${phase.id}: boundary.mergeAuthorized must be false`);
    fail(failures, phase.boundary?.cleanupAuthorized === false, `${phase.id}: boundary.cleanupAuthorized must be false`);
    fail(failures, phase.boundary?.deployAuthorized === false, `${phase.id}: boundary.deployAuthorized must be false`);
    fail(failures, phase.boundary?.physicalLifecycleCleanupAuthorized === false, `${phase.id}: boundary.physicalLifecycleCleanupAuthorized must be false`);
  }

  for (const [key, expectedLength] of [
    ["a25SafePostInputValidationCommands", 5],
    ["a25DeferredAggregateValidationCommands", 8],
    ["a22PostOwnerInputValidationCommands", 8]
  ]) {
    fail(failures, (commandChains[key] ?? []).length === expectedLength, `${key} must have ${expectedLength} commands`);
  }
  fail(failures, (commandChains.a22CandidateGateRerunCommands ?? []).length >= 19, "a22CandidateGateRerunCommands must include candidate gate rerun chain");

  for (const requiredCommand of [
    "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
    "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
  ]) {
    const allCommands = [
      ...(commandChains.a25SafePostInputValidationCommands ?? []),
      ...(commandChains.a25DeferredAggregateValidationCommands ?? []),
      ...(commandChains.a22PostOwnerInputValidationCommands ?? []),
      ...(commandChains.a22CandidateGateRerunCommands ?? [])
    ];
    fail(failures, allCommands.includes(requiredCommand), `missing runway command: ${requiredCommand}`);
  }

  for (const checkId of [
    "source-current",
    "frontier-shape-current",
    "a25-validation-chain-visible",
    "a22-owner-input-chain-visible",
    "a22-candidate-mutation-dry-run-current",
    "a22-candidate-rerun-chain-visible",
    "merge-cleanup-deploy-blocked",
    "non-executable-boundary",
    "stop-conditions-visible"
  ]) {
    const check = checkById(recorded, checkId);
    fail(failures, Boolean(check), `missing check: ${checkId}`);
    if (check) fail(failures, check.status === "pass", `check must pass: ${checkId}`);
  }
  fail(
    failures,
    ["dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(a22CandidateMutationDryRun.executorStatus),
    "A22 candidate mutation dry-run source must block on owner candidate mutation input or be post-extraction verified"
  );
  fail(failures, (a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? -1) === 4, "A22 candidate mutation dry-run recordedInstructionRows must be 4");
  fail(failures, (a22CandidateMutationDryRun.summary?.applyPermitted ?? true) === false, "A22 candidate mutation dry-run applyPermitted must be false");
  fail(failures, (a22CandidateMutationDryRun.summary?.candidateMutationRows ?? -1) === 0, "A22 candidate mutation dry-run candidateMutationRows must be 0");
  fail(failures, (a22CandidateMutationDryRun.summary?.executableRows ?? -1) === 0, "A22 candidate mutation dry-run executableRows must be 0");
  fail(failures, (a22CandidateMutationCurrentGate.failures ?? []).length === 0, "A22 candidate mutation current gate failures must be 0");
  fail(failures, (a22CandidateMutationCurrentGate.candidateMutationRows ?? -1) === 0, "A22 candidate mutation current gate candidateMutationRows must be 0");
  fail(failures, (a22CandidateMutationCurrentGate.executableRows ?? -1) === 0, "A22 candidate mutation current gate executableRows must be 0");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["runwayOnly", true],
    ["recordsAuthorization", false],
    ["recordsOwnerInput", false],
    ["appliesOwnerInputPatch", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["selectsReleaseSource", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["deployAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false],
    ["requiresExplicitOwnerApprovalBeforeA25Recording", true],
    ["requiresExplicitOwnerApprovalBeforeA22OwnerInput", true],
    ["requiresSeparateA22RecordingStep", true],
    ["requiresSeparateA22CandidateMutationInstruction", true],
    ["requiresSeparateCandidateGateRerun", true],
    ["requiresSeparateMergeAuthorization", true],
    ["requiresSeparateCleanupAuthorization", true],
    ["requiresSeparateDeployAuthorization", true],
    ["requiresSeparatePhysicalLifecycleCleanupAuthorization", true]
  ]) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const needle of [
    "A25/A22 Validate Frontier Post-Input Runway",
    "Summary",
    "A22 candidate-mutation executor status",
    "Phase Rows",
    "Command Chains",
    "Boundary",
    "Records authorization: false",
    "Records owner input: false",
    "Applies owner input patch: false",
    "Runs type-check: false",
    "Merge authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(needle), `post-input runway markdown missing text: ${needle}`);
  }
  fail(failures, !markdown.includes("undefined"), "post-input runway markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    runwayStatus: recorded.runwayStatus,
    ownerFrontierRows: summary.ownerFrontierRows ?? 0,
    phaseRows: summary.phaseRows ?? 0,
    blockedPhaseRows: summary.blockedPhaseRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25/A22 validate frontier post-input runway gate");
    console.log(`Runway status: ${payload.runwayStatus ?? "unknown"}`);
    console.log(`Owner frontier rows: ${payload.ownerFrontierRows ?? 0}`);
    console.log(`Phase rows: ${payload.phaseRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25/A22 validate frontier post-input runway gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
