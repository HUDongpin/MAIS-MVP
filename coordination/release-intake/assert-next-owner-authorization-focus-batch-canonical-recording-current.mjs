#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS,
  buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState,
  stableNextOwnerAuthorizationFocusBatchCanonicalRecordingProjection
} from "./run-next-owner-authorization-focus-batch-canonical-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-canonical-recording-current-gate.json");
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
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunJson);
  const current = buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState({ mode: "dry-run" });
  if (!sameJson(
    stableNextOwnerAuthorizationFocusBatchCanonicalRecordingProjection(recorded),
    stableNextOwnerAuthorizationFocusBatchCanonicalRecordingProjection(current)
  )) {
    failures.push("A25 next-owner authorization focus batch canonical recording dry-run is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const proposedRows = recorded.proposedAuthorizationRowsDoNotApply ?? [];
  const checks = recorded.recordingChecks ?? [];
  const allowedStatuses = [
    "dry-run-blocked-owner-approval-placeholders",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded",
    "no-pending-focus-rows"
  ];
  if (recorded.mode !== "dry-run") failures.push("recorded dry-run payload mode must be dry-run");
  if (!allowedStatuses.includes(recorded.recorderStatus)) {
    failures.push(`recorderStatus must be an allowed dry-run status; got ${recorded.recorderStatus}`);
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (summary.applyRequested !== false) failures.push("dry-run applyRequested must be false");
  if (summary.applyPermitted !== false) failures.push("dry-run applyPermitted must be false");
  if (summary.mutationsPerformed !== false) failures.push("dry-run mutationsPerformed must be false");
  if ((summary.recordsAuthorizationRows ?? 0) !== 0) failures.push("dry-run must not record authorization rows");
  if ((summary.proposedAuthorizationRows ?? 0) !== proposedRows.length) failures.push("proposedAuthorizationRows summary must match row count");
  if ((summary.approvalRows ?? 0) > 0 && (summary.approvalRows ?? 0) !== (recorded.approvalIds ?? []).length) {
    failures.push("approvalRows summary must match approvalIds length");
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["dryRunOnly", true],
    ["recordsOwnerApproval", false],
    ["promotesCanonicalRows", false],
    ["recordsExecutionInstruction", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["requiresExplicitApplyRecordingFlag", true],
    ["requiresOwnerApprovalTextCoveringAllRows", true],
    ["requiresOwnerApprovalTextNegativeBoundaries", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const row of proposedRows) {
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: proposed cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: proposed executableNow must be false`);
    if (recorded.recorderStatus === "dry-run-blocked-owner-approval-placeholders") {
      if (row.approvedBy !== "<owner>") failures.push(`${row.approvalId}: blocked dry-run approvedBy must remain placeholder`);
      if (row.approvedAt !== "<ISO-8601>") failures.push(`${row.approvalId}: blocked dry-run approvedAt must remain placeholder`);
    }
  }

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`check ${check.id} must pass`);
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch Canonical Recording Dry Run",
    "This recorder is fail-closed",
    "Proposed Authorization Rows Do Not Apply",
    "Requires explicit apply-recording flag",
    "Requires owner approval text negative boundaries",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`canonical recording markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("canonical recording markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    recorderStatus: recorded.recorderStatus,
    approvalRows: summary.approvalRows ?? 0,
    proposedAuthorizationRows: summary.proposedAuthorizationRows ?? 0,
    ownerApprovalFieldsPresent: summary.ownerApprovalFieldsPresent ?? 0,
    ownerApprovalTextCoversRows: summary.ownerApprovalTextCoversRows ?? false,
    applyPermitted: summary.applyPermitted ?? false,
    mutationsPerformed: summary.mutationsPerformed ?? false,
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
    console.log("A25 next-owner authorization focus batch canonical recording dry-run gate");
    console.log(`Recorder status: ${payload.recorderStatus ?? "unknown"}`);
    console.log(`Proposed authorization rows: ${payload.proposedAuthorizationRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch canonical recording dry-run gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
