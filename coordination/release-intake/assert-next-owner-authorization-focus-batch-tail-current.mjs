#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-tail-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  focusBatch: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  ownerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  recordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  canonicalPreview: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-preview.json",
  canonicalRecordingDryRun: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-canonical-recording-dry-run.json"
};

const tailAwareScripts = [
  "coordination/release-intake/assert-next-owner-authorization-focus-batch-current.mjs",
  "coordination/release-intake/assert-next-owner-authorization-focus-batch-acceptance-docket-current.mjs",
  "coordination/release-intake/assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs",
  "coordination/release-intake/assert-next-owner-authorization-focus-batch-recording-intake-current.mjs",
  "coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs"
];

const forbiddenTailRegressionSnippets = [
  "generatedArtifactFocus ? 2 : 5",
  "must track 5 rows",
  "must contain 5 rows",
  "owner-input scaffold must track 5 rows",
  "recording intake must track 5 rows",
  "five-preview-rows"
];

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

function ids(rows) {
  return (rows ?? []).map((row) => row.approvalId).filter(Boolean);
}

function sameIds(left, right) {
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}

function sourceClean(label, artifact, expectedSignature, expectedEntries, failures) {
  if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  if ((artifact.sourceCurrentnessFailures ?? []).length !== 0) failures.push(`${label} sourceCurrentnessFailures must be empty`);
  if ((artifact.summary?.sourceCurrentnessFailures ?? 0) !== 0) failures.push(`${label} summary.sourceCurrentnessFailures must be 0`);
}

function assertNoCleanupOrExecution(label, artifact, failures) {
  const cleanupRows = artifact.summary?.cleanupAuthorizedRows ?? artifact.cleanupAuthorizedRows ?? 0;
  const executableRows = artifact.summary?.executableRows ?? artifact.executableRows ?? 0;
  if (cleanupRows !== 0) failures.push(`${label} cleanupAuthorizedRows must be 0`);
  if (executableRows !== 0) failures.push(`${label} executableRows must be 0`);
  for (const [key, expected] of [
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false]
  ]) {
    if (artifact.boundary && artifact.boundary[key] !== expected) failures.push(`${label} boundary.${key} must be ${expected}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  for (const scriptPath of tailAwareScripts) {
    if (!exists(scriptPath)) failures.push(`missing tail-aware script: ${scriptPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const focusBatch = readJson(paths.focusBatch);
  const acceptanceDocket = readJson(paths.acceptanceDocket);
  const ownerInputScaffold = readJson(paths.ownerInputScaffold);
  const recordingIntake = readJson(paths.recordingIntake);
  const canonicalPreview = readJson(paths.canonicalPreview);
  const canonicalRecordingDryRun = readJson(paths.canonicalRecordingDryRun);

  const expectedSignature = focusBatch.dirtyMapStatusSignature;
  const expectedEntries = focusBatch.expandedStatusEntries;
  for (const [label, artifact] of [
    ["acceptance docket", acceptanceDocket],
    ["owner-input scaffold", ownerInputScaffold],
    ["recording intake", recordingIntake],
    ["canonical preview", canonicalPreview],
    ["canonical recording dry-run", canonicalRecordingDryRun]
  ]) {
    sourceClean(label, artifact, expectedSignature, expectedEntries, failures);
    assertNoCleanupOrExecution(label, artifact, failures);
  }
  assertNoCleanupOrExecution("focus batch", focusBatch, failures);

  const selectedRoundId = focusBatch.batchPolicy?.selectedRoundId ?? "";
  const ownerPackageFocus = selectedRoundId === "remaining-owner-package-final-states";
  const generatedArtifactFocus = selectedRoundId === "a22-generated-artifact-residual-cleanup-authorizations";
  if (!ownerPackageFocus && !generatedArtifactFocus) failures.push(`unsupported selectedRoundId: ${selectedRoundId}`);

  const nextBatchRows = focusBatch.nextBatchRows ?? [];
  const selectedRoundSummary = (focusBatch.roundSummaries ?? []).find((row) => row.id === selectedRoundId) ?? null;
  const configuredBatchSize = Number(focusBatch.batchPolicy?.batchSize ?? nextBatchRows.length);
  const selectableRows = Number(selectedRoundSummary?.selectableRows ?? nextBatchRows.length);
  const expectedRows = ownerPackageFocus
    ? Math.min(configuredBatchSize, selectableRows)
    : selectableRows;
  const tailBatch = ownerPackageFocus && selectableRows > 0 && selectableRows < configuredBatchSize;
  const tailBatchStatus = tailBatch ? "owner-package-tail-batch" : "not-tail-batch";

  if (!selectedRoundSummary) failures.push(`missing selected round summary: ${selectedRoundId}`);
  if (nextBatchRows.length !== expectedRows) failures.push(`focus batch row count must be ${expectedRows}; got ${nextBatchRows.length}`);
  if (tailBatch && (focusBatch.summary?.deferredOwnerPackageRows ?? 0) !== 0) {
    failures.push("owner-package tail batch must not leave deferred owner-package rows");
  }
  if (tailBatch && nextBatchRows.length !== selectableRows) {
    failures.push("owner-package tail batch must include every remaining selectable owner-package row");
  }

  const acceptanceRows = acceptanceDocket.acceptanceRows ?? [];
  const ownerInputRows = ownerInputScaffold.ownerInputRows ?? [];
  const intakeRows = recordingIntake.focusBatchRows ?? [];
  const previewRows = canonicalPreview.previewRows ?? [];
  const recordingApprovalRows = (canonicalRecordingDryRun.approvalIds ?? []).map((approvalId) => ({ approvalId }));
  for (const [label, rows] of [
    ["acceptance docket", acceptanceRows],
    ["owner-input scaffold", ownerInputRows],
    ["recording intake", intakeRows],
    ["canonical preview", previewRows],
    ["canonical recording dry-run", recordingApprovalRows]
  ]) {
    if (rows.length !== nextBatchRows.length) failures.push(`${label} row count must match focus batch`);
    if (!sameIds(rows, nextBatchRows)) failures.push(`${label} approval IDs must match focus batch`);
  }

  for (const row of nextBatchRows) {
    if (row.sourceRoundId !== selectedRoundId) failures.push(`${row.approvalId}: sourceRoundId must be ${selectedRoundId}`);
    if (ownerPackageFocus && row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: owner-package tail rows must be owner-package`);
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (row.held === true) failures.push(`${row.approvalId}: held rows must not enter the focus batch`);
  }

  const dryRunSummary = canonicalRecordingDryRun.summary ?? {};
  if (canonicalRecordingDryRun.mode !== "dry-run") failures.push("canonical recording payload must be dry-run");
  if (dryRunSummary.applyPermitted !== false) failures.push("canonical recording dry-run applyPermitted must be false");
  if (dryRunSummary.mutationsPerformed !== false) failures.push("canonical recording dry-run mutationsPerformed must be false");
  if ((dryRunSummary.recordsAuthorizationRows ?? 0) !== 0) failures.push("canonical recording dry-run must not record authorization rows");
  if ((dryRunSummary.approvalRows ?? 0) !== nextBatchRows.length) failures.push("canonical recording dry-run approvalRows must match focus batch");

  for (const scriptPath of tailAwareScripts) {
    const source = readText(scriptPath);
    for (const snippet of forbiddenTailRegressionSnippets) {
      if (source.includes(snippet)) failures.push(`${scriptPath} contains tail-batch regression snippet: ${snippet}`);
    }
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: expectedSignature,
    expandedStatusEntries: expectedEntries,
    selectedRoundId,
    tailBatchStatus,
    configuredBatchSize,
    selectableRows,
    focusBatchRows: nextBatchRows.length,
    approvalIds: ids(nextBatchRows),
    downstreamRowCounts: {
      acceptanceDocket: acceptanceRows.length,
      ownerInputScaffold: ownerInputRows.length,
      recordingIntake: intakeRows.length,
      canonicalPreview: previewRows.length,
      canonicalRecordingDryRun: recordingApprovalRows.length
    },
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next-owner authorization focus batch tail gate");
    console.log(`Tail batch status: ${payload.tailBatchStatus ?? "unknown"}`);
    console.log(`Focus rows: ${payload.focusBatchRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch tail gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
