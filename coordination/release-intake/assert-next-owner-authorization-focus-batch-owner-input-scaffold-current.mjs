#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS,
  buildNextOwnerAuthorizationFocusBatchOwnerInputScaffold,
  stableNextOwnerAuthorizationFocusBatchOwnerInputScaffoldProjection
} from "./generate-next-owner-authorization-focus-batch-owner-input-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold-current-gate.json");
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
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestJson);
  const acceptanceDocket = readJson(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.acceptanceDocket);
  const current = buildNextOwnerAuthorizationFocusBatchOwnerInputScaffold();
  if (!sameJson(
    stableNextOwnerAuthorizationFocusBatchOwnerInputScaffoldProjection(recorded),
    stableNextOwnerAuthorizationFocusBatchOwnerInputScaffoldProjection(current)
  )) {
    failures.push("A25 next-owner authorization focus batch owner-input scaffold is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rows = recorded.ownerInputRows ?? [];
  const selectedRoundId = acceptanceDocket.focusBatchPolicy?.selectedRoundId ?? "";
  const generatedArtifactFocus = selectedRoundId === "a22-generated-artifact-residual-cleanup-authorizations";
  const ownerPackageFocus = selectedRoundId === "remaining-owner-package-final-states";
  const expectedBatchRows = (acceptanceDocket.acceptanceRows ?? []).length;

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.canonicalTarget !== NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.canonicalAuthorizations) {
    failures.push("canonicalTarget must point to latest-A25-next-owner-authorizations.json");
  }
  if ((summary.focusBatchRows ?? 0) !== rows.length) failures.push("focusBatchRows must match ownerInputRows length");
  if (!generatedArtifactFocus && !ownerPackageFocus) failures.push(`unsupported selectedRoundId: ${selectedRoundId}`);
  if (rows.length !== expectedBatchRows) failures.push(`owner-input scaffold must track ${expectedBatchRows} rows for ${selectedRoundId}`);
  if ((summary.focusBatchRows ?? 0) !== (acceptanceDocket.acceptanceRows ?? []).length) {
    failures.push("focusBatchRows must match acceptance docket rows");
  }
  if ((summary.acceptedRows ?? 0) + (summary.pendingRows ?? 0) !== rows.length) {
    failures.push("acceptedRows + pendingRows must equal ownerInputRows length");
  }
  if ((summary.heldRows ?? 0) !== (recorded.heldRows ?? []).length) failures.push("heldRows summary must match heldRows length");
  if ((summary.heldRows ?? 0) !== (acceptanceDocket.heldRows ?? []).length) failures.push("heldRows must match acceptance docket dynamic held rows");
  if (!sameJson(recorded.heldPolicyApprovalIds, acceptanceDocket.heldPolicyApprovalIds)) {
    failures.push("heldPolicyApprovalIds must match acceptance docket held policy IDs");
  }
  if (!sameJson(recorded.heldPolicyApprovalIds, ["wave01-resync-01-tsconfig-json"])) {
    failures.push("held policy must preserve only wave01-resync-01-tsconfig-json");
  }
  if ((summary.ownerInputVisibleRows ?? 0) !== rows.length) {
    failures.push("every focus row must be visible in canonical draft or canonical accepted rows");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");

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

  for (const row of rows) {
    if (row.sourceRoundId !== selectedRoundId) failures.push(`${row.approvalId}: sourceRoundId must be ${selectedRoundId}`);
    if (ownerPackageFocus && row.approvalKind !== "owner-package") failures.push(`${row.approvalId}: approvalKind must be owner-package`);
    if (generatedArtifactFocus && row.approvalKind !== "a22-generated-artifact-residual-cleanup") {
      failures.push(`${row.approvalId}: approvalKind must be a22-generated-artifact-residual-cleanup`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow === true) failures.push(`${row.approvalId}: executableNow must be false`);
    if (!row.canonicalDraftRowPresent && !row.canonicalRowPresent) {
      failures.push(`${row.approvalId}: row must be visible in canonical draft or canonical accepted rows`);
    }
    if (!row.accepted && !row.canonicalDraftRowPresent) {
      failures.push(`${row.approvalId}: pending row must be visible as a canonical draft row`);
    }
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId}: requiredAuthorizationText must name the approval ID`);
    }
    if (ownerPackageFocus) {
      if (!row.ledgerSelectedFinalState) failures.push(`${row.approvalId}: ledgerSelectedFinalState must be present for owner-package focus rows`);
      if (!row.recommendedAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
        failures.push(`${row.approvalId}: recommendedAuthorizationText must name the approval ID`);
      }
      if (!row.recommendedAuthorizationText?.includes(`selectedFinalState=${row.ledgerSelectedFinalState}`)) {
        failures.push(`${row.approvalId}: recommendedAuthorizationText must include the ledger selected final state`);
      }
    }
    const requiredFields = generatedArtifactFocus
      ? ["selectedAction", "exactCommand", "approvedBy", "approvedAt", "evidenceReviewed", "notes", "authorizationText"]
      : ["selectedFinalState", "approvedBy", "approvedAt", "evidenceReviewed", "notes", "authorizationText"];
    for (const requiredField of requiredFields) {
      if (!(row.requiredOwnerFields ?? []).includes(requiredField)) {
        failures.push(`${row.approvalId}: requiredOwnerFields must include ${requiredField}`);
      }
    }
    if (generatedArtifactFocus && row.exactCommand !== "node scripts/cleanup-generated-artifacts.mjs --apply --scope all") {
      failures.push(`${row.approvalId}: generated cleanup owner-input row must preserve cleanup script apply command`);
    }
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_FOCUS_BATCH_OWNER_INPUT_SCAFFOLD_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Next Owner Authorization Focus Batch Owner Input Scaffold",
    "This scaffold is evidence-only",
    "Canonical target",
    "Owner Input Rows",
    "Exact Pending Authorization Texts",
    "Ledger-Backed Recommended Authorization Texts",
    "Draft rows are not approvals",
    "Held Policy Approval IDs",
    "wave01-resync-01-tsconfig-json"
  ]) {
    if (!markdown.includes(needle)) failures.push(`owner-input scaffold markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("owner-input scaffold markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    selectedRoundId,
    batchStatus: recorded.batchStatus,
    focusBatchRows: summary.focusBatchRows ?? 0,
    acceptedRows: summary.acceptedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    heldRows: summary.heldRows ?? 0,
    ownerInputVisibleRows: summary.ownerInputVisibleRows ?? 0,
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
    console.log("A25 next-owner authorization focus batch owner-input scaffold gate");
    console.log(`Batch status: ${payload.batchStatus ?? "unknown"}`);
    console.log(`Owner-input visible rows: ${payload.ownerInputVisibleRows ?? 0}/${payload.focusBatchRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization focus batch owner-input scaffold gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
