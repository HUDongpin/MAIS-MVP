#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORIZATION_TRANSITION_FORECAST_PATHS,
  buildAuthorizationTransitionForecast,
  stableAuthorizationTransitionForecastProjection
} from "./generate-authorization-transition-forecast.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-authorization-transition-forecast-current-gate.json");
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

function sorted(value) {
  return [...(value ?? [])].sort();
}

function main() {
  const failures = [];
  for (const requiredPath of [
    AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestJson,
    AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestJson);
  const current = buildAuthorizationTransitionForecast();
  if (!sameJson(
    stableAuthorizationTransitionForecastProjection(recorded),
    stableAuthorizationTransitionForecastProjection(current)
  )) {
    failures.push("A25 authorization transition forecast is stale");
  }

  const backlog = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.authorizationBacklogQueue);
  const compactBundle = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.compactRequestBundle);
  const ownerReadiness = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.ownerClosureInputReadiness);
  const exitCriteria = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.validateToMergeExitCriteria);
  const recordingIntake = readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.focusBatchRecordingIntake);

  const summary = recorded.summary ?? {};
  const currentState = recorded.currentState ?? {};
  const projected = recorded.projectedAfterCurrentFocusAuthorization ?? {};
  const assumedAction = recorded.assumedOwnerAction ?? {};
  const boundary = recorded.boundary ?? {};
  const blockers = recorded.blockersAfterCurrentFocus ?? [];
  const blockerIds = blockers.map((row) => row.id);
  const intakePendingRows = recordingIntake.summary?.pendingRows ?? backlog.summary?.currentFocusRows ?? 0;
  const expectedFocusIds = intakePendingRows > 0
    ? compactBundle.batchAuthorizationRequest?.approvalIds ?? backlog.currentFocusApprovalIds ?? []
    : [];
  const pendingCanonicalRows = ownerReadiness.summary?.pendingCanonicalAuthorizationRows ?? backlog.summary?.pendingCanonicalAuthorizationRows ?? 0;
  const focusRows = intakePendingRows;
  const validAuthorizationRows = ownerReadiness.summary?.validAuthorizationRows ?? 0;
  const heldPolicyApprovalIds = sorted(backlog.heldPolicyApprovalIds ?? []);

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.currentFocusRows ?? -1) !== focusRows) failures.push("summary.currentFocusRows must match backlog");
  if ((summary.pendingCanonicalAuthorizationRows ?? -1) !== pendingCanonicalRows) {
    failures.push("summary.pendingCanonicalAuthorizationRows must match backlog");
  }
  if ((summary.heldRows ?? -1) !== (backlog.summary?.heldRows ?? 0)) failures.push("summary.heldRows must match backlog");
  if ((summary.heldPolicyRows ?? -1) !== heldPolicyApprovalIds.length) failures.push("summary.heldPolicyRows must match backlog policy");
  if ((summary.deferredPhysicalLifecycleRows ?? -1) !== (backlog.summary?.deferredPhysicalLifecycleRows ?? 0)) {
    failures.push("summary.deferredPhysicalLifecycleRows must match backlog");
  }
  if ((currentState.validAuthorizationRows ?? -1) !== validAuthorizationRows) {
    failures.push("currentState.validAuthorizationRows must match owner closure readiness");
  }
  if ((currentState.currentFocusRows ?? -1) !== expectedFocusIds.length) {
    failures.push("currentState.currentFocusRows must match compact request focus IDs");
  }
  if (!sameJson(sorted(currentState.currentFocusApprovalIds), sorted(expectedFocusIds))) {
    failures.push("current focus approval IDs must match compact request/backlog");
  }
  if ((currentState.heldPolicyRows ?? -1) !== heldPolicyApprovalIds.length) failures.push("currentState.heldPolicyRows must match backlog policy");
  if (!sameJson(sorted(currentState.heldPolicyApprovalIds), heldPolicyApprovalIds)) {
    failures.push("currentState held policy approval IDs must match backlog policy");
  }
  if (!sameJson(sorted(assumedAction.approvalIds), sorted(expectedFocusIds))) {
    failures.push("assumed action approval IDs must match compact request/backlog");
  }
  if (assumedAction.selectedFinalState !== "reviewed commit") failures.push("assumed action selectedFinalState must be reviewed commit");
  if (expectedFocusIds.length > 0) {
    for (const approvalId of expectedFocusIds) {
      if (!assumedAction.copyableOwnerReplyTextZh?.includes(approvalId)) {
        failures.push(`assumed owner reply text missing approvalId: ${approvalId}`);
      }
    }
    for (const requiredText of [
      "不授权 cleanup",
      "不授权 deploy",
      "不授权 merge",
      "不授权 destructive git",
      "不授权 physical lifecycle cleanup"
    ]) {
      if (!assumedAction.copyableOwnerReplyTextZh?.includes(requiredText)) {
        failures.push(`assumed owner reply text missing boundary text: ${requiredText}`);
      }
    }
  }

  const expectedProjectedPending = Math.max(0, pendingCanonicalRows - focusRows);
  const expectedProjectedValid = validAuthorizationRows + focusRows;
  if ((projected.projectedPendingCanonicalAuthorizationRows ?? -1) !== expectedProjectedPending) {
    failures.push("projected pending canonical authorization rows must subtract current focus rows");
  }
  if ((summary.projectedPendingCanonicalAuthorizationRows ?? -1) !== expectedProjectedPending) {
    failures.push("summary projected pending canonical authorization rows must match projection");
  }
  if ((projected.projectedValidAuthorizationRows ?? -1) !== expectedProjectedValid) {
    failures.push("projected valid authorization rows must add current focus rows");
  }
  if ((summary.projectedValidAuthorizationRows ?? -1) !== expectedProjectedValid) {
    failures.push("summary projected valid authorization rows must match projection");
  }
  if ((projected.projectedCurrentFocusRows ?? -1) !== 0) failures.push("projected current focus rows must be 0");
  if ((projected.projectedHeldRows ?? -1) !== (backlog.summary?.heldRows ?? 0)) failures.push("projected held rows must remain unchanged");
  if ((projected.projectedHeldPolicyRows ?? -1) !== heldPolicyApprovalIds.length) failures.push("projected held policy rows must remain unchanged");
  if (!sameJson(sorted(projected.projectedHeldPolicyApprovalIds), heldPolicyApprovalIds)) {
    failures.push("projected held policy approval IDs must remain unchanged");
  }
  if ((projected.projectedDeferredPhysicalLifecycleRows ?? -1) !== (backlog.summary?.deferredPhysicalLifecycleRows ?? 0)) {
    failures.push("projected deferred physical lifecycle rows must remain unchanged");
  }
  if (projected.projectedOwnerInputsReady !== false) failures.push("projected owner input readiness must remain false");
  if (projected.projectedValidateExitReady !== false) failures.push("projected validate exit readiness must remain false");
  if (projected.projectedReadyForMerge !== false) failures.push("projected ready-for-merge must remain false");
  if ((projected.projectedCleanupAuthorizedRows ?? 0) !== 0) failures.push("projected cleanup-authorized rows must be 0");
  if ((projected.projectedExecutableRows ?? 0) !== 0) failures.push("projected executable rows must be 0");

  const requiredBlockers = ["merge-not-authorized"];
  if (expectedProjectedPending > 0) requiredBlockers.push("canonical-authorization-backlog");
  if ((backlog.summary?.heldRows ?? 0) > 0) requiredBlockers.push("wave01-resync-hold");
  if ((exitCriteria.summary?.validationHoldBlockers ?? 0) > 0) requiredBlockers.push("validation-hold");
  if (exitCriteria.summary?.releaseSourceClean !== true) requiredBlockers.push("a22-clean-release-source");
  if ((backlog.summary?.deferredPhysicalLifecycleRows ?? 0) > 0) requiredBlockers.push("physical-lifecycle-deferred");
  for (const requiredBlocker of requiredBlockers) {
    if (!blockerIds.includes(requiredBlocker)) failures.push(`missing projected blocker: ${requiredBlocker}`);
  }
  if ((backlog.summary?.heldRows ?? 0) === 0 && blockerIds.includes("wave01-resync-hold")) {
    failures.push("wave01-resync-hold must not be projected without dynamic held rows");
  }
  if ((summary.blockersAfterCurrentFocus ?? -1) !== blockers.length) failures.push("summary.blockersAfterCurrentFocus must match blocker length");
  for (const row of blockers) {
    if (row.mergeAuthorized !== false) failures.push(`${row.id}: mergeAuthorized must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.id}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.id}: executableNow must be false`);
  }

  const validationCommands = recorded.validationCommandsAfterOwnerInput ?? {};
  if ((validationCommands.postInputValidationCommands ?? []).length !== (recordingIntake.postInputValidationCommands ?? []).length) {
    failures.push("post-input validation command list must match recording intake");
  }
  if ((validationCommands.deferredAggregateValidationCommands ?? []).length !== (recordingIntake.deferredAggregateValidationCommands ?? []).length) {
    failures.push("deferred aggregate validation command list must match recording intake");
  }
  if ((validationCommands.postInputValidationCommandRows ?? 0) !== 5) failures.push("expected 5 immediate post-input validation commands");
  if ((validationCommands.deferredAggregateValidationCommandRows ?? 0) !== 8) failures.push("expected 8 deferred aggregate validation commands");

  if (recorded.forecastConclusion?.mergeStillRequiresCleanSource !== true) failures.push("forecast must keep clean-source merge requirement");
  if (recorded.forecastConclusion?.physicalLifecycleStillDeferred !== true) failures.push("forecast must keep physical lifecycle deferred");
  if (exitCriteria.validateExitReady !== false || summary.validateExitReadyNow !== false) {
    failures.push("forecast must reflect blocked validate-to-merge exit");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["dirtyRootDeployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Authorization Transition Forecast",
    "Projected After Current Focus Authorization",
    "Blockers After Current Focus",
    "does not authorize cleanup",
    "does not authorize cleanup, merge, deploy"
  ]) {
    if (!markdown.includes(needle)) failures.push(`authorization transition forecast markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("authorization transition forecast markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    currentFocusRows: summary.currentFocusRows ?? 0,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    projectedPendingCanonicalAuthorizationRows: summary.projectedPendingCanonicalAuthorizationRows ?? 0,
    projectedValidAuthorizationRows: summary.projectedValidAuthorizationRows ?? 0,
    heldRows: summary.heldRows ?? 0,
    deferredPhysicalLifecycleRows: summary.deferredPhysicalLifecycleRows ?? 0,
    blockersAfterCurrentFocus: summary.blockersAfterCurrentFocus ?? 0,
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
    console.log("A25 authorization transition forecast gate");
    console.log(`Current focus rows: ${payload.currentFocusRows ?? 0}`);
    console.log(`Projected pending canonical rows: ${payload.projectedPendingCanonicalAuthorizationRows ?? 0}`);
    console.log(`Blockers after current focus: ${payload.blockersAfterCurrentFocus ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 authorization transition forecast gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
