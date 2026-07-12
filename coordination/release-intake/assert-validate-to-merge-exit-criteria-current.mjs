#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS,
  buildValidateToMergeExitCriteria,
  stableValidateToMergeExitCriteriaProjection
} from "./generate-validate-to-merge-exit-criteria.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-to-merge-exit-criteria-current-gate.json");
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
    VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestJson,
    VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestJson);
  const current = buildValidateToMergeExitCriteria();
  if (!sameJson(
    stableValidateToMergeExitCriteriaProjection(recorded),
    stableValidateToMergeExitCriteriaProjection(current)
  )) {
    failures.push("A25 validate-to-merge exit criteria is stale");
  }

  const handoff = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.validateToMergeHandoff);
  const frontier = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.validateToMergeBlockerFrontier);
  const backlog = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.authorizationBacklogQueue);
  const compactBundle = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.compactRequestBundle);
  const ownerInputAction = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.ownerInputActionPacket);
  const currentCleanup = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.currentCleanupStatus);
  const a22ReleaseSource = readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.a22ReleaseSourceBlocker);

  const summary = recorded.summary ?? {};
  const equation = recorded.exitEquation ?? {};
  const failedMergeChecks = (handoff.mergeChecks ?? []).filter((row) => row.passed !== true);
  const failedIds = failedMergeChecks.map((row) => row.id).sort();
  const failedCriterionIds = (recorded.directCriteria ?? []).filter((row) => row.directValidateExitBlocker).map((row) => row.id).sort();
  const expectedFocusIds = compactBundle.batchAuthorizationRequest?.approvalIds ?? backlog.currentFocusApprovalIds ?? [];

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (!sameJson(failedIds, failedCriterionIds)) failures.push("failed direct criteria must match failed handoff merge checks");
  if (summary.directFailedMergeChecks !== failedMergeChecks.length) failures.push("summary.directFailedMergeChecks must match handoff failed merge checks");
  if (equation.directFailedMergeChecks !== failedMergeChecks.length) failures.push("exitEquation.directFailedMergeChecks must match handoff failed merge checks");
  if (recorded.validateExitReady !== (handoff.readyForMerge === true && failedMergeChecks.length === 0)) {
    failures.push("validateExitReady must match readyForMerge and failed merge-check count");
  }
  if (recorded.validateExitReady === true && recorded.boundary?.mergeAuthorized !== false) {
    failures.push("validateExitReady must not imply merge authorization");
  }
  if (recorded.validateExitReady === false && failedMergeChecks.length === 0) {
    failures.push("blocked validate exit must expose at least one failed merge check");
  }
  if ((summary.currentFocusRows ?? -1) !== (backlog.summary?.currentFocusRows ?? 0)) failures.push("summary.currentFocusRows must match backlog queue");
  if ((summary.pendingCanonicalAuthorizationRows ?? -1) !== (backlog.summary?.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary.pendingCanonicalAuthorizationRows must match backlog queue");
  }
  if ((summary.heldRows ?? -1) !== (backlog.summary?.heldRows ?? 0)) failures.push("summary.heldRows must match backlog queue");
  if ((summary.deferredPhysicalLifecycleRows ?? -1) !== (backlog.summary?.deferredPhysicalLifecycleRows ?? 0)) {
    failures.push("summary.deferredPhysicalLifecycleRows must match backlog queue");
  }
  if ((summary.cleanSourceBlockers ?? -1) !== (frontier.summary?.cleanSourceFrontierRows ?? 0)) {
    failures.push("summary.cleanSourceBlockers must match blocker frontier");
  }
  if (!sameJson(sorted(recorded.currentFocus?.approvalIds), sorted(expectedFocusIds))) {
    failures.push("currentFocus.approvalIds must match compact request/backlog focus IDs");
  }
  for (const approvalId of expectedFocusIds) {
    if (!recorded.currentFocus?.copyableOwnerReplyTextZh?.includes(approvalId)) {
      failures.push(`currentFocus Chinese owner reply text missing ${approvalId}`);
    }
  }
  for (const requiredText of [
    "不授权 cleanup",
    "不授权 deploy",
    "不授权 merge",
    "不授权 destructive git",
    "不授权 physical lifecycle cleanup"
  ]) {
    if ((expectedFocusIds.length ?? 0) > 0 && !recorded.currentFocus?.copyableOwnerReplyTextZh?.includes(requiredText)) {
      failures.push(`currentFocus Chinese owner reply text missing: ${requiredText}`);
    }
  }

  const recordingIntake = ownerInputAction.nextOwnerAuthorizationFocusBatchRecordingIntake ?? {};
  if ((recorded.validationCommands?.postInputValidationCommandRows ?? -1) !== (recordingIntake.postInputValidationCommands ?? []).length) {
    failures.push("postInputValidationCommandRows must match owner input action packet");
  }
  if ((recorded.validationCommands?.deferredAggregateValidationCommandRows ?? -1) !== (recordingIntake.deferredAggregateValidationCommands ?? []).length) {
    failures.push("deferredAggregateValidationCommandRows must match owner input action packet");
  }
  if ((recorded.validationCommands?.postInputValidationCommandRows ?? 0) !== 5) failures.push("expected 5 safe post-input validation commands");
  if ((recorded.validationCommands?.deferredAggregateValidationCommandRows ?? 0) !== 8) failures.push("expected 8 deferred aggregate validation commands");

  const allowedReleaseSources = recorded.a22ReleaseSourceOptions?.allowedReleaseSources ?? [];
  for (const source of ["clean worktree", "clean clone", "reviewed clean release slice", "explicitly owner-approved pruned staging package"]) {
    if (!allowedReleaseSources.includes(source)) failures.push(`missing A22 allowed release source: ${source}`);
  }
  if (recorded.a22ReleaseSourceOptions?.releaseSourceClean !== (a22ReleaseSource.summary?.releaseSourceClean === true)) {
    failures.push("A22 releaseSourceClean must match source evidence");
  }
  if ((recorded.a22ReleaseSourceOptions?.rootStatusEntries ?? -1) !== (a22ReleaseSource.summary?.rootStatusEntries ?? 0)) {
    failures.push("A22 rootStatusEntries must match source evidence");
  }

  if (recorded.downstreamClosureState?.strictLifecycleClean !== (currentCleanup.strictLifecycle?.strictLifecycleClean === true)) {
    failures.push("downstream strictLifecycleClean must match current cleanup snapshot");
  }
  if ((recorded.downstreamClosureState?.dirtyOpenDecisions ?? -1) !== (currentCleanup.strictLifecycle?.dirtyOpenDecisions ?? 0)) {
    failures.push("downstream dirtyOpenDecisions must match current cleanup snapshot");
  }
  if ((recorded.downstreamClosureState?.cleanDivergedOpenDecisions ?? -1) !== (currentCleanup.strictLifecycle?.cleanDivergedOpenDecisions ?? 0)) {
    failures.push("downstream cleanDivergedOpenDecisions must match current cleanup snapshot");
  }

  const blockerRows = recorded.exitBlockerRows ?? [];
  for (const requiredId of [
    "current-focus-batch-not-recorded",
    "canonical-authorization-backlog-not-empty",
    "owner-input-readiness-not-green",
    "validation-hold-not-released",
    "release-source-not-clean",
    "strict-lifecycle-still-deferred",
    "merge-not-authorized",
    "post-input-validation-commands"
  ]) {
    if (!blockerRows.some((row) => row.id === requiredId)) failures.push(`missing exit blocker row: ${requiredId}`);
  }
  for (const row of [...(recorded.directCriteria ?? []), ...blockerRows]) {
    if (row.mergeAuthorized !== false) failures.push(`${row.id}: mergeAuthorized must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.id}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.id}: executableNow must be false`);
  }

  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if ((equation.cleanupAuthorizedRows ?? 0) !== 0) failures.push("exitEquation.cleanupAuthorizedRows must be 0");
  if ((equation.executableRows ?? 0) !== 0) failures.push("exitEquation.executableRows must be 0");
  if (equation.mergeAuthorized !== false) failures.push("exitEquation.mergeAuthorized must be false");

  const boundary = recorded.boundary ?? {};
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

  const markdown = readText(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestMarkdown);
  for (const needle of [
    "Validate-To-Merge Exit Criteria",
    "Exit Equation",
    "Direct Criteria",
    "Current Exit Blockers",
    "Safe Post-Input Validation Commands",
    "A22 Release Source Options",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`exit criteria markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("exit criteria markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    validateExitReady: recorded.validateExitReady === true,
    handoffStatus: recorded.handoffStatus,
    directFailedMergeChecks: summary.directFailedMergeChecks ?? 0,
    currentFocusRows: summary.currentFocusRows ?? 0,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    deferredPhysicalLifecycleRows: summary.deferredPhysicalLifecycleRows ?? 0,
    cleanSourceBlockers: summary.cleanSourceBlockers ?? 0,
    validationHoldBlockers: summary.validationHoldBlockers ?? 0,
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
    console.log("A25 validate-to-merge exit criteria gate");
    console.log(`Validate exit ready: ${payload.validateExitReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 validate-to-merge exit criteria gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
