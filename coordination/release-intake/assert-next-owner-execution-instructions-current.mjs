#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS
} from "./generate-next-owner-execution-instruction-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-execution-instructions-current-gate.json");
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function includesAll(values, requiredValues) {
  return Array.isArray(values) && requiredValues.every((value) => values.includes(value));
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function validateInstruction(row, candidate) {
  const failures = [];
  if (!candidate) {
    failures.push("unknown approvalId");
    return failures;
  }
  if (candidate.readyForSeparateInstruction !== true) failures.push("candidate is not ready for separate execution instruction");
  if (Array.isArray(candidate.exactCommandSequence) && candidate.exactCommandSequence.length > 0) {
    if (!sameStringArray(row.exactCommandSequence, candidate.exactCommandSequence)) {
      failures.push("exactCommandSequence must exactly match the supplemental A16 owner execution input");
    }
    if (!sameStringArray(row.sourceApprovalIds, candidate.sourceApprovalIds)) failures.push("sourceApprovalIds must match the supplemental A16 owner execution input");
    if (!sameStringArray(row.packageFiles, candidate.packageFiles)) failures.push("packageFiles must match the supplemental A16 owner execution input");
    if (!sameJson(row.packageFingerprints, candidate.packageFingerprints)) failures.push("packageFingerprints must match the supplemental A16 owner execution input");
    if (row.packageFingerprintSha256 !== candidate.packageFingerprintSha256) failures.push("packageFingerprintSha256 must match the supplemental A16 owner execution input");
  } else if (row.command !== candidate.command) {
    failures.push("command must exactly match authorized command manifest");
  }
  if (row.cwd !== candidate.cwd) failures.push("cwd must exactly match authorized command manifest");
  if (!nonEmptyString(row.approvedBy)) failures.push("approvedBy is required");
  if (!validIsoDate(row.approvedAt)) failures.push("approvedAt must be an ISO-compatible date");
  if (!Array.isArray(row.evidenceReviewed) || row.evidenceReviewed.length === 0) failures.push("evidenceReviewed must be a non-empty array");
  if (!includesAll(row.evidenceReviewed, [NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest])) {
    failures.push("evidenceReviewed must include the authorized command manifest");
  }
  if (!nonEmptyString(row.notes)) failures.push("notes are required");
  if (!nonEmptyString(row.executionText)) failures.push("executionText is required");
  if (nonEmptyString(row.executionText) && !row.executionText.includes(`approvalId=${row.approvalId}`)) failures.push("executionText missing approvalId");
  if (
    Array.isArray(candidate.exactCommandSequence) &&
    candidate.exactCommandSequence.length > 0 &&
    nonEmptyString(row.executionText) &&
    !candidate.exactCommandSequence.every((command) => row.executionText.includes(command))
  ) {
    failures.push("executionText missing one or more exact commands");
  }
  if (
    (!Array.isArray(candidate.exactCommandSequence) || candidate.exactCommandSequence.length === 0) &&
    nonEmptyString(row.executionText) &&
    !row.executionText.includes(`command=${candidate.command}`)
  ) {
    failures.push("executionText missing exact command");
  }
  if (nonEmptyString(row.executionText) && !row.executionText.includes(`cwd=${candidate.cwd}`)) failures.push("executionText missing cwd");
  if (
    candidate.sourceKind === "a16-specialized-owner-input" &&
    nonEmptyString(row.executionText) &&
    (!row.executionText.includes("No cleanup") || !row.executionText.includes("broad staging"))
  ) {
    failures.push("A16 executionText must preserve no-cleanup and no-broad-staging exclusions");
  }
  if (row.cleanupAuthorized === true) failures.push("cleanupAuthorized must not be true in this validator");
  if (row.executableNow === true) failures.push("executableNow must not be true in this validator");
  return failures;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.dirtyMap,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInput,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInputGate,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16PostExtractionVerificationReport,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportJson,
    NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, instructionRowsInFile: 0 });

  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.dirtyMap);
  const manifest = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest);
  const a16OwnerInput = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInput);
  const a16OwnerInputGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInputGate);
  const a16PostExtractionVerificationReport = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16PostExtractionVerificationReport);
  const instructions = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions);
  const report = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportJson);
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const manifestCandidates = manifest.candidates ?? [];
  const a16Draft = Array.isArray(a16OwnerInput.draftInstructionsDoNotExecute)
    ? a16OwnerInput.draftInstructionsDoNotExecute[0]
    : null;
  const supplementalCandidates = a16Draft ? [{
    approvalId: a16Draft.approvalId,
    sourceKind: "a16-specialized-owner-input",
    readyForSeparateInstruction: (a16OwnerInputGate.readyForOwnerInputRows ?? 0) === 1 &&
      (a16OwnerInputGate.validInstructionRows ?? 0) === 0 &&
      a16PostExtractionVerificationReport.lifecycleStatus === "pending-owner-execution-instruction" &&
      (a16PostExtractionVerificationReport.summary?.failedChecks ?? 0) === 0,
    command: "",
    exactCommandSequence: a16Draft.exactCommandSequence ?? [],
    cwd: a16Draft.targetCwd,
    sourceApprovalIds: a16Draft.sourceApprovalIds ?? [],
    packageFiles: a16Draft.packageFiles ?? [],
    packageFingerprints: a16Draft.packageFingerprints ?? [],
    packageFingerprintSha256: a16Draft.packageFingerprintSha256 ?? "",
    evidenceReviewed: [
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInput,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInputGate,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16PostExtractionVerificationReport
    ]
  }] : [];
  const candidates = [...manifestCandidates, ...supplementalCandidates];
  const candidateById = new Map(candidates.map((row) => [row.approvalId, row]));
  const readyCandidateRows = manifestCandidates.filter((row) => row.readyForSeparateInstruction === true).length;
  const supplementalA16ReadyRows = supplementalCandidates.filter((row) => row.readyForSeparateInstruction === true).length;
  const effectiveReadyRows = readyCandidateRows + supplementalA16ReadyRows;
  const rows = Array.isArray(instructions.instructions) ? instructions.instructions : [];

  if (!Array.isArray(instructions.instructions)) failures.push("instructions file must contain an instructions array");
  if (instructions.dirtyMapStatusSignature !== expectedSignature) failures.push("instructions file dirty-map signature is stale or missing");
  if (instructions.expandedStatusEntries !== expectedEntries) failures.push("instructions file expanded dirty entry count is stale or missing");
  if (instructions.sourceAuthorizedCommandManifestGeneratedAt !== manifest.generatedAt) failures.push("instructions file source manifest timestamp is stale or missing");
  if (instructions.sourceA16OwnerInputGeneratedAt !== a16OwnerInput.generatedAt) failures.push("instructions file source A16 owner-input timestamp is stale or missing");
  if (instructions.sourceA16PostExtractionVerificationReportGeneratedAt !== a16PostExtractionVerificationReport.generatedAt) {
    failures.push("instructions file source A16 post-extraction report timestamp is stale or missing");
  }
  if (instructions.cleanupAuthorized === true) failures.push("instructions file cleanupAuthorized must not be true");
  if (instructions.executableNow === true) failures.push("instructions file executableNow must not be true");
  const boundary = instructions.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("instructions boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("instructions boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("instructions boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("instructions boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("instructions boundary.deployAuthorized must be false");

  if (report.dirtyMapStatusSignature !== expectedSignature) failures.push("scaffold report dirty-map signature is stale or missing");
  if (report.expandedStatusEntries !== expectedEntries) failures.push("scaffold report expanded dirty entry count is stale or missing");
  if (report.sourceAuthorizedCommandManifestGeneratedAt !== manifest.generatedAt) failures.push("scaffold report source manifest timestamp is stale or missing");
  if (report.sourceA16OwnerInputGeneratedAt !== a16OwnerInput.generatedAt) failures.push("scaffold report source A16 owner-input timestamp is stale or missing");
  if (report.sourceA16PostExtractionVerificationReportGeneratedAt !== a16PostExtractionVerificationReport.generatedAt) {
    failures.push("scaffold report source A16 post-extraction report timestamp is stale or missing");
  }
  if ((report.unmatchedInstructionRows ?? 0) !== 0) failures.push("scaffold report unmatchedInstructionRows must be 0");
  if (report.cleanupAuthorizedRows !== 0) failures.push("scaffold report cleanupAuthorizedRows must be 0");
  if (report.executableRows !== 0) failures.push("scaffold report executableRows must be 0");
  if ((instructions.summary?.manifestCandidateRows ?? -1) !== manifestCandidates.length) failures.push("instructions summary manifestCandidateRows mismatch");
  if ((instructions.summary?.supplementalA16CandidateRows ?? -1) !== supplementalCandidates.length) failures.push("instructions summary supplementalA16CandidateRows mismatch");
  if ((instructions.summary?.supplementalA16ReadyForOwnerExecutionInstructionRows ?? -1) !== supplementalA16ReadyRows) {
    failures.push("instructions summary supplementalA16ReadyForOwnerExecutionInstructionRows mismatch");
  }
  if ((instructions.summary?.effectiveReadyForSeparateInstructionRows ?? -1) !== effectiveReadyRows) {
    failures.push("instructions summary effectiveReadyForSeparateInstructionRows mismatch");
  }
  if ((instructions.summary?.unmatchedInstructionRows ?? 0) !== 0) failures.push("instructions summary unmatchedInstructionRows must be 0");

  const seen = new Set();
  let validInstructionRows = 0;
  let invalidInstructionRows = 0;
  for (const row of rows) {
    const rowFailures = [];
    if (!nonEmptyString(row.approvalId)) rowFailures.push("approvalId is required");
    if (seen.has(row.approvalId)) rowFailures.push("duplicate approvalId");
    seen.add(row.approvalId);
    rowFailures.push(...validateInstruction(row, candidateById.get(row.approvalId)));
    if (rowFailures.length === 0) validInstructionRows += 1;
    else invalidInstructionRows += 1;
    for (const failure of rowFailures) failures.push(`${row.approvalId || "missing-approvalId"}: ${failure}`);
  }

  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized === true).length;
  const executableRows = rows.filter((row) => row.executableNow === true).length;
  if (cleanupAuthorizedRows !== 0) failures.push("instruction rows must not mark cleanup authorized");
  if (executableRows !== 0) failures.push("instruction rows must not mark executable now");

  const markdown = readText(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportMarkdown);
  for (const needle of [
    "scaffold-only report",
    "does not authorize staging",
    "Owner execution rows must be validated",
    "Supplemental A16 ready owner execution-input rows"
  ]) {
    if (!markdown.includes(needle)) failures.push(`execution instruction report markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("execution instruction report markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    sourceAuthorizedCommandManifestGeneratedAt: manifest.generatedAt,
    manifestCandidateRows: manifestCandidates.length,
    readyForSeparateInstructionRows: readyCandidateRows,
    supplementalA16CandidateRows: supplementalCandidates.length,
    supplementalA16ReadyForOwnerExecutionInstructionRows: supplementalA16ReadyRows,
    effectiveCandidateRows: candidates.length,
    effectiveReadyForSeparateInstructionRows: effectiveReadyRows,
    instructionRowsInFile: rows.length,
    validInstructionRows,
    invalidInstructionRows,
    pendingReadyManifestRows: Math.max(readyCandidateRows - validInstructionRows, 0),
    effectivePendingReadyInstructionRows: Math.max(effectiveReadyRows - validInstructionRows, 0),
    cleanupAuthorizedRows,
    executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next-owner execution instructions gate");
    console.log(`Instruction rows: ${payload.instructionRowsInFile ?? 0}`);
    console.log(`Valid instruction rows: ${payload.validInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner execution instructions gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
