#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  OWNER_CLOSURE_INPUT_READINESS_PATHS,
  buildOwnerClosureInputReadiness,
  stableOwnerClosureInputReadinessProjection
} from "./generate-owner-closure-input-readiness.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-closure-input-readiness-current-gate.json");
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
    OWNER_CLOSURE_INPUT_READINESS_PATHS.latestJson,
    OWNER_CLOSURE_INPUT_READINESS_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, ownerInputsReady: false });

  const recorded = readJson(OWNER_CLOSURE_INPUT_READINESS_PATHS.latestJson);
  const current = buildOwnerClosureInputReadiness();
  if (!sameJson(
    stableOwnerClosureInputReadinessProjection(recorded),
    stableOwnerClosureInputReadinessProjection(current)
  )) {
    failures.push("A25 owner closure input readiness artifact is stale");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((recorded.inputBlocks ?? []).some((row) => row.cleanupAuthorizedRows !== 0 || row.executableRows !== 0)) {
    failures.push("input block contains cleanup-authorized or executable rows");
  }
  if (recorded.validationHold?.status !== "waiting-for-owner-compose-deletion-confirmation") {
    failures.push("validationHold.status must wait for owner compose deletion confirmation");
  }
  if (recorded.validationHold?.activeWorktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628") {
    failures.push("validationHold.activeWorktreePath must name the owner-active compose worktree");
  }
  if ((recorded.nextValidationCommands ?? []).length !== 5) failures.push("nextValidationCommands must contain five safe post-input commands");
  if ((recorded.deferredValidationCommands ?? []).length !== 8) failures.push("deferredValidationCommands must contain eight aggregate commands");
  if ((recorded.nextValidationCommands ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence") || command.includes("refresh-linked-worktree-archive-evidence"))) {
    failures.push("nextValidationCommands must not include linked or aggregate refresh commands while validationHold is active");
  }

  const markdown = readText(OWNER_CLOSURE_INPUT_READINESS_PATHS.latestMarkdown);
  for (const needle of [
    "owner-input readiness evidence only",
    "does not authorize staging",
    "Pending canonical authorization rows",
    "Pending owner blocker report records",
    "Validation Hold",
    "waiting-for-owner-compose-deletion-confirmation",
    "Deferred aggregate validation commands"
  ]) {
    if (!markdown.includes(needle)) failures.push(`readiness markdown missing boundary/status text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    ownerInputsReady: recorded.summary?.ownerInputsReady === true,
    pendingCanonicalAuthorizationRows: recorded.summary?.pendingCanonicalAuthorizationRows ?? 0,
    pendingOwnerBlockerReportRecords: recorded.summary?.pendingOwnerBlockerReportRecords ?? 0,
    commandPreviewRows: recorded.summary?.commandPreviewRows ?? 0,
    nextValidationCommands: (recorded.nextValidationCommands ?? []).length,
    deferredValidationCommands: (recorded.deferredValidationCommands ?? []).length,
    validationHoldStatus: recorded.validationHold?.status ?? null,
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
    console.log("A25 owner closure input readiness gate");
    console.log(`Owner inputs ready: ${payload.ownerInputsReady ? "yes" : "no"}`);
    console.log(`Pending canonical authorization rows: ${payload.pendingCanonicalAuthorizationRows ?? 0}`);
    console.log(`Pending owner blocker report records: ${payload.pendingOwnerBlockerReportRecords ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner closure input readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
