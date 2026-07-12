#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  packet: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.json",
  packetMarkdown: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function runNode(args) {
  return execFileSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function openDecisionWorktrees(lifecycle) {
  return lifecycle.worktrees.filter((worktree) => {
    return worktree.state === "dirty-open-decision" || worktree.state === "clean-diverged-open-decision";
  });
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function currentDecisionKey(decision) {
  return decision.branch;
}

function validateDecision(current, archived, failures) {
  if (!archived) {
    failures.push(`missing packet decision row: ${current.branch}`);
    return;
  }

  if (archived.path !== current.path) failures.push(`${current.branch}: path is stale`);
  if (archived.state !== current.state) failures.push(`${current.branch}: state is stale`);
  if (archived.head !== current.head) failures.push(`${current.branch}: head is stale`);
  if (archived.statusEntries !== current.statusEntries) failures.push(`${current.branch}: statusEntries is stale`);
  if (!sameJson(archived.divergence, current.divergence)) failures.push(`${current.branch}: divergence is stale`);
  if (!Array.isArray(archived.ownerHints) || archived.ownerHints.length === 0) failures.push(`${current.branch}: missing ownerHints`);
  if (!Array.isArray(archived.requiredOwnerDecision) || archived.requiredOwnerDecision.length === 0) {
    failures.push(`${current.branch}: missing requiredOwnerDecision`);
  }

  const evidence = archived.evidence ?? [];
  if (!Array.isArray(evidence) || evidence.length === 0) failures.push(`${current.branch}: missing evidence links`);
  for (const evidencePath of evidence) {
    if (String(evidencePath).includes("undefined")) failures.push(`${current.branch}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${current.branch}: missing evidence file ${evidencePath}`);
  }

  const coverage = archived.evidenceCoverage ?? {};
  const hasCoverage = Object.values(coverage).some(Boolean);
  if (!hasCoverage) failures.push(`${current.branch}: missing evidence coverage flag`);
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, decisionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const packet = readJson(paths.packet);
  const lifecycle = JSON.parse(runNode(["coordination/release-intake/assert-worktree-lifecycle.mjs", "--json"]));
  const currentDecisions = openDecisionWorktrees(lifecycle);
  const archivedByBranch = new Map((packet.decisions ?? []).map((decision) => [currentDecisionKey(decision), decision]));
  const currentBranches = new Set(currentDecisions.map((decision) => decision.branch));

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("packet dirty-map signature is stale");
  }
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("packet expanded dirty entry count is stale");
  }
  if (packet.worktreeCount !== lifecycle.worktreeCount) failures.push("packet worktreeCount is stale");
  if (packet.dirtyOpenDecisionCount !== lifecycle.dirtyCount) failures.push("packet dirtyOpenDecisionCount is stale");
  if (packet.cleanDivergedOpenDecisionCount !== lifecycle.divergedCleanCount) {
    failures.push("packet cleanDivergedOpenDecisionCount is stale");
  }
  if ((packet.decisions ?? []).length !== currentDecisions.length) {
    failures.push(`decision count mismatch: packet ${(packet.decisions ?? []).length}, current ${currentDecisions.length}`);
  }

  for (const current of currentDecisions) validateDecision(current, archivedByBranch.get(current.branch), failures);
  for (const branch of archivedByBranch.keys()) {
    if (!currentBranches.has(branch)) failures.push(`unexpected packet decision row: ${branch}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.packetMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (markdown.includes("Missing archive evidence")) failures.push("packet markdown contains Missing archive evidence");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    worktreeCount: lifecycle.worktreeCount,
    dirtyOpenDecisionCount: lifecycle.dirtyCount,
    cleanDivergedOpenDecisionCount: lifecycle.divergedCleanCount,
    decisionCount: currentDecisions.length,
    failures,
    decisions: currentDecisions.map((decision) => ({
      branch: decision.branch,
      state: decision.state,
      statusEntries: decision.statusEntries,
      divergence: decision.divergence
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-physical-lifecycle-decision-packet-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 physical lifecycle decision packet gate");
    console.log(`Decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Expanded dirty entries: ${payload.expandedStatusEntries ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 physical lifecycle decision packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
