#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  a22GeneratedArtifactResidualAuthorizations: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  target: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorizations-starter.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorizations-starter.md`
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

function stableFingerprint(row, dirtyMap, nextOwnerPacket) {
  const payload = {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceNextOwnerPacketGeneratedAt: nextOwnerPacket.generatedAt,
    approvalKind: row.approvalKind,
    approvalId: row.approvalId,
    owner: row.owner,
    ownerHints: row.ownerHints,
    subject: row.subject,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    pathspec: row.pathspec,
    workOrder: row.workOrder,
    evidence: row.evidence,
    requiredAuthorizationText: row.requiredAuthorizationText
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizePackageResync(row) {
  return {
    approvalKind: "wave01-package-resync",
    approvalId: row.approvalId,
    owner: row.owner,
    ownerHints: [],
    subject: row.path,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.actionKind,
    exactCommand: row.commandHint,
    pathspec: "",
    workOrder: "",
    evidence: [
      "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
      "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
      "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json"
    ],
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? []
  };
}

function normalizeOwnerPackage(row) {
  return {
    approvalKind: "owner-package",
    approvalId: row.approvalId,
    owner: row.owner,
    ownerHints: [],
    subject: row.pathspec,
    path: row.pathspec,
    branch: "",
    worktreePath: "",
    selectedAction: "owner-selected-final-state",
    exactCommand: "",
    pathspec: row.pathspec,
    workOrder: row.workOrder,
    evidence: [row.pathspec, row.workOrder].filter(Boolean),
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    priority: row.priority,
    entries: row.entries,
    packageKind: row.packageKind,
    currentBlocker: row.currentBlocker
  };
}

function normalizePhysical(row) {
  return {
    approvalKind: "physical-lifecycle",
    approvalId: row.approvalId,
    owner: (row.ownerHints ?? []).join(", ") || "owner to confirm",
    ownerHints: row.ownerHints ?? [],
    subject: row.branch,
    path: row.path,
    branch: row.branch,
    worktreePath: row.path,
    selectedAction: "owner-selected-lifecycle-final-state",
    exactCommand: "",
    pathspec: "",
    workOrder: "",
    evidence: row.evidence ?? [],
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    state: row.state,
    queueKind: row.queueKind,
    currentBlocker: row.currentBlocker
  };
}

function normalizeGeneratedArtifactResidual(row) {
  return {
    approvalKind: row.approvalKind,
    approvalId: row.approvalId,
    owner: row.owner,
    ownerHints: [row.supportingOwner].filter(Boolean),
    subject: row.path,
    path: row.path,
    branch: "",
    worktreePath: row.commandCwd,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    pathspec: "",
    workOrder: "coordination/release-intake/latest-A25-owner-closure-work-order-a22.md",
    evidence: [
      paths.a22GeneratedArtifactResidualAuthorizations,
      ...(row.evidence ?? [])
    ],
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    priority: row.priority,
    targetType: row.targetType,
    manifestSha256: row.manifestSha256,
    manifestBytes: row.manifestBytes,
    dryRunBytes: row.dryRunBytes,
    residualSkipReason: row.residualSkipReason
  };
}

function makeStarterRow(sourceRow, dirtyMap, nextOwnerPacket) {
  const approvalFingerprint = stableFingerprint(sourceRow, dirtyMap, nextOwnerPacket);
  return {
    ...sourceRow,
    approvalFingerprint,
    selectedFinalState: "",
    approvedBy: "",
    approvedAt: "",
    evidenceReviewed: [
      paths.nextOwnerPacket,
      paths.latestJson,
      ...sourceRow.evidence
    ],
    notes: "",
    authorizationText: sourceRow.requiredAuthorizationText,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function rowsFromPacket(packet, a22GeneratedArtifactResidualAuthorizations) {
  return [
    ...(packet.packageResyncApprovals ?? []).map(normalizePackageResync),
    ...(packet.ownerPackageApprovals ?? []).map(normalizeOwnerPackage),
    ...(packet.physicalLifecycleApprovals ?? []).map(normalizePhysical),
    ...(a22GeneratedArtifactResidualAuthorizations.rows ?? []).map(normalizeGeneratedArtifactResidual)
  ];
}

function markdown(payload) {
  const rows = payload.authorizations.map((row) => (
    `| \`${row.approvalId}\` | ${row.approvalKind} | ${row.owner} | \`${row.subject}\` | ${row.approvedBy ? "filled" : "blank"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a |";

  const details = payload.authorizations.map((row) => `### ${row.approvalId}

- Kind: ${row.approvalKind}
- Owner: ${row.owner}
- Subject: \`${row.subject}\`
- Path: \`${row.path}\`
- Branch: \`${row.branch}\`
- Worktree path: \`${row.worktreePath}\`
- Selected action: ${row.selectedAction}
- Exact command: \`${row.exactCommand}\`
- Selected final state: ${row.selectedFinalState || "(blank)"}
- Approval fingerprint: \`${row.approvalFingerprint}\`
- Approved by: ${row.approvedBy || "(blank)"}
- Approved at: ${row.approvedAt || "(blank)"}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Evidence reviewed:
${row.evidenceReviewed.map((item) => `  - \`${item}\``).join("\n")}
- Authorization text:

\`\`\`text
${row.authorizationText}
\`\`\`
`).join("\n");

  return `# A25 Next Owner Authorizations Starter

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source next-owner packet generated: ${payload.sourceNextOwnerPacketGeneratedAt}

Target authorization file: \`${paths.target}\`

This is a starter artifact only, not authorization. It does not create or update the target authorization file. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Wave 01 package-resync rows: ${payload.summary.byKind["wave01-package-resync"] ?? 0}
- Owner-package rows: ${payload.summary.byKind["owner-package"] ?? 0}
- Physical-lifecycle rows: ${payload.summary.byKind["physical-lifecycle"] ?? 0}
- A22 generated-artifact residual cleanup rows: ${payload.summary.byKind["a22-generated-artifact-residual-cleanup"] ?? 0}
- Blank approval rows: ${payload.summary.blankApprovalRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Starter Rows

| Approval ID | Kind | Owner | Subject | Approval fields | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}

## Starter Details

${details || "No next-owner authorization starter rows are currently required."}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const a22GeneratedArtifactResidualAuthorizations = readJson(paths.a22GeneratedArtifactResidualAuthorizations);

  if (nextOwnerPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Next-owner approval packet is stale relative to the latest dirty map.");
  }
  if (nextOwnerPacket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Next-owner approval packet dirty entry count is stale.");
  }
  if (a22GeneratedArtifactResidualAuthorizations.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("A22 generated-artifact residual authorization packet is stale relative to the latest dirty map.");
  }
  if (a22GeneratedArtifactResidualAuthorizations.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("A22 generated-artifact residual authorization packet dirty entry count is stale.");
  }

  const sourceRows = rowsFromPacket(nextOwnerPacket, a22GeneratedArtifactResidualAuthorizations);
  const authorizations = sourceRows.map((row) => makeStarterRow(row, dirtyMap, nextOwnerPacket));
  const byKind = authorizations.reduce((counts, row) => {
    counts[row.approvalKind] = (counts[row.approvalKind] ?? 0) + 1;
    return counts;
  }, {});
  const summary = {
    starterRows: authorizations.length,
    byKind,
    blankApprovalRows: authorizations.filter((row) => !row.selectedFinalState && !row.approvedBy && !row.approvedAt && !row.notes).length,
    cleanupAuthorizedRows: authorizations.filter((row) => row.cleanupAuthorized).length,
    executableRows: authorizations.filter((row) => row.executableNow).length
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceNextOwnerPacketGeneratedAt: nextOwnerPacket.generatedAt,
    sourceA22GeneratedArtifactResidualAuthorizationsGeneratedAt: a22GeneratedArtifactResidualAuthorizations.generatedAt,
    authorizationTarget: paths.target,
    cleanupAuthorized: false,
    executableNow: false,
    summary,
    authorizations
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
    starterRows: summary.starterRows,
    byKind: summary.byKind,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
