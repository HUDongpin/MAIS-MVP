#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  assignmentPacket: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  reportTarget: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  latestJson: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-blocker-report-starter.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-blocker-report-starter.md`
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

function starterRow(assignment, dirtyMap, assignmentPacket) {
  const base = sourceRow(assignment);
  return {
    ...base,
    reportFingerprint: fingerprint(base, dirtyMap, assignmentPacket),
    reportStatus: "pending-owner-report",
    reportedBy: "",
    reportedAt: "",
    blockerSummary: "",
    ownerDecision: "",
    evidenceReviewed: [
      paths.assignmentPacket,
      paths.latestJson,
      "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet-current-gate.json"
    ],
    nextAction: "",
    notes: "",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function summary(reports) {
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

function markdown(payload) {
  const rows = payload.reports.map((row) => (
    `| \`${row.reportId}\` | ${row.agentId} | ${row.owner} | ${row.packageRows.length} | ${row.writeScope.length} | ${row.coordinationRequired.length} | ${row.reportStatus} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a | n/a | n/a |";

  const details = payload.reports.map((row) => `## ${row.reportId}

- Assignment ID: \`${row.assignmentId}\`
- Agent: ${row.agentId}
- Owner: ${row.owner}
- Recommended worktree: \`${row.recommendedWorktree}\`
- Report fingerprint: \`${row.reportFingerprint}\`
- Reported by: ${row.reportedBy || "(blank)"}
- Reported at: ${row.reportedAt || "(blank)"}
- Owner decision: ${row.ownerDecision || "(blank)"}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Package blockers:
${row.packageRows.map((item) => `  - \`${item.matrixId}\`: ${item.blockingReasons.join("; ") || "no blocking reason recorded"}`).join("\n")}
- Write scope candidates:
${row.writeScope.length > 0 ? row.writeScope.map((item) => `  - \`${item}\``).join("\n") : "  - none"}
- Coordination required:
${row.coordinationRequired.length > 0 ? row.coordinationRequired.map((item) => `  - \`${item.file}\`: ${item.reason}`).join("\n") : "  - none"}
- Checks:
${row.checks.map((item) => `  - \`${item}\``).join("\n")}
- Stop conditions:
${row.stopConditions.map((item) => `  - ${item}`).join("\n")}
`).join("\n");

  return `# A25 Owner Package Blocker Report Starter

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source assignment packet generated: ${payload.sourceAssignmentPacketGeneratedAt}

Target blocker report file: \`${paths.reportTarget}\`

This is a starter artifact only, not a blocker report and not authorization. It does not create or update the target blocker report file. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Pending rows: ${payload.summary.pendingRows}
- Package row links: ${payload.summary.packageRowLinks}
- Write-scope files: ${payload.summary.writeScopeFiles}
- Coordination-required files: ${payload.summary.coordinationRequiredFiles}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

| Report ID | Agent | Owner | Package rows | Write files | Coordination files | Status | Executable now |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const assignmentPacket = readJson(paths.assignmentPacket);
  if (assignmentPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Owner package blocker assignment packet is stale relative to the latest dirty map.");
  }
  if (assignmentPacket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Owner package blocker assignment packet dirty entry count is stale.");
  }

  const reports = (assignmentPacket.assignments ?? []).map((assignment) => starterRow(assignment, dirtyMap, assignmentPacket));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceAssignmentPacketGeneratedAt: assignmentPacket.generatedAt,
    reportTarget: paths.reportTarget,
    cleanupAuthorized: false,
    executableNow: false,
    summary: summary(reports),
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
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    starterRows: payload.summary.starterRows,
    packageRowLinks: payload.summary.packageRowLinks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
