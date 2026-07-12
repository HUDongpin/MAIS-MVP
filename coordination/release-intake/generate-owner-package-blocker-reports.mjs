#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  records: "coordination/release-intake/latest-A25-owner-package-blocker-report-records.json",
  latestJson: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-reports.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-blocker-reports.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-blocker-reports.md`
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

function readJsonIfExists(relativePath) {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? JSON.parse(fs.readFileSync(fullPath, "utf8")) : null;
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function validIsoDate(value) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function exactFields(starterRow) {
  return Object.fromEntries(exactKeys.map((key) => [key, starterRow[key]]));
}

function a25BlockerSummary(starterRow) {
  const packages = (starterRow.packageRows ?? []).map((row) => row.packageName).join(", ");
  const coordinationFiles = (starterRow.coordinationRequired ?? []).map((row) => row.file).join(", ");
  return `A25 cannot resolve these routed owner-package failures inside A25 write scope. The starter row has no A25 write-scope files; affected package owners must handle ${packages || "the routed packages"}, and the coordination-required files are ${coordinationFiles || "outside A25 scope"}.`;
}

function a25NextAction(starterRow) {
  const owners = [...new Set((starterRow.packageRows ?? []).flatMap((row) => row.packageOwnerIds ?? []))].sort().join(", ");
  return `Route the package rows to the owning sessions (${owners || "listed package owners"}) for scoped fixes or owner-authored blocker reports, then rerun A25 refresh/currentness gates.`;
}

function recordedA25Report(starterRow, existing) {
  return {
    ...exactFields(starterRow),
    reportStatus: "recorded-owner-blocker",
    reportedBy: existing?.reportedBy || "A25",
    reportedAt: validIsoDate(existing?.reportedAt) && existing?.reportFingerprint === starterRow.reportFingerprint
      ? existing.reportedAt
      : new Date().toISOString(),
    blockerSummary: existing?.blockerSummary || a25BlockerSummary(starterRow),
    ownerDecision: existing?.ownerDecision || "owner-routed-blocker",
    evidenceReviewed: [
      paths.starter,
      "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
      "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
      "coordination/release-intake/latest-A25-owner-closure-work-order-a25.md"
    ],
    nextAction: existing?.nextAction || a25NextAction(starterRow),
    notes: existing?.notes || "A25 records this blocker report as release-intake evidence only; no cleanup or feature-code action is authorized.",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function preservedOwnerReport(starterRow, existing) {
  return {
    ...exactFields(starterRow),
    reportStatus: existing.reportStatus,
    reportedBy: existing.reportedBy,
    reportedAt: existing.reportedAt,
    blockerSummary: existing.blockerSummary,
    ownerDecision: existing.ownerDecision,
    evidenceReviewed: existing.evidenceReviewed,
    nextAction: existing.nextAction,
    notes: existing.notes ?? "",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function validOwnerRecord(starterRow, record) {
  if (!record || record.reportStatus !== "recorded-owner-blocker") return false;
  if (!validIsoDate(record.reportedAt)) return false;
  if (!record.reportedBy || !record.blockerSummary || !record.ownerDecision || !record.nextAction) return false;
  if (record.cleanupAuthorized === true || record.executableNow === true) return false;
  return exactKeys.every((key) => JSON.stringify(record[key] ?? null) === JSON.stringify(starterRow[key] ?? null));
}

function summary(reports, starterRows) {
  return {
    starterRows: starterRows.length,
    recordedReports: reports.length,
    pendingReports: Math.max(starterRows.length - reports.length, 0),
    cleanupAuthorizedRows: reports.filter((row) => row.cleanupAuthorized).length,
    executableRows: reports.filter((row) => row.executableNow).length,
    agents: reports.map((row) => row.agentId)
  };
}

function markdown(payload) {
  const rows = payload.reports.map((row) => (
    `| \`${row.reportId}\` | ${row.agentId} | ${row.owner} | ${row.packageRows.length} | ${row.reportStatus} | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | 0 | n/a | no | no |";

  const details = payload.reports.map((row) => `## ${row.reportId}

- Agent: ${row.agentId}
- Owner: ${row.owner}
- Reported by: ${row.reportedBy}
- Reported at: ${row.reportedAt}
- Owner decision: ${row.ownerDecision}
- Blocker summary: ${row.blockerSummary}
- Next action: ${row.nextAction}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Evidence reviewed:
${row.evidenceReviewed.map((item) => `  - \`${item}\``).join("\n")}
`).join("\n");

  return `# A25 Owner Package Blocker Reports

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source starter generated: ${payload.sourceStarterGeneratedAt}

This is recorded owner-blocker evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Recorded reports: ${payload.summary.recordedReports}
- Pending reports: ${payload.summary.pendingReports}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

| Report ID | Agent | Owner | Package rows | Status | Cleanup authorized | Executable |
| --- | --- | --- | ---: | --- | --- | --- |
${rows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("owner package blocker report starter dirty-map signature is stale");
  }
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("owner package blocker report starter expanded dirty entry count is stale");
  }

  const starterRows = starter.reports ?? [];
  const starterById = new Map(starterRows.map((row) => [row.reportId, row]));
  const existing = readJsonIfExists(paths.latestJson);
  const existingById = new Map((existing?.reports ?? []).map((row) => [row.reportId, row]));
  const records = readJsonIfExists(paths.records);
  const recordById = new Map((records?.records ?? []).map((row) => [row.reportId, row]));
  const reports = [];

  for (const starterRow of starterRows) {
    const recordRow = recordById.get(starterRow.reportId);
    const existingRow = existingById.get(starterRow.reportId);
    if (starterRow.reportId === "owner-package-blocker-report-a25") {
      reports.push(recordedA25Report(starterRow, existingRow));
    } else if (validOwnerRecord(starterRow, recordRow)) {
      reports.push(preservedOwnerReport(starterRow, recordRow));
    } else if (existingRow?.reportStatus === "recorded-owner-blocker" && starterById.has(existingRow.reportId)) {
      reports.push(preservedOwnerReport(starterRow, existingRow));
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceStarterGeneratedAt: starter.generatedAt,
    cleanupAuthorized: false,
    executableNow: false,
    summary: summary(reports, starterRows),
    reports
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
    recordedReports: payload.summary.recordedReports,
    pendingReports: payload.summary.pendingReports,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
