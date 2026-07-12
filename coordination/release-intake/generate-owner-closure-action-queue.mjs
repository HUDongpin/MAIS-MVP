#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { validationHoldWithCommands } from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageAssignments: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  blockerReportStarter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  blockerReports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  nextOwnerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  a22GeneratedArtifactResidualAuthorizations: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  remainingCompletionAssignments: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  latestJson: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-closure-action-queue.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-closure-action-queue.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-closure-action-queue.md`
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

function ensureCurrent(label, artifact, dirtyMap) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error(`${label} dirty-map signature is stale.`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error(`${label} expanded dirty entry count is stale.`);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function agentIdsFromText(value) {
  const ids = String(value ?? "").match(/\bA\d{2}\b/g) ?? [];
  return unique(ids);
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
    const ownerPackageAssignments = (artifacts.ownerPackageAssignments.assignments ?? [])
      .filter((row) => row.agentId === agentId)
      .map(compactAssignment);
    const blockerReportStarters = (artifacts.blockerReportStarter.reports ?? [])
      .filter((row) => row.agentId === agentId)
      .map(compactReport);
    const authorizationStarters = (artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [])
      .filter((row) => !isGeneratedArtifactResidualAuthorizationStarter(row))
      .filter((row) => agentIdsForAuthorization(row).includes(agentId))
      .map(compactAuthorization);
    const generatedArtifactResidualAuthorizations = (artifacts.a22GeneratedArtifactResidualAuthorizations.rows ?? [])
      .filter((row) => agentIdsForGeneratedArtifactAuthorization(row).includes(agentId))
      .map(compactGeneratedArtifactAuthorization);
    const remainingCompletionAssignments = (artifacts.remainingCompletionAssignments.assignments ?? [])
      .filter((row) => (row.agentIds ?? []).includes(agentId))
      .map(compactRemaining);
    const recommendedWorktrees = unique([
      ...ownerPackageAssignments.map((row) => row.recommendedWorktree),
      ...blockerReportStarters.map((row) => row.recommendedWorktree),
      ...authorizationStarters.map((row) => row.worktreePath),
      ...generatedArtifactResidualAuthorizations.map((row) => row.commandCwd)
    ]);
    const checks = unique(ownerPackageAssignments.flatMap((row) => row.checks));
    const pendingBlockerReports = blockerReportStarters.filter((row) => !row.recorded).length;
    const pendingItems =
      ownerPackageAssignments.length +
      pendingBlockerReports +
      authorizationStarters.length +
      generatedArtifactResidualAuthorizations.length +
      remainingCompletionAssignments.length;

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

function commandList(commands) {
  return (commands ?? []).length > 0 ? commands.map((command) => `- \`${command}\``).join("\n") : "- none";
}

function markdown(payload) {
  const rows = payload.ownerQueues.map((row) => (
    `| ${row.agentId} | ${row.owner} | ${row.ownerPackageAssignments.length} | ${row.blockerReportStarters.length} | ${row.authorizationStarters.length} | ${row.generatedArtifactResidualAuthorizations.length} | ${row.remainingCompletionAssignments.length} | ${row.pendingItems} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | 0 | 0 | 0 | 0 | 0 | no |";

  const details = payload.ownerQueues.map((row) => `## ${row.agentId}

- Owner: ${row.owner}
- Recommended worktrees:
${row.recommendedWorktrees.length ? row.recommendedWorktrees.map((item) => `  - \`${item}\``).join("\n") : "  - none"}
- Owner package assignments: ${row.ownerPackageAssignments.map((item) => `\`${item.assignmentId}\``).join(", ") || "none"}
- Blocker report starters: ${row.blockerReportStarters.map((item) => `\`${item.reportId}\``).join(", ") || "none"}
- Authorization starters: ${row.authorizationStarters.map((item) => `\`${item.approvalId}\``).join(", ") || "none"}
- A22 generated-artifact residual authorizations: ${row.generatedArtifactResidualAuthorizations.map((item) => `\`${item.approvalId}\``).join(", ") || "none"}
- Remaining completion assignments: ${row.remainingCompletionAssignments.map((item) => `\`${item.assignmentId}\``).join(", ") || "none"}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  return `# A25 Owner Closure Action Queue

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This queue is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Owners: ${payload.summary.owners}
- Owner package assignments: ${payload.summary.ownerPackageAssignments}
- Blocker report starters: ${payload.summary.blockerReportStarters}
- Recorded blocker reports: ${payload.summary.recordedBlockerReports}
- Pending blocker reports: ${payload.summary.pendingBlockerReports}
- Authorization starters: ${payload.summary.authorizationStarters}
- A22 generated-artifact residual authorizations: ${payload.summary.generatedArtifactResidualAuthorizations}
- Remaining completion assignments: ${payload.summary.remainingCompletionAssignments}
- Pending items: ${payload.summary.pendingItems}
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

| Agent | Owner | Package assignments | Report starters | Auth starters | A22 residual auth | Completion assignments | Pending items | Executable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const artifacts = {
    ownerPackageAssignments: readJson(paths.ownerPackageAssignments),
    blockerReportStarter: readJson(paths.blockerReportStarter),
    blockerReports: readJson(paths.blockerReports),
    nextOwnerAuthorizationsStarter: readJson(paths.nextOwnerAuthorizationsStarter),
    a22GeneratedArtifactResidualAuthorizations: readJson(paths.a22GeneratedArtifactResidualAuthorizations),
    remainingCompletionAssignments: readJson(paths.remainingCompletionAssignments)
  };

  for (const [label, artifact] of Object.entries(artifacts)) ensureCurrent(label, artifact, dirtyMap);
  reportRecords = new Map((artifacts.blockerReports.reports ?? []).map((row) => [row.reportId, row]));

  const ownerQueues = queueRows(artifacts);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceArtifacts: {
      ownerPackageAssignmentsGeneratedAt: artifacts.ownerPackageAssignments.generatedAt,
      blockerReportStarterGeneratedAt: artifacts.blockerReportStarter.generatedAt,
      blockerReportsGeneratedAt: artifacts.blockerReports.generatedAt,
      nextOwnerAuthorizationsStarterGeneratedAt: artifacts.nextOwnerAuthorizationsStarter.generatedAt,
      a22GeneratedArtifactResidualAuthorizationsGeneratedAt: artifacts.a22GeneratedArtifactResidualAuthorizations.generatedAt,
      remainingCompletionAssignmentsGeneratedAt: artifacts.remainingCompletionAssignments.generatedAt
    },
    note: "Coordination evidence only. Owner sessions must still work in approved scopes/worktrees and cannot perform physical cleanup without exact owner authorization.",
    validationHold: validationHoldWithCommands(),
    summary: summarize(ownerQueues),
    ownerQueues
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    owners: payload.summary.owners,
    pendingItems: payload.summary.pendingItems,
    validationHoldStatus: payload.validationHold.status,
    safePostInputValidationCommands: payload.validationHold.safePostInputValidationCommands.length,
    deferredAggregateValidationCommands: payload.validationHold.deferredAggregateValidationCommands.length,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
