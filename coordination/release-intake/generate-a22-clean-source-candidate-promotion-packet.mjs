#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanReleaseSourceRunway: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  worktreeDashboard: "coordination/release-intake/latest-A25-worktree-hygiene-dashboard.json",
  worktreeLifecycleGate: "coordination/release-intake/latest-A25-worktree-lifecycle-gate.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  authorizationTransitionForecast: "coordination/release-intake/latest-A25-authorization-transition-forecast.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  rootParityCandidateMutation: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  ownerRemediationCandidateDirtyAllowlist: "coordination/release-intake/latest-A22-owner-remediation-candidate-dirty-allowlist.json",
  latestJson: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.md",
  datedJson: `coordination/release-intake/${date}-A22-clean-source-candidate-promotion-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-clean-source-candidate-promotion-packet.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function gitRaw(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).replace(/\n$/u, "");
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
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function statusCountsForCandidate(candidate, dashboardRows) {
  const row = dashboardRows.find((item) => item.path === candidate.path || item.branch === candidate.branch);
  return row?.statusCounts ?? { total: 0, modified: 0, deleted: 0, untracked: 0 };
}

function parseStatusRows(statusText) {
  return statusText ? statusText.split("\n").filter(Boolean) : [];
}

function currentCandidateStatusRows(targetWorktree) {
  if (!targetWorktree) return [];
  return parseStatusRows(gitRaw(["-C", targetWorktree, "status", "--short"]));
}

function sameStatusRows(left, right) {
  return left.length === right.length && left.every((row) => right.includes(row));
}

function uniqueRows(rows) {
  return [...new Set(rows.filter(Boolean))];
}

function ownerRemediationRows(allowlist) {
  if (allowlist?.summary?.readyForPromotionAllowlist !== true) return [];
  return (allowlist.allowlistRows ?? [])
    .filter((row) => row.verificationStatus === "verified")
    .filter((row) => row.ownerScopeAllowed === true)
    .filter((row) => row.statusRowPresent === true)
    .filter((row) => row.candidateTargetMatchesRoot === true);
}

function candidatePromotionLane(candidate) {
  const ahead = count(candidate.divergence?.ahead);
  if (ahead > 0) return "clean-diverged-slice-review";
  return "stale-clean-branch-review";
}

function candidatePriority(candidate) {
  if (candidate.promotionLane === "controlled-mutated-root-parity-recovery") return [-1, 0, 0, candidate.branch ?? ""];
  const ahead = count(candidate.divergence?.ahead);
  const behind = count(candidate.divergence?.behind);
  const hasReviewableCommits = ahead > 0 ? 0 : 1;
  return [hasReviewableCommits, behind, Math.max(ahead, 0), candidate.branch ?? ""];
}

function compareCandidatePriority(left, right) {
  const leftPriority = candidatePriority(left);
  const rightPriority = candidatePriority(right);
  for (let index = 0; index < leftPriority.length; index += 1) {
    const leftValue = leftPriority[index];
    const rightValue = rightPriority[index];
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (leftValue !== rightValue) return leftValue - rightValue;
    } else {
      const diff = String(leftValue).localeCompare(String(rightValue));
      if (diff !== 0) return diff;
    }
  }
  return 0;
}

function candidateBlockers(candidate, artifacts) {
  const exitCriteria = artifacts.validateToMergeExitCriteria ?? {};
  const forecast = artifacts.authorizationTransitionForecast ?? {};
  const bridge = artifacts.sevenStepClosureBridge ?? {};
  const ahead = count(candidate.divergence?.ahead);
  const behind = count(candidate.divergence?.behind);
  const blockers = [
    "candidate is not selected as release source",
    "no candidate-specific build/type/regression gate is recorded",
    "no owner instruction authorizes clean-source promotion",
    "no merge instruction is recorded",
    "no deploy instruction is recorded"
  ];
  if (behind > 0) blockers.push(`branch is behind main by ${behind} commit(s) and needs resync/review`);
  if (ahead === 0) blockers.push("branch has no ahead commits, so it is a retirement/archive candidate before it is a release slice");
  if (count(exitCriteria.summary?.pendingCanonicalAuthorizationRows) > 0) {
    blockers.push(`${count(exitCriteria.summary?.pendingCanonicalAuthorizationRows)} canonical authorization row(s) remain pending`);
  }
  if (count(forecast.summary?.currentFocusRows) > 0) {
    blockers.push(`${count(forecast.summary?.currentFocusRows)} current focus authorization row(s) still need owner input`);
  }
  if (count(bridge.summary?.packageWorktreeTypeCheckErrorLines) > 0) {
    blockers.push(`${count(bridge.summary?.packageWorktreeTypeCheckErrorLines)} package/worktree type-check error line(s) remain`);
  }
  return blockers;
}

function recoveryCandidateBlockers(candidate, artifacts) {
  const exitCriteria = artifacts.validateToMergeExitCriteria ?? {};
  const forecast = artifacts.authorizationTransitionForecast ?? {};
  const bridge = artifacts.sevenStepClosureBridge ?? {};
  const behind = count(candidate.divergence?.behind);
  const blockers = [
    "candidate is a controlled recovery candidate, not a clean release source",
    "bounded dirty status must remain exactly the authorized root-parity and owner-remediation target rows",
    "no candidate-specific type/build/regression gate is recorded after extraction",
    "no owner instruction authorizes staging or commit of the recovery slice",
    "no merge instruction is recorded",
    "no deploy instruction is recorded"
  ];
  if (behind > 0) blockers.push(`branch is behind main by ${behind} commit(s) and needs resync/review`);
  if (count(exitCriteria.summary?.pendingCanonicalAuthorizationRows) > 0) {
    blockers.push(`${count(exitCriteria.summary?.pendingCanonicalAuthorizationRows)} canonical authorization row(s) remain pending`);
  }
  if (count(forecast.summary?.currentFocusRows) > 0) {
    blockers.push(`${count(forecast.summary?.currentFocusRows)} current focus authorization row(s) still need owner input`);
  }
  if (count(bridge.summary?.packageWorktreeTypeCheckErrorLines) > 0) {
    blockers.push(`${count(bridge.summary?.packageWorktreeTypeCheckErrorLines)} package/worktree type-check error line(s) remain`);
  }
  return blockers;
}

function controlledRecoveryCandidate(artifacts) {
  const mutation = artifacts.rootParityCandidateMutation ?? {};
  if (mutation.executorStatus !== "already-extracted-and-verified") return null;
  const targetWorktree = mutation.targetWorktree ?? "";
  const dashboardRows = artifacts.worktreeDashboard.worktreeLedger ?? [];
  const dashboardRow = dashboardRows.find((row) => row.path === targetWorktree);
  const mutationRows = mutation.mutationRows ?? [];
  const ownerRows = ownerRemediationRows(artifacts.ownerRemediationCandidateDirtyAllowlist);
  const statusRows = currentCandidateStatusRows(targetWorktree);
  const rootParityDirtyStatusRows = mutationRows.map((row) => `?? ${row.candidateTargetPath}`);
  const ownerRemediationDirtyStatusRows = ownerRows.map((row) => row.statusRow);
  const expectedStatusRows = uniqueRows([...rootParityDirtyStatusRows, ...ownerRemediationDirtyStatusRows]);
  const boundedDirtySetMatches = sameStatusRows(statusRows, expectedStatusRows);
  if (!targetWorktree || !boundedDirtySetMatches) return null;
  const statusCounts = {
    total: statusRows.length,
    modified: statusRows.filter((row) => row.startsWith(" M") || row.startsWith("M ")).length,
    deleted: statusRows.filter((row) => row.startsWith(" D") || row.startsWith("D ")).length,
    untracked: statusRows.filter((row) => row.startsWith("?? ")).length
  };
  const blockers = recoveryCandidateBlockers({
    divergence: dashboardRow?.divergence ?? { behind: 0, ahead: 0 }
  }, artifacts);
  return {
    branch: dashboardRow?.branch ?? git(["-C", targetWorktree, "rev-parse", "--abbrev-ref", "HEAD"]),
    path: targetWorktree,
    head: dashboardRow?.head ?? git(["-C", targetWorktree, "rev-parse", "HEAD"]),
    divergence: dashboardRow?.divergence ?? { behind: 0, ahead: 0 },
    lifecycleState: "controlled-mutated-root-parity-recovery",
    statusCounts,
    promotionLane: "controlled-mutated-root-parity-recovery",
    promotionRank: 0,
    promotionEligibleNow: false,
    releaseSourceSelected: false,
    allowedDirtyStatusRows: statusRows,
    authorizedMutationUnitIds: [
      ...mutationRows.map((row) => row.unitId),
      ...ownerRows.map((row) => row.unitId)
    ],
    candidateTargetsVerified: count(mutation.summary?.candidateTargetsVerified) + ownerRows.length,
    rootParityDirtyStatusRows,
    ownerRemediationDirtyStatusRows,
    recommendedReviewAction: "Validate as a bounded A22 recovery candidate only; the worktree may stay dirty only by the authorized root-parity and owner-remediation target rows until an explicit owner staging/commit decision exists.",
    blockerCount: blockers.length,
    blockers,
    requiredEvidenceBeforePromotion: [
      "bounded dirty status exactly matches the authorized root-parity and owner-remediation target rows",
      "candidate-specific git status/log/diff evidence",
      "candidate-specific npm run type-check",
      "candidate-specific npm run build",
      "candidate-specific focused regression smoke",
      "A22 clean-source or reviewed-slice selection record",
      "separate owner staging/commit instruction",
      "separate owner merge instruction"
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

function promotionRows(artifacts) {
  const dashboardRows = artifacts.worktreeDashboard.worktreeLedger ?? [];
  const recoveryRow = controlledRecoveryCandidate(artifacts);
  const cleanRows = (artifacts.cleanReleaseSourceRunway.cleanWorktreeCandidates ?? [])
    .map((candidate) => {
      const statusCounts = statusCountsForCandidate(candidate, dashboardRows);
      const lane = candidatePromotionLane(candidate);
      const blockers = candidateBlockers(candidate, artifacts);
      return {
        branch: candidate.branch,
        path: candidate.path,
        head: candidate.head,
        divergence: candidate.divergence ?? { behind: 0, ahead: 0 },
        lifecycleState: candidate.lifecycleState,
        statusCounts,
        promotionLane: lane,
        promotionRank: 0,
        promotionEligibleNow: false,
        releaseSourceSelected: false,
        recommendedReviewAction: lane === "clean-diverged-slice-review"
          ? "Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green."
          : "Review for archive or retirement before treating it as release-source evidence.",
        blockerCount: blockers.length,
        blockers,
        requiredEvidenceBeforePromotion: [
          "explicit owner clean-source promotion instruction",
          "candidate-specific git status/log/diff evidence",
          "candidate-specific npm run type-check",
          "candidate-specific npm run build",
          "candidate-specific focused regression smoke",
          "A22 clean-source selection record",
          "separate owner merge instruction"
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
    })
    .sort(compareCandidatePriority);
  return [
    ...(recoveryRow ? [recoveryRow] : []),
    ...cleanRows
  ].map((candidate, index) => ({ ...candidate, promotionRank: index + 1 }));
}

export function buildCleanSourceCandidatePromotionPacket() {
  const artifacts = {
    dirtyMap: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.dirtyMap),
    cleanReleaseSourceRunway: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.cleanReleaseSourceRunway),
    worktreeDashboard: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.worktreeDashboard),
    worktreeLifecycleGate: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.worktreeLifecycleGate),
    validateToMergeExitCriteria: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.validateToMergeExitCriteria),
    authorizationTransitionForecast: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.authorizationTransitionForecast),
    sevenStepClosureBridge: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.sevenStepClosureBridge),
    rootParityCandidateMutation: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.rootParityCandidateMutation),
    ownerRemediationCandidateDirtyAllowlist: readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.ownerRemediationCandidateDirtyAllowlist)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const rows = promotionRows(artifacts);
  const controlledRecoveryRows = rows.filter((row) => row.promotionLane === "controlled-mutated-root-parity-recovery");
  const cleanRows = rows.filter((row) => row.promotionLane !== "controlled-mutated-root-parity-recovery");
  const reviewableRows = cleanRows.filter((row) => count(row.divergence?.ahead) > 0);
  const staleRows = cleanRows.filter((row) => count(row.divergence?.ahead) === 0);
  const topCandidate = rows[0] ?? null;
  const promotionEligibleNow = false;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    promotionStatus: "blocked-before-clean-source-promotion",
    topCandidate: topCandidate ? {
      branch: topCandidate.branch,
      path: topCandidate.path,
      head: topCandidate.head,
      promotionRank: topCandidate.promotionRank,
      promotionLane: topCandidate.promotionLane,
      promotionEligibleNow: false,
      allowedDirtyStatusRows: topCandidate.allowedDirtyStatusRows ?? [],
      authorizedMutationUnitIds: topCandidate.authorizedMutationUnitIds ?? [],
      candidateTargetsVerified: topCandidate.candidateTargetsVerified ?? 0
    } : null,
    candidateRows: rows,
    promotionBlockers: [
      {
        id: "no-selected-clean-source",
        owner: "A22 production reliability and release engineering",
        status: "blocked",
        count: 1,
        detail: "No clean worktree, clean clone, reviewed clean slice, or owner-approved pruned staging package has been selected."
      },
      {
        id: "candidate-specific-gates-missing",
        owner: "A22 production reliability and release engineering",
        status: "blocked",
        count: rows.length,
        detail: "No candidate-specific type/build/regression gate is recorded for any clean worktree candidate."
      },
      {
        id: "canonical-authorization-backlog",
        owner: "A25 git hygiene and release intake",
        status: "blocked",
        count: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
        detail: "Canonical authorization rows remain before validate-to-merge can advance."
      },
      {
        id: "merge-not-authorized",
        owner: "Owner",
        status: "not-authorized",
        count: 1,
        detail: "No separate owner merge instruction is recorded."
      }
    ].map((row) => ({
      ...row,
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      cleanupAuthorized: false,
      executableNow: false
    })),
    safeValidationCommands: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
      "node coordination/release-intake/assert-worktree-lifecycle.mjs",
      "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
      "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs"
    ],
    summary: {
      promotionEligibleNow,
      releaseSourceSelected: false,
      candidateRows: rows.length,
      cleanCandidateRows: count(artifacts.cleanReleaseSourceRunway.summary?.cleanWorktreeCandidates),
      controlledRecoveryCandidateRows: controlledRecoveryRows.length,
      reviewableCleanSliceRows: reviewableRows.length,
      staleCleanBranchRows: staleRows.length,
      topCandidateBranch: topCandidate?.branch ?? "",
      topCandidatePromotionLane: topCandidate?.promotionLane ?? "",
      cleanWorktreeCandidates: count(artifacts.cleanReleaseSourceRunway.summary?.cleanWorktreeCandidates),
      dirtyWorktrees: count(artifacts.cleanReleaseSourceRunway.summary?.dirtyWorktrees),
      pendingCanonicalAuthorizationRows: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
      currentFocusRows: count(artifacts.authorizationTransitionForecast.summary?.currentFocusRows),
      packageWorktreeTypeCheckErrorLines: count(artifacts.sevenStepClosureBridge.summary?.packageWorktreeTypeCheckErrorLines),
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      createsClone: false,
      createsWorktree: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      pushes: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableCleanSourceCandidatePromotionProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    promotionStatus: payload.promotionStatus,
    topCandidate: payload.topCandidate,
    candidateRows: payload.candidateRows,
    promotionBlockers: payload.promotionBlockers,
    safeValidationCommands: payload.safeValidationCommands,
    summary: payload.summary,
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

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const candidateRows = payload.candidateRows.map((candidate) => (
    `| ${candidate.promotionRank} | \`${cell(candidate.branch)}\` | ${cell(candidate.promotionLane)} | behind ${candidate.divergence.behind ?? 0}, ahead ${candidate.divergence.ahead ?? 0} | no | ${candidate.blockerCount} | ${cell(candidate.recommendedReviewAction)} |`
  )).join("\n") || "| 0 | none | none | none | no | 0 | none |";
  const blockerRows = payload.promotionBlockers.map((blocker) => (
    `| \`${cell(blocker.id)}\` | ${cell(blocker.owner)} | ${cell(blocker.status)} | ${blocker.count} | ${cell(blocker.detail)} |`
  )).join("\n") || "| none | none | none | 0 | none |";

  return `# A22 Clean Source Candidate Promotion Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is evidence-only. It ranks clean worktree candidates for review order, but it does not select a release source, create a clone, create or remove a worktree, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, or authorize cleanup.

## Summary

- Promotion status: ${payload.promotionStatus}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Candidate rows: ${payload.summary.candidateRows}
- Clean candidate rows: ${payload.summary.cleanCandidateRows}
- Controlled recovery candidate rows: ${payload.summary.controlledRecoveryCandidateRows}
- Reviewable clean-slice rows: ${payload.summary.reviewableCleanSliceRows}
- Stale clean-branch rows: ${payload.summary.staleCleanBranchRows}
- Top candidate branch: \`${payload.summary.topCandidateBranch}\`
- Top candidate lane: ${payload.summary.topCandidatePromotionLane}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Current focus rows: ${payload.summary.currentFocusRows}
- Package/worktree type-check error lines: ${payload.summary.packageWorktreeTypeCheckErrorLines}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Candidate Ranking

Clean does not mean deployable. A clean-diverged slice still needs owner review, candidate-specific type/build/regression gates, A22 clean-source selection evidence, and a separate owner merge instruction.

| Rank | Branch | Promotion lane | Divergence | Promotion eligible now | Blockers | Recommended review action |
| ---: | --- | --- | --- | --- | ---: | --- |
${candidateRows}

## Promotion Blockers

| ID | Owner | Status | Count | Detail |
| --- | --- | --- | ---: | --- |
${blockerRows}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

Every candidate remains non-executable. This packet does not authorize clean-source promotion, cleanup, merge, deploy, destructive Git, dirty-root deploy, or physical lifecycle cleanup.
`;
}

function main() {
  const payload = buildCleanSourceCandidatePromotionPacket();
  write(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestMarkdown, markdown(payload));
  write(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 clean source candidate promotion packet generated");
  console.log(`Promotion status: ${payload.promotionStatus}`);
  console.log(`Candidate rows: ${payload.summary.candidateRows}`);
  console.log(`Top candidate: ${payload.summary.topCandidateBranch || "none"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
