#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");

const evidence = {
  visualization: {
    type: "dirty-worktree",
    worktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release",
    summary: "2026-06-26-A25-worktree-evidence-visualization-production-release/summary.json"
  },
  california: {
    type: "branch",
    branch: "codex/california-practice-beta-clean",
    summary: "2026-06-26-A25-branch-evidence-california-practice-beta-clean/summary.json"
  },
  s22ReleaseHygiene: {
    type: "branch",
    branch: "codex/s22-release-hygiene-2026-06-15",
    summary: "2026-06-26-A25-branch-evidence-s22-release-hygiene-2026-06-15/summary.json"
  }
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readSummary(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(outDir, relativePath), "utf8"));
}

function worktreeStatusCount(worktreePath) {
  const raw = git(["status", "--porcelain=v1", "-uall"], worktreePath);
  return raw ? raw.split("\n").filter(Boolean).length : 0;
}

function worktreeUntrackedCount(worktreePath) {
  const raw = git(["ls-files", "--others", "--exclude-standard"], worktreePath);
  return raw ? raw.split("\n").filter(Boolean).length : 0;
}

function main() {
  const failures = [];
  const checks = [];

  for (const [name, item] of Object.entries(evidence)) {
    const summaryPath = path.join(outDir, item.summary);
    if (!fs.existsSync(summaryPath)) {
      failures.push(`${name}: missing evidence summary ${item.summary}`);
      continue;
    }

    const summary = readSummary(item.summary);
    if (item.type === "branch") {
      const currentHead = git(["rev-parse", item.branch]);
      const ok = currentHead === summary.head;
      checks.push({ name, type: item.type, branch: item.branch, currentHead, archivedHead: summary.head, ok });
      if (!ok) failures.push(`${name}: branch head changed from ${summary.head} to ${currentHead}`);
    } else if (item.type === "dirty-worktree") {
      const currentHead = git(["rev-parse", "HEAD"], item.worktree);
      const currentStatusEntries = worktreeStatusCount(item.worktree);
      const currentUntracked = worktreeUntrackedCount(item.worktree);
      const ok =
        currentHead === summary.head &&
        currentStatusEntries === summary.statusEntries &&
        currentUntracked === summary.untrackedCount;
      checks.push({
        name,
        type: item.type,
        worktree: item.worktree,
        currentHead,
        archivedHead: summary.head,
        currentStatusEntries,
        archivedStatusEntries: summary.statusEntries,
        currentUntracked,
        archivedUntracked: summary.untrackedCount,
        ok
      });
      if (!ok) failures.push(`${name}: dirty worktree evidence is stale`);
    }
  }

  const payload = {
    checkedAt: new Date().toISOString(),
    checks,
    failures
  };
  fs.writeFileSync(path.join(outDir, "latest-A25-disposition-evidence-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("A25 disposition evidence current gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("A25 disposition evidence current gate passed");
  console.log(`Evidence checks: ${checks.length}`);
}

main();
