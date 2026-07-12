#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS,
  buildWave01ArtifactCleanExecutionInstructionRecordingState,
  stableWave01ArtifactCleanExecutionInstructionRecordingProjection
} from "./run-wave01-artifact-clean-execution-instruction-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-execution-instruction-recording-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intake,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intakeGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.instructionCapsule,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructionsGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.dirtyMap);
  const intake = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intake);
  const intakeGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intakeGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructionsGate);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson);
  const current = buildWave01ArtifactCleanExecutionInstructionRecordingState({ mode: "dry-run" });
  if (!sameJson(
    stableWave01ArtifactCleanExecutionInstructionRecordingProjection(recorded),
    stableWave01ArtifactCleanExecutionInstructionRecordingProjection(current)
  )) {
    failures.push("Wave01 artifact-clean execution-instruction recording dry run is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("recording dry run dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("recording dry run expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.intakeGeneratedAt !== intake.generatedAt) failures.push("recording dry run intake timestamp is stale");
  if (recorded.sourceArtifacts?.intakeGateFailureCount !== (intakeGate.failures ?? []).length) {
    failures.push("recording dry run intake gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionsGeneratedAt !== executionInstructions.generatedAt) {
    failures.push("recording dry run execution-instructions timestamp is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionsGateFailureCount !== (executionInstructionsGate.failures ?? []).length) {
    failures.push("recording dry run execution-instructions gate failure count is stale");
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");

  const summary = recorded.summary ?? {};
  if (recorded.mode !== "dry-run") failures.push("recording current gate validates dry-run mode only");
  if (![
    "dry-run-blocked-owner-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded",
    "post-clean-verified"
  ].includes(recorded.recorderStatus)) {
    failures.push(`unexpected recorderStatus: ${recorded.recorderStatus ?? "missing"}`);
  }
  if ((summary.approvalRows ?? 0) !== 6) failures.push("approvalRows must be 6");
  if ((summary.failedRecordingChecks ?? -1) !== 0) failures.push("failedRecordingChecks must be 0");
  if ((summary.passingRecordingChecks ?? 0) !== (summary.recordingChecks ?? -1)) failures.push("all recording checks must pass");
  if (summary.applyRequested !== false) failures.push("dry-run must not request apply");
  if (summary.applyPermitted !== false) failures.push("dry-run must not permit apply");
  if (summary.mutationsPerformed !== false) failures.push("dry-run must not mutate");
  if ((summary.recordsExecutionInstructionRows ?? -1) !== 0) failures.push("dry-run must record 0 execution-instruction rows");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.recorderStatus === "dry-run-blocked-owner-input") {
    if (recorded.intakeStatus !== "waiting-for-owner-input") failures.push("blocked-owner-input status requires waiting intake");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("blocked-owner-input status must have 0 proposed rows");
    if ((summary.existingInstructionRows ?? -1) !== 0) failures.push("blocked-owner-input status must have 0 existing instruction rows");
  }
  if (recorded.recorderStatus === "dry-run-ready-requires-explicit-apply") {
    if (recorded.intakeStatus !== "ready-to-record-instruction-rows") failures.push("ready dry-run status requires ready intake");
    if ((summary.proposedInstructionRows ?? 0) !== 6) failures.push("ready dry-run status must have 6 proposed rows");
  }
  if (recorded.recorderStatus === "already-recorded") {
    if ((summary.existingInstructionRows ?? 0) < 6) failures.push("already-recorded status requires existing instruction rows");
  }
  if (recorded.recorderStatus === "post-clean-verified") {
    if (recorded.intakeStatus !== "post-clean-verified") failures.push("post-clean recorder status requires post-clean intake");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("post-clean recorder status must have 0 proposed rows");
    if ((summary.existingInstructionRows ?? -1) !== 0) failures.push("post-clean recorder status must have 0 active existing instruction rows");
  }

  for (const row of recorded.proposedInstructionRowsDoNotApply ?? []) {
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: proposed row cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: proposed row executableNow must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.approvalId}: proposed row destructiveGitAuthorized must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.approvalId}: proposed row deployAuthorized must be false`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.instructionCapsule)) {
      failures.push(`${row.approvalId}: proposed row evidenceReviewed must include instruction capsule`);
    }
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.dryRunOnly !== true) failures.push("boundary.dryRunOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresExplicitApplyRecordingFlag !== true) failures.push("boundary.requiresExplicitApplyRecordingFlag must be true");
  if (recorded.recorderStatus === "post-clean-verified") {
    if (boundary.requiresSeparateGuardedExecutor !== false) failures.push("post-clean boundary.requiresSeparateGuardedExecutor must be false");
  } else if (boundary.requiresSeparateGuardedExecutor !== true) failures.push("boundary.requiresSeparateGuardedExecutor must be true");
  if (recorded.nextExecutionInstructionsPreview !== null) failures.push("dry-run current artifact must not include nextExecutionInstructionsPreview");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Execution Instruction Recording Dry Run",
    "Dry-run mode writes evidence only",
    "Records execution instruction: false",
    "Cleanup authorized: false",
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
    approvalRows: summary.approvalRows ?? 0,
    existingInstructionRows: summary.existingInstructionRows ?? 0,
    proposedInstructionRows: summary.proposedInstructionRows ?? 0,
    applyPermitted: summary.applyPermitted ?? false,
    mutationsPerformed: summary.mutationsPerformed ?? false,
    recordsExecutionInstructionRows: summary.recordsExecutionInstructionRows ?? 0,
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
    console.log("A25 Wave01 artifact-clean execution-instruction recording gate");
    console.log(`Recorder status: ${payload.recorderStatus ?? "unknown"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean execution-instruction recording gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
