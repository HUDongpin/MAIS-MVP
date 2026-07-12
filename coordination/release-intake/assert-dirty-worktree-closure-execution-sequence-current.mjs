#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-closure-execution-sequence-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  sequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  sequenceMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.md"
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

function summarizeRows(rows) {
  return {
    approvals: rows.length,
    ownerPackageApprovals: rows.filter((row) => row.queueKind === "root-owner-package").length,
    physicalLifecycleApprovals: rows.filter((row) => row.queueKind === "physical-lifecycle").length,
    entries: rows.reduce((sum, row) => sum + (Number.isFinite(row.entries) ? row.entries : 0), 0),
    executableRows: rows.filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length
  };
}

function summarizeWaves(waves) {
  const rows = waves.flatMap((wave) => [...(wave.ownerApprovals ?? []), ...(wave.physicalLifecycleApprovals ?? [])]);
  return {
    waves: waves.length,
    totalApprovals: rows.length,
    ownerPackageApprovals: rows.filter((row) => row.queueKind === "root-owner-package").length,
    physicalLifecycleApprovals: rows.filter((row) => row.queueKind === "physical-lifecycle").length,
    ownerPackageEntries: rows.reduce((sum, row) => sum + (Number.isFinite(row.entries) ? row.entries : 0), 0),
    executableRows: rows.filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length
  };
}

function approvalIdSet(rows) {
  return new Set((rows ?? []).map((row) => row.approvalId));
}

function sortedValues(set) {
  return [...set].sort();
}

function setDifference(left, right) {
  return sortedValues(left).filter((item) => !right.has(item));
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, waves: 0, totalApprovals: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const authorizationQueue = readJson(paths.authorizationQueue);
  const actionRunbook = readJson(paths.actionRunbook);
  const sequence = readJson(paths.sequence);
  const waves = sequence.waves ?? [];
  const sequenceRows = waves.flatMap((wave) => [...(wave.ownerApprovals ?? []), ...(wave.physicalLifecycleApprovals ?? [])]);

  if (authorizationQueue.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("authorization queue dirty-map signature is stale");
  if (authorizationQueue.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("authorization queue expanded dirty entry count is stale");
  }
  if (actionRunbook.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("action runbook dirty-map signature is stale");
  if (actionRunbook.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("action runbook expanded dirty entry count is stale");
  }
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("sequence dirty-map signature is stale");
  if (sequence.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("sequence expanded dirty entry count is stale");
  }
  if (sequence.authorizationQueueGeneratedAt !== authorizationQueue.generatedAt) {
    failures.push("sequence authorization queue timestamp is stale");
  }
  if (sequence.actionRunbookGeneratedAt !== actionRunbook.generatedAt) failures.push("sequence action runbook timestamp is stale");
  if (sequence.cleanupAuthorized !== false) failures.push("sequence cleanupAuthorized must be false");

  const expectedOwnerIds = approvalIdSet(authorizationQueue.ownerPackageQueue);
  const expectedPhysicalIds = approvalIdSet(authorizationQueue.physicalLifecycleQueue);
  const actualOwnerIds = approvalIdSet(sequenceRows.filter((row) => row.queueKind === "root-owner-package"));
  const actualPhysicalIds = approvalIdSet(sequenceRows.filter((row) => row.queueKind === "physical-lifecycle"));

  for (const id of setDifference(expectedOwnerIds, actualOwnerIds)) failures.push(`missing sequenced owner approval: ${id}`);
  for (const id of setDifference(actualOwnerIds, expectedOwnerIds)) failures.push(`unexpected sequenced owner approval: ${id}`);
  for (const id of setDifference(expectedPhysicalIds, actualPhysicalIds)) failures.push(`missing sequenced physical approval: ${id}`);
  for (const id of setDifference(actualPhysicalIds, expectedPhysicalIds)) failures.push(`unexpected sequenced physical approval: ${id}`);

  const allIds = sequenceRows.map((row) => row.approvalId);
  const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  for (const id of [...new Set(duplicateIds)].sort()) failures.push(`duplicate sequenced approval: ${id}`);

  const expectedSummary = summarizeWaves(waves);
  if (!sameJson(sequence.summary, expectedSummary)) failures.push("sequence summary is stale");
  if (expectedSummary.totalApprovals !== (authorizationQueue.summary?.totalApprovals ?? 0)) {
    failures.push("sequence total approvals does not match authorization queue");
  }
  if (expectedSummary.ownerPackageEntries !== (authorizationQueue.summary?.ownerPackageEntries ?? 0)) {
    failures.push("sequence owner package entry count does not match authorization queue");
  }
  if (expectedSummary.executableRows !== 0) failures.push("sequence must not have executable rows");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("sequence must not have cleanup-authorized rows");

  for (const wave of waves) {
    if (!Number.isInteger(wave.waveIndex) || wave.waveIndex < 1) failures.push(`${wave.waveId ?? "unknown"}: invalid waveIndex`);
    if (!wave.waveId) failures.push("wave missing waveId");
    if (!wave.name) failures.push(`${wave.waveId ?? "unknown"}: missing name`);
    if (!Array.isArray(wave.planTasks) || wave.planTasks.length === 0) failures.push(`${wave.waveId ?? "unknown"}: missing planTasks`);
    if (!wave.blockedUntil?.includes("Owner authorizes")) failures.push(`${wave.waveId ?? "unknown"}: missing owner authorization blocker`);
    const rows = [...(wave.ownerApprovals ?? []), ...(wave.physicalLifecycleApprovals ?? [])];
    if (!sameJson(wave.summary, summarizeRows(rows))) failures.push(`${wave.waveId}: wave summary is stale`);
  }

  for (const row of sequenceRows) {
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: missing exact requiredAuthorizationText`);
    }
    if (!Array.isArray(row.allowedFinalStates) || row.allowedFinalStates.length === 0) {
      failures.push(`${row.approvalId}: missing allowed final states`);
    }
    if (!Array.isArray(row.postApprovalChecks) || row.postApprovalChecks.length === 0) {
      failures.push(`${row.approvalId}: missing post approval checks`);
    }
  }

  const markdown = fs.readFileSync(path.join(root, paths.sequenceMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("sequence markdown contains undefined");
  if (!markdown.includes("sequencing artifact only")) failures.push("sequence markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    waves: waves.length,
    totalApprovals: expectedSummary.totalApprovals,
    ownerPackageApprovals: expectedSummary.ownerPackageApprovals,
    physicalLifecycleApprovals: expectedSummary.physicalLifecycleApprovals,
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
    console.log("A25 dirty-worktree closure execution sequence gate");
    console.log(`Waves: ${payload.waves ?? 0}`);
    console.log(`Total approvals: ${payload.totalApprovals ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree closure execution sequence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
