#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  transitionForecast: "coordination/release-intake/latest-A25-validate-frontier-transition-forecast.json",
  authorizationRoundValidationPlan: "coordination/release-intake/latest-A25-authorization-round-validation-plan.json",
  validateFrontierCapsule: "coordination/release-intake/latest-A25-validate-frontier-owner-input-request-capsule.json",
  a22OwnerInputLandingRunway: "coordination/release-intake/latest-A22-root-parity-owner-input-landing-runway.json",
  a22CleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  a22CandidateMutationDryRun: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  a22CandidateMutationCurrentGate: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-current-gate.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  latestJson: "coordination/release-intake/latest-A25-validate-frontier-post-input-runway.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-frontier-post-input-runway.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-frontier-post-input-runway.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-frontier-post-input-runway.md`
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

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.baseline?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS[key], payload)
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

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function safeFalseBoundary(boundary, keys) {
  return keys.every((key) => boundary?.[key] === false);
}

function topQueueRow(queue) {
  return (queue.validationQueueRows ?? []).find((row) => row.isTopCandidate) ??
    (queue.validationQueueRows ?? [])[0] ??
    {};
}

function phaseBoundary(extra = {}) {
  return {
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
    ...extra
  };
}

function buildPhaseRows({ transition, validationPlan, capsule, a22Runway, a22Queue, a22CandidateMutationDryRun, a22CandidateMutationCurrentGate }) {
  const topQueue = topQueueRow(a22Queue);
  const validationHoldStatus = validationPlan.validationHold?.status ?? "unknown";
  const ownerFrontierRows = count(transition.summary?.combinedFrontierOwnerRows);
  const a25FocusRows = count(transition.summary?.a25CurrentFocusRows);
  const a22OwnerInputRecorded = a22Runway.runwayStatus === "owner-input-recorded-post-runway" &&
    a22Runway.summary?.ownerInputRecorded === true;
  const a22PostExtractionVerified = a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.candidateTargetsVerified) === 4;

  return [
    {
      order: 1,
      id: "preflight-currentness",
      ownerIds: ["A25", "A22"],
      status: "safe-now",
      safeRunnableNow: true,
      blockedUntil: "none",
      purpose: "Confirm the dirty map, transition forecast, and no-staged guard before any owner-input recording.",
      commands: [
        "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
        "node coordination/release-intake/assert-validate-frontier-transition-forecast-current.mjs",
        "node coordination/release-intake/assert-no-staged-changes.mjs"
      ],
      stopCondition: "Stop if currentness or staged-change gates fail.",
      boundary: phaseBoundary()
    },
    {
      order: 2,
      id: "owner-frontier-approval-required",
      ownerIds: ["A25", "A22"],
      status: ownerFrontierRows === 0 ? "completed-current-frontier-owner-input-recorded" : "blocked-explicit-owner-approval-required",
      safeRunnableNow: false,
      blockedUntil: ownerFrontierRows === 0 ? "none; current A25/A22 owner frontier has no pending rows" : "Owner approves the exact A25 3 focus rows and A22 4 selectedAction rows.",
      purpose: "Collect owner approval without treating it as cleanup, merge, deploy, or candidate mutation authorization.",
      commands: [],
      a25CopyableOwnerReplyTextZh: transition.assumedOwnerFrontierAction?.ownerPackageCopyableOwnerReplyTextZh ?? "",
      a22CopyableOwnerReplyTextZh: transition.assumedOwnerFrontierAction?.a22CopyableOwnerReplyTextZh ?? "",
      a22ExactOwnerExecutionTextLines: transition.assumedOwnerFrontierAction?.a22ExactOwnerExecutionTextLines ?? [],
      stopCondition: "Stop if the owner reply omits any row, changes selectedAction text, or adds cleanup/merge/deploy/destructive scope.",
      boundary: phaseBoundary({
        requiresExplicitOwnerApprovalBeforeA25Recording: true,
        requiresExplicitOwnerApprovalBeforeA22OwnerInput: true
      })
    },
    {
      order: 3,
      id: "a25-canonical-authorization-validation",
      ownerIds: ["A25"],
      status: a25FocusRows === 0 ? "completed-no-current-a25-focus-rows" : "blocked-until-a25-focus-rows-recorded",
      safeRunnableNow: false,
      blockedUntil: a25FocusRows === 0 ? "none; A25 focus rows are already consumed into the canonical state" : "A25 focus authorization rows have been recorded from explicit owner approval.",
      purpose: "Validate canonical authorization inputs and rebuild the non-executable authorization preview.",
      commands: validationPlan.safePostInputValidationCommands ?? [],
      stopCondition: "Stop if canonical authorization currentness or owner closure input readiness fails.",
      boundary: phaseBoundary({
        requiresExplicitOwnerApprovalBeforeA25Recording: true
      })
    },
    {
      order: 4,
      id: "a22-owner-input-recording-and-guarded-extraction-dry-run",
      ownerIds: ["A22"],
      status: a22PostExtractionVerified
        ? "post-extraction-verified-awaiting-typecheck-build-remediation"
        : a22OwnerInputRecorded
          ? "owner-input-recorded-awaiting-candidate-mutation-input"
          : "blocked-until-a22-owner-input-recorded",
      safeRunnableNow: false,
      blockedUntil: a22PostExtractionVerified
        ? "none for root-parity extraction; A22 top candidate now needs type-check/build remediation."
        : a22OwnerInputRecorded
          ? "A22 candidate mutation owner input is recorded separately."
          : "A22 selectedAction owner input is recorded from explicit owner approval.",
      purpose: "Run A22 instruction intake, recording, guarded-extraction dry-run, and current gates without selecting a release source.",
      commands: a22Runway.postOwnerInputValidationCommands ?? [],
      candidateMutationDryRunState: {
        executorStatus: a22CandidateMutationDryRun.executorStatus ?? "unknown",
        recordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
        applyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
        candidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
        currentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length)
      },
      stopCondition: "Stop if owner input remains blank, instruction recording is missing, guarded extraction is not current, candidate targets are still missing, or separate candidate mutation input is absent.",
      boundary: phaseBoundary({
        requiresExplicitOwnerApprovalBeforeA22OwnerInput: true,
        requiresSeparateA22RecordingStep: true,
        requiresSeparateA22CandidateMutationInstruction: true
      })
    },
    {
      order: 5,
      id: "a22-candidate-gate-rerun-after-extraction",
      ownerIds: ["A22"],
      status: "blocked-until-a22-guarded-extraction-evidence-current",
      safeRunnableNow: false,
      blockedUntil: "A22 root-parity extraction evidence is current and the top candidate is ready for gate rerun.",
      purpose: "Rerun the focused smoke, type-check, build snapshot, and clean-source queue after approved extraction evidence.",
      topCandidate: {
        branch: topQueue.branch ?? "",
        path: topQueue.path ?? "",
        head: topQueue.head ?? "",
        gateCoverageStatus: topQueue.gateCoverageStatus ?? "",
        queueActionStatus: topQueue.queueActionStatus ?? ""
      },
      commands: topQueue.safeValidationCommands ?? [],
      stopCondition: "Stop if focused smoke, type-check, build, or clean-source queue remains red.",
      boundary: phaseBoundary({
        rerunOnlyAfterExtractionEvidence: true
      })
    },
    {
      order: 6,
      id: "a25-deferred-aggregate-validation",
      ownerIds: ["A25", "A22"],
      status: validationHoldStatus === "ready" ? "blocked-until-candidate-gates-green" : `held:${validationHoldStatus}`,
      safeRunnableNow: false,
      blockedUntil: "Candidate gates are green and the active validation hold has been explicitly released.",
      purpose: "Refresh linked-worktree evidence, Wave 06, aggregate remediation, and completion audit after post-input gates.",
      commands: validationPlan.deferredAggregateValidationCommands ?? [],
      validationHold: validationPlan.validationHold ?? null,
      stopCondition: "Stop if the validation hold remains active or aggregate current gate fails.",
      boundary: phaseBoundary()
    },
    {
      order: 7,
      id: "merge-cleanup-deploy-decision-gate",
      ownerIds: ["A22", "A25"],
      status: "blocked-explicit-merge-cleanup-deploy-authorization-required",
      safeRunnableNow: false,
      blockedUntil: "validateExitReady, releaseSourceEligibleNow, strict lifecycle, and separate owner merge/cleanup/deploy authorization are all present.",
      purpose: "Keep merge, cleanup, physical lifecycle cleanup, and deploy blocked until the release source is clean and the owner gives exact instructions.",
      commands: [],
      stopCondition: "Stop unless clean-source, strict lifecycle, merge authorization, cleanup authorization, and deploy authorization are each explicit and current.",
      boundary: phaseBoundary({
        requiresSeparateMergeAuthorization: true,
        requiresSeparateCleanupAuthorization: true,
        requiresSeparateDeployAuthorization: true,
        requiresSeparatePhysicalLifecycleCleanupAuthorization: true
      })
    }
  ];
}

function buildChecks({
  sourceFailures,
  transition,
  validationPlan,
  capsule,
  a22Runway,
  a22Queue,
  a22CandidateMutationDryRun,
  a22CandidateMutationCurrentGate,
  bridge,
  phaseRows
}) {
  const topQueue = topQueueRow(a22Queue);
  const boundaryKeys = [
    "recordsAuthorization",
    "recordsOwnerInput",
    "recordsExtractionInstruction",
    "modifiesCandidate",
    "copiesRootFiles",
    "runsTypeCheck",
    "runsBuild",
    "runsRegression",
    "stageAuthorized",
    "commitAuthorized",
    "mergeAuthorized",
    "cleanupAuthorized",
    "executableNow",
    "deployAuthorized",
    "destructiveGitAuthorized",
    "physicalLifecycleCleanupAuthorized"
  ];

  const expectedCombinedFrontierRows =
    count(transition.summary?.a25CurrentFocusRows) +
    Math.max(0, count(transition.summary?.a22SelectedActionRows) - count(capsule.summary?.a22AcceptedSelectedActionRows));
  const expectedTotalFrontierOwnerRows =
    count(transition.summary?.a25CurrentFocusRows) +
    count(transition.summary?.a22SelectedActionRows);
  const frontierShapeCurrent = transition.forecastStatus === "current-frontier-projection-ready" &&
    capsule.capsuleStatus === "waiting-for-owner-frontier-input" &&
    count(transition.summary?.combinedFrontierOwnerRows) === expectedCombinedFrontierRows &&
    count(capsule.summary?.totalFrontierOwnerRows) === expectedTotalFrontierOwnerRows;
  const a25ValidationChainVisible = count(validationPlan.summary?.safePostInputValidationCommands) === 5 &&
    count(validationPlan.summary?.deferredAggregateValidationCommands) === 8 &&
    (validationPlan.safePostInputValidationCommands ?? []).length === 5 &&
    (validationPlan.deferredAggregateValidationCommands ?? []).length === 8;
  const a22OwnerInputChainVisible = ["ready-for-owner-input-landing-review", "owner-input-recorded-post-runway"].includes(a22Runway.runwayStatus) &&
    (a22Runway.summary?.ownerInputBlank === true || a22Runway.summary?.ownerInputRecorded === true) &&
    count(a22Runway.summary?.postOwnerInputValidationCommands) === 8 &&
    (a22Runway.postOwnerInputValidationCommands ?? []).length === 8;
  const a22CandidateMutationDryRunCurrent = a22CandidateMutationDryRun.executorStatus === "dry-run-blocked-owner-candidate-mutation-input" &&
    a22CandidateMutationDryRun.ownerInputBlank === true &&
    count(a22CandidateMutationDryRun.summary?.expectedRows) === 4 &&
    count(a22CandidateMutationDryRun.summary?.recordedInstructionRows) === 4 &&
    a22CandidateMutationDryRun.summary?.applyPermitted === false &&
    a22CandidateMutationDryRun.summary?.mutationsPerformed === false &&
    count(a22CandidateMutationDryRun.summary?.rootCopyRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.candidateMutationRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.cleanupAuthorizedRows) === 0 &&
    count(a22CandidateMutationDryRun.summary?.executableRows) === 0 &&
    count(a22CandidateMutationCurrentGate.failures?.length) === 0 &&
    count(a22CandidateMutationCurrentGate.candidateMutationRows) === 0 &&
    count(a22CandidateMutationCurrentGate.executableRows) === 0;
  const a22PostExtractionVerified = a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
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
  const candidateRerunChainVisible = [
    "waiting-top-candidate-root-parity-owner-input",
    "waiting-top-candidate-candidate-mutation-owner-input",
    "waiting-top-candidate-typecheck-build-remediation",
    "fallback-candidate-green-await-clean-source-selection-review"
  ].includes(a22Queue.queueStatus) &&
    topQueue.isTopCandidate === true &&
    topQueue.focusedSmokePassed === true &&
    topQueue.typeCheckPassed === false &&
    topQueue.buildPassed === false &&
    (topQueue.safeValidationCommands ?? []).length >= 19;
  const mergeCleanupDeployBlocked = bridge.summary?.validateExitReady === false &&
    a22Queue.summary?.releaseSourceEligibleNow === false &&
    transition.summary?.projectedReadyForMerge === false &&
    transition.summary?.cleanupAuthorizedRows === 0 &&
    transition.summary?.executableRows === 0;
  const nonExecutableBoundary = safeFalseBoundary(transition.boundary, boundaryKeys) &&
    safeFalseBoundary(capsule.boundary, boundaryKeys) &&
    safeFalseBoundary(a22Runway.boundary, boundaryKeys.filter((key) => key !== "recordsAuthorization")) &&
    safeFalseBoundary(a22Queue.boundary, boundaryKeys.filter((key) => key !== "recordsAuthorization")) &&
    safeFalseBoundary(bridge.boundary, [
      "mergeAuthorized",
      "cleanupAuthorized",
      "executableNow",
      "deployAuthorized",
      "dirtyRootDeployAuthorized",
      "destructiveGitAuthorized",
      "physicalCleanupAuthorized"
    ]);
  const stopConditionsVisible = phaseRows.length === 7 &&
    phaseRows.every((row) => String(row.stopCondition ?? "").length > 0) &&
    phaseRows.filter((row) => row.safeRunnableNow === false).length === 6;

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "frontier-shape-current",
      status: frontierShapeCurrent ? "pass" : "fail",
      detail: `frontier=${transition.summary?.combinedFrontierOwnerRows}; a25=${transition.summary?.a25CurrentFocusRows}; a22=${transition.summary?.a22SelectedActionRows}`
    },
    {
      id: "a25-validation-chain-visible",
      status: a25ValidationChainVisible ? "pass" : "fail",
      detail: `safe=${validationPlan.summary?.safePostInputValidationCommands}; deferred=${validationPlan.summary?.deferredAggregateValidationCommands}`
    },
    {
      id: "a22-owner-input-chain-visible",
      status: a22OwnerInputChainVisible ? "pass" : "fail",
      detail: `runway=${a22Runway.runwayStatus}; ownerInputBlank=${a22Runway.summary?.ownerInputBlank}; commands=${a22Runway.summary?.postOwnerInputValidationCommands}`
    },
    {
      id: "a22-candidate-mutation-dry-run-current",
      status: a22CandidateMutationDryRunCurrent || a22PostExtractionVerified ? "pass" : "fail",
      detail: `executorStatus=${a22CandidateMutationDryRun.executorStatus ?? "unknown"}; recordedInstructions=${a22CandidateMutationDryRun.summary?.recordedInstructionRows ?? 0}; applyPermitted=${a22CandidateMutationDryRun.summary?.applyPermitted === true}; candidateMutationRows=${a22CandidateMutationDryRun.summary?.candidateMutationRows ?? 0}; gateFailures=${a22CandidateMutationCurrentGate.failures?.length ?? 0}`
    },
    {
      id: "a22-candidate-rerun-chain-visible",
      status: candidateRerunChainVisible ? "pass" : "fail",
      detail: `queue=${a22Queue.queueStatus}; focusedSmoke=${topQueue.focusedSmokePassed}; typeCheck=${topQueue.typeCheckPassed}; build=${topQueue.buildPassed}; commands=${topQueue.safeValidationCommands?.length ?? 0}`
    },
    {
      id: "merge-cleanup-deploy-blocked",
      status: mergeCleanupDeployBlocked ? "pass" : "fail",
      detail: `validateExitReady=${bridge.summary?.validateExitReady}; releaseSourceEligibleNow=${a22Queue.summary?.releaseSourceEligibleNow}; readyForMerge=${transition.summary?.projectedReadyForMerge}`
    },
    {
      id: "non-executable-boundary",
      status: nonExecutableBoundary ? "pass" : "fail",
      detail: "runway records no authorization, owner input, candidate mutation, merge, cleanup, deploy, or physical lifecycle cleanup"
    },
    {
      id: "stop-conditions-visible",
      status: stopConditionsVisible ? "pass" : "fail",
      detail: `phases=${phaseRows.length}; blocked=${phaseRows.filter((row) => row.safeRunnableNow === false).length}`
    }
  ];
}

export function buildValidateFrontierPostInputRunway() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.dirtyMap),
    transitionForecast: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.transitionForecast),
    authorizationRoundValidationPlan: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.authorizationRoundValidationPlan),
    validateFrontierCapsule: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.validateFrontierCapsule),
    a22OwnerInputLandingRunway: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22OwnerInputLandingRunway),
    a22CleanSourceValidationQueue: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CleanSourceValidationQueue),
    a22CandidateMutationDryRun: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationDryRun),
    a22CandidateMutationCurrentGate: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.a22CandidateMutationCurrentGate),
    sevenStepClosureBridge: readJson(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.sevenStepClosureBridge)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const transition = artifacts.transitionForecast;
  const validationPlan = artifacts.authorizationRoundValidationPlan;
  const capsule = artifacts.validateFrontierCapsule;
  const a22Runway = artifacts.a22OwnerInputLandingRunway;
  const a22Queue = artifacts.a22CleanSourceValidationQueue;
  const a22CandidateMutationDryRun = artifacts.a22CandidateMutationDryRun;
  const a22CandidateMutationCurrentGate = artifacts.a22CandidateMutationCurrentGate;
  const bridge = artifacts.sevenStepClosureBridge;
  const phaseRows = buildPhaseRows({ transition, validationPlan, capsule, a22Runway, a22Queue, a22CandidateMutationDryRun, a22CandidateMutationCurrentGate });
  const topQueue = topQueueRow(a22Queue);
  const checks = buildChecks({
    sourceFailures,
    transition,
    validationPlan,
    capsule,
    a22Runway,
    a22Queue,
    a22CandidateMutationDryRun,
    a22CandidateMutationCurrentGate,
    bridge,
    phaseRows
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    runwayKind: "a25-a22-validate-frontier-post-input-runway",
    runwayStatus: failedChecks === 0
      ? (count(transition.summary?.combinedFrontierOwnerRows) === 0
        ? a22CandidateMutationDryRun.executorStatus === "already-extracted-and-verified"
          ? "waiting-for-a22-typecheck-build-remediation"
          : "waiting-for-a22-candidate-mutation-owner-input"
        : "waiting-for-owner-frontier-approval")
      : "not-ready-check-failures",
    currentStep: "owner-input",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    frontier: {
      ownerInputGroups: count(transition.summary?.ownerInputGroups),
      ownerFrontierRows: count(transition.summary?.combinedFrontierOwnerRows),
      a25FocusRows: count(transition.summary?.a25CurrentFocusRows),
      a25FocusApprovalIds: transition.currentState?.a25CurrentFocusApprovalIds ?? [],
      a22SelectedActionRows: count(transition.summary?.a22SelectedActionRows),
      a22ApprovalIds: transition.currentState?.a22ApprovalIds ?? [],
      currentPendingCanonicalAuthorizationRows: count(transition.summary?.currentPendingCanonicalAuthorizationRows),
      projectedPendingCanonicalAuthorizationRows: count(transition.summary?.projectedPendingCanonicalAuthorizationRows),
      currentValidAuthorizationRows: count(transition.summary?.currentValidAuthorizationRows),
      projectedValidAuthorizationRows: count(transition.summary?.projectedValidAuthorizationRows)
    },
    phaseRows,
    commandChains: {
      preflightCommands: phaseRows.find((row) => row.id === "preflight-currentness")?.commands ?? [],
      a25SafePostInputValidationCommands: validationPlan.safePostInputValidationCommands ?? [],
      a25DeferredAggregateValidationCommands: validationPlan.deferredAggregateValidationCommands ?? [],
      a22PostOwnerInputValidationCommands: a22Runway.postOwnerInputValidationCommands ?? [],
      a22CandidateGateRerunCommands: topQueue.safeValidationCommands ?? []
    },
    blockers: {
      transitionBlockers: transition.blockersAfterCurrentFrontier ?? [],
      validationHold: validationPlan.validationHold ?? null,
      topCandidateRequiredBeforeNextGateRun: topQueue.requiredBeforeNextGateRun ?? [],
      directFailedMergeChecks: count(capsule.summary?.directFailedMergeChecks),
      packageWorktreeTypeCheckErrorLines: count(bridge.summary?.packageWorktreeTypeCheckErrorLines),
      a22TypeCheckErrorLines: count(a22Queue.summary?.typeCheckErrorLines),
      a22CandidateMutationExecutorStatus: a22CandidateMutationDryRun.executorStatus ?? "",
      a22CandidateMutationRecordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      a22CandidateMutationApplyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
      a22CandidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
      a22CandidateMutationCurrentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length),
      buildFailureCategory: a22Queue.summary?.buildFailureCategory ?? ""
    },
    checks,
    summary: {
      ownerInputGroups: count(transition.summary?.ownerInputGroups),
      ownerFrontierRows: count(transition.summary?.combinedFrontierOwnerRows),
      a25FocusRows: count(transition.summary?.a25CurrentFocusRows),
      a22SelectedActionRows: count(transition.summary?.a22SelectedActionRows),
      pendingCanonicalAuthorizationRows: count(transition.summary?.currentPendingCanonicalAuthorizationRows),
      projectedPendingCanonicalAuthorizationRows: count(transition.summary?.projectedPendingCanonicalAuthorizationRows),
      validAuthorizationRows: count(transition.summary?.currentValidAuthorizationRows),
      projectedValidAuthorizationRows: count(transition.summary?.projectedValidAuthorizationRows),
      phaseRows: phaseRows.length,
      safeRunnablePreflightRows: phaseRows.filter((row) => row.safeRunnableNow === true).length,
      blockedPhaseRows: phaseRows.filter((row) => row.safeRunnableNow === false).length,
      a25SafePostInputValidationCommands: validationPlan.safePostInputValidationCommands?.length ?? 0,
      a25DeferredAggregateValidationCommands: validationPlan.deferredAggregateValidationCommands?.length ?? 0,
      a22PostOwnerInputValidationCommands: a22Runway.postOwnerInputValidationCommands?.length ?? 0,
      a22CandidateGateRerunCommands: topQueue.safeValidationCommands?.length ?? 0,
      a22CandidateMutationExecutorStatus: a22CandidateMutationDryRun.executorStatus ?? "",
      a22CandidateMutationRecordedInstructionRows: count(a22CandidateMutationDryRun.summary?.recordedInstructionRows),
      a22CandidateMutationApplyPermitted: a22CandidateMutationDryRun.summary?.applyPermitted === true,
      a22CandidateMutationRows: count(a22CandidateMutationDryRun.summary?.candidateMutationRows),
      a22CandidateMutationCurrentGateFailures: count(a22CandidateMutationCurrentGate.failures?.length),
      validateExitReadyNow: bridge.summary?.validateExitReady === true,
      releaseSourceEligibleNow: a22Queue.summary?.releaseSourceEligibleNow === true,
      candidateFocusedSmokePassed: topQueue.focusedSmokePassed === true,
      candidateTypeCheckPassed: topQueue.typeCheckPassed === true,
      candidateBuildPassed: topQueue.buildPassed === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      checks: checks.length,
      passingChecks: checks.filter((row) => row.status === "pass").length,
      failedChecks,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      runwayOnly: true,
      recordsAuthorization: false,
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
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresExplicitOwnerApprovalBeforeA25Recording: true,
      requiresExplicitOwnerApprovalBeforeA22OwnerInput: true,
      requiresSeparateA22RecordingStep: true,
      requiresSeparateA22CandidateMutationInstruction: true,
      requiresSeparateCandidateGateRerun: true,
      requiresSeparateMergeAuthorization: true,
      requiresSeparateCleanupAuthorization: true,
      requiresSeparateDeployAuthorization: true,
      requiresSeparatePhysicalLifecycleCleanupAuthorization: true
    }
  };
}

export function stableValidateFrontierPostInputRunwayProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    runwayKind: payload.runwayKind,
    runwayStatus: payload.runwayStatus,
    currentStep: payload.currentStep,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    frontier: payload.frontier,
    phaseRows: payload.phaseRows,
    commandChains: payload.commandChains,
    blockers: payload.blockers,
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
  const phases = payload.phaseRows.map((row) => (
    `| ${row.order} | \`${cell(row.id)}\` | ${cell(row.ownerIds.join(","))} | ${cell(row.status)} | ${row.safeRunnableNow ? "yes" : "no"} | ${cell(row.stopCondition)} |`
  )).join("\n");
  const checks = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");

  return `# A25/A22 Validate Frontier Post-Input Runway

Generated: ${payload.generatedAt}

Runway status: \`${payload.runwayStatus}\`

Current step: \`${payload.currentStep}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This runway is evidence-only. It explains the post-owner-input order for A25-owned canonical authorization validation and A22-owned clean-source recovery without recording authorization, recording owner input, applying owner-input patches, recording extraction instructions, mutating a candidate, copying root files, running type-check/build/regression, staging, committing, merging, deploying, cleaning, deleting, resetting, pruning, or authorizing physical lifecycle cleanup.

## Summary

- Owner frontier rows: ${payload.summary.ownerFrontierRows}
- A25 focus rows: ${payload.summary.a25FocusRows}
- A22 selectedAction rows: ${payload.summary.a22SelectedActionRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Projected pending canonical authorization rows: ${payload.summary.projectedPendingCanonicalAuthorizationRows}
- Phase rows: ${payload.summary.phaseRows}
- Safe runnable preflight rows: ${payload.summary.safeRunnablePreflightRows}
- Blocked phase rows: ${payload.summary.blockedPhaseRows}
- A25 safe post-input validation commands: ${payload.summary.a25SafePostInputValidationCommands}
- A25 deferred aggregate validation commands: ${payload.summary.a25DeferredAggregateValidationCommands}
- A22 post-owner-input commands: ${payload.summary.a22PostOwnerInputValidationCommands}
- A22 candidate gate rerun commands: ${payload.summary.a22CandidateGateRerunCommands}
- A22 candidate-mutation executor status: \`${payload.summary.a22CandidateMutationExecutorStatus}\`
- A22 candidate-mutation recorded instruction rows: ${payload.summary.a22CandidateMutationRecordedInstructionRows}/4
- A22 candidate-mutation apply permitted: ${payload.summary.a22CandidateMutationApplyPermitted ? "yes" : "no"}
- A22 candidate-mutation rows: ${payload.summary.a22CandidateMutationRows}
- A22 candidate-mutation current gate failures: ${payload.summary.a22CandidateMutationCurrentGateFailures}
- Candidate focused smoke passed: ${payload.summary.candidateFocusedSmokePassed ? "yes" : "no"}
- Candidate type-check passed: ${payload.summary.candidateTypeCheckPassed ? "yes" : "no"}
- Candidate build passed: ${payload.summary.candidateBuildPassed ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Checks passing: ${payload.summary.passingChecks}/${payload.summary.checks}

## Phase Rows

| Order | Phase | Owner | Status | Safe Now | Stop Condition |
| ---: | --- | --- | --- | --- | --- |
${phases}

## Command Chains

A25 safe post-input validation:
${list(payload.commandChains.a25SafePostInputValidationCommands.map((command) => `\`${command}\``))}

A22 post-owner-input commands:
${list(payload.commandChains.a22PostOwnerInputValidationCommands.map((command) => `\`${command}\``))}

A22 candidate gate rerun commands:
${list(payload.commandChains.a22CandidateGateRerunCommands.map((command) => `\`${command}\``))}

A25 deferred aggregate validation:
${list(payload.commandChains.a25DeferredAggregateValidationCommands.map((command) => `\`${command}\``))}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Records authorization: false
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
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
- Requires explicit owner approval before A25 recording: true
- Requires explicit owner approval before A22 owner input: true
- Requires separate A22 recording step: true
- Requires separate A22 candidate mutation instruction: true
- Requires separate candidate gate rerun: true
- Requires separate merge authorization: true
- Requires separate cleanup authorization: true
- Requires separate deploy authorization: true
- Requires separate physical lifecycle cleanup authorization: true
`;
}

export function writeValidateFrontierPostInputRunway() {
  const payload = buildValidateFrontierPostInputRunway();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestJson, json);
  write(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.datedJson, json);
  write(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.latestMarkdown, md);
  write(VALIDATE_FRONTIER_POST_INPUT_RUNWAY_PATHS.datedMarkdown, md);
  return payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const payload = writeValidateFrontierPostInputRunway();
  console.log("A25/A22 validate frontier post-input runway generated");
  console.log(`Runway status: ${payload.runwayStatus}`);
  console.log(`Owner frontier rows: ${payload.summary.ownerFrontierRows}`);
  console.log(`Phase rows: ${payload.summary.phaseRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}
