#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CLEAN_RELEASE_SOURCE_RUNWAY_PATHS,
  buildCleanReleaseSourceRunway,
  stableCleanReleaseSourceRunwayProjection
} from "./generate-a22-clean-release-source-runway.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-clean-release-source-runway-current-gate.json");
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
    CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestJson,
    CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestJson);
  const current = buildCleanReleaseSourceRunway();
  if (!sameJson(
    stableCleanReleaseSourceRunwayProjection(recorded),
    stableCleanReleaseSourceRunwayProjection(current)
  )) {
    failures.push("A22 clean release source runway is stale");
  }

  const releaseSource = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.releaseSourceBlocker);
  const noDirtyRootDeploy = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.noDirtyRootDeployEvidence);
  const dashboard = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.worktreeDashboard);
  const ownerReadiness = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.ownerPackageReadiness);
  const exitCriteria = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.validateToMergeExitCriteria);
  const forecast = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.authorizationTransitionForecast);
  const bridge = readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.sevenStepClosureBridge);

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const options = recorded.allowedSourceOptions ?? [];
  const blockers = recorded.runwayBlockers ?? [];
  const blockerIds = blockers.map((row) => row.id);
  const cleanCandidates = (dashboard.worktreeLedger ?? []).filter((row) => count(row.statusCounts?.total) === 0);
  const dirtyWorktrees = (dashboard.worktreeLedger ?? []).filter((row) => count(row.statusCounts?.total) > 0);

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.runwayStatus !== "blocked-before-clean-source-selection") failures.push("runwayStatus must remain blocked");
  if (summary.releaseSourceEligibleNow !== false) failures.push("summary.releaseSourceEligibleNow must be false");
  if ((summary.allowedSourceOptions ?? 0) !== 4) failures.push("expected four allowed release-source options");
  if ((summary.blockedAllowedSourceOptions ?? 0) !== 4) failures.push("all allowed release-source options must remain blocked");
  if (options.length !== 4) failures.push("allowedSourceOptions length must be four");
  if ((summary.cleanWorktreeCandidates ?? -1) !== cleanCandidates.length) {
    failures.push("summary.cleanWorktreeCandidates must match clean worktree ledger rows");
  }
  if ((summary.dirtyWorktrees ?? -1) !== dirtyWorktrees.length) {
    failures.push("summary.dirtyWorktrees must match dirty worktree ledger rows");
  }
  if ((recorded.cleanWorktreeCandidates ?? []).length !== cleanCandidates.length) {
    failures.push("cleanWorktreeCandidates list must match worktree dashboard clean rows");
  }
  if ((summary.rootStatusEntries ?? -1) !== (releaseSource.summary?.rootStatusEntries ?? 0)) {
    failures.push("summary.rootStatusEntries must match A22 release-source blocker evidence");
  }
  if ((summary.dirtyMapExpandedEntries ?? -1) !== (releaseSource.summary?.dirtyMapExpandedEntries ?? 0)) {
    failures.push("summary dirty-map expanded entries must match A22 release-source blocker evidence");
  }
  if ((summary.ownerPackageReadyRows ?? -1) !== (ownerReadiness.summary?.readyRows ?? 0)) {
    failures.push("summary.ownerPackageReadyRows must match owner-package readiness");
  }
  if ((summary.ownerPackageBlockedRows ?? -1) !== (ownerReadiness.summary?.blockedRows ?? 0)) {
    failures.push("summary.ownerPackageBlockedRows must match owner-package readiness");
  }
  if ((summary.pendingCanonicalAuthorizationRows ?? -1) !== (exitCriteria.summary?.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary.pendingCanonicalAuthorizationRows must match validate-to-merge exit criteria");
  }
  if ((summary.currentFocusRows ?? -1) !== (forecast.summary?.currentFocusRows ?? 0)) {
    failures.push("summary.currentFocusRows must match authorization transition forecast");
  }
  if ((summary.projectedPendingCanonicalAuthorizationRows ?? -1) !== (forecast.summary?.projectedPendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary.projectedPendingCanonicalAuthorizationRows must match authorization transition forecast");
  }
  if (summary.validateExitReady !== (exitCriteria.validateExitReady === true)) {
    failures.push("summary.validateExitReady must match validate-to-merge exit criteria");
  }
  if (summary.readyForMerge !== (exitCriteria.readyForMerge === true)) {
    failures.push("summary.readyForMerge must match validate-to-merge exit criteria");
  }
  if (summary.releaseSourceClean !== (releaseSource.summary?.releaseSourceClean === true)) {
    failures.push("summary.releaseSourceClean must match A22 release-source evidence");
  }
  if ((summary.directFailedMergeChecks ?? -1) !== (exitCriteria.summary?.directFailedMergeChecks ?? 0)) {
    failures.push("summary.directFailedMergeChecks must match validate-to-merge exit criteria");
  }
  if (noDirtyRootDeploy.passed !== true) failures.push("no-dirty-root deploy evidence must remain passed as protective evidence");
  if (bridge.summary?.releaseSourceClean === true) failures.push("seven-step bridge must not report a clean release source yet");

  const requiredOptions = [
    "current-root-clean-worktree",
    "fresh-clean-clone",
    "reviewed-clean-release-slice",
    "owner-approved-pruned-staging-package"
  ];
  for (const id of requiredOptions) {
    if (!options.some((row) => row.id === id)) failures.push(`missing allowed source option: ${id}`);
  }
  for (const option of options) {
    if (option.releaseSourceEligibleNow !== false) failures.push(`${option.id}: releaseSourceEligibleNow must be false`);
    if (option.status === "ready") failures.push(`${option.id}: status must not be ready while clean-source gate is blocked`);
    if ((option.blockerCount ?? 0) < 1) failures.push(`${option.id}: blockerCount must be positive`);
    if ((option.blockers ?? []).length < 1) failures.push(`${option.id}: blockers must be present`);
  }

  for (const requiredBlocker of [
    "a22-release-source-not-clean",
    "current-focus-authorization-pending",
    "canonical-authorization-backlog",
    "validation-hold",
    "package-worktree-typecheck-red",
    "merge-not-authorized"
  ]) {
    if (!blockerIds.includes(requiredBlocker)) failures.push(`missing runway blocker: ${requiredBlocker}`);
  }
  for (const blocker of blockers) {
    if (blocker.releaseSourceEligibleNow !== false) failures.push(`${blocker.id}: releaseSourceEligibleNow must be false`);
    if (blocker.mergeAuthorized !== false) failures.push(`${blocker.id}: mergeAuthorized must be false`);
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
    "node coordination/release-intake/assert-a22-release-source-clean-blocker-evidence-current.mjs",
    "node coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/assert-authorization-transition-forecast-current.mjs",
    "node coordination/release-intake/assert-seven-step-closure-bridge-current.mjs",
    "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Clean Release Source Runway",
    "Allowed Source Options",
    "Clean Worktree Candidates",
    "does not create a clone",
    "does not authorize cleanup",
    "Every option remains non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`clean release source runway markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("clean release source runway markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    runwayStatus: recorded.runwayStatus,
    releaseSourceEligibleNow: summary.releaseSourceEligibleNow === true,
    allowedSourceOptions: summary.allowedSourceOptions ?? 0,
    blockedAllowedSourceOptions: summary.blockedAllowedSourceOptions ?? 0,
    cleanWorktreeCandidates: summary.cleanWorktreeCandidates ?? 0,
    dirtyWorktrees: summary.dirtyWorktrees ?? 0,
    rootStatusEntries: summary.rootStatusEntries ?? 0,
    ownerPackageBlockedRows: summary.ownerPackageBlockedRows ?? 0,
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
    console.log("A22 clean release source runway gate");
    console.log(`Runway status: ${payload.runwayStatus ?? "unknown"}`);
    console.log(`Release source eligible now: ${payload.releaseSourceEligibleNow ? "yes" : "no"}`);
    console.log(`Blocked allowed source options: ${payload.blockedAllowedSourceOptions ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 clean release source runway gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
