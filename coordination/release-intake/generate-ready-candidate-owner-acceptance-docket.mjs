#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS,
  buildReadyCandidateOwnerReviewCapsule,
  stableReadyCandidateOwnerReviewCapsuleProjection
} from "./generate-ready-candidate-owner-review-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readyCandidateCapsule: "coordination/release-intake/latest-A25-ready-candidate-owner-review-capsule.json",
  latestJson: "coordination/release-intake/latest-A25-ready-candidate-owner-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-ready-candidate-owner-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-ready-candidate-owner-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-ready-candidate-owner-acceptance-docket.md`
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

function readTextIfExists(relativePath) {
  if (!relativePath) return "";
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return "";
  return fs.readFileSync(absolutePath, "utf8");
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

function nonEmptyLines(text) {
  return String(text ?? "").split(/\r?\n/).filter((line) => line.trim().length > 0);
}

function allLines(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n");
  if (normalized.length === 0) return [];
  return normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function evidenceFile(capsule, id) {
  return (capsule.reviewChecklist?.reviewEvidence ?? []).find((row) => row.id === id) ?? null;
}

function consumedNoActiveCandidate(capsule) {
  return (capsule.summary?.approvalRows ?? 0) === 0
    && (capsule.authorizationRound?.consumedApprovalIds ?? []).includes("a16-research-and-learning-science")
    && capsule.authorizationRound?.postExtractionState?.verified === true
    && capsule.authorizationRound?.postExtractionState?.lifecycleStatus === "post-extraction-verified"
    && (capsule.authorizationRound?.postExtractionState?.packageStatusRows ?? 1) === 0
    && (capsule.authorizationRound?.postExtractionState?.stagedPackageRows ?? 1) === 0
    && Boolean(capsule.authorizationRound?.postExtractionState?.latestPackageCommit?.hash);
}

function emptyEvidenceDigest() {
  return {
    statusRows: [],
    untrackedRows: [],
    fileInventory: [],
    trackedDiffstatText: "",
    trackedDiffPresent: false,
    trackedPatchNonEmptyLines: 0,
    aheadLogText: "",
    aheadCommitsPresent: false,
    dirtyDivergedDiffstatText: "",
    dirtyDivergedDiffPresent: false,
    dirtyDivergedPatchNonEmptyLines: 0
  };
}

function parseStatusRows(statusText) {
  return allLines(statusText)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const status = line.slice(0, 2).trim();
      const relativePath = line.slice(3).trim();
      return {
        raw: line,
        status,
        relativePath,
        untracked: status === "??"
      };
    });
}

function fileHeading(relativePath, text) {
  if (relativePath.endsWith(".csv")) {
    const [header = ""] = allLines(text);
    return header.slice(0, 160);
  }
  const heading = allLines(text).find((line) => /^#{1,3}\s+/.test(line));
  return (heading ?? "").replace(/^#{1,3}\s+/, "").slice(0, 160);
}

function fileInventory(statusRows) {
  return statusRows.map((row) => {
    const absolutePath = path.join(root, row.relativePath);
    const exists = fs.existsSync(absolutePath);
    const text = exists ? fs.readFileSync(absolutePath, "utf8") : "";
    const stat = exists ? fs.statSync(absolutePath) : null;
    return {
      path: row.relativePath,
      status: row.status,
      exists,
      bytes: stat?.size ?? 0,
      lines: exists ? allLines(text).length : 0,
      sha256: exists ? sha256(text) : "",
      sha256Short: exists ? sha256(text).slice(0, 12) : "",
      firstHeading: exists ? fileHeading(row.relativePath, text) : "",
      extension: path.extname(row.relativePath),
      ownerScope: row.relativePath.startsWith("coordination/research/")
    };
  });
}

function evidenceDigest(capsule) {
  if (consumedNoActiveCandidate(capsule)) return emptyEvidenceDigest();

  const statusEvidence = evidenceFile(capsule, "status");
  const diffstatEvidence = evidenceFile(capsule, "diffstat");
  const patchEvidence = evidenceFile(capsule, "patch");
  const untrackedEvidence = evidenceFile(capsule, "untracked");
  const aheadEvidence = evidenceFile(capsule, "dirtyDivergedAheadLog");
  const branchDiffstatEvidence = evidenceFile(capsule, "dirtyDivergedDiffstat");
  const branchPatchEvidence = evidenceFile(capsule, "dirtyDivergedPatch");

  const statusText = readTextIfExists(statusEvidence?.path ?? "");
  const diffstatText = readTextIfExists(diffstatEvidence?.path ?? "");
  const patchText = readTextIfExists(patchEvidence?.path ?? "");
  const untrackedText = readTextIfExists(untrackedEvidence?.path ?? "");
  const aheadText = readTextIfExists(aheadEvidence?.path ?? "");
  const branchDiffstatText = readTextIfExists(branchDiffstatEvidence?.path ?? "");
  const branchPatchText = readTextIfExists(branchPatchEvidence?.path ?? "");

  const statusRows = parseStatusRows(statusText);
  const inventory = fileInventory(statusRows);
  const trackedPatchLines = nonEmptyLines(patchText);
  const branchPatchLines = nonEmptyLines(branchPatchText);

  return {
    statusRows,
    untrackedRows: nonEmptyLines(untrackedText),
    fileInventory: inventory,
    trackedDiffstatText: diffstatText.trim(),
    trackedDiffPresent: !diffstatText.includes("No tracked diff.") || trackedPatchLines.length > 0,
    trackedPatchNonEmptyLines: trackedPatchLines.length,
    aheadLogText: aheadText.trim(),
    aheadCommitsPresent: !aheadText.includes("No ahead commits."),
    dirtyDivergedDiffstatText: branchDiffstatText.trim(),
    dirtyDivergedDiffPresent: !branchDiffstatText.includes("No branch diff.") || branchPatchLines.length > 0,
    dirtyDivergedPatchNonEmptyLines: branchPatchLines.length
  };
}

function acceptanceChecks(capsule, digest) {
  const approvalRows = activeAndConsumedApprovalRows(capsule);
  if (consumedNoActiveCandidate(capsule)) {
    const checks = [
      {
        id: "ready-candidate-consumed",
        label: "Ready candidate is consumed by post-extraction verification",
        passed: true,
        evidence: `candidate=${capsule.authorizationRound?.candidateId ?? ""}`
      },
      {
        id: "post-extraction-verified",
        label: "A16 post-extraction verification is complete",
        passed: capsule.authorizationRound?.postExtractionState?.verified === true,
        evidence: `commit=${capsule.authorizationRound?.postExtractionState?.latestPackageCommit?.hash ?? ""}`
      },
      {
        id: "no-active-approval-rows",
        label: "No ready-candidate approval rows remain active",
        passed: approvalRows.activeRows === 0 && approvalRows.pendingRows === 0 && approvalRows.authorizedRows === 0,
        evidence: `active=${approvalRows.activeRows} pending=${approvalRows.pendingRows} authorized=${approvalRows.authorizedRows}`
      },
      {
        id: "consumed-owner-package-recorded",
        label: "A16 owner-package approval is recorded as consumed",
        passed: consumedApprovalIds(capsule).includes("a16-research-and-learning-science"),
        evidence: consumedApprovalIds(capsule).join(", ")
      },
      {
        id: "non-executable",
        label: "Consumed ready-candidate surface remains non-executable",
        passed: count(capsule.summary?.cleanupAuthorizedRows) === 0 && count(capsule.summary?.executableRows) === 0,
        evidence: `cleanup=${count(capsule.summary?.cleanupAuthorizedRows)} executable=${count(capsule.summary?.executableRows)}`
      },
      {
        id: "authorization-target-present",
        label: "Canonical authorization target is identified",
        passed: capsule.authorizationRecordingTargets?.canonicalAuthorizationFile?.endsWith("latest-A25-next-owner-authorizations.json") === true,
        evidence: capsule.authorizationRecordingTargets?.canonicalAuthorizationFile ?? ""
      }
    ];

    return checks.map((check) => ({
      ...check,
      status: check.passed ? "pass" : "fail"
    }));
  }

  const checks = [
    {
      id: "candidate-ready-for-owner-review",
      label: "Candidate is ready for owner review",
      passed: capsule.summary?.readyForOwnerReview === true,
      evidence: `candidate=${capsule.candidate?.candidateId ?? ""}`
    },
    {
      id: "owner-scope-covered",
      label: "Owner pathspec covers every candidate entry",
      passed: count(capsule.candidate?.coveredEntries) === count(capsule.candidate?.statusEntries) && count(capsule.candidate?.uncoveredEntries) === 0,
      evidence: `covered=${count(capsule.candidate?.coveredEntries)} uncovered=${count(capsule.candidate?.uncoveredEntries)}`
    },
    {
      id: "package-checks-green",
      label: "Package-level checks are green",
      passed: count(capsule.candidate?.failedChecks) === 0 && count(capsule.candidate?.typeCheckErrorLines) === 0,
      evidence: `failedChecks=${count(capsule.candidate?.failedChecks)} typeCheckErrorLines=${count(capsule.candidate?.typeCheckErrorLines)}`
    },
    {
      id: "root-files-present",
      label: "All candidate files are present in the current root inventory",
      passed: digest.fileInventory.length > 0 && digest.fileInventory.every((row) => row.exists),
      evidence: `present=${digest.fileInventory.filter((row) => row.exists).length}/${digest.fileInventory.length}`
    },
    {
      id: "status-is-untracked-only",
      label: "Archived status is untracked-only research evidence",
      passed: digest.statusRows.length === 6 && digest.statusRows.every((row) => row.untracked),
      evidence: `statusRows=${digest.statusRows.length} untrackedRows=${digest.statusRows.filter((row) => row.untracked).length}`
    },
    {
      id: "untracked-archive-matches-status",
      label: "Untracked archive count matches status rows",
      passed: digest.untrackedRows.length === digest.statusRows.length,
      evidence: `untrackedArchiveRows=${digest.untrackedRows.length} statusRows=${digest.statusRows.length}`
    },
    {
      id: "no-tracked-diff",
      label: "No tracked root diff is hidden in the candidate",
      passed: digest.trackedDiffPresent === false,
      evidence: digest.trackedDiffstatText || "empty tracked diffstat"
    },
    {
      id: "no-ahead-commits",
      label: "No ahead commits are hidden in the linked worktree evidence",
      passed: digest.aheadCommitsPresent === false,
      evidence: digest.aheadLogText || "empty ahead log"
    },
    {
      id: "no-dirty-diverged-branch-diff",
      label: "No dirty-diverged branch diff is hidden in the candidate",
      passed: digest.dirtyDivergedDiffPresent === false,
      evidence: digest.dirtyDivergedDiffstatText || "empty branch diffstat"
    },
    {
      id: "review-inputs-complete",
      label: "Required owner review inputs are complete",
      passed: count(capsule.summary?.missingReviewInputs) === 0 && count(capsule.summary?.missingReviewEvidenceRows) === 0,
      evidence: `missingInputs=${count(capsule.summary?.missingReviewInputs)} missingEvidence=${count(capsule.summary?.missingReviewEvidenceRows)}`
    },
	    {
	      id: "approval-rows-recorded-or-pending-non-executable",
	      label: "The ready candidate approval surface is recorded, pending, or consumed and non-executable",
	      passed: approvalRows.activeRows + approvalRows.consumedRows === 2
	        && approvalRows.pendingRows + approvalRows.authorizedRows + approvalRows.consumedRows === 2
	        && count(capsule.summary?.cleanupAuthorizedRows) === 0
	        && count(capsule.summary?.executableRows) === 0,
	      evidence: `active=${approvalRows.activeRows} consumed=${approvalRows.consumedRows} pending=${approvalRows.pendingRows} authorized=${approvalRows.authorizedRows} executable=${count(capsule.summary?.executableRows)}`
	    },
    {
      id: "authorization-target-present",
      label: "Canonical authorization target is identified",
      passed: capsule.authorizationRecordingTargets?.canonicalAuthorizationFile?.endsWith("latest-A25-next-owner-authorizations.json") === true,
      evidence: capsule.authorizationRecordingTargets?.canonicalAuthorizationFile ?? ""
    }
  ];

  return checks.map((check) => ({
    ...check,
    status: check.passed ? "pass" : "fail"
  }));
}

function decisionOptions(capsule) {
  return (capsule.reviewChecklist?.allowedFinalStateDecisions ?? []).map((row) => ({
    approvalId: row.approvalId,
    decisionKind: row.decisionKind,
    allowedFinalStates: row.allowedFinalStates ?? [],
    requiresSeparateExecutionInstruction: true
  }));
}

function consumedApprovalIds(capsule) {
  return capsule.authorizationRound?.consumedApprovalIds ?? [];
}

function activeAndConsumedApprovalRows(capsule) {
  return {
    activeRows: count(capsule.summary?.approvalRows),
    pendingRows: count(capsule.summary?.pendingApprovalRows),
    authorizedRows: count(capsule.summary?.authorizedApprovalRows),
    consumedRows: consumedApprovalIds(capsule).length
  };
}

export function buildReadyCandidateOwnerAcceptanceDocket() {
  const dirtyMap = readJson(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const recordedCapsule = readJson(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.readyCandidateCapsule);
  const currentCapsule = buildReadyCandidateOwnerReviewCapsule();
  const sourceCurrentnessFailures = [];

  if (!sameJson(
    stableReadyCandidateOwnerReviewCapsuleProjection(recordedCapsule),
    stableReadyCandidateOwnerReviewCapsuleProjection(currentCapsule)
  )) {
    sourceCurrentnessFailures.push("ready candidate owner-review capsule is stale");
  }
  if (recordedCapsule.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    sourceCurrentnessFailures.push("ready candidate owner-review capsule dirty-map signature is stale");
  }
  if (recordedCapsule.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) {
    sourceCurrentnessFailures.push("ready candidate owner-review capsule expanded entry count is stale");
  }
  if ((recordedCapsule.sourceCurrentnessFailures ?? []).length > 0) {
    sourceCurrentnessFailures.push("ready candidate owner-review capsule has source currentness failures");
  }

  const digest = evidenceDigest(recordedCapsule);
  const checks = acceptanceChecks(recordedCapsule, digest);
  const failedChecks = checks.filter((check) => !check.passed);
  const consumedNoActive = consumedNoActiveCandidate(recordedCapsule);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      readyCandidateCapsuleGeneratedAt: recordedCapsule.generatedAt,
      readyCandidateCapsulePath: READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestJson
    },
    sourceCurrentnessFailures,
    candidate: recordedCapsule.candidate,
    ownerReviewRound: recordedCapsule.authorizationRound,
    evidenceDigest: digest,
    acceptanceChecks: checks,
    ownerDecisionDocket: {
      status: consumedNoActive
        ? "post-extraction-consumed"
        : failedChecks.length === 0 && sourceCurrentnessFailures.length === 0
          ? "ready-for-owner-decision"
          : "not-ready-for-owner-decision",
      ownerDecisionRequired: !consumedNoActive,
      candidateSummary: consumedNoActive
        ? "A16 research evidence package has already been committed and post-extraction verified; no active ready-candidate owner-decision row remains."
        : "A16 research evidence package contains six untracked coordination/research artifacts and no tracked code diff in the archived evidence.",
      requiredApprovalIds: consumedNoActive ? [] : (recordedCapsule.approvalRows ?? []).map((row) => row.approvalId),
      consumedApprovalIds: consumedApprovalIds(recordedCapsule),
      postExtractionState: recordedCapsule.authorizationRound?.postExtractionState ?? null,
      decisionOptions: consumedNoActive ? [] : decisionOptions(recordedCapsule),
      targetAuthorizationFile: recordedCapsule.authorizationRecordingTargets?.canonicalAuthorizationFile ?? "",
      copyableAuthorizationTexts: recordedCapsule.copyableAuthorizationTexts ?? [],
      postDecisionValidationCommands: recordedCapsule.postApprovalValidationCommands ?? [],
      deferredAggregateValidationCommands: recordedCapsule.deferredAggregateValidationCommands ?? [],
      validationHold: recordedCapsule.validationHold
    },
    summary: {
      candidateId: recordedCapsule.candidate?.candidateId || recordedCapsule.authorizationRound?.candidateId || "",
      fileInventoryRows: digest.fileInventory.length,
      rootFilesPresent: digest.fileInventory.filter((row) => row.exists).length,
      rootFilesMissing: digest.fileInventory.filter((row) => !row.exists).length,
      statusRows: digest.statusRows.length,
      untrackedRows: digest.statusRows.filter((row) => row.untracked).length,
      ownerScopeRows: digest.fileInventory.filter((row) => row.ownerScope).length,
      trackedDiffPresent: digest.trackedDiffPresent,
      aheadCommitsPresent: digest.aheadCommitsPresent,
      dirtyDivergedDiffPresent: digest.dirtyDivergedDiffPresent,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.filter((check) => check.passed).length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
	      approvalRows: count(recordedCapsule.summary?.approvalRows),
	      consumedApprovalRows: consumedApprovalIds(recordedCapsule).length,
	      pendingApprovalRows: count(recordedCapsule.summary?.pendingApprovalRows),
      authorizedApprovalRows: count(recordedCapsule.summary?.authorizedApprovalRows),
      cleanupAuthorizedRows: count(recordedCapsule.summary?.cleanupAuthorizedRows),
      executableRows: count(recordedCapsule.summary?.executableRows),
      ownerDecisionRequired: !consumedNoActive,
      readyForOwnerDecision: !consumedNoActive && failedChecks.length === 0 && sourceCurrentnessFailures.length === 0,
      postExtractionConsumed: consumedNoActive
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

export function stableReadyCandidateOwnerAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    candidate: payload.candidate,
    ownerReviewRound: payload.ownerReviewRound,
    evidenceDigest: payload.evidenceDigest,
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
  const fileRows = payload.evidenceDigest.fileInventory.map((row, index) => (
    `| ${index + 1} | \`${cell(row.path)}\` | ${cell(row.status)} | ${row.exists ? "yes" : "no"} | ${row.lines} | ${row.bytes} | \`${row.sha256Short}\` | ${cell(row.firstHeading)} |`
  )).join("\n");
  const checkRows = payload.acceptanceChecks.map((row, index) => (
    `| ${index + 1} | \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell(row.evidence)} |`
  )).join("\n");
  const decisionRows = payload.ownerDecisionDocket.decisionOptions.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.decisionKind)} | ${cell(row.allowedFinalStates.join(", "))} | yes |`
  )).join("\n");
  const authorizationRows = payload.ownerDecisionDocket.copyableAuthorizationTexts.map((row) => `### ${row.order}. \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");
  const validationCommands = payload.ownerDecisionDocket.postDecisionValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Ready Candidate Owner Acceptance Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is evidence-only. It summarizes the first ready owner-review candidate for a human decision, but it does not create the authorization file, record owner approval, authorize merge, authorize cleanup, run cleanup, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Candidate: \`${payload.summary.candidateId}\`
- Status: ${payload.ownerDecisionDocket.status}
- Files in docket: ${payload.summary.fileInventoryRows}
- Root files present: ${payload.summary.rootFilesPresent}
- Root files missing: ${payload.summary.rootFilesMissing}
- Status rows: ${payload.summary.statusRows}
- Untracked rows: ${payload.summary.untrackedRows}
- Owner-scope rows: ${payload.summary.ownerScopeRows}
- Tracked diff present: ${payload.summary.trackedDiffPresent ? "yes" : "no"}
- Ahead commits present: ${payload.summary.aheadCommitsPresent ? "yes" : "no"}
- Dirty-diverged diff present: ${payload.summary.dirtyDivergedDiffPresent ? "yes" : "no"}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
	- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
	- Approval rows: ${payload.summary.approvalRows}
	- Consumed approval rows: ${payload.summary.consumedApprovalRows}
	- Pending approval rows: ${payload.summary.pendingApprovalRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Candidate Scope

${payload.ownerDecisionDocket.candidateSummary}

| # | Path | Status | Exists | Lines | Bytes | SHA-256 | First heading/header |
| ---: | --- | --- | --- | ---: | ---: | --- | --- |
${fileRows}

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
${checkRows}

## Owner Decision Options

Target authorization file: \`${payload.ownerDecisionDocket.targetAuthorizationFile}\`

| Approval ID | Kind | Allowed final states | Separate execution instruction required |
| --- | --- | --- | --- |
${decisionRows}

	Required approval IDs:

	${bullet(payload.ownerDecisionDocket.requiredApprovalIds)}

	Consumed approval IDs:

	${bullet(payload.ownerDecisionDocket.consumedApprovalIds ?? [])}

	Post-extraction verified: ${payload.ownerDecisionDocket.postExtractionState?.verified ? "yes" : "no"}

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner fills the placeholders in the target authorization file and the validators accept them.

${authorizationRows}

## Post-Decision Validation Commands

${validationCommands}

## Validation Hold

- Status: ${payload.ownerDecisionDocket.validationHold?.status ?? "unknown"}
- Active worktree: \`${payload.ownerDecisionDocket.validationHold?.activeWorktreePath ?? ""}\`
- Reason: ${payload.ownerDecisionDocket.validationHold?.reason ?? ""}
- Resume condition: ${payload.ownerDecisionDocket.validationHold?.resumeCondition ?? ""}

## Boundary

Every row remains non-executable. A separate owner instruction naming exact approval IDs and exact commands is still required before any merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildReadyCandidateOwnerAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson,
    latestMarkdown: READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown,
    candidateId: payload.summary.candidateId,
    status: payload.ownerDecisionDocket.status,
    fileInventoryRows: payload.summary.fileInventoryRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
