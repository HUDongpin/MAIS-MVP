#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  REQUIRED_OWNER_CONFIRMATION_TEXT_ZH
} from "./generate-validation-hold-release-confirmation-scaffold.mjs";
import {
  VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS,
  buildValidationHoldReleaseConfirmationRecordingState,
  stableValidationHoldReleaseConfirmationRecordingProjection
} from "./run-validation-hold-release-confirmation-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validation-hold-release-confirmation-recording-current-gate.json");
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
    VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunJson,
    VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunJson);
  const current = buildValidationHoldReleaseConfirmationRecordingState();
  const markdown = readText(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunMarkdown);

  fail(
    failures,
    sameJson(
      stableValidationHoldReleaseConfirmationRecordingProjection(recorded),
      stableValidationHoldReleaseConfirmationRecordingProjection(current)
    ),
    "A25 validation-hold release confirmation recording dry-run is stale"
  );
  fail(failures, recorded.recorderKind === "a25-validation-hold-release-confirmation-recording", "recorderKind is invalid");
  fail(failures, recorded.mode === "dry-run", "mode must be dry-run");
  fail(
    failures,
    [
      "dry-run-blocked-owner-confirmation-input",
      "dry-run-blocked-owner-confirmation-invalid",
      "dry-run-blocked-release-review-not-ready",
      "dry-run-ready-requires-explicit-apply",
      "already-recorded"
    ].includes(recorded.recorderStatus),
    `unsupported recorderStatus: ${recorded.recorderStatus}`
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.targetOwnerConfirmationInputFile === VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationInput, "target owner confirmation input path is invalid");
  fail(failures, recorded.targetOwnerConfirmationRecordFile === VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord, "target owner confirmation record path is invalid");

  const ownerConfirmation = recorded.ownerConfirmation ?? {};
  const summary = recorded.summary ?? {};
  fail(failures, ownerConfirmation.requiredConfirmationTextZh === REQUIRED_OWNER_CONFIRMATION_TEXT_ZH, "required owner confirmation text is stale");
  if (ownerConfirmation.inputFilePresent === false) {
    fail(failures, recorded.recorderStatus === "dry-run-blocked-owner-confirmation-input", "absent input file must keep recorder blocked on owner-confirmation input");
    fail(failures, ownerConfirmation.confirmationAccepted === false, "confirmation cannot be accepted when input is absent");
    fail(failures, ownerConfirmation.releaseReviewReady === false, "release review cannot be ready when input is absent");
  }
  if (ownerConfirmation.inputFilePresent === true && ownerConfirmation.confirmationAccepted === false) {
    fail(failures, recorded.recorderStatus === "dry-run-blocked-owner-confirmation-invalid", "invalid input file must keep recorder blocked as invalid");
  }
  fail(failures, ownerConfirmation.validationHoldReleased === false, "ownerConfirmation.validationHoldReleased must remain false");
  fail(failures, summary.applyRequested === false, "applyRequested must be false for aggregate dry-run");
  fail(failures, summary.applyPermitted === false, "applyPermitted must be false for aggregate dry-run");
  fail(failures, summary.mutationsPerformed === false, "mutationsPerformed must be false for aggregate dry-run");
  fail(failures, summary.recordsOwnerConfirmationRows === 0, "recordsOwnerConfirmationRows must be 0 for aggregate dry-run");
  fail(failures, summary.validationHoldReleased === false, "summary.validationHoldReleased must remain false");
  fail(failures, summary.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "executableRows must be 0");
  fail(failures, summary.failedRecordingChecks === 0, "failedRecordingChecks must be 0");

  for (const checkId of [
    "mode-is-explicit",
    "source-current",
    "owner-confirmation-input-status-coherent",
    "owner-confirmation-accepted-or-blocked",
    "release-review-ready-or-blocked",
    "required-owner-confirmation-text-exact",
    "recording-never-releases-validation-hold",
    "safe-boundary-no-cleanup-merge-deploy",
    "apply-requires-explicit-recording-flag",
    "record-status-coherent"
  ]) {
    fail(failures, checkById(recorded.recordingChecks, checkId)?.status === "pass", `check must pass: ${checkId}`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of Object.entries({
    evidenceOnly: true,
    dryRunOnly: true,
    recordsOwnerConfirmation: false,
    releasesValidationHold: false,
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
    requiresExplicitApplyRecordingFlag: true,
    requiresExactOwnerConfirmationText: true,
    requiresSeparateValidationHoldReleaseGate: true
  })) {
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const text of [
    "A25 Validation Hold Release Confirmation Recording",
    `Recorder status: \`${recorded.recorderStatus}\``,
    "Validation hold released by this recorder: no",
    "Apply permitted: false",
    "Records owner-confirmation rows: 0",
    "Records owner confirmation: false",
    "Releases validation hold: false",
    "Requires explicit apply-recording flag: true",
    "Requires separate validation-hold release gate: true"
  ]) {
    fail(failures, markdown.includes(text), `markdown missing text: ${text}`);
  }
  if (markdown.includes("undefined")) failures.push("recording markdown contains undefined");

  finish({ failures, recorded });
}

function finish({ failures, recorded = null }) {
  const payload = {
    checkedAt: new Date().toISOString(),
    gateKind: "a25-validation-hold-release-confirmation-recording-current",
    dirtyMapStatusSignature: recorded?.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: recorded?.expandedStatusEntries ?? null,
    recorderStatus: recorded?.recorderStatus ?? "missing",
    ownerConfirmationInputPresent: recorded?.summary?.ownerConfirmationInputPresent === true,
    ownerConfirmationAccepted: recorded?.summary?.ownerConfirmationAccepted === true,
    releaseReviewReady: recorded?.summary?.releaseReviewReady === true,
    recordsOwnerConfirmationRows: recorded?.summary?.recordsOwnerConfirmationRows ?? 0,
    validationHoldReleased: recorded?.summary?.validationHoldReleased === true,
    cleanupAuthorizedRows: recorded?.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded?.summary?.executableRows ?? 0,
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 validation hold release confirmation recording gate");
    console.log(`Recorder status: ${payload.recorderStatus}`);
    console.log(`Owner confirmation accepted: ${payload.ownerConfirmationAccepted ? "yes" : "no"}`);
    console.log(`Records owner-confirmation rows: ${payload.recordsOwnerConfirmationRows}`);
    console.log(`Validation hold released: ${payload.validationHoldReleased ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (failures.length > 0) {
    if (!json) {
      console.error("A25 validation hold release confirmation recording gate failed.");
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
