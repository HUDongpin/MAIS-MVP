#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS,
  buildValidateFrontierOwnerInputRequestCapsule,
  stableValidateFrontierOwnerInputRequestCapsuleProjection
} from "./generate-validate-frontier-owner-input-request-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-frontier-owner-input-request-capsule-current-gate.json");
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

function groupById(groups, id) {
  return (groups ?? []).find((group) => group.id === id) ?? null;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.dirtyMap,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.validateToMergeBlockerFrontier,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.validateToMergeExitCriteria,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.compactRequestBundle,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.canonicalPreview,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerActionPacket,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerActionAcceptanceDocket,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22SelectedActionCanonicalPreview,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerInputLandingRunway,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationDryRun,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationCurrentGate,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestJson,
    VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.dirtyMap);
  const recorded = readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestJson);
  const current = buildValidateFrontierOwnerInputRequestCapsule();
  if (!sameJson(
    stableValidateFrontierOwnerInputRequestCapsuleProjection(recorded),
    stableValidateFrontierOwnerInputRequestCapsuleProjection(current)
  )) {
    failures.push("A25/A22 validate frontier owner input request capsule is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const groups = recorded.ownerInputGroups ?? [];
  const ownerPackageGroup = groupById(groups, "owner-package-canonical-authorization-focus-batch");
  const a22Group = groupById(groups, "a22-root-parity-selected-actions");
  const checks = recorded.checks ?? [];
  const a22CandidateMutationDryRun = readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationDryRun);
  const a22CandidateMutationCurrentGate = readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationCurrentGate);
  const ownerPackageFocusConsumed = (summary.ownerPackageFocusBatchPendingRows ?? -1) === 0 &&
    ownerPackageGroup?.status === "no-pending-focus-rows";
  const ownerPackageFocusWaiting = (summary.ownerPackageFocusBatchPendingRows ?? -1) > 0 &&
    ownerPackageGroup?.status === "ready-for-owner-review";
  const expectedTotalFrontierOwnerRows =
    (summary.ownerPackageFocusBatchPendingRows ?? 0) +
    (summary.a22SelectedActionRows ?? 0);
  const a22SelectedActionsRecorded = (summary.a22AcceptedSelectedActionRows ?? -1) === 4 &&
    summary.a22SelectedActionPreviewStatus === "owner-approved-waiting-candidate-mutation" &&
    summary.a22OwnerInputLandingRunwayStatus === "owner-input-recorded-post-runway";
  const a22SelectedActionsPostExtractionVerified = (summary.a22AcceptedSelectedActionRows ?? -1) === 4 &&
    summary.a22SelectedActionPreviewStatus === "owner-approved-post-extraction-verified-check-remediation" &&
    summary.a22OwnerInputLandingRunwayStatus === "owner-input-recorded-post-runway";
  const a22SelectedActionsWaiting = (summary.a22AcceptedSelectedActionRows ?? -1) === 0 &&
    summary.a22SelectedActionPreviewStatus === "ready-for-owner-review" &&
    summary.a22OwnerInputLandingRunwayStatus === "ready-for-owner-input-landing-review";
  const a22SelectedActionsResolved = a22SelectedActionsRecorded || a22SelectedActionsPostExtractionVerified;

  if (recorded.capsuleKind !== "validate-frontier-owner-input-request") failures.push("capsuleKind is invalid");
  if (recorded.capsuleStatus !== "waiting-for-owner-frontier-input") failures.push("capsuleStatus must be waiting-for-owner-frontier-input");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("capsule dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("capsule expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.ownerInputGroups ?? -1) !== 2) failures.push("summary.ownerInputGroups must be 2");
  if (!ownerPackageFocusConsumed && !ownerPackageFocusWaiting) failures.push("summary.ownerPackageFocusBatchPendingRows/status must be either ready-for-owner-review with pending rows or 0 consumed rows");
  if ((summary.ownerPackageFocusBatchAcceptedRows ?? -1) !== 0) failures.push("summary.ownerPackageFocusBatchAcceptedRows must be 0");
  if ((summary.a22SelectedActionRows ?? -1) !== 4) failures.push("summary.a22SelectedActionRows must be 4");
  if (!a22SelectedActionsResolved && !a22SelectedActionsWaiting) {
    failures.push("A22 selectedAction summary must be either waiting for owner review, recorded and waiting for candidate mutation, or post-extraction verified");
  }
  if (![
    "ready-for-owner-review",
    "owner-approved-waiting-candidate-mutation",
    "owner-approved-post-extraction-verified-check-remediation"
  ].includes(summary.a22SelectedActionPreviewStatus)) {
    failures.push("summary.a22SelectedActionPreviewStatus is invalid");
  }
  if (!["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(summary.a22OwnerInputLandingRunwayStatus)) {
    failures.push("summary.a22OwnerInputLandingRunwayStatus is invalid");
  }
  if (a22SelectedActionsWaiting && summary.a22OwnerInputBlank !== true) failures.push("summary.a22OwnerInputBlank must be true before selectedAction owner input is recorded");
  if (a22SelectedActionsResolved && summary.a22OwnerInputBlank !== false) failures.push("summary.a22OwnerInputBlank must be false after selectedAction owner input is recorded");
  if ((summary.a22PostOwnerInputValidationCommandRows ?? -1) !== 8) {
    failures.push("summary.a22PostOwnerInputValidationCommandRows must be 8");
  }
  if (a22SelectedActionsPostExtractionVerified) {
    if ((summary.a22CandidateTargetsMissing ?? -1) !== 0) failures.push("summary.a22CandidateTargetsMissing must be 0 after post-extraction verification");
    if ((summary.a22CandidateTargetsVerified ?? -1) !== 4) failures.push("summary.a22CandidateTargetsVerified must be 4 after post-extraction verification");
  } else if ((summary.a22CandidateTargetsMissing ?? -1) !== 4) {
    failures.push("summary.a22CandidateTargetsMissing must be 4 before extraction");
  }
  if (!["dry-run-blocked-missing-recorded-instructions", "dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(summary.a22CandidateMutationExecutorStatus)) {
    failures.push("summary.a22CandidateMutationExecutorStatus is invalid");
  }
  if (a22SelectedActionsWaiting && (summary.a22CandidateMutationRecordedInstructionRows ?? -1) !== 0) {
    failures.push("summary.a22CandidateMutationRecordedInstructionRows must be 0 before selectedAction owner input is recorded");
  }
  if (a22SelectedActionsResolved && (summary.a22CandidateMutationRecordedInstructionRows ?? -1) !== 4) {
    failures.push("summary.a22CandidateMutationRecordedInstructionRows must be 4 after selectedAction owner input is recorded");
  }
  if (summary.a22CandidateMutationApplyPermitted !== false) {
    failures.push("summary.a22CandidateMutationApplyPermitted must be false");
  }
  if ((summary.a22CandidateMutationRows ?? -1) !== 0) failures.push("summary.a22CandidateMutationRows must be 0");
  if ((summary.a22CandidateMutationCurrentGateFailures ?? -1) !== 0) {
    failures.push("summary.a22CandidateMutationCurrentGateFailures must be 0");
  }
  if ((summary.totalFrontierOwnerRows ?? -1) !== expectedTotalFrontierOwnerRows) {
    failures.push("summary.totalFrontierOwnerRows must match owner-package pending rows plus A22 selectedAction rows");
  }
  if (summary.validateExitReady !== false) failures.push("summary.validateExitReady must be false");
  if (summary.readyForMerge !== false) failures.push("summary.readyForMerge must be false");
  if (count(summary.directFailedMergeChecks) <= 0) failures.push("summary.directFailedMergeChecks must remain positive");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("summary.failedChecks must be 0");
  if ((summary.passingChecks ?? -1) !== checks.filter((row) => row.status === "pass").length) {
    failures.push("summary.passingChecks must match checks");
  }

  if (!ownerPackageGroup) failures.push("missing owner-package canonical authorization focus group");
  if (ownerPackageGroup && ownerPackageGroup.pendingRows !== (summary.ownerPackageFocusBatchPendingRows ?? -1)) {
    failures.push("owner-package group pendingRows must match summary.ownerPackageFocusBatchPendingRows");
  }
  if (ownerPackageGroup && ownerPackageGroup.acceptedRows !== 0) failures.push("owner-package group acceptedRows must be 0");
  if (ownerPackageFocusWaiting && ownerPackageGroup && !String(ownerPackageGroup.copyableOwnerReplyTextZh ?? "").includes("不授权 cleanup")) {
    failures.push("owner-package group must include copyable Chinese owner reply text with cleanup boundary");
  }
  if (!a22Group) failures.push("missing A22 root-parity selected action group");
  if (a22Group && (a22SelectedActionsWaiting ? a22Group.pendingRows !== 4 : a22Group.pendingRows !== 0)) failures.push(a22SelectedActionsWaiting ? "A22 group pendingRows must be 4" : "A22 group pendingRows must be 0 after selectedAction owner input is recorded");
  if (a22Group && (a22SelectedActionsWaiting ? a22Group.acceptedRows !== 0 : a22Group.acceptedRows !== 4)) failures.push(a22SelectedActionsWaiting ? "A22 group acceptedRows must be 0" : "A22 group acceptedRows must be 4 after selectedAction owner input is recorded");
  if (a22Group && !["ready-for-owner-review", "owner-approved-waiting-candidate-mutation", "owner-approved-post-extraction-verified-check-remediation"].includes(a22Group.previewStatus)) failures.push("A22 group previewStatus is invalid");
  if (a22Group && (a22Group.approvalIds ?? []).length !== 4) failures.push("A22 group must include 4 approvalIds");
  if (a22Group && (a22Group.recommendedSelectedActions ?? []).length !== 4) {
    failures.push("A22 group must include 4 recommended selectedAction rows");
  }
  if (a22Group && !["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(a22Group.runwayStatus)) {
    failures.push("A22 group runwayStatus is invalid");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.ownerInputBlank !== true) failures.push("A22 group ownerInputBlank must be true before selectedAction owner input is recorded");
  if (a22Group && a22SelectedActionsResolved && a22Group.ownerInputBlank !== false) failures.push("A22 group ownerInputBlank must be false after selectedAction owner input is recorded");
  if (a22Group && a22Group.landingPatchRows !== 4) failures.push("A22 group landingPatchRows must be 4");
  if (a22Group && a22Group.postOwnerInputValidationCommandRows !== 8) {
    failures.push("A22 group postOwnerInputValidationCommandRows must be 8");
  }
  if (a22Group && a22SelectedActionsPostExtractionVerified) {
    if (a22Group.candidateTargetsMissing !== 0) failures.push("A22 group candidateTargetsMissing must be 0 after post-extraction verification");
    if (a22Group.candidateTargetsVerified !== 4) failures.push("A22 group candidateTargetsVerified must be 4 after post-extraction verification");
  } else if (a22Group && a22Group.candidateTargetsMissing !== 4) {
    failures.push("A22 group candidateTargetsMissing must be 4 before extraction");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.instructionIntakeStatus !== "waiting-for-owner-input") {
    failures.push("A22 group instructionIntakeStatus must wait for owner input before selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsResolved && !["ready-to-record-extraction-instruction-rows", "already-recorded"].includes(a22Group.instructionIntakeStatus)) {
    failures.push("A22 group instructionIntakeStatus must reflect recorded selectedAction owner input");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.instructionRecordingStatus !== "dry-run-blocked-owner-input") {
    failures.push("A22 group instructionRecordingStatus must be dry-run-blocked-owner-input before selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsResolved && !["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(a22Group.instructionRecordingStatus)) {
    failures.push("A22 group instructionRecordingStatus must reflect recorded selectedAction owner input");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.guardedExtractionStatus !== "dry-run-blocked-missing-recorded-instructions") {
    failures.push("A22 group guardedExtractionStatus must block missing recorded instructions before selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsResolved && !["dry-run-ready-requires-explicit-apply", "already-extracted-and-verified", "dry-run-blocked-missing-recorded-instructions"].includes(a22Group.guardedExtractionStatus)) {
    failures.push("A22 group guardedExtractionStatus must remain guarded after selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.candidateMutationExecutorStatus !== "dry-run-blocked-missing-recorded-instructions") {
    failures.push("A22 group candidateMutationExecutorStatus must block missing recorded instructions before selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsRecorded && a22Group.candidateMutationExecutorStatus !== "dry-run-blocked-owner-candidate-mutation-input") {
    failures.push("A22 group candidateMutationExecutorStatus must wait for candidate mutation owner input after selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsPostExtractionVerified && a22Group.candidateMutationExecutorStatus !== "already-extracted-and-verified") {
    failures.push("A22 group candidateMutationExecutorStatus must be already-extracted-and-verified after post-extraction verification");
  }
  if (a22Group && !a22SelectedActionsPostExtractionVerified && a22Group.candidateMutationOwnerInputBlank !== true) {
    failures.push("A22 group candidateMutationOwnerInputBlank must be true");
  }
  if (a22Group && a22Group.candidateMutationExpectedRows !== 4) {
    failures.push("A22 group candidateMutationExpectedRows must be 4");
  }
  if (a22Group && a22SelectedActionsWaiting && a22Group.candidateMutationRecordedInstructionRows !== 0) {
    failures.push("A22 group candidateMutationRecordedInstructionRows must be 0 before selectedAction owner input is recorded");
  }
  if (a22Group && a22SelectedActionsResolved && a22Group.candidateMutationRecordedInstructionRows !== 4) {
    failures.push("A22 group candidateMutationRecordedInstructionRows must be 4 after selectedAction owner input is recorded");
  }
  if (a22Group && a22Group.candidateMutationApplyPermitted !== false) {
    failures.push("A22 group candidateMutationApplyPermitted must be false");
  }
  if (a22Group && a22Group.candidateMutationRootCopyRows !== 0) {
    failures.push("A22 group candidateMutationRootCopyRows must be 0");
  }
  if (a22Group && a22Group.candidateMutationRows !== 0) {
    failures.push("A22 group candidateMutationRows must be 0");
  }
  if (a22Group && a22Group.candidateMutationCurrentGateFailures !== 0) {
    failures.push("A22 group candidateMutationCurrentGateFailures must be 0");
  }
  if (a22Group && !String(a22Group.copyableOwnerReplyTextZh ?? "").includes("approvalIds=a06-visualization-back-to-top-import-parity")) {
    failures.push("A22 group must include compact copyable owner reply text");
  }
  if (a22Group && !String(a22Group.ownerExecutionTextRequired ?? "").includes("selectedAction=reexport")) {
    failures.push("A22 group must include exact owner execution text with selectedAction values");
  }
  if (!groups.every((group) =>
    group.cleanupAuthorized === false &&
    group.executableNow === false &&
    group.mergeAuthorized === false &&
    group.deployAuthorized === false &&
    group.physicalLifecycleCleanupAuthorized === false
  )) {
    failures.push("all owner input groups must remain non-executable and non-cleanup");
  }

  for (const requiredCheck of [
    "source-current",
    "validate-frontier-visible",
    "validate-exit-still-blocked",
    "owner-package-focus-ready-for-owner-review",
    "a22-selected-actions-waiting-for-owner",
    "a22-owner-input-landing-runway-ready",
    "a22-candidate-mutation-dry-run-current",
    "frontier-groups-non-executable"
  ]) {
    const row = checks.find((check) => check.id === requiredCheck);
    if (!row) failures.push(`missing check: ${requiredCheck}`);
    if (row && row.status !== "pass") failures.push(`check must pass: ${requiredCheck}`);
  }

  for (const requiredCommand of [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs"
  ]) {
    if (!(recorded.safePostOwnerInputValidationCommands ?? []).includes(requiredCommand)) {
      failures.push(`missing safe post-owner-input validation command: ${requiredCommand}`);
    }
  }
  if ((recorded.safePostOwnerInputValidationCommands ?? []).length < 14) {
    failures.push("safePostOwnerInputValidationCommands must include A25 plus A22 validation chains");
  }
  if (!["dry-run-blocked-missing-recorded-instructions", "dry-run-blocked-owner-candidate-mutation-input", "already-extracted-and-verified"].includes(a22CandidateMutationDryRun.executorStatus)) {
    failures.push("A22 candidate mutation dry-run source executorStatus is invalid");
  }
  if (a22SelectedActionsWaiting && (a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation dry-run source recordedInstructionRows must be 0 before selectedAction owner input is recorded");
  }
  if (a22SelectedActionsResolved && (a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? -1) !== 4) {
    failures.push("A22 candidate mutation dry-run source recordedInstructionRows must be 4 after selectedAction owner input is recorded");
  }
  if ((a22CandidateMutationDryRun.summary?.applyPermitted ?? true) !== false) {
    failures.push("A22 candidate mutation dry-run source applyPermitted must be false");
  }
  if ((a22CandidateMutationDryRun.summary?.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation dry-run source candidateMutationRows must be 0");
  }
  if ((a22CandidateMutationDryRun.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation dry-run source executableRows must be 0");
  }
  if ((a22CandidateMutationCurrentGate.failures ?? []).length !== 0) {
    failures.push("A22 candidate mutation current gate failures must be 0");
  }
  if ((a22CandidateMutationCurrentGate.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation current gate candidateMutationRows must be 0");
  }
  if ((a22CandidateMutationCurrentGate.executableRows ?? -1) !== 0) {
    failures.push("A22 candidate mutation current gate executableRows must be 0");
  }

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
    ["requiresOwnerReply", true],
    ["requiresSeparateRecordingStep", true],
    ["requiresSeparateCandidateMutationInstruction", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestMarkdown);
  for (const needle of [
    "A25/A22 Validate Frontier Owner Input Request Capsule",
    "Owner-package canonical authorization focus batch",
    "A22 root-parity selectedAction owner input",
    "A22 owner-input landing runway status",
    "A22 candidate-mutation executor status",
    "Candidate mutation executor status",
    "Post-owner-input validation commands: 8",
    "Compact approval text",
    "approvalIds=a06-visualization-back-to-top-import-parity",
    "Safe Post-Owner-Input Validation Commands",
    "Records authorization: false",
    "Records owner input: false",
    "Merge authorized: false",
    "Cleanup authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`capsule markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("capsule markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    capsuleStatus: recorded.capsuleStatus,
    ownerInputGroups: summary.ownerInputGroups ?? 0,
    totalFrontierOwnerRows: summary.totalFrontierOwnerRows ?? 0,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
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
    console.log("A25/A22 validate frontier owner input request capsule gate");
    console.log(`Capsule status: ${payload.capsuleStatus ?? "unknown"}`);
    console.log(`Owner input groups: ${payload.ownerInputGroups ?? 0}`);
    console.log(`Total frontier owner rows: ${payload.totalFrontierOwnerRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25/A22 validate frontier owner input request capsule gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
