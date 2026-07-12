#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS,
  buildGeneratedArtifactResidualAuthorizationPacket,
  stableGeneratedArtifactResidualAuthorizationProjection
} from "./generate-a22-generated-artifact-residual-authorization-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-generated-artifact-residual-authorization-packet-current-gate.json");
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
    GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson,
    GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) {
    return finish({ failures, residualTargets: 0, cleanupAuthorizedRows: 0, executableRows: 0 });
  }

  const recorded = readJson(GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson);
  const current = buildGeneratedArtifactResidualAuthorizationPacket();
  if (!sameJson(stableGeneratedArtifactResidualAuthorizationProjection(recorded), stableGeneratedArtifactResidualAuthorizationProjection(current))) {
    failures.push("A22 generated-artifact residual authorization packet is stale relative to residual evidence or dirty-map");
  }

  const rows = recorded.rows ?? [];
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  if (summary.residualTargets !== rows.length) failures.push("residual authorization summary row count is stale");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("authorization packet must not mark cleanup authorized");
  if ((summary.executableRows ?? 0) !== 0) failures.push("authorization packet must not mark rows executable");
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.fileDeletionAuthorized !== false) failures.push("boundary.fileDeletionAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.contentCaptured !== false) failures.push("boundary.contentCaptured must be false");
  for (const row of rows) {
    if (!row.approvalId) failures.push(`${row.path}: missing approvalId`);
    if (!row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)) failures.push(`${row.path}: authorization text missing approvalId`);
    if (!row.requiredAuthorizationText?.includes(`target=${row.path}`)) failures.push(`${row.path}: authorization text missing target`);
    if (!row.requiredAuthorizationText?.includes(`command=${row.exactCommand}`)) failures.push(`${row.path}: authorization text missing exact command`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.path}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.path}: executableNow must be false`);
  }

  const markdown = readText(GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestMarkdown);
  for (const needle of [
    "It is not owner approval",
    "Every row remains non-executable",
    "does not authorize staging"
  ]) {
    if (!markdown.includes(needle)) failures.push(`authorization packet markdown missing boundary text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("authorization packet markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    residualTargets: rows.length,
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
    console.log("A22 generated-artifact residual authorization packet gate");
    console.log(`Residual targets: ${payload.residualTargets ?? 0}`);
    console.log(`Executable rows: ${payload.executableRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 generated-artifact residual authorization packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
