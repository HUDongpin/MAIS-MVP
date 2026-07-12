#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-pending-owner-blocker-report-bundle-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  reports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  focusPacket: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  bundle: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.json",
  bundleMarkdown: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.md"
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
    cleanupAuthorized: false,
    executableNow: false
  };
}

function expectedReports(starter, reports) {
  const recordedIds = new Set((reports.reports ?? []).map((row) => row.reportId));
  return (starter.reports ?? [])
    .filter((row) => !recordedIds.has(row.reportId))
    .map(compactReport);
}

function expectedSummary(rows, starter, reports, focusPacket) {
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

function expectedSourceArtifacts(starter, reports, focusPacket) {
  return {
    starterGeneratedAt: starter.generatedAt,
    reportsGeneratedAt: reports.generatedAt,
    focusPacketGeneratedAt: focusPacket.generatedAt
  };
}

function stripDatedField(row) {
  const { datedMarkdown: _datedMarkdown, ...rest } = row;
  return rest;
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 pending owner blocker report bundle gate");
    console.log(`Pending reports: ${payload.pendingReports ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 pending owner blocker report bundle gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, pendingReports: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  const reports = readJson(paths.reports);
  const focusPacket = readJson(paths.focusPacket);
  const bundle = readJson(paths.bundle);

  for (const [label, artifact] of Object.entries({ starter, reports, focusPacket })) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }

  const rows = expectedReports(starter, reports);
  const summary = expectedSummary(rows, starter, reports, focusPacket);

  if (bundle.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("bundle dirty-map signature is stale");
  if (bundle.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("bundle expanded dirty entry count is stale");
  const expectedSourceArtifactKeys = Object.keys(expectedSourceArtifacts(starter, reports, focusPacket)).sort();
  const bundleSourceArtifactKeys = Object.keys(bundle.sourceArtifacts ?? {}).sort();
  if (!sameJson(bundleSourceArtifactKeys, expectedSourceArtifactKeys)) failures.push("bundle source artifact inventory is stale");
  if (!sameJson(bundle.summary, summary)) failures.push("bundle summary is stale");
  if (!sameJson((bundle.pendingReports ?? []).map(stripDatedField), rows)) failures.push("bundle pending reports are stale");
  if ((bundle.pendingReports ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) {
    failures.push("bundle contains executable or cleanup-authorized row");
  }
  if (summary.pendingReports !== summary.focusPendingOwnerBlockerReports) {
    failures.push("bundle pending report count does not match focus packet");
  }

  const markdown = readText(paths.bundleMarkdown);
  if (markdown.includes("undefined")) failures.push("bundle markdown contains undefined");
  if (!markdown.includes("This bundle is coordination evidence only.")) failures.push("bundle markdown missing non-authorization boundary");

  for (const row of bundle.pendingReports ?? []) {
    if (!exists(row.latestMarkdown)) {
      failures.push(`missing pending report template: ${row.latestMarkdown}`);
      continue;
    }
    const content = readText(row.latestMarkdown);
    if (content.includes("undefined")) failures.push(`${row.latestMarkdown} contains undefined`);
    if (!content.includes("This pending report template is coordination evidence only.")) {
      failures.push(`${row.latestMarkdown} missing non-authorization boundary`);
    }
    if (!content.includes(`Agent: ${row.agentId}`)) failures.push(`${row.latestMarkdown} missing agent marker`);
    if (!content.includes("Cleanup authorized: false")) failures.push(`${row.latestMarkdown} missing zero cleanup authorization marker`);
    if (!content.includes("Executable now: false")) failures.push(`${row.latestMarkdown} missing zero executable marker`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    starterRows: summary.starterRows,
    recordedReports: summary.recordedReports,
    pendingReports: summary.pendingReports,
    focusPendingOwnerBlockerReports: summary.focusPendingOwnerBlockerReports,
    packageRowLinks: summary.packageRowLinks,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
