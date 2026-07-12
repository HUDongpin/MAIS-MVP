#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorizations-starter-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  a22GeneratedArtifactResidualAuthorizations: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  starter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  starterMarkdown: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.md"
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

function expectedRows(packet, a22GeneratedArtifactResidualAuthorizations) {
  return [
    ...(packet.packageResyncApprovals ?? []).map(normalizePackageResync),
    ...(packet.ownerPackageApprovals ?? []).map(normalizeOwnerPackage),
    ...(packet.physicalLifecycleApprovals ?? []).map(normalizePhysical),
    ...(a22GeneratedArtifactResidualAuthorizations.rows ?? []).map(normalizeGeneratedArtifactResidual)
  ];
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const a22GeneratedArtifactResidualAuthorizations = readJson(paths.a22GeneratedArtifactResidualAuthorizations);
  const starter = readJson(paths.starter);
  const sourceRows = expectedRows(nextOwnerPacket, a22GeneratedArtifactResidualAuthorizations);
  const starterRows = starter.authorizations ?? [];

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");
  if (a22GeneratedArtifactResidualAuthorizations.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("A22 generated-artifact residual authorization packet dirty-map signature is stale");
  }
  if (a22GeneratedArtifactResidualAuthorizations.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("A22 generated-artifact residual authorization packet expanded dirty entry count is stale");
  }
  if (starter.sourceNextOwnerPacketGeneratedAt !== nextOwnerPacket.generatedAt) {
    failures.push("starter source next-owner packet timestamp is stale");
  }
  if (starter.sourceA22GeneratedArtifactResidualAuthorizationsGeneratedAt !== a22GeneratedArtifactResidualAuthorizations.generatedAt) {
    failures.push("starter source A22 generated-artifact residual authorization timestamp is stale");
  }
  if (starter.cleanupAuthorized !== false) failures.push("starter cleanupAuthorized must be false");
  if (starter.executableNow !== false) failures.push("starter executableNow must be false");
  if (starterRows.length !== sourceRows.length) failures.push("starter row count is stale");

  const byKind = starterRows.reduce((counts, row) => {
    counts[row.approvalKind] = (counts[row.approvalKind] ?? 0) + 1;
    return counts;
  }, {});
  const expectedSummary = {
    starterRows: starterRows.length,
    byKind,
    blankApprovalRows: starterRows.filter((row) => !row.selectedFinalState && !row.approvedBy && !row.approvedAt && !row.notes).length,
    cleanupAuthorizedRows: starterRows.filter((row) => row.cleanupAuthorized).length,
    executableRows: starterRows.filter((row) => row.executableNow).length
  };
  if (!sameJson(starter.summary, expectedSummary)) failures.push("starter summary is stale");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("starter must not authorize cleanup");
  if (expectedSummary.executableRows !== 0) failures.push("starter must not have executable rows");

  for (const [index, sourceRow] of sourceRows.entries()) {
    const row = starterRows[index];
    if (!row) continue;
    for (const key of [
      "approvalKind",
      "approvalId",
      "owner",
      "ownerHints",
      "subject",
      "path",
      "branch",
      "worktreePath",
      "selectedAction",
      "exactCommand",
      "pathspec",
      "workOrder",
      "evidence",
      "requiredAuthorizationText",
      "postApprovalChecks"
    ]) {
      if (!sameJson(row[key], sourceRow[key])) failures.push(`${sourceRow.approvalId}: ${key} is stale`);
    }
    if (row.approvalFingerprint !== stableFingerprint(sourceRow, dirtyMap, nextOwnerPacket)) {
      failures.push(`${sourceRow.approvalId}: approvalFingerprint is stale`);
    }
    if (row.selectedFinalState !== "") failures.push(`${sourceRow.approvalId}: selectedFinalState must be blank in starter`);
    if (row.approvedBy !== "") failures.push(`${sourceRow.approvalId}: approvedBy must be blank in starter`);
    if (row.approvedAt !== "") failures.push(`${sourceRow.approvalId}: approvedAt must be blank in starter`);
    if (row.notes !== "") failures.push(`${sourceRow.approvalId}: notes must be blank in starter`);
    if (row.cleanupAuthorized !== false) failures.push(`${sourceRow.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${sourceRow.approvalId}: executableNow must be false`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.nextOwnerPacket)) {
      failures.push(`${sourceRow.approvalId}: evidenceReviewed missing next-owner packet`);
    }
    if (!row.authorizationText?.includes(`approvalId=${sourceRow.approvalId}`)) {
      failures.push(`${sourceRow.approvalId}: authorizationText missing approval ID`);
    }
  }

  const markdown = readText(paths.starterMarkdown);
  if (markdown.includes("undefined")) failures.push("starter markdown contains undefined");
  if (!markdown.includes("starter artifact only, not authorization")) failures.push("starter markdown missing non-authorization boundary");
  if (!markdown.includes("Target authorization file")) failures.push("starter markdown missing target authorization file");
  if (!markdown.includes("Approval fingerprint")) failures.push("starter markdown missing approval fingerprint");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    starterRows: starterRows.length,
    byKind,
    blankApprovalRows: expectedSummary.blankApprovalRows,
    cleanupAuthorizedRows: expectedSummary.cleanupAuthorizedRows,
    executableRows: expectedSummary.executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next owner authorizations starter gate");
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next owner authorizations starter gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
