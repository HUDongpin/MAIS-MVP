#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS,
  buildA22GeneratedArtifactGuardedCleanupPlan,
  stableA22GeneratedArtifactGuardedCleanupPlanProjection
} from "./generate-a22-generated-artifact-guarded-cleanup-plan.mjs";
import {
  A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS,
  buildA22GeneratedArtifactGuardedCleanupExecutorState,
  stableA22GeneratedArtifactGuardedCleanupExecutorProjection
} from "./run-a22-generated-artifact-guarded-cleanup.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-generated-artifact-guarded-cleanup-current-gate.json");
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
    A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.dirtyMap,
    A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestJson,
    A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestMarkdown,
    A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunJson,
    A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.dirtyMap);
  const recordedPlan = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestJson);
  const recordedDryRun = readJson(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunJson);
  const currentPlan = buildA22GeneratedArtifactGuardedCleanupPlan();
  const currentDryRun = buildA22GeneratedArtifactGuardedCleanupExecutorState({ mode: "dry-run" });
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;

  if (!sameJson(
    stableA22GeneratedArtifactGuardedCleanupPlanProjection(recordedPlan),
    stableA22GeneratedArtifactGuardedCleanupPlanProjection(currentPlan)
  )) {
    failures.push("A22 guarded cleanup plan is stale");
  }
  if (!sameJson(
    stableA22GeneratedArtifactGuardedCleanupExecutorProjection(recordedDryRun),
    stableA22GeneratedArtifactGuardedCleanupExecutorProjection(currentDryRun)
  )) {
    failures.push("A22 guarded cleanup dry-run evidence is stale");
  }
  if (recordedPlan.dirtyMapStatusSignature !== expectedSignature) failures.push("plan dirty-map signature is stale");
  if (recordedPlan.expandedStatusEntries !== expectedEntries) failures.push("plan expanded dirty entry count is stale");
  if (recordedDryRun.dirtyMapStatusSignature !== expectedSignature) failures.push("dry-run dirty-map signature is stale");
  if (recordedDryRun.expandedStatusEntries !== expectedEntries) failures.push("dry-run expanded dirty entry count is stale");
  if ((recordedPlan.sourceCurrentnessFailures ?? []).length !== 0) failures.push("plan has source currentness failures");
  if ((recordedDryRun.sourceCurrentnessFailures ?? []).length !== 0) failures.push("dry-run has source currentness failures");
  if ((recordedPlan.summary?.failedAcceptanceChecks ?? -1) !== 0) failures.push("plan failedAcceptanceChecks must be 0");
  if ((recordedDryRun.summary?.failedPreflightChecks ?? -1) !== 0) failures.push("dry-run failedPreflightChecks must be 0");
  if (recordedDryRun.mode !== "dry-run") failures.push("current gate only accepts dry-run evidence");
  if (recordedDryRun.summary?.applyRequested !== false) failures.push("dry-run applyRequested must be false");
  if (recordedDryRun.summary?.applyPermitted !== false) failures.push("dry-run applyPermitted must be false");
  if (recordedDryRun.summary?.mutationsPerformed !== false) failures.push("dry-run mutationsPerformed must be false");
  if (![
    "ready-for-owner-approved-generated-cleanup",
    "already-cleaned-and-verified",
    "pending-a22-generated-artifact-owner-decision"
  ].includes(recordedPlan.planStatus)) {
    failures.push(`unexpected planStatus: ${recordedPlan.planStatus}`);
  }
  if (![
    "dry-run-ready-requires-explicit-apply",
    "already-cleaned-and-verified",
    "dry-run-pending-owner-decision"
  ].includes(recordedDryRun.executorStatus)) {
    failures.push(`unexpected executorStatus: ${recordedDryRun.executorStatus}`);
  }
  if (recordedPlan.planStatus === "ready-for-owner-approved-generated-cleanup") {
    const targetRows = recordedPlan.summary?.targetRows ?? 0;
    if (targetRows <= 0) failures.push("ready plan must have at least one target row");
    if (recordedPlan.summary?.cleanupAuthorizedRows !== targetRows) failures.push("ready plan cleanupAuthorizedRows must match targetRows");
    if (recordedPlan.summary?.executableRows !== targetRows) failures.push("ready plan executableRows must match targetRows");
    if (recordedDryRun.summary?.cleanupAuthorizedRows !== targetRows) failures.push("ready dry-run cleanupAuthorizedRows must match targetRows");
    if (recordedDryRun.summary?.executableRows !== targetRows) failures.push("ready dry-run executableRows must match targetRows");
  }
  if (recordedPlan.planStatus === "already-cleaned-and-verified") {
    if (recordedPlan.summary?.cleanupAuthorizedRows !== 0) failures.push("already-cleaned plan must have 0 cleanupAuthorizedRows");
    if (recordedPlan.summary?.executableRows !== 0) failures.push("already-cleaned plan must have 0 executableRows");
  }
  if (recordedPlan.planStatus === "pending-a22-generated-artifact-owner-decision") {
    if (recordedPlan.summary?.cleanupAuthorizedRows !== 0) failures.push("pending plan must have 0 cleanupAuthorizedRows");
    if (recordedPlan.summary?.executableRows !== 0) failures.push("pending plan must have 0 executableRows");
    if (recordedDryRun.summary?.cleanupAuthorizedRows !== 0) failures.push("pending dry-run must have 0 cleanupAuthorizedRows");
    if (recordedDryRun.summary?.executableRows !== 0) failures.push("pending dry-run must have 0 executableRows");
  }

  const planMarkdown = readText(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_PLAN_PATHS.latestMarkdown);
  const dryRunMarkdown = readText(A22_GENERATED_ARTIFACT_GUARDED_CLEANUP_EXECUTOR_PATHS.latestDryRunMarkdown);
  for (const [label, text, needles] of [
    ["plan", planMarkdown, ["A22 Generated Artifact Guarded Cleanup Plan", "Deploy authorized: false"]],
    ["dry-run", dryRunMarkdown, ["A22 Generated Artifact Guarded Cleanup Dry Run", "Mutations performed: false", "Deploy authorized: false"]]
  ]) {
    for (const needle of needles) {
      if (!text.includes(needle)) failures.push(`${label} markdown missing text: ${needle}`);
    }
    if (text.includes("undefined")) failures.push(`${label} markdown contains undefined`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    planStatus: recordedPlan.planStatus,
    executorStatus: recordedDryRun.executorStatus,
    cleanupAuthorizedRows: recordedPlan.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recordedPlan.summary?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 generated-artifact guarded cleanup gate");
    console.log(`Plan status: ${payload.planStatus ?? "unknown"}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 generated-artifact guarded cleanup gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
