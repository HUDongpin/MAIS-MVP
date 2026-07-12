#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  validateToMergeBlockerFrontier: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  validationHoldReleaseGate: "coordination/release-intake/latest-A25-validation-hold-release-gate.json",
  a22CleanReleaseSourceRunway: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  a22CleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  a22CleanSourceSelectionReview: "coordination/release-intake/latest-A22-clean-source-selection-review.json",
  a22CleanSourceCandidatePromotionPacket: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  a22TypecheckRemediationOwnerWorkOrders: "coordination/release-intake/latest-A22-typecheck-remediation-owner-work-orders.json",
  focusBatchCanonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  latestJson: "coordination/release-intake/latest-A25-A22-validate-frontier-resolution-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-A22-validate-frontier-resolution-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-A22-validate-frontier-resolution-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-A22-validate-frontier-resolution-packet.md`
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

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => [
      key,
      artifactStamp(key, A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS[key], payload)
    ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function compactWorkOrders(payload) {
  const workOrders = payload.workOrders ?? [];
  const owners = [...new Set(workOrders.map((row) => row.ownerId).filter(Boolean))];
  const totalRoutedErrorRows = workOrders.reduce((sum, row) => sum + count(row.totalRoutedErrorRows), 0);
  return {
    workOrderCount: count(payload.summary?.workOrders, workOrders.length),
    owners,
    totalRoutedErrorRows: count(payload.summary?.routedErrorRows, totalRoutedErrorRows),
    topWorkOrders: workOrders.slice(0, 5).map((row) => ({
      workOrderId: row.workOrderId,
      ownerId: row.ownerId,
      ownerLabel: row.ownerLabel,
      totalRoutedErrorRows: row.totalRoutedErrorRows,
      remediationStatus: row.remediationStatus,
      latestMarkdown: row.latestMarkdown
    }))
  };
}

function focusBatchSummary(preview, frontier) {
  const previewRows = preview.previewRows ?? [];
  const frontierFocus = (frontier.frontierRows ?? []).find((row) => row.checkId === "focus-batch-recorded") ?? null;
  return {
    pendingRows: count(preview.summary?.pendingRows, count(preview.pendingRows, previewRows.length)),
    previewRows: count(preview.summary?.previewRows, count(preview.previewRows, previewRows.length)),
    approvalIds: previewRows.map((row) => row.approvalId).filter(Boolean),
    copyableOwnerText: frontierFocus?.copyableOwnerText ?? "",
    copyableOwnerReplyTextZh: frontierFocus?.copyableOwnerReplyTextZh ?? ""
  };
}

function buildResolutionRows({ artifacts, focusBatch, workOrders }) {
  const bridgeSummary = artifacts.sevenStepClosureBridge.summary ?? {};
  const frontierSummary = artifacts.validateToMergeBlockerFrontier.summary ?? {};
  const validationHoldSummary = artifacts.validationHoldReleaseGate.summary ?? {};
  const queueSummary = artifacts.a22CleanSourceValidationQueue.summary ?? {};
  const selectionReviewSummary = artifacts.a22CleanSourceSelectionReview.summary ?? {};
  const runwaySummary = artifacts.a22CleanReleaseSourceRunway.summary ?? {};
  const promotionSummary = artifacts.a22CleanSourceCandidatePromotionPacket.summary ?? {};
  const rows = [];

  if (focusBatch.pendingRows > 0) {
    rows.push({
      rank: rows.length + 1,
      rowId: "a25-focus-batch-canonical-authorization",
      owner: "A25 git hygiene and release intake",
      agentIds: ["A25"],
      status: "waiting-owner-authorization",
      blockerClass: "owner-authorization",
      blocker: `${focusBatch.pendingRows} current owner-package canonical authorization row(s) are still pending`,
      nextAction: "Record the current focus batch only after explicit owner approval, then rerun post-input validation and the aggregate remediation gate.",
      approvalIds: focusBatch.approvalIds,
      copyableOwnerText: focusBatch.copyableOwnerText,
      copyableOwnerReplyTextZh: focusBatch.copyableOwnerReplyTextZh,
      evidence: [
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.focusBatchCanonicalPreview,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validateToMergeBlockerFrontier
      ],
      requiresOwnerInput: true,
      requiresCleanReleaseSource: false,
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  rows.push({
    rank: rows.length + 1,
    rowId: "a25-validation-hold-lifecycle-resolution",
    owner: "A25 git hygiene and release intake",
    agentIds: ["A25"],
    status: artifacts.validationHoldReleaseGate.gateStatus ?? "unknown",
    blockerClass: "validation-hold-lifecycle",
    blocker: validationHoldSummary.worktreeStillRegistered
      ? `Owner confirmation is recorded, but the active compose worktree is still registered and has ${validationHoldSummary.activeWorktreeDirtyStatusEntries ?? 0} dirty status entr${validationHoldSummary.activeWorktreeDirtyStatusEntries === 1 ? "y" : "ies"}`
      : "Validation hold release gate is not yet released",
    nextAction: validationHoldSummary.worktreeStillRegistered
      ? "Keep validation hold blocked until the active compose worktree lifecycle is resolved through a separate, explicit owner lifecycle decision; then rerun validation-hold release gate."
      : "Rerun validation-hold release gate and downstream archive/aggregate refresh only after the gate reports released.",
    evidence: [
      A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validationHoldReleaseGate,
      A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validateToMergeBlockerFrontier
    ],
    worktreeStillRegistered: validationHoldSummary.worktreeStillRegistered === true,
    activeWorktreePathExists: validationHoldSummary.activeWorktreePathExists === true,
    activeWorktreeDirtyStatusEntries: count(validationHoldSummary.activeWorktreeDirtyStatusEntries),
    worktreePruneDryRunRows: count(validationHoldSummary.worktreePruneDryRunRows),
    requiresOwnerInput: validationHoldSummary.worktreeStillRegistered === true,
    requiresCleanReleaseSource: false,
    cleanupAuthorized: false,
    executableNow: false
  });

  if (queueSummary.releaseSourceEligibleNow !== true) {
    rows.push({
      rank: rows.length + 1,
      rowId: "a22-clean-source-selection-review",
      owner: "A22 production reliability and release engineering with A25/A10 support",
      agentIds: ["A22", "A25", "A10"],
      status: artifacts.a22CleanSourceSelectionReview.selectionReviewStatus ?? artifacts.a22CleanSourceValidationQueue.queueStatus ?? "unknown",
      blockerClass: "release-source-clean",
      blocker: selectionReviewSummary.fallbackGreenCandidateBranch
        ? `Fallback candidate ${selectionReviewSummary.fallbackGreenCandidateBranch} is reviewed green but not selected as release source`
        : "No eligible clean release source is selected",
      nextAction: "Keep the reviewed fallback as a clean-source option; do not select a release source, stage, merge, cleanup, or deploy until owner promotion/merge/deploy authorization and release gates exist.",
      evidence: [
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceValidationQueue,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceSelectionReview,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceCandidatePromotionPacket,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanReleaseSourceRunway
      ],
      fallbackGreenCandidateBranch: selectionReviewSummary.fallbackGreenCandidateBranch ?? queueSummary.fallbackGreenCandidateBranch ?? "",
      releaseSourceEligibleNow: selectionReviewSummary.releaseSourceEligibleNow === true || queueSummary.releaseSourceEligibleNow === true,
      releaseSourceSelected: selectionReviewSummary.releaseSourceSelected === true || queueSummary.releaseSourceSelected === true,
      cleanWorktreeCandidates: count(runwaySummary.cleanWorktreeCandidates),
      blockedAllowedSourceOptions: count(runwaySummary.blockedAllowedSourceOptions),
      requiresOwnerInput: false,
      requiresCleanReleaseSource: true,
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  if (count(queueSummary.typeCheckErrorLines) > 0 || workOrders.workOrderCount > 0) {
    rows.push({
      rank: rows.length + 1,
      rowId: "a22-top-candidate-typecheck-remediation",
      owner: "A22 production reliability and release engineering with routed owner sessions",
      agentIds: ["A22", ...workOrders.owners],
      status: queueSummary.topCandidateQueueActionStatus ?? "unknown",
      blockerClass: "typecheck-remediation",
      blocker: `${count(queueSummary.typeCheckErrorLines, workOrders.totalRoutedErrorRows)} A22 top-candidate type-check error line(s) remain routed across ${workOrders.workOrderCount} owner work order(s)`,
      nextAction: "Use the owner-routed work orders to reduce candidate-specific type-check errors to zero, then refresh A22 type-check/build/smoke evidence before any clean-source selection.",
      evidence: [
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22TypecheckRemediationOwnerWorkOrders,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceValidationQueue
      ],
      workOrderCount: workOrders.workOrderCount,
      workOrderOwners: workOrders.owners,
      totalRoutedErrorRows: workOrders.totalRoutedErrorRows,
      topWorkOrders: workOrders.topWorkOrders,
      requiresOwnerInput: false,
      requiresCleanReleaseSource: true,
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  if (frontierSummary.failedMergeChecks > 0 || bridgeSummary.validateExitReady !== true) {
    rows.push({
      rank: rows.length + 1,
      rowId: "a25-validate-to-merge-frontier",
      owner: "A25 git hygiene and release intake with A22 release engineering",
      agentIds: ["A25", "A22"],
      status: artifacts.validateToMergeBlockerFrontier.handoffStatus ?? "blocked",
      blockerClass: "validate-to-merge",
      blocker: `${frontierSummary.failedMergeChecks ?? 0} validate-to-merge check(s) remain failed; validateExitReady=${bridgeSummary.validateExitReady === true}`,
      nextAction: "Resolve frontier rows in rank order: owner input, validation hold, clean release source, type/build gates, then rerun validate-to-merge before any merge consideration.",
      evidence: [
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validateToMergeBlockerFrontier,
        A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.sevenStepClosureBridge
      ],
      failedMergeChecks: count(frontierSummary.failedMergeChecks),
      frontierRows: count(frontierSummary.frontierRows),
      readyForMerge: artifacts.validateToMergeBlockerFrontier.readyForMerge === true,
      validateExitReady: bridgeSummary.validateExitReady === true,
      requiresOwnerInput: count(frontierSummary.ownerInputFrontierRows) > 0,
      requiresCleanReleaseSource: count(frontierSummary.cleanSourceFrontierRows) > 0,
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildA25A22ValidateFrontierResolutionPacket() {
  const artifacts = {
    dirtyMap: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.dirtyMap),
    sevenStepClosureBridge: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.sevenStepClosureBridge),
    validateToMergeBlockerFrontier: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validateToMergeBlockerFrontier),
    validationHoldReleaseGate: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.validationHoldReleaseGate),
    a22CleanReleaseSourceRunway: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanReleaseSourceRunway),
    a22CleanSourceValidationQueue: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceValidationQueue),
    a22CleanSourceSelectionReview: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceSelectionReview),
    a22CleanSourceCandidatePromotionPacket: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22CleanSourceCandidatePromotionPacket),
    a22TypecheckRemediationOwnerWorkOrders: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.a22TypecheckRemediationOwnerWorkOrders),
    focusBatchCanonicalPreview: readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.focusBatchCanonicalPreview)
  };

  const focusBatch = focusBatchSummary(artifacts.focusBatchCanonicalPreview, artifacts.validateToMergeBlockerFrontier);
  const workOrders = compactWorkOrders(artifacts.a22TypecheckRemediationOwnerWorkOrders);
  const rows = buildResolutionRows({ artifacts, focusBatch, workOrders });
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const bridgeSummary = artifacts.sevenStepClosureBridge.summary ?? {};
  const frontierSummary = artifacts.validateToMergeBlockerFrontier.summary ?? {};
  const validationHoldSummary = artifacts.validationHoldReleaseGate.summary ?? {};
  const queueSummary = artifacts.a22CleanSourceValidationQueue.summary ?? {};
  const selectionReviewSummary = artifacts.a22CleanSourceSelectionReview.summary ?? {};
  const runwaySummary = artifacts.a22CleanReleaseSourceRunway.summary ?? {};
  const promotionSummary = artifacts.a22CleanSourceCandidatePromotionPacket.summary ?? {};

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    packetKind: "a25-a22-validate-frontier-resolution-packet",
    activePhase: "validate",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    summary: {
      resolutionRows: rows.length,
      ownerInputRows: rows.filter((row) => row.requiresOwnerInput === true).length,
      cleanSourceRows: rows.filter((row) => row.requiresCleanReleaseSource === true).length,
      failedMergeChecks: count(frontierSummary.failedMergeChecks),
      frontierRows: count(frontierSummary.frontierRows),
      pendingCanonicalAuthorizationRows: count(frontierSummary.pendingCanonicalAuthorizationRows, count(bridgeSummary.pendingCanonicalAuthorizationRows)),
      focusBatchPendingRows: focusBatch.pendingRows,
      focusBatchApprovalIds: focusBatch.approvalIds,
      validationHoldGateStatus: artifacts.validationHoldReleaseGate.gateStatus ?? "missing",
      validationHoldReleased: artifacts.validationHoldReleaseGate.validationHoldReleased === true,
      validationHoldWorktreeStillRegistered: validationHoldSummary.worktreeStillRegistered === true,
      validationHoldWorktreePathExists: validationHoldSummary.activeWorktreePathExists === true,
      validationHoldWorktreeDirtyStatusEntries: count(validationHoldSummary.activeWorktreeDirtyStatusEntries),
      validationHoldWorktreePruneDryRunRows: count(validationHoldSummary.worktreePruneDryRunRows),
      cleanSourceQueueStatus: artifacts.a22CleanSourceValidationQueue.queueStatus ?? "missing",
      cleanSourceSelectionReviewStatus: artifacts.a22CleanSourceSelectionReview.selectionReviewStatus ?? "missing",
      fallbackGreenCandidateBranch: selectionReviewSummary.fallbackGreenCandidateBranch ?? queueSummary.fallbackGreenCandidateBranch ?? "",
      releaseSourceEligibleNow: selectionReviewSummary.releaseSourceEligibleNow === true || queueSummary.releaseSourceEligibleNow === true,
      releaseSourceSelected: selectionReviewSummary.releaseSourceSelected === true || queueSummary.releaseSourceSelected === true,
      promotionEligibleNow: promotionSummary.promotionEligibleNow === true,
      cleanWorktreeCandidates: count(runwaySummary.cleanWorktreeCandidates),
      blockedAllowedSourceOptions: count(runwaySummary.blockedAllowedSourceOptions),
      topCandidateBranch: queueSummary.topCandidateBranch ?? artifacts.a22CleanSourceValidationQueue.topCandidate?.branch ?? "",
      topCandidateQueueActionStatus: queueSummary.topCandidateQueueActionStatus ?? "",
      topCandidateTypeCheckErrorLines: count(queueSummary.typeCheckErrorLines),
      topCandidateBuildRefreshRequired: queueSummary.buildRefreshRequired === true,
      typecheckRemediationWorkOrders: workOrders.workOrderCount,
      typecheckRemediationOwners: workOrders.owners,
      validateExitReady: bridgeSummary.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeBlockerFrontier.readyForMerge === true,
      mergeAuthorized: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      deployAuthorized: false,
      sourceCurrentnessFailures: sourceFailures.length
    },
    resolutionRows: rows,
    safeNextCommands: [
      "node coordination/release-intake/assert-a25-a22-validate-frontier-resolution-packet-current.mjs",
      "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs",
      "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
      "node coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs",
      "node coordination/release-intake/assert-validation-hold-release-gate-current.mjs",
      "node coordination/release-intake/assert-no-staged-changes.mjs"
    ],
    boundary: {
      evidenceOnly: true,
      recordsOwnerAuthorization: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      branches: false,
      merges: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      releaseSourceSelected: false,
      dirtyRootDeployAuthorized: false
    }
  };
}

export function stableA25A22ValidateFrontierResolutionPacketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    packetKind: payload.packetKind,
    activePhase: payload.activePhase,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    summary: payload.summary,
    resolutionRows: payload.resolutionRows,
    safeNextCommands: payload.safeNextCommands,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdown(payload) {
  const rows = payload.resolutionRows
    .map((row) => `| ${row.rank} | \`${cell(row.rowId)}\` | ${cell(row.owner)} | \`${cell(row.status)}\` | ${cell(row.blocker)} | ${cell(row.nextAction)} |`)
    .join("\n");
  const commands = payload.safeNextCommands.map((command) => `- \`${command}\``).join("\n");
  const focusText = payload.resolutionRows
    .filter((row) => row.rowId === "a25-focus-batch-canonical-authorization" && row.copyableOwnerReplyTextZh)
    .map((row) => `\nCopyable owner reply text (Chinese):\n\n\`\`\`text\n${row.copyableOwnerReplyTextZh}\n\`\`\`\n`)
    .join("\n");

  return `# A25/A22 Validate Frontier Resolution Packet

Generated: ${payload.generatedAt}

Active phase: \`${payload.activePhase}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is evidence-only. It does not authorize staging, committing, branching, merging, deploying, cleanup, destructive Git, dirty-root deploy, release-source selection, or physical lifecycle cleanup.

## Summary

- Resolution rows: ${payload.summary.resolutionRows}
- Failed merge checks: ${payload.summary.failedMergeChecks}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Current focus-batch pending rows: ${payload.summary.focusBatchPendingRows}
- Validation hold gate status: \`${payload.summary.validationHoldGateStatus}\`
- Validation hold worktree still registered: ${payload.summary.validationHoldWorktreeStillRegistered ? "yes" : "no"}
- Validation hold worktree path exists: ${payload.summary.validationHoldWorktreePathExists ? "yes" : "no"}
- Validation hold worktree dirty status entries: ${payload.summary.validationHoldWorktreeDirtyStatusEntries}
- A22 clean-source queue status: \`${payload.summary.cleanSourceQueueStatus}\`
- A22 clean-source selection review status: \`${payload.summary.cleanSourceSelectionReviewStatus}\`
- Fallback green candidate: \`${payload.summary.fallbackGreenCandidateBranch || "none"}\`
- Release source eligible now: ${payload.summary.releaseSourceEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- A22 top-candidate type-check error lines: ${payload.summary.topCandidateTypeCheckErrorLines}
- A22 type-check remediation work orders: ${payload.summary.typecheckRemediationWorkOrders}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Resolution Rows

| Rank | Row | Owner | Status | Blocker | Safe next action |
| --- | --- | --- | --- | --- | --- |
${rows}
${focusText}
## Safe Next Commands

${commands}

## Boundary

- Evidence only: ${payload.boundary.evidenceOnly ? "yes" : "no"}
- Records owner authorization: ${payload.boundary.recordsOwnerAuthorization ? "yes" : "no"}
- Records execution instruction: ${payload.boundary.recordsExecutionInstruction ? "yes" : "no"}
- Merge authorized: ${payload.boundary.merges ? "yes" : "no"}
- Deploy authorized: ${payload.boundary.deploys ? "yes" : "no"}
- Cleanup authorized: ${payload.boundary.cleanupAuthorized ? "yes" : "no"}
- Physical lifecycle cleanup authorized: ${payload.boundary.physicalLifecycleCleanupAuthorized ? "yes" : "no"}
`;
}

function main() {
  const payload = buildA25A22ValidateFrontierResolutionPacket();
  write(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestMarkdown, markdown(payload));
  write(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestJson,
    latestMarkdown: A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestMarkdown,
    resolutionRows: payload.summary.resolutionRows,
    failedMergeChecks: payload.summary.failedMergeChecks,
    validationHoldGateStatus: payload.summary.validationHoldGateStatus,
    cleanSourceQueueStatus: payload.summary.cleanSourceQueueStatus,
    cleanSourceSelectionReviewStatus: payload.summary.cleanSourceSelectionReviewStatus,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  main();
}
