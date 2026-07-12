#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS,
  buildA16ExecutionInstructionOwnerInputTemplateReport
} from "./generate-a16-execution-instruction-owner-input-template.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-execution-instruction-owner-input-current-gate.json");
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

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function includesAll(value, needles) {
  return typeof value === "string" && needles.every((needle) => value.includes(needle));
}

function validateInstruction(row, draft) {
  const failures = [];
  if (row.instructionId !== draft.instructionId) failures.push("instructionId must match the A16 draft");
  if (row.approvalId !== draft.approvalId) failures.push("approvalId must match the A16 draft");
  if (row.owner !== draft.owner) failures.push("owner must match the A16 draft");
  if (row.candidateId !== draft.candidateId) failures.push("candidateId must match the A16 draft");
  if (row.targetCwd !== draft.targetCwd) failures.push("targetCwd must match the A16 draft");
  if (!sameStringArray(row.sourceApprovalIds, draft.sourceApprovalIds)) failures.push("sourceApprovalIds must match the A16 draft");
  if (!sameStringArray(row.exactCommandSequence, draft.exactCommandSequence)) failures.push("exactCommandSequence must match the A16 draft");
  if (!sameStringArray(row.packageFiles, draft.packageFiles)) failures.push("packageFiles must match the A16 draft");
  if (!sameJson(row.packageFingerprints, draft.packageFingerprints)) failures.push("packageFingerprints must match the A16 draft");
  if (row.packageFingerprintSha256 !== draft.packageFingerprintSha256) failures.push("packageFingerprintSha256 must match the A16 draft");
  if (!Array.isArray(row.evidenceReviewed) || ![
    "coordination/release-intake/latest-A25-next-owner-authorizations.json",
    "coordination/release-intake/latest-A25-a16-execution-authorization-docket.json",
    "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
    "coordination/release-intake/latest-A25-a16-execution-instruction-input-scaffold.json"
  ].every((item) => row.evidenceReviewed.includes(item))) {
    failures.push("evidenceReviewed must include the A16 authorization, docket, pre-execution report, and input scaffold");
  }
  if (!nonEmptyString(row.approvedBy)) failures.push("approvedBy is required");
  if (!validIsoDate(row.approvedAt)) failures.push("approvedAt must be ISO-compatible");
  if (!nonEmptyString(row.notes)) failures.push("notes are required");
  if (!nonEmptyString(row.executionText)) failures.push("executionText is required");
  if (!includesAll(row.executionText, [
    "Authorize separate execution",
    "approvalIds=a16-research-and-learning-science,codex-a16-research-evidence-closure",
    `cwd=${draft.targetCwd}`,
    "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
    "Add A16 research evidence package",
    "No cleanup",
    "broad staging"
  ])) {
    failures.push("executionText must include the exact A16 authorization text and exclusions");
  }
  if (row.cleanupAuthorized === true) failures.push("cleanupAuthorized must not be true");
  if (row.executableNow === true) failures.push("executableNow must not be true");
  return failures;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.dirtyMap,
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.inputScaffold,
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.preExecutionValidationReport,
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput,
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportJson,
    A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.dirtyMap);
  const scaffold = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.inputScaffold);
  const preExecution = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.preExecutionValidationReport);
  const ownerInput = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput);
  const report = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportJson);
  const expectedReport = buildA16ExecutionInstructionOwnerInputTemplateReport();
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const instructions = Array.isArray(ownerInput.instructions) ? ownerInput.instructions : [];
  const drafts = Array.isArray(ownerInput.draftInstructionsDoNotExecute) ? ownerInput.draftInstructionsDoNotExecute : [];
  const draft = drafts[0] ?? {};

  if (ownerInput.dirtyMapStatusSignature !== expectedSignature) failures.push("owner input dirty-map signature is stale");
  if (ownerInput.expandedStatusEntries !== expectedEntries) failures.push("owner input expanded dirty entry count is stale");
  if (ownerInput.sourceInputScaffoldGeneratedAt !== scaffold.generatedAt) failures.push("owner input source scaffold timestamp is stale");
  if (ownerInput.sourcePreExecutionValidationReportGeneratedAt !== preExecution.generatedAt) {
    failures.push("owner input source pre-execution validation timestamp is stale");
  }
  if (report.dirtyMapStatusSignature !== expectedSignature) failures.push("report dirty-map signature is stale");
  if (report.expandedStatusEntries !== expectedEntries) failures.push("report expanded dirty entry count is stale");
  if (report.sourceInputScaffoldGeneratedAt !== scaffold.generatedAt) failures.push("report source scaffold timestamp is stale");
  if (report.sourcePreExecutionValidationReportGeneratedAt !== preExecution.generatedAt) {
    failures.push("report source pre-execution validation timestamp is stale");
  }
  if (report.target !== A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput) failures.push("report target mismatch");
  if (report.cleanupAuthorizedRows !== 0) failures.push("report cleanupAuthorizedRows must be 0");
  if (report.executableRows !== 0) failures.push("report executableRows must be 0");
  if (!["create-empty-owner-input", "refresh-empty-owner-input", "preserve-existing-owner-instruction-rows", "refresh-existing-owner-instruction-rows"].includes(report.action)) {
    failures.push("report action is not recognized");
  }
  if (report.willWrite !== expectedReport.willWrite) failures.push("report willWrite is stale");

  if (!Array.isArray(ownerInput.instructions)) failures.push("owner input must contain an instructions array");
  if (instructions.length > 1) failures.push("owner input may contain at most one A16 instruction row");
  if (drafts.length !== 1) failures.push("owner input must contain one draft instruction row");
  if (!sameStringArray(draft.exactCommandSequence, scaffold.draftInstructionsDoNotExecute?.[0]?.exactCommandSequence ?? [])) {
    failures.push("draft exact command sequence must match source scaffold");
  }
  if (!sameStringArray(draft.packageFiles, scaffold.draftInstructionsDoNotExecute?.[0]?.packageFiles ?? [])) {
    failures.push("draft package files must match source scaffold");
  }
  if (!sameJson(draft.packageFingerprints, preExecution.packageFingerprints)) {
    failures.push("draft package fingerprints must match pre-execution validation report");
  }
  if (draft.packageFingerprintSha256 !== preExecution.packageFingerprintSha256) {
    failures.push("draft packageFingerprintSha256 must match pre-execution validation report");
  }
  if (!Array.isArray(draft.packageFingerprints) || draft.packageFingerprints.length !== 6) {
    failures.push("draft packageFingerprints must contain 6 rows");
  }
  if (typeof draft.packageFingerprintSha256 !== "string" || draft.packageFingerprintSha256.length !== 64) {
    failures.push("draft packageFingerprintSha256 must be a sha256 hex string");
  }

  let validInstructionRows = 0;
  let invalidInstructionRows = 0;
  for (const row of instructions) {
    const rowFailures = validateInstruction(row, draft);
    if (rowFailures.length === 0) validInstructionRows += 1;
    else invalidInstructionRows += 1;
    for (const failure of rowFailures) failures.push(`${row.instructionId || "missing-instructionId"}: ${failure}`);
  }

  const cleanupAuthorizedRows = instructions.filter((row) => row.cleanupAuthorized === true).length;
  const executableRows = instructions.filter((row) => row.executableNow === true).length;
  if (cleanupAuthorizedRows !== 0) failures.push("instruction rows must not mark cleanup authorized");
  if (executableRows !== 0) failures.push("instruction rows must not mark executable now");
  if (ownerInput.cleanupAuthorized !== false) failures.push("owner input cleanupAuthorized must be false");
  if (ownerInput.executableNow !== false) failures.push("owner input executableNow must be false");

  const boundary = ownerInput.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.ownerInputOnly !== true) failures.push("boundary.ownerInputOnly must be true");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportMarkdown);
  for (const needle of [
    "A25 A16 Execution Instruction Owner Input Template",
    "does not authorize staging",
    "Existing instruction rows",
    "Executable rows"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing required text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    instructionRows: instructions.length,
    validInstructionRows,
    invalidInstructionRows,
    draftInstructionRows: drafts.length,
    readyForOwnerInputRows: instructions.length === 0 ? 1 : 0,
    packageFingerprintRows: draft.packageFingerprints?.length ?? 0,
    packageFingerprintSha256: draft.packageFingerprintSha256 ?? null,
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
    console.log("A25 A16 execution-instruction owner input gate");
    console.log(`Instruction rows: ${payload.instructionRows ?? 0}`);
    console.log(`Valid instruction rows: ${payload.validInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 execution-instruction owner input gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
