#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const SEVEN_STEP_CLOSURE_BRIDGE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  currentCleanupStatus: "coordination/release-intake/latest-A25-current-cleanup-status-snapshot.json",
  closureLoopState: "coordination/release-intake/latest-A25-dirty-worktree-closure-loop-state.json",
  validateToMergeHandoff: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  validateToMergeBlockerFrontier: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  compactRequestBundle: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  staleApplyGuard: "coordination/release-intake/latest-A25-next-owner-authorization-stale-apply-guard-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  latestMarkdown: "coordination/release-intake/latest-A25-seven-step-closure-bridge.md",
  datedJson: `coordination/release-intake/${date}-A25-seven-step-closure-bridge.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-seven-step-closure-bridge.md`
};

const expectedPhaseOrder = ["slice", "extract", "validate", "merge", "cleanup"];

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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function artifactStamp(relativePath, payload) {
  return {
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature ?? payload.statusSignature ?? payload.status?.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: payload.expandedStatusEntries ?? payload.status?.expandedStatusEntries ?? payload.summary?.dirtyMapExpandedEntries ?? null
  };
}

function currentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  const rows = Object.entries(artifacts)
    .filter(([label]) => label !== "staleApplyGuard")
    .map(([label, artifact]) => {
      const stamp = artifactStamp(SEVEN_STEP_CLOSURE_BRIDGE_PATHS[label], artifact);
      const hasSignature = Boolean(stamp.dirtyMapStatusSignature);
      const hasEntries = stamp.expandedStatusEntries !== null && stamp.expandedStatusEntries !== undefined;
      return {
        label,
        path: stamp.path,
        signatureMatches: !hasSignature || stamp.dirtyMapStatusSignature === expectedSignature,
        entryCountMatches: !hasEntries || stamp.expandedStatusEntries === expectedEntries,
        dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
        expandedStatusEntries: stamp.expandedStatusEntries
      };
    });
  return rows
    .filter((row) => row.dirtyMapStatusSignature !== null || row.expandedStatusEntries !== null)
    .filter((row) => row.signatureMatches !== true || row.entryCountMatches !== true)
    .map((row) => `${row.label} is stale relative to latest dirty map`);
}

function byId(rows) {
  return Object.fromEntries((rows ?? []).map((row) => [row.id, row]));
}

function buildPhase({ id, closureStep, currentCleanup, frontier, compactBundle, exitCriteria }) {
  const status = closureStep?.status ?? "missing";
  const blockers = closureStep?.blockers ?? [];
  const common = {
    id,
    label: closureStep?.label ?? id,
    chineseLabel: closureStep?.chineseLabel ?? id,
    closureLoopStatus: status,
    blockers,
    evidence: [],
    currentCounts: {},
    nextGate: closureStep?.nextGate ?? ""
  };

  if (id === "slice") {
    return {
      ...common,
      purpose: "Map the dirty root inventory into owner packages, pathspecs, waves, and approval IDs.",
      evidence: [
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.dirtyMap,
        "coordination/release-intake/latest-A25-effective-owner-overlay.json",
        "coordination/release-intake/latest-A25-owner-disposition-queue.json",
        "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
      ],
      currentCounts: {
        collapsedStatusEntries: currentCleanup.status.collapsedStatusEntries,
        expandedStatusEntries: currentCleanup.status.expandedStatusEntries,
        ownerPackageApprovals: currentCleanup.physicalClosure.ownerPackageApprovals,
        physicalLifecycleApprovals: currentCleanup.physicalClosure.physicalLifecycleApprovals,
        ownerPackageEntries: currentCleanup.physicalClosure.ownerPackageEntries
      },
      nextGate: "Keep A25 owner/pathspec coverage current before any package-level extraction or merge decision."
    };
  }

  if (id === "extract") {
    return {
      ...common,
      purpose: "Materialize owner work orders, evidence capsules, blocker records, and authorization starters.",
      evidence: [
        "coordination/release-intake/latest-A25-owner-closure-work-order-bundle.json",
        "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.completionAudit
      ],
      currentCounts: {
        ownerClosurePendingItems: currentCleanup.ownerFrontier.closureQueue.pendingItems,
        a16PostExtractionVerified: currentCleanup.closureLoop.a16PostExtractionVerified,
        a16ValidExecutionInstructionRows: currentCleanup.closureLoop.a16ValidExecutionInstructionRows,
        completedRequirements: currentCleanup.completion.completedRequirements,
        totalRequirements: currentCleanup.completion.totalRequirements
      },
      nextGate: "Do not treat extracted packages as mergeable until validation and owner authorization gates are green."
    };
  }

  if (id === "validate") {
    return {
      ...common,
      purpose: "Keep machine gates current while owner authorization and release-source checks are still pending.",
      evidence: [
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.closureLoopState,
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.currentCleanupStatus,
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.compactRequestBundle,
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.staleApplyGuard
      ],
      currentCounts: {
        pendingCanonicalAuthorizationRows: currentCleanup.closureLoop.pendingCanonicalAuthorizationRows,
        validAuthorizationRows: currentCleanup.closureLoop.validAuthorizationRows,
        focusBatchRows: compactBundle.summary?.focusBatchRows ?? 0,
        focusBatchPendingRows: compactBundle.summary?.focusBatchPendingRows ?? 0,
        rootTypeCheckPassed: currentCleanup.rootTypecheckStatus.rootTypeCheckPassed,
        rootTypeCheckErrorLines: currentCleanup.rootTypecheckStatus.rootTypeCheckErrorLines,
        packageWorktreeTypeCheckErrorLines: currentCleanup.rootTypecheckStatus.packageWorktreeTypeCheckErrorLines
      },
      nextGate: "Record only explicit owner-approved canonical authorization rows, then rerun the safe post-input validation commands."
    };
  }

  if (id === "merge") {
    return {
      ...common,
      purpose: "Merge reviewed owner packages only into a clean release source, never directly from the dirty root inventory.",
      evidence: [
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeHandoff,
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeBlockerFrontier,
        SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeExitCriteria,
        "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json"
      ],
      currentCounts: {
        handoffStatus: currentCleanup.validateToMergeHandoff.handoffStatus,
        readyForMerge: currentCleanup.validateToMergeHandoff.readyForMerge,
        validateExitReady: exitCriteria.validateExitReady ?? false,
        directFailedMergeChecks: exitCriteria.summary?.directFailedMergeChecks ?? currentCleanup.validateToMergeHandoff.failedMergeChecks,
        failedMergeChecks: currentCleanup.validateToMergeHandoff.failedMergeChecks,
        ownerInputFrontierRows: frontier.summary?.ownerInputFrontierRows ?? 0,
        cleanSourceFrontierRows: frontier.summary?.cleanSourceFrontierRows ?? 0,
        deferredPhysicalLifecycleRows: exitCriteria.summary?.deferredPhysicalLifecycleRows ?? 0,
        releaseSourceClean: currentCleanup.releaseSource.releaseSourceClean,
        strictLifecycleClean: currentCleanup.strictLifecycle.strictLifecycleClean
      },
      nextGate: "Merge remains blocked until owner inputs are ready, validation hold is released, and A22 has a clean release source."
    };
  }

  return {
    ...common,
    purpose: "Clean generated artifacts, root inventory, branches, and worktrees only after merge verification and exact owner cleanup authorization.",
    evidence: [
      SEVEN_STEP_CLOSURE_BRIDGE_PATHS.currentCleanupStatus,
      "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
      "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.json"
    ],
    currentCounts: {
      expandedStatusEntries: currentCleanup.status.expandedStatusEntries,
      cleanupAuthorizedRows: currentCleanup.authorizationTotals.cleanupAuthorizedRows,
      executableRows: currentCleanup.authorizationTotals.executableRows,
      strictLifecycleClean: currentCleanup.strictLifecycle.strictLifecycleClean,
      worktreeRemovalAuthorizedRows: currentCleanup.strictLifecycle.worktreeRemovalAuthorizedRows,
      branchDeletionAuthorizedRows: currentCleanup.strictLifecycle.branchDeletionAuthorizedRows
    },
    nextGate: "Cleanup remains blocked until merge is verified and exact cleanup/lifecycle rows receive separate owner authorization."
  };
}

export function buildSevenStepClosureBridge() {
  const artifacts = {
    dirtyMap: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.dirtyMap),
    currentCleanupStatus: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.currentCleanupStatus),
    closureLoopState: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.closureLoopState),
    validateToMergeHandoff: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeHandoff),
    validateToMergeBlockerFrontier: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeBlockerFrontier),
    validateToMergeExitCriteria: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.validateToMergeExitCriteria),
    compactRequestBundle: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.compactRequestBundle),
    completionAudit: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.completionAudit),
    staleApplyGuard: readJson(SEVEN_STEP_CLOSURE_BRIDGE_PATHS.staleApplyGuard)
  };
  const currentCleanup = artifacts.currentCleanupStatus;
  const closureSteps = byId(artifacts.closureLoopState.steps);
  const phaseOrder = artifacts.closureLoopState.loopOrder ?? expectedPhaseOrder;
  const phases = phaseOrder.map((id) => buildPhase({
    id,
    closureStep: closureSteps[id],
    currentCleanup,
    frontier: artifacts.validateToMergeBlockerFrontier,
    compactBundle: artifacts.compactRequestBundle,
    exitCriteria: artifacts.validateToMergeExitCriteria
  }));
  const sourceFailures = currentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const staleApplyGuardFailures = artifacts.staleApplyGuard.failures ?? [];
  const batch = artifacts.compactRequestBundle.batchAuthorizationRequest ?? {};

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    branch: currentCleanup.branch,
    head: currentCleanup.head,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, artifact]) => [key, artifactStamp(SEVEN_STEP_CLOSURE_BRIDGE_PATHS[key], artifact)])),
    framing: {
      zh: "问题不是需要更多 worktrees, 而是 root 已经是未收口的 integration inventory. 当前闭环要靠切片、提取、验证、合并、清理逐步收口。",
      releaseBoundary: "Root remains a read-only integration inventory and is not a deploy source while dirty.",
      loopIsFivePhasesInsideSevenStepRemediation: true
    },
    phaseOrder,
    activePhase: artifacts.closureLoopState.activeStep,
    phases,
    summary: {
      completedPhases: count(artifacts.closureLoopState.summary?.completedSteps),
      activePhases: count(artifacts.closureLoopState.summary?.activeSteps),
      blockedPhases: count(artifacts.closureLoopState.summary?.blockedSteps),
      pendingCanonicalAuthorizationRows: count(artifacts.closureLoopState.summary?.pendingCanonicalAuthorizationRows),
      validAuthorizationRows: count(artifacts.closureLoopState.summary?.validAuthorizationRows),
      focusBatchRows: count(artifacts.compactRequestBundle.summary?.focusBatchRows),
      focusBatchPendingRows: count(artifacts.compactRequestBundle.summary?.focusBatchPendingRows),
      validExecutionInstructionRows: count(artifacts.compactRequestBundle.summary?.validExecutionInstructionRows),
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      directFailedMergeChecks: count(artifacts.validateToMergeExitCriteria.summary?.directFailedMergeChecks),
      failedMergeChecks: count(artifacts.validateToMergeBlockerFrontier.summary?.failedMergeChecks),
      frontierRows: count(artifacts.validateToMergeBlockerFrontier.summary?.frontierRows),
      releaseSourceClean: currentCleanup.releaseSource.releaseSourceClean === true,
      strictLifecycleClean: currentCleanup.strictLifecycle.strictLifecycleClean === true,
      rootTypeCheckPassed: currentCleanup.rootTypecheckStatus.rootTypeCheckPassed === true,
      rootTypeCheckErrorLines: count(currentCleanup.rootTypecheckStatus.rootTypeCheckErrorLines),
      packageWorktreeTypeCheckErrorLines: count(currentCleanup.rootTypecheckStatus.packageWorktreeTypeCheckErrorLines),
      cleanupAuthorizedRows: count(currentCleanup.authorizationTotals.cleanupAuthorizedRows),
      executableRows: count(currentCleanup.authorizationTotals.executableRows),
      sourceCurrentnessFailures: sourceFailures.length,
      staleApplyGuardFailures: staleApplyGuardFailures.length
    },
    currentOwnerAuthorizationBatch: {
      status: artifacts.compactRequestBundle.compactStatus,
      requestId: batch.requestId ?? "",
      pendingRows: count(batch.pendingRows),
      approvalIds: batch.approvalIds ?? [],
      selectedFinalStates: batch.selectedFinalStates ?? [],
      copyableOwnerReplyTextZh: batch.copyableOwnerReplyTextZh ?? "",
      copyableApprovalText: batch.copyableApprovalText ?? "",
      boundary: batch.boundary ?? {}
    },
    duplicateAuthorizationGuard: {
      currentFocusApprovalIds: artifacts.staleApplyGuard.currentFocusApprovalIds ?? [],
      latestApplyStatus: artifacts.staleApplyGuard.latestApplyStatus ?? "missing",
      latestApplyApprovalIds: artifacts.staleApplyGuard.latestApplyApprovalIds ?? [],
      latestApplyIdsAlreadyAuthorized: artifacts.staleApplyGuard.latestApplyIdsAlreadyAuthorized === true,
      currentFocusIdsAlreadyAuthorized: artifacts.staleApplyGuard.currentFocusIdsAlreadyAuthorized ?? [],
      latestApplyIdsStillPending: artifacts.staleApplyGuard.latestApplyIdsStillPending ?? [],
      applyPermitted: artifacts.staleApplyGuard.applyPermitted === true,
      cleanupAuthorizedRows: count(artifacts.staleApplyGuard.cleanupAuthorizedRows),
      executableRows: count(artifacts.staleApplyGuard.executableRows),
      failures: staleApplyGuardFailures
    },
    sourceCurrentnessFailures: sourceFailures,
    conclusionZh: "当前在验证阶段: 切片和提取已形成证据, 但合并前仍有 owner 授权、validation hold、clean release source 三类硬门; 清理没有任何可执行授权。",
    boundary: {
      evidenceOnly: true,
      recordsAuthorizationOnlyAfterExplicitOwnerReply: true,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableSevenStepClosureBridgeProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    branch: payload.branch,
    head: payload.head,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    framing: payload.framing,
    phaseOrder: payload.phaseOrder,
    activePhase: payload.activePhase,
    phases: payload.phases,
    summary: payload.summary,
    currentOwnerAuthorizationBatch: payload.currentOwnerAuthorizationBatch,
    duplicateAuthorizationGuard: payload.duplicateAuthorizationGuard,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    conclusionZh: payload.conclusionZh,
    boundary: payload.boundary
  };
}

function stableSourceArtifacts(sourceArtifacts) {
  return Object.fromEntries(Object.entries(sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function yn(value) {
  return value ? "yes" : "no";
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const phaseRows = payload.phases.map((phase) => (
    `| ${phase.chineseLabel} / ${phase.id} | ${phase.closureLoopStatus} | ${cell(Object.entries(phase.currentCounts).map(([key, value]) => `${key}=${value}`).join("; "))} | ${cell(phase.blockers.join("; ") || "none")} |`
  )).join("\n");
  const frontierRows = payload.phases
    .filter((phase) => phase.closureLoopStatus !== "complete")
    .map((phase) => `## ${phase.chineseLabel} / ${phase.id}

- Purpose: ${phase.purpose}
- Status: ${phase.closureLoopStatus}
- Next gate: ${phase.nextGate}
- Evidence: ${phase.evidence.map((item) => `\`${item}\``).join(", ")}
- Blockers: ${phase.blockers.join("; ") || "none"}
`)
    .join("\n");

  return `# A25 Seven-Step Closure Bridge

Generated: ${payload.generatedAt}

${payload.framing.zh}

${payload.conclusionZh}

## Summary

- Active phase: ${payload.activePhase}
- Phase order: ${payload.phaseOrder.join(" -> ")}
- Completed phases: ${payload.summary.completedPhases}
- Blocked phases: ${payload.summary.blockedPhases}
- Expanded dirty entries: ${payload.expandedStatusEntries}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Valid canonical authorization rows: ${payload.summary.validAuthorizationRows}
- Current focus batch rows: ${payload.summary.focusBatchPendingRows}/${payload.summary.focusBatchRows}
- Validate exit ready: ${yn(payload.summary.validateExitReady)}
- Direct failed merge checks: ${payload.summary.directFailedMergeChecks}
- Failed merge checks: ${payload.summary.failedMergeChecks}
- A22 release source clean: ${yn(payload.summary.releaseSourceClean)}
- A25 strict lifecycle clean: ${yn(payload.summary.strictLifecycleClean)}
- Root type-check passed: ${yn(payload.summary.rootTypeCheckPassed)}
- Root type-check error lines: ${payload.summary.rootTypeCheckErrorLines}
- Package/worktree type-check error lines: ${payload.summary.packageWorktreeTypeCheckErrorLines}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Stale apply guard failures: ${payload.summary.staleApplyGuardFailures}

## Loop Phases

| Phase | Status | Current counts | Blockers |
| --- | --- | --- | --- |
${phaseRows}

${frontierRows}
## Current Owner Authorization Batch

- Status: ${payload.currentOwnerAuthorizationBatch.status}
- Pending rows: ${payload.currentOwnerAuthorizationBatch.pendingRows}
- Approval IDs: ${payload.currentOwnerAuthorizationBatch.approvalIds.join(", ") || "none"}
- Selected final states: ${payload.currentOwnerAuthorizationBatch.selectedFinalStates.join(", ") || "none"}
- Copyable owner reply zh: ${payload.currentOwnerAuthorizationBatch.copyableOwnerReplyTextZh || "none"}

## Duplicate Authorization Guard

- Latest apply status: ${payload.duplicateAuthorizationGuard.latestApplyStatus}
- Latest apply IDs already authorized: ${yn(payload.duplicateAuthorizationGuard.latestApplyIdsAlreadyAuthorized)}
- Latest apply approval IDs: ${payload.duplicateAuthorizationGuard.latestApplyApprovalIds.join(", ") || "none"}
- Current focus approval IDs: ${payload.duplicateAuthorizationGuard.currentFocusApprovalIds.join(", ") || "none"}
- Apply permitted: ${yn(payload.duplicateAuthorizationGuard.applyPermitted)}
- Cleanup-authorized rows: ${payload.duplicateAuthorizationGuard.cleanupAuthorizedRows}
- Executable rows: ${payload.duplicateAuthorizationGuard.executableRows}

## Boundary

This bridge is evidence-only. It does not authorize staging, committing, merging, deploying, destructive Git, cleanup apply, branch deletion, worktree removal, or physical lifecycle cleanup. It only makes the current closure-loop state machine easier to inspect.
`;
}

function main() {
  const payload = buildSevenStepClosureBridge();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);

  for (const target of [SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestJson, SEVEN_STEP_CLOSURE_BRIDGE_PATHS.datedJson]) {
    write(target, json);
  }
  for (const target of [SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestMarkdown, SEVEN_STEP_CLOSURE_BRIDGE_PATHS.datedMarkdown]) {
    write(target, md);
  }

  console.log(JSON.stringify({
    latestJson: SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestJson,
    latestMarkdown: SEVEN_STEP_CLOSURE_BRIDGE_PATHS.latestMarkdown,
    activePhase: payload.activePhase,
    phaseOrder: payload.phaseOrder,
    completedPhases: payload.summary.completedPhases,
    blockedPhases: payload.summary.blockedPhases,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    focusBatchPendingRows: payload.summary.focusBatchPendingRows,
    readyForMerge: payload.phases.find((phase) => phase.id === "merge")?.currentCounts.readyForMerge ?? false,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    sourceCurrentnessFailures: payload.summary.sourceCurrentnessFailures,
    staleApplyGuardFailures: payload.summary.staleApplyGuardFailures
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
