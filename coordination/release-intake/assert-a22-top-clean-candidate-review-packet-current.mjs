#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_REVIEW_PATHS,
  buildTopCleanCandidateReviewPacket,
  stableTopCleanCandidateReviewProjection
} from "./generate-a22-top-clean-candidate-review-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-review-packet-current-gate.json");
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

function validationById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function pathFromShortStatusRow(row) {
  const text = String(row ?? "");
  return text.length >= 3 ? text.slice(3) : text.replace(/^\S+\s+/u, "");
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestJson);
  const current = buildTopCleanCandidateReviewPacket();
  if (!sameJson(
    stableTopCleanCandidateReviewProjection(recorded),
    stableTopCleanCandidateReviewProjection(current)
  )) {
    failures.push("A22 top clean candidate review packet is stale");
  }

  const promotion = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanSourceCandidatePromotion);
  const focusedSmoke = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateFocusedSmoke);
  const typeCheck = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateTypeCheck);
  const buildSnapshot = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateBuildSnapshot);
  const buildBlockerRouting = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateBuildBlockerRouting);
  const rootParityExtractionPlan = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionPlan);
  const rootParityExtractionInstructionRequest = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionRequest);
  const rootParityExtractionInstructionIntake = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionIntake);
  const rootParityExtractionInstructionRecording = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionRecording);
  const rootParityGuardedExtraction = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityGuardedExtraction);
  const rootParityOwnerActionPacket = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityOwnerActionPacket);
  const rootParityOwnerActionAcceptanceDocket = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityOwnerActionAcceptanceDocket);
  const runway = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanReleaseSourceRunway);
  const exitCriteria = readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.validateToMergeExitCriteria);
  const topCandidate = recorded.topCandidate ?? {};
  const summary = recorded.summary ?? {};
  const archiveEvidence = recorded.archiveEvidence ?? {};
  const evidenceFiles = archiveEvidence.evidenceFiles ?? [];
  const validationRows = recorded.validationRows ?? [];
  const changedFiles = recorded.changedFiles ?? [];
  const boundary = recorded.boundary ?? {};
  const gitArchiveEvidence = validationById(validationRows, "git-archive-evidence");
  const isRecoveryCandidate = topCandidate.promotionLane === "controlled-mutated-root-parity-recovery";
  const buildRefreshRequired = buildSnapshot.summary?.buildRefreshRequired === true;
  const expectedRecoveryChangedPaths = (promotion.topCandidate?.allowedDirtyStatusRows ?? [])
    .map((row) => pathFromShortStatusRow(row))
    .filter(Boolean);

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (isRecoveryCandidate) {
    if (recorded.packetStatus !== "controlled-recovery-evidence-ready-promotion-blocked") {
      failures.push("packetStatus must be controlled-recovery-evidence-ready-promotion-blocked");
    }
  } else if (recorded.packetStatus !== "git-evidence-ready-promotion-blocked") {
    failures.push("packetStatus must remain git-evidence-ready-promotion-blocked");
  }
  if (summary.gitArchiveEvidenceReady !== true) failures.push("summary.gitArchiveEvidenceReady must be true");
  if (summary.focusedSmokePassed !== true) failures.push("summary.focusedSmokePassed must be true");
  if (summary.typeCheckPassed !== (typeCheck.summary?.typeCheckPassed === true)) {
    failures.push("summary.typeCheckPassed must match A22 type-check evidence");
  }
  if ((summary.typeCheckErrorLineCount ?? -1) !== (typeCheck.summary?.errorLineCount ?? 0)) {
    failures.push("summary.typeCheckErrorLineCount must match A22 type-check evidence");
  }
  if (summary.buildPassed !== (buildSnapshot.summary?.buildPassed === true)) {
    failures.push("summary.buildPassed must match A22 build snapshot evidence");
  }
  if ((summary.buildExitStatus ?? null) !== (buildSnapshot.summary?.exitStatus ?? null)) {
    failures.push("summary.buildExitStatus must match A22 build snapshot evidence");
  }
  if ((summary.buildFailureCategory ?? "") !== (buildSnapshot.summary?.failureCategory ?? "")) {
    failures.push("summary.buildFailureCategory must match A22 build snapshot evidence");
  }
  if ((summary.buildConfirmedModuleBlockerRows ?? -1) !== (buildSnapshot.summary?.confirmedModuleBlockerRows ?? 0)) {
    failures.push("summary.buildConfirmedModuleBlockerRows must match A22 build snapshot evidence");
  }
  if ((summary.buildModuleBlockerRows ?? -1) !== (buildSnapshot.summary?.moduleBlockerRows ?? 0)) {
    failures.push("summary.buildModuleBlockerRows must match A22 build snapshot evidence");
  }
  if (summary.buildBlockersRouted !== (buildBlockerRouting.summary?.allBuildBlockersRouted === true)) {
    failures.push("summary.buildBlockersRouted must match A22 build blocker routing evidence");
  }
  if ((summary.buildBlockerRouteGroupRows ?? -1) !== (buildBlockerRouting.summary?.routeGroupRows ?? 0)) {
    failures.push("summary.buildBlockerRouteGroupRows must match A22 build blocker routing evidence");
  }
  if ((summary.buildBlockerRootParitySourceRows ?? -1) !== (buildBlockerRouting.summary?.rootParitySourceRows ?? 0)) {
    failures.push("summary.buildBlockerRootParitySourceRows must match A22 build blocker routing evidence");
  }
  if (summary.buildNextDirPresent !== (buildSnapshot.summary?.nextDirPresent === true)) {
    failures.push("summary.buildNextDirPresent must match A22 build snapshot evidence");
  }
  if ((summary.buildNextDirSizeMiB ?? -1) !== (buildSnapshot.summary?.nextDirSizeMiB ?? 0)) {
    failures.push("summary.buildNextDirSizeMiB must match A22 build snapshot evidence");
  }
  if (summary.promotionEligibleNow !== false) failures.push("summary.promotionEligibleNow must be false");
  if (summary.releaseSourceSelected !== false) failures.push("summary.releaseSourceSelected must be false");
  if (topCandidate.branch !== promotion.topCandidate?.branch) failures.push("top candidate branch must match A22 promotion packet");
  if (topCandidate.path !== promotion.topCandidate?.path) failures.push("top candidate path must match A22 promotion packet");
  if (count(topCandidate.promotionRank) !== count(promotion.topCandidate?.promotionRank)) {
    failures.push("top candidate promotion rank must match A22 promotion packet");
  }
  if (isRecoveryCandidate) {
    if (topCandidate.recoveryEvidenceReady !== true) failures.push("top candidate recoveryEvidenceReady must be true");
    if ((topCandidate.allowedDirtyStatusRows ?? []).length < 4) {
      failures.push("top candidate allowedDirtyStatusRows must include at least the 4 root-parity rows");
    }
  } else if (topCandidate.promotionLane !== "clean-diverged-slice-review") {
    failures.push("top candidate lane must be clean-diverged-slice-review");
  }
  if (count(topCandidate.divergence?.ahead) <= 0) failures.push("top candidate must have ahead commits");
  if (count(topCandidate.divergence?.behind) <= 0) failures.push("top candidate should still record behind commits for resync review");
  if (topCandidate.releaseSourceSelected !== false) failures.push("top candidate releaseSourceSelected must be false");
  if (topCandidate.promotionEligibleNow !== false) failures.push("top candidate promotionEligibleNow must be false");
  if (!isRecoveryCandidate) {
    if (archiveEvidence.manifestEntryFound !== true) failures.push("archive manifest entry must be found");
    if (!archiveEvidence.prefix?.includes("codex-A22-us-region-alignment.clean-diverged")) {
      failures.push("archive prefix must identify the top A22 candidate");
    }
    if (count(archiveEvidence.patchBytes) <= 0) failures.push("archive patchBytes must be positive");
    if (!archiveEvidence.patchSha256) failures.push("archive patchSha256 must be present");
  }
  if ((summary.evidenceFiles ?? -1) !== evidenceFiles.length) failures.push("summary.evidenceFiles must match evidence file rows");
  if ((summary.existingEvidenceFiles ?? -1) !== evidenceFiles.filter((file) => file.exists).length) {
    failures.push("summary.existingEvidenceFiles must match existing evidence file rows");
  }
  if (!isRecoveryCandidate && !evidenceFiles.every((file) => file.exists)) failures.push("all archive evidence files must exist");
  for (const requiredKey of ["status", "aheadLog", "nameStatus", "diffstat", "patch", "untracked", "metadata"]) {
    if (!evidenceFiles.some((file) => file.key === requiredKey)) failures.push(`missing evidence file key: ${requiredKey}`);
  }
  const patchFile = evidenceFiles.find((file) => file.key === "patch");
  const statusFile = evidenceFiles.find((file) => file.key === "status");
  const untrackedFile = evidenceFiles.find((file) => file.key === "untracked");
  if (!isRecoveryCandidate) {
    if (patchFile?.shaMatchesExpected !== true) failures.push("patch sha must match manifest");
    if (statusFile?.preview?.[0] !== "clean") failures.push("status evidence must say clean");
    if (untrackedFile?.preview?.[0] !== "none") failures.push("untracked evidence must say none");
  }
  if ((summary.changedFiles ?? -1) !== changedFiles.length) failures.push("summary.changedFiles must match changed file rows");
  if (isRecoveryCandidate && changedFiles.length !== expectedRecoveryChangedPaths.length) {
    failures.push("top candidate changed file count must match recovery allowlist row count");
  }
  if (!isRecoveryCandidate && changedFiles.length !== 4) failures.push("top candidate changed file count should remain 4");
  const requiredChangedPaths = isRecoveryCandidate ? expectedRecoveryChangedPaths : [
    "vercel.json",
    "scripts/vercel-region-config.test.mjs",
    "coordination/reports/2026-06-29-A22-us-region-alignment.md",
    "coordination/session-logs/2026-06-29-A22-us-region-alignment.md"
  ];
  for (const requiredPath of requiredChangedPaths) {
    if (!changedFiles.some((row) => row.path === requiredPath)) failures.push(`missing changed file: ${requiredPath}`);
  }
  if ((summary.validationRows ?? -1) !== validationRows.length) failures.push("summary.validationRows must match validation rows");
  if ((summary.passedValidationRows ?? -1) !== validationRows.filter((row) => row.passed).length) {
    failures.push("summary.passedValidationRows must match validation rows");
  }
  if ((summary.missingPromotionGateRows ?? -1) !== validationRows.filter((row) => !row.passed).length) {
    failures.push("summary.missingPromotionGateRows must match validation rows");
  }
  if (gitArchiveEvidence?.passed !== true) failures.push("git-archive-evidence row must pass");
  const focusedSmokeRow = validationById(validationRows, "candidate-focused-regression");
  if (focusedSmokeRow?.passed !== true) failures.push("candidate-focused-regression must pass once the focused smoke evidence is green");
  if (focusedSmoke.summary?.smokePassed !== true) failures.push("focused smoke source artifact must report smokePassed true");
  const typeCheckRow = validationById(validationRows, "candidate-type-check");
  if (!typeCheckRow) failures.push("missing validation row: candidate-type-check");
  if (typeCheckRow && typeCheckRow.passed !== (typeCheck.summary?.typeCheckPassed === true)) {
    failures.push("candidate-type-check row must match A22 type-check evidence");
  }
  if (typeCheck.summary?.mutationDetected !== false) failures.push("type-check source artifact must report mutationDetected false");
  const buildRow = validationById(validationRows, "candidate-build");
  if (!buildRow) failures.push("missing validation row: candidate-build");
  if (buildRow && buildRow.passed !== (buildSnapshot.summary?.buildPassed === true)) {
    failures.push("candidate-build row must match A22 build snapshot evidence");
  }
  if (buildRow && buildSnapshot.summary?.buildPassed !== true && buildRow.status !== "failed") {
    failures.push("candidate-build row must record failed status while A22 build snapshot is red");
  }
  if (buildSnapshot.summary?.buildPassed === false && !buildRefreshRequired && (buildSnapshot.summary?.confirmedModuleBlockerRows ?? 0) <= 0) {
    failures.push("failed A22 build snapshot must include confirmed module blocker rows");
  }
  const buildRoutingRow = validationById(validationRows, "candidate-build-blocker-routing");
  if (!buildRoutingRow) failures.push("missing validation row: candidate-build-blocker-routing");
  if (buildRoutingRow && buildRoutingRow.passed !== (buildBlockerRouting.summary?.allBuildBlockersRouted === true || buildBlockerRouting.summary?.allPreviousBlockersResolved === true)) {
    failures.push("candidate-build-blocker-routing row must match A22 build blocker routing evidence");
  }
  if (!buildRefreshRequired && buildBlockerRouting.summary?.allBuildBlockersRouted !== true) {
    failures.push("A22 build blocker routing source artifact must report allBuildBlockersRouted true");
  }
  if (buildRefreshRequired && buildBlockerRouting.summary?.allPreviousBlockersResolved !== true) {
    failures.push("A22 build blocker routing source artifact must report allPreviousBlockersResolved true");
  }
  if ((buildBlockerRouting.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 build blocker routing must not authorize cleanup");
  }
  if ((buildBlockerRouting.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 build blocker routing must not make rows executable");
  }
  if (buildBlockerRouting.boundary?.runsBuild !== false) failures.push("build blocker routing current evidence must not rerun build");
  if (buildBlockerRouting.boundary?.deploys !== false) failures.push("build blocker routing current evidence must not authorize deploy");
  if (buildBlockerRouting.boundary?.cleanupAuthorized !== false) failures.push("build blocker routing current evidence must not authorize cleanup");
  const rootParityPlanRow = validationById(validationRows, "candidate-root-parity-extraction-plan");
  if (!rootParityPlanRow) failures.push("missing validation row: candidate-root-parity-extraction-plan");
  if (rootParityPlanRow && rootParityPlanRow.passed !== (rootParityExtractionPlan.planStatus === "reviewable-non-executable")) {
    failures.push("candidate-root-parity-extraction-plan row must match A22 root-parity extraction plan evidence");
  }
  if (rootParityExtractionPlan.planStatus !== "reviewable-non-executable") {
    failures.push("A22 root-parity extraction plan source artifact must report reviewable-non-executable");
  }
  if ((summary.rootParityExtractionUnits ?? -1) !== (rootParityExtractionPlan.summary?.extractionUnitRows ?? 0)) {
    failures.push("summary.rootParityExtractionUnits must match extraction plan");
  }
  if ((summary.rootParityBlockerRowsCovered ?? -1) !== (rootParityExtractionPlan.summary?.blockerRowsCovered ?? 0)) {
    failures.push("summary.rootParityBlockerRowsCovered must match extraction plan");
  }
  if ((summary.rootParitySourcesAvailable ?? -1) !== (rootParityExtractionPlan.summary?.rootSourcesAvailable ?? 0)) {
    failures.push("summary.rootParitySourcesAvailable must match extraction plan");
  }
  if ((summary.rootParityCandidateTargetsMissing ?? -1) !== (rootParityExtractionPlan.summary?.candidateTargetsMissing ?? 0)) {
    failures.push("summary.rootParityCandidateTargetsMissing must match extraction plan");
  }
  if ((rootParityExtractionPlan.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction plan must not authorize cleanup");
  }
  if ((rootParityExtractionPlan.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction plan must not make rows executable");
  }
  if (rootParityExtractionPlan.boundary?.modifiesCandidate !== false) failures.push("root-parity extraction plan must not modify candidate");
  if (rootParityExtractionPlan.boundary?.copiesRootFiles !== false) failures.push("root-parity extraction plan must not copy root files");
  if (rootParityExtractionPlan.boundary?.recordsExecutionInstruction !== false) failures.push("root-parity extraction plan must not record execution instruction");
  const rootParityInstructionRequestRow = validationById(validationRows, "candidate-root-parity-extraction-instruction-request");
  if (!rootParityInstructionRequestRow) failures.push("missing validation row: candidate-root-parity-extraction-instruction-request");
  if (rootParityInstructionRequestRow && rootParityInstructionRequestRow.passed !== (rootParityExtractionInstructionRequest.requestStatus === "waiting-for-owner-execution-instruction")) {
    failures.push("candidate-root-parity-extraction-instruction-request row must match A22 instruction request evidence");
  }
  if (rootParityExtractionInstructionRequest.requestStatus !== "waiting-for-owner-execution-instruction") {
    failures.push("A22 root-parity extraction instruction request source artifact must wait for owner instruction");
  }
  if ((summary.rootParityInstructionRows ?? -1) !== (rootParityExtractionInstructionRequest.summary?.instructionRows ?? 0)) {
    failures.push("summary.rootParityInstructionRows must match instruction request");
  }
  if ((summary.rootParityReadyForOwnerInstructionRows ?? -1) !== (rootParityExtractionInstructionRequest.summary?.readyForOwnerInstructionRows ?? 0)) {
    failures.push("summary.rootParityReadyForOwnerInstructionRows must match instruction request");
  }
  if ((rootParityExtractionInstructionRequest.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction request must not authorize cleanup");
  }
  if ((rootParityExtractionInstructionRequest.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction request must not make rows executable");
  }
  if (rootParityExtractionInstructionRequest.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity extraction instruction request must not modify candidate");
  }
  if (rootParityExtractionInstructionRequest.boundary?.recordsExecutionInstruction !== false) {
    failures.push("root-parity extraction instruction request must not record execution instruction");
  }
  const rootParityInstructionIntakeRow = validationById(validationRows, "candidate-root-parity-extraction-instruction-intake");
  if (!rootParityInstructionIntakeRow) failures.push("missing validation row: candidate-root-parity-extraction-instruction-intake");
  if (rootParityInstructionIntakeRow && rootParityInstructionIntakeRow.passed !== ["waiting-for-owner-input", "ready-to-record-extraction-instruction-rows"].includes(rootParityExtractionInstructionIntake.intakeStatus)) {
    failures.push("candidate-root-parity-extraction-instruction-intake row must match A22 instruction intake evidence");
  }
  if (!["waiting-for-owner-input", "ready-to-record-extraction-instruction-rows"].includes(rootParityExtractionInstructionIntake.intakeStatus)) {
    failures.push("A22 root-parity extraction instruction intake source artifact must be waiting or ready-to-record");
  }
  if ((summary.rootParityInstructionIntakeStatus ?? "") !== (rootParityExtractionInstructionIntake.intakeStatus ?? "")) {
    failures.push("summary.rootParityInstructionIntakeStatus must match instruction intake");
  }
  if (summary.rootParityOwnerInputBlank !== (rootParityExtractionInstructionIntake.ownerInputBlank === true)) {
    failures.push("summary.rootParityOwnerInputBlank must match instruction intake");
  }
  if ((summary.rootParityIntakeProposedInstructionRows ?? -1) !== (rootParityExtractionInstructionIntake.summary?.proposedInstructionRows ?? 0)) {
    failures.push("summary.rootParityIntakeProposedInstructionRows must match instruction intake");
  }
  if ((summary.rootParityIntakeWaitingOwnerInputChecks ?? -1) !== (rootParityExtractionInstructionIntake.summary?.waitingOwnerInputChecks ?? 0)) {
    failures.push("summary.rootParityIntakeWaitingOwnerInputChecks must match instruction intake");
  }
  if ((rootParityExtractionInstructionIntake.summary?.recordsExtractionInstructionRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction intake must not record extraction instructions");
  }
  if ((rootParityExtractionInstructionIntake.summary?.modifiesCandidateRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction intake must not modify candidate");
  }
  if ((rootParityExtractionInstructionIntake.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction intake must not authorize cleanup");
  }
  if ((rootParityExtractionInstructionIntake.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction intake must not make rows executable");
  }
  if (rootParityExtractionInstructionIntake.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity extraction instruction intake must not modify candidate");
  }
  if (rootParityExtractionInstructionIntake.boundary?.recordsExtractionInstruction !== false) {
    failures.push("root-parity extraction instruction intake must not record extraction instruction");
  }
  if (rootParityExtractionInstructionIntake.boundary?.copiesRootFiles !== false) {
    failures.push("root-parity extraction instruction intake must not copy root files");
  }
  const rootParityInstructionRecordingRow = validationById(validationRows, "candidate-root-parity-extraction-instruction-recording");
  if (!rootParityInstructionRecordingRow) failures.push("missing validation row: candidate-root-parity-extraction-instruction-recording");
  if (rootParityInstructionRecordingRow && rootParityInstructionRecordingRow.passed !== [
    "dry-run-blocked-owner-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded"
  ].includes(rootParityExtractionInstructionRecording.recorderStatus)) {
    failures.push("candidate-root-parity-extraction-instruction-recording row must match A22 instruction recording evidence");
  }
  if (![
    "dry-run-blocked-owner-input",
    "dry-run-ready-requires-explicit-apply",
    "already-recorded"
  ].includes(rootParityExtractionInstructionRecording.recorderStatus)) {
    failures.push("A22 root-parity extraction instruction recording source artifact must be blocked, ready dry-run, or already recorded");
  }
  if ((summary.rootParityInstructionRecordingStatus ?? "") !== (rootParityExtractionInstructionRecording.recorderStatus ?? "")) {
    failures.push("summary.rootParityInstructionRecordingStatus must match instruction recording");
  }
  if ((summary.rootParityRecordingProposedInstructionRows ?? -1) !== (rootParityExtractionInstructionRecording.summary?.proposedInstructionRows ?? 0)) {
    failures.push("summary.rootParityRecordingProposedInstructionRows must match instruction recording");
  }
  if ((summary.rootParityRecordingRecordedInstructionRows ?? -1) !== (rootParityExtractionInstructionRecording.summary?.recordsExtractionInstructionRows ?? 0)) {
    failures.push("summary.rootParityRecordingRecordedInstructionRows must match instruction recording");
  }
  if ((rootParityExtractionInstructionRecording.summary?.recordsExtractionInstructionRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction recording dry-run must not record extraction instructions");
  }
  if ((rootParityExtractionInstructionRecording.summary?.modifiesCandidateRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction recording must not modify candidate");
  }
  if ((rootParityExtractionInstructionRecording.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction recording must not authorize cleanup");
  }
  if ((rootParityExtractionInstructionRecording.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity extraction instruction recording must not make rows executable");
  }
  if (rootParityExtractionInstructionRecording.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity extraction instruction recording must not modify candidate");
  }
  if (rootParityExtractionInstructionRecording.boundary?.recordsExtractionInstruction !== false) {
    failures.push("root-parity extraction instruction recording dry-run must not record extraction instruction");
  }
  if (rootParityExtractionInstructionRecording.boundary?.copiesRootFiles !== false) {
    failures.push("root-parity extraction instruction recording must not copy root files");
  }
  const rootParityGuardedExtractionRow = validationById(validationRows, "candidate-root-parity-guarded-extraction");
  if (!rootParityGuardedExtractionRow) failures.push("missing validation row: candidate-root-parity-guarded-extraction");
  if (rootParityGuardedExtractionRow && rootParityGuardedExtractionRow.passed !== [
    "dry-run-blocked-missing-recorded-instructions",
    "dry-run-ready-requires-explicit-apply",
    "already-extracted-and-verified"
  ].includes(rootParityGuardedExtraction.executorStatus)) {
    failures.push("candidate-root-parity-guarded-extraction row must match A22 guarded extraction evidence");
  }
  if (![
    "dry-run-blocked-missing-recorded-instructions",
    "dry-run-ready-requires-explicit-apply",
    "already-extracted-and-verified"
  ].includes(rootParityGuardedExtraction.executorStatus)) {
    failures.push("A22 root-parity guarded extraction source artifact must be blocked, ready dry-run, or already verified");
  }
  if ((summary.rootParityGuardedExtractionStatus ?? "") !== (rootParityGuardedExtraction.executorStatus ?? "")) {
    failures.push("summary.rootParityGuardedExtractionStatus must match guarded extraction");
  }
  if ((summary.rootParityGuardedRecordedInstructionRows ?? -1) !== (rootParityGuardedExtraction.summary?.recordedInstructionRows ?? 0)) {
    failures.push("summary.rootParityGuardedRecordedInstructionRows must match guarded extraction");
  }
  if ((summary.rootParityGuardedCandidateTargetsMissing ?? -1) !== (rootParityGuardedExtraction.summary?.candidateTargetsMissing ?? 0)) {
    failures.push("summary.rootParityGuardedCandidateTargetsMissing must match guarded extraction");
  }
  if ((summary.rootParityGuardedCandidateGitStatusRows ?? -1) !== (rootParityGuardedExtraction.summary?.candidateGitStatusRows ?? 0)) {
    failures.push("summary.rootParityGuardedCandidateGitStatusRows must match guarded extraction");
  }
  if ((summary.rootParityGuardedRootCopyRows ?? -1) !== (rootParityGuardedExtraction.summary?.rootCopyRows ?? 0)) {
    failures.push("summary.rootParityGuardedRootCopyRows must match guarded extraction");
  }
  if ((summary.rootParityGuardedCandidateMutationRows ?? -1) !== (rootParityGuardedExtraction.summary?.candidateMutationRows ?? 0)) {
    failures.push("summary.rootParityGuardedCandidateMutationRows must match guarded extraction");
  }
  if (!isRecoveryCandidate && (rootParityGuardedExtraction.summary?.candidateGitStatusRows ?? -1) !== 0) {
    failures.push("A22 root-parity guarded extraction must see a clean candidate git status");
  }
  if ((rootParityGuardedExtraction.summary?.rootCopyRows ?? -1) !== 0) {
    failures.push("A22 root-parity guarded extraction must not copy root files");
  }
  if ((rootParityGuardedExtraction.summary?.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 root-parity guarded extraction must not mutate candidate");
  }
  if ((rootParityGuardedExtraction.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity guarded extraction must not authorize cleanup");
  }
  if ((rootParityGuardedExtraction.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity guarded extraction must not make rows executable");
  }
  if (rootParityGuardedExtraction.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity guarded extraction must not modify candidate");
  }
  if (rootParityGuardedExtraction.boundary?.copiesRootFiles !== false) {
    failures.push("root-parity guarded extraction must not copy root files");
  }
  if (rootParityGuardedExtraction.boundary?.recordsExecutionInstruction !== false) {
    failures.push("root-parity guarded extraction must not record execution instruction");
  }
  if (rootParityGuardedExtraction.boundary?.requiresSeparateOwnerCandidateMutationInstruction !== !isRecoveryCandidate) {
    failures.push("root-parity guarded extraction must require separate owner candidate mutation instruction");
  }
  const rootParityOwnerActionPacketRow = validationById(validationRows, "candidate-root-parity-owner-action-packet");
  if (!rootParityOwnerActionPacketRow) failures.push("missing validation row: candidate-root-parity-owner-action-packet");
  if (rootParityOwnerActionPacketRow && rootParityOwnerActionPacketRow.passed !== [
    "waiting-for-owner-action",
    "ready-for-extraction-instruction-recording",
    "ready-for-guarded-extraction",
    "post-extraction-verified"
  ].includes(rootParityOwnerActionPacket.focusStatus)) {
    failures.push("candidate-root-parity-owner-action-packet row must match A22 owner action packet evidence");
  }
  if (![
    "waiting-for-owner-action",
    "ready-for-extraction-instruction-recording",
    "ready-for-guarded-extraction",
    "post-extraction-verified"
  ].includes(rootParityOwnerActionPacket.focusStatus)) {
    failures.push("A22 root-parity owner action packet source artifact must be waiting, recording-ready, guarded-ready, or verified");
  }
  if ((summary.rootParityOwnerActionPacketStatus ?? "") !== (rootParityOwnerActionPacket.focusStatus ?? "")) {
    failures.push("summary.rootParityOwnerActionPacketStatus must match owner action packet");
  }
  if ((summary.rootParityOwnerActionRows ?? -1) !== (rootParityOwnerActionPacket.summary?.focusRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionRows must match owner action packet");
  }
  if ((summary.rootParityOwnerActionRecommendedRows ?? -1) !== (rootParityOwnerActionPacket.summary?.recommendedActionRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionRecommendedRows must match owner action packet");
  }
  if (summary.rootParityOwnerActionOwnerInputBlank !== (rootParityOwnerActionPacket.summary?.ownerInputBlank === true)) {
    failures.push("summary.rootParityOwnerActionOwnerInputBlank must match owner action packet");
  }
  if ((summary.rootParityOwnerActionRecordedInstructionRows ?? -1) !== (rootParityOwnerActionPacket.summary?.recordedInstructionRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionRecordedInstructionRows must match owner action packet");
  }
  if ((summary.rootParityOwnerActionRootCopyRows ?? -1) !== (rootParityOwnerActionPacket.summary?.rootCopyRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionRootCopyRows must match owner action packet");
  }
  if ((summary.rootParityOwnerActionCandidateMutationRows ?? -1) !== (rootParityOwnerActionPacket.summary?.candidateMutationRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionCandidateMutationRows must match owner action packet");
  }
  if ((rootParityOwnerActionPacket.summary?.focusRows ?? -1) !== 4) {
    failures.push("A22 root-parity owner action packet must keep 4 focus rows");
  }
  if ((rootParityOwnerActionPacket.summary?.recommendedActionRows ?? -1) !== 4) {
    failures.push("A22 root-parity owner action packet must keep 4 recommended action rows");
  }
  if ((rootParityOwnerActionPacket.summary?.recordedInstructionRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action packet must not record extraction instructions");
  }
  if ((rootParityOwnerActionPacket.summary?.rootCopyRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action packet must not copy root files");
  }
  if ((rootParityOwnerActionPacket.summary?.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action packet must not mutate candidate");
  }
  if ((rootParityOwnerActionPacket.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action packet must not authorize cleanup");
  }
  if ((rootParityOwnerActionPacket.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action packet must not make rows executable");
  }
  if (rootParityOwnerActionPacket.boundary?.recordsOwnerInput !== false) {
    failures.push("root-parity owner action packet must not record owner input");
  }
  if (rootParityOwnerActionPacket.boundary?.recordsExtractionInstruction !== false) {
    failures.push("root-parity owner action packet must not record extraction instruction");
  }
  if (rootParityOwnerActionPacket.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity owner action packet must not modify candidate");
  }
  if (rootParityOwnerActionPacket.boundary?.copiesRootFiles !== false) {
    failures.push("root-parity owner action packet must not copy root files");
  }
  if (rootParityOwnerActionPacket.boundary?.requiresOwnerReply !== true) {
    failures.push("root-parity owner action packet must require owner reply");
  }
  if (rootParityOwnerActionPacket.boundary?.requiresSeparateRecordingStep !== true) {
    failures.push("root-parity owner action packet must require a separate recording step");
  }
  if (rootParityOwnerActionPacket.boundary?.requiresSeparateCandidateMutationInstruction !== true) {
    failures.push("root-parity owner action packet must require a separate candidate mutation instruction");
  }
  const rootParityOwnerActionAcceptanceDocketRow = validationById(validationRows, "candidate-root-parity-owner-action-acceptance-docket");
  if (!rootParityOwnerActionAcceptanceDocketRow) failures.push("missing validation row: candidate-root-parity-owner-action-acceptance-docket");
  if (rootParityOwnerActionAcceptanceDocketRow && rootParityOwnerActionAcceptanceDocketRow.passed !== [
    "waiting-for-owner-action",
    "ready-for-extraction-instruction-recording",
    "ready-for-guarded-extraction",
    "post-extraction-verified"
  ].includes(rootParityOwnerActionAcceptanceDocket.acceptanceStatus)) {
    failures.push("candidate-root-parity-owner-action-acceptance-docket row must match A22 acceptance docket evidence");
  }
  if (![
    "waiting-for-owner-action",
    "ready-for-extraction-instruction-recording",
    "ready-for-guarded-extraction",
    "post-extraction-verified",
    ...(isRecoveryCandidate ? ["not-ready-check-failures"] : [])
  ].includes(rootParityOwnerActionAcceptanceDocket.acceptanceStatus)) {
    failures.push("A22 root-parity owner action acceptance docket must be waiting, recording-ready, guarded-ready, or verified");
  }
  if ((summary.rootParityOwnerActionAcceptanceDocketStatus ?? "") !== (rootParityOwnerActionAcceptanceDocket.acceptanceStatus ?? "")) {
    failures.push("summary.rootParityOwnerActionAcceptanceDocketStatus must match acceptance docket");
  }
  if ((summary.rootParityOwnerActionAcceptanceRows ?? -1) !== (rootParityOwnerActionAcceptanceDocket.summary?.acceptanceRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionAcceptanceRows must match acceptance docket");
  }
  if ((summary.rootParityOwnerActionAcceptedRows ?? -1) !== (rootParityOwnerActionAcceptanceDocket.summary?.acceptedRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionAcceptedRows must match acceptance docket");
  }
  if (summary.rootParityOwnerActionAcceptanceOwnerInputBlank !== (rootParityOwnerActionAcceptanceDocket.summary?.ownerInputBlank === true)) {
    failures.push("summary.rootParityOwnerActionAcceptanceOwnerInputBlank must match acceptance docket");
  }
  if ((summary.rootParityOwnerActionAcceptanceRecordedInstructionRows ?? -1) !== (rootParityOwnerActionAcceptanceDocket.summary?.recordedInstructionRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionAcceptanceRecordedInstructionRows must match acceptance docket");
  }
  if ((summary.rootParityOwnerActionAcceptanceRootCopyRows ?? -1) !== (rootParityOwnerActionAcceptanceDocket.summary?.rootCopyRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionAcceptanceRootCopyRows must match acceptance docket");
  }
  if ((summary.rootParityOwnerActionAcceptanceCandidateMutationRows ?? -1) !== (rootParityOwnerActionAcceptanceDocket.summary?.candidateMutationRows ?? 0)) {
    failures.push("summary.rootParityOwnerActionAcceptanceCandidateMutationRows must match acceptance docket");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.acceptanceRows ?? -1) !== 4) {
    failures.push("A22 root-parity owner action acceptance docket must keep 4 acceptance rows");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.recordedInstructionRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action acceptance docket must not record extraction instructions");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.rootCopyRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action acceptance docket must not copy root files");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.candidateMutationRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action acceptance docket must not mutate candidate");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.cleanupAuthorizedRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action acceptance docket must not authorize cleanup");
  }
  if ((rootParityOwnerActionAcceptanceDocket.summary?.executableRows ?? -1) !== 0) {
    failures.push("A22 root-parity owner action acceptance docket must not make rows executable");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.recordsOwnerInput !== false) {
    failures.push("root-parity owner action acceptance docket must not record owner input");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.recordsExtractionInstruction !== false) {
    failures.push("root-parity owner action acceptance docket must not record extraction instruction");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.modifiesCandidate !== false) {
    failures.push("root-parity owner action acceptance docket must not modify candidate");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.copiesRootFiles !== false) {
    failures.push("root-parity owner action acceptance docket must not copy root files");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.requiresOwnerReply !== true) {
    failures.push("root-parity owner action acceptance docket must require owner reply");
  }
  if (rootParityOwnerActionAcceptanceDocket.boundary?.requiresSeparateRecordingStep !== true) {
    failures.push("root-parity owner action acceptance docket must require a separate recording step");
  }
  const acceptanceRequiresSeparateCandidateMutationInstruction =
    rootParityOwnerActionAcceptanceDocket.acceptanceStatus !== "post-extraction-verified";
  if (rootParityOwnerActionAcceptanceDocket.boundary?.requiresSeparateCandidateMutationInstruction !== acceptanceRequiresSeparateCandidateMutationInstruction) {
    failures.push("root-parity owner action acceptance docket separate candidate mutation instruction boundary must match acceptance status");
  }
  if (buildSnapshot.boundary?.rerunsBuild !== false) failures.push("build snapshot current evidence must not rerun build");
  if (buildSnapshot.boundary?.deploys !== false) failures.push("build snapshot current evidence must not authorize deploy");
  if (buildSnapshot.boundary?.cleanupAuthorized !== false) failures.push("build snapshot current evidence must not authorize cleanup");
  for (const requiredRow of [
    "resync-review",
    "clean-source-promotion-instruction",
    "merge-instruction"
  ]) {
    const row = validationById(validationRows, requiredRow);
    if (!row) failures.push(`missing validation row: ${requiredRow}`);
    if (row?.passed !== false) failures.push(`${requiredRow} must remain unpassed`);
  }
  if ((summary.pendingCanonicalAuthorizationRows ?? -1) !== (exitCriteria.summary?.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary.pendingCanonicalAuthorizationRows must match validate-to-merge exit criteria");
  }
  if ((summary.directFailedMergeChecks ?? -1) !== (exitCriteria.summary?.directFailedMergeChecks ?? 0)) {
    failures.push("summary.directFailedMergeChecks must match validate-to-merge exit criteria");
  }
  if (runway.summary?.releaseSourceEligibleNow !== false) failures.push("A22 runway must still report no eligible release source");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["readsArchiveEvidenceOnly", !isRecoveryCandidate],
    ["createsClone", false],
    ["createsWorktree", false],
    ["selectsReleaseSource", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
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
    "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Review Packet",
    "This packet makes the top candidate reviewable, not deployable",
    "Build passed",
    "Build blockers routed",
    "Root-parity extraction plan",
    "Root-parity instruction request",
    "Root-parity instruction intake",
    "Root-parity instruction recording",
    "Root-parity guarded extraction",
    "Root-parity owner action packet",
    "Root-parity owner action acceptance docket",
    "Archived Evidence",
    "Changed Files",
    "Validation Matrix",
    "Required Next Evidence Before Promotion"
  ]) {
    if (!markdown.includes(needle)) failures.push(`review packet markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("review packet markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    packetStatus: recorded.packetStatus,
    topCandidateBranch: topCandidate.branch ?? "",
    gitArchiveEvidenceReady: summary.gitArchiveEvidenceReady === true,
    promotionEligibleNow: summary.promotionEligibleNow === true,
    releaseSourceSelected: summary.releaseSourceSelected === true,
    changedFiles: summary.changedFiles ?? 0,
    validationRows: summary.validationRows ?? 0,
    passedValidationRows: summary.passedValidationRows ?? 0,
    missingPromotionGateRows: summary.missingPromotionGateRows ?? 0,
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
    console.log("A22 top clean candidate review packet gate");
    console.log(`Packet status: ${payload.packetStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Git/archive evidence ready: ${payload.gitArchiveEvidenceReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate review packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
