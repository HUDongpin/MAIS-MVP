#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanReleaseSourceRunway: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  cleanCandidateGateCoverageMatrix: "coordination/release-intake/latest-A22-clean-candidate-gate-coverage-matrix.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  ownerActionPacket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
  ownerActionAcceptanceDocket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
  candidateMutationDryRun: "coordination/release-intake/latest-A22-root-parity-candidate-mutation-dry-run.json",
  fallbackCandidateValidationSnapshot: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-snapshot.json",
  latestJson: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestMarkdown: "coordination/release-intake/latest-A22-clean-source-validation-queue.md",
  datedJson: `coordination/release-intake/${date}-A22-clean-source-validation-queue.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-clean-source-validation-queue.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readOptionalJson(relativePath) {
  const filePath = absolute(relativePath);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
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
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts)
    .filter(([, payload]) => Boolean(payload))
    .map(([key, payload]) => [
      key,
      artifactStamp(key, A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS[key], payload)
    ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .filter(([, payload]) => Boolean(payload))
    .map(([key, payload]) => artifactStamp(key, A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function sameCandidate(left, right) {
  return left?.branch === right?.branch &&
    left?.path === right?.path &&
    left?.head === right?.head;
}

function topCandidate(artifacts) {
  return artifacts.cleanCandidateGateCoverageMatrix.topCandidate ??
    artifacts.cleanSourceCandidatePromotion.topCandidate ??
    {};
}

function topQueueStatus({ matrix, acceptanceDocket, candidateMutation }) {
  if (matrix.summary?.topCandidateGateStatus !== "top-candidate-gates-red") {
    return "candidate-gate-state-changed";
  }
  if (candidateMutation.executorStatus === "already-extracted-and-verified" &&
    matrix.summary?.focusedSmokePassed === true &&
    matrix.summary?.typeCheckPassed === false &&
    matrix.summary?.buildRefreshRequired === true) {
    return "needs-typecheck-remediation-and-fresh-build-observation";
  }
  if (candidateMutation.executorStatus === "already-extracted-and-verified" &&
    matrix.summary?.focusedSmokePassed === true &&
    matrix.summary?.typeCheckPassed === false) {
    return "needs-typecheck-remediation-before-clean-source";
  }
  if (candidateMutation.executorStatus === "already-extracted-and-verified" &&
    matrix.summary?.focusedSmokePassed === true &&
    matrix.summary?.typeCheckPassed === true &&
    matrix.summary?.buildRefreshRequired === true) {
    return "needs-fresh-build-observation-before-clean-source";
  }
  if (acceptanceDocket.acceptanceStatus === "waiting-for-owner-action") {
    return "needs-root-parity-owner-input-before-rerun";
  }
  if (acceptanceDocket.acceptanceStatus === "ready-for-extraction-instruction-recording") {
    return "ready-for-extraction-instruction-recording-before-rerun";
  }
  if (acceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction") {
    if (candidateMutation.executorStatus === "dry-run-blocked-owner-candidate-mutation-input") {
      return "needs-candidate-mutation-owner-input-before-rerun";
    }
    if (candidateMutation.executorStatus === "dry-run-ready-requires-explicit-apply") {
      return "ready-for-candidate-mutation-apply-before-rerun";
    }
    if (candidateMutation.executorStatus === "already-extracted-and-verified") {
      return "ready-for-candidate-gate-rerun-after-extraction";
    }
    return "ready-for-guarded-extraction-before-rerun";
  }
  if (acceptanceDocket.acceptanceStatus === "post-extraction-verified") {
    return "ready-for-candidate-gate-rerun-after-extraction";
  }
  return "root-parity-owner-action-state-unknown";
}

function fallbackSnapshotGreen(fallbackSnapshot) {
  return fallbackSnapshot?.summary?.validationPassed === true &&
    fallbackSnapshot?.summary?.typeCheckPassed === true &&
    fallbackSnapshot?.summary?.typeCheckErrorLines === 0 &&
    fallbackSnapshot?.summary?.buildPassed === true &&
    fallbackSnapshot?.summary?.trackedMutationDetected === false;
}

function queueStatus({ sourceFailures, matrix, topRowStatus, fallbackSnapshot }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    fallbackSnapshotGreen(fallbackSnapshot)) {
    return "fallback-candidate-green-await-clean-source-selection-review";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "needs-root-parity-owner-input-before-rerun") {
    return "waiting-top-candidate-root-parity-owner-input";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "needs-candidate-mutation-owner-input-before-rerun") {
    return "waiting-top-candidate-candidate-mutation-owner-input";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "ready-for-candidate-mutation-apply-before-rerun") {
    return "waiting-top-candidate-candidate-mutation-apply";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "ready-for-candidate-gate-rerun-after-extraction") {
    return "waiting-top-candidate-gate-rerun-after-extraction";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "needs-typecheck-remediation-and-fresh-build-observation") {
    return "waiting-top-candidate-typecheck-build-remediation";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "needs-typecheck-remediation-before-clean-source") {
    return "waiting-top-candidate-typecheck-remediation";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
    topRowStatus === "needs-fresh-build-observation-before-clean-source") {
    return "waiting-top-candidate-fresh-build-observation";
  }
  if (matrix.summary?.topCandidateGateStatus === "top-candidate-gates-green") {
    return "top-candidate-gates-green-await-clean-source-selection";
  }
  return "waiting-clean-source-validation";
}

function topRequiredBeforeRerun({ acceptanceDocket, candidateMutation }) {
  if (candidateMutation.executorStatus === "already-extracted-and-verified") {
    return [
      "route current candidate type-check error lines to owning agents before clean-source selection",
      "rerun candidate-specific npm run type-check after targeted remediation",
      "record a fresh escalated build observation after type-check remediation or after owner accepts build-refresh risk",
      "keep merge/deploy/cleanup blocked until separate gates and owner instructions exist"
    ];
  }
  if (acceptanceDocket.acceptanceStatus === "waiting-for-owner-action") {
    return [
      "owner-selected actions accepted for all 4 A22 root-parity rows",
      "separate extraction-instruction recording evidence",
      "separate guarded-extraction dry-run evidence",
      "candidate-specific focused smoke/type-check/build rerun after extraction evidence"
    ];
  }
  if (acceptanceDocket.acceptanceStatus === "ready-for-extraction-instruction-recording") {
    return [
      "run extraction-instruction recording dry run",
      "assert extraction-instruction recording current gate",
      "run guarded extraction dry run",
      "rerun candidate-specific focused smoke/type-check/build after extraction evidence"
    ];
  }
  if (acceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction") {
    if (candidateMutation.executorStatus === "dry-run-blocked-owner-candidate-mutation-input") {
      return [
        "record separate candidate-mutation owner input for the 4 recorded A22 root-parity rows",
        "run candidate mutation dry-run/current gate after owner input is recorded",
        "run apply-candidate-mutation only with explicit owner candidate-mutation instruction",
        "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence"
      ];
    }
    if (candidateMutation.executorStatus === "dry-run-ready-requires-explicit-apply") {
      return [
        "run apply-candidate-mutation only with explicit owner candidate-mutation instruction",
        "rerun candidate mutation dry-run/current gate after candidate mutation evidence",
        "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence",
        "route remaining top-candidate blockers after refreshed gates"
      ];
    }
    if (candidateMutation.executorStatus === "already-extracted-and-verified") {
      return [
        "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence",
        "rerun clean candidate gate coverage matrix after extracted files are verified",
        "route remaining top-candidate blockers after refreshed gates",
        "keep merge/deploy/cleanup blocked until separate gates and owner instructions exist"
      ];
    }
    return [
      "run guarded extraction dry run/apply only with explicit owner instruction",
      "assert guarded extraction current gate",
      "rerun candidate-specific focused smoke/type-check/build after extraction evidence"
    ];
  }
  return [
    "rerun candidate-specific focused smoke/type-check/build only after root-parity extraction evidence is current"
  ];
}

function topSafeValidationCommands() {
  return [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-a22-clean-candidate-gate-coverage-matrix-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/run-a22-root-parity-candidate-mutation.mjs",
    "node coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-focused-smoke.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-focused-smoke-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
    "node coordination/release-intake/generate-a22-clean-candidate-gate-coverage-matrix.mjs",
    "node coordination/release-intake/assert-a22-clean-candidate-gate-coverage-matrix-current.mjs",
    "node coordination/release-intake/generate-a22-clean-source-validation-queue.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs"
  ];
}

function nonTopRequiredBeforeGate() {
  return [
    "A22/A25 records why the top candidate remains blocked or rejected",
    "candidate-specific validation plan is written for this fallback candidate",
    "candidate-specific focused smoke/type-check/build evidence is generated from the clean worktree",
    "separate owner merge/deploy instructions remain required even if gates go green"
  ];
}

function validatedFallbackRequiredBeforeSelection() {
  return [
    "A22/A25 records why this green fallback is preferable to continuing the red top-candidate recovery path",
    "A22 clean release source runway is refreshed against this candidate",
    "A11/A22 regression smoke scope is chosen for the fallback release source",
    "separate owner merge/deploy instructions remain required even though candidate-local type-check/build are green"
  ];
}

function rowBoundary() {
  return {
    evidenceOnly: true,
    runsTypeCheck: false,
    runsBuild: false,
    runsRegression: false,
    recordsOwnerInput: false,
    recordsOwnerApproval: false,
    recordsExtractionInstruction: false,
    modifiesCandidate: false,
    copiesRootFiles: false,
    selectsReleaseSource: false,
    stageAuthorized: false,
    commitAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    destructiveGitAuthorized: false,
    deployAuthorized: false,
    physicalLifecycleCleanupAuthorized: false
  };
}

function buildQueueRows({ artifacts, top, topRowStatus }) {
  const fallbackSnapshot = artifacts.fallbackCandidateValidationSnapshot;
  const fallbackGreen = fallbackSnapshotGreen(fallbackSnapshot);
  const fallbackBranch = fallbackSnapshot?.candidate?.branch ?? fallbackSnapshot?.candidate?.expectedBranch ?? "";
  return (artifacts.cleanCandidateGateCoverageMatrix.candidateRows ?? []).map((row) => {
    const isTop = sameCandidate(row, top);
    const isValidatedFallback = !isTop && fallbackGreen && row.branch === fallbackBranch;
    return {
      queueRank: count(row.rank),
      branch: row.branch ?? "",
      path: row.path ?? "",
      head: row.head ?? "",
      promotionLane: row.promotionLane ?? "",
      isTopCandidate: isTop,
      gateCoverageStatus: isValidatedFallback ? "fallback-candidate-gates-green" : row.gateCoverageStatus ?? "",
      validationLane: isTop
        ? "top-candidate-root-parity-recovery"
        : isValidatedFallback
          ? "fallback-clean-candidate-validated"
          : "fallback-clean-candidate-gate-planning",
      queueActionStatus: isTop
        ? topRowStatus
        : isValidatedFallback
          ? "fallback-candidate-validation-passed-await-clean-source-selection-review"
          : "fallback-validation-candidate-awaiting-separate-plan",
      reason: isTop
        ? "Top candidate has focused smoke evidence and bounded root-parity extraction, but type-check remains red and build needs a fresh observation before clean-source selection."
        : isValidatedFallback
          ? "Fallback clean candidate has candidate-local type-check/build green evidence and can move to clean-source selection review while merge/deploy/cleanup remain separately blocked."
        : "Fallback clean candidate has no candidate-specific gate evidence yet and should not be run until the top-candidate recovery path is accepted as blocked or rejected.",
      requiredBeforeNextGateRun: isTop
        ? topRequiredBeforeRerun({
          acceptanceDocket: artifacts.ownerActionAcceptanceDocket,
          candidateMutation: artifacts.candidateMutationDryRun
        })
        : isValidatedFallback
          ? validatedFallbackRequiredBeforeSelection()
          : nonTopRequiredBeforeGate(),
      safeValidationCommands: isTop ? topSafeValidationCommands() : [
        "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
        "node coordination/release-intake/generate-a22-fallback-clean-candidate-validation-snapshot.mjs --candidate-branch=codex/s22-release-hygiene-2026-06-15",
        "node coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs",
        "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs"
      ],
      ownerActionRowsRequired: isTop ? count(artifacts.ownerActionPacket.summary?.focusRows) : 0,
      ownerActionRowsAccepted: isTop ? count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) : 0,
      candidateMutationStatus: isTop ? artifacts.candidateMutationDryRun.executorStatus ?? "" : "",
      focusedSmokePassed: isTop ? artifacts.cleanCandidateGateCoverageMatrix.summary?.focusedSmokePassed === true : null,
      typeCheckPassed: isTop
        ? artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckPassed === true
        : isValidatedFallback
          ? true
          : null,
      typeCheckErrorLines: isTop
        ? count(artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckErrorLines)
        : isValidatedFallback
          ? 0
          : null,
      buildPassed: isTop
        ? artifacts.cleanCandidateGateCoverageMatrix.summary?.buildPassed === true
        : isValidatedFallback
          ? true
          : null,
      buildFailureCategory: isTop ? artifacts.cleanCandidateGateCoverageMatrix.summary?.buildFailureCategory ?? "" : "",
      buildRefreshRequired: isTop ? artifacts.cleanCandidateGateCoverageMatrix.summary?.buildRefreshRequired === true : null,
      buildBlockersRouted: isTop ? artifacts.cleanCandidateGateCoverageMatrix.summary?.buildBlockersRouted === true : null,
      fallbackValidationSnapshotGeneratedAt: isValidatedFallback ? fallbackSnapshot.generatedAt ?? "" : "",
      releaseSourceSelected: false,
      promotionEligibleNow: isValidatedFallback,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      boundary: rowBoundary()
    };
  });
}

function buildChecks({ artifacts, sourceFailures, rows, queueStatusValue, topRowStatus }) {
  const topRows = rows.filter((row) => row.isTopCandidate);
  const fallbackRows = rows.filter((row) => !row.isTopCandidate);
  const validatedFallbackRows = fallbackRows.filter((row) => row.queueActionStatus === "fallback-candidate-validation-passed-await-clean-source-selection-review");
  const safeRows = rows.every((row) =>
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.deployAuthorized === false &&
    row.mergeAuthorized === false &&
    row.stageAuthorized === false &&
    row.destructiveGitAuthorized === false &&
    row.physicalLifecycleCleanupAuthorized === false &&
    Object.values(row.boundary ?? {}).every((value) => value === true || value === false) &&
    row.boundary.evidenceOnly === true &&
    row.boundary.runsTypeCheck === false &&
    row.boundary.runsBuild === false &&
    row.boundary.runsRegression === false &&
    row.boundary.recordsOwnerInput === false &&
    row.boundary.recordsExtractionInstruction === false &&
    row.boundary.modifiesCandidate === false &&
    row.boundary.copiesRootFiles === false
  );
  const buildFrontierAccepted = artifacts.cleanCandidateGateCoverageMatrix.summary?.buildRefreshRequired === true
    ? artifacts.cleanCandidateGateCoverageMatrix.summary?.buildBlockersRouted === false
    : artifacts.cleanCandidateGateCoverageMatrix.summary?.buildBlockersRouted === true;

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "top-candidate-red-gates-routed",
      status: artifacts.cleanCandidateGateCoverageMatrix.summary?.topCandidateGateStatus === "top-candidate-gates-red" &&
        artifacts.cleanCandidateGateCoverageMatrix.summary?.focusedSmokePassed === true &&
        artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckPassed === false &&
        artifacts.cleanCandidateGateCoverageMatrix.summary?.buildPassed === false &&
        buildFrontierAccepted
        ? "pass"
        : "fail",
      detail: `topGateStatus=${artifacts.cleanCandidateGateCoverageMatrix.summary?.topCandidateGateStatus ?? "unknown"}; typeCheckPassed=${artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckPassed}; buildPassed=${artifacts.cleanCandidateGateCoverageMatrix.summary?.buildPassed}; buildRefreshRequired=${artifacts.cleanCandidateGateCoverageMatrix.summary?.buildRefreshRequired}`
    },
    {
      id: "queue-frontier-current",
      status: (
        queueStatusValue === "waiting-top-candidate-root-parity-owner-input" &&
        topRowStatus === "needs-root-parity-owner-input-before-rerun" &&
        artifacts.ownerActionAcceptanceDocket.acceptanceStatus === "waiting-for-owner-action" &&
        count(artifacts.ownerActionPacket.summary?.focusRows) === 4 &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 0
      ) || (
        queueStatusValue === "waiting-top-candidate-candidate-mutation-owner-input" &&
        topRowStatus === "needs-candidate-mutation-owner-input-before-rerun" &&
        artifacts.ownerActionAcceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction" &&
        artifacts.candidateMutationDryRun.executorStatus === "dry-run-blocked-owner-candidate-mutation-input" &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 4
      ) || (
        queueStatusValue === "waiting-top-candidate-candidate-mutation-apply" &&
        topRowStatus === "ready-for-candidate-mutation-apply-before-rerun" &&
        artifacts.ownerActionAcceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction" &&
        artifacts.candidateMutationDryRun.executorStatus === "dry-run-ready-requires-explicit-apply" &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 4
      ) || (
        queueStatusValue === "waiting-top-candidate-gate-rerun-after-extraction" &&
        topRowStatus === "ready-for-candidate-gate-rerun-after-extraction" &&
        ["ready-for-guarded-extraction", "post-extraction-verified"].includes(artifacts.ownerActionAcceptanceDocket.acceptanceStatus) &&
        artifacts.candidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 4
      ) || (
        queueStatusValue === "fallback-candidate-green-await-clean-source-selection-review" &&
        topRowStatus === "needs-typecheck-remediation-and-fresh-build-observation" &&
        artifacts.candidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 4 &&
        fallbackSnapshotGreen(artifacts.fallbackCandidateValidationSnapshot)
      ) || (
        ["waiting-top-candidate-typecheck-build-remediation", "waiting-top-candidate-typecheck-remediation", "waiting-top-candidate-fresh-build-observation"].includes(queueStatusValue) &&
        [
          "needs-typecheck-remediation-and-fresh-build-observation",
          "needs-typecheck-remediation-before-clean-source",
          "needs-fresh-build-observation-before-clean-source"
        ].includes(topRowStatus) &&
        artifacts.candidateMutationDryRun.executorStatus === "already-extracted-and-verified" &&
        count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows) === 4
      )
        ? "pass"
        : "fail",
      detail: `queueStatus=${queueStatusValue}; acceptanceStatus=${artifacts.ownerActionAcceptanceDocket.acceptanceStatus ?? "unknown"}; candidateMutationStatus=${artifacts.candidateMutationDryRun.executorStatus ?? "unknown"}`
    },
    {
      id: "fallback-candidates-accounted",
      status: fallbackRows.length === 8 &&
        fallbackRows.every((row) => [
          "fallback-validation-candidate-awaiting-separate-plan",
          "fallback-candidate-validation-passed-await-clean-source-selection-review"
        ].includes(row.queueActionStatus)) &&
        validatedFallbackRows.length <= 1
        ? "pass"
        : "fail",
      detail: `fallbackRows=${fallbackRows.length}; validatedFallbackRows=${validatedFallbackRows.length}`
    },
    {
      id: "fallback-green-candidate-recorded",
      status: fallbackSnapshotGreen(artifacts.fallbackCandidateValidationSnapshot) ? "pass" : "not-applicable",
      detail: fallbackSnapshotGreen(artifacts.fallbackCandidateValidationSnapshot)
        ? `candidate=${artifacts.fallbackCandidateValidationSnapshot.candidate?.branch ?? ""}`
        : "no green fallback snapshot recorded"
    },
    {
      id: "queue-non-executable",
      status: safeRows ? "pass" : "fail",
      detail: "validation queue must not authorize execution, cleanup, merge, deploy, destructive git, or physical lifecycle cleanup"
    },
    {
      id: "release-source-not-selected",
      status: artifacts.cleanReleaseSourceRunway.summary?.releaseSourceEligibleNow === false &&
        artifacts.cleanSourceCandidatePromotion.summary?.releaseSourceSelected === false &&
        artifacts.cleanCandidateGateCoverageMatrix.summary?.releaseSourceSelected === false &&
        topRows.length === 1
        ? "pass"
        : "fail",
      detail: `topRows=${topRows.length}; releaseSourceEligibleNow=${artifacts.cleanReleaseSourceRunway.summary?.releaseSourceEligibleNow}`
    }
  ];
}

export function stableA22CleanSourceValidationQueueProjection(payload) {
  return {
    queueKind: payload.queueKind,
    queueStatus: payload.queueStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    topCandidate: payload.topCandidate,
    summary: payload.summary,
    validationQueueRows: payload.validationQueueRows,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    checks: payload.checks,
    boundary: payload.boundary
  };
}

export function buildA22CleanSourceValidationQueue() {
  const artifacts = {
    dirtyMap: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.dirtyMap),
    cleanReleaseSourceRunway: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.cleanReleaseSourceRunway),
    cleanSourceCandidatePromotion: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.cleanSourceCandidatePromotion),
    cleanCandidateGateCoverageMatrix: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.cleanCandidateGateCoverageMatrix),
    validateToMergeExitCriteria: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.validateToMergeExitCriteria),
    sevenStepClosureBridge: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.sevenStepClosureBridge),
    ownerActionPacket: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.ownerActionPacket),
    ownerActionAcceptanceDocket: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.ownerActionAcceptanceDocket),
    candidateMutationDryRun: readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.candidateMutationDryRun),
    fallbackCandidateValidationSnapshot: readOptionalJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.fallbackCandidateValidationSnapshot)
  };
  const top = topCandidate(artifacts);
  const rawSourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const postExtractionVerified = artifacts.candidateMutationDryRun.executorStatus === "already-extracted-and-verified";
  const sourceFailures = postExtractionVerified
    ? rawSourceFailures.filter((failure) =>
      !failure.startsWith("ownerActionPacket ") &&
      !failure.startsWith("ownerActionAcceptanceDocket ")
    )
    : rawSourceFailures;
  const topRowStatus = topQueueStatus({
    matrix: artifacts.cleanCandidateGateCoverageMatrix,
    acceptanceDocket: artifacts.ownerActionAcceptanceDocket,
    candidateMutation: artifacts.candidateMutationDryRun
  });
  const queueStatusValue = queueStatus({
    sourceFailures,
    matrix: artifacts.cleanCandidateGateCoverageMatrix,
    topRowStatus,
    fallbackSnapshot: artifacts.fallbackCandidateValidationSnapshot
  });
  const rows = buildQueueRows({ artifacts, top, topRowStatus });
  const fallbackValidationRows = rows.filter((row) =>
    row.queueActionStatus === "fallback-candidate-validation-passed-await-clean-source-selection-review"
  );
  const checks = buildChecks({
    artifacts,
    sourceFailures,
    rows,
    queueStatusValue,
    topRowStatus
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    queueKind: "a22-clean-source-validation-queue",
    queueStatus: failedChecks === 0 ? queueStatusValue : "not-ready-check-failures",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    topCandidate: {
      branch: top.branch ?? "",
      path: top.path ?? "",
      head: top.head ?? "",
      gateCoverageStatus: artifacts.cleanCandidateGateCoverageMatrix.summary?.topCandidateGateStatus ?? "",
      queueActionStatus: topRowStatus,
      releaseSourceSelected: false,
      promotionEligibleNow: false
    },
    summary: {
      queueRows: rows.length,
      topCandidateRows: rows.filter((row) => row.isTopCandidate).length,
      fallbackCandidateRows: rows.filter((row) => !row.isTopCandidate).length,
      fallbackCandidateValidationRows: fallbackValidationRows.length,
      fallbackGreenCandidateBranch: fallbackValidationRows[0]?.branch ?? "",
      candidatesWithGateEvidence: count(artifacts.cleanCandidateGateCoverageMatrix.summary?.candidatesWithGateEvidence) +
        (fallbackSnapshotGreen(artifacts.fallbackCandidateValidationSnapshot) ? 1 : 0),
      candidatesAwaitingGateEvidence: Math.max(0, count(artifacts.cleanCandidateGateCoverageMatrix.summary?.candidatesAwaitingGateEvidence) -
        (fallbackSnapshotGreen(artifacts.fallbackCandidateValidationSnapshot) ? 1 : 0)),
      topCandidateGateStatus: artifacts.cleanCandidateGateCoverageMatrix.summary?.topCandidateGateStatus ?? "",
      topCandidateQueueActionStatus: topRowStatus,
      focusedSmokePassed: artifacts.cleanCandidateGateCoverageMatrix.summary?.focusedSmokePassed === true,
      typeCheckPassed: artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckPassed === true,
      typeCheckErrorLines: count(artifacts.cleanCandidateGateCoverageMatrix.summary?.typeCheckErrorLines),
      buildPassed: artifacts.cleanCandidateGateCoverageMatrix.summary?.buildPassed === true,
      buildFailureCategory: artifacts.cleanCandidateGateCoverageMatrix.summary?.buildFailureCategory ?? "",
      buildRefreshRequired: artifacts.cleanCandidateGateCoverageMatrix.summary?.buildRefreshRequired === true,
      buildBlockersRouted: artifacts.cleanCandidateGateCoverageMatrix.summary?.buildBlockersRouted === true,
      ownerActionRowsRequired: count(artifacts.ownerActionPacket.summary?.focusRows),
      ownerActionRowsAccepted: count(artifacts.ownerActionAcceptanceDocket.summary?.acceptedRows),
      ownerActionAcceptanceStatus: artifacts.ownerActionAcceptanceDocket.acceptanceStatus ?? "",
      candidateMutationStatus: artifacts.candidateMutationDryRun.executorStatus ?? "",
      candidateMutationRecordedInstructionRows: count(artifacts.candidateMutationDryRun.summary?.recordedInstructionRows),
      candidateMutationRows: count(artifacts.candidateMutationDryRun.summary?.candidateMutationRows),
      pendingCanonicalAuthorizationRows: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      releaseSourceEligibleNow: artifacts.cleanReleaseSourceRunway.summary?.releaseSourceEligibleNow === true,
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    validationQueueRows: rows,
    checks,
    boundary: {
      evidenceOnly: true,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      recordsOwnerInput: false,
      recordsOwnerApproval: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      selectsReleaseSource: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

function markdown(payload) {
  const rows = payload.validationQueueRows.map((row) =>
    `| ${row.queueRank} | \`${row.branch}\` | ${row.validationLane} | ${row.gateCoverageStatus} | ${row.queueActionStatus} | ${row.ownerActionRowsAccepted}/${row.ownerActionRowsRequired} |`
  ).join("\n");
  const checks = payload.checks.map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`).join("\n");
  const topCommands = payload.validationQueueRows
    .find((row) => row.isTopCandidate)?.safeValidationCommands
    .map((command) => `- \`${command}\``)
    .join("\n") ?? "";

  return `# A22 Clean Source Validation Queue

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This queue is evidence-only. It ranks what A22 should validate next after the current top clean candidate produced red type-check/build gates. It does not run type-check, run build, run regression, record owner input, record extraction instructions, copy root files, mutate the candidate, select a release source, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Queue status: \`${payload.queueStatus}\`
- Queue rows: ${payload.summary.queueRows}
- Top candidate: \`${payload.topCandidate.branch}\`
- Top candidate gate status: \`${payload.summary.topCandidateGateStatus}\`
- Top candidate queue action: \`${payload.summary.topCandidateQueueActionStatus}\`
- Focused smoke passed: ${payload.summary.focusedSmokePassed ? "yes" : "no"}
- Type-check passed: ${payload.summary.typeCheckPassed ? "yes" : "no"}
- Type-check error lines: ${payload.summary.typeCheckErrorLines}
- Build passed: ${payload.summary.buildPassed ? "yes" : "no"}
- Build failure category: \`${payload.summary.buildFailureCategory}\`
- Build blockers routed: ${payload.summary.buildBlockersRouted ? "yes" : "no"}
- Owner action rows accepted: ${payload.summary.ownerActionRowsAccepted}/${payload.summary.ownerActionRowsRequired}
- Candidate mutation status: \`${payload.summary.candidateMutationStatus}\`
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Fallback candidate rows: ${payload.summary.fallbackCandidateRows}
- Fallback candidate validation rows: ${payload.summary.fallbackCandidateValidationRows}
- Green fallback candidate: \`${payload.summary.fallbackGreenCandidateBranch || "none"}\`
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Validation Queue

| Rank | Branch | Lane | Gate coverage | Queue action | Owner actions |
| ---: | --- | --- | --- | --- | ---: |
${rows}

## Top Candidate Safe Validation Commands

These commands are safe only as evidence/currentness steps. They still do not authorize cleanup, merge, deploy, broad staging, destructive git, or physical lifecycle cleanup.

${topCommands}

## Current Interpretation

- The next A22 action is not to blindly rerun broad build/type gates.
- The top clean candidate has owner-selected root-parity action intake recorded for the 4 A22 rows; the current frontier is represented by the top candidate queue action above, moving from candidate-mutation owner input to candidate-mutation apply to post-extraction gate rerun.
- Any fallback clean candidate with green validation evidence can move to clean-source selection review; all other fallback candidates stay held until A22/A25 writes candidate-specific validation plans.
- Clean-source promotion remains blocked until candidate gates are green, release-source selection evidence exists, and the owner gives a separate merge instruction.

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Records owner input: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
- Selects release source: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
`;
}

export function writeA22CleanSourceValidationQueue() {
  const payload = buildA22CleanSourceValidationQueue();
  write(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestMarkdown, markdown(payload));
  write(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22CleanSourceValidationQueue();
  console.log("A22 clean source validation queue generated");
  console.log(`Queue status: ${payload.queueStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch}`);
  console.log(`Top candidate queue action: ${payload.summary.topCandidateQueueActionStatus}`);
  console.log(`Fallback candidates: ${payload.summary.fallbackCandidateRows}`);
  console.log(`Fallback validation rows: ${payload.summary.fallbackCandidateValidationRows}`);
}
