#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-owner-authorizations-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  authorizations: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function arrayIncludes(array, value) {
  return Array.isArray(array) && array.includes(value);
}

function validateExact(row, templateRow, key, failures) {
  if (!sameJson(row[key], templateRow[key])) {
    failures.push(`${row.approvalId ?? "unknown"}: ${key} must exactly match the authorization template`);
  }
}

function approvalFingerprint(row, dirtyMap, executionPacket) {
  const fingerprintPayload = {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceExecutionPacketGeneratedAt: executionPacket.generatedAt,
    approvalId: row.approvalId,
    owner: row.owner,
    worktreePath: row.worktreePath,
    branch: row.branch,
    path: row.path,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd
  };
  return crypto.createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.executionPacket, paths.template]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, templateRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const executionPacket = readJson(paths.executionPacket);
  const template = readJson(paths.template);
  const templateRows = template.authorizations ?? [];
  const templateByApprovalId = new Map(templateRows.map((row) => [row.approvalId, row]));

  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("authorization template dirty-map signature is stale");
  if (template.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("authorization template expanded dirty entry count is stale");
  }
  if (template.executionPacketGeneratedAt !== executionPacket.generatedAt) {
    failures.push("authorization template execution packet timestamp is stale");
  }

  if (!exists(paths.authorizations)) {
    return finish({
      checkedAt: new Date().toISOString(),
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      authorizationFile: paths.authorizations,
      authorizationFilePresent: false,
      templateRows: templateRows.length,
      authorizationRowsInFile: 0,
      authorizedRows: 0,
      pendingRows: templateRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failures
    });
  }

  const authorizationPayload = readJson(paths.authorizations);
  const authorizationRows = authorizationPayload.authorizations ?? [];
  if (!Array.isArray(authorizationRows)) failures.push("authorizations file must contain an authorizations array");
  if (authorizationPayload.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("authorizations file dirty-map signature is stale or missing");
  }
  if (authorizationPayload.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("authorizations file expanded dirty entry count is stale or missing");
  }
  if (authorizationPayload.sourceTemplateGeneratedAt !== template.generatedAt) {
    failures.push("authorizations file source template timestamp is stale or missing");
  }
  if (authorizationPayload.sourceExecutionPacketGeneratedAt !== executionPacket.generatedAt) {
    failures.push("authorizations file source execution packet timestamp is stale or missing");
  }

  const seenApprovalIds = new Set();
  const validAuthorizedIds = new Set();
  const rowsToValidate = Array.isArray(authorizationRows) ? authorizationRows : [];

  for (const row of rowsToValidate) {
    const rowFailureStart = failures.length;
    if (!nonEmptyString(row.approvalId)) {
      failures.push("authorization row missing approvalId");
      continue;
    }
    if (seenApprovalIds.has(row.approvalId)) failures.push(`${row.approvalId}: duplicate approvalId`);
    seenApprovalIds.add(row.approvalId);

    const templateRow = templateByApprovalId.get(row.approvalId);
    if (!templateRow) {
      failures.push(`${row.approvalId}: unknown approvalId`);
      continue;
    }

    for (const key of ["owner", "worktreePath", "branch", "path", "selectedAction", "exactCommand", "commandCwd"]) {
      validateExact(row, templateRow, key, failures);
    }
    const expectedFingerprint = approvalFingerprint(templateRow, dirtyMap, executionPacket);
    if (row.approvalFingerprint !== expectedFingerprint) {
      failures.push(`${row.approvalId}: approvalFingerprint is stale or missing`);
    }

    if (!nonEmptyString(row.approvedBy)) failures.push(`${row.approvalId}: approvedBy is required`);
    if (!validIsoDate(row.approvedAt)) failures.push(`${row.approvalId}: approvedAt must be an ISO-compatible date`);
    if (!Array.isArray(row.evidenceReviewed) || row.evidenceReviewed.length === 0) {
      failures.push(`${row.approvalId}: evidenceReviewed must be a non-empty array`);
    }
    if (!arrayIncludes(row.evidenceReviewed, paths.template)) {
      failures.push(`${row.approvalId}: evidenceReviewed must include ${paths.template}`);
    }
    if (!arrayIncludes(row.evidenceReviewed, paths.executionPacket)) {
      failures.push(`${row.approvalId}: evidenceReviewed must include ${paths.executionPacket}`);
    }
    if (!nonEmptyString(row.notes)) failures.push(`${row.approvalId}: notes are required`);
    if (nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: authorizationText missing approvalId`);
    }
    if (nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`command=${templateRow.exactCommand}`)) {
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
    templateRows: templateRows.length,
    authorizationRowsInFile: rowsToValidate.length,
    authorizedRows: validAuthorizedIds.size,
    pendingRows: Math.max(templateRows.length - validAuthorizedIds.size, 0),
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
    console.log("A25 Wave 01 package resync owner-authorizations gate");
    console.log(`Authorization file present: ${payload.authorizationFilePresent ? "yes" : "no"}`);
    console.log(`Template rows: ${payload.templateRows ?? 0}`);
    console.log(`Authorized rows: ${payload.authorizedRows ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync owner-authorizations gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
