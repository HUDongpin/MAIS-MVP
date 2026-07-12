#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS,
  buildWave01ArtifactCleanExecutionInstructionCapsule,
  stableWave01ArtifactCleanExecutionInstructionCapsuleProjection
} from "./generate-wave01-artifact-clean-execution-instruction-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-execution-instruction-capsule-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.requestPacket,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.requestPacketGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.preflight,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.preflightGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.authorizedCommandManifest,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestJson);
  const current = buildWave01ArtifactCleanExecutionInstructionCapsule();
  if (!sameJson(
    stableWave01ArtifactCleanExecutionInstructionCapsuleProjection(recorded),
    stableWave01ArtifactCleanExecutionInstructionCapsuleProjection(current)
  )) {
    failures.push("Wave01 artifact-clean execution-instruction capsule is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.instructionRows ?? [];
  const checks = recorded.acceptanceChecks ?? [];
  const postCleanVerified = recorded.capsuleStatus === "post-clean-verified" || summary.capsuleStatus === "post-clean-verified";

  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("capsule dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("capsule expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.instructionRows ?? 0) !== 6) failures.push("summary.instructionRows must be 6");
  if ((summary.failedRows ?? -1) !== 0) failures.push("summary.failedRows must be 0");
  if ((summary.passingRows ?? 0) !== (summary.instructionRows ?? -1)) failures.push("all instruction rows must pass");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("summary.failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if (postCleanVerified && (summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("post-clean capsule must have 6 already-clean rows");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.instructionCapsuleOnly !== true) failures.push("boundary.instructionCapsuleOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.excludesTsconfigRestore !== true) failures.push("boundary.excludesTsconfigRestore must be true");

  if (rows.length !== 6) failures.push("instructionRows length must be 6");
  for (const row of rows) {
    if (!row.approvalId?.startsWith("wave01-resync-")) failures.push(`${row.approvalId ?? "missing"}: approvalId must be Wave01`);
    if (row.approvalId === "wave01-resync-01-tsconfig-json") failures.push("tsconfig hold row must not be in instruction rows");
    if (row.packageFile === "tsconfig.json") failures.push(`${row.approvalId}: packageFile must not be tsconfig.json`);
    if (!/^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.command ?? "")) {
      failures.push(`${row.approvalId}: command must be a single allowlisted Wave01 artifact clean command`);
    }
    if (!row.copyableExecutionInstructionText?.includes("No cleanup")) failures.push(`${row.approvalId}: instruction text missing no-cleanup phrase`);
    if (!row.copyableExecutionInstructionText?.includes("broad staging")) failures.push(`${row.approvalId}: instruction text missing broad-staging exclusion`);
    if (!row.copyableExecutionInstructionText?.includes("deploy")) failures.push(`${row.approvalId}: instruction text missing deploy exclusion`);
    if (postCleanVerified) {
      if (row.targetAlreadyClean !== true) failures.push(`${row.approvalId}: targetAlreadyClean must be true`);
      if (row.statusShort !== "") failures.push(`${row.approvalId}: post-clean statusShort must be empty`);
      if (row.dryRunOutput !== "") failures.push(`${row.approvalId}: post-clean dry-run output must be empty`);
    } else {
      if (!row.copyableExecutionInstructionText?.includes("Authorize separate execution")) failures.push(`${row.approvalId}: instruction text missing separate execution phrase`);
      if (!row.dryRunOutput?.includes(`Would remove ${row.packageFile}`)) failures.push(`${row.approvalId}: dry-run output must show only target removal`);
    }
    if ((row.failedChecks ?? -1) !== 0) failures.push(`${row.approvalId}: failedChecks must be 0`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
  }

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`acceptance check failed: ${check.id}`);
  }

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Execution Instruction Capsule",
    "does not record an execution instruction",
    "does not authorize `git clean -f`",
    "Deploy authorized: false",
    "Excludes tsconfig restore: true"
  ]) {
    if (!markdown.includes(needle)) failures.push(`capsule markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("capsule markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    instructionRows: summary.instructionRows ?? 0,
    passingRows: summary.passingRows ?? 0,
    failedRows: summary.failedRows ?? 0,
    sourceCurrentnessFailures: summary.sourceCurrentnessFailures ?? 0,
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
    console.log("A25 Wave01 artifact-clean execution-instruction capsule gate");
    console.log(`Instruction rows: ${payload.instructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean execution-instruction capsule gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
