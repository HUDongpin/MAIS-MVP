#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  focusedSmoke: "coordination/release-intake/latest-A22-top-clean-candidate-focused-smoke.json",
  typeCheck: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
  buildSnapshot: "coordination/release-intake/latest-A22-top-clean-candidate-build-snapshot.json",
  buildBlockerRouting: "coordination/release-intake/latest-A22-top-clean-candidate-build-blocker-routing.json",
  reviewPacket: "coordination/release-intake/latest-A22-top-clean-candidate-review-packet.json",
  latestJson: "coordination/release-intake/latest-A22-clean-candidate-gate-coverage-matrix.json",
  latestMarkdown: "coordination/release-intake/latest-A22-clean-candidate-gate-coverage-matrix.md",
  datedJson: `coordination/release-intake/${date}-A22-clean-candidate-gate-coverage-matrix.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-clean-candidate-gate-coverage-matrix.md`
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
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function sameTopCandidate(topCandidate, artifact) {
  return topCandidate?.branch === artifact.topCandidate?.branch &&
    topCandidate?.path === artifact.topCandidate?.path &&
    topCandidate?.head === artifact.topCandidate?.head;
}

function topCandidateGateStatus({ topEvidencePresent, focusedSmoke, typeCheck, buildSnapshot, buildBlockerRouting, reviewPacket }) {
  if (!topEvidencePresent) return "top-candidate-gates-missing";
  const smokePassed = focusedSmoke.summary?.smokePassed === true;
  const typeCheckPassed = typeCheck.summary?.typeCheckPassed === true;
  const buildPassed = buildSnapshot.summary?.buildPassed === true;
  const buildRefreshRequired = buildSnapshot.summary?.buildRefreshRequired === true;
  const blockersRouted = buildRefreshRequired ? false : buildBlockerRouting.summary?.allBuildBlockersRouted === true;
  const promotionRowsMissing = count(reviewPacket.summary?.missingPromotionGateRows) > 0;
  if (smokePassed && typeCheckPassed && buildPassed && blockersRouted && !promotionRowsMissing) {
    return "top-candidate-gates-green";
  }
  if (!typeCheckPassed || !buildPassed) return "top-candidate-gates-red";
  return "top-candidate-gates-incomplete";
}

function candidateRows({ promotion, topCandidate, topGateStatus, focusedSmoke, typeCheck, buildSnapshot, buildBlockerRouting }) {
  return (promotion.candidateRows ?? []).map((row) => {
    const isTop = row.branch === topCandidate?.branch && row.path === topCandidate?.path;
    return {
      rank: count(row.promotionRank),
      branch: row.branch ?? "",
      path: row.path ?? "",
      head: row.head ?? "",
      promotionLane: row.promotionLane ?? "",
      divergence: row.divergence ?? {},
      isTopCandidate: isTop,
      gateCoverageStatus: isTop ? topGateStatus : "candidate-specific-gates-not-run",
      focusedSmokePassed: isTop ? focusedSmoke.summary?.smokePassed === true : null,
      typeCheckPassed: isTop ? typeCheck.summary?.typeCheckPassed === true : null,
      typeCheckErrorLines: isTop ? count(typeCheck.summary?.errorLineCount) : null,
      buildPassed: isTop ? buildSnapshot.summary?.buildPassed === true : null,
      buildFailureCategory: isTop ? buildSnapshot.summary?.failureCategory ?? "" : "",
      buildModuleBlockerRows: isTop ? count(buildSnapshot.summary?.moduleBlockerRows) : null,
      buildConfirmedModuleBlockerRows: isTop ? count(buildSnapshot.summary?.confirmedModuleBlockerRows) : null,
      buildResolvedModuleBlockerRows: isTop ? count(buildSnapshot.summary?.resolvedModuleBlockerRows) : null,
      buildRefreshRequired: isTop ? buildSnapshot.summary?.buildRefreshRequired === true : null,
      buildBlockersRouted: isTop ? (buildSnapshot.summary?.buildRefreshRequired === true ? false : buildBlockerRouting.summary?.allBuildBlockersRouted === true) : null,
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    };
  });
}

function buildChecks({ sourceFailures, promotion, rows, topEvidencePresent, topGateStatus }) {
  const topRows = rows.filter((row) => row.isTopCandidate);
  const candidatesWithGateEvidence = rows.filter((row) => row.gateCoverageStatus !== "candidate-specific-gates-not-run").length;
  const candidatesAwaitingGateEvidence = rows.filter((row) => row.gateCoverageStatus === "candidate-specific-gates-not-run").length;
  const safeRows = rows.every((row) =>
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.deployAuthorized === false &&
    row.mergeAuthorized === false &&
    row.destructiveGitAuthorized === false &&
    row.physicalLifecycleCleanupAuthorized === false
  );

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "candidate-rows-covered",
      status: rows.length === count(promotion.summary?.candidateRows) && rows.length === 9 ? "pass" : "fail",
      detail: `rows=${rows.length}; promotionRows=${promotion.summary?.candidateRows ?? 0}`
    },
    {
      id: "top-candidate-gate-evidence-visible",
      status: topEvidencePresent && topRows.length === 1 && candidatesWithGateEvidence === 1 ? "pass" : "fail",
      detail: `topRows=${topRows.length}; candidatesWithGateEvidence=${candidatesWithGateEvidence}`
    },
    {
      id: "coverage-refines-missing-gates",
      status: topGateStatus === "top-candidate-gates-red" && candidatesAwaitingGateEvidence === 8 ? "pass" : "fail",
      detail: `topGateStatus=${topGateStatus}; candidatesAwaitingGateEvidence=${candidatesAwaitingGateEvidence}`
    },
    {
      id: "coverage-matrix-non-executable",
      status: safeRows ? "pass" : "fail",
      detail: "coverage rows must not authorize cleanup, execution, merge, deploy, destructive git, or physical lifecycle cleanup"
    }
  ];
}

export function stableA22CleanCandidateGateCoverageMatrixProjection(payload) {
  return {
    matrixKind: payload.matrixKind,
    matrixStatus: payload.matrixStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    topCandidate: payload.topCandidate,
    summary: payload.summary,
    candidateRows: payload.candidateRows,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    checks: payload.checks,
    boundary: payload.boundary
  };
}

export function buildA22CleanCandidateGateCoverageMatrix() {
  const artifacts = {
    dirtyMap: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.dirtyMap),
    cleanSourceCandidatePromotion: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.cleanSourceCandidatePromotion),
    focusedSmoke: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.focusedSmoke),
    typeCheck: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.typeCheck),
    buildSnapshot: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.buildSnapshot),
    buildBlockerRouting: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.buildBlockerRouting),
    reviewPacket: readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.reviewPacket)
  };
  const topCandidate = artifacts.cleanSourceCandidatePromotion.topCandidate ?? {};
  const topEvidencePresent = [
    artifacts.focusedSmoke,
    artifacts.typeCheck,
    artifacts.buildSnapshot,
    artifacts.buildBlockerRouting,
    artifacts.reviewPacket
  ].every((artifact) => sameTopCandidate(topCandidate, artifact));
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const topGateStatus = topCandidateGateStatus({
    topEvidencePresent,
    focusedSmoke: artifacts.focusedSmoke,
    typeCheck: artifacts.typeCheck,
    buildSnapshot: artifacts.buildSnapshot,
    buildBlockerRouting: artifacts.buildBlockerRouting,
    reviewPacket: artifacts.reviewPacket
  });
  const rows = candidateRows({
    promotion: artifacts.cleanSourceCandidatePromotion,
    topCandidate,
    topGateStatus,
    focusedSmoke: artifacts.focusedSmoke,
    typeCheck: artifacts.typeCheck,
    buildSnapshot: artifacts.buildSnapshot,
    buildBlockerRouting: artifacts.buildBlockerRouting
  });
  const checks = buildChecks({
    sourceFailures,
    promotion: artifacts.cleanSourceCandidatePromotion,
    rows,
    topEvidencePresent,
    topGateStatus
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;
  const candidatesWithGateEvidence = rows.filter((row) => row.gateCoverageStatus !== "candidate-specific-gates-not-run").length;
  const candidatesGateGreen = rows.filter((row) => row.gateCoverageStatus === "top-candidate-gates-green").length;
  const candidatesGateRed = rows.filter((row) => row.gateCoverageStatus === "top-candidate-gates-red").length;
  const candidatesAwaitingGateEvidence = rows.filter((row) => row.gateCoverageStatus === "candidate-specific-gates-not-run").length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    matrixKind: "a22-clean-candidate-gate-coverage",
    matrixStatus: failedChecks === 0 ? "coverage-current-top-candidate-red" : "not-ready-check-failures",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    topCandidate: {
      branch: topCandidate.branch ?? "",
      path: topCandidate.path ?? "",
      head: topCandidate.head ?? "",
      promotionRank: count(topCandidate.promotionRank),
      promotionLane: topCandidate.promotionLane ?? "",
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      gateCoverageStatus: topGateStatus
    },
    summary: {
      candidateRows: rows.length,
      candidatesWithGateEvidence,
      candidatesGateGreen,
      candidatesGateRed,
      candidatesAwaitingGateEvidence,
      topCandidateGateEvidencePresent: topEvidencePresent,
      topCandidateGateStatus: topGateStatus,
      focusedSmokePassed: artifacts.focusedSmoke.summary?.smokePassed === true,
      typeCheckPassed: artifacts.typeCheck.summary?.typeCheckPassed === true,
      typeCheckErrorLines: count(artifacts.typeCheck.summary?.errorLineCount),
      buildPassed: artifacts.buildSnapshot.summary?.buildPassed === true,
      buildExitStatus: artifacts.buildSnapshot.summary?.exitStatus ?? null,
      buildFailureCategory: artifacts.buildSnapshot.summary?.failureCategory ?? "",
      buildRefreshRequired: artifacts.buildSnapshot.summary?.buildRefreshRequired === true,
      buildModuleBlockerRows: count(artifacts.buildSnapshot.summary?.moduleBlockerRows),
      buildConfirmedModuleBlockerRows: count(artifacts.buildSnapshot.summary?.confirmedModuleBlockerRows),
      buildResolvedModuleBlockerRows: count(artifacts.buildSnapshot.summary?.resolvedModuleBlockerRows),
      buildBlockersRouted: artifacts.buildSnapshot.summary?.buildRefreshRequired === true ? false : artifacts.buildBlockerRouting.summary?.allBuildBlockersRouted === true,
      reviewPacketStatus: artifacts.reviewPacket.packetStatus ?? "",
      reviewValidationRows: count(artifacts.reviewPacket.summary?.validationRows),
      reviewPassedValidationRows: count(artifacts.reviewPacket.summary?.passedValidationRows),
      missingPromotionGateRows: count(artifacts.reviewPacket.summary?.missingPromotionGateRows),
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    candidateRows: rows,
    checks,
    boundary: {
      evidenceOnly: true,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
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
  const rows = payload.candidateRows.map((row) =>
    `| ${row.rank} | \`${row.branch}\` | ${row.gateCoverageStatus} | ${row.focusedSmokePassed === null ? "n/a" : row.focusedSmokePassed ? "yes" : "no"} | ${row.typeCheckPassed === null ? "n/a" : row.typeCheckPassed ? "yes" : "no"} | ${row.buildPassed === null ? "n/a" : row.buildPassed ? "yes" : "no"} | ${row.buildBlockersRouted === null ? "n/a" : row.buildBlockersRouted ? "yes" : "no"} |`
  ).join("\n");
  const checks = payload.checks.map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`).join("\n");

  return `# A22 Clean Candidate Gate Coverage Matrix

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This matrix is evidence-only. It summarizes already-recorded A22 clean-candidate gate evidence. It does not run type-check, run build, run regression, select a release source, record owner approval, record extraction instructions, copy root files, mutate the candidate, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Matrix status: \`${payload.matrixStatus}\`
- Candidate rows: ${payload.summary.candidateRows}
- Candidates with gate evidence: ${payload.summary.candidatesWithGateEvidence}
- Candidates gate green: ${payload.summary.candidatesGateGreen}
- Candidates gate red: ${payload.summary.candidatesGateRed}
- Candidates awaiting gate evidence: ${payload.summary.candidatesAwaitingGateEvidence}
- Top candidate: \`${payload.topCandidate.branch}\`
- Top candidate gate status: \`${payload.summary.topCandidateGateStatus}\`
- Focused smoke passed: ${payload.summary.focusedSmokePassed ? "yes" : "no"}
- Type-check passed: ${payload.summary.typeCheckPassed ? "yes" : "no"}
- Type-check error lines: ${payload.summary.typeCheckErrorLines}
- Build passed: ${payload.summary.buildPassed ? "yes" : "no"}
- Build failure category: \`${payload.summary.buildFailureCategory}\`
- Build module blockers: ${payload.summary.buildConfirmedModuleBlockerRows}/${payload.summary.buildModuleBlockerRows}
- Build blockers routed: ${payload.summary.buildBlockersRouted ? "yes" : "no"}
- Release source selected: no
- Promotion eligible now: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Candidate Gate Coverage

| Rank | Branch | Gate coverage | Smoke | Type-check | Build | Blockers routed |
| ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Current Interpretation

- The earlier clean-candidate blocker is now more precise: candidate-specific gate evidence exists for the top candidate, but it is red.
- The top candidate remains reviewable, not deployable, because type-check and build are failing.
- The other 8 clean candidates remain unvalidated at candidate-specific gate level.
- Clean-source promotion remains blocked until a candidate has green candidate-specific gates, clean-source selection evidence, and a separate owner merge instruction.

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Selects release source: false
- Records owner approval: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
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

export function writeA22CleanCandidateGateCoverageMatrix() {
  const payload = buildA22CleanCandidateGateCoverageMatrix();
  write(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.latestMarkdown, markdown(payload));
  write(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22CleanCandidateGateCoverageMatrix();
  console.log("A22 clean candidate gate coverage matrix generated");
  console.log(`Matrix status: ${payload.matrixStatus}`);
  console.log(`Candidates with gate evidence: ${payload.summary.candidatesWithGateEvidence}`);
  console.log(`Candidates gate red: ${payload.summary.candidatesGateRed}`);
  console.log(`Candidates awaiting gate evidence: ${payload.summary.candidatesAwaitingGateEvidence}`);
}
