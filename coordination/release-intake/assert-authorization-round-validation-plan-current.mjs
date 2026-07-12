#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS,
  buildAuthorizationRoundValidationPlan,
  stableAuthorizationRoundValidationPlanProjection
} from "./generate-authorization-round-validation-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-authorization-round-validation-plan-current-gate.json");
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
    AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestJson,
    AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestJson);
  const authorizationsGate = readJson("coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json");
  const current = buildAuthorizationRoundValidationPlan();
  if (!sameJson(
    stableAuthorizationRoundValidationPlanProjection(recorded),
    stableAuthorizationRoundValidationPlanProjection(current)
  )) {
    failures.push("A25 authorization round validation plan is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const rounds = recorded.rounds ?? [];
  const phases = recorded.validationPhases ?? [];
  const roundIds = rounds.map((round) => round.id);
  const phaseIds = phases.map((phase) => phase.id);

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("source currentness failures must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if ((summary.authorizationRounds ?? 0) !== 5) failures.push("authorizationRounds must be 5");
  if (rounds.length !== 5) failures.push("rounds length must be 5");
  if ((summary.roundRows ?? 0) !== (authorizationsGate.starterRows ?? 0)) {
    failures.push("roundRows must match current authorization gate starterRows");
  }
  if ((summary.roundPendingRows ?? 0) !== (authorizationsGate.pendingRows ?? 0)) {
    failures.push("roundPendingRows must match current authorization gate pendingRows");
  }
  if ((summary.roundAuthorizedRows ?? 0) !== (authorizationsGate.authorizedRows ?? 0)) {
    failures.push("roundAuthorizedRows must match current authorization gate authorizedRows");
  }
  const readyCandidateRound = rounds.find((round) => round.id === "ready-candidate-owner-review") ?? {};
  const readyForOwnerReviewRounds = summary.readyForOwnerReviewRounds ?? 0;
  const consumedA16ReadyCandidate =
    readyForOwnerReviewRounds === 0 &&
    (summary.readyCandidateApprovalRows ?? 0) === 0 &&
    (summary.readyCandidateConsumedApprovalRows ?? 0) === 1 &&
    (readyCandidateRound.consumedApprovalIds ?? []).includes("a16-research-and-learning-science") &&
    (readyCandidateRound.rowCount ?? 0) === 0 &&
    (readyCandidateRound.pendingRows ?? 0) === 0 &&
    (readyCandidateRound.authorizedRows ?? 0) === 0;
  if (readyForOwnerReviewRounds !== 1 && !consumedA16ReadyCandidate) {
    failures.push("readyForOwnerReviewRounds must be 1, or 0 only when the A16 ready candidate is post-extraction consumed");
  }
  if ((summary.safePostInputValidationCommands ?? 0) !== 5) failures.push("safePostInputValidationCommands must be 5");
  if ((summary.deferredAggregateValidationCommands ?? 0) !== 8) failures.push("deferredAggregateValidationCommands must be 8");
  if ((summary.validationPhases ?? 0) !== 4) failures.push("validationPhases must be 4");
  if ((summary.targetInputFiles ?? 0) !== 3) failures.push("targetInputFiles must be 3");
  if ((summary.requiredInputs ?? 0) !== 3) failures.push("requiredInputs must be 3");
  const exactCommandRows = rounds.flatMap((round) => round.rows ?? []).filter((row) => row.hasExactCommand === true).length;
  if ((summary.exactCommandRows ?? 0) !== exactCommandRows) failures.push("exactCommandRows must match current command-bearing authorization rows");
  const wave01Round = rounds.find((round) => round.id === "wave01-package-resync-authorizations") ?? {};
  const wave01ExactCommandRows = (wave01Round.rows ?? []).filter((row) => row.hasExactCommand === true).length;
  if ((wave01Round.rowCount ?? 0) > 0 && wave01ExactCommandRows === 0) {
    failures.push("exactCommandRows must include the current Wave01 hold command row");
  }
  const a22ResidualRound = rounds.find((round) => round.id === "a22-generated-artifact-residual-cleanup-authorizations") ?? {};
  const a22ResidualRows = a22ResidualRound.rowCount ?? 0;
  const a22ResidualExactCommandRows = (a22ResidualRound.rows ?? []).filter((row) => row.hasExactCommand === true).length;
  if (a22ResidualRows > 0 && a22ResidualExactCommandRows !== a22ResidualRows) {
    failures.push("A22 residual cleanup rows must all carry exact commands when residual rows are present");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validation hold must wait for owner compose deletion confirmation");
  }

  for (const requiredRound of [
    "ready-candidate-owner-review",
    "wave01-package-resync-authorizations",
    "remaining-owner-package-final-states",
    "remaining-physical-lifecycle-final-states",
    "a22-generated-artifact-residual-cleanup-authorizations"
  ]) {
    if (!roundIds.includes(requiredRound)) failures.push(`missing round: ${requiredRound}`);
  }
  for (const requiredPhase of [
    "record-owner-inputs",
    "safe-post-input-validation",
    "separate-execution-instructions",
    "deferred-aggregate-validation"
  ]) {
    if (!phaseIds.includes(requiredPhase)) failures.push(`missing validation phase: ${requiredPhase}`);
  }

  for (const round of rounds) {
    if ((round.rowCount ?? 0) !== (round.rows ?? []).length) failures.push(`round ${round.id} rowCount must match rows length`);
    if ((round.pendingRows ?? 0) + (round.authorizedRows ?? 0) !== (round.rowCount ?? 0)) {
      failures.push(`round ${round.id} pendingRows + authorizedRows must equal rowCount`);
    }
    if ((round.cleanupAuthorizedRows ?? 0) !== 0) failures.push(`round ${round.id} cleanupAuthorizedRows must be 0`);
    if ((round.executableRows ?? 0) !== 0) failures.push(`round ${round.id} executableRows must be 0`);
    for (const row of round.rows ?? []) {
      if (row.cleanupAuthorized === true) failures.push(`row ${row.approvalId} must not be cleanup-authorized`);
      if (row.executableNow === true) failures.push(`row ${row.approvalId} must not be executable`);
    }
  }

  const phaseById = Object.fromEntries(phases.map((phase) => [phase.id, phase]));
  if ((phaseById["safe-post-input-validation"]?.commands ?? []).length !== 5) failures.push("safe-post-input-validation phase must have five commands");
  if ((phaseById["deferred-aggregate-validation"]?.commands ?? []).length !== 8) failures.push("deferred-aggregate-validation phase must have eight commands");
  if ((phaseById["record-owner-inputs"]?.requiredInputs ?? []).length !== 3) failures.push("record-owner-inputs phase must list three required inputs");
  if (!String(phaseById["deferred-aggregate-validation"]?.status ?? "").includes("waiting-for-owner-compose-deletion-confirmation")) {
    failures.push("deferred aggregate phase must show the validation hold");
  }

  const markdown = readText(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Authorization Round Validation Plan",
    "Round Validation Matrix",
    "Validation Phases",
    "waiting-for-owner-compose-deletion-confirmation",
    "Every row remains non-executable",
    "authorize merge",
    "authorize cleanup",
    "run cleanup",
    "ready-candidate-owner-review",
    "wave01-package-resync-authorizations",
    "deferred-aggregate-validation"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    authorizationRounds: summary.authorizationRounds ?? 0,
    roundRows: summary.roundRows ?? 0,
    readyForOwnerReviewRounds: summary.readyForOwnerReviewRounds ?? 0,
    safePostInputValidationCommands: summary.safePostInputValidationCommands ?? 0,
    deferredAggregateValidationCommands: summary.deferredAggregateValidationCommands ?? 0,
    validationPhases: summary.validationPhases ?? 0,
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
    console.log("A25 authorization round validation plan gate");
    console.log(`Authorization rounds: ${payload.authorizationRounds ?? 0}`);
    console.log(`Round rows: ${payload.roundRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 authorization round validation plan gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
