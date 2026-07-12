#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const allowApprovedPrunedStaging = args.has("--allow-approved-pruned-staging");
const requireNoPrunableRegistry = args.has("--require-no-prunable-registry");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd ?? cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  }).trim();
}

function fail(message, details = []) {
  console.error(["A22 release-source clean gate failed.", message, ...details].join("\n"));
  process.exit(1);
}

function parseStatus() {
  return git(["status", "--porcelain=v1", "-uall"])
    .split("\n")
    .filter(Boolean);
}

function parseWorktrees(repoRoot) {
  return git(["worktree", "list", "--porcelain"], { cwd: repoRoot })
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const entry = { path: "", branch: "", prunable: false, prunableReason: "" };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch refs/heads/".length);
        else if (line.startsWith("prunable ")) {
          entry.prunable = true;
          entry.prunableReason = line.slice("prunable ".length);
        } else if (line === "prunable") {
          entry.prunable = true;
        }
      }
      return entry;
    });
}

function main() {
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  const branch = git(["branch", "--show-current"]) || "(detached)";
  const head = git(["rev-parse", "--short", "HEAD"]);
  const statusLines = parseStatus();
  const repoName = path.basename(repoRoot);
  const isMaisRoot = repoRoot === "/Users/dongpinhu/Desktop/MAIS-MVP";
  const isPrunedStaging = repoRoot.includes(`${path.sep}.tmp${path.sep}vercel-staging${path.sep}`);

  if (statusLines.length > 0 && !(allowApprovedPrunedStaging && isPrunedStaging)) {
    const sample = statusLines.slice(0, 25).join("\n");
    fail(
      `Release source is dirty: ${statusLines.length} expanded status entries in ${repoRoot}.`,
      [
        `Branch: ${branch}`,
        `HEAD: ${head}`,
        "Sample:",
        sample,
        "Allowed sources: clean worktree, clean clone, reviewed clean release slice, or explicitly owner-approved pruned staging package."
      ]
    );
  }

  if (isMaisRoot && statusLines.length > 0) {
    fail(
      "The MAIS-MVP root checkout is an integration inventory, not a release source.",
      [
        "Use a clean worktree, clean clone, reviewed clean slice, or explicitly owner-approved pruned staging package."
      ]
    );
  }

  if (requireNoPrunableRegistry) {
    const prunable = parseWorktrees(repoRoot).filter((entry) => entry.prunable);
    if (prunable.length > 0) {
      fail(
        `Worktree registry has ${prunable.length} prunable entries.`,
        prunable.map((entry) => `${entry.path}: ${entry.prunableReason || "prunable"}`)
      );
    }
  }

  const marker = {
    checkedAt: new Date().toISOString(),
    repoRoot,
    repoName,
    branch,
    head,
    statusEntries: statusLines.length,
    allowApprovedPrunedStaging,
    isPrunedStaging,
    result: "pass"
  };

  const markerPath = path.join(repoRoot, "coordination", "release-intake");
  if (fs.existsSync(markerPath) && fs.statSync(markerPath).isDirectory()) {
    fs.writeFileSync(
      path.join(markerPath, "latest-A22-release-source-clean-gate.json"),
      `${JSON.stringify(marker, null, 2)}\n`
    );
  }

  console.log("A22 release-source clean gate passed");
  console.log(`Repo: ${repoRoot}`);
  console.log(`Branch: ${branch}`);
  console.log(`HEAD: ${head}`);
  console.log(`Dirty entries: ${statusLines.length}`);
}

main();
