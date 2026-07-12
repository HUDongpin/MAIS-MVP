#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizedCommandManifest: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  a16OwnerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  a16OwnerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  a16PostExtractionVerificationReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  wave01ArtifactCleanPostCleanVerificationPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan.json",
  wave01ArtifactCleanOwnerInput: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-owner-input.json",
  instructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  latestReportJson: "coordination/release-intake/latest-A25-next-owner-execution-instruction-scaffold-report.json",
  latestReportMarkdown: "coordination/release-intake/latest-A25-next-owner-execution-instruction-scaffold-report.md",
  datedReportJson: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-scaffold-report.json`,
  datedReportMarkdown: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-scaffold-report.md`
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

function rowCount(payload, key) {
  return Array.isArray(payload?.[key]) ? payload[key].length : 0;
}

function mergeEvidenceReviewed(draftRow, existingRow) {
  const values = [
    ...(draftRow.evidenceReviewed ?? []),
    ...(existingRow?.evidenceReviewed ?? [])
  ].filter(Boolean);
  return Array.from(new Set(values));
}

function consumedWave01ArtifactCleanInstructionRows(existingRows, existingConsumedRows = []) {
  if (!exists(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanPostCleanVerificationPlan)) return [];
  const postClean = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanPostCleanVerificationPlan);
  if (postClean.verificationStatus !== "post-clean-verified") return [];
  const targetRows = (postClean.targetRows ?? [])
    .filter((row) => row.targetAlreadyClean === true && row.targetStillDirty !== true)
  const targetIds = new Set(targetRows.map((row) => row.approvalId));
  if (targetIds.size === 0) return [];
  const preservedRows = [...existingConsumedRows, ...existingRows]
    .filter((row) => targetIds.has(row.approvalId))
    .map((row) => ({
      ...row,
      consumedStatus: "post-clean-verified",
      consumedEvidence: NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanPostCleanVerificationPlan,
      cleanupAuthorized: false,
      executableNow: false
    }));
  if (preservedRows.length === targetRows.length) return preservedRows;

  const ownerInput = exists(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanOwnerInput)
    ? readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanOwnerInput)
    : {};
  return targetRows.map((row) => ({
    approvalId: row.approvalId,
    approvalKind: "wave01-package-resync",
    owner: row.owner ?? "A25 git hygiene and release intake",
    subject: row.packageFile,
    path: row.packageFile,
    command: row.command,
    cwd: row.cwd,
    worktreePath: row.cwd,
    selectedAction: "owner-approved-package-untracked-clean",
    selectedFinalState: "approve-wave01-a25-artifact-clean-only",
    readyForSeparateInstruction: false,
    requiredExecutionText: "Instruction row has already been consumed by the guarded executor and verified post-clean.",
    evidenceReviewed: [
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanPostCleanVerificationPlan,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanOwnerInput
    ],
    approvedBy: ownerInput.approvedBy ?? "",
    approvedAt: ownerInput.approvedAt ?? "",
    notes: ownerInput.notes ?? "",
    executionText: ownerInput.ownerExecutionText ?? "",
    cleanupAuthorized: false,
    executableNow: false,
    packageFiles: [row.packageFile],
    instructionId: `${row.approvalId}-execution-instruction`,
    consumedStatus: "post-clean-verified",
    consumedEvidence: NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.wave01ArtifactCleanPostCleanVerificationPlan
  }));
}

function consumedSupersededA22GeneratedArtifactInstruction(existingRow) {
  if (!/^a22-generated-residual-/.test(existingRow?.approvalId ?? "")) return null;
  return {
    ...existingRow,
    readyForSeparateInstruction: false,
    requiredExecutionText: "Instruction row has already been consumed or superseded because this approval ID is no longer in the current authorized command manifest.",
    consumedStatus: "superseded-no-current-residual-target",
    consumedEvidence: NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function draftInstruction(candidate) {
  const ready = candidate.readyForSeparateInstruction === true;
  const row = {
    approvalId: candidate.approvalId,
    approvalKind: candidate.approvalKind,
    owner: candidate.owner,
    subject: candidate.subject,
    path: candidate.path,
    command: candidate.command,
    exactCommandSequence: candidate.exactCommandSequence,
    cwd: candidate.cwd,
    worktreePath: candidate.worktreePath,
    selectedAction: candidate.selectedAction,
    selectedFinalState: candidate.selectedFinalState,
    readyForSeparateInstruction: ready,
    requiredExecutionText: ready
      ? candidate.requiredExecutionText ?? `Execute approvalId=${candidate.approvalId}; command=${candidate.command}; cwd=${candidate.cwd}; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>`
      : "Candidate is not ready for a separate execution instruction.",
    evidenceReviewed: [
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest
    ],
    approvedBy: "",
    approvedAt: "",
    notes: "",
    executionText: "",
    cleanupAuthorized: false,
    executableNow: false
  };
  for (const key of [
    "sourceKind",
    "candidateId",
    "sourceApprovalIds",
    "packageFiles",
    "packageFingerprints",
    "packageFingerprintSha256",
    "packageFingerprintSource",
    "requiredPreExecutionChecks",
    "requiredPostExecutionChecks"
  ]) {
    if (candidate[key] !== undefined) row[key] = candidate[key];
  }
  return row;
}

function synchronizeExistingInstructions(scaffold, existing) {
  const draftsByApprovalId = new Map((scaffold.draftInstructionsDoNotExecute ?? []).map((row) => [row.approvalId, row]));
  const existingRows = Array.isArray(existing?.instructions) ? existing.instructions : [];
  const existingConsumedRows = Array.isArray(existing?.consumedInstructionsDoNotExecute)
    ? existing.consumedInstructionsDoNotExecute
    : [];
  const consumedRows = consumedWave01ArtifactCleanInstructionRows(existingRows, existingConsumedRows);
  const consumedIds = new Set(consumedRows.map((row) => row.approvalId));
  const synchronizedInstructions = [];
  const unmatchedInstructions = [];

  for (const existingRow of existingRows) {
    if (consumedIds.has(existingRow.approvalId)) continue;
    const draftRow = draftsByApprovalId.get(existingRow.approvalId);
    if (!draftRow) {
      const consumedA22Row = consumedSupersededA22GeneratedArtifactInstruction(existingRow);
      if (consumedA22Row) {
        consumedRows.push(consumedA22Row);
        consumedIds.add(consumedA22Row.approvalId);
        continue;
      }
      unmatchedInstructions.push(existingRow);
      continue;
    }
    synchronizedInstructions.push({
      ...draftRow,
      instructionId: existingRow.instructionId ?? `${draftRow.approvalId}-execution-instruction`,
      approvedBy: existingRow.approvedBy ?? "",
      approvedAt: existingRow.approvedAt ?? "",
      evidenceReviewed: mergeEvidenceReviewed(draftRow, existingRow),
      notes: existingRow.notes ?? "",
      executionText: existingRow.executionText ?? "",
      cleanupAuthorized: false,
      executableNow: false
    });
  }

  const synchronizedIds = new Set(synchronizedInstructions.map((row) => row.approvalId));
  const remainingDrafts = (scaffold.draftInstructionsDoNotExecute ?? []).filter((row) => !synchronizedIds.has(row.approvalId));
  return {
    ...scaffold,
    note: "A25 synchronized execution-instruction scaffold. Existing owner instruction fields are preserved while source timestamps and exact candidate fields are refreshed to the latest dirty-map baseline. This file still does not execute anything.",
    summary: {
      ...scaffold.summary,
      instructionRowsInFile: synchronizedInstructions.length,
      draftInstructionRows: remainingDrafts.length,
      unmatchedInstructionRows: unmatchedInstructions.length,
      consumedInstructionRows: consumedRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    instructions: synchronizedInstructions,
    draftInstructionsDoNotExecute: remainingDrafts,
    consumedInstructionsDoNotExecute: consumedRows,
    unmatchedInstructionsDoNotExecute: unmatchedInstructions,
    boundary: {
      ...scaffold.boundary,
      evidenceOnly: true,
      scaffoldOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateExecutionInstruction: true
    }
  };
}

function attachConsumedInstructions(scaffold, existing) {
  const existingConsumedRows = Array.isArray(existing?.consumedInstructionsDoNotExecute)
    ? existing.consumedInstructionsDoNotExecute
    : [];
  const consumedRows = consumedWave01ArtifactCleanInstructionRows([], existingConsumedRows);
  return {
    ...scaffold,
    summary: {
      ...scaffold.summary,
      consumedInstructionRows: consumedRows.length
    },
    consumedInstructionsDoNotExecute: consumedRows
  };
}

function a16SupplementalCandidates({ a16OwnerInput, a16OwnerInputGate, a16PostExtractionVerificationReport }) {
  const drafts = Array.isArray(a16OwnerInput?.draftInstructionsDoNotExecute)
    ? a16OwnerInput.draftInstructionsDoNotExecute
    : [];
  const draft = drafts[0] ?? null;
  const readyForOwnerInput = (a16OwnerInputGate?.readyForOwnerInputRows ?? 0) === 1 &&
    (a16OwnerInputGate?.validInstructionRows ?? 0) === 0 &&
    a16PostExtractionVerificationReport?.lifecycleStatus === "pending-owner-execution-instruction" &&
    (a16PostExtractionVerificationReport?.summary?.failedChecks ?? 0) === 0;
  if (!draft) return [];
  return [{
    approvalId: draft.approvalId,
    approvalKind: "a16-package-extraction-execution",
    owner: draft.owner,
    subject: draft.candidateId,
    path: draft.packageFingerprintSource,
    command: "",
    exactCommandSequence: draft.exactCommandSequence ?? [],
    cwd: draft.targetCwd,
    worktreePath: "",
    selectedAction: "pathspec-stage-and-commit",
    selectedFinalState: "reviewed commit",
    readyForSeparateInstruction: readyForOwnerInput,
    requiredExecutionText: readyForOwnerInput
      ? draft.requiredExecutionText
      : "A16 owner execution input is not ready for a separate execution instruction.",
    sourceKind: "a16-specialized-owner-input",
    candidateId: draft.candidateId,
    sourceApprovalIds: draft.sourceApprovalIds ?? [],
    packageFiles: draft.packageFiles ?? [],
    packageFingerprints: draft.packageFingerprints ?? [],
    packageFingerprintSha256: draft.packageFingerprintSha256 ?? "",
    packageFingerprintSource: draft.packageFingerprintSource,
    requiredPreExecutionChecks: draft.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: draft.requiredPostExecutionChecks ?? [],
    evidenceReviewed: [
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInput,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInputGate,
      NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16PostExtractionVerificationReport,
      ...(draft.evidenceReviewed ?? [])
    ]
  }];
}

function scaffoldPayload({ dirtyMap, manifest, a16OwnerInput, a16OwnerInputGate, a16PostExtractionVerificationReport }) {
  const manifestCandidates = manifest.candidates ?? [];
  const supplementalCandidates = a16SupplementalCandidates({
    a16OwnerInput,
    a16OwnerInputGate,
    a16PostExtractionVerificationReport
  });
  const candidates = [...manifestCandidates, ...supplementalCandidates];
  const drafts = candidates.map(draftInstruction);
  const manifestReadyRows = manifestCandidates.filter((row) => row.readyForSeparateInstruction === true).length;
  const supplementalA16ReadyRows = supplementalCandidates.filter((row) => row.readyForSeparateInstruction === true).length;
  return {
    generatedAt: new Date().toISOString(),
    scaffoldManaged: true,
    scaffoldKind: "next-owner-execution-instructions",
    note: "A25 scaffold only. Rows in draftInstructionsDoNotExecute are not execution instructions until copied into instructions with approvedBy, approvedAt, evidenceReviewed, notes, and executionText. This file does not execute anything.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceAuthorizedCommandManifestGeneratedAt: manifest.generatedAt,
    sourceAuthorizedCommandManifest: NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest,
    sourceA16OwnerInputGeneratedAt: a16OwnerInput.generatedAt ?? null,
    sourceA16OwnerInputGateCheckedAt: a16OwnerInputGate.checkedAt ?? null,
    sourceA16PostExtractionVerificationReportGeneratedAt: a16PostExtractionVerificationReport.generatedAt ?? null,
    cleanupAuthorized: false,
    executableNow: false,
    summary: {
      manifestCandidateRows: manifestCandidates.length,
      readyForSeparateInstructionRows: manifestReadyRows,
      supplementalA16CandidateRows: supplementalCandidates.length,
      supplementalA16ReadyForOwnerExecutionInstructionRows: supplementalA16ReadyRows,
      effectiveCandidateRows: candidates.length,
      effectiveReadyForSeparateInstructionRows: manifestReadyRows + supplementalA16ReadyRows,
      instructionRowsInFile: 0,
      draftInstructionRows: drafts.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    instructions: [],
    draftInstructionsDoNotExecute: drafts,
    boundary: {
      evidenceOnly: true,
      scaffoldOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateExecutionInstruction: true
    }
  };
}

function buildReport() {
  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.dirtyMap);
  const manifest = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.authorizedCommandManifest);
  const a16OwnerInput = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInput);
  const a16OwnerInputGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16OwnerInputGate);
  const a16PostExtractionVerificationReport = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.a16PostExtractionVerificationReport);
  const scaffold = scaffoldPayload({
    dirtyMap,
    manifest,
    a16OwnerInput,
    a16OwnerInputGate,
    a16PostExtractionVerificationReport
  });
  const targetExists = exists(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions);
  const existing = targetExists ? readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions) : null;
  const existingInstructionRows = rowCount(existing, "instructions");
  const synchronizedScaffold = existingInstructionRows > 0
    ? synchronizeExistingInstructions(scaffold, existing)
    : attachConsumedInstructions(scaffold, existing);
  const unmatchedInstructionRows = synchronizedScaffold.summary.unmatchedInstructionRows ?? 0;
  const consumedInstructionRows = synchronizedScaffold.summary.consumedInstructionRows ?? 0;
  const willWrite = !targetExists || existingInstructionRows === 0 || (existingInstructionRows > 0 && unmatchedInstructionRows === 0);
  const action = !targetExists
    ? "create-empty-scaffold"
    : existingInstructionRows === 0
      ? "refresh-empty-scaffold"
      : consumedInstructionRows > 0 && (synchronizedScaffold.instructions ?? []).length === 0
        ? "archive-consumed-owner-instructions"
        : unmatchedInstructionRows === 0
        ? "sync-existing-owner-instructions"
        : "preserve-existing-owner-instructions-unmatched";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceAuthorizedCommandManifestGeneratedAt: manifest.generatedAt,
    sourceA16OwnerInputGeneratedAt: a16OwnerInput.generatedAt ?? null,
    sourceA16OwnerInputGateCheckedAt: a16OwnerInputGate.checkedAt ?? null,
    sourceA16PostExtractionVerificationReportGeneratedAt: a16PostExtractionVerificationReport.generatedAt ?? null,
    target: NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions,
    targetExists,
    action,
    willWrite,
    existingInstructionRows,
    unmatchedInstructionRows,
    consumedInstructionRows,
    manifestCandidateRows: scaffold.summary.manifestCandidateRows,
    readyForSeparateInstructionRows: scaffold.summary.readyForSeparateInstructionRows,
    supplementalA16CandidateRows: scaffold.summary.supplementalA16CandidateRows,
    supplementalA16ReadyForOwnerExecutionInstructionRows: scaffold.summary.supplementalA16ReadyForOwnerExecutionInstructionRows,
    effectiveCandidateRows: scaffold.summary.effectiveCandidateRows,
    effectiveReadyForSeparateInstructionRows: scaffold.summary.effectiveReadyForSeparateInstructionRows,
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    boundary: {
      evidenceOnly: true,
      scaffoldOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    },
    scaffold: synchronizedScaffold
  };
}

function markdown(report) {
  return `# A25 Next Owner Execution Instruction Scaffold Report

Generated: ${report.generatedAt}

Target: \`${report.target}\`

Action: ${report.action}

This is a scaffold-only report. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup. Owner execution rows must be validated and still do not execute automatically.

## Summary

- Existing instruction rows: ${report.existingInstructionRows}
- Unmatched instruction rows: ${report.unmatchedInstructionRows}
- Consumed post-clean instruction rows: ${report.consumedInstructionRows}
- Manifest candidate rows: ${report.manifestCandidateRows}
- Ready for separate instruction rows: ${report.readyForSeparateInstructionRows}
- Supplemental A16 candidate rows: ${report.supplementalA16CandidateRows}
- Supplemental A16 ready owner execution-input rows: ${report.supplementalA16ReadyForOwnerExecutionInstructionRows}
- Effective candidate rows: ${report.effectiveCandidateRows}
- Effective ready for separate instruction rows: ${report.effectiveReadyForSeparateInstructionRows}
- File written this run: ${report.willWrite ? "yes" : "no"}
- Cleanup-authorized rows: ${report.cleanupAuthorizedRows}
- Executable rows: ${report.executableRows}
`;
}

function main() {
  const report = buildReport();
  if (report.willWrite) {
    write(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.instructions, `${JSON.stringify(report.scaffold, null, 2)}\n`);
  }

  const reportForDisk = { ...report };
  delete reportForDisk.scaffold;
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.datedReportJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.latestReportMarkdown, markdown(reportForDisk));
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_PATHS.datedReportMarkdown, markdown(reportForDisk));

  console.log(JSON.stringify({
    target: report.target,
    action: report.action,
    willWrite: report.willWrite,
    existingInstructionRows: report.existingInstructionRows,
    unmatchedInstructionRows: report.unmatchedInstructionRows,
    consumedInstructionRows: report.consumedInstructionRows,
    manifestCandidateRows: report.manifestCandidateRows,
    readyForSeparateInstructionRows: report.readyForSeparateInstructionRows,
    supplementalA16CandidateRows: report.supplementalA16CandidateRows,
    supplementalA16ReadyForOwnerExecutionInstructionRows: report.supplementalA16ReadyForOwnerExecutionInstructionRows,
    effectiveCandidateRows: report.effectiveCandidateRows,
    effectiveReadyForSeparateInstructionRows: report.effectiveReadyForSeparateInstructionRows,
    cleanupAuthorizedRows: report.cleanupAuthorizedRows,
    executableRows: report.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
