#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS,
  buildA22RootParityGuardedExtractionState,
  stableA22RootParityGuardedExtractionProjection
} from "./run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-guarded-extraction-current-gate.json");
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
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.dirtyMap,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionPlan,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionPlanGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructionRecording,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.extractionInstructionRecordingGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.dirtyMap);
  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson);
  const current = buildA22RootParityGuardedExtractionState({ mode: "dry-run" });

  if (!sameJson(
    stableA22RootParityGuardedExtractionProjection(recorded),
    stableA22RootParityGuardedExtractionProjection(current)
  )) {
    failures.push("A22 root-parity guarded extraction dry-run evidence is stale");
  }

  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const alreadyExtracted = recorded.executorStatus === "already-extracted-and-verified";

  if (recorded.mode !== "dry-run") failures.push("guarded extraction current gate validates dry-run mode only");
  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("guarded extraction dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("guarded extraction expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (![
    "dry-run-blocked-missing-recorded-instructions",
    "dry-run-ready-requires-explicit-apply",
    "already-extracted-and-verified"
  ].includes(recorded.executorStatus)) {
    failures.push(`unexpected executorStatus: ${recorded.executorStatus ?? "missing"}`);
  }

  if ((summary.expectedRows ?? 0) !== 4) failures.push("expectedRows must be 4");
  if ((summary.extractionUnitRows ?? 0) !== 4) failures.push("extractionUnitRows must be 4");
  if ((summary.rootSourcesAvailable ?? 0) !== 4) failures.push("rootSourcesAvailable must be 4");
  if ((summary.rootSourcesShaMatched ?? 0) !== 4) failures.push("rootSourcesShaMatched must be 4");
  if ((summary.failedPreflightChecks ?? -1) !== 0) failures.push("failedPreflightChecks must be 0");
  if ((summary.passingPreflightChecks ?? 0) !== (summary.preflightChecks ?? -1)) failures.push("all preflight checks must pass");
  if (alreadyExtracted) {
    if (!Number.isInteger(summary.candidateGitStatusRows) || summary.candidateGitStatusRows < 0) {
      failures.push("candidateGitStatusRows must be a non-negative integer after extraction");
    }
  } else if ((summary.candidateGitStatusRows ?? -1) !== 0) {
    failures.push("candidateGitStatusRows must be 0 before extraction");
  }
  if (summary.applyRequested !== false) failures.push("dry-run must not request apply");
  if (summary.applyPermitted !== false) failures.push("dry-run must not permit apply");
  if (summary.mutationsPerformed !== false) failures.push("dry-run must not mutate");
  if ((summary.rootCopyRows ?? -1) !== 0) failures.push("rootCopyRows must be 0");
  if ((summary.candidateMutationRows ?? -1) !== 0) failures.push("candidateMutationRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (recorded.executorStatus === "dry-run-blocked-missing-recorded-instructions") {
    if ((summary.recordedInstructionRows ?? -1) !== 0) failures.push("blocked dry-run must have 0 recorded instruction rows");
    if ((summary.candidateTargetsMissing ?? -1) !== 4) failures.push("blocked dry-run must still have 4 missing candidate targets");
    if ((summary.candidateTargetsVerified ?? -1) !== 0) failures.push("blocked dry-run must have 0 verified candidate targets");
  }
  if (recorded.executorStatus === "dry-run-ready-requires-explicit-apply") {
    if ((summary.recordedInstructionRows ?? -1) !== 4) failures.push("ready dry-run must have 4 recorded instruction rows");
    if ((summary.candidateTargetsMissing ?? -1) !== 4) failures.push("ready dry-run must still have 4 missing candidate targets before extraction");
  }
  if (recorded.executorStatus === "already-extracted-and-verified") {
    if ((summary.recordedInstructionRows ?? -1) !== 4) failures.push("verified state must have 4 recorded instruction rows");
    if ((summary.candidateTargetsMissing ?? -1) !== 0) failures.push("verified state must have 0 missing candidate targets");
    if ((summary.candidateTargetsVerified ?? -1) !== 4) failures.push("verified state must have 4 verified candidate targets");
  }

  for (const row of recorded.recordedInstructionRows ?? []) {
    if (row.cleanupAuthorized !== false) failures.push(`${row.unitId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.unitId}: executableNow must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.unitId}: deployAuthorized must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.unitId}: mergeAuthorized must be false`);
    if (row.stageAuthorized !== false) failures.push(`${row.unitId}: stageAuthorized must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.unitId}: destructiveGitAuthorized must be false`);
    if (row.physicalLifecycleCleanupAuthorized !== false) failures.push(`${row.unitId}: physicalLifecycleCleanupAuthorized must be false`);
  }
  for (const check of recorded.preflightChecks ?? []) {
    if (check.status !== "pass") failures.push(`preflight check failed: ${check.id}`);
  }
  for (const unit of recorded.extractionUnits ?? []) {
    if (unit.rootShaMatchesPlan !== true) failures.push(`${unit.unitId}: root source sha must match plan`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["dryRunOnly", true],
    ["applyModeRequested", false],
    ["readsRecordedInstructionsOnly", true],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["writesRootSourceFiles", false],
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
    ["requiresSeparateOwnerCandidateMutationInstruction", !alreadyExtracted]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunMarkdown);
  for (const needle of [
    "A22 Root-Parity Guarded Extraction Dry Run",
    "fail-closed evidence only",
    "Recorded instruction rows",
    "Candidate mutation rows",
    "Copies root files: false",
    "Deploy authorized: false",
    `Requires separate owner candidate mutation instruction: ${!alreadyExtracted}`
  ]) {
    if (!markdown.includes(needle)) failures.push(`guarded extraction markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("guarded extraction markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    executorStatus: recorded.executorStatus,
    expectedRows: summary.expectedRows ?? 0,
    recordedInstructionRows: summary.recordedInstructionRows ?? 0,
    candidateTargetsMissing: summary.candidateTargetsMissing ?? 0,
    candidateTargetsVerified: summary.candidateTargetsVerified ?? 0,
    candidateGitStatusRows: summary.candidateGitStatusRows ?? 0,
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
    console.log("A22 root-parity guarded extraction gate");
    console.log(`Executor status: ${payload.executorStatus ?? "unknown"}`);
    console.log(`Recorded instruction rows: ${payload.recordedInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 root-parity guarded extraction gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
