#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  validateToMergeBlockerFrontier: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  compactRequestBundle: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  canonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  a22OwnerActionPacket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
  a22OwnerActionAcceptanceDocket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
  a22SelectedActionCanonicalPreview: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview.json",
  a22OwnerInputLandingRunway: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.json",
  a22CandidateMutationDryRun: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  a22CandidateMutationCurrentGate: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-owner-input-request-capsule.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-owner-input-request-capsule.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-owner-input-request-capsule.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-owner-input-request-capsule.md`
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

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function artifactCurrent(dirtyMap, payload) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return payload.dirtyMapStatusSignature === expectedSignature &&
    payload.expandedStatusEntries === expectedEntries;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: payload.expandedStatusEntries ?? null
  };
}

function stableSourceArtifacts(sourceArtifactsPayload) {
  return Object.fromEntries(Object.entries(sourceArtifactsPayload ?? {}).map(([key, stamp]) => [key, {
    key: stamp.key,
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  return Object.entries(artifacts)
    .map(([key, payload]) => artifactStamp(key, VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === dirtyMap.statusSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === dirtyMapEntryCount(dirtyMap);
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function safeZero(...values) {
  return values.every((value) => count(value) === 0);
}

function unique(items) {
  return Array.from(new Set((items ?? []).filter(Boolean)));
}

function buildOwnerInputGroups({
  compactRequestBundle,
  canonicalPreview,
  a22OwnerActionPacket,
  a22OwnerActionAcceptanceDocket,
  a22SelectedActionCanonicalPreview,
  a22OwnerInputLandingRunway,
  a22CandidateMutationDryRun,
  a22CandidateMutationCurrentGate
}) {
  const batch = canonicalPreview.batchAuthorizationRequest ?? {};
  const a22Rows = a22OwnerActionAcceptanceDocket.acceptanceRows ?? [];
  const a22PreviewBatch = a22SelectedActionCanonicalPreview.batchAuthorizationRequest ?? {};
  const a22LandingSummary = a22OwnerInputLandingRunway.summary ?? {};
  return [
    {
      id: "owner-package-canonical-authorization-focus-batch",
      owner: "A25 git hygiene and release intake",
      ownerIds: ["A25"],
      requestKind: "canonical-owner-package-authorization",
      targetFile: canonicalPreview.canonicalTarget ?? "coordination/release-intake/latest-A25-next-owner-authorizations.json",
      status: canonicalPreview.previewStatus ?? "unknown",
      pendingRows: count(canonicalPreview.summary?.pendingRows),
      acceptedRows: count(canonicalPreview.summary?.acceptedRows),
      approvalIds: batch.approvalIds ?? (canonicalPreview.previewRows ?? []).map((row) => row.approvalId),
      copyableOwnerReplyTextZh: batch.copyableOwnerReplyTextZh ?? compactRequestBundle.batchAuthorizationRequest?.copyableOwnerReplyTextZh ?? "",
      copyableApprovalText: batch.copyableApprovalText ?? "",
      nextSafeValidationCommands: [
        "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
        "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
        "node coordination/release-intake/generate-owner-closure-input-readiness.mjs",
        "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
        "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
      ],
      cleanupAuthorized: false,
      executableNow: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    },
    {
      id: "a22-root-parity-selected-actions",
      owner: "A22 production reliability and release engineering with A06/A20/A05 owner review",
      ownerIds: ["A22", "A06", "A20", "A05", "A25"],
      requestKind: "a22-root-parity-selected-action-owner-input",
      targetFile: a22OwnerActionPacket.ownerInputFile ?? "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
      status: a22OwnerActionAcceptanceDocket.acceptanceStatus ?? "unknown",
      previewStatus: a22SelectedActionCanonicalPreview.previewStatus ?? "unknown",
      pendingRows: a22Rows.filter((row) => row.acceptedByOwnerInput !== true).length,
      acceptedRows: a22Rows.filter((row) => row.acceptedByOwnerInput === true).length,
      approvalIds: a22PreviewBatch.approvalIds ?? a22Rows.map((row) => row.unitId),
      selectedActions: a22PreviewBatch.selectedActions ?? {},
      unitIds: a22Rows.map((row) => row.unitId),
      recommendedSelectedActions: (a22SelectedActionCanonicalPreview.previewRows ?? a22Rows).map((row) => ({
        unitId: row.unitId,
        selectedAction: row.selectedAction ?? row.recommendedSelectedAction,
        rootSource: row.rootSource,
        candidateTarget: row.candidateTarget
      })),
      copyableOwnerReplyTextZh: a22PreviewBatch.copyableOwnerReplyTextZh ?? "",
      copyableOwnerReplyText: a22PreviewBatch.copyableOwnerReplyText ?? "",
      ownerExecutionTextRequired: (a22PreviewBatch.exactOwnerExecutionTextLines ?? []).join("\n"),
      exactOwnerExecutionTextLines: a22PreviewBatch.exactOwnerExecutionTextLines ?? [],
      requiredOwnerReplyFields: a22OwnerActionAcceptanceDocket.requiredOwnerReplyFields ?? [],
      runwayStatus: a22OwnerInputLandingRunway.runwayStatus ?? "unknown",
      ownerInputBlank: a22LandingSummary.ownerInputBlank === true,
      landingPatchRows: count(a22LandingSummary.patchRows),
      postOwnerInputValidationCommandRows: count(a22LandingSummary.postOwnerInputValidationCommands),
      candidateTargetsMissing: count(a22LandingSummary.candidateTargetsMissing),
      candidateTargetsVerified: count(a22LandingSummary.candidateTargetsVerified),
      instructionIntakeStatus: a22LandingSummary.instructionIntakeStatus ?? "",
      instructionRecordingStatus: a22LandingSummary.instructionRecordingStatus ?? "",
      guardedExtractionStatus: a22LandingSummary.guardedExtractionStatus ?? "",
      candidateMutationExecutorStatus: a22CandidateMutationDryRun.executorStatus ?? "unknown",
      candidateMutationOwnerInputBlank: a22CandidateMutationDryRun.ownerInputBlank === true,
      candidateMutationExpectedRows: count(a22CandidateMutationDryRun.summary?.expectedRows),
      candidateMutationRecordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      candidateMutationApplyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
      candidateMutationRootCopyRows: count(a22CandidateMutationDryRun.summary?.rootCopyRows),
      candidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
      candidateMutationCurrentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length),
      nextSafeValidationCommands: a22OwnerInputLandingRunway.postOwnerInputValidationCommands ?? a22OwnerActionAcceptanceDocket.safePostOwnerInputValidationCommands ?? [],
      cleanupAuthorized: false,
      executableNow: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  ];
}

function buildChecks({
  dirtyMap,
  sourceFailures,
  validateToMergeBlockerFrontier,
  validateToMergeExitCriteria,
  canonicalPreview,
  a22OwnerActionAcceptanceDocket,
  a22SelectedActionCanonicalPreview,
  a22OwnerInputLandingRunway,
  a22CandidateMutationDryRun,
  a22CandidateMutationCurrentGate,
  ownerInputGroups
}) {
  const sourceCurrent = sourceFailures.length === 0;
  const ownerPackageSafe = canonicalPreview.previewStatus === "ready-for-owner-review" &&
    count(canonicalPreview.summary?.pendingRows) > 0 &&
    count(canonicalPreview.summary?.previewRows) === count(canonicalPreview.summary?.pendingRows) &&
    safeZero(canonicalPreview.summary?.cleanupAuthorizedRows, canonicalPreview.summary?.executableRows);
  const ownerPackageConsumed = canonicalPreview.previewStatus === "no-pending-focus-rows" &&
    count(canonicalPreview.summary?.pendingRows) === 0 &&
    count(canonicalPreview.summary?.previewRows) === 0 &&
    safeZero(canonicalPreview.summary?.cleanupAuthorizedRows, canonicalPreview.summary?.executableRows);
  const a22SafeBeforeOwnerInput = a22OwnerActionAcceptanceDocket.acceptanceStatus === "waiting-for-owner-action" &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptedRows) === 0 &&
    a22SelectedActionCanonicalPreview.previewStatus === "ready-for-owner-review" &&
    count(a22SelectedActionCanonicalPreview.summary?.previewRows) === 4 &&
    count(a22SelectedActionCanonicalPreview.summary?.pendingRows) === 4 &&
    safeZero(
      a22OwnerActionAcceptanceDocket.summary?.recordedInstructionRows,
      a22OwnerActionAcceptanceDocket.summary?.rootCopyRows,
      a22OwnerActionAcceptanceDocket.summary?.candidateMutationRows,
      a22OwnerActionAcceptanceDocket.summary?.cleanupAuthorizedRows,
      a22OwnerActionAcceptanceDocket.summary?.executableRows
    );
  const a22SafeAfterOwnerInput = a22OwnerActionAcceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction" &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptedRows) === 4 &&
    a22SelectedActionCanonicalPreview.previewStatus === "owner-approved-waiting-candidate-mutation" &&
    count(a22SelectedActionCanonicalPreview.summary?.previewRows) === 4 &&
    count(a22SelectedActionCanonicalPreview.summary?.pendingRows) === 0 &&
    count(a22SelectedActionCanonicalPreview.summary?.acceptedRows) === 4 &&
    safeZero(
      a22OwnerActionAcceptanceDocket.summary?.recordedInstructionRows,
      a22OwnerActionAcceptanceDocket.summary?.rootCopyRows,
      a22OwnerActionAcceptanceDocket.summary?.candidateMutationRows,
      a22OwnerActionAcceptanceDocket.summary?.cleanupAuthorizedRows,
      a22OwnerActionAcceptanceDocket.summary?.executableRows
    );
  const a22SafePostExtractionVerified = a22OwnerActionAcceptanceDocket.acceptanceStatus === "post-extraction-verified" &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(a22OwnerActionAcceptanceDocket.summary?.acceptedRows) === 4 &&
    a22SelectedActionCanonicalPreview.previewStatus === "owner-approved-post-extraction-verified-check-remediation" &&
    count(a22SelectedActionCanonicalPreview.summary?.previewRows) === 4 &&
    count(a22SelectedActionCanonicalPreview.summary?.pendingRows) === 0 &&
    count(a22SelectedActionCanonicalPreview.summary?.acceptedRows) === 4 &&
    safeZero(
      a22OwnerActionAcceptanceDocket.summary?.recordedInstructionRows,
      a22OwnerActionAcceptanceDocket.summary?.rootCopyRows,
      a22OwnerActionAcceptanceDocket.summary?.candidateMutationRows,
      a22OwnerActionAcceptanceDocket.summary?.cleanupAuthorizedRows,
      a22OwnerActionAcceptanceDocket.summary?.executableRows
    );
  const a22LandingReadyBeforeOwnerInput = a22OwnerInputLandingRunway.runwayStatus === "ready-for-owner-input-landing-review" &&
    count(a22OwnerInputLandingRunway.summary?.patchRows) === 4 &&
    a22OwnerInputLandingRunway.summary?.ownerInputBlank === true &&
    count(a22OwnerInputLandingRunway.summary?.postOwnerInputValidationCommands) === 8 &&
    count(a22OwnerInputLandingRunway.summary?.candidateTargetsMissing) === 4 &&
    safeZero(
      a22OwnerInputLandingRunway.summary?.rootCopyRows,
      a22OwnerInputLandingRunway.summary?.candidateMutationRows,
      a22OwnerInputLandingRunway.summary?.cleanupAuthorizedRows,
      a22OwnerInputLandingRunway.summary?.executableRows,
      a22OwnerInputLandingRunway.summary?.failedChecks
    );
  const a22LandingReadyAfterOwnerInput = a22OwnerInputLandingRunway.runwayStatus === "owner-input-recorded-post-runway" &&
    count(a22OwnerInputLandingRunway.summary?.patchRows) === 4 &&
    a22OwnerInputLandingRunway.summary?.ownerInputBlank === false &&
    count(a22OwnerInputLandingRunway.summary?.postOwnerInputValidationCommands) === 8 &&
    count(a22OwnerInputLandingRunway.summary?.candidateTargetsMissing) === 4 &&
    safeZero(
      a22OwnerInputLandingRunway.summary?.rootCopyRows,
      a22OwnerInputLandingRunway.summary?.candidateMutationRows,
      a22OwnerInputLandingRunway.summary?.cleanupAuthorizedRows,
      a22OwnerInputLandingRunway.summary?.executableRows,
      a22OwnerInputLandingRunway.summary?.failedChecks
    );
  const a22LandingReadyPostExtractionVerified = a22OwnerInputLandingRunway.runwayStatus === "owner-input-recorded-post-runway" &&
    count(a22OwnerInputLandingRunway.summary?.patchRows) === 4 &&
    a22OwnerInputLandingRunway.summary?.ownerInputBlank === false &&
    count(a22OwnerInputLandingRunway.summary?.postOwnerInputValidationCommands) === 8 &&
    count(a22OwnerInputLandingRunway.summary?.candidateTargetsMissing) === 0 &&
    count(a22OwnerInputLandingRunway.summary?.candidateTargetsVerified) === 4 &&
    safeZero(
      a22OwnerInputLandingRunway.summary?.rootCopyRows,
      a22OwnerInputLandingRunway.summary?.candidateMutationRows,
      a22OwnerInputLandingRunway.summary?.cleanupAuthorizedRows,
      a22OwnerInputLandingRunway.summary?.executableRows,
      a22OwnerInputLandingRunway.summary?.failedChecks
    );
  const a22CandidateMutationDryRunCurrentBeforeOwnerInput =
    a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-missing-recorded-instructions" &&
    a22CandidateMutationDryRun.ownerInputBlank === true &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsMissing) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 0 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const a22CandidateMutationDryRunCurrentAfterOwnerInput =
    a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-owner-candidate-mutation-input" &&
    a22CandidateMutationDryRun.ownerInputBlank === true &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsMissing) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 0 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const a22CandidateMutationDryRunCurrentPostExtractionVerified =
    a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
    a22CandidateMutationDryRun.ownerInputBlank === false &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsMissing) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 4 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const validateFrontierVisible = validateToMergeBlockerFrontier.handoffStatus === "blocked-before-merge" &&
    validateToMergeBlockerFrontier.readyForMerge === false &&
    count(validateToMergeBlockerFrontier.summary?.ownerInputFrontierRows) >= 3;
  const exitStillBlocked = validateToMergeExitCriteria.validateExitReady === false &&
    validateToMergeExitCriteria.readyForMerge === false &&
    count(validateToMergeExitCriteria.summary?.directFailedMergeChecks) > 0;
  const groupsSafe = ownerInputGroups.every((group) =>
    group.cleanupAuthorized === false &&
    group.executableNow === false &&
    group.mergeAuthorized === false &&
    group.deployAuthorized === false &&
    group.physicalLifecycleCleanupAuthorized === false
  );

  return [
    {
      id: "source-current",
      status: sourceCurrent ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}; expanded=${dirtyMapEntryCount(dirtyMap)}`
    },
    {
      id: "validate-frontier-visible",
      status: validateFrontierVisible ? "pass" : "fail",
      detail: `handoffStatus=${validateToMergeBlockerFrontier.handoffStatus ?? "unknown"}; ownerInputFrontierRows=${validateToMergeBlockerFrontier.summary?.ownerInputFrontierRows ?? 0}`
    },
    {
      id: "validate-exit-still-blocked",
      status: exitStillBlocked ? "pass" : "fail",
      detail: `validateExitReady=${validateToMergeExitCriteria.validateExitReady === true}; directFailedMergeChecks=${validateToMergeExitCriteria.summary?.directFailedMergeChecks ?? 0}`
    },
    {
      id: "owner-package-focus-ready-for-owner-review",
      status: ownerPackageSafe || ownerPackageConsumed ? "pass" : "fail",
      detail: `previewStatus=${canonicalPreview.previewStatus ?? "unknown"}; pendingRows=${canonicalPreview.summary?.pendingRows ?? 0}`
    },
    {
      id: "a22-selected-actions-waiting-for-owner",
      status: a22SafeBeforeOwnerInput || a22SafeAfterOwnerInput || a22SafePostExtractionVerified ? "pass" : "fail",
      detail: `acceptanceStatus=${a22OwnerActionAcceptanceDocket.acceptanceStatus ?? "unknown"}; previewStatus=${a22SelectedActionCanonicalPreview.previewStatus ?? "unknown"}; acceptanceRows=${a22OwnerActionAcceptanceDocket.summary?.acceptanceRows ?? 0}; acceptedRows=${a22OwnerActionAcceptanceDocket.summary?.acceptedRows ?? 0}`
    },
    {
      id: "a22-owner-input-landing-runway-ready",
      status: a22LandingReadyBeforeOwnerInput || a22LandingReadyAfterOwnerInput || a22LandingReadyPostExtractionVerified ? "pass" : "fail",
      detail: `runwayStatus=${a22OwnerInputLandingRunway.runwayStatus ?? "unknown"}; patchRows=${a22OwnerInputLandingRunway.summary?.patchRows ?? 0}; postOwnerInputValidationCommands=${a22OwnerInputLandingRunway.summary?.postOwnerInputValidationCommands ?? 0}; candidateTargetsMissing=${a22OwnerInputLandingRunway.summary?.candidateTargetsMissing ?? 0}; candidateTargetsVerified=${a22OwnerInputLandingRunway.summary?.candidateTargetsVerified ?? 0}`
    },
    {
      id: "a22-candidate-mutation-dry-run-current",
      status: a22CandidateMutationDryRunCurrentBeforeOwnerInput || a22CandidateMutationDryRunCurrentAfterOwnerInput || a22CandidateMutationDryRunCurrentPostExtractionVerified ? "pass" : "fail",
      detail: `executorStatus=${a22CandidateMutationDryRun.executorStatus ?? "unknown"}; recordedInstructions=${a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? 0}; applyPermitted=${a22CandidateMutationDryRun.summary?.applyPermitted === true}; candidateMutationRows=${a22CandidateMutationDryRun.summary?.candidateMutationRows ?? 0}; gateFailures=${a22CandidateMutationCurrentGate.failures?.length ?? 0}`
    },
    {
      id: "frontier-groups-non-executable",
      status: groupsSafe ? "pass" : "fail",
      detail: `ownerInputGroups=${ownerInputGroups.length}; cleanup/executable/merge/deploy/physical cleanup stay false`
    }
  ];
}

export function buildValidateFrontierOwnerInputRequestCapsule() {
  const dirtyMap = readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.dirtyMap);
  const artifacts = {
    validateToMergeBlockerFrontier: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.validateToMergeBlockerFrontier),
    validateToMergeExitCriteria: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.validateToMergeExitCriteria),
    compactRequestBundle: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.compactRequestBundle),
    canonicalPreview: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.canonicalPreview),
    a22OwnerActionPacket: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerActionPacket),
    a22OwnerActionAcceptanceDocket: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerActionAcceptanceDocket),
    a22SelectedActionCanonicalPreview: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22SelectedActionCanonicalPreview),
    a22OwnerInputLandingRunway: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22OwnerInputLandingRunway),
    a22CandidateMutationDryRun: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationDryRun),
    a22CandidateMutationCurrentGate: readJson(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.a22CandidateMutationCurrentGate)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, artifacts });
  const ownerInputGroups = buildOwnerInputGroups(artifacts);
  const checks = buildChecks({
    dirtyMap,
    sourceFailures,
    validateToMergeBlockerFrontier: artifacts.validateToMergeBlockerFrontier,
    validateToMergeExitCriteria: artifacts.validateToMergeExitCriteria,
    canonicalPreview: artifacts.canonicalPreview,
    a22OwnerActionAcceptanceDocket: artifacts.a22OwnerActionAcceptanceDocket,
    a22SelectedActionCanonicalPreview: artifacts.a22SelectedActionCanonicalPreview,
    a22OwnerInputLandingRunway: artifacts.a22OwnerInputLandingRunway,
    a22CandidateMutationDryRun: artifacts.a22CandidateMutationDryRun,
    a22CandidateMutationCurrentGate: artifacts.a22CandidateMutationCurrentGate,
    ownerInputGroups
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    capsuleKind: "validate-frontier-owner-input-request",
    capsuleStatus: failedChecks === 0 ? "waiting-for-owner-frontier-input" : "not-ready-check-failures",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
      key,
      artifactStamp(key, VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS[key], payload)
    ])),
    sourceCurrentnessFailures: sourceFailures,
    validateFrontier: {
      handoffStatus: artifacts.validateToMergeBlockerFrontier.handoffStatus,
      readyForMerge: artifacts.validateToMergeBlockerFrontier.readyForMerge === true,
      failedMergeChecks: count(artifacts.validateToMergeBlockerFrontier.summary?.failedMergeChecks),
      frontierRows: count(artifacts.validateToMergeBlockerFrontier.summary?.frontierRows),
      ownerInputFrontierRows: count(artifacts.validateToMergeBlockerFrontier.summary?.ownerInputFrontierRows),
      cleanSourceFrontierRows: count(artifacts.validateToMergeBlockerFrontier.summary?.cleanSourceFrontierRows)
    },
    ownerInputGroups,
    safePostOwnerInputValidationCommands: unique([
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
      "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
      "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs",
      ...(artifacts.a22OwnerInputLandingRunway.postOwnerInputValidationCommands ?? [])
    ]),
    separateStepsStillRequired: [
      "Owner-package focus batch approval must be recorded by the guarded canonical recorder before it changes pending canonical authorization counts.",
      "A22 selectedAction owner input must be recorded separately before root-parity extraction instruction recording can become ready.",
      "A22 owner-input landing runway must stay current before running the A22 post-owner-input validation command chain.",
      "A22 candidate-mutation dry-run/current gate must stay current as fail-closed evidence before any separate candidate mutation instruction.",
      "A separate apply instruction is still required before any A22 candidate mutation, merge, cleanup, deploy, destructive Git, or physical lifecycle cleanup.",
      "A22 candidate type-check, build, and focused regression must be rerun after any candidate mutation."
    ],
    checks,
    summary: {
      ownerInputGroups: ownerInputGroups.length,
      ownerPackageFocusBatchPendingRows: count(artifacts.canonicalPreview.summary?.pendingRows),
      ownerPackageFocusBatchAcceptedRows: count(artifacts.canonicalPreview.summary?.acceptedRows),
      a22SelectedActionRows: count(artifacts.a22SelectedActionCanonicalPreview.summary?.previewRows),
      a22AcceptedSelectedActionRows: count(artifacts.a22OwnerActionAcceptanceDocket.summary?.acceptedRows),
      a22SelectedActionPreviewStatus: artifacts.a22SelectedActionCanonicalPreview.previewStatus ?? "",
      a22OwnerInputLandingRunwayStatus: artifacts.a22OwnerInputLandingRunway.runwayStatus ?? "",
      a22OwnerInputBlank: artifacts.a22OwnerInputLandingRunway.summary?.ownerInputBlank === true,
      a22PostOwnerInputValidationCommandRows: count(artifacts.a22OwnerInputLandingRunway.summary?.postOwnerInputValidationCommands),
      a22CandidateTargetsMissing: count(artifacts.a22OwnerInputLandingRunway.summary?.candidateTargetsMissing),
      a22CandidateTargetsVerified: count(artifacts.a22OwnerInputLandingRunway.summary?.candidateTargetsVerified),
      a22CandidateMutationExecutorStatus: artifacts.a22CandidateMutationDryRun.executorStatus ?? "",
      a22CandidateMutationRecordedInstructionRows: count(artifacts.a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      a22CandidateMutationApplyPermitted: artifacts.a22CandidateMutationDryRun.summary?.applyPermitted === true,
      a22CandidateMutationRows: count(artifacts.a22CandidateMutationDryRun.summary?.candidateMutationRows),
      a22CandidateMutationCurrentGateFailures: count(artifacts.a22CandidateMutationCurrentGate.failures?.length),
      totalFrontierOwnerRows: count(artifacts.canonicalPreview.summary?.pendingRows) + count(artifacts.a22SelectedActionCanonicalPreview.summary?.previewRows),
      pendingCanonicalAuthorizationRows: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      directFailedMergeChecks: count(artifacts.validateToMergeExitCriteria.summary?.directFailedMergeChecks),
      cleanSourceBlockers: count(artifacts.validateToMergeExitCriteria.summary?.cleanSourceBlockers),
      validationHoldBlockers: count(artifacts.validateToMergeExitCriteria.summary?.validationHoldBlockers),
      checks: checks.length,
      passingChecks: checks.filter((row) => row.status === "pass").length,
      failedChecks,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      recordsAuthorization: false,
      recordsOwnerInput: false,
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
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresOwnerReply: true,
      requiresSeparateRecordingStep: true,
      requiresSeparateCandidateMutationInstruction: true
    }
  };
}

export function stableValidateFrontierOwnerInputRequestCapsuleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    capsuleKind: payload.capsuleKind,
    capsuleStatus: payload.capsuleStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    validateFrontier: payload.validateFrontier,
    ownerInputGroups: payload.ownerInputGroups,
    safePostOwnerInputValidationCommands: payload.safePostOwnerInputValidationCommands,
    separateStepsStillRequired: payload.separateStepsStillRequired,
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
  const groups = payload.ownerInputGroups.map((group) => (
    `| \`${cell(group.id)}\` | ${cell(group.status)} | ${cell(group.pendingRows)} | ${cell(group.acceptedRows)} | \`${cell(group.targetFile)}\` | ${cell(group.requestKind)} |`
  )).join("\n") || "| none | none | 0 | 0 | none | none |";
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none |";
  const ownerPackageGroup = payload.ownerInputGroups.find((group) => group.id === "owner-package-canonical-authorization-focus-batch") ?? {};
  const a22Group = payload.ownerInputGroups.find((group) => group.id === "a22-root-parity-selected-actions") ?? {};
  const a22Actions = (a22Group.recommendedSelectedActions ?? []).map((row) =>
    `- \`${row.unitId}\`: selectedAction=\`${row.selectedAction}\`, rootSource=\`${row.rootSource}\`, candidateTarget=\`${row.candidateTarget}\``
  );

  return `# A25/A22 Validate Frontier Owner Input Request Capsule

Generated: ${payload.generatedAt}

Capsule status: \`${payload.capsuleStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is evidence-only. It combines the two owner-input frontiers currently blocking validation: the A25 owner-package canonical authorization focus batch and the A22 root-parity selectedAction owner input. It does not record authorization, record A22 owner input, record extraction instructions, copy root files, mutate the candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Owner input groups: ${payload.summary.ownerInputGroups}
- Owner-package focus pending rows: ${payload.summary.ownerPackageFocusBatchPendingRows}
- A22 selectedAction rows: ${payload.summary.a22SelectedActionRows}
- A22 owner-input landing runway status: \`${payload.summary.a22OwnerInputLandingRunwayStatus}\`
- A22 owner input blank: ${payload.summary.a22OwnerInputBlank ? "yes" : "no"}
- A22 post-owner-input validation command rows: ${payload.summary.a22PostOwnerInputValidationCommandRows}
- A22 candidate targets missing: ${payload.summary.a22CandidateTargetsMissing}/4
- A22 candidate-mutation executor status: \`${payload.summary.a22CandidateMutationExecutorStatus}\`
- A22 candidate-mutation recorded instruction rows: ${payload.summary.a22CandidateMutationRecordedInstructionRows}/4
- A22 candidate-mutation apply permitted: ${payload.summary.a22CandidateMutationApplyPermitted ? "yes" : "no"}
- A22 candidate-mutation rows: ${payload.summary.a22CandidateMutationRows}
- A22 candidate-mutation current gate failures: ${payload.summary.a22CandidateMutationCurrentGateFailures}
- Total frontier owner rows: ${payload.summary.totalFrontierOwnerRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Direct failed merge checks: ${payload.summary.directFailedMergeChecks}
- Clean-source blockers: ${payload.summary.cleanSourceBlockers}
- Validation-hold blockers: ${payload.summary.validationHoldBlockers}
- Checks passing: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Input Groups

| Group | Status | Pending rows | Accepted rows | Target file | Request kind |
| --- | --- | ---: | ---: | --- | --- |
${groups}

## Copyable Owner Texts

### Owner-package canonical authorization focus batch

\`\`\`text
${ownerPackageGroup.copyableOwnerReplyTextZh || "none"}
\`\`\`

### A22 root-parity selectedAction owner input

Compact approval text:

\`\`\`text
${a22Group.copyableOwnerReplyTextZh || "none"}
\`\`\`

- Landing runway status: \`${a22Group.runwayStatus || "unknown"}\`
- Owner input blank: ${a22Group.ownerInputBlank ? "yes" : "no"}
- Landing patch rows: ${a22Group.landingPatchRows ?? 0}
- Post-owner-input validation commands: ${a22Group.postOwnerInputValidationCommandRows ?? 0}
- Candidate targets missing: ${a22Group.candidateTargetsMissing ?? 0}/4
- Instruction intake status: \`${a22Group.instructionIntakeStatus || "unknown"}\`
- Instruction recording status: \`${a22Group.instructionRecordingStatus || "unknown"}\`
- Guarded extraction status: \`${a22Group.guardedExtractionStatus || "unknown"}\`
- Candidate mutation executor status: \`${a22Group.candidateMutationExecutorStatus || "unknown"}\`
- Candidate mutation owner input blank: ${a22Group.candidateMutationOwnerInputBlank ? "yes" : "no"}
- Candidate mutation recorded instruction rows: ${a22Group.candidateMutationRecordedInstructionRows ?? 0}/${a22Group.candidateMutationExpectedRows ?? 0}
- Candidate mutation apply permitted: ${a22Group.candidateMutationApplyPermitted ? "yes" : "no"}
- Candidate mutation rows: ${a22Group.candidateMutationRows ?? 0}
- Candidate mutation current gate failures: ${a22Group.candidateMutationCurrentGateFailures ?? 0}

Recommended selectedActions:

${list(a22Actions)}

Exact owner execution text lines:

\`\`\`text
${a22Group.ownerExecutionTextRequired || "none"}
\`\`\`

## Safe Post-Owner-Input Validation Commands

${list(payload.safePostOwnerInputValidationCommands.map((command) => `\`${command}\``))}

## Separate Steps Still Required

${list(payload.separateStepsStillRequired)}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Records authorization: false
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
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
- Requires owner reply: true
- Requires separate recording step: true
- Requires separate candidate mutation instruction: true
`;
}

function main() {
  const payload = buildValidateFrontierOwnerInputRequestCapsule();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestJson, json);
  write(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.datedJson, json);
  write(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.latestMarkdown, md);
  write(VALIDATE_FRONTIER_OWNER_INPUT_REQUEST_CAPSULE_PATHS.datedMarkdown, md);

  console.log("A25/A22 validate frontier owner input request capsule generated");
  console.log(`Capsule status: ${payload.capsuleStatus}`);
  console.log(`Owner input groups: ${payload.summary.ownerInputGroups}`);
  console.log(`Total frontier owner rows: ${payload.summary.totalFrontierOwnerRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
