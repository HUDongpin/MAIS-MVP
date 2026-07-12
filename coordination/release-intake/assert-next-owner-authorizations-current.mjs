#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorizations-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  starter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  authorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json"
};

const exactKeys = [
  "approvalKind",
  "approvalId",
  "approvalFingerprint",
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
];

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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function includesAll(values, requiredValues) {
  return Array.isArray(values) && requiredValues.every((value) => values.includes(value));
}

function isGeneratedArtifactCleanupRow(row) {
  return row?.approvalKind === "a22-generated-artifact-residual-cleanup";
}

function requiredEvidenceForRow(row) {
  if (isGeneratedArtifactCleanupRow(row)) {
    return [
      "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
      "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json"
    ];
  }
  return [paths.nextOwnerPacket, paths.starter];
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.nextOwnerPacket, paths.starter]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const starter = readJson(paths.starter);
  const starterRows = starter.authorizations ?? [];
  const starterByApprovalId = new Map(starterRows.map((row) => [row.approvalId, row]));

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");
  if (starter.sourceNextOwnerPacketGeneratedAt !== nextOwnerPacket.generatedAt) {
    failures.push("starter source next-owner packet timestamp is stale");
  }

  if (!exists(paths.authorizations)) {
    return finish({
      checkedAt: new Date().toISOString(),
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      authorizationFile: paths.authorizations,
      authorizationFilePresent: false,
      starterRows: starterRows.length,
      authorizationRowsInFile: 0,
      authorizedRows: 0,
      pendingRows: starterRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failures
    });
  }

  const payload = readJson(paths.authorizations);
  const rows = payload.authorizations ?? [];
  if (!Array.isArray(rows)) failures.push("authorizations file must contain an authorizations array");
  if (payload.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("authorizations file dirty-map signature is stale or missing");
  }
  if (payload.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("authorizations file expanded dirty entry count is stale or missing");
  }
  if (payload.sourceNextOwnerPacketGeneratedAt !== nextOwnerPacket.generatedAt) {
    failures.push("authorizations file source next-owner packet timestamp is stale or missing");
  }
  if (payload.sourceStarterGeneratedAt !== starter.generatedAt) {
    failures.push("authorizations file source starter timestamp is stale or missing");
  }
  if (payload.cleanupAuthorized === true) failures.push("authorizations file cleanupAuthorized must not be true");
  if (payload.executableNow === true) failures.push("authorizations file executableNow must not be true");

  const seen = new Set();
  const validAuthorizedIds = new Set();
  const rowsToValidate = Array.isArray(rows) ? rows : [];

  for (const row of rowsToValidate) {
    const rowFailureStart = failures.length;
    if (!nonEmptyString(row.approvalId)) {
      failures.push("authorization row missing approvalId");
      continue;
    }
    if (seen.has(row.approvalId)) failures.push(`${row.approvalId}: duplicate approvalId`);
    seen.add(row.approvalId);

    const starterRow = starterByApprovalId.get(row.approvalId);
    if (!starterRow) {
      failures.push(`${row.approvalId}: unknown approvalId`);
      continue;
    }

    for (const key of exactKeys) {
      if (!sameJson(row[key], starterRow[key])) failures.push(`${row.approvalId}: ${key} must exactly match the starter`);
    }

    if (!isGeneratedArtifactCleanupRow(starterRow) && !nonEmptyString(row.selectedFinalState)) {
      failures.push(`${row.approvalId}: selectedFinalState is required`);
    }
    if (isGeneratedArtifactCleanupRow(starterRow) && row.selectedAction !== starterRow.selectedAction) {
      failures.push(`${row.approvalId}: selectedAction must match the cleanup starter row`);
    }
    if (isGeneratedArtifactCleanupRow(starterRow) && row.exactCommand !== starterRow.exactCommand) {
      failures.push(`${row.approvalId}: exactCommand must match the cleanup starter row`);
    }
    if (!nonEmptyString(row.approvedBy)) failures.push(`${row.approvalId}: approvedBy is required`);
    if (!validIsoDate(row.approvedAt)) failures.push(`${row.approvalId}: approvedAt must be an ISO-compatible date`);
    if (!Array.isArray(row.evidenceReviewed) || row.evidenceReviewed.length === 0) {
      failures.push(`${row.approvalId}: evidenceReviewed must be a non-empty array`);
    }
    const requiredEvidence = requiredEvidenceForRow(starterRow);
    if (!includesAll(row.evidenceReviewed, requiredEvidence)) {
      failures.push(`${row.approvalId}: evidenceReviewed must include ${requiredEvidence.join(" and ")}`);
    }
    if (!nonEmptyString(row.notes)) failures.push(`${row.approvalId}: notes are required`);
    if (nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: authorizationText missing approvalId`);
    }
    if (isGeneratedArtifactCleanupRow(starterRow) && nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`selectedAction=${starterRow.selectedAction}`)) {
      failures.push(`${row.approvalId}: authorizationText missing selectedAction`);
    }
    if (starterRow.exactCommand && nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`command=${starterRow.exactCommand}`)) {
      failures.push(`${row.approvalId}: authorizationText missing exact command`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must not be true in this validator`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must not be true in this validator`);

    if (failures.length === rowFailureStart) validAuthorizedIds.add(row.approvalId);
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    authorizationFile: paths.authorizations,
    authorizationFilePresent: true,
    starterRows: starterRows.length,
    authorizationRowsInFile: rowsToValidate.length,
    authorizedRows: validAuthorizedIds.size,
    pendingRows: Math.max(starterRows.length - validAuthorizedIds.size, 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next owner authorizations gate");
    console.log(`Authorization file present: ${payload.authorizationFilePresent ? "yes" : "no"}`);
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Authorized rows: ${payload.authorizedRows ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next owner authorizations gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
