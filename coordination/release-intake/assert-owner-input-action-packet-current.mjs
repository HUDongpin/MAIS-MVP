#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  OWNER_INPUT_ACTION_PACKET_PATHS,
  buildOwnerInputActionPacket,
  stableOwnerInputActionPacketProjection
} from "./generate-owner-input-action-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-input-action-packet-current-gate.json");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    OWNER_INPUT_ACTION_PACKET_PATHS.latestJson,
    OWNER_INPUT_ACTION_PACKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures, ownerInputsReady: false });

  const recorded = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.latestJson);
  const current = buildOwnerInputActionPacket();
  if (!sameJson(stableOwnerInputActionPacketProjection(recorded), stableOwnerInputActionPacketProjection(current))) {
    failures.push("A25 owner input action packet is stale");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.contentCaptured !== false) failures.push("boundary.contentCaptured must be false");

  if ((recorded.summary?.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((recorded.requiredInputs ?? []).length === 0) failures.push("requiredInputs must not be empty");
  if (recorded.criticalPath?.status !== "waiting-for-owner-input") failures.push("criticalPath.status must be waiting-for-owner-input");
  if ((recorded.criticalPath?.targetInputFiles ?? []).length !== 3) failures.push("criticalPath.targetInputFiles must contain three owner input files");
  if ((recorded.criticalPath?.priorityOrder ?? []).length !== 5) failures.push("criticalPath.priorityOrder must contain five priority rows");
  const wave01Priority = (recorded.criticalPath?.priorityOrder ?? []).find((row) => row.id === "wave01-package-resync-approvals");
  if ((wave01Priority?.exactCommands ?? []).length !== (wave01Priority?.authorizableRows ?? 0)) {
    failures.push("criticalPath Wave 01 priority exact command rows must match authorizable Wave 01 rows");
  }
  if ((wave01Priority?.approvalIds ?? []).length !== (wave01Priority?.authorizableRows ?? 0)) {
    failures.push("criticalPath Wave 01 priority approval ids must match authorizable Wave 01 rows");
  }
  const noCurrentWave01Rows = (wave01Priority?.rows ?? 0) === 0;
  if (!noCurrentWave01Rows && (wave01Priority?.heldApprovalIds ?? []).includes("wave01-resync-01-tsconfig-json") !== true) {
    failures.push("criticalPath Wave 01 priority must keep wave01-resync-01-tsconfig-json held");
  }
  if (noCurrentWave01Rows && (wave01Priority?.heldApprovalIds ?? []).length !== 0) {
    failures.push("criticalPath Wave 01 priority must not expose stale dynamic held rows when no Wave01 row remains");
  }
  if ((wave01Priority?.approvalIds ?? []).includes("wave01-resync-01-tsconfig-json")) {
    failures.push("held wave01-resync-01-tsconfig-json must not be in criticalPath approvalIds");
  }
  if ((wave01Priority?.exactCommands ?? []).some((row) => row.approvalId === "wave01-resync-01-tsconfig-json")) {
    failures.push("held wave01-resync-01-tsconfig-json must not be in criticalPath exactCommands");
  }
  if ((wave01Priority?.heldCommands ?? []).length !== (wave01Priority?.heldRows ?? 0)) {
    failures.push("criticalPath Wave 01 held command rows must match heldRows");
  }
  if ((recorded.criticalPath?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("criticalPath.cleanupAuthorizedRows must be 0");
  if ((recorded.criticalPath?.executableRows ?? 0) !== 0) failures.push("criticalPath.executableRows must be 0");
  if ((recorded.summary?.criticalPathPriorityRows ?? 0) !== (recorded.criticalPath?.priorityOrder ?? []).length) {
    failures.push("summary.criticalPathPriorityRows must match criticalPath.priorityOrder length");
  }
  const focusBatch = recorded.nextOwnerAuthorizationFocusBatch ?? {};
  if (!["waiting-for-owner-authorization", "batch-authorized-non-executable", "no-focus-batch"].includes(focusBatch.batchStatus)) {
    failures.push("nextOwnerAuthorizationFocusBatch.batchStatus must be a recognized non-executable state");
  }
  const noCurrentFocusBatch = focusBatch.batchStatus === "no-focus-batch" && (focusBatch.focusBatchRows ?? 0) === 0;
  if (!noCurrentFocusBatch && (focusBatch.focusBatchRows ?? 0) <= 0) failures.push("nextOwnerAuthorizationFocusBatch must expose at least one focus row");
  if ((focusBatch.acceptedRows ?? 0) + (focusBatch.pendingRows ?? 0) !== (focusBatch.focusBatchRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatch acceptedRows + pendingRows must equal focusBatchRows");
  }
  if ((focusBatch.heldRows ?? 0) !== (focusBatch.heldApprovalIds ?? []).length) {
    failures.push("nextOwnerAuthorizationFocusBatch dynamic held rows must match heldApprovalIds");
  }
  if (!sameJson(focusBatch.heldPolicyApprovalIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("nextOwnerAuthorizationFocusBatch held policy must preserve only wave01-resync-01-tsconfig-json");
  }
  if ((focusBatch.cleanupAuthorizedRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatch.cleanupAuthorizedRows must be 0");
  if ((focusBatch.executableRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatch.executableRows must be 0");
  if ((focusBatch.requiredAuthorizationTexts ?? []).length !== (focusBatch.pendingRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatch.requiredAuthorizationTexts must match pendingRows");
  }
  for (const row of focusBatch.requiredAuthorizationTexts ?? []) {
    if (!row.approvalId) failures.push("nextOwnerAuthorizationFocusBatch requiredAuthorizationText row missing approvalId");
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} requiredAuthorizationText must include the approval ID`);
    }
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRows ?? 0) !== (focusBatch.focusBatchRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRows must match focus batch rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchPendingRows ?? 0) !== (focusBatch.pendingRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchPendingRows must match focus batch pending rows");
  }
  if (recorded.summary?.nextOwnerAuthorizationFocusBatchStatus !== focusBatch.batchStatus) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchStatus must match focus batch status");
  }
  const focusBatchOwnerInput = recorded.nextOwnerAuthorizationFocusBatchOwnerInput ?? {};
  if (!["waiting-for-owner-authorization", "batch-authorized-non-executable", "no-focus-batch"].includes(focusBatchOwnerInput.batchStatus)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.batchStatus must be a recognized non-executable state");
  }
  const ownerInputCarriesPostInputEvidence = noCurrentFocusBatch &&
    (focusBatchOwnerInput.focusBatchRows ?? 0) >= 0 &&
    (focusBatchOwnerInput.pendingRows ?? 0) === 0 &&
    (focusBatchOwnerInput.acceptedRows ?? 0) === (focusBatchOwnerInput.focusBatchRows ?? 0);
  if (!ownerInputCarriesPostInputEvidence && (focusBatchOwnerInput.focusBatchRows ?? 0) !== (focusBatch.focusBatchRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.focusBatchRows must match focus batch rows");
  }
  if (!ownerInputCarriesPostInputEvidence && (focusBatchOwnerInput.acceptedRows ?? 0) !== (focusBatch.acceptedRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.acceptedRows must match focus batch accepted rows");
  }
  if (!ownerInputCarriesPostInputEvidence && (focusBatchOwnerInput.pendingRows ?? 0) !== (focusBatch.pendingRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.pendingRows must match focus batch pending rows");
  }
  if ((focusBatchOwnerInput.heldRows ?? 0) !== (focusBatch.heldRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput dynamic held rows must match focus batch");
  }
  if (!sameJson(focusBatchOwnerInput.heldPolicyApprovalIds, focusBatch.heldPolicyApprovalIds)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput held policy must match focus batch");
  }
  if ((focusBatchOwnerInput.ownerInputVisibleRows ?? 0) !== (focusBatchOwnerInput.focusBatchRows ?? 0)) {
    failures.push("all focus batch rows must be visible in owner input scaffold");
  }
  if ((focusBatchOwnerInput.visibilityRows ?? []).length !== (focusBatchOwnerInput.focusBatchRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.visibilityRows must match focusBatchRows");
  }
  if ((focusBatchOwnerInput.cleanupAuthorizedRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.cleanupAuthorizedRows must be 0");
  if ((focusBatchOwnerInput.executableRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.executableRows must be 0");
  if ((focusBatchOwnerInput.sourceCurrentnessFailures ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchOwnerInput.sourceCurrentnessFailures must be 0");
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows ?? 0) !== (focusBatchOwnerInput.ownerInputVisibleRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows must match owner input visibility rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchCanonicalDraftVisibleRows ?? 0) !== (focusBatchOwnerInput.canonicalDraftVisibleRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchCanonicalDraftVisibleRows must match owner input visibility rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchCanonicalAuthorizationVisibleRows ?? 0) !== (focusBatchOwnerInput.canonicalAuthorizationVisibleRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchCanonicalAuthorizationVisibleRows must match owner input visibility rows");
  }
  for (const row of focusBatchOwnerInput.visibilityRows ?? []) {
    if (!row.approvalId) failures.push("nextOwnerAuthorizationFocusBatchOwnerInput visibility row missing approvalId");
    if (!row.canonicalDraftRowPresent && !row.canonicalRowPresent) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} must be visible in canonical draft or accepted rows`);
    }
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} visibility requiredAuthorizationText must include approval ID`);
    }
    if (row.recommendedAuthorizationText && !row.recommendedAuthorizationText.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} visibility recommendedAuthorizationText must include approval ID`);
    }
    if (row.ledgerSelectedFinalState && !row.recommendedAuthorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} visibility recommendedAuthorizationText must include ledger selected final state`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId} visibility row must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId} visibility row must not be executable`);
  }
  const recordingIntake = recorded.nextOwnerAuthorizationFocusBatchRecordingIntake ?? {};
  if (![
    "waiting-for-owner-authorization",
    "ready-for-post-input-validation",
    "not-ready-source-stale",
    "no-focus-batch",
    "not-ready-invalid-focus-batch",
    "not-ready-unsafe-authorization",
    "not-ready-missing-owner-input-visibility",
    "not-ready-check-failures"
  ].includes(recordingIntake.intakeStatus)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.intakeStatus must be a recognized intake state");
  }
  const recordingIntakeCarriesPostInputEvidence = noCurrentFocusBatch &&
    recordingIntake.intakeStatus === "ready-for-post-input-validation" &&
    (recordingIntake.pendingRows ?? 0) === 0 &&
    (recordingIntake.acceptedRows ?? 0) === (recordingIntake.focusBatchRows ?? 0);
  if (!recordingIntakeCarriesPostInputEvidence && (recordingIntake.focusBatchRows ?? 0) !== (focusBatch.focusBatchRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.focusBatchRows must match focus batch rows");
  }
  if (!recordingIntakeCarriesPostInputEvidence && (recordingIntake.acceptedRows ?? 0) !== (focusBatch.acceptedRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.acceptedRows must match focus batch accepted rows");
  }
  if (!recordingIntakeCarriesPostInputEvidence && (recordingIntake.pendingRows ?? 0) !== (focusBatch.pendingRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.pendingRows must match focus batch pending rows");
  }
  if ((recordingIntake.heldRows ?? 0) !== (focusBatch.heldRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.heldRows must match focus batch held rows");
  }
  if ((recordingIntake.ownerInputVisibleRows ?? 0) !== (focusBatchOwnerInput.ownerInputVisibleRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.ownerInputVisibleRows must match owner input visibility rows");
  }
  if ((recordingIntake.rows ?? []).length !== (recordingIntake.focusBatchRows ?? 0)) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.rows must match focusBatchRows");
  }
  if ((recordingIntake.checks ?? []).length === 0) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.checks must not be empty");
  if ((recordingIntake.failedChecks ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.failedChecks must be 0");
  if ((recordingIntake.checks ?? []).some((row) => row.status !== "pass")) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake checks must all pass");
  }
  if ((recordingIntake.cleanupAuthorizedRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.cleanupAuthorizedRows must be 0");
  if ((recordingIntake.executableRows ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.executableRows must be 0");
  if ((recordingIntake.sourceCurrentnessFailures ?? 0) !== 0) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake.sourceCurrentnessFailures must be 0");
  if ((recordingIntake.postInputValidationCommandRows ?? 0) !== (recorded.nextValidationCommands ?? []).length) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake post-input validation command rows must match nextValidationCommands");
  }
  if ((recordingIntake.deferredAggregateValidationCommandRows ?? 0) !== (recorded.deferredValidationCommands ?? []).length) {
    failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake deferred aggregate validation command rows must match deferredValidationCommands");
  }
  for (const row of recordingIntake.rows ?? []) {
    if (!row.approvalId) failures.push("nextOwnerAuthorizationFocusBatchRecordingIntake row missing approvalId");
    if (!row.canonicalDraftRowPresent && !row.canonicalRowPresent) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} recording intake row must be visible in draft or canonical input`);
    }
    if (row.recommendedAuthorizationText && !row.recommendedAuthorizationText.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} recording intake recommendedAuthorizationText must include approval ID`);
    }
    if (row.ledgerSelectedFinalState && !row.recommendedAuthorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} recording intake recommendedAuthorizationText must include ledger selected final state`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId} recording intake row must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId} recording intake row must not be executable`);
  }
  if (recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakeStatus !== recordingIntake.intakeStatus) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakeStatus must match recording intake status");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakeAcceptedRows ?? 0) !== (recordingIntake.acceptedRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakeAcceptedRows must match recording intake accepted rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows ?? 0) !== (recordingIntake.pendingRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows must match recording intake pending rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakeOwnerInputVisibleRows ?? 0) !== (recordingIntake.ownerInputVisibleRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakeOwnerInputVisibleRows must match recording intake visible rows");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks ?? 0) !== (recordingIntake.failedChecks ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks must match recording intake failed checks");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakePostInputValidationCommands ?? 0) !== (recordingIntake.postInputValidationCommandRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakePostInputValidationCommands must match recording intake validation commands");
  }
  if ((recorded.summary?.nextOwnerAuthorizationFocusBatchRecordingIntakeDeferredAggregateValidationCommands ?? 0) !== (recordingIntake.deferredAggregateValidationCommandRows ?? 0)) {
    failures.push("summary.nextOwnerAuthorizationFocusBatchRecordingIntakeDeferredAggregateValidationCommands must match recording intake deferred commands");
  }
  if ((recorded.authorizationGroups ?? []).length === 0) failures.push("authorizationGroups must not be empty");
  const pendingOwnerBlockerReports = recorded.pendingOwnerBlockerReports ?? [];
  if (pendingOwnerBlockerReports.length !== (recorded.summary?.pendingOwnerBlockerReports ?? 0)) {
    failures.push("pendingOwnerBlockerReports length must match summary.pendingOwnerBlockerReports");
  }
  if (pendingOwnerBlockerReports.length !== (recorded.summary?.pendingOwnerBlockerReportRecords ?? 0)) {
    failures.push("pendingOwnerBlockerReports length must match summary.pendingOwnerBlockerReportRecords");
  }
  for (const row of pendingOwnerBlockerReports) {
    for (const field of ["reportId", "agentId", "recommendedWorktree", "firstCheckCommand", "nextAction", "template"]) {
      if (!row[field]) failures.push(`pending owner blocker report ${row.reportId ?? "(missing reportId)"} missing ${field}`);
    }
    if (row.cleanupAuthorized === true) failures.push(`pending owner blocker report ${row.reportId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`pending owner blocker report ${row.reportId} must not be executable`);
  }
  const remainingCompletionAssignments = recorded.decisionFocus?.remainingCompletionAssignments ?? [];
  if (remainingCompletionAssignments.length !== 5) failures.push("decisionFocus.remainingCompletionAssignments must contain five rows");
  for (const row of remainingCompletionAssignments) {
    if (!row.assignmentId) failures.push("remaining completion assignment missing assignmentId");
    if (!Array.isArray(row.nextActions) || row.nextActions.length === 0) {
      failures.push(`remaining completion assignment ${row.assignmentId ?? "(missing assignmentId)"} missing nextActions`);
    }
    if (!Array.isArray(row.blockerSummaries) || row.blockerSummaries.length !== (row.blockerRows ?? 0)) {
      failures.push(`remaining completion assignment ${row.assignmentId ?? "(missing assignmentId)"} blockerSummaries must match blockerRows`);
    }
    if (row.cleanupAuthorized === true) failures.push(`remaining completion assignment ${row.assignmentId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`remaining completion assignment ${row.assignmentId} must not be executable`);
  }
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validationHold.status must wait for owner compose deletion confirmation");
  }
  if (recorded.validationHold?.activeWorktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628") {
    failures.push("validationHold.activeWorktreePath must name the owner-active compose worktree");
  }
  if ((recorded.nextValidationCommands ?? []).length !== 5) failures.push("nextValidationCommands must contain five safe post-input commands");
  if ((recorded.deferredValidationCommands ?? []).length !== 8) failures.push("deferredValidationCommands must contain eight aggregate commands");
  if ((recorded.nextValidationCommands ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence") || command.includes("refresh-linked-worktree-archive-evidence"))) {
    failures.push("nextValidationCommands must not include linked or aggregate refresh commands while validationHold is active");
  }
  for (const needle of [
    "refresh-linked-worktree-archive-evidence.mjs",
    "generate-wave06-final-root-lifecycle-readiness.mjs",
    "refresh-dirty-worktree-remediation-evidence.mjs",
    "generate-dirty-worktree-remediation-completion-audit.mjs"
  ]) {
    if (!(recorded.deferredValidationCommands ?? []).some((command) => command.includes(needle))) {
      failures.push(`deferredValidationCommands missing ${needle}`);
    }
  }

  const markdown = readText(OWNER_INPUT_ACTION_PACKET_PATHS.latestMarkdown);
  for (const needle of [
    "does not create the authorization file",
    "does not authorize staging",
    "Owner inputs ready",
    "Critical Path Owner Response",
    "Wave 01 exact authorization text options",
    "Wave 01 held rows",
    "Next Owner Authorization Focus Batch",
    "Exact authorization text rows",
    "Ledger-backed recommended authorization text rows",
    "Canonical owner-input visibility",
    "Owner-input visible rows",
    "Recording intake checkpoint",
    "Focus batch recording intake status",
    "Post-input validation command rows",
    "wave01-resync-01-tsconfig-json",
    "Next action",
    "Remaining Completion Assignments",
    "Post-Input Validation Commands",
    "Deferred Aggregate Validation Commands",
    "waiting-for-owner-compose-deletion-confirmation"
  ]) {
    if (!markdown.includes(needle)) failures.push(`owner input action packet markdown missing text: ${needle}`);
  }
  if (!markdown.includes("Owner explicitly kept wave01-resync-01-tsconfig-json on hold")) {
    failures.push("owner input action packet markdown missing Wave 01 hold reason");
  }
  if (markdown.includes("Authorize approvalId=wave01-resync-01-tsconfig-json")) {
    failures.push("owner input action packet markdown must not expose held Wave 01 authorization text");
  }
  if (markdown.includes("undefined")) failures.push("owner input action packet markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    ownerInputsReady: recorded.summary?.ownerInputsReady === true,
    missingInputFiles: recorded.summary?.missingInputFiles ?? 0,
    pendingCanonicalAuthorizationRows: recorded.summary?.pendingCanonicalAuthorizationRows ?? 0,
    pendingOwnerBlockerReportRecords: recorded.summary?.pendingOwnerBlockerReportRecords ?? 0,
    pendingOwnerBlockerReports: pendingOwnerBlockerReports.length,
    pendingOwnerBlockerReportsWithNextActions: pendingOwnerBlockerReports.filter((row) => row.nextAction).length,
    remainingCompletionAssignments: remainingCompletionAssignments.length,
    remainingCompletionAssignmentsWithNextActions: remainingCompletionAssignments.filter((row) => (row.nextActions ?? []).length > 0).length,
    nextOwnerAuthorizationFocusBatchStatus: focusBatch.batchStatus ?? null,
    nextOwnerAuthorizationFocusBatchRows: focusBatch.focusBatchRows ?? 0,
    nextOwnerAuthorizationFocusBatchPendingRows: focusBatch.pendingRows ?? 0,
    nextOwnerAuthorizationFocusBatchHeldRows: focusBatch.heldRows ?? 0,
    nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows: focusBatchOwnerInput.ownerInputVisibleRows ?? 0,
    nextOwnerAuthorizationFocusBatchRecordingIntakeStatus: recordingIntake.intakeStatus ?? null,
    nextOwnerAuthorizationFocusBatchRecordingIntakeAcceptedRows: recordingIntake.acceptedRows ?? 0,
    nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows: recordingIntake.pendingRows ?? 0,
    nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks: recordingIntake.failedChecks ?? 0,
    nextValidationCommands: (recorded.nextValidationCommands ?? []).length,
    deferredValidationCommands: (recorded.deferredValidationCommands ?? []).length,
    validationHoldStatus: recorded.validationHold?.status ?? null,
    cleanupAuthorizedRows: recorded.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded.summary?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner input action packet gate");
    console.log(`Owner inputs ready: ${payload.ownerInputsReady ? "yes" : "no"}`);
    console.log(`Missing input files: ${payload.missingInputFiles ?? 0}`);
    console.log(`Pending canonical authorization rows: ${payload.pendingCanonicalAuthorizationRows ?? 0}`);
    console.log(`Pending owner blocker report records: ${payload.pendingOwnerBlockerReportRecords ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 owner input action packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
