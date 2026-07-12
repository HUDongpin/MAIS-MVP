#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-execution-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  approvalRequests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  executionPacketMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.md"
};

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

function expectedRow(request, index) {
  return {
    executionIndex: index + 1,
    approvalId: request.approvalId,
    owner: request.owner,
    path: request.path,
    worktreePath: request.worktreePath,
    branch: request.branch,
    selectedAction: request.actionKind,
    exactCommand: request.commandHint,
    commandCwd: request.worktreePath,
    packageOnly: request.packageOnly,
    rootPathExists: request.rootPathExists,
    worktreePathExists: request.worktreePathExists,
    requiresExactOwnerAuthorization: true,
    ownerAuthorizationPresent: false,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, executionRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const approvalRequests = readJson(paths.approvalRequests);
  const packet = readJson(paths.executionPacket);

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("execution packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("execution packet expanded dirty entry count is stale");
  if (packet.approvalRequestsGeneratedAt !== approvalRequests.generatedAt) failures.push("execution packet approval request timestamp is stale");
  if (packet.cleanupAuthorized !== false) failures.push("execution packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("execution packet executableNow must be false");

  const requests = approvalRequests.requests ?? [];
  const rows = packet.executionRows ?? [];
  if (rows.length !== requests.length) failures.push("execution row count is stale");

  const expectedSummary = {
    executionRows: rows.length,
    requiresAuthorizationRows: rows.filter((row) => row.requiresExactOwnerAuthorization).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };
  if (!sameJson(packet.summary, expectedSummary)) failures.push("execution packet summary is stale");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("execution packet must not authorize cleanup");
  if (expectedSummary.executableRows !== 0) failures.push("execution packet must not have executable rows");

  for (const [index, request] of requests.entries()) {
    const row = rows[index];
    if (!row) continue;
    const expected = expectedRow(request, index);
    for (const [key, value] of Object.entries(expected)) {
      if (!sameJson(row[key], value)) failures.push(`${request.approvalId}: ${key} is stale`);
    }
    if (!row.requiredAuthorizationText?.includes(`approvalId=${request.approvalId}`)) {
      failures.push(`${request.approvalId}: requiredAuthorizationText missing approval ID`);
    }
    if (!row.requiredAuthorizationText?.includes(`command=${request.commandHint}`)) {
      failures.push(`${request.approvalId}: requiredAuthorizationText missing exact command`);
    }
    if (!row.stopCondition?.includes("Do not execute")) failures.push(`${request.approvalId}: missing stop condition`);
    if (!Array.isArray(row.preExecutionChecks) || row.preExecutionChecks.length < 4) {
      failures.push(`${request.approvalId}: missing pre-execution checks`);
    }
    if (!Array.isArray(row.postExecutionChecks) || row.postExecutionChecks.length < 8) {
      failures.push(`${request.approvalId}: missing post-execution checks`);
    }
    if (!row.preExecutionChecks?.includes("node coordination/release-intake/assert-no-staged-changes.mjs --json")) {
      failures.push(`${request.approvalId}: pre-execution checks must include no-staged gate`);
    }
    if (!row.postExecutionChecks?.includes("node coordination/release-intake/assert-no-staged-changes.mjs --json")) {
      failures.push(`${request.approvalId}: post-execution checks must include no-staged gate`);
    }
  }

  const markdown = readText(paths.executionPacketMarkdown);
  if (markdown.includes("undefined")) failures.push("execution packet markdown contains undefined");
  if (!markdown.includes("This is an execution-readiness packet, not authorization")) {
    failures.push("execution packet markdown missing non-authorization boundary");
  }
  if (!markdown.includes("Pre-execution checks")) failures.push("execution packet markdown missing pre-execution checks");
  if (!markdown.includes("Post-execution checks")) failures.push("execution packet markdown missing post-execution checks");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    executionRows: rows.length,
    cleanupAuthorizedRows: expectedSummary.cleanupAuthorizedRows,
    executableRows: expectedSummary.executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 01 package resync execution-packet gate");
    console.log(`Execution rows: ${payload.executionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync execution-packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
