#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS,
  buildNextOwnerCompactRequestBundle,
  stableNextOwnerCompactRequestBundleProjection
} from "./generate-next-owner-compact-request-bundle.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-compact-request-bundle-current-gate.json");
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
    NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestJson,
    NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures, compactStatus: "missing" });

  const recorded = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestJson);
  const current = buildNextOwnerCompactRequestBundle();
  if (!sameJson(stableNextOwnerCompactRequestBundleProjection(recorded), stableNextOwnerCompactRequestBundleProjection(current))) {
    failures.push("A25 next owner compact request bundle is stale");
  }

  const summary = recorded.summary ?? {};
  const backlogQueue = recorded.authorizationBacklogQueue ?? {};
  const backlogSummary = backlogQueue.summary ?? {};
  if (recorded.compactStatus !== "waiting-for-owner-input" && recorded.compactStatus !== "ready-for-merge-instruction") {
    failures.push(`compactStatus is not recognized: ${recorded.compactStatus}`);
  }
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures array must be empty");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) < (summary.focusBatchPendingRows ?? 0)) {
    failures.push("pending canonical authorizations must cover focus-batch pending rows");
  }
  if ((summary.focusBatchPendingRows ?? 0) + (summary.focusBatchAcceptedRows ?? 0) !== (summary.focusBatchRows ?? 0)) {
    failures.push("focus-batch pending plus accepted rows must equal total focus-batch rows");
  }
  if ((recorded.focusAuthorizationRows ?? []).length !== (summary.focusBatchRows ?? 0)) {
    failures.push("focusAuthorizationRows length must match focusBatchRows");
  }
  if ((summary.backlogQueueRows ?? 0) !== (backlogQueue.queueRows ?? []).length) {
    failures.push("summary.backlogQueueRows must match authorization backlog queueRows length");
  }
  if ((summary.backlogQueueRows ?? 0) !== (summary.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("backlogQueueRows must match pending canonical authorization rows");
  }
  if ((summary.backlogCurrentFocusRows ?? 0) !== (summary.focusBatchPendingRows ?? 0)) {
    failures.push("backlog current-focus rows must match focus-batch pending rows");
  }
  if ((summary.backlogCurrentFocusRows ?? 0) !== (backlogQueue.currentFocusApprovalIds ?? []).length) {
    failures.push("backlog current-focus approval IDs must match summary");
  }
  if ((summary.backlogHeldRows ?? 0) !== (backlogQueue.heldApprovalIds ?? []).length) {
    failures.push("backlog held approval IDs must match summary");
  }
  if ((summary.backlogAuthorizableNowRows ?? 0) !== (summary.focusBatchPendingRows ?? 0)) {
    failures.push("only current focus rows should be authorizable now");
  }
  if ((backlogSummary.cleanupAuthorizedRows ?? 0) !== 0 || (backlogSummary.executableRows ?? 0) !== 0) {
    failures.push("authorization backlog queue must remain non-cleanup and non-executable");
  }
  if ((recorded.executionInstructionRequests ?? []).length !== (summary.executionInstructionRequestRows ?? 0)) {
    failures.push("executionInstructionRequests length must match executionInstructionRequestRows");
  }
  if ((summary.effectivePendingReadyExecutionInstructionRows ?? 0) > 0 && (recorded.executionInstructionRequests ?? []).length === 0) {
    failures.push("pending ready execution-instruction rows require executionInstructionRequests");
  }
  const batchRequest = recorded.batchAuthorizationRequest ?? {};
  if ((summary.focusBatchPendingRows ?? 0) > 0) {
    const pendingFocusRows = (recorded.focusAuthorizationRows ?? []).filter((row) => row.accepted !== true);
    if (batchRequest.pendingRows !== pendingFocusRows.length) {
      failures.push("batchAuthorizationRequest.pendingRows must match pending focus authorization rows");
    }
    if ((batchRequest.approvalIds ?? []).length !== pendingFocusRows.length) {
      failures.push("batchAuthorizationRequest approvalIds must cover every pending focus row");
    }
    for (const row of pendingFocusRows) {
      if (!(batchRequest.approvalIds ?? []).includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest missing approvalId ${row.approvalId}`);
      }
      if (!batchRequest.copyableApprovalText?.includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest copyable text must include ${row.approvalId}`);
      }
      if (!batchRequest.copyableOwnerReplyTextZh?.includes(row.approvalId)) {
        failures.push(`batchAuthorizationRequest Chinese reply text must include ${row.approvalId}`);
      }
    }
    if (batchRequest.everyRowReviewedCommit !== true) {
      failures.push("batchAuthorizationRequest must confirm every current focus row is reviewed commit");
    }
    for (const requiredText of [
      "selectedFinalState=reviewed commit for every row",
      "do not authorize cleanup",
      "do not authorize deploy",
      "do not authorize merge",
      "do not authorize destructive Git",
      "do not authorize physical lifecycle cleanup"
    ]) {
      if (!batchRequest.copyableApprovalText?.includes(requiredText)) {
        failures.push(`batchAuthorizationRequest copyable text missing: ${requiredText}`);
      }
    }
    for (const requiredText of [
      "selectedFinalState=reviewed commit",
      "不授权 cleanup",
      "不授权 deploy",
      "不授权 merge",
      "不授权 destructive git",
      "不授权 physical lifecycle cleanup"
    ]) {
      if (!batchRequest.copyableOwnerReplyTextZh?.includes(requiredText)) {
        failures.push(`batchAuthorizationRequest Chinese reply text missing: ${requiredText}`);
      }
    }
    const batchBoundary = batchRequest.boundary ?? {};
    for (const [key, expected] of [
      ["recordsAuthorizationOnlyAfterExplicitOwnerReply", true],
      ["cleanupAuthorized", false],
      ["deployAuthorized", false],
      ["mergeAuthorized", false],
      ["destructiveGitAuthorized", false],
      ["physicalCleanupAuthorized", false],
      ["executableNow", false]
    ]) {
      if (batchBoundary[key] !== expected) failures.push(`batchAuthorizationRequest.boundary.${key} must be ${expected}`);
    }
  }
  for (const row of recorded.focusAuthorizationRows ?? []) {
    if (!row.approvalId) failures.push("focus authorization row missing approvalId");
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} authorization text must include approvalId`);
    }
    if (row.recommendedAuthorizationText && !row.recommendedAuthorizationText.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} recommended authorization text must include approvalId`);
    }
    if (row.ledgerSelectedFinalState && !row.recommendedAuthorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} recommended authorization text must include ledger selected final state`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId} must not be executable`);
  }
  for (const row of backlogQueue.queueRows ?? []) {
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: backlog row must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: backlog row must not be executable`);
    if (row.queueClass === "current-focus-batch" && row.authorizableNow !== true) {
      failures.push(`${row.approvalId}: current-focus backlog row must be authorizableNow`);
    }
    if (row.queueClass !== "current-focus-batch" && row.authorizableNow === true) {
      failures.push(`${row.approvalId}: non-focus backlog row must not be authorizableNow`);
    }
  }
  for (const row of recorded.executionInstructionRequests ?? []) {
    if (!row.approvalId) failures.push("execution instruction request missing approvalId");
    if (!row.copyableExecutionText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId ?? "(missing approvalId)"} execution text must include approvalId`);
    }
    if ((row.exactCommandSequence ?? []).length === 0) failures.push(`${row.approvalId} must include an exact command sequence`);
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId} must not be executable`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.recordsAuthorization !== false) failures.push("boundary.recordsAuthorization must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.dirtyRootDeployAuthorized !== false) failures.push("boundary.dirtyRootDeployAuthorized must be false");
  if (boundary.physicalCleanupAuthorized !== false) failures.push("boundary.physicalCleanupAuthorized must be false");

  const markdown = readText(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestMarkdown);
  for (const needle of [
    "Next Owner Compact Request Bundle",
    "does not authorize staging",
    "Required Owner Inputs",
    "Batch Authorization Text",
    "Authorization Backlog Queue",
    "Backlog equation",
    "Copyable owner approval text",
    "Copyable owner reply text (Chinese)",
    "Focus Batch Authorization Requests",
    "Ledger-backed recommended authorization texts",
    "Execution Instruction Requests",
    "Merge remains blocked"
  ]) {
    if (!markdown.includes(needle)) failures.push(`compact request markdown missing text: ${needle}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    compactStatus: recorded.compactStatus,
    focusBatchPendingRows: summary.focusBatchPendingRows,
    executionInstructionRequestRows: summary.executionInstructionRequestRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next owner compact request bundle gate");
    console.log(`Compact status: ${payload.compactStatus ?? "unknown"}`);
    console.log(`Focus-batch pending rows: ${payload.focusBatchPendingRows ?? 0}`);
    console.log(`Execution instruction request rows: ${payload.executionInstructionRequestRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next owner compact request bundle gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
