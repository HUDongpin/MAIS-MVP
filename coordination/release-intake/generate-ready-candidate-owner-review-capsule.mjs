#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OWNER_ACTIVE_WORKTREE_HOLD,
  SAFE_POST_INPUT_VALIDATION_COMMANDS,
  DEFERRED_AGGREGATE_VALIDATION_COMMANDS
} from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationGapShrinkMap: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.json",
  nextOwnerDecisionFocus: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  nextOwnerAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  latestJson: "coordination/release-intake/latest-A25-ready-candidate-owner-review-capsule.json",
  latestMarkdown: "coordination/release-intake/latest-A25-ready-candidate-owner-review-capsule.md",
  datedJson: `coordination/release-intake/${date}-A25-ready-candidate-owner-review-capsule.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-ready-candidate-owner-review-capsule.md`
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

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  if (Array.isArray(artifact.failures) && artifact.failures.length > 0) failures.push(`${label} has ${artifact.failures.length} failures`);
  return failures;
}

function readyRound(shrinkMap) {
  return (shrinkMap.rounds ?? []).find((row) => row.id === "ready-candidate-owner-review") ?? null;
}

function readyCandidate(focus, round) {
  const direct = focus.readyOwnerPackageMergeCandidates?.find((candidate) => candidate.candidateId === round?.candidateId);
  if (direct) return direct;
  return focus.readyOwnerPackageMergeCandidates?.[0] ?? null;
}

function compactApprovalRows(round) {
  return (round?.rows ?? []).map((row, index) => ({
    order: index + 1,
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    approvalFingerprint: row.approvalFingerprint,
    evidenceReviewed: row.evidenceReviewed ?? [],
    authorizationText: row.authorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    authorized: row.authorized === true,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function reviewInputRows(candidate) {
  return (candidate?.decisionChecklist?.requiredReviewInputs ?? []).map((row) => ({
    id: row.id,
    path: row.path,
    exists: row.exists === true,
    description: row.description
  }));
}

function reviewEvidenceRows(candidate) {
  const reviewEvidence = candidate?.reviewEvidence ?? {};
  return [
    ["linkedWorktreeManifest", reviewEvidence.linkedWorktreeManifest],
    ["dirtyDivergedManifest", reviewEvidence.dirtyDivergedManifest],
    ["status", reviewEvidence.status],
    ["diffstat", reviewEvidence.diffstat],
    ["patch", reviewEvidence.patch],
    ["untracked", reviewEvidence.untracked],
    ["dirtyDivergedAheadLog", reviewEvidence.dirtyDivergedAheadLog],
    ["dirtyDivergedDiffstat", reviewEvidence.dirtyDivergedDiffstat],
    ["dirtyDivergedPatch", reviewEvidence.dirtyDivergedPatch]
  ].filter(([, row]) => row).map(([id, row]) => ({
    id,
    path: row.path,
    exists: row.exists === true,
    lineCount: count(row.lineCount),
    sampleLines: row.sampleLines ?? []
  }));
}

function authorizationRecordingTargets(actionPacket) {
  const targetInputFiles = actionPacket.targetInputFiles ?? actionPacket.criticalPath?.targetInputFiles ?? [];
  return {
    canonicalAuthorizationFile: targetInputFiles
      .find((item) => item.endsWith("latest-A25-next-owner-authorizations.json")) ?? "",
    allTargetInputFiles: targetInputFiles
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function requiredAuthorizationTextFor(candidate, approvalId) {
  return (candidate?.requiredAuthorizationTexts ?? [])
    .find((text) => text.includes(`approvalId=${approvalId}`)) ?? "";
}

function copyableAuthorizationTexts(candidate, approvalRows) {
  return approvalRows.map((row, index) => ({
    order: index + 1,
    approvalId: row.approvalId,
    text: row.authorizationText || requiredAuthorizationTextFor(candidate, row.approvalId)
  }));
}

export function buildReadyCandidateOwnerReviewCapsule() {
  const dirtyMap = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.dirtyMap);
  const shrinkMap = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.authorizationGapShrinkMap);
  const focus = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.nextOwnerDecisionFocus);
  const authorizationsGate = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.nextOwnerAuthorizationsGate);
  const actionPacket = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.ownerInputActionPacket);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("authorization gap shrink map", shrinkMap, dirtyMap),
    ...ensureCurrent("next owner decision focus packet", focus, dirtyMap),
    ...ensureCurrent("next owner authorizations gate", authorizationsGate, dirtyMap),
    ...ensureCurrent("owner input action packet", actionPacket, dirtyMap)
  ];

  const round = readyRound(shrinkMap);
  const candidate = readyCandidate(focus, round);
  const approvalRows = compactApprovalRows(round);
  const reviewInputs = reviewInputRows(candidate);
  const reviewEvidence = reviewEvidenceRows(candidate);
  const missingReviewInputs = reviewInputs.filter((row) => !row.exists);
  const missingReviewEvidence = reviewEvidence.filter((row) => !row.exists);
  const authorizationTexts = copyableAuthorizationTexts(candidate, approvalRows);
  const postApprovalValidationCommands = unique([
    ...(candidate?.postApprovalChecks ?? []),
    ...approvalRows.flatMap((row) => row.postApprovalChecks),
    ...SAFE_POST_INPUT_VALIDATION_COMMANDS
  ]);
  const cleanupAuthorizedRows = approvalRows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = approvalRows.filter((row) => row.executableNow).length;
  const authorizedRows = approvalRows.filter((row) => row.authorized).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      authorizationGapShrinkMapGeneratedAt: shrinkMap.generatedAt,
      nextOwnerDecisionFocusGeneratedAt: focus.generatedAt,
      nextOwnerAuthorizationsGateCheckedAt: authorizationsGate.checkedAt,
      ownerInputActionPacketGeneratedAt: actionPacket.generatedAt
    },
    sourceCurrentnessFailures,
    candidate: {
      candidateId: candidate?.candidateId ?? "",
      waveId: candidate?.waveId ?? "",
      packageId: candidate?.packageId ?? "",
      packageName: candidate?.packageName ?? "",
      owners: candidate?.owners ?? [],
      approvalIds: candidate?.approvalIds ?? [],
      physicalLifecycleApprovalIds: candidate?.physicalLifecycleApprovalIds ?? [],
      worktree: candidate?.worktree ?? null,
      statusEntries: count(candidate?.statusEntries),
      coveredEntries: count(candidate?.coveredEntries),
      uncoveredEntries: count(candidate?.uncoveredEntries),
      failedChecks: count(candidate?.failedChecks),
      typeCheckErrorLines: count(candidate?.typeCheckErrorLines),
      pathspecFiles: candidate?.pathspecFiles ?? [],
      pathspecChecksum: candidate?.pathspecChecksum ?? "",
      recommendedOwnerAction: candidate?.recommendedOwnerAction ?? "",
      readyForOwnerReview: candidate?.decisionChecklist?.readyForOwnerReview === true
    },
	    authorizationRound: {
	      id: round?.id ?? "",
      order: round?.order ?? null,
      label: round?.label ?? "",
      ownerAction: round?.ownerAction ?? "",
      why: round?.why ?? "",
      candidateId: round?.candidateId ?? "",
      packageId: round?.packageId ?? "",
      rowCount: count(round?.rowCount),
	      pendingRows: count(round?.pendingRows),
	      authorizedRows,
	      approvalIds: round?.approvalIds ?? [],
	      consumedApprovalIds: round?.consumedApprovalIds ?? [],
	      postExtractionState: round?.postExtractionState ?? null,
	      cleanupAuthorizedRows,
	      executableRows
	    },
    approvalRows,
    reviewChecklist: {
      purpose: candidate?.decisionChecklist?.purpose ?? "",
      requiredReviewInputs: reviewInputs,
      missingReviewInputs,
      reviewEvidence,
      missingReviewEvidence,
      reviewQuestions: candidate?.decisionChecklist?.reviewQuestions ?? [],
      allowedFinalStateDecisions: candidate?.decisionChecklist?.allowedFinalStateDecisions ?? [],
      postApprovalValidationCommands: candidate?.decisionChecklist?.postApprovalValidationCommands ?? [],
      mustRemainFalseUntilSeparateAuthorization: candidate?.decisionChecklist?.mustRemainFalseUntilSeparateAuthorization ?? {}
    },
    authorizationRecordingTargets: authorizationRecordingTargets(actionPacket),
    copyableAuthorizationTexts: authorizationTexts,
    postApprovalValidationCommands,
    validationHold: OWNER_ACTIVE_WORKTREE_HOLD,
    deferredAggregateValidationCommands: DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
    summary: {
      readyForOwnerReview: candidate?.decisionChecklist?.readyForOwnerReview === true,
	      approvalRows: approvalRows.length,
	      consumedApprovalRows: (round?.consumedApprovalIds ?? []).length,
	      pendingApprovalRows: approvalRows.length - authorizedRows,
      authorizedApprovalRows: authorizedRows,
      copyableAuthorizationTexts: authorizationTexts.length,
      requiredReviewInputs: reviewInputs.length,
      missingReviewInputs: missingReviewInputs.length,
      reviewEvidenceRows: reviewEvidence.length,
      missingReviewEvidenceRows: missingReviewEvidence.length,
      canonicalAuthorizationRowsInFile: count(authorizationsGate.authorizationRowsInFile),
      authorizedCanonicalRows: count(authorizationsGate.authorizedRows),
      pendingCanonicalAuthorizationRows: count(authorizationsGate.pendingRows),
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
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

export function stableReadyCandidateOwnerReviewCapsuleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    candidate: payload.candidate,
    authorizationRound: payload.authorizationRound,
    approvalRows: payload.approvalRows,
    reviewChecklist: payload.reviewChecklist,
    authorizationRecordingTargets: payload.authorizationRecordingTargets,
    copyableAuthorizationTexts: payload.copyableAuthorizationTexts,
    postApprovalValidationCommands: payload.postApprovalValidationCommands,
    validationHold: payload.validationHold,
    deferredAggregateValidationCommands: payload.deferredAggregateValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const inputRows = payload.reviewChecklist.requiredReviewInputs.map((row) => (
    `| ${cell(row.id)} | \`${cell(row.path)}\` | ${row.exists ? "yes" : "no"} | ${cell(row.description)} |`
  )).join("\n");
  const evidenceRows = payload.reviewChecklist.reviewEvidence.map((row) => (
    `| ${cell(row.id)} | \`${cell(row.path)}\` | ${row.exists ? "yes" : "no"} | ${row.lineCount} |`
  )).join("\n");
  const approvalRows = payload.approvalRows.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | ${cell(row.approvalKind)} | ${cell(row.owner)} | ${row.authorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n");
  const authTextRows = payload.copyableAuthorizationTexts.map((row) => `### Approval Row ${row.order}: \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");
  const commandRows = payload.postApprovalValidationCommands.map((command) => `- \`${command}\``).join("\n");
  const deferredRows = payload.deferredAggregateValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Ready Candidate Owner Review Capsule

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is evidence-only. It packages the first ready owner candidate for human review, but it does not create the authorization file, does not record owner approval, does not authorize merge, cleanup, execution, staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or cleanup apply.

## Summary

- Candidate: \`${payload.candidate.candidateId}\`
- Package: \`${payload.candidate.packageId}\`
- Ready for owner review: ${payload.summary.readyForOwnerReview ? "yes" : "no"}
- Approval rows: ${payload.summary.approvalRows}
- Consumed approval rows: ${payload.summary.consumedApprovalRows}
- Pending approval rows: ${payload.summary.pendingApprovalRows}
- Copyable authorization texts: ${payload.summary.copyableAuthorizationTexts}
- Required review inputs: ${payload.summary.requiredReviewInputs}
- Missing review inputs: ${payload.summary.missingReviewInputs}
- Review evidence rows: ${payload.summary.reviewEvidenceRows}
- Missing review evidence rows: ${payload.summary.missingReviewEvidenceRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Candidate

- Owner(s): ${payload.candidate.owners.join(", ")}
- Worktree: \`${payload.candidate.worktree?.path ?? ""}\`
- Branch: \`${payload.candidate.worktree?.branch ?? ""}\`
- Status entries: ${payload.candidate.statusEntries}
- Covered entries: ${payload.candidate.coveredEntries}
- Uncovered entries: ${payload.candidate.uncoveredEntries}
- Failed checks: ${payload.candidate.failedChecks}
- Type-check error lines: ${payload.candidate.typeCheckErrorLines}
- Pathspec files:
${bullet(payload.candidate.pathspecFiles.map((item) => `\`${item}\``))}

## Required Review Inputs

| ID | Path | Exists | Description |
| --- | --- | --- | --- |
${inputRows}

## Archived Review Evidence

| Evidence | Path | Exists | Lines |
| --- | --- | --- | ---: |
${evidenceRows}

## Approval Rows

| Order | Approval ID | Kind | Owner | Authorized | Executable |
| ---: | --- | --- | --- | --- | --- |
	${approvalRows}

	Consumed approval IDs:
	${bullet((payload.authorizationRound.consumedApprovalIds ?? []).map((id) => `\`${id}\``))}

	Post-extraction verified: ${payload.authorizationRound.postExtractionState?.verified ? "yes" : "no"}

	Post-extraction commit: \`${payload.authorizationRound.postExtractionState?.latestPackageCommit?.hash ?? ""}\`

## Copyable Authorization Texts

These texts are review templates only. They are not active approval until the owner fills the placeholders in the target file and the validators accept them.

Target authorization file: \`${payload.authorizationRecordingTargets.canonicalAuthorizationFile}\`

${authTextRows}

## Post-Approval Validation Commands

${commandRows}

## Deferred Aggregate Validation Commands

Status: ${payload.validationHold.status}

Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`

Reason: ${payload.validationHold.reason}

Resume condition: ${payload.validationHold.resumeCondition}

${deferredRows}

## Boundary

Every row remains non-executable. A separate owner instruction naming exact approval IDs and exact commands is still required before any merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildReadyCandidateOwnerReviewCapsule();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestJson, json);
  write(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.datedJson, json);
  write(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown, md);
  write(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestJson,
    latestMarkdown: READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown,
    candidateId: payload.candidate.candidateId,
    approvalRows: payload.summary.approvalRows,
    pendingApprovalRows: payload.summary.pendingApprovalRows,
    copyableAuthorizationTexts: payload.summary.copyableAuthorizationTexts,
    missingReviewInputs: payload.summary.missingReviewInputs,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
