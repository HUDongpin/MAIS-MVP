#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS,
  buildWave01ArtifactCleanBatchExecutionInstructionRequest,
  stableWave01ArtifactCleanBatchExecutionInstructionRequestProjection
} from "./generate-wave01-artifact-clean-batch-execution-instruction-request.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-batch-execution-instruction-request-current-gate.json");
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

function includesAll(value, needles) {
  return typeof value === "string" && needles.every((needle) => value.includes(needle));
}

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacket,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacketGate,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlan,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlanGate,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.dirtyMap);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructionRequestPacketGate);
  const guardedPlan = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlan);
  const guardedPlanGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.guardedExecutionPlanGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.executionInstructions);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestJson);
  const current = buildWave01ArtifactCleanBatchExecutionInstructionRequest();
  if (!sameJson(
    stableWave01ArtifactCleanBatchExecutionInstructionRequestProjection(recorded),
    stableWave01ArtifactCleanBatchExecutionInstructionRequestProjection(current)
  )) {
    failures.push("Wave01 artifact-clean batch execution-instruction request is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("batch request dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("batch request expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.executionInstructionRequestPacketGeneratedAt !== requestPacket.generatedAt) {
    failures.push("batch request source execution request packet timestamp is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionRequestPacketGateFailureCount !== (requestPacketGate.failures ?? []).length) {
    failures.push("batch request source execution request packet gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.guardedExecutionPlanGeneratedAt !== guardedPlan.generatedAt) {
    failures.push("batch request source guarded plan timestamp is stale");
  }
  if (recorded.sourceArtifacts?.guardedExecutionPlanGateFailureCount !== (guardedPlanGate.failures ?? []).length) {
    failures.push("batch request source guarded plan gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.executionInstructionsGeneratedAt !== executionInstructions.generatedAt) {
    failures.push("batch request source execution-instructions timestamp is stale");
  }

  const summary = recorded.summary ?? {};
  const postCleanVerified = recorded.batchStatus === "post-clean-verified";
  if (!["waiting-for-owner-batch-execution-instruction", "post-clean-verified"].includes(recorded.batchStatus)) {
    failures.push("batch status must wait for owner batch execution instruction or be post-clean verified");
  }
  if ((summary.requestRows ?? 0) !== 6) failures.push("requestRows must be 6");
  if ((summary.commandRows ?? 0) !== 6) failures.push("commandRows must be 6");
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if (postCleanVerified) {
    if ((summary.activeRequestRows ?? -1) !== 0) failures.push("post-clean batch must have 0 active request rows");
    if ((summary.postCleanTargetRows ?? -1) !== 6) failures.push("post-clean batch must have 6 post-clean target rows");
    if ((summary.pendingReadyInstructionRows ?? -1) !== 0) failures.push("post-clean batch must have 0 pending ready instruction rows");
  } else {
    if ((summary.pendingReadyInstructionRows ?? 0) !== 6) failures.push("pendingReadyInstructionRows must be 6");
    if ((summary.instructionRowsInFile ?? -1) !== 0) failures.push("instructionRowsInFile must remain 0 before owner execution instruction is recorded");
    if ((summary.validInstructionRows ?? -1) !== 0) failures.push("validInstructionRows must remain 0 before owner execution instruction is recorded");
  }
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all batch request acceptance checks must pass");

  const text = recorded.batchCopyableOwnerExecutionText ?? "";
  if (!includesAll(text, [
    "Authorize separate Wave01 A25 artifact-clean batch execution",
    "cwd=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance",
    "No cleanup",
    "broad staging",
    "deploy",
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>"
  ])) {
    failures.push("batch copyable owner execution text missing required boundary terms");
  }
  if (text.includes("tsconfig")) failures.push("batch execution text must preserve tsconfig hold");
  for (const approvalId of recorded.approvalIds ?? []) {
    if (!text.includes(`approvalId=${approvalId}`)) failures.push(`batch text missing approvalId=${approvalId}`);
  }
  for (const command of recorded.exactCommandSequence ?? []) {
    if (!text.includes(`command=${command}`)) failures.push(`batch text missing command=${command}`);
  }
  for (const template of recorded.instructionTemplatesDoNotExecute ?? []) {
    if (template.approvedBy !== "") failures.push(`${template.approvalId}: template approvedBy must remain blank`);
    if (template.approvedAt !== "") failures.push(`${template.approvalId}: template approvedAt must remain blank`);
    if (template.executionText !== "") failures.push(`${template.approvalId}: template executionText must remain blank`);
    if (template.cleanupAuthorized !== false) failures.push(`${template.approvalId}: template cleanupAuthorized must be false`);
    if (template.executableNow !== false) failures.push(`${template.approvalId}: template executableNow must be false`);
  }
  if (postCleanVerified && (recorded.instructionTemplatesDoNotExecute ?? []).length !== 0) {
    failures.push("post-clean batch must not expose new instruction templates");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.requestOnly !== true) failures.push("boundary.requestOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Batch Execution Instruction Request",
    "request-only",
    "Batch Copyable Owner Execution Text",
    "Records execution instruction: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`batch request markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("batch request markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    batchStatus: recorded.batchStatus,
    requestRows: summary.requestRows ?? 0,
    commandRows: summary.commandRows ?? 0,
    pendingReadyInstructionRows: summary.pendingReadyInstructionRows ?? 0,
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
    console.log("A25 Wave01 artifact-clean batch execution-instruction request gate");
    console.log(`Batch status: ${payload.batchStatus ?? "unknown"}`);
    console.log(`Request rows: ${payload.requestRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean batch execution-instruction request gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
