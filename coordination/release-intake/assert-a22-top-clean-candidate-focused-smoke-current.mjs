#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS,
  buildTopCleanCandidateFocusedSmoke,
  stableTopCleanCandidateFocusedSmokeProjection
} from "./generate-a22-top-clean-candidate-focused-smoke.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-focused-smoke-current-gate.json");
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
    TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestJson);
  const current = buildTopCleanCandidateFocusedSmoke();
  if (!sameJson(
    stableTopCleanCandidateFocusedSmokeProjection(recorded),
    stableTopCleanCandidateFocusedSmokeProjection(current)
  )) {
    failures.push("A22 top clean candidate focused smoke is stale");
  }

  const promotion = readJson(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.cleanSourceCandidatePromotion);
  const summary = recorded.summary ?? {};
  const focusedSmoke = recorded.focusedSmoke ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];
  const boundedRecovery = promotion.topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery";
  const expectedStatusEntries = boundedRecovery ? (promotion.topCandidate?.allowedDirtyStatusRows ?? []).length : 0;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.smokeStatus !== "passed") failures.push("smokeStatus must be passed");
  if (summary.smokePassed !== true) failures.push("summary.smokePassed must be true");
  if (summary.scriptPresent !== true) failures.push("summary.scriptPresent must be true");
  if ((summary.tests ?? 0) < 2) failures.push("summary.tests must be at least 2");
  if (summary.pass !== summary.tests) failures.push("summary.pass must equal summary.tests");
  if ((summary.fail ?? 0) !== 0) failures.push("summary.fail must be 0");
  if ((summary.beforeStatusEntries ?? -1) !== expectedStatusEntries) failures.push(`summary.beforeStatusEntries must be ${expectedStatusEntries}`);
  if ((summary.afterStatusEntries ?? -1) !== expectedStatusEntries) failures.push(`summary.afterStatusEntries must be ${expectedStatusEntries}`);
  if (summary.beforeStatusAllowed !== true) failures.push("summary.beforeStatusAllowed must be true");
  if (summary.afterStatusAllowed !== true) failures.push("summary.afterStatusAllowed must be true");
  if (boundedRecovery && summary.boundedDirtyAccepted !== true) failures.push("summary.boundedDirtyAccepted must be true for recovery candidate");
  if (summary.mutationDetected !== false) failures.push("summary.mutationDetected must be false");
  if (summary.promotionEligibleNow !== false) failures.push("summary.promotionEligibleNow must be false");
  if (summary.releaseSourceSelected !== false) failures.push("summary.releaseSourceSelected must be false");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if (recorded.topCandidate?.branch !== promotion.topCandidate?.branch) failures.push("top candidate branch must match promotion packet");
  if (recorded.topCandidate?.path !== promotion.topCandidate?.path) failures.push("top candidate path must match promotion packet");
  if (recorded.topCandidate?.promotionEligibleNow !== false) failures.push("top candidate promotionEligibleNow must be false");
  if (recorded.topCandidate?.releaseSourceSelected !== false) failures.push("top candidate releaseSourceSelected must be false");
  if (!String(focusedSmoke.scriptPath ?? "").endsWith("scripts/vercel-region-config.test.mjs")) {
    failures.push("focused smoke scriptPath must target scripts/vercel-region-config.test.mjs");
  }
  if (focusedSmoke.scriptPresent !== true) failures.push("focusedSmoke.scriptPresent must be true");
  if (focusedSmoke.exitStatus !== 0) failures.push("focusedSmoke.exitStatus must be 0");
  if (focusedSmoke.smokePassed !== true) failures.push("focusedSmoke.smokePassed must be true");
  if (boundedRecovery) {
    if ((focusedSmoke.allowedDirtyStatusRows ?? []).length !== expectedStatusEntries) {
      failures.push("focusedSmoke.allowedDirtyStatusRows must match promotion allowlist for recovery candidate");
    }
    if (focusedSmoke.beforeStatusAllowed !== true) failures.push("focusedSmoke.beforeStatusAllowed must be true for recovery candidate");
    if (focusedSmoke.afterStatusAllowed !== true) failures.push("focusedSmoke.afterStatusAllowed must be true for recovery candidate");
  } else {
    if (focusedSmoke.beforeStatusClean !== true) failures.push("focusedSmoke.beforeStatusClean must be true");
    if (focusedSmoke.afterStatusClean !== true) failures.push("focusedSmoke.afterStatusClean must be true");
  }
  if (focusedSmoke.mutationDetected !== false) failures.push("focusedSmoke.mutationDetected must be false");
  for (const rowId of [
    "focused-smoke-script-present",
    "focused-smoke-command-passed",
    "focused-smoke-no-mutation"
  ]) {
    const row = validationById(validationRows, rowId);
    if (!row) failures.push(`missing validation row: ${rowId}`);
    if (row?.passed !== true) failures.push(`${rowId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["runsFocusedSmoke", true],
    ["runsTypeCheck", false],
    ["runsBuild", false],
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

  const markdown = readText(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Focused Smoke",
    "Focused smoke passing makes one validation row stronger",
    "does not make the candidate deployable",
    "Validation Rows"
  ]) {
    if (!markdown.includes(needle)) failures.push(`focused smoke markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("focused smoke markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    smokeStatus: recorded.smokeStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    smokePassed: summary.smokePassed === true,
    tests: summary.tests ?? 0,
    pass: summary.pass ?? 0,
    fail: summary.fail ?? 0,
    mutationDetected: summary.mutationDetected === true,
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
    console.log("A22 top clean candidate focused smoke gate");
    console.log(`Smoke status: ${payload.smokeStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Tests: ${payload.tests ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate focused smoke gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
