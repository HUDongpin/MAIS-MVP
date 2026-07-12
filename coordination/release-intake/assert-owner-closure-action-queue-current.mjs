#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validationHoldWithCommands } from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-closure-action-queue-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageAssignments: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  blockerReportStarter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  blockerReports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  nextOwnerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  a22GeneratedArtifactResidualAuthorizations: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  remainingCompletionAssignments: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  queue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  queueMarkdown: "coordination/release-intake/latest-A25-owner-closure-action-queue.md"
};

let reportRecords = new Map();

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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function agentIdsFromText(value) {
  return unique(String(value ?? "").match(/\bA\d{2}\b/g) ?? []);
}

function agentIdsForAuthorization(row) {
  return unique([
    ...agentIdsFromText(row.owner),
    ...(row.ownerHints ?? []).flatMap(agentIdsFromText),
    ...agentIdsFromText(row.approvalId)
  ]);
}

function agentIdsForGeneratedArtifactAuthorization(row) {
  return unique([
    ...agentIdsFromText(row.owner),
    ...agentIdsFromText(row.supportingOwner)
  ]);
}

function isGeneratedArtifactResidualAuthorizationStarter(row) {
  return row.approvalKind === "a22-generated-artifact-residual-cleanup";
}

function compactAssignment(row) {
  return {
    assignmentId: row.assignmentId,
    agentId: row.agentId,
    owner: row.owner,
    objective: row.objective,
    recommendedWorktree: row.recommendedWorktree,
    packageRows: (row.packageRows ?? []).map((item) => ({
      matrixId: item.matrixId,
      packageName: item.packageName,
      blockingReasons: item.blockingReasons ?? [],
      failedCheckNames: item.failedCheckNames ?? []
    })),
    writeScope: row.writeScope ?? [],
    coordinationRequired: row.coordinationRequired ?? [],
    checks: row.checks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactReport(row) {
  const recorded = reportRecords.get(row.reportId);
  return {
    reportId: row.reportId,
    assignmentId: row.assignmentId,
    reportFingerprint: row.reportFingerprint,
    reportStatus: recorded?.reportStatus ?? row.reportStatus,
    reportedBy: recorded?.reportedBy ?? "",
    reportedAt: recorded?.reportedAt ?? "",
    ownerDecision: recorded?.ownerDecision ?? "",
    recommendedWorktree: row.recommendedWorktree,
    packageRows: (row.packageRows ?? []).map((item) => ({
      matrixId: item.matrixId,
      packageName: item.packageName,
      blockingReasons: item.blockingReasons ?? [],
      failedCheckNames: item.failedCheckNames ?? []
    })),
    evidenceReviewed: row.evidenceReviewed ?? [],
    recorded: recorded?.reportStatus === "recorded-owner-blocker",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactAuthorization(row) {
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    approvalFingerprint: row.approvalFingerprint,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    selectedFinalState: row.selectedFinalState,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactGeneratedArtifactAuthorization(row) {
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    supportingOwner: row.supportingOwner,
    subject: row.path,
    path: row.path,
    targetType: row.targetType,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    requiredAuthorizationText: row.requiredAuthorizationText,
    evidence: row.evidence ?? [],
    preChecks: row.preChecks ?? [],
    postApprovalChecks: row.postApprovalChecks ?? [],
    manifestSha256: row.manifestSha256,
    manifestBytes: row.manifestBytes,
    dryRunBytes: row.dryRunBytes,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactRemaining(row) {
  return {
    assignmentId: row.assignmentId,
    agentIds: row.agentIds ?? [],
    owner: row.owner,
    objective: row.objective,
    blockerRows: (row.blockerRows ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      blockingReasons: item.blockingReasons ?? []
    })),
    cleanupAuthorized: false,
    executableNow: false
  };
}

function ownerLabel(agentId, artifacts) {
  const assignment = (artifacts.ownerPackageAssignments.assignments ?? []).find((row) => row.agentId === agentId);
  if (assignment?.owner) return assignment.owner;
  const authorization = (artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [])
    .filter((row) => !isGeneratedArtifactResidualAuthorizationStarter(row))
    .find((row) => agentIdsForAuthorization(row).includes(agentId));
  if (authorization?.owner?.includes(agentId)) return authorization.owner;
  const remaining = (artifacts.remainingCompletionAssignments.assignments ?? []).find((row) => (row.agentIds ?? []).includes(agentId));
  return remaining?.owner ?? agentId;
}

function queueRows(artifacts) {
  const agentIds = new Set();
  for (const row of artifacts.ownerPackageAssignments.assignments ?? []) agentIds.add(row.agentId);
  for (const row of artifacts.blockerReportStarter.reports ?? []) agentIds.add(row.agentId);
  for (const row of artifacts.nextOwnerAuthorizationsStarter.authorizations ?? []) {
    if (isGeneratedArtifactResidualAuthorizationStarter(row)) continue;
    for (const agentId of agentIdsForAuthorization(row)) agentIds.add(agentId);
  }
  for (const row of artifacts.a22GeneratedArtifactResidualAuthorizations.rows ?? []) {
    for (const agentId of agentIdsForGeneratedArtifactAuthorization(row)) agentIds.add(agentId);
  }
  for (const row of artifacts.remainingCompletionAssignments.assignments ?? []) {
    for (const agentId of row.agentIds ?? []) agentIds.add(agentId);
  }

  return [...agentIds].sort().map((agentId) => {
    const ownerPackageAssignments = (artifacts.ownerPackageAssignments.assignments ?? []).filter((row) => row.agentId === agentId).map(compactAssignment);
    const blockerReportStarters = (artifacts.blockerReportStarter.reports ?? []).filter((row) => row.agentId === agentId).map(compactReport);
    const authorizationStarters = (artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [])
      .filter((row) => !isGeneratedArtifactResidualAuthorizationStarter(row))
      .filter((row) => agentIdsForAuthorization(row).includes(agentId))
      .map(compactAuthorization);
    const generatedArtifactResidualAuthorizations = (artifacts.a22GeneratedArtifactResidualAuthorizations.rows ?? [])
      .filter((row) => agentIdsForGeneratedArtifactAuthorization(row).includes(agentId))
      .map(compactGeneratedArtifactAuthorization);
    const remainingCompletionAssignments = (artifacts.remainingCompletionAssignments.assignments ?? []).filter((row) => (row.agentIds ?? []).includes(agentId)).map(compactRemaining);
    const recommendedWorktrees = unique([
      ...ownerPackageAssignments.map((row) => row.recommendedWorktree),
      ...blockerReportStarters.map((row) => row.recommendedWorktree),
      ...authorizationStarters.map((row) => row.worktreePath),
      ...generatedArtifactResidualAuthorizations.map((row) => row.commandCwd)
    ]);
    const checks = unique(ownerPackageAssignments.flatMap((row) => row.checks));
    const pendingBlockerReports = blockerReportStarters.filter((row) => !row.recorded).length;
    const pendingItems = ownerPackageAssignments.length + pendingBlockerReports + authorizationStarters.length + generatedArtifactResidualAuthorizations.length + remainingCompletionAssignments.length;
    return {
      agentId,
      owner: ownerLabel(agentId, artifacts),
      recommendedWorktrees,
      ownerPackageAssignments,
      blockerReportStarters,
      authorizationStarters,
      generatedArtifactResidualAuthorizations,
      remainingCompletionAssignments,
      checks,
      pendingItems,
      pendingBlockerReports,
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function summarize(rows) {
  return {
    owners: rows.length,
    ownersWithOwnerPackageAssignments: rows.filter((row) => row.ownerPackageAssignments.length > 0).length,
    ownersWithBlockerReportStarters: rows.filter((row) => row.blockerReportStarters.length > 0).length,
    ownersWithAuthorizationStarters: rows.filter((row) => row.authorizationStarters.length > 0).length,
    ownersWithGeneratedArtifactResidualAuthorizations: rows.filter((row) => row.generatedArtifactResidualAuthorizations.length > 0).length,
    ownersWithRemainingCompletionAssignments: rows.filter((row) => row.remainingCompletionAssignments.length > 0).length,
    ownerPackageAssignments: rows.reduce((sum, row) => sum + row.ownerPackageAssignments.length, 0),
    blockerReportStarters: rows.reduce((sum, row) => sum + row.blockerReportStarters.length, 0),
    recordedBlockerReports: rows.reduce((sum, row) => sum + row.blockerReportStarters.filter((item) => item.recorded).length, 0),
    pendingBlockerReports: rows.reduce((sum, row) => sum + row.pendingBlockerReports, 0),
    authorizationStarters: rows.reduce((sum, row) => sum + row.authorizationStarters.length, 0),
    generatedArtifactResidualAuthorizations: rows.reduce((sum, row) => sum + row.generatedArtifactResidualAuthorizations.length, 0),
    remainingCompletionAssignments: rows.reduce((sum, row) => sum + row.remainingCompletionAssignments.length, 0),
    pendingItems: rows.reduce((sum, row) => sum + row.pendingItems, 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner closure action queue gate");
    console.log(`Owners: ${payload.owners ?? 0}`);
    console.log(`Pending items: ${payload.pendingItems ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner closure action queue gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, owners: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const artifacts = {
    ownerPackageAssignments: readJson(paths.ownerPackageAssignments),
    blockerReportStarter: readJson(paths.blockerReportStarter),
    blockerReports: readJson(paths.blockerReports),
    nextOwnerAuthorizationsStarter: readJson(paths.nextOwnerAuthorizationsStarter),
    a22GeneratedArtifactResidualAuthorizations: readJson(paths.a22GeneratedArtifactResidualAuthorizations),
    remainingCompletionAssignments: readJson(paths.remainingCompletionAssignments)
  };
  const queue = readJson(paths.queue);
  for (const [label, artifact] of Object.entries(artifacts)) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  reportRecords = new Map((artifacts.blockerReports.reports ?? []).map((row) => [row.reportId, row]));

  const expectedRows = queueRows(artifacts);
  const expectedSummary = summarize(expectedRows);
  const expectedSourceArtifacts = {
    ownerPackageAssignmentsGeneratedAt: artifacts.ownerPackageAssignments.generatedAt,
    blockerReportStarterGeneratedAt: artifacts.blockerReportStarter.generatedAt,
    blockerReportsGeneratedAt: artifacts.blockerReports.generatedAt,
    nextOwnerAuthorizationsStarterGeneratedAt: artifacts.nextOwnerAuthorizationsStarter.generatedAt,
    a22GeneratedArtifactResidualAuthorizationsGeneratedAt: artifacts.a22GeneratedArtifactResidualAuthorizations.generatedAt,
    remainingCompletionAssignmentsGeneratedAt: artifacts.remainingCompletionAssignments.generatedAt
  };
  const expectedValidationHold = validationHoldWithCommands();

  if (queue.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("queue dirty-map signature is stale");
  if (queue.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("queue expanded dirty entry count is stale");
  if (!sameJson(queue.sourceArtifacts, expectedSourceArtifacts)) failures.push("queue source artifacts are stale");
  if (!sameJson(queue.summary, expectedSummary)) failures.push("queue summary is stale");
  if (!sameJson(queue.ownerQueues, expectedRows)) failures.push("queue owner rows are stale");
  if (!sameJson(queue.validationHold ?? null, expectedValidationHold)) failures.push("queue validation hold is stale");
  if (queue.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") failures.push("queue validation hold must wait for owner compose deletion confirmation");
  if ((queue.validationHold?.safePostInputValidationCommands ?? []).length !== 5) failures.push("queue validation hold safe command count is stale");
  if ((queue.validationHold?.deferredAggregateValidationCommands ?? []).length !== 8) failures.push("queue validation hold deferred command count is stale");
  if ((queue.validationHold?.safePostInputValidationCommands ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence") || command.includes("refresh-linked-worktree-archive-evidence"))) {
    failures.push("queue validation hold safe commands must not include linked or aggregate refresh commands");
  }
  if ((queue.ownerQueues ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) failures.push("queue contains executable or cleanup-authorized row");

  const markdown = readText(paths.queueMarkdown);
  if (markdown.includes("undefined")) failures.push("queue markdown contains undefined");
  if (!markdown.includes("This queue is coordination evidence only.")) failures.push("queue markdown missing non-authorization boundary");
  if (!markdown.includes("Owner package assignments")) failures.push("queue markdown missing owner package assignments section");
  if (!markdown.includes("Validation Hold")) failures.push("queue markdown missing validation hold section");
  if (!markdown.includes("waiting-for-owner-compose-deletion-confirmation")) failures.push("queue markdown missing validation hold status");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    owners: expectedSummary.owners,
    pendingItems: expectedSummary.pendingItems,
    ownerPackageAssignments: expectedSummary.ownerPackageAssignments,
    blockerReportStarters: expectedSummary.blockerReportStarters,
    recordedBlockerReports: expectedSummary.recordedBlockerReports,
    pendingBlockerReports: expectedSummary.pendingBlockerReports,
    authorizationStarters: expectedSummary.authorizationStarters,
    generatedArtifactResidualAuthorizations: expectedSummary.generatedArtifactResidualAuthorizations,
    remainingCompletionAssignments: expectedSummary.remainingCompletionAssignments,
    validationHoldStatus: queue.validationHold?.status ?? null,
    safePostInputValidationCommands: (queue.validationHold?.safePostInputValidationCommands ?? []).length,
    deferredAggregateValidationCommands: (queue.validationHold?.deferredAggregateValidationCommands ?? []).length,
    cleanupAuthorizedRows: expectedSummary.cleanupAuthorizedRows,
    executableRows: expectedSummary.executableRows,
    failures
  });
}

main();
