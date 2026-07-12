#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS
} from "./generate-a22-fallback-clean-candidate-validation-snapshot.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-fallback-clean-candidate-validation-snapshot-current-gate.json");
const json = process.argv.includes("--json");

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

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function statusRows(candidatePath) {
  const status = git(["-C", candidatePath, "status", "--short"]);
  return status ? status.split("\n").filter(Boolean) : [];
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function validationById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestJson,
    A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestJson);
  const markdown = readText(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestMarkdown);
  const dirtyMap = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.dirtyMap);
  const queue = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.cleanSourceValidationQueue);
  const candidatePath = recorded.candidate?.path ?? "";
  const queueRow = (queue.validationQueueRows ?? []).find((row) => row.branch === recorded.candidate?.expectedBranch);
  const currentHead = candidatePath ? git(["-C", candidatePath, "rev-parse", "HEAD"]) : "";
  const currentBranch = candidatePath ? git(["-C", candidatePath, "branch", "--show-current"]) : "";
  const currentStatusRows = candidatePath ? statusRows(candidatePath) : [];

  fail(failures, recorded.snapshotKind === "a22-fallback-clean-candidate-validation-snapshot", "snapshotKind is invalid");
  fail(failures, recorded.dirtyMapStatusSignature === dirtyMap.statusSignature, "dirty map signature is stale");
  fail(failures, recorded.expandedStatusEntries === (dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length), "expanded dirty entry count is stale");
  fail(failures, Boolean(queueRow), "candidate is missing from current clean-source validation queue");
  fail(failures, queueRow?.isTopCandidate === false, "candidate must remain a fallback row");
  fail(failures, recorded.candidate?.branch === currentBranch, "recorded candidate branch is stale");
  fail(failures, recorded.candidate?.head === currentHead, "recorded candidate head is stale");
  fail(failures, recorded.candidate?.expectedBranch === "codex/s22-release-hygiene-2026-06-15", "unexpected fallback candidate branch");
  fail(failures, recorded.summary?.validationPassed === true, "fallback validation must pass");
  fail(failures, recorded.summary?.typeCheckPassed === true, "fallback type-check must pass");
  fail(failures, recorded.summary?.typeCheckErrorLines === 0, "fallback type-check error lines must be 0");
  fail(failures, recorded.summary?.buildPassed === true, "fallback build must pass");
  fail(failures, recorded.summary?.trackedMutationDetected === false, "tracked mutation must not be detected");
  fail(failures, currentStatusRows.length === (recorded.afterStatusRows ?? []).length, "current tracked status row count is stale");
  fail(failures, currentStatusRows.join("\n") === (recorded.afterStatusRows ?? []).join("\n"), "current tracked status rows changed after validation snapshot");
  fail(failures, recorded.summary?.releaseSourceSelected === false, "snapshot must not select release source");
  fail(failures, recorded.summary?.promotionEligibleNow === true, "green fallback must be marked promotion-eligible for review");
  fail(failures, recorded.summary?.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, recorded.summary?.executableRows === 0, "executableRows must be 0");

  for (const id of [
    "candidate-in-validation-queue",
    "candidate-is-fallback",
    "tracked-status-stable",
    "type-check-green",
    "build-green",
    "non-executable-boundary"
  ]) {
    fail(failures, validationById(recorded.checks, id)?.status === "pass", `check must pass: ${id}`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["runsTypeCheck", true],
    ["runsBuild", true],
    ["runsRegression", false],
    ["recordsOwnerInput", false],
    ["recordsOwnerApproval", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["selectsReleaseSource", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    fail(failures, recorded.boundary?.[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const needle of [
    "# A22 Fallback Clean Candidate Validation Snapshot",
    "Validation passed: yes",
    "Type-check error lines: 0",
    "Build passed: yes",
    "Release source selected: no",
    "Cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(needle), `markdown missing text: ${needle}`);
  }
  fail(failures, !markdown.includes("undefined"), "markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    candidateBranch: recorded.candidate?.branch ?? "",
    candidateHead: recorded.candidate?.head ?? "",
    validationPassed: recorded.summary?.validationPassed === true,
    typeCheckPassed: recorded.summary?.typeCheckPassed === true,
    typeCheckErrorLines: recorded.summary?.typeCheckErrorLines ?? null,
    buildPassed: recorded.summary?.buildPassed === true,
    currentStatusEntries: currentStatusRows.length,
    cleanupAuthorizedRows: recorded.summary?.cleanupAuthorizedRows ?? null,
    executableRows: recorded.summary?.executableRows ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 fallback clean candidate validation snapshot gate");
    console.log(`Candidate: ${payload.candidateBranch ?? "unknown"}`);
    console.log(`Validation passed: ${payload.validationPassed ? "yes" : "no"}`);
    console.log(`Type-check error lines: ${payload.typeCheckErrorLines ?? "unknown"}`);
    console.log(`Build passed: ${payload.buildPassed ? "yes" : "no"}`);
    console.log(`Failures: ${(payload.failures ?? []).length}`);
  }

  if ((payload.failures ?? []).length > 0) {
    console.error("A22 fallback clean candidate validation snapshot gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
