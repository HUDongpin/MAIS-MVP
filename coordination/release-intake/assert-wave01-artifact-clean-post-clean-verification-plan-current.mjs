#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS,
  buildWave01ArtifactCleanPostCleanVerificationPlan,
  stableWave01ArtifactCleanPostCleanVerificationProjection
} from "./generate-wave01-artifact-clean-post-clean-verification-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-artifact-clean-post-clean-verification-plan-current-gate.json");
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
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.dirtyMap,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedPlan,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedPlanGate,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedExecutorDryRun,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.guardedExecutorGate,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.focusPacket,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.focusPacketGate,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestJson,
    WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.dirtyMap);
  const recorded = readJson(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestJson);
  const current = buildWave01ArtifactCleanPostCleanVerificationPlan();
  if (!sameJson(
    stableWave01ArtifactCleanPostCleanVerificationProjection(recorded),
    stableWave01ArtifactCleanPostCleanVerificationProjection(current)
  )) {
    failures.push("Wave01 artifact-clean post-clean verification plan is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("post-clean verification dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("post-clean verification expanded dirty entry count is stale");
  if (recorded.planKind !== "wave01-artifact-clean-post-clean-verification-plan") failures.push("planKind is invalid");
  if (!["waiting-for-clean-execution", "post-clean-verified"].includes(recorded.verificationStatus)) {
    failures.push(`unexpected verificationStatus: ${recorded.verificationStatus ?? "missing"}`);
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((recorded.stagedRows ?? []).length !== 0) failures.push("stagedRows must be empty");

  const summary = recorded.summary ?? {};
  if ((summary.targetRows ?? 0) !== 6) failures.push("targetRows must be 6");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");
  if (summary.deployAuthorized !== false) failures.push("deployAuthorized must be false");
  if ((summary.failedChecks ?? -1) !== 0) failures.push("failedChecks must be 0");
  if ((summary.passingChecks ?? 0) !== (summary.checks ?? -1)) failures.push("all post-clean verification checks must pass");

  if (recorded.verificationStatus === "waiting-for-clean-execution") {
    if ((summary.targetDirtyRows ?? -1) !== 6) failures.push("waiting verification must have 6 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 0) failures.push("waiting verification must have 0 already-clean target rows");
    if (summary.postCleanVerified !== false) failures.push("waiting verification must not be marked post-clean verified");
    if (![
      "dry-run-blocked-missing-owner-execution-instruction",
      "dry-run-ready-requires-explicit-apply"
    ].includes(summary.executorStatus)) {
      failures.push("waiting verification requires blocked or ready dry-run executor status");
    }
  }
  if (recorded.verificationStatus === "post-clean-verified") {
    if ((summary.targetDirtyRows ?? -1) !== 0) failures.push("post-clean verification must have 0 dirty target rows");
    if ((summary.targetAlreadyCleanRows ?? -1) !== 6) failures.push("post-clean verification must have 6 already-clean target rows");
    if (summary.postCleanVerified !== true) failures.push("post-clean verification must mark postCleanVerified true");
    if (summary.executorStatus !== "already-cleaned-and-verified") failures.push("post-clean verification requires already-cleaned executor status");
  }

  for (const row of recorded.targetRows ?? []) {
    if (!/^wave01-resync-0[2-7]-/.test(row.approvalId ?? "")) failures.push(`${row.approvalId ?? "unknown"}: approval id must be Wave01 artifact-clean 02-07`);
    if (!/^coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.packageFile ?? "")) {
      failures.push(`${row.approvalId ?? "unknown"}: package file must be one approved Wave01 dirty-map artifact`);
    }
    if (row.command !== `git clean -f -- ${row.packageFile}`) failures.push(`${row.approvalId ?? "unknown"}: command must exactly target package file`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId ?? "unknown"}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId ?? "unknown"}: executableNow must be false`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.verificationPlanOnly !== true) failures.push("boundary.verificationPlanOnly must be true");
  if (boundary.recordsOwnerInput !== false) failures.push("boundary.recordsOwnerInput must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  const markdown = readText(WAVE01_ARTIFACT_CLEAN_POST_CLEAN_VERIFICATION_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Wave01 Artifact-Clean Post-Clean Verification Plan",
    "Post-Clean Verification",
    "does not execute cleanup",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ]) {
    if (!markdown.includes(needle)) failures.push(`post-clean verification markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("post-clean verification markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    verificationStatus: recorded.verificationStatus,
    focusStatus: summary.focusStatus ?? "",
    executorStatus: summary.executorStatus ?? "",
    targetRows: summary.targetRows ?? 0,
    targetDirtyRows: summary.targetDirtyRows ?? 0,
    targetAlreadyCleanRows: summary.targetAlreadyCleanRows ?? 0,
    postCleanVerified: summary.postCleanVerified === true,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    deployAuthorized: summary.deployAuthorized ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave01 artifact-clean post-clean verification plan gate");
    console.log(`Verification status: ${payload.verificationStatus ?? "unknown"}`);
    console.log(`Post-clean verified: ${payload.postCleanVerified === true ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 artifact-clean post-clean verification plan gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
