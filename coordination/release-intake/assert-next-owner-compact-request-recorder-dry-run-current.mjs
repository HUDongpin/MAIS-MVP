#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS,
  buildNextOwnerCompactRequestBundle,
  stableNextOwnerCompactRequestBundleProjection
} from "./generate-next-owner-compact-request-bundle.mjs";
import {
  buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState
} from "./run-next-owner-authorization-focus-batch-canonical-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(
  root,
  "coordination",
  "release-intake",
  "latest-A25-next-owner-compact-request-recorder-dry-run-current-gate.json"
);
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next-owner compact request recorder dry-run gate");
    console.log(`Recorder status: ${payload.recorderStatus ?? "unknown"}`);
    console.log(`Focus-batch pending rows: ${payload.focusBatchPendingRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner compact request recorder dry-run gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  const recordedCompact = readJson(NEXT_OWNER_COMPACT_REQUEST_BUNDLE_PATHS.latestJson);
  const currentCompact = buildNextOwnerCompactRequestBundle();

  if (!sameJson(
    stableNextOwnerCompactRequestBundleProjection(recordedCompact),
    stableNextOwnerCompactRequestBundleProjection(currentCompact)
  )) {
    failures.push("compact request bundle is stale");
  }

  const batchRequest = recordedCompact.batchAuthorizationRequest ?? {};
  const focusBatchPendingRows = recordedCompact.summary?.focusBatchPendingRows ?? 0;
  const ownerApprovalText = batchRequest.copyableOwnerReplyTextZh ?? "";

  if (focusBatchPendingRows > 0 && !ownerApprovalText) {
    failures.push("compact request bundle must expose Chinese owner reply text for pending rows");
  }

  const dryRun = buildNextOwnerAuthorizationFocusBatchCanonicalRecordingState({
    mode: "dry-run",
    approvedBy: "dongpinhu",
    approvedAt: "2026-07-06T00:00:00.000Z",
    ownerApprovalText
  });

  const summary = dryRun.summary ?? {};
  const expectedApprovalIds = batchRequest.approvalIds ?? [];

  if (focusBatchPendingRows > 0) {
    if (dryRun.recorderStatus !== "dry-run-ready-requires-explicit-apply") {
      failures.push(`recorderStatus must be dry-run-ready-requires-explicit-apply for pending compact owner reply text; got ${dryRun.recorderStatus}`);
    }
    if ((summary.approvalRows ?? 0) !== focusBatchPendingRows) {
      failures.push("dry-run approvalRows must match compact focusBatchPendingRows");
    }
    if ((summary.ownerApprovalFieldsPresent ?? 0) !== focusBatchPendingRows) {
      failures.push("dry-run ownerApprovalFieldsPresent must match compact focusBatchPendingRows");
    }
    if (summary.ownerApprovalTextCoversRows !== true) {
      failures.push("dry-run owner approval text must cover every focus row");
    }
    if (summary.ownerApprovalTextHasNegativeBoundaries !== true) {
      failures.push("dry-run owner approval text must keep every negative boundary");
    }
    for (const approvalId of expectedApprovalIds) {
      if (!(dryRun.approvalIds ?? []).includes(approvalId)) {
        failures.push(`dry-run approvalIds missing ${approvalId}`);
      }
      if (!ownerApprovalText.includes(approvalId)) {
        failures.push(`owner reply text missing ${approvalId}`);
      }
    }
  } else if (!["no-pending-focus-rows", "already-recorded"].includes(dryRun.recorderStatus)) {
    failures.push(`recorderStatus is not valid for empty compact focus batch: ${dryRun.recorderStatus}`);
  }

  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("dry-run sourceCurrentnessFailures must be 0");
  if ((summary.applyPermitted ?? false) !== false) failures.push("dry-run must not permit apply");
  if ((summary.recordsAuthorizationRows ?? 0) !== 0) failures.push("dry-run must not record authorization rows");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("dry-run must not authorize cleanup");
  if ((summary.executableRows ?? 0) !== 0) failures.push("dry-run must not make rows executable");

  const boundary = dryRun.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("dry-run boundary.evidenceOnly must be true");
  if (boundary.dryRunOnly !== true) failures.push("dry-run boundary.dryRunOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("dry-run must not record owner approval");
  if (boundary.promotesCanonicalRows !== false) failures.push("dry-run must not promote canonical rows");
  if (boundary.mergeAuthorized !== false) failures.push("dry-run must not authorize merge");
  if (boundary.cleanupAuthorized !== false) failures.push("dry-run must not authorize cleanup");
  if (boundary.destructiveGitAuthorized !== false) failures.push("dry-run must not authorize destructive Git");
  if (boundary.deployAuthorized !== false) failures.push("dry-run must not authorize deploy");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    compactStatus: recordedCompact.compactStatus,
    focusBatchPendingRows,
    approvalIds: expectedApprovalIds,
    recorderStatus: dryRun.recorderStatus,
    ownerApprovalTextCoversRows: summary.ownerApprovalTextCoversRows === true,
    ownerApprovalTextHasNegativeBoundaries: summary.ownerApprovalTextHasNegativeBoundaries === true,
    ownerApprovalFieldsPresent: summary.ownerApprovalFieldsPresent ?? 0,
    recordsAuthorizationRows: summary.recordsAuthorizationRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

main();
