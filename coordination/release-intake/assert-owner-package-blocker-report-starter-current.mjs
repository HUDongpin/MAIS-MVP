#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-package-blocker-report-starter-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  assignmentPacket: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  starterMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.md"
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

function compactPackageRows(assignment) {
  return (assignment.packageRows ?? []).map((row) => ({
    matrixId: row.matrixId,
    waveId: row.waveId,
    packageId: row.packageId,
    packageName: row.packageName,
    packageOwnerIds: row.packageOwnerIds ?? [],
    blockingReasons: row.blockingReasons ?? [],
    failedCheckNames: row.failedCheckNames ?? [],
    failedChecks: row.failedChecks ?? []
  }));
}

function sourceRow(assignment) {
  return {
    reportId: `owner-package-blocker-report-${String(assignment.agentId).toLowerCase()}`,
    assignmentId: assignment.assignmentId,
    agentId: assignment.agentId,
    owner: assignment.owner,
    role: assignment.role,
    objective: assignment.objective,
    recommendedWorktree: assignment.recommendedWorktree,
    packageRows: compactPackageRows(assignment),
    uniqueReadFiles: assignment.uniqueReadFiles ?? [],
    writeScope: assignment.writeScope ?? [],
    coordinationRequired: assignment.coordinationRequired ?? [],
    checks: assignment.checks ?? [],
    stopConditions: assignment.stopConditions ?? [],
    dirtyStateFinalAction: assignment.dirtyStateFinalAction,
    worktreeLifecycleAction: assignment.worktreeLifecycleAction
  };
}

function fingerprint(row, dirtyMap, assignmentPacket) {
  const payload = {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceAssignmentPacketGeneratedAt: assignmentPacket.generatedAt,
    reportId: row.reportId,
    assignmentId: row.assignmentId,
    agentId: row.agentId,
    owner: row.owner,
    recommendedWorktree: row.recommendedWorktree,
    packageRows: row.packageRows,
    writeScope: row.writeScope,
    coordinationRequired: row.coordinationRequired,
    checks: row.checks,
    stopConditions: row.stopConditions
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function expectedSummary(reports) {
  return {
    starterRows: reports.length,
    pendingRows: reports.filter((row) => row.reportStatus === "pending-owner-report").length,
    agents: reports.map((row) => row.agentId),
    packageRowLinks: reports.reduce((sum, row) => sum + row.packageRows.length, 0),
    writeScopeFiles: reports.reduce((sum, row) => sum + row.writeScope.length, 0),
    coordinationRequiredFiles: reports.reduce((sum, row) => sum + row.coordinationRequired.length, 0),
    cleanupAuthorizedRows: reports.filter((row) => row.cleanupAuthorized).length,
    executableRows: reports.filter((row) => row.executableNow).length
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package blocker report starter gate");
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package blocker report starter gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const assignmentPacket = readJson(paths.assignmentPacket);
  const starter = readJson(paths.starter);
  const sourceRows = (assignmentPacket.assignments ?? []).map(sourceRow);
  const starterRows = starter.reports ?? [];

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");
  if (starter.sourceAssignmentPacketGeneratedAt !== assignmentPacket.generatedAt) failures.push("starter source assignment packet timestamp is stale");
  if (starter.cleanupAuthorized !== false) failures.push("starter cleanupAuthorized must be false");
  if (starter.executableNow !== false) failures.push("starter executableNow must be false");
  if (starterRows.length !== sourceRows.length) failures.push("starter row count is stale");

  for (const [index, source] of sourceRows.entries()) {
    const row = starterRows[index];
    if (!row) continue;
    for (const key of Object.keys(source)) {
      if (!sameJson(row[key], source[key])) failures.push(`${source.reportId}: ${key} is stale`);
    }
    if (row.reportFingerprint !== fingerprint(source, dirtyMap, assignmentPacket)) failures.push(`${source.reportId}: reportFingerprint is stale`);
    if (row.reportStatus !== "pending-owner-report") failures.push(`${source.reportId}: reportStatus must be pending-owner-report`);
    for (const blankKey of ["reportedBy", "reportedAt", "blockerSummary", "ownerDecision", "nextAction", "notes"]) {
      if (row[blankKey] !== "") failures.push(`${source.reportId}: ${blankKey} must be blank in starter`);
    }
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.assignmentPacket)) {
      failures.push(`${source.reportId}: evidenceReviewed missing assignment packet`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${source.reportId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${source.reportId}: executableNow must be false`);
  }

  const expected = expectedSummary(starterRows);
  if (!sameJson(starter.summary, expected)) failures.push("starter summary is stale");
  if (expected.cleanupAuthorizedRows !== 0) failures.push("starter must not authorize cleanup");
  if (expected.executableRows !== 0) failures.push("starter must not have executable rows");

  const markdown = readText(paths.starterMarkdown);
  if (markdown.includes("undefined")) failures.push("starter markdown contains undefined");
  if (!markdown.includes("starter artifact only, not a blocker report and not authorization")) failures.push("starter markdown missing non-authorization boundary");
  if (!markdown.includes("Target blocker report file")) failures.push("starter markdown missing target report file");
  if (!markdown.includes("Report fingerprint")) failures.push("starter markdown missing report fingerprint");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    starterRows: starterRows.length,
    pendingRows: expected.pendingRows,
    cleanupAuthorizedRows: expected.cleanupAuthorizedRows,
    executableRows: expected.executableRows,
    failures
  });
}

main();
