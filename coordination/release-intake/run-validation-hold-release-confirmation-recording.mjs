#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
  VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS,
  buildValidationHoldReleaseConfirmationScaffold,
  stableValidationHoldReleaseConfirmationScaffoldProjection
} from "./generate-validation-hold-release-confirmation-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  scaffold: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestJson,
  scaffoldGate: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-scaffold-current-gate.json",
  ownerConfirmationInput: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput,
  ownerConfirmationRecord: "coordination/release-intake/latest-A25-validation-hold-release-owner-confirmation-record.json",
  latestDryRunJson: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-dry-run.json",
  latestDryRunMarkdown: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-dry-run.md",
  datedDryRunJson: `coordination/release-intake/${date}-A25-validation-hold-release-confirmation-recording-dry-run.json`,
  datedDryRunMarkdown: `coordination/release-intake/${date}-A25-validation-hold-release-confirmation-recording-dry-run.md`,
  latestApplyJson: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-apply.json",
  latestApplyMarkdown: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-apply.md"
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

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function sourceCurrentnessFailures({ dirtyMap, scaffold, scaffoldGate }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  if (scaffold.dirtyMapStatusSignature !== expectedSignature) failures.push("validation-hold scaffold dirty-map signature is stale");
  if (scaffold.expandedStatusEntries !== expectedEntries) failures.push("validation-hold scaffold expanded dirty entry count is stale");
  if (scaffoldGate.dirtyMapStatusSignature !== expectedSignature) failures.push("validation-hold scaffold gate dirty-map signature is stale");
  if (scaffoldGate.expandedStatusEntries !== expectedEntries) failures.push("validation-hold scaffold gate expanded dirty entry count is stale");
  if ((scaffoldGate.failures ?? []).length !== 0) failures.push("validation-hold scaffold gate has failures");
  const currentScaffold = buildValidationHoldReleaseConfirmationScaffold();
  if (!sameJson(
    stableValidationHoldReleaseConfirmationScaffoldProjection(scaffold),
    stableValidationHoldReleaseConfirmationScaffoldProjection(currentScaffold)
  )) {
    failures.push("validation-hold scaffold payload is stale versus current sources");
  }
  return failures;
}

function buildRecord({ scaffold, ownerInput }) {
  return {
    recordedAt: new Date().toISOString(),
    recordKind: "a25-validation-hold-release-owner-confirmation-record",
    dirtyMapStatusSignature: scaffold.dirtyMapStatusSignature,
    expandedStatusEntries: scaffold.expandedStatusEntries,
    sourceScaffold: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffold,
    sourceScaffoldGate: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffoldGate,
    sourceOwnerConfirmationInput: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationInput,
    validationHold: scaffold.validationHold,
    ownerConfirmation: {
      ownerConfirmed: ownerInput.ownerConfirmed === true,
      confirmationText: ownerInput.confirmationText,
      activeWorktreePath: ownerInput.activeWorktreePath,
      scope: ownerInput.scope,
      confirmedBy: ownerInput.confirmedBy,
      confirmedAt: ownerInput.confirmedAt,
      mergeAuthorized: ownerInput.mergeAuthorized === true,
      cleanupAuthorized: ownerInput.cleanupAuthorized === true,
      deployAuthorized: ownerInput.deployAuthorized === true,
      destructiveGitAuthorized: ownerInput.destructiveGitAuthorized === true,
      physicalLifecycleCleanupAuthorized: ownerInput.physicalLifecycleCleanupAuthorized === true,
      notes: ownerInput.notes ?? ""
    },
    boundary: {
      recordsOwnerConfirmation: true,
      releasesValidationHold: false,
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresSeparateValidationHoldReleaseGate: true
    }
  };
}

function recordingStatus({ mode, sourceFailures, scaffold, recordMatchesCurrent }) {
  const ownerConfirmation = scaffold.ownerConfirmation ?? {};
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (recordMatchesCurrent) return "already-recorded";
  if (ownerConfirmation.inputFilePresent !== true) {
    return mode === "apply-recording"
      ? "apply-blocked-owner-confirmation-input"
      : "dry-run-blocked-owner-confirmation-input";
  }
  if (ownerConfirmation.confirmationAccepted !== true || (ownerConfirmation.validationFailures ?? []).length > 0) {
    return mode === "apply-recording"
      ? "apply-blocked-owner-confirmation-invalid"
      : "dry-run-blocked-owner-confirmation-invalid";
  }
  if (ownerConfirmation.releaseReviewReady !== true) {
    return mode === "apply-recording"
      ? "apply-blocked-release-review-not-ready"
      : "dry-run-blocked-release-review-not-ready";
  }
  return mode === "apply-recording" ? "ready-to-apply-recording" : "dry-run-ready-requires-explicit-apply";
}

function buildChecks({ mode, sourceFailures, scaffold, status, recordMatchesCurrent }) {
  const ownerConfirmation = scaffold.ownerConfirmation ?? {};
  const summary = scaffold.summary ?? {};
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
      id: "owner-confirmation-input-status-coherent",
      status: ownerConfirmation.inputFilePresent === true || status.includes("owner-confirmation-input") || recordMatchesCurrent ? "pass" : "fail",
      detail: `inputFilePresent=${ownerConfirmation.inputFilePresent === true}; status=${status}`
    },
    {
      id: "owner-confirmation-accepted-or-blocked",
      status: ownerConfirmation.confirmationAccepted === true || status.includes("blocked-owner-confirmation") || recordMatchesCurrent ? "pass" : "fail",
      detail: `confirmationAccepted=${ownerConfirmation.confirmationAccepted === true}; validationFailures=${(ownerConfirmation.validationFailures ?? []).length}`
    },
    {
      id: "release-review-ready-or-blocked",
      status: ownerConfirmation.releaseReviewReady === true || status.includes("blocked") || recordMatchesCurrent ? "pass" : "fail",
      detail: `releaseReviewReady=${ownerConfirmation.releaseReviewReady === true}; status=${status}`
    },
    {
      id: "required-owner-confirmation-text-exact",
      status: ownerConfirmation.requiredConfirmationTextZh === REQUIRED_OWNER_CONFIRMATION_TEXT_ZH ? "pass" : "fail",
      detail: "required owner confirmation text must remain exact"
    },
    {
      id: "recording-never-releases-validation-hold",
      status: ownerConfirmation.validationHoldReleased === false && summary.validationHoldReleased === false ? "pass" : "fail",
      detail: "recording may only record owner confirmation, never release the hold"
    },
    {
      id: "safe-boundary-no-cleanup-merge-deploy",
      status: (summary.cleanupAuthorizedRows ?? 0) === 0 && (summary.executableRows ?? 0) === 0 ? "pass" : "fail",
      detail: `cleanupAuthorizedRows=${summary.cleanupAuthorizedRows ?? 0}; executableRows=${summary.executableRows ?? 0}`
    },
    {
      id: "apply-requires-explicit-recording-flag",
      status: mode === "dry-run" || status === "ready-to-apply-recording" || status === "already-recorded" || status.startsWith("apply-blocked") ? "pass" : "fail",
      detail: `mode=${mode}; status=${status}`
    },
    {
      id: "record-status-coherent",
      status: [
        "dry-run-blocked-owner-confirmation-input",
        "dry-run-blocked-owner-confirmation-invalid",
        "dry-run-blocked-release-review-not-ready",
        "dry-run-ready-requires-explicit-apply",
        "apply-blocked-owner-confirmation-input",
        "apply-blocked-owner-confirmation-invalid",
        "apply-blocked-release-review-not-ready",
        "ready-to-apply-recording",
        "already-recorded"
      ].includes(status) ? "pass" : "fail",
      detail: `status=${status}`
    }
  ];
}

export function buildValidationHoldReleaseConfirmationRecordingState({ mode = "dry-run" } = {}) {
  const artifacts = {
    dirtyMap: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.dirtyMap),
    scaffold: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffold),
    scaffoldGate: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffoldGate)
  };
  const ownerInput = exists(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationInput)
    ? readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationInput)
    : null;
  const sourceFailures = sourceCurrentnessFailures(artifacts);
  const proposedRecord = artifacts.scaffold.ownerConfirmation?.confirmationAccepted === true && ownerInput
    ? buildRecord({ scaffold: artifacts.scaffold, ownerInput })
    : null;
  const existingRecord = exists(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord)
    ? readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord)
    : null;
  const recordMatchesCurrent = proposedRecord
    ? sameJson(stableOwnerConfirmationRecordProjection(existingRecord), stableOwnerConfirmationRecordProjection(proposedRecord))
    : false;
  const status = recordingStatus({
    mode,
    sourceFailures,
    scaffold: artifacts.scaffold,
    recordMatchesCurrent
  });
  const applyPermitted = mode === "apply-recording" && status === "ready-to-apply-recording";
  const checks = buildChecks({
    mode,
    sourceFailures,
    scaffold: artifacts.scaffold,
    status,
    recordMatchesCurrent
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    recorderKind: "a25-validation-hold-release-confirmation-recording",
    mode,
    recorderStatus: status,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: {
      dirtyMap: {
        path: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.dirtyMap,
        dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
        expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap)
      },
      scaffold: {
        path: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffold,
        dirtyMapStatusSignature: artifacts.scaffold.dirtyMapStatusSignature,
        expandedStatusEntries: artifacts.scaffold.expandedStatusEntries
      },
      scaffoldGate: {
        path: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.scaffoldGate,
        dirtyMapStatusSignature: artifacts.scaffoldGate.dirtyMapStatusSignature,
        expandedStatusEntries: artifacts.scaffoldGate.expandedStatusEntries
      }
    },
    sourceCurrentnessFailures: sourceFailures,
    targetOwnerConfirmationInputFile: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationInput,
    targetOwnerConfirmationRecordFile: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord,
    ownerConfirmation: {
      inputFilePresent: artifacts.scaffold.ownerConfirmation?.inputFilePresent === true,
      confirmationAccepted: artifacts.scaffold.ownerConfirmation?.confirmationAccepted === true,
      validationFailures: artifacts.scaffold.ownerConfirmation?.validationFailures ?? [],
      releaseReviewReady: artifacts.scaffold.ownerConfirmation?.releaseReviewReady === true,
      validationHoldReleased: false,
      requiredConfirmationTextZh: REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
      recordedConfirmationText: artifacts.scaffold.ownerConfirmation?.recordedConfirmationText ?? "",
      activeWorktreePath: artifacts.scaffold.validationHold?.activeWorktreePath ?? ""
    },
    proposedOwnerConfirmationRecordDoNotApply: proposedRecord,
    existingRecordPresent: Boolean(existingRecord),
    existingRecordMatchesCurrent: recordMatchesCurrent,
    recordingChecks: checks,
    summary: {
      applyRequested: mode === "apply-recording",
      applyPermitted,
      mutationsPerformed: false,
      recordsOwnerConfirmationRows: 0,
      ownerConfirmationInputPresent: artifacts.scaffold.ownerConfirmation?.inputFilePresent === true,
      ownerConfirmationAccepted: artifacts.scaffold.ownerConfirmation?.confirmationAccepted === true,
      releaseReviewReady: artifacts.scaffold.ownerConfirmation?.releaseReviewReady === true,
      validationHoldReleased: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedRecordingChecks: failedChecks
    },
    boundary: {
      evidenceOnly: mode === "dry-run",
      dryRunOnly: mode === "dry-run",
      recordsOwnerConfirmation: false,
      releasesValidationHold: false,
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresExplicitApplyRecordingFlag: true,
      requiresExactOwnerConfirmationText: true,
      requiresSeparateValidationHoldReleaseGate: true
    }
  };
}

export function stableOwnerConfirmationRecordProjection(payload) {
  if (!payload) return null;
  return {
    recordKind: payload.recordKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceScaffold: payload.sourceScaffold,
    sourceScaffoldGate: payload.sourceScaffoldGate,
    sourceOwnerConfirmationInput: payload.sourceOwnerConfirmationInput,
    validationHold: payload.validationHold,
    ownerConfirmation: payload.ownerConfirmation,
    boundary: payload.boundary
  };
}

export function stableValidationHoldReleaseConfirmationRecordingProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    recorderKind: payload.recorderKind,
    mode: payload.mode,
    recorderStatus: payload.recorderStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetOwnerConfirmationInputFile: payload.targetOwnerConfirmationInputFile,
    targetOwnerConfirmationRecordFile: payload.targetOwnerConfirmationRecordFile,
    ownerConfirmation: payload.ownerConfirmation,
    proposedOwnerConfirmationRecordDoNotApply: stableOwnerConfirmationRecordProjection(payload.proposedOwnerConfirmationRecordDoNotApply),
    existingRecordPresent: payload.existingRecordPresent,
    existingRecordMatchesCurrent: payload.existingRecordMatchesCurrent,
    recordingChecks: payload.recordingChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const checks = payload.recordingChecks
    .map((row) => `| \`${row.id}\` | \`${row.status}\` | ${String(row.detail ?? "").replaceAll("|", "\\|")} |`)
    .join("\n");
  const validationFailures = payload.ownerConfirmation.validationFailures.length
    ? payload.ownerConfirmation.validationFailures.map((failure) => `- ${failure}`).join("\n")
    : "- none";
  const proposedRecord = payload.proposedOwnerConfirmationRecordDoNotApply
    ? JSON.stringify(payload.proposedOwnerConfirmationRecordDoNotApply, null, 2)
    : "null";

  return `# A25 Validation Hold Release Confirmation Recording

Generated: ${payload.generatedAt}

Recorder status: \`${payload.recorderStatus}\`

Mode: \`${payload.mode}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This recorder is fail-closed. In dry-run mode it does not create owner confirmation input, record owner confirmation, release the validation hold, stage, commit, merge, cleanup, deploy, run destructive Git, or perform physical lifecycle cleanup.

## Current Owner Confirmation State

- Owner confirmation input file: \`${payload.targetOwnerConfirmationInputFile}\`
- Owner confirmation file present: ${payload.ownerConfirmation.inputFilePresent ? "yes" : "no"}
- Owner confirmation accepted: ${payload.ownerConfirmation.confirmationAccepted ? "yes" : "no"}
- Release review ready: ${payload.ownerConfirmation.releaseReviewReady ? "yes" : "no"}
- Validation hold released by this recorder: no
- Target owner confirmation record: \`${payload.targetOwnerConfirmationRecordFile}\`
- Existing record present: ${payload.existingRecordPresent ? "yes" : "no"}
- Existing record matches current: ${payload.existingRecordMatchesCurrent ? "yes" : "no"}
- Apply permitted: ${payload.summary.applyPermitted}
- Mutations performed: ${payload.summary.mutationsPerformed}
- Records owner-confirmation rows: ${payload.summary.recordsOwnerConfirmationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Exact Required Confirmation Text

\`${payload.ownerConfirmation.requiredConfirmationTextZh}\`

## Validation Failures

${validationFailures}

## Proposed Owner Confirmation Record

\`\`\`json
${proposedRecord}
\`\`\`

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

${bullet([
  `Records owner confirmation: ${payload.boundary.recordsOwnerConfirmation}`,
  `Releases validation hold: ${payload.boundary.releasesValidationHold}`,
  `Requires explicit apply-recording flag: ${payload.boundary.requiresExplicitApplyRecordingFlag}`,
  `Requires exact owner confirmation text: ${payload.boundary.requiresExactOwnerConfirmationText}`,
  `Requires separate validation-hold release gate: ${payload.boundary.requiresSeparateValidationHoldReleaseGate}`,
  `Merge authorized: ${payload.boundary.mergeAuthorized}`,
  `Cleanup authorized: ${payload.boundary.cleanupAuthorized}`,
  `Deploy authorized: ${payload.boundary.deployAuthorized}`,
  `Physical lifecycle cleanup authorized: ${payload.boundary.physicalLifecycleCleanupAuthorized}`
])}
`;
}

function writeState(payload, { writeRecord = false } = {}) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  const outputJson = payload.mode === "apply-recording"
    ? VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestApplyJson
    : VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunJson;
  const outputMarkdown = payload.mode === "apply-recording"
    ? VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestApplyMarkdown
    : VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunMarkdown;
  write(outputJson, json);
  write(outputMarkdown, md);
  if (payload.mode === "dry-run") {
    write(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.datedDryRunJson, json);
    write(VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.datedDryRunMarkdown, md);
  }
  if (writeRecord && payload.proposedOwnerConfirmationRecordDoNotApply) {
    write(
      VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord,
      `${JSON.stringify(payload.proposedOwnerConfirmationRecordDoNotApply, null, 2)}\n`
    );
  }
}

function main() {
  const mode = process.argv.includes("--apply-recording") ? "apply-recording" : "dry-run";
  const payload = buildValidationHoldReleaseConfirmationRecordingState({ mode });
  const applyPermitted = payload.summary.applyPermitted === true;
  const finalPayload = applyPermitted
    ? {
        ...payload,
        recorderStatus: "applied-owner-confirmation-record",
        summary: {
          ...payload.summary,
          mutationsPerformed: true,
          recordsOwnerConfirmationRows: 1
        },
        boundary: {
          ...payload.boundary,
          evidenceOnly: false,
          dryRunOnly: false,
          recordsOwnerConfirmation: true
        }
      }
    : payload;
  writeState(finalPayload, { writeRecord: applyPermitted });

  console.log(JSON.stringify({
    mode: finalPayload.mode,
    recorderStatus: finalPayload.recorderStatus,
    ownerConfirmationInputPresent: finalPayload.summary.ownerConfirmationInputPresent,
    ownerConfirmationAccepted: finalPayload.summary.ownerConfirmationAccepted,
    releaseReviewReady: finalPayload.summary.releaseReviewReady,
    applyPermitted: finalPayload.summary.applyPermitted,
    mutationsPerformed: finalPayload.summary.mutationsPerformed,
    recordsOwnerConfirmationRows: finalPayload.summary.recordsOwnerConfirmationRows,
    validationHoldReleased: finalPayload.summary.validationHoldReleased,
    cleanupAuthorizedRows: finalPayload.summary.cleanupAuthorizedRows,
    executableRows: finalPayload.summary.executableRows
  }, null, 2));

  if (mode === "apply-recording" && !applyPermitted) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
