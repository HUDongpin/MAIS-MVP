#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS,
  buildWave01ArtifactCleanGuardedExecutionPlan,
  stableWave01ArtifactCleanGuardedExecutionPlanProjection
} from "./generate-wave01-artifact-clean-guarded-execution-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-guarded-execution-plan-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.executionInstructionsGate,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.requestPacket,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.preflight,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.instructionCapsule,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestJson);
  const current = buildWave01ArtifactCleanGuardedExecutionPlan();
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (!sameJson(
    stableWave01ArtifactCleanGuardedExecutionPlanProjection(recorded),
    stableWave01ArtifactCleanGuardedExecutionPlanProjection(current)
  )) {
    failures.push("Wave01 artifact-clean guarded execution plan is stale");
  }
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("plan dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("plan expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if (!["blocked-missing-owner-execution-instruction", "ready-for-owner-approved-guarded-clean", "already-cleaned-and-verified"].includes(recorded.planStatus)) {
    failures.push(`unexpected planStatus: ${recorded.planStatus}`);
  }

  const summary = recorded.summary ?? {};
  if ((summary.targetRows ?? 0) !== 6) failures.push("targetRows must be 6");
  if ((summary.guardedCommandRows ?? 0) !== 6) failures.push("guardedCommandRows must be 6");
  if ((summary.stagedRows ?? -1) !== 0) failures.push("stagedRows must be 0");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.planStatus === "blocked-missing-owner-execution-instruction") {
    if ((summary.instructionRows ?? -1) !== 0) failures.push("blocked state must have 0 instruction rows");
    if ((summary.validInstructionRows ?? -1) !== 0) failures.push("blocked state must have 0 valid instruction rows");
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("blocked state must have 6 target dirty rows");
  }
  if (recorded.planStatus === "ready-for-owner-approved-guarded-clean") {
    if ((summary.instructionRows ?? -1) !== 6) failures.push("ready state must have 6 instruction rows");
    if ((summary.validInstructionRows ?? -1) !== 6) failures.push("ready state must have 6 valid instruction rows");
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("ready state must have 6 target dirty rows");
  }
  if (recorded.planStatus === "already-cleaned-and-verified") {
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("already-clean state must have 6 clean rows");
  }

  for (const row of recorded.targetRows ?? []) {
    if (row.approvalId === "wave01-resync-01-tsconfig-json") failures.push("tsconfig row must not be in guarded clean plan");
    if (row.packageFile === "tsconfig.json") failures.push(`${row.approvalId}: packageFile must not be tsconfig.json`);
    if (!/^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.command ?? "")) {
      failures.push(`${row.approvalId}: command must be a single allowlisted artifact clean command`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.planOnly !== true) failures.push("boundary.planOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresExplicitApplyFlag !== true) failures.push("boundary.requiresExplicitApplyFlag must be true");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTION_PLAN_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Guarded Execution Plan",
    "does not execute `git clean -f`",
    "Requires explicit apply flag: true",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`plan markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("plan markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    planStatus: recorded.planStatus,
    targetRows: summary.targetRows ?? 0,
    targetDirtyRows: summary.targetDirtyRows ?? 0,
    instructionRows: summary.instructionRows ?? 0,
    validInstructionRows: summary.validInstructionRows ?? 0,
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
    console.log("A25 Wave01 artifact-clean guarded execution plan gate");
    console.log(`Plan status: ${payload.planStatus ?? "unknown"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean guarded execution plan gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
