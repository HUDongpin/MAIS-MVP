#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  inputScaffold: "coordination/release-intake/latest-A25-a16-execution-instruction-input-scaffold.json",
  preExecutionValidationReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  ownerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  latestReportJson: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-template-report.json",
  latestReportMarkdown: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-template-report.md",
  datedReportJson: `coordination/release-intake/${date}-A25-a16-execution-instruction-owner-input-template-report.json`,
  datedReportMarkdown: `coordination/release-intake/${date}-A25-a16-execution-instruction-owner-input-template-report.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function instructionRows(payload) {
  return Array.isArray(payload?.instructions) ? payload.instructions : [];
}

function draftRows(payload) {
  return Array.isArray(payload?.draftInstructionsDoNotExecute) ? payload.draftInstructionsDoNotExecute : [];
}

function emptyOwnerInput({ dirtyMap, scaffold }) {
  const draft = draftRows(scaffold)[0] ?? {};
  const preExecution = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.preExecutionValidationReport);
  const fingerprintedDraft = {
    ...draft,
    packageFingerprints: preExecution.packageFingerprints ?? [],
    packageFingerprintSha256: preExecution.packageFingerprintSha256 ?? "",
    packageFingerprintSource: A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.preExecutionValidationReport
  };
  return {
    generatedAt: new Date().toISOString(),
    scaffoldManaged: true,
    scaffoldKind: "a16-execution-instruction-owner-input",
    note: "Owner input scaffold only. Add one instruction row only after the owner provides the separate A16 execution instruction text. This file does not execute Git commands.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceInputScaffoldGeneratedAt: scaffold.generatedAt,
    sourcePreExecutionValidationReportGeneratedAt: preExecution.generatedAt,
    sourceInputScaffold: A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.inputScaffold,
    candidateId: scaffold.candidateId,
    cleanupAuthorized: false,
    executableNow: false,
    summary: {
      instructionRows: 0,
      validInstructionRows: 0,
      invalidInstructionRows: 0,
      draftInstructionRows: 1,
      readyForOwnerInputRows: 1,
      packageFileRows: Array.isArray(fingerprintedDraft.packageFiles) ? fingerprintedDraft.packageFiles.length : 0,
      packageFingerprintRows: Array.isArray(fingerprintedDraft.packageFingerprints) ? fingerprintedDraft.packageFingerprints.length : 0,
      packageFingerprintSha256: fingerprintedDraft.packageFingerprintSha256,
      exactCommandRows: Array.isArray(draft.exactCommandSequence) ? draft.exactCommandSequence.length : 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    instructions: [],
    draftInstructionsDoNotExecute: [fingerprintedDraft],
    boundary: {
      evidenceOnly: true,
      ownerInputOnly: true,
      recordsExecutionInstruction: false,
      validatesExecutionInstruction: true,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: true
    }
  };
}

function ownerInputWithExistingInstructions({ dirtyMap, scaffold, existing }) {
  const template = emptyOwnerInput({ dirtyMap, scaffold });
  const instructions = instructionRows(existing);
  return {
    ...template,
    instructions,
    summary: {
      ...template.summary,
      instructionRows: instructions.length,
      validInstructionRows: existing?.summary?.validInstructionRows ?? 0,
      invalidInstructionRows: existing?.summary?.invalidInstructionRows ?? 0,
      readyForOwnerInputRows: instructions.length === 0 ? 1 : 0
    },
    boundary: {
      ...template.boundary,
      recordsExecutionInstruction: instructions.length > 0
    }
  };
}

export function buildA16ExecutionInstructionOwnerInputTemplateReport() {
  const dirtyMap = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.dirtyMap);
  const scaffold = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.inputScaffold);
  const preExecution = readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.preExecutionValidationReport);
  const targetExists = exists(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput);
  const existing = targetExists ? readJson(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput) : null;
  const existingInstructionRows = instructionRows(existing).length;
  const template = emptyOwnerInput({ dirtyMap, scaffold });
  const refreshedExisting = targetExists && existingInstructionRows > 0
    ? ownerInputWithExistingInstructions({ dirtyMap, scaffold, existing })
    : null;
  const willWrite = !targetExists || existingInstructionRows === 0 || existingInstructionRows > 0;
  const action = !targetExists
    ? "create-empty-owner-input"
    : existingInstructionRows === 0
      ? "refresh-empty-owner-input"
      : "refresh-existing-owner-instruction-rows";
  const target = refreshedExisting ?? template;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceInputScaffoldGeneratedAt: scaffold.generatedAt,
    sourcePreExecutionValidationReportGeneratedAt: preExecution.generatedAt,
    target: A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput,
    targetExists,
    action,
    willWrite,
    existingInstructionRows,
    draftInstructionRows: draftRows(target).length,
    readyForOwnerInputRows: target.summary?.readyForOwnerInputRows ?? (instructionRows(target).length === 0 ? 1 : 0),
    packageFingerprintRows: target.summary?.packageFingerprintRows ?? 0,
    packageFingerprintSha256: target.summary?.packageFingerprintSha256 ?? "",
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    boundary: {
      evidenceOnly: true,
      ownerInputOnly: true,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    },
    ownerInput: target
  };
}

function markdown(report) {
  return `# A25 A16 Execution Instruction Owner Input Template

Generated: ${report.generatedAt}

Target: \`${report.target}\`

Action: ${report.action}

This report prepares the A16 owner execution-instruction input file. It does not authorize staging, committing, merging, cleanup, reset, clean, push, deploy, branch deletion, or worktree removal.

## Summary

- Existing instruction rows: ${report.existingInstructionRows}
- Draft instruction rows: ${report.draftInstructionRows}
- Ready for owner input rows: ${report.readyForOwnerInputRows}
- Package fingerprint rows: ${report.packageFingerprintRows}
- Package fingerprint sha256: \`${report.packageFingerprintSha256 || "n/a"}\`
- File written this run: ${report.willWrite ? "yes" : "no"}
- Cleanup-authorized rows: ${report.cleanupAuthorizedRows}
- Executable rows: ${report.executableRows}
`;
}

function main() {
  const report = buildA16ExecutionInstructionOwnerInputTemplateReport();
  if (report.willWrite) {
    write(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.ownerInput, `${JSON.stringify(report.ownerInput, null, 2)}\n`);
  }

  const reportForDisk = { ...report };
  delete reportForDisk.ownerInput;
  write(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
  write(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.datedReportJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
  write(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.latestReportMarkdown, markdown(reportForDisk));
  write(A16_EXECUTION_INSTRUCTION_OWNER_INPUT_PATHS.datedReportMarkdown, markdown(reportForDisk));

  console.log(JSON.stringify({
    target: report.target,
    action: report.action,
    willWrite: report.willWrite,
    existingInstructionRows: report.existingInstructionRows,
    draftInstructionRows: report.draftInstructionRows,
    readyForOwnerInputRows: report.readyForOwnerInputRows,
    packageFingerprintRows: report.packageFingerprintRows,
    packageFingerprintSha256: report.packageFingerprintSha256,
    cleanupAuthorizedRows: report.cleanupAuthorizedRows,
    executableRows: report.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
