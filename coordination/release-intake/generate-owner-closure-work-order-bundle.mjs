#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validationHoldWithCommands } from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  queue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  focusBatchAcceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  focusBatchOwnerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  focusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  latestJson: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-closure-work-order-bundle.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-closure-work-order-bundle.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
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

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
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

function focusRowsForAgent(focusRows, agentId) {
  return focusRows.filter((row) => row.agentId === agentId);
}

function workOrderPath(agentId) {
  return `coordination/release-intake/latest-A25-owner-closure-work-order-${slug(agentId)}.md`;
}

function datedWorkOrderPath(agentId) {
  return `coordination/release-intake/${date}-A25-owner-closure-work-order-${slug(agentId)}.md`;
}

function assignmentRows(row) {
  return (row.ownerPackageAssignments ?? []).map((item) => (
    `| ${item.assignmentId} | ${item.recommendedWorktree || "none"} | ${(item.packageRows ?? []).map((pkg) => pkg.packageName).join("<br>") || "none"} | ${(item.packageRows ?? []).flatMap((pkg) => pkg.blockingReasons ?? []).join("<br>") || "none"} |`
  )).join("\n") || "| none | n/a | n/a | n/a |";
}

function reportRows(row) {
  return (row.blockerReportStarters ?? []).map((item) => (
    `| ${item.reportId} | ${item.assignmentId} | ${item.reportStatus} | ${item.recommendedWorktree || "none"} |`
  )).join("\n") || "| none | n/a | n/a | n/a |";
}

function authorizationRows(row) {
  const rows = [
    ...(row.authorizationStarters ?? []),
    ...(row.generatedArtifactResidualAuthorizations ?? [])
  ];
  return rows.map((item) => (
    `| ${item.approvalId} | ${item.approvalKind} | ${item.subject || item.path || item.branch || "n/a"} | ${item.selectedAction || "owner-selected"} | ${item.cleanupAuthorized ? "yes" : "no"} | ${item.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | no | no |";
}

function focusAuthorizationRows(row) {
  return (row.focusBatchAuthorizationRows ?? []).map((item) => (
    `| ${item.approvalId} | ${item.canonicalDraftRowPresent ? "yes" : "no"} | ${item.canonicalRowPresent ? "yes" : "no"} | ${item.accepted ? "yes" : "no"} | ${cell(item.recordingRowStatus || "missing")} | ${cell(item.pendingReason || "accepted")} | ${item.cleanupAuthorized ? "yes" : "no"} | ${item.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | no | no | n/a | n/a | n/a | no | no |";
}

function focusAuthorizationTexts(row) {
  const pendingRows = (row.focusBatchAuthorizationRows ?? []).filter((item) => item.accepted !== true);
  return pendingRows.map((item) => `- ${item.requiredAuthorizationText}`).join("\n") || "- none";
}

function completionRows(row) {
  return (row.remainingCompletionAssignments ?? []).map((item) => (
    `| ${item.assignmentId} | ${item.objective} | ${(item.blockerRows ?? []).map((blocker) => `${blocker.id}: ${blocker.status}`).join("<br>") || "none"} |`
  )).join("\n") || "| none | n/a | n/a |";
}

function commandList(commands) {
  return (commands ?? []).length > 0 ? commands.map((command) => `- \`${command}\``).join("\n") : "- none";
}

function workOrderMarkdown(payload, row) {
  const counts = countItems(row);
  return `# A25 Owner Closure Work Order - ${row.agentId}

Generated: ${payload.generatedAt}

Queue source: \`${paths.queue}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This work order is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Owner

- Agent: ${row.agentId}
- Owner: ${row.owner}
- Pending items: ${counts.pendingItems}
- Recorded blocker reports: ${counts.recordedBlockerReports}
- Pending blocker reports: ${counts.pendingBlockerReports}
- Next-owner focus batch authorization rows: ${counts.focusBatchAuthorizationRows}
- Next-owner focus batch owner-input visible rows: ${(row.focusBatchAuthorizationRows ?? []).filter((item) => item.canonicalDraftRowPresent || item.canonicalRowPresent).length}
- Next-owner focus batch recording rows: ${counts.focusBatchRecordingRows}
- Next-owner focus batch recording-intake status: ${payload.focusBatchRecordingIntakeStatus}
- Cleanup-authorized rows: ${counts.cleanupAuthorizedRows}
- Executable rows: ${counts.executableRows}

## Validation Hold

- Status: ${payload.validationHold.status}
- Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`
- Reason: ${payload.validationHold.reason}
- Resume condition: ${payload.validationHold.resumeCondition}

Safe post-input validation commands:

${commandList(payload.validationHold.safePostInputValidationCommands)}

Deferred aggregate validation commands:

${commandList(payload.validationHold.deferredAggregateValidationCommands)}

## Recommended Worktrees

${row.recommendedWorktrees?.length ? row.recommendedWorktrees.map((item) => `- \`${item}\``).join("\n") : "- none"}

## Next Safe Actions

1. Read \`AGENTS.md\` and this work order.
2. Work only inside the listed owner scope or write a blocker report.
3. Resolve package blockers in an isolated owner worktree, or record a formal blocker.
4. Do not run any physical cleanup unless a current authorization artifact and owner instruction name the exact approval ID, final state, command, and working directory.

## Owner Package Assignments

| Assignment | Worktree | Packages | Blocking reasons |
| --- | --- | --- | --- |
${assignmentRows(row)}

## Blocker Report Starters

| Report | Assignment | Status | Worktree |
| --- | --- | --- | --- |
${reportRows(row)}

## Authorization Starters

| Approval | Kind | Subject | Selected action | Cleanup authorized | Executable |
| --- | --- | --- | --- | --- | --- |
${authorizationRows(row)}

## Next Owner Authorization Focus Batch

These rows mirror the current owner authorization focus batch when present. They are owner-input text only and do not authorize cleanup, execution, Git operations, or deployment.

| Approval | Draft visible | Canonical accepted row | Accepted | Recording status | Pending reason | Cleanup authorized | Executable |
| --- | --- | --- | --- | --- | --- | --- | --- |
${focusAuthorizationRows(row)}

Exact authorization text rows:

${focusAuthorizationTexts(row)}

## Remaining Completion Assignments

| Assignment | Objective | Blockers |
| --- | --- | --- |
${completionRows(row)}
`;
}

function bundleMarkdown(payload) {
  const rows = payload.workOrders.map((item) => (
    `| ${item.agentId} | ${item.owner} | ${item.counts.pendingItems} | ${item.counts.ownerPackageAssignments} | ${item.counts.blockerReportStarters} | ${item.counts.recordedBlockerReports} | ${item.counts.pendingBlockerReports} | ${item.counts.authorizationStarters} | ${item.counts.generatedArtifactResidualAuthorizations} | ${item.counts.focusBatchAuthorizationRows} | ${item.counts.remainingCompletionAssignments} | \`${item.latestMarkdown}\` |`
  )).join("\n");

  const focusRows = payload.workOrders
    .filter((item) => item.counts.focusBatchAuthorizationRows > 0)
    .map((item) => `| ${item.agentId} | ${item.owner} | ${item.counts.focusBatchAuthorizationRows} | \`${item.latestMarkdown}\` |`)
    .join("\n") || "| none | n/a | 0 | n/a |";

  return `# A25 Owner Closure Work Order Bundle

Generated: ${payload.generatedAt}

Queue source: \`${paths.queue}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This bundle is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Owners: ${payload.summary.owners}
- Pending items: ${payload.summary.pendingItems}
- Owner package assignments: ${payload.summary.ownerPackageAssignments}
- Blocker report starters: ${payload.summary.blockerReportStarters}
- Recorded blocker reports: ${payload.summary.recordedBlockerReports}
- Pending blocker reports: ${payload.summary.pendingBlockerReports}
- Authorization starters: ${payload.summary.authorizationStarters}
- A22 generated-artifact residual authorizations: ${payload.summary.generatedArtifactResidualAuthorizations}
- Next-owner focus batch status: ${payload.summary.focusBatchStatus}
- Next-owner focus batch rows: ${payload.summary.focusBatchRows}
- Next-owner focus batch accepted rows: ${payload.summary.focusBatchAcceptedRows}
- Next-owner focus batch pending rows: ${payload.summary.focusBatchPendingRows}
- Next-owner focus batch held rows: ${payload.summary.focusBatchHeldRows}
- Next-owner focus batch held policy rows: ${payload.summary.focusBatchHeldPolicyRows}
- Next-owner focus batch owner-input visible rows: ${payload.summary.focusBatchOwnerInputVisibleRows}
- Next-owner focus batch canonical draft visible rows: ${payload.summary.focusBatchCanonicalDraftVisibleRows}
- Next-owner focus batch canonical authorization visible rows: ${payload.summary.focusBatchCanonicalAuthorizationVisibleRows}
- Next-owner focus batch recording-intake status: ${payload.summary.focusBatchRecordingIntakeStatus}
- Next-owner focus batch recording accepted rows: ${payload.summary.focusBatchRecordingAcceptedRows}
- Next-owner focus batch recording pending rows: ${payload.summary.focusBatchRecordingPendingRows}
- Next-owner focus batch recording owner-input visible rows: ${payload.summary.focusBatchRecordingOwnerInputVisibleRows}
- Next-owner focus batch recording failed checks: ${payload.summary.focusBatchRecordingFailedChecks}
- Next-owner focus batch recording post-input validation commands: ${payload.summary.focusBatchRecordingPostInputValidationCommands}
- Next-owner focus batch recording deferred aggregate validation commands: ${payload.summary.focusBatchRecordingDeferredAggregateValidationCommands}
- Remaining completion assignments: ${payload.summary.remainingCompletionAssignments}
- Validation hold: ${payload.validationHold.status}
- Safe post-input validation commands: ${payload.validationHold.safePostInputValidationCommands.length}
- Deferred aggregate validation commands: ${payload.validationHold.deferredAggregateValidationCommands.length}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Validation Hold

- Status: ${payload.validationHold.status}
- Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`
- Reason: ${payload.validationHold.reason}
- Resume condition: ${payload.validationHold.resumeCondition}

Safe post-input validation commands:

${commandList(payload.validationHold.safePostInputValidationCommands)}

Deferred aggregate validation commands:

${commandList(payload.validationHold.deferredAggregateValidationCommands)}

## Next Owner Authorization Focus Batch

Status: ${payload.summary.focusBatchStatus}

These rows are the current owner-facing authorization focus when present. They remain non-executable until the owner records matching canonical authorization rows and later separate execution instructions where required.

Owner-input visible rows: ${payload.summary.focusBatchOwnerInputVisibleRows}/${payload.summary.focusBatchRows}

Recording intake status: ${payload.summary.focusBatchRecordingIntakeStatus}

Recording accepted rows: ${payload.summary.focusBatchRecordingAcceptedRows}

Recording pending rows: ${payload.summary.focusBatchRecordingPendingRows}

Held policy approval IDs:

${payload.focusBatchHeldPolicyApprovalIds.map((approvalId) => `- \`${approvalId}\``).join("\n") || "- none"}

Recording failed checks: ${payload.summary.focusBatchRecordingFailedChecks}

| Agent | Owner | Focus rows | Work order |
| --- | --- | ---: | --- |
${focusRows}

| Agent | Owner | Pending | Package assignments | Report starters | Recorded reports | Pending reports | Auth starters | A22 residual auth | Focus auth | Completion assignments | Work order |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const queue = readJson(paths.queue);
  const focusBatchAcceptanceDocket = readJson(paths.focusBatchAcceptanceDocket);
  const focusBatchOwnerInputScaffold = readJson(paths.focusBatchOwnerInputScaffold);
  const focusBatchRecordingIntake = readJson(paths.focusBatchRecordingIntake);
  const validationHold = validationHoldWithCommands();

  if (queue.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("owner closure action queue dirty-map signature is stale");
  }
  if (queue.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("owner closure action queue expanded dirty entry count is stale");
  }
  if (focusBatchAcceptanceDocket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("next owner authorization focus batch acceptance docket dirty-map signature is stale");
  }
  if (focusBatchAcceptanceDocket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("next owner authorization focus batch acceptance docket expanded dirty entry count is stale");
  }
  if ((focusBatchAcceptanceDocket.sourceCurrentnessFailures ?? []).length > 0) {
    throw new Error("next owner authorization focus batch acceptance docket has source currentness failures");
  }
  if (focusBatchOwnerInputScaffold.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("next owner authorization focus batch owner-input scaffold dirty-map signature is stale");
  }
  if (focusBatchOwnerInputScaffold.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("next owner authorization focus batch owner-input scaffold expanded dirty entry count is stale");
  }
  if ((focusBatchOwnerInputScaffold.sourceCurrentnessFailures ?? []).length > 0) {
    throw new Error("next owner authorization focus batch owner-input scaffold has source currentness failures");
  }
  if (focusBatchRecordingIntake.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("next owner authorization focus batch recording intake dirty-map signature is stale");
  }
  if (focusBatchRecordingIntake.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("next owner authorization focus batch recording intake expanded dirty entry count is stale");
  }
  if ((focusBatchRecordingIntake.sourceCurrentnessFailures ?? []).length > 0) {
    throw new Error("next owner authorization focus batch recording intake has source currentness failures");
  }

  const focusRows = compactFocusRows(focusBatchOwnerInputScaffold, focusBatchRecordingIntake);

  const workOrders = (queue.ownerQueues ?? []).map((row) => {
    const focusBatchAuthorizationRows = focusRowsForAgent(focusRows, row.agentId);
    const rowWithFocus = { ...row, focusBatchAuthorizationRows };
    const latestMarkdown = workOrderPath(row.agentId);
    const datedMarkdown = datedWorkOrderPath(row.agentId);
    const counts = countItems(rowWithFocus);
    const item = {
      agentId: row.agentId,
      owner: row.owner,
      latestMarkdown,
      datedMarkdown,
      recommendedWorktrees: row.recommendedWorktrees ?? [],
      focusBatchAuthorizationRows,
      counts,
      cleanupAuthorized: false,
      executableNow: false
    };
    const markdown = workOrderMarkdown({
      generatedAt: new Date().toISOString(),
      dirtyMapStatusSignature: queue.dirtyMapStatusSignature,
      expandedStatusEntries: queue.expandedStatusEntries,
      focusBatchRecordingIntakeStatus: focusBatchRecordingIntake.intakeStatus ?? "missing",
      validationHold
    }, rowWithFocus);
    write(latestMarkdown, markdown);
    write(datedMarkdown, markdown);
    return item;
  });

  const summary = {
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

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: queue.dirtyMapStatusSignature,
    expandedStatusEntries: queue.expandedStatusEntries,
    sourceArtifacts: {
      dirtyMapGeneratedAt: dirtyMap.generatedAt,
      queueGeneratedAt: queue.generatedAt,
      focusBatchAcceptanceDocketGeneratedAt: focusBatchAcceptanceDocket.generatedAt,
      focusBatchOwnerInputScaffoldGeneratedAt: focusBatchOwnerInputScaffold.generatedAt,
      focusBatchRecordingIntakeGeneratedAt: focusBatchRecordingIntake.generatedAt
    },
    note: "Coordination evidence only. Owner sessions must still work in approved scopes/worktrees and cannot perform physical cleanup without exact owner authorization.",
    validationHold,
    focusBatchHeldPolicyApprovalIds: focusBatchOwnerInputScaffold.heldPolicyApprovalIds ?? [],
    summary,
    workOrders
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, bundleMarkdown(payload));
  write(paths.datedMarkdown, bundleMarkdown(payload));

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    owners: summary.owners,
    pendingItems: summary.pendingItems,
    validationHoldStatus: validationHold.status,
    focusBatchRecordingIntakeStatus: summary.focusBatchRecordingIntakeStatus,
    focusBatchRecordingFailedChecks: summary.focusBatchRecordingFailedChecks,
    safePostInputValidationCommands: validationHold.safePostInputValidationCommands.length,
    deferredAggregateValidationCommands: validationHold.deferredAggregateValidationCommands.length,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
