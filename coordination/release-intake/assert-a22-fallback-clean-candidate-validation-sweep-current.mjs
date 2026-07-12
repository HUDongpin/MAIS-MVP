#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS
} from "./generate-a22-fallback-clean-candidate-validation-sweep.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-fallback-clean-candidate-validation-sweep-current-gate.json");
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
    A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestJson,
    A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestJson);
  const markdown = readText(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestMarkdown);
  const dirtyMap = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.dirtyMap);
  const queue = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.cleanSourceValidationQueue);
  const queueRows = queue.validationQueueRows ?? [];
  const queueByBranch = new Map(queueRows.map((row) => [row.branch, row]));
  const dirtyEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;

  fail(failures, recorded.sweepKind === "a22-fallback-clean-candidate-validation-sweep", "sweepKind is invalid");
  fail(failures, recorded.dirtyMapStatusSignature === dirtyMap.statusSignature, "dirty map signature is stale");
  fail(failures, recorded.expandedStatusEntries === dirtyEntries, "expanded dirty entry count is stale");
  fail(failures, recorded.sourceArtifacts?.cleanSourceValidationQueue?.generatedAt === queue.generatedAt, "clean-source queue timestamp is stale");
  fail(failures, Array.isArray(recorded.results), "results must be an array");
  fail(failures, (recorded.results ?? []).length === (recorded.summary?.resultRows ?? -1), "summary.resultRows mismatch");
  fail(failures, (recorded.results ?? []).length > 0, "sweep must include at least one candidate result");

  let mutationRows = 0;
  for (const row of recorded.results ?? []) {
    const queueRow = queueByBranch.get(row.expectedBranch || row.branch);
    fail(failures, Boolean(queueRow), `${row.branch}: missing from clean-source queue`);
    fail(failures, queueRow?.isTopCandidate === false, `${row.branch}: must remain a fallback candidate`);
    if (row.path) {
      const currentBranch = git(["-C", row.path, "branch", "--show-current"]);
      const currentHead = git(["-C", row.path, "rev-parse", "HEAD"]);
      const currentStatusRows = statusRows(row.path);
      fail(failures, row.branch === currentBranch, `${row.branch}: branch is stale`);
      fail(failures, row.head === currentHead, `${row.branch}: head is stale`);
      fail(failures, currentStatusRows.join("\n") === (row.afterStatusRows ?? []).join("\n"), `${row.branch}: tracked status rows changed after sweep`);
    }
    if (row.trackedMutationDetected === true) mutationRows += 1;
    fail(failures, row.releaseSourceSelected !== true, `${row.branch}: must not select release source`);
    fail(failures, row.cleanupAuthorizedRows !== true, `${row.branch}: must not authorize cleanup`);
    fail(failures, row.executableRows !== true, `${row.branch}: must not be executable`);
  }

  fail(failures, mutationRows === 0, "tracked mutation rows must be 0");
  for (const id of [
    "selected-fallback-candidates",
    "candidate-local-validation-only",
    "no-tracked-mutation",
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
    "# A22 Fallback Clean Candidate Validation Sweep",
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
    selectedRows: recorded.summary?.selectedRows ?? null,
    resultRows: recorded.summary?.resultRows ?? null,
    validationPassedRows: recorded.summary?.validationPassedRows ?? null,
    validationFailedRows: recorded.summary?.validationFailedRows ?? null,
    errorRows: recorded.summary?.errorRows ?? null,
    mutationRows,
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
    console.log("A22 fallback clean candidate validation sweep gate");
    console.log(`Selected rows: ${payload.selectedRows ?? "unknown"}`);
    console.log(`Validation passed rows: ${payload.validationPassedRows ?? "unknown"}`);
    console.log(`Validation failed rows: ${payload.validationFailedRows ?? "unknown"}`);
    console.log(`Mutation rows: ${payload.mutationRows ?? "unknown"}`);
    console.log(`Failures: ${(payload.failures ?? []).length}`);
  }

  if ((payload.failures ?? []).length > 0) {
    console.error("A22 fallback clean candidate validation sweep gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
