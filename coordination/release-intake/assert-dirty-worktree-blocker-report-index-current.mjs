#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-blocker-report-index-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  authorizationQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  reportIndex: "coordination/release-intake/latest-A25-dirty-worktree-blocker-report-index.json",
  reportMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-blocker-report-index.md"
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

function queueRows(queue, sourceKind) {
  if (sourceKind === "owner-package") return queue.ownerPackageQueue ?? [];
  return queue.physicalLifecycleQueue ?? [];
}

function queueRowFor(queue, action) {
  return queueRows(queue, action.sourceKind).find((row) => row.approvalId === action.approvalId) ?? null;
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree blocker report index gate");
    console.log(`Blocker reports: ${payload.blockerReports ?? 0}`);
    console.log(`Recorded blockers: ${payload.recordedBlockers ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree blocker report index gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, blockerReports: 0, recordedBlockers: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const actionRunbook = readJson(paths.actionRunbook);
  const authorizationQueue = readJson(paths.authorizationQueue);
  const reportIndex = readJson(paths.reportIndex);
  const reports = reportIndex.blockerReports ?? [];
  const reportsByLedgerId = new Map(reports.map((row) => [row.ledgerId, row]));
  const blockerActions = (actionRunbook.actions ?? []).filter((action) => action.actionKind === "blocker-report-required");

  if (reportIndex.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("blocker report index dirty-map signature is stale");
  if (reportIndex.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("blocker report index expanded status count is stale");
  if (reportIndex.actionRunbookGeneratedAt !== actionRunbook.generatedAt) failures.push("blocker report index action-runbook timestamp is stale");
  if (reportIndex.authorizationQueueGeneratedAt !== authorizationQueue.generatedAt) failures.push("blocker report index authorization-queue timestamp is stale");
  if (reports.length !== blockerActions.length) failures.push(`blocker report count mismatch: ${reports.length} reports, ${blockerActions.length} blocker actions`);

  for (const action of blockerActions) {
    const report = reportsByLedgerId.get(action.ledgerId);
    const queueRow = queueRowFor(authorizationQueue, action);
    if (!report) {
      failures.push(`missing blocker report row: ${action.ledgerId}`);
      continue;
    }
    for (const key of ["ledgerId", "approvalId", "sourceKind", "owner", "branch", "path", "packageKind", "priority", "currentBlocker", "decisionStatus", "selectedFinalState", "actionKind"]) {
      if (!sameJson(report[key], action[key])) failures.push(`${action.ledgerId}: ${key} is stale`);
    }
    if (report.blockerReportStatus !== "recorded") failures.push(`${action.ledgerId}: blockerReportStatus must be recorded`);
    if (report.cleanupAuthorized !== false) failures.push(`${action.ledgerId}: cleanupAuthorized must be false`);
    if (report.executableNow !== false) failures.push(`${action.ledgerId}: executableNow must be false`);
    if (!Array.isArray(report.evidenceLinks) || report.evidenceLinks.length === 0) failures.push(`${action.ledgerId}: missing evidenceLinks`);
    if (!report.requiredAuthorizationText) failures.push(`${action.ledgerId}: missing requiredAuthorizationText`);
    if (!Array.isArray(report.postApprovalChecks) || report.postApprovalChecks.length === 0) failures.push(`${action.ledgerId}: missing postApprovalChecks`);
    if (!queueRow) failures.push(`${action.ledgerId}: missing matching authorization queue row`);
  }

  for (const report of reports) {
    if (!blockerActions.some((action) => action.ledgerId === report.ledgerId)) {
      failures.push(`unexpected blocker report row: ${report.ledgerId}`);
    }
  }

  const summary = reportIndex.summary ?? {};
  if (summary.total !== reports.length) failures.push("summary total is stale");
  if (summary.recordedBlockers !== reports.filter((row) => row.blockerReportStatus === "recorded").length) failures.push("summary recordedBlockers is stale");
  if (summary.cleanupAuthorizedRows !== 0) failures.push("summary cleanupAuthorizedRows must be 0");
  if (summary.executableRows !== 0) failures.push("summary executableRows must be 0");

  const markdown = fs.readFileSync(path.join(root, paths.reportMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("blocker report markdown contains undefined");
  if (!markdown.includes("This is blocker-report evidence only.")) failures.push("blocker report markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    blockerReports: reports.length,
    recordedBlockers: reports.filter((row) => row.blockerReportStatus === "recorded").length,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? null,
    executableRows: summary.executableRows ?? null,
    failures
  });
}

main();
