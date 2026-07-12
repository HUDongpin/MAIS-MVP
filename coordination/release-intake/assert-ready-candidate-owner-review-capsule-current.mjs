#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS,
  buildReadyCandidateOwnerReviewCapsule,
  stableReadyCandidateOwnerReviewCapsuleProjection
} from "./generate-ready-candidate-owner-review-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-ready-candidate-owner-review-capsule-current-gate.json");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestJson,
    READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestJson);
  const current = buildReadyCandidateOwnerReviewCapsule();
  if (!sameJson(stableReadyCandidateOwnerReviewCapsuleProjection(recorded), stableReadyCandidateOwnerReviewCapsuleProjection(current))) {
    failures.push("A25 ready candidate owner-review capsule is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const candidate = recorded.candidate ?? {};
  const authorizationRound = recorded.authorizationRound ?? {};
  const approvalRows = recorded.approvalRows ?? [];
  const reviewChecklist = recorded.reviewChecklist ?? {};

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
  if (authorizationRound.id !== "ready-candidate-owner-review") failures.push("authorization round must be ready-candidate-owner-review");
  const a16OwnerPackageConsumed = authorizationRound.consumedApprovalIds?.includes("a16-research-and-learning-science") === true
    && authorizationRound.postExtractionState?.verified === true
    && authorizationRound.postExtractionState?.lifecycleStatus === "post-extraction-verified"
    && (authorizationRound.postExtractionState?.packageStatusRows ?? 1) === 0
    && (authorizationRound.postExtractionState?.stagedPackageRows ?? 1) === 0
    && authorizationRound.postExtractionState?.latestPackageCommit?.hash;
  const consumedNoActiveCandidate = a16OwnerPackageConsumed
    && (summary.approvalRows ?? 0) === 0
    && approvalRows.length === 0
    && (summary.consumedApprovalRows ?? 0) === 1;

  if (consumedNoActiveCandidate) {
    if (summary.readyForOwnerReview !== false) failures.push("consumed ready candidate must not remain ready for owner review");
    if (candidate.candidateId !== "") failures.push("consumed ready candidate must not expose an active candidateId");
    if ((summary.pendingApprovalRows ?? 0) !== 0 || (summary.authorizedApprovalRows ?? 0) !== 0) {
      failures.push("consumed ready candidate must have zero active pending/authorized rows");
    }
    if ((summary.copyableAuthorizationTexts ?? 0) !== 0) failures.push("consumed ready candidate must have zero active copyable authorization texts");
  } else {
    if (summary.readyForOwnerReview !== true) failures.push("candidate must be ready for owner review");
    if (candidate.candidateId !== "wave-05-visualization-ai-runtime:a16-research-evidence") {
      failures.push("candidateId must be the A16 ready candidate");
    }
    const expectedActiveApprovalRows = a16OwnerPackageConsumed ? 1 : 2;
    if ((summary.approvalRows ?? 0) !== expectedActiveApprovalRows) {
      failures.push(`summary.approvalRows must be ${expectedActiveApprovalRows}`);
    }
    if (approvalRows.length !== expectedActiveApprovalRows) {
      failures.push(`approvalRows length must be ${expectedActiveApprovalRows}`);
    }
    if ((summary.consumedApprovalRows ?? 0) !== (a16OwnerPackageConsumed ? 1 : 0)) {
      failures.push(`summary.consumedApprovalRows must be ${a16OwnerPackageConsumed ? 1 : 0}`);
    }
    if ((summary.pendingApprovalRows ?? 0) + (summary.authorizedApprovalRows ?? 0) !== expectedActiveApprovalRows) {
      failures.push(`pendingApprovalRows + authorizedApprovalRows must be ${expectedActiveApprovalRows}`);
    }
  }
  if ((summary.authorizedApprovalRows ?? 0) !== (authorizationRound.authorizedRows ?? 0)) {
    failures.push("summary.authorizedApprovalRows must match authorizationRound.authorizedRows");
  }
  if ((summary.authorizedApprovalRows ?? 0) > (summary.authorizedCanonicalRows ?? 0)) {
    failures.push("summary.authorizedApprovalRows cannot exceed authorized canonical rows");
  }
  if (!consumedNoActiveCandidate && (summary.copyableAuthorizationTexts ?? 0) !== (a16OwnerPackageConsumed ? 1 : 2)) {
    failures.push(`summary.copyableAuthorizationTexts must be ${a16OwnerPackageConsumed ? 1 : 2}`);
  }
  if (!consumedNoActiveCandidate && (summary.requiredReviewInputs ?? 0) < 9) failures.push("requiredReviewInputs must include archive and owner evidence");
  if ((summary.missingReviewInputs ?? 0) !== 0) failures.push("missingReviewInputs must be 0");
  if (!consumedNoActiveCandidate && (summary.reviewEvidenceRows ?? 0) < 9) failures.push("reviewEvidenceRows must include archive evidence");
  if ((summary.missingReviewEvidenceRows ?? 0) !== 0) failures.push("missingReviewEvidenceRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (!recorded.authorizationRecordingTargets?.canonicalAuthorizationFile?.endsWith("latest-A25-next-owner-authorizations.json")) {
    failures.push("canonical authorization target must be latest-A25-next-owner-authorizations.json");
  }

  const approvalIds = approvalRows.map((row) => row.approvalId);
  const activeRequiredApprovalIds = consumedNoActiveCandidate
    ? []
    : a16OwnerPackageConsumed
      ? ["codex-a16-research-evidence-closure"]
      : ["a16-research-and-learning-science", "codex-a16-research-evidence-closure"];
  for (const requiredApprovalId of activeRequiredApprovalIds) {
    if (!approvalIds.includes(requiredApprovalId)) failures.push(`missing approval row ${requiredApprovalId}`);
    if (!(recorded.copyableAuthorizationTexts ?? []).some((row) => row.text?.includes(`approvalId=${requiredApprovalId}`))) {
      failures.push(`missing copyable authorization text for ${requiredApprovalId}`);
    }
  }
  if (a16OwnerPackageConsumed && approvalIds.includes("a16-research-and-learning-science")) {
    failures.push("consumed owner-package approval row must not remain active");
  }

  for (const row of approvalRows) {
    if (row.cleanupAuthorized === true) failures.push(`approval row ${row.approvalId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`approval row ${row.approvalId} must not be executable`);
    if (!row.approvalFingerprint) failures.push(`approval row ${row.approvalId} missing approvalFingerprint`);
    if (!row.authorizationText?.includes("approvedBy=")) failures.push(`approval row ${row.approvalId} authorizationText missing approvedBy field`);
    if (!row.authorizationText?.includes("approvedAt=")) failures.push(`approval row ${row.approvalId} authorizationText missing approvedAt field`);
  }

  const missingInputs = (reviewChecklist.requiredReviewInputs ?? []).filter((row) => row.exists !== true);
  if (missingInputs.length > 0) failures.push(`review checklist has ${missingInputs.length} missing inputs`);
  const missingEvidence = (reviewChecklist.reviewEvidence ?? []).filter((row) => row.exists !== true);
  if (missingEvidence.length > 0) failures.push(`review evidence has ${missingEvidence.length} missing rows`);
  if (!consumedNoActiveCandidate && (reviewChecklist.reviewQuestions ?? []).length < 5) failures.push("review checklist must include at least five review questions");
  if (!consumedNoActiveCandidate && (reviewChecklist.allowedFinalStateDecisions ?? []).length !== 2) failures.push("allowedFinalStateDecisions must contain two rows");
  if (!consumedNoActiveCandidate && (recorded.postApprovalValidationCommands ?? []).length < 8) failures.push("postApprovalValidationCommands must contain candidate and safe validation commands");
  if (consumedNoActiveCandidate && (recorded.postApprovalValidationCommands ?? []).length < 5) failures.push("consumed ready candidate capsule must retain safe validation commands");

  const markdown = readText(READY_CANDIDATE_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown);
  const requiredMarkdownNeedles = [
    "A25 Ready Candidate Owner Review Capsule",
    "does not record owner approval",
    "does not authorize merge",
    "Consumed approval IDs",
    "Every row remains non-executable",
    "waiting-for-owner-compose-deletion-confirmation"
  ];
  if (consumedNoActiveCandidate) {
    requiredMarkdownNeedles.push("Post-extraction verified: yes");
  } else {
    requiredMarkdownNeedles.push("Approval Row 1", "approvalId=codex-a16-research-evidence-closure");
    if (!a16OwnerPackageConsumed) {
      requiredMarkdownNeedles.push("Approval Row 2", "approvalId=a16-research-and-learning-science");
    }
  }
  for (const needle of requiredMarkdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`ready candidate capsule markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("ready candidate capsule markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    candidateId: candidate.candidateId,
    approvalRows: summary.approvalRows ?? 0,
    pendingApprovalRows: summary.pendingApprovalRows ?? 0,
    authorizedApprovalRows: summary.authorizedApprovalRows ?? 0,
    copyableAuthorizationTexts: summary.copyableAuthorizationTexts ?? 0,
    requiredReviewInputs: summary.requiredReviewInputs ?? 0,
    missingReviewInputs: summary.missingReviewInputs ?? 0,
    reviewEvidenceRows: summary.reviewEvidenceRows ?? 0,
    missingReviewEvidenceRows: summary.missingReviewEvidenceRows ?? 0,
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
    console.log("A25 ready candidate owner-review capsule gate");
    console.log(`Candidate: ${payload.candidateId ?? ""}`);
    console.log(`Approval rows: ${payload.approvalRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 ready candidate owner-review capsule gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
