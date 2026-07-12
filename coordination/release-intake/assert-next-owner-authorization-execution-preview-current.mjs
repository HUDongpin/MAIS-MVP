#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS,
  buildNextOwnerAuthorizationExecutionPreview,
  stableNextOwnerAuthorizationExecutionPreviewProjection
} from "./generate-next-owner-authorization-execution-preview.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorization-execution-preview-current-gate.json");
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
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures, starterRows: 0 });

  const recorded = readJson(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestJson);
  const current = buildNextOwnerAuthorizationExecutionPreview();
  if (!sameJson(
    stableNextOwnerAuthorizationExecutionPreviewProjection(recorded),
    stableNextOwnerAuthorizationExecutionPreviewProjection(current)
  )) {
    failures.push("A25 next-owner authorization execution preview is stale");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateExecutionInstruction !== true) failures.push("boundary.requiresSeparateExecutionInstruction must be true");
  if (recorded.cleanupAuthorized !== false) failures.push("preview cleanupAuthorized must be false");
  if (recorded.executableNow !== false) failures.push("preview executableNow must be false");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("preview cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("preview executableRows must be 0");
  if ((recorded.rows ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) {
    failures.push("preview contains an executable or cleanup-authorized row");
  }
  if ((recorded.rows ?? []).some((row) => !row.preAuthorizationCheck)) {
    failures.push("preview rows must include preAuthorizationCheck");
  }
  if ((recorded.summary?.preAuthorizationReadyRows ?? 0) + (recorded.summary?.preAuthorizationAttentionRows ?? 0) !== (recorded.summary?.starterRows ?? 0)) {
    failures.push("preAuthorizationReadyRows and preAuthorizationAttentionRows must add up to starterRows");
  }
  if ((recorded.summary?.preAuthorizationAttentionRows ?? 0) !== 0) {
    failures.push("preAuthorizationAttentionRows must be 0 before owner authorization can be trusted");
  }
  if ((recorded.summary?.evidenceCompleteRows ?? 0) !== (recorded.summary?.starterRows ?? 0)) {
    failures.push("every preview row must have complete evidence files");
  }
  if ((recorded.summary?.worktreePresentRows ?? 0) !== (recorded.summary?.worktreeCheckRows ?? 0)) {
    failures.push("all required worktree checks must pass");
  }
  if ((recorded.summary?.targetPathPresentRows ?? 0) !== (recorded.summary?.targetPathCheckRows ?? 0)) {
    failures.push("all target path checks must pass");
  }
  if ((recorded.summary?.exactCommandTargetReadyRows ?? 0) !== (recorded.summary?.exactCommandRows ?? 0)) {
    failures.push("all exact command target checks must pass");
  }
  if ((recorded.summary?.pathspecPresentRows ?? 0) !== (recorded.summary?.pathspecRows ?? 0)) {
    failures.push("all pathspec files must be present");
  }
  if ((recorded.summary?.workOrderPresentRows ?? 0) !== (recorded.summary?.workOrderRows ?? 0)) {
    failures.push("all work-order files must be present");
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestMarkdown);
  for (const needle of [
    "evidence-only preview",
    "does not authorize staging",
    "A separate owner instruction must name the exact approval ID",
    "Pre-Authorization Checks",
    "Exact command target checks passed"
  ]) {
    if (!markdown.includes(needle)) failures.push(`preview markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("preview markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    starterRows: recorded.summary?.starterRows ?? 0,
    authorizationFilePresent: recorded.authorizationFilePresent === true,
    validAuthorizationRows: recorded.summary?.validAuthorizationRows ?? 0,
    preAuthorizationReadyRows: recorded.summary?.preAuthorizationReadyRows ?? 0,
    preAuthorizationAttentionRows: recorded.summary?.preAuthorizationAttentionRows ?? 0,
    exactCommandTargetReadyRows: recorded.summary?.exactCommandTargetReadyRows ?? 0,
    commandPreviewRows: recorded.summary?.commandPreviewRows ?? 0,
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
    console.log("A25 next-owner authorization execution preview gate");
    console.log(`Starter rows: ${payload.starterRows ?? 0}`);
    console.log(`Valid authorization rows: ${payload.validAuthorizationRows ?? 0}`);
    console.log(`Command preview rows: ${payload.commandPreviewRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorization execution preview gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
