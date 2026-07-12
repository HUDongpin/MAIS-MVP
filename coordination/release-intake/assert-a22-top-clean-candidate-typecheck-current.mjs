#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS,
  buildTopCleanCandidateTypeCheck,
  stableTopCleanCandidateTypeCheckProjection
} from "./generate-a22-top-clean-candidate-typecheck.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-typecheck-current-gate.json");
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

function validationById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestJson);
  const current = buildTopCleanCandidateTypeCheck();
  if (!sameJson(
    stableTopCleanCandidateTypeCheckProjection(recorded),
    stableTopCleanCandidateTypeCheckProjection(current)
  )) {
    failures.push("A22 top clean candidate type-check evidence is stale");
  }

  const promotion = readJson(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.cleanSourceCandidatePromotion);
  const summary = recorded.summary ?? {};
  const typeCheck = recorded.typeCheck ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];
  const boundedRecovery = promotion.topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery";
  const expectedStatusEntries = boundedRecovery ? (promotion.topCandidate?.allowedDirtyStatusRows ?? []).length : 0;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (!["passed", "failed", "blocked"].includes(recorded.typeCheckStatus)) failures.push("typeCheckStatus must be a known state");
  if (summary.packageJsonPresent !== true) failures.push("summary.packageJsonPresent must be true");
  if (typeCheck.packageJsonPresent !== true) failures.push("typeCheck.packageJsonPresent must be true");
  if (typeCheck.command?.argv?.join(" ") !== "npm run type-check") failures.push("type-check command must be npm run type-check");
  if (typeCheck.command?.cwd !== recorded.topCandidate?.path) failures.push("type-check cwd must match top candidate path");
  if (recorded.topCandidate?.branch !== promotion.topCandidate?.branch) failures.push("top candidate branch must match promotion packet");
  if (recorded.topCandidate?.path !== promotion.topCandidate?.path) failures.push("top candidate path must match promotion packet");
  if (recorded.topCandidate?.promotionEligibleNow !== false) failures.push("top candidate promotionEligibleNow must be false");
  if (recorded.topCandidate?.releaseSourceSelected !== false) failures.push("top candidate releaseSourceSelected must be false");
  if (typeof typeCheck.exitStatus !== "number") failures.push("typeCheck.exitStatus must be recorded");
  if (typeof summary.errorLineCount !== "number") failures.push("summary.errorLineCount must be recorded");
  if ((summary.beforeStatusEntries ?? -1) !== expectedStatusEntries) failures.push(`summary.beforeStatusEntries must be ${expectedStatusEntries}`);
  if ((summary.afterStatusEntries ?? -1) !== expectedStatusEntries) failures.push(`summary.afterStatusEntries must be ${expectedStatusEntries}`);
  if (summary.beforeStatusAllowed !== true) failures.push("summary.beforeStatusAllowed must be true");
  if (summary.afterStatusAllowed !== true) failures.push("summary.afterStatusAllowed must be true");
  if (boundedRecovery && summary.boundedDirtyAccepted !== true) failures.push("summary.boundedDirtyAccepted must be true for recovery candidate");
  if (summary.mutationDetected !== false) failures.push("summary.mutationDetected must be false");
  if (boundedRecovery) {
    if ((typeCheck.allowedDirtyStatusRows ?? []).length !== expectedStatusEntries) {
      failures.push("typeCheck.allowedDirtyStatusRows must match promotion allowlist for recovery candidate");
    }
    if (typeCheck.beforeStatusAllowed !== true) failures.push("typeCheck.beforeStatusAllowed must be true for recovery candidate");
    if (typeCheck.afterStatusAllowed !== true) failures.push("typeCheck.afterStatusAllowed must be true for recovery candidate");
  } else {
    if (typeCheck.beforeStatusClean !== true) failures.push("typeCheck.beforeStatusClean must be true");
    if (typeCheck.afterStatusClean !== true) failures.push("typeCheck.afterStatusClean must be true");
  }
  if (typeCheck.mutationDetected !== false) failures.push("typeCheck.mutationDetected must be false");
  if (summary.tsbuildInfoPresentAfter !== false) failures.push("summary.tsbuildInfoPresentAfter must be false");
  if (summary.nextBuildDirPresentAfter === true && summary.nextBuildDirIgnoredAfter !== true) {
    failures.push("summary.nextBuildDirPresentAfter may be true only when .next is ignored");
  }
  if (typeCheck.nextBuildDirPresentAfter === true && typeCheck.nextBuildDirIgnoredAfter !== true) {
    failures.push("typeCheck.nextBuildDirPresentAfter may be true only when .next is ignored");
  }
  if (typeof summary.ignoredEntryCountAfter !== "number") failures.push("summary.ignoredEntryCountAfter must be recorded");
  if (summary.promotionEligibleNow !== false) failures.push("summary.promotionEligibleNow must be false");
  if (summary.releaseSourceSelected !== false) failures.push("summary.releaseSourceSelected must be false");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");

  for (const rowId of [
    "candidate-package-present",
    "candidate-type-check-command-run",
    "candidate-type-check-no-mutation"
  ]) {
    const row = validationById(validationRows, rowId);
    if (!row) failures.push(`missing validation row: ${rowId}`);
    if (row?.passed !== true) failures.push(`${rowId} must pass`);
  }
  const passRow = validationById(validationRows, "candidate-type-check-passed");
  if (!passRow) failures.push("missing validation row: candidate-type-check-passed");
  if (passRow && passRow.passed !== (summary.typeCheckPassed === true)) {
    failures.push("candidate-type-check-passed row must match summary.typeCheckPassed");
  }
  if (recorded.typeCheckStatus === "passed" && summary.typeCheckPassed !== true) {
    failures.push("passed typeCheckStatus must mean summary.typeCheckPassed true");
  }
  if (recorded.typeCheckStatus === "failed" && summary.typeCheckPassed !== false) {
    failures.push("failed typeCheckStatus must mean summary.typeCheckPassed false");
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["runsTypeCheck", true],
    ["runsBuild", false],
    ["runsRegression", false],
    ["selectsReleaseSource", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
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

  const markdown = readText(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Type-Check",
    "Type-check status:",
    "Top Error Files",
    "Boundary",
    "failed type-check remains a promotion blocker"
  ]) {
    if (!markdown.includes(needle)) failures.push(`type-check markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("type-check markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    typeCheckStatus: recorded.typeCheckStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    typeCheckPassed: summary.typeCheckPassed === true,
    exitStatus: summary.exitStatus ?? null,
    errorLineCount: summary.errorLineCount ?? 0,
    mutationDetected: summary.mutationDetected === true,
    tsbuildInfoPresentAfter: summary.tsbuildInfoPresentAfter === true,
    nextBuildDirPresentAfter: summary.nextBuildDirPresentAfter === true,
    nextBuildDirIgnoredAfter: summary.nextBuildDirIgnoredAfter === true,
    ignoredEntryCountAfter: summary.ignoredEntryCountAfter ?? 0,
    promotionEligibleNow: summary.promotionEligibleNow === true,
    releaseSourceSelected: summary.releaseSourceSelected === true,
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
    console.log("A22 top clean candidate type-check gate");
    console.log(`Type-check status: ${payload.typeCheckStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`TypeScript error lines: ${payload.errorLineCount ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate type-check gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
