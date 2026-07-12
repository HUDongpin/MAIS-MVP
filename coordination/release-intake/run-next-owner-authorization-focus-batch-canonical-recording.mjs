#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_PREVIEW_PATHS,
  buildNextOwnerAuthorizationFocusBatchCanonicalPreview,
  stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection
} from "./generate-next-owner-authorization-focus-batch-canonical-preview.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  canonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  canonicalPreviewGate: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview-current-gate.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  canonicalAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  latestDryRunJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-apply.md"
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

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] ?? "";
}

function nonPlaceholder(value, placeholder) {
  return typeof value === "string" && value.trim().length > 0 && value !== placeholder;
}

function validIsoDate(value) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function byApprovalId(rows) {
  return new Map((rows ?? []).filter((row) => row.approvalId).map((row) => [row.approvalId, row]));
}

function sourceCurrentnessFailures({ dirtyMap, canonicalPreview, canonicalPreviewGate, canonicalAuthorizations, canonicalAuthorizationsGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (canonicalPreview.dirtyMapStatusSignature !== expectedSignature) failures.push("canonical preview dirty-map signature is stale");
  if (canonicalPreview.expandedStatusEntries !== expectedEntries) failures.push("canonical preview expanded dirty entry count is stale");
  if (canonicalPreviewGate.dirtyMapStatusSignature !== expectedSignature) failures.push("canonical preview gate dirty-map signature is stale");
  if (canonicalPreviewGate.expandedStatusEntries !== expectedEntries) failures.push("canonical preview gate expanded dirty entry count is stale");
  if ((canonicalPreviewGate.failures ?? []).length !== 0) failures.push("canonical preview gate has failures");
  if (canonicalAuthorizations.dirtyMapStatusSignature !== expectedSignature) failures.push("canonical authorizations dirty-map signature is stale");
  if (canonicalAuthorizations.expandedStatusEntries !== expectedEntries) failures.push("canonical authorizations expanded dirty entry count is stale");
  if (canonicalAuthorizationsGate.dirtyMapStatusSignature !== expectedSignature) failures.push("canonical authorizations gate dirty-map signature is stale");
  if (canonicalAuthorizationsGate.expandedStatusEntries !== expectedEntries) failures.push("canonical authorizations gate expanded dirty entry count is stale");
  if ((canonicalAuthorizationsGate.failures ?? []).length !== 0) failures.push("canonical authorizations gate has failures");
  const currentPreview = buildNextOwnerAuthorizationFocusBatchCanonicalPreview();
  if (!sameJson(
    stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection(canonicalPreview),
    stableNextOwnerAuthorizationFocusBatchCanonicalPreviewProjection(currentPreview)
  )) {
    failures.push("canonical preview payload is stale versus current sources");
  }
  return failures;
}

function targetAuthorizationRows(canonicalAuthorizations, approvalIds) {
  const ids = new Set(approvalIds ?? []);
  return (canonicalAuthorizations.authorizations ?? []).filter((row) => ids.has(row.approvalId));
}

function nonTargetAuthorizationRows(canonicalAuthorizations, approvalIds) {
  const ids = new Set(approvalIds ?? []);
  return (canonicalAuthorizations.authorizations ?? []).filter((row) => !ids.has(row.approvalId));
}

function nonTargetDraftRows(canonicalAuthorizations, approvalIds) {
  const ids = new Set(approvalIds ?? []);
  return (canonicalAuthorizations.draftAuthorizationsDoNotAuthorize ?? []).filter((row) => !ids.has(row.approvalId));
}

const NEGATIVE_AUTHORIZATION_REQUIREMENTS = [
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
    id: "destructive-git",
    acceptedText: ["do not authorize destructive git", "no destructive git", "destructivegitauthorized=false", "不授权 destructive git"]
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

function normalizedText(value) {
  return String(value ?? "").toLowerCase();
}

function ownerApprovalTextBoundaryCoverage(ownerApprovalText) {
  const normalized = normalizedText(ownerApprovalText);
  return NEGATIVE_AUTHORIZATION_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    covered: requirement.acceptedText.some((needle) => normalized.includes(needle))
  }));
}

function ownerApprovalTextHasNegativeBoundaries(ownerApprovalText) {
  return ownerApprovalTextBoundaryCoverage(ownerApprovalText).every((row) => row.covered);
}

function ownerApprovalTextCoversRows(ownerApprovalText, approvalIds) {
  if (!ownerApprovalText) return false;
  if (!ownerApprovalText.includes("selectedFinalState=reviewed commit")) return false;
  if (!ownerApprovalTextHasNegativeBoundaries(ownerApprovalText)) return false;
  return (approvalIds ?? []).every((approvalId) => ownerApprovalText.includes(approvalId));
}

function buildProposedRows({ previewRows, approvedBy, approvedAt, ownerApprovalText }) {
  const approvalIds = previewRows.map((row) => row.approvalId);
  const canFillOwnerFields =
    nonPlaceholder(approvedBy, "<owner>") &&
    validIsoDate(approvedAt) &&
    ownerApprovalTextCoversRows(ownerApprovalText, approvalIds);
  return previewRows.map((row) => {
    const preview = row.previewAuthorizationRow ?? {};
    if (!canFillOwnerFields) return preview;
    const notes = [
      preview.notes,
      "Owner approval text recorded by guarded canonical recorder.",
      ownerApprovalText
    ].filter(Boolean).join(" ");
    return {
      ...preview,
      approvedBy,
      approvedAt,
      notes,
      authorizationText: String(preview.authorizationText ?? "")
        .replaceAll("approvedBy=<owner>", `approvedBy=${approvedBy}`)
        .replaceAll("approvedAt=<ISO-8601>", `approvedAt=${approvedAt}`),
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function rowHasOwnerPlaceholders(row) {
  return row.approvedBy === "<owner>" ||
    row.approvedAt === "<ISO-8601>" ||
    !nonPlaceholder(row.approvedBy, "<owner>") ||
    !validIsoDate(row.approvedAt);
}

function recordingStatus({ mode, sourceFailures, preview, proposedRows, existingRows, partialRows, ownerApprovalText, approvalIds }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (partialRows.length > 0) return "not-ready-partial-existing-authorizations";
  if (existingRows.length >= (preview.previewRows ?? []).length && existingRows.length > 0) return "already-recorded";
  if (preview.previewStatus === "no-pending-focus-rows") return "no-pending-focus-rows";
  if (preview.previewStatus !== "ready-for-owner-review") return "not-ready-preview";
  if (proposedRows.some(rowHasOwnerPlaceholders) || !ownerApprovalTextCoversRows(ownerApprovalText, approvalIds)) {
    return mode === "apply-recording"
      ? "apply-blocked-owner-approval-placeholders"
      : "dry-run-blocked-owner-approval-placeholders";
  }
  return mode === "apply-recording" ? "ready-to-apply-recording" : "dry-run-ready-requires-explicit-apply";
}

function buildChecks({ mode, sourceFailures, preview, proposedRows, existingRows, partialRows, status, ownerApprovalText, approvalIds }) {
  const noPendingFocusRows = preview.previewStatus === "no-pending-focus-rows";
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
      id: "preview-rows-match-current-focus-batch",
      status: noPendingFocusRows || (preview.previewRows ?? []).length === (preview.summary?.pendingRows ?? (preview.previewRows ?? []).length) ? "pass" : "fail",
      detail: `previewRows=${(preview.previewRows ?? []).length}; pendingRows=${preview.summary?.pendingRows ?? "unknown"}; previewStatus=${preview.previewStatus ?? "unknown"}`
    },
    {
      id: "no-partial-existing-authorizations",
      status: partialRows.length === 0 ? "pass" : "fail",
      detail: `existingTargetRows=${existingRows.length}`
    },
    {
      id: "owner-approval-text-covers-rows",
      status: ownerApprovalTextCoversRows(ownerApprovalText, approvalIds) || mode === "dry-run" ? "pass" : "fail",
      detail: `approvalTextCoversRows=${ownerApprovalTextCoversRows(ownerApprovalText, approvalIds)}`
    },
    {
      id: "owner-approval-text-keeps-negative-boundaries",
      status: ownerApprovalTextHasNegativeBoundaries(ownerApprovalText) || mode === "dry-run" ? "pass" : "fail",
      detail: ownerApprovalTextBoundaryCoverage(ownerApprovalText)
        .map((row) => `${row.id}=${row.covered}`)
        .join("; ")
    },
    {
      id: "proposed-rows-safe-boundary",
      status: proposedRows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) ? "pass" : "fail",
      detail: "proposed authorization rows must not authorize cleanup or execution"
    },
    {
      id: "recording-status-coherent",
      status: [
        "dry-run-blocked-owner-approval-placeholders",
        "apply-blocked-owner-approval-placeholders",
        "dry-run-ready-requires-explicit-apply",
        "ready-to-apply-recording",
        "already-recorded",
        "no-pending-focus-rows",
        "not-ready-source-stale",
        "not-ready-preview",
        "not-ready-partial-existing-authorizations"
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

function buildRecordedAuthorizations({ canonicalAuthorizations, preview, proposedRows }) {
  const approvalIds = (preview.previewRows ?? []).map((row) => row.approvalId);
  const nextAuthorizations = [
    ...nonTargetAuthorizationRows(canonicalAuthorizations, approvalIds),
    ...proposedRows
  ];
  const nextDrafts = nonTargetDraftRows(canonicalAuthorizations, approvalIds);
  return {
    ...canonicalAuthorizations,
    generatedAt: new Date().toISOString(),
    note: "A25 recorded owner-package focus-batch canonical authorization rows from an explicit owner approval through the guarded recorder. This file still does not authorize merge, cleanup, deploy, destructive Git, or physical lifecycle actions by itself.",
    authorizations: nextAuthorizations,
    draftAuthorizationsDoNotAuthorize: nextDrafts,
    cleanupAuthorized: false,
    executableNow: false
  };
}

export function buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState({
  mode = "dry-run",
  approvedBy = "",
  approvedAt = "",
  ownerApprovalText = "",
  mutationsPerformed = false
} = {}) {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.dirtyMap);
  const canonicalPreview = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalPreview);
  const canonicalPreviewGate = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalPreviewGate);
  const canonicalAuthorizations = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalAuthorizations);
  const canonicalAuthorizationsGate = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalAuthorizationsGate);
  const approvalIds = (canonicalPreview.previewRows ?? []).map((row) => row.approvalId);
  const existingRows = targetAuthorizationRows(canonicalAuthorizations, approvalIds);
  const partialRows = existingRows.length > 0 && existingRows.length < approvalIds.length ? existingRows : [];
  const proposedRows = buildProposedRows({
    previewRows: canonicalPreview.previewRows ?? [],
    approvedBy,
    approvedAt,
    ownerApprovalText
  });
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    canonicalPreview,
    canonicalPreviewGate,
    canonicalAuthorizations,
    canonicalAuthorizationsGate
  });
  const status = recordingStatus({
    mode,
    sourceFailures,
    preview: canonicalPreview,
    proposedRows,
    existingRows,
    partialRows,
    ownerApprovalText,
    approvalIds
  });
  const checks = buildChecks({
    mode,
    sourceFailures,
    preview: canonicalPreview,
    proposedRows,
    existingRows,
    partialRows,
    status,
    ownerApprovalText,
    approvalIds
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const recorderStatus = failedChecks.length === 0 ? status : "not-ready-check-failures";
  const applyPermitted = mode === "apply-recording" && recorderStatus === "ready-to-apply-recording";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    recorderKind: "next-owner-authorization-focus-batch-canonical-recording",
    mode,
    recorderStatus,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      canonicalPreviewGeneratedAt: canonicalPreview.generatedAt,
      canonicalPreviewGateFailureCount: (canonicalPreviewGate.failures ?? []).length,
      canonicalAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      canonicalAuthorizationsGateFailureCount: (canonicalAuthorizationsGate.failures ?? []).length
    },
    sourceCurrentnessFailures: sourceFailures,
    targetInputFile: NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalAuthorizations,
    approvalIds,
    existingAuthorizationRows: existingRows,
    proposedAuthorizationRowsDoNotApply: proposedRows,
    recordingChecks: checks,
    summary: {
      mode,
      recorderStatus,
      approvalRows: approvalIds.length,
      existingAuthorizationRows: existingRows.length,
      proposedAuthorizationRows: proposedRows.length,
      ownerApprovalFieldsPresent: proposedRows.filter((row) => !rowHasOwnerPlaceholders(row)).length,
      ownerApprovalTextCoversRows: ownerApprovalTextCoversRows(ownerApprovalText, approvalIds),
      ownerApprovalTextHasNegativeBoundaries: ownerApprovalTextHasNegativeBoundaries(ownerApprovalText),
      ownerApprovalTextBoundaryCoverage: ownerApprovalTextBoundaryCoverage(ownerApprovalText),
      recordingChecks: checks.length,
      passingRecordingChecks: checks.length - failedChecks.length,
      failedRecordingChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      applyRequested: mode === "apply-recording",
      applyPermitted,
      mutationsPerformed,
      recordsAuthorizationRows: mutationsPerformed ? proposedRows.length : 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      recordsOwnerApproval: mutationsPerformed,
      promotesCanonicalRows: mutationsPerformed,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresExplicitApplyRecordingFlag: true,
      requiresOwnerApprovalTextCoveringAllRows: true,
      requiresOwnerApprovalTextNegativeBoundaries: true
    },
    nextCanonicalAuthorizationsPreview: applyPermitted
      ? buildRecordedAuthorizations({ canonicalAuthorizations, preview: canonicalPreview, proposedRows })
      : null
  };
}

export function stableNextOwnerAuthorizationFocusBatchCanonicalRecordingProjection(payload) {
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
    approvalIds: payload.approvalIds,
    existingAuthorizationRows: payload.existingAuthorizationRows,
    proposedAuthorizationRowsDoNotApply: payload.proposedAuthorizationRowsDoNotApply,
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
  const proposals = payload.proposedAuthorizationRowsDoNotApply.map((row, index) =>
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${cell(row.selectedFinalState)} | ${cell(row.approvedBy)} | ${cell(row.approvedAt)} | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  ).join("\n") || "| 0 | none | none | none | none | none | no | no |";
  return `# A25 Next Owner Authorization Focus Batch Canonical Recording ${payload.mode === "dry-run" ? "Dry Run" : "Apply Report"}

Generated: ${payload.generatedAt}

Mode: \`${payload.mode}\`

Recorder status: \`${payload.recorderStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only \`${payload.targetInputFile}\`, and only after explicit owner approval fields and owner approval text cover every focus-batch row. It never records execution instructions, executes cleanup, performs Git operations, merges, pushes, or deploys.

## Summary

- Approval rows: ${payload.summary.approvalRows}
- Existing authorization rows: ${payload.summary.existingAuthorizationRows}
- Proposed authorization rows not applied: ${payload.summary.proposedAuthorizationRows}
- Owner approval fields present: ${payload.summary.ownerApprovalFieldsPresent}
- Owner approval text covers rows: ${payload.summary.ownerApprovalTextCoversRows}
- Owner approval text keeps negative boundaries: ${payload.summary.ownerApprovalTextHasNegativeBoundaries}
- Recording checks: ${payload.summary.passingRecordingChecks}/${payload.summary.recordingChecks}
- Apply requested: ${payload.summary.applyRequested}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Records authorization rows: ${payload.summary.recordsAuthorizationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Proposed Authorization Rows Do Not Apply

| # | Approval ID | Owner | Selected final state | approvedBy | approvedAt | Cleanup authorized | Executable |
| ---: | --- | --- | --- | --- | --- | --- | --- |
${proposals}

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Records owner approval: ${payload.boundary.recordsOwnerApproval}
- Promotes canonical rows: ${payload.boundary.promotesCanonicalRows}
- Records execution instruction: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply-recording flag: true
- Requires owner approval text covering all rows: true
- Requires owner approval text negative boundaries: true
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  if (payload.mode === "apply-recording") {
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestApplyJson, json);
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestApplyMarkdown, md);
  } else {
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunJson, json);
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.datedDryRunJson, json);
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.latestDryRunMarkdown, md);
    write(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.datedDryRunMarkdown, md);
  }
}

function main() {
  const apply = process.argv.includes("--apply-recording");
  const mode = apply ? "apply-recording" : "dry-run";
  const approvedBy = getArgValue("--approved-by");
  const approvedAt = getArgValue("--approved-at");
  const ownerApprovalText = getArgValue("--owner-approval-text");
  let payload = buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState({
    mode,
    approvedBy,
    approvedAt,
    ownerApprovalText
  });
  if (apply) {
    if (payload.summary.applyPermitted !== true || !payload.nextCanonicalAuthorizationsPreview) {
      persist(payload);
      console.log(JSON.stringify({
        mode,
        recorderStatus: payload.recorderStatus,
        applyPermitted: payload.summary.applyPermitted,
        mutationsPerformed: payload.summary.mutationsPerformed,
        recordsAuthorizationRows: payload.summary.recordsAuthorizationRows,
        cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
        executableRows: payload.summary.executableRows
      }, null, 2));
      process.exit(1);
    }
    write(
      NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_CANONICAL_RECORDING_PATHS.canonicalAuthorizations,
      `${JSON.stringify(payload.nextCanonicalAuthorizationsPreview, null, 2)}\n`
    );
    payload = buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState({
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
    approvalRows: payload.summary.approvalRows,
    existingAuthorizationRows: payload.summary.existingAuthorizationRows,
    proposedAuthorizationRows: payload.summary.proposedAuthorizationRows,
    ownerApprovalFieldsPresent: payload.summary.ownerApprovalFieldsPresent,
    ownerApprovalTextCoversRows: payload.summary.ownerApprovalTextCoversRows,
    applyPermitted: payload.summary.applyPermitted,
    mutationsPerformed: payload.summary.mutationsPerformed,
    recordsAuthorizationRows: payload.summary.recordsAuthorizationRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
