#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS,
  buildWave01ArtifactCleanExecutionInstructionReadiness,
  stableWave01ArtifactCleanExecutionInstructionReadinessProjection
} from "./generate-wave01-artifact-clean-execution-instruction-readiness.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-execution-instruction-readiness-current-gate.json");
const json = process.argv.includes("--json");

const allowedStatuses = [
  "waiting-for-owner-execution-instruction",
  "ready-for-execution-instruction-recording",
  "ready-for-guarded-clean-apply",
  "post-clean-verified"
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

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.executionInstructionsGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.requestPacket,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.requestPacketGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.acceptanceDocket,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.acceptanceDocketGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchRequest,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchRequestGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchIntake,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.batchIntakeGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.recordingDryRun,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.recordingGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedPlan,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedPlanGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedExecutorDryRun,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.guardedExecutorGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.focusPacket,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.focusPacketGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.postCleanPlan,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.postCleanPlanGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestJson);
  const current = buildWave01ArtifactCleanExecutionInstructionReadiness();

  if (!sameJson(
    stableWave01ArtifactCleanExecutionInstructionReadinessProjection(recorded),
    stableWave01ArtifactCleanExecutionInstructionReadinessProjection(current)
  )) {
    failures.push("Wave01 artifact-clean execution-instruction readiness is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("readiness dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("readiness expanded dirty entry count is stale");
  if (recorded.readinessKind !== "wave01-artifact-clean-execution-instruction-readiness") failures.push("readinessKind is invalid");
  if (!allowedStatuses.includes(recorded.readinessStatus)) failures.push(`unexpected readinessStatus: ${recorded.readinessStatus ?? "missing"}`);
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((recorded.stagedRows ?? []).length !== 0) failures.push("stagedRows must be empty");

  const summary = recorded.summary ?? {};
  if ([
    "waiting-for-owner-execution-instruction",
    "ready-for-execution-instruction-recording"
  ].includes(recorded.readinessStatus) && (summary.requestRows ?? 0) !== 6) {
    failures.push("pre-recording readiness must keep six request rows");
  }
  if (recorded.readinessStatus === "ready-for-guarded-clean-apply" && (summary.requestRows ?? -1) !== 0) {
    failures.push("guarded-ready readiness must have 0 remaining request rows after instruction recording");
  }
  if ((summary.acceptanceRows ?? 0) !== 6 && recorded.readinessStatus !== "post-clean-verified") failures.push("non-post-clean readiness must keep six acceptance rows");
  if ((summary.targetRows ?? 0) !== 6) failures.push("targetRows must be 6");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("failedChecks must be 0");
  if ((summary.passingChecks ?? 0) !== (summary.checks ?? -1)) failures.push("all readiness checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if (summary.deployAuthorized !== false) failures.push("deployAuthorized must be false");

  if (recorded.readinessStatus === "waiting-for-owner-execution-instruction") {
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("waiting readiness must have 6 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 0) failures.push("waiting readiness must have 0 already-clean target rows");
    if ((summary.validInstructionRows ?? -1) !== 0) failures.push("waiting readiness must have 0 valid instruction rows");
    if (summary.intakeStatus !== "waiting-for-owner-input") failures.push("waiting readiness requires waiting intake");
    if (summary.recorderStatus !== "dry-run-blocked-owner-input") failures.push("waiting readiness requires recorder blocked on owner input");
    if (summary.executorStatus !== "dry-run-blocked-missing-owner-execution-instruction") failures.push("waiting readiness requires executor blocked on missing instruction");
    if (summary.postCleanVerificationStatus !== "waiting-for-clean-execution") failures.push("waiting readiness requires post-clean plan waiting status");
  }
  if (recorded.readinessStatus === "ready-for-execution-instruction-recording") {
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("recording-ready readiness must have 6 dirty target rows");
    if ((summary.validInstructionRows ?? -1) !== 0) failures.push("recording-ready readiness must still have 0 valid instruction rows");
    if (summary.intakeStatus !== "ready-to-record-instruction-rows") failures.push("recording-ready readiness requires ready intake");
    if (summary.recorderStatus !== "dry-run-ready-requires-explicit-apply") failures.push("recording-ready readiness requires recorder dry-run ready");
  }
  if (recorded.readinessStatus === "ready-for-guarded-clean-apply") {
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("guarded-ready readiness must have 6 dirty target rows");
    if ((summary.validInstructionRows ?? -1) !== 6) failures.push("guarded-ready readiness must have 6 valid instruction rows");
    if (summary.recorderStatus !== "already-recorded") failures.push("guarded-ready readiness requires already-recorded execution instructions");
    if (summary.executorStatus !== "dry-run-ready-requires-explicit-apply") failures.push("guarded-ready readiness requires executor dry-run ready");
  }
  if (recorded.readinessStatus === "post-clean-verified") {
    if ((summary.targetDirtyRows ?? -1) !== 0) failures.push("post-clean readiness must have 0 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("post-clean readiness must have 6 already-clean target rows");
    if (summary.executorStatus !== "already-cleaned-and-verified") failures.push("post-clean readiness requires already-cleaned executor status");
    if (summary.postCleanVerificationStatus !== "post-clean-verified") failures.push("post-clean readiness requires post-clean verification status");
  }

  for (const row of recorded.targetRows ?? []) {
    if (!/^wave01-resync-0[2-7]-/.test(row.approvalId ?? "")) failures.push(`${row.approvalId ?? "unknown"}: approval id must be Wave01 artifact-clean 02-07`);
    if (!/^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "")) {
      failures.push(`${row.approvalId ?? "unknown"}: package file must be one approved Wave01 dirty-map artifact`);
    }
    if (row.command !== `git clean -f -- ${row.packageFile}`) failures.push(`${row.approvalId ?? "unknown"}: command must exactly target package file`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId ?? "unknown"}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId ?? "unknown"}: executableNow must be false`);
  }

  if (!String(recorded.ownerExecutionTextRequired ?? "").includes("Authorize separate Wave01 A25 artifact-clean batch execution")) {
    failures.push("ownerExecutionTextRequired must include the Wave01 batch execution text");
  }
  for (const row of recorded.requestRows ?? []) {
    if (!recorded.ownerExecutionTextRequired.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: ownerExecutionTextRequired missing approvalId`);
    }
    for (const command of row.exactCommandSequence ?? []) {
      if (!recorded.ownerExecutionTextRequired.includes(`command=${command}`)) {
        failures.push(`${row.approvalId}: ownerExecutionTextRequired missing exact command`);
      }
    }
  }
  for (const needle of ["No cleanup", "broad staging", "deploy", "approvedBy=<owner>", "approvedAt=<ISO-8601>"]) {
    if (!recorded.ownerExecutionTextRequired.includes(needle)) failures.push(`ownerExecutionTextRequired missing ${needle}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.readinessBridgeOnly !== true) failures.push("boundary.readinessBridgeOnly must be true");
  if (boundary.recordsOwnerInput !== false) failures.push("boundary.recordsOwnerInput must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_READINESS_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Execution Instruction Readiness",
    "readiness bridge is evidence-only",
    "Owner Execution Text Required",
    "Records execution instruction: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`readiness markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    readinessStatus: recorded.readinessStatus,
    requestRows: summary.requestRows ?? 0,
    acceptanceRows: summary.acceptanceRows ?? 0,
    targetDirtyRows: summary.targetDirtyRows ?? 0,
    targetAlreadyCleanRows: summary.targetAlreadyCleanRows ?? 0,
    validInstructionRows: summary.validInstructionRows ?? 0,
    recorderStatus: summary.recorderStatus ?? "",
    executorStatus: summary.executorStatus ?? "",
    postCleanVerificationStatus: summary.postCleanVerificationStatus ?? "",
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    deployAuthorized: summary.deployAuthorized ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave01 artifact-clean execution-instruction readiness gate");
    console.log(`Readiness status: ${payload.readinessStatus ?? "unknown"}`);
    console.log(`Target dirty rows: ${payload.targetDirtyRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean execution-instruction readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
