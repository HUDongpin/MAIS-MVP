#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS,
  buildA22RootParityOwnerInputLandingRunway,
  stableA22RootParityOwnerInputLandingRunwayProjection
} from "./generate-a22-root-parity-owner-input-landing-runway.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  landingRunway: A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.latestJson,
  landingRunwayGate: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway-current-gate.json",
  ownerInput: A22_ROOT_PARITY_OWNER_INPUT_LANDING_RUNWAY_PATHS.ownerInput,
  latestDryRunJson: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A22-root-parity-owner-input-recording-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A22-root-parity-owner-input-recording-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A22-root-parity-owner-input-recording-apply.md"
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

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] ?? "";
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nonPlaceholder(value, placeholder) {
  return typeof value === "string" && value.trim().length > 0 && value !== placeholder;
}

function validIsoDate(value) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function normalizedText(value) {
  return String(value ?? "").toLowerCase();
}

function safeBoundary(value) {
  return value?.cleanupAuthorized === false &&
    value?.executableNow === false &&
    value?.deployAuthorized === false &&
    value?.mergeAuthorized === false &&
    value?.stageAuthorized === false &&
    value?.destructiveGitAuthorized === false &&
    value?.physicalLifecycleCleanupAuthorized === false;
}

function ownerInputBlank(ownerInput) {
  return !String(ownerInput.ownerExecutionText ?? "").trim() &&
    !String(ownerInput.approvedBy ?? "").trim() &&
    !String(ownerInput.approvedAt ?? "").trim() &&
    !String(ownerInput.notes ?? "").trim() &&
    (ownerInput.selectedActions ?? []).every((row) => !String(row.selectedAction ?? "").trim());
}

function selectedActionRowsMatch(leftRows, rightRows) {
  return sameJson(
    (leftRows ?? []).map((row) => ({
      unitId: row.unitId,
      selectedAction: row.selectedAction,
      rootSource: row.rootSource,
      rootSourceSha256: row.rootSourceSha256,
      candidateTarget: row.candidateTarget
    })),
    (rightRows ?? []).map((row) => ({
      unitId: row.unitId,
      selectedAction: row.selectedAction,
      rootSource: row.rootSource,
      rootSourceSha256: row.rootSourceSha256,
      candidateTarget: row.candidateTarget
    }))
  );
}

function ownerExecutionTextLines(landingRunway) {
  return landingRunway.landingPatchPreviewDoNotApply?.ownerExecutionTextLines ?? [];
}

function ownerInputMatchesLandingPatch(ownerInput, landingRunway) {
  const patch = landingRunway.landingPatchPreviewDoNotApply ?? {};
  const lines = ownerExecutionTextLines(landingRunway);
  return !ownerInputBlank(ownerInput) &&
    selectedActionRowsMatch(ownerInput.selectedActions ?? [], patch.selectedActions ?? []) &&
    lines.length === 4 &&
    lines.every((line) => String(ownerInput.ownerExecutionText ?? "").includes(line)) &&
    safeBoundary(ownerInput) &&
    ownerInput.boundary?.recordsExtractionInstruction === false &&
    ownerInput.boundary?.modifiesCandidate === false &&
    ownerInput.boundary?.copiesRootFiles === false;
}

const NEGATIVE_BOUNDARY_REQUIREMENTS = [
  {
    id: "cleanup",
    acceptedText: ["do not authorize cleanup", "no cleanup", "cleanupauthorized=false", "不授权 cleanup"]
  },
  {
    id: "deploy",
    acceptedText: ["do not authorize deploy", "no deploy", "deployauthorized=false", "不授权 deploy"]
  },
  {
    id: "merge",
    acceptedText: ["do not authorize merge", "no merge", "mergeauthorized=false", "不授权 merge"]
  },
  {
    id: "broad-staging",
    acceptedText: ["do not authorize broad staging", "no broad staging", "不授权 broad staging"]
  },
  {
    id: "destructive-git",
    acceptedText: ["do not authorize destructive git", "no destructive git", "不授权 destructive git"]
  },
  {
    id: "physical-lifecycle-cleanup",
    acceptedText: [
      "do not authorize physical lifecycle cleanup",
      "no physical lifecycle cleanup",
      "physicalcleanupauthorized=false",
      "不授权 physical lifecycle cleanup"
    ]
  }
];

function boundaryCoverage(ownerApprovalText) {
  const normalized = normalizedText(ownerApprovalText);
  return NEGATIVE_BOUNDARY_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    covered: requirement.acceptedText.some((needle) => normalized.includes(needle))
  }));
}

function ownerApprovalTextHasNegativeBoundaries(ownerApprovalText) {
  return boundaryCoverage(ownerApprovalText).every((row) => row.covered);
}

function ownerApprovalTextCoversRows(ownerApprovalText, landingRunway) {
  if (!ownerApprovalText) return false;
  const patch = landingRunway.landingPatchPreviewDoNotApply ?? {};
  const text = String(ownerApprovalText);
  const lines = ownerExecutionTextLines(landingRunway);
  return (patch.applyToUnitIds ?? []).every((unitId) => text.includes(unitId)) &&
    (patch.selectedActions ?? []).every((row) => text.includes(`${row.unitId}:${row.selectedAction}`) ||
      text.includes(`unitId=${row.unitId}`) && text.includes(`selectedAction=${row.selectedAction}`)) &&
    text.includes(landingRunway.topCandidate?.branch ?? "") &&
    text.includes(landingRunway.topCandidate?.path ?? "") &&
    ownerApprovalTextHasNegativeBoundaries(text) &&
    lines.length === 4;
}

function sourceCurrentnessFailures({ dirtyMap, landingRunway, landingRunwayGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (landingRunway.dirtyMapStatusSignature !== expectedSignature) failures.push("landing runway dirty-map signature is stale");
  if (landingRunway.expandedStatusEntries !== expectedEntries) failures.push("landing runway expanded dirty entry count is stale");
  if (landingRunwayGate.dirtyMapStatusSignature !== expectedSignature) failures.push("landing runway gate dirty-map signature is stale");
  if (landingRunwayGate.expandedStatusEntries !== expectedEntries) failures.push("landing runway gate expanded dirty entry count is stale");
  if ((landingRunwayGate.failures ?? []).length !== 0) failures.push("landing runway gate has failures");
  const currentLandingRunway = buildA22RootParityOwnerInputLandingRunway();
  if (!sameJson(
    stableA22RootParityOwnerInputLandingRunwayProjection(landingRunway),
    stableA22RootParityOwnerInputLandingRunwayProjection(currentLandingRunway)
  )) {
    failures.push("landing runway payload is stale versus current sources");
  }
  return failures;
}

function buildProposedOwnerInput({ ownerInput, landingRunway, approvedBy, approvedAt, ownerApprovalText }) {
  const patch = landingRunway.landingPatchPreviewDoNotApply ?? {};
  const canFillOwnerFields =
    nonPlaceholder(approvedBy, "<owner>") &&
    validIsoDate(approvedAt) &&
    ownerApprovalTextCoversRows(ownerApprovalText, landingRunway);
  return {
    ...ownerInput,
    generatedAt: new Date().toISOString(),
    sourceInstructionRequestGeneratedAt: ownerInput.sourceInstructionRequestGeneratedAt ?? null,
    selectedActions: patch.selectedActions ?? [],
    ownerExecutionText: patch.ownerExecutionTextLines?.join("\n") ?? "",
    approvedBy: canFillOwnerFields ? approvedBy : "<owner>",
    approvedAt: canFillOwnerFields ? approvedAt : "<ISO-8601>",
    notes: canFillOwnerFields
      ? [
        "Owner approved A22 root-parity selectedAction owner-input recording through guarded recorder.",
        ownerApprovalText
      ].filter(Boolean).join(" ")
      : "<scope and checks>",
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    boundary: {
      ownerInputOnly: true,
      recordsOwnerInput: true,
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

function proposedOwnerFieldsPresent(proposedOwnerInput) {
  return nonPlaceholder(proposedOwnerInput.approvedBy, "<owner>") &&
    validIsoDate(proposedOwnerInput.approvedAt) &&
    nonPlaceholder(proposedOwnerInput.notes, "<scope and checks>");
}

function recordingStatus({ mode, sourceFailures, landingRunway, ownerInput, proposedOwnerInput, ownerApprovalText }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (!["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(landingRunway.runwayStatus)) {
    return "not-ready-runway";
  }
  if (ownerInputMatchesLandingPatch(ownerInput, landingRunway)) return "already-recorded";
  if (!ownerInputBlank(ownerInput)) return "not-ready-existing-owner-input-mismatch";
  if (!proposedOwnerFieldsPresent(proposedOwnerInput) || !ownerApprovalTextCoversRows(ownerApprovalText, landingRunway)) {
    return mode === "apply-owner-input"
      ? "apply-blocked-owner-approval-text"
      : "dry-run-blocked-owner-approval-text";
  }
  return mode === "apply-owner-input" ? "ready-to-apply-owner-input" : "dry-run-ready-requires-explicit-apply";
}

function buildChecks({
  mode,
  sourceFailures,
  landingRunway,
  ownerInput,
  proposedOwnerInput,
  ownerApprovalText,
  status
}) {
  const patch = landingRunway.landingPatchPreviewDoNotApply ?? {};
  const ownerInputIsBlank = ownerInputBlank(ownerInput);
  const ownerInputMatchesPatch = ownerInputMatchesLandingPatch(ownerInput, landingRunway);
  return [
    {
      id: "mode-is-explicit",
      status: mode === "dry-run" || mode === "apply-owner-input" ? "pass" : "fail",
      detail: `mode=${mode}`
    },
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "landing-runway-ready",
      status: ["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(landingRunway.runwayStatus) ? "pass" : "fail",
      detail: `runwayStatus=${landingRunway.runwayStatus}`
    },
    {
      id: "four-patch-rows",
      status: (patch.selectedActions ?? []).length === 4 && ownerExecutionTextLines(landingRunway).length === 4 ? "pass" : "fail",
      detail: `selectedActions=${(patch.selectedActions ?? []).length}; textLines=${ownerExecutionTextLines(landingRunway).length}`
    },
    {
      id: "owner-input-blank-or-already-recorded",
      status: ownerInputIsBlank || ownerInputMatchesPatch ? "pass" : "fail",
      detail: `ownerInputBlank=${ownerInputIsBlank}; ownerInputMatchesPatch=${ownerInputMatchesPatch}`
    },
    {
      id: "owner-approval-text-covers-rows",
      status: mode === "dry-run" || ownerApprovalTextCoversRows(ownerApprovalText, landingRunway) ? "pass" : "fail",
      detail: `approvalTextCoversRows=${ownerApprovalTextCoversRows(ownerApprovalText, landingRunway)}`
    },
    {
      id: "owner-approval-text-keeps-negative-boundaries",
      status: mode === "dry-run" || ownerApprovalTextHasNegativeBoundaries(ownerApprovalText) ? "pass" : "fail",
      detail: boundaryCoverage(ownerApprovalText).map((row) => `${row.id}=${row.covered}`).join("; ")
    },
    {
      id: "proposed-owner-input-safe-boundary",
      status: safeBoundary(proposedOwnerInput) &&
        proposedOwnerInput.boundary?.recordsExtractionInstruction === false &&
        proposedOwnerInput.boundary?.modifiesCandidate === false &&
        proposedOwnerInput.boundary?.copiesRootFiles === false
        ? "pass"
        : "fail",
      detail: "proposed owner input must stay non-executable and must not authorize cleanup, merge, deploy, staging, destructive Git, candidate mutation, or physical cleanup"
    },
    {
      id: "recording-status-coherent",
      status: [
        "dry-run-blocked-owner-approval-text",
        "apply-blocked-owner-approval-text",
        "dry-run-ready-requires-explicit-apply",
        "ready-to-apply-owner-input",
        "already-recorded",
        "not-ready-source-stale",
        "not-ready-runway",
        "not-ready-existing-owner-input-mismatch"
      ].includes(status) ? "pass" : "fail",
      detail: `recordingStatus=${status}`
    },
    {
      id: "apply-requires-ready-status",
      status: mode === "dry-run" || status === "ready-to-apply-owner-input" || status === "already-recorded" ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    }
  ];
}

export function buildA22RootParityOwnerInputRecordingState({
  mode = "dry-run",
  approvedBy = "",
  approvedAt = "",
  ownerApprovalText = "",
  mutationsPerformed = false
} = {}) {
  const dirtyMap = readJson(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.dirtyMap);
  const landingRunway = readJson(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.landingRunway);
  const landingRunwayGate = readJson(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.landingRunwayGate);
  const ownerInput = readJson(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.ownerInput);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, landingRunway, landingRunwayGate });
  const proposedOwnerInput = buildProposedOwnerInput({
    ownerInput,
    landingRunway,
    approvedBy,
    approvedAt,
    ownerApprovalText
  });
  const status = recordingStatus({
    mode,
    sourceFailures,
    landingRunway,
    ownerInput,
    proposedOwnerInput,
    ownerApprovalText
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    landingRunway,
    ownerInput,
    proposedOwnerInput,
    ownerApprovalText,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const recorderStatus = failedChecks.length === 0 ? status : "not-ready-check-failures";
  const applyPermitted = mode === "apply-owner-input" && recorderStatus === "ready-to-apply-owner-input";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    recorderKind: "a22-root-parity-owner-input-recording",
    mode,
    recorderStatus,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      landingRunwayGeneratedAt: landingRunway.generatedAt,
      landingRunwayGateFailureCount: (landingRunwayGate.failures ?? []).length,
      ownerInputGeneratedAt: ownerInput.generatedAt ?? null
    },
    sourceCurrentnessFailures: sourceFailures,
    targetInputFile: A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.ownerInput,
    topCandidate: landingRunway.topCandidate ?? {},
    patchUnitIds: landingRunway.landingPatchPreviewDoNotApply?.applyToUnitIds ?? [],
    existingOwnerInputBlank: ownerInputBlank(ownerInput),
    existingOwnerInputMatchesPatch: ownerInputMatchesLandingPatch(ownerInput, landingRunway),
    proposedOwnerInputDoNotApply: proposedOwnerInput,
    recordingChecks: checks,
    summary: {
      mode,
      recorderStatus,
      patchRows: landingRunway.summary?.patchRows ?? 0,
      ownerExecutionTextRows: ownerExecutionTextLines(landingRunway).length,
      ownerApprovalFieldsPresent: proposedOwnerFieldsPresent(proposedOwnerInput),
      ownerApprovalTextCoversRows: ownerApprovalTextCoversRows(ownerApprovalText, landingRunway),
      ownerApprovalTextHasNegativeBoundaries: ownerApprovalTextHasNegativeBoundaries(ownerApprovalText),
      ownerApprovalTextBoundaryCoverage: boundaryCoverage(ownerApprovalText),
      recordingChecks: checks.length,
      passingRecordingChecks: checks.length - failedChecks.length,
      failedRecordingChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-owner-input",
      applyPermitted,
      mutationsPerformed,
      recordsOwnerInputRows: mutationsPerformed ? landingRunway.summary?.patchRows ?? 0 : 0,
      recordsExtractionInstructionRows: 0,
      modifiesCandidateRows: 0,
      rootCopyRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      recordsOwnerInput: mutationsPerformed,
      appliesOwnerInputPatch: mutationsPerformed,
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
      requiresExplicitApplyOwnerInputFlag: true,
      requiresOwnerApprovalTextCoveringAllRows: true,
      requiresOwnerApprovalTextNegativeBoundaries: true,
      requiresSeparateExtractionInstructionRecording: true,
      requiresSeparateCandidateExtractionStep: true
    },
    nextOwnerInputPreview: applyPermitted ? proposedOwnerInput : null
  };
}

export function stableA22RootParityOwnerInputRecordingProjection(payload) {
  const proposed = payload.proposedOwnerInputDoNotApply ?? {};
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
    topCandidate: payload.topCandidate,
    patchUnitIds: payload.patchUnitIds,
    existingOwnerInputBlank: payload.existingOwnerInputBlank,
    existingOwnerInputMatchesPatch: payload.existingOwnerInputMatchesPatch,
    proposedOwnerInputDoNotApply: {
      ...proposed,
      generatedAt: "<stable-projection>"
    },
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
  const rows = (payload.proposedOwnerInputDoNotApply.selectedActions ?? []).map((row, index) =>
    `| ${index + 1} | \`${cell(row.unitId)}\` | ${cell((row.primaryOwnerIds ?? []).join(","))} | \`${cell(row.selectedAction)}\` | \`${cell(row.rootSource)}\` | \`${cell(row.candidateTarget)}\` |`
  ).join("\n") || "| 0 | none | none | none | none | none |";

  return `# A22 Root-Parity Owner Input Recording ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Recorder status: \`${payload.recorderStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-owner-input mode can update only \`${payload.targetInputFile}\`, and only after explicit owner approval text covers all four A22 selectedAction rows and preserves the no-cleanup/no-deploy/no-merge boundary. It never records extraction instructions, mutates the candidate, copies root files, runs type-check/build/regression, stages, commits, merges, deploys, or authorizes cleanup.

## Summary

- Patch rows: ${payload.summary.patchRows}
- Owner execution text rows: ${payload.summary.ownerExecutionTextRows}
- Existing owner input blank: ${payload.existingOwnerInputBlank}
- Existing owner input matches patch: ${payload.existingOwnerInputMatchesPatch}
- Owner approval fields present: ${payload.summary.ownerApprovalFieldsPresent}
- Owner approval text covers rows: ${payload.summary.ownerApprovalTextCoversRows}
- Owner approval text keeps negative boundaries: ${payload.summary.ownerApprovalTextHasNegativeBoundaries}
- Recording checks: ${payload.summary.passingRecordingChecks}/${payload.summary.recordingChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Records owner-input rows: ${payload.summary.recordsOwnerInputRows}
- Records extraction-instruction rows: ${payload.summary.recordsExtractionInstructionRows}
- Modifies candidate rows: ${payload.summary.modifiesCandidateRows}
- Root copy rows: ${payload.summary.rootCopyRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Proposed Owner Input Rows Do Not Apply

| # | Unit ID | Primary owners | Selected action | Root source | Candidate target |
| ---: | --- | --- | --- | --- | --- |
${rows}

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner input: ${payload.boundary.recordsOwnerInput}
- Applies owner input patch: ${payload.boundary.appliesOwnerInputPatch}
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
- Requires explicit apply-owner-input flag: true
- Requires owner approval text covering all rows: true
- Requires owner approval text negative boundaries: true
- Requires separate extraction instruction recording: true
- Requires separate candidate extraction step: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-owner-input") {
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestApplyJson, json);
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestApplyMarkdown, md);
  } else {
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunJson, json);
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.datedDryRunJson, json);
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.latestDryRunMarkdown, md);
    write(A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-owner-input");
  const mode = apply ? "apply-owner-input" : "dry-run";
  const approvedBy = getArgValue("--approved-by");
  const approvedAt = getArgValue("--approved-at");
  const ownerApprovalText = getArgValue("--owner-approval-text");
  let payload = buildA22RootParityOwnerInputRecordingState({
    mode,
    approvedBy,
    approvedAt,
    ownerApprovalText
  });
  if (apply) {
    if (payload.summary.applyPermitted !== true || !payload.nextOwnerInputPreview) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        recorderStatus: payload.recorderStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        recordsOwnerInputRows: payload.summary.recordsOwnerInputRows,
        recordsExtractionInstructionRows: payload.summary.recordsExtractionInstructionRows,
        modifiesCandidateRows: payload.summary.modifiesCandidateRows,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    write(
      A22_ROOT_PARITY_OWNER_INPUT_RECORDING_PATHS.ownerInput,
      `${JSON.stringify(payload.nextOwnerInputPreview, null, 2)}\n`
    );
    payload = buildA22RootParityOwnerInputRecordingState({
      mode,
      approvedBy,
      approvedAt,
      ownerApprovalText,
      mutationsPerformed: true
    });
  }
  persist(payload);
  console.log(JSON.stringify({
    mode,
    recorderStatus: payload.recorderStatus,
    patchRows: payload.summary.patchRows,
    ownerExecutionTextRows: payload.summary.ownerExecutionTextRows,
    ownerApprovalFieldsPresent: payload.summary.ownerApprovalFieldsPresent,
    ownerApprovalTextCoversRows: payload.summary.ownerApprovalTextCoversRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    recordsOwnerInputRows: payload.summary.recordsOwnerInputRows,
    recordsExtractionInstructionRows: payload.summary.recordsExtractionInstructionRows,
    modifiesCandidateRows: payload.summary.modifiesCandidateRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
