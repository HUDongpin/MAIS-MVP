#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-governance-frontier-readiness-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  wave01Readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  artifactCleanApprovalCapsule: "coordination/release-intake/latest-A25-wave01-a25-artifact-clean-owner-approval-capsule.json",
  packageResyncAcceptanceDocket: "coordination/release-intake/latest-A25-wave01-package-resync-owner-acceptance-docket.json",
  executionInstructionReadiness: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-readiness.json",
  frontier: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.json",
  frontierMarkdown: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.md"
};

function git(args, cwd) {
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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, frontierStatus: "missing" });

  const dirtyMap = readJson(paths.dirtyMap);
  const wave01 = readJson(paths.wave01Readiness);
  const cleanApproval = readJson(paths.artifactCleanApprovalCapsule);
  const acceptance = readJson(paths.packageResyncAcceptanceDocket);
  const executionReadiness = readJson(paths.executionInstructionReadiness);
  const frontier = readJson(paths.frontier);

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  if (frontier.dirtyMapStatusSignature !== expectedSignature) failures.push("frontier dirty-map signature is stale");
  if (frontier.expandedStatusEntries !== expectedEntries) failures.push("frontier expanded dirty entry count is stale");

  const expectedSourceGeneratedAt = {
    wave01ReadinessGeneratedAt: wave01.generatedAt ?? null,
    artifactCleanApprovalCapsuleGeneratedAt: cleanApproval.generatedAt ?? null,
    packageResyncAcceptanceDocketGeneratedAt: acceptance.generatedAt ?? null,
    executionInstructionReadinessGeneratedAt: executionReadiness.generatedAt ?? null
  };
  if (JSON.stringify(frontier.sourceArtifacts ?? null) !== JSON.stringify(expectedSourceGeneratedAt)) {
    failures.push("frontier source artifact timestamps are stale");
  }

  const expectedSummary = {
    packageOnlyRows: count(wave01.packageResyncCoverage?.packageOnlyRows),
    originalOwnerAuthorizationRequiredRows: count(wave01.packageResyncCoverage?.ownerAuthorizationRequiredRows),
    packageAcceptanceRows: count(acceptance.summary?.rowCount),
    packageAuthorizedRows: count(acceptance.summary?.authorizedRows),
    packagePendingRows: count(acceptance.summary?.pendingRows),
    cleanApprovalRows: count(cleanApproval.summary?.cleanApprovalRows),
    heldRows: count(cleanApproval.summary?.heldRows),
    requestRows: count(executionReadiness.summary?.requestRows),
    acceptanceRows: count(executionReadiness.summary?.acceptanceRows),
    targetRows: count(executionReadiness.summary?.targetRows),
    targetDirtyRows: count(executionReadiness.summary?.targetDirtyRows),
    targetAlreadyCleanRows: count(executionReadiness.summary?.targetAlreadyCleanRows),
    validInstructionRows: count(executionReadiness.summary?.validInstructionRows),
    readinessStatus: executionReadiness.readinessStatus ?? executionReadiness.summary?.readinessStatus ?? "unknown",
    recorderStatus: executionReadiness.summary?.recorderStatus ?? "unknown",
    executorStatus: executionReadiness.summary?.executorStatus ?? "unknown",
    postCleanVerificationStatus: executionReadiness.summary?.postCleanVerificationStatus ?? "unknown",
    sourceCurrentnessFailures: (frontier.sourceCurrentness ?? []).filter((row) => !row.current).length,
    cleanupAuthorizedRows:
      count(cleanApproval.summary?.cleanupAuthorizedRows) +
      count(acceptance.summary?.cleanupAuthorizedRows) +
      count(executionReadiness.summary?.cleanupAuthorizedRows),
    executableRows:
      count(cleanApproval.summary?.executableRows) +
      count(acceptance.summary?.executableRows) +
      count(executionReadiness.summary?.executableRows),
    deployAuthorized: cleanApproval.boundary?.deployAuthorized === true || acceptance.boundary?.deployAuthorized === true || executionReadiness.boundary?.deployAuthorized === true
  };
  if (JSON.stringify(frontier.summary ?? null) !== JSON.stringify(expectedSummary)) {
    failures.push("frontier summary is stale");
  }

  const allowedStatuses = new Set([
    "blocked-stale-source",
    "blocked-by-package-authorization",
    "waiting-for-owner-execution-instruction",
    "ready-for-guarded-clean-apply",
    "post-clean-verified"
  ]);
  if (!allowedStatuses.has(frontier.frontierStatus)) failures.push(`frontier status is unsupported: ${frontier.frontierStatus}`);
  if (expectedSummary.cleanApprovalRows === 6 && expectedSummary.heldRows === 1 && expectedSummary.targetDirtyRows === 6 && expectedSummary.validInstructionRows === 0) {
    if (frontier.frontierStatus !== "waiting-for-owner-execution-instruction") {
      failures.push("frontier status should be waiting-for-owner-execution-instruction for the current Wave01 artifact-clean state");
    }
  }
  if ((frontier.normalizedBlockingReasons ?? []).some((reason) => reason.includes("7 package-only dirty entries need owner-approved package resync authorization"))) {
    failures.push("frontier still reports the stale broad seven-row authorization blocker");
  }
  if ((frontier.normalizedBlockingReasons ?? []).length === 0 && frontier.commitReady !== true) {
    failures.push("frontier commitReady is stale for empty blocker list");
  }
  if ((frontier.normalizedBlockingReasons ?? []).length > 0 && frontier.commitReady !== false) {
    failures.push("frontier commitReady must remain false while blockers exist");
  }
  const boundary = frontier.boundary ?? {};
  for (const key of ["stageAuthorized", "commitAuthorized", "mergeAuthorized", "cleanupAuthorized", "executableNow", "destructiveGitAuthorized", "deployAuthorized"]) {
    if (boundary[key] !== false) failures.push(`frontier boundary ${key} must be false`);
  }
  if (boundary.evidenceOnly !== true || boundary.frontierOnly !== true) failures.push("frontier boundary must be evidence-only");

  const markdown = readText(paths.frontierMarkdown);
  if (markdown.includes("undefined")) failures.push("frontier markdown contains undefined");
  if (!markdown.includes("frontier evidence only")) failures.push("frontier markdown missing evidence-only boundary");
  if (!markdown.includes("Normal")) failures.push("frontier markdown missing normalized blocker section");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    frontierStatus: frontier.frontierStatus,
    cleanApprovalRows: expectedSummary.cleanApprovalRows,
    heldRows: expectedSummary.heldRows,
    targetDirtyRows: expectedSummary.targetDirtyRows,
    validInstructionRows: expectedSummary.validInstructionRows,
    normalizedBlockingReasons: (frontier.normalizedBlockingReasons ?? []).length,
    cleanupAuthorizedRows: expectedSummary.cleanupAuthorizedRows,
    executableRows: expectedSummary.executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave01 governance frontier readiness gate");
    console.log(`Frontier status: ${payload.frontierStatus}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave01 governance frontier readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
