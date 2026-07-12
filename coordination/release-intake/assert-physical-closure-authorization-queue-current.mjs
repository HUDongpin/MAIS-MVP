#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-physical-closure-authorization-queue-current-gate.json");
const json = process.argv.includes("--json");
const helperPath = "coordination/release-intake/review-owner-pathspec.mjs";

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  remainingStrictPacket: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  queue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  queueMarkdown: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.md"
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

function validateSharedCurrentness(label, artifact, dirtyMap, failures) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push(`${label} expanded dirty entry count is stale`);
  }
}

function summarize(ownerRows, physicalRows) {
  return {
    ownerPackageApprovals: ownerRows.length,
    physicalLifecycleApprovals: physicalRows.length,
    totalApprovals: ownerRows.length + physicalRows.length,
    ownerPackageEntries: ownerRows.reduce((sum, row) => sum + row.entries, 0),
    physicalRootApprovals: physicalRows.filter((row) => row.branch === "main").length,
    dirtyLinkedApprovals: physicalRows.filter((row) => row.state === "dirty-open-decision" && row.branch !== "main").length,
    cleanDivergedApprovals: physicalRows.filter((row) => row.state === "clean-diverged-open-decision").length,
    executableRows: [...ownerRows, ...physicalRows].filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: [...ownerRows, ...physicalRows].filter((row) => row.cleanupAuthorized).length
  };
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (!exists(helperPath)) failures.push(`missing owner pathspec review helper: ${helperPath}`);
  if (failures.length > 0) return finish({ failures, ownerPackageApprovals: 0, physicalLifecycleApprovals: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const actionRunbook = readJson(paths.actionRunbook);
  const remainingStrictPacket = readJson(paths.remainingStrictPacket);
  const queue = readJson(paths.queue);

  validateSharedCurrentness("queue", queue, dirtyMap, failures);
  validateSharedCurrentness("owner approvals", ownerApprovals, dirtyMap, failures);
  validateSharedCurrentness("physical approvals", physicalApprovals, dirtyMap, failures);
  validateSharedCurrentness("action runbook", actionRunbook, dirtyMap, failures);
  validateSharedCurrentness("remaining strict packet", remainingStrictPacket, dirtyMap, failures);

  if (queue.cleanupAuthorized !== false) failures.push("queue cleanupAuthorized must be false");
  if (queue.ownerPackageApprovalsGeneratedAt !== ownerApprovals.generatedAt) {
    failures.push("queue owner package approval timestamp is stale");
  }
  if (queue.physicalLifecycleApprovalsGeneratedAt !== physicalApprovals.generatedAt) {
    failures.push("queue physical lifecycle approval timestamp is stale");
  }
  if (queue.actionRunbookGeneratedAt !== actionRunbook.generatedAt) failures.push("queue action runbook timestamp is stale");
  if (queue.remainingStrictPacketGeneratedAt !== remainingStrictPacket.generatedAt) {
    failures.push("queue remaining strict packet timestamp is stale");
  }

  const ownerRows = queue.ownerPackageQueue ?? [];
  const physicalRows = queue.physicalLifecycleQueue ?? [];
  if (ownerRows.length !== (ownerApprovals.requests ?? []).length) failures.push("owner queue count mismatch");
  if (physicalRows.length !== (physicalApprovals.requests ?? []).length) failures.push("physical queue count mismatch");

  const expectedSummary = summarize(ownerRows, physicalRows);
  if (!sameJson(queue.summary, expectedSummary)) failures.push("queue summary is stale");
  if (expectedSummary.executableRows !== 0) failures.push("queue must not have executable rows");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("queue must not have cleanup-authorized rows");

  const ownerRequestById = new Map((ownerApprovals.requests ?? []).map((request) => [request.approvalId, request]));
  for (const row of ownerRows) {
    const request = ownerRequestById.get(row.approvalId);
    if (!request) failures.push(`${row.approvalId}: no matching owner approval request`);
    else {
      if (row.owner !== request.owner) failures.push(`${row.approvalId}: owner is stale`);
      if (row.entries !== request.entries) failures.push(`${row.approvalId}: entries are stale`);
      if (row.pathspec !== request.latestPathspec) failures.push(`${row.approvalId}: pathspec is stale`);
      if (row.workOrder !== request.workOrder) failures.push(`${row.approvalId}: work order is stale`);
      if (!sameJson(row.allowedFinalStates, request.allowedFinalStates.map((item) => item.selectedFinalState))) {
        failures.push(`${row.approvalId}: allowed final states are stale`);
      }
    }
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: missing exact authorization text`);
    }
    if ((row.postApprovalChecks ?? []).some((command) => command.includes("--pathspec-from-file"))) {
      failures.push(`${row.approvalId}: post-approval checks use unsupported --pathspec-from-file review command`);
    }
    if (!(row.postApprovalChecks ?? []).includes(`node coordination/release-intake/review-owner-pathspec.mjs ${row.pathspec} --status`)) {
      failures.push(`${row.approvalId}: missing executable owner pathspec status review command`);
    }
    for (const evidencePath of [row.pathspec, row.workOrder]) {
      if (!exists(evidencePath)) failures.push(`${row.approvalId}: missing evidence file ${evidencePath}`);
    }
  }

  const physicalRequestById = new Map((physicalApprovals.requests ?? []).map((request) => [request.approvalId, request]));
  for (const row of physicalRows) {
    const request = physicalRequestById.get(row.approvalId);
    if (!request) failures.push(`${row.approvalId}: no matching physical approval request`);
    else {
      for (const key of ["branch", "path", "state", "currentBlocker"]) {
        if (row[key] !== request[key]) failures.push(`${row.approvalId}: ${key} is stale`);
      }
      if (!sameJson(row.ownerHints, request.ownerHints)) failures.push(`${row.approvalId}: owner hints are stale`);
      if (!sameJson(row.evidence, request.evidence)) failures.push(`${row.approvalId}: evidence links are stale`);
      if (!sameJson(row.allowedFinalStates, request.allowedFinalStates.map((item) => item.selectedFinalState))) {
        failures.push(`${row.approvalId}: allowed final states are stale`);
      }
    }
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: missing exact authorization text`);
    }
    for (const evidencePath of row.evidence ?? []) {
      if (!exists(evidencePath)) failures.push(`${row.approvalId}: missing evidence file ${evidencePath}`);
    }
  }

  const expectedBlockers = (remainingStrictPacket.remainingStrictBlockers ?? [])
    .filter((blocker) => blocker.status === "blocked")
    .map((blocker) => blocker.id);
  if (!sameJson(queue.remainingStrictBlockers, expectedBlockers)) failures.push("remaining strict blockers are stale");

  const markdown = fs.readFileSync(path.join(root, paths.queueMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("queue markdown contains undefined");
  if (!markdown.includes("authorization support only")) failures.push("queue markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovals: ownerRows.length,
    physicalLifecycleApprovals: physicalRows.length,
    executableRows: expectedSummary.executableRows,
    cleanupAuthorizedRows: expectedSummary.cleanupAuthorizedRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 physical closure authorization queue gate");
    console.log(`Owner package approvals: ${payload.ownerPackageApprovals ?? 0}`);
    console.log(`Physical lifecycle approvals: ${payload.physicalLifecycleApprovals ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 physical closure authorization queue gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
