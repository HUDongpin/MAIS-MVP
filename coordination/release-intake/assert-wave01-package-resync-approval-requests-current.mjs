#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-approval-requests-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  wave01: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  requests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  requestsMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.md"
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

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function expectedApprovalId(recommendation, index) {
  return `wave01-resync-${String(index + 1).padStart(2, "0")}-${slug(recommendation.path)}`;
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, requests: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const wave01 = readJson(paths.wave01);
  const packet = readJson(paths.requests);

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("approval packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("approval packet expanded dirty entry count is stale");
  if (packet.wave01GeneratedAt !== wave01.generatedAt) failures.push("approval packet Wave 01 timestamp is stale");
  if (packet.wave01StatusSignature !== (wave01.worktree?.statusSignature ?? null)) failures.push("approval packet Wave 01 worktree status signature is stale");
  if (packet.cleanupAuthorized !== false) failures.push("approval packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("approval packet executableNow must be false");

  const recommendations = wave01.packageResyncRecommendations ?? [];
  const requests = packet.requests ?? [];
  if (requests.length !== recommendations.length) failures.push("approval request count is stale");

  const expectedSummary = {
    requests: requests.length,
    packageOnly: requests.filter((request) => request.packageOnly).length,
    cleanupAuthorizedRows: requests.filter((request) => request.cleanupAuthorized).length,
    executableRows: requests.filter((request) => request.executableNow).length
  };
  if (!sameJson(packet.summary, expectedSummary)) failures.push("approval packet summary is stale");
  if (expectedSummary.cleanupAuthorizedRows !== 0) failures.push("approval packet must not authorize cleanup");
  if (expectedSummary.executableRows !== 0) failures.push("approval packet must not have executable rows");

  for (const [index, recommendation] of recommendations.entries()) {
    const request = requests[index];
    if (!request) continue;
    const expectedId = expectedApprovalId(recommendation, index);
    if (request.approvalId !== expectedId) failures.push(`${expectedId}: approvalId is stale`);
    for (const key of ["path", "actionKind", "commandHint", "packageOnly", "rootPathExists", "worktreePathExists"]) {
      if (request[key] !== recommendation[key]) failures.push(`${expectedId}: ${key} is stale`);
    }
    if (request.cleanupAuthorized !== false) failures.push(`${expectedId}: cleanupAuthorized must be false`);
    if (request.executableNow !== false) failures.push(`${expectedId}: executableNow must be false`);
    if (!request.requiredAuthorizationText?.includes(`approvalId=${request.approvalId}`)) {
      failures.push(`${expectedId}: requiredAuthorizationText missing approval ID`);
    }
  }

  const markdown = readText(paths.requestsMarkdown);
  if (markdown.includes("undefined")) failures.push("approval packet markdown contains undefined");
  if (!markdown.includes("This is an approval-request artifact, not authorization")) {
    failures.push("approval packet markdown missing non-authorization boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    requests: requests.length,
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
    console.log("A25 Wave 01 package resync approval-request gate");
    console.log(`Requests: ${payload.requests ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync approval-request gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
