#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS,
  buildCurrentCleanupStatusSnapshot,
  stableCurrentCleanupStatusSnapshotProjection
} from "./generate-a25-current-cleanup-status-snapshot.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-current-cleanup-status-snapshot-current-gate.json");
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
    CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestJson,
    CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) {
    return finish({ failures, complete: false, expandedStatusEntries: 0, decisionRows: 0 });
  }

  const recorded = readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestJson);
  const current = buildCurrentCleanupStatusSnapshot();
  if (!sameJson(stableCurrentCleanupStatusSnapshotProjection(recorded), stableCurrentCleanupStatusSnapshotProjection(current))) {
    failures.push("A25 current cleanup status snapshot is stale relative to upstream dirty-worktree cleanup evidence");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.contentCaptured !== false) failures.push("boundary.contentCaptured must be false");
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validationHold.status must wait for owner compose deletion confirmation");
  }
  if (recorded.validationHold?.activeWorktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628") {
    failures.push("validationHold.activeWorktreePath must name the owner-active compose worktree");
  }
  if ((recorded.validationHold?.safePostInputValidationCommands ?? []).length !== 5) {
    failures.push("validationHold.safePostInputValidationCommands must contain five commands");
  }
  if ((recorded.validationHold?.deferredAggregateValidationCommands ?? []).length !== 8) {
    failures.push("validationHold.deferredAggregateValidationCommands must contain eight commands");
  }
  if ((recorded.validationHold?.safePostInputValidationCommands ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence") || command.includes("refresh-linked-worktree-archive-evidence"))) {
    failures.push("validationHold.safePostInputValidationCommands must not include linked or aggregate refresh commands");
  }
  if (!recorded.inputFreshness || typeof recorded.inputFreshness.totalInputs !== "number") {
    failures.push("inputFreshness summary must be present");
  }
  if ((recorded.inputFreshness?.totalInputs ?? 0) !== (recorded.inputs ?? []).length) {
    failures.push("inputFreshness.totalInputs must match inputs length");
  }
  const freshnessTotal =
    (recorded.inputFreshness?.currentInputs ?? 0) +
    (recorded.inputFreshness?.staleInputs ?? 0) +
    (recorded.inputFreshness?.unknownInputs ?? 0);
  if (freshnessTotal !== (recorded.inputFreshness?.totalInputs ?? 0)) {
    failures.push("inputFreshness counts must add up to totalInputs");
  }
  const authorizationExecutionPreview = recorded.ownerFrontier?.authorizationExecutionPreview ?? {};
  if ((authorizationExecutionPreview.preAuthorizationReadyRows ?? 0) !== (authorizationExecutionPreview.starterRows ?? 0)) {
    failures.push("authorizationExecutionPreview.preAuthorizationReadyRows must match starterRows");
  }
  if ((authorizationExecutionPreview.preAuthorizationAttentionRows ?? 0) !== 0) {
    failures.push("authorizationExecutionPreview.preAuthorizationAttentionRows must be 0");
  }
  if ((authorizationExecutionPreview.evidenceCompleteRows ?? 0) !== (authorizationExecutionPreview.starterRows ?? 0)) {
    failures.push("authorizationExecutionPreview.evidenceCompleteRows must match starterRows");
  }
  if ((authorizationExecutionPreview.worktreePresentRows ?? 0) !== (authorizationExecutionPreview.worktreeCheckRows ?? 0)) {
    failures.push("authorizationExecutionPreview worktree checks must all pass");
  }
  if ((authorizationExecutionPreview.targetPathPresentRows ?? 0) !== (authorizationExecutionPreview.targetPathCheckRows ?? 0)) {
    failures.push("authorizationExecutionPreview target path checks must all pass");
  }
  if ((authorizationExecutionPreview.exactCommandTargetReadyRows ?? 0) !== (authorizationExecutionPreview.exactCommandRows ?? 0)) {
    failures.push("authorizationExecutionPreview exact command target checks must all pass");
  }
  const authorizedCommandManifest = recorded.ownerFrontier?.authorizedCommandManifest ?? {};
  if ((authorizedCommandManifest.authorizedCandidateRows ?? 0) !== (authorizationExecutionPreview.validAuthorizationRows ?? 0)) {
    failures.push("authorizedCommandManifest.authorizedCandidateRows must match authorizationExecutionPreview.validAuthorizationRows");
  }
  if ((authorizedCommandManifest.readyForSeparateInstructionRows ?? 0) + (authorizedCommandManifest.blockedCandidateRows ?? 0) !== (authorizedCommandManifest.authorizedCandidateRows ?? 0)) {
    failures.push("authorizedCommandManifest ready and blocked rows must add up to authorized candidates");
  }
  if ((authorizedCommandManifest.cleanupAuthorizedRows ?? 0) !== 0) failures.push("authorizedCommandManifest.cleanupAuthorizedRows must be 0");
  if ((authorizedCommandManifest.executableRows ?? 0) !== 0) failures.push("authorizedCommandManifest.executableRows must be 0");
  const executionInstructions = recorded.ownerFrontier?.executionInstructions ?? {};
  const closureLoop = recorded.closureLoop ?? {};
  if ((executionInstructions.readyForSeparateInstructionRows ?? 0) !== (authorizedCommandManifest.readyForSeparateInstructionRows ?? 0)) {
    failures.push("executionInstructions.readyForSeparateInstructionRows must match authorizedCommandManifest.readyForSeparateInstructionRows");
  }
  if ((executionInstructions.validInstructionRows ?? 0) + (executionInstructions.pendingReadyManifestRows ?? 0) !== (executionInstructions.readyForSeparateInstructionRows ?? 0)) {
    failures.push("executionInstructions valid plus pending rows must match ready manifest rows");
  }
  if ((executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0) > (executionInstructions.supplementalA16CandidateRows ?? 0)) {
    failures.push("executionInstructions supplemental A16 ready rows must not exceed supplemental A16 candidates");
  }
  if ((executionInstructions.readyForSeparateInstructionRows ?? 0) + (executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0) !== (executionInstructions.effectiveReadyForSeparateInstructionRows ?? 0)) {
    failures.push("executionInstructions effective ready rows must include manifest ready rows plus supplemental A16 ready rows");
  }
  if ((executionInstructions.validInstructionRows ?? 0) + (executionInstructions.effectivePendingReadyInstructionRows ?? 0) !== (executionInstructions.effectiveReadyForSeparateInstructionRows ?? 0)) {
    failures.push("executionInstructions valid rows plus effective pending rows must match effective ready rows");
  }
  const a16ExecutionInstructionFrontierRows =
    (executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0) +
    (closureLoop.a16ValidExecutionInstructionRows ?? 0) +
    (closureLoop.a16PendingOwnerExecutionInstructionRows ?? 0);
  if ((executionInstructions.supplementalA16CandidateRows ?? 0) > 0 && a16ExecutionInstructionFrontierRows < 1) {
    failures.push("executionInstructions or closureLoop must expose the A16 owner execution-instruction frontier row");
  }
  if ((executionInstructions.cleanupAuthorizedRows ?? 0) !== 0) failures.push("executionInstructions.cleanupAuthorizedRows must be 0");
  if ((executionInstructions.executableRows ?? 0) !== 0) failures.push("executionInstructions.executableRows must be 0");
  const closurePendingAuthorizationRows = closureLoop.pendingCanonicalAuthorizationRows ?? 0;
  const closureAuthorizationStarterRows =
    closureLoop.authorizationStarterRows ??
    ((closureLoop.validAuthorizationRows ?? 0) + closurePendingAuthorizationRows);
  if ((closureLoop.validAuthorizationRows ?? 0) + closurePendingAuthorizationRows !== closureAuthorizationStarterRows) {
    failures.push("closureLoop valid authorization rows plus pending canonical rows must match starter rows");
  }
  if ((closureLoop.validExecutionInstructionRows ?? 0) + (closureLoop.pendingReadyExecutionInstructionRows ?? 0) !== (closureLoop.readyExecutionInstructionRows ?? 0)) {
    failures.push("closureLoop valid execution instructions plus pending ready instruction rows must match ready instruction rows");
  }
  const closureA16PostExtractionVerified =
    closureLoop.a16PostExtractionLifecycleStatus === "post-extraction-verified" &&
    closureLoop.a16PostExtractionVerified === true;
  if ((closureLoop.a16ReadyForOwnerExecutionInstructionRows ?? 0) > (closureLoop.a16ReadyForSeparateInstructionRows ?? 0)) {
    failures.push("closureLoop A16 ready owner execution-input rows must not exceed A16 ready separate-instruction rows");
  }
  if (!closureA16PostExtractionVerified && (closureLoop.a16ValidExecutionInstructionRows ?? 0) > (closureLoop.a16ReadyForSeparateInstructionRows ?? 0)) {
    failures.push("closureLoop A16 valid execution rows must not exceed A16 ready separate-instruction rows");
  }
  const closureA16FrontierRows = closureLoop.a16ExecutionInstructionFrontierRows ??
    Math.max(closureLoop.a16ReadyForOwnerExecutionInstructionRows ?? 0, closureLoop.a16ValidExecutionInstructionRows ?? 0);
  if ((closureLoop.a16ValidExecutionInstructionRows ?? 0) + (closureLoop.a16PendingOwnerExecutionInstructionRows ?? 0) !== closureA16FrontierRows) {
    failures.push("closureLoop A16 valid execution rows plus pending owner rows must match A16 execution-instruction frontier rows");
  }
  if ((closureLoop.readyExecutionInstructionRows ?? 0) + closureA16FrontierRows !== (closureLoop.effectiveReadyExecutionInstructionRows ?? 0)) {
    failures.push("closureLoop effective ready rows must include generic ready rows plus A16 execution-instruction frontier rows");
  }
  if ((closureLoop.validExecutionInstructionRows ?? 0) + (closureLoop.a16ValidExecutionInstructionRows ?? 0) !== (closureLoop.effectiveValidExecutionInstructionRows ?? 0)) {
    failures.push("closureLoop effective valid rows must include generic valid rows plus A16 valid rows");
  }
  if ((closureLoop.effectiveValidExecutionInstructionRows ?? 0) + (closureLoop.effectivePendingReadyExecutionInstructionRows ?? 0) !== (closureLoop.effectiveReadyExecutionInstructionRows ?? 0)) {
    failures.push("closureLoop effective valid plus effective pending rows must match effective ready rows");
  }
  if (!["pending-owner-execution-instruction", "pending-extraction-execution", "post-extraction-verified"].includes(closureLoop.a16PostExtractionLifecycleStatus ?? "")) {
    failures.push("closureLoop A16 post-extraction lifecycle status must be recognized");
  }
  if ((closureLoop.a16PostExtractionFailedChecks ?? 0) !== 0) failures.push("closureLoop A16 post-extraction failed checks must be 0");
  if (!closureA16PostExtractionVerified && (closureLoop.a16ReadyForSeparateInstructionRows ?? 0) < 1) failures.push("closureLoop must represent the A16 ready separate-instruction row");
  if (closureA16PostExtractionVerified && (closureLoop.a16ValidExecutionInstructionRows ?? 0) < 1) failures.push("closureLoop post-extraction verified state must retain the A16 valid execution instruction row");
  if (closureA16FrontierRows < 1) failures.push("closureLoop must represent the A16 execution-instruction frontier row");
  if (((closureLoop.effectivePendingReadyExecutionInstructionRows ?? 0) + (closureLoop.effectiveValidExecutionInstructionRows ?? 0)) < 1) {
    failures.push("closureLoop must represent an effective pending or valid owner execution instruction row");
  }
  if (closurePendingAuthorizationRows > 0 && closureLoop.activeStep !== "validate") {
    failures.push("closureLoop.activeStep must remain validate while canonical authorization rows are pending");
  }
  if (closurePendingAuthorizationRows > 0 && (closureLoop.completedSteps ?? 0) !== 2) {
    failures.push("closureLoop.completedSteps must remain 2 while canonical authorization rows are pending");
  }
  if (closurePendingAuthorizationRows > 0 && (closureLoop.blockedSteps ?? 0) !== 2) {
    failures.push("closureLoop.blockedSteps must remain 2 while canonical authorization rows are pending");
  }
  if ((closureLoop.preAuthorizationReadyRows ?? 0) !== closureAuthorizationStarterRows) {
    failures.push("closureLoop.preAuthorizationReadyRows must match authorizationStarterRows");
  }
  if ((closureLoop.preAuthorizationAttentionRows ?? 0) !== 0) failures.push("closureLoop.preAuthorizationAttentionRows must be 0");
  if ((closureLoop.cleanupAuthorizedRows ?? 0) !== 0) failures.push("closureLoop.cleanupAuthorizedRows must be 0");
  if ((closureLoop.executableRows ?? 0) !== 0) failures.push("closureLoop.executableRows must be 0");
  const stepStatuses = Object.fromEntries((closureLoop.steps ?? []).map((step) => [step.id, step.status]));
  if (stepStatuses.slice !== "complete") failures.push("closureLoop slice step must be complete");
  if (stepStatuses.extract !== "complete") failures.push("closureLoop extract step must be complete");
  if (closurePendingAuthorizationRows > 0 && stepStatuses.validate !== "active") failures.push("closureLoop validate step must be active while canonical authorization rows are pending");
  if (closurePendingAuthorizationRows > 0 && stepStatuses.merge !== "blocked") failures.push("closureLoop merge step must be blocked while canonical authorization rows are pending");
  if (closurePendingAuthorizationRows > 0 && stepStatuses.cleanup !== "blocked") failures.push("closureLoop cleanup step must be blocked while canonical authorization rows are pending");
  const validateToMergeHandoff = recorded.validateToMergeHandoff ?? {};
  if (!["blocked-before-merge", "ready-for-clean-release-merge", "not-ready-source-stale"].includes(validateToMergeHandoff.handoffStatus ?? "")) {
    failures.push("validateToMergeHandoff.handoffStatus must be recognized");
  }
  if (validateToMergeHandoff.readyForMerge !== (validateToMergeHandoff.handoffStatus === "ready-for-clean-release-merge")) {
    failures.push("validateToMergeHandoff.readyForMerge must match handoffStatus");
  }
  if ((validateToMergeHandoff.pendingCanonicalAuthorizationRows ?? 0) !== closurePendingAuthorizationRows) {
    failures.push("validateToMergeHandoff.pendingCanonicalAuthorizationRows must match closureLoop pending canonical rows");
  }
  if ((validateToMergeHandoff.effectivePendingReadyExecutionInstructionRows ?? 0) !== (closureLoop.effectivePendingReadyExecutionInstructionRows ?? 0)) {
    failures.push("validateToMergeHandoff effective pending execution instruction rows must match closureLoop");
  }
  if ((validateToMergeHandoff.validationHoldStatus ?? "") !== (recorded.validationHold?.status ?? "")) {
    failures.push("validateToMergeHandoff.validationHoldStatus must match validationHold.status");
  }
  if (validateToMergeHandoff.releaseSourceClean !== (recorded.releaseSource?.releaseSourceClean === true)) {
    failures.push("validateToMergeHandoff.releaseSourceClean must match releaseSource.releaseSourceClean");
  }
  if (validateToMergeHandoff.strictLifecycleClean !== (recorded.strictLifecycle?.strictLifecycleClean === true)) {
    failures.push("validateToMergeHandoff.strictLifecycleClean must match strictLifecycle.strictLifecycleClean");
  }
  if ((validateToMergeHandoff.sourceCurrentnessFailures ?? 0) !== 0) failures.push("validateToMergeHandoff.sourceCurrentnessFailures must be 0");
  if ((validateToMergeHandoff.cleanupAuthorizedRows ?? 0) !== 0) failures.push("validateToMergeHandoff.cleanupAuthorizedRows must be 0");
  if ((validateToMergeHandoff.executableRows ?? 0) !== 0) failures.push("validateToMergeHandoff.executableRows must be 0");
  if (validateToMergeHandoff.readyForMerge === false && (validateToMergeHandoff.failedMergeChecks ?? 0) < 1) {
    failures.push("validateToMergeHandoff must expose failed checks while not ready for merge");
  }
  const rootTypecheckStatus = recorded.rootTypecheckStatus ?? {};
  if (typeof rootTypecheckStatus.rootTypeCheckPassed !== "boolean") failures.push("rootTypecheckStatus.rootTypeCheckPassed must be boolean");
  if (typeof rootTypecheckStatus.rootTypeCheckErrorLines !== "number") failures.push("rootTypecheckStatus.rootTypeCheckErrorLines must be numeric");
  if (typeof rootTypecheckStatus.packageWorktreeTypeCheckErrorLines !== "number") failures.push("rootTypecheckStatus.packageWorktreeTypeCheckErrorLines must be numeric");
  if (!["root-green-package-worktree-red", "root-green", "root-red"].includes(rootTypecheckStatus.layerComparisonStatus ?? "")) {
    failures.push("rootTypecheckStatus.layerComparisonStatus must be recognized");
  }
  if ((rootTypecheckStatus.cleanupAuthorizedRows ?? 0) !== 0) failures.push("rootTypecheckStatus.cleanupAuthorizedRows must be 0");
  if ((rootTypecheckStatus.executableRows ?? 0) !== 0) failures.push("rootTypecheckStatus.executableRows must be 0");
  if (rootTypecheckStatus.rootTypeCheckPassed === true && rootTypecheckStatus.rootTypeCheckErrorLines !== 0) {
    failures.push("passing root type-check must have zero root error lines");
  }
  if (rootTypecheckStatus.rootTypeCheckPassed === true && (rootTypecheckStatus.packageWorktreeTypeCheckErrorLines ?? 0) > 0 && rootTypecheckStatus.layerComparisonStatus !== "root-green-package-worktree-red") {
    failures.push("root-green package-red state must be explicit in rootTypecheckStatus.layerComparisonStatus");
  }

  const markdown = readText(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestMarkdown);
  for (const needle of [
    "evidence-only",
    "does not authorize staging",
    "does not make any row eligible",
    "Validation Hold",
    "waiting-for-owner-compose-deletion-confirmation",
    "Deferred aggregate validation commands",
    "Input Freshness",
    "Authorization pre-check ready rows",
    "Exact command target checks ready",
    "Authorized command manifest",
    "Execution instruction rows",
    "Supplemental A16 ready owner execution-input rows",
    "Effective pending ready rows without execution instructions",
    "A16 ready owner execution-input rows",
    "Closure Loop",
    "Active closure-loop step",
    "Validate-To-Merge Handoff",
    "Validate-to-merge handoff status",
    "Failed merge readiness checks",
    "Root Type-Check Status",
    "Package/worktree type-check error lines",
    "Type-check layer comparison"
  ]) {
    if (!markdown.includes(needle)) failures.push(`status snapshot markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("status snapshot markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    complete: recorded.completion?.complete === true,
    expandedStatusEntries: recorded.status?.expandedStatusEntries ?? 0,
    decisionRows: recorded.ownerFrontier?.decisionFocus?.totalDecisionRows ?? 0,
    validationHoldStatus: recorded.validationHold?.status ?? null,
    safePostInputValidationCommands: (recorded.validationHold?.safePostInputValidationCommands ?? []).length,
    deferredAggregateValidationCommands: (recorded.validationHold?.deferredAggregateValidationCommands ?? []).length,
    validateToMergeHandoffStatus: validateToMergeHandoff.handoffStatus ?? null,
    validateToMergeReadyForMerge: validateToMergeHandoff.readyForMerge === true,
    validateToMergeFailedChecks: validateToMergeHandoff.failedMergeChecks ?? 0,
    rootTypeCheckPassed: rootTypecheckStatus.rootTypeCheckPassed === true,
    rootTypeCheckErrorLines: rootTypecheckStatus.rootTypeCheckErrorLines ?? 0,
    packageWorktreeTypeCheckErrorLines: rootTypecheckStatus.packageWorktreeTypeCheckErrorLines ?? 0,
    typeCheckLayerComparisonStatus: rootTypecheckStatus.layerComparisonStatus ?? null,
    preAuthorizationReadyRows: authorizationExecutionPreview.preAuthorizationReadyRows ?? 0,
    preAuthorizationAttentionRows: authorizationExecutionPreview.preAuthorizationAttentionRows ?? 0,
    authorizedManifestCandidateRows: authorizedCommandManifest.authorizedCandidateRows ?? 0,
    authorizedManifestReadyRows: authorizedCommandManifest.readyForSeparateInstructionRows ?? 0,
    validExecutionInstructionRows: executionInstructions.validInstructionRows ?? 0,
    pendingReadyManifestRowsWithoutExecutionInstructions: executionInstructions.pendingReadyManifestRows ?? 0,
    supplementalA16ReadyForOwnerExecutionInstructionRows: executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0,
    effectiveReadyForSeparateInstructionRows: executionInstructions.effectiveReadyForSeparateInstructionRows ?? 0,
    effectivePendingReadyInstructionRows: executionInstructions.effectivePendingReadyInstructionRows ?? 0,
    closureLoopActiveStep: closureLoop.activeStep ?? null,
    closureLoopA16ReadyForOwnerExecutionInstructionRows: closureLoop.a16ReadyForOwnerExecutionInstructionRows ?? 0,
    closureLoopA16PostExtractionLifecycleStatus: closureLoop.a16PostExtractionLifecycleStatus ?? null,
    closureLoopEffectivePendingReadyExecutionInstructionRows: closureLoop.effectivePendingReadyExecutionInstructionRows ?? 0,
    cleanupAuthorizedRows: recorded.authorizationTotals?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded.authorizationTotals?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 current cleanup status snapshot gate");
    console.log(`Complete: ${payload.complete ? "yes" : "no"}`);
    console.log(`Expanded status entries: ${payload.expandedStatusEntries ?? 0}`);
    console.log(`Decision rows: ${payload.decisionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 current cleanup status snapshot gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
