#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-approval-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  wave01Resync: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  readinessMatrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  blockerRouting: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  packet: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  packetMarkdown: "coordination/release-intake/latest-A25-next-owner-approval-packet.md"
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

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(paths.dirtyMap);
  const completionAudit = readJson(paths.completionAudit);
  const wave01Resync = readJson(paths.wave01Resync);
  const physicalQueue = readJson(paths.physicalQueue);
  const executionSequence = readJson(paths.executionSequence);
  const readinessMatrix = readJson(paths.readinessMatrix);
  const blockerRouting = readJson(paths.blockerRouting);
  const packet = readJson(paths.packet);

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded dirty entry count is stale");
  if (packet.rootStatusEntries !== completionAudit.rootStatusEntries) failures.push("packet root status entry count is stale");
  if (packet.cleanupAuthorized !== false) failures.push("packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("packet executableNow must be false");

  const expectedSummary = {
    packageResyncApprovals: wave01Resync.requests?.length ?? 0,
    ownerPackageApprovals: physicalQueue.ownerPackageQueue?.length ?? 0,
    physicalLifecycleApprovals: physicalQueue.physicalLifecycleQueue?.length ?? 0,
    totalApprovalIds: (wave01Resync.requests?.length ?? 0) + (physicalQueue.ownerPackageQueue?.length ?? 0) + (physicalQueue.physicalLifecycleQueue?.length ?? 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
  if (!sameJson(packet.nextApprovalSummary, expectedSummary)) failures.push("packet nextApprovalSummary is stale");

  if (!sameJson(packet.completion.summary, completionAudit.summary)) failures.push("packet completion summary is stale");
  if ((packet.packageResyncApprovals ?? []).length !== expectedSummary.packageResyncApprovals) failures.push("packet package resync approvals are stale");
  if ((packet.ownerPackageApprovals ?? []).length !== expectedSummary.ownerPackageApprovals) failures.push("packet owner package approvals are stale");
  if ((packet.physicalLifecycleApprovals ?? []).length !== expectedSummary.physicalLifecycleApprovals) failures.push("packet physical lifecycle approvals are stale");
  if ((packet.waves ?? []).length !== (executionSequence.waves ?? []).length) failures.push("packet wave count is stale");

  const expectedTopFiles = (readinessMatrix.summary?.topTypeCheckFiles ?? []).slice(0, 12);
  if (!sameJson(packet.packageReadiness?.topTypeCheckFiles, expectedTopFiles)) failures.push("packet top type-check files are stale");
  const expectedTopOwners = (blockerRouting.summary?.topRoutingOwners ?? []).slice(0, 12);
  if (!sameJson(packet.blockerRouting?.topRoutingOwners, expectedTopOwners)) failures.push("packet top routing owners are stale");

  const allApprovalRows = [
    ...(packet.packageResyncApprovals ?? []),
    ...(packet.ownerPackageApprovals ?? []),
    ...(packet.physicalLifecycleApprovals ?? [])
  ];
  const executableRows = allApprovalRows.filter((row) => row.executableNow).length;
  const cleanupAuthorizedRows = allApprovalRows.filter((row) => row.cleanupAuthorized).length;
  if (executableRows !== 0) failures.push("packet must not have executable rows");
  if (cleanupAuthorizedRows !== 0) failures.push("packet must not have cleanup-authorized rows");

  const markdown = readText(paths.packetMarkdown);
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes("This packet is approval support only")) failures.push("packet markdown missing non-authorization boundary");
  if (!markdown.includes("Immediate Wave 01 Package Resync Approvals")) failures.push("packet markdown missing Wave 01 resync section");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    packageResyncApprovals: expectedSummary.packageResyncApprovals,
    ownerPackageApprovals: expectedSummary.ownerPackageApprovals,
    physicalLifecycleApprovals: expectedSummary.physicalLifecycleApprovals,
    cleanupAuthorizedRows,
    executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next owner approval packet gate");
    console.log(`Package resync approvals: ${payload.packageResyncApprovals ?? 0}`);
    console.log(`Owner package approvals: ${payload.ownerPackageApprovals ?? 0}`);
    console.log(`Physical lifecycle approvals: ${payload.physicalLifecycleApprovals ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next owner approval packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
