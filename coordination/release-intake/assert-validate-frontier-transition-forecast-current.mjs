#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS,
  buildValidateFrontierTransitionForecast,
  stableValidateFrontierTransitionForecastProjection
} from "./generate-validate-frontier-transition-forecast.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-transition-forecast-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.dirtyMap,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.authorizationTransitionForecast,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.validateFrontierCapsule,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerInputLandingRunway,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerActionAcceptanceDocket,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CleanSourceValidationQueue,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationDryRun,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationCurrentGate,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.sevenStepClosureBridge,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestJson,
    VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.dirtyMap);
  const a25Forecast = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.authorizationTransitionForecast);
  const capsule = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.validateFrontierCapsule);
  const a22Runway = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerInputLandingRunway);
  const a22Docket = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerActionAcceptanceDocket);
  const a22Queue = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CleanSourceValidationQueue);
  const a22CandidateMutationDryRun = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationDryRun);
  const a22CandidateMutationCurrentGate = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationCurrentGate);
  const bridge = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.sevenStepClosureBridge);
  const recorded = readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestJson);
  const current = buildValidateFrontierTransitionForecast();

  if (!sameJson(
    stableValidateFrontierTransitionForecastProjection(recorded),
    stableValidateFrontierTransitionForecastProjection(current)
  )) {
    failures.push("A25/A22 validate frontier transition forecast is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const currentState = recorded.currentState ?? {};
  const projection = recorded.projectedAfterCurrentFrontierAuthorization ?? {};
  const assumedAction = recorded.assumedOwnerFrontierAction ?? {};
  const validationCommands = recorded.validationCommandsAfterOwnerInput ?? {};
  const blockers = recorded.blockersAfterCurrentFrontier ?? [];
  const blockerIds = blockers.map((row) => row.id);
  const checks = recorded.checks ?? [];
  const boundary = recorded.boundary ?? {};

  const a25FocusRows = count(a25Forecast.currentState?.currentFocusRows);
  const a22SelectedRows = count(capsule.summary?.a22SelectedActionRows);
  const a22AcceptedRows = count(a22Docket.summary?.acceptedRows);
  const expectedCombinedFrontierRows = a25FocusRows + Math.max(0, a22SelectedRows - a22AcceptedRows);
  const a22PreApprovalState = a22Runway.runwayStatus === "ready-for-owner-input-landing-review" &&
    a22Runway.summary?.ownerInputBlank === true &&
    a22Docket.acceptanceStatus === "waiting-for-owner-action" &&
    a22AcceptedRows === 0 &&
    a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-missing-recorded-instructions" &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 0;
  const a22PostApprovalState = a22Runway.runwayStatus === "owner-input-recorded-post-runway" &&
    a22Runway.summary?.ownerInputBlank === false &&
    a22Docket.acceptanceStatus === "ready-for-guarded-extraction" &&
    a22AcceptedRows === 4 &&
    a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-owner-candidate-mutation-input" &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4;
  const a22PostExtractionVerifiedState = a22Runway.runwayStatus === "owner-input-recorded-post-runway" &&
    a22Runway.summary?.ownerInputBlank === false &&
    a22Docket.acceptanceStatus === "post-extraction-verified" &&
    a22AcceptedRows === 4 &&
    a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsMissing) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 4;
  const expectedProjectedPending = Math.max(0, count(a25Forecast.currentState?.pendingCanonicalAuthorizationRows) - a25FocusRows);
  const expectedProjectedValid = count(a25Forecast.currentState?.validAuthorizationRows) + a25FocusRows;

  if (recorded.forecastKind !== "a25-a22-validate-frontier-transition-forecast") failures.push("forecastKind is invalid");
  if (recorded.forecastStatus !== "current-frontier-projection-ready") failures.push("forecastStatus must be current-frontier-projection-ready");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("forecast dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("forecast expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");

  if ((summary.ownerInputGroups ?? -1) !== 2) failures.push("summary.ownerInputGroups must be 2");
  if ((summary.combinedFrontierOwnerRows ?? -1) !== expectedCombinedFrontierRows) failures.push("summary.combinedFrontierOwnerRows must match current frontier rows");
  if ((summary.a25CurrentFocusRows ?? -1) !== a25FocusRows) failures.push("summary.a25CurrentFocusRows must match A25 forecast");
  if ((summary.a22SelectedActionRows ?? -1) !== a22SelectedRows) failures.push("summary.a22SelectedActionRows must match capsule");
  if ((summary.a22ProjectedAcceptedSelectedActionRows ?? -1) !== 4) {
    failures.push("summary.a22ProjectedAcceptedSelectedActionRows must be 4");
  }
  if (summary.a22CandidateMutationExecutorStatus !== a22CandidateMutationDryRun.executorStatus) {
    failures.push("summary.a22CandidateMutationExecutorStatus must match A22 candidate mutation dry-run source");
  }
  if ((summary.a22CandidateMutationRecordedInstructionRows ?? -1) !== count(a22CandidateMutationDryRun.summary?.recordedInstructionRows)) {
    failures.push("summary.a22CandidateMutationRecordedInstructionRows must match A22 candidate mutation dry-run source");
  }
  if (summary.a22CandidateMutationApplyPermitted !== false) {
    failures.push("summary.a22CandidateMutationApplyPermitted must be false");
  }
  if ((summary.a22CandidateMutationRows ?? -1) !== 0) failures.push("summary.a22CandidateMutationRows must be 0");
  if ((summary.a22CandidateMutationCurrentGateFailures ?? -1) !== 0) {
    failures.push("summary.a22CandidateMutationCurrentGateFailures must be 0");
  }
  if ((summary.currentPendingCanonicalAuthorizationRows ?? -1) !== count(a25Forecast.currentState?.pendingCanonicalAuthorizationRows)) {
    failures.push("summary.currentPendingCanonicalAuthorizationRows must match A25 forecast");
  }
  if ((summary.projectedPendingCanonicalAuthorizationRows ?? -1) !== expectedProjectedPending) {
    failures.push("summary.projectedPendingCanonicalAuthorizationRows must match A25 projection");
  }
  if ((summary.currentValidAuthorizationRows ?? -1) !== count(a25Forecast.currentState?.validAuthorizationRows)) {
    failures.push("summary.currentValidAuthorizationRows must match A25 forecast");
  }
  if ((summary.projectedValidAuthorizationRows ?? -1) !== expectedProjectedValid) {
    failures.push("summary.projectedValidAuthorizationRows must match A25 projection");
  }
  if ((summary.heldRows ?? -1) !== count(a25Forecast.currentState?.heldRows)) failures.push("summary.heldRows must match A25 forecast");
  if ((summary.heldPolicyRows ?? -1) !== count(a25Forecast.currentState?.heldPolicyRows)) failures.push("summary.heldPolicyRows must match A25 forecast");
  if ((summary.deferredPhysicalLifecycleRows ?? -1) !== count(a25Forecast.currentState?.deferredPhysicalLifecycleRows)) {
    failures.push("summary.deferredPhysicalLifecycleRows must match A25 forecast");
  }
  if ((summary.checks ?? -1) !== 8) failures.push("summary.checks must be 8");
  if ((summary.passingChecks ?? -1) !== 8) failures.push("summary.passingChecks must be 8");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("summary.failedChecks must be 0");
  if (summary.validateExitReadyNow !== false) failures.push("summary.validateExitReadyNow must be false");
  if (summary.projectedValidateExitReady !== false) failures.push("summary.projectedValidateExitReady must be false");
  if (summary.projectedReadyForMerge !== false) failures.push("summary.projectedReadyForMerge must be false");
  if (summary.releaseSourceEligibleNow !== false) failures.push("summary.releaseSourceEligibleNow must be false");
  if (summary.projectedReleaseSourceEligibleNow !== false) failures.push("summary.projectedReleaseSourceEligibleNow must be false");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  if ((currentState.combinedFrontierOwnerRows ?? -1) !== expectedCombinedFrontierRows) failures.push("currentState.combinedFrontierOwnerRows must match current frontier rows");
  if (!sameJson(sorted(currentState.a25CurrentFocusApprovalIds), sorted(a25Forecast.currentState?.currentFocusApprovalIds ?? []))) {
    failures.push("currentState.a25CurrentFocusApprovalIds must match A25 forecast");
  }
  if ((currentState.heldPolicyRows ?? -1) !== count(a25Forecast.currentState?.heldPolicyRows)) failures.push("currentState.heldPolicyRows must match A25 forecast");
  if (!sameJson(sorted(currentState.heldPolicyApprovalIds), sorted(a25Forecast.currentState?.heldPolicyApprovalIds))) {
    failures.push("currentState held policy approval IDs must match A25 forecast");
  }
  if ((currentState.a22ApprovalIds ?? []).length !== 4) failures.push("currentState.a22ApprovalIds must include 4 rows");
  if (!["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(currentState.a22RunwayStatus)) {
    failures.push("currentState.a22RunwayStatus must be ready or already recorded");
  }
  if (currentState.a22OwnerInputBlank !== (a22Runway.summary?.ownerInputBlank === true)) failures.push("currentState.a22OwnerInputBlank must match A22 runway source");
  if (currentState.a22CandidateMutationExecutorStatus !== a22CandidateMutationDryRun.executorStatus) {
    failures.push("currentState.a22CandidateMutationExecutorStatus must match A22 candidate mutation dry-run source");
  }
  if ((currentState.a22CandidateMutationRecordedInstructionRows ?? -1) !== count(a22CandidateMutationDryRun.summary?.recordedInstructionRows)) {
    failures.push("currentState.a22CandidateMutationRecordedInstructionRows must match A22 candidate mutation dry-run source");
  }
  if (currentState.a22CandidateMutationApplyPermitted !== false) {
    failures.push("currentState.a22CandidateMutationApplyPermitted must be false");
  }
  if ((currentState.a22CandidateMutationRows ?? -1) !== 0) {
    failures.push("currentState.a22CandidateMutationRows must be 0");
  }
  if ((currentState.a22CandidateMutationCurrentGateFailures ?? -1) !== 0) {
    failures.push("currentState.a22CandidateMutationCurrentGateFailures must be 0");
  }
  if (currentState.validateExitReadyNow !== false) failures.push("currentState.validateExitReadyNow must be false");
  if (currentState.readyForMergeNow !== false) failures.push("currentState.readyForMergeNow must be false");
  if (currentState.releaseSourceEligibleNow !== false) failures.push("currentState.releaseSourceEligibleNow must be false");

  if ((projection.projectedPendingCanonicalAuthorizationRows ?? -1) !== expectedProjectedPending) {
    failures.push("projection.projectedPendingCanonicalAuthorizationRows must match A25 projection");
  }
  if ((projection.projectedValidAuthorizationRows ?? -1) !== expectedProjectedValid) {
    failures.push("projection.projectedValidAuthorizationRows must match A25 projection");
  }
  if ((projection.projectedCurrentA25FocusRows ?? -1) !== 0) failures.push("projection.projectedCurrentA25FocusRows must be 0");
  if ((projection.projectedHeldPolicyRows ?? -1) !== count(a25Forecast.currentState?.heldPolicyRows)) failures.push("projection.projectedHeldPolicyRows must remain unchanged");
  if (!sameJson(sorted(projection.projectedHeldPolicyApprovalIds), sorted(a25Forecast.currentState?.heldPolicyApprovalIds))) {
    failures.push("projection held policy approval IDs must remain unchanged");
  }
  if ((projection.a22ProjectedAcceptedSelectedActionRows ?? -1) !== 4) {
    failures.push("projection.a22ProjectedAcceptedSelectedActionRows must be 4");
  }
  if ((projection.a22ProjectedPendingSelectedActionRows ?? -1) !== 0) {
    failures.push("projection.a22ProjectedPendingSelectedActionRows must be 0");
  }
  if (projection.projectedValidateExitReady !== false) failures.push("projection.projectedValidateExitReady must be false");
  if (projection.projectedReadyForMerge !== false) failures.push("projection.projectedReadyForMerge must be false");
  if (projection.projectedReleaseSourceEligibleNow !== false) failures.push("projection.projectedReleaseSourceEligibleNow must be false");
  if ((projection.projectedCleanupAuthorizedRows ?? -1) !== 0) failures.push("projection.projectedCleanupAuthorizedRows must be 0");
  if ((projection.projectedExecutableRows ?? -1) !== 0) failures.push("projection.projectedExecutableRows must be 0");

  if (a25FocusRows > 0) {
    const ownerPackageText = String(assumedAction.ownerPackageCopyableOwnerReplyTextZh ?? "");
    if (!ownerPackageText.includes("approvalIds=") || !ownerPackageText.includes("不授权 cleanup")) {
      failures.push("assumed action must include A25 owner-package copyable text and cleanup boundary");
    }
  }
  if (!String(assumedAction.a22CopyableOwnerReplyTextZh ?? "").includes("approvalIds=a06-visualization-back-to-top-import-parity")) {
    failures.push("assumed action must include A22 compact copyable text");
  }
  if ((assumedAction.a22ExactOwnerExecutionTextLines ?? []).length !== 4) {
    failures.push("assumed action must include 4 A22 exact owner execution text lines");
  }
  for (const [key, expected] of [
    ["recordsAuthorizationOnlyAfterExplicitOwnerReply", true],
    ["recordsA22OwnerInputOnlyAfterExplicitOwnerReply", true],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["mergeAuthorized", false],
    ["deployAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (assumedAction[key] !== expected) failures.push(`assumedOwnerFrontierAction.${key} must be ${expected}`);
  }

  const requiredBlockers = [
    "a22-extraction-recording-and-guarded-extraction",
    "a22-candidate-mutation-still-separate",
    "a22-post-extraction-candidate-gate-rerun",
    "merge-not-authorized"
  ];
  if (expectedProjectedPending > 0) requiredBlockers.push("canonical-authorization-backlog");
  if (count(a25Forecast.currentState?.heldRows) > 0) requiredBlockers.push("wave01-resync-hold");
  if (count(capsule.summary?.validationHoldBlockers) > 0) requiredBlockers.push("validation-hold");
  if (a22Queue.summary?.releaseSourceEligibleNow !== true || bridge.summary?.releaseSourceClean !== true) requiredBlockers.push("a22-clean-release-source");
  if (count(a25Forecast.currentState?.deferredPhysicalLifecycleRows) > 0) requiredBlockers.push("physical-lifecycle-deferred");
  for (const requiredBlocker of requiredBlockers) {
    if (!blockerIds.includes(requiredBlocker)) failures.push(`missing projected blocker: ${requiredBlocker}`);
  }
  if (count(a25Forecast.currentState?.heldRows) === 0 && blockerIds.includes("wave01-resync-hold")) {
    failures.push("wave01-resync-hold must not be projected without dynamic held rows");
  }
  if ((summary.blockersAfterCurrentFrontier ?? -1) !== blockers.length) {
    failures.push("summary.blockersAfterCurrentFrontier must match blocker length");
  }
  for (const row of blockers) {
    if (row.recordsAuthorization !== false) failures.push(`${row.id}: recordsAuthorization must be false`);
    if (row.recordsOwnerInput !== false) failures.push(`${row.id}: recordsOwnerInput must be false`);
    if (row.modifiesCandidate !== false) failures.push(`${row.id}: modifiesCandidate must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.id}: mergeAuthorized must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.id}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.id}: executableNow must be false`);
  }

  if ((validationCommands.a25PostInputValidationCommands ?? []).length !== 5) failures.push("expected 5 A25 immediate commands");
  if ((validationCommands.a25DeferredAggregateValidationCommands ?? []).length !== 8) failures.push("expected 8 A25 deferred aggregate commands");
  if ((validationCommands.a22PostOwnerInputValidationCommands ?? []).length !== 8) failures.push("expected 8 A22 post-owner-input commands");
  if ((validationCommands.combinedPostOwnerInputValidationCommands ?? []).length < 20) {
    failures.push("combined post-owner-input commands should include A25 and A22 chains");
  }
  for (const requiredCommand of [
    "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
    "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs"
  ]) {
    if (!(validationCommands.combinedPostOwnerInputValidationCommands ?? []).includes(requiredCommand)) {
      failures.push(`missing combined validation command: ${requiredCommand}`);
    }
  }
  if ((summary.a25PostInputValidationCommandRows ?? -1) !== 5) failures.push("summary.a25PostInputValidationCommandRows must be 5");
  if ((summary.a25DeferredAggregateValidationCommandRows ?? -1) !== 8) {
    failures.push("summary.a25DeferredAggregateValidationCommandRows must be 8");
  }
  if ((summary.a22PostOwnerInputValidationCommandRows ?? -1) !== 8) {
    failures.push("summary.a22PostOwnerInputValidationCommandRows must be 8");
  }

  for (const requiredCheck of [
    "source-current",
    "combined-frontier-shape-current",
    "a25-transition-projection-current",
    "a22-transition-projection-current",
    "a22-candidate-mutation-dry-run-current",
    "post-owner-input-validation-chain-visible",
    "merge-remains-blocked",
    "non-executable-boundary"
  ]) {
    const row = checks.find((check) => check.id === requiredCheck);
    if (!row) failures.push(`missing check: ${requiredCheck}`);
    if (row && row.status !== "pass") failures.push(`check must pass: ${requiredCheck}`);
  }

  if (!a22PreApprovalState && !a22PostApprovalState && !a22PostExtractionVerifiedState) {
    failures.push("A22 source must be either pre-approval waiting, post-approval waiting on candidate mutation input, or post-extraction verified");
  }
  if (!["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(a22Runway.runwayStatus)) {
    failures.push("A22 runway source must be ready or owner-input-recorded");
  }
  if (a22Runway.summary?.ownerInputBlank !== (a22PreApprovalState ? true : false)) {
    failures.push("A22 runway owner input blank state must match current approval phase");
  }
  if (a22PreApprovalState && a22Docket.acceptanceStatus !== "waiting-for-owner-action") failures.push("A22 acceptance docket must wait for owner action in pre-approval state");
  if (a22PostApprovalState && a22Docket.acceptanceStatus !== "ready-for-guarded-extraction") failures.push("A22 acceptance docket must be ready for guarded extraction in post-approval state");
  if (a22PostExtractionVerifiedState && a22Docket.acceptanceStatus !== "post-extraction-verified") failures.push("A22 acceptance docket must be post-extraction verified in post-extraction state");
  if ((a22Docket.summary?.acceptedRows ?? -1) !== a22AcceptedRows) failures.push("A22 accepted rows must match docket source");
  if (a22Queue.summary?.releaseSourceEligibleNow !== false) failures.push("A22 queue releaseSourceEligibleNow must be false");
  if (!["dry-run-blocked-missing-recorded-instructions", "dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(a22CandidateMutationDryRun.executorStatus)) {
    failures.push("A22 candidate mutation dry-run source must remain fail-closed or post-extraction verified");
  }
  if ((a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? -1) !== count(a22CandidateMutationDryRun.summary?.recordedInstructionRows)) {
    failures.push("A22 candidate mutation dry-run source recordedInstructionRows must be numeric");
  }
  if ((a22CandidateMutationDryRun.summary?.applyPermitted ?? true) !== false) {
    failures.push("A22 candidate mutation dry-run source applyPermitted must be false");
  }
  if ((a22CandidateMutationDryRun.summary?.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation dry-run source candidateMutationRows must be 0");
  }
  if ((a22CandidateMutationCurrentGate.failures ?? []).length !== 0) {
    failures.push("A22 candidate mutation current gate failures must be 0");
  }
  if (bridge.summary?.validateExitReady !== false) failures.push("seven-step bridge validateExitReady must be false");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsAuthorization", false],
    ["recordsOwnerInput", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
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
    ["requiresSeparateA22CandidateMutationInstruction", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestMarkdown);
  for (const needle of [
    "A25/A22 Validate Frontier Transition Forecast",
    "Summary",
    "Projected After Current Frontier Authorization",
    "A22 candidate-mutation executor status",
    "Blockers After Current Frontier",
    "Validation Commands",
    "Boundary",
    "Records authorization: false",
    "Records owner input: false",
    "Merge authorized: false",
    "Cleanup authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`transition forecast markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("transition forecast markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    forecastStatus: recorded.forecastStatus,
    combinedFrontierOwnerRows: summary.combinedFrontierOwnerRows ?? 0,
    projectedPendingCanonicalAuthorizationRows: summary.projectedPendingCanonicalAuthorizationRows ?? 0,
    a22ProjectedAcceptedSelectedActionRows: summary.a22ProjectedAcceptedSelectedActionRows ?? 0,
    blockersAfterCurrentFrontier: summary.blockersAfterCurrentFrontier ?? 0,
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
    console.log("A25/A22 validate frontier transition forecast gate");
    console.log(`Forecast status: ${payload.forecastStatus ?? "unknown"}`);
    console.log(`Combined frontier rows: ${payload.combinedFrontierOwnerRows ?? 0}`);
    console.log(`Projected pending canonical rows: ${payload.projectedPendingCanonicalAuthorizationRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25/A22 validate frontier transition forecast gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
