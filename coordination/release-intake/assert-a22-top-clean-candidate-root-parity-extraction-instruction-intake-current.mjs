#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS,
  buildA22RootParityExtractionInstructionIntake,
  stableA22RootParityExtractionInstructionIntakeProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake-current-gate.json");
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

function validationById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.dirtyMap,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequestGate,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.dirtyMap);
  const request = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest);
  const requestGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequestGate);
  const ownerInput = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput);
  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson);
  const current = buildA22RootParityExtractionInstructionIntake({
    ownerInputAction: recorded.ownerInputAction ?? "read-owner-input"
  });

  if (!sameJson(
    stableA22RootParityExtractionInstructionIntakeProjection(recorded),
    stableA22RootParityExtractionInstructionIntakeProjection(current)
  )) {
    failures.push("A22 root-parity extraction instruction intake is stale");
  }

  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const ownerInputProjection = recorded.ownerInputProjection ?? {};
  const proposedRows = recorded.proposedExtractionInstructionRowsDoNotRecord ?? [];
  const checks = recorded.ownerInputChecks ?? [];

  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("intake dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("intake expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.instructionRequestGeneratedAt !== request.generatedAt) {
    failures.push("intake instruction-request timestamp is stale");
  }
  if (recorded.sourceArtifacts?.instructionRequestGateFailureCount !== (requestGate.failures ?? []).length) {
    failures.push("intake instruction-request gate failure count is stale");
  }
  if (recorded.sourceArtifacts?.ownerInputGeneratedAt !== (ownerInput.generatedAt ?? null)) {
    failures.push("intake owner-input timestamp is stale");
  }
  if (recorded.requestStatus !== request.requestStatus) failures.push("intake requestStatus must match instruction request");
  if (recorded.requestStatus !== "waiting-for-owner-execution-instruction") {
    failures.push("instruction request should still be waiting for owner execution instruction");
  }
  if ((summary.expectedRows ?? 0) !== 4) failures.push("expectedRows must be 4");
  if ((summary.draftRows ?? 0) !== 4) failures.push("draftRows must be 4");
  if ((summary.recordsExtractionInstructionRows ?? -1) !== 0) failures.push("recordsExtractionInstructionRows must be 0");
  if ((summary.modifiesCandidateRows ?? -1) !== 0) failures.push("modifiesCandidateRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if ((summary.failedOwnerInputChecks ?? 0) !== 0) failures.push("owner input checks must not fail; blank input should wait, not fail");
  if ((summary.passingOwnerInputChecks ?? 0) + (summary.waitingOwnerInputChecks ?? 0) + (summary.failedOwnerInputChecks ?? 0) !== (summary.ownerInputChecks ?? -1)) {
    failures.push("owner input check status counts must add up");
  }

  if (![
    "waiting-for-owner-input",
    "ready-to-record-extraction-instruction-rows"
  ].includes(recorded.intakeStatus)) {
    failures.push(`unsupported intakeStatus: ${recorded.intakeStatus ?? "missing"}`);
  }

  if (recorded.intakeStatus === "waiting-for-owner-input") {
    if (recorded.ownerInputBlank !== true) failures.push("waiting status requires blank owner input");
    if ((summary.proposedInstructionRows ?? -1) !== 0) failures.push("waiting status must not propose instruction rows");
    if ((summary.waitingOwnerInputChecks ?? 0) < 1) failures.push("waiting status must expose waiting owner-input checks");
    if (nonEmptyString(ownerInput.ownerExecutionText)) failures.push("waiting owner input must not contain ownerExecutionText");
  }

  if (recorded.intakeStatus === "ready-to-record-extraction-instruction-rows") {
    if (recorded.ownerInputBlank !== false) failures.push("ready status requires nonblank owner input");
    if ((summary.proposedInstructionRows ?? 0) !== 4) failures.push("ready status must propose four instruction rows");
    if ((summary.waitingOwnerInputChecks ?? -1) !== 0) failures.push("ready status must have zero waiting checks");
    if ((ownerInputProjection.selectedActions ?? []).some((row) => !row.selectedActionProvided)) {
      failures.push("ready status requires all selected actions to be provided");
    }
  }

  const requestUnitIds = (request.instructionRows ?? []).map((row) => row.unitId);
  const projectionUnitIds = (ownerInputProjection.selectedActions ?? []).map((row) => row.unitId);
  if (JSON.stringify([...requestUnitIds].sort()) !== JSON.stringify([...projectionUnitIds].sort())) {
    failures.push("owner input projection unit IDs must match request unit IDs");
  }

  const requestReady = validationById(checks, "instruction-request-ready");
  if (requestReady?.status !== "pass") failures.push("instruction-request-ready check must pass");
  const boundaryCheck = validationById(checks, "owner-input-no-execution-boundary");
  if (boundaryCheck?.status !== "pass") failures.push("owner-input-no-execution-boundary check must pass");

  for (const row of proposedRows) {
    if (!requestUnitIds.includes(row.unitId)) failures.push(`${row.unitId ?? "missing"}: proposed row must map to a request unit`);
    if (row.instructionStatus !== "ready-to-record-extraction-instruction") {
      failures.push(`${row.unitId}: proposed row instructionStatus mismatch`);
    }
    if (row.candidateTargetExistsBeforeInstruction !== false && row.candidateTargetMatchesRootBeforeInstruction !== true) {
      failures.push(`${row.unitId}: candidate target should be missing or match the root source under controlled recovery`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${row.unitId}: proposed row cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.unitId}: proposed row executableNow must be false`);
    if (row.deployAuthorized !== false) failures.push(`${row.unitId}: proposed row deployAuthorized must be false`);
    if (row.mergeAuthorized !== false) failures.push(`${row.unitId}: proposed row mergeAuthorized must be false`);
    if (row.stageAuthorized !== false) failures.push(`${row.unitId}: proposed row stageAuthorized must be false`);
    if (row.destructiveGitAuthorized !== false) failures.push(`${row.unitId}: proposed row destructiveGitAuthorized must be false`);
    if (row.physicalLifecycleCleanupAuthorized !== false) failures.push(`${row.unitId}: proposed row physicalLifecycleCleanupAuthorized must be false`);
    if (!row.executionText?.includes(`unitId=${row.unitId}`)) failures.push(`${row.unitId}: proposed row executionText missing unitId`);
    if (!row.executionText?.includes(`selectedAction=${row.selectedAction}`)) failures.push(`${row.unitId}: proposed row executionText missing selectedAction`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["intakeOnly", true],
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
    ["requiresSeparateRecordingStep", true],
    ["requiresSeparateCandidateExtractionStep", true]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  if (ownerInput.cleanupAuthorized !== false) failures.push("owner input cleanupAuthorized must be false");
  if (ownerInput.executableNow !== false) failures.push("owner input executableNow must be false");
  if (ownerInput.deployAuthorized !== false) failures.push("owner input deployAuthorized must be false");
  if (ownerInput.mergeAuthorized !== false) failures.push("owner input mergeAuthorized must be false");
  if (ownerInput.stageAuthorized !== false) failures.push("owner input stageAuthorized must be false");
  if (ownerInput.destructiveGitAuthorized !== false) failures.push("owner input destructiveGitAuthorized must be false");
  if (ownerInput.physicalLifecycleCleanupAuthorized !== false) failures.push("owner input physicalLifecycleCleanupAuthorized must be false");
  if (ownerInput.boundary?.recordsExtractionInstruction !== false) failures.push("owner input must not record extraction instructions");
  if (ownerInput.boundary?.modifiesCandidate !== false) failures.push("owner input must not modify candidate");
  if (ownerInput.boundary?.copiesRootFiles !== false) failures.push("owner input must not copy root files");

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Root-Parity Extraction Instruction Intake",
    "evidence-only",
    "does not record extraction instructions",
    "Selected Actions In Owner Input",
    "Proposed Extraction Instruction Rows Do Not Record",
    "Records extraction instruction: false",
    "Modifies candidate: false",
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
    requestStatus: recorded.requestStatus,
    expectedRows: summary.expectedRows ?? 0,
    draftRows: summary.draftRows ?? 0,
    proposedInstructionRows: summary.proposedInstructionRows ?? 0,
    waitingOwnerInputChecks: summary.waitingOwnerInputChecks ?? 0,
    failedOwnerInputChecks: summary.failedOwnerInputChecks ?? 0,
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
    console.log("A22 top clean candidate root-parity extraction instruction intake gate");
    console.log(`Intake status: ${payload.intakeStatus ?? "unknown"}`);
    console.log(`Expected rows: ${payload.expectedRows ?? 0}`);
    console.log(`Proposed instruction rows: ${payload.proposedInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate root-parity extraction instruction intake gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
