#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS,
  buildWave01PackageResyncOwnerAcceptanceDocket,
  stableWave01PackageResyncOwnerAcceptanceDocketProjection
} from "./generate-wave01-package-resync-owner-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-owner-acceptance-docket-current-gate.json");
const json = process.argv.includes("--json");

const requiredApprovalIds = [
  "wave01-resync-01-tsconfig-json",
  "wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json",
  "wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md",
  "wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json",
  "wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md",
  "wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json",
  "wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md"
];

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

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson,
    WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const current = buildWave01PackageResyncOwnerAcceptanceDocket();
  if (!sameJson(
    stableWave01PackageResyncOwnerAcceptanceDocketProjection(recorded),
    stableWave01PackageResyncOwnerAcceptanceDocketProjection(current)
  )) {
    failures.push("A25 Wave01 package-resync owner acceptance docket is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const decision = recorded.ownerDecisionDocket ?? {};
  const checks = recorded.acceptanceChecks ?? [];
  const reviewInputs = recorded.reviewInputs ?? [];
  const evidenceRows = recorded.worktreeEvidenceDigest ?? [];
  const rowCount = summary.rowCount ?? 0;
  const noCurrentPackageResyncRows = rowCount === 0 && evidenceRows.length === 0;

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
  const expectedDecisionStatus = noCurrentPackageResyncRows
    ? "no-current-package-resync-owner-decision-required"
    : "ready-for-owner-decision";
  if (decision.status !== expectedDecisionStatus) failures.push(`decision status must be ${expectedDecisionStatus}`);
  if (summary.readyForOwnerDecision !== !noCurrentPackageResyncRows) {
    failures.push(`summary.readyForOwnerDecision must be ${!noCurrentPackageResyncRows}`);
  }
  if (rowCount !== evidenceRows.length) failures.push("summary.rowCount must match evidence row count");
  if (rowCount < 1 && !noCurrentPackageResyncRows) failures.push("summary.rowCount must be at least 1 while Wave01 remains blocked");
  if ((summary.pendingRows ?? 0) + (summary.authorizedRows ?? 0) !== rowCount) {
    failures.push("summary pendingRows + authorizedRows must account for all current Wave01 rows");
  }
  if ((summary.packageOnlyRows ?? 0) !== rowCount) failures.push("summary.packageOnlyRows must match row count");
  if ((summary.rootPresentRows ?? 0) !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`summary.rootPresentRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if ((summary.rootMissingRows ?? 0) !== (summary.cleanRows ?? 0)) failures.push("summary.rootMissingRows must match clean rows");
  if ((summary.worktreePresentRows ?? 0) !== rowCount) failures.push("summary.worktreePresentRows must match row count");
  if ((summary.restoreRows ?? 0) !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`summary.restoreRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if ((summary.cleanRows ?? 0) !== evidenceRows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length) {
    failures.push("summary.cleanRows must match clean evidence rows");
  }
  if ((summary.trackedDiffRows ?? 0) !== (noCurrentPackageResyncRows ? 0 : 1)) {
    failures.push(`summary.trackedDiffRows must be ${noCurrentPackageResyncRows ? 0 : 1}`);
  }
  if ((summary.untrackedCleanRows ?? 0) !== (summary.cleanRows ?? 0)) failures.push("summary.untrackedCleanRows must match clean rows");
  if ((summary.copyableAuthorizationTexts ?? 0) !== rowCount) failures.push("summary.copyableAuthorizationTexts must match row count");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if ((summary.acceptanceChecks ?? 0) < 13) failures.push("acceptanceChecks must be at least 13");
  if ((summary.failedAcceptanceChecks ?? 0) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");

  if (decision.ownerDecisionRequired !== !noCurrentPackageResyncRows) {
    failures.push(`ownerDecisionRequired must be ${!noCurrentPackageResyncRows}`);
  }
  if (decision.targetAuthorizationFile !== "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json") {
    failures.push("target authorization file must be Wave01 owner-authorizations input");
  }
  if (decision.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validation hold must wait for owner compose/deletion confirmation");
  }

  const decisionIds = decision.requiredApprovalIds ?? [];
  for (const requiredId of evidenceRows.map((row) => row.approvalId)) {
    if (!decisionIds.includes(requiredId)) failures.push(`missing required approval ID ${requiredId}`);
    if (!(decision.copyableAuthorizationTexts ?? []).some((row) => row.approvalId === requiredId && row.text?.includes(`approvalId=${requiredId}`))) {
      failures.push(`missing copyable authorization text for ${requiredId}`);
    }
    if (!evidenceRows.some((row) => row.approvalId === requiredId && row.worktreePathExists === true)) {
      failures.push(`missing worktree evidence digest row for ${requiredId}`);
    }
  }

  const failedCheckIds = checks.filter((row) => row.status !== "pass").map((row) => row.id);
  if (failedCheckIds.length > 0) failures.push(`acceptance checks failed: ${failedCheckIds.join(", ")}`);

  const missingInputs = reviewInputs.filter((row) => row.exists !== true).map((row) => row.path);
  if (missingInputs.length > 0) failures.push(`review inputs missing: ${missingInputs.join(", ")}`);

  if (!noCurrentPackageResyncRows && !evidenceRows.some((row) => row.approvalId === "wave01-resync-01-tsconfig-json" && row.rootPathExists === true && row.worktreeHasTrackedDiff === true)) {
    failures.push("tsconfig restore row must be the only root-present tracked-diff row");
  }
  if (evidenceRows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean" && row.rootPathExists === false && row.worktreeHasTrackedDiff === false).length !== (summary.cleanRows ?? 0)) {
    failures.push("clean rows must be root-missing untracked worktree artifacts");
  }

  const markdown = readText(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  const requiredMarkdownNeedles = [
    "A25 Wave01 Package Resync Owner Acceptance Docket",
    "does not create the authorization file",
    expectedDecisionStatus,
    "Rows:",
    "Pending rows:",
    "Authorized rows:",
    "Acceptance checks:",
    `Root-present rows: ${noCurrentPackageResyncRows ? 0 : 1}`,
    "Root-missing rows:",
    `Tracked-diff rows: ${noCurrentPackageResyncRows ? 0 : 1}`,
    "Untracked-clean rows:",
    "Every row remains non-executable",
    "waiting-for-owner-compose-deletion-confirmation"
  ];
  if (noCurrentPackageResyncRows) {
    requiredMarkdownNeedles.push("No Wave01 package-worktree resync owner decision is currently required");
  } else {
    requiredMarkdownNeedles.push("approvalId=wave01-resync-01-tsconfig-json");
  }
  for (const needle of requiredMarkdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    decisionStatus: decision.status,
    rowCount: summary.rowCount ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    passingAcceptanceChecks: summary.passingAcceptanceChecks ?? 0,
    acceptanceChecks: summary.acceptanceChecks ?? 0,
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
    console.log("A25 Wave01 package-resync owner acceptance docket gate");
    console.log(`Decision status: ${payload.decisionStatus ?? ""}`);
    console.log(`Rows: ${payload.rowCount ?? 0}`);
    console.log(`Acceptance checks: ${payload.passingAcceptanceChecks ?? 0}/${payload.acceptanceChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 Wave01 package-resync owner acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
