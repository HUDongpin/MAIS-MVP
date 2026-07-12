#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS,
  buildWave01PackageResyncOwnerReviewCapsule,
  stableWave01PackageResyncOwnerReviewCapsuleProjection
} from "./generate-wave01-package-resync-owner-review-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-owner-review-capsule-current-gate.json");
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

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave01 package-resync owner-review capsule gate");
    console.log(`Rows: ${payload.rowCount ?? 0}`);
    console.log(`Ready for owner decision: ${payload.readyForOwnerDecision ? "yes" : "no"}`);
    console.log(`Acceptance checks: ${payload.passingAcceptanceChecks ?? 0}/${payload.acceptanceChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 Wave01 package-resync owner-review capsule gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson,
    WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson);
  const current = buildWave01PackageResyncOwnerReviewCapsule();
  if (!sameJson(
    stableWave01PackageResyncOwnerReviewCapsuleProjection(recorded),
    stableWave01PackageResyncOwnerReviewCapsuleProjection(current)
  )) {
    failures.push("A25 Wave01 package-resync owner-review capsule is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.approvalRows ?? [];
  const checks = recorded.acceptanceChecks ?? [];
  const reviewInputs = recorded.reviewInputs ?? [];
  const impact = recorded.resyncImpact ?? {};
  const partialRecommendation = recorded.partialApprovalRecommendation ?? {};

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  const rowCount = summary.rowCount ?? 0;
  const noCurrentPackageResyncRows = rowCount === 0 && rows.length === 0;
  if (rowCount !== rows.length) failures.push("summary.rowCount must match approvalRows length");
  if (rowCount < 1 && !noCurrentPackageResyncRows) failures.push("summary.rowCount must be at least 1 while Wave01 remains blocked");
  if ((summary.pendingRows ?? 0) + (summary.authorizedRows ?? 0) !== rowCount) {
    failures.push("summary pendingRows + authorizedRows must account for all current Wave01 rows");
  }
  if ((summary.packageOnlyRows ?? 0) !== rowCount) failures.push("summary.packageOnlyRows must match current row count");
  if ((summary.worktreePresentRows ?? 0) !== rowCount) failures.push("summary.worktreePresentRows must match current row count");
  if ((summary.restoreRows ?? 0) !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`summary.restoreRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if ((summary.cleanRows ?? 0) !== rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length) {
    failures.push("summary.cleanRows must match current clean rows");
  }
  if ((summary.cleanReadyRows ?? 0) !== (summary.cleanRows ?? 0)) failures.push("summary.cleanReadyRows must match current clean rows");
  if ((summary.heldRows ?? 0) !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`summary.heldRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if ((summary.cleanRows ?? 0) > 0 && (summary.totalCleanFileBytes ?? 0) <= 0) failures.push("summary.totalCleanFileBytes must be positive when clean rows remain");
  if ((summary.cleanRows ?? 0) === 0 && (summary.totalCleanFileBytes ?? 0) !== 0) failures.push("summary.totalCleanFileBytes must be 0 when no clean rows remain");
  if ((summary.copyableAuthorizationTexts ?? 0) !== rowCount) failures.push("summary.copyableAuthorizationTexts must match current row count");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if ((summary.failedAcceptanceChecks ?? 0) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if (recorded.reviewRound?.id !== "wave01-package-resync-authorizations") failures.push("review round must be wave01-package-resync-authorizations");
  if (recorded.reviewRound?.worktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance") {
    failures.push("review round worktree path must be A25-dirty-closure-governance");
  }
  if ((impact.restoreRows ?? []).length !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`resyncImpact must have ${noCurrentPackageResyncRows ? 0 : 1} restore rows`);
  }
  if ((impact.cleanRows ?? []).length !== (summary.cleanRows ?? 0)) failures.push("resyncImpact clean row count must match summary");
  if ((summary.cleanRows ?? 0) > 0 && (impact.totalCleanFileBytes ?? 0) <= 0) failures.push("resyncImpact totalCleanFileBytes must be positive when clean rows remain");
  if ((summary.cleanRows ?? 0) === 0 && (impact.totalCleanFileBytes ?? 0) !== 0) failures.push("resyncImpact totalCleanFileBytes must be 0 when no clean rows remain");
  if (!noCurrentPackageResyncRows && !String(impact.restoreRows?.[0]?.diffStat ?? "").includes("tsconfig.json")) {
    failures.push("resyncImpact restore row must include tsconfig diffstat");
  }
  const expectedStrategy = noCurrentPackageResyncRows
    ? "no-package-resync-rows-currently-required"
    : "approve-a25-clean-rows-hold-tsconfig-restore";
  if (partialRecommendation.strategy !== expectedStrategy) {
    failures.push("partial approval strategy must hold tsconfig and approve A25 clean rows");
  }
  if ((partialRecommendation.cleanReadyRows ?? []).length !== (summary.cleanReadyRows ?? 0)) failures.push("partial recommendation cleanReadyRows must match summary");
  if ((partialRecommendation.heldRows ?? []).length !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`partial recommendation heldRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if (!noCurrentPackageResyncRows && partialRecommendation.heldRows?.[0]?.approvalId !== "wave01-resync-01-tsconfig-json") {
    failures.push("partial recommendation must hold wave01-resync-01-tsconfig-json");
  }

  const failedCheckIds = checks.filter((row) => row.status !== "pass").map((row) => row.id);
  if (failedCheckIds.length > 0) failures.push(`acceptance checks failed: ${failedCheckIds.join(", ")}`);
  const missingInputs = reviewInputs.filter((row) => row.exists !== true).map((row) => row.path);
  if (missingInputs.length > 0) failures.push(`review inputs missing: ${missingInputs.join(", ")}`);

  for (const requiredId of rows.map((row) => row.approvalId)) {
    if (!(recorded.copyableAuthorizationTexts ?? []).some((row) => row.approvalId === requiredId && row.text?.includes(`approvalId=${requiredId}`))) {
      failures.push(`missing copyable authorization text for ${requiredId}`);
    }
  }

  for (const row of rows) {
    if (row.cleanupAuthorized === true) failures.push(`row ${row.approvalId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`row ${row.approvalId} must not be executable`);
    if (row.packageOnly !== true) failures.push(`row ${row.approvalId} must be packageOnly`);
    if (row.worktreePathExists !== true) failures.push(`row ${row.approvalId} worktree evidence missing`);
    if (!row.authorizationTextToPaste?.includes("approvedBy=")) failures.push(`row ${row.approvalId} authorization text missing approvedBy`);
    if (!row.authorizationTextToPaste?.includes("approvedAt=")) failures.push(`row ${row.approvalId} authorization text missing approvedAt`);
    if (!row.stopCondition?.includes("Do not execute")) failures.push(`row ${row.approvalId} missing execution stop condition`);
  }

  const markdown = readText(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown);
  const requiredMarkdownNeedles = [
    "A25 Wave01 Package Resync Owner Review Capsule",
    "does not create authorization files",
    `Ready for owner decision: ${noCurrentPackageResyncRows ? "no" : "yes"}`,
    "Acceptance checks:",
    "Impact Digest",
    "Partial Approval Recommendation",
    "Clean-Ready Rows",
    "Held Rows",
    "Clean Impact",
    "Every row remains non-executable",
    "waiting-for-owner-compose-deletion-confirmation"
  ];
  if (noCurrentPackageResyncRows) {
    requiredMarkdownNeedles.push("No Wave01 package-resync owner decision is currently required");
  } else {
    requiredMarkdownNeedles.push("approvalId=wave01-resync-01-tsconfig-json");
  }
  for (const needle of requiredMarkdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`Wave01 capsule markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("Wave01 capsule markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    rowCount: summary.rowCount ?? 0,
    readyForOwnerDecision: summary.readyForOwnerDecision === true,
    pendingRows: summary.pendingRows ?? 0,
    authorizedRows: summary.authorizedRows ?? 0,
    passingAcceptanceChecks: summary.passingAcceptanceChecks ?? 0,
    acceptanceChecks: summary.acceptanceChecks ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

main();
