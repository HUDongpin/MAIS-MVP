#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const expectedCwd = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";

export const WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  batchRequest: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request.json",
  batchRequestGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-request-current-gate.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  authorizedCommandManifest: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  ownerInput: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-owner-input.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-batch-execution-instruction-intake.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-batch-execution-instruction-intake.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-batch-execution-instruction-intake.md`
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function unique(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function ownerInputScaffold(batchRequest) {
  return {
    generatedAt: new Date().toISOString(),
    inputKind: "wave01-artifact-clean-batch-execution-instruction-owner-input",
    instructions: [
      "Paste the exact batchCopyableOwnerExecutionText into ownerExecutionText only when the owner explicitly instructs A25 to record the six execution-instruction rows.",
      "This file is input only. It does not execute cleanup and does not record execution instructions by itself."
    ],
    sourceBatchRequestGeneratedAt: batchRequest.generatedAt,
    sourceBatchRequest: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest,
    applyToApprovalIds: batchRequest.approvalIds ?? [],
    ownerExecutionText: "",
    approvedBy: "",
    approvedAt: "",
    notes: "",
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    boundary: {
      ownerInputOnly: true,
      recordsExecutionInstruction: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function ensureWave01ArtifactCleanBatchExecutionInstructionOwnerInputScaffold() {
  const batchRequest = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest);
  if (exists(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput)) {
    const existingOwnerInput = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput);
    if (blankOwnerInput(existingOwnerInput) && existingOwnerInput.sourceBatchRequestGeneratedAt !== batchRequest.generatedAt) {
      const refreshedOwnerInput = ownerInputScaffold(batchRequest);
      write(
        WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
        `${JSON.stringify(refreshedOwnerInput, null, 2)}\n`
      );
      return {
        action: "refresh-blank-owner-input-scaffold",
        ownerInput: refreshedOwnerInput
      };
    }
    return {
      action: "preserve-existing-owner-input",
      ownerInput: existingOwnerInput
    };
  }
  const ownerInput = ownerInputScaffold(batchRequest);
  write(
    WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    `${JSON.stringify(ownerInput, null, 2)}\n`
  );
  return {
    action: "create-owner-input-scaffold",
    ownerInput
  };
}

function blankOwnerInput(ownerInput) {
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes);
}

function matchingDraftRows(executionInstructions, approvalIds) {
  const approvals = new Set(approvalIds ?? []);
  return (executionInstructions.draftInstructionsDoNotExecute ?? [])
    .filter((row) => approvals.has(row.approvalId));
}

function matchingInstructionRows(executionInstructions, approvalIds) {
  const approvals = new Set(approvalIds ?? []);
  return (executionInstructions.instructions ?? [])
    .filter((row) => approvals.has(row.approvalId));
}

function buildOwnerInputChecks({ dirtyMap, batchRequest, batchRequestGate, executionInstructions, executionInstructionsGate, ownerInput, draftRows, existingRows }) {
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const text = ownerInput.ownerExecutionText ?? "";
  const ownerInputBlank = blankOwnerInput(ownerInput);
  const approvalIds = batchRequest.approvalIds ?? [];
  const commands = batchRequest.exactCommandSequence ?? [];
  const postCleanVerified = batchRequest.batchStatus === "post-clean-verified";
  const sourceChecks = [
    {
      id: "source-current",
      status: batchRequest.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        batchRequest.expandedStatusEntries === expectedEntries &&
        executionInstructions.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        executionInstructions.expandedStatusEntries === expectedEntries
        ? "pass"
        : "fail",
      detail: `expanded=${expectedEntries ?? "unknown"}`
    },
    {
      id: "source-gates-passing",
      status: (batchRequestGate.failures ?? []).length === 0 && (executionInstructionsGate.failures ?? []).length === 0 ? "pass" : "fail",
      detail: `batchGateFailures=${(batchRequestGate.failures ?? []).length}; instructionGateFailures=${(executionInstructionsGate.failures ?? []).length}`
    },
    {
      id: "batch-request-ready",
      status: (batchRequest.batchStatus === "waiting-for-owner-batch-execution-instruction" &&
        (batchRequest.summary?.requestRows ?? 0) === 6 &&
        (batchRequest.summary?.commandRows ?? 0) === 6) ||
        (postCleanVerified &&
          (batchRequest.summary?.requestRows ?? 0) === 6 &&
          (batchRequest.summary?.postCleanTargetRows ?? 0) === 6)
        ? "pass"
        : "fail",
      detail: `batchStatus=${batchRequest.batchStatus ?? "unknown"}`
    },
    {
      id: "six-draft-rows-available",
      status: (
        draftRows.length === 6 && draftRows.every((row) => row.readyForSeparateInstruction === true)
      ) || existingRows.length >= 6 || postCleanVerified ? "pass" : "fail",
      detail: `draftRows=${draftRows.length}; existingRows=${existingRows.length}`
    },
    {
      id: "owner-input-targets-batch",
      status: sameStringArray(ownerInput.applyToApprovalIds, approvalIds) ? "pass" : "fail",
      detail: `inputApprovalIds=${(ownerInput.applyToApprovalIds ?? []).length}; batchApprovalIds=${approvalIds.length}`
    },
    {
      id: "blank-owner-input-scaffold-current",
      status: !ownerInputBlank || ownerInput.sourceBatchRequestGeneratedAt === batchRequest.generatedAt ? "pass" : "fail",
      detail: `ownerInputBlank=${ownerInputBlank}; sourceBatchRequestGeneratedAt=${ownerInput.sourceBatchRequestGeneratedAt ?? "missing"}`
    },
    {
      id: "owner-input-no-execution-boundary",
      status: ownerInput.cleanupAuthorized === false &&
        ownerInput.executableNow === false &&
        ownerInput.deployAuthorized === false &&
        ownerInput.boundary?.recordsExecutionInstruction === false &&
        ownerInput.boundary?.cleanupAuthorized === false &&
        ownerInput.boundary?.executableNow === false &&
        ownerInput.boundary?.deployAuthorized === false
        ? "pass"
        : "fail",
      detail: "owner input preserves no-cleanup, non-executable, and no-deploy boundary"
    }
  ];

  if (ownerInputBlank) {
    if (postCleanVerified) {
      return [
        ...sourceChecks,
        {
          id: "post-clean-owner-input-not-required",
          status: "pass",
          detail: "post-clean verification no longer requires owner input for new instruction rows"
        }
      ];
    }
    return [
      ...sourceChecks,
      {
        id: "owner-execution-text-provided",
        status: "wait",
        detail: "waiting for ownerExecutionText"
      },
      {
        id: "owner-metadata-provided",
        status: "wait",
        detail: "waiting for approvedBy, approvedAt, and notes"
      }
    ];
  }

  return [
    ...sourceChecks,
    {
      id: "owner-execution-text-complete",
      status: nonEmptyString(text) &&
        approvalIds.every((approvalId) => text.includes(`approvalId=${approvalId}`)) &&
        commands.every((command) => text.includes(`command=${command}`)) &&
        text.includes(`cwd=${expectedCwd}`) &&
        text.includes("No cleanup") &&
        text.includes("broad staging") &&
        text.includes("deploy")
        ? "pass"
        : "fail",
      detail: "execution text must include every approvalId, exact command, cwd, no-cleanup, no-broad-staging, and no-deploy terms"
    },
    {
      id: "owner-metadata-valid",
      status: nonEmptyString(ownerInput.approvedBy) &&
        validIsoDate(ownerInput.approvedAt) &&
        nonEmptyString(ownerInput.notes)
        ? "pass"
        : "fail",
      detail: "approvedBy, ISO approvedAt, and notes are required"
    }
  ];
}

function proposedInstructionRows({ ownerInput, batchRequest, draftRows, checks }) {
  const failedChecks = checks.filter((row) => row.status === "fail");
  const waitingChecks = checks.filter((row) => row.status === "wait");
  if (failedChecks.length > 0 || waitingChecks.length > 0) return [];
  return draftRows.map((draftRow) => ({
    ...draftRow,
    instructionId: `${draftRow.approvalId}-execution-instruction`,
    evidenceReviewed: unique([
      ...(draftRow.evidenceReviewed ?? []),
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.authorizedCommandManifest,
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest,
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequestGate,
      WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput
    ]),
    approvedBy: ownerInput.approvedBy,
    approvedAt: ownerInput.approvedAt,
    notes: ownerInput.notes,
    executionText: ownerInput.ownerExecutionText,
    cleanupAuthorized: false,
    executableNow: false,
    batchExecutionInstructionRequestGeneratedAt: batchRequest.generatedAt
  }));
}

function intakeStatus({ checks, ownerInput, existingRows, proposedRows }) {
  const failedChecks = checks.filter((row) => row.status === "fail");
  if (checks.some((row) => row.id === "post-clean-owner-input-not-required")) return "post-clean-verified";
  if (existingRows.length >= 6) return "already-recorded";
  if (blankOwnerInput(ownerInput)) return "waiting-for-owner-input";
  if (failedChecks.length > 0) return "not-ready-invalid-owner-input";
  if (proposedRows.length === 6) return "ready-to-record-instruction-rows";
  return "not-ready-check-failures";
}

export function buildWave01ArtifactCleanBatchExecutionInstructionIntake({ ownerInputAction = "read-owner-input" } = {}) {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.dirtyMap);
  const batchRequest = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequest);
  const batchRequestGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.batchRequestGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructions);
  const executionInstructionsGate = readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.executionInstructionsGate);
  const ownerInput = exists(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput)
    ? readJson(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput)
    : ownerInputScaffold(batchRequest);
  const draftRows = matchingDraftRows(executionInstructions, batchRequest.approvalIds ?? []);
  const existingRows = matchingInstructionRows(executionInstructions, batchRequest.approvalIds ?? []);
  const checks = buildOwnerInputChecks({
    dirtyMap,
    batchRequest,
    batchRequestGate,
    executionInstructions,
    executionInstructionsGate,
    ownerInput,
    draftRows,
    existingRows
  });
  const proposedRows = proposedInstructionRows({ ownerInput, batchRequest, draftRows, checks });
  const failedChecks = checks.filter((row) => row.status === "fail");
  const waitingChecks = checks.filter((row) => row.status === "wait");
  const status = batchRequest.batchStatus === "post-clean-verified"
    ? "post-clean-verified"
    : intakeStatus({
    checks,
    ownerInput,
    existingRows,
    proposedRows
  });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    intakeKind: "wave01-artifact-clean-batch-execution-instruction-intake",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      batchRequestGeneratedAt: batchRequest.generatedAt,
      batchRequestGateFailureCount: (batchRequestGate.failures ?? []).length,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt,
      executionInstructionsGateFailureCount: (executionInstructionsGate.failures ?? []).length,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null
    },
    ownerInputFile: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    ownerInputAction,
    intakeStatus: status,
    batchStatus: batchRequest.batchStatus,
    approvalIds: batchRequest.approvalIds ?? [],
    exactCommandSequence: batchRequest.exactCommandSequence ?? [],
    ownerInputBlank: blankOwnerInput(ownerInput),
    ownerInputProjection: {
      applyToApprovalIds: ownerInput.applyToApprovalIds ?? [],
      ownerExecutionTextProvided: nonEmptyString(ownerInput.ownerExecutionText),
      approvedByProvided: nonEmptyString(ownerInput.approvedBy),
      approvedAt: ownerInput.approvedAt ?? "",
      approvedAtValid: validIsoDate(ownerInput.approvedAt),
      notesProvided: nonEmptyString(ownerInput.notes),
      cleanupAuthorized: ownerInput.cleanupAuthorized === true,
      executableNow: ownerInput.executableNow === true,
      deployAuthorized: ownerInput.deployAuthorized === true
    },
    ownerInputChecks: checks,
    proposedInstructionRowsDoNotRecord: proposedRows,
    summary: {
      expectedRows: (batchRequest.approvalIds ?? []).length,
      draftRows: draftRows.length,
      existingInstructionRows: existingRows.length,
      proposedInstructionRows: proposedRows.length,
      ownerInputChecks: checks.length,
      passingOwnerInputChecks: checks.filter((row) => row.status === "pass").length,
      waitingOwnerInputChecks: waitingChecks.length,
      failedOwnerInputChecks: failedChecks.length,
      recordsExecutionInstructionRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      intakeOnly: true,
      recordsOwnerInput: ownerInputAction === "create-owner-input-scaffold" ||
        ownerInputAction === "refresh-blank-owner-input-scaffold",
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateRecordingStep: status !== "post-clean-verified",
      requiresSeparateGuardedExecutor: status !== "post-clean-verified"
    }
  };
}

export function stableWave01ArtifactCleanBatchExecutionInstructionIntakeProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    intakeKind: payload.intakeKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    ownerInputFile: payload.ownerInputFile,
    ownerInputAction: payload.ownerInputAction,
    intakeStatus: payload.intakeStatus,
    batchStatus: payload.batchStatus,
    approvalIds: payload.approvalIds,
    exactCommandSequence: payload.exactCommandSequence,
    ownerInputBlank: payload.ownerInputBlank,
    ownerInputProjection: payload.ownerInputProjection,
    ownerInputChecks: payload.ownerInputChecks,
    proposedInstructionRowsDoNotRecord: payload.proposedInstructionRowsDoNotRecord,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const checks = payload.ownerInputChecks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");
  const proposals = payload.proposedInstructionRowsDoNotRecord.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | \`${cell(row.command)}\` | \`${cell(row.cwd)}\` |`
  )).join("\n") || "| 0 | none | none | none |";

  return `# A25 Wave01 Artifact-Clean Batch Execution Instruction Intake

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This intake is evidence-only. It may create or preserve the owner-input scaffold, but it does not record execution instructions, does not run cleanup, and does not authorize deploy.

## Summary

- Intake status: ${payload.intakeStatus}
- Batch status: ${payload.batchStatus}
- Owner input file: \`${payload.ownerInputFile}\`
- Owner input action: ${payload.ownerInputAction}
- Expected rows: ${payload.summary.expectedRows}
- Draft rows: ${payload.summary.draftRows}
- Existing instruction rows: ${payload.summary.existingInstructionRows}
- Proposed instruction rows not recorded: ${payload.summary.proposedInstructionRows}
- Owner input checks: ${payload.summary.passingOwnerInputChecks}/${payload.summary.ownerInputChecks} pass, ${payload.summary.waitingOwnerInputChecks} waiting, ${payload.summary.failedOwnerInputChecks} failed
- Records execution-instruction rows: ${payload.summary.recordsExecutionInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Proposed Instruction Rows Do Not Record

| # | Approval ID | Command | CWD |
| ---: | --- | --- | --- |
${proposals}

## Owner Input Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Requires separate recording step: true.
- Requires separate guarded executor: true.
`;
}

function main() {
  const { action } = ensureWave01ArtifactCleanBatchExecutionInstructionOwnerInputScaffold();
  const payload = buildWave01ArtifactCleanBatchExecutionInstructionIntake({ ownerInputAction: action });
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown,
    ownerInputFile: WAVE01_ARTIFACT_CLEAN_BATCH_EXECUTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    ownerInputAction: payload.ownerInputAction,
    intakeStatus: payload.intakeStatus,
    expectedRows: payload.summary.expectedRows,
    draftRows: payload.summary.draftRows,
    proposedInstructionRows: payload.summary.proposedInstructionRows,
    recordsExecutionInstructionRows: payload.summary.recordsExecutionInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
