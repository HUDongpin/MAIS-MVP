#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS,
  buildValidateToMergeBlockerFrontier,
  stableValidateToMergeBlockerFrontierProjection
} from "./generate-validate-to-merge-blocker-frontier.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validate-to-merge-blocker-frontier-current-gate.json");
const json = process.argv.includes("--json");

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
  for (const requiredPath of [
    VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestJson,
    VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestJson);
  const current = buildValidateToMergeBlockerFrontier();
  if (!sameJson(
    stableValidateToMergeBlockerFrontierProjection(recorded),
    stableValidateToMergeBlockerFrontierProjection(current)
  )) {
    failures.push("A25 validate-to-merge blocker frontier is stale");
  }

  const summary = recorded.summary ?? {};
  const frontierRows = recorded.frontierRows ?? [];
  const completionRows = recorded.completionRows ?? [];
  const handoff = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validateToMergeHandoff);
  const compactBundle = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.compactRequestBundle);
  const failedMergeChecks = (handoff.mergeChecks ?? []).filter((row) => row.passed !== true);
  const failedIds = failedMergeChecks.map((row) => row.id).sort();
  const frontierIds = frontierRows.map((row) => row.checkId).sort();
  const focusBatchPendingRows = compactBundle.batchAuthorizationRequest?.pendingRows ?? compactBundle.summary?.focusBatchPendingRows ?? 0;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (summary.failedMergeChecks !== failedMergeChecks.length) failures.push("summary.failedMergeChecks must match failed validate-to-merge checks");
  if (summary.frontierRows !== frontierRows.length) failures.push("summary.frontierRows must match frontierRows length");
  if (!sameJson(failedIds, frontierIds)) failures.push("frontier row check IDs must match failed merge check IDs");
  if (recorded.readyForMerge !== (recorded.handoffStatus === "ready-for-clean-release-merge")) failures.push("readyForMerge must match handoffStatus");
  if (recorded.readyForMerge === false && frontierRows.length === 0) failures.push("blocked merge frontier must expose at least one frontier row");
  if (recorded.readyForMerge === true && frontierRows.length !== 0) failures.push("ready merge frontier must have zero frontier rows");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");

  for (const row of frontierRows) {
    if (!row.checkId) failures.push("frontier row missing checkId");
    if (!row.owner) failures.push(`${row.checkId}: frontier row missing owner`);
    if ((row.agentIds ?? []).length === 0) failures.push(`${row.checkId}: frontier row missing agentIds`);
    if (!row.nextAction) failures.push(`${row.checkId}: frontier row missing nextAction`);
    if ((row.evidence ?? []).length === 0) failures.push(`${row.checkId}: frontier row missing evidence`);
    if (row.mergeAuthorized !== false) failures.push(`${row.checkId}: mergeAuthorized must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.checkId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.checkId}: executableNow must be false`);
    if (row.checkId === "focus-batch-recorded" && focusBatchPendingRows > 0 && !row.copyableOwnerText?.includes("selectedFinalState=reviewed commit for every row")) {
      failures.push("focus-batch-recorded row must expose copyable owner batch text");
    }
    if (row.checkId === "focus-batch-recorded" && focusBatchPendingRows > 0 && !row.copyableOwnerReplyTextZh?.includes("selectedFinalState=reviewed commit")) {
      failures.push("focus-batch-recorded row must expose Chinese copyable owner reply text");
    }
    if (row.checkId === "focus-batch-recorded") {
      const pendingRows = focusBatchPendingRows;
      const rowLabel = pendingRows === 1 ? "1-row" : `${pendingRows}-row`;
      if (pendingRows > 0 && !row.nextAction.includes(rowLabel)) failures.push(`focus-batch-recorded nextAction must include current ${rowLabel} batch size`);
      for (const approvalId of compactBundle.batchAuthorizationRequest?.approvalIds ?? []) {
        if (!row.nextAction.includes(approvalId)) failures.push(`focus-batch-recorded nextAction missing approvalId ${approvalId}`);
        if (!row.copyableOwnerText?.includes(approvalId)) failures.push(`focus-batch-recorded copyable owner text missing approvalId ${approvalId}`);
        if (!row.copyableOwnerReplyTextZh?.includes(approvalId)) failures.push(`focus-batch-recorded Chinese reply text missing approvalId ${approvalId}`);
      }
      if (row.nextAction.includes("five-row")) failures.push("focus-batch-recorded nextAction must not contain stale five-row wording");
      for (const requiredText of [
        "不授权 cleanup",
        "不授权 deploy",
        "不授权 merge",
        "不授权 destructive git",
        "不授权 physical lifecycle cleanup"
      ]) {
        if (pendingRows > 0 && !row.copyableOwnerReplyTextZh?.includes(requiredText)) {
          failures.push(`focus-batch-recorded Chinese reply text missing: ${requiredText}`);
        }
      }
    }
    if (row.checkId === "validation-hold-released" && exists(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate)) {
      const releaseGate = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate);
      if (!row.evidence?.includes(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate)) {
        failures.push("validation-hold-released row must include validation-hold release gate evidence");
      }
      if (row.validationHoldReleaseGateStatus !== (releaseGate.gateStatus ?? "missing")) {
        failures.push("validation-hold-released row gate status must match validation-hold release gate");
      }
      if (row.validationHoldWorktreeStillRegistered !== (releaseGate.summary?.worktreeStillRegistered === true)) {
        failures.push("validation-hold-released row worktree registration status must match validation-hold release gate");
      }
      if (row.validationHoldWorktreePathExists !== (releaseGate.summary?.activeWorktreePathExists === true)) {
        failures.push("validation-hold-released row filesystem path status must match validation-hold release gate");
      }
      if (row.validationHoldWorktreeDirtyStatusEntries !== (releaseGate.summary?.activeWorktreeDirtyStatusEntries ?? 0)) {
        failures.push("validation-hold-released row dirty status count must match validation-hold release gate");
      }
      if (releaseGate.gateStatus === "blocked-worktree-still-registered") {
        if (!row.nextAction.includes("Git worktree ledger still registers")) {
          failures.push("validation-hold-released nextAction must cite the still-registered Git worktree ledger");
        }
        if (releaseGate.summary?.activeWorktreePathExists === true && !row.nextAction.includes("still exists on disk")) {
          failures.push("validation-hold-released nextAction must cite the existing worktree path");
        }
        if (releaseGate.summary?.activeWorktreePathExists === true && !row.nextAction.includes(`${releaseGate.summary?.activeWorktreeDirtyStatusEntries ?? 0} status entries`)) {
          failures.push("validation-hold-released nextAction must cite the active worktree status entry count");
        }
      }
    }
  }

  if ((summary.incompleteRequirements ?? 0) > 0 && completionRows.filter((row) => !row.id?.startsWith("task-")).length === 0) {
    failures.push("completionRows must include incomplete requirement rows");
  }
  if ((summary.incompletePlanTasks ?? 0) > 0 && completionRows.filter((row) => row.id?.startsWith("task-")).length === 0) {
    failures.push("completionRows must include incomplete plan task rows");
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["dirtyRootDeployAuthorized", false],
    ["physicalCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestMarkdown);
  const markdownNeedles = [
    "Validate-To-Merge Blocker Frontier",
    "Frontier Rows",
    "Completion Audit Rows",
    "does not authorize staging",
    "Merge remains blocked"
  ];
  if (exists(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate)) {
    markdownNeedles.push("Validation hold release gate");
    markdownNeedles.push("Validation hold worktree path exists");
    markdownNeedles.push("Validation hold worktree dirty status entries");
  }
  if (frontierRows.some((row) => row.checkId === "focus-batch-recorded" && focusBatchPendingRows > 0)) {
    markdownNeedles.push("Copyable owner reply text (Chinese)");
  }
  for (const needle of markdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`frontier markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("frontier markdown contains undefined");
  if (markdown.includes("five-row")) failures.push("frontier markdown must not contain stale five-row wording");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    handoffStatus: recorded.handoffStatus,
    readyForMerge: recorded.readyForMerge === true,
    failedMergeChecks: summary.failedMergeChecks ?? 0,
    frontierRows: summary.frontierRows ?? 0,
    ownerInputFrontierRows: summary.ownerInputFrontierRows ?? 0,
    cleanSourceFrontierRows: summary.cleanSourceFrontierRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 validate-to-merge blocker frontier gate");
    console.log(`Frontier rows: ${payload.frontierRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 validate-to-merge blocker frontier gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
