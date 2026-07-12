#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS,
  buildNextOwnerAuthorizationFocusBatch,
  stableNextOwnerAuthorizationFocusBatchProjection
} from "./generate-next-owner-authorization-focus-batch.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-current-gate.json");
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

function generatedArtifactCommandAllowed(row) {
  if (row.selectedAction === "owner-approved-generated-artifact-cleanup-script-apply") {
    return row.exactCommand === "node scripts/cleanup-generated-artifacts.mjs --apply --scope all";
  }
  if (row.selectedAction === "owner-approved-exact-generated-directory-removal") {
    return /^\.s11-parent-audit-next\d+$/.test(row.path ?? "") &&
      (
        row.exactCommand === `git clean -fdX -- ${row.path}` ||
        row.exactCommand === `git clean -fd -- ${row.path}`
      );
  }
  return false;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestJson);
  const shrinkMap = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.authorizationGapShrinkMap);
  const current = buildNextOwnerAuthorizationFocusBatch();
  if (!sameJson(stableNextOwnerAuthorizationFocusBatchProjection(recorded), stableNextOwnerAuthorizationFocusBatchProjection(current))) {
    failures.push("A25 next-owner authorization focus batch is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const nextBatchRows = recorded.nextBatchRows ?? [];
  const heldRows = recorded.heldRows ?? [];
  const roundSummaries = recorded.roundSummaries ?? [];
  const selectedRoundId = recorded.batchPolicy?.selectedRoundId ?? "";
  const generatedArtifactFocus = selectedRoundId === "a22-generated-artifact-residual-cleanup-authorizations";
  const ownerPackageFocus = selectedRoundId === "remaining-owner-package-final-states";
  const selectedRoundSummary = roundSummaries.find((row) => row.id === selectedRoundId);
  const wave01RoundSummary = roundSummaries.find((row) => row.id === "wave01-package-resync-authorizations");
  const heldApprovalIds = recorded.batchPolicy?.heldApprovalIds ?? [];
  const expectedBatchRows = generatedArtifactFocus
    ? (selectedRoundSummary?.selectableRows ?? nextBatchRows.length)
    : Math.min(recorded.batchPolicy?.batchSize ?? 5, selectedRoundSummary?.selectableRows ?? nextBatchRows.length);

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) !== (shrinkMap.summary?.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("pendingCanonicalAuthorizationRows must match authorization gap shrink map");
  }
  if ((summary.authorizedCanonicalRows ?? 0) !== (shrinkMap.summary?.authorizedCanonicalRows ?? 0)) {
    failures.push("authorizedCanonicalRows must match authorization gap shrink map");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.nextBatchRows ?? 0) !== nextBatchRows.length) failures.push("summary.nextBatchRows must match nextBatchRows length");
  if (!generatedArtifactFocus && !ownerPackageFocus) failures.push(`unsupported selectedRoundId: ${selectedRoundId}`);
  if (nextBatchRows.length !== expectedBatchRows) failures.push(`next batch must contain ${expectedBatchRows} rows for ${selectedRoundId}`);
  if ((summary.heldRows ?? 0) !== heldRows.length) failures.push("summary.heldRows must match heldRows length");
  if (!sameJson(heldApprovalIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("batch policy must preserve only wave01-resync-01-tsconfig-json as a held approval ID");
  }
  if (!wave01RoundSummary) {
    failures.push("missing wave01 package-resync round summary");
  } else if (heldRows.length !== (wave01RoundSummary.heldRows ?? 0)) {
    failures.push("heldRows must match the current wave01 package-resync round summary");
  }
  if (heldRows.some((row) => row.approvalId !== "wave01-resync-01-tsconfig-json")) {
    failures.push("dynamic heldRows may contain only wave01-resync-01-tsconfig-json");
  }
  if (!recorded.batchPolicy?.excludedRoundIds?.includes("remaining-physical-lifecycle-final-states")) {
    failures.push("batch policy must defer physical lifecycle rows");
  }
  if (ownerPackageFocus && !recorded.batchPolicy?.excludedRoundIds?.includes("a22-generated-artifact-residual-cleanup-authorizations")) {
    failures.push("batch policy must defer A22 generated-artifact cleanup rows");
  }
  if (generatedArtifactFocus && !recorded.batchPolicy?.excludedRoundIds?.includes("remaining-owner-package-final-states")) {
    failures.push("generated-artifact focus must defer owner-package rows");
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["createsAuthorizationFile", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  for (const row of nextBatchRows) {
    if (row.sourceRoundId !== selectedRoundId) failures.push(`${row.approvalId}: sourceRoundId must be ${selectedRoundId}`);
    if (ownerPackageFocus && row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: approvalKind must be owner-package`);
    if (generatedArtifactFocus && row.approvalKind !== "a22-generated-artifact-residual-cleanup") {
      failures.push(`${row.approvalId}: approvalKind must be a22-generated-artifact-residual-cleanup`);
    }
    if (row.held === true) failures.push(`${row.approvalId}: held row must not be selected`);
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (ownerPackageFocus && row.exactCommand) failures.push(`${row.approvalId}: owner-package focus batch must not carry exact cleanup commands`);
    if (generatedArtifactFocus && !generatedArtifactCommandAllowed(row)) {
      failures.push(`${row.approvalId}: generated artifact focus batch must carry a bounded generated-artifact cleanup command`);
    }
    if (ownerPackageFocus) {
      if (!row.ledgerSelectedFinalState) failures.push(`${row.approvalId}: owner-package focus row must include ledgerSelectedFinalState`);
      if (row.selectedFinalState !== row.ledgerSelectedFinalState) {
        failures.push(`${row.approvalId}: selectedFinalState must match ledgerSelectedFinalState`);
      }
      if (!row.authorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
        failures.push(`${row.approvalId}: authorizationText must include the ledger selected final state`);
      }
      if (row.authorizationText?.includes("<reviewed commit |")) {
        failures.push(`${row.approvalId}: authorizationText must not contain the old final-state placeholder menu`);
      }
    }
    if (!row.authorizationText?.includes(`Authorize approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: authorizationText must include approval ID`);
    }
    if ((row.evidenceReviewed ?? []).length < 2) failures.push(`${row.approvalId}: evidenceReviewed must include review inputs`);
    if ((row.postApprovalChecks ?? []).length < 3) failures.push(`${row.approvalId}: postApprovalChecks must include validation commands`);
  }

  if (!selectedRoundSummary) failures.push(`missing selected round summary: ${selectedRoundId}`);
  else {
    if ((selectedRoundSummary.pendingRows ?? 0) < nextBatchRows.length) failures.push("selected round pending rows must cover next batch");
    if ((selectedRoundSummary.executableRows ?? 0) !== 0) failures.push("selected round executableRows must be 0");
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch",
    "This packet is evidence-only",
    "Next Batch Rows",
    "Authorization Text To Review",
    "not execution instructions",
    "Every selected row remains non-executable",
    "wave01-resync-01-tsconfig-json"
  ]) {
    if (!markdown.includes(needle)) failures.push(`focus batch markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("focus batch markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    selectedRoundId,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    heldRows: summary.heldRows ?? 0,
    nextBatchRows: summary.nextBatchRows ?? 0,
    nextBatchCleanupRows: summary.nextBatchCleanupRows ?? 0,
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
    console.log("A25 next-owner authorization focus batch gate");
    console.log(`Next batch rows: ${payload.nextBatchRows ?? 0}`);
    console.log(`Held rows: ${payload.heldRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
