#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS,
  buildA25A22ValidateFrontierResolutionPacket,
  stableA25A22ValidateFrontierResolutionPacketProjection
} from "./generate-a25-a22-validate-frontier-resolution-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-A22-validate-frontier-resolution-packet-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function rowById(rows, rowId) {
  return (rows ?? []).find((row) => row.rowId === rowId) ?? null;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestJson,
    A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestJson);
  const current = buildA25A22ValidateFrontierResolutionPacket();
  if (!sameJson(
    stableA25A22ValidateFrontierResolutionPacketProjection(recorded),
    stableA25A22ValidateFrontierResolutionPacketProjection(current)
  )) {
    failures.push("A25/A22 validate frontier resolution packet is stale");
  }

  const summary = recorded.summary ?? {};
  const rows = recorded.resolutionRows ?? [];
  const boundary = recorded.boundary ?? {};
  if (recorded.activePhase !== "validate") failures.push("activePhase must remain validate");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.resolutionRows ?? 0) !== rows.length) failures.push("summary.resolutionRows must match rows length");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (summary.readyForMerge !== false) failures.push("readyForMerge must remain false");
  if (summary.releaseSourceEligibleNow !== false) failures.push("releaseSourceEligibleNow must remain false");
  if (summary.releaseSourceSelected !== false) failures.push("releaseSourceSelected must remain false");
  if ((summary.failedMergeChecks ?? 0) <= 0) failures.push("failedMergeChecks must remain positive while validate is blocked");

  for (const row of rows) {
    if (!row.rowId) failures.push("resolution row missing rowId");
    if (!row.owner) failures.push(`${row.rowId}: owner is missing`);
    if ((row.agentIds ?? []).length === 0) failures.push(`${row.rowId}: agentIds missing`);
    if (!row.nextAction) failures.push(`${row.rowId}: nextAction missing`);
    if ((row.evidence ?? []).length === 0) failures.push(`${row.rowId}: evidence missing`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.rowId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.rowId}: executableNow must be false`);
  }

  const focusRow = rowById(rows, "a25-focus-batch-canonical-authorization");
  if ((summary.focusBatchPendingRows ?? 0) > 0) {
    if (!focusRow) failures.push("focus-batch row missing while focusBatchPendingRows > 0");
    if (focusRow && !focusRow.copyableOwnerText?.includes("selectedFinalState=reviewed commit")) {
      failures.push("focus-batch row must expose reviewed commit authorization text");
    }
    for (const approvalId of summary.focusBatchApprovalIds ?? []) {
      if (!focusRow?.approvalIds?.includes(approvalId)) failures.push(`focus-batch row missing approvalId ${approvalId}`);
    }
  }

  const validationRow = rowById(rows, "a25-validation-hold-lifecycle-resolution");
  if (!validationRow) failures.push("validation-hold lifecycle row missing");
  if (summary.validationHoldGateStatus === "blocked-worktree-still-registered") {
    if (validationRow?.worktreeStillRegistered !== true) failures.push("validation row must record still-registered worktree");
    if (validationRow?.activeWorktreePathExists !== true) failures.push("validation row must record existing worktree path");
    if (validationRow?.activeWorktreeDirtyStatusEntries !== summary.validationHoldWorktreeDirtyStatusEntries) {
      failures.push("validation row dirty status entries must match summary");
    }
    if (!validationRow?.nextAction?.includes("separate, explicit owner lifecycle decision")) {
      failures.push("validation row must require separate owner lifecycle decision");
    }
  }

  const cleanSourceRow = rowById(rows, "a22-clean-source-selection-review");
  if (summary.releaseSourceEligibleNow === false) {
    if (!cleanSourceRow) failures.push("clean-source row missing while releaseSourceEligibleNow=false");
    if (cleanSourceRow?.releaseSourceSelected !== false) failures.push("clean-source row must not select release source");
    if (summary.cleanSourceSelectionReviewStatus !== "reviewed-fallback-green-not-selected") {
      failures.push("cleanSourceSelectionReviewStatus must record reviewed fallback without selection");
    }
    if (summary.fallbackGreenCandidateBranch && cleanSourceRow?.fallbackGreenCandidateBranch !== summary.fallbackGreenCandidateBranch) {
      failures.push("clean-source row fallback candidate must match summary");
    }
  }

  const typecheckRow = rowById(rows, "a22-top-candidate-typecheck-remediation");
  if ((summary.topCandidateTypeCheckErrorLines ?? 0) > 0 || (summary.typecheckRemediationWorkOrders ?? 0) > 0) {
    if (!typecheckRow) failures.push("type-check remediation row missing");
    if (typecheckRow && typecheckRow.workOrderCount !== summary.typecheckRemediationWorkOrders) {
      failures.push("type-check remediation row workOrderCount must match summary");
    }
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsOwnerAuthorization", false],
    ["recordsExecutionInstruction", false],
    ["stagesFiles", false],
    ["commits", false],
    ["branches", false],
    ["merges", false],
    ["deploys", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false],
    ["releaseSourceSelected", false],
    ["dirtyRootDeployAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(A25_A22_VALIDATE_FRONTIER_RESOLUTION_PACKET_PATHS.latestMarkdown);
  for (const needle of [
    "A25/A22 Validate Frontier Resolution Packet",
    "Resolution Rows",
    "Validation hold gate status",
    "A22 clean-source queue status",
    "A22 clean-source selection review status",
    "Release source eligible now",
    "does not authorize staging",
    "Physical lifecycle cleanup authorized"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    activePhase: recorded.activePhase,
    resolutionRows: summary.resolutionRows ?? 0,
    failedMergeChecks: summary.failedMergeChecks ?? 0,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    validationHoldGateStatus: summary.validationHoldGateStatus ?? "missing",
    validationHoldWorktreeDirtyStatusEntries: summary.validationHoldWorktreeDirtyStatusEntries ?? 0,
    cleanSourceQueueStatus: summary.cleanSourceQueueStatus ?? "missing",
    cleanSourceSelectionReviewStatus: summary.cleanSourceSelectionReviewStatus ?? "missing",
    fallbackGreenCandidateBranch: summary.fallbackGreenCandidateBranch ?? "",
    releaseSourceEligibleNow: summary.releaseSourceEligibleNow === true,
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
    console.log("A25/A22 validate frontier resolution packet gate");
    console.log(`Resolution rows: ${payload.resolutionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25/A22 validate frontier resolution packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
