#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-owner-authorizations-starter-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  starter: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json",
  starterMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.md"
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
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const executionPacket = readJson(paths.executionPacket);
  const template = readJson(paths.template);
  const starter = readJson(paths.starter);
  const templateRows = template.authorizations ?? [];
  const starterRows = starter.authorizations ?? [];

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");
  if (starter.sourceTemplateGeneratedAt !== template.generatedAt) failures.push("starter source template timestamp is stale");
  if (starter.sourceExecutionPacketGeneratedAt !== executionPacket.generatedAt) failures.push("starter source execution packet timestamp is stale");
  if (starter.cleanupAuthorized !== false) failures.push("starter cleanupAuthorized must be false");
  if (starter.executableNow !== false) failures.push("starter executableNow must be false");
  if (starterRows.length !== templateRows.length) failures.push("starter row count is stale");

  const expectedSummary = {
    starterRows: starterRows.length,
    blankApprovalRows: starterRows.filter((row) => !row.approvedBy && !row.approvedAt && !row.notes).length,
    cleanupAuthorizedRows: starterRows.filter((row) => row.cleanupAuthorized).length,
    executableRows: starterRows.filter((row) => row.executableNow).length
  };
  if (!sameJson(starter.summary, expectedSummary)) failures.push("starter summary is stale");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("starter must not authorize cleanup");
  if (expectedSummary.executableRows !== 0) failures.push("starter must not have executable rows");

  for (const [index, templateRow] of templateRows.entries()) {
    const row = starterRows[index];
    if (!row) continue;
    for (const key of ["approvalId", "owner", "worktreePath", "branch", "path", "selectedAction", "exactCommand", "commandCwd"]) {
      if (!sameJson(row[key], templateRow[key])) failures.push(`${templateRow.approvalId}: ${key} is stale`);
    }
    const expectedFingerprint = approvalFingerprint(templateRow, dirtyMap, executionPacket);
    if (row.approvalFingerprint !== expectedFingerprint) {
      failures.push(`${templateRow.approvalId}: approvalFingerprint is stale`);
    }
    if (row.approvedBy !== "") failures.push(`${templateRow.approvalId}: approvedBy must be blank in starter`);
    if (row.approvedAt !== "") failures.push(`${templateRow.approvalId}: approvedAt must be blank in starter`);
    if (row.notes !== "") failures.push(`${templateRow.approvalId}: notes must be blank in starter`);
    if (row.cleanupAuthorized !== false) failures.push(`${templateRow.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${templateRow.approvalId}: executableNow must be false`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.template)) {
      failures.push(`${templateRow.approvalId}: evidenceReviewed missing authorization template`);
    }
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.executionPacket)) {
      failures.push(`${templateRow.approvalId}: evidenceReviewed missing execution packet`);
    }
    if (!row.authorizationText?.includes(`approvalId=${templateRow.approvalId}`)) {
      failures.push(`${templateRow.approvalId}: authorizationText missing approval ID`);
    }
    if (!row.authorizationText?.includes(`command=${templateRow.exactCommand}`)) {
      failures.push(`${templateRow.approvalId}: authorizationText missing exact command`);
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
    console.log("A25 Wave 01 package resync owner-authorizations starter gate");
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync owner-authorizations starter gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
