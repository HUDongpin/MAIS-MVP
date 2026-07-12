#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  focusBatchOwnerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  authorizationBacklogQueue: "coordination/release-intake/latest-A25-authorization-backlog-queue.json",
  executionInstructionRequestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  validateToMergeHandoff: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-compact-request-bundle.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-compact-request-bundle.md`
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

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  const signature = artifact.dirtyMapStatusSignature ?? artifact.status?.dirtyMapStatusSignature ?? null;
  const entries = artifact.expandedStatusEntries ?? artifact.status?.expandedStatusEntries ?? null;
  const failures = [];
  if (signature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (entries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  return failures;
}

function compactExecutionRequests(requestPacket) {
  return (requestPacket.requests ?? []).map((row, index) => ({
    order: index + 1,
    approvalId: row.approvalId,
    status: row.status,
    owner: row.owner,
    targetInputFile: row.targetInputFile,
    cwd: row.cwd,
    exactCommandSequence: row.exactCommandSequence ?? [],
    packageFiles: row.packageFiles ?? [],
    copyableExecutionText: row.copyableExecutionText,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function compactFocusAuthorizationRows(scaffold) {
  return (scaffold.ownerInputRows ?? []).map((row, index) => ({
    order: index + 1,
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    path: row.path,
    canonicalTarget: row.canonicalTarget,
    accepted: row.accepted === true,
    pendingReason: row.pendingReason ?? "",
    requiredOwnerFields: row.requiredOwnerFields ?? [],
    requiredAuthorizationText: row.requiredAuthorizationText,
    recommendedAuthorizationText: row.recommendedAuthorizationText ?? row.requiredAuthorizationText,
    ledgerSelectedFinalState: row.ledgerSelectedFinalState ?? "",
    ledgerDecisionStatus: row.ledgerDecisionStatus ?? "",
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function compactBacklogQueue(queue) {
  return (queue.queueRows ?? []).map((row) => ({
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    queueClass: row.queueClass,
    queueStatus: row.queueStatus,
    sourceRoundId: row.sourceRoundId,
    authorizableNow: row.authorizableNow === true,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function buildBatchAuthorizationRequest(rows) {
  const pendingRows = rows.filter((row) => !row.accepted);
  const approvalIds = pendingRows.map((row) => row.approvalId);
  const selectedFinalStates = [...new Set(pendingRows.map((row) => row.ledgerSelectedFinalState).filter(Boolean))];
  const everyRowReviewedCommit = pendingRows.length > 0 && selectedFinalStates.length === 1 && selectedFinalStates[0] === "reviewed commit";
  const copyableApprovalText = pendingRows.length === 0
    ? ""
    : [
        `Owner authorization: approve the current owner-package canonical authorization preview batch (${pendingRows.length} rows)`,
        `approvalIds=${approvalIds.join(",")}`,
        everyRowReviewedCommit ? "selectedFinalState=reviewed commit for every row" : `selectedFinalStates=${selectedFinalStates.join(",")}`,
        "approvedBy=<owner>",
        "approvedAt=<ISO-8601>",
        "do not authorize cleanup",
        "do not authorize deploy",
        "do not authorize merge",
        "do not authorize destructive Git",
        "do not authorize physical lifecycle cleanup"
      ].join("; ") + ".";
  const copyableOwnerReplyTextZh = pendingRows.length === 0
    ? ""
    : `我授权当前 ${pendingRows.length} 条 owner-package canonical authorization preview：approvalIds=${approvalIds.join(",")}；selectedFinalState=reviewed commit；不授权 cleanup；不授权 deploy；不授权 merge；不授权 destructive git；不授权 physical lifecycle cleanup。`;
  return {
    requestId: "focus-batch-owner-package-canonical-authorization",
    pendingRows: pendingRows.length,
    approvalIds,
    selectedFinalStates,
    everyRowReviewedCommit,
    targetFile: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
    copyableApprovalText,
    copyableOwnerReplyTextZh,
    boundary: {
      recordsAuthorizationOnlyAfterExplicitOwnerReply: true,
      cleanupAuthorized: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      destructiveGitAuthorized: false,
      physicalCleanupAuthorized: false,
      executableNow: false
    }
  };
}

function requiredOwnerInputs({ actionSummary, handoffSummary, focusSummary, executionSummary }) {
  const rows = [];
  if (count(focusSummary.pendingRows) > 0) {
    const pendingRows = count(focusSummary.pendingRows);
    rows.push({
      id: "focus-batch-authorizations",
      label: `Record the current ${pendingRows}-row owner-package final-state focus batch`,
      pendingRows,
      targetFile: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
      reason: "These rows shrink the canonical final-state authorization backlog before merge can be considered."
    });
  }
  if (count(executionSummary.readyInstructionRequestRows) > 0 || count(handoffSummary.effectivePendingReadyExecutionInstructionRows) > 0) {
    rows.push({
      id: "wave01-artifact-clean-execution-instructions",
      label: "Record separate owner execution instructions for the already-authorized Wave01 artifact-clean rows",
      pendingRows: count(handoffSummary.effectivePendingReadyExecutionInstructionRows, count(executionSummary.readyInstructionRequestRows)),
      targetFile: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
      reason: "The six rows are authorized candidates, but still non-executable until separate execution instructions are recorded."
    });
  }
  if (actionSummary.nextOwnerAuthorizationFocusBatchRecordingIntakeStatus === "waiting-for-owner-authorization") {
    rows.push({
      id: "post-input-validation",
      label: "After owner input is recorded, run the safe post-input validation commands",
      pendingRows: count(actionSummary.nextOwnerAuthorizationFocusBatchRecordingIntakePostInputValidationCommands),
      targetFile: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
      reason: "Post-input checks must pass before aggregate validation or merge handoff can advance."
    });
  }
  return rows;
}

export function buildNextOwnerCompactRequestBundle() {
  const dirtyMap = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.dirtyMap);
  const ownerInputActionPacket = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.ownerInputActionPacket);
  const focusBatchOwnerInputScaffold = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.focusBatchOwnerInputScaffold);
  const authorizationBacklogQueue = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.authorizationBacklogQueue);
  const executionInstructionRequestPacket = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.executionInstructionRequestPacket);
  const validateToMergeHandoff = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.validateToMergeHandoff);
  const completionAudit = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.completionAudit);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("owner input action packet", ownerInputActionPacket, dirtyMap),
    ...ensureCurrent("focus batch owner-input scaffold", focusBatchOwnerInputScaffold, dirtyMap),
    ...ensureCurrent("authorization backlog queue", authorizationBacklogQueue, dirtyMap),
    ...ensureCurrent("execution instruction request packet", executionInstructionRequestPacket, dirtyMap),
    ...ensureCurrent("validate-to-merge handoff", validateToMergeHandoff, dirtyMap),
    ...ensureCurrent("completion audit", completionAudit, dirtyMap)
  ];

  const actionSummary = ownerInputActionPacket.summary ?? {};
  const focusSummary = focusBatchOwnerInputScaffold.summary ?? {};
  const executionSummary = executionInstructionRequestPacket.summary ?? {};
  const handoffSummary = validateToMergeHandoff.summary ?? {};
  const auditCompletion = completionAudit.completion ?? completionAudit.summary ?? {};
  const executionInstructionRequests = compactExecutionRequests(executionInstructionRequestPacket);
  const focusAuthorizationRows = compactFocusAuthorizationRows(focusBatchOwnerInputScaffold);
  const authorizationBacklogRows = compactBacklogQueue(authorizationBacklogQueue);
  const batchAuthorizationRequest = buildBatchAuthorizationRequest(focusAuthorizationRows);
  const cleanupAuthorizedRows =
    count(actionSummary.cleanupAuthorizedRows) +
    count(focusSummary.cleanupAuthorizedRows) +
    count(executionSummary.cleanupAuthorizedRows) +
    count(handoffSummary.cleanupAuthorizedRows);
  const executableRows =
    count(actionSummary.executableRows) +
    count(focusSummary.executableRows) +
    count(executionSummary.executableRows) +
    count(handoffSummary.executableRows);

  const summary = {
    ownerInputsReady: actionSummary.ownerInputsReady === true,
    handoffStatus: validateToMergeHandoff.handoffStatus,
    readyForMerge: validateToMergeHandoff.readyForMerge === true,
    activeStep: handoffSummary.activeStep,
    pendingCanonicalAuthorizationRows: count(actionSummary.pendingCanonicalAuthorizationRows, count(handoffSummary.pendingCanonicalAuthorizationRows)),
    focusBatchRows: count(focusSummary.focusBatchRows, focusAuthorizationRows.length),
    focusBatchPendingRows: count(focusSummary.pendingRows),
    focusBatchAcceptedRows: count(focusSummary.acceptedRows),
    backlogQueueRows: count(authorizationBacklogQueue.summary?.queueRows, authorizationBacklogRows.length),
    backlogCurrentFocusRows: count(authorizationBacklogQueue.summary?.currentFocusRows),
    backlogHeldRows: count(authorizationBacklogQueue.summary?.heldRows),
    backlogDeferredOwnerPackageRows: count(authorizationBacklogQueue.summary?.deferredOwnerPackageRows),
    backlogDeferredPhysicalLifecycleRows: count(authorizationBacklogQueue.summary?.deferredPhysicalLifecycleRows),
    backlogAuthorizableNowRows: count(authorizationBacklogQueue.summary?.authorizableNowRows),
    executionInstructionRequestRows: executionInstructionRequests.length,
    effectivePendingReadyExecutionInstructionRows: count(handoffSummary.effectivePendingReadyExecutionInstructionRows),
    validExecutionInstructionRows: count(handoffSummary.effectiveValidExecutionInstructionRows),
    validationHoldStatus: handoffSummary.validationHoldStatus,
    releaseSourceClean: handoffSummary.releaseSourceClean === true,
    strictLifecycleClean: handoffSummary.strictLifecycleClean === true,
    completedRequirements: count(auditCompletion.completedRequirements),
    totalRequirements: count(auditCompletion.totalRequirements),
    completedPlanTasks: count(auditCompletion.completedPlanTasks),
    totalPlanTasks: count(auditCompletion.totalPlanTasks),
    cleanupAuthorizedRows,
    executableRows,
    sourceCurrentnessFailures: sourceCurrentnessFailures.length
  };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      ownerInputActionPacketGeneratedAt: ownerInputActionPacket.generatedAt,
      focusBatchOwnerInputScaffoldGeneratedAt: focusBatchOwnerInputScaffold.generatedAt,
      authorizationBacklogQueueGeneratedAt: authorizationBacklogQueue.generatedAt,
      executionInstructionRequestPacketGeneratedAt: executionInstructionRequestPacket.generatedAt,
      validateToMergeHandoffGeneratedAt: validateToMergeHandoff.generatedAt,
      completionAuditGeneratedAt: completionAudit.generatedAt
    },
    compactStatus: summary.readyForMerge ? "ready-for-merge-instruction" : "waiting-for-owner-input",
    summary,
    requiredOwnerInputs: requiredOwnerInputs({ actionSummary, handoffSummary, focusSummary, executionSummary }),
    batchAuthorizationRequest,
    authorizationBacklogQueue: {
      summary: authorizationBacklogQueue.summary ?? {},
      currentFocusApprovalIds: authorizationBacklogQueue.currentFocusApprovalIds ?? [],
      heldApprovalIds: authorizationBacklogQueue.heldApprovalIds ?? [],
      queueRows: authorizationBacklogRows
    },
    focusAuthorizationRows,
    executionInstructionRequests,
    heldRows: focusBatchOwnerInputScaffold.heldRows ?? [],
    sourceCurrentnessFailures,
    boundary: {
      evidenceOnly: true,
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableNextOwnerCompactRequestBundleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    compactStatus: payload.compactStatus,
    summary: payload.summary,
    requiredOwnerInputs: payload.requiredOwnerInputs,
    batchAuthorizationRequest: payload.batchAuthorizationRequest,
    authorizationBacklogQueue: payload.authorizationBacklogQueue,
    focusAuthorizationRows: payload.focusAuthorizationRows,
    executionInstructionRequests: payload.executionInstructionRequests,
    heldRows: payload.heldRows,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bulletRows(rows, field) {
  return rows.length > 0 ? rows.map((row) => `- ${row[field]}`).join("\n") : "- none";
}

function markdown(payload) {
  const inputRows = payload.requiredOwnerInputs.map((row) => (
    `| ${cell(row.id)} | ${row.pendingRows} | \`${cell(row.targetFile)}\` | ${cell(row.reason)} |`
  )).join("\n");
  const focusRows = payload.focusAuthorizationRows.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.accepted ? "yes" : "no"} |`
  )).join("\n");
  const executionRows = payload.executionInstructionRequests.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | \`${cell(row.cwd)}\` | \`${cell(row.exactCommandSequence[0] ?? "")}\` |`
  )).join("\n");
  const backlogRows = (payload.authorizationBacklogQueue?.queueRows ?? []).map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.queueClass)} | ${cell(row.queueStatus)} | ${cell(row.owner)} | ${row.authorizableNow ? "yes" : "no"} |`
  )).join("\n");
  const batchRequest = payload.batchAuthorizationRequest ?? {};
  const backlogSummary = payload.authorizationBacklogQueue?.summary ?? {};

  return `# A25 Next Owner Compact Request Bundle

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This bundle is evidence-only. It does not record authorization, does not record execution instruction, and does not authorize staging, committing, merging, cleaning, restoring, resetting, removing worktrees, deleting branches, pushing, deploying, or physical cleanup.

## Summary

- Compact status: \`${payload.compactStatus}\`
- Validate-to-merge handoff status: \`${payload.summary.handoffStatus}\`
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Closure-loop active step: ${payload.summary.activeStep}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Focus-batch pending rows: ${payload.summary.focusBatchPendingRows}/${payload.summary.focusBatchRows}
- Authorization backlog queue rows: ${payload.summary.backlogQueueRows}
- Backlog equation: ${backlogSummary.pendingCanonicalAuthorizationRows ?? 0} pending = ${payload.summary.backlogCurrentFocusRows} current focus + ${payload.summary.backlogHeldRows} held + ${payload.summary.backlogDeferredPhysicalLifecycleRows} deferred physical lifecycle + ${payload.summary.backlogDeferredOwnerPackageRows} deferred owner package
- Backlog authorizable-now rows: ${payload.summary.backlogAuthorizableNowRows}
- Execution-instruction request rows: ${payload.summary.executionInstructionRequestRows}
- Effective pending ready execution-instruction rows: ${payload.summary.effectivePendingReadyExecutionInstructionRows}
- Validation hold: ${payload.summary.validationHoldStatus}
- A22 release source clean: ${payload.summary.releaseSourceClean ? "yes" : "no"}
- A25 strict lifecycle clean: ${payload.summary.strictLifecycleClean ? "yes" : "no"}
- Completion audit: ${payload.summary.completedRequirements}/${payload.summary.totalRequirements} requirements, ${payload.summary.completedPlanTasks}/${payload.summary.totalPlanTasks} plan tasks
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Required Owner Inputs

| Input | Pending rows | Target file | Why |
| --- | ---: | --- | --- |
${inputRows}

## Authorization Backlog Queue

Current focus approval IDs:

${bulletRows((payload.authorizationBacklogQueue?.currentFocusApprovalIds ?? []).map((id) => ({ value: `\`${id}\`` })), "value")}

Held approval IDs:

${bulletRows((payload.authorizationBacklogQueue?.heldApprovalIds ?? []).map((id) => ({ value: `\`${id}\`` })), "value")}

| # | Approval ID | Queue class | Status | Owner | Authorizable now |
| ---: | --- | --- | --- | --- | --- |
${backlogRows}

## Batch Authorization Text

Request ID: \`${cell(batchRequest.requestId)}\`

Pending rows: ${batchRequest.pendingRows ?? 0}

Target file: \`${cell(batchRequest.targetFile)}\`

Copyable owner approval text:

\`\`\`text
${batchRequest.copyableApprovalText || "none"}
\`\`\`

Copyable owner reply text (Chinese):

\`\`\`text
${batchRequest.copyableOwnerReplyTextZh || "none"}
\`\`\`

## Focus Batch Authorization Requests

| # | Approval ID | Owner | Accepted |
| ---: | --- | --- | --- |
${focusRows}

Copyable authorization texts:

${bulletRows(payload.focusAuthorizationRows, "requiredAuthorizationText")}

Ledger-backed recommended authorization texts:

${bulletRows(payload.focusAuthorizationRows, "recommendedAuthorizationText")}

## Execution Instruction Requests

| # | Approval ID | CWD | Exact command |
| ---: | --- | --- | --- |
${executionRows}

Copyable execution texts:

${bulletRows(payload.executionInstructionRequests, "copyableExecutionText")}

## Held Rows

${payload.heldRows.length > 0 ? payload.heldRows.map((row) => `- \`${row.approvalId}\` - ${row.path ?? row.subject ?? ""}`).join("\n") : "- none"}

## Boundary

This bundle keeps all rows non-executable. Merge remains blocked until validate-to-merge is ready and the owner gives a separate exact merge instruction. Cleanup remains blocked until merge verification and exact cleanup instructions exist.
`;
}

function main() {
  const payload = buildNextOwnerCompactRequestBundle();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestJson, json);
  write(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.datedJson, json);
  write(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestMarkdown,
    compactStatus: payload.compactStatus,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    focusBatchPendingRows: payload.summary.focusBatchPendingRows,
    executionInstructionRequestRows: payload.summary.executionInstructionRequestRows,
    effectivePendingReadyExecutionInstructionRows: payload.summary.effectivePendingReadyExecutionInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
