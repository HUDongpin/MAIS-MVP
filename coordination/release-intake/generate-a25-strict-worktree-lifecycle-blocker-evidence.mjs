#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  physicalClosureQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  latestJson: "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.json",
  latestMarkdown: "coordination/release-intake/latest-A25-strict-worktree-lifecycle-blocker-evidence.md",
  datedJson: `coordination/release-intake/${date}-A25-strict-worktree-lifecycle-blocker-evidence.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-strict-worktree-lifecycle-blocker-evidence.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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

function splitLines(value) {
  return String(value ?? "").split("\n").filter(Boolean);
}

function compactLines(value, maxLines = 30) {
  const lines = splitLines(value);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-(maxLines - head))
  ];
}

function runStrictLifecycleGate() {
  const result = spawnSync(process.execPath, ["coordination/release-intake/assert-worktree-lifecycle.mjs", "--strict", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const status = typeof result.status === "number" ? result.status : 1;
  return {
    command: "node coordination/release-intake/assert-worktree-lifecycle.mjs --strict --json",
    status,
    passed: status === 0,
    stdout: compactLines(result.stdout, 30),
    stderr: compactLines(result.stderr, 40),
    payload: JSON.parse(result.stdout),
    error: result.error?.message ?? null
  };
}

function dirtyMapSnapshot() {
  const dirtyMap = readJson(STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.dirtyMap);
  return {
    generatedAt: dirtyMap.generatedAt,
    reason: dirtyMap.reason,
    statusSignature: dirtyMap.statusSignature,
    collapsedStatusEntries: dirtyMap.statusCounts?.collapsedStatusEntries ?? null,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length
  };
}

function physicalClosureQueueSnapshot() {
  const queue = readJson(STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.physicalClosureQueue);
  const summary = queue.summary ?? {};
  return {
    ownerPackageApprovals: summary.ownerPackageApprovals ?? queue.ownerPackageApprovals ?? null,
    physicalLifecycleApprovals: summary.physicalLifecycleApprovals ?? queue.physicalLifecycleApprovals ?? null,
    totalApprovals: summary.totalApprovals ?? queue.totalApprovals ?? null,
    executableRows: summary.executableRows ?? queue.executableRows ?? null,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? queue.cleanupAuthorizedRows ?? null
  };
}

function lifecycleRows(worktrees) {
  return worktrees
    .filter((worktree) => (
      worktree.state === "dirty-open-decision" ||
      worktree.state === "clean-diverged-open-decision" ||
      worktree.prunable ||
      !worktree.exists
    ))
    .map((worktree, index) => ({
      decisionIndex: index + 1,
      branch: worktree.branch,
      path: worktree.path,
      head: worktree.head,
      state: worktree.state,
      statusEntries: worktree.statusEntries,
      modifiedEntries: worktree.modifiedEntries,
      untrackedEntries: worktree.untrackedEntries,
      divergence: worktree.divergence,
      exists: worktree.exists,
      prunable: worktree.prunable,
      prunableReason: worktree.prunableReason,
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      worktreeRemovalAuthorized: false,
      branchDeletionAuthorized: false,
      contentCaptured: false
    }));
}

export function buildStrictWorktreeLifecycleBlockerEvidence() {
  const gate = runStrictLifecycleGate();
  const payload = gate.payload;
  const rows = lifecycleRows(payload.worktrees ?? []);
  const dirtyMap = dirtyMapSnapshot();
  const physicalClosureQueue = physicalClosureQueueSnapshot();
  const rowSignature = sha256(JSON.stringify(rows));

  return {
    generatedAt: new Date().toISOString(),
    root,
    gate: {
      command: gate.command,
      status: gate.status,
      passed: gate.passed,
      stdout: gate.stdout,
      stderr: gate.stderr,
      error: gate.error
    },
    lifecycle: {
      strict: payload.strict,
      worktreeCount: payload.worktreeCount,
      prunableCount: payload.prunableCount,
      dirtyCount: payload.dirtyCount,
      divergedCleanCount: payload.divergedCleanCount,
      openDecisions: payload.openDecisions,
      failures: payload.failures,
      rowSignature
    },
    dirtyMap,
    physicalClosureQueue,
    summary: {
      strictLifecycleClean: gate.passed,
      strictLifecycleBlocked: !gate.passed,
      worktreeCount: payload.worktreeCount,
      dirtyOpenDecisions: payload.dirtyCount,
      cleanDivergedOpenDecisions: payload.divergedCleanCount,
      openDecisionRows: rows.length,
      prunableWorktrees: payload.prunableCount,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      worktreeRemovalAuthorizedRows: 0,
      branchDeletionAuthorizedRows: 0,
      contentCapturedRows: 0
    },
    rows,
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      worktreeRemovalAuthorized: false,
      branchDeletionAuthorized: false,
      contentCaptured: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableStrictWorktreeLifecycleBlockerProjection(payload) {
  return {
    root: payload.root,
    gate: {
      command: payload.gate?.command,
      status: payload.gate?.status,
      passed: payload.gate?.passed,
      error: payload.gate?.error ?? null
    },
    lifecycle: payload.lifecycle,
    dirtyMap: payload.dirtyMap,
    physicalClosureQueue: payload.physicalClosureQueue,
    summary: payload.summary,
    rows: payload.rows,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  const rows = payload.rows
    .map((row) => (
      `| ${row.decisionIndex} | \`${row.branch}\` | ${row.state} | ${row.statusEntries} | ${row.divergence ? `${row.divergence.behind}/${row.divergence.ahead}` : "n/a"} | ${row.executableNow ? "yes" : "no"} |`
    ))
    .join("\n") || "| none | n/a | n/a | 0 | n/a | no |";
  const gateOutput = [...payload.gate.stderr, ...payload.gate.stdout]
    .slice(0, 44)
    .map((line) => `| \`${line.replaceAll("|", "\\|")}\` |`)
    .join("\n") || "| none |";

  return `# A25 Strict Worktree Lifecycle Blocker Evidence

Generated: ${payload.generatedAt}

Strict lifecycle gate command: \`${payload.gate.command}\`

This is A25 release-intake evidence for the strict worktree lifecycle blocker. It records worktree state, branch names, paths, counts, divergence numbers, and hashes only. It does not copy file contents and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Strict lifecycle clean: ${payload.summary.strictLifecycleClean ? "yes" : "no"}
- Strict lifecycle blocked: ${payload.summary.strictLifecycleBlocked ? "yes" : "no"}
- Worktrees: ${payload.summary.worktreeCount}
- Dirty open decisions: ${payload.summary.dirtyOpenDecisions}
- Clean diverged open decisions: ${payload.summary.cleanDivergedOpenDecisions}
- Open decision rows: ${payload.summary.openDecisionRows}
- Prunable worktrees: ${payload.summary.prunableWorktrees}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Worktree-removal-authorized rows: ${payload.summary.worktreeRemovalAuthorizedRows}
- Branch-deletion-authorized rows: ${payload.summary.branchDeletionAuthorizedRows}
- Content-captured rows: ${payload.summary.contentCapturedRows}

## Physical Queue Snapshot

- Owner package approvals needed: ${payload.physicalClosureQueue.ownerPackageApprovals}
- Physical lifecycle approvals needed: ${payload.physicalClosureQueue.physicalLifecycleApprovals}
- Total approvals needed: ${payload.physicalClosureQueue.totalApprovals}
- Cleanup-authorized rows: ${payload.physicalClosureQueue.cleanupAuthorizedRows}
- Executable rows: ${payload.physicalClosureQueue.executableRows}

## Gate Output

| Gate output |
| --- |
${gateOutput}

## Open Lifecycle Decisions

- Row signature: \`${payload.lifecycle.rowSignature}\`
- Dirty-map signature: \`${payload.dirtyMap.statusSignature}\`

| # | Branch | State | Status entries | Behind/Ahead | Executable now |
| ---: | --- | --- | ---: | --- | --- |
${rows}

## Boundary

Every row remains non-executable. This evidence preserves why the A25 strict worktree lifecycle gate is blocked; it does not make any root entry, linked worktree, branch, or lifecycle decision eligible for cleanup, discard, staging, commit, branch deletion, deploy, prune, or worktree removal.
`;
}

function main() {
  const payload = buildStrictWorktreeLifecycleBlockerEvidence();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);

  for (const target of [STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestJson, STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.datedJson]) {
    write(target, json);
  }
  for (const target of [STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestMarkdown, STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.datedMarkdown]) {
    write(target, md);
  }

  console.log(JSON.stringify({
    latestJson: STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestJson,
    latestMarkdown: STRICT_WORKTREE_LIFECYCLE_BLOCKER_PATHS.latestMarkdown,
    strictLifecycleClean: payload.summary.strictLifecycleClean,
    worktreeCount: payload.summary.worktreeCount,
    dirtyOpenDecisions: payload.summary.dirtyOpenDecisions,
    cleanDivergedOpenDecisions: payload.summary.cleanDivergedOpenDecisions,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
