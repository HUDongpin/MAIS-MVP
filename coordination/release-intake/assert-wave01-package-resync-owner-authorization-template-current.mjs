#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-owner-authorization-template-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  templateMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.md"
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

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, templateRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const executionPacket = readJson(paths.executionPacket);
  const template = readJson(paths.template);
  const rows = template.authorizations ?? [];
  const executionRows = executionPacket.executionRows ?? [];

  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("authorization template dirty-map signature is stale");
  if (template.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("authorization template expanded dirty entry count is stale");
  if (template.executionPacketGeneratedAt !== executionPacket.generatedAt) failures.push("authorization template execution packet timestamp is stale");
  if (template.cleanupAuthorized !== false) failures.push("authorization template cleanupAuthorized must be false");
  if (template.executableNow !== false) failures.push("authorization template executableNow must be false");
  if (rows.length !== executionRows.length) failures.push("authorization template row count is stale");

  const expectedSummary = {
    templateRows: rows.length,
    pendingRows: rows.filter((row) => row.approvalStatus === "pending").length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };
  if (!sameJson(template.summary, expectedSummary)) failures.push("authorization template summary is stale");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("authorization template must not authorize cleanup");
  if (expectedSummary.executableRows !== 0) failures.push("authorization template must not have executable rows");

  for (const [index, executionRow] of executionRows.entries()) {
    const row = rows[index];
    if (!row) continue;
    for (const key of ["approvalId", "owner", "worktreePath", "branch", "path", "selectedAction", "exactCommand", "commandCwd"]) {
      if (!sameJson(row[key], executionRow[key])) failures.push(`${executionRow.approvalId}: ${key} is stale`);
    }
    if (row.approvalStatus !== "pending") failures.push(`${executionRow.approvalId}: template approvalStatus must stay pending`);
    if (row.approvedBy !== "") failures.push(`${executionRow.approvalId}: template approvedBy must be blank`);
    if (row.approvedAt !== "") failures.push(`${executionRow.approvalId}: template approvedAt must be blank`);
    if (row.notes !== "") failures.push(`${executionRow.approvalId}: template notes must be blank`);
    if (row.cleanupAuthorized !== false) failures.push(`${executionRow.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${executionRow.approvalId}: executableNow must be false`);
    if (!row.authorizationTextToPaste?.includes(`approvalId=${executionRow.approvalId}`)) {
      failures.push(`${executionRow.approvalId}: authorization text missing approval ID`);
    }
    if (!row.authorizationTextToPaste?.includes(`command=${executionRow.exactCommand}`)) {
      failures.push(`${executionRow.approvalId}: authorization text missing exact command`);
    }
  }

  const markdown = readText(paths.templateMarkdown);
  if (markdown.includes("undefined")) failures.push("authorization template markdown contains undefined");
  if (!markdown.includes("This is a template, not authorization")) failures.push("authorization template markdown missing non-authorization boundary");
  if (!markdown.includes("Authorization text to paste")) failures.push("authorization template markdown missing pasteable authorization text");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    templateRows: rows.length,
    pendingRows: expectedSummary.pendingRows,
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
    console.log("A25 Wave 01 package resync owner-authorization template gate");
    console.log(`Template rows: ${payload.templateRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync owner-authorization template gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
