#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  cleanSourceCandidatePromotionPacket: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  cleanReleaseSourceRunway: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  fallbackCandidateValidationSnapshot: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-snapshot.json",
  validateToMergeBlockerFrontier: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  latestJson: "coordination/release-intake/latest-A22-clean-source-selection-review.json",
  latestMarkdown: "coordination/release-intake/latest-A22-clean-source-selection-review.md",
  datedJson: `coordination/release-intake/${date}-A22-clean-source-selection-review.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-clean-source-selection-review.md`
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
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => [
      key,
      artifactStamp(key, A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS[key], payload)
    ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function fallbackSnapshotGreen(snapshot) {
  return snapshot.summary?.validationPassed === true &&
    snapshot.summary?.typeCheckPassed === true &&
    snapshot.summary?.typeCheckErrorLines === 0 &&
    snapshot.summary?.buildPassed === true &&
    snapshot.summary?.trackedStatusCleanBefore === true &&
    snapshot.summary?.trackedStatusCleanAfter === true &&
    snapshot.summary?.trackedMutationDetected === false;
}

function reviewStatus({ sourceFailures, queue, fallbackSnapshot }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (queue.summary?.releaseSourceSelected === true) return "release-source-selected-outside-review";
  if (queue.queueStatus === "fallback-candidate-green-await-clean-source-selection-review" &&
    fallbackSnapshotGreen(fallbackSnapshot)) {
    return "reviewed-fallback-green-not-selected";
  }
  if (queue.summary?.topCandidateGateStatus === "top-candidate-gates-red") {
    return "reviewed-top-candidate-red-no-selection";
  }
  return "waiting-clean-source-selection-review";
}

function selectionRows({ queue, fallbackSnapshot, promotionPacket, runway, frontier, exitCriteria, bridge }) {
  const queueSummary = queue.summary ?? {};
  const promotionSummary = promotionPacket.summary ?? {};
  const runwaySummary = runway.summary ?? {};
  const frontierSummary = frontier.summary ?? {};
  const exitSummary = exitCriteria.summary ?? {};
  const bridgeSummary = bridge.summary ?? {};
  const fallbackBranch = fallbackSnapshot.candidate?.branch ?? queueSummary.fallbackGreenCandidateBranch ?? "";
  const topBranch = queue.topCandidate?.branch ?? queueSummary.topCandidateBranch ?? "";

  return [
    {
      rank: 1,
      rowId: "fallback-green-candidate-reviewed",
      owner: "A22 production reliability and release engineering",
      agentIds: ["A22"],
      branch: fallbackBranch,
      status: fallbackSnapshotGreen(fallbackSnapshot) ? "green-for-review-not-selected" : "not-green",
      evidence: [
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.fallbackCandidateValidationSnapshot,
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanSourceValidationQueue
      ],
      facts: {
        validationPassed: fallbackSnapshot.summary?.validationPassed === true,
        typeCheckPassed: fallbackSnapshot.summary?.typeCheckPassed === true,
        typeCheckErrorLines: count(fallbackSnapshot.summary?.typeCheckErrorLines),
        buildPassed: fallbackSnapshot.summary?.buildPassed === true,
        trackedMutationDetected: fallbackSnapshot.summary?.trackedMutationDetected === true,
        releaseSourceSelected: false
      },
      blocker: "The fallback candidate is green, but no owner clean-source promotion instruction or release-source selection record exists.",
      nextAction: "Keep the fallback candidate as a reviewed clean-source option; do not select it as release source until owner promotion, merge, deploy, and release gates are explicit."
    },
    {
      rank: 2,
      rowId: "top-candidate-remediation-still-required",
      owner: "A22 production reliability and release engineering with routed owner sessions",
      agentIds: ["A22"],
      branch: topBranch,
      status: queueSummary.topCandidateQueueActionStatus ?? "unknown",
      evidence: [
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanSourceValidationQueue
      ],
      facts: {
        focusedSmokePassed: queueSummary.focusedSmokePassed === true,
        typeCheckPassed: queueSummary.typeCheckPassed === true,
        typeCheckErrorLines: count(queueSummary.typeCheckErrorLines),
        buildPassed: queueSummary.buildPassed === true,
        buildRefreshRequired: queueSummary.buildRefreshRequired === true
      },
      blocker: "The top clean candidate remains red for type-check/build freshness and cannot be promoted as a clean source.",
      nextAction: "Use the existing A22 type-check remediation work orders before any top-candidate clean-source selection."
    },
    {
      rank: 3,
      rowId: "selection-boundary-holds",
      owner: "A22 production reliability and A25 release intake",
      agentIds: ["A22", "A25"],
      branch: "",
      status: "blocked-before-release-source-selection",
      evidence: [
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanSourceCandidatePromotionPacket,
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanReleaseSourceRunway,
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.validateToMergeBlockerFrontier,
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.validateToMergeExitCriteria,
        A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.sevenStepClosureBridge
      ],
      facts: {
        releaseSourceEligibleNow: runwaySummary.releaseSourceEligibleNow === true || queueSummary.releaseSourceEligibleNow === true,
        releaseSourceSelected: queueSummary.releaseSourceSelected === true || promotionSummary.releaseSourceSelected === true,
        promotionEligibleNow: promotionSummary.promotionEligibleNow === true,
        readyForMerge: frontier.readyForMerge === true || frontierSummary.readyForMerge === true,
        validateExitReady: exitSummary.validateExitReady === true || bridgeSummary.validateExitReady === true,
        pendingCanonicalAuthorizationRows: count(frontierSummary.pendingCanonicalAuthorizationRows, count(bridgeSummary.pendingCanonicalAuthorizationRows)),
        failedMergeChecks: count(frontierSummary.failedMergeChecks, count(exitSummary.directFailedMergeChecks)),
        cleanWorktreeCandidates: count(runwaySummary.cleanWorktreeCandidates),
        blockedAllowedSourceOptions: count(runwaySummary.blockedAllowedSourceOptions)
      },
      blocker: "Selection remains blocked by release-source eligibility, canonical authorization backlog, validate-exit gates, and missing merge/deploy authorization.",
      nextAction: "Treat this review as evidence only; keep release-source selection, staging, merging, cleanup, and deploy blocked."
    }
  ];
}

export function buildA22CleanSourceSelectionReview() {
  const artifacts = {
    dirtyMap: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.dirtyMap),
    cleanSourceValidationQueue: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanSourceValidationQueue),
    cleanSourceCandidatePromotionPacket: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanSourceCandidatePromotionPacket),
    cleanReleaseSourceRunway: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.cleanReleaseSourceRunway),
    fallbackCandidateValidationSnapshot: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.fallbackCandidateValidationSnapshot),
    validateToMergeBlockerFrontier: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.validateToMergeBlockerFrontier),
    validateToMergeExitCriteria: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.validateToMergeExitCriteria),
    sevenStepClosureBridge: readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.sevenStepClosureBridge)
  };

  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const queueSummary = artifacts.cleanSourceValidationQueue.summary ?? {};
  const promotionSummary = artifacts.cleanSourceCandidatePromotionPacket.summary ?? {};
  const runwaySummary = artifacts.cleanReleaseSourceRunway.summary ?? {};
  const frontierSummary = artifacts.validateToMergeBlockerFrontier.summary ?? {};
  const exitSummary = artifacts.validateToMergeExitCriteria.summary ?? {};
  const bridgeSummary = artifacts.sevenStepClosureBridge.summary ?? {};
  const rows = selectionRows({
    queue: artifacts.cleanSourceValidationQueue,
    fallbackSnapshot: artifacts.fallbackCandidateValidationSnapshot,
    promotionPacket: artifacts.cleanSourceCandidatePromotionPacket,
    runway: artifacts.cleanReleaseSourceRunway,
    frontier: artifacts.validateToMergeBlockerFrontier,
    exitCriteria: artifacts.validateToMergeExitCriteria,
    bridge: artifacts.sevenStepClosureBridge
  });
  const status = reviewStatus({
    sourceFailures,
    queue: artifacts.cleanSourceValidationQueue,
    fallbackSnapshot: artifacts.fallbackCandidateValidationSnapshot
  });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    reviewKind: "a22-clean-source-selection-review",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    selectionReviewStatus: status,
    summary: {
      fallbackGreenCandidateBranch: artifacts.fallbackCandidateValidationSnapshot.candidate?.branch ?? queueSummary.fallbackGreenCandidateBranch ?? "",
      fallbackValidationPassed: artifacts.fallbackCandidateValidationSnapshot.summary?.validationPassed === true,
      fallbackTypeCheckPassed: artifacts.fallbackCandidateValidationSnapshot.summary?.typeCheckPassed === true,
      fallbackTypeCheckErrorLines: count(artifacts.fallbackCandidateValidationSnapshot.summary?.typeCheckErrorLines),
      fallbackBuildPassed: artifacts.fallbackCandidateValidationSnapshot.summary?.buildPassed === true,
      fallbackTrackedMutationDetected: artifacts.fallbackCandidateValidationSnapshot.summary?.trackedMutationDetected === true,
      queueStatus: artifacts.cleanSourceValidationQueue.queueStatus ?? "",
      topCandidateBranch: artifacts.cleanSourceValidationQueue.topCandidate?.branch ?? queueSummary.topCandidateBranch ?? "",
      topCandidateQueueActionStatus: queueSummary.topCandidateQueueActionStatus ?? "",
      topCandidateTypeCheckErrorLines: count(queueSummary.typeCheckErrorLines),
      topCandidateBuildRefreshRequired: queueSummary.buildRefreshRequired === true,
      releaseSourceEligibleNow: queueSummary.releaseSourceEligibleNow === true || runwaySummary.releaseSourceEligibleNow === true,
      releaseSourceSelected: queueSummary.releaseSourceSelected === true || promotionSummary.releaseSourceSelected === true,
      promotionEligibleNow: promotionSummary.promotionEligibleNow === true,
      cleanWorktreeCandidates: count(runwaySummary.cleanWorktreeCandidates),
      blockedAllowedSourceOptions: count(runwaySummary.blockedAllowedSourceOptions),
      pendingCanonicalAuthorizationRows: count(frontierSummary.pendingCanonicalAuthorizationRows, count(bridgeSummary.pendingCanonicalAuthorizationRows)),
      focusBatchPendingRows: count(frontierSummary.focusBatchPendingRows, count(bridgeSummary.focusBatchPendingRows)),
      failedMergeChecks: count(frontierSummary.failedMergeChecks, count(exitSummary.directFailedMergeChecks)),
      validateExitReady: exitSummary.validateExitReady === true || bridgeSummary.validateExitReady === true,
      readyForMerge: frontierSummary.readyForMerge === true || artifacts.validateToMergeBlockerFrontier.readyForMerge === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    selectionRows: rows,
    safeNextCommands: [
      "node coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs",
      "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
      "node coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs",
      "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs",
      "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
      "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs"
    ],
    boundary: {
      evidenceOnly: true,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableA22CleanSourceSelectionReviewProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    reviewKind: payload.reviewKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    selectionReviewStatus: payload.selectionReviewStatus,
    summary: payload.summary,
    selectionRows: payload.selectionRows,
    safeNextCommands: payload.safeNextCommands,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdown(payload) {
  const rows = payload.selectionRows
    .map((row) => `| ${row.rank} | \`${cell(row.rowId)}\` | ${cell(row.owner)} | \`${cell(row.status)}\` | \`${cell(row.branch || "-")}\` | ${cell(row.blocker)} | ${cell(row.nextAction)} |`)
    .join("\n");
  const commands = payload.safeNextCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A22 Clean Source Selection Review

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This review is evidence-only. It records that the green fallback candidate has been reviewed for clean-source selection, but it does not select a release source, stage, commit, merge, deploy, clean, delete, reset, prune, record owner approval, record execution instruction, or authorize physical lifecycle cleanup.

## Summary

- Selection review status: \`${payload.selectionReviewStatus}\`
- Fallback green candidate: \`${payload.summary.fallbackGreenCandidateBranch || "none"}\`
- Fallback validation passed: ${payload.summary.fallbackValidationPassed ? "yes" : "no"}
- Fallback type-check passed: ${payload.summary.fallbackTypeCheckPassed ? "yes" : "no"}
- Fallback type-check error lines: ${payload.summary.fallbackTypeCheckErrorLines}
- Fallback build passed: ${payload.summary.fallbackBuildPassed ? "yes" : "no"}
- Queue status: \`${payload.summary.queueStatus}\`
- Top candidate: \`${payload.summary.topCandidateBranch || "none"}\`
- Top candidate queue action: \`${payload.summary.topCandidateQueueActionStatus}\`
- Top candidate type-check error lines: ${payload.summary.topCandidateTypeCheckErrorLines}
- Release source eligible now: ${payload.summary.releaseSourceEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Failed merge checks: ${payload.summary.failedMergeChecks}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Selection Review Rows

| Rank | Row | Owner | Status | Branch | Blocker | Safe next action |
| ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Safe Next Commands

${commands}

## Boundary

- Evidence only: ${payload.boundary.evidenceOnly ? "yes" : "no"}
- Selects release source: ${payload.boundary.selectsReleaseSource ? "yes" : "no"}
- Records owner approval: ${payload.boundary.recordsOwnerApproval ? "yes" : "no"}
- Records execution instruction: ${payload.boundary.recordsExecutionInstruction ? "yes" : "no"}
- Stage authorized: ${payload.boundary.stagesFiles ? "yes" : "no"}
- Commit authorized: ${payload.boundary.commits ? "yes" : "no"}
- Merge authorized: ${payload.boundary.merges ? "yes" : "no"}
- Deploy authorized: ${payload.boundary.deploys ? "yes" : "no"}
- Cleanup authorized: ${payload.boundary.cleanupAuthorized ? "yes" : "no"}
- Destructive Git authorized: ${payload.boundary.destructiveGitAuthorized ? "yes" : "no"}
- Physical lifecycle cleanup authorized: ${payload.boundary.physicalLifecycleCleanupAuthorized ? "yes" : "no"}
`;
}

export function writeA22CleanSourceSelectionReview() {
  const payload = buildA22CleanSourceSelectionReview();
  write(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestMarkdown, markdown(payload));
  write(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22CleanSourceSelectionReview();
  console.log("A22 clean source selection review generated");
  console.log(`Selection review status: ${payload.selectionReviewStatus}`);
  console.log(`Fallback green candidate: ${payload.summary.fallbackGreenCandidateBranch || "none"}`);
  console.log(`Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}
