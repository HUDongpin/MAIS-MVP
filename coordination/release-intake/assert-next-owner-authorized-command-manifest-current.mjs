#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS,
  buildNextOwnerAuthorizedCommandManifest,
  stableNextOwnerAuthorizedCommandManifestProjection
} from "./generate-next-owner-authorized-command-manifest.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-authorized-command-manifest-current-gate.json");
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
    NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestJson,
    NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures, authorizedCandidateRows: 0 });

  const recorded = readJson(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestJson);
  const current = buildNextOwnerAuthorizedCommandManifest();
  if (!sameJson(
    stableNextOwnerAuthorizedCommandManifestProjection(recorded),
    stableNextOwnerAuthorizedCommandManifestProjection(current)
  )) {
    failures.push("A25 next-owner authorized command manifest is stale");
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.manifestOnly !== true) failures.push("boundary.manifestOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateExecutionInstruction !== true) failures.push("boundary.requiresSeparateExecutionInstruction must be true");
  if (recorded.cleanupAuthorized !== false) failures.push("manifest cleanupAuthorized must be false");
  if (recorded.executableNow !== false) failures.push("manifest executableNow must be false");
  if ((recorded.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("manifest cleanupAuthorizedRows must be 0");
  if ((recorded.summary?.executableRows ?? 0) !== 0) failures.push("manifest executableRows must be 0");
  if ((recorded.candidates ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) {
    failures.push("manifest contains an executable or cleanup-authorized row");
  }
  if ((recorded.candidates ?? []).some((row) => row.requiresSeparateExecutionInstruction !== true)) {
    failures.push("every candidate must require a separate execution instruction");
  }
  if ((recorded.candidates ?? []).some((row) => row.readyForSeparateInstruction === true && !row.command)) {
    failures.push("ready candidates must include an exact command");
  }
  if ((recorded.summary?.authorizedCandidateRows ?? 0) !== (recorded.summary?.validAuthorizationRows ?? 0)) {
    failures.push("authorizedCandidateRows must match validAuthorizationRows");
  }
  if ((recorded.summary?.readyForSeparateInstructionRows ?? 0) + (recorded.summary?.blockedCandidateRows ?? 0) !== (recorded.summary?.authorizedCandidateRows ?? 0)) {
    failures.push("ready and blocked candidate counts must add up to authorized candidates");
  }

  const markdown = readText(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestMarkdown);
  for (const needle of [
    "manifest-only safety bridge",
    "does not authorize staging",
    "A separate owner instruction must name the exact approval ID",
    "Ready for separate instruction rows",
    "This manifest is non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`manifest markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("manifest markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    validAuthorizationRows: recorded.summary?.validAuthorizationRows ?? 0,
    authorizedCandidateRows: recorded.summary?.authorizedCandidateRows ?? 0,
    readyForSeparateInstructionRows: recorded.summary?.readyForSeparateInstructionRows ?? 0,
    blockedCandidateRows: recorded.summary?.blockedCandidateRows ?? 0,
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
    console.log("A25 next-owner authorized command manifest gate");
    console.log(`Authorized candidates: ${payload.authorizedCandidateRows ?? 0}`);
    console.log(`Ready for separate instruction: ${payload.readyForSeparateInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner authorized command manifest gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
