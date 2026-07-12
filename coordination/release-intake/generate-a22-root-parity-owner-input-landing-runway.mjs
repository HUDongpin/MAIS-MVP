#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  selectedActionPreview: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview.json",
  selectedActionPreviewGate: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview-current-gate.json",
  ownerActionPacket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
  ownerInput: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
  instructionIntake: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake.json",
  instructionRecordingDryRun: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.json",
  guardedExtractionDryRun: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.json",
  latestJson: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.json",
  latestMarkdown: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.md",
  datedJson: `coordination/release-intake/${date}-A22-root-parity-owner-input-landing-runway.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-root-parity-owner-input-landing-runway.md`
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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function ownerInputBlank(ownerInput) {
  return !String(ownerInput.ownerExecutionText ?? "").trim() &&
    !String(ownerInput.approvedBy ?? "").trim() &&
    !String(ownerInput.approvedAt ?? "").trim() &&
    !String(ownerInput.notes ?? "").trim() &&
    (ownerInput.selectedActions ?? []).every((row) => !String(row.selectedAction ?? "").trim());
}

function ownerInputMatchesPatch({ ownerInput, ownerActionPacket }) {
  if (ownerInputBlank(ownerInput)) return false;
  const patch = ownerActionPacket.ownerInputPatchPreviewDoNotApply ?? {};
  const patchRowsList = patchRows(ownerActionPacket);
  const ownerRows = normalizedRows(ownerInput.selectedActions ?? []);
  const patchLines = String(patch.ownerExecutionText ?? "").split("\n").filter((line) => line.trim().length > 0);
  const ownerText = String(ownerInput.ownerExecutionText ?? "");
  return rowsEquivalent(ownerRows, patchRowsList) &&
    patchLines.length === 4 &&
    patchLines.every((line) => ownerText.includes(line));
}

function selectedActionMap(rows) {
  return Object.fromEntries((rows ?? []).map((row) => [row.unitId, row.selectedAction]));
}

function normalizedRows(rows) {
  return (rows ?? []).map((row) => ({
    unitId: row.unitId,
    primaryOwnerIds: row.primaryOwnerIds ?? [],
    coordinationOwnerIds: row.coordinationOwnerIds ?? [],
    allowedActions: row.allowedActions ?? [],
    selectedAction: row.selectedAction ?? "",
    rootSource: row.rootSource ?? "",
    rootSourceSha256: row.rootSourceSha256 ?? "",
    candidateTarget: row.candidateTarget ?? ""
  }));
}

function sourceCurrentnessFailures({ dirtyMap, preview, previewGate, ownerActionPacket, instructionIntake, recordingDryRun, guardedDryRun }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["selectedAction preview", preview],
    ["owner action packet", ownerActionPacket],
    ["instruction intake", instructionIntake],
    ["instruction recording dry-run", recordingDryRun],
    ["guarded extraction dry-run", guardedDryRun]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if (previewGate.dirtyMapStatusSignature !== expectedSignature) failures.push("selectedAction preview gate dirty-map signature is stale");
  if (previewGate.expandedStatusEntries !== expectedEntries) failures.push("selectedAction preview gate expanded dirty entry count is stale");
  if ((previewGate.failures ?? []).length !== 0) failures.push("selectedAction preview gate has failures");
  return failures;
}

function patchRows(ownerActionPacket) {
  return normalizedRows(ownerActionPacket.ownerInputPatchPreviewDoNotApply?.selectedActions ?? []);
}

function previewRows(preview) {
  return normalizedRows(preview.previewRows ?? []);
}

function rowsEquivalent(leftRows, rightRows) {
  return JSON.stringify(leftRows) === JSON.stringify(rightRows);
}

function exactTextLinesMatch({ preview, ownerActionPacket }) {
  const previewLines = preview.batchAuthorizationRequest?.exactOwnerExecutionTextLines ?? [];
  const patchText = ownerActionPacket.ownerInputPatchPreviewDoNotApply?.ownerExecutionText ?? "";
  const patchLines = patchText.split("\n").filter((line) => line.trim().length > 0);
  return previewLines.length === 4 &&
    patchLines.length === 4 &&
    previewLines.every((line, index) => line === patchLines[index]);
}

function postOwnerInputValidationCommands() {
  return [
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs"
  ];
}

function buildChecks({ sourceFailures, dirtyMap, preview, previewGate, ownerActionPacket, ownerInput, instructionIntake, recordingDryRun, guardedDryRun, rowsMatch, textMatch, ownerInputRecorded }) {
  const patch = ownerActionPacket.ownerInputPatchPreviewDoNotApply ?? {};
  const patchBoundary = patch.boundary ?? {};
  const previewBoundary = preview.boundary ?? {};
  const previewReady = preview.previewStatus === "ready-for-owner-review" &&
    count(preview.summary?.previewRows) === 4 &&
    count(preview.summary?.pendingRows) === 4 &&
    count(preview.summary?.acceptedRows) === 0;
  const previewAccepted = preview.previewStatus === "owner-approved-waiting-candidate-mutation" &&
    count(preview.summary?.previewRows) === 4 &&
    count(preview.summary?.pendingRows) === 0 &&
    count(preview.summary?.acceptedRows) === 4 &&
    ownerInputRecorded;
  const previewPostExtractionVerified = preview.previewStatus === "owner-approved-post-extraction-verified-check-remediation" &&
    count(preview.summary?.previewRows) === 4 &&
    count(preview.summary?.pendingRows) === 0 &&
    count(preview.summary?.acceptedRows) === 4 &&
    ownerInputRecorded;
  const targetsMissingBeforeExtraction = (guardedDryRun.extractionUnits ?? []).length === 4 &&
    (guardedDryRun.extractionUnits ?? []).every((unit) => unit.candidateTargetExists === false);
  const targetsVerifiedAfterExtraction = guardedDryRun.executorStatus === "already-extracted-and-verified" &&
    count(guardedDryRun.summary?.candidateTargetsVerified) === 4 &&
    count(guardedDryRun.summary?.candidateTargetsMissing) === 0;
  const boundariesFalse = [
    previewBoundary.recordsOwnerInput,
    previewBoundary.recordsExtractionInstruction,
    previewBoundary.modifiesCandidate,
    previewBoundary.copiesRootFiles,
    previewBoundary.cleanupAuthorized,
    previewBoundary.executableNow,
    previewBoundary.deployAuthorized,
    previewBoundary.mergeAuthorized,
    previewBoundary.destructiveGitAuthorized,
    previewBoundary.physicalLifecycleCleanupAuthorized,
    patch.cleanupAuthorized,
    patch.executableNow,
    patch.deployAuthorized,
    patch.mergeAuthorized,
    patch.stageAuthorized,
    patch.destructiveGitAuthorized,
    patch.physicalLifecycleCleanupAuthorized,
    patchBoundary.recordsOwnerInput,
    patchBoundary.recordsExtractionInstruction,
    patchBoundary.modifiesCandidate,
    patchBoundary.copiesRootFiles,
    patchBoundary.cleanupAuthorized,
    patchBoundary.executableNow,
    patchBoundary.deployAuthorized,
    patchBoundary.mergeAuthorized,
    patchBoundary.destructiveGitAuthorized,
    patchBoundary.physicalLifecycleCleanupAuthorized
  ].every((value) => value === false);

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "dirty-map-current",
      status: dirtyMap.statusCounts?.expandedStatusEntries === preview.expandedStatusEntries ? "pass" : "fail",
      detail: `dirtyMapEntries=${dirtyMap.statusCounts?.expandedStatusEntries}; previewEntries=${preview.expandedStatusEntries}`
    },
    {
      id: "selected-action-preview-current",
      status: (previewGate.failures ?? []).length === 0 && (previewReady || previewAccepted || previewPostExtractionVerified) ? "pass" : "fail",
      detail: `previewStatus=${preview.previewStatus}; previewRows=${preview.summary?.previewRows}; pendingRows=${preview.summary?.pendingRows}`
    },
    {
      id: "owner-input-still-blank",
      status: ownerInputBlank(ownerInput) || ownerInputRecorded ? "pass" : "fail",
      detail: ownerInputRecorded
        ? "owner input has been recorded and matches the selectedAction patch"
        : "owner input remains blank before owner approval"
    },
    {
      id: "patch-preview-do-not-apply",
      status: patch.doNotApply === true && patch.ownerInputFile === A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.ownerInput ? "pass" : "fail",
      detail: `doNotApply=${patch.doNotApply === true}; ownerInputFile=${patch.ownerInputFile ?? ""}`
    },
    {
      id: "patch-rows-match-selected-action-preview",
      status: rowsMatch ? "pass" : "fail",
      detail: `patchRows=${patchRows(ownerActionPacket).length}; previewRows=${previewRows(preview).length}`
    },
    {
      id: "exact-owner-execution-text-lines-match",
      status: textMatch ? "pass" : "fail",
      detail: `previewLines=${preview.batchAuthorizationRequest?.exactOwnerExecutionTextLines?.length ?? 0}`
    },
    {
      id: "post-owner-input-chain-still-blocked",
      status: (
        instructionIntake.intakeStatus === "waiting-for-owner-input" &&
        recordingDryRun.recorderStatus === "dry-run-blocked-owner-input" &&
        guardedDryRun.executorStatus === "dry-run-blocked-missing-recorded-instructions"
      ) || (
        ownerInputRecorded &&
        ["ready-to-record-extraction-instruction-rows", "already-recorded"].includes(instructionIntake.intakeStatus) &&
        ["dry-run-ready-requires-explicit-apply", "already-recorded"].includes(recordingDryRun.recorderStatus) &&
        ["dry-run-blocked-missing-recorded-instructions", "dry-run-ready-requires-explicit-apply", "already-extracted-and-verified"].includes(guardedDryRun.executorStatus)
      )
        ? "pass"
        : "fail",
      detail: `intake=${instructionIntake.intakeStatus}; recorder=${recordingDryRun.recorderStatus}; executor=${guardedDryRun.executorStatus}`
    },
    {
      id: "candidate-targets-missing-before-extraction",
      status: targetsMissingBeforeExtraction || targetsVerifiedAfterExtraction
        ? "pass"
        : "fail",
      detail: `missingTargets=${count(guardedDryRun.summary?.candidateTargetsMissing)}/4; verifiedTargets=${count(guardedDryRun.summary?.candidateTargetsVerified)}/4`
    },
    {
      id: "no-unauthorized-side-effects",
      status: boundariesFalse &&
        count(preview.summary?.cleanupAuthorizedRows) === 0 &&
        count(preview.summary?.executableRows) === 0 &&
        count(ownerActionPacket.summary?.rootCopyRows) === 0 &&
        count(ownerActionPacket.summary?.candidateMutationRows) === 0 &&
        count(guardedDryRun.summary?.rootCopyRows) === 0 &&
        count(guardedDryRun.summary?.candidateMutationRows) === 0
        ? "pass"
        : "fail",
      detail: "preview and patch boundaries must remain preview-only, non-executable, no-cleanup, no-merge, no-deploy"
    }
  ];
}

export function stableA22RootParityOwnerInputLandingRunwayProjection(payload) {
  return {
    runwayKind: payload.runwayKind,
    runwayStatus: payload.runwayStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    topCandidate: payload.topCandidate,
    ownerInputFile: payload.ownerInputFile,
    landingPatchPreviewDoNotApply: payload.landingPatchPreviewDoNotApply,
    postOwnerInputValidationCommands: payload.postOwnerInputValidationCommands,
    summary: payload.summary,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    checks: payload.checks,
    boundary: payload.boundary
  };
}

export function buildA22RootParityOwnerInputLandingRunway() {
  const dirtyMap = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.dirtyMap);
  const selectedActionPreview = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.selectedActionPreview);
  const selectedActionPreviewGate = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.selectedActionPreviewGate);
  const ownerActionPacket = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.ownerActionPacket);
  const ownerInput = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.ownerInput);
  const instructionIntake = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.instructionIntake);
  const instructionRecordingDryRun = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.instructionRecordingDryRun);
  const guardedExtractionDryRun = readJson(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.guardedExtractionDryRun);

  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    preview: selectedActionPreview,
    previewGate: selectedActionPreviewGate,
    ownerActionPacket,
    instructionIntake,
    recordingDryRun: instructionRecordingDryRun,
    guardedDryRun: guardedExtractionDryRun
  });
  const rowsMatch = rowsEquivalent(patchRows(ownerActionPacket), previewRows(selectedActionPreview));
  const textMatch = exactTextLinesMatch({ preview: selectedActionPreview, ownerActionPacket });
  const ownerInputRecorded = ownerInputMatchesPatch({ ownerInput, ownerActionPacket });
  const checks = buildChecks({
    sourceFailures,
    dirtyMap,
    preview: selectedActionPreview,
    previewGate: selectedActionPreviewGate,
    ownerActionPacket,
    ownerInput,
    instructionIntake,
    recordingDryRun: instructionRecordingDryRun,
    guardedDryRun: guardedExtractionDryRun,
    rowsMatch,
    textMatch,
    ownerInputRecorded
  });
  const failedChecks = checks.filter((row) => row.status === "fail");
  const patch = ownerActionPacket.ownerInputPatchPreviewDoNotApply ?? {};

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    runwayKind: "a22-root-parity-owner-input-landing-runway",
    runwayStatus: failedChecks.length === 0
      ? ownerInputRecorded
        ? "owner-input-recorded-post-runway"
        : "ready-for-owner-input-landing-review"
      : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      selectedActionPreviewGeneratedAt: selectedActionPreview.generatedAt,
      selectedActionPreviewGateGeneratedAt: selectedActionPreviewGate.generatedAt,
      ownerActionPacketGeneratedAt: ownerActionPacket.generatedAt,
      instructionIntakeGeneratedAt: instructionIntake.generatedAt,
      instructionRecordingDryRunGeneratedAt: instructionRecordingDryRun.generatedAt,
      guardedExtractionDryRunGeneratedAt: guardedExtractionDryRun.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    topCandidate: selectedActionPreview.topCandidate,
    ownerInputFile: A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.ownerInput,
    landingPatchPreviewDoNotApply: {
      doNotApply: true,
      ownerInputFile: patch.ownerInputFile ?? "",
      inputKind: patch.inputKind ?? "",
      applyToUnitIds: patch.applyToUnitIds ?? [],
      selectedActions: patchRows(ownerActionPacket),
      selectedActionMap: selectedActionMap(patchRows(ownerActionPacket)),
      ownerExecutionTextLines: String(patch.ownerExecutionText ?? "").split("\n").filter((line) => line.trim().length > 0),
      ownerExecutionTextMatchesSelectedActionPreview: textMatch,
      approvedByPlaceholder: patch.approvedBy ?? "",
      approvedAtPlaceholder: patch.approvedAt ?? "",
      notesPlaceholder: patch.notes ?? "",
      boundary: patch.boundary ?? {}
    },
    postOwnerInputValidationCommands: postOwnerInputValidationCommands(),
    summary: {
      previewRows: count(selectedActionPreview.summary?.previewRows),
      pendingRows: count(selectedActionPreview.summary?.pendingRows),
      acceptedRows: count(selectedActionPreview.summary?.acceptedRows),
      patchRows: patchRows(ownerActionPacket).length,
      ownerInputBlank: ownerInputBlank(ownerInput),
      ownerInputRecorded,
      exactOwnerExecutionTextRows: selectedActionPreview.batchAuthorizationRequest?.exactOwnerExecutionTextLines?.length ?? 0,
      postOwnerInputValidationCommands: postOwnerInputValidationCommands().length,
      instructionIntakeStatus: instructionIntake.intakeStatus ?? "",
      instructionRecordingStatus: instructionRecordingDryRun.recorderStatus ?? "",
      guardedExtractionStatus: guardedExtractionDryRun.executorStatus ?? "",
      candidateTargetsMissing: (guardedExtractionDryRun.extractionUnits ?? []).filter((unit) => unit.candidateTargetExists === false).length,
      candidateTargetsVerified: count(guardedExtractionDryRun.summary?.candidateTargetsVerified),
      rootCopyRows: 0,
      candidateMutationRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedChecks: failedChecks.length
    },
    checks,
    boundary: {
      evidenceOnly: true,
      runwayOnly: true,
      recordsOwnerInput: false,
      appliesOwnerInputPatch: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      selectsReleaseSource: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresExplicitOwnerApprovalBeforeOwnerInputRecording: true,
      requiresSeparateRecordingApply: true,
      requiresSeparateGuardedExtractionApply: true
    }
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.landingPatchPreviewDoNotApply.selectedActions.map((row, index) => (
    `| ${index + 1} | \`${cell(row.unitId)}\` | ${cell(row.primaryOwnerIds.join(","))} | \`${cell(row.selectedAction)}\` | \`${cell(row.rootSource)}\` | \`${cell(row.candidateTarget)}\` |`
  )).join("\n") || "| 0 | none | none | none | none | none |";
  const commands = payload.postOwnerInputValidationCommands.map((command, index) => `${index + 1}. \`${command}\``).join("\n");
  const checks = payload.checks.map((row) => `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`).join("\n");

  return `# A22 Root-Parity Owner Input Landing Runway

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This runway is evidence-only. It proves the selectedAction preview can land into the A22 owner-input file after explicit owner approval, but it does not write owner input, record extraction instructions, copy root files, mutate the candidate worktree, select a release source, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Runway status: \`${payload.runwayStatus}\`
- Top candidate: \`${payload.topCandidate?.branch ?? "none"}\`
- Owner input file: \`${payload.ownerInputFile}\`
- Preview rows: ${payload.summary.previewRows}
- Pending rows: ${payload.summary.pendingRows}
- Patch rows: ${payload.summary.patchRows}
- Owner input blank: ${payload.summary.ownerInputBlank ? "yes" : "no"}
- Exact owner execution text rows: ${payload.summary.exactOwnerExecutionTextRows}
- Instruction intake status: \`${payload.summary.instructionIntakeStatus}\`
- Instruction recording status: \`${payload.summary.instructionRecordingStatus}\`
- Guarded extraction status: \`${payload.summary.guardedExtractionStatus}\`
- Candidate targets missing: ${payload.summary.candidateTargetsMissing}/4
- Candidate targets verified: ${payload.summary.candidateTargetsVerified}/4
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Landing Patch Preview Do Not Apply

| Order | Unit ID | Primary owners | Selected action | Root source | Candidate target |
| ---: | --- | --- | --- | --- | --- |
${rows}

## Post Owner-Input Validation Commands

${commands}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Runway only: true
- Records owner input: false
- Applies owner input patch: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Selects release source: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Physical lifecycle cleanup authorized: false
- Requires explicit owner approval before owner-input recording: true
- Requires separate recording apply: true
- Requires separate guarded extraction apply: true
`;
}

export function writeA22RootParityOwnerInputLandingRunway() {
  const payload = buildA22RootParityOwnerInputLandingRunway();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestJson, json);
  write(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestMarkdown, md);
  write(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.datedJson, json);
  write(A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.datedMarkdown, md);
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22RootParityOwnerInputLandingRunway();
  console.log("A22 root-parity owner-input landing runway generated");
  console.log(`Runway status: ${payload.runwayStatus}`);
  console.log(`Top candidate: ${payload.topCandidate?.branch ?? "none"}`);
  console.log(`Patch rows: ${payload.summary.patchRows}`);
  console.log(`Post-owner-input validation commands: ${payload.summary.postOwnerInputValidationCommands}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}
