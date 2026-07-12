#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS,
  buildA22RootParityExtractionInstructionRecordingState,
  stableA22RootParityExtractionInstructionRecordingProjection
} from "./run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-current-gate.json");
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
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.dirtyMap,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intake,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intakeGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.ownerInput,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.dirtyMap);
  const intake = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intake);
  const intakeGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intakeGate);
  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson);
  const current = buildA22RootParityExtractionInstructionRecordingState({ mode: "dry-run" });

  if (!sameJson(
    stableA22RootParityExtractionInstructionRecordingProjection(recorded),
    stableA22RootParityExtractionInstructionRecordingProjection(current)
  )) {
    failures.push("A22 root-parity extraction instruction recording dry-run is stale");
  }

  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const proposedRows = recorded.proposedExtractionInstructionRowsDoNotApply ?? [];
  const checks = recorded.recordingChecks ?? [];

  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("recording dry-run dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("recording dry-run expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.intakeGeneratedAt !== intake.generatedAt) failures.push("recording dry-run intake timestamp is stale");
  if (recorded.sourceArtifacts?.intakeGateFailureCount !== (intakeGate.failures ?? []).length) {
    failures.push("recording dry-run intake gate failure count is stale");
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");

  if (recorded.mode !== "dry-run") failures.push("recording current gate validates dry-run mode only");
  if (![
    "dry-run-blocked-owner-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded"
  ].includes(recorded.recorderStatus)) {
    failures.push(`unexpected recorderStatus: ${recorded.recorderStatus ?? "missing"}`);
  }
  if ((summary.expectedRows ?? 0) !== 4) failures.push("expectedRows must be 4");
  if ((summary.failedRecordingChecks ?? -1) !== 0) failures.push("failedRecordingChecks must be 0");
  if ((summary.passingRecordingChecks ?? 0) !== (summary.recordingChecks ?? -1)) failures.push("all recording checks must pass");
  if (summary.applyRequested !== false) failures.push("dry-run must not request apply");
  if (summary.applyPermitted !== false) failures.push("dry-run must not permit apply");
  if (summary.mutationsPerformed !== false) failures.push("dry-run must not mutate");
  if ((summary.recordsExtractionInstructionRows ?? -1) !== 0) failures.push("dry-run must record 0 extraction-instruction rows");
  if ((summary.modifiesCandidateRows ?? -1) !== 0) failures.push("dry-run must modify 0 candidate rows");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.recorderStatus === "dry-run-blocked-owner-input") {
    if (recorded.intakeStatus !== "waiting-for-owner-input") failures.push("blocked-owner-input status requires waiting intake");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("blocked-owner-input status must have 0 proposed rows");
    if ((summary.existingInstructionRows ?? -1) !== 0) failures.push("blocked-owner-input status must have 0 existing instruction rows");
  }
  if (recorded.recorderStatus === "dry-run-ready-requires-explicit-apply") {
    if (recorded.intakeStatus !== "ready-to-record-extraction-instruction-rows") failures.push("ready dry-run status requires ready intake");
    if ((summary.proposedInstructionRows ?? 0) !== 4) failures.push("ready dry-run status must have 4 proposed rows");
  }
  if (recorded.recorderStatus === "already-recorded") {
    if ((summary.existingInstructionRows ?? 0) < 4) failures.push("already-recorded status requires existing instruction rows");
  }

  for (const row of proposedRows) {
    if (row.cleanupAuthorized !== false) failures.push(`${row.unitId}: proposed row cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.unitId}: proposed row executableNow must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.unitId}: proposed row deployAuthorized must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.unitId}: proposed row mergeAuthorized must be false`);
    if (row.stageAuthorized !== false) failures.push(`${row.unitId}: proposed row stageAuthorized must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.unitId}: proposed row destructiveGitAuthorized must be false`);
    if (row.physicalLifecycleCleanupAuthorized !== false) failures.push(`${row.unitId}: proposed row physicalLifecycleCleanupAuthorized must be false`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intake)) {
      failures.push(`${row.unitId}: proposed row evidenceReviewed must include intake`);
    }
  }

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`check ${check.id} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["dryRunOnly", true],
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
    ["requiresExplicitApplyRecordingFlag", true],
    ["requiresSeparateCandidateExtractionStep", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }
  if (recorded.nextExtractionInstructionsPreview !== null) failures.push("dry-run current artifact must not include nextExtractionInstructionsPreview");

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A22 Root-Parity Extraction Instruction Recording Dry Run",
    "This recorder is fail-closed",
    "Proposed Extraction Instruction Rows Do Not Apply",
    "Records extraction instruction: false",
    "Modifies candidate: false",
    "Copies root files: false",
    "Deploy authorized: false",
    "Requires explicit apply-recording flag: true"
  ]) {
    if (!markdown.includes(needle)) failures.push(`recording markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("recording markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    recorderStatus: recorded.recorderStatus,
    intakeStatus: recorded.intakeStatus,
    expectedRows: summary.expectedRows ?? 0,
    existingInstructionRows: summary.existingInstructionRows ?? 0,
    proposedInstructionRows: summary.proposedInstructionRows ?? 0,
    applyPermitted: summary.applyPermitted ?? false,
    mutationsPerformed: summary.mutationsPerformed ?? false,
    recordsExtractionInstructionRows: summary.recordsExtractionInstructionRows ?? 0,
    modifiesCandidateRows: summary.modifiesCandidateRows ?? 0,
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
    console.log("A22 root-parity extraction instruction recording gate");
    console.log(`Recorder status: ${payload.recorderStatus ?? "unknown"}`);
    console.log(`Proposed instruction rows: ${payload.proposedInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 root-parity extraction instruction recording gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
