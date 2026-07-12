#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-package-blocker-reports-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  reports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json"
};

const exactKeys = [
  "reportId",
  "reportFingerprint",
  "assignmentId",
  "agentId",
  "owner",
  "role",
  "objective",
  "recommendedWorktree",
  "packageRows",
  "uniqueReadFiles",
  "writeScope",
  "coordinationRequired",
  "checks",
  "stopConditions",
  "dirtyStateFinalAction",
  "worktreeLifecycleAction"
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

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package blocker reports gate");
    console.log(`Report file present: ${payload.reportFilePresent ? "yes" : "no"}`);
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Recorded reports: ${payload.recordedReports ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package blocker reports gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.starter]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  const starterRows = starter.reports ?? [];
  const starterByReportId = new Map(starterRows.map((row) => [row.reportId, row]));

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");

  if (!exists(paths.reports)) {
    return finish({
      checkedAt: new Date().toISOString(),
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      reportFile: paths.reports,
      reportFilePresent: false,
      starterRows: starterRows.length,
      recordedReports: 0,
      pendingReports: starterRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failures
    });
  }

  const payload = readJson(paths.reports);
  const reports = payload.reports ?? [];
  if (!Array.isArray(reports)) failures.push("reports file must contain a reports array");
  if (payload.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("reports file dirty-map signature is stale or missing");
  if (payload.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("reports file expanded dirty entry count is stale or missing");
  if (payload.sourceStarterGeneratedAt !== starter.generatedAt) failures.push("reports file source starter timestamp is stale or missing");
  if (payload.cleanupAuthorized === true) failures.push("reports file cleanupAuthorized must not be true");
  if (payload.executableNow === true) failures.push("reports file executableNow must not be true");

  const seen = new Set();
  const validReportIds = new Set();
  const rows = Array.isArray(reports) ? reports : [];
  for (const row of rows) {
    const rowFailureStart = failures.length;
    if (!nonEmptyString(row.reportId)) {
      failures.push("report row missing reportId");
      continue;
    }
    if (seen.has(row.reportId)) failures.push(`${row.reportId}: duplicate reportId`);
    seen.add(row.reportId);

    const starterRow = starterByReportId.get(row.reportId);
    if (!starterRow) {
      failures.push(`${row.reportId}: unknown reportId`);
      continue;
    }
    for (const key of exactKeys) {
      if (!sameJson(row[key], starterRow[key])) failures.push(`${row.reportId}: ${key} must exactly match the starter`);
    }
    if (row.reportStatus !== "recorded-owner-blocker") failures.push(`${row.reportId}: reportStatus must be recorded-owner-blocker`);
    if (!nonEmptyString(row.reportedBy)) failures.push(`${row.reportId}: reportedBy is required`);
    if (!validIsoDate(row.reportedAt)) failures.push(`${row.reportId}: reportedAt must be an ISO-compatible date`);
    if (!nonEmptyString(row.blockerSummary)) failures.push(`${row.reportId}: blockerSummary is required`);
    if (!nonEmptyString(row.ownerDecision)) failures.push(`${row.reportId}: ownerDecision is required`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.starter)) {
      failures.push(`${row.reportId}: evidenceReviewed must include ${paths.starter}`);
    }
    if (!nonEmptyString(row.nextAction)) failures.push(`${row.reportId}: nextAction is required`);
    if (row.cleanupAuthorized === true) failures.push(`${row.reportId}: cleanupAuthorized must not be true in this validator`);
    if (row.executableNow === true) failures.push(`${row.reportId}: executableNow must not be true in this validator`);

    if (failures.length === rowFailureStart) validReportIds.add(row.reportId);
  }

  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = rows.filter((row) => row.executableNow).length;
  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    reportFile: paths.reports,
    reportFilePresent: true,
    starterRows: starterRows.length,
    reportRowsInFile: rows.length,
    recordedReports: validReportIds.size,
    pendingReports: Math.max(starterRows.length - validReportIds.size, 0),
    cleanupAuthorizedRows,
    executableRows,
    failures
  });
}

main();
