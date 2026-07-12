#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  VALIDATION_HOLD_RELEASE_GATE_PATHS,
  buildValidationHoldReleaseGate,
  stableValidationHoldReleaseGateProjection
} from "./generate-validation-hold-release-gate.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validation-hold-release-gate-current.json");
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

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function checkById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATION_HOLD_RELEASE_GATE_PATHS.latestJson,
    VALIDATION_HOLD_RELEASE_GATE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(VALIDATION_HOLD_RELEASE_GATE_PATHS.latestJson);
  const current = buildValidationHoldReleaseGate();
  const markdown = readText(VALIDATION_HOLD_RELEASE_GATE_PATHS.latestMarkdown);

  fail(
    failures,
    sameJson(
      stableValidationHoldReleaseGateProjection(recorded),
      stableValidationHoldReleaseGateProjection(current)
    ),
    "A25 validation-hold release gate is stale"
  );
  fail(failures, recorded.gateKind === "a25-validation-hold-release-gate", "gateKind is invalid");
  fail(
    failures,
    [
      "blocked-source-stale",
      "blocked-missing-owner-confirmation-record",
      "blocked-owner-confirmation-record-invalid",
      "blocked-recording-not-current",
      "blocked-worktree-still-registered",
      "released"
    ].includes(recorded.gateStatus),
    `unsupported gateStatus: ${recorded.gateStatus}`
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.summary?.ownerConfirmationRecordPresent === true, "owner confirmation record must be present for the current release gate");
  fail(failures, recorded.summary?.ownerConfirmationRecordValid === true, "owner confirmation record must be valid for the current release gate");
  fail(failures, recorded.summary?.confirmationRecordingCurrent === true, "validation-hold confirmation recording must be current");
  fail(failures, recorded.sourceArtifacts?.recordingGate?.ownerConfirmationAccepted === true, "recording gate must accept owner confirmation");
  fail(failures, (recorded.summary?.cleanupAuthorizedRows ?? 0) === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, (recorded.summary?.executableRows ?? 0) === 0, "executableRows must be 0");
  fail(failures, (recorded.summary?.failedReleaseGateChecks ?? 0) === 0, "failedReleaseGateChecks must be 0");

  const activeRegistered = recorded.gitWorktreeLedger?.activeWorktreeRegistered === true;
  const activeFilesystem = recorded.gitWorktreeLedger?.activeWorktreeFilesystem ?? {};
  fail(
    failures,
    recorded.summary?.activeWorktreePathExists === (activeFilesystem.existsOnDisk === true),
    "summary.activeWorktreePathExists must match filesystem evidence"
  );
  fail(
    failures,
    recorded.summary?.activeWorktreeDirtyStatusEntries === (activeFilesystem.statusEntryCount ?? 0),
    "summary.activeWorktreeDirtyStatusEntries must match filesystem status count"
  );
  fail(
    failures,
    recorded.summary?.worktreePruneDryRunRows === (recorded.gitWorktreeLedger?.pruneDryRunRows ?? []).length,
    "summary.worktreePruneDryRunRows must match prune dry-run rows"
  );
  if (activeRegistered) {
    fail(failures, recorded.gateStatus === "blocked-worktree-still-registered", "registered active worktree must keep the gate blocked");
    fail(failures, recorded.validationHoldReleased === false, "validation hold must not be released while active worktree is registered");
    fail(failures, recorded.summary?.validationHoldReleased === false, "summary.validationHoldReleased must remain false while active worktree is registered");
    fail(failures, activeFilesystem.existsOnDisk === true, "registered active worktree must still exist on disk for this gate evidence");
  } else if (recorded.gateStatus === "released") {
    fail(failures, recorded.validationHoldReleased === true, "released gate must mark validationHoldReleased true");
    fail(failures, recorded.summary?.validationHoldReleased === true, "released gate summary must mark validationHoldReleased true");
  }

  for (const checkId of [
    "source-current",
    "owner-confirmation-record-present-or-blocked",
    "owner-confirmation-record-valid-or-blocked",
    "confirmation-recording-current-or-blocked",
    "git-worktree-ledger-status-coherent",
    "active-worktree-filesystem-status-coherent",
    "release-only-when-worktree-absent",
    "safe-boundary-no-cleanup-merge-deploy",
    "status-coherent"
  ]) {
    fail(failures, checkById(recorded.releaseGateChecks, checkId)?.status === "pass", `check must pass: ${checkId}`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of Object.entries({
    evidenceOnly: true,
    recordsOwnerConfirmation: false,
    recordsAuthorization: false,
    recordsExecutionInstruction: false,
    stageAuthorized: false,
    commitAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    requiresSeparateMergeInstruction: true,
    requiresSeparateCleanupInstruction: true,
    requiresSeparateDeployInstruction: true
  })) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }
  fail(failures, boundary.releasesValidationHold === (recorded.gateStatus === "released"), "boundary.releasesValidationHold must match gateStatus");

  for (const text of [
    "A25 Validation Hold Release Gate",
    `Gate status: \`${recorded.gateStatus}\``,
    "Git Worktree Ledger",
    "Active worktree still registered",
    "Active worktree path exists on disk",
    "Active worktree dirty status entries",
    "Git worktree prune dry-run rows",
    "Records owner confirmation: false",
    "Merge authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(text), `markdown missing text: ${text}`);
  }
  if (markdown.includes("undefined")) failures.push("validation hold release gate markdown contains undefined");

  finish({ failures, recorded });
}

function finish({ failures, recorded = null }) {
  const payload = {
    checkedAt: new Date().toISOString(),
    gateKind: "a25-validation-hold-release-gate-current",
    releaseGateStatus: recorded?.gateStatus ?? "missing",
    ownerConfirmationRecorded: recorded?.summary?.ownerConfirmationRecorded === true,
    worktreeStillRegistered: recorded?.summary?.worktreeStillRegistered === true,
    activeWorktreePathExists: recorded?.summary?.activeWorktreePathExists === true,
    activeWorktreeDirtyStatusEntries: recorded?.summary?.activeWorktreeDirtyStatusEntries ?? 0,
    worktreePruneDryRunRows: recorded?.summary?.worktreePruneDryRunRows ?? 0,
    validationHoldReleased: recorded?.summary?.validationHoldReleased === true,
    cleanupAuthorizedRows: recorded?.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded?.summary?.executableRows ?? 0,
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 validation hold release gate current");
    console.log(`Release gate status: ${payload.releaseGateStatus}`);
    console.log(`Worktree still registered: ${payload.worktreeStillRegistered ? "yes" : "no"}`);
    console.log(`Worktree path exists: ${payload.activeWorktreePathExists ? "yes" : "no"}`);
    console.log(`Worktree dirty status entries: ${payload.activeWorktreeDirtyStatusEntries}`);
    console.log(`Validation hold released: ${payload.validationHoldReleased ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (failures.length > 0) {
    if (!json) {
      console.error("A25 validation hold release gate current failed.");
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
