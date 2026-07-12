#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  reports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  focusPacket: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  latestJson: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.json",
  latestMarkdown: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.md",
  datedJson: `coordination/release-intake/${date}-A25-pending-owner-blocker-report-bundle.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-pending-owner-blocker-report-bundle.md`
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

function ensureCurrent(label, artifact, dirtyMap) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error(`${label} dirty-map signature is stale.`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error(`${label} expanded dirty entry count is stale.`);
  }
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function reportPath(row) {
  return `coordination/release-intake/latest-A25-pending-owner-blocker-report-${slug(row.agentId)}.md`;
}

function datedReportPath(row) {
  return `coordination/release-intake/${date}-A25-pending-owner-blocker-report-${slug(row.agentId)}.md`;
}

function compactPackage(row) {
  return {
    matrixId: row.matrixId,
    packageName: row.packageName,
    packageOwnerIds: row.packageOwnerIds ?? [],
    blockingReasons: row.blockingReasons ?? [],
    failedCheckNames: row.failedCheckNames ?? [],
    failedChecks: (row.failedChecks ?? []).map((check) => ({
      name: check.name,
      command: check.command,
      status: check.status
    }))
  };
}

function suggestedNextAction(row) {
  const firstCheck = row.checks?.[0]
    ? ` then rerun \`${row.checks[0]}\``
    : "";
  return `Use \`${row.recommendedWorktree}\` to resolve the routed blockers inside ${row.agentId}'s allowed write scope, or copy this draft into the owner blocker records file with reportStatus=recorded-owner-blocker and a concrete blocker summary${firstCheck}.`;
}

function compactReport(row) {
  return {
    reportId: row.reportId,
    assignmentId: row.assignmentId,
    reportFingerprint: row.reportFingerprint,
    agentId: row.agentId,
    owner: row.owner,
    role: row.role,
    objective: row.objective,
    recommendedWorktree: row.recommendedWorktree,
    packageRows: (row.packageRows ?? []).map(compactPackage),
    readScope: row.readScope ?? [],
    writeScope: row.writeScope ?? [],
    coordinationRequired: row.coordinationRequired ?? [],
    checks: row.checks ?? [],
    stopConditions: row.stopConditions ?? [],
    evidenceReviewed: row.evidenceReviewed ?? [],
    reportStatus: "pending-owner-report",
    ownerDecision: "",
    blockerSummary: "",
    nextAction: suggestedNextAction(row),
    latestMarkdown: reportPath(row),
    datedMarkdown: datedReportPath(row),
    cleanupAuthorized: false,
    executableNow: false
  };
}

function pendingReports(starter, reports) {
  const recordedIds = new Set((reports.reports ?? []).map((row) => row.reportId));
  return (starter.reports ?? [])
    .filter((row) => !recordedIds.has(row.reportId))
    .map(compactReport);
}

function summarize(rows, starter, reports, focusPacket) {
  return {
    starterRows: starter.reports?.length ?? 0,
    recordedReports: reports.summary?.recordedReports ?? reports.reports?.length ?? 0,
    pendingReports: rows.length,
    focusPendingOwnerBlockerReports: focusPacket.summary?.pendingOwnerBlockerReports ?? 0,
    packageRowLinks: rows.reduce((sum, row) => sum + row.packageRows.length, 0),
    writeScopeFiles: rows.reduce((sum, row) => sum + row.writeScope.length, 0),
    coordinationRequiredFiles: rows.reduce((sum, row) => sum + row.coordinationRequired.length, 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function list(values) {
  const rows = (values ?? []).filter(Boolean);
  return rows.length ? rows.map((item) => `- \`${item}\``).join("\n") : "- none";
}

function packageRowsMarkdown(row) {
  return row.packageRows.map((item) => (
    `| ${item.matrixId} | ${item.packageName} | ${(item.failedCheckNames ?? []).join("<br>") || "none"} | ${(item.blockingReasons ?? []).join("<br>") || "none"} |`
  )).join("\n") || "| none | n/a | n/a | n/a |";
}

function checksMarkdown(row) {
  return row.packageRows.flatMap((item) => (
    (item.failedChecks ?? []).map((check) => (
      `| ${item.packageName} | ${check.name} | \`${check.command}\` | ${check.status ?? "unknown"} |`
    ))
  )).join("\n") || "| none | n/a | n/a | n/a |";
}

function reportMarkdown(payload, row) {
  return `# A25 Pending Owner Blocker Report - ${row.agentId}

Generated: ${payload.generatedAt}

Report source: \`${paths.starter}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This pending report template is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Owner

- Agent: ${row.agentId}
- Owner: ${row.owner}
- Role: ${row.role}
- Report ID: \`${row.reportId}\`
- Assignment ID: \`${row.assignmentId}\`
- Report fingerprint: \`${row.reportFingerprint}\`
- Recommended worktree: \`${row.recommendedWorktree}\`
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}

## Objective

${row.objective}

## Required Owner Decision

The owner session should either resolve the package blockers inside its allowed scope or record a formal blocker report. A valid report must state:

- owner decision: resolved, partially resolved, or blocked
- blocker summary
- evidence reviewed
- checks run and results
- next action
- stop condition, if owner input or cross-owner work is required

Suggested next action: ${row.nextAction}

## Package Blockers

| Matrix row | Package | Failed checks | Blocking reasons |
| --- | --- | --- | --- |
${packageRowsMarkdown(row)}

## Failed Check Commands

| Package | Check | Command | Status |
| --- | --- | --- | --- |
${checksMarkdown(row)}

## Write Scope

${list(row.writeScope)}

## Coordination Required

${list(row.coordinationRequired)}

## Checks To Rerun Or Cite

${list(row.checks)}

## Stop Conditions

${list(row.stopConditions)}

## Evidence To Review

${list(row.evidenceReviewed)}
`;
}

function bundleMarkdown(payload) {
  const rows = payload.pendingReports.map((row) => (
    `| ${row.agentId} | ${row.owner} | \`${row.reportId}\` | ${row.packageRows.length} | \`${row.latestMarkdown}\` | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | n/a | no |";

  return `# A25 Pending Owner Blocker Report Bundle

Generated: ${payload.generatedAt}

Report source: \`${paths.starter}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This bundle is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Recorded reports: ${payload.summary.recordedReports}
- Pending reports: ${payload.summary.pendingReports}
- Focus pending owner blocker reports: ${payload.summary.focusPendingOwnerBlockerReports}
- Package row links: ${payload.summary.packageRowLinks}
- Write-scope files: ${payload.summary.writeScopeFiles}
- Coordination-required files: ${payload.summary.coordinationRequiredFiles}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

| Agent | Owner | Report ID | Package blockers | Template | Executable |
| --- | --- | --- | ---: | --- | --- |
${rows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  const reports = readJson(paths.reports);
  const focusPacket = readJson(paths.focusPacket);

  ensureCurrent("starter", starter, dirtyMap);
  ensureCurrent("reports", reports, dirtyMap);
  ensureCurrent("focus packet", focusPacket, dirtyMap);

  const rows = pendingReports(starter, reports);
  const summary = summarize(rows, starter, reports, focusPacket);
  if (summary.pendingReports !== summary.focusPendingOwnerBlockerReports) {
    throw new Error("pending owner blocker report count does not match the next owner decision focus packet.");
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceArtifacts: {
      starterGeneratedAt: starter.generatedAt,
      reportsGeneratedAt: reports.generatedAt,
      focusPacketGeneratedAt: focusPacket.generatedAt
    },
    note: "Coordination evidence only. Owner sessions must still work inside approved scopes/worktrees or record formal blockers. This bundle authorizes no cleanup or execution.",
    summary,
    pendingReports: rows
  };

  for (const row of rows) {
    const md = reportMarkdown(payload, row);
    write(row.latestMarkdown, md);
    write(row.datedMarkdown, md);
  }

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = bundleMarkdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    pendingReports: summary.pendingReports,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
