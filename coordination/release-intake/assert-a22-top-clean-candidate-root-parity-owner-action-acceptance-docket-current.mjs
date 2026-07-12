#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS,
  buildA22RootParityOwnerActionAcceptanceDocket,
  stableA22RootParityOwnerActionAcceptanceDocketProjection
} from "./generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current-gate.json");
const json = process.argv.includes("--json");

const allowedAcceptanceStatuses = [
  "waiting-for-owner-action",
  "ready-for-extraction-instruction-recording",
  "ready-for-guarded-extraction",
  "post-extraction-verified"
];

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

function expectedAction(unitId) {
  return unitId === "a06-visualization-back-to-top-import-parity" ? "reexport" : "same-path-copy";
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerActionPacket,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerActionPacketGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerInput,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionIntake,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionIntakeGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionRecordingDryRun,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionRecordingGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.guardedExtractionDryRun,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.guardedExtractionGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const current = buildA22RootParityOwnerActionAcceptanceDocket();
  if (!sameJson(
    stableA22RootParityOwnerActionAcceptanceDocketProjection(recorded),
    stableA22RootParityOwnerActionAcceptanceDocketProjection(current)
  )) {
    failures.push("A22 root-parity owner action acceptance docket is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.acceptanceRows ?? [];
  const checks = recorded.checks ?? [];
  const postExtractionVerified = recorded.acceptanceStatus === "post-extraction-verified";

  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("docket dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("docket expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if (recorded.docketKind !== "a22-root-parity-owner-action-acceptance-docket") failures.push("docketKind is invalid");
  if (!allowedAcceptanceStatuses.includes(recorded.acceptanceStatus)) {
    failures.push(`acceptanceStatus is unsupported: ${recorded.acceptanceStatus ?? "missing"}`);
  }
  if ((summary.acceptanceRows ?? -1) !== 4) failures.push("summary.acceptanceRows must be 4");
  if ((summary.acceptedRows ?? -1) !== rows.filter((row) => row.acceptedByOwnerInput).length) {
    failures.push("summary.acceptedRows must match accepted rows");
  }
  if ((summary.checks ?? -1) !== checks.length) failures.push("summary.checks must match checks length");
  if ((summary.failedChecks ?? -1) !== checks.filter((row) => row.status === "fail").length) failures.push("summary.failedChecks must match failed checks");
  if ((summary.passingChecks ?? -1) !== checks.filter((row) => row.status === "pass").length) failures.push("summary.passingChecks must match passing checks");
  if ((summary.skippedChecks ?? -1) !== checks.filter((row) => row.status === "skip").length) failures.push("summary.skippedChecks must match skipped checks");
  if ((summary.recordedInstructionRows ?? -1) !== 0) failures.push("summary.recordedInstructionRows must be 0");
  if ((summary.rootCopyRows ?? -1) !== 0) failures.push("summary.rootCopyRows must be 0");
  if ((summary.candidateMutationRows ?? -1) !== 0) failures.push("summary.candidateMutationRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  if (rows.length !== 4) failures.push("acceptanceRows must contain 4 rows");
  for (const row of rows) {
    const action = expectedAction(row.unitId);
    if (row.recommendedSelectedAction !== action) {
      failures.push(`${row.unitId ?? "unknown"}: recommendedSelectedAction must be ${action}`);
    }
    if (!(row.allowedActions ?? []).includes(row.recommendedSelectedAction)) {
      failures.push(`${row.unitId ?? "unknown"}: recommended action must be allowed`);
    }
    if (recorded.ownerInputBlank === true) {
      if (row.ownerSelectedAction !== "") failures.push(`${row.unitId ?? "unknown"}: ownerSelectedAction should be blank while owner input is blank`);
      if (row.acceptedByOwnerInput !== false) failures.push(`${row.unitId ?? "unknown"}: acceptedByOwnerInput should be false while waiting`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.unitId ?? "unknown"}: executableNow must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: deployAuthorized must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: mergeAuthorized must be false`);
    if (row.stageAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: stageAuthorized must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: destructiveGitAuthorized must be false`);
    if (row.physicalLifecycleCleanupAuthorized !== false) failures.push(`${row.unitId ?? "unknown"}: physicalLifecycleCleanupAuthorized must be false`);
  }

  if (recorded.acceptanceStatus === "waiting-for-owner-action") {
    if (recorded.ownerInputBlank !== true) failures.push("waiting status requires blank owner input");
    if ((summary.acceptedRows ?? -1) !== 0) failures.push("waiting status requires 0 accepted rows");
    if (summary.instructionIntakeStatus !== "waiting-for-owner-input") failures.push("waiting status requires intake waiting for owner input");
    if (summary.recordingStatus !== "dry-run-blocked-owner-input") failures.push("waiting status requires recording blocked on owner input");
    if (summary.guardedExtractionStatus !== "dry-run-blocked-missing-recorded-instructions") failures.push("waiting status requires guarded extraction blocked on missing recorded instructions");
  }
  if (recorded.acceptanceStatus === "ready-for-extraction-instruction-recording") {
    if (recorded.ownerInputBlank !== false) failures.push("recording-ready status requires nonblank owner input");
    if ((summary.acceptedRows ?? -1) !== 4) failures.push("recording-ready status requires 4 accepted rows");
    if (summary.instructionIntakeStatus !== "ready-to-record-extraction-instruction-rows") failures.push("recording-ready status requires ready intake");
  }
  if (recorded.acceptanceStatus === "ready-for-guarded-extraction") {
    if (summary.recordingStatus !== "already-recorded") failures.push("guarded-ready status requires already-recorded instruction evidence");
    if (summary.guardedExtractionStatus !== "dry-run-ready-requires-explicit-apply") failures.push("guarded-ready status requires guarded extraction dry-run ready");
  }
  if (recorded.acceptanceStatus === "post-extraction-verified") {
    if (summary.guardedExtractionStatus !== "already-extracted-and-verified") failures.push("post-extraction status requires guarded extraction verified");
  }

  for (const field of ["ownerExecutionText", "selectedActions", "approvedBy", "approvedAt", "notes"]) {
    if (!(recorded.requiredOwnerReplyFields ?? []).includes(field)) {
      failures.push(`requiredOwnerReplyFields missing ${field}`);
    }
  }
  for (const requiredCommand of [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-review-packet.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ]) {
    if (!(recorded.safePostOwnerInputValidationCommands ?? []).includes(requiredCommand)) {
      failures.push(`missing safe post-owner-input validation command: ${requiredCommand}`);
    }
  }

  for (const requiredCheck of [
    "source-current",
    "source-gates-passing",
    "owner-action-packet-ready",
    "acceptance-rows-complete",
    "owner-input-boundary-safe",
    "waiting-lifecycle-coherent",
    "post-owner-input-lifecycle-valid",
    "recording-still-separate",
    "candidate-mutation-still-separate",
    "no-executable-boundary"
  ]) {
    if (!checks.some((row) => row.id === requiredCheck)) failures.push(`missing check: ${requiredCheck}`);
  }
  if (checks.some((row) => row.status === "fail")) failures.push("acceptance docket checks must not fail");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["acceptanceDocketOnly", true],
    ["recordsOwnerInput", false],
    ["recordsOwnerApproval", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false],
    ["requiresOwnerReply", true],
    ["requiresSeparateRecordingStep", true],
    ["requiresSeparateCandidateMutationInstruction", !postExtractionVerified]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Root-Parity Owner Action Acceptance Docket",
    "evidence-only",
    "Acceptance Rows",
    "Safe Post-Owner-Input Validation Commands",
    "Separate Apply Steps Still Required",
    "Records owner input: false",
    "Records extraction instruction: false",
    "Modifies candidate: false",
    "Copies root files: false",
    "Deploy authorized: false",
    "Physical lifecycle cleanup authorized: false",
    `Requires separate candidate mutation instruction: ${!postExtractionVerified}`
  ]) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    acceptanceStatus: recorded.acceptanceStatus,
    acceptanceRows: summary.acceptanceRows ?? 0,
    acceptedRows: summary.acceptedRows ?? 0,
    ownerInputBlank: recorded.ownerInputBlank === true,
    recordedInstructionRows: summary.recordedInstructionRows ?? 0,
    rootCopyRows: summary.rootCopyRows ?? 0,
    candidateMutationRows: summary.candidateMutationRows ?? 0,
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
    console.log("A22 root-parity owner action acceptance docket gate");
    console.log(`Acceptance status: ${payload.acceptanceStatus ?? "unknown"}`);
    console.log(`Acceptance rows: ${payload.acceptanceRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 root-parity owner action acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
