#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function parseWorktrees() {
  return git(["worktree", "list", "--porcelain"])
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const entry = {
        path: "",
        head: "",
        branch: "",
        detached: false,
        prunable: false,
        prunableReason: ""
      };

      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch refs/heads/".length);
        else if (line === "detached") entry.detached = true;
        else if (line.startsWith("prunable ")) {
          entry.prunable = true;
          entry.prunableReason = line.slice("prunable ".length);
        } else if (line === "prunable") {
          entry.prunable = true;
        }
      }

      return classifyWorktree(entry);
    });
}

function classifyWorktree(entry) {
  const exists = fs.existsSync(entry.path);
  const branch = entry.branch || (entry.detached ? "(detached)" : "(unknown)");
  const statusLines = exists ? safe(() => git(["status", "--porcelain=v1", "-uall"], entry.path).split("\n").filter(Boolean), []) : [];
  const divergence = exists
    ? safe(() => {
        const [behind, ahead] = git(["rev-list", "--left-right", "--count", "main...HEAD"], entry.path).split(/\s+/).map(Number);
        return { behind, ahead };
      }, null)
    : null;
  const state = lifecycleState({ entry, exists, statusLines, divergence });

  return {
    path: entry.path,
    branch,
    head: entry.head,
    exists,
    prunable: entry.prunable,
    prunableReason: entry.prunableReason,
    statusEntries: statusLines.length,
    modifiedEntries: statusLines.filter((line) => !line.startsWith("??")).length,
    untrackedEntries: statusLines.filter((line) => line.startsWith("??")).length,
    divergence,
    state
  };
}

function lifecycleState({ entry, exists, statusLines, divergence }) {
  if (entry.prunable) return "stale-registry-prunable";
  if (!exists) return "missing-path";
  if (statusLines.length > 0) return "dirty-open-decision";
  if (divergence && (divergence.ahead > 0 || divergence.behind > 0)) return "clean-diverged-open-decision";
  return "clean-current";
}

function main() {
  const worktrees = parseWorktrees();
  const failures = [];
  const openDecisions = [];

  for (const worktree of worktrees) {
    if (worktree.prunable) failures.push(`${worktree.path}: prunable (${worktree.prunableReason || "no reason"})`);
    if (!worktree.exists) failures.push(`${worktree.path}: path missing`);
    if (worktree.state === "dirty-open-decision") openDecisions.push(`${worktree.branch}: dirty (${worktree.statusEntries} entries)`);
    if (worktree.state === "clean-diverged-open-decision") {
      const divergence = worktree.divergence ? `behind ${worktree.divergence.behind}, ahead ${worktree.divergence.ahead}` : "diverged";
      openDecisions.push(`${worktree.branch}: ${divergence}`);
    }
  }

  if (strict && openDecisions.length > 0) failures.push(...openDecisions.map((item) => `open lifecycle decision: ${item}`));

  const payload = {
    checkedAt: new Date().toISOString(),
    root,
    strict,
    worktreeCount: worktrees.length,
    prunableCount: worktrees.filter((entry) => entry.prunable).length,
    dirtyCount: worktrees.filter((entry) => entry.state === "dirty-open-decision").length,
    divergedCleanCount: worktrees.filter((entry) => entry.state === "clean-diverged-open-decision").length,
    failures,
    openDecisions,
    worktrees
  };

  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log("A25 worktree lifecycle gate");
    console.log(`Worktrees: ${payload.worktreeCount}`);
    console.log(`Prunable: ${payload.prunableCount}`);
    console.log(`Dirty open decisions: ${payload.dirtyCount}`);
    console.log(`Clean diverged open decisions: ${payload.divergedCleanCount}`);
    if (openDecisions.length > 0) {
      console.log("Open decisions:");
      for (const item of openDecisions) console.log(`- ${item}`);
    }
  }

  const outDir = path.join(root, "coordination", "release-intake");
  if (fs.existsSync(outDir)) {
    fs.writeFileSync(path.join(outDir, "latest-A25-worktree-lifecycle-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);
  }

  if (failures.length > 0) {
    console.error("A25 worktree lifecycle gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
