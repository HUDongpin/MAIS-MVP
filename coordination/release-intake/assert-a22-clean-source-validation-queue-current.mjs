#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS,
  buildA22CleanSourceValidationQueue,
  stableA22CleanSourceValidationQueueProjection
} from "./generate-a22-clean-source-validation-queue.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-clean-source-validation-queue-current-gate.json");
const json = process.argv.includes("--json");

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

function validationById(checks, id) {
  return (checks ?? []).find((row) => row.id === id);
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestJson,
    A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestJson);
  const current = buildA22CleanSourceValidationQueue();
  const markdown = readText(A22_CLEAN_SOURCE_VALIDATION_QUEUE_PATHS.latestMarkdown);

  fail(
    failures,
    sameJson(
      stableA22CleanSourceValidationQueueProjection(recorded),
      stableA22CleanSourceValidationQueueProjection(current)
    ),
    "A22 clean source validation queue is stale"
  );
  fail(failures, recorded.queueKind === "a22-clean-source-validation-queue", "queueKind is invalid");
  fail(
    failures,
    [
      "waiting-top-candidate-root-parity-owner-input",
      "waiting-top-candidate-candidate-mutation-owner-input",
      "waiting-top-candidate-candidate-mutation-apply",
      "waiting-top-candidate-gate-rerun-after-extraction",
      "waiting-top-candidate-typecheck-build-remediation",
      "waiting-top-candidate-typecheck-remediation",
      "waiting-top-candidate-fresh-build-observation",
      "fallback-candidate-green-await-clean-source-selection-review"
    ].includes(recorded.queueStatus),
    "queueStatus must wait on the current top-candidate validation frontier"
  );
  fail(failures, (recorded.sourceCurrentnessFailures ?? []).length === 0, "sourceCurrentnessFailures must be empty");
  fail(failures, recorded.summary?.queueRows === 9, "summary.queueRows must be 9");
  fail(failures, recorded.summary?.topCandidateRows === 1, "summary.topCandidateRows must be 1");
  fail(failures, recorded.summary?.fallbackCandidateRows === 8, "summary.fallbackCandidateRows must be 8");
  fail(failures, [1, 2].includes(recorded.summary?.candidatesWithGateEvidence), "summary.candidatesWithGateEvidence must be 1 or 2");
  fail(failures, [7, 8].includes(recorded.summary?.candidatesAwaitingGateEvidence), "summary.candidatesAwaitingGateEvidence must be 7 or 8");
  fail(
    failures,
    [0, 1].includes(recorded.summary?.fallbackCandidateValidationRows ?? 0),
    "summary.fallbackCandidateValidationRows must be 0 or 1"
  );
  fail(failures, recorded.summary?.topCandidateGateStatus === "top-candidate-gates-red", "top candidate gate status must be red");
  fail(
    failures,
    [
      "needs-root-parity-owner-input-before-rerun",
      "needs-candidate-mutation-owner-input-before-rerun",
    "ready-for-candidate-mutation-apply-before-rerun",
    "ready-for-candidate-gate-rerun-after-extraction",
    "needs-typecheck-remediation-and-fresh-build-observation",
    "needs-typecheck-remediation-before-clean-source",
      "needs-fresh-build-observation-before-clean-source"
    ].includes(recorded.summary?.topCandidateQueueActionStatus),
    "top candidate queue action must require the current validation frontier before clean-source selection"
  );
  fail(failures, recorded.summary?.focusedSmokePassed === true, "focused smoke must remain reflected as passing");
  fail(failures, recorded.summary?.typeCheckPassed === false, "type-check must remain reflected as failing");
  fail(
    failures,
    Number.isInteger(recorded.summary?.typeCheckErrorLines) && recorded.summary.typeCheckErrorLines > 0,
    "type-check error line count must be a positive integer"
  );
  fail(failures, recorded.summary?.buildPassed === false, "build must remain reflected as failing");
  if (recorded.summary?.buildRefreshRequired === true) {
    fail(failures, recorded.summary?.buildBlockersRouted === false, "build blockers must not remain routed when fresh build observation is required");
  } else {
    fail(failures, recorded.summary?.buildBlockersRouted === true, "build blockers must remain routed");
  }
  fail(failures, recorded.summary?.ownerActionRowsRequired === 4, "ownerActionRowsRequired must be 4");
  fail(failures, [0, 4].includes(recorded.summary?.ownerActionRowsAccepted), "ownerActionRowsAccepted must reflect either waiting or recorded owner actions");
  fail(
    failures,
    ["waiting-for-owner-action", "ready-for-guarded-extraction", "post-extraction-verified", "not-ready-check-failures"].includes(recorded.summary?.ownerActionAcceptanceStatus),
    "owner action acceptance status must be a supported frontier state"
  );
  fail(
    failures,
    Number.isInteger(recorded.summary?.pendingCanonicalAuthorizationRows) && recorded.summary.pendingCanonicalAuthorizationRows >= 0,
    "pendingCanonicalAuthorizationRows must be a non-negative integer"
  );
  fail(failures, recorded.summary?.validateExitReady === false, "validateExitReady must be false");
  fail(failures, recorded.summary?.readyForMerge === false, "readyForMerge must be false");
  fail(failures, recorded.summary?.releaseSourceEligibleNow === false, "releaseSourceEligibleNow must be false");
  fail(failures, recorded.summary?.releaseSourceSelected === false, "releaseSourceSelected must be false");
  fail(failures, recorded.summary?.promotionEligibleNow === false, "promotionEligibleNow must be false");
  fail(failures, recorded.summary?.cleanupAuthorizedRows === 0, "cleanupAuthorizedRows must be 0");
  fail(failures, recorded.summary?.executableRows === 0, "executableRows must be 0");

  const rows = recorded.validationQueueRows ?? [];
  const topRows = rows.filter((row) => row.isTopCandidate);
  const fallbackRows = rows.filter((row) => !row.isTopCandidate);
  fail(failures, topRows.length === 1, "exactly one top validation queue row is required");
  fail(failures, fallbackRows.length === 8, "exactly 8 fallback validation queue rows are required");

  const topRow = topRows[0] ?? {};
  fail(failures, topRow.branch === recorded.topCandidate?.branch, "top queue row must match top candidate branch");
  fail(failures, topRow.validationLane === "top-candidate-root-parity-recovery", "top queue row validation lane is invalid");
  fail(
    failures,
    [
      "needs-root-parity-owner-input-before-rerun",
      "needs-candidate-mutation-owner-input-before-rerun",
      "ready-for-candidate-mutation-apply-before-rerun",
      "ready-for-candidate-gate-rerun-after-extraction",
      "needs-typecheck-remediation-and-fresh-build-observation",
      "needs-typecheck-remediation-before-clean-source",
      "needs-fresh-build-observation-before-clean-source"
    ].includes(topRow.queueActionStatus),
    "top queue row action status is invalid"
  );
  fail(failures, topRow.ownerActionRowsRequired === 4, "top queue row must require 4 owner action rows");
  fail(failures, [0, 4].includes(topRow.ownerActionRowsAccepted), "top queue row must show a supported accepted owner-action count");
  fail(failures, topRow.typeCheckPassed === false, "top queue row must reflect failed type-check");
  fail(failures, topRow.buildPassed === false, "top queue row must reflect failed build");
  const requiredFrontierPhrases = topRow.queueActionStatus === "needs-candidate-mutation-owner-input-before-rerun"
    ? [
      "record separate candidate-mutation owner input for the 4 recorded A22 root-parity rows",
      "run candidate mutation dry-run/current gate after owner input is recorded",
      "run apply-candidate-mutation only with explicit owner candidate-mutation instruction",
      "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence"
    ]
    : topRow.queueActionStatus === "ready-for-candidate-mutation-apply-before-rerun"
      ? [
        "run apply-candidate-mutation only with explicit owner candidate-mutation instruction",
        "rerun candidate mutation dry-run/current gate after candidate mutation evidence",
        "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence",
        "route remaining top-candidate blockers after refreshed gates"
      ]
      : topRow.queueActionStatus === "ready-for-candidate-gate-rerun-after-extraction"
        ? [
          "rerun candidate-specific focused smoke/type-check/build after candidate mutation evidence",
          "rerun clean candidate gate coverage matrix after extracted files are verified",
          "route remaining top-candidate blockers after refreshed gates",
          "keep merge/deploy/cleanup blocked until separate gates and owner instructions exist"
        ]
        : [
          "needs-typecheck-remediation-and-fresh-build-observation",
          "needs-typecheck-remediation-before-clean-source",
          "needs-fresh-build-observation-before-clean-source"
        ].includes(topRow.queueActionStatus)
          ? [
            "route current candidate type-check error lines to owning agents before clean-source selection",
            "rerun candidate-specific npm run type-check after targeted remediation",
            "record a fresh escalated build observation after type-check remediation or after owner accepts build-refresh risk",
            "keep merge/deploy/cleanup blocked until separate gates and owner instructions exist"
        ]
        : [
      "owner-selected actions accepted for all 4 A22 root-parity rows",
      "separate extraction-instruction recording evidence",
      "separate guarded-extraction dry-run evidence",
      "candidate-specific focused smoke/type-check/build rerun after extraction evidence"
    ];
  for (const requiredPhrase of requiredFrontierPhrases) {
    fail(
      failures,
      (topRow.requiredBeforeNextGateRun ?? []).includes(requiredPhrase),
      `top queue row missing required-before-rerun phrase: ${requiredPhrase}`
    );
  }
  for (const requiredCommand of [
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/run-a22-root-parity-candidate-mutation.mjs",
    "node coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs"
  ]) {
    fail(
      failures,
      (topRow.safeValidationCommands ?? []).includes(requiredCommand),
      `top queue row missing safe validation command: ${requiredCommand}`
    );
  }

  for (const row of fallbackRows) {
    fail(
      failures,
      ["fallback-clean-candidate-gate-planning", "fallback-clean-candidate-validated"].includes(row.validationLane),
      `${row.branch}: fallback validation lane is invalid`
    );
    fail(
      failures,
      [
        "fallback-validation-candidate-awaiting-separate-plan",
        "fallback-candidate-validation-passed-await-clean-source-selection-review"
      ].includes(row.queueActionStatus),
      `${row.branch}: fallback queue action status is invalid`
    );
    if (row.queueActionStatus === "fallback-candidate-validation-passed-await-clean-source-selection-review") {
      fail(failures, row.gateCoverageStatus === "fallback-candidate-gates-green", `${row.branch}: validated fallback gate coverage must be green`);
      fail(failures, row.typeCheckPassed === true, `${row.branch}: validated fallback typeCheckPassed must be true`);
      fail(failures, row.typeCheckErrorLines === 0, `${row.branch}: validated fallback typeCheckErrorLines must be 0`);
      fail(failures, row.buildPassed === true, `${row.branch}: validated fallback buildPassed must be true`);
      fail(failures, row.promotionEligibleNow === true, `${row.branch}: validated fallback promotionEligibleNow must be true`);
    } else {
      fail(failures, row.focusedSmokePassed === null, `${row.branch}: fallback focusedSmokePassed must be null`);
      fail(failures, row.typeCheckPassed === null, `${row.branch}: fallback typeCheckPassed must be null`);
      fail(failures, row.buildPassed === null, `${row.branch}: fallback buildPassed must be null`);
    }
  }

  for (const row of rows) {
    fail(failures, row.releaseSourceSelected === false, `${row.branch}: releaseSourceSelected must be false`);
    if (row.queueActionStatus === "fallback-candidate-validation-passed-await-clean-source-selection-review") {
      fail(failures, row.promotionEligibleNow === true, `${row.branch}: promotionEligibleNow must be true for validated fallback review`);
    } else {
      fail(failures, row.promotionEligibleNow === false, `${row.branch}: promotionEligibleNow must be false`);
    }
    fail(failures, row.cleanupAuthorized === false, `${row.branch}: cleanupAuthorized must be false`);
    fail(failures, row.executableNow === false, `${row.branch}: executableNow must be false`);
    fail(failures, row.deployAuthorized === false, `${row.branch}: deployAuthorized must be false`);
    fail(failures, row.mergeAuthorized === false, `${row.branch}: mergeAuthorized must be false`);
    fail(failures, row.stageAuthorized === false, `${row.branch}: stageAuthorized must be false`);
    fail(failures, row.destructiveGitAuthorized === false, `${row.branch}: destructiveGitAuthorized must be false`);
    fail(failures, row.physicalLifecycleCleanupAuthorized === false, `${row.branch}: physicalLifecycleCleanupAuthorized must be false`);
    for (const [key, expected] of [
      ["evidenceOnly", true],
      ["runsTypeCheck", false],
      ["runsBuild", false],
      ["runsRegression", false],
      ["recordsOwnerInput", false],
      ["recordsExtractionInstruction", false],
      ["modifiesCandidate", false],
      ["copiesRootFiles", false],
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
      fail(failures, row.boundary?.[key] === expected, `${row.branch}: boundary.${key} must be ${expected}`);
    }
  }

  for (const id of [
    "source-current",
    "top-candidate-red-gates-routed",
    "queue-frontier-current",
    "fallback-candidates-accounted",
    "queue-non-executable",
    "release-source-not-selected"
  ]) {
    fail(failures, validationById(recorded.checks, id)?.status === "pass", `check must pass: ${id}`);
  }
  if ((recorded.summary?.fallbackCandidateValidationRows ?? 0) === 1) {
    fail(
      failures,
      validationById(recorded.checks, "fallback-green-candidate-recorded")?.status === "pass",
      "fallback-green-candidate-recorded check must pass when a fallback validation row exists"
    );
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["recordsOwnerInput", false],
    ["recordsExtractionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
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
    fail(failures, recorded.boundary?.[key] === expected, `boundary.${key} must be ${expected}`);
  }

  for (const needle of [
    "# A22 Clean Source Validation Queue",
    "fallback-validation-candidate-awaiting-separate-plan",
    "The next A22 action is not to blindly rerun broad build/type gates.",
    "Cleanup authorized: false"
  ]) {
    fail(failures, markdown.includes(needle), `markdown missing text: ${needle}`);
  }
  fail(
    failures,
    markdown.includes("waiting-top-candidate-root-parity-owner-input") ||
      markdown.includes("waiting-top-candidate-candidate-mutation-owner-input") ||
      markdown.includes("waiting-top-candidate-candidate-mutation-apply") ||
      markdown.includes("waiting-top-candidate-gate-rerun-after-extraction") ||
      markdown.includes("waiting-top-candidate-typecheck-build-remediation") ||
      markdown.includes("waiting-top-candidate-typecheck-remediation") ||
      markdown.includes("waiting-top-candidate-fresh-build-observation") ||
      markdown.includes("fallback-candidate-green-await-clean-source-selection-review"),
    "markdown missing current queue status"
  );
  fail(
    failures,
    markdown.includes("needs-root-parity-owner-input-before-rerun") ||
      markdown.includes("needs-candidate-mutation-owner-input-before-rerun") ||
      markdown.includes("ready-for-candidate-mutation-apply-before-rerun") ||
      markdown.includes("ready-for-candidate-gate-rerun-after-extraction") ||
      markdown.includes("needs-typecheck-remediation-and-fresh-build-observation") ||
      markdown.includes("needs-typecheck-remediation-before-clean-source") ||
      markdown.includes("needs-fresh-build-observation-before-clean-source"),
    "markdown missing current top queue action"
  );
  fail(
    failures,
    markdown.includes("Owner action rows accepted: 0/4") ||
      markdown.includes("Owner action rows accepted: 4/4"),
    "markdown missing owner action acceptance count"
  );
  fail(failures, !markdown.includes("undefined"), "markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    queueStatus: recorded.queueStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    topCandidateQueueActionStatus: recorded.summary?.topCandidateQueueActionStatus ?? "",
    queueRows: recorded.summary?.queueRows ?? 0,
    fallbackCandidateRows: recorded.summary?.fallbackCandidateRows ?? 0,
    ownerActionRowsAccepted: recorded.summary?.ownerActionRowsAccepted ?? 0,
    cleanupAuthorizedRows: recorded.summary?.cleanupAuthorizedRows ?? 0,
    executableRows: recorded.summary?.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 clean source validation queue gate");
    console.log(`Queue status: ${payload.queueStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch ?? "unknown"}`);
    console.log(`Top candidate queue action: ${payload.topCandidateQueueActionStatus ?? "unknown"}`);
    console.log(`Queue rows: ${payload.queueRows ?? 0}`);
    console.log(`Failures: ${(payload.failures ?? []).length}`);
  }

  if ((payload.failures ?? []).length > 0) {
    console.error("A22 clean source validation queue gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
