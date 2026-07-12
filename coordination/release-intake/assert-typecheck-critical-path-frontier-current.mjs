#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS,
  buildTypecheckCriticalPathFrontierPayload,
  stableTypecheckCriticalPathFrontierProjection
} from "./generate-typecheck-critical-path-frontier.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-typecheck-critical-path-frontier-current-gate.json");
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

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 type-check critical path frontier gate");
    console.log(`Frontier rows: ${payload.frontierRows ?? 0}`);
    console.log(`Critical owner rows: ${payload.criticalOwnerRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 type-check critical path frontier gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestJson,
    TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, frontierRows: 0, criticalOwnerRows: 0 });

  const recorded = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestJson);
  const matrix = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.matrix);
  const current = buildTypecheckCriticalPathFrontierPayload();
  if (!sameJson(
    stableTypecheckCriticalPathFrontierProjection(recorded),
    stableTypecheckCriticalPathFrontierProjection(current)
  )) {
    failures.push("A25 type-check critical path frontier is stale");
  }

  const summary = recorded.summary ?? {};
  const frontierRows = recorded.frontierRows ?? [];
  const ownerRows = recorded.ownerFrontierRows ?? [];
  const topFiles = matrix.summary?.topTypeCheckFiles ?? [];
  const firstRow = frontierRows[0] ?? null;
  const firstTopFile = topFiles[0] ?? null;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.typeCheckErrorLines ?? 0) > 0 && frontierRows.length === 0) failures.push("type-check errors exist but frontierRows is empty");
  if (summary.frontierRows !== frontierRows.length) failures.push("summary.frontierRows must match frontierRows length");
  if (summary.criticalOwnerRows !== ownerRows.length) failures.push("summary.criticalOwnerRows must match ownerFrontierRows length");
  if (summary.topTypeCheckFiles !== topFiles.length) failures.push("summary.topTypeCheckFiles must match source topTypeCheckFiles length");
  if (summary.typeCheckErrorLines !== (matrix.summary?.typeCheckErrorLines ?? 0)) failures.push("summary.typeCheckErrorLines must match source matrix");
  if (summary.failedChecks !== (matrix.summary?.failedChecks ?? 0)) failures.push("summary.failedChecks must match source matrix");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  if (!firstRow) {
    failures.push("missing first frontier row");
  } else {
    if (firstRow.file !== firstTopFile?.file) failures.push("first frontier row must match source top type-check file");
    if (firstRow.totalErrors !== firstTopFile?.errors) failures.push("first frontier row error count must match source top type-check file");
    if (!firstRow.primaryOwnerId || !firstRow.primaryOwner) failures.push("first frontier row must have a primary owner");
    if (!firstRow.nextAction) failures.push("first frontier row must have a nextAction");
    if ((firstRow.evidence ?? []).length < 3) failures.push("first frontier row must include source evidence links");
    if (firstRow.impactedPackageRows <= 0) failures.push("first frontier row must have impacted package rows");
    if ((firstRow.impactedPackages ?? []).length === 0) failures.push("first frontier row must have impacted packages");
    if (firstRow.mergeAuthorized !== false) failures.push("first frontier row mergeAuthorized must be false");
    if (firstRow.cleanupAuthorized !== false) failures.push("first frontier row cleanupAuthorized must be false");
    if (firstRow.executableNow !== false) failures.push("first frontier row executableNow must be false");
  }

  for (const row of frontierRows) {
    if (!row.file) failures.push("frontier row missing file");
    if (!row.primaryOwnerId) failures.push(`${row.file}: missing primaryOwnerId`);
    if (!row.primaryOwner) failures.push(`${row.file}: missing primaryOwner`);
    if (!row.nextAction) failures.push(`${row.file}: missing nextAction`);
    if ((row.evidence ?? []).length === 0) failures.push(`${row.file}: missing evidence`);
    if ((row.packageImpacts ?? []).length !== row.impactedPackageRows) failures.push(`${row.file}: impactedPackageRows mismatch`);
    if (row.mergeAuthorized !== false) failures.push(`${row.file}: mergeAuthorized must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.file}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.file}: executableNow must be false`);
  }

  for (const owner of ownerRows) {
    if (!owner.ownerId) failures.push("owner frontier row missing ownerId");
    if (!owner.owner) failures.push(`${owner.ownerId}: owner frontier row missing owner`);
    if ((owner.files ?? 0) <= 0) failures.push(`${owner.ownerId}: owner frontier row must have files`);
    if ((owner.totalMatchedErrors ?? 0) <= 0) failures.push(`${owner.ownerId}: owner frontier row must have matched errors`);
    if (owner.cleanupAuthorized !== false) failures.push(`${owner.ownerId}: cleanupAuthorized must be false`);
    if (owner.executableNow !== false) failures.push(`${owner.ownerId}: executableNow must be false`);
  }

  const boundary = recorded.boundary ?? {};
  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsAuthorization", false],
    ["recordsExecutionInstruction", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["dirtyRootDeployAuthorized", false],
    ["physicalCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Type-Check Critical Path Frontier",
    "does not authorize",
    "TemplatePrimitiveScene",
    "A06",
    "Owner Frontier"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    frontierRows: frontierRows.length,
    criticalOwnerRows: ownerRows.length,
    typeCheckErrorLines: summary.typeCheckErrorLines ?? 0,
    failedChecks: summary.failedChecks ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? null,
    executableRows: summary.executableRows ?? null,
    failures
  });
}

main();
