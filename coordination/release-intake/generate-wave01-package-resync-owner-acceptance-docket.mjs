#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS,
  buildWave01PackageResyncOwnerReviewCapsule,
  stableWave01PackageResyncOwnerReviewCapsuleProjection
} from "./generate-wave01-package-resync-owner-review-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  wave01OwnerReviewCapsule: "coordination/release-intake/latest-A25-wave01-package-resync-owner-review-capsule.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-owner-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-acceptance-docket.md`
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function commandShape(row) {
  if (row.selectedAction === "owner-approved-package-restore") {
    return row.path === "tsconfig.json" && row.exactCommand === "git restore --source=HEAD -- tsconfig.json";
  }
  if (row.selectedAction === "owner-approved-package-untracked-clean") {
    return row.path?.startsWith("coordination/release-intake/2026-06-30-A25-dirty-tree-map-")
      && /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.exactCommand);
  }
  return false;
}

function acceptanceChecks(capsule, rows, sourceCurrentnessFailures) {
  const expectedWorktree = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";
  const noCurrentPackageResyncRows = rows.length === 0 && count(capsule.summary?.rowCount) === 0;
  const checks = [
    {
      id: "source-currentness-green",
      label: "Wave01 owner-review capsule is current against its sources",
      passed: sourceCurrentnessFailures.length === 0 && count(capsule.summary?.sourceCurrentnessFailures) === 0,
      evidence: `sourceCurrentnessFailures=${sourceCurrentnessFailures.length}`
    },
    {
      id: "capsule-ready-for-owner-decision",
      label: "Capsule has passed its owner-review acceptance checks",
      passed: count(capsule.summary?.failedAcceptanceChecks) === 0
        && (capsule.summary?.readyForOwnerDecision === true || noCurrentPackageResyncRows)
        && count(capsule.summary?.passingAcceptanceChecks) === count(capsule.summary?.acceptanceChecks),
      evidence: `ready=${capsule.summary?.readyForOwnerDecision} checks=${count(capsule.summary?.passingAcceptanceChecks)}/${count(capsule.summary?.acceptanceChecks)}`
    },
    {
      id: "seven-resync-rows",
      label: "Wave01 package-resync rows reflect the current remaining scope",
      passed: rows.length === count(capsule.summary?.rowCount),
      evidence: `rows=${rows.length} capsuleRows=${count(capsule.summary?.rowCount)}`
    },
    {
      id: "authorization-input-safe-state",
      label: "All current rows are accounted for by the owner authorization input without becoming executable",
      passed: (noCurrentPackageResyncRows || rows.every((row) => row.authorized === true || row.approvalStatus === "pending"))
        && rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false),
      evidence: `pending=${rows.filter((row) => !row.authorized).length} authorized=${rows.filter((row) => row.authorized).length}`
    },
    {
      id: "package-only-worktree-scope",
      label: "Every row is package-worktree-only",
      passed: noCurrentPackageResyncRows || rows.every((row) => row.packageOnly === true && row.worktreePath === expectedWorktree),
      evidence: `packageOnly=${rows.filter((row) => row.packageOnly).length}/${rows.length}`
    },
    {
      id: "non-executable-boundary",
      label: "No row is cleanup-authorized or executable",
      passed: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false),
      evidence: `cleanup=${rows.filter((row) => row.cleanupAuthorized).length} executable=${rows.filter((row) => row.executableNow).length}`
    },
    {
      id: "root-worktree-evidence-shape",
      label: "Evidence shape matches current restore and clean rows",
      passed: noCurrentPackageResyncRows
        ? rows.filter((row) => row.rootPathExists).length === 0 &&
          rows.filter((row) => !row.rootPathExists).length === 0 &&
          rows.filter((row) => row.worktreePathExists).length === 0
        : rows.filter((row) => row.rootPathExists).length === 1
        && rows.filter((row) => !row.rootPathExists).length === rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length
        && rows.every((row) => row.worktreePathExists === true),
      evidence: `rootPresent=${rows.filter((row) => row.rootPathExists).length} rootMissing=${rows.filter((row) => !row.rootPathExists).length} worktreePresent=${rows.filter((row) => row.worktreePathExists).length}`
    },
    {
      id: "command-shapes-allowlisted",
      label: "Commands are limited to the held tsconfig restore and A25 dirty-map artifact cleans",
      passed: noCurrentPackageResyncRows
        ? rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length === 0 &&
          rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length === 0
        : rows.every(commandShape) &&
          rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length === 1 &&
          rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length <= 6,
      evidence: `restore=${rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length} clean=${rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length}`
    },
    {
      id: "copyable-authorization-texts-present",
      label: "Each row has copyable exact authorization text",
      passed: rows.every((row) => row.authorizationTextToPaste?.includes(`approvalId=${row.approvalId}`)
        && row.authorizationTextToPaste?.includes(`command=${row.exactCommand}`)
        && row.authorizationTextToPaste?.includes("approvedBy=<owner>")
        && row.authorizationTextToPaste?.includes("approvedAt=<ISO-8601>")),
      evidence: `texts=${rows.filter((row) => row.authorizationTextToPaste).length}/${rows.length}`
    },
    {
      id: "review-inputs-complete",
      label: "All named review inputs exist",
      passed: (capsule.reviewInputs ?? []).length >= 9 && (capsule.reviewInputs ?? []).every((row) => row.exists === true),
      evidence: `present=${(capsule.reviewInputs ?? []).filter((row) => row.exists).length}/${(capsule.reviewInputs ?? []).length}`
    },
    {
      id: "pre-post-checks-present",
      label: "Every row names pre-execution and post-execution checks",
      passed: rows.every((row) => (row.preExecutionChecks ?? []).length >= 4 && (row.postExecutionChecks ?? []).length >= 8),
      evidence: `rowsWithChecks=${rows.filter((row) => (row.preExecutionChecks ?? []).length >= 4 && (row.postExecutionChecks ?? []).length >= 8).length}/${rows.length}`
    },
    {
      id: "governance-readiness-still-blocked",
      label: "Wave01 governance remains blocked and cannot auto-merge",
      passed: capsule.reviewRound?.commitReady === false && (capsule.reviewRound?.blockingReasons ?? []).length > 0,
      evidence: `commitReady=${capsule.reviewRound?.commitReady} blockers=${(capsule.reviewRound?.blockingReasons ?? []).length}`
    },
    {
      id: "validation-hold-active",
      label: "Validation hold requires owner compose/deletion confirmation before execution",
      passed: capsule.validationHold?.status === "waiting-for-owner-compose-deletion-confirmation"
        && typeof capsule.validationHold?.reason === "string"
        && capsule.validationHold.reason.length > 0,
      evidence: `status=${capsule.validationHold?.status ?? ""}`
    }
  ];

  return checks.map((check) => ({
    ...check,
    status: check.passed ? "pass" : "fail"
  }));
}

function decisionOptions(rows) {
  return rows.map((row) => ({
    approvalId: row.approvalId,
    owner: row.owner,
    selectedAction: row.selectedAction,
    path: row.path,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    worktreePath: row.worktreePath,
    rootPathExists: row.rootPathExists,
    worktreePathExists: row.worktreePathExists,
    packageOnly: row.packageOnly,
    separateExecutionInstructionRequired: true
  }));
}

function worktreeEvidenceDigest(rows) {
  return rows.map((row) => ({
    approvalId: row.approvalId,
    path: row.path,
    selectedAction: row.selectedAction,
    rootPathExists: row.rootPathExists,
    worktreePathExists: row.worktreePathExists,
    rootBytes: row.rootEvidence?.bytes ?? 0,
    worktreeBytes: row.worktreeEvidence?.bytes ?? 0,
    rootSha256: row.rootEvidence?.sha256 ?? "",
    worktreeSha256: row.worktreeEvidence?.sha256 ?? "",
    worktreeHasTrackedDiff: row.worktreeDiffEvidence?.hasTrackedDiff === true,
    worktreeDiffBytes: row.worktreeDiffEvidence?.diffBytes ?? 0
  }));
}

export function buildWave01PackageResyncOwnerAcceptanceDocket() {
  const dirtyMap = readJson(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const recordedCapsule = readJson(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.wave01OwnerReviewCapsule);
  const currentCapsule = buildWave01PackageResyncOwnerReviewCapsule();
  const sourceCurrentnessFailures = [];

  if (!sameJson(
    stableWave01PackageResyncOwnerReviewCapsuleProjection(recordedCapsule),
    stableWave01PackageResyncOwnerReviewCapsuleProjection(currentCapsule)
  )) {
    sourceCurrentnessFailures.push("Wave01 package-resync owner-review capsule is stale");
  }
  if (recordedCapsule.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    sourceCurrentnessFailures.push("Wave01 package-resync owner-review capsule dirty-map signature is stale");
  }
  if (recordedCapsule.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) {
    sourceCurrentnessFailures.push("Wave01 package-resync owner-review capsule expanded entry count is stale");
  }
  if ((recordedCapsule.sourceCurrentnessFailures ?? []).length > 0) {
    sourceCurrentnessFailures.push("Wave01 package-resync owner-review capsule has source currentness failures");
  }

  const rows = recordedCapsule.approvalRows ?? [];
  const checks = acceptanceChecks(recordedCapsule, rows, sourceCurrentnessFailures);
  const failedChecks = checks.filter((row) => !row.passed);
  const ownerDecisionRequired = rows.length > 0;
  const readyForOwnerDecision = ownerDecisionRequired && failedChecks.length === 0 && sourceCurrentnessFailures.length === 0;
  const decisionStatus = ownerDecisionRequired
    ? readyForOwnerDecision
      ? "ready-for-owner-decision"
      : "not-ready-for-owner-decision"
    : "no-current-package-resync-owner-decision-required";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      wave01OwnerReviewCapsuleGeneratedAt: recordedCapsule.generatedAt,
      wave01OwnerReviewCapsulePath: WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson
    },
    sourceCurrentnessFailures,
    reviewRound: recordedCapsule.reviewRound,
    reviewInputs: recordedCapsule.reviewInputs,
    worktreeEvidenceDigest: worktreeEvidenceDigest(rows),
    acceptanceChecks: checks,
    ownerDecisionDocket: {
      status: decisionStatus,
      ownerDecisionRequired,
      decisionSummary: ownerDecisionRequired
        ? "The current Wave01 package-worktree resync rows are ready for human decision, but they remain non-executable and do not authorize root cleanup or deployment."
        : "No Wave01 package-worktree resync owner decision is currently required because the current owner-review capsule has 0 approval rows.",
      targetAuthorizationFile: WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.ownerAuthorizations,
      requiredApprovalIds: rows.map((row) => row.approvalId),
      decisionOptions: decisionOptions(rows),
      copyableAuthorizationTexts: recordedCapsule.copyableAuthorizationTexts ?? [],
      postDecisionValidationCommands: recordedCapsule.validationCommands ?? [],
      validationHold: recordedCapsule.validationHold
    },
    summary: {
      readyForOwnerDecision,
      rowCount: rows.length,
      pendingRows: rows.filter((row) => !row.authorized).length,
      authorizedRows: rows.filter((row) => row.authorized).length,
      packageOnlyRows: rows.filter((row) => row.packageOnly).length,
      rootPresentRows: rows.filter((row) => row.rootPathExists).length,
      rootMissingRows: rows.filter((row) => !row.rootPathExists).length,
      worktreePresentRows: rows.filter((row) => row.worktreePathExists).length,
      restoreRows: rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length,
      cleanRows: rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length,
      trackedDiffRows: rows.filter((row) => row.worktreeDiffEvidence?.hasTrackedDiff === true).length,
      untrackedCleanRows: rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean" && row.worktreeDiffEvidence?.hasTrackedDiff !== true).length,
      copyableAuthorizationTexts: (recordedCapsule.copyableAuthorizationTexts ?? []).length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.filter((row) => row.passed).length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
      executableRows: rows.filter((row) => row.executableNow).length
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableWave01PackageResyncOwnerAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    reviewRound: payload.reviewRound,
    reviewInputs: payload.reviewInputs,
    worktreeEvidenceDigest: payload.worktreeEvidenceDigest,
    acceptanceChecks: payload.acceptanceChecks,
    ownerDecisionDocket: payload.ownerDecisionDocket,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- \`${item}\``).join("\n") : "- none";
}

function markdown(payload) {
  const inputRows = payload.reviewInputs.map((row) => (
    `| ${cell(row.id)} | \`${cell(row.path)}\` | ${row.exists ? "yes" : "no"} | ${cell(row.description)} |`
  )).join("\n");
  const evidenceRows = payload.worktreeEvidenceDigest.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | ${cell(row.selectedAction)} | ${row.rootPathExists ? "yes" : "no"} | ${row.worktreePathExists ? "yes" : "no"} | ${row.worktreeBytes} | ${row.worktreeHasTrackedDiff ? "yes" : "no"} |`
  )).join("\n");
  const checkRows = payload.acceptanceChecks.map((row, index) => (
    `| ${index + 1} | \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell(row.evidence)} |`
  )).join("\n");
  const decisionRows = payload.ownerDecisionDocket.decisionOptions.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | \`${cell(row.path)}\` | ${cell(row.selectedAction)} | \`${cell(row.exactCommand)}\` | yes |`
  )).join("\n");
  const authorizationRows = payload.ownerDecisionDocket.copyableAuthorizationTexts.map((row) => `### ${row.order}. \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");
  const validationCommands = payload.ownerDecisionDocket.postDecisionValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Wave01 Package Resync Owner Acceptance Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is evidence-only. It summarizes the current Wave01 package-worktree resync rows for a human decision, but it does not create the authorization file, record owner approval, authorize merge, authorize cleanup, execute restore, execute clean, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Review round: \`${payload.reviewRound.id}\`
- Status: ${payload.ownerDecisionDocket.status}
- Ready for owner decision: ${payload.summary.readyForOwnerDecision ? "yes" : "no"}
- Rows: ${payload.summary.rowCount}
- Pending rows: ${payload.summary.pendingRows}
- Authorized rows: ${payload.summary.authorizedRows}
- Package-only rows: ${payload.summary.packageOnlyRows}
- Root-present rows: ${payload.summary.rootPresentRows}
- Root-missing rows: ${payload.summary.rootMissingRows}
- Worktree-present rows: ${payload.summary.worktreePresentRows}
- Restore rows: ${payload.summary.restoreRows}
- Clean rows: ${payload.summary.cleanRows}
- Tracked-diff rows: ${payload.summary.trackedDiffRows}
- Untracked-clean rows: ${payload.summary.untrackedCleanRows}
- Copyable authorization texts: ${payload.summary.copyableAuthorizationTexts}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Review Inputs

| ID | Path | Exists | Description |
| --- | --- | --- | --- |
${inputRows}

## Worktree Evidence Digest

| # | Approval ID | Path | Action | Root exists | Worktree exists | Worktree bytes | Tracked diff |
| ---: | --- | --- | --- | --- | --- | ---: | --- |
${evidenceRows}

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
${checkRows}

## Owner Decision Docket

Decision summary: ${payload.ownerDecisionDocket.decisionSummary}

Target authorization file: \`${payload.ownerDecisionDocket.targetAuthorizationFile}\`

Required approval IDs:

${bullet(payload.ownerDecisionDocket.requiredApprovalIds)}

| Approval ID | Owner | Path | Action | Exact command | Separate execution instruction required |
| --- | --- | --- | --- | --- | --- |
${decisionRows}

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner records approval in the Wave01 owner-authorization input and the validators accept it. They still do not run commands by themselves.

${authorizationRows}

## Post-Decision Validation Commands

${validationCommands}

## Validation Hold

- Status: ${payload.ownerDecisionDocket.validationHold?.status ?? "unknown"}
- Active worktree: \`${payload.ownerDecisionDocket.validationHold?.activeWorktreePath ?? ""}\`
- Reason: ${payload.ownerDecisionDocket.validationHold?.reason ?? ""}
- Resume condition: ${payload.ownerDecisionDocket.validationHold?.resumeCondition ?? ""}

## Boundary

Every row remains non-executable. This acceptance docket does not create the authorization file. A separate owner instruction naming exact approval IDs and exact commands is still required before any restore, clean, merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildWave01PackageResyncOwnerAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson,
    latestMarkdown: WAVE01_PACKAGE_RESYNC_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown,
    status: payload.ownerDecisionDocket.status,
    rowCount: payload.summary.rowCount,
    pendingRows: payload.summary.pendingRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
