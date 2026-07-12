#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS,
  buildA22RootParitySelectedActionCanonicalPreview,
  stableA22RootParitySelectedActionCanonicalPreviewProjection
} from "./generate-a22-root-parity-selected-action-canonical-preview.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-root-parity-selected-action-canonical-preview-current-gate.json");
const json = process.argv.includes("--json");

const expectedRows = [
  {
    approvalId: "a06-visualization-back-to-top-import-parity",
    selectedAction: "reexport",
    rootSource: "components/visualizations/VisualizationLabBackToTopButton.tsx",
    candidateTarget: "app/visualization-lab/VisualizationLabBackToTopButton.tsx"
  },
  {
    approvalId: "a20-math-virus-blaster-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/mathVirusBlaster.ts",
    candidateTarget: "data/mathVirusBlaster.ts"
  },
  {
    approvalId: "a20-mighty-tank-battle-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/mightyTankBattle.ts",
    candidateTarget: "data/mightyTankBattle.ts"
  },
  {
    approvalId: "a05-california-high-school-lesson-illustration-data-parity",
    selectedAction: "same-path-copy",
    rootSource: "data/usCaliforniaHighSchoolLessonIllustrations.ts",
    candidateTarget: "data/usCaliforniaHighSchoolLessonIllustrations.ts"
  }
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function checkById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestJson,
    A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestJson);
  const current = buildA22RootParitySelectedActionCanonicalPreview();
  const markdown = readText(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestMarkdown);
  const summary = recorded.summary ?? {};
  const ownerApprovedWaitingCandidateMutation = summary.acceptedRows === 4 &&
    summary.pendingRows === 0 &&
    summary.ownerInputBlank === false &&
    summary.ownerActionRowsAccepted === 4 &&
    recorded.topCandidate?.queueActionStatus === "needs-candidate-mutation-owner-input-before-rerun";
  const ownerApprovedPostExtractionVerified = summary.acceptedRows === 4 &&
    summary.pendingRows === 0 &&
    summary.ownerInputBlank === false &&
    summary.ownerActionRowsAccepted === 4 &&
    recorded.topCandidate?.queueActionStatus === "needs-typecheck-remediation-and-fresh-build-observation";
  const ownerApprovedSelectedActions = ownerApprovedWaitingCandidateMutation || ownerApprovedPostExtractionVerified;
  const waitingForSelectedActionApproval = summary.pendingRows === 4 &&
    summary.acceptedRows === 0 &&
    summary.ownerInputBlank === true &&
    summary.ownerActionRowsAccepted === 0 &&
    recorded.topCandidate?.queueActionStatus === "needs-root-parity-owner-input-before-rerun";

  fail(
    failures,
    sameJson(
      stableA22RootParitySelectedActionCanonicalPreviewProjection(recorded),
      stableA22RootParitySelectedActionCanonicalPreviewProjection(current)
    ),
    "A22 root-parity selectedAction canonical preview is stale"
  );
  fail(failures, recorded.previewKind === "a22-root-parity-selected-action-canonical-preview", "previewKind is invalid");
  fail(
    failures,
    [
      "ready-for-owner-review",
      "owner-approved-waiting-candidate-mutation",
      "owner-approved-post-extraction-verified-check-remediation"
    ].includes(recorded.previewStatus),
    "previewStatus must be ready-for-owner-review, owner-approved-waiting-candidate-mutation, or owner-approved-post-extraction-verified-check-remediation"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.topCandidate?.branch === "codex/A22-us-region-alignment", "top candidate branch is invalid");
  fail(
    failures,
    [
      "needs-root-parity-owner-input-before-rerun",
      "needs-candidate-mutation-owner-input-before-rerun",
      "needs-typecheck-remediation-and-fresh-build-observation"
    ].includes(recorded.topCandidate?.queueActionStatus),
    "top candidate queue action is invalid"
  );
  fail(failures, waitingForSelectedActionApproval || ownerApprovedSelectedActions, "selectedAction preview must be either waiting for owner approval, owner-approved waiting candidate mutation, or post-extraction verified and waiting type-check/build remediation");

  fail(failures, summary.previewRows === 4, "summary.previewRows must be 4");
  fail(failures, waitingForSelectedActionApproval ? summary.pendingRows === 4 : summary.pendingRows === 0, waitingForSelectedActionApproval ? "summary.pendingRows must be 4" : "summary.pendingRows must be 0 after owner approval");
  fail(failures, waitingForSelectedActionApproval ? summary.acceptedRows === 0 : summary.acceptedRows === 4, waitingForSelectedActionApproval ? "summary.acceptedRows must be 0" : "summary.acceptedRows must be 4 after owner approval");
  fail(failures, waitingForSelectedActionApproval ? summary.ownerInputBlank === true : summary.ownerInputBlank === false, waitingForSelectedActionApproval ? "owner input must remain blank" : "owner input must preserve approved selectedAction rows");
  fail(failures, summary.ownerActionRowsRequired === 4, "ownerActionRowsRequired must be 4");
  fail(failures, waitingForSelectedActionApproval ? summary.ownerActionRowsAccepted === 0 : summary.ownerActionRowsAccepted === 4, waitingForSelectedActionApproval ? "ownerActionRowsAccepted must be 0" : "ownerActionRowsAccepted must be 4 after owner approval");
  fail(failures, summary.typeCheckPassed === false, "typeCheckPassed must be false");
  fail(failures, Number.isInteger(summary.typeCheckErrorLines) && summary.typeCheckErrorLines > 0, "typeCheckErrorLines must be a positive current value");
  fail(failures, summary.buildPassed === false, "buildPassed must be false");
  fail(
    failures,
    summary.buildBlockersRouted === true ||
      (ownerApprovedPostExtractionVerified && summary.buildFailureCategory === "post-extraction-build-refresh-required"),
    "buildBlockersRouted must be true unless post-extraction build refresh is required"
  );
  fail(failures, summary.releaseSourceSelected === false, "releaseSourceSelected must be false");
  fail(failures, summary.promotionEligibleNow === false, "promotionEligibleNow must be false");
  fail(failures, summary.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, summary.executableRows === 0, "executableRows must be 0");

  const rows = recorded.previewRows ?? [];
  fail(failures, rows.length === expectedRows.length, "previewRows must contain 4 rows");
  for (const expected of expectedRows) {
    const row = rows.find((item) => item.approvalId === expected.approvalId);
    fail(failures, Boolean(row), `missing preview row: ${expected.approvalId}`);
    if (!row) continue;
    fail(failures, row.selectedAction === expected.selectedAction, `${expected.approvalId}: selectedAction must be ${expected.selectedAction}`);
    fail(failures, (row.allowedActions ?? []).includes(row.selectedAction), `${expected.approvalId}: selectedAction must be allowed`);
    fail(failures, row.rootSource === expected.rootSource, `${expected.approvalId}: rootSource mismatch`);
    fail(failures, row.candidateTarget === expected.candidateTarget, `${expected.approvalId}: candidateTarget mismatch`);
    fail(failures, row.acceptedByOwnerInput === !waitingForSelectedActionApproval, `${expected.approvalId}: acceptedByOwnerInput must be ${!waitingForSelectedActionApproval}`);
    for (const [key, expectedValue] of [
      ["cleanupAuthorized", false],
      ["executableNow", false],
      ["deployAuthorized", false],
      ["mergeAuthorized", false],
      ["stageAuthorized", false],
      ["destructiveGitAuthorized", false],
      ["physicalLifecycleCleanupAuthorized", false]
    ]) {
      fail(failures, row[key] === expectedValue, `${expected.approvalId}: ${key} must be ${expectedValue}`);
    }
    for (const needle of [
      `unitId=${row.unitId}`,
      `selectedAction=${row.selectedAction}`,
      `rootSource=${row.rootSource}`,
      `candidateTarget=${row.candidateTarget}`,
      "No cleanup",
      "No deploy",
      "No merge",
      "No destructive git",
      "No physical lifecycle cleanup"
    ]) {
      fail(failures, String(row.exactOwnerExecutionText ?? "").includes(needle), `${expected.approvalId}: exactOwnerExecutionText missing ${needle}`);
    }
  }

  const request = recorded.batchAuthorizationRequest ?? {};
  fail(failures, request.requestKind === "a22-root-parity-selected-action-owner-approval", "batch request kind is invalid");
  fail(failures, (request.approvalIds ?? []).length === 4, "batch request approvalIds must have 4 rows");
  fail(failures, (request.exactOwnerExecutionTextLines ?? []).length === 4, "batch request exactOwnerExecutionTextLines must have 4 rows");
  for (const expected of expectedRows) {
    fail(failures, (request.approvalIds ?? []).includes(expected.approvalId), `batch request missing approvalId: ${expected.approvalId}`);
    fail(
      failures,
      request.selectedActions?.[expected.approvalId] === expected.selectedAction,
      `batch request selectedAction mismatch: ${expected.approvalId}`
    );
  }
  for (const needle of [
    "approvalIds=a06-visualization-back-to-top-import-parity",
    "selectedActions=a06-visualization-back-to-top-import-parity:reexport",
    "No cleanup",
    "No deploy",
    "No merge",
    "No broad staging",
    "No destructive git",
    "No physical lifecycle cleanup"
  ]) {
    fail(failures, String(request.copyableOwnerReplyText ?? "").includes(needle), `copyableOwnerReplyText missing ${needle}`);
  }
  for (const [key, expectedValue] of [
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["deployAuthorized", false],
    ["mergeAuthorized", false],
    ["stageAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    fail(failures, request[key] === expectedValue, `batch request ${key} must be ${expectedValue}`);
  }

  for (const id of [
    "source-current",
    "top-validation-queue-waits-owner-input",
    "owner-action-packet-waiting",
    "acceptance-docket-waiting",
    "owner-input-still-blank",
    "preview-rows-complete",
    "preview-non-executable"
  ]) {
    fail(failures, checkById(recorded.checks, id)?.status === "pass", `check must pass: ${id}`);
  }

  for (const [key, expectedValue] of [
    ["evidenceOnly", true],
    ["previewOnly", true],
    ["recordsOwnerInput", false],
    ["recordsOwnerApproval", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["selectsReleaseSource", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["deployAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    fail(failures, recorded.boundary?.[key] === expectedValue, `boundary.${key} must be ${expectedValue}`);
  }

  for (const needle of [
    "# A22 Root-Parity SelectedAction Canonical Preview",
    recorded.previewStatus,
    recorded.topCandidate?.queueActionStatus,
    "a06-visualization-back-to-top-import-parity",
    "a20-math-virus-blaster-data-parity",
    "a20-mighty-tank-battle-data-parity",
    "a05-california-high-school-lesson-illustration-data-parity",
    "Records owner input: false",
    "Cleanup authorized: false",
    "Physical lifecycle cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(needle), `markdown missing text: ${needle}`);
  }
  fail(failures, !markdown.includes("undefined"), "markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    previewStatus: recorded.previewStatus,
    previewRows: summary.previewRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    acceptedRows: summary.acceptedRows ?? 0,
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
    console.log("A22 root-parity selectedAction canonical preview gate");
    console.log(`Preview status: ${payload.previewStatus ?? "unknown"}`);
    console.log(`Preview rows: ${payload.previewRows ?? 0}`);
    console.log(`Pending rows: ${payload.pendingRows ?? 0}`);
    console.log(`Failures: ${(payload.failures ?? []).length}`);
  }

  if ((payload.failures ?? []).length > 0) {
    console.error("A22 root-parity selectedAction canonical preview gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
