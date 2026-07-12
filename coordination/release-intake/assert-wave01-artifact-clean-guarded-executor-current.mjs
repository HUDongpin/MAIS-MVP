#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS,
  buildWave01ArtifactCleanGuardedExecutorState,
  stableWave01ArtifactCleanGuardedExecutorProjection
} from "./run-wave01-artifact-clean-guarded-execution.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-guarded-executor-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.plan,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.planGate,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.executionInstructions,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.executionInstructionsGate,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunJson,
    WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunJson);
  const current = buildWave01ArtifactCleanGuardedExecutorState({ mode: "dry-run" });
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (!sameJson(
    stableWave01ArtifactCleanGuardedExecutorProjection(recorded),
    stableWave01ArtifactCleanGuardedExecutorProjection(current)
  )) {
    failures.push("Wave01 artifact-clean guarded executor dry-run evidence is stale");
  }
  if (recorded.mode !== "dry-run") failures.push("executor current gate only accepts dry-run evidence");
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("executor dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("executor expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("executor has source currentness failures");
  if (![
    "dry-run-blocked-missing-owner-execution-instruction",
    "dry-run-ready-requires-explicit-apply",
    "already-cleaned-and-verified"
  ].includes(recorded.executorStatus)) {
    failures.push(`unexpected executorStatus: ${recorded.executorStatus}`);
  }

  const summary = recorded.summary ?? {};
  if ((summary.targetRows ?? 0) !== 6) failures.push("targetRows must be 6");
  if ((summary.guardedCommandRows ?? 0) !== 6) failures.push("guardedCommandRows must be 6");
  if ((summary.failedPreflightChecks ?? -1) !== 0) failures.push("failedPreflightChecks must be 0");
  if ((summary.passingPreflightChecks ?? 0) !== (summary.preflightChecks ?? -1)) failures.push("all preflight checks must pass");
  if (summary.applyRequested !== false) failures.push("dry-run applyRequested must be false");
  if (summary.applyPermitted !== false) failures.push("dry-run applyPermitted must be false");
  if (summary.mutationsPerformed !== false) failures.push("dry-run mutationsPerformed must be false");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.executorStatus === "dry-run-blocked-missing-owner-execution-instruction") {
    if ((summary.instructionRows ?? -1) !== 0) failures.push("blocked dry-run must have 0 instruction rows");
    if ((summary.validInstructionRows ?? -1) !== 0) failures.push("blocked dry-run must have 0 valid instruction rows");
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("blocked dry-run must have 6 target dirty rows");
  }
  if (recorded.executorStatus === "dry-run-ready-requires-explicit-apply") {
    if ((summary.instructionRows ?? -1) !== 6) failures.push("ready dry-run must have 6 instruction rows");
    if ((summary.validInstructionRows ?? -1) !== 6) failures.push("ready dry-run must have 6 valid instruction rows");
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("ready dry-run must have 6 target dirty rows before apply");
  }
  if (recorded.executorStatus === "already-cleaned-and-verified") {
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("already-cleaned state must have 6 clean rows");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.dryRunOnly !== true) failures.push("boundary.dryRunOnly must be true");
  if (boundary.applyModeRequested !== false) failures.push("boundary.applyModeRequested must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false for dry-run");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresExplicitApplyFlag !== true) failures.push("boundary.requiresExplicitApplyFlag must be true");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_GUARDED_EXECUTOR_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Guarded Executor Dry Run",
    "Dry-run mode writes evidence only",
    "Apply requested: false",
    "Mutations performed: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`executor markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("executor markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    mode: recorded.mode,
    executorStatus: recorded.executorStatus,
    planStatus: recorded.planStatus,
    targetRows: summary.targetRows ?? 0,
    targetDirtyRows: summary.targetDirtyRows ?? 0,
    instructionRows: summary.instructionRows ?? 0,
    validInstructionRows: summary.validInstructionRows ?? 0,
    applyPermitted: summary.applyPermitted === true,
    mutationsPerformed: summary.mutationsPerformed === true,
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
    console.log("A25 Wave01 artifact-clean guarded executor gate");
    console.log(`Executor status: ${payload.executorStatus ?? "unknown"}`);
    console.log(`Apply permitted: ${payload.applyPermitted === true ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean guarded executor gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
