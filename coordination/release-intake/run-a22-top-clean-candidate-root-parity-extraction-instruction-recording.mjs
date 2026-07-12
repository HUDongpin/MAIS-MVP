#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS,
  buildA22RootParityExtractionInstructionIntake,
  stableA22RootParityExtractionInstructionIntakeProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  intake: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson,
  intakeGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake-current-gate.json",
  ownerInput: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
  extractionInstructions: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instructions.json",
  latestDryRunJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-apply.md"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function unique(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function emptyExtractionInstructions({ dirtyMap, intake }) {
  return {
    generatedAt: null,
    repoRoot: root,
    instructionKind: "a22-root-parity-extraction-instructions",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      intakeGeneratedAt: intake.generatedAt,
      ownerInput: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.ownerInput
    },
    topCandidate: intake.topCandidate ?? {},
    targetWorktree: intake.topCandidate?.path ?? "",
    instructions: [],
    summary: {
      instructionRows: 0,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresSeparateCandidateExtractionStep: true
    }
  };
}

function readExtractionInstructions({ dirtyMap, intake }) {
  if (!exists(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions)) {
    return emptyExtractionInstructions({ dirtyMap, intake });
  }
  return readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions);
}

function targetInstructionRows(extractionInstructions, unitIds) {
  const ids = new Set(unitIds ?? []);
  return (extractionInstructions.instructions ?? []).filter((row) => ids.has(row.unitId));
}

function nonTargetInstructionRows(extractionInstructions, unitIds) {
  const ids = new Set(unitIds ?? []);
  return (extractionInstructions.instructions ?? []).filter((row) => !ids.has(row.unitId));
}

function enrichProposedRowsForRecording(rows) {
  return (rows ?? []).map((row) => ({
    ...row,
    evidenceReviewed: unique([
      ...(row.evidenceReviewed ?? []),
      TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intake,
      TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intakeGate,
      TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.ownerInput
    ]),
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false
  }));
}

function sourceCurrentnessFailures({ dirtyMap, intake, intakeGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (intake.dirtyMapStatusSignature !== expectedSignature) failures.push("intake dirty-map signature is stale");
  if (intake.expandedStatusEntries !== expectedEntries) failures.push("intake expanded dirty entry count is stale");
  if (intakeGate.dirtyMapStatusSignature !== expectedSignature) failures.push("intake gate dirty-map signature is stale");
  if (intakeGate.expandedStatusEntries !== expectedEntries) failures.push("intake gate expanded dirty entry count is stale");
  if ((intakeGate.failures ?? []).length !== 0) failures.push("intake gate has failures");
  const currentIntake = buildA22RootParityExtractionInstructionIntake({
    ownerInputAction: intake.ownerInputAction ?? "read-owner-input"
  });
  if (!sameJson(
    stableA22RootParityExtractionInstructionIntakeProjection(intake),
    stableA22RootParityExtractionInstructionIntakeProjection(currentIntake)
  )) {
    failures.push("intake payload is stale versus current owner input and sources");
  }
  return failures;
}

function recordingStatus({ mode, sourceFailures, intake, proposedRows, existingRows, partialRows, expectedRows }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (partialRows.length > 0) return "not-ready-partial-existing-instructions";
  if (expectedRows > 0 && existingRows.length >= expectedRows) return "already-recorded";
  if (intake.intakeStatus === "waiting-for-owner-input") {
    return mode === "apply-recording" ? "apply-blocked-owner-input" : "dry-run-blocked-owner-input";
  }
  if (intake.intakeStatus === "ready-to-record-extraction-instruction-rows" && proposedRows.length === expectedRows) {
    return mode === "apply-recording" ? "ready-to-apply-recording" : "dry-run-ready-requires-explicit-apply";
  }
  return "not-ready-invalid-intake";
}

function rowsKeepSafeBoundary(rows) {
  return (rows ?? []).every((row) =>
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.deployAuthorized === false &&
    row.mergeAuthorized === false &&
    row.stageAuthorized === false &&
    row.destructiveGitAuthorized === false &&
    row.physicalLifecycleCleanupAuthorized === false
  );
}

function buildChecks({ mode, sourceFailures, intake, proposedRows, existingRows, partialRows, expectedRows, status }) {
  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply-recording" ? "pass" : "fail",
      detail: `mode=${mode}`
    },
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "four-unit-ids",
      status: (intake.applyToUnitIds ?? []).length === 4 && expectedRows === 4 ? "pass" : "fail",
      detail: `applyToUnitIds=${(intake.applyToUnitIds ?? []).length}; expectedRows=${expectedRows}`
    },
    {
      id: "no-partial-existing-target-records",
      status: partialRows.length === 0 ? "pass" : "fail",
      detail: `existingTargetRows=${existingRows.length}`
    },
    {
      id: "proposed-rows-match-status",
      status: (
        intake.intakeStatus === "waiting-for-owner-input" &&
        proposedRows.length === 0
      ) || (
        intake.intakeStatus === "ready-to-record-extraction-instruction-rows" &&
        proposedRows.length === expectedRows
      ) || status === "already-recorded"
        ? "pass"
        : "fail",
      detail: `intakeStatus=${intake.intakeStatus}; proposedRows=${proposedRows.length}; expectedRows=${expectedRows}`
    },
    {
      id: "proposed-rows-safe-boundary",
      status: rowsKeepSafeBoundary(proposedRows) ? "pass" : "fail",
      detail: "proposed rows must not authorize cleanup, execution, deploy, merge, staging, destructive git, or physical lifecycle cleanup"
    },
    {
      id: "recording-status-coherent",
      status: [
        "dry-run-blocked-owner-input",
        "apply-blocked-owner-input",
        "dry-run-ready-requires-explicit-apply",
        "ready-to-apply-recording",
        "already-recorded",
        "not-ready-source-stale",
        "not-ready-invalid-intake",
        "not-ready-partial-existing-instructions"
      ].includes(status) ? "pass" : "fail",
      detail: `recordingStatus=${status}`
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply-recording" || status === "already-recorded" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    }
  ];
}

function buildRecordedExtractionInstructions({ dirtyMap, extractionInstructions, intake, proposedRows }) {
  const unitIds = intake.applyToUnitIds ?? [];
  const nextInstructions = [
    ...nonTargetInstructionRows(extractionInstructions, unitIds),
    ...proposedRows
  ];
  return {
    ...extractionInstructions,
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    instructionKind: "a22-root-parity-extraction-instructions",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      intakeGeneratedAt: intake.generatedAt,
      intakeGate: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intakeGate,
      ownerInput: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.ownerInput
    },
    topCandidate: intake.topCandidate ?? {},
    targetWorktree: intake.topCandidate?.path ?? "",
    instructions: nextInstructions,
    summary: {
      instructionRows: nextInstructions.length,
      recordsExtractionInstructionRows: proposedRows.length,
      modifiesCandidateRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      recordsExtractionInstruction: true,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresSeparateCandidateExtractionStep: true
    }
  };
}

export function buildA22RootParityExtractionInstructionRecordingState({ mode = "dry-run", mutationsPerformed = false } = {}) {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.dirtyMap);
  const intake = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intake);
  const intakeGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.intakeGate);
  const extractionInstructions = readExtractionInstructions({ dirtyMap, intake });
  const expectedRows = intake.summary?.expectedRows ?? (intake.applyToUnitIds ?? []).length;
  const proposedRows = enrichProposedRowsForRecording(intake.proposedExtractionInstructionRowsDoNotRecord ?? []);
  const existingRows = targetInstructionRows(extractionInstructions, intake.applyToUnitIds ?? []);
  const partialRows = existingRows.length > 0 && existingRows.length < expectedRows ? existingRows : [];
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, intake, intakeGate });
  const status = recordingStatus({
    mode,
    sourceFailures,
    intake,
    proposedRows,
    existingRows,
    partialRows,
    expectedRows
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    intake,
    proposedRows,
    existingRows,
    partialRows,
    expectedRows,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const recorderStatus = failedChecks.length === 0 ? status : "not-ready-check-failures";
  const applyPermitted = mode === "apply-recording" && recorderStatus === "ready-to-apply-recording";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    recorderKind: "a22-root-parity-extraction-instruction-recording",
    mode,
    recorderStatus,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      intakeGeneratedAt: intake.generatedAt,
      intakeGateFailureCount: (intakeGate.failures ?? []).length,
      ownerInputGeneratedAt: intake.sourceArtifacts?.ownerInputGeneratedAt ?? null,
      targetInstructionFileExists: exists(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions),
      targetInstructionFileGeneratedAt: extractionInstructions.generatedAt ?? null
    },
    sourceCurrentnessFailures: sourceFailures,
    targetInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions,
    intakeStatus: intake.intakeStatus,
    topCandidate: intake.topCandidate ?? {},
    applyToUnitIds: intake.applyToUnitIds ?? [],
    existingInstructionRows: existingRows,
    proposedExtractionInstructionRowsDoNotApply: proposedRows,
    recordingChecks: checks,
    summary: {
      mode,
      recorderStatus,
      expectedRows,
      existingInstructionRows: existingRows.length,
      proposedInstructionRows: proposedRows.length,
      recordingChecks: checks.length,
      passingRecordingChecks: checks.length - failedChecks.length,
      failedRecordingChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-recording",
      applyPermitted,
      mutationsPerformed,
      recordsExtractionInstructionRows: mutationsPerformed ? proposedRows.length : 0,
      modifiesCandidateRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      recordsExtractionInstruction: mutationsPerformed,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresExplicitApplyRecordingFlag: true,
      requiresSeparateCandidateExtractionStep: true
    },
    nextExtractionInstructionsPreview: applyPermitted
      ? buildRecordedExtractionInstructions({ dirtyMap, extractionInstructions, intake, proposedRows })
      : null
  };
}

export function stableA22RootParityExtractionInstructionRecordingProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    recorderKind: payload.recorderKind,
    mode: payload.mode,
    recorderStatus: payload.recorderStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetInputFile: payload.targetInputFile,
    intakeStatus: payload.intakeStatus,
    topCandidate: payload.topCandidate,
    applyToUnitIds: payload.applyToUnitIds,
    existingInstructionRows: payload.existingInstructionRows,
    proposedExtractionInstructionRowsDoNotApply: payload.proposedExtractionInstructionRowsDoNotApply,
    recordingChecks: payload.recordingChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const checks = payload.recordingChecks.map((row) =>
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  ).join("\n");
  const proposals = payload.proposedExtractionInstructionRowsDoNotApply.map((row, index) =>
    `| ${index + 1} | \`${cell(row.unitId)}\` | ${cell(row.selectedAction)} | \`${cell(row.rootSource?.path)}\` | \`${cell(row.candidateTargetPath)}\` |`
  ).join("\n") || "| 0 | none | none | none | none |";
  return `# A22 Root-Parity Extraction Instruction Recording ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Recorder status: \`${payload.recorderStatus}\`

Intake status: \`${payload.intakeStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only \`${payload.targetInputFile}\`, and only after A22 root-parity owner input validates all four extraction instruction rows. It never mutates the candidate, copies root files, runs type-check/build/regression, stages, commits, merges, deploys, or authorizes cleanup.

## Summary

- Expected rows: ${payload.summary.expectedRows}
- Existing instruction rows: ${payload.summary.existingInstructionRows}
- Proposed instruction rows not applied: ${payload.summary.proposedInstructionRows}
- Recording checks: ${payload.summary.passingRecordingChecks}/${payload.summary.recordingChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Records extraction-instruction rows: ${payload.summary.recordsExtractionInstructionRows}
- Modifies candidate rows: ${payload.summary.modifiesCandidateRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Proposed Extraction Instruction Rows Do Not Apply

| # | Unit ID | Selected action | Root source | Candidate target |
| ---: | --- | --- | --- | --- |
${proposals}

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records extraction instruction: ${payload.boundary.recordsExtractionInstruction}
- Modifies candidate: false
- Copies root files: false
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Physical lifecycle cleanup authorized: false
- Requires explicit apply-recording flag: true
- Requires separate candidate extraction step: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-recording") {
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestApplyJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestApplyMarkdown, md);
  } else {
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.datedDryRunJson, json);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown, md);
    write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-recording");
  const mode = apply ? "apply-recording" : "dry-run";
  let payload = buildA22RootParityExtractionInstructionRecordingState({ mode });
  if (apply) {
    if (payload.summary.applyPermitted !== true || !payload.nextExtractionInstructionsPreview) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        recorderStatus: payload.recorderStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        recordsExtractionInstructionRows: payload.summary.recordsExtractionInstructionRows,
        modifiesCandidateRows: payload.summary.modifiesCandidateRows,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    write(
      TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.extractionInstructions,
      `${JSON.stringify(payload.nextExtractionInstructionsPreview, null, 2)}\n`
    );
    payload = buildA22RootParityExtractionInstructionRecordingState({
      mode,
      mutationsPerformed: true
    });
  }
  persist(payload);
  console.log(JSON.stringify({
    mode,
    recorderStatus: payload.recorderStatus,
    intakeStatus: payload.intakeStatus,
    expectedRows: payload.summary.expectedRows,
    existingInstructionRows: payload.summary.existingInstructionRows,
    proposedInstructionRows: payload.summary.proposedInstructionRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    recordsExtractionInstructionRows: payload.summary.recordsExtractionInstructionRows,
    modifiesCandidateRows: payload.summary.modifiesCandidateRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
