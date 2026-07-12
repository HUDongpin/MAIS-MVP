#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS,
  buildWave01ArtifactCleanExecutionPreflight,
  stableWave01ArtifactCleanExecutionPreflightProjection
} from "./generate-wave01-artifact-clean-execution-preflight.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-execution-preflight-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacket,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacketGate,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.dirtyMap);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacket);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestJson);
  const current = buildWave01ArtifactCleanExecutionPreflight();

  if (!sameJson(
    stableWave01ArtifactCleanExecutionPreflightProjection(recorded),
    stableWave01ArtifactCleanExecutionPreflightProjection(current)
  )) {
    failures.push("Wave01 artifact-clean execution preflight is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("preflight dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("preflight expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.requestPacketGeneratedAt !== requestPacket.generatedAt) failures.push("preflight source request packet timestamp is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be 0");

  const summary = recorded.summary ?? {};
  const postCleanVerified = recorded.preflightStatus === "post-clean-verified" || summary.preflightStatus === "post-clean-verified";
  if (postCleanVerified) {
    if ((summary.requestRows ?? -1) !== 0) failures.push("post-clean preflight must have 0 active requestRows");
    if ((summary.consumedInstructionRows ?? -1) !== 6) failures.push("post-clean preflight must have 6 consumed instruction rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("post-clean preflight must have 6 already-clean targets");
    if ((summary.dryRunWouldRemoveRows ?? -1) !== 0) failures.push("post-clean preflight must have 0 dry-run removals");
  } else {
    if ((summary.requestRows ?? 0) !== 6) failures.push("requestRows must be 6");
    if ((summary.dryRunWouldRemoveRows ?? 0) !== 6) failures.push("dryRunWouldRemoveRows must be 6");
  }
  if ((summary.preflightRows ?? 0) !== 6) failures.push("preflightRows must be 6");
  if ((summary.failedRows ?? -1) !== 0) failures.push("failedRows must be 0");
  if ((summary.passingRows ?? 0) !== (summary.preflightRows ?? -1)) failures.push("all preflight rows must pass");
  if ((summary.passingRowChecks ?? 0) !== (summary.totalRowChecks ?? -1)) failures.push("all row checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  for (const row of recorded.rows ?? []) {
    if (!row.approvalId?.startsWith("wave01-resync-")) failures.push(`${row.approvalId ?? "missing approvalId"}: approvalId must be Wave01 resync`);
    if (row.approvalId === "wave01-resync-01-tsconfig-json") failures.push("tsconfig hold row must not be in artifact-clean execution preflight");
    if (!row.cwd?.endsWith("/A25-dirty-closure-governance")) failures.push(`${row.approvalId}: cwd must target A25-dirty-closure-governance`);
    if (!row.packageFile?.startsWith("coordination/release-intake/2026-06-30-A25-dirty-tree-map-")) failures.push(`${row.approvalId}: package file is not an A25 dirty-map artifact`);
    if (row.command !== `git clean -f -- ${row.packageFile}`) failures.push(`${row.approvalId}: command mismatch`);
    if (row.dryRunCommand !== `git clean -n -- ${row.packageFile}`) failures.push(`${row.approvalId}: dry-run command mismatch`);
    if (postCleanVerified) {
      if (row.statusShort !== "") failures.push(`${row.approvalId}: post-clean statusShort must be empty`);
      if (!Array.isArray(row.dryRunRemovals) || row.dryRunRemovals.length !== 0) {
        failures.push(`${row.approvalId}: post-clean dry-run removals must be empty`);
      }
      if (row.targetAlreadyClean !== true) failures.push(`${row.approvalId}: targetAlreadyClean must be true`);
      if (row.wouldRemoveOnlyTarget !== false) failures.push(`${row.approvalId}: post-clean wouldRemoveOnlyTarget must be false`);
    } else {
      if (row.statusShort !== `?? ${row.packageFile}`) failures.push(`${row.approvalId}: statusShort must be untracked target only`);
      if (!Array.isArray(row.dryRunRemovals) || row.dryRunRemovals.length !== 1 || row.dryRunRemovals[0] !== row.packageFile) {
        failures.push(`${row.approvalId}: dry-run removals must contain only packageFile`);
      }
      if (row.wouldRemoveOnlyTarget !== true) failures.push(`${row.approvalId}: wouldRemoveOnlyTarget must be true`);
    }
    if ((row.failedChecks ?? -1) !== 0) failures.push(`${row.approvalId}: failedChecks must be 0`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
    for (const check of row.checks ?? []) {
      if (check.status !== "pass") failures.push(`${row.approvalId}: row check failed: ${check.id}`);
    }
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.dryRunOnly !== true) failures.push("boundary.dryRunOnly must be true");
  if (boundary.runsGitCleanDryRun !== true) failures.push("boundary.runsGitCleanDryRun must be true");
  if (boundary.runsGitCleanForce !== false) failures.push("boundary.runsGitCleanForce must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Execution Preflight",
    "dry-run-only preflight",
    "Runs git clean -n: true",
    "Runs git clean -f: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`preflight markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("preflight markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    preflightRows: summary.preflightRows ?? 0,
    passingRows: summary.passingRows ?? 0,
    failedRows: summary.failedRows ?? 0,
    dryRunWouldRemoveRows: summary.dryRunWouldRemoveRows ?? 0,
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
    console.log("A25 Wave01 artifact-clean execution preflight gate");
    console.log(`Preflight rows: ${payload.preflightRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean execution preflight gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
