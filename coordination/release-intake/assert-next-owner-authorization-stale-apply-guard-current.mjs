#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(
  root,
  "coordination",
  "release-intake",
  "latest-A25-next-owner-authorization-stale-apply-guard-current-gate.json"
);
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  canonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  canonicalAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  latestApply: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-apply.json"
};

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function sameStringSet(left, right) {
  const leftSet = new Set(left ?? []);
  const rightSet = new Set(right ?? []);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((value) => rightSet.has(value));
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next-owner authorization stale apply guard");
    console.log(`Latest apply status: ${payload.latestApplyStatus}`);
    console.log(`Current focus rows: ${payload.currentFocusRows}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization stale apply guard failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  const dirtyMap = readJson(paths.dirtyMap);
  const currentPreview = readJson(paths.canonicalPreview);
  const canonicalAuthorizations = readJson(paths.canonicalAuthorizations);
  const currentFocusApprovalIds = (currentPreview.previewRows ?? []).map((row) => row.approvalId);
  const authorizedIds = new Set((canonicalAuthorizations.authorizations ?? []).map((row) => row.approvalId));
  const pendingIds = new Set((canonicalAuthorizations.draftAuthorizationsDoNotAuthorize ?? []).map((row) => row.approvalId));

  let latestApply = null;
  if (exists(paths.latestApply)) latestApply = readJson(paths.latestApply);

  const latestApplyApprovalIds = latestApply?.approvalIds ?? [];
  const latestApplyExists = Boolean(latestApply);
  const latestApplyMatchesCurrentFocus = latestApplyExists && sameStringSet(latestApplyApprovalIds, currentFocusApprovalIds);
  const latestApplySignatureMatchesCurrent =
    latestApplyExists &&
    latestApply.dirtyMapStatusSignature === dirtyMap.statusSignature &&
    latestApply.expandedStatusEntries === (dirtyMap.statusCounts?.expandedStatusEntries ?? null);
  const staleApplyArtifact = latestApplyExists && !latestApplyMatchesCurrentFocus;
  const latestApplyIdsAlreadyAuthorized = latestApplyApprovalIds.every((approvalId) => authorizedIds.has(approvalId));
  const latestApplyIdsStillPending = latestApplyApprovalIds.filter((approvalId) => pendingIds.has(approvalId));
  const currentFocusIdsAlreadyAuthorized = currentFocusApprovalIds.filter((approvalId) => authorizedIds.has(approvalId));
  const summary = latestApply?.summary ?? {};
  const boundary = latestApply?.boundary ?? {};
  const currentRecordedApplyArtifact =
    staleApplyArtifact &&
    latestApplySignatureMatchesCurrent &&
    currentFocusApprovalIds.length === 0 &&
    latestApplyApprovalIds.length > 0 &&
    latestApplyIdsAlreadyAuthorized &&
    latestApplyIdsStillPending.length === 0 &&
    (summary.recordsAuthorizationRows ?? 0) === latestApplyApprovalIds.length &&
    (summary.mutationsPerformed ?? false) === true &&
    (summary.cleanupAuthorizedRows ?? 0) === 0 &&
    (summary.executableRows ?? 0) === 0;

  if (!Array.isArray(currentPreview.previewRows)) {
    failures.push("canonical preview must expose previewRows");
  }
  if ((currentPreview.summary?.sourceCurrentnessFailures ?? 0) !== 0) {
    failures.push("canonical preview has source currentness failures");
  }
  if ((canonicalAuthorizations.cleanupAuthorized ?? false) !== false) {
    failures.push("canonical authorizations must not authorize cleanup");
  }
  if ((canonicalAuthorizations.executableNow ?? false) !== false) {
    failures.push("canonical authorizations must not mark rows executable");
  }
  if (currentFocusIdsAlreadyAuthorized.length > 0) {
    failures.push(`current focus rows must remain pending, but already authorized: ${currentFocusIdsAlreadyAuthorized.join(",")}`);
  }

  if (latestApplyExists) {
    if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("latest apply artifact must not authorize cleanup rows");
    if ((summary.executableRows ?? 0) !== 0) failures.push("latest apply artifact must not make rows executable");
    if (boundary.recordsExecutionInstruction !== false) failures.push("latest apply artifact must not record execution instruction");
    if (boundary.mergeAuthorized !== false) failures.push("latest apply artifact must not authorize merge");
    if (boundary.cleanupAuthorized !== false) failures.push("latest apply artifact must not authorize cleanup");
    if (boundary.destructiveGitAuthorized !== false) failures.push("latest apply artifact must not authorize destructive Git");
    if (boundary.deployAuthorized !== false) failures.push("latest apply artifact must not authorize deploy");
  }

  if (staleApplyArtifact) {
    if (latestApplySignatureMatchesCurrent && !currentRecordedApplyArtifact) {
      failures.push("stale apply artifact must not share the current dirty-map signature");
    }
    if (!latestApplyIdsAlreadyAuthorized) {
      failures.push("stale apply artifact approval IDs must already be recorded in canonical authorizations");
    }
    if (latestApplyIdsStillPending.length > 0) {
      failures.push(`stale apply artifact approval IDs must not remain pending: ${latestApplyIdsStillPending.join(",")}`);
    }
    if ((summary.sourceCurrentnessFailures ?? 0) === 0 && !currentRecordedApplyArtifact) {
      failures.push("stale apply artifact must report at least one source currentness failure");
    }
    if ((summary.applyPermitted ?? true) !== false) {
      failures.push("stale apply artifact must not be currently apply-permitted");
    }
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    currentFocusRows: currentFocusApprovalIds.length,
    currentFocusApprovalIds,
    latestApplyStatus: latestApplyExists
      ? (currentRecordedApplyArtifact
          ? "current-recorded-apply-artifact"
          : (staleApplyArtifact ? "stale-idempotent-artifact" : "matches-current-focus"))
      : "absent",
    latestApplyExists,
    latestApplyGeneratedAt: latestApply?.generatedAt ?? null,
    latestApplyDirtyMapStatusSignature: latestApply?.dirtyMapStatusSignature ?? null,
    latestApplyExpandedStatusEntries: latestApply?.expandedStatusEntries ?? null,
    latestApplyApprovalIds,
    latestApplyMatchesCurrentFocus,
    latestApplySignatureMatchesCurrent,
    currentRecordedApplyArtifact,
    latestApplyIdsAlreadyAuthorized,
    latestApplyIdsStillPending,
    currentFocusIdsAlreadyAuthorized,
    sourceCurrentnessFailures: summary.sourceCurrentnessFailures ?? 0,
    applyPermitted: summary.applyPermitted ?? false,
    recordsAuthorizationRows: summary.recordsAuthorizationRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

main();
