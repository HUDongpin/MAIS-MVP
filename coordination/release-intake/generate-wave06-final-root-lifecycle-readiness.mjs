#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const waveId = "wave-06-final-root-and-compose-lifecycle";

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  sequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  remainingStrictPacket: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  finalActionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  linkedArchiveGate: "coordination/release-intake/latest-A25-linked-worktree-archive-evidence-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.json",
  latestMd: "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave06-final-root-lifecycle-readiness.json`,
  datedMd: `coordination/release-intake/${date}-A25-wave06-final-root-lifecycle-readiness.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compact(value, maxLines = 24) {
  const lines = String(value ?? "").trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  return [...lines.slice(0, head), `... ${lines.length - maxLines} lines omitted ...`, ...lines.slice(-(maxLines - head))];
}

function runCheck(check) {
  try {
    const stdout = execFileSync(check.command, check.args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { command: [check.command, ...check.args].join(" "), status: 0, passed: true, stdout: compact(stdout), stderr: [] };
  } catch (error) {
    return {
      command: [check.command, ...check.args].join(" "),
      status: typeof error?.status === "number" ? error.status : 1,
      passed: false,
      stdout: compact(error?.stdout?.toString?.() ?? ""),
      stderr: compact(error?.stderr?.toString?.() ?? "", 40)
    };
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

function markdown(payload) {
  const approvalRows = payload.wave.physicalLifecycleApprovals.map((row) => {
    return `| \`${row.approvalId}\` | \`${row.branch}\` | ${row.state} | ${row.currentBlocker} |`;
  }).join("\n") || "| none | none | none | none |";
  const checkRows = Object.entries(payload.checks).map(([name, check]) => {
    return `| ${name} | ${check.passed ? "pass" : "fail"} | ${check.status} | \`${check.command}\` |`;
  }).join("\n");

  return `# A25 Wave 06 Final Root Lifecycle Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Final closure ready: ${payload.finalClosureReady ? "yes" : "no"}
- Blocking reasons: ${payload.blockingReasons.join("; ") || "none"}
- Physical lifecycle approvals in this wave: ${payload.wave.physicalLifecycleApprovals.length}
- Global physical lifecycle approvals needed: ${payload.physicalQueue.summary.physicalLifecycleApprovals}
- Owner-package approvals still represented globally: ${payload.physicalQueue.summary.ownerPackageApprovals}
- Executable rows: ${payload.physicalQueue.summary.executableRows}
- Cleanup-authorized rows: ${payload.physicalQueue.summary.cleanupAuthorizedRows}
- Remaining strict blockers: ${payload.remainingStrictBlockers.join("; ") || "none"}
- Checks: ${payload.summary.passedChecks}/${payload.summary.checkCount} passed, ${payload.summary.failedChecks} failed

## Wave 06 Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
${approvalRows}

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
${checkRows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const sequence = readJson(paths.sequence);
  const physicalQueue = readJson(paths.physicalQueue);
  const remainingStrictPacket = readJson(paths.remainingStrictPacket);
  const finalActionRunbook = readJson(paths.finalActionRunbook);
  const linkedArchiveGate = readJson(paths.linkedArchiveGate);
  const wave = (sequence.waves ?? []).find((item) => item.waveId === waveId);
  if (!wave) throw new Error("Wave 06 is missing from the closure execution sequence.");
  if (sequence.dirtyMapStatusSignature !== dirtyMap.statusSignature) throw new Error("Closure execution sequence is stale relative to dirty map.");

  const checks = Object.fromEntries(checkConfigs.map((check) => [check.name, runCheck(check)]));
  const remainingStrictBlockers = (remainingStrictPacket.remainingStrictBlockers ?? []).map((row) => row.id ?? row);
  const blockingReasons = [];
  if (!checks.releaseSourceClean.passed) blockingReasons.push("A22 release-source clean gate failed");
  if (!checks.strictWorktreeLifecycle.passed) blockingReasons.push("A25 strict worktree lifecycle gate failed");
  if ((physicalQueue.summary?.executableRows ?? 0) !== 0) blockingReasons.push("physical closure queue has executable rows");
  if ((physicalQueue.summary?.cleanupAuthorizedRows ?? 0) !== 0) blockingReasons.push("physical closure queue has cleanup-authorized rows");
  if ((finalActionRunbook.summary?.notExecutable ?? 0) !== (finalActionRunbook.summary?.total ?? 0)) blockingReasons.push("final action runbook has executable actions");

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    executionSequenceGeneratedAt: sequence.generatedAt,
    artifactSignatures: {
      physicalQueue: physicalQueue.dirtyMapStatusSignature,
      remainingStrictPacket: remainingStrictPacket.dirtyMapStatusSignature,
      finalActionRunbook: finalActionRunbook.dirtyMapStatusSignature,
      linkedArchiveGate: linkedArchiveGate.dirtyMapStatusSignature ?? linkedArchiveGate.expandedStatusEntries
    },
    wave: {
      waveId: wave.waveId,
      name: wave.name,
      ownerApprovals: wave.ownerApprovals.map((row) => row.approvalId),
      physicalLifecycleApprovals: wave.physicalLifecycleApprovals.map((row) => ({
        approvalId: row.approvalId,
        branch: row.branch,
        state: row.state,
        currentBlocker: row.currentBlocker
      }))
    },
    physicalQueue: {
      cleanupAuthorized: physicalQueue.cleanupAuthorized,
      summary: physicalQueue.summary
    },
    remainingStrictBlockers,
    finalActionRunbook: {
      summary: finalActionRunbook.summary
    },
    checks,
    summary: summarizeChecks(checks),
    finalClosureReady: blockingReasons.length === 0 && remainingStrictBlockers.length === 0,
    cleanupAuthorized: false,
    executableNow: false,
    blockingReasons
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  const md = markdown(payload);
  write(paths.latestMd, md);
  write(paths.datedMd, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMd,
    finalClosureReady: payload.finalClosureReady,
    physicalLifecycleApprovals: payload.wave.physicalLifecycleApprovals.length,
    remainingStrictBlockers: payload.remainingStrictBlockers.length,
    executableRows: payload.physicalQueue.summary.executableRows,
    cleanupAuthorizedRows: payload.physicalQueue.summary.cleanupAuthorizedRows,
    passedChecks: payload.summary.passedChecks,
    failedChecks: payload.summary.failedChecks
  }, null, 2));
}

main();
