#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validationHoldWithCommands } from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-closure-work-order-bundle-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  queue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  focusBatchAcceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  focusBatchOwnerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  focusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  bundle: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
  bundleMarkdown: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.md"
};

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

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function countItems(row) {
  return {
    ownerPackageAssignments: row.ownerPackageAssignments?.length ?? 0,
    blockerReportStarters: row.blockerReportStarters?.length ?? 0,
    recordedBlockerReports: row.blockerReportStarters?.filter((item) => item.recorded).length ?? 0,
    pendingBlockerReports: row.pendingBlockerReports ?? row.blockerReportStarters?.filter((item) => !item.recorded).length ?? 0,
    authorizationStarters: row.authorizationStarters?.length ?? 0,
    generatedArtifactResidualAuthorizations: row.generatedArtifactResidualAuthorizations?.length ?? 0,
    focusBatchAuthorizationRows: row.focusBatchAuthorizationRows?.length ?? 0,
    focusBatchRecordingRows: row.focusBatchAuthorizationRows?.filter((item) => item.recordingRowStatus).length ?? 0,
    remainingCompletionAssignments: row.remainingCompletionAssignments?.length ?? 0,
    pendingItems: row.pendingItems ?? 0,
    cleanupAuthorizedRows: row.cleanupAuthorized ? 1 : 0,
    executableRows: row.executableNow ? 1 : 0
  };
}

function agentIdFromApprovalId(approvalId) {
  const match = String(approvalId ?? "").match(/^a(\d{2})-/i);
  return match ? `A${match[1]}` : "";
}

function compactFocusRows(focusBatchOwnerInputScaffold, focusBatchRecordingIntake) {
  const recordingRowsByApprovalId = new Map(
    (focusBatchRecordingIntake.focusBatchRows ?? []).map((row) => [row.approvalId, row])
  );
  return (focusBatchOwnerInputScaffold.ownerInputRows ?? []).map((row) => ({
    approvalId: row.approvalId,
    agentId: agentIdFromApprovalId(row.approvalId),
    owner: row.owner,
    path: row.path,
    accepted: row.accepted === true,
    pendingReason: row.pendingReason ?? "",
    requiredAuthorizationText: row.requiredAuthorizationText ?? "",
    canonicalDraftRowPresent: row.canonicalDraftRowPresent === true,
    canonicalRowPresent: row.canonicalRowPresent === true,
    canonicalDraftIndex: row.canonicalDraftIndex ?? -1,
    canonicalAuthorizationIndex: row.canonicalAuthorizationIndex ?? -1,
    nextOwnerInputAction: row.nextOwnerInputAction ?? "",
    recordingRowStatus: recordingRowsByApprovalId.get(row.approvalId)?.rowStatus ?? "",
    recordingAccepted: recordingRowsByApprovalId.get(row.approvalId)?.accepted === true,
    recordingCanonicalDraftRowPresent: recordingRowsByApprovalId.get(row.approvalId)?.canonicalDraftRowPresent === true,
    recordingCanonicalRowPresent: recordingRowsByApprovalId.get(row.approvalId)?.canonicalRowPresent === true,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function expectedWorkOrders(queue, focusBatchOwnerInputScaffold, focusBatchRecordingIntake) {
  const focusRows = compactFocusRows(focusBatchOwnerInputScaffold, focusBatchRecordingIntake);
  return (queue.ownerQueues ?? []).map((row) => ({
    agentId: row.agentId,
    owner: row.owner,
    latestMarkdown: `coordination/release-intake/latest-A25-owner-closure-work-order-${slug(row.agentId)}.md`,
    recommendedWorktrees: row.recommendedWorktrees ?? [],
    focusBatchAuthorizationRows: focusRows.filter((focusRow) => focusRow.agentId === row.agentId),
    counts: countItems({
      ...row,
      focusBatchAuthorizationRows: focusRows.filter((focusRow) => focusRow.agentId === row.agentId)
    }),
    cleanupAuthorized: false,
    executableNow: false
  }));
}

function expectedSummary(workOrders, focusBatchAcceptanceDocket, focusBatchOwnerInputScaffold, focusBatchRecordingIntake) {
  const focusRows = compactFocusRows(focusBatchOwnerInputScaffold, focusBatchRecordingIntake);
  return {
    owners: workOrders.length,
    ownerPackageAssignments: workOrders.reduce((sum, row) => sum + row.counts.ownerPackageAssignments, 0),
    blockerReportStarters: workOrders.reduce((sum, row) => sum + row.counts.blockerReportStarters, 0),
    recordedBlockerReports: workOrders.reduce((sum, row) => sum + row.counts.recordedBlockerReports, 0),
    pendingBlockerReports: workOrders.reduce((sum, row) => sum + row.counts.pendingBlockerReports, 0),
    authorizationStarters: workOrders.reduce((sum, row) => sum + row.counts.authorizationStarters, 0),
    generatedArtifactResidualAuthorizations: workOrders.reduce((sum, row) => sum + row.counts.generatedArtifactResidualAuthorizations, 0),
    focusBatchStatus: focusBatchOwnerInputScaffold.batchStatus ?? "missing",
    focusBatchRows: focusBatchOwnerInputScaffold.summary?.focusBatchRows ?? focusRows.length,
    focusBatchAcceptedRows: focusBatchOwnerInputScaffold.summary?.acceptedRows ?? focusRows.filter((row) => row.accepted).length,
    focusBatchPendingRows: focusBatchOwnerInputScaffold.summary?.pendingRows ?? focusRows.filter((row) => !row.accepted).length,
    focusBatchHeldRows: focusBatchOwnerInputScaffold.summary?.heldRows ?? (focusBatchOwnerInputScaffold.heldRows ?? []).length,
    focusBatchHeldPolicyRows: (focusBatchOwnerInputScaffold.heldPolicyApprovalIds ?? []).length,
    focusBatchOwnerInputVisibleRows: focusBatchOwnerInputScaffold.summary?.ownerInputVisibleRows ?? focusRows.filter((row) => row.canonicalDraftRowPresent || row.canonicalRowPresent).length,
    focusBatchCanonicalDraftVisibleRows: focusBatchOwnerInputScaffold.summary?.canonicalDraftVisibleRows ?? focusRows.filter((row) => row.canonicalDraftRowPresent).length,
    focusBatchCanonicalAuthorizationVisibleRows: focusBatchOwnerInputScaffold.summary?.canonicalAuthorizationVisibleRows ?? focusRows.filter((row) => row.canonicalRowPresent).length,
    focusBatchRecordingIntakeStatus: focusBatchRecordingIntake.intakeStatus ?? "missing",
    focusBatchRecordingAcceptedRows: focusBatchRecordingIntake.summary?.acceptedRows ?? focusRows.filter((row) => row.recordingAccepted).length,
    focusBatchRecordingPendingRows: focusBatchRecordingIntake.summary?.pendingRows ?? focusRows.filter((row) => !row.recordingAccepted).length,
    focusBatchRecordingOwnerInputVisibleRows: focusBatchRecordingIntake.summary?.ownerInputVisibleRows ?? focusRows.filter((row) => row.recordingCanonicalDraftRowPresent || row.recordingCanonicalRowPresent).length,
    focusBatchRecordingFailedChecks: (focusBatchRecordingIntake.checks ?? []).filter((row) => row.status !== "pass").length,
    focusBatchRecordingPostInputValidationCommands: focusBatchRecordingIntake.summary?.postInputValidationCommands ?? (focusBatchRecordingIntake.postInputValidationCommands ?? []).length,
    focusBatchRecordingDeferredAggregateValidationCommands: focusBatchRecordingIntake.summary?.deferredAggregateValidationCommands ?? (focusBatchRecordingIntake.deferredAggregateValidationCommands ?? []).length,
    remainingCompletionAssignments: workOrders.reduce((sum, row) => sum + row.counts.remainingCompletionAssignments, 0),
    pendingItems: workOrders.reduce((sum, row) => sum + row.counts.pendingItems, 0),
    cleanupAuthorizedRows: workOrders.reduce((sum, row) => sum + row.counts.cleanupAuthorizedRows, 0) + (focusBatchAcceptanceDocket.summary?.cleanupAuthorizedRows ?? 0) + (focusBatchOwnerInputScaffold.summary?.cleanupAuthorizedRows ?? 0) + (focusBatchRecordingIntake.summary?.cleanupAuthorizedRows ?? 0),
    executableRows: workOrders.reduce((sum, row) => sum + row.counts.executableRows, 0) + (focusBatchAcceptanceDocket.summary?.executableRows ?? 0) + (focusBatchOwnerInputScaffold.summary?.executableRows ?? 0) + (focusBatchRecordingIntake.summary?.executableRows ?? 0)
  };
}

function stripDatedField(row) {
  const { datedMarkdown: _datedMarkdown, ...rest } = row;
  return rest;
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner closure work-order bundle gate");
    console.log(`Owners: ${payload.owners ?? 0}`);
    console.log(`Pending items: ${payload.pendingItems ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner closure work-order bundle gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, owners: 0, pendingItems: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const queue = readJson(paths.queue);
  const focusBatchAcceptanceDocket = readJson(paths.focusBatchAcceptanceDocket);
  const focusBatchOwnerInputScaffold = readJson(paths.focusBatchOwnerInputScaffold);
  const focusBatchRecordingIntake = readJson(paths.focusBatchRecordingIntake);
  const bundle = readJson(paths.bundle);
  const workOrders = expectedWorkOrders(queue, focusBatchOwnerInputScaffold, focusBatchRecordingIntake);
  const summary = expectedSummary(workOrders, focusBatchAcceptanceDocket, focusBatchOwnerInputScaffold, focusBatchRecordingIntake);
  const expectedValidationHold = validationHoldWithCommands();

  if (queue.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("queue dirty-map signature is stale");
  if (queue.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("queue expanded dirty entry count is stale");
  if (focusBatchAcceptanceDocket.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("focus batch acceptance docket dirty-map signature is stale");
  if (focusBatchAcceptanceDocket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("focus batch acceptance docket expanded dirty entry count is stale");
  if ((focusBatchAcceptanceDocket.sourceCurrentnessFailures ?? []).length !== 0) failures.push("focus batch acceptance docket source currentness failures must be 0");
  if (focusBatchOwnerInputScaffold.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("focus batch owner-input scaffold dirty-map signature is stale");
  if (focusBatchOwnerInputScaffold.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("focus batch owner-input scaffold expanded dirty entry count is stale");
  if ((focusBatchOwnerInputScaffold.sourceCurrentnessFailures ?? []).length !== 0) failures.push("focus batch owner-input scaffold source currentness failures must be 0");
  if (focusBatchRecordingIntake.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("focus batch recording intake dirty-map signature is stale");
  if (focusBatchRecordingIntake.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("focus batch recording intake expanded dirty entry count is stale");
  if ((focusBatchRecordingIntake.sourceCurrentnessFailures ?? []).length !== 0) failures.push("focus batch recording intake source currentness failures must be 0");
  if ((focusBatchRecordingIntake.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("focus batch recording intake cleanupAuthorizedRows must be 0");
  if ((focusBatchRecordingIntake.summary?.executableRows ?? 0) !== 0) failures.push("focus batch recording intake executableRows must be 0");
  if ((focusBatchRecordingIntake.checks ?? []).some((row) => row.status !== "pass")) failures.push("focus batch recording intake checks must all pass");
  if (bundle.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("bundle dirty-map signature is stale");
  if (bundle.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("bundle expanded dirty entry count is stale");
  if (!sameJson(bundle.summary, summary)) failures.push("bundle summary is stale");
  if (!sameJson((bundle.workOrders ?? []).map(stripDatedField), workOrders)) failures.push("bundle work orders are stale");
  if (!sameJson(bundle.validationHold ?? null, expectedValidationHold)) failures.push("bundle validation hold is stale");
  if (bundle.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") failures.push("bundle validation hold must wait for owner compose deletion confirmation");
  if ((bundle.validationHold?.safePostInputValidationCommands ?? []).length !== 5) failures.push("bundle validation hold safe command count is stale");
  if ((bundle.validationHold?.deferredAggregateValidationCommands ?? []).length !== 8) failures.push("bundle validation hold deferred command count is stale");
  if ((bundle.validationHold?.safePostInputValidationCommands ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence") || command.includes("refresh-linked-worktree-archive-evidence"))) {
    failures.push("bundle validation hold safe commands must not include linked or aggregate refresh commands");
  }
  if ((bundle.workOrders ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) failures.push("bundle contains executable or cleanup-authorized row");
  const focusBatchStatus = bundle.summary?.focusBatchStatus ?? "missing";
  const focusBatchRows = bundle.summary?.focusBatchRows ?? 0;
  if (focusBatchStatus === "no-focus-batch") {
    if (focusBatchRows !== 0) failures.push("bundle no-focus-batch status must expose zero focus batch rows");
  } else if (focusBatchRows <= 0) {
    failures.push("bundle summary must expose at least one focus batch row");
  }
  if ((bundle.summary?.focusBatchAcceptedRows ?? 0) + (bundle.summary?.focusBatchPendingRows ?? 0) !== (bundle.summary?.focusBatchRows ?? 0)) {
    failures.push("bundle focus batch accepted rows plus pending rows must match focus rows");
  }
  if ((bundle.summary?.focusBatchHeldRows ?? 0) !== (focusBatchOwnerInputScaffold.heldRows ?? []).length) {
    failures.push("bundle dynamic held rows must match owner-input scaffold");
  }
  if ((bundle.summary?.focusBatchHeldPolicyRows ?? 0) !== (bundle.focusBatchHeldPolicyApprovalIds ?? []).length) {
    failures.push("bundle held policy row count must match held policy approval IDs");
  }
  if (!sameJson(bundle.focusBatchHeldPolicyApprovalIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("bundle held policy must preserve only wave01-resync-01-tsconfig-json");
  }
  if ((bundle.summary?.focusBatchOwnerInputVisibleRows ?? 0) !== (bundle.summary?.focusBatchRows ?? 0)) {
    failures.push("bundle summary must expose all focus rows as owner-input visible");
  }
  if ((bundle.summary?.focusBatchCanonicalDraftVisibleRows ?? 0) + (bundle.summary?.focusBatchCanonicalAuthorizationVisibleRows ?? 0) < (bundle.summary?.focusBatchRows ?? 0)) {
    failures.push("bundle summary draft plus canonical visible rows must cover focus rows");
  }
  if (![
    "waiting-for-owner-authorization",
    "ready-for-post-input-validation",
    "not-ready-source-stale",
    "no-focus-batch",
    "not-ready-invalid-focus-batch",
    "not-ready-unsafe-authorization",
    "not-ready-missing-owner-input-visibility",
    "not-ready-check-failures"
  ].includes(bundle.summary?.focusBatchRecordingIntakeStatus)) {
    failures.push("bundle focus batch recording-intake status must be recognized");
  }
  if (bundle.summary?.focusBatchRecordingIntakeStatus !== focusBatchRecordingIntake.intakeStatus) {
    failures.push("bundle focus batch recording-intake status must match source intake");
  }
  if ((bundle.summary?.focusBatchRecordingAcceptedRows ?? 0) !== (focusBatchRecordingIntake.summary?.acceptedRows ?? 0)) {
    failures.push("bundle focus batch recording accepted rows must match source intake");
  }
  if ((bundle.summary?.focusBatchRecordingPendingRows ?? 0) !== (focusBatchRecordingIntake.summary?.pendingRows ?? 0)) {
    failures.push("bundle focus batch recording pending rows must match source intake");
  }
  if ((bundle.summary?.focusBatchRecordingOwnerInputVisibleRows ?? 0) !== (focusBatchRecordingIntake.summary?.ownerInputVisibleRows ?? 0)) {
    failures.push("bundle focus batch recording visible rows must match source intake");
  }
  if ((bundle.summary?.focusBatchRecordingFailedChecks ?? 0) !== 0) failures.push("bundle focus batch recording failed checks must be 0");
  if ((bundle.summary?.focusBatchRecordingPostInputValidationCommands ?? 0) !== (focusBatchRecordingIntake.postInputValidationCommands ?? []).length) {
    failures.push("bundle focus batch recording post-input validation command count must match source intake");
  }
  if ((bundle.summary?.focusBatchRecordingDeferredAggregateValidationCommands ?? 0) !== (focusBatchRecordingIntake.deferredAggregateValidationCommands ?? []).length) {
    failures.push("bundle focus batch recording deferred validation command count must match source intake");
  }
  if (!["waiting-for-owner-authorization", "batch-authorized-non-executable", "no-focus-batch"].includes(focusBatchStatus)) {
    failures.push("bundle focus batch status must be a recognized non-executable state");
  }
  if ((bundle.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("bundle cleanupAuthorizedRows must be 0");
  if ((bundle.summary?.executableRows ?? 0) !== 0) failures.push("bundle executableRows must be 0");

  const bundleMarkdown = readText(paths.bundleMarkdown);
  if (bundleMarkdown.includes("undefined")) failures.push("bundle markdown contains undefined");
  if (!bundleMarkdown.includes("This bundle is coordination evidence only.")) failures.push("bundle markdown missing non-authorization boundary");
  if (!bundleMarkdown.includes("Validation Hold")) failures.push("bundle markdown missing validation hold section");
  if (!bundleMarkdown.includes("waiting-for-owner-compose-deletion-confirmation")) failures.push("bundle markdown missing validation hold status");
  if (!bundleMarkdown.includes("Next Owner Authorization Focus Batch")) failures.push("bundle markdown missing focus batch section");
  if (!bundleMarkdown.includes(focusBatchStatus)) failures.push("bundle markdown missing focus batch status");
  if (!bundleMarkdown.includes("Owner-input visible rows")) failures.push("bundle markdown missing owner-input visibility count");
  if (!bundleMarkdown.includes("Recording intake status")) failures.push("bundle markdown missing recording intake status");
  if (!bundleMarkdown.includes("Recording failed checks")) failures.push("bundle markdown missing recording failed checks");

  for (const row of bundle.workOrders ?? []) {
    if (!exists(row.latestMarkdown)) {
      failures.push(`missing owner work order: ${row.latestMarkdown}`);
      continue;
    }
    const content = readText(row.latestMarkdown);
    if (content.includes("undefined")) failures.push(`${row.latestMarkdown} contains undefined`);
    if (!content.includes("This work order is coordination evidence only.")) failures.push(`${row.latestMarkdown} missing non-authorization boundary`);
    if (!content.includes(`Agent: ${row.agentId}`)) failures.push(`${row.latestMarkdown} missing agent marker`);
    if (!content.includes("Validation Hold")) failures.push(`${row.latestMarkdown} missing validation hold section`);
    if (!content.includes("waiting-for-owner-compose-deletion-confirmation")) failures.push(`${row.latestMarkdown} missing validation hold status`);
    if (!content.includes("Cleanup-authorized rows: 0")) failures.push(`${row.latestMarkdown} missing zero cleanup authorization marker`);
    if (!content.includes("Executable rows: 0")) failures.push(`${row.latestMarkdown} missing zero executable marker`);
    if (!content.includes("Next Owner Authorization Focus Batch")) failures.push(`${row.latestMarkdown} missing focus batch section`);
    if (!content.includes("recording-intake status")) failures.push(`${row.latestMarkdown} missing recording-intake status`);
    for (const focusRow of row.focusBatchAuthorizationRows ?? []) {
      if (!content.includes(focusRow.approvalId)) failures.push(`${row.latestMarkdown} missing focus approval ${focusRow.approvalId}`);
      if (!content.includes(focusRow.requiredAuthorizationText)) failures.push(`${row.latestMarkdown} missing focus authorization text for ${focusRow.approvalId}`);
      if (!content.includes("Draft visible")) failures.push(`${row.latestMarkdown} missing focus draft visibility column`);
      if (!content.includes("Recording status")) failures.push(`${row.latestMarkdown} missing focus recording status column`);
      if (!content.includes(focusRow.recordingRowStatus)) failures.push(`${row.latestMarkdown} missing focus recording status for ${focusRow.approvalId}`);
      if (!focusRow.canonicalDraftRowPresent && !focusRow.canonicalRowPresent) failures.push(`${row.latestMarkdown} focus row ${focusRow.approvalId} must be owner-input visible`);
      if (!focusRow.recordingRowStatus) failures.push(`${row.latestMarkdown} focus row ${focusRow.approvalId} missing recording status`);
      if (focusRow.cleanupAuthorized || focusRow.executableNow) failures.push(`${row.latestMarkdown} focus row ${focusRow.approvalId} must not be cleanup-authorized or executable`);
    }
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    owners: summary.owners,
    pendingItems: summary.pendingItems,
    recordedBlockerReports: summary.recordedBlockerReports,
    pendingBlockerReports: summary.pendingBlockerReports,
    focusBatchStatus: summary.focusBatchStatus,
    focusBatchRows: summary.focusBatchRows,
    focusBatchAcceptedRows: summary.focusBatchAcceptedRows,
    focusBatchPendingRows: summary.focusBatchPendingRows,
    focusBatchHeldRows: summary.focusBatchHeldRows,
    focusBatchOwnerInputVisibleRows: summary.focusBatchOwnerInputVisibleRows,
    focusBatchRecordingIntakeStatus: summary.focusBatchRecordingIntakeStatus,
    focusBatchRecordingAcceptedRows: summary.focusBatchRecordingAcceptedRows,
    focusBatchRecordingPendingRows: summary.focusBatchRecordingPendingRows,
    focusBatchRecordingFailedChecks: summary.focusBatchRecordingFailedChecks,
    validationHoldStatus: bundle.validationHold?.status ?? null,
    safePostInputValidationCommands: (bundle.validationHold?.safePostInputValidationCommands ?? []).length,
    deferredAggregateValidationCommands: (bundle.validationHold?.deferredAggregateValidationCommands ?? []).length,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
