#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS } from "./run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS } from "./run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  instructionRequest: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson,
  instructionRequestGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-request-current-gate.json",
  instructionIntake: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson,
  instructionIntakeGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake-current-gate.json",
  ownerInput: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
  instructionRecordingDryRun: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
  instructionRecordingGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-current-gate.json",
  guardedExtractionDryRun: TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson,
  guardedExtractionGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-current-gate.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-owner-action-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-owner-action-packet.md`
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

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function allowedActionsFor(row) {
  return (row.proposedActionOptions ?? [])
    .map((option) => String(option.optionId ?? "").split(":").pop())
    .filter(Boolean);
}

function recommendedActionFor(row) {
  const allowedActions = allowedActionsFor(row);
  if (row.unitId === "a06-visualization-back-to-top-import-parity" && allowedActions.includes("reexport")) {
    return "reexport";
  }
  if (allowedActions.includes("same-path-copy")) return "same-path-copy";
  return allowedActions[0] ?? "";
}

function recommendationNote(row, selectedAction) {
  if (row.unitId === "a06-visualization-back-to-top-import-parity" && selectedAction === "reexport") {
    return "Recommended as the narrow A06 app-level module-parity fix; owner may still choose import-align explicitly.";
  }
  if (selectedAction === "same-path-copy") {
    return "Recommended because the root source SHA is available and the candidate target path is missing.";
  }
  return "Owner must select one allowed action before any recording step.";
}

function ownerInstructionText(row, selectedAction) {
  const primaryOwners = (row.primaryOwnerIds ?? []).join(",");
  const coordinationOwners = (row.coordinationOwnerIds ?? []).join(",");
  return [
    `Authorize A22 root-parity extraction instruction for unitId=${row.unitId}`,
    `topCandidate=${row.topCandidate?.branch ?? ""}`,
    `targetWorktree=${row.topCandidate?.path ?? ""}`,
    `primaryOwnerIds=${primaryOwners}`,
    `coordinationOwnerIds=${coordinationOwners}`,
    `actionMode=${row.actionMode}`,
    `rootSource=${row.rootSource?.path ?? ""}`,
    `rootSourceSha256=${row.rootSource?.sha256 ?? ""}`,
    `candidateTarget=${row.candidateTargetPath ?? ""}`,
    `coveredBlockerRows=${row.coveredBlockerRows ?? 0}`,
    `selectedAction=${selectedAction}`,
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>",
    "notes=<scope and checks>",
    "No cleanup",
    "No deploy",
    "No merge",
    "No broad staging",
    "No destructive git",
    "No physical lifecycle cleanup"
  ].join("; ") + ".";
}

function buildOwnerActionRows(request) {
  return (request.instructionRows ?? []).map((row, index) => {
    const selectedAction = recommendedActionFor(row);
    const allowedActions = allowedActionsFor(row);
    return {
      order: index + 1,
      instructionId: row.instructionId,
      unitId: row.unitId,
      primaryOwnerIds: row.primaryOwnerIds ?? [],
      coordinationOwnerIds: row.coordinationOwnerIds ?? [],
      allowedActions,
      recommendedSelectedAction: selectedAction,
      recommendationNote: recommendationNote(row, selectedAction),
      topCandidate: row.topCandidate ?? {},
      actionMode: row.actionMode,
      rootSource: row.rootSource,
      candidateTargetPath: row.candidateTargetPath,
      candidateTargetExists: row.candidateTargetExists === true,
      coveredBlockerRows: row.coveredBlockerRows ?? 0,
      copyableOwnerExecutionText: ownerInstructionText(row, selectedAction),
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

function blankOwnerInput(ownerInput) {
  const selectedActions = ownerInput.selectedActions ?? [];
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes) &&
    selectedActions.every((row) => !nonEmptyString(row.selectedAction));
}

function ownerInputPatchPreview(ownerActionRows, ownerInput) {
  const selectedActions = ownerActionRows.map((row) => ({
    unitId: row.unitId,
    primaryOwnerIds: row.primaryOwnerIds,
    coordinationOwnerIds: row.coordinationOwnerIds,
    allowedActions: row.allowedActions,
    selectedAction: row.recommendedSelectedAction,
    rootSource: row.rootSource?.path ?? "",
    rootSourceSha256: row.rootSource?.sha256 ?? "",
    candidateTarget: row.candidateTargetPath
  }));

  return {
    doNotApply: true,
    ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.ownerInput,
    inputKind: ownerInput.inputKind ?? "a22-root-parity-extraction-instruction-owner-input",
    applyToUnitIds: ownerActionRows.map((row) => row.unitId),
    selectedActions,
    ownerExecutionText: ownerActionRows.map((row) => row.copyableOwnerExecutionText).join("\n"),
    approvedBy: "<owner>",
    approvedAt: "<ISO-8601>",
    notes: "<scope and checks>",
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    boundary: {
      previewOnly: true,
      ownerInputOnly: true,
      recordsOwnerInput: false,
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

function artifactCurrent(dirtyMap, payload) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return payload.dirtyMapStatusSignature === expectedSignature &&
    payload.expandedStatusEntries === expectedEntries;
}

function gateFailures(gates) {
  return gates.reduce((sum, gate) => sum + (gate.failures ?? []).length, 0);
}

function sourceCurrentnessFailures({ dirtyMap, request, requestGate, intake, intakeGate, recording, recordingGate, guardedExtraction, guardedExtractionGate }) {
  const entries = [
    ["instruction request", request],
    ["instruction request gate", requestGate],
    ["instruction intake", intake],
    ["instruction intake gate", intakeGate],
    ["instruction recording dry run", recording],
    ["instruction recording gate", recordingGate],
    ["guarded extraction dry run", guardedExtraction],
    ["guarded extraction gate", guardedExtractionGate]
  ];
  return entries
    .filter(([, payload]) => !artifactCurrent(dirtyMap, payload))
    .map(([label]) => `${label} is stale relative to latest dirty map`);
}

function safeOwnerActionRows(rows) {
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

function buildChecks({
  dirtyMap,
  request,
  requestGate,
  intake,
  intakeGate,
  ownerInput,
  recording,
  recordingGate,
  guardedExtraction,
  guardedExtractionGate,
  ownerActionRows,
  ownerInputPatchPreviewDoNotApply,
  sourceFailures
}) {
  const requestUnitIds = (request.instructionRows ?? []).map((row) => row.unitId);
  const ownerInputRows = ownerInput.selectedActions ?? [];
  const ownerInputShapeCurrent = sameStringArray(ownerInput.applyToUnitIds, requestUnitIds) &&
    sameStringArray(ownerInputRows.map((row) => row.unitId), requestUnitIds);
  const recommendedActionsValid = ownerActionRows.every((row) =>
    nonEmptyString(row.recommendedSelectedAction) &&
    (row.allowedActions ?? []).includes(row.recommendedSelectedAction)
  );
  const patchRowsValid = sameStringArray(
    ownerInputPatchPreviewDoNotApply.selectedActions?.map((row) => row.unitId),
    requestUnitIds
  ) && ownerInputPatchPreviewDoNotApply.selectedActions?.every((row) =>
    nonEmptyString(row.selectedAction) &&
    (row.allowedActions ?? []).includes(row.selectedAction)
  ) === true;
  const sourceGateFailureCount = gateFailures([requestGate, intakeGate, recordingGate, guardedExtractionGate]);
  const recordingStatusSafe = [
    "dry-run-blocked-owner-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded"
  ].includes(recording.recorderStatus);
  const guardedStatusSafe = [
    "dry-run-blocked-missing-recorded-instructions",
    "dry-run-ready-requires-explicit-apply",
    "already-extracted-and-verified"
  ].includes(guardedExtraction.executorStatus);

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}; expanded=${dirtyMapEntryCount(dirtyMap)}`
    },
    {
      id: "source-gates-passing",
      status: sourceGateFailureCount === 0 ? "pass" : "fail",
      detail: `gateFailures=${sourceGateFailureCount}`
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
      id: "owner-action-rows-complete",
      status: ownerActionRows.length === 4 && recommendedActionsValid ? "pass" : "fail",
      detail: `ownerActionRows=${ownerActionRows.length}; recommendedActionsValid=${recommendedActionsValid}`
    },
    {
      id: "owner-input-shape-current",
      status: ownerInputShapeCurrent ? "pass" : "fail",
      detail: `ownerInputRows=${ownerInputRows.length}; ownerInputBlank=${blankOwnerInput(ownerInput)}`
    },
    {
      id: "owner-input-patch-preview-only",
      status: ownerInputPatchPreviewDoNotApply.doNotApply === true &&
        patchRowsValid &&
        ownerInputPatchPreviewDoNotApply.boundary?.recordsOwnerInput === false &&
        ownerInputPatchPreviewDoNotApply.boundary?.recordsExtractionInstruction === false &&
        ownerInputPatchPreviewDoNotApply.boundary?.modifiesCandidate === false &&
        ownerInputPatchPreviewDoNotApply.boundary?.copiesRootFiles === false
        ? "pass"
        : "fail",
      detail: `patchPreviewRows=${ownerInputPatchPreviewDoNotApply.selectedActions?.length ?? 0}`
    },
    {
      id: "instruction-intake-lifecycle-safe",
      status: ["waiting-for-owner-input", "ready-to-record-extraction-instruction-rows"].includes(intake.intakeStatus)
        ? "pass"
        : "fail",
      detail: `intakeStatus=${intake.intakeStatus ?? "unknown"}; proposedInstructionRows=${intake.summary?.proposedInstructionRows ?? 0}`
    },
    {
      id: "instruction-recording-lifecycle-safe",
      status: recordingStatusSafe &&
        (recording.summary?.recordsExtractionInstructionRows ?? -1) === 0 &&
        (recording.summary?.modifiesCandidateRows ?? -1) === 0
        ? "pass"
        : "fail",
      detail: `recorderStatus=${recording.recorderStatus ?? "unknown"}; recordedRows=${recording.summary?.recordsExtractionInstructionRows ?? 0}`
    },
    {
      id: "guarded-extraction-lifecycle-safe",
      status: guardedStatusSafe &&
        (guardedExtraction.summary?.rootCopyRows ?? -1) === 0 &&
        (guardedExtraction.summary?.candidateMutationRows ?? -1) === 0
        ? "pass"
        : "fail",
      detail: `executorStatus=${guardedExtraction.executorStatus ?? "unknown"}; candidateMutationRows=${guardedExtraction.summary?.candidateMutationRows ?? 0}`
    },
    {
      id: "no-executable-boundary",
      status: safeOwnerActionRows(ownerActionRows) &&
        ownerInputPatchPreviewDoNotApply.cleanupAuthorized === false &&
        ownerInputPatchPreviewDoNotApply.executableNow === false &&
        ownerInputPatchPreviewDoNotApply.deployAuthorized === false &&
        ownerInputPatchPreviewDoNotApply.mergeAuthorized === false &&
        ownerInputPatchPreviewDoNotApply.stageAuthorized === false &&
        ownerInputPatchPreviewDoNotApply.destructiveGitAuthorized === false &&
        ownerInputPatchPreviewDoNotApply.physicalLifecycleCleanupAuthorized === false
        ? "pass"
        : "fail",
      detail: "owner action packet remains evidence-only and non-executable"
    }
  ];
}

function deriveFocusStatus({ checks, intake, recording, guardedExtraction }) {
  if (checks.some((row) => row.status === "fail")) return "not-ready-check-failures";
  if (guardedExtraction.executorStatus === "already-extracted-and-verified") return "post-extraction-verified";
  if (guardedExtraction.executorStatus === "dry-run-ready-requires-explicit-apply") return "ready-for-guarded-extraction";
  if (
    intake.intakeStatus === "ready-to-record-extraction-instruction-rows" ||
    ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(recording.recorderStatus)
  ) {
    return "ready-for-extraction-instruction-recording";
  }
  return "waiting-for-owner-action";
}

export function buildA22RootParityOwnerActionPacket() {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.dirtyMap);
  const request = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRequest);
  const requestGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRequestGate);
  const intake = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionIntake);
  const intakeGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionIntakeGate);
  const ownerInput = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.ownerInput);
  const recording = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRecordingDryRun);
  const recordingGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.instructionRecordingGate);
  const guardedExtraction = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.guardedExtractionDryRun);
  const guardedExtractionGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.guardedExtractionGate);
  const ownerActionRows = buildOwnerActionRows(request);
  const ownerInputPatchPreviewDoNotApply = ownerInputPatchPreview(ownerActionRows, ownerInput);
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    request,
    requestGate,
    intake,
    intakeGate,
    recording,
    recordingGate,
    guardedExtraction,
    guardedExtractionGate
  });
  const checks = buildChecks({
    dirtyMap,
    request,
    requestGate,
    intake,
    intakeGate,
    ownerInput,
    recording,
    recordingGate,
    guardedExtraction,
    guardedExtractionGate,
    ownerActionRows,
    ownerInputPatchPreviewDoNotApply,
    sourceFailures
  });
  const focusStatus = deriveFocusStatus({ checks, intake, recording, guardedExtraction });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    focusKind: "a22-root-parity-owner-action-packet",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      instructionRequestGeneratedAt: request.generatedAt,
      instructionRequestGateFailureCount: (requestGate.failures ?? []).length,
      instructionIntakeGeneratedAt: intake.generatedAt,
      instructionIntakeGateFailureCount: (intakeGate.failures ?? []).length,
      ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.ownerInput,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null,
      instructionRecordingGeneratedAt: recording.generatedAt,
      instructionRecordingGateFailureCount: (recordingGate.failures ?? []).length,
      guardedExtractionGeneratedAt: guardedExtraction.generatedAt,
      guardedExtractionGateFailureCount: (guardedExtractionGate.failures ?? []).length
    },
    sourceCurrentnessFailures: sourceFailures,
    focusStatus,
    topCandidate: request.topCandidate ?? {},
    ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.ownerInput,
    ownerActionRows,
    ownerExecutionTextRequired: ownerActionRows.map((row) => row.copyableOwnerExecutionText).join("\n"),
    ownerInputPatchPreviewDoNotApply,
    requiredOwnerReplyFields: [
      "ownerExecutionText",
      "selectedActions",
      "approvedBy",
      "approvedAt",
      "notes"
    ],
    checks,
    summary: {
      focusRows: ownerActionRows.length,
      recommendedActionRows: ownerActionRows.filter((row) => nonEmptyString(row.recommendedSelectedAction)).length,
      ownerInputBlank: blankOwnerInput(ownerInput),
      instructionRequestStatus: request.requestStatus ?? "",
      instructionIntakeStatus: intake.intakeStatus ?? "",
      intakeProposedInstructionRows: intake.summary?.proposedInstructionRows ?? 0,
      recordingStatus: recording.recorderStatus ?? "",
      recordingProposedInstructionRows: recording.summary?.proposedInstructionRows ?? 0,
      recordedInstructionRows: recording.summary?.recordsExtractionInstructionRows ?? 0,
      guardedExtractionStatus: guardedExtraction.executorStatus ?? "",
      guardedRecordedInstructionRows: guardedExtraction.summary?.recordedInstructionRows ?? 0,
      guardedCandidateTargetsMissing: guardedExtraction.summary?.candidateTargetsMissing ?? 0,
      guardedCandidateGitStatusRows: guardedExtraction.summary?.candidateGitStatusRows ?? 0,
      rootCopyRows: guardedExtraction.summary?.rootCopyRows ?? 0,
      candidateMutationRows: guardedExtraction.summary?.candidateMutationRows ?? 0,
      checks: checks.length,
      passingChecks: checks.filter((row) => row.status === "pass").length,
      failedChecks: checks.filter((row) => row.status === "fail").length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      focusPacketOnly: true,
      recordsOwnerInput: false,
      recordsOwnerApproval: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      writesRootSourceFiles: false,
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
      requiresOwnerReply: true,
      requiresSeparateRecordingStep: true,
      requiresSeparateCandidateMutationInstruction: true
    }
  };
}

export function stableA22RootParityOwnerActionPacketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    focusKind: payload.focusKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    focusStatus: payload.focusStatus,
    topCandidate: payload.topCandidate,
    ownerInputFile: payload.ownerInputFile,
    ownerActionRows: payload.ownerActionRows,
    ownerExecutionTextRequired: payload.ownerExecutionTextRequired,
    ownerInputPatchPreviewDoNotApply: payload.ownerInputPatchPreviewDoNotApply,
    requiredOwnerReplyFields: payload.requiredOwnerReplyFields,
    checks: payload.checks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const actionRows = payload.ownerActionRows.map((row) => (
    `| ${row.order} | \`${cell(row.unitId)}\` | ${cell([...row.primaryOwnerIds, ...row.coordinationOwnerIds].join(", "))} | ${cell((row.allowedActions ?? []).join(", "))} | ${cell(row.recommendedSelectedAction)} | \`${cell(row.rootSource?.path ?? "")}\` | \`${cell(row.candidateTargetPath)}\` |`
  )).join("\n") || "| 0 | none | none | none | none | none | none |";
  const checkRows = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none |";

  return `# A22 Root-Parity Owner Action Packet

Generated: ${payload.generatedAt}

Focus status: \`${payload.focusStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Top candidate: \`${payload.topCandidate.branch ?? "none"}\`

This packet is evidence-only. It previews the owner action needed for A22 root-parity extraction rows, but it does not record owner input, record extraction instructions, copy root files, mutate the candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Focus rows: ${payload.summary.focusRows}
- Recommended action rows: ${payload.summary.recommendedActionRows}
- Owner input blank: ${payload.summary.ownerInputBlank ? "yes" : "no"}
- Instruction request: ${payload.summary.instructionRequestStatus}
- Instruction intake: ${payload.summary.instructionIntakeStatus}
- Intake proposed instruction rows: ${payload.summary.intakeProposedInstructionRows}
- Instruction recording: ${payload.summary.recordingStatus}
- Recording proposed instruction rows: ${payload.summary.recordingProposedInstructionRows}
- Recorded instruction rows: ${payload.summary.recordedInstructionRows}
- Guarded extraction: ${payload.summary.guardedExtractionStatus}
- Guarded recorded instruction rows: ${payload.summary.guardedRecordedInstructionRows}
- Guarded candidate targets missing: ${payload.summary.guardedCandidateTargetsMissing}
- Guarded candidate git status rows: ${payload.summary.guardedCandidateGitStatusRows}
- Root copy rows: ${payload.summary.rootCopyRows}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Checks passing: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Action Rows

| # | Unit ID | Owners | Allowed actions | Recommended selectedAction | Root source | Candidate target |
| ---: | --- | --- | --- | --- | --- | --- |
${actionRows}

## Owner Execution Text Required

\`\`\`text
${payload.ownerExecutionTextRequired}
\`\`\`

## Owner Input Patch Preview Do Not Apply

\`\`\`json
${JSON.stringify(payload.ownerInputPatchPreviewDoNotApply, null, 2)}
\`\`\`

## Required Owner Reply Fields

${list(payload.requiredOwnerReplyFields)}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

- Evidence only: true
- Records owner input: false
- Records extraction instruction: false
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
- Requires owner reply: true
- Requires separate recording step: true
- Requires separate candidate mutation instruction: true
`;
}

function main() {
  const payload = buildA22RootParityOwnerActionPacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.datedJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestMarkdown, md);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.datedMarkdown, md);

  console.log("A22 top clean candidate root-parity owner action packet generated");
  console.log(`Focus status: ${payload.focusStatus}`);
  console.log(`Focus rows: ${payload.summary.focusRows}`);
  console.log(`Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
