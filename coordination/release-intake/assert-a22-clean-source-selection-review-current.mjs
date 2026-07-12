#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS,
  buildA22CleanSourceSelectionReview,
  stableA22CleanSourceSelectionReviewProjection
} from "./generate-a22-clean-source-selection-review.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-clean-source-selection-review-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestJson,
    A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestJson);
  const current = buildA22CleanSourceSelectionReview();
  const markdown = readText(A22_CLEAN_SOURCE_SELECTION_REVIEW_PATHS.latestMarkdown);

  fail(
    failures,
    sameJson(
      stableA22CleanSourceSelectionReviewProjection(recorded),
      stableA22CleanSourceSelectionReviewProjection(current)
    ),
    "A22 clean source selection review is stale"
  );
  fail(failures, recorded.reviewKind === "a22-clean-source-selection-review", "reviewKind is invalid");
  fail(
    failures,
    [
      "reviewed-fallback-green-not-selected",
      "reviewed-top-candidate-red-no-selection",
      "waiting-clean-source-selection-review"
    ].includes(recorded.selectionReviewStatus),
    "selectionReviewStatus is unsupported"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.summary?.fallbackGreenCandidateBranch === "codex/s22-release-hygiene-2026-06-15", "unexpected fallback green candidate branch");
  fail(failures, recorded.summary?.fallbackValidationPassed === true, "fallback validation must pass");
  fail(failures, recorded.summary?.fallbackTypeCheckPassed === true, "fallback type-check must pass");
  fail(failures, recorded.summary?.fallbackTypeCheckErrorLines === 0, "fallback type-check error lines must be 0");
  fail(failures, recorded.summary?.fallbackBuildPassed === true, "fallback build must pass");
  fail(failures, recorded.summary?.fallbackTrackedMutationDetected === false, "fallback tracked mutation must be false");
  fail(failures, recorded.summary?.queueStatus === "fallback-candidate-green-await-clean-source-selection-review", "queueStatus must reflect fallback clean-source review");
  fail(failures, recorded.summary?.topCandidateBranch === "codex/A22-us-region-alignment", "unexpected top candidate branch");
  fail(failures, recorded.summary?.topCandidateTypeCheckErrorLines > 0, "top candidate type-check error lines must remain positive");
  fail(failures, recorded.summary?.topCandidateBuildRefreshRequired === true, "top candidate build refresh must remain required");
  fail(failures, recorded.summary?.releaseSourceEligibleNow === false, "releaseSourceEligibleNow must be false");
  fail(failures, recorded.summary?.releaseSourceSelected === false, "releaseSourceSelected must be false");
  fail(failures, recorded.summary?.promotionEligibleNow === false, "promotionEligibleNow must be false");
  fail(failures, recorded.summary?.pendingCanonicalAuthorizationRows > 0, "pending canonical authorization rows must remain positive");
  fail(failures, recorded.summary?.failedMergeChecks > 0, "failed merge checks must remain positive");
  fail(failures, recorded.summary?.validateExitReady === false, "validateExitReady must be false");
  fail(failures, recorded.summary?.readyForMerge === false, "readyForMerge must be false");
  fail(failures, recorded.summary?.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, recorded.summary?.executableRows === 0, "executableRows must be 0");

  const rows = recorded.selectionRows ?? [];
  fail(failures, rows.length === 3, "exactly three selection review rows are required");
  for (const rowId of [
    "fallback-green-candidate-reviewed",
    "top-candidate-remediation-still-required",
    "selection-boundary-holds"
  ]) {
    fail(failures, rows.some((row) => row.rowId === rowId), `missing selection row: ${rowId}`);
  }

  const boundary = recorded.boundary ?? {};
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
    fail(failures, boundary[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const requiredCommand of [
    "node coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs",
    "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs"
  ]) {
    fail(
      failures,
      (recorded.safeNextCommands ?? []).includes(requiredCommand),
      `missing safe next command: ${requiredCommand}`
    );
  }

  for (const needle of [
    "A22 Clean Source Selection Review",
    "reviewed for clean-source selection",
    "does not select a release source",
    "Selection Review Rows",
    "Physical lifecycle cleanup authorized: no"
  ]) {
    fail(failures, markdown.includes(needle), `selection review markdown missing text: ${needle}`);
  }
  fail(failures, !markdown.includes("undefined"), "selection review markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    selectionReviewStatus: recorded.selectionReviewStatus,
    fallbackGreenCandidateBranch: recorded.summary?.fallbackGreenCandidateBranch ?? "",
    releaseSourceEligibleNow: recorded.summary?.releaseSourceEligibleNow === true,
    releaseSourceSelected: recorded.summary?.releaseSourceSelected === true,
    pendingCanonicalAuthorizationRows: recorded.summary?.pendingCanonicalAuthorizationRows ?? 0,
    failedMergeChecks: recorded.summary?.failedMergeChecks ?? 0,
    cleanupAuthorizedRows: recorded.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded.summary?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 clean source selection review gate");
    console.log(`Selection review status: ${payload.selectionReviewStatus ?? "unknown"}`);
    console.log(`Fallback green candidate: ${payload.fallbackGreenCandidateBranch || "none"}`);
    console.log(`Release source selected: ${payload.releaseSourceSelected ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 clean source selection review gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
