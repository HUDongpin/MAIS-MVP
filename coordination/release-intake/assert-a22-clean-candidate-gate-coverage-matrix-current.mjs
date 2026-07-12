#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS,
  buildA22CleanCandidateGateCoverageMatrix,
  stableA22CleanCandidateGateCoverageMatrixProjection
} from "./generate-a22-clean-candidate-gate-coverage-matrix.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-clean-candidate-gate-coverage-matrix-current-gate.json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function validationById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  const recorded = readJson(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.latestJson);
  const current = buildA22CleanCandidateGateCoverageMatrix();
  const markdown = fs.readFileSync(absolute(A22_CLEAN_CANDIDATE_GATE_COVERAGE_MATRIX_PATHS.latestMarkdown), "utf8");

  fail(
    failures,
    sameJson(
      stableA22CleanCandidateGateCoverageMatrixProjection(recorded),
      stableA22CleanCandidateGateCoverageMatrixProjection(current)
    ),
    "A22 clean candidate gate coverage matrix is stale"
  );
  fail(failures, recorded.matrixStatus === "coverage-current-top-candidate-red", "matrixStatus must show current top candidate red coverage");
  fail(failures, recorded.summary?.candidateRows === 9, "summary.candidateRows must be 9");
  fail(failures, recorded.summary?.candidatesWithGateEvidence === 1, "summary.candidatesWithGateEvidence must be 1");
  fail(failures, recorded.summary?.candidatesGateGreen === 0, "summary.candidatesGateGreen must be 0");
  fail(failures, recorded.summary?.candidatesGateRed === 1, "summary.candidatesGateRed must be 1");
  fail(failures, recorded.summary?.candidatesAwaitingGateEvidence === 8, "summary.candidatesAwaitingGateEvidence must be 8");
  fail(failures, recorded.summary?.topCandidateGateStatus === "top-candidate-gates-red", "top candidate gate status must be red");
  fail(failures, recorded.summary?.focusedSmokePassed === true, "focused smoke must be reflected as passing");
  fail(failures, recorded.summary?.typeCheckPassed === false, "type-check must be reflected as failing");
  fail(
    failures,
    Number.isInteger(recorded.summary?.typeCheckErrorLines) && recorded.summary.typeCheckErrorLines > 0,
    "type-check error line count must be a positive integer"
  );
  fail(failures, recorded.summary?.buildPassed === false, "build must be reflected as failing");
  if (recorded.summary?.buildRefreshRequired === true) {
    fail(failures, recorded.summary?.buildConfirmedModuleBlockerRows === 0, "confirmed module blocker rows must be 0 after extraction");
    fail(failures, recorded.summary?.buildResolvedModuleBlockerRows === 5, "resolved module blocker rows must be 5 after extraction");
    fail(failures, recorded.summary?.buildBlockersRouted === false, "build blockers must not be treated as routed when a fresh build is required");
  } else {
    fail(failures, recorded.summary?.buildConfirmedModuleBlockerRows === 5, "confirmed module blocker rows must be 5");
    fail(failures, recorded.summary?.buildBlockersRouted === true, "build blockers must be reflected as routed");
  }
  fail(failures, recorded.summary?.releaseSourceSelected === false, "release source must not be selected");
  fail(failures, recorded.summary?.promotionEligibleNow === false, "promotion must not be eligible now");
  fail(failures, recorded.summary?.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must remain 0");
  fail(failures, recorded.summary?.executableRows === 0, "executableRows must remain 0");

  const topRows = (recorded.candidateRows ?? []).filter((row) => row.isTopCandidate);
  fail(failures, topRows.length === 1, "exactly one top candidate row is required");
  fail(failures, topRows[0]?.branch === recorded.topCandidate?.branch, "top row branch must match top candidate branch");
  fail(failures, topRows[0]?.gateCoverageStatus === "top-candidate-gates-red", "top row gate coverage must be red");
  fail(
    failures,
    (recorded.candidateRows ?? []).filter((row) => row.gateCoverageStatus === "candidate-specific-gates-not-run").length === 8,
    "8 non-top candidates must remain not-run"
  );

  for (const row of recorded.candidateRows ?? []) {
    fail(failures, row.cleanupAuthorized === false, `${row.branch}: cleanupAuthorized must be false`);
    fail(failures, row.executableNow === false, `${row.branch}: executableNow must be false`);
    fail(failures, row.deployAuthorized === false, `${row.branch}: deployAuthorized must be false`);
    fail(failures, row.mergeAuthorized === false, `${row.branch}: mergeAuthorized must be false`);
    fail(failures, row.destructiveGitAuthorized === false, `${row.branch}: destructiveGitAuthorized must be false`);
    fail(failures, row.physicalLifecycleCleanupAuthorized === false, `${row.branch}: physicalLifecycleCleanupAuthorized must be false`);
  }

  for (const id of [
    "source-current",
    "candidate-rows-covered",
    "top-candidate-gate-evidence-visible",
    "coverage-refines-missing-gates",
    "coverage-matrix-non-executable"
  ]) {
    fail(failures, validationById(recorded.checks, id)?.status === "pass", `check must pass: ${id}`);
  }

  for (const needle of [
    "# A22 Clean Candidate Gate Coverage Matrix",
    "coverage-current-top-candidate-red",
    "Candidates with gate evidence: 1",
    "Candidates gate red: 1",
    "Candidates awaiting gate evidence: 8",
    "top-candidate-gates-red",
    "candidate-specific-gates-not-run",
    "Release source selected: no",
    "Cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(needle), `markdown missing text: ${needle}`);
  }
  fail(failures, !markdown.includes("undefined"), "markdown contains undefined");

  const result = {
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    matrixStatus: recorded.matrixStatus,
    candidateRows: recorded.summary?.candidateRows ?? 0,
    candidatesWithGateEvidence: recorded.summary?.candidatesWithGateEvidence ?? 0,
    candidatesGateRed: recorded.summary?.candidatesGateRed ?? 0,
    candidatesAwaitingGateEvidence: recorded.summary?.candidatesAwaitingGateEvidence ?? 0,
    topCandidateGateStatus: recorded.summary?.topCandidateGateStatus ?? "",
    failures
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

  console.log("A22 clean candidate gate coverage matrix gate");
  console.log(`Matrix status: ${result.matrixStatus}`);
  console.log(`Candidates with gate evidence: ${result.candidatesWithGateEvidence}`);
  console.log(`Candidates gate red: ${result.candidatesGateRed}`);
  console.log(`Candidates awaiting gate evidence: ${result.candidatesAwaitingGateEvidence}`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    console.error("A22 clean candidate gate coverage matrix gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
