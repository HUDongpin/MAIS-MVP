#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-linked-worktree-archive-evidence-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  linkedManifest: "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.json",
  linkedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
  cleanDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  cleanDivergedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
  dirtyDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.json",
  dirtyDivergedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fileSize(relativePath) {
  return fs.statSync(path.join(root, relativePath)).size;
}

function splitLines(value) {
  return String(value ?? "").split("\n").filter(Boolean);
}

function parseWorktrees() {
  return git(["worktree", "list", "--porcelain"])
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const entry = { path: "", branch: "", head: "", detached: false, prunable: false };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch refs/heads/".length);
        else if (line === "detached") entry.detached = true;
        else if (line.startsWith("prunable")) entry.prunable = true;
      }
      if (!entry.branch && entry.detached) entry.branch = "(detached)";
      return classifyWorktree(entry);
    });
}

function classifyWorktree(entry) {
  const existsOnDisk = fs.existsSync(entry.path);
  const statusLines = existsOnDisk ? splitLines(git(["status", "--porcelain=v1", "-uall"], entry.path)) : [];
  const untracked = existsOnDisk ? splitLines(git(["ls-files", "--others", "--exclude-standard"], entry.path)).sort() : [];
  const divergence = existsOnDisk
    ? (() => {
        const [behind, ahead] = git(["rev-list", "--left-right", "--count", "main...HEAD"], entry.path).split(/\s+/).map(Number);
        return { behind, ahead };
      })()
    : { behind: 0, ahead: 0 };
  const state = statusLines.length > 0
    ? "dirty-worktree"
    : divergence.behind > 0 || divergence.ahead > 0
      ? "clean-diverged-branch"
      : "clean-current";
  return {
    path: entry.path,
    branch: entry.branch,
    head: entry.head,
    exists: existsOnDisk,
    prunable: entry.prunable,
    state,
    statusEntries: statusLines.length,
    untrackedEntries: untracked.length,
    divergence
  };
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function byBranch(entries) {
  return new Map((entries ?? []).map((entry) => [entry.branch, entry]));
}

function validatePrefixFiles(entry, suffixes, failures) {
  for (const suffix of suffixes) {
    const relativePath = `${entry.prefix}${suffix}`;
    if (!exists(relativePath)) failures.push(`${entry.branch}: missing archive file ${relativePath}`);
  }
}

function validateDirty(worktree, entry, failures) {
  if (!entry) {
    failures.push(`${worktree.branch}: missing dirty linked archive entry`);
    return;
  }
  if (entry.archiveKind !== "dirty-worktree") failures.push(`${worktree.branch}: archiveKind is stale`);
  if (entry.path !== worktree.path) failures.push(`${worktree.branch}: path is stale`);
  if (entry.head !== worktree.head) failures.push(`${worktree.branch}: head is stale`);
  if (entry.statusEntries !== worktree.statusEntries) failures.push(`${worktree.branch}: statusEntries is stale`);
  if (entry.untrackedEntries !== worktree.untrackedEntries) failures.push(`${worktree.branch}: untrackedEntries is stale`);
  if (!sameJson(entry.divergence, worktree.divergence)) failures.push(`${worktree.branch}: divergence is stale`);
  validatePrefixFiles(entry, [".status.txt", ".diffstat.txt", ".patch", ".untracked.txt"], failures);
  if (entry.patchBytes !== undefined && exists(`${entry.prefix}.patch`) && entry.patchBytes !== fileSize(`${entry.prefix}.patch`)) {
    failures.push(`${worktree.branch}: patchBytes do not match archive file`);
  }
  if (worktree.untrackedEntries > 0) validatePrefixFiles(entry, [".untracked.tar.gz"], failures);
}

function validateBranchDelta(worktree, entry, kind, failures) {
  if (!entry) {
    failures.push(`${worktree.branch}: missing ${kind} archive entry`);
    return;
  }
  if (entry.archiveKind !== kind) failures.push(`${worktree.branch}: ${kind} archiveKind is stale`);
  if (entry.path !== worktree.path) failures.push(`${worktree.branch}: ${kind} path is stale`);
  if (entry.head !== worktree.head) failures.push(`${worktree.branch}: ${kind} head is stale`);
  if (entry.statusEntries !== worktree.statusEntries) failures.push(`${worktree.branch}: ${kind} statusEntries is stale`);
  if (!sameJson(entry.divergence, worktree.divergence)) failures.push(`${worktree.branch}: ${kind} divergence is stale`);
  validatePrefixFiles(entry, [".status.txt", ".ahead-log.txt", ".name-status.txt", ".diffstat.txt", ".patch", ".untracked.txt", ".metadata.json"], failures);
  if (entry.patchBytes !== undefined && exists(`${entry.prefix}.patch`) && entry.patchBytes !== fileSize(`${entry.prefix}.patch`)) {
    failures.push(`${worktree.branch}: ${kind} patchBytes do not match archive file`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, openLinkedDecisions: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const linkedManifest = readJson(paths.linkedManifest);
  const cleanDivergedManifest = readJson(paths.cleanDivergedManifest);
  const dirtyDivergedManifest = readJson(paths.dirtyDivergedManifest);
  const linked = byBranch(linkedManifest.archivedWorktrees);
  const cleanDiverged = byBranch(cleanDivergedManifest.archivedBranches);
  const dirtyDiverged = byBranch(dirtyDivergedManifest.archivedBranches);
  const openLinked = parseWorktrees().filter((worktree) => {
    return worktree.branch !== "main"
      && worktree.exists
      && !worktree.prunable
      && (worktree.state === "dirty-worktree" || worktree.state === "clean-diverged-branch");
  });

  if (linkedManifest.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("linked manifest dirty-map signature is stale");
  if (linkedManifest.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("linked manifest expanded status count is stale");

  for (const worktree of openLinked) {
    if (worktree.state === "dirty-worktree") {
      validateDirty(worktree, linked.get(worktree.branch), failures);
      if (worktree.divergence.behind > 0 || worktree.divergence.ahead > 0) {
        validateBranchDelta(worktree, dirtyDiverged.get(worktree.branch), "dirty-diverged-branch", failures);
      }
    } else if (worktree.state === "clean-diverged-branch") {
      validateBranchDelta(worktree, cleanDiverged.get(worktree.branch), "clean-diverged-branch", failures);
    }
  }

  const currentBranches = new Set(openLinked.map((worktree) => worktree.branch));
  for (const branch of linked.keys()) {
    if (!currentBranches.has(branch)) failures.push(`unexpected linked archive entry: ${branch}`);
  }
  for (const branch of cleanDiverged.keys()) {
    if (!currentBranches.has(branch)) failures.push(`unexpected clean-diverged archive entry: ${branch}`);
  }
  for (const branch of dirtyDiverged.keys()) {
    if (!currentBranches.has(branch)) failures.push(`unexpected dirty-diverged archive entry: ${branch}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    openLinkedDecisions: openLinked.length,
    dirtyLinkedWorktrees: openLinked.filter((worktree) => worktree.state === "dirty-worktree").length,
    cleanDivergedBranches: openLinked.filter((worktree) => worktree.state === "clean-diverged-branch").length,
    failures,
    branches: openLinked.map((worktree) => ({
      branch: worktree.branch,
      state: worktree.state,
      statusEntries: worktree.statusEntries,
      untrackedEntries: worktree.untrackedEntries,
      divergence: worktree.divergence
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 linked-worktree archive evidence gate");
    console.log(`Open linked decisions: ${payload.openLinkedDecisions ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 linked-worktree archive evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
