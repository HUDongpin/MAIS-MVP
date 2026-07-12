#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  physicalClosureQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  wave06Readiness: "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.json",
  ownerClosureQueue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  ownerDecisionFocus: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  ownerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  ownerAuthorizationExecutionPreview: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  ownerAuthorizedCommandManifest: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  ownerExecutionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  remainingCompletionAssignments: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  ownerBlockerReports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  pendingOwnerBlockerBundle: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  ownerClosureWorkOrderBundle: "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
  closureLoopState: "coordination/release-intake/latest-A25-dirty-worktree-closure-loop-state.json",
  validateToMergeHandoff: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  a22ResidualEvidence: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
  a22ResidualAuthorizationPacket: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  a22ReleaseSourceBlocker: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  a25StrictLifecycleBlocker: "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.json",
  noDirtyRootDeployEvidence: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  rootTypecheckStatus: "coordination/release-intake/latest-A25-root-typecheck-status.json",
  latestJson: "coordination/release-intake/latest-A25-current-cleanup-status-snapshot.json",
  latestMarkdown: "coordination/release-intake/latest-A25-current-cleanup-status-snapshot.md",
  datedJson: `coordination/release-intake/${date}-A25-current-cleanup-status-snapshot.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-current-cleanup-status-snapshot.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function inputStamp(relativePath, payload) {
  return {
    path: relativePath,
    generatedAt: payload.generatedAt ?? null,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature ?? payload.statusSignature ?? payload.dirtyMap?.statusSignature ?? null,
    expandedStatusEntries: payload.expandedStatusEntries ?? payload.statusCounts?.expandedStatusEntries ?? payload.summary?.dirtyMapExpandedEntries ?? payload.summary?.ownerPackageEntries ?? payload.dirtyMap?.expandedStatusEntries ?? null
  };
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function artifactSummary(artifact, keys) {
  const summary = artifact.summary ?? {};
  return Object.fromEntries(keys.map((key) => [key, summary[key] ?? artifact[key] ?? null]));
}

function statusCounts(dirtyMap) {
  const counts = dirtyMap.statusCounts ?? {};
  return {
    collapsedStatusEntries: count(counts.collapsedStatusEntries),
    expandedStatusEntries: count(counts.expandedStatusEntries, (dirtyMap.entries ?? []).length),
    trackedModified: count(counts.trackedModified),
    trackedDeleted: count(counts.trackedDeleted),
    untrackedStatusEntries: count(counts.untrackedStatusEntries),
    untrackedFiles: count(counts.untrackedFiles)
  };
}

function inputFreshness(inputs, dirtyMap) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const rows = inputs.map((input) => {
    const hasSignature = Boolean(input.dirtyMapStatusSignature);
    const hasEntries = input.expandedStatusEntries !== null && input.expandedStatusEntries !== undefined;
    const signatureMatches = hasSignature && input.dirtyMapStatusSignature === expectedSignature;
    const entryCountMatches = hasEntries && input.expandedStatusEntries === expectedEntries;
    const status = signatureMatches && entryCountMatches ? "current" : hasSignature || hasEntries ? "stale" : "unknown";
    return {
      path: input.path,
      status,
      generatedAt: input.generatedAt,
      dirtyMapStatusSignature: input.dirtyMapStatusSignature,
      expandedStatusEntries: input.expandedStatusEntries,
      signatureMatches,
      entryCountMatches
    };
  });
  return {
    expectedDirtyMapStatusSignature: expectedSignature,
    expectedExpandedStatusEntries: expectedEntries,
    totalInputs: rows.length,
    currentInputs: rows.filter((row) => row.status === "current").length,
    staleInputs: rows.filter((row) => row.status === "stale").length,
    unknownInputs: rows.filter((row) => row.status === "unknown").length,
    staleInputPaths: rows.filter((row) => row.status === "stale").map((row) => row.path),
    unknownInputPaths: rows.filter((row) => row.status === "unknown").map((row) => row.path),
    rows
  };
}

export function buildCurrentCleanupStatusSnapshot() {
  const artifacts = {
    dirtyMap: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.dirtyMap),
    completionAudit: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.completionAudit),
    physicalClosureQueue: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.physicalClosureQueue),
    wave06Readiness: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.wave06Readiness),
    ownerClosureQueue: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureQueue),
    ownerDecisionFocus: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerDecisionFocus),
    ownerAuthorizationsStarter: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizationsStarter),
    ownerAuthorizationExecutionPreview: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizationExecutionPreview),
    ownerAuthorizedCommandManifest: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizedCommandManifest),
    ownerExecutionInstructions: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerExecutionInstructions),
    ownerClosureInputReadiness: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureInputReadiness),
    remainingCompletionAssignments: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.remainingCompletionAssignments),
    ownerBlockerReports: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerBlockerReports),
    pendingOwnerBlockerBundle: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.pendingOwnerBlockerBundle),
    ownerInputActionPacket: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerInputActionPacket),
    ownerClosureWorkOrderBundle: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureWorkOrderBundle),
    closureLoopState: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.closureLoopState),
    validateToMergeHandoff: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.validateToMergeHandoff),
    a22ResidualEvidence: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ResidualEvidence),
    a22ResidualAuthorizationPacket: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ResidualAuthorizationPacket),
    a22ReleaseSourceBlocker: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ReleaseSourceBlocker),
    a25StrictLifecycleBlocker: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a25StrictLifecycleBlocker),
    noDirtyRootDeployEvidence: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.noDirtyRootDeployEvidence),
    rootTypecheckStatus: readJson(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.rootTypecheckStatus)
  };

  const dirtyCounts = statusCounts(artifacts.dirtyMap);
  const completion = artifacts.completionAudit.summary ?? {};
  const physicalSummary = artifacts.physicalClosureQueue.summary ?? {};
  const closureQueueSummary = artifacts.ownerClosureQueue.summary ?? {};
  const decisionFocusSummary = artifacts.ownerDecisionFocus.summary ?? {};
  const authorizationSummary = artifacts.ownerAuthorizationsStarter.summary ?? {};
  const authorizationExecutionPreviewSummary = artifacts.ownerAuthorizationExecutionPreview.summary ?? {};
  const authorizedCommandManifestSummary = artifacts.ownerAuthorizedCommandManifest.summary ?? {};
  const ownerExecutionInstructionsSummary = artifacts.ownerExecutionInstructions.summary ?? artifacts.ownerExecutionInstructions ?? {};
  const closureInputReadinessSummary = artifacts.ownerClosureInputReadiness.summary ?? {};
  const ownerInputActionSummary = artifacts.ownerInputActionPacket.summary ?? {};
  const strictSummary = artifacts.a25StrictLifecycleBlocker.summary ?? {};
  const releaseSourceSummary = artifacts.a22ReleaseSourceBlocker.summary ?? {};
  const residualSummary = artifacts.a22ResidualEvidence.summary ?? {};
  const wave06Summary = artifacts.wave06Readiness.summary ?? {};
  const validateToMergeSummary = artifacts.validateToMergeHandoff.summary ?? {};
  const validateToMergeFailedChecks = (artifacts.validateToMergeHandoff.mergeChecks ?? []).filter((row) => row.passed !== true);
  const validateToMergePassedChecks = (artifacts.validateToMergeHandoff.mergeChecks ?? []).filter((row) => row.passed === true);
  const inputs = [
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.dirtyMap, artifacts.dirtyMap),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.completionAudit, artifacts.completionAudit),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.physicalClosureQueue, artifacts.physicalClosureQueue),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.wave06Readiness, artifacts.wave06Readiness),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureQueue, artifacts.ownerClosureQueue),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerDecisionFocus, artifacts.ownerDecisionFocus),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizationsStarter, artifacts.ownerAuthorizationsStarter),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizationExecutionPreview, artifacts.ownerAuthorizationExecutionPreview),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerAuthorizedCommandManifest, artifacts.ownerAuthorizedCommandManifest),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerExecutionInstructions, artifacts.ownerExecutionInstructions),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureInputReadiness, artifacts.ownerClosureInputReadiness),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.remainingCompletionAssignments, artifacts.remainingCompletionAssignments),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerBlockerReports, artifacts.ownerBlockerReports),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.pendingOwnerBlockerBundle, artifacts.pendingOwnerBlockerBundle),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerInputActionPacket, artifacts.ownerInputActionPacket),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.ownerClosureWorkOrderBundle, artifacts.ownerClosureWorkOrderBundle),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.closureLoopState, artifacts.closureLoopState),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.validateToMergeHandoff, artifacts.validateToMergeHandoff),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ResidualEvidence, artifacts.a22ResidualEvidence),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ResidualAuthorizationPacket, artifacts.a22ResidualAuthorizationPacket),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a22ReleaseSourceBlocker, artifacts.a22ReleaseSourceBlocker),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.a25StrictLifecycleBlocker, artifacts.a25StrictLifecycleBlocker),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.noDirtyRootDeployEvidence, artifacts.noDirtyRootDeployEvidence),
    inputStamp(CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.rootTypecheckStatus, artifacts.rootTypecheckStatus)
  ];

  const cleanupAuthorizedRows =
    count(physicalSummary.cleanupAuthorizedRows) +
    count(closureQueueSummary.cleanupAuthorizedRows) +
    count(decisionFocusSummary.cleanupAuthorizedRows) +
    count(authorizationSummary.cleanupAuthorizedRows) +
    count(authorizationExecutionPreviewSummary.cleanupAuthorizedRows) +
    count(authorizedCommandManifestSummary.cleanupAuthorizedRows) +
    count(ownerExecutionInstructionsSummary.cleanupAuthorizedRows) +
    count(closureInputReadinessSummary.cleanupAuthorizedRows) +
    count(ownerInputActionSummary.cleanupAuthorizedRows);
  const executableRows =
    count(physicalSummary.executableRows) +
    count(closureQueueSummary.executableRows) +
    count(decisionFocusSummary.executableRows) +
    count(authorizationSummary.executableRows) +
    count(authorizationExecutionPreviewSummary.executableRows) +
    count(authorizedCommandManifestSummary.executableRows) +
    count(ownerExecutionInstructionsSummary.executableRows) +
    count(closureInputReadinessSummary.executableRows) +
    count(ownerInputActionSummary.executableRows);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    branch: git(["branch", "--show-current"]) || "(detached)",
    head: git(["rev-parse", "--short", "HEAD"]),
    inputs,
    inputFreshness: inputFreshness(inputs, artifacts.dirtyMap),
    status: {
      dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature ?? null,
      dirtyMapGeneratedAt: artifacts.dirtyMap.generatedAt ?? null,
      ...dirtyCounts
    },
    completion: {
      complete: artifacts.completionAudit.complete === true,
      totalRequirements: count(completion.totalRequirements),
      completedRequirements: count(completion.completedRequirements),
      incompleteRequirements: count(completion.incompleteRequirements),
      totalPlanTasks: count(completion.totalPlanTasks),
      completedPlanTasks: count(completion.completedPlanTasks),
      incompletePlanTasks: count(completion.incompletePlanTasks)
    },
    releaseSource: artifactSummary(artifacts.a22ReleaseSourceBlocker, [
      "releaseSourceClean",
      "releaseSourceBlocked",
      "rootStatusEntries",
      "dirtyMapExpandedEntries",
      "cleanupAuthorizedRows",
      "executableRows",
      "contentCapturedRows"
    ]),
    strictLifecycle: artifactSummary(artifacts.a25StrictLifecycleBlocker, [
      "strictLifecycleClean",
      "strictLifecycleBlocked",
      "worktreeCount",
      "dirtyOpenDecisions",
      "cleanDivergedOpenDecisions",
      "openDecisionRows",
      "prunableWorktrees",
      "cleanupAuthorizedRows",
      "executableRows",
      "worktreeRemovalAuthorizedRows",
      "branchDeletionAuthorizedRows",
      "contentCapturedRows"
    ]),
    wave06: {
      finalClosureReady: artifacts.wave06Readiness.finalClosureReady === true,
      passedChecks: count(wave06Summary.passedChecks),
      failedChecks: count(wave06Summary.failedChecks),
      remainingStrictBlockers: artifacts.wave06Readiness.remainingStrictBlockers ?? []
    },
    physicalClosure: artifactSummary(artifacts.physicalClosureQueue, [
      "ownerPackageApprovals",
      "physicalLifecycleApprovals",
      "totalApprovals",
      "ownerPackageEntries",
      "physicalRootApprovals",
      "dirtyLinkedApprovals",
      "cleanDivergedApprovals",
      "cleanupAuthorizedRows",
      "executableRows"
    ]),
    ownerFrontier: {
      closureQueue: artifactSummary(artifacts.ownerClosureQueue, [
        "owners",
        "pendingItems",
        "recordedBlockerReports",
        "pendingBlockerReports",
        "authorizationStarters",
        "remainingCompletionAssignments",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      decisionFocus: artifactSummary(artifacts.ownerDecisionFocus, [
        "sourceOwnerClosurePendingItems",
        "wave01PackageResyncApprovals",
        "pendingOwnerBlockerReports",
        "remainingCompletionAssignments",
        "totalDecisionRows",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      authorizationsStarter: {
        starterRows: count(authorizationSummary.starterRows),
        blankApprovalRows: count(authorizationSummary.blankApprovalRows),
        byKind: authorizationSummary.byKind ?? {},
        cleanupAuthorizedRows: count(authorizationSummary.cleanupAuthorizedRows),
        executableRows: count(authorizationSummary.executableRows)
      },
      authorizationExecutionPreview: artifactSummary(artifacts.ownerAuthorizationExecutionPreview, [
        "starterRows",
        "authorizationFilePresent",
        "authorizationRowsInFile",
        "validAuthorizationRows",
        "invalidAuthorizationRows",
        "pendingAuthorizationRows",
        "preAuthorizationReadyRows",
        "preAuthorizationAttentionRows",
        "evidenceCompleteRows",
        "worktreeCheckRows",
        "worktreePresentRows",
        "targetPathCheckRows",
        "targetPathPresentRows",
        "exactCommandRows",
        "exactCommandTargetReadyRows",
        "pathspecRows",
        "pathspecPresentRows",
        "workOrderRows",
        "workOrderPresentRows",
        "commandPreviewRows",
        "separateExecutionInstructionRequiredRows",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      authorizedCommandManifest: artifactSummary(artifacts.ownerAuthorizedCommandManifest, [
        "starterRows",
        "validAuthorizationRows",
        "pendingAuthorizationRows",
        "invalidAuthorizationRows",
        "commandPreviewRows",
        "authorizedCandidateRows",
        "readyForSeparateInstructionRows",
        "blockedCandidateRows",
        "preAuthorizationReadyRows",
        "preAuthorizationAttentionRows",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      executionInstructions: artifactSummary(artifacts.ownerExecutionInstructions, [
        "manifestCandidateRows",
        "readyForSeparateInstructionRows",
        "supplementalA16CandidateRows",
        "supplementalA16ReadyForOwnerExecutionInstructionRows",
        "effectiveCandidateRows",
        "effectiveReadyForSeparateInstructionRows",
        "instructionRowsInFile",
        "validInstructionRows",
        "invalidInstructionRows",
        "pendingReadyManifestRows",
        "effectivePendingReadyInstructionRows",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      closureInputReadiness: artifactSummary(artifacts.ownerClosureInputReadiness, [
        "ownerInputsReady",
        "inputBlocks",
        "pendingCanonicalAuthorizationRows",
        "pendingWave01AuthorizationRows",
        "pendingOwnerBlockerReportRecords",
        "validAuthorizationRows",
        "commandPreviewRows",
        "ownerClosurePendingItems",
        "nextOwnerDecisionRows",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      blockerReports: artifactSummary(artifacts.ownerBlockerReports, [
        "recordedReports",
        "pendingReports",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      pendingReportBundle: artifactSummary(artifacts.pendingOwnerBlockerBundle, [
        "pendingReports",
        "cleanupAuthorizedRows",
        "executableRows"
      ]),
      inputActionPacket: artifactSummary(artifacts.ownerInputActionPacket, [
        "ownerInputsReady",
        "requiredInputFiles",
        "missingInputFiles",
        "pendingCanonicalAuthorizationRows",
        "pendingWave01AuthorizationRows",
        "pendingOwnerBlockerReportRecords",
        "authorizationStarterRows",
        "pendingOwnerBlockerReports",
        "nextOwnerDecisionRows",
        "ownerClosurePendingItems",
        "cleanupAuthorizedRows",
        "executableRows",
        "sourceCurrentnessFailures"
      ]),
      workOrderBundle: artifactSummary(artifacts.ownerClosureWorkOrderBundle, [
        "owners",
        "pendingItems",
        "cleanupAuthorizedRows",
        "executableRows"
      ])
    },
    closureLoop: {
      activeStep: artifacts.closureLoopState.activeStep,
      loopOrder: artifacts.closureLoopState.loopOrder,
      completedSteps: count(artifacts.closureLoopState.summary?.completedSteps),
      activeSteps: count(artifacts.closureLoopState.summary?.activeSteps),
      blockedSteps: count(artifacts.closureLoopState.summary?.blockedSteps),
      authorizationStarterRows: count(artifacts.closureLoopState.summary?.authorizationStarterRows),
      pendingCanonicalAuthorizationRows: count(artifacts.closureLoopState.summary?.pendingCanonicalAuthorizationRows),
      validAuthorizationRows: count(artifacts.closureLoopState.summary?.validAuthorizationRows),
      readyExecutionInstructionRows: count(artifacts.closureLoopState.summary?.readyExecutionInstructionRows),
      validExecutionInstructionRows: count(artifacts.closureLoopState.summary?.validExecutionInstructionRows),
      pendingReadyExecutionInstructionRows: count(artifacts.closureLoopState.summary?.pendingReadyExecutionInstructionRows),
      a16ReadyForSeparateInstructionRows: count(artifacts.closureLoopState.summary?.a16ReadyForSeparateInstructionRows),
      a16ReadyForOwnerExecutionInstructionRows: count(artifacts.closureLoopState.summary?.a16ReadyForOwnerExecutionInstructionRows),
      a16ValidExecutionInstructionRows: count(artifacts.closureLoopState.summary?.a16ValidExecutionInstructionRows),
      a16PendingOwnerExecutionInstructionRows: count(artifacts.closureLoopState.summary?.a16PendingOwnerExecutionInstructionRows),
      a16InstructionRows: count(artifacts.closureLoopState.summary?.a16InstructionRows),
      a16DraftInstructionRows: count(artifacts.closureLoopState.summary?.a16DraftInstructionRows),
      a16PackageFileRows: count(artifacts.closureLoopState.summary?.a16PackageFileRows),
      a16PackageFingerprintRows: count(artifacts.closureLoopState.summary?.a16PackageFingerprintRows),
      a16PostExtractionLifecycleStatus: artifacts.closureLoopState.summary?.a16PostExtractionLifecycleStatus ?? "",
      a16PostExtractionVerified: artifacts.closureLoopState.summary?.a16PostExtractionVerified === true,
      a16PostExtractionFailedChecks: count(artifacts.closureLoopState.summary?.a16PostExtractionFailedChecks),
      effectiveReadyExecutionInstructionRows: count(artifacts.closureLoopState.summary?.effectiveReadyExecutionInstructionRows),
      effectiveValidExecutionInstructionRows: count(artifacts.closureLoopState.summary?.effectiveValidExecutionInstructionRows),
      effectivePendingReadyExecutionInstructionRows: count(artifacts.closureLoopState.summary?.effectivePendingReadyExecutionInstructionRows),
      preAuthorizationReadyRows: count(artifacts.closureLoopState.summary?.preAuthorizationReadyRows),
      preAuthorizationAttentionRows: count(artifacts.closureLoopState.summary?.preAuthorizationAttentionRows),
      cleanupAuthorizedRows: count(artifacts.closureLoopState.summary?.cleanupAuthorizedRows),
      executableRows: count(artifacts.closureLoopState.summary?.executableRows),
      validationHoldStatus: artifacts.closureLoopState.summary?.validationHoldStatus ?? "",
      steps: (artifacts.closureLoopState.steps ?? []).map((step) => ({
        id: step.id,
        chineseLabel: step.chineseLabel,
        status: step.status,
        blockers: step.blockers ?? []
      }))
    },
    validateToMergeHandoff: {
      handoffStatus: artifacts.validateToMergeHandoff.handoffStatus ?? "missing",
      readyForMerge: artifacts.validateToMergeHandoff.readyForMerge === true,
      pendingCanonicalAuthorizationRows: count(validateToMergeSummary.pendingCanonicalAuthorizationRows),
      focusBatchPendingRows: count(validateToMergeSummary.focusBatchPendingRows),
      effectivePendingReadyExecutionInstructionRows: count(validateToMergeSummary.effectivePendingReadyExecutionInstructionRows),
      validationHoldStatus: validateToMergeSummary.validationHoldStatus ?? "",
      releaseSourceClean: validateToMergeSummary.releaseSourceClean === true,
      strictLifecycleClean: validateToMergeSummary.strictLifecycleClean === true,
      sourceCurrentnessFailures: count(validateToMergeSummary.sourceCurrentnessFailures),
      passedMergeChecks: validateToMergePassedChecks.length,
      failedMergeChecks: validateToMergeFailedChecks.length,
      failedCheckIds: validateToMergeFailedChecks.map((row) => row.id),
      cleanupAuthorizedRows: count(validateToMergeSummary.cleanupAuthorizedRows),
      executableRows: count(validateToMergeSummary.executableRows)
    },
    generatedArtifactResidual: artifactSummary(artifacts.a22ResidualEvidence, [
      "residualTargets",
      "totalBytes",
      "cleanupAuthorizedRows",
      "executableRows"
    ]),
    generatedArtifactResidualAuthorization: artifactSummary(artifacts.a22ResidualAuthorizationPacket, [
      "residualTargets",
      "zeroByteTargets",
      "cleanupScriptApplyRows",
      "exactDirectoryRemovalRows",
      "cleanupAuthorizedRows",
      "executableRows"
    ]),
    noDirtyRootDeploy: {
      passed: artifacts.noDirtyRootDeployEvidence.passed === true,
      failures: artifacts.noDirtyRootDeployEvidence.failures ?? [],
      localDeploymentRecords: count(artifacts.noDirtyRootDeployEvidence.localDeploymentRecords)
    },
    rootTypecheckStatus: {
      rootTypeCheckPassed: artifacts.rootTypecheckStatus.summary?.rootTypeCheckPassed === true,
      rootTypeCheckStatus: artifacts.rootTypecheckStatus.summary?.rootTypeCheckStatus ?? null,
      rootTypeCheckErrorLines: count(artifacts.rootTypecheckStatus.summary?.rootTypeCheckErrorLines),
      packageWorktreeTypeCheckErrorLines: count(artifacts.rootTypecheckStatus.summary?.packageWorktreeTypeCheckErrorLines),
      packageFrontierRows: count(artifacts.rootTypecheckStatus.summary?.packageFrontierRows),
      packageCriticalOwnerRows: count(artifacts.rootTypecheckStatus.summary?.packageCriticalOwnerRows),
      layerComparisonStatus: artifacts.rootTypecheckStatus.layerComparison?.status ?? "",
      interpretation: artifacts.rootTypecheckStatus.layerComparison?.interpretation ?? "",
      cleanupAuthorizedRows: count(artifacts.rootTypecheckStatus.summary?.cleanupAuthorizedRows),
      executableRows: count(artifacts.rootTypecheckStatus.summary?.executableRows)
    },
    validationHold: {
      status: artifacts.ownerInputActionPacket.validationHold?.status ?? "missing",
      activeWorktreePath: artifacts.ownerInputActionPacket.validationHold?.activeWorktreePath ?? "",
      reason: artifacts.ownerInputActionPacket.validationHold?.reason ?? "",
      resumeCondition: artifacts.ownerInputActionPacket.validationHold?.resumeCondition ?? "",
      safePostInputValidationCommands: artifacts.ownerInputActionPacket.nextValidationCommands ?? [],
      deferredAggregateValidationCommands: artifacts.ownerInputActionPacket.deferredValidationCommands ?? []
    },
    authorizationTotals: {
      cleanupAuthorizedRows,
      executableRows
    },
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      contentCaptured: false
    }
  };
}

export function stableCurrentCleanupStatusSnapshotProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    branch: payload.branch,
    head: payload.head,
    inputs: payload.inputs,
    inputFreshness: payload.inputFreshness,
    status: payload.status,
    completion: payload.completion,
    releaseSource: payload.releaseSource,
    strictLifecycle: payload.strictLifecycle,
    wave06: payload.wave06,
    physicalClosure: payload.physicalClosure,
    ownerFrontier: payload.ownerFrontier,
    closureLoop: payload.closureLoop,
    validateToMergeHandoff: payload.validateToMergeHandoff,
    generatedArtifactResidual: payload.generatedArtifactResidual,
    generatedArtifactResidualAuthorization: payload.generatedArtifactResidualAuthorization,
    noDirtyRootDeploy: payload.noDirtyRootDeploy,
    rootTypecheckStatus: payload.rootTypecheckStatus,
    validationHold: payload.validationHold,
    authorizationTotals: payload.authorizationTotals,
    boundary: payload.boundary
  };
}

function yn(value) {
  return value ? "yes" : "no";
}

function markdown(payload) {
  const inputRows = payload.inputs.map((input) => (
    `| \`${input.path}\` | ${input.generatedAt ?? "n/a"} | ${input.expandedStatusEntries ?? "n/a"} |`
  )).join("\n");
  const freshnessRows = payload.inputFreshness.rows.map((input) => (
    `| \`${input.path}\` | ${input.status} | ${input.signatureMatches ? "yes" : "no"} | ${input.entryCountMatches ? "yes" : "no"} |`
  )).join("\n");
  const strictBlockers = payload.wave06.remainingStrictBlockers.map((item) => `- ${item}`).join("\n") || "- none";
  const authorizationsByKind = Object.entries(payload.ownerFrontier.authorizationsStarter.byKind ?? {})
    .map(([kind, rows]) => `| ${kind} | ${rows} |`)
    .join("\n") || "| none | 0 |";
  const safeValidationCommands = payload.validationHold.safePostInputValidationCommands
    .map((command) => `- \`${command}\``)
    .join("\n") || "- none";
  const deferredValidationCommands = payload.validationHold.deferredAggregateValidationCommands
    .map((command) => `- \`${command}\``)
    .join("\n") || "- none";

  return `# A25 Current Cleanup Status Snapshot

Generated: ${payload.generatedAt}

This is A25 release-intake evidence for the dirty-worktree cleanup plan. It summarizes current upstream evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Completion: ${yn(payload.completion.complete)}
- Requirements complete: ${payload.completion.completedRequirements}/${payload.completion.totalRequirements}
- Plan tasks complete: ${payload.completion.completedPlanTasks}/${payload.completion.totalPlanTasks}
- Dirty-map expanded entries: ${payload.status.expandedStatusEntries}
- Current input artifacts: ${payload.inputFreshness.currentInputs}/${payload.inputFreshness.totalInputs}
- Stale input artifacts: ${payload.inputFreshness.staleInputs}
- Unknown input artifacts: ${payload.inputFreshness.unknownInputs}
- Collapsed root status entries: ${payload.status.collapsedStatusEntries}
- Root status counts: ${payload.status.trackedModified} modified, ${payload.status.trackedDeleted} deleted, ${payload.status.untrackedStatusEntries} untracked status entries
- A22 release source clean: ${yn(payload.releaseSource.releaseSourceClean)}
- A25 strict worktree lifecycle clean: ${yn(payload.strictLifecycle.strictLifecycleClean)}
- Root type-check passed: ${yn(payload.rootTypecheckStatus.rootTypeCheckPassed)}
- Root type-check error lines: ${payload.rootTypecheckStatus.rootTypeCheckErrorLines}
- Package/worktree type-check error lines: ${payload.rootTypecheckStatus.packageWorktreeTypeCheckErrorLines}
- Type-check layer comparison: ${payload.rootTypecheckStatus.layerComparisonStatus}
- Wave 06 final closure ready: ${yn(payload.wave06.finalClosureReady)}
- Validation hold: ${payload.validationHold.status}
- Active closure-loop step: ${payload.closureLoop.activeStep}
- Validate-to-merge handoff status: ${payload.validateToMergeHandoff.handoffStatus}
- Validate-to-merge ready for merge: ${yn(payload.validateToMergeHandoff.readyForMerge)}
- Validate-to-merge failed checks: ${payload.validateToMergeHandoff.failedMergeChecks}
- Closure-loop completed steps: ${payload.closureLoop.completedSteps}/${payload.closureLoop.steps.length}
- Closure-loop blocked steps: ${payload.closureLoop.blockedSteps}
- Safe post-input validation commands: ${payload.validationHold.safePostInputValidationCommands.length}
- Deferred aggregate validation commands: ${payload.validationHold.deferredAggregateValidationCommands.length}
- Cleanup-authorized rows from owner/frontier artifacts: ${payload.authorizationTotals.cleanupAuthorizedRows}
- Executable rows from owner/frontier artifacts: ${payload.authorizationTotals.executableRows}
- Authorization pre-check ready rows: ${payload.ownerFrontier.authorizationExecutionPreview.preAuthorizationReadyRows}/${payload.ownerFrontier.authorizationExecutionPreview.starterRows}
- Authorization pre-check attention rows: ${payload.ownerFrontier.authorizationExecutionPreview.preAuthorizationAttentionRows}
- Exact command target checks ready: ${payload.ownerFrontier.authorizationExecutionPreview.exactCommandTargetReadyRows}/${payload.ownerFrontier.authorizationExecutionPreview.exactCommandRows}
- Authorized command manifest candidates: ${payload.ownerFrontier.authorizedCommandManifest.authorizedCandidateRows}
- Authorized command manifest ready for separate instruction: ${payload.ownerFrontier.authorizedCommandManifest.readyForSeparateInstructionRows}
- Supplemental A16 ready owner execution-input rows: ${payload.ownerFrontier.executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows}
- Effective ready owner execution-input rows: ${payload.ownerFrontier.executionInstructions.effectiveReadyForSeparateInstructionRows}
- Valid owner execution instruction rows: ${payload.ownerFrontier.executionInstructions.validInstructionRows}
- Pending ready manifest rows without execution instructions: ${payload.ownerFrontier.executionInstructions.pendingReadyManifestRows}
- Effective pending ready rows without execution instructions: ${payload.ownerFrontier.executionInstructions.effectivePendingReadyInstructionRows}

## Validation Hold

- Status: ${payload.validationHold.status}
- Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`
- Reason: ${payload.validationHold.reason}
- Resume condition: ${payload.validationHold.resumeCondition}

Safe post-input validation commands:

${safeValidationCommands}

Deferred aggregate validation commands:

${deferredValidationCommands}

## Input Freshness

Expected dirty-map signature: \`${payload.inputFreshness.expectedDirtyMapStatusSignature}\`

Expected expanded status entries: ${payload.inputFreshness.expectedExpandedStatusEntries}

| Input | Status | Signature matches | Entry count matches |
| --- | --- | --- | --- |
${freshnessRows}

## Remaining Strict Blockers

${strictBlockers}

## Owner Frontier

- Owner closure pending items: ${payload.ownerFrontier.closureQueue.pendingItems}
- Next owner decision rows: ${payload.ownerFrontier.decisionFocus.totalDecisionRows}
- Authorization starter rows: ${payload.ownerFrontier.authorizationsStarter.starterRows}
- Authorization pre-check ready rows: ${payload.ownerFrontier.authorizationExecutionPreview.preAuthorizationReadyRows}
- Authorization pre-check attention rows: ${payload.ownerFrontier.authorizationExecutionPreview.preAuthorizationAttentionRows}
- Exact command target checks ready: ${payload.ownerFrontier.authorizationExecutionPreview.exactCommandTargetReadyRows}/${payload.ownerFrontier.authorizationExecutionPreview.exactCommandRows}
- Authorized command manifest candidate rows: ${payload.ownerFrontier.authorizedCommandManifest.authorizedCandidateRows}
- Authorized command manifest ready rows: ${payload.ownerFrontier.authorizedCommandManifest.readyForSeparateInstructionRows}
- Authorized command manifest blocked rows: ${payload.ownerFrontier.authorizedCommandManifest.blockedCandidateRows}
- Supplemental A16 execution-input candidates: ${payload.ownerFrontier.executionInstructions.supplementalA16CandidateRows}
- Supplemental A16 ready owner execution-input rows: ${payload.ownerFrontier.executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows}
- Effective execution-input candidates: ${payload.ownerFrontier.executionInstructions.effectiveCandidateRows}
- Effective ready owner execution-input rows: ${payload.ownerFrontier.executionInstructions.effectiveReadyForSeparateInstructionRows}
- Execution instruction rows in file: ${payload.ownerFrontier.executionInstructions.instructionRowsInFile}
- Valid execution instruction rows: ${payload.ownerFrontier.executionInstructions.validInstructionRows}
- Pending ready manifest rows without execution instructions: ${payload.ownerFrontier.executionInstructions.pendingReadyManifestRows}
- Effective pending ready rows without execution instructions: ${payload.ownerFrontier.executionInstructions.effectivePendingReadyInstructionRows}
- Pending owner blocker reports: ${payload.ownerFrontier.blockerReports.pendingReports}
- Owner closure work-order pending items: ${payload.ownerFrontier.workOrderBundle.pendingItems}

| Authorization kind | Rows |
| --- | ---: |
${authorizationsByKind}

## Closure Loop

- Active step: ${payload.closureLoop.activeStep}
- Completed steps: ${payload.closureLoop.completedSteps}/${payload.closureLoop.steps.length}
- Blocked steps: ${payload.closureLoop.blockedSteps}
- Authorization starter rows: ${payload.closureLoop.authorizationStarterRows}
- Pending canonical authorization rows: ${payload.closureLoop.pendingCanonicalAuthorizationRows}
- Valid authorization rows: ${payload.closureLoop.validAuthorizationRows}
- Ready command rows needing separate execution instructions: ${payload.closureLoop.readyExecutionInstructionRows}
- Valid owner execution instruction rows: ${payload.closureLoop.validExecutionInstructionRows}
- Pending ready command rows without execution instructions: ${payload.closureLoop.pendingReadyExecutionInstructionRows}
- A16 ready separate-instruction rows: ${payload.closureLoop.a16ReadyForSeparateInstructionRows}
- A16 ready owner execution-input rows: ${payload.closureLoop.a16ReadyForOwnerExecutionInstructionRows}
- A16 valid execution instruction rows: ${payload.closureLoop.a16ValidExecutionInstructionRows}
- A16 pending owner execution instruction rows: ${payload.closureLoop.a16PendingOwnerExecutionInstructionRows}
- A16 post-extraction lifecycle: ${payload.closureLoop.a16PostExtractionLifecycleStatus}
- A16 post-extraction verified: ${payload.closureLoop.a16PostExtractionVerified ? "yes" : "no"}
- Effective ready owner execution-input rows: ${payload.closureLoop.effectiveReadyExecutionInstructionRows}
- Effective valid owner execution instruction rows: ${payload.closureLoop.effectiveValidExecutionInstructionRows}
- Effective pending owner execution instruction rows: ${payload.closureLoop.effectivePendingReadyExecutionInstructionRows}
- Pre-authorization ready rows: ${payload.closureLoop.preAuthorizationReadyRows}
- Pre-authorization attention rows: ${payload.closureLoop.preAuthorizationAttentionRows}
- Cleanup-authorized rows: ${payload.closureLoop.cleanupAuthorizedRows}
- Executable rows: ${payload.closureLoop.executableRows}

| Step | Status | Blockers |
| --- | --- | --- |
${payload.closureLoop.steps.map((step) => `| ${step.chineseLabel} / ${step.id} | ${step.status} | ${(step.blockers ?? []).slice(0, 3).join("; ") || "none"} |`).join("\n")}

## Validate-To-Merge Handoff

- Handoff status: ${payload.validateToMergeHandoff.handoffStatus}
- Ready for merge: ${yn(payload.validateToMergeHandoff.readyForMerge)}
- Pending canonical authorization rows: ${payload.validateToMergeHandoff.pendingCanonicalAuthorizationRows}
- Focus batch pending rows: ${payload.validateToMergeHandoff.focusBatchPendingRows}
- Effective pending owner execution instruction rows: ${payload.validateToMergeHandoff.effectivePendingReadyExecutionInstructionRows}
- Validation hold: ${payload.validateToMergeHandoff.validationHoldStatus}
- A22 release source clean: ${yn(payload.validateToMergeHandoff.releaseSourceClean)}
- A25 strict lifecycle clean: ${yn(payload.validateToMergeHandoff.strictLifecycleClean)}
- Source currentness failures: ${payload.validateToMergeHandoff.sourceCurrentnessFailures}
- Passed merge readiness checks: ${payload.validateToMergeHandoff.passedMergeChecks}
- Failed merge readiness checks: ${payload.validateToMergeHandoff.failedMergeChecks}
- Failed check ids: ${payload.validateToMergeHandoff.failedCheckIds.join(", ") || "none"}
- Cleanup-authorized rows: ${payload.validateToMergeHandoff.cleanupAuthorizedRows}
- Executable rows: ${payload.validateToMergeHandoff.executableRows}

## Root Type-Check Status

- Root type-check passed: ${yn(payload.rootTypecheckStatus.rootTypeCheckPassed)}
- Root type-check status: ${payload.rootTypecheckStatus.rootTypeCheckStatus ?? "n/a"}
- Root type-check error lines: ${payload.rootTypecheckStatus.rootTypeCheckErrorLines}
- Package/worktree type-check error lines: ${payload.rootTypecheckStatus.packageWorktreeTypeCheckErrorLines}
- Package frontier rows: ${payload.rootTypecheckStatus.packageFrontierRows}
- Critical owner rows: ${payload.rootTypecheckStatus.packageCriticalOwnerRows}
- Layer comparison: ${payload.rootTypecheckStatus.layerComparisonStatus}
- Interpretation: ${payload.rootTypecheckStatus.interpretation}
- Cleanup-authorized rows: ${payload.rootTypecheckStatus.cleanupAuthorizedRows}
- Executable rows: ${payload.rootTypecheckStatus.executableRows}

## Physical And Lifecycle Closure

- Owner package approvals: ${payload.physicalClosure.ownerPackageApprovals}
- Physical lifecycle approvals: ${payload.physicalClosure.physicalLifecycleApprovals}
- Total approvals: ${payload.physicalClosure.totalApprovals}
- Worktrees: ${payload.strictLifecycle.worktreeCount}
- Dirty open decisions: ${payload.strictLifecycle.dirtyOpenDecisions}
- Clean-diverged open decisions: ${payload.strictLifecycle.cleanDivergedOpenDecisions}
- Open decision rows: ${payload.strictLifecycle.openDecisionRows}
- Worktree-removal authorized rows: ${payload.strictLifecycle.worktreeRemovalAuthorizedRows}
- Branch-deletion authorized rows: ${payload.strictLifecycle.branchDeletionAuthorizedRows}

## Generated Artifact Residual

- Residual cleanup targets: ${payload.generatedArtifactResidual.residualTargets}
- Residual bytes: ${payload.generatedArtifactResidual.totalBytes}
- Residual authorization rows: ${payload.generatedArtifactResidualAuthorization.residualTargets}
- Residual cleanup-script apply rows: ${payload.generatedArtifactResidualAuthorization.cleanupScriptApplyRows}
- Residual exact directory-removal rows: ${payload.generatedArtifactResidualAuthorization.exactDirectoryRemovalRows}
- Cleanup-authorized rows: ${payload.generatedArtifactResidual.cleanupAuthorizedRows}
- Executable rows: ${payload.generatedArtifactResidual.executableRows}

## Input Artifacts

| Artifact | Generated at | Expanded entries |
| --- | --- | ---: |
${inputRows}

## Boundary

This snapshot is evidence-only and non-executable. It is a current status index for the cleanup plan; it does not make any row eligible for cleanup, discard, staging, commit, deploy, branch deletion, worktree lifecycle action, or generated-artifact removal.
`;
}

function main() {
  const payload = buildCurrentCleanupStatusSnapshot();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);

  for (const target of [CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestJson, CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.datedJson]) {
    write(target, json);
  }
  for (const target of [CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestMarkdown, CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.datedMarkdown]) {
    write(target, md);
  }

  console.log(JSON.stringify({
    latestJson: CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestJson,
    latestMarkdown: CURRENT_CLEANUP_STATUS_SNAPSHOT_PATHS.latestMarkdown,
    complete: payload.completion.complete,
    completedRequirements: payload.completion.completedRequirements,
    totalRequirements: payload.completion.totalRequirements,
    completedPlanTasks: payload.completion.completedPlanTasks,
    totalPlanTasks: payload.completion.totalPlanTasks,
    expandedStatusEntries: payload.status.expandedStatusEntries,
    ownerClosurePendingItems: payload.ownerFrontier.closureQueue.pendingItems,
    validationHoldStatus: payload.validationHold.status,
    safePostInputValidationCommands: payload.validationHold.safePostInputValidationCommands.length,
    deferredAggregateValidationCommands: payload.validationHold.deferredAggregateValidationCommands.length,
    validateToMergeHandoffStatus: payload.validateToMergeHandoff.handoffStatus,
    validateToMergeReadyForMerge: payload.validateToMergeHandoff.readyForMerge,
    validateToMergeFailedChecks: payload.validateToMergeHandoff.failedMergeChecks,
    rootTypeCheckPassed: payload.rootTypecheckStatus.rootTypeCheckPassed,
    rootTypeCheckErrorLines: payload.rootTypecheckStatus.rootTypeCheckErrorLines,
    packageWorktreeTypeCheckErrorLines: payload.rootTypecheckStatus.packageWorktreeTypeCheckErrorLines,
    typeCheckLayerComparisonStatus: payload.rootTypecheckStatus.layerComparisonStatus,
    authorizedManifestCandidateRows: payload.ownerFrontier.authorizedCommandManifest.authorizedCandidateRows,
    authorizedManifestReadyRows: payload.ownerFrontier.authorizedCommandManifest.readyForSeparateInstructionRows,
    validExecutionInstructionRows: payload.ownerFrontier.executionInstructions.validInstructionRows,
    pendingReadyManifestRowsWithoutExecutionInstructions: payload.ownerFrontier.executionInstructions.pendingReadyManifestRows,
    supplementalA16ReadyForOwnerExecutionInstructionRows: payload.ownerFrontier.executionInstructions.supplementalA16ReadyForOwnerExecutionInstructionRows,
    effectiveReadyForSeparateInstructionRows: payload.ownerFrontier.executionInstructions.effectiveReadyForSeparateInstructionRows,
    effectivePendingReadyInstructionRows: payload.ownerFrontier.executionInstructions.effectivePendingReadyInstructionRows,
    cleanupAuthorizedRows: payload.authorizationTotals.cleanupAuthorizedRows,
    executableRows: payload.authorizationTotals.executableRows
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
