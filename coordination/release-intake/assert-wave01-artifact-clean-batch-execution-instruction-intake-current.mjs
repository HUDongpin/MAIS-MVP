#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS,
  buildWave01ArtifactCleanBatchExecutionInstructionIntake,
  stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection
} from "./generate-wave01-artifact-clean-batch-execution-instruction-intake.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-batch-execution-instruction-intake-current-gate.json");
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequestGate,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructionsGate,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.dirtyMap);
  const batchRequest = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest);
  const batchRequestGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequestGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructionsGate);
  const ownerInput = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestJson);
  const current = buildWave01ArtifactCleanBatchExecutionInstructionIntake({
    ownerInputAction: recorded.ownerInputAction ?? "read-owner-input"
  });

  if (!sameJson(
    stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection(recorded),
    stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection(current)
  )) {
    failures.push("Wave01 artifact-clean batch execution-instruction intake is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("intake dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("intake expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.batchRequestGeneratedAt !== batchRequest.generatedAt) failures.push("intake batch-request timestamp is stale");
  if (recorded.sourceArtifacts?.batchRequestGateFailureCount !== (batchRequestGate.failures ?? []).length) {
    failures.push("intake batch-request gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionsGeneratedAt !== executionInstructions.generatedAt) {
    failures.push("intake execution-instructions timestamp is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionsGateFailureCount !== (executionInstructionsGate.failures ?? []).length) {
    failures.push("intake execution-instructions gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.ownerInputGeneratedAt !== (ownerInput.generatedAt ?? null)) failures.push("intake owner-input timestamp is stale");

  const summary = recorded.summary ?? {};
  if (![
    "waiting-for-owner-input",
    "ready-to-record-instruction-rows",
    "already-recorded",
    "post-clean-verified"
  ].includes(recorded.intakeStatus)) {
    failures.push(`unsupported or invalid intakeStatus: ${recorded.intakeStatus ?? "missing"}`);
  }
  if ((summary.expectedRows ?? 0) !== 6) failures.push("expectedRows must be 6");
  if (!["already-recorded", "post-clean-verified"].includes(recorded.intakeStatus) && (summary.draftRows ?? 0) !== 6) {
    failures.push("draftRows must be 6 before execution-instruction rows are recorded");
  }
  if ((summary.recordsExecutionInstructionRows ?? -1) !== 0) failures.push("recordsExecutionInstructionRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if ((summary.failedOwnerInputChecks ?? 0) !== 0) failures.push("owner input checks must not fail; blank input should wait, not fail");

  if (recorded.intakeStatus === "waiting-for-owner-input") {
    if (recorded.ownerInputBlank !== true) failures.push("waiting status requires blank owner input");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("waiting status must not propose instruction rows");
    if ((summary.waitingOwnerInputChecks ?? 0) < 1) failures.push("waiting status must expose waiting owner-input checks");
    if (nonEmptyString(ownerInput.ownerExecutionText)) failures.push("waiting owner input must not contain ownerExecutionText");
  }
  if (recorded.intakeStatus === "ready-to-record-instruction-rows") {
    if (recorded.ownerInputBlank !== false) failures.push("ready status requires nonblank owner input");
    if ((summary.proposedInstructionRows ?? 0) !== 6) failures.push("ready status must propose six instruction rows");
    if ((summary.waitingOwnerInputChecks ?? -1) !== 0) failures.push("ready status must have zero waiting checks");
  }
  if (recorded.intakeStatus === "already-recorded") {
    if ((summary.existingInstructionRows ?? 0) < 6) failures.push("already-recorded status requires existing instruction rows");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("already-recorded status must not propose instruction rows");
    if ((summary.waitingOwnerInputChecks ?? -1) !== 0) failures.push("already-recorded status must have zero waiting checks");
  }
  if (recorded.intakeStatus === "post-clean-verified") {
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("post-clean intake must not propose instruction rows");
    if ((summary.waitingOwnerInputChecks ?? -1) !== 0) failures.push("post-clean intake must have zero waiting checks");
    if ((summary.failedOwnerInputChecks ?? -1) !== 0) failures.push("post-clean intake must have zero failed checks");
  }

  for (const row of recorded.proposedInstructionRowsDoNotRecord ?? []) {
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: proposed row cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: proposed row executableNow must be false`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest)) {
      failures.push(`${row.approvalId}: proposed row evidenceReviewed must include batch request`);
    }
    if (!row.executionText?.includes(`approvalId=${row.approvalId}`)) failures.push(`${row.approvalId}: proposed row executionText missing approvalId`);
    if (!row.executionText?.includes(`cwd=${row.cwd}`)) failures.push(`${row.approvalId}: proposed row executionText missing cwd`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.intakeOnly !== true) failures.push("boundary.intakeOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if (ownerInput.cleanupAuthorized !== false) failures.push("owner input cleanupAuthorized must be false");
  if (ownerInput.executableNow !== false) failures.push("owner input executableNow must be false");
  if (ownerInput.deployAuthorized !== false) failures.push("owner input deployAuthorized must be false");
  if (ownerInput.boundary?.recordsExecutionInstruction !== false) failures.push("owner input must not record execution instructions");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Batch Execution Instruction Intake",
    "evidence-only",
    "does not record execution instructions",
    "Proposed Instruction Rows Do Not Record",
    "Records execution instruction: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`intake markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("intake markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    intakeStatus: recorded.intakeStatus,
    expectedRows: summary.expectedRows ?? 0,
    draftRows: summary.draftRows ?? 0,
    proposedInstructionRows: summary.proposedInstructionRows ?? 0,
    waitingOwnerInputChecks: summary.waitingOwnerInputChecks ?? 0,
    failedOwnerInputChecks: summary.failedOwnerInputChecks ?? 0,
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
    console.log("A25 Wave01 artifact-clean batch execution-instruction intake gate");
    console.log(`Intake status: ${payload.intakeStatus ?? "unknown"}`);
    console.log(`Expected rows: ${payload.expectedRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean batch execution-instruction intake gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
