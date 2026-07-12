#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORIZATION_BACKLOG_QUEUE_PATHS,
  buildAuthorizationBacklogQueue,
  stableAuthorizationBacklogQueueProjection
} from "./generate-authorization-backlog-queue.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-authorization-backlog-queue-current-gate.json");
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

function sameArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function main() {
  const failures = [];
  for (const requiredPath of [
    AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestJson,
    AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestJson);
  const shrinkMap = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.authorizationGapShrinkMap);
  const focusBatch = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.nextOwnerAuthorizationFocusBatch);
  const current = buildAuthorizationBacklogQueue();
  if (!sameJson(stableAuthorizationBacklogQueueProjection(recorded), stableAuthorizationBacklogQueueProjection(current))) {
    failures.push("A25 authorization backlog queue is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.queueRows ?? [];
  const ids = rows.map((row) => row.approvalId).filter(Boolean);
  const uniqueIds = new Set(ids);
  const focusIds = (focusBatch.nextBatchRows ?? []).map((row) => row.approvalId);
  const heldIds = (focusBatch.heldRows ?? []).map((row) => row.approvalId);
  const heldPolicyIds = focusBatch.batchPolicy?.heldApprovalIds ?? [];
  const classCounts = recorded.countsByQueueClass ?? {};
  const pendingCanonicalRows = shrinkMap.summary?.pendingCanonicalAuthorizationRows ?? 0;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.queueRows ?? 0) !== rows.length) failures.push("summary.queueRows must match queueRows length");
  if (rows.length !== pendingCanonicalRows) failures.push("queueRows must match authorization gap pending canonical rows");
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) !== pendingCanonicalRows) {
    failures.push("summary pending canonical authorization rows must match shrink map");
  }
  if (uniqueIds.size !== ids.length) failures.push("queueRows must have unique approval IDs");
  if ((summary.currentFocusRows ?? 0) !== focusIds.length) failures.push("currentFocusRows must match focus batch rows");
  if (!sameArray(recorded.currentFocusApprovalIds, focusIds)) failures.push("currentFocusApprovalIds must match focus batch approval IDs");
  if ((summary.heldRows ?? 0) !== heldIds.length) failures.push("heldRows must match focus batch held rows");
  if (!sameArray(recorded.heldApprovalIds, heldIds)) failures.push("heldApprovalIds must match focus batch held approval IDs");
  if (!sameArray(recorded.heldPolicyApprovalIds, heldPolicyIds)) {
    failures.push("heldPolicyApprovalIds must match focus batch held policy approval IDs");
  }
  if (!sameArray(heldPolicyIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("held policy IDs must preserve only wave01-resync-01-tsconfig-json");
  }
  if ((summary.deferredPhysicalLifecycleRows ?? 0) !== (focusBatch.summary?.physicalLifecycleRowsDeferred ?? 0)) {
    failures.push("deferredPhysicalLifecycleRows must match focus batch deferred physical lifecycle rows");
  }
  if ((summary.deferredOwnerPackageRows ?? 0) !== (focusBatch.summary?.deferredOwnerPackageRows ?? 0)) {
    failures.push("deferredOwnerPackageRows must match focus batch deferred owner-package rows");
  }
  if ((summary.deferredGeneratedArtifactRows ?? 0) !== (focusBatch.summary?.generatedArtifactRowsDeferred ?? 0)) {
    failures.push("deferredGeneratedArtifactRows must match focus batch deferred generated artifact rows");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.nonExecutableRows ?? 0) !== rows.length) failures.push("all queue rows must be non-executable");
  if ((classCounts["current-focus-batch"] ?? 0) !== (summary.currentFocusRows ?? 0)) {
    failures.push("class count for current-focus-batch must match summary");
  }
  if ((classCounts["held-not-authorizable"] ?? 0) !== (summary.heldRows ?? 0)) {
    failures.push("class count for held-not-authorizable must match summary");
  }
  if ((classCounts["deferred-physical-lifecycle"] ?? 0) !== (summary.deferredPhysicalLifecycleRows ?? 0)) {
    failures.push("class count for deferred-physical-lifecycle must match summary");
  }

  const countedRows = (summary.currentFocusRows ?? 0)
    + (summary.heldRows ?? 0)
    + (summary.deferredOwnerPackageRows ?? 0)
    + (summary.deferredPhysicalLifecycleRows ?? 0)
    + (summary.deferredGeneratedArtifactRows ?? 0)
    + (summary.deferredOtherRows ?? 0);
  if (countedRows !== rows.length) failures.push("queue class counts must sum to queueRows length");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsAuthorizationFile", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const row of rows) {
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (row.queueClass === "current-focus-batch") {
      if (!focusIds.includes(row.approvalId)) failures.push(`${row.approvalId}: current focus row must be in focus batch`);
      if (row.authorizableNow !== true) failures.push(`${row.approvalId}: current focus row must be authorizableNow`);
      if (row.queueStatus !== "waiting-for-owner-authorization") failures.push(`${row.approvalId}: current focus row status must wait for owner authorization`);
    } else if (row.authorizableNow === true) {
      failures.push(`${row.approvalId}: only current focus rows may be authorizableNow`);
    }
    if (row.queueClass === "held-not-authorizable" && !heldIds.includes(row.approvalId)) {
      failures.push(`${row.approvalId}: held row must match focus batch held IDs`);
    }
    if (row.queueClass === "deferred-physical-lifecycle" && row.approvalKind !== "physical-lifecycle") {
      failures.push(`${row.approvalId}: deferred physical lifecycle row must have physical-lifecycle kind`);
    }
  }

  const markdown = readText(AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Authorization Backlog Queue",
    "This queue is evidence-only",
    "Backlog Equation",
    "current focus",
    "deferred physical lifecycle",
    "Held Policy Approval IDs",
    "Every queued row remains non-executable",
    "does not authorize cleanup"
  ]) {
    if (!markdown.includes(needle)) failures.push(`authorization backlog queue markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("authorization backlog queue markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    queueRows: summary.queueRows ?? 0,
    currentFocusRows: summary.currentFocusRows ?? 0,
    heldRows: summary.heldRows ?? 0,
    deferredPhysicalLifecycleRows: summary.deferredPhysicalLifecycleRows ?? 0,
    deferredOwnerPackageRows: summary.deferredOwnerPackageRows ?? 0,
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
    console.log("A25 authorization backlog queue gate");
    console.log(`Queue rows: ${payload.queueRows ?? 0}`);
    console.log(`Current focus rows: ${payload.currentFocusRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 authorization backlog queue gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
