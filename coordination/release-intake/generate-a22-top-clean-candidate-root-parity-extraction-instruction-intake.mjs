#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  instructionRequest: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson,
  instructionRequestGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-request-current-gate.json",
  ownerInput: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-intake.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-intake.md`
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

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function allowedActionsFor(row) {
  const actions = (row.proposedActionOptions ?? [])
    .map((option) => String(option.optionId ?? "").split(":").pop())
    .filter(Boolean);
  return Array.from(new Set(actions));
}

function selectedActionRows(request) {
  return (request.instructionRows ?? []).map((row) => ({
    unitId: row.unitId,
    primaryOwnerIds: row.primaryOwnerIds ?? [],
    coordinationOwnerIds: row.coordinationOwnerIds ?? [],
    allowedActions: allowedActionsFor(row),
    selectedAction: "",
    rootSource: row.rootSource?.path ?? "",
    rootSourceSha256: row.rootSource?.sha256 ?? "",
    candidateTarget: row.candidateTargetPath ?? ""
  }));
}

function ownerInputScaffold(request) {
  return {
    generatedAt: new Date().toISOString(),
    inputKind: "a22-root-parity-extraction-instruction-owner-input",
    instructions: [
      "Fill selectedActions with exactly one allowed selectedAction per unit only after the owner explicitly authorizes the A22 root-parity extraction instruction rows.",
      "Paste the owner authorization wording into ownerExecutionText. This file is input only and does not mutate the A22 candidate.",
      "Keep all boundary booleans false unless the owner gives a separate explicit cleanup/deploy/merge/destructive-git authorization, which this intake does not consume."
    ],
    sourceInstructionRequestGeneratedAt: request.generatedAt,
    sourceInstructionRequest: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest,
    topCandidate: request.topCandidate,
    targetWorktree: request.topCandidate?.path ?? "",
    applyToUnitIds: (request.instructionRows ?? []).map((row) => row.unitId),
    selectedActions: selectedActionRows(request),
    ownerExecutionText: "",
    approvedBy: "",
    approvedAt: "",
    notes: "",
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    boundary: {
      ownerInputOnly: true,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

function blankOwnerInput(ownerInput) {
  const selectedActions = ownerInput.selectedActions ?? [];
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes) &&
    selectedActions.every((row) => !nonEmptyString(row.selectedAction));
}

export function ensureA22RootParityExtractionInstructionOwnerInputScaffold() {
  const request = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest);
  const ownerInputPath = TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput;
  if (exists(ownerInputPath)) {
    const existingOwnerInput = readJson(ownerInputPath);
    if (blankOwnerInput(existingOwnerInput) && existingOwnerInput.sourceInstructionRequestGeneratedAt !== request.generatedAt) {
      const refreshedOwnerInput = ownerInputScaffold(request);
      write(ownerInputPath, `${JSON.stringify(refreshedOwnerInput, null, 2)}\n`);
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

  const ownerInput = ownerInputScaffold(request);
  write(ownerInputPath, `${JSON.stringify(ownerInput, null, 2)}\n`);
  return {
    action: "create-owner-input-scaffold",
    ownerInput
  };
}

function ownerInputSelectionMap(ownerInput) {
  return new Map((ownerInput.selectedActions ?? []).map((row) => [row.unitId, row]));
}

function selectedActionFor(ownerInput, unitId) {
  return ownerInputSelectionMap(ownerInput).get(unitId)?.selectedAction ?? "";
}

function matchingDraftRows(request) {
  return (request.instructionRows ?? []).filter((row) => row.instructionStatus === "waiting-for-owner-execution-instruction");
}

function buildOwnerInputChecks({ dirtyMap, request, requestGate, ownerInput, draftRows }) {
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const ownerInputBlank = blankOwnerInput(ownerInput);
  const text = ownerInput.ownerExecutionText ?? "";
  const requestUnitIds = (request.instructionRows ?? []).map((row) => row.unitId);
  const selectedRows = ownerInput.selectedActions ?? [];
  const selectionByUnit = ownerInputSelectionMap(ownerInput);
  const selectedActionsValid = request.instructionRows?.every((row) => {
    const selected = selectionByUnit.get(row.unitId)?.selectedAction ?? "";
    return nonEmptyString(selected) && allowedActionsFor(row).includes(selected);
  }) === true;
  const textCoversRows = request.instructionRows?.every((row) => {
    const selected = selectedActionFor(ownerInput, row.unitId);
    return text.includes(`unitId=${row.unitId}`) &&
      text.includes(`selectedAction=${selected}`) &&
      text.includes(`targetWorktree=${request.topCandidate?.path ?? ""}`) &&
      text.includes(`rootSource=${row.rootSource?.path ?? ""}`) &&
      text.includes(`candidateTarget=${row.candidateTargetPath ?? ""}`);
  }) === true;

  const sourceChecks = [
    {
      id: "source-current",
      status: request.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        request.expandedStatusEntries === expectedEntries
        ? "pass"
        : "fail",
      detail: `expanded=${expectedEntries ?? "unknown"}`
    },
    {
      id: "instruction-request-gate-passing",
      status: (requestGate.failures ?? []).length === 0 ? "pass" : "fail",
      detail: `requestGateFailures=${(requestGate.failures ?? []).length}`
    },
    {
      id: "instruction-request-ready",
      status: request.requestStatus === "waiting-for-owner-execution-instruction" &&
        (request.summary?.instructionRows ?? 0) === 4 &&
        (request.summary?.readyForOwnerInstructionRows ?? 0) === 4
        ? "pass"
        : "fail",
      detail: `requestStatus=${request.requestStatus ?? "unknown"}; instructionRows=${request.summary?.instructionRows ?? 0}`
    },
    {
      id: "four-draft-rows-available",
      status: draftRows.length === 4 ? "pass" : "fail",
      detail: `draftRows=${draftRows.length}`
    },
    {
      id: "owner-input-targets-request",
      status: sameStringArray(ownerInput.applyToUnitIds, requestUnitIds) ? "pass" : "fail",
      detail: `inputUnitIds=${(ownerInput.applyToUnitIds ?? []).length}; requestUnitIds=${requestUnitIds.length}`
    },
    {
      id: "owner-input-selected-action-shape-current",
      status: sameStringArray(selectedRows.map((row) => row.unitId), requestUnitIds) &&
        selectedRows.every((row) => sameStringArray(row.allowedActions, allowedActionsFor((request.instructionRows ?? []).find((requestRow) => requestRow.unitId === row.unitId) ?? {})))
        ? "pass"
        : "fail",
      detail: `selectedActionRows=${selectedRows.length}`
    },
    {
      id: "owner-input-no-execution-boundary",
      status: ownerInput.cleanupAuthorized === false &&
        ownerInput.executableNow === false &&
        ownerInput.deployAuthorized === false &&
        ownerInput.mergeAuthorized === false &&
        ownerInput.stageAuthorized === false &&
        ownerInput.destructiveGitAuthorized === false &&
        ownerInput.physicalLifecycleCleanupAuthorized === false &&
        ownerInput.boundary?.recordsExtractionInstruction === false &&
        ownerInput.boundary?.modifiesCandidate === false &&
        ownerInput.boundary?.copiesRootFiles === false
        ? "pass"
        : "fail",
      detail: "owner input preserves no-cleanup, non-executable, no-deploy, no-merge, and no-candidate-mutation boundary"
    }
  ];

  if (ownerInputBlank) {
    return [
      ...sourceChecks,
      {
        id: "owner-execution-text-provided",
        status: "wait",
        detail: "waiting for ownerExecutionText"
      },
      {
        id: "owner-selected-actions-provided",
        status: "wait",
        detail: "waiting for selectedAction per unit"
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
      id: "owner-selected-actions-valid",
      status: selectedActionsValid ? "pass" : "fail",
      detail: "each unit must select exactly one allowed action"
    },
    {
      id: "owner-execution-text-complete",
      status: nonEmptyString(text) &&
        textCoversRows &&
        text.includes("No cleanup") &&
        text.includes("No deploy") &&
        text.includes("No merge") &&
        text.includes("No broad staging") &&
        text.includes("No destructive git") &&
        text.includes("No physical lifecycle cleanup")
        ? "pass"
        : "fail",
      detail: "execution text must include every unitId, selectedAction, targetWorktree, root source, candidate target, and non-cleanup/non-deploy/non-merge terms"
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

function proposedInstructionRows({ ownerInput, request, draftRows, checks }) {
  const failedChecks = checks.filter((row) => row.status === "fail");
  const waitingChecks = checks.filter((row) => row.status === "wait");
  if (failedChecks.length > 0 || waitingChecks.length > 0) return [];

  return draftRows.map((row) => {
    const selectedAction = selectedActionFor(ownerInput, row.unitId);
    return {
      instructionId: `${row.instructionId}-owner-input-ready`,
      unitId: row.unitId,
      approvalKind: row.approvalKind,
      instructionStatus: "ready-to-record-extraction-instruction",
      selectedAction,
      topCandidate: row.topCandidate,
      primaryOwnerIds: row.primaryOwnerIds ?? [],
      coordinationOwnerIds: row.coordinationOwnerIds ?? [],
      actionMode: row.actionMode,
      rootSource: row.rootSource,
      candidateTargetPath: row.candidateTargetPath,
      candidateTargetExistsBeforeInstruction: row.candidateTargetExists,
      candidateTargetMatchesRootBeforeInstruction: row.candidateTargetMatchesRoot === true,
      coveredBlockerRows: row.coveredBlockerRows,
      evidenceReviewed: [
        TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest,
        TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequestGate,
        TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput
      ],
      sourceInstructionRequestGeneratedAt: request.generatedAt,
      approvedBy: ownerInput.approvedBy,
      approvedAt: ownerInput.approvedAt,
      notes: ownerInput.notes,
      executionText: ownerInput.ownerExecutionText,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    };
  });
}

function intakeStatus({ ownerInput, checks, proposedRows }) {
  const failedChecks = checks.filter((row) => row.status === "fail");
  if (blankOwnerInput(ownerInput)) return "waiting-for-owner-input";
  if (failedChecks.length > 0) return "not-ready-invalid-owner-input";
  if (proposedRows.length === 4) return "ready-to-record-extraction-instruction-rows";
  return "not-ready-check-failures";
}

export function buildA22RootParityExtractionInstructionIntake({ ownerInputAction = "read-owner-input" } = {}) {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.dirtyMap);
  const request = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequest);
  const requestGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.instructionRequestGate);
  const ownerInput = exists(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput)
    ? readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput)
    : ownerInputScaffold(request);
  const draftRows = matchingDraftRows(request);
  const checks = buildOwnerInputChecks({ dirtyMap, request, requestGate, ownerInput, draftRows });
  const proposedRows = proposedInstructionRows({ ownerInput, request, draftRows, checks });
  const failedChecks = checks.filter((row) => row.status === "fail");
  const waitingChecks = checks.filter((row) => row.status === "wait");
  const status = intakeStatus({ ownerInput, checks, proposedRows });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    intakeKind: "a22-root-parity-extraction-instruction-intake",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      instructionRequestGeneratedAt: request.generatedAt,
      instructionRequestGateFailureCount: (requestGate.failures ?? []).length,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null
    },
    ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
    ownerInputAction,
    intakeStatus: status,
    requestStatus: request.requestStatus,
    topCandidate: request.topCandidate,
    applyToUnitIds: request.instructionRows?.map((row) => row.unitId) ?? [],
    ownerInputBlank: blankOwnerInput(ownerInput),
    ownerInputProjection: {
      applyToUnitIds: ownerInput.applyToUnitIds ?? [],
      selectedActions: (ownerInput.selectedActions ?? []).map((row) => ({
        unitId: row.unitId,
        allowedActions: row.allowedActions ?? [],
        selectedActionProvided: nonEmptyString(row.selectedAction),
        selectedAction: row.selectedAction ?? ""
      })),
      ownerExecutionTextProvided: nonEmptyString(ownerInput.ownerExecutionText),
      approvedByProvided: nonEmptyString(ownerInput.approvedBy),
      approvedAt: ownerInput.approvedAt ?? "",
      approvedAtValid: validIsoDate(ownerInput.approvedAt),
      notesProvided: nonEmptyString(ownerInput.notes),
      cleanupAuthorized: ownerInput.cleanupAuthorized === true,
      executableNow: ownerInput.executableNow === true,
      deployAuthorized: ownerInput.deployAuthorized === true,
      mergeAuthorized: ownerInput.mergeAuthorized === true,
      destructiveGitAuthorized: ownerInput.destructiveGitAuthorized === true,
      physicalLifecycleCleanupAuthorized: ownerInput.physicalLifecycleCleanupAuthorized === true
    },
    ownerInputChecks: checks,
    proposedExtractionInstructionRowsDoNotRecord: proposedRows,
    summary: {
      expectedRows: request.instructionRows?.length ?? 0,
      draftRows: draftRows.length,
      proposedInstructionRows: proposedRows.length,
      ownerInputChecks: checks.length,
      passingOwnerInputChecks: checks.filter((row) => row.status === "pass").length,
      waitingOwnerInputChecks: waitingChecks.length,
      failedOwnerInputChecks: failedChecks.length,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      intakeOnly: true,
      recordsOwnerInput: ownerInputAction === "create-owner-input-scaffold" ||
        ownerInputAction === "refresh-blank-owner-input-scaffold",
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
      requiresSeparateRecordingStep: true,
      requiresSeparateCandidateExtractionStep: true
    }
  };
}

export function stableA22RootParityExtractionInstructionIntakeProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    intakeKind: payload.intakeKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    ownerInputFile: payload.ownerInputFile,
    ownerInputAction: payload.ownerInputAction,
    intakeStatus: payload.intakeStatus,
    requestStatus: payload.requestStatus,
    topCandidate: payload.topCandidate,
    applyToUnitIds: payload.applyToUnitIds,
    ownerInputBlank: payload.ownerInputBlank,
    ownerInputProjection: payload.ownerInputProjection,
    ownerInputChecks: payload.ownerInputChecks,
    proposedExtractionInstructionRowsDoNotRecord: payload.proposedExtractionInstructionRowsDoNotRecord,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const actionRows = payload.ownerInputProjection.selectedActions.map((row) => (
    `| \`${cell(row.unitId)}\` | ${cell((row.allowedActions ?? []).join(", "))} | ${cell(row.selectedAction || "not provided")} | ${row.selectedActionProvided ? "yes" : "no"} |`
  )).join("\n") || "| none | none | none | no |";
  const proposalRows = payload.proposedExtractionInstructionRowsDoNotRecord.map((row, index) => (
    `| ${index + 1} | \`${cell(row.unitId)}\` | ${cell(row.selectedAction)} | \`${cell(row.candidateTargetPath)}\` |`
  )).join("\n") || "| 0 | none | none | none |";
  const checks = payload.ownerInputChecks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");

  return `# A22 Top Clean Candidate Root-Parity Extraction Instruction Intake

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Top candidate: \`${payload.topCandidate?.branch ?? "none"}\`

This intake is evidence-only. It may create or preserve the owner-input scaffold for A22 root-parity extraction instructions, but it does not record extraction instructions, does not mutate the candidate, does not copy root files, does not run type-check/build/regression, and does not authorize cleanup, merge, deploy, broad staging, destructive Git, or physical lifecycle cleanup.

## Summary

- Intake status: ${payload.intakeStatus}
- Request status: ${payload.requestStatus}
- Owner input file: \`${payload.ownerInputFile}\`
- Owner input action: ${payload.ownerInputAction}
- Expected rows: ${payload.summary.expectedRows}
- Draft rows: ${payload.summary.draftRows}
- Proposed instruction rows not recorded: ${payload.summary.proposedInstructionRows}
- Owner input checks: ${payload.summary.passingOwnerInputChecks}/${payload.summary.ownerInputChecks} pass, ${payload.summary.waitingOwnerInputChecks} waiting, ${payload.summary.failedOwnerInputChecks} failed
- Records extraction-instruction rows: ${payload.summary.recordsExtractionInstructionRows}
- Modifies candidate rows: ${payload.summary.modifiesCandidateRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Selected Actions In Owner Input

| Unit ID | Allowed actions | Selected action | Provided |
| --- | --- | --- | --- |
${actionRows}

## Proposed Extraction Instruction Rows Do Not Record

| # | Unit ID | Selected action | Candidate target |
| ---: | --- | --- | --- |
${proposalRows}

## Owner Input Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records extraction instruction: false.
- Modifies candidate: false.
- Copies root files: false.
- Runs type-check: false.
- Runs build: false.
- Runs regression: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Physical lifecycle cleanup authorized: false.
- Requires separate recording step: true.
- Requires separate candidate extraction step: true.
`;
}

function main() {
  const { action } = ensureA22RootParityExtractionInstructionOwnerInputScaffold();
  const payload = buildA22RootParityExtractionInstructionIntake({ ownerInputAction: action });
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.datedJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestMarkdown, md);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.datedMarkdown, md);

  console.log("A22 top clean candidate root-parity extraction instruction intake generated");
  console.log(`Intake status: ${payload.intakeStatus}`);
  console.log(`Expected rows: ${payload.summary.expectedRows}`);
  console.log(`Proposed instruction rows: ${payload.summary.proposedInstructionRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
