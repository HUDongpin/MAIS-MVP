#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  buildNoDirtyRootDeployEvidence,
  NO_DIRTY_ROOT_DEPLOY_PATHS
} from "./generate-no-dirty-root-deploy-evidence.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-no-dirty-root-deploy-evidence-current-gate.json");
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function stableCommand(command) {
  return {
    command: command.command,
    status: command.status,
    passed: command.passed,
    expectedBlocked: command.expectedBlocked,
    failureClassification: command.failureClassification
  };
}

function stableProjection(payload) {
  return {
    localEvidenceOnly: payload.localEvidenceOnly,
    externalVercelAudit: payload.externalVercelAudit,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    rootStatusSummary: payload.rootStatusSummary,
    commands: Object.fromEntries(Object.entries(payload.commands ?? {}).map(([key, command]) => [key, stableCommand(command)])),
    wrapperChecks: payload.wrapperChecks,
    localDeploymentRecords: payload.localDeploymentRecords,
    deployCommandsExecutedByThisScript: payload.deployCommandsExecutedByThisScript,
    failures: payload.failures,
    passed: payload.passed
  };
}

function main() {
  const failures = [];
  for (const requiredPath of [
    NO_DIRTY_ROOT_DEPLOY_PATHS.dirtyMap,
    NO_DIRTY_ROOT_DEPLOY_PATHS.latestJson,
    NO_DIRTY_ROOT_DEPLOY_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, passed: false });

  const recorded = readJson(NO_DIRTY_ROOT_DEPLOY_PATHS.latestJson);
  const current = buildNoDirtyRootDeployEvidence();
  const recordedStable = stableProjection(recorded);
  const currentStable = stableProjection(current);

  if (!sameJson(recordedStable, currentStable)) {
    failures.push("no-dirty-root-deploy evidence is stale relative to current guard/source/record probes");
  }
  if (recorded.localEvidenceOnly !== true) failures.push("evidence must be marked localEvidenceOnly");
  if (recorded.externalVercelAudit !== false) failures.push("evidence must not claim external Vercel audit coverage");
  if ((recorded.deployCommandsExecutedByThisScript ?? []).length !== 0) {
    failures.push("evidence script must not execute deploy commands");
  }
  if (recorded.passed !== true) failures.push("recorded no-dirty-root-deploy evidence is not passing");
  if (current.passed !== true) failures.push("current no-dirty-root-deploy evidence is not passing");

  const markdown = fs.readFileSync(path.join(root, NO_DIRTY_ROOT_DEPLOY_PATHS.latestMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("no-dirty-root-deploy markdown contains undefined");
  if (!markdown.includes("This is local evidence only")) failures.push("markdown missing local-evidence boundary");
  if (!markdown.includes("deploy commands executed by this script: 0")) {
    failures.push("markdown missing no-deploy-command boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: current.dirtyMapStatusSignature,
    expandedStatusEntries: current.expandedStatusEntries,
    rootStatusEntries: current.rootStatusSummary.statusEntries,
    localDeploymentRecords: current.localDeploymentRecords.recordCount,
    invalidDeploymentRecords: current.localDeploymentRecords.invalidCount,
    passed: failures.length === 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 no-dirty-root-deploy evidence gate");
    console.log(`Passed: ${payload.passed ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 no-dirty-root-deploy evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
