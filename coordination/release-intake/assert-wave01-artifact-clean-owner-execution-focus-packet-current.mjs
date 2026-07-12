#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS,
  buildWave01ArtifactCleanOwnerExecutionFocusPacket,
  stableWave01ArtifactCleanOwnerExecutionFocusProjection
} from "./generate-wave01-artifact-clean-owner-execution-focus-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-owner-execution-focus-packet-current-gate.json");
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

const allowedFocusStatuses = [
  "waiting-for-owner-execution-instruction",
  "ready-for-execution-instruction-recording",
  "ready-for-guarded-execution",
  "post-clean-verified"
];

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequest,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.batchRequestGate,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intake,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.intakeGate,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.ownerInput,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingDryRun,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.recordingGate,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlan,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedPlanGate,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorDryRun,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.guardedExecutorGate,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.instructionCapsule,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestJson);
  const current = buildWave01ArtifactCleanOwnerExecutionFocusPacket();
  if (!sameJson(
    stableWave01ArtifactCleanOwnerExecutionFocusProjection(recorded),
    stableWave01ArtifactCleanOwnerExecutionFocusProjection(current)
  )) {
    failures.push("Wave01 artifact-clean owner execution focus packet is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("focus dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("focus expanded dirty entry count is stale");
  if (recorded.focusKind !== "wave01-artifact-clean-owner-execution-focus-packet") failures.push("focusKind is invalid");
  if (!allowedFocusStatuses.includes(recorded.focusStatus)) {
    failures.push(`focusStatus must be a supported lifecycle status, got ${recorded.focusStatus ?? "missing"}`);
  }

  const summary = recorded.summary ?? {};
  if ((summary.requestRows ?? 0) !== 6) failures.push("requestRows must be 6");
  if ((summary.exactCommandRows ?? 0) !== 6) failures.push("exactCommandRows must be 6");
  if ((summary.targetRows ?? 0) !== 6) failures.push("targetRows must be 6");
  if ((summary.recordsExecutionInstructionRows ?? -1) !== 0) failures.push("recordsExecutionInstructionRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if (summary.deployAuthorized !== false) failures.push("deployAuthorized must be false");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("failedChecks must be 0");
  if ((summary.passingChecks ?? 0) !== (summary.checks ?? -1)) failures.push("all focus checks must pass");

  const targetRows = recorded.targetRows ?? [];
  for (const row of targetRows) {
    if (!/^wave01-resync-0[2-7]-/.test(row.approvalId ?? "")) failures.push(`${row.approvalId ?? "unknown"}: approval id must be Wave01 artifact-clean 02-07`);
    if (!/^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "")) {
      failures.push(`${row.approvalId ?? "unknown"}: package file must be one approved Wave01 dirty-map artifact`);
    }
    if (row.command !== `git clean -f -- ${row.packageFile}`) failures.push(`${row.approvalId ?? "unknown"}: command must exactly target package file`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId ?? "unknown"}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId ?? "unknown"}: executableNow must be false`);
    if (recorded.focusStatus === "post-clean-verified") {
      if (row.targetAlreadyClean !== true) failures.push(`${row.approvalId ?? "unknown"}: post-clean target should be verified clean`);
      if (row.targetStillDirty !== false) failures.push(`${row.approvalId ?? "unknown"}: post-clean target should no longer be dirty`);
    } else if (row.targetStillDirty !== true) {
      failures.push(`${row.approvalId ?? "unknown"}: target should still be dirty before guarded cleanup`);
    }
  }

  if (recorded.focusStatus === "waiting-for-owner-execution-instruction") {
    if ((summary.targetDirtyRows ?? 0) !== 6) failures.push("waiting focus must have 6 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? 0) !== 0) failures.push("waiting focus must have 0 already-clean target rows");
    if (summary.intakeStatus !== "waiting-for-owner-input") failures.push("waiting focus requires waiting intake");
    if (summary.recorderStatus !== "dry-run-blocked-owner-input") failures.push("waiting focus requires recorder blocked on owner input");
    if (summary.executorStatus !== "dry-run-blocked-missing-owner-execution-instruction") failures.push("waiting focus requires executor blocked on missing execution instruction");
  }
  if (recorded.focusStatus === "ready-for-execution-instruction-recording") {
    if ((summary.targetDirtyRows ?? 0) !== 6) failures.push("recording-ready focus must have 6 dirty target rows");
    if (summary.intakeStatus !== "ready-to-record-instruction-rows" && summary.recorderStatus !== "already-recorded") {
      failures.push("recording-ready focus requires ready intake or already-recorded instructions");
    }
    if (!["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(summary.recorderStatus)) {
      failures.push("recording-ready focus requires recorder ready or already-recorded");
    }
  }
  if (recorded.focusStatus === "ready-for-guarded-execution") {
    if ((summary.targetDirtyRows ?? 0) !== 6) failures.push("guarded-ready focus must have 6 dirty target rows");
    if (summary.recorderStatus !== "already-recorded") failures.push("guarded-ready focus requires recorded execution instructions");
    if (summary.executorStatus !== "dry-run-ready-requires-explicit-apply") failures.push("guarded-ready focus requires dry-run-ready guarded executor");
  }
  if (recorded.focusStatus === "post-clean-verified") {
    if ((summary.targetDirtyRows ?? -1) !== 0) failures.push("post-clean focus must have 0 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("post-clean focus must have 6 already-clean target rows");
    if (summary.executorStatus !== "already-cleaned-and-verified") failures.push("post-clean focus requires already-cleaned guarded executor evidence");
  }

  if (!(recorded.heldApprovalIds ?? []).includes("wave01-resync-01-tsconfig-json")) failures.push("heldApprovalIds must preserve wave01-resync-01-tsconfig-json");
  if ((recorded.ownerExecutionTextRequired ?? "").includes("tsconfig")) failures.push("owner execution text must not include held tsconfig row");
  for (const row of targetRows) {
    if (!recorded.ownerExecutionTextRequired?.includes(`approvalId=${row.approvalId}`)) failures.push(`${row.approvalId}: owner execution text missing approvalId`);
    if (!recorded.ownerExecutionTextRequired?.includes(`command=${row.command}`)) failures.push(`${row.approvalId}: owner execution text missing command`);
  }
  for (const needle of [
    "No cleanup",
    "broad staging",
    "deploy",
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>"
  ]) {
    if (!recorded.ownerExecutionTextRequired?.includes(needle)) failures.push(`owner execution text missing: ${needle}`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.focusPacketOnly !== true) failures.push("boundary.focusPacketOnly must be true");
  if (boundary.recordsOwnerInput !== false) failures.push("boundary.recordsOwnerInput must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_OWNER_EXECUTION_FOCUS_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Owner Execution Focus Packet",
    "evidence-only",
    "does not record execution instructions",
    "Owner Execution Text Required",
    "wave01-resync-01-tsconfig-json",
    "Destructive Git authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`focus markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("focus markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    focusStatus: recorded.focusStatus,
    requestRows: summary.requestRows ?? 0,
    exactCommandRows: summary.exactCommandRows ?? 0,
    targetDirtyRows: summary.targetDirtyRows ?? 0,
    recordsExecutionInstructionRows: summary.recordsExecutionInstructionRows ?? 0,
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
    console.log("A25 Wave01 artifact-clean owner execution focus packet gate");
    console.log(`Focus status: ${payload.focusStatus ?? "unknown"}`);
    console.log(`Request rows: ${payload.requestRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean owner execution focus packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
