#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
  VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS,
  buildValidationHoldReleaseConfirmationScaffold,
  stableValidationHoldReleaseConfirmationScaffoldProjection
} from "./generate-validation-hold-release-confirmation-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-validation-hold-release-confirmation-scaffold-current-gate.json");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestJson,
    VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestJson);
  const current = buildValidationHoldReleaseConfirmationScaffold();
  if (!sameJson(
    stableValidationHoldReleaseConfirmationScaffoldProjection(recorded),
    stableValidationHoldReleaseConfirmationScaffoldProjection(current)
  )) {
    failures.push("A25 validation hold release confirmation scaffold is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const ownerConfirmation = recorded.ownerConfirmation ?? {};
  if (recorded.scaffoldKind !== "a25-validation-hold-release-confirmation-scaffold") failures.push("scaffoldKind is wrong");
  if (!["waiting-for-owner-compose-deletion-confirmation", "owner-confirmation-recorded-awaiting-separate-release-gate"].includes(recorded.scaffoldStatus)) {
    failures.push(`unsupported scaffoldStatus: ${recorded.scaffoldStatus}`);
  }
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validationHold.status must remain waiting-for-owner-compose-deletion-confirmation");
  }
  if (recorded.validationHold?.activeWorktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628") {
    failures.push("validationHold.activeWorktreePath must name the owner-active compose worktree");
  }
  if ((recorded.validationHold?.safePostInputValidationCommands ?? []).length !== 5) failures.push("safePostInputValidationCommands count must be 5");
  if ((recorded.validationHold?.deferredAggregateValidationCommands ?? []).length !== 8) failures.push("deferredAggregateValidationCommands count must be 8");
  if ((recorded.holdStatusRows ?? []).length !== 3) failures.push("holdStatusRows must include three source rows");
  if ((recorded.holdStatusRows ?? []).some((row) => row.status !== recorded.validationHold?.status)) {
    failures.push("every holdStatusRows status must match validationHold.status");
  }
  if ((recorded.holdStatusRows ?? []).some((row) => row.activeWorktreePath !== recorded.validationHold?.activeWorktreePath)) {
    failures.push("every holdStatusRows activeWorktreePath must match validationHold.activeWorktreePath");
  }
  if (ownerConfirmation.requiredConfirmationTextZh !== REQUIRED_OWNER_CONFIRMATION_TEXT_ZH) {
    failures.push("required owner confirmation text is stale");
  }
  if (ownerConfirmation.inputFile !== VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput) {
    failures.push("owner confirmation input file path is stale");
  }
  if (ownerConfirmation.template?.confirmationText !== REQUIRED_OWNER_CONFIRMATION_TEXT_ZH) {
    failures.push("owner confirmation template must include the exact required confirmation text");
  }
  if (ownerConfirmation.template?.scope !== "validation-hold-release-review-only") {
    failures.push("owner confirmation template scope must be validation-hold-release-review-only");
  }
  if ((ownerConfirmation.validationFailures ?? []).length !== (summary.ownerConfirmationValidationFailures ?? 0)) {
    failures.push("ownerConfirmationValidationFailures summary must match validationFailures length");
  }
  if (ownerConfirmation.inputFilePresent === false && ownerConfirmation.confirmationAccepted === true) {
    failures.push("confirmation cannot be accepted when input file is absent");
  }
  if (ownerConfirmation.inputFilePresent === true && (ownerConfirmation.validationFailures ?? []).length > 0) {
    failures.push("present owner confirmation input has validation failures");
  }
  if (ownerConfirmation.releaseReviewReady === true && ownerConfirmation.confirmationAccepted !== true) {
    failures.push("releaseReviewReady requires confirmationAccepted");
  }
  if (ownerConfirmation.validationHoldReleased !== false || summary.validationHoldReleased !== false) {
    failures.push("this scaffold must not release the validation hold");
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["recordsOwnerConfirmation", false],
    ["releasesValidationHold", false],
    ["recordsAuthorization", false],
    ["recordsExecutionInstruction", false],
    ["stageAuthorized", false],
    ["commitAuthorized", false],
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["deployAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Validation Hold Release Confirmation Scaffold",
    "This scaffold is evidence-only",
    "Exact Owner Confirmation Text",
    REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
    "Owner Confirmation JSON Template",
    "Validation hold released by this artifact: no",
    "Still Deferred While Hold Is Active",
    "separate, current validation-hold release gate is still required"
  ]) {
    if (!markdown.includes(needle)) failures.push(`validation hold scaffold markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("validation hold scaffold markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    scaffoldStatus: recorded.scaffoldStatus,
    ownerConfirmationInputPresent: summary.ownerConfirmationInputPresent === true,
    ownerConfirmationAccepted: summary.ownerConfirmationAccepted === true,
    releaseReviewReady: summary.releaseReviewReady === true,
    validationHoldReleased: summary.validationHoldReleased === true,
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
    console.log("A25 validation hold release confirmation scaffold gate");
    console.log(`Scaffold status: ${payload.scaffoldStatus ?? "unknown"}`);
    console.log(`Owner confirmation accepted: ${payload.ownerConfirmationAccepted ? "yes" : "no"}`);
    console.log(`Release review ready: ${payload.releaseReviewReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 validation hold release confirmation scaffold gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
