#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave06-final-root-lifecycle-readiness-current-gate.json");
const json = process.argv.includes("--json");
const waveId = "wave-06-final-root-and-compose-lifecycle";

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  sequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  remainingStrictPacket: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  finalActionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  readiness: "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.json",
  readinessMd: "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.md"
};

const checkConfigs = [
  { name: "releaseSourceClean", command: "node", args: ["coordination/release-intake/assert-release-source-clean.mjs"] },
  { name: "strictWorktreeLifecycle", command: "node", args: ["coordination/release-intake/assert-worktree-lifecycle.mjs", "--strict"] },
  { name: "physicalQueueCurrent", command: "node", args: ["coordination/release-intake/assert-physical-closure-authorization-queue-current.mjs"] },
  { name: "remainingStrictPacketCurrent", command: "node", args: ["coordination/release-intake/assert-remaining-strict-blocker-authorization-packet-current.mjs"] },
  { name: "finalActionRunbookCurrent", command: "node", args: ["coordination/release-intake/assert-dirty-worktree-final-state-action-runbook-current.mjs"] },
  { name: "linkedArchiveEvidenceCurrent", command: "node", args: ["coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs"] }
];

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
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

function runStatus(check) {
  try {
    execFileSync(check.command, check.args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: 0, passed: true };
  } catch (error) {
    return { status: typeof error?.status === "number" ? error.status : 1, passed: false };
  }
}

function summarizeChecks(checks) {
  const values = Object.values(checks);
  return {
    checkCount: values.length,
    passedChecks: values.filter((check) => check.passed).length,
    failedChecks: values.filter((check) => !check.passed).length
  };
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, finalClosureReady: false });

  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.sequence);
  const physicalQueue = readJson(paths.physicalQueue);
  const remainingStrictPacket = readJson(paths.remainingStrictPacket);
  const finalActionRunbook = readJson(paths.finalActionRunbook);
  const readiness = readJson(paths.readiness);
  const wave = (sequence.waves ?? []).find((item) => item.waveId === waveId);

  if (!wave) failures.push("Wave 06 is missing from the closure execution sequence");
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("readiness dirty-map signature is stale");
  if (readiness.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("readiness expanded dirty entry count is stale");
  if (readiness.executionSequenceGeneratedAt !== sequence.generatedAt) failures.push("readiness sequence timestamp is stale");
  if (readiness.wave?.waveId !== waveId) failures.push("readiness wave id is stale");
  if (wave && !sameJson(readiness.wave?.ownerApprovals, wave.ownerApprovals.map((row) => row.approvalId))) failures.push("readiness owner approval list is stale");
  if (wave && !sameJson(readiness.wave?.physicalLifecycleApprovals, wave.physicalLifecycleApprovals.map((row) => ({
    approvalId: row.approvalId,
    branch: row.branch,
    state: row.state,
    currentBlocker: row.currentBlocker
  })))) failures.push("readiness physical lifecycle approval list is stale");

  if (!sameJson(readiness.physicalQueue?.summary, physicalQueue.summary)) failures.push("physical queue summary is stale");
  if (readiness.physicalQueue?.cleanupAuthorized !== physicalQueue.cleanupAuthorized) failures.push("physical queue cleanup authorization is stale");
  const remainingStrictBlockers = (remainingStrictPacket.remainingStrictBlockers ?? []).map((row) => row.id ?? row);
  if (!sameJson(readiness.remainingStrictBlockers, remainingStrictBlockers)) failures.push("remaining strict blockers are stale");
  if (!sameJson(readiness.finalActionRunbook?.summary, finalActionRunbook.summary)) failures.push("final action runbook summary is stale");

  const expectedChecks = Object.fromEntries(checkConfigs.map((check) => [check.name, runStatus(check)]));
  for (const [name, expected] of Object.entries(expectedChecks)) {
    const actual = readiness.checks?.[name];
    if (!actual) failures.push(`missing readiness check ${name}`);
    if (actual && actual.passed !== expected.passed) failures.push(`${name}: passed flag is stale`);
    if (actual && actual.status !== expected.status) failures.push(`${name}: status is stale`);
  }

  const expectedReasons = [];
  if (!expectedChecks.releaseSourceClean.passed) expectedReasons.push("A22 release-source clean gate failed");
  if (!expectedChecks.strictWorktreeLifecycle.passed) expectedReasons.push("A25 strict worktree lifecycle gate failed");
  if ((physicalQueue.summary?.executableRows ?? 0) !== 0) expectedReasons.push("physical closure queue has executable rows");
  if ((physicalQueue.summary?.cleanupAuthorizedRows ?? 0) !== 0) expectedReasons.push("physical closure queue has cleanup-authorized rows");
  if ((finalActionRunbook.summary?.notExecutable ?? 0) !== (finalActionRunbook.summary?.total ?? 0)) expectedReasons.push("final action runbook has executable actions");
  if (!sameJson(readiness.blockingReasons, expectedReasons)) failures.push("readiness blocking reasons are stale");
  if (!sameJson(readiness.summary, summarizeChecks(readiness.checks ?? {}))) failures.push("readiness summary is stale");
  if (readiness.finalClosureReady !== (expectedReasons.length === 0 && remainingStrictBlockers.length === 0)) failures.push("readiness finalClosureReady is stale");
  if (readiness.cleanupAuthorized !== false) failures.push("readiness cleanupAuthorized must be false");
  if (readiness.executableNow !== false) failures.push("readiness executableNow must be false");

  const markdown = readText(paths.readinessMd);
  if (markdown.includes("undefined")) failures.push("readiness markdown contains undefined");
  if (!markdown.includes("readiness evidence only")) failures.push("readiness markdown missing non-authorization boundary");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    finalClosureReady: readiness.finalClosureReady,
    physicalLifecycleApprovals: readiness.wave?.physicalLifecycleApprovals?.length ?? null,
    remainingStrictBlockers: readiness.remainingStrictBlockers?.length ?? null,
    executableRows: readiness.physicalQueue?.summary?.executableRows ?? null,
    cleanupAuthorizedRows: readiness.physicalQueue?.summary?.cleanupAuthorizedRows ?? null,
    passedChecks: readiness.summary?.passedChecks ?? null,
    failedChecks: readiness.summary?.failedChecks ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 06 final root lifecycle readiness gate");
    console.log(`Final closure ready: ${payload.finalClosureReady ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 06 final root lifecycle readiness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
