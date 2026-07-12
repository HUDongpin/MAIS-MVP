#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS } from "./generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS } from "./run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS } from "./run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerActionPacket: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestJson,
  ownerActionPacketGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet-current-gate.json",
  ownerInput: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.ownerInput,
  instructionIntake: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson,
  instructionIntakeGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake-current-gate.json",
  instructionRecordingDryRun: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
  instructionRecordingGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-current-gate.json",
  guardedExtractionDryRun: TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson,
  guardedExtractionGate: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-current-gate.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.md`
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

function artifactCurrent(dirtyMap, payload) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return payload.dirtyMapStatusSignature === expectedSignature &&
    payload.expandedStatusEntries === expectedEntries;
}

function gateFailures(gates) {
  return gates.reduce((sum, gate) => sum + (gate.failures ?? []).length, 0);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function blankOwnerInput(ownerInput) {
  const selectedActions = ownerInput.selectedActions ?? [];
  return !nonEmptyString(ownerInput.ownerExecutionText) &&
    !nonEmptyString(ownerInput.approvedBy) &&
    !nonEmptyString(ownerInput.approvedAt) &&
    !nonEmptyString(ownerInput.notes) &&
    selectedActions.every((row) => !nonEmptyString(row.selectedAction));
}

function ownerInputByUnit(ownerInput) {
  return new Map((ownerInput.selectedActions ?? []).map((row) => [row.unitId, row]));
}

function buildAcceptanceRows({ ownerActionPacket, ownerInput }) {
  const selectedByUnit = ownerInputByUnit(ownerInput);
  return (ownerActionPacket.ownerActionRows ?? []).map((row) => {
    const ownerRow = selectedByUnit.get(row.unitId) ?? {};
    const selectedAction = ownerRow.selectedAction ?? "";
    const allowedActions = row.allowedActions ?? [];
    const selectedActionValid = nonEmptyString(selectedAction) && allowedActions.includes(selectedAction);
    const ownerText = ownerInput.ownerExecutionText ?? "";
    const ownerTextCoversRow = selectedActionValid &&
      ownerText.includes(`unitId=${row.unitId}`) &&
      ownerText.includes(`selectedAction=${selectedAction}`) &&
      ownerText.includes(`targetWorktree=${row.topCandidate?.path ?? ""}`) &&
      ownerText.includes(`rootSource=${row.rootSource?.path ?? ""}`) &&
      ownerText.includes(`candidateTarget=${row.candidateTargetPath}`);
    return {
      unitId: row.unitId,
      primaryOwnerIds: row.primaryOwnerIds ?? [],
      coordinationOwnerIds: row.coordinationOwnerIds ?? [],
      allowedActions,
      recommendedSelectedAction: row.recommendedSelectedAction,
      ownerSelectedAction: selectedAction,
      selectedActionValid,
      ownerTextCoversRow,
      rootSource: row.rootSource?.path ?? "",
      rootSourceSha256: row.rootSource?.sha256 ?? "",
      candidateTarget: row.candidateTargetPath,
      acceptedByOwnerInput: selectedActionValid && ownerTextCoversRow,
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

function sourceCurrentnessFailures({ dirtyMap, ownerActionPacket, ownerActionPacketGate, intake, intakeGate, recording, recordingGate, guardedExtraction, guardedExtractionGate }) {
  const entries = [
    ["owner action packet", ownerActionPacket],
    ["owner action packet gate", ownerActionPacketGate],
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

function lifecycleStatus({ checks, ownerInputBlank, intake, recording, guardedExtraction }) {
  if (checks.some((row) => row.status === "fail")) return "not-ready-check-failures";
  if (guardedExtraction.executorStatus === "already-extracted-and-verified") return "post-extraction-verified";
  if (guardedExtraction.executorStatus === "dry-run-ready-requires-explicit-apply") return "ready-for-guarded-extraction";
  if (
    !ownerInputBlank &&
    (
      intake.intakeStatus === "ready-to-record-extraction-instruction-rows" ||
      ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(recording.recorderStatus)
    )
  ) {
    return "ready-for-extraction-instruction-recording";
  }
  return "waiting-for-owner-action";
}

function safeRows(rows) {
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

function buildChecks({ dirtyMap, ownerActionPacket, ownerActionPacketGate, ownerInput, intake, intakeGate, recording, recordingGate, guardedExtraction, guardedExtractionGate, acceptanceRows, sourceFailures }) {
  const ownerInputBlank = blankOwnerInput(ownerInput);
  const sourceGateFailureCount = gateFailures([
    ownerActionPacketGate,
    intakeGate,
    recordingGate,
    guardedExtractionGate
  ]);
  const allRowsAccepted = acceptanceRows.length === 4 && acceptanceRows.every((row) => row.acceptedByOwnerInput);
  const ownerInputSafe = ownerInput.cleanupAuthorized === false &&
    ownerInput.executableNow === false &&
    ownerInput.deployAuthorized === false &&
    ownerInput.mergeAuthorized === false &&
    ownerInput.stageAuthorized === false &&
    ownerInput.destructiveGitAuthorized === false &&
    ownerInput.physicalLifecycleCleanupAuthorized === false &&
    ownerInput.boundary?.recordsExtractionInstruction === false &&
    ownerInput.boundary?.modifiesCandidate === false &&
    ownerInput.boundary?.copiesRootFiles === false;
  const waitingLifecycleCoherent = ownerInputBlank &&
    ownerActionPacket.focusStatus === "waiting-for-owner-action" &&
    intake.intakeStatus === "waiting-for-owner-input" &&
    recording.recorderStatus === "dry-run-blocked-owner-input" &&
    guardedExtraction.executorStatus === "dry-run-blocked-missing-recorded-instructions";
  const postOwnerInputLifecycleCoherent = ownerInputBlank ||
    (allRowsAccepted && intake.intakeStatus === "ready-to-record-extraction-instruction-rows");
  const postExtractionVerified = guardedExtraction.executorStatus === "already-extracted-and-verified";

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
      id: "owner-action-packet-ready",
      status: ownerActionPacket.focusKind === "a22-root-parity-owner-action-packet" &&
        (ownerActionPacket.summary?.focusRows ?? 0) === 4 &&
        (ownerActionPacket.summary?.recommendedActionRows ?? 0) === 4
        ? "pass"
        : "fail",
      detail: `focusStatus=${ownerActionPacket.focusStatus ?? "unknown"}; focusRows=${ownerActionPacket.summary?.focusRows ?? 0}`
    },
    {
      id: "acceptance-rows-complete",
      status: acceptanceRows.length === 4 ? "pass" : "fail",
      detail: `acceptanceRows=${acceptanceRows.length}; acceptedRows=${acceptanceRows.filter((row) => row.acceptedByOwnerInput).length}`
    },
    {
      id: "owner-input-boundary-safe",
      status: ownerInputSafe ? "pass" : "fail",
      detail: "owner input must not authorize cleanup, execution, deploy, merge, broad staging, destructive git, physical lifecycle cleanup, instruction recording, candidate mutation, or root copying"
    },
    {
      id: "waiting-lifecycle-coherent",
      status: ownerInputBlank ? (waitingLifecycleCoherent ? "pass" : "fail") : "skip",
      detail: `ownerInputBlank=${ownerInputBlank}; intakeStatus=${intake.intakeStatus ?? "unknown"}; recorderStatus=${recording.recorderStatus ?? "unknown"}; executorStatus=${guardedExtraction.executorStatus ?? "unknown"}`
    },
    {
      id: "post-owner-input-lifecycle-valid",
      status: ownerInputBlank ? "skip" : (postOwnerInputLifecycleCoherent ? "pass" : "fail"),
      detail: `ownerInputBlank=${ownerInputBlank}; allRowsAccepted=${allRowsAccepted}; intakeStatus=${intake.intakeStatus ?? "unknown"}`
    },
    {
      id: "recording-still-separate",
      status: (recording.summary?.recordsExtractionInstructionRows ?? 0) === 0 &&
        recording.boundary?.requiresExplicitApplyRecordingFlag === true
        ? "pass"
        : "fail",
      detail: `recordsExtractionInstructionRows=${recording.summary?.recordsExtractionInstructionRows ?? 0}; requiresExplicitApply=${recording.boundary?.requiresExplicitApplyRecordingFlag === true}`
    },
    {
      id: "candidate-mutation-still-separate",
      status: (guardedExtraction.summary?.candidateMutationRows ?? 0) === 0 &&
        (guardedExtraction.summary?.rootCopyRows ?? 0) === 0 &&
        guardedExtraction.boundary?.requiresSeparateOwnerCandidateMutationInstruction === !postExtractionVerified
        ? "pass"
        : "fail",
      detail: `rootCopyRows=${guardedExtraction.summary?.rootCopyRows ?? 0}; candidateMutationRows=${guardedExtraction.summary?.candidateMutationRows ?? 0}; postExtractionVerified=${postExtractionVerified}`
    },
    {
      id: "no-executable-boundary",
      status: safeRows(acceptanceRows) ? "pass" : "fail",
      detail: "acceptance docket keeps cleanup and execution unauthorized"
    }
  ];
}

function validationCommands() {
  return [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-review-packet.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ];
}

export function buildA22RootParityOwnerActionAcceptanceDocket() {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const ownerActionPacket = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerActionPacket);
  const ownerActionPacketGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerActionPacketGate);
  const ownerInput = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerInput);
  const intake = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionIntake);
  const intakeGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionIntakeGate);
  const recording = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionRecordingDryRun);
  const recordingGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.instructionRecordingGate);
  const guardedExtraction = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.guardedExtractionDryRun);
  const guardedExtractionGate = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.guardedExtractionGate);
  const acceptanceRows = buildAcceptanceRows({ ownerActionPacket, ownerInput });
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    ownerActionPacket,
    ownerActionPacketGate,
    intake,
    intakeGate,
    recording,
    recordingGate,
    guardedExtraction,
    guardedExtractionGate
  });
  const checks = buildChecks({
    dirtyMap,
    ownerActionPacket,
    ownerActionPacketGate,
    ownerInput,
    intake,
    intakeGate,
    recording,
    recordingGate,
    guardedExtraction,
    guardedExtractionGate,
    acceptanceRows,
    sourceFailures
  });
  const ownerInputBlank = blankOwnerInput(ownerInput);
  const status = lifecycleStatus({ checks, ownerInputBlank, intake, recording, guardedExtraction });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    docketKind: "a22-root-parity-owner-action-acceptance-docket",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      ownerActionPacketGeneratedAt: ownerActionPacket.generatedAt,
      ownerActionPacketGateFailureCount: (ownerActionPacketGate.failures ?? []).length,
      ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerInput,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null,
      instructionIntakeGeneratedAt: intake.generatedAt,
      instructionIntakeGateFailureCount: (intakeGate.failures ?? []).length,
      instructionRecordingGeneratedAt: recording.generatedAt,
      instructionRecordingGateFailureCount: (recordingGate.failures ?? []).length,
      guardedExtractionGeneratedAt: guardedExtraction.generatedAt,
      guardedExtractionGateFailureCount: (guardedExtractionGate.failures ?? []).length
    },
    sourceCurrentnessFailures: sourceFailures,
    acceptanceStatus: status,
    topCandidate: ownerActionPacket.topCandidate ?? {},
    ownerInputFile: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.ownerInput,
    ownerInputBlank,
    acceptanceRows,
    requiredOwnerReplyFields: [
      "ownerExecutionText",
      "selectedActions",
      "approvedBy",
      "approvedAt",
      "notes"
    ],
    safePostOwnerInputValidationCommands: validationCommands(),
    separateApplyStepsStillRequired: status === "post-extraction-verified"
      ? [
        "Candidate npm run type-check, npm run build, and focused regression must be refreshed after candidate mutation evidence.",
        "Clean-source selection remains blocked until refreshed candidate gates are green.",
        "Separate owner instructions remain required for merge, deploy, cleanup, broad staging, destructive git, or physical lifecycle cleanup."
      ]
      : [
        "A separate owner instruction must authorize writing validated rows into latest-A22-top-clean-candidate-root-parity-extraction-instructions.json before instruction recording apply mode may run.",
        "A separate owner instruction must authorize any candidate worktree mutation after recorded extraction instructions exist.",
        "Candidate npm run type-check, npm run build, and focused regression must be refreshed after any candidate mutation."
      ],
    checks,
    summary: {
      acceptanceRows: acceptanceRows.length,
      acceptedRows: acceptanceRows.filter((row) => row.acceptedByOwnerInput).length,
      ownerInputBlank,
      ownerActionPacketStatus: ownerActionPacket.focusStatus ?? "",
      instructionIntakeStatus: intake.intakeStatus ?? "",
      intakeProposedInstructionRows: intake.summary?.proposedInstructionRows ?? 0,
      recordingStatus: recording.recorderStatus ?? "",
      recordingProposedInstructionRows: recording.summary?.proposedInstructionRows ?? 0,
      recordedInstructionRows: recording.summary?.recordsExtractionInstructionRows ?? 0,
      guardedExtractionStatus: guardedExtraction.executorStatus ?? "",
      guardedRecordedInstructionRows: guardedExtraction.summary?.recordedInstructionRows ?? 0,
      rootCopyRows: guardedExtraction.summary?.rootCopyRows ?? 0,
      candidateMutationRows: guardedExtraction.summary?.candidateMutationRows ?? 0,
      checks: checks.length,
      passingChecks: checks.filter((row) => row.status === "pass").length,
      skippedChecks: checks.filter((row) => row.status === "skip").length,
      failedChecks: checks.filter((row) => row.status === "fail").length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      acceptanceDocketOnly: true,
      recordsOwnerInput: false,
      recordsOwnerApproval: false,
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
      requiresOwnerReply: true,
      requiresSeparateRecordingStep: true,
      requiresSeparateCandidateMutationInstruction: status !== "post-extraction-verified"
    }
  };
}

export function stableA22RootParityOwnerActionAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    docketKind: payload.docketKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    acceptanceStatus: payload.acceptanceStatus,
    topCandidate: payload.topCandidate,
    ownerInputFile: payload.ownerInputFile,
    ownerInputBlank: payload.ownerInputBlank,
    acceptanceRows: payload.acceptanceRows,
    requiredOwnerReplyFields: payload.requiredOwnerReplyFields,
    safePostOwnerInputValidationCommands: payload.safePostOwnerInputValidationCommands,
    separateApplyStepsStillRequired: payload.separateApplyStepsStillRequired,
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
  const acceptanceRows = payload.acceptanceRows.map((row) => (
    `| \`${cell(row.unitId)}\` | ${cell((row.allowedActions ?? []).join(", "))} | ${cell(row.recommendedSelectedAction)} | ${cell(row.ownerSelectedAction || "not provided")} | ${row.acceptedByOwnerInput ? "yes" : "no"} | \`${cell(row.candidateTarget)}\` |`
  )).join("\n") || "| none | none | none | none | no | none |";
  const checkRows = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none |";

  return `# A22 Root-Parity Owner Action Acceptance Docket

Generated: ${payload.generatedAt}

Acceptance status: \`${payload.acceptanceStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Top candidate: \`${payload.topCandidate.branch ?? "none"}\`

This docket is evidence-only. It validates whether the four A22 root-parity owner action rows have owner input that is ready for the next recording dry-run. It does not record owner input, record extraction instructions, copy root files, mutate the candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Acceptance rows: ${payload.summary.acceptanceRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Owner input blank: ${payload.summary.ownerInputBlank ? "yes" : "no"}
- Owner action packet: ${payload.summary.ownerActionPacketStatus}
- Instruction intake: ${payload.summary.instructionIntakeStatus}
- Intake proposed instruction rows: ${payload.summary.intakeProposedInstructionRows}
- Instruction recording: ${payload.summary.recordingStatus}
- Recording proposed instruction rows: ${payload.summary.recordingProposedInstructionRows}
- Recorded instruction rows: ${payload.summary.recordedInstructionRows}
- Guarded extraction: ${payload.summary.guardedExtractionStatus}
- Guarded recorded instruction rows: ${payload.summary.guardedRecordedInstructionRows}
- Root copy rows: ${payload.summary.rootCopyRows}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Checks passing: ${payload.summary.passingChecks}/${payload.summary.checks}
- Checks skipped: ${payload.summary.skippedChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Acceptance Rows

| Unit ID | Allowed actions | Recommended selectedAction | Owner selectedAction | Accepted | Candidate target |
| --- | --- | --- | --- | --- | --- |
${acceptanceRows}

## Required Owner Reply Fields

${list(payload.requiredOwnerReplyFields)}

## Safe Post-Owner-Input Validation Commands

${list(payload.safePostOwnerInputValidationCommands.map((command) => `\`${command}\``))}

## Separate Apply Steps Still Required

${list(payload.separateApplyStepsStillRequired)}

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
- Requires separate candidate mutation instruction: ${payload.boundary.requiresSeparateCandidateMutationInstruction}
`;
}

function main() {
  const payload = buildA22RootParityOwnerActionAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);

  console.log("A22 root-parity owner action acceptance docket generated");
  console.log(`Acceptance status: ${payload.acceptanceStatus}`);
  console.log(`Acceptance rows: ${payload.summary.acceptanceRows}`);
  console.log(`Accepted rows: ${payload.summary.acceptedRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
