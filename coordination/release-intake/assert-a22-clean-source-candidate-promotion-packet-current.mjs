#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS,
  buildCleanSourceCandidatePromotionPacket,
  stableCleanSourceCandidatePromotionProjection
} from "./generate-a22-clean-source-candidate-promotion-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-clean-source-candidate-promotion-packet-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestJson,
    CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestJson);
  const current = buildCleanSourceCandidatePromotionPacket();
  if (!sameJson(
    stableCleanSourceCandidatePromotionProjection(recorded),
    stableCleanSourceCandidatePromotionProjection(current)
  )) {
    failures.push("A22 clean source candidate promotion packet is stale");
  }

  const runway = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.cleanReleaseSourceRunway);
  const dashboard = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.worktreeDashboard);
  const lifecycle = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.worktreeLifecycleGate);
  const exitCriteria = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.validateToMergeExitCriteria);
  const forecast = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.authorizationTransitionForecast);
  const bridge = readJson(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.sevenStepClosureBridge);

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.candidateRows ?? [];
  const blockers = recorded.promotionBlockers ?? [];
  const cleanDashboardRows = (dashboard.worktreeLedger ?? []).filter((row) => count(row.statusCounts?.total) === 0);
  const cleanLifecycleRows = (lifecycle.worktrees ?? []).filter((row) => count(row.statusEntries) === 0);
  const recoveryRows = rows.filter((row) => row.promotionLane === "controlled-mutated-root-parity-recovery");
  const cleanRows = rows.filter((row) => row.promotionLane !== "controlled-mutated-root-parity-recovery");
  const reviewableRows = cleanRows.filter((row) => count(row.divergence?.ahead) > 0);
  const staleRows = cleanRows.filter((row) => count(row.divergence?.ahead) === 0);

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.promotionStatus !== "blocked-before-clean-source-promotion") failures.push("promotionStatus must remain blocked");
  if (summary.promotionEligibleNow !== false) failures.push("summary.promotionEligibleNow must be false");
  if (summary.releaseSourceSelected !== false) failures.push("summary.releaseSourceSelected must be false");
  if ((summary.candidateRows ?? -1) !== rows.length) failures.push("summary.candidateRows must match candidate rows");
  if ((summary.cleanCandidateRows ?? -1) !== (runway.cleanWorktreeCandidates ?? []).length) {
    failures.push("summary.cleanCandidateRows must match A22 runway clean worktree candidates");
  }
  if ((summary.cleanCandidateRows ?? -1) !== cleanDashboardRows.length) {
    failures.push("summary.cleanCandidateRows must match dashboard clean worktree rows");
  }
  if ((summary.cleanCandidateRows ?? -1) !== cleanLifecycleRows.length) {
    failures.push("summary.cleanCandidateRows must match lifecycle clean worktree rows");
  }
  if ((summary.controlledRecoveryCandidateRows ?? -1) !== recoveryRows.length) {
    failures.push("summary.controlledRecoveryCandidateRows must match recovery rows");
  }
  if ((summary.reviewableCleanSliceRows ?? -1) !== reviewableRows.length) {
    failures.push("summary.reviewableCleanSliceRows must match candidate ahead rows");
  }
  if ((summary.staleCleanBranchRows ?? -1) !== staleRows.length) {
    failures.push("summary.staleCleanBranchRows must match candidate zero-ahead rows");
  }
  if (reviewableRows.length < 1) failures.push("expected at least one reviewable clean-diverged slice candidate");
  if (staleRows.length < 1) failures.push("expected at least one stale clean branch candidate");
  if ((summary.pendingCanonicalAuthorizationRows ?? -1) !== (exitCriteria.summary?.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary.pendingCanonicalAuthorizationRows must match validate-to-merge exit criteria");
  }
  if ((summary.currentFocusRows ?? -1) !== (forecast.summary?.currentFocusRows ?? 0)) {
    failures.push("summary.currentFocusRows must match authorization transition forecast");
  }
  if ((summary.packageWorktreeTypeCheckErrorLines ?? -1) !== (bridge.summary?.packageWorktreeTypeCheckErrorLines ?? 0)) {
    failures.push("summary.packageWorktreeTypeCheckErrorLines must match seven-step bridge");
  }
  if (summary.validateExitReady !== (exitCriteria.validateExitReady === true)) {
    failures.push("summary.validateExitReady must match validate-to-merge exit criteria");
  }
  if (summary.readyForMerge !== (exitCriteria.readyForMerge === true)) {
    failures.push("summary.readyForMerge must match validate-to-merge exit criteria");
  }
  if (runway.summary?.releaseSourceEligibleNow !== false) failures.push("source runway must still report no eligible release source");

  const ranks = rows.map((row) => row.promotionRank);
  for (let index = 0; index < ranks.length; index += 1) {
    if (ranks[index] !== index + 1) failures.push("candidate promotion ranks must be contiguous from 1");
  }
  const topRow = rows[0] ?? null;
  if ((summary.topCandidateBranch ?? "") !== (topRow?.branch ?? "")) failures.push("summary.topCandidateBranch must match first ranked row");
  if ((recorded.topCandidate?.branch ?? "") !== (topRow?.branch ?? "")) failures.push("topCandidate must match first ranked row");
  if (topRow && topRow.promotionLane !== "controlled-mutated-root-parity-recovery" && count(topRow.divergence?.ahead) <= 0) {
    failures.push("top candidate should be recovery or a reviewable ahead branch when one exists");
  }

  for (const row of rows) {
    const isRecovery = row.promotionLane === "controlled-mutated-root-parity-recovery";
    if (isRecovery) {
      const expectedRecoveryRows = (row.allowedDirtyStatusRows ?? []).length;
      if (expectedRecoveryRows < 4) failures.push(`${row.branch}: recovery allowedDirtyStatusRows must include at least the 4 root-parity rows`);
      if (count(row.statusCounts?.total) !== expectedRecoveryRows) {
        failures.push(`${row.branch}: recovery statusCounts.total must match allowedDirtyStatusRows`);
      }
      if ((row.candidateTargetsVerified ?? 0) !== expectedRecoveryRows) {
        failures.push(`${row.branch}: recovery candidateTargetsVerified must match allowedDirtyStatusRows`);
      }
    } else if (count(row.statusCounts?.total) !== 0) {
      failures.push(`${row.branch}: clean candidate statusCounts.total must be 0`);
    }
    if (row.promotionEligibleNow !== false) failures.push(`${row.branch}: promotionEligibleNow must be false`);
    if (row.releaseSourceSelected !== false) failures.push(`${row.branch}: releaseSourceSelected must be false`);
    if (!["controlled-mutated-root-parity-recovery", "clean-diverged-slice-review", "stale-clean-branch-review"].includes(row.promotionLane ?? "")) {
      failures.push(`${row.branch}: promotionLane is invalid`);
    }
    if ((row.blockerCount ?? 0) < 1) failures.push(`${row.branch}: blockerCount must be positive`);
    if ((row.blockers ?? []).length !== row.blockerCount) failures.push(`${row.branch}: blockerCount must match blockers length`);
    if (!(row.requiredEvidenceBeforePromotion ?? []).includes("candidate-specific npm run type-check")) {
      failures.push(`${row.branch}: required evidence must include candidate-specific type-check`);
    }
    for (const [key, expected] of [
      ["evidenceOnly", true],
      ["selectsReleaseSource", false],
      ["recordsOwnerApproval", false],
      ["recordsExecutionInstruction", false],
      ["stagesFiles", false],
      ["commits", false],
      ["merges", false],
      ["deploys", false],
      ["cleanupAuthorized", false],
      ["executableNow", false],
      ["destructiveGitAuthorized", false],
      ["physicalLifecycleCleanupAuthorized", false]
    ]) {
      if (row.boundary?.[key] !== expected) failures.push(`${row.branch}: boundary.${key} must be ${expected}`);
    }
  }

  for (const requiredBlocker of [
    "no-selected-clean-source",
    "candidate-specific-gates-missing",
    "canonical-authorization-backlog",
    "merge-not-authorized"
  ]) {
    if (!blockers.some((row) => row.id === requiredBlocker)) failures.push(`missing promotion blocker: ${requiredBlocker}`);
  }
  for (const blocker of blockers) {
    if (blocker.promotionEligibleNow !== false) failures.push(`${blocker.id}: promotionEligibleNow must be false`);
    if (blocker.releaseSourceSelected !== false) failures.push(`${blocker.id}: releaseSourceSelected must be false`);
    if (blocker.cleanupAuthorized !== false) failures.push(`${blocker.id}: cleanupAuthorized must be false`);
    if (blocker.executableNow !== false) failures.push(`${blocker.id}: executableNow must be false`);
  }

  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsClone", false],
    ["createsWorktree", false],
    ["selectsReleaseSource", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["stagesFiles", false],
    ["commits", false],
    ["merges", false],
    ["pushes", false],
    ["deploys", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const commands = recorded.safeValidationCommands ?? [];
  for (const requiredCommand of [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
    "node coordination/release-intake/assert-worktree-lifecycle.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(CLEAN_SOURCE_CANDIDATE_PROMOTION_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Clean Source Candidate Promotion Packet",
    "Clean does not mean deployable",
    "Candidate Ranking",
    "Promotion Blockers",
    "does not select a release source",
    "Every candidate remains non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`candidate promotion markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("candidate promotion markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    promotionStatus: recorded.promotionStatus,
    promotionEligibleNow: summary.promotionEligibleNow === true,
    releaseSourceSelected: summary.releaseSourceSelected === true,
    candidateRows: summary.candidateRows ?? 0,
    reviewableCleanSliceRows: summary.reviewableCleanSliceRows ?? 0,
    staleCleanBranchRows: summary.staleCleanBranchRows ?? 0,
    topCandidateBranch: summary.topCandidateBranch ?? "",
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 clean source candidate promotion packet gate");
    console.log(`Promotion status: ${payload.promotionStatus ?? "unknown"}`);
    console.log(`Candidate rows: ${payload.candidateRows ?? 0}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 clean source candidate promotion packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
