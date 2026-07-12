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

export const WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerReviewCapsule: WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson,
  ownerReviewCapsuleGate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-review-capsule-current-gate.json",
  ownerAuthorizations: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-a25-artifact-clean-owner-approval-capsule.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-a25-artifact-clean-owner-approval-capsule.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-a25-artifact-clean-owner-approval-capsule.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-a25-artifact-clean-owner-approval-capsule.md`
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

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function commandAllowed(row) {
  return row.path?.startsWith("coordination/release-intake/2026-06-30-A25-dirty-tree-map-")
    && /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.exactCommand ?? "");
}

function buildAcceptanceChecks({ sourceCurrentnessFailures, cleanRows, heldRows, ownerReviewCapsule }) {
  const textRows = cleanRows.filter((row) => row.authorizationTextToPaste);
  const totalCleanFileBytes = cleanRows.reduce((sum, row) => sum + (row.bytes ?? 0), 0);
  const noCurrentArtifactCleanScope = cleanRows.length === 0 && heldRows.length === 0 && (ownerReviewCapsule.summary?.rowCount ?? -1) === 0;
  const checks = [
    {
      id: "source-currentness-green",
      label: "Source Wave01 owner-review capsule and gate are current",
      passed: sourceCurrentnessFailures.length === 0,
      evidence: `sourceCurrentnessFailures=${sourceCurrentnessFailures.length}`
    },
    {
      id: "review-capsule-ready",
      label: "The source Wave01 owner-review capsule is ready for owner decision",
      passed: (ownerReviewCapsule.summary?.failedAcceptanceChecks ?? -1) === 0 &&
        (ownerReviewCapsule.summary?.readyForOwnerDecision === true || noCurrentArtifactCleanScope),
      evidence: `ready=${ownerReviewCapsule.summary?.readyForOwnerDecision} failedChecks=${ownerReviewCapsule.summary?.failedAcceptanceChecks}`
    },
    {
      id: "six-a25-clean-rows",
      label: "A25 artifact clean rows reflect the current remaining scope",
      passed: cleanRows.length <= 6,
      evidence: `cleanRows=${cleanRows.length}`
    },
    {
      id: "single-held-tsconfig-row",
      label: "Exactly one tsconfig restore row is held for A10/A22 review",
      passed: noCurrentArtifactCleanScope || (heldRows.length === 1 && heldRows[0]?.approvalId === "wave01-resync-01-tsconfig-json"),
      evidence: `heldRows=${heldRows.length} held=${heldRows[0]?.approvalId ?? "none"}`
    },
    {
      id: "tsconfig-not-in-clean-scope",
      label: "The clean approval scope excludes tsconfig.json",
      passed: cleanRows.every((row) => row.approvalId !== "wave01-resync-01-tsconfig-json" && row.path !== "tsconfig.json"),
      evidence: `tsconfigCleanRows=${cleanRows.filter((row) => row.path === "tsconfig.json").length}`
    },
    {
      id: "clean-commands-allowlisted",
      label: "Every clean row is limited to a Wave01 A25 dirty-map artifact git clean command",
      passed: cleanRows.length === 0 || cleanRows.every(commandAllowed),
      evidence: `allowed=${cleanRows.filter(commandAllowed).length}/${cleanRows.length}`
    },
    {
      id: "clean-file-impact-positive",
      label: "The clean rows have concrete file-size impact evidence",
      passed: cleanRows.length === 0
        ? totalCleanFileBytes === 0
        : totalCleanFileBytes > 0 && cleanRows.every((row) => (row.bytes ?? 0) > 0),
      evidence: `totalCleanFileBytes=${totalCleanFileBytes}`
    },
    {
      id: "copyable-clean-authorization-texts",
      label: "Each clean row has copyable owner authorization text",
      passed: textRows.length === cleanRows.length && textRows.every((row) => row.authorizationTextToPaste.includes(`approvalId=${row.approvalId}`) && row.authorizationTextToPaste.includes(`command=${row.exactCommand}`)),
      evidence: `texts=${textRows.length}/${cleanRows.length}`
    },
    {
      id: "authorization-input-clean-approval-recorded",
      label: "Wave01 owner authorization input matches current clean/hold state",
      passed: (ownerReviewCapsule.summary?.authorizedRows ?? -1) === cleanRows.length
        && (ownerReviewCapsule.summary?.pendingRows ?? -1) === heldRows.length
        && (ownerReviewCapsule.summary?.executableRows ?? -1) === 0
        && (ownerReviewCapsule.summary?.cleanupAuthorizedRows ?? -1) === 0,
      evidence: `authorized=${ownerReviewCapsule.summary?.authorizedRows} pending=${ownerReviewCapsule.summary?.pendingRows} executable=${ownerReviewCapsule.summary?.executableRows}`
    },
    {
      id: "non-executable-clean-approval-capsule",
      label: "The capsule is evidence-only and non-executable",
      passed: cleanRows.every((row) => row.cleanupAuthorized !== true && row.executableNow !== true),
      evidence: `cleanup=${cleanRows.filter((row) => row.cleanupAuthorized === true).length} executable=${cleanRows.filter((row) => row.executableNow === true).length}`
    }
  ];

  return checks.map((check) => ({
    ...check,
    status: check.passed ? "pass" : "fail"
  }));
}

function sourceCurrentnessFailures({ dirtyMap, ownerReviewCapsule, ownerReviewCapsuleGate, currentReviewCapsule }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  if (ownerReviewCapsule.dirtyMapStatusSignature !== expectedSignature) failures.push("owner-review capsule dirty-map signature is stale");
  if (ownerReviewCapsule.expandedStatusEntries !== expectedEntries) failures.push("owner-review capsule expanded dirty entry count is stale");
  if (ownerReviewCapsuleGate.dirtyMapStatusSignature !== expectedSignature) failures.push("owner-review capsule gate dirty-map signature is stale");
  if (ownerReviewCapsuleGate.expandedStatusEntries !== expectedEntries) failures.push("owner-review capsule gate expanded dirty entry count is stale");
  if ((ownerReviewCapsuleGate.failures ?? []).length > 0) failures.push(`owner-review capsule gate has ${ownerReviewCapsuleGate.failures.length} failures`);
  if (!sameJson(
    stableWave01PackageResyncOwnerReviewCapsuleProjection(ownerReviewCapsule),
    stableWave01PackageResyncOwnerReviewCapsuleProjection(currentReviewCapsule)
  )) {
    failures.push("owner-review capsule stable projection is stale");
  }
  return failures;
}

export function buildWave01A25ArtifactCleanOwnerApprovalCapsule() {
  const dirtyMap = readJson(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.dirtyMap);
  const ownerReviewCapsule = readJson(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.ownerReviewCapsule);
  const ownerReviewCapsuleGate = readJson(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.ownerReviewCapsuleGate);
  const ownerAuthorizations = readJson(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.ownerAuthorizations);
  const currentReviewCapsule = buildWave01PackageResyncOwnerReviewCapsule();
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    ownerReviewCapsule,
    ownerReviewCapsuleGate,
    currentReviewCapsule
  });

  const recommendation = ownerReviewCapsule.partialApprovalRecommendation ?? {};
  const cleanRows = (recommendation.cleanReadyRows ?? []).map((row, index) => ({
    order: index + 1,
    approvalId: row.approvalId,
    owner: row.owner,
    path: row.path,
    exactCommand: row.exactCommand,
    bytes: row.bytes,
    recommendation: row.recommendation,
    authorizationTextToPaste: row.authorizationTextToPaste,
    cleanupAuthorized: false,
    executableNow: false
  }));
  const heldRows = (recommendation.heldRows ?? []).map((row) => ({
    approvalId: row.approvalId,
    owner: row.owner,
    path: row.path,
    exactCommand: row.exactCommand,
    diffStat: row.diffStat,
    recommendation: row.recommendation,
    reason: row.reason
  }));
  const acceptanceChecks = buildAcceptanceChecks({
    sourceCurrentnessFailures: sourceFailures,
    cleanRows,
    heldRows,
    ownerReviewCapsule
  });
  const failedAcceptanceChecks = acceptanceChecks.filter((row) => !row.passed);
  const totalCleanFileBytes = cleanRows.reduce((sum, row) => sum + (row.bytes ?? 0), 0);
  const copyableCleanAuthorizationTexts = cleanRows.map((row) => ({
    order: row.order,
    approvalId: row.approvalId,
    path: row.path,
    exactCommand: row.exactCommand,
    text: row.authorizationTextToPaste
  }));
  const cleanScopeOpen = cleanRows.length > 0;
  const noCurrentArtifactCleanScope = cleanRows.length === 0 && heldRows.length === 0 && (ownerReviewCapsule.summary?.rowCount ?? -1) === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      ownerReviewCapsuleGeneratedAt: ownerReviewCapsule.generatedAt,
      ownerReviewCapsuleGateCheckedAt: ownerReviewCapsuleGate.checkedAt,
      ownerAuthorizationsGeneratedAt: ownerAuthorizations.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    approvalScope: {
      id: "wave01-a25-artifact-clean-only",
      owner: "A25 git hygiene and release intake",
      worktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance",
      targetAuthorizationFile: WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.ownerAuthorizations,
      strategy: noCurrentArtifactCleanScope
        ? "no-a25-artifact-clean-rows-currently-required"
        : cleanScopeOpen
        ? "approve-a25-artifact-clean-rows-hold-tsconfig"
        : "post-clean-verified-hold-tsconfig",
      cleanApprovalIds: cleanRows.map((row) => row.approvalId),
      heldApprovalIds: heldRows.map((row) => row.approvalId),
      ownerDecisionText: noCurrentArtifactCleanScope
        ? "No Wave01 A25 artifact-clean owner decision is currently required because the source owner-review capsule has 0 approval rows."
        : cleanScopeOpen
        ? "Approve only the remaining Wave01 A25 dirty-map artifact clean rows; keep wave01-resync-01-tsconfig-json held for A10/A22 release-hygiene review."
        : "Wave01 A25 dirty-map artifact clean rows are post-clean verified; keep wave01-resync-01-tsconfig-json held for A10/A22 release-hygiene review."
    },
    cleanApprovalRows: cleanRows,
    heldRows,
    acceptanceChecks,
    copyableCleanAuthorizationTexts,
    summary: {
      readyForOwnerDecision: !noCurrentArtifactCleanScope && sourceFailures.length === 0 && failedAcceptanceChecks.length === 0,
      cleanApprovalRows: cleanRows.length,
      heldRows: heldRows.length,
      totalCleanFileBytes,
      copyableCleanAuthorizationTexts: copyableCleanAuthorizationTexts.length,
      acceptanceChecks: acceptanceChecks.length,
      passingAcceptanceChecks: acceptanceChecks.filter((row) => row.passed).length,
      failedAcceptanceChecks: failedAcceptanceChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      recordsOwnerApproval: false,
      createsAuthorizationFile: false,
      cleanAuthorized: false,
      restoreAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      heldTsconfigRestore: heldRows.some((row) => row.approvalId === "wave01-resync-01-tsconfig-json")
    }
  };
}

export function stableWave01A25ArtifactCleanOwnerApprovalCapsuleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: {
      ownerReviewCapsuleGeneratedAt: payload.sourceArtifacts?.ownerReviewCapsuleGeneratedAt,
      ownerAuthorizationsGeneratedAt: payload.sourceArtifacts?.ownerAuthorizationsGeneratedAt
    },
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    approvalScope: payload.approvalScope,
    cleanApprovalRows: payload.cleanApprovalRows,
    heldRows: payload.heldRows,
    acceptanceChecks: payload.acceptanceChecks,
    copyableCleanAuthorizationTexts: payload.copyableCleanAuthorizationTexts,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const cleanRows = payload.cleanApprovalRows.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | ${row.bytes} | \`${cell(row.exactCommand)}\` |`
  )).join("\n");
  const heldRows = payload.heldRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | \`${cell(row.exactCommand)}\` | ${cell(row.reason)} |`
  )).join("\n");
  const checks = payload.acceptanceChecks.map((row, index) => (
    `| ${index + 1} | \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell(row.evidence)} |`
  )).join("\n");
  const authTexts = payload.copyableCleanAuthorizationTexts.map((row) => `### ${row.order}. \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");

  return `# A25 Wave01 A25 Artifact Clean Owner Approval Capsule

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is evidence-only. It isolates any current Wave01 A25 dirty-map artifact clean rows for owner review. When no rows remain, it records that no Wave01 A25 artifact-clean owner decision is currently required. It does not authorize git clean, git restore, cleanup, stage, commit, merge, reset, push, deploy, worktree removal, branch deletion, or file deletion.

## Summary

- Ready for owner decision: ${payload.summary.readyForOwnerDecision ? "yes" : "no"}
- Clean approval rows: ${payload.summary.cleanApprovalRows}
- Held rows: ${payload.summary.heldRows}
- Total clean file bytes: ${payload.summary.totalCleanFileBytes}
- Copyable clean authorization texts: ${payload.summary.copyableCleanAuthorizationTexts}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Approval Scope

- Scope ID: \`${payload.approvalScope.id}\`
- Owner: ${payload.approvalScope.owner}
- Worktree: \`${payload.approvalScope.worktreePath}\`
- Target authorization input, if owner later approves: \`${payload.approvalScope.targetAuthorizationFile}\`
- Strategy: \`${payload.approvalScope.strategy}\`
- Owner decision text: ${payload.approvalScope.ownerDecisionText}

## Clean Approval Rows

| # | Approval ID | Path | Bytes | Exact command |
| --- | --- | --- | ---: | --- |
${cleanRows}

## Held Rows

| Approval ID | Path | Exact command | Hold reason |
| --- | --- | --- | --- |
${heldRows}

## Acceptance Checks

| # | Check | Status | Label | Evidence |
| --- | --- | --- | --- | --- |
${checks}

## Copyable Clean Authorization Texts

These texts are review-ready only. They become active only if the owner copies the selected rows into \`${payload.approvalScope.targetAuthorizationFile}\` with approval metadata and the validators accept them.

${authTexts}
`;
}

function main() {
  const payload = buildWave01A25ArtifactCleanOwnerApprovalCapsule();
  write(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestMarkdown, markdown(payload));
  write(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    output: WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestJson,
    cleanApprovalRows: payload.summary.cleanApprovalRows,
    heldRows: payload.summary.heldRows,
    totalCleanFileBytes: payload.summary.totalCleanFileBytes,
    readyForOwnerDecision: payload.summary.readyForOwnerDecision,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
