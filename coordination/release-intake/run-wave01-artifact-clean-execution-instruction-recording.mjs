#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS,
  buildWave01ArtifactCleanBatchExecutionInstructionIntake,
  stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection
} from "./generate-wave01-artifact-clean-batch-execution-instruction-intake.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  intake: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake.json",
  intakeGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake-current-gate.json",
  instructionCapsule: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  latestDryRunJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-recording-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-recording-apply.md"
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

function sourceCurrentnessFailures({ dirtyMap, intake, intakeGate, executionInstructions, executionInstructionsGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (intake.dirtyMapStatusSignature !== expectedSignature) failures.push("intake dirty-map signature is stale");
  if (intake.expandedStatusEntries !== expectedEntries) failures.push("intake expanded dirty entry count is stale");
  if (executionInstructions.dirtyMapStatusSignature !== expectedSignature) failures.push("execution instructions dirty-map signature is stale");
  if (executionInstructions.expandedStatusEntries !== expectedEntries) failures.push("execution instructions expanded dirty entry count is stale");
  if (intakeGate.dirtyMapStatusSignature !== expectedSignature) failures.push("intake gate dirty-map signature is stale");
  if (intakeGate.expandedStatusEntries !== expectedEntries) failures.push("intake gate expanded dirty entry count is stale");
  if ((intakeGate.failures ?? []).length !== 0) failures.push("intake gate has failures");
  if (executionInstructionsGate.dirtyMapStatusSignature !== expectedSignature) failures.push("execution instructions gate dirty-map signature is stale");
  if (executionInstructionsGate.expandedStatusEntries !== expectedEntries) failures.push("execution instructions gate expanded dirty entry count is stale");
  if ((executionInstructionsGate.failures ?? []).length !== 0) failures.push("execution instructions gate has failures");
  const currentIntake = buildWave01ArtifactCleanBatchExecutionInstructionIntake({
    ownerInputAction: intake.ownerInputAction ?? "read-owner-input"
  });
  if (!sameJson(
    stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection(intake),
    stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection(currentIntake)
  )) {
    failures.push("intake payload is stale versus current owner input and sources");
  }
  return failures;
}

function targetInstructionRows(executionInstructions, approvalIds) {
  const approvals = new Set(approvalIds ?? []);
  return (executionInstructions.instructions ?? []).filter((row) => approvals.has(row.approvalId));
}

function nonTargetInstructionRows(executionInstructions, approvalIds) {
  const approvals = new Set(approvalIds ?? []);
  return (executionInstructions.instructions ?? []).filter((row) => !approvals.has(row.approvalId));
}

function nonTargetDraftRows(executionInstructions, approvalIds) {
  const approvals = new Set(approvalIds ?? []);
  return (executionInstructions.draftInstructionsDoNotExecute ?? []).filter((row) => !approvals.has(row.approvalId));
}

function enrichProposedRowsForRecording(rows) {
  return (rows ?? []).map((row) => ({
    ...row,
    evidenceReviewed: unique([
      ...(row.evidenceReviewed ?? []),
      WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.instructionCapsule,
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestJson
    ]),
    cleanupAuthorized: false,
    executableNow: false,
    destructiveGitAuthorized: false,
    deployAuthorized: false
  }));
}

function recordingStatus({ mode, sourceFailures, intake, proposedRows, existingRows, partialRows }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (intake.intakeStatus === "post-clean-verified") return "post-clean-verified";
  if (partialRows.length > 0) return "not-ready-partial-existing-instructions";
  if (existingRows.length >= 6) return "already-recorded";
  if (intake.intakeStatus === "waiting-for-owner-input") {
    return mode === "apply-recording" ? "apply-blocked-owner-input" : "dry-run-blocked-owner-input";
  }
  if (intake.intakeStatus === "ready-to-record-instruction-rows" && proposedRows.length === 6) {
    return mode === "apply-recording" ? "ready-to-apply-recording" : "dry-run-ready-requires-explicit-apply";
  }
  return "not-ready-invalid-intake";
}

function buildChecks({ mode, sourceFailures, intake, proposedRows, existingRows, partialRows, status }) {
  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply-recording" ? "pass" : "fail",
      detail: `mode=${mode}`
    },
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "six-approval-ids",
      status: (intake.approvalIds ?? []).length === 6 ? "pass" : "fail",
      detail: `approvalIds=${(intake.approvalIds ?? []).length}`
    },
    {
      id: "no-partial-existing-target-records",
      status: partialRows.length === 0 ? "pass" : "fail",
      detail: `existingTargetRows=${existingRows.length}`
    },
    {
      id: "proposed-rows-match-status",
      status: (intake.intakeStatus === "waiting-for-owner-input" && proposedRows.length === 0) ||
        (intake.intakeStatus === "ready-to-record-instruction-rows" && proposedRows.length === 6) ||
        (intake.intakeStatus === "post-clean-verified" && proposedRows.length === 0) ||
        status === "already-recorded"
        ? "pass"
        : "fail",
      detail: `intakeStatus=${intake.intakeStatus}; proposedRows=${proposedRows.length}`
    },
    {
      id: "proposed-rows-safe-boundary",
      status: proposedRows.every((row) =>
        row.cleanupAuthorized === false &&
        row.executableNow === false &&
        row.destructiveGitAuthorized !== true &&
        row.deployAuthorized !== true
      ) ? "pass" : "fail",
      detail: "proposed rows must not authorize cleanup, execution, destructive git, or deploy"
    },
    {
      id: "recording-status-coherent",
      status: [
        "dry-run-blocked-owner-input",
        "apply-blocked-owner-input",
        "dry-run-ready-requires-explicit-apply",
        "ready-to-apply-recording",
        "already-recorded",
        "post-clean-verified",
        "not-ready-source-stale",
        "not-ready-invalid-intake",
        "not-ready-partial-existing-instructions"
      ].includes(status) ? "pass" : "fail",
      detail: `recordingStatus=${status}`
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply-recording" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    }
  ];
}

function buildRecordedExecutionInstructions({ executionInstructions, intake, proposedRows }) {
  const approvalIds = intake.approvalIds ?? [];
  const nextInstructions = [
    ...nonTargetInstructionRows(executionInstructions, approvalIds),
    ...proposedRows
  ];
  const nextDrafts = nonTargetDraftRows(executionInstructions, approvalIds);
  return {
    ...executionInstructions,
    generatedAt: new Date().toISOString(),
    note: "A25 recorded Wave01 artifact-clean owner execution-instruction rows from validated owner input. This file still does not execute cleanup by itself.",
    summary: {
      ...(executionInstructions.summary ?? {}),
      instructionRowsInFile: nextInstructions.length,
      draftInstructionRows: nextDrafts.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    instructions: nextInstructions,
    draftInstructionsDoNotExecute: nextDrafts,
    cleanupAuthorized: false,
    executableNow: false,
    boundary: {
      ...(executionInstructions.boundary ?? {}),
      evidenceOnly: true,
      scaffoldOnly: false,
      recordsExecutionInstruction: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateGuardedExecutor: true
    }
  };
}

export function buildWave01ArtifactCleanExecutionInstructionRecordingState({ mode = "dry-run", mutationsPerformed = false } = {}) {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.dirtyMap);
  const intake = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intake);
  const intakeGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.intakeGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructionsGate);
  const approvalIds = intake.approvalIds ?? [];
  const proposedRows = enrichProposedRowsForRecording(intake.proposedInstructionRowsDoNotRecord ?? []);
  const existingRows = targetInstructionRows(executionInstructions, approvalIds);
  const partialRows = existingRows.length > 0 && existingRows.length < 6 ? existingRows : [];
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    intake,
    intakeGate,
    executionInstructions,
    executionInstructionsGate
  });
  const status = recordingStatus({
    mode,
    sourceFailures,
    intake,
    proposedRows,
    existingRows,
    partialRows
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    intake,
    proposedRows,
    existingRows,
    partialRows,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const applyPermitted = mode === "apply-recording" && status === "ready-to-apply-recording" && failedChecks.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    recorderKind: "wave01-artifact-clean-execution-instruction-recording",
    mode,
    recorderStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      intakeGeneratedAt: intake.generatedAt,
      intakeGateFailureCount: (intakeGate.failures ?? []).length,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt,
      executionInstructionsGateFailureCount: (executionInstructionsGate.failures ?? []).length
    },
    sourceCurrentnessFailures: sourceFailures,
    targetInputFile: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructions,
    intakeStatus: intake.intakeStatus,
    approvalIds,
    existingInstructionRows: existingRows,
    proposedInstructionRowsDoNotApply: proposedRows,
    recordingChecks: checks,
    summary: {
      mode,
      recorderStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      approvalRows: approvalIds.length,
      existingInstructionRows: existingRows.length,
      proposedInstructionRows: proposedRows.length,
      recordingChecks: checks.length,
      passingRecordingChecks: checks.length - failedChecks.length,
      failedRecordingChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-recording",
      applyPermitted,
      mutationsPerformed,
      recordsExecutionInstructionRows: mutationsPerformed ? proposedRows.length : 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      recordsExecutionInstruction: mutationsPerformed,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresExplicitApplyRecordingFlag: true,
      requiresSeparateGuardedExecutor: status !== "post-clean-verified"
    },
    nextExecutionInstructionsPreview: applyPermitted
      ? buildRecordedExecutionInstructions({ executionInstructions, intake, proposedRows })
      : null
  };
}

export function stableWave01ArtifactCleanExecutionInstructionRecordingProjection(payload) {
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
    approvalIds: payload.approvalIds,
    existingInstructionRows: payload.existingInstructionRows,
    proposedInstructionRowsDoNotApply: payload.proposedInstructionRowsDoNotApply,
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
  const proposals = payload.proposedInstructionRowsDoNotApply.map((row, index) =>
    `| ${index + 1} | \`${cell(row.approvalId)}\` | \`${cell(row.command)}\` | \`${cell(row.cwd)}\` |`
  ).join("\n") || "| 0 | none | none | none |";
  return `# A25 Wave01 Artifact-Clean Execution Instruction Recording ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Recorder status: \`${payload.recorderStatus}\`

Intake status: \`${payload.intakeStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only \`${payload.targetInputFile}\`, and only after owner input is complete and the intake gate is current. It never executes cleanup or deploy.

## Summary

- Approval rows: ${payload.summary.approvalRows}
- Existing instruction rows: ${payload.summary.existingInstructionRows}
- Proposed instruction rows not applied: ${payload.summary.proposedInstructionRows}
- Recording checks: ${payload.summary.passingRecordingChecks}/${payload.summary.recordingChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Records execution-instruction rows: ${payload.summary.recordsExecutionInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Proposed Instruction Rows Do Not Apply

| # | Approval ID | Command | CWD |
| ---: | --- | --- | --- |
${proposals}

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records execution instruction: ${payload.boundary.recordsExecutionInstruction}
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply-recording flag: true
- Requires separate guarded executor: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-recording") {
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestApplyJson, json);
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestApplyMarkdown, md);
  } else {
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson, json);
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.datedDryRunJson, json);
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.latestDryRunMarkdown, md);
    write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-recording");
  const mode = apply ? "apply-recording" : "dry-run";
  let payload = buildWave01ArtifactCleanExecutionInstructionRecordingState({ mode });
  if (apply) {
    if (payload.summary.applyPermitted !== true || !payload.nextExecutionInstructionsPreview) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        recorderStatus: payload.recorderStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        recordsExecutionInstructionRows: payload.summary.recordsExecutionInstructionRows,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    write(
      WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_RECORDING_PATHS.executionInstructions,
      `${JSON.stringify(payload.nextExecutionInstructionsPreview, null, 2)}\n`
    );
    payload = buildWave01ArtifactCleanExecutionInstructionRecordingState({
      mode,
      mutationsPerformed: true
    });
  }
  persist(payload);
  console.log(JSON.stringify({
    mode,
    recorderStatus: payload.recorderStatus,
    intakeStatus: payload.intakeStatus,
    approvalRows: payload.summary.approvalRows,
    existingInstructionRows: payload.summary.existingInstructionRows,
    proposedInstructionRows: payload.summary.proposedInstructionRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    recordsExecutionInstructionRows: payload.summary.recordsExecutionInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
