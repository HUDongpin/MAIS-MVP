#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS,
  buildTopCleanCandidateBuildSnapshot,
  stableTopCleanCandidateBuildSnapshotProjection
} from "./generate-a22-top-clean-candidate-build-snapshot.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-build-snapshot-current-gate.json");
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

function rowById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestJson);
  const current = buildTopCleanCandidateBuildSnapshot();
  if (!sameJson(
    stableTopCleanCandidateBuildSnapshotProjection(recorded),
    stableTopCleanCandidateBuildSnapshotProjection(current)
  )) {
    failures.push("A22 top clean candidate build snapshot is stale");
  }

  const promotion = readJson(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.cleanSourceCandidatePromotion);
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const moduleBlockers = recorded.moduleBlockers ?? [];
  const candidateStatus = recorded.candidateWorktreeStatus ?? {};
  const buildArtifacts = recorded.buildArtifacts ?? {};
  const boundedRecovery = promotion.topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery";
  const expectedStatusEntries = boundedRecovery ? (promotion.topCandidate?.allowedDirtyStatusRows ?? []).length : 0;
  const buildRefreshRequired = recorded.buildStatus === "blocked-build-refresh-required";

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (!["failed", "blocked-build-refresh-required"].includes(recorded.buildStatus)) {
    failures.push("buildStatus must record failed or build-refresh-required state");
  }
  if (summary.buildPassed !== false) failures.push("summary.buildPassed must be false");
  if (buildRefreshRequired) {
    if ((summary.exitStatus ?? null) !== null) failures.push("summary.exitStatus must be null when build refresh is required");
    if (summary.failureCategory !== "post-extraction-build-refresh-required") {
      failures.push("summary.failureCategory must be post-extraction-build-refresh-required");
    }
  } else {
    if ((summary.exitStatus ?? null) !== 1) failures.push("summary.exitStatus must be 1");
    if (summary.failureCategory !== "webpack-module-not-found") failures.push("summary.failureCategory must be webpack-module-not-found");
  }
  if (count(summary.moduleBlockerRows) !== 5) failures.push("summary.moduleBlockerRows must be 5");
  if (buildRefreshRequired) {
    if (count(summary.confirmedModuleBlockerRows) !== 0) failures.push("confirmedModuleBlockerRows must be 0 when blockers are resolved");
    if (count(summary.resolvedModuleBlockerRows) !== count(summary.moduleBlockerRows)) {
      failures.push("all previous module blocker rows must be resolved when build refresh is required");
    }
  } else if (count(summary.confirmedModuleBlockerRows) !== count(summary.moduleBlockerRows)) {
    failures.push("all module blocker rows must be confirmed");
  }
  if (moduleBlockers.length !== count(summary.moduleBlockerRows)) failures.push("moduleBlockers length must match summary.moduleBlockerRows");
  if (buildRefreshRequired) {
    if (!moduleBlockers.every((row) => row.importerExists === true && row.importPresent === true && row.expectedModuleResolved === true && row.blockerConfirmed === false)) {
      failures.push("every previous module blocker row must be resolved by source inspection");
    }
  } else if (!moduleBlockers.every((row) => row.importerExists === true && row.importPresent === true && row.expectedModuleResolved === false && row.blockerConfirmed === true)) {
    failures.push("every module blocker row must be confirmed by source inspection");
  }
  if (recorded.topCandidate?.branch !== promotion.topCandidate?.branch) failures.push("top candidate branch must match promotion packet");
  if (recorded.topCandidate?.path !== promotion.topCandidate?.path) failures.push("top candidate path must match promotion packet");
  if (recorded.topCandidate?.promotionEligibleNow !== false) failures.push("top candidate promotionEligibleNow must remain false");
  if (recorded.topCandidate?.releaseSourceSelected !== false) failures.push("top candidate releaseSourceSelected must remain false");
  if (count(candidateStatus.statusEntryCount) !== expectedStatusEntries) {
    failures.push(`candidate normal git status entry count must be ${expectedStatusEntries}`);
  }
  if (boundedRecovery) {
    if ((candidateStatus.allowedDirtyStatusRows ?? []).length !== expectedStatusEntries) {
      failures.push("candidate allowedDirtyStatusRows must match promotion allowlist for recovery candidate");
    }
    if (candidateStatus.statusAllowed !== true) failures.push("candidate statusAllowed must be true for recovery candidate");
    if (candidateStatus.boundedDirtyAccepted !== true) failures.push("candidate boundedDirtyAccepted must be true for recovery candidate");
  } else if (candidateStatus.cleanForGit !== true) {
    failures.push("candidate normal git status must remain clean");
  }
  if (candidateStatus.nextDirIgnored !== true) failures.push(".next should be visible only as an ignored candidate artifact");
  if (buildArtifacts.nextDirPresent !== true) failures.push(".next build artifact should be recorded as present");
  if (count(buildArtifacts.nextDirSizeKiB) <= 0) failures.push(".next build artifact size must be positive");
  if (buildArtifacts.tsbuildInfoPresent !== false) failures.push("tsconfig.tsbuildinfo must not be present after the observed build");
  if (count(buildArtifacts.cleanupAuthorizedRows) !== 0) failures.push("buildArtifacts.cleanupAuthorizedRows must be 0");
  if (count(buildArtifacts.executableRows) !== 0) failures.push("buildArtifacts.executableRows must be 0");

  for (const [id, expectedPassed] of [
    ["candidate-build-observed", !buildRefreshRequired],
    ["candidate-build-passed", false],
    ["candidate-build-blockers-confirmed", !buildRefreshRequired],
    ["candidate-build-blockers-resolved", buildRefreshRequired],
    ["candidate-build-git-clean-after", true],
    ["candidate-build-artifact-present", true]
  ]) {
    const row = rowById(recorded.validationRows, id);
    if (!row) failures.push(`missing validation row: ${id}`);
    if (row && row.passed !== expectedPassed) failures.push(`${id}.passed must be ${expectedPassed}`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["rerunsBuild", false],
    ["usesObservedEscalatedBuild", true],
    ["requiresEscalatedBuildToRefreshActualBuild", true],
    ["runsTypeCheck", false],
    ["runsRegression", false],
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

  const markdown = readText(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Build Snapshot",
    `Build status: ${recorded.buildStatus}`,
    `Failure category: ${summary.failureCategory}`,
    "Module Blockers",
    "cleanup is not authorized"
  ]) {
    if (!markdown.includes(needle)) failures.push(`build snapshot markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("build snapshot markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    buildStatus: recorded.buildStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    exitStatus: summary.exitStatus ?? null,
    failureCategory: summary.failureCategory ?? "",
    moduleBlockerRows: summary.moduleBlockerRows ?? 0,
    confirmedModuleBlockerRows: summary.confirmedModuleBlockerRows ?? 0,
    candidateCleanForGit: candidateStatus.cleanForGit === true,
    nextDirPresent: buildArtifacts.nextDirPresent === true,
    nextDirSizeMiB: buildArtifacts.nextDirSizeMiB ?? 0,
    cleanupAuthorizedRows: buildArtifacts.cleanupAuthorizedRows ?? 0,
    executableRows: buildArtifacts.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 top clean candidate build snapshot gate");
    console.log(`Build status: ${payload.buildStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Module blockers: ${payload.confirmedModuleBlockerRows ?? 0}/${payload.moduleBlockerRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate build snapshot gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
