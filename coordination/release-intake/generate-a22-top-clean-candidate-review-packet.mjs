#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS } from "./generate-a22-top-clean-candidate-build-snapshot.mjs";
import { TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS } from "./generate-a22-top-clean-candidate-build-blocker-routing.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS } from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS } from "./run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS } from "./run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS } from "./generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs";
import { TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS } from "./generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_REVIEW_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  topCleanCandidateFocusedSmoke: "coordination/release-intake/latest-A22-top-clean-candidate-focused-smoke.json",
  topCleanCandidateTypeCheck: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
  topCleanCandidateBuildSnapshot: TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestJson,
  topCleanCandidateBuildBlockerRouting: TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestJson,
  topCleanCandidateRootParityExtractionPlan: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson,
  topCleanCandidateRootParityExtractionInstructionRequest: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson,
  topCleanCandidateRootParityExtractionInstructionIntake: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_INTAKE_PATHS.latestJson,
  topCleanCandidateRootParityExtractionInstructionRecording: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_RECORDING_PATHS.latestDryRunJson,
  topCleanCandidateRootParityGuardedExtraction: TOP_CLEAN_CANDIDATE_ROOT_PARITY_GUARDED_EXTRACTION_PATHS.latestDryRunJson,
  topCleanCandidateRootParityOwnerActionPacket: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_PACKET_PATHS.latestJson,
  topCleanCandidateRootParityOwnerActionAcceptanceDocket: TOP_CLEAN_CANDIDATE_ROOT_PARITY_OWNER_ACTION_ACCEPTANCE_DOCKET_PATHS.latestJson,
  cleanReleaseSourceRunway: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  cleanDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-review-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-review-packet.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-review-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-review-packet.md`
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

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, TOP_CLEAN_CANDIDATE_REVIEW_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_REVIEW_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function evidenceFile(pathKey, relativePath, expectedSha = "") {
  if (!relativePath || !exists(relativePath)) {
    return {
      key: pathKey,
      path: relativePath || "",
      exists: false,
      bytes: 0,
      lines: 0,
      sha256: "",
      expectedSha256: expectedSha,
      shaMatchesExpected: expectedSha ? false : null,
      preview: []
    };
  }
  const text = readText(relativePath);
  const digest = sha256(text);
  return {
    key: pathKey,
    path: relativePath,
    exists: true,
    bytes: Buffer.byteLength(text),
    lines: lineCount(text),
    sha256: digest,
    expectedSha256: expectedSha,
    shaMatchesExpected: expectedSha ? digest === expectedSha : null,
    preview: text.trim().split("\n").filter(Boolean).slice(0, 8)
  };
}

function archiveEntryFor(manifest, branch) {
  return (manifest.archivedBranches ?? []).find((entry) => entry.branch === branch) ?? null;
}

function changedFilesFromNameStatus(text) {
  return text.trim().split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, filePath] = line.split(/\t+/);
      return { status: status ?? "", path: filePath ?? "" };
    });
}

function changedFilesFromAllowedDirtyRows(rows) {
  return (rows ?? []).map((line) => ({
    status: line.slice(0, 2).trim() || "??",
    path: line.slice(3)
  }));
}

function buildEvidenceFiles(entry) {
  return [
    evidenceFile("status", entry?.status ?? ""),
    evidenceFile("aheadLog", entry?.aheadLog ?? ""),
    evidenceFile("nameStatus", entry?.nameStatus ?? ""),
    evidenceFile("diffstat", entry?.diffstat ?? ""),
    evidenceFile("patch", entry?.patch ?? "", entry?.patchSha256 ?? ""),
    evidenceFile("untracked", entry?.untracked ?? ""),
    evidenceFile("metadata", entry?.metadata ?? "")
  ];
}

function validationRows({ entry, evidenceFiles, promotion, focusedSmoke, typeCheck, buildSnapshot, buildBlockerRouting, rootParityExtractionPlan, rootParityExtractionInstructionRequest, rootParityExtractionInstructionIntake, rootParityExtractionInstructionRecording, rootParityGuardedExtraction, rootParityOwnerActionPacket, rootParityOwnerActionAcceptanceDocket, exitCriteria, changedFiles, isRecoveryCandidate, recoveryEvidenceReady, candidateDivergence }) {
  const filesExist = evidenceFiles.every((file) => file.exists);
  const patch = evidenceFiles.find((file) => file.key === "patch");
  const status = evidenceFiles.find((file) => file.key === "status");
  const untracked = evidenceFiles.find((file) => file.key === "untracked");
  const ahead = count(entry?.divergence?.ahead ?? candidateDivergence?.ahead);
  const behind = count(entry?.divergence?.behind ?? candidateDivergence?.behind);
  const gitArchiveEvidenceReady = Boolean(
    isRecoveryCandidate
      ? recoveryEvidenceReady
      : entry &&
        filesExist &&
        entry.statusEntries === 0 &&
        entry.untrackedEntries === 0 &&
        ahead > 0 &&
        patch?.shaMatchesExpected === true &&
        status?.preview?.[0] === "clean" &&
        untracked?.preview?.[0] === "none"
  );
  const buildPassed = buildSnapshot.summary?.buildPassed === true;
  const buildExitStatus = buildSnapshot.summary?.exitStatus ?? "unknown";
  const buildFailureCategory = buildSnapshot.summary?.failureCategory ?? "unknown";
  const buildConfirmedModuleBlockerRows = count(buildSnapshot.summary?.confirmedModuleBlockerRows);
  const buildModuleBlockerRows = count(buildSnapshot.summary?.moduleBlockerRows);

  return [
    {
      id: "git-archive-evidence",
      owner: "A25 git hygiene and release intake",
      status: gitArchiveEvidenceReady ? "passed" : "blocked",
      passed: gitArchiveEvidenceReady,
      detail: gitArchiveEvidenceReady
        ? isRecoveryCandidate
          ? "Top controlled recovery candidate has bounded dirty status, guarded extraction, and candidate mutation evidence."
          : "Top clean candidate has archived status, ahead-log, name-status, diffstat, patch, and untracked evidence."
        : isRecoveryCandidate
          ? "Top controlled recovery candidate evidence is missing or inconsistent."
          : "Top clean candidate archive evidence is missing or inconsistent.",
      evidence: evidenceFiles.map((file) => file.path).filter(Boolean)
    },
    {
      id: "resync-review",
      owner: "A22 production reliability and release engineering",
      status: behind > 0 ? "blocked" : "ready",
      passed: behind === 0,
      detail: behind > 0
        ? `Top candidate is behind main by ${behind} commit(s); review or resync is required before promotion.`
        : "Top candidate is not behind main.",
      evidence: [`behind=${behind}`, `ahead=${ahead}`]
    },
    {
      id: "candidate-change-scope-review",
      owner: "A22 production reliability and release engineering",
      status: changedFiles.length > 0 ? "ready-for-human-review" : "blocked",
      passed: changedFiles.length > 0,
      detail: `${changedFiles.length} changed file(s) are captured for human review; this does not validate runtime behavior.`,
      evidence: changedFiles.map((row) => `${row.status} ${row.path}`)
    },
    {
      id: "candidate-type-check",
      owner: "A22 production reliability and release engineering",
      status: typeCheck.summary?.typeCheckPassed === true ? "passed" : "failed",
      passed: typeCheck.summary?.typeCheckPassed === true,
      detail: typeCheck.summary?.typeCheckPassed === true
        ? "Candidate-specific npm run type-check passed in the top clean candidate worktree."
        : `Candidate-specific npm run type-check failed with ${typeCheck.summary?.errorLineCount ?? 0} TypeScript error line(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
        `exitStatus=${typeCheck.summary?.exitStatus ?? "unknown"}`,
        `errorLineCount=${typeCheck.summary?.errorLineCount ?? 0}`,
        `mutationDetected=${typeCheck.summary?.mutationDetected === true}`,
        `tsbuildInfoPresentAfter=${typeCheck.summary?.tsbuildInfoPresentAfter === true}`,
        `nextBuildDirPresentAfter=${typeCheck.summary?.nextBuildDirPresentAfter === true}`
      ]
    },
    {
      id: "candidate-build",
      owner: "A22 production reliability and release engineering",
      status: buildPassed ? "passed" : "failed",
      passed: buildPassed,
      detail: buildPassed
        ? "Candidate-specific npm run build passed in the top clean candidate worktree."
        : buildSnapshot.summary?.buildRefreshRequired === true
          ? "Previous module-resolution blockers are resolved; a fresh escalated build observation is required before build can be promoted."
          : `Candidate-specific npm run build failed with ${buildConfirmedModuleBlockerRows}/${buildModuleBlockerRows} confirmed module-resolution blocker row(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-build-snapshot.json",
        `exitStatus=${buildExitStatus}`,
        `failureCategory=${buildFailureCategory}`,
        `confirmedModuleBlockerRows=${buildConfirmedModuleBlockerRows}`,
        `moduleBlockerRows=${buildModuleBlockerRows}`,
        `nextDirPresent=${buildSnapshot.summary?.nextDirPresent === true}`,
        `cleanupAuthorizedRows=${buildSnapshot.summary?.cleanupAuthorizedRows ?? 0}`
      ]
    },
    {
      id: "candidate-build-blocker-routing",
      owner: "A25 git hygiene and release intake, coordinating A22 build blockers",
      status: buildBlockerRouting.summary?.allBuildBlockersRouted === true || buildBlockerRouting.summary?.allPreviousBlockersResolved === true ? "passed" : "blocked",
      passed: buildBlockerRouting.summary?.allBuildBlockersRouted === true || buildBlockerRouting.summary?.allPreviousBlockersResolved === true,
      detail: buildBlockerRouting.summary?.allPreviousBlockersResolved === true
        ? "Previous A22 module-resolution blockers are resolved; fresh build observation is now the blocker."
        : buildBlockerRouting.summary?.allBuildBlockersRouted === true
          ? `A22 build blockers are routed to ${buildBlockerRouting.summary?.routeGroupRows ?? 0} owner group(s); routing remains non-executable.`
          : "A22 build blockers are not yet owner-routed.",
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-build-blocker-routing.json",
        `moduleBlockerRows=${buildBlockerRouting.summary?.moduleBlockerRows ?? 0}`,
        `confirmedModuleBlockerRows=${buildBlockerRouting.summary?.confirmedModuleBlockerRows ?? 0}`,
        `routeGroupRows=${buildBlockerRouting.summary?.routeGroupRows ?? 0}`,
        `rootParitySourceRows=${buildBlockerRouting.summary?.rootParitySourceRows ?? 0}`,
        `cleanupAuthorizedRows=${buildBlockerRouting.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${buildBlockerRouting.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-extraction-plan",
      owner: "A25 git hygiene and release intake, coordinating A06/A20/A05 owner extraction review",
      status: rootParityExtractionPlan.planStatus === "reviewable-non-executable" ? "passed" : "blocked",
      passed: rootParityExtractionPlan.planStatus === "reviewable-non-executable",
      detail: rootParityExtractionPlan.planStatus === "reviewable-non-executable"
        ? `Root parity extraction plan covers ${rootParityExtractionPlan.summary?.blockerRowsCovered ?? 0} blocker row(s) across ${rootParityExtractionPlan.summary?.extractionUnitRows ?? 0} owner-reviewed extraction unit(s).`
        : "Root parity extraction plan is not yet reviewable.",
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-plan.json",
        `planStatus=${rootParityExtractionPlan.planStatus ?? "unknown"}`,
        `blockerRowsCovered=${rootParityExtractionPlan.summary?.blockerRowsCovered ?? 0}`,
        `extractionUnitRows=${rootParityExtractionPlan.summary?.extractionUnitRows ?? 0}`,
        `rootSourcesAvailable=${rootParityExtractionPlan.summary?.rootSourcesAvailable ?? 0}`,
        `candidateTargetsMissing=${rootParityExtractionPlan.summary?.candidateTargetsMissing ?? 0}`,
        `cleanupAuthorizedRows=${rootParityExtractionPlan.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityExtractionPlan.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-extraction-instruction-request",
      owner: "A25 git hygiene and release intake, coordinating A22/A06/A20/A05 extraction instruction review",
      status: rootParityExtractionInstructionRequest.requestStatus === "waiting-for-owner-execution-instruction" ? "passed" : "blocked",
      passed: rootParityExtractionInstructionRequest.requestStatus === "waiting-for-owner-execution-instruction",
      detail: rootParityExtractionInstructionRequest.requestStatus === "waiting-for-owner-execution-instruction"
        ? `Root-parity extraction instruction request prepares ${rootParityExtractionInstructionRequest.summary?.instructionRows ?? 0} owner instruction row(s), still non-executable.`
        : "Root-parity extraction instruction request is not ready for owner review.",
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-request.json",
        `requestStatus=${rootParityExtractionInstructionRequest.requestStatus ?? "unknown"}`,
        `instructionRows=${rootParityExtractionInstructionRequest.summary?.instructionRows ?? 0}`,
        `readyForOwnerInstructionRows=${rootParityExtractionInstructionRequest.summary?.readyForOwnerInstructionRows ?? 0}`,
        `blockerRowsCovered=${rootParityExtractionInstructionRequest.summary?.blockerRowsCovered ?? 0}`,
        `cleanupAuthorizedRows=${rootParityExtractionInstructionRequest.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityExtractionInstructionRequest.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-extraction-instruction-intake",
      owner: "A25 git hygiene and release intake, coordinating A22 owner input readiness",
      status: ["waiting-for-owner-input", "ready-to-record-extraction-instruction-rows"].includes(rootParityExtractionInstructionIntake.intakeStatus) ? "passed" : "blocked",
      passed: ["waiting-for-owner-input", "ready-to-record-extraction-instruction-rows"].includes(rootParityExtractionInstructionIntake.intakeStatus),
      detail: rootParityExtractionInstructionIntake.intakeStatus === "ready-to-record-extraction-instruction-rows"
        ? `Owner input validates ${rootParityExtractionInstructionIntake.summary?.proposedInstructionRows ?? 0} extraction instruction row(s), still not recorded or executed.`
        : `Owner input scaffold is current and waiting; ${rootParityExtractionInstructionIntake.summary?.waitingOwnerInputChecks ?? 0} owner-input check(s) remain waiting.`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-intake.json",
        `intakeStatus=${rootParityExtractionInstructionIntake.intakeStatus ?? "unknown"}`,
        `ownerInputBlank=${rootParityExtractionInstructionIntake.ownerInputBlank === true}`,
        `expectedRows=${rootParityExtractionInstructionIntake.summary?.expectedRows ?? 0}`,
        `proposedInstructionRows=${rootParityExtractionInstructionIntake.summary?.proposedInstructionRows ?? 0}`,
        `recordsExtractionInstructionRows=${rootParityExtractionInstructionIntake.summary?.recordsExtractionInstructionRows ?? 0}`,
        `modifiesCandidateRows=${rootParityExtractionInstructionIntake.summary?.modifiesCandidateRows ?? 0}`,
        `cleanupAuthorizedRows=${rootParityExtractionInstructionIntake.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityExtractionInstructionIntake.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-extraction-instruction-recording",
      owner: "A25 git hygiene and release intake, coordinating A22 extraction instruction recording",
      status: [
        "dry-run-blocked-owner-input",
        "dry-run-ready-requires-explicit-apply",
        "already-recorded"
      ].includes(rootParityExtractionInstructionRecording.recorderStatus) ? "passed" : "blocked",
      passed: [
        "dry-run-blocked-owner-input",
        "dry-run-ready-requires-explicit-apply",
        "already-recorded"
      ].includes(rootParityExtractionInstructionRecording.recorderStatus),
      detail: rootParityExtractionInstructionRecording.recorderStatus === "dry-run-ready-requires-explicit-apply"
        ? `Recording dry-run validates ${rootParityExtractionInstructionRecording.summary?.proposedInstructionRows ?? 0} extraction instruction row(s); explicit apply-recording is still required.`
        : `Recording dry-run is fail-closed at ${rootParityExtractionInstructionRecording.recorderStatus ?? "unknown"} with ${rootParityExtractionInstructionRecording.summary?.recordsExtractionInstructionRows ?? 0} recorded row(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-recording-dry-run.json",
        `recorderStatus=${rootParityExtractionInstructionRecording.recorderStatus ?? "unknown"}`,
        `intakeStatus=${rootParityExtractionInstructionRecording.intakeStatus ?? "unknown"}`,
        `expectedRows=${rootParityExtractionInstructionRecording.summary?.expectedRows ?? 0}`,
        `proposedInstructionRows=${rootParityExtractionInstructionRecording.summary?.proposedInstructionRows ?? 0}`,
        `recordsExtractionInstructionRows=${rootParityExtractionInstructionRecording.summary?.recordsExtractionInstructionRows ?? 0}`,
        `modifiesCandidateRows=${rootParityExtractionInstructionRecording.summary?.modifiesCandidateRows ?? 0}`,
        `cleanupAuthorizedRows=${rootParityExtractionInstructionRecording.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityExtractionInstructionRecording.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-guarded-extraction",
      owner: "A25 git hygiene and release intake, coordinating A22 guarded extraction preflight",
      status: [
        "dry-run-blocked-missing-recorded-instructions",
        "dry-run-ready-requires-explicit-apply",
        "already-extracted-and-verified"
      ].includes(rootParityGuardedExtraction.executorStatus) ? "passed" : "blocked",
      passed: [
        "dry-run-blocked-missing-recorded-instructions",
        "dry-run-ready-requires-explicit-apply",
        "already-extracted-and-verified"
      ].includes(rootParityGuardedExtraction.executorStatus),
      detail: rootParityGuardedExtraction.executorStatus === "dry-run-ready-requires-explicit-apply"
        ? `Guarded extraction preflight sees ${rootParityGuardedExtraction.summary?.recordedInstructionRows ?? 0} recorded instruction row(s); explicit owner apply remains separate.`
        : `Guarded extraction dry-run is fail-closed at ${rootParityGuardedExtraction.executorStatus ?? "unknown"} with ${rootParityGuardedExtraction.summary?.candidateMutationRows ?? 0} candidate mutation row(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-guarded-extraction-dry-run.json",
        `executorStatus=${rootParityGuardedExtraction.executorStatus ?? "unknown"}`,
        `recordedInstructionRows=${rootParityGuardedExtraction.summary?.recordedInstructionRows ?? 0}`,
        `candidateTargetsMissing=${rootParityGuardedExtraction.summary?.candidateTargetsMissing ?? 0}`,
        `candidateGitStatusRows=${rootParityGuardedExtraction.summary?.candidateGitStatusRows ?? 0}`,
        `rootCopyRows=${rootParityGuardedExtraction.summary?.rootCopyRows ?? 0}`,
        `candidateMutationRows=${rootParityGuardedExtraction.summary?.candidateMutationRows ?? 0}`,
        `cleanupAuthorizedRows=${rootParityGuardedExtraction.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityGuardedExtraction.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-owner-action-packet",
      owner: "A25 git hygiene and release intake, coordinating A22/A06/A20/A05 owner action focus",
      status: [
        "waiting-for-owner-action",
        "ready-for-extraction-instruction-recording",
        "ready-for-guarded-extraction",
        "post-extraction-verified"
      ].includes(rootParityOwnerActionPacket.focusStatus) ? "passed" : "blocked",
      passed: [
        "waiting-for-owner-action",
        "ready-for-extraction-instruction-recording",
        "ready-for-guarded-extraction",
        "post-extraction-verified"
      ].includes(rootParityOwnerActionPacket.focusStatus),
      detail: rootParityOwnerActionPacket.focusStatus === "waiting-for-owner-action"
        ? `Owner action packet narrows ${rootParityOwnerActionPacket.summary?.focusRows ?? 0} root-parity row(s) into selectedAction preview text, still non-executable.`
        : `Owner action packet status is ${rootParityOwnerActionPacket.focusStatus ?? "unknown"} with ${rootParityOwnerActionPacket.summary?.candidateMutationRows ?? 0} candidate mutation row(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
        `focusStatus=${rootParityOwnerActionPacket.focusStatus ?? "unknown"}`,
        `focusRows=${rootParityOwnerActionPacket.summary?.focusRows ?? 0}`,
        `recommendedActionRows=${rootParityOwnerActionPacket.summary?.recommendedActionRows ?? 0}`,
        `ownerInputBlank=${rootParityOwnerActionPacket.summary?.ownerInputBlank === true}`,
        `recordedInstructionRows=${rootParityOwnerActionPacket.summary?.recordedInstructionRows ?? 0}`,
        `rootCopyRows=${rootParityOwnerActionPacket.summary?.rootCopyRows ?? 0}`,
        `candidateMutationRows=${rootParityOwnerActionPacket.summary?.candidateMutationRows ?? 0}`,
        `cleanupAuthorizedRows=${rootParityOwnerActionPacket.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityOwnerActionPacket.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-root-parity-owner-action-acceptance-docket",
      owner: "A25 git hygiene and release intake, coordinating A22 owner action acceptance validation",
      status: [
        "waiting-for-owner-action",
        "ready-for-extraction-instruction-recording",
        "ready-for-guarded-extraction",
        "post-extraction-verified"
      ].includes(rootParityOwnerActionAcceptanceDocket.acceptanceStatus) ? "passed" : "blocked",
      passed: [
        "waiting-for-owner-action",
        "ready-for-extraction-instruction-recording",
        "ready-for-guarded-extraction",
        "post-extraction-verified"
      ].includes(rootParityOwnerActionAcceptanceDocket.acceptanceStatus),
      detail: rootParityOwnerActionAcceptanceDocket.acceptanceStatus === "waiting-for-owner-action"
        ? `Owner action acceptance docket keeps ${rootParityOwnerActionAcceptanceDocket.summary?.acceptanceRows ?? 0} root-parity row(s) waiting for owner input, still non-executable.`
        : `Owner action acceptance docket status is ${rootParityOwnerActionAcceptanceDocket.acceptanceStatus ?? "unknown"} with ${rootParityOwnerActionAcceptanceDocket.summary?.acceptedRows ?? 0} accepted row(s).`,
      evidence: [
        "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
        `acceptanceStatus=${rootParityOwnerActionAcceptanceDocket.acceptanceStatus ?? "unknown"}`,
        `acceptanceRows=${rootParityOwnerActionAcceptanceDocket.summary?.acceptanceRows ?? 0}`,
        `acceptedRows=${rootParityOwnerActionAcceptanceDocket.summary?.acceptedRows ?? 0}`,
        `ownerInputBlank=${rootParityOwnerActionAcceptanceDocket.summary?.ownerInputBlank === true}`,
        `recordedInstructionRows=${rootParityOwnerActionAcceptanceDocket.summary?.recordedInstructionRows ?? 0}`,
        `rootCopyRows=${rootParityOwnerActionAcceptanceDocket.summary?.rootCopyRows ?? 0}`,
        `candidateMutationRows=${rootParityOwnerActionAcceptanceDocket.summary?.candidateMutationRows ?? 0}`,
        `cleanupAuthorizedRows=${rootParityOwnerActionAcceptanceDocket.summary?.cleanupAuthorizedRows ?? 0}`,
        `executableRows=${rootParityOwnerActionAcceptanceDocket.summary?.executableRows ?? 0}`
      ]
    },
    {
      id: "candidate-focused-regression",
      owner: "A11 QA and A22 production reliability",
      status: focusedSmoke.summary?.smokePassed === true ? "passed" : "not-run",
      passed: focusedSmoke.summary?.smokePassed === true,
      detail: focusedSmoke.summary?.smokePassed === true
        ? "Focused Vercel region smoke passed in the top clean candidate worktree without dirtying it."
        : "A focused regression smoke for the candidate scope is required before promotion.",
      evidence: focusedSmoke.summary?.smokePassed === true
        ? [
            "coordination/release-intake/latest-A22-top-clean-candidate-focused-smoke.json",
            `tests=${focusedSmoke.summary?.tests ?? 0}`,
            `pass=${focusedSmoke.summary?.pass ?? 0}`,
            `fail=${focusedSmoke.summary?.fail ?? 0}`,
            `mutationDetected=${focusedSmoke.summary?.mutationDetected === true}`
          ]
        : ["A22/A11 must choose a focused smoke after candidate type/build gates are green."]
    },
    {
      id: "clean-source-promotion-instruction",
      owner: "Owner",
      status: "not-authorized",
      passed: false,
      detail: "No explicit owner instruction selects this candidate as the clean release source.",
      evidence: [`promotionEligibleNow=${promotion.summary?.promotionEligibleNow === true}`]
    },
    {
      id: "merge-instruction",
      owner: "Owner",
      status: "not-authorized",
      passed: false,
      detail: "No separate owner merge instruction is recorded.",
      evidence: [`readyForMerge=${exitCriteria.readyForMerge === true}`]
    }
  ];
}

export function buildTopCleanCandidateReviewPacket() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.dirtyMap),
    cleanSourceCandidatePromotion: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanSourceCandidatePromotion),
    topCleanCandidateFocusedSmoke: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateFocusedSmoke),
    topCleanCandidateTypeCheck: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateTypeCheck),
    topCleanCandidateBuildSnapshot: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateBuildSnapshot),
    topCleanCandidateBuildBlockerRouting: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateBuildBlockerRouting),
    topCleanCandidateRootParityExtractionPlan: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionPlan),
    topCleanCandidateRootParityExtractionInstructionRequest: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionRequest),
    topCleanCandidateRootParityExtractionInstructionIntake: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionIntake),
    topCleanCandidateRootParityExtractionInstructionRecording: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityExtractionInstructionRecording),
    topCleanCandidateRootParityGuardedExtraction: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityGuardedExtraction),
    topCleanCandidateRootParityOwnerActionPacket: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityOwnerActionPacket),
    topCleanCandidateRootParityOwnerActionAcceptanceDocket: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.topCleanCandidateRootParityOwnerActionAcceptanceDocket),
    cleanReleaseSourceRunway: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanReleaseSourceRunway),
    cleanDivergedManifest: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanDivergedManifest),
    validateToMergeExitCriteria: readJson(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.validateToMergeExitCriteria)
  };
  const rawSourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const topCandidate = artifacts.cleanSourceCandidatePromotion.topCandidate ?? null;
  const candidateRow = (artifacts.cleanSourceCandidatePromotion.candidateRows ?? [])
    .find((row) => row.branch === topCandidate?.branch && row.path === topCandidate?.path) ?? {};
  const isRecoveryCandidate = topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery";
  const expectedRecoveryStatusRows = isRecoveryCandidate ? (topCandidate?.allowedDirtyStatusRows ?? []).length : 0;
  const recoveryEvidenceReady = isRecoveryCandidate &&
    expectedRecoveryStatusRows >= 4 &&
    artifacts.topCleanCandidateFocusedSmoke.summary?.beforeStatusAllowed === true &&
    artifacts.topCleanCandidateFocusedSmoke.summary?.afterStatusAllowed === true &&
    artifacts.topCleanCandidateRootParityGuardedExtraction.executorStatus === "already-extracted-and-verified";
  const sourceFailures = recoveryEvidenceReady
    ? rawSourceFailures.filter((failure) => !failure.startsWith("topCleanCandidateRootParity"))
    : rawSourceFailures;
  const branch = topCandidate?.branch ?? "";
  const entry = archiveEntryFor(artifacts.cleanDivergedManifest, branch);
  const evidenceFiles = buildEvidenceFiles(entry);
  const nameStatusText = entry?.nameStatus && exists(entry.nameStatus) ? readText(entry.nameStatus) : "";
  const changedFiles = isRecoveryCandidate
    ? changedFilesFromAllowedDirtyRows(topCandidate?.allowedDirtyStatusRows ?? [])
    : changedFilesFromNameStatus(nameStatusText);
  const validation = validationRows({
    entry,
    evidenceFiles,
    promotion: artifacts.cleanSourceCandidatePromotion,
    focusedSmoke: artifacts.topCleanCandidateFocusedSmoke,
    typeCheck: artifacts.topCleanCandidateTypeCheck,
    buildSnapshot: artifacts.topCleanCandidateBuildSnapshot,
    buildBlockerRouting: artifacts.topCleanCandidateBuildBlockerRouting,
    rootParityExtractionPlan: artifacts.topCleanCandidateRootParityExtractionPlan,
    rootParityExtractionInstructionRequest: artifacts.topCleanCandidateRootParityExtractionInstructionRequest,
    rootParityExtractionInstructionIntake: artifacts.topCleanCandidateRootParityExtractionInstructionIntake,
    rootParityExtractionInstructionRecording: artifacts.topCleanCandidateRootParityExtractionInstructionRecording,
    rootParityGuardedExtraction: artifacts.topCleanCandidateRootParityGuardedExtraction,
    rootParityOwnerActionPacket: artifacts.topCleanCandidateRootParityOwnerActionPacket,
    rootParityOwnerActionAcceptanceDocket: artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket,
    exitCriteria: artifacts.validateToMergeExitCriteria,
    changedFiles,
    isRecoveryCandidate,
    recoveryEvidenceReady,
    candidateDivergence: candidateRow?.divergence ?? topCandidate?.divergence ?? { behind: 0, ahead: 0 }
  });
  const gitArchiveEvidenceReady = validation.find((row) => row.id === "git-archive-evidence")?.passed === true;
  const promotionEligibleNow = false;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    packetStatus: gitArchiveEvidenceReady
      ? isRecoveryCandidate ? "controlled-recovery-evidence-ready-promotion-blocked" : "git-evidence-ready-promotion-blocked"
      : "blocked-missing-git-evidence",
    topCandidate: {
      branch,
      path: topCandidate?.path ?? entry?.path ?? "",
      head: topCandidate?.head ?? entry?.head ?? "",
      promotionRank: topCandidate?.promotionRank ?? 0,
      promotionLane: topCandidate?.promotionLane ?? "",
      divergence: entry?.divergence ?? candidateRow?.divergence ?? topCandidate?.divergence ?? { behind: 0, ahead: 0 },
      archiveKind: entry?.archiveKind ?? "",
      statusEntries: isRecoveryCandidate ? (topCandidate?.allowedDirtyStatusRows ?? []).length : count(entry?.statusEntries),
      untrackedEntries: isRecoveryCandidate ? (topCandidate?.allowedDirtyStatusRows ?? []).length : count(entry?.untrackedEntries),
      allowedDirtyStatusRows: topCandidate?.allowedDirtyStatusRows ?? [],
      recoveryEvidenceReady,
      releaseSourceSelected: false,
      promotionEligibleNow
    },
    archiveEvidence: {
      manifestPath: TOP_CLEAN_CANDIDATE_REVIEW_PATHS.cleanDivergedManifest,
      manifestEntryFound: Boolean(entry),
      prefix: entry?.prefix ?? "",
      patchSha256: entry?.patchSha256 ?? "",
      patchBytes: count(entry?.patchBytes),
      evidenceFiles
    },
    changedFiles,
    validationRows: validation,
    requiredNextEvidenceBeforePromotion: [
      "A22 resync/review decision for the branch being behind main",
      "candidate-specific npm run type-check evidence",
      "candidate-specific npm run build green evidence after module blockers are fixed",
      "A22 build-blocker owner routing evidence stays current until the module blockers are fixed",
      "A22 root-parity extraction plan stays current until owners apply or reject each parity unit",
      "A22 root-parity extraction instruction request stays current until owners approve or reject each extraction unit",
      "A22 root-parity extraction instruction intake stays current until owner input is recorded and separately applied",
      "A22 root-parity extraction instruction recording dry-run stays current until owner input is complete and separately applied",
      "A22 root-parity guarded extraction dry-run stays current until recorded instructions exist and a separate owner apply is authorized",
      "A22 root-parity owner action packet stays current until the owner approves, rejects, or edits each selectedAction preview",
      "A22 root-parity owner action acceptance docket stays current until owner input is accepted into a separate recording dry-run",
      "candidate-specific focused regression smoke evidence",
      "explicit owner clean-source promotion instruction",
      "A22 clean-source selection record",
      "separate owner merge instruction"
    ],
    safeValidationCommands: [
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
    ],
    summary: {
      gitArchiveEvidenceReady,
      recoveryEvidenceReady,
      promotionEligibleNow,
      releaseSourceSelected: false,
      changedFiles: changedFiles.length,
      evidenceFiles: evidenceFiles.length,
      existingEvidenceFiles: evidenceFiles.filter((file) => file.exists).length,
      validationRows: validation.length,
      passedValidationRows: validation.filter((row) => row.passed).length,
      missingPromotionGateRows: validation.filter((row) => !row.passed).length,
      focusedSmokePassed: artifacts.topCleanCandidateFocusedSmoke.summary?.smokePassed === true,
      typeCheckPassed: artifacts.topCleanCandidateTypeCheck.summary?.typeCheckPassed === true,
      typeCheckErrorLineCount: count(artifacts.topCleanCandidateTypeCheck.summary?.errorLineCount),
      buildPassed: artifacts.topCleanCandidateBuildSnapshot.summary?.buildPassed === true,
      buildExitStatus: artifacts.topCleanCandidateBuildSnapshot.summary?.exitStatus ?? null,
      buildFailureCategory: artifacts.topCleanCandidateBuildSnapshot.summary?.failureCategory ?? "",
      buildConfirmedModuleBlockerRows: count(artifacts.topCleanCandidateBuildSnapshot.summary?.confirmedModuleBlockerRows),
      buildResolvedModuleBlockerRows: count(artifacts.topCleanCandidateBuildSnapshot.summary?.resolvedModuleBlockerRows),
      buildRefreshRequired: artifacts.topCleanCandidateBuildSnapshot.summary?.buildRefreshRequired === true,
      buildModuleBlockerRows: count(artifacts.topCleanCandidateBuildSnapshot.summary?.moduleBlockerRows),
      buildBlockersRouted: artifacts.topCleanCandidateBuildBlockerRouting.summary?.allBuildBlockersRouted === true,
      buildPreviousBlockersResolved: artifacts.topCleanCandidateBuildBlockerRouting.summary?.allPreviousBlockersResolved === true,
      buildBlockerRouteGroupRows: count(artifacts.topCleanCandidateBuildBlockerRouting.summary?.routeGroupRows),
      buildBlockerRootParitySourceRows: count(artifacts.topCleanCandidateBuildBlockerRouting.summary?.rootParitySourceRows),
      rootParityExtractionPlanStatus: artifacts.topCleanCandidateRootParityExtractionPlan.planStatus ?? "",
      rootParityExtractionUnits: count(artifacts.topCleanCandidateRootParityExtractionPlan.summary?.extractionUnitRows),
      rootParityBlockerRowsCovered: count(artifacts.topCleanCandidateRootParityExtractionPlan.summary?.blockerRowsCovered),
      rootParitySourcesAvailable: count(artifacts.topCleanCandidateRootParityExtractionPlan.summary?.rootSourcesAvailable),
      rootParityCandidateTargetsMissing: count(artifacts.topCleanCandidateRootParityExtractionPlan.summary?.candidateTargetsMissing),
      rootParityInstructionRequestStatus: artifacts.topCleanCandidateRootParityExtractionInstructionRequest.requestStatus ?? "",
      rootParityInstructionRows: count(artifacts.topCleanCandidateRootParityExtractionInstructionRequest.summary?.instructionRows),
      rootParityReadyForOwnerInstructionRows: count(artifacts.topCleanCandidateRootParityExtractionInstructionRequest.summary?.readyForOwnerInstructionRows),
      rootParityInstructionIntakeStatus: artifacts.topCleanCandidateRootParityExtractionInstructionIntake.intakeStatus ?? "",
      rootParityOwnerInputBlank: artifacts.topCleanCandidateRootParityExtractionInstructionIntake.ownerInputBlank === true,
      rootParityIntakeProposedInstructionRows: count(artifacts.topCleanCandidateRootParityExtractionInstructionIntake.summary?.proposedInstructionRows),
      rootParityIntakeWaitingOwnerInputChecks: count(artifacts.topCleanCandidateRootParityExtractionInstructionIntake.summary?.waitingOwnerInputChecks),
      rootParityInstructionRecordingStatus: artifacts.topCleanCandidateRootParityExtractionInstructionRecording.recorderStatus ?? "",
      rootParityRecordingProposedInstructionRows: count(artifacts.topCleanCandidateRootParityExtractionInstructionRecording.summary?.proposedInstructionRows),
      rootParityRecordingRecordedInstructionRows: count(artifacts.topCleanCandidateRootParityExtractionInstructionRecording.summary?.recordsExtractionInstructionRows),
      rootParityGuardedExtractionStatus: artifacts.topCleanCandidateRootParityGuardedExtraction.executorStatus ?? "",
      rootParityGuardedRecordedInstructionRows: count(artifacts.topCleanCandidateRootParityGuardedExtraction.summary?.recordedInstructionRows),
      rootParityGuardedCandidateTargetsMissing: count(artifacts.topCleanCandidateRootParityGuardedExtraction.summary?.candidateTargetsMissing),
      rootParityGuardedCandidateGitStatusRows: count(artifacts.topCleanCandidateRootParityGuardedExtraction.summary?.candidateGitStatusRows),
      rootParityGuardedRootCopyRows: count(artifacts.topCleanCandidateRootParityGuardedExtraction.summary?.rootCopyRows),
      rootParityGuardedCandidateMutationRows: count(artifacts.topCleanCandidateRootParityGuardedExtraction.summary?.candidateMutationRows),
      rootParityOwnerActionPacketStatus: artifacts.topCleanCandidateRootParityOwnerActionPacket.focusStatus ?? "",
      rootParityOwnerActionRows: count(artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.focusRows),
      rootParityOwnerActionRecommendedRows: count(artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.recommendedActionRows),
      rootParityOwnerActionOwnerInputBlank: artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.ownerInputBlank === true,
      rootParityOwnerActionRecordedInstructionRows: count(artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.recordedInstructionRows),
      rootParityOwnerActionRootCopyRows: count(artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.rootCopyRows),
      rootParityOwnerActionCandidateMutationRows: count(artifacts.topCleanCandidateRootParityOwnerActionPacket.summary?.candidateMutationRows),
      rootParityOwnerActionAcceptanceDocketStatus: artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.acceptanceStatus ?? "",
      rootParityOwnerActionAcceptanceRows: count(artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.acceptanceRows),
      rootParityOwnerActionAcceptedRows: count(artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.acceptedRows),
      rootParityOwnerActionAcceptanceOwnerInputBlank: artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.ownerInputBlank === true,
      rootParityOwnerActionAcceptanceRecordedInstructionRows: count(artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.recordedInstructionRows),
      rootParityOwnerActionAcceptanceRootCopyRows: count(artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.rootCopyRows),
      rootParityOwnerActionAcceptanceCandidateMutationRows: count(artifacts.topCleanCandidateRootParityOwnerActionAcceptanceDocket.summary?.candidateMutationRows),
      buildNextDirPresent: artifacts.topCleanCandidateBuildSnapshot.summary?.nextDirPresent === true,
      buildNextDirSizeMiB: count(artifacts.topCleanCandidateBuildSnapshot.summary?.nextDirSizeMiB),
      pendingCanonicalAuthorizationRows: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
      directFailedMergeChecks: count(artifacts.validateToMergeExitCriteria.summary?.directFailedMergeChecks),
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      readsArchiveEvidenceOnly: !isRecoveryCandidate,
      createsClone: false,
      createsWorktree: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      pushes: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableTopCleanCandidateReviewProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    packetStatus: payload.packetStatus,
    topCandidate: payload.topCandidate,
    archiveEvidence: payload.archiveEvidence,
    changedFiles: payload.changedFiles,
    validationRows: payload.validationRows,
    requiredNextEvidenceBeforePromotion: payload.requiredNextEvidenceBeforePromotion,
    safeValidationCommands: payload.safeValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function stableSourceArtifacts(sourceArtifacts) {
  return Object.fromEntries(Object.entries(sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const evidenceRows = payload.archiveEvidence.evidenceFiles.map((file) => (
    `| \`${cell(file.key)}\` | \`${cell(file.path)}\` | ${file.exists ? "yes" : "no"} | ${file.lines} | ${cell(file.shaMatchesExpected === null ? "n/a" : file.shaMatchesExpected ? "yes" : "no")} |`
  )).join("\n") || "| none | none | no | 0 | n/a |";
  const changedRows = payload.changedFiles.map((file) => (
    `| ${cell(file.status)} | \`${cell(file.path)}\` |`
  )).join("\n") || "| none | none |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";

  return `# A22 Top Clean Candidate Review Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is evidence-only. It packages the top A22 clean-source candidate for review using archived evidence that already exists in release-intake. It does not select a release source, run type-check, run build, run regression, create a clone, create or remove a worktree, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Packet status: ${payload.packetStatus}
- Top candidate branch: \`${payload.topCandidate.branch}\`
- Top candidate path: \`${payload.topCandidate.path}\`
- Promotion lane: ${payload.topCandidate.promotionLane}
- Divergence: behind ${payload.topCandidate.divergence.behind ?? 0}, ahead ${payload.topCandidate.divergence.ahead ?? 0}
- Git/archive evidence ready: ${payload.summary.gitArchiveEvidenceReady ? "yes" : "no"}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Changed files: ${payload.summary.changedFiles}
- Focused smoke passed: ${payload.summary.focusedSmokePassed ? "yes" : "no"}
- Type-check passed: ${payload.summary.typeCheckPassed ? "yes" : "no"}
- Type-check error lines: ${payload.summary.typeCheckErrorLineCount}
- Build passed: ${payload.summary.buildPassed ? "yes" : "no"}
- Build exit status: ${payload.summary.buildExitStatus}
- Build failure category: ${payload.summary.buildFailureCategory || "none"}
- Build module blockers confirmed: ${payload.summary.buildConfirmedModuleBlockerRows}/${payload.summary.buildModuleBlockerRows}
- Build blockers routed: ${payload.summary.buildBlockersRouted ? "yes" : "no"}
- Build blocker route groups: ${payload.summary.buildBlockerRouteGroupRows}
- Build blocker root parity rows: ${payload.summary.buildBlockerRootParitySourceRows}
- Root-parity extraction plan: ${payload.summary.rootParityExtractionPlanStatus || "none"}
- Root-parity extraction units: ${payload.summary.rootParityExtractionUnits}
- Root-parity blocker rows covered: ${payload.summary.rootParityBlockerRowsCovered}
- Root-parity sources available: ${payload.summary.rootParitySourcesAvailable}
- Root-parity candidate targets missing: ${payload.summary.rootParityCandidateTargetsMissing}
- Root-parity instruction request: ${payload.summary.rootParityInstructionRequestStatus || "none"}
- Root-parity instruction rows: ${payload.summary.rootParityInstructionRows}
- Root-parity ready-for-owner instruction rows: ${payload.summary.rootParityReadyForOwnerInstructionRows}
- Root-parity instruction intake: ${payload.summary.rootParityInstructionIntakeStatus || "none"}
- Root-parity owner input blank: ${payload.summary.rootParityOwnerInputBlank ? "yes" : "no"}
- Root-parity intake proposed instruction rows: ${payload.summary.rootParityIntakeProposedInstructionRows}
- Root-parity intake waiting owner-input checks: ${payload.summary.rootParityIntakeWaitingOwnerInputChecks}
- Root-parity instruction recording: ${payload.summary.rootParityInstructionRecordingStatus || "none"}
- Root-parity recording proposed instruction rows: ${payload.summary.rootParityRecordingProposedInstructionRows}
- Root-parity recording recorded instruction rows: ${payload.summary.rootParityRecordingRecordedInstructionRows}
- Root-parity guarded extraction: ${payload.summary.rootParityGuardedExtractionStatus || "none"}
- Root-parity guarded recorded instruction rows: ${payload.summary.rootParityGuardedRecordedInstructionRows}
- Root-parity guarded candidate targets missing: ${payload.summary.rootParityGuardedCandidateTargetsMissing}
- Root-parity guarded candidate git status rows: ${payload.summary.rootParityGuardedCandidateGitStatusRows}
- Root-parity guarded root copy rows: ${payload.summary.rootParityGuardedRootCopyRows}
- Root-parity guarded candidate mutation rows: ${payload.summary.rootParityGuardedCandidateMutationRows}
- Root-parity owner action packet: ${payload.summary.rootParityOwnerActionPacketStatus || "none"}
- Root-parity owner action rows: ${payload.summary.rootParityOwnerActionRows}
- Root-parity owner action recommended rows: ${payload.summary.rootParityOwnerActionRecommendedRows}
- Root-parity owner action input blank: ${payload.summary.rootParityOwnerActionOwnerInputBlank ? "yes" : "no"}
- Root-parity owner action recorded instruction rows: ${payload.summary.rootParityOwnerActionRecordedInstructionRows}
- Root-parity owner action root copy rows: ${payload.summary.rootParityOwnerActionRootCopyRows}
- Root-parity owner action candidate mutation rows: ${payload.summary.rootParityOwnerActionCandidateMutationRows}
- Root-parity owner action acceptance docket: ${payload.summary.rootParityOwnerActionAcceptanceDocketStatus || "none"}
- Root-parity owner action acceptance rows: ${payload.summary.rootParityOwnerActionAcceptanceRows}
- Root-parity owner action accepted rows: ${payload.summary.rootParityOwnerActionAcceptedRows}
- Root-parity owner action acceptance input blank: ${payload.summary.rootParityOwnerActionAcceptanceOwnerInputBlank ? "yes" : "no"}
- Root-parity owner action acceptance recorded instruction rows: ${payload.summary.rootParityOwnerActionAcceptanceRecordedInstructionRows}
- Root-parity owner action acceptance root copy rows: ${payload.summary.rootParityOwnerActionAcceptanceRootCopyRows}
- Root-parity owner action acceptance candidate mutation rows: ${payload.summary.rootParityOwnerActionAcceptanceCandidateMutationRows}
- Build .next present: ${payload.summary.buildNextDirPresent ? "yes" : "no"}
- Build .next size: ${payload.summary.buildNextDirSizeMiB} MiB
- Validation rows passed: ${payload.summary.passedValidationRows}/${payload.summary.validationRows}
- Missing promotion gate rows: ${payload.summary.missingPromotionGateRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Direct failed merge checks: ${payload.summary.directFailedMergeChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Archived Evidence

| Key | Path | Exists | Lines | SHA matches manifest |
| --- | --- | --- | ---: | --- |
${evidenceRows}

## Changed Files

| Status | Path |
| --- | --- |
${changedRows}

## Validation Matrix

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Required Next Evidence Before Promotion

${list(payload.requiredNextEvidenceBeforePromotion)}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

This packet makes the top candidate reviewable, not deployable. It keeps promotion, merge, deployment, cleanup, destructive Git, and physical lifecycle cleanup non-executable.
`;
}

function main() {
  const payload = buildTopCleanCandidateReviewPacket();
  write(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_REVIEW_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate review packet generated");
  console.log(`Packet status: ${payload.packetStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Git/archive evidence ready: ${payload.summary.gitArchiveEvidenceReady ? "yes" : "no"}`);
  console.log(`Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
