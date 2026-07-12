#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS,
  buildNextOwnerAuthorizationFocusBatchRecordingIntake,
  stableNextOwnerAuthorizationFocusBatchRecordingIntakeProjection
} from "./generate-next-owner-authorization-focus-batch-recording-intake.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-recording-intake-current-gate.json");
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
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestJson);
  const acceptanceDocket = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.acceptanceDocket);
  const current = buildNextOwnerAuthorizationFocusBatchRecordingIntake();
  if (!sameJson(
    stableNextOwnerAuthorizationFocusBatchRecordingIntakeProjection(recorded),
    stableNextOwnerAuthorizationFocusBatchRecordingIntakeProjection(current)
  )) {
    failures.push("A25 next-owner authorization focus batch recording intake is stale");
  }

  const summary = recorded.summary ?? {};
  const rows = recorded.focusBatchRows ?? [];
  const checks = recorded.checks ?? [];
  const boundary = recorded.boundary ?? {};
  const selectedRoundId = acceptanceDocket.focusBatchPolicy?.selectedRoundId ?? "";
  const generatedArtifactFocus = selectedRoundId === "a22-generated-artifact-residual-cleanup-authorizations";
  const ownerPackageFocus = selectedRoundId === "remaining-owner-package-final-states";
  const expectedBatchRows = (acceptanceDocket.acceptanceRows ?? []).length;
  const allowedStatuses = [
    "waiting-for-owner-authorization",
    "ready-for-post-input-validation",
    "no-focus-batch"
  ];
  const noFocusBatch = rows.length === 0;

  if (!allowedStatuses.includes(recorded.intakeStatus)) {
    failures.push(`intakeStatus must be an allowed non-executable owner-input status; got ${recorded.intakeStatus}`);
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.canonicalTarget !== NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.canonicalAuthorizations) {
    failures.push("canonicalTarget must point to latest-A25-next-owner-authorizations.json");
  }
  if ((summary.focusBatchRows ?? 0) !== rows.length) failures.push("focusBatchRows must match focusBatchRows length");
  if (!generatedArtifactFocus && !ownerPackageFocus) failures.push(`unsupported selectedRoundId: ${selectedRoundId}`);
  if (rows.length !== expectedBatchRows) failures.push(`recording intake must track ${expectedBatchRows} rows for ${selectedRoundId}`);
  if ((summary.acceptedRows ?? 0) + (summary.pendingRows ?? 0) !== rows.length) {
    failures.push("acceptedRows + pendingRows must equal focusBatchRows length");
  }
  if ((summary.ownerInputVisibleRows ?? 0) !== rows.length) failures.push("every focus row must be owner-input visible");
  if ((summary.canonicalDraftVisibleRows ?? 0) + (summary.canonicalAuthorizationVisibleRows ?? 0) < rows.length) {
    failures.push("draft plus canonical visible rows must cover the focus batch");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (!noFocusBatch && (summary.postInputValidationCommands ?? 0) < 1) failures.push("postInputValidationCommands must be present");
  if (!noFocusBatch && (summary.deferredAggregateValidationCommands ?? 0) < 1) failures.push("deferredAggregateValidationCommands must be present");
  if ((summary.pendingRows ?? 0) > 0 && recorded.intakeStatus !== "waiting-for-owner-authorization") {
    failures.push("intakeStatus must wait for owner authorization while pending rows remain");
  }
  if (noFocusBatch && recorded.intakeStatus !== "no-focus-batch") {
    failures.push("intakeStatus must be no-focus-batch when there are no focus rows");
  }
  if (!noFocusBatch && (summary.pendingRows ?? 0) === 0 && recorded.intakeStatus !== "ready-for-post-input-validation") {
    failures.push("intakeStatus must be ready-for-post-input-validation when all focus rows are accepted");
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsAuthorizationFile", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const row of rows) {
    if (row.sourceRoundId !== selectedRoundId) failures.push(`${row.approvalId}: sourceRoundId must be ${selectedRoundId}`);
    if (ownerPackageFocus && row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: approvalKind must be owner-package`);
    if (generatedArtifactFocus && row.approvalKind !== "a22-generated-artifact-residual-cleanup") {
      failures.push(`${row.approvalId}: approvalKind must be a22-generated-artifact-residual-cleanup`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (!row.canonicalDraftRowPresent && !row.canonicalRowPresent) {
      failures.push(`${row.approvalId}: row must be visible in canonical draft or canonical accepted rows`);
    }
    if (row.accepted && !row.canonicalRowPresent) {
      failures.push(`${row.approvalId}: accepted row must have a canonical authorization row`);
    }
    if (!row.accepted && !row.canonicalDraftRowPresent) {
      failures.push(`${row.approvalId}: pending row must have a canonical draft row`);
    }
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: requiredAuthorizationText must name the approval ID`);
    }
    if (ownerPackageFocus) {
      if (!row.ledgerSelectedFinalState) failures.push(`${row.approvalId}: ledgerSelectedFinalState must be present for owner-package focus rows`);
      if (!row.recommendedAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
        failures.push(`${row.approvalId}: recommendedAuthorizationText must name the approval ID`);
      }
      if (!row.recommendedAuthorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
        failures.push(`${row.approvalId}: recommendedAuthorizationText must include the ledger selected final state`);
      }
    }
    if (generatedArtifactFocus && !row.requiredAuthorizationText?.includes("node scripts/cleanup-generated-artifacts.mjs --apply --scope all")) {
      failures.push(`${row.approvalId}: generated cleanup authorization text must include cleanup script apply command`);
    }
    if (!["accepted", "waiting-for-owner-authorization"].includes(row.rowStatus)) {
      failures.push(`${row.approvalId}: rowStatus must be accepted or waiting-for-owner-authorization`);
    }
  }

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`check ${check.id} must pass`);
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_RECORDING_INTAKE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch Recording Intake",
    "This intake is evidence-only",
    "Focus Batch Rows",
    "Post-Input Validation Commands",
    "Draft rows are not approvals",
    "Merge and cleanup still require"
  ]) {
    if (!markdown.includes(needle)) failures.push(`recording intake markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("recording intake markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    selectedRoundId,
    intakeStatus: recorded.intakeStatus,
    focusBatchRows: summary.focusBatchRows ?? 0,
    acceptedRows: summary.acceptedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    ownerInputVisibleRows: summary.ownerInputVisibleRows ?? 0,
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
    console.log("A25 next-owner authorization focus batch recording intake gate");
    console.log(`Intake status: ${payload.intakeStatus ?? "unknown"}`);
    console.log(`Focus rows: ${payload.focusBatchRows ?? 0}`);
    console.log(`Pending rows: ${payload.pendingRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch recording intake gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
