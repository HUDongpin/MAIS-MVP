#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationTransitionForecast: "coordination/release-intake/latest-A25-authorization-transition-forecast.json",
  validateFrontierCapsule: "coordination/release-intake/latest-A25-validate-frontier-owner-input-request-capsule.json",
  a22OwnerInputLandingRunway: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.json",
  a22OwnerActionAcceptanceDocket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
  a22CleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  a22CandidateMutationDryRun: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  a22CandidateMutationCurrentGate: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-current-gate.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-transition-forecast.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-transition-forecast.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-transition-forecast.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-transition-forecast.md`
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

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature:
      payload.dirtyMapStatusSignature ??
      payload.statusSignature ??
      payload.dirtyMap?.statusSignature ??
      null,
    expandedStatusEntries:
      payload.expandedStatusEntries ??
      payload.statusCounts?.expandedStatusEntries ??
      payload.dirtyMap?.expandedStatusEntries ??
      null
  };
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, artifact]) => artifactStamp(key, VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS[key], artifact))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS[key], payload)
  ]));
}

function stableSourceArtifacts(sourceArtifactsPayload) {
  return Object.fromEntries(Object.entries(sourceArtifactsPayload ?? {}).map(([key, stamp]) => [key, {
    key: stamp.key,
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function unique(items) {
  return Array.from(new Set((items ?? []).filter(Boolean)));
}

function groupById(groups, id) {
  return (groups ?? []).find((group) => group.id === id) ?? {};
}

function safeFalseBoundary(boundary, keys) {
  return keys.every((key) => boundary?.[key] === false);
}

function buildBlockers({
  a25Forecast,
  validateFrontierCapsule,
  a22Queue,
  a22CandidateMutationDryRun,
  bridge,
  projectedPendingCanonicalRows
}) {
  const blockers = [];
  if (projectedPendingCanonicalRows > 0) {
    blockers.push({
      id: "canonical-authorization-backlog",
      blockerClass: "owner-input",
      statusAfterCurrentFrontier: "still-blocked",
      count: projectedPendingCanonicalRows,
      detail: `${projectedPendingCanonicalRows} canonical authorization row(s) would remain after the current A25 focus rows.`
    });
  }
  if (count(a25Forecast.currentState?.heldRows) > 0) {
    blockers.push({
      id: "wave01-resync-hold",
      blockerClass: "owner-confirmation-hold",
      statusAfterCurrentFrontier: "still-blocked",
      count: count(a25Forecast.currentState?.heldRows),
      approvalIds: a25Forecast.currentState?.heldApprovalIds ?? [],
      detail: "Held rows remain non-authorizable until explicit owner release."
    });
  }
  if (count(validateFrontierCapsule.summary?.validationHoldBlockers) > 0) {
    blockers.push({
      id: "validation-hold",
      blockerClass: "owner-confirmation-hold",
      statusAfterCurrentFrontier: "still-blocked",
      count: count(validateFrontierCapsule.summary?.validationHoldBlockers),
      detail: "Validation hold remains waiting for owner confirmation before validate can exit."
    });
  }
  blockers.push({
    id: "a22-extraction-recording-and-guarded-extraction",
    blockerClass: "release-source-clean",
    statusAfterCurrentFrontier: "unlocked-but-not-executed",
    count: count(a22Queue.summary?.ownerActionRowsRequired),
    detail: `A22 selectedAction owner input only unlocks the recording/extraction chain; candidate mutation dry-run remains ${a22CandidateMutationDryRun.executorStatus ?? "unknown"} with ${a22CandidateMutationDryRun.summary?.candidateMutationRows ?? 0} mutation rows.`
  });
  blockers.push({
    id: "a22-candidate-mutation-still-separate",
    blockerClass: "candidate-mutation-authorization",
    statusAfterCurrentFrontier: "still-blocked",
    count: count(a22CandidateMutationDryRun.summary?.expectedRows),
    detail: "Candidate mutation requires recorded extraction instructions plus a separate owner candidate-mutation input and explicit apply flag."
  });
  if (a22Queue.summary?.releaseSourceEligibleNow !== true || bridge.summary?.releaseSourceClean !== true) {
    blockers.push({
      id: "a22-clean-release-source",
      blockerClass: "release-source-clean",
      statusAfterCurrentFrontier: "still-blocked",
      count: 1,
      detail: "A22 release source is still not eligible for merge or deploy."
    });
  }
  blockers.push({
    id: "a22-post-extraction-candidate-gate-rerun",
    blockerClass: "candidate-validation",
    statusAfterCurrentFrontier: "still-required",
    count: 1,
    detail: "A22 focused smoke, type-check, build, and queue gates must be rerun after any approved extraction."
  });
  if (count(a25Forecast.currentState?.deferredPhysicalLifecycleRows) > 0) {
    blockers.push({
      id: "physical-lifecycle-deferred",
      blockerClass: "deferred-cleanup",
      statusAfterCurrentFrontier: "deferred",
      count: count(a25Forecast.currentState?.deferredPhysicalLifecycleRows),
      detail: "Physical lifecycle cleanup remains deferred until validation, clean release source, and exact cleanup authorization are ready."
    });
  }
  blockers.push({
    id: "merge-not-authorized",
    blockerClass: "explicit-owner-merge-instruction",
    statusAfterCurrentFrontier: "still-blocked",
    count: 1,
    detail: "No merge instruction is recorded by frontier owner-input authorization."
  });
  return blockers.map((row) => ({
    ...row,
    recordsAuthorization: false,
    recordsOwnerInput: false,
    modifiesCandidate: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  }));
}

function buildChecks({
  sourceFailures,
  a25Forecast,
  validateFrontierCapsule,
  a22Runway,
  a22Docket,
  a22Queue,
  a22CandidateMutationDryRun,
  a22CandidateMutationCurrentGate,
  bridge,
  projection,
  validationCommands,
  blockers
}) {
  const ownerPackageGroup = groupById(validateFrontierCapsule.ownerInputGroups, "owner-package-canonical-authorization-focus-batch");
  const a22Group = groupById(validateFrontierCapsule.ownerInputGroups, "a22-root-parity-selected-actions");
  const sourceCurrent = sourceFailures.length === 0;
  const a25FocusRows = count(a25Forecast.currentState?.currentFocusRows);
  const ownerPackagePendingRows = count(ownerPackageGroup.pendingRows);
  const a22SelectedActionRows = count(validateFrontierCapsule.summary?.a22SelectedActionRows, count(a22Group.approvalIds));
  const a22ShapeCurrent = (
    count(a22Group.pendingRows) === 4 &&
    count(a22Group.acceptedRows) === 0
  ) || (
    count(a22Group.pendingRows) === 0 &&
    count(a22Group.acceptedRows) === 4
  );
  const expectedTotalFrontierOwnerRows = ownerPackagePendingRows + a22SelectedActionRows;
  const combinedShapeCurrent = validateFrontierCapsule.capsuleStatus === "waiting-for-owner-frontier-input" &&
    count(validateFrontierCapsule.summary?.ownerInputGroups) === 2 &&
    ownerPackagePendingRows === a25FocusRows &&
    a22ShapeCurrent &&
    count(validateFrontierCapsule.summary?.totalFrontierOwnerRows) === expectedTotalFrontierOwnerRows;
  const a25ProjectionCurrent =
    projection.projectedPendingCanonicalAuthorizationRows ===
      Math.max(0, count(a25Forecast.currentState?.pendingCanonicalAuthorizationRows) - a25FocusRows) &&
    projection.projectedValidAuthorizationRows === count(a25Forecast.currentState?.validAuthorizationRows) + a25FocusRows;
  const preApprovalA22ProjectionCurrent = a22Runway.runwayStatus === "ready-for-owner-input-landing-review" &&
    a22Runway.summary?.ownerInputBlank === true &&
    a22Docket.acceptanceStatus === "waiting-for-owner-action" &&
    count(a22Docket.summary?.acceptedRows) === 0 &&
    projection.a22ProjectedAcceptedSelectedActionRows === 4 &&
    count(a22Runway.summary?.postOwnerInputValidationCommands) === 8;
  const postApprovalA22ProjectionCurrent = a22Runway.runwayStatus === "owner-input-recorded-post-runway" &&
    a22Runway.summary?.ownerInputBlank === false &&
    a22Docket.acceptanceStatus === "ready-for-guarded-extraction" &&
    count(a22Docket.summary?.acceptedRows) === 4 &&
    projection.a22ProjectedAcceptedSelectedActionRows === 4 &&
    count(a22Runway.summary?.postOwnerInputValidationCommands) === 8;
  const postExtractionA22ProjectionCurrent = a22Runway.runwayStatus === "owner-input-recorded-post-runway" &&
    a22Runway.summary?.ownerInputBlank === false &&
    a22Docket.acceptanceStatus === "post-extraction-verified" &&
    count(a22Docket.summary?.acceptedRows) === 4 &&
    a22Queue.summary?.topCandidateQueueActionStatus === "needs-typecheck-remediation-and-fresh-build-observation" &&
    projection.a22ProjectedAcceptedSelectedActionRows === 4 &&
    count(a22Runway.summary?.postOwnerInputValidationCommands) === 8;
  const a22ProjectionCurrent = preApprovalA22ProjectionCurrent || postApprovalA22ProjectionCurrent || postExtractionA22ProjectionCurrent;
  const preApprovalCandidateMutationCurrent = a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-missing-recorded-instructions" &&
    a22CandidateMutationDryRun.ownerInputBlank === true &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const postApprovalCandidateMutationCurrent = a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-owner-candidate-mutation-input" &&
    a22CandidateMutationDryRun.ownerInputBlank === true &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const postExtractionCandidateMutationCurrent = a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
    a22CandidateMutationDryRun.ownerInputBlank === false &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsMissing) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 4 &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const a22CandidateMutationCurrent = preApprovalCandidateMutationCurrent || postApprovalCandidateMutationCurrent || postExtractionCandidateMutationCurrent;
  const validationChainVisible = validationCommands.a25PostInputValidationCommandRows === 5 &&
    validationCommands.a25DeferredAggregateValidationCommandRows === 8 &&
    validationCommands.a22PostOwnerInputValidationCommandRows === 8 &&
    validationCommands.combinedPostOwnerInputValidationCommands.length >= 20;
  const mergeRemainsBlocked = validateFrontierCapsule.summary?.readyForMerge === false &&
    bridge.summary?.validateExitReady === false &&
    a22Queue.summary?.releaseSourceEligibleNow === false &&
    blockers.some((row) => row.id === "merge-not-authorized");
  const nonExecutableBoundary = count(validateFrontierCapsule.summary?.cleanupAuthorizedRows) === 0 &&
    count(validateFrontierCapsule.summary?.executableRows) === 0 &&
    count(a22Queue.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22Queue.summary?.executableRows) === 0 &&
    safeFalseBoundary(validateFrontierCapsule.boundary, [
      "recordsAuthorization",
      "recordsOwnerInput",
      "recordsExtractionInstruction",
      "modifiesCandidate",
      "copiesRootFiles",
      "stageAuthorized",
      "commitAuthorized",
      "mergeAuthorized",
      "cleanupAuthorized",
      "executableNow",
      "deployAuthorized",
      "destructiveGitAuthorized",
      "physicalLifecycleCleanupAuthorized"
    ]) &&
    safeFalseBoundary(a22Runway.boundary, [
      "recordsOwnerInput",
      "appliesOwnerInputPatch",
      "recordsExtractionInstruction",
      "modifiesCandidate",
      "copiesRootFiles",
      "stageAuthorized",
      "commitAuthorized",
      "mergeAuthorized",
      "cleanupAuthorized",
      "executableNow",
      "deployAuthorized",
      "destructiveGitAuthorized",
      "physicalLifecycleCleanupAuthorized"
    ]);

  return [
    {
      id: "source-current",
      status: sourceCurrent ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "combined-frontier-shape-current",
      status: combinedShapeCurrent ? "pass" : "fail",
      detail: `ownerInputGroups=${validateFrontierCapsule.summary?.ownerInputGroups}; a25Rows=${ownerPackageGroup.pendingRows ?? 0}; a22Rows=${a22Group.pendingRows ?? 0}; total=${validateFrontierCapsule.summary?.totalFrontierOwnerRows ?? 0}`
    },
    {
      id: "a25-transition-projection-current",
      status: a25ProjectionCurrent ? "pass" : "fail",
      detail: `pending=${a25Forecast.currentState?.pendingCanonicalAuthorizationRows}; projectedPending=${projection.projectedPendingCanonicalAuthorizationRows}; projectedValid=${projection.projectedValidAuthorizationRows}`
    },
    {
      id: "a22-transition-projection-current",
      status: a22ProjectionCurrent ? "pass" : "fail",
      detail: `runway=${a22Runway.runwayStatus}; acceptedNow=${a22Docket.summary?.acceptedRows}; projectedAccepted=${projection.a22ProjectedAcceptedSelectedActionRows}`
    },
    {
      id: "a22-candidate-mutation-dry-run-current",
      status: a22CandidateMutationCurrent ? "pass" : "fail",
      detail: `executorStatus=${a22CandidateMutationDryRun.executorStatus ?? "unknown"}; recordedInstructions=${a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? 0}; applyPermitted=${a22CandidateMutationDryRun.summary?.applyPermitted === true}; candidateMutationRows=${a22CandidateMutationDryRun.summary?.candidateMutationRows ?? 0}; gateFailures=${a22CandidateMutationCurrentGate.failures?.length ?? 0}`
    },
    {
      id: "post-owner-input-validation-chain-visible",
      status: validationChainVisible ? "pass" : "fail",
      detail: `a25Immediate=${validationCommands.a25PostInputValidationCommandRows}; a25Deferred=${validationCommands.a25DeferredAggregateValidationCommandRows}; a22=${validationCommands.a22PostOwnerInputValidationCommandRows}; combined=${validationCommands.combinedPostOwnerInputValidationCommands.length}`
    },
    {
      id: "merge-remains-blocked",
      status: mergeRemainsBlocked ? "pass" : "fail",
      detail: `validateExitReady=${bridge.summary?.validateExitReady === true}; releaseSourceEligibleNow=${a22Queue.summary?.releaseSourceEligibleNow === true}; readyForMerge=${validateFrontierCapsule.summary?.readyForMerge === true}`
    },
    {
      id: "non-executable-boundary",
      status: nonExecutableBoundary ? "pass" : "fail",
      detail: "frontier forecast remains evidence-only with cleanup/merge/deploy/executable rows at 0"
    }
  ];
}

export function buildValidateFrontierTransitionForecast() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.dirtyMap),
    authorizationTransitionForecast: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.authorizationTransitionForecast),
    validateFrontierCapsule: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.validateFrontierCapsule),
    a22OwnerInputLandingRunway: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerInputLandingRunway),
    a22OwnerActionAcceptanceDocket: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22OwnerActionAcceptanceDocket),
    a22CleanSourceValidationQueue: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CleanSourceValidationQueue),
    a22CandidateMutationDryRun: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationDryRun),
    a22CandidateMutationCurrentGate: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.a22CandidateMutationCurrentGate),
    sevenStepClosureBridge: readJson(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.sevenStepClosureBridge)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const a25Forecast = artifacts.authorizationTransitionForecast;
  const capsule = artifacts.validateFrontierCapsule;
  const a22Runway = artifacts.a22OwnerInputLandingRunway;
  const a22Docket = artifacts.a22OwnerActionAcceptanceDocket;
  const a22Queue = artifacts.a22CleanSourceValidationQueue;
  const a22CandidateMutationDryRun = artifacts.a22CandidateMutationDryRun;
  const a22CandidateMutationCurrentGate = artifacts.a22CandidateMutationCurrentGate;
  const bridge = artifacts.sevenStepClosureBridge;
  const ownerPackageGroup = groupById(capsule.ownerInputGroups, "owner-package-canonical-authorization-focus-batch");
  const a22Group = groupById(capsule.ownerInputGroups, "a22-root-parity-selected-actions");
  const a25CurrentFocusRows = count(a25Forecast.currentState?.currentFocusRows, count(ownerPackageGroup.pendingRows));
  const currentPendingCanonicalRows = count(a25Forecast.currentState?.pendingCanonicalAuthorizationRows);
  const currentValidAuthorizationRows = count(a25Forecast.currentState?.validAuthorizationRows);
  const projectedPendingCanonicalRows = count(a25Forecast.projectedAfterCurrentFocusAuthorization?.projectedPendingCanonicalAuthorizationRows);
  const projectedValidAuthorizationRows = count(a25Forecast.projectedAfterCurrentFocusAuthorization?.projectedValidAuthorizationRows);
  const a22SelectedActionRows = count(capsule.summary?.a22SelectedActionRows, count(a22Group.pendingRows));
  const a22AcceptedRows = count(a22Docket.summary?.acceptedRows);
  const a22ProjectedAcceptedRows = a22SelectedActionRows;
  const combinedFrontierOwnerRows = a25CurrentFocusRows + (a22SelectedActionRows - a22AcceptedRows);
  const validationCommands = {
    a25PostInputValidationCommands: a25Forecast.validationCommandsAfterOwnerInput?.postInputValidationCommands ?? [],
    a25DeferredAggregateValidationCommands: a25Forecast.validationCommandsAfterOwnerInput?.deferredAggregateValidationCommands ?? [],
    a22PostOwnerInputValidationCommands: a22Runway.postOwnerInputValidationCommands ?? [],
    a25PostInputValidationCommandRows: count(a25Forecast.validationCommandsAfterOwnerInput?.postInputValidationCommandRows),
    a25DeferredAggregateValidationCommandRows: count(a25Forecast.validationCommandsAfterOwnerInput?.deferredAggregateValidationCommandRows),
    a22PostOwnerInputValidationCommandRows: count(a22Runway.summary?.postOwnerInputValidationCommands),
    combinedPostOwnerInputValidationCommands: unique([
      ...(a25Forecast.validationCommandsAfterOwnerInput?.postInputValidationCommands ?? []),
      ...(a25Forecast.validationCommandsAfterOwnerInput?.deferredAggregateValidationCommands ?? []),
      ...(a22Runway.postOwnerInputValidationCommands ?? [])
    ])
  };
  const projection = {
    projectedPendingCanonicalAuthorizationRows: projectedPendingCanonicalRows,
    projectedValidAuthorizationRows,
    projectedCurrentA25FocusRows: 0,
    projectedHeldPolicyRows: count(a25Forecast.currentState?.heldPolicyRows),
    projectedHeldPolicyApprovalIds: a25Forecast.currentState?.heldPolicyApprovalIds ?? [],
    a22ProjectedAcceptedSelectedActionRows: a22ProjectedAcceptedRows,
    a22ProjectedPendingSelectedActionRows: 0,
    a22ProjectedOwnerActionAcceptanceStatus: "projected-owner-input-accepted-still-needs-recording-and-guarded-extraction",
    a22ProjectedQueueActionStatus: "post-owner-input-validation-chain-ready-before-candidate-rerun",
    projectedValidateExitReady: false,
    projectedReadyForMerge: false,
    projectedReleaseSourceEligibleNow: false,
    projectedReleaseSourceSelected: false,
    projectedCleanupAuthorizedRows: 0,
    projectedExecutableRows: 0
  };
  const blockers = buildBlockers({
    a25Forecast,
    validateFrontierCapsule: capsule,
    a22Queue,
    a22CandidateMutationDryRun,
    bridge,
    projectedPendingCanonicalRows
  });
  const checks = buildChecks({
    sourceFailures,
    a25Forecast,
    validateFrontierCapsule: capsule,
    a22Runway,
    a22Docket,
    a22Queue,
    a22CandidateMutationDryRun,
    a22CandidateMutationCurrentGate,
    bridge,
    projection,
    validationCommands,
    blockers
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    forecastKind: "a25-a22-validate-frontier-transition-forecast",
    forecastStatus: failedChecks === 0 ? "current-frontier-projection-ready" : "not-ready-check-failures",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    currentState: {
      ownerInputGroups: count(capsule.summary?.ownerInputGroups),
      combinedFrontierOwnerRows,
      a25CurrentFocusRows,
      a25CurrentFocusApprovalIds: a25Forecast.currentState?.currentFocusApprovalIds ?? [],
      a22SelectedActionRows,
      a22AcceptedSelectedActionRows: a22AcceptedRows,
      a22ApprovalIds: a22Group.approvalIds ?? [],
      a22RunwayStatus: a22Runway.runwayStatus ?? "",
      a22OwnerInputBlank: a22Runway.summary?.ownerInputBlank === true,
      a22CandidateMutationExecutorStatus: a22CandidateMutationDryRun.executorStatus ?? "",
      a22CandidateMutationRecordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      a22CandidateMutationApplyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
      a22CandidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
      a22CandidateMutationCurrentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length),
      currentPendingCanonicalAuthorizationRows: currentPendingCanonicalRows,
      currentValidAuthorizationRows,
      heldRows: count(a25Forecast.currentState?.heldRows),
      heldPolicyRows: count(a25Forecast.currentState?.heldPolicyRows),
      heldPolicyApprovalIds: a25Forecast.currentState?.heldPolicyApprovalIds ?? [],
      deferredPhysicalLifecycleRows: count(a25Forecast.currentState?.deferredPhysicalLifecycleRows),
      validateExitReadyNow: bridge.summary?.validateExitReady === true,
      readyForMergeNow: capsule.summary?.readyForMerge === true,
      releaseSourceEligibleNow: a22Queue.summary?.releaseSourceEligibleNow === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    assumedOwnerFrontierAction: {
      action: "approve-current-a25-owner-package-focus-and-a22-selectedaction-owner-input",
      ownerPackageCopyableOwnerReplyTextZh: ownerPackageGroup.copyableOwnerReplyTextZh ?? "",
      a22CopyableOwnerReplyTextZh: a22Group.copyableOwnerReplyTextZh ?? "",
      a22ExactOwnerExecutionTextLines: a22Group.exactOwnerExecutionTextLines ?? [],
      recordsAuthorizationOnlyAfterExplicitOwnerReply: true,
      recordsA22OwnerInputOnlyAfterExplicitOwnerReply: true,
      cleanupAuthorized: false,
      executableNow: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    },
    projectedAfterCurrentFrontierAuthorization: projection,
    blockersAfterCurrentFrontier: blockers,
    validationCommandsAfterOwnerInput: validationCommands,
    checks,
    summary: {
      ownerInputGroups: count(capsule.summary?.ownerInputGroups),
      combinedFrontierOwnerRows,
      a25CurrentFocusRows,
      a22SelectedActionRows,
      a22ProjectedAcceptedSelectedActionRows: a22ProjectedAcceptedRows,
      a22CandidateMutationExecutorStatus: a22CandidateMutationDryRun.executorStatus ?? "",
      a22CandidateMutationRecordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      a22CandidateMutationApplyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
      a22CandidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
      a22CandidateMutationCurrentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length),
      currentPendingCanonicalAuthorizationRows: currentPendingCanonicalRows,
      projectedPendingCanonicalAuthorizationRows: projectedPendingCanonicalRows,
      currentValidAuthorizationRows,
      projectedValidAuthorizationRows,
      heldRows: count(a25Forecast.currentState?.heldRows),
      heldPolicyRows: count(a25Forecast.currentState?.heldPolicyRows),
      deferredPhysicalLifecycleRows: count(a25Forecast.currentState?.deferredPhysicalLifecycleRows),
      blockersAfterCurrentFrontier: blockers.length,
      a25PostInputValidationCommandRows: validationCommands.a25PostInputValidationCommandRows,
      a25DeferredAggregateValidationCommandRows: validationCommands.a25DeferredAggregateValidationCommandRows,
      a22PostOwnerInputValidationCommandRows: validationCommands.a22PostOwnerInputValidationCommandRows,
      combinedPostOwnerInputValidationCommandRows: validationCommands.combinedPostOwnerInputValidationCommands.length,
      validateExitReadyNow: bridge.summary?.validateExitReady === true,
      projectedValidateExitReady: false,
      projectedReadyForMerge: false,
      releaseSourceEligibleNow: a22Queue.summary?.releaseSourceEligibleNow === true,
      projectedReleaseSourceEligibleNow: false,
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
      requiresExplicitOwnerApprovalBeforeA25Recording: true,
      requiresExplicitOwnerApprovalBeforeA22OwnerInput: true,
      requiresSeparateA22RecordingStep: true,
      requiresSeparateA22CandidateMutationInstruction: true
    }
  };
}

export function stableValidateFrontierTransitionForecastProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    forecastKind: payload.forecastKind,
    forecastStatus: payload.forecastStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    currentState: payload.currentState,
    assumedOwnerFrontierAction: payload.assumedOwnerFrontierAction,
    projectedAfterCurrentFrontierAuthorization: payload.projectedAfterCurrentFrontierAuthorization,
    blockersAfterCurrentFrontier: payload.blockersAfterCurrentFrontier,
    validationCommandsAfterOwnerInput: payload.validationCommandsAfterOwnerInput,
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
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none |";
  const blockers = payload.blockersAfterCurrentFrontier.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.statusAfterCurrentFrontier)} | ${cell(row.blockerClass)} | ${row.count} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | 0 | none |";

  return `# A25/A22 Validate Frontier Transition Forecast

Generated: ${payload.generatedAt}

Forecast status: \`${payload.forecastStatus}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This forecast is evidence-only. It projects the current A25/A22 owner-input frontier without recording authorization, recording owner input, recording extraction instructions, copying root files, mutating a candidate worktree, running type-check/build/regression, staging, committing, merging, deploying, cleaning, deleting, resetting, pruning, or authorizing physical lifecycle cleanup.

## Summary

- Owner input groups: ${payload.summary.ownerInputGroups}
- Combined frontier owner rows: ${payload.summary.combinedFrontierOwnerRows}
- A25 current focus rows: ${payload.summary.a25CurrentFocusRows}
- A22 selectedAction rows: ${payload.summary.a22SelectedActionRows}
- A22 projected accepted selectedAction rows: ${payload.summary.a22ProjectedAcceptedSelectedActionRows}
- A22 candidate-mutation executor status: \`${payload.summary.a22CandidateMutationExecutorStatus}\`
- A22 candidate-mutation recorded instruction rows: ${payload.summary.a22CandidateMutationRecordedInstructionRows}/4
- A22 candidate-mutation apply permitted: ${payload.summary.a22CandidateMutationApplyPermitted ? "yes" : "no"}
- A22 candidate-mutation rows: ${payload.summary.a22CandidateMutationRows}
- A22 candidate-mutation current gate failures: ${payload.summary.a22CandidateMutationCurrentGateFailures}
- Current pending canonical authorization rows: ${payload.summary.currentPendingCanonicalAuthorizationRows}
- Projected pending canonical authorization rows: ${payload.summary.projectedPendingCanonicalAuthorizationRows}
- Current valid authorization rows: ${payload.summary.currentValidAuthorizationRows}
- Projected valid authorization rows: ${payload.summary.projectedValidAuthorizationRows}
- Held rows: ${payload.summary.heldRows}
- Held policy rows: ${payload.summary.heldPolicyRows}
- Deferred physical lifecycle rows: ${payload.summary.deferredPhysicalLifecycleRows}
- Checks passing: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Projected After Current Frontier Authorization

- Projected A25 current focus rows: ${payload.projectedAfterCurrentFrontierAuthorization.projectedCurrentA25FocusRows}
- Projected pending canonical authorization rows: ${payload.projectedAfterCurrentFrontierAuthorization.projectedPendingCanonicalAuthorizationRows}
- Projected valid authorization rows: ${payload.projectedAfterCurrentFrontierAuthorization.projectedValidAuthorizationRows}
- A22 projected owner action acceptance status: \`${payload.projectedAfterCurrentFrontierAuthorization.a22ProjectedOwnerActionAcceptanceStatus}\`
- A22 projected queue action status: \`${payload.projectedAfterCurrentFrontierAuthorization.a22ProjectedQueueActionStatus}\`
- Projected validate exit ready: ${payload.projectedAfterCurrentFrontierAuthorization.projectedValidateExitReady ? "yes" : "no"}
- Projected ready for merge: ${payload.projectedAfterCurrentFrontierAuthorization.projectedReadyForMerge ? "yes" : "no"}
- Projected release source eligible now: ${payload.projectedAfterCurrentFrontierAuthorization.projectedReleaseSourceEligibleNow ? "yes" : "no"}
- Projected cleanup-authorized rows: ${payload.projectedAfterCurrentFrontierAuthorization.projectedCleanupAuthorizedRows}
- Projected executable rows: ${payload.projectedAfterCurrentFrontierAuthorization.projectedExecutableRows}

## Blockers After Current Frontier

| ID | Status | Class | Count | Detail |
| --- | --- | --- | ---: | --- |
${blockers}

## Validation Commands

A25 immediate commands:
${list(payload.validationCommandsAfterOwnerInput.a25PostInputValidationCommands.map((command) => `\`${command}\``))}

A25 deferred aggregate commands:
${list(payload.validationCommandsAfterOwnerInput.a25DeferredAggregateValidationCommands.map((command) => `\`${command}\``))}

A22 post-owner-input commands:
${list(payload.validationCommandsAfterOwnerInput.a22PostOwnerInputValidationCommands.map((command) => `\`${command}\``))}

Combined unique commands:
${list(payload.validationCommandsAfterOwnerInput.combinedPostOwnerInputValidationCommands.map((command) => `\`${command}\``))}

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
- Requires explicit owner approval before A25 recording: true
- Requires explicit owner approval before A22 owner input: true
- Requires separate A22 recording step: true
- Requires separate A22 candidate mutation instruction: true
`;
}

export function writeValidateFrontierTransitionForecast() {
  const payload = buildValidateFrontierTransitionForecast();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestJson, json);
  write(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.datedJson, json);
  write(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.latestMarkdown, md);
  write(VALIDATE_FRONTIER_TRANSITION_FORECAST_PATHS.datedMarkdown, md);
  return payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const payload = writeValidateFrontierTransitionForecast();
  console.log("A25/A22 validate frontier transition forecast generated");
  console.log(`Forecast status: ${payload.forecastStatus}`);
  console.log(`Combined frontier rows: ${payload.summary.combinedFrontierOwnerRows}`);
  console.log(`Projected pending canonical rows: ${payload.summary.projectedPendingCanonicalAuthorizationRows}`);
  console.log(`A22 projected accepted rows: ${payload.summary.a22ProjectedAcceptedSelectedActionRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}
