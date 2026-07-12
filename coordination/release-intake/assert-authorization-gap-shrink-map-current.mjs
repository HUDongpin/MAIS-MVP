#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORIZATION_GAP_SHRINK_MAP_PATHS,
  buildAuthorizationGapShrinkMap,
  stableAuthorizationGapShrinkMapProjection
} from "./generate-authorization-gap-shrink-map.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-authorization-gap-shrink-map-current-gate.json");
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
    AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestJson,
    AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestJson);
  const authorizationsGate = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.nextOwnerAuthorizationsGate);
  const current = buildAuthorizationGapShrinkMap();
  if (!sameJson(stableAuthorizationGapShrinkMapProjection(recorded), stableAuthorizationGapShrinkMapProjection(current))) {
    failures.push("A25 authorization gap shrink map is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rounds = recorded.rounds ?? [];
  const readiness = recorded.readiness ?? {};

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.authorizationRounds ?? 0) !== rounds.length) failures.push("summary.authorizationRounds must match rounds length");
  if (rounds.length !== 5) failures.push("authorization shrink map must contain five review rounds");
  if ((summary.roundRows ?? 0) !== (summary.authorizationStarterRows ?? 0)) {
    failures.push("roundRows must equal authorizationStarterRows");
  }
  if ((summary.roundPendingRows ?? 0) + (summary.roundAuthorizedRows ?? 0) !== (summary.authorizationStarterRows ?? 0)) {
    failures.push("roundPendingRows + roundAuthorizedRows must equal authorizationStarterRows");
  }
  if ((summary.authorizationStarterRows ?? 0) !== (authorizationsGate.starterRows ?? 0)) {
    failures.push("authorizationStarterRows must match current authorization gate starterRows");
  }
  if ((summary.canonicalAuthorizationRowsInFile ?? 0) !== (authorizationsGate.authorizationRowsInFile ?? 0)) {
    failures.push("canonicalAuthorizationRowsInFile must match current authorization gate");
  }
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) !== (authorizationsGate.pendingRows ?? 0)) {
    failures.push("pendingCanonicalAuthorizationRows must match current authorization gate");
  }
  if ((summary.authorizedCanonicalRows ?? 0) !== (authorizationsGate.authorizedRows ?? 0)) {
    failures.push("authorizedCanonicalRows must match current authorization gate");
  }
  if ((summary.roundPendingRows ?? 0) !== (authorizationsGate.pendingRows ?? 0)) {
    failures.push("roundPendingRows must match current authorization gate pendingRows");
  }
  if ((summary.roundAuthorizedRows ?? 0) !== (authorizationsGate.authorizedRows ?? 0)) {
    failures.push("roundAuthorizedRows must match current authorization gate authorizedRows");
  }
  if ((summary.pendingCanonicalAuthorizationRows ?? 0) !== (readiness.pendingCanonicalAuthorizationRows ?? 0)) {
    failures.push("summary pending canonical rows must match readiness pending canonical rows");
  }
  if ((summary.targetInputFiles ?? 0) !== (recorded.targetInputFiles ?? []).length) {
    failures.push("summary.targetInputFiles must match targetInputFiles length");
  }
  if ((summary.requiredInputs ?? 0) !== (recorded.requiredInputs ?? []).length) {
    failures.push("summary.requiredInputs must match requiredInputs length");
  }
  if ((recorded.targetInputFiles ?? []).length !== 3) failures.push("targetInputFiles must contain three owner input files");
  if ((recorded.requiredInputs ?? []).length !== 3) failures.push("requiredInputs must contain three owner input rows");
  if ((recorded.safePostInputValidationCommands ?? []).length !== 5) {
    failures.push("safePostInputValidationCommands must contain five safe post-input commands");
  }
  if ((recorded.deferredAggregateValidationCommands ?? []).length !== 8) {
    failures.push("deferredAggregateValidationCommands must contain eight aggregate commands");
  }
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validationHold.status must wait for owner compose deletion confirmation");
  }

  const readyRound = rounds.find((row) => row.id === "ready-candidate-owner-review");
  if (!readyRound) failures.push("missing ready-candidate-owner-review round");
  else {
    const physicalRound = rounds.find((row) => row.id === "remaining-physical-lifecycle-final-states");
    const a16PhysicalLifecycleRow = (physicalRound?.rows ?? []).find((row) => row.approvalId === "codex-a16-research-evidence-closure");
    const a16OwnerPackageConsumed = readyRound.consumedApprovalIds?.includes("a16-research-and-learning-science") === true
      && readyRound.postExtractionState?.verified === true
      && readyRound.postExtractionState?.lifecycleStatus === "post-extraction-verified"
      && (readyRound.postExtractionState?.packageStatusRows ?? 1) === 0
      && (readyRound.postExtractionState?.stagedPackageRows ?? 1) === 0
      && readyRound.postExtractionState?.latestPackageCommit?.hash;

    if (a16OwnerPackageConsumed && (readyRound.rowCount ?? 0) === 0) {
      if (readyRound.readyForOwnerReview !== false) failures.push("consumed ready candidate must not stay ready for owner review");
      if ((readyRound.pendingRows ?? 0) !== 0 || (readyRound.authorizedRows ?? 0) !== 0) {
        failures.push("consumed ready candidate round must have zero active pending/authorized rows");
      }
      if (!a16PhysicalLifecycleRow) failures.push("consumed A16 ready candidate physical-lifecycle row must remain represented in the physical lifecycle round");
      if (a16PhysicalLifecycleRow && a16PhysicalLifecycleRow.authorized !== true) {
        failures.push("consumed A16 physical-lifecycle row must retain recorded authorization state");
      }
    } else {
      const expectedReadyRows = a16OwnerPackageConsumed ? 1 : 2;
      if (readyRound.readyForOwnerReview !== true) failures.push("ready candidate must be ready for owner review");
      if ((readyRound.rowCount ?? 0) !== expectedReadyRows) {
        failures.push(`ready candidate round must contain ${expectedReadyRows} active approval rows`);
      }
      if ((readyRound.pendingRows ?? 0) + (readyRound.authorizedRows ?? 0) !== expectedReadyRows) {
        failures.push(`ready candidate pendingRows + authorizedRows must equal ${expectedReadyRows} active approval rows`);
      }
      if ((readyRound.missingReviewInputs ?? []).length !== 0) failures.push("ready candidate round must have no missing review inputs");
      if (!a16OwnerPackageConsumed && !readyRound.approvalIds?.includes("a16-research-and-learning-science")) {
        failures.push("ready candidate round must include owner-package approval ID");
      }
      if (a16OwnerPackageConsumed && readyRound.approvalIds?.includes("a16-research-and-learning-science")) {
        failures.push("ready candidate consumed owner-package approval ID must not remain active");
      }
      if (!readyRound.approvalIds?.includes("codex-a16-research-evidence-closure")) {
        failures.push("ready candidate round must include physical-lifecycle approval ID");
      }
    }
  }

  const roundIds = rounds.map((row) => row.id);
  for (const requiredRound of [
    "ready-candidate-owner-review",
    "wave01-package-resync-authorizations",
    "remaining-owner-package-final-states",
    "remaining-physical-lifecycle-final-states",
    "a22-generated-artifact-residual-cleanup-authorizations"
  ]) {
    if (!roundIds.includes(requiredRound)) failures.push(`missing authorization round: ${requiredRound}`);
  }

  for (const row of rounds) {
    if ((row.rowCount ?? 0) !== (row.rows ?? []).length) failures.push(`round ${row.id} rowCount must match rows length`);
    if ((row.pendingRows ?? 0) + (row.authorizedRows ?? 0) !== (row.rowCount ?? 0)) {
      failures.push(`round ${row.id} pendingRows + authorizedRows must equal rowCount`);
    }
    if ((row.cleanupAuthorizedRows ?? 0) !== 0) failures.push(`round ${row.id} cleanupAuthorizedRows must be 0`);
    if ((row.executableRows ?? 0) !== 0) failures.push(`round ${row.id} executableRows must be 0`);
    for (const nested of row.rows ?? []) {
      if (nested.cleanupAuthorized === true) failures.push(`round ${row.id} row ${nested.approvalId} must not be cleanup-authorized`);
      if (nested.executableNow === true) failures.push(`round ${row.id} row ${nested.approvalId} must not be executable`);
    }
  }

  const markdown = readText(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Authorization Gap Shrink Map",
    "does not create the authorization file",
    "authorize merge",
    "First Reviewable Candidate",
    "Round Plan",
    "Ready candidate approval rows",
    "Every row remains non-executable",
    "waiting-for-owner-compose-deletion-confirmation"
  ]) {
    if (!markdown.includes(needle)) failures.push(`authorization gap shrink map markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("authorization gap shrink map markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    authorizationStarterRows: summary.authorizationStarterRows ?? 0,
    pendingCanonicalAuthorizationRows: summary.pendingCanonicalAuthorizationRows ?? 0,
    authorizationRounds: summary.authorizationRounds ?? 0,
    roundRows: summary.roundRows ?? 0,
    roundAuthorizedRows: summary.roundAuthorizedRows ?? 0,
    readyCandidateApprovalRows: summary.readyCandidateApprovalRows ?? 0,
    readyCandidateMissingReviewInputs: summary.readyCandidateMissingReviewInputs ?? 0,
    targetInputFiles: summary.targetInputFiles ?? 0,
    requiredInputs: summary.requiredInputs ?? 0,
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
    console.log("A25 authorization gap shrink map gate");
    console.log(`Authorization rounds: ${payload.authorizationRounds ?? 0}`);
    console.log(`Pending canonical authorization rows: ${payload.pendingCanonicalAuthorizationRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 authorization gap shrink map gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
