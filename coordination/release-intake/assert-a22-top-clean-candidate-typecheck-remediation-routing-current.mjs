#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_TYPECHECK_REMEDIATION_ROUTING_PATHS,
  buildA22TypecheckRemediationRouting,
  stableA22TypecheckRemediationRoutingProjection
} from "./generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-typecheck-remediation-routing-current-gate.json");
const json = process.argv.includes("--json");
const REMEDIATION_COMPATIBLE_QUEUE_STATUSES = new Set([
  "waiting-top-candidate-typecheck-build-remediation",
  "fallback-candidate-green-await-clean-source-selection-review"
]);

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
    A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestJson,
    A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestJson);
  const current = buildA22TypecheckRemediationRouting();
  if (!sameJson(
    stableA22TypecheckRemediationRoutingProjection(recorded),
    stableA22TypecheckRemediationRoutingProjection(current)
  )) {
    failures.push("A22 top clean candidate type-check remediation routing is stale");
  }

  const typeCheck = readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.topCandidateTypeCheck);
  const queue = readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.cleanSourceValidationQueue);
  const summary = recorded.summary ?? {};
  const typeCheckSummary = recorded.typeCheckSummary ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];
  const typeCheckPassed = typeCheck.summary?.typeCheckPassed === true;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.cleanSourceQueueStatus !== queue.queueStatus) failures.push("cleanSourceQueueStatus must match clean-source validation queue");
  if (recorded.topCandidate?.branch !== typeCheck.topCandidate?.branch) failures.push("top candidate branch must match type-check evidence");
  if (recorded.topCandidate?.path !== typeCheck.topCandidate?.path) failures.push("top candidate path must match type-check evidence");
  if (typeCheckPassed) {
    if (recorded.remediationStatus !== "not-required-typecheck-green") failures.push("green type-check must produce not-required remediation status");
  } else {
    if (recorded.remediationStatus !== "owner-routed-cross-owner-remediation-required") {
      failures.push("red type-check must route to owner-routed-cross-owner-remediation-required");
    }
    if (!REMEDIATION_COMPATIBLE_QUEUE_STATUSES.has(recorded.cleanSourceQueueStatus)) {
      failures.push("red remediation routing requires a type-check remediation-compatible clean-source queue status");
    }
    if ((summary.ownerRouteCount ?? 0) <= 0) failures.push("ownerRouteCount must be positive for red type-check");
    if ((summary.routedErrorRows ?? 0) !== (typeCheck.summary?.errorLineCount ?? 0)) {
      failures.push("routedErrorRows must match type-check errorLineCount");
    }
    if ((typeCheckSummary.structuredErrorRows ?? 0) !== (typeCheck.summary?.errorLineCount ?? 0)) {
      failures.push("structuredErrorRows must match type-check errorLineCount");
    }
    const summarizedOwnerIds = new Set([
      ...(summary.primaryOwnerIds ?? []),
      ...(summary.coordinationOwnerIds ?? [])
    ]);
    const routedOwnerIds = new Set(
      (recorded.routedErrorRows ?? []).flatMap((row) => row.allOwnerIds ?? [])
    );
    for (const ownerId of routedOwnerIds) {
      if (!summarizedOwnerIds.has(ownerId)) {
        failures.push(`routing summary must include routed owner ${ownerId}`);
      }
    }
  }

  if (summary.directA22MutationPermitted !== false) failures.push("directA22MutationPermitted must be false");
  if ((summary.candidateMutationRows ?? 0) !== 0) failures.push("candidateMutationRows must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (summary.releaseSourceSelected !== false) failures.push("releaseSourceSelected must be false");
  if (summary.promotionEligibleNow !== false) failures.push("promotionEligibleNow must be false");

  for (const rowId of [
    "typecheck-error-rows-structured",
    "clean-source-queue-is-typecheck-build-remediation",
    "owner-routes-present",
    "a22-direct-feature-mutation-blocked",
    "merge-deploy-cleanup-still-blocked"
  ]) {
    const row = validationById(validationRows, rowId);
    if (!row) failures.push(`missing validation row: ${rowId}`);
    if (row?.passed !== true) failures.push(`${rowId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["routesOwnerRemediation", true],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
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

  const markdown = readText(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Type-Check Remediation Routing",
    "Owner Routes",
    "Top Routed Files",
    "Boundary",
    "A22 remains blocked from clean-source promotion"
  ]) {
    if (!markdown.includes(needle)) failures.push(`routing markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("routing markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    remediationStatus: recorded.remediationStatus,
    cleanSourceQueueStatus: recorded.cleanSourceQueueStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    typeCheckErrorLines: typeCheckSummary.errorLineCount ?? 0,
    ownerRouteCount: summary.ownerRouteCount ?? 0,
    routedErrorRows: summary.routedErrorRows ?? 0,
    primaryOwnerIds: summary.primaryOwnerIds ?? [],
    coordinationOwnerIds: summary.coordinationOwnerIds ?? [],
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 top clean candidate type-check remediation routing gate");
    console.log(`Remediation status: ${payload.remediationStatus ?? "unknown"}`);
    console.log(`Owner routes: ${payload.ownerRouteCount ?? 0}`);
    console.log(`Routed error rows: ${payload.routedErrorRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate type-check remediation routing gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
