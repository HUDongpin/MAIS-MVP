#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

const expectedDecisions = new Map([
  ["root-dirty-packages", {
    evidencePaths: [
      "coordination/release-intake/latest-A25-dirty-tree-map.json",
      "coordination/release-intake/latest-A25-effective-disposition-queue.md"
    ]
  }],
  ["dirty-visualization-production-release", {
    worktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release",
    branch: "codex/visualization-production-release",
    evidencePaths: [
      "coordination/release-intake/2026-06-26-A25-worktree-evidence-visualization-production-release/README.md",
      "coordination/release-intake/2026-06-26-A25-worktree-evidence-visualization-production-release/summary.json"
    ]
  }],
  ["california-practice-beta-clean", {
    branch: "codex/california-practice-beta-clean",
    evidencePaths: [
      "coordination/release-intake/2026-06-26-A25-branch-evidence-california-practice-beta-clean/README.md",
      "coordination/release-intake/2026-06-26-A25-branch-evidence-california-practice-beta-clean/summary.json"
    ]
  }],
  ["s22-release-hygiene-2026-06-15", {
    branch: "codex/s22-release-hygiene-2026-06-15",
    evidencePaths: [
      "coordination/release-intake/2026-06-26-A25-branch-evidence-s22-release-hygiene-2026-06-15/README.md",
      "coordination/release-intake/2026-06-26-A25-branch-evidence-s22-release-hygiene-2026-06-15/summary.json"
    ]
  }]
]);

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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function decisionIsPending(decision) {
  return String(decision.decisionStatus ?? "").startsWith("pending");
}

function main() {
  const failures = [];
  const ledgerPath = "coordination/release-intake/latest-A25-lifecycle-decision-ledger.json";
  const dirtyMapPath = "coordination/release-intake/latest-A25-dirty-tree-map.json";

  if (!exists(ledgerPath)) failures.push(`missing ledger: ${ledgerPath}`);
  if (!exists(dirtyMapPath)) failures.push(`missing dirty map: ${dirtyMapPath}`);
  if (failures.length > 0) finish({ failures, decisions: [] });

  const ledger = readJson(ledgerPath);
  const dirtyMap = readJson(dirtyMapPath);
  const decisions = ledger.decisions ?? [];
  const decisionById = new Map(decisions.map((decision) => [decision.id, decision]));

  if (ledger.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("lifecycle decision ledger dirty-map signature is stale");
  }

  if (ledger.decisionCount !== decisions.length) {
    failures.push(`decisionCount mismatch: ${ledger.decisionCount} recorded, ${decisions.length} actual`);
  }

  const pendingCount = decisions.filter(decisionIsPending).length;
  if (ledger.openDecisionCount !== pendingCount) {
    failures.push(`openDecisionCount mismatch: ${ledger.openDecisionCount} recorded, ${pendingCount} actual`);
  }

  for (const id of expectedDecisions.keys()) {
    if (!decisionById.has(id)) failures.push(`missing lifecycle decision: ${id}`);
  }

  for (const decision of decisions) {
    if (!expectedDecisions.has(decision.id)) failures.push(`unexpected lifecycle decision: ${decision.id}`);
    if (!Array.isArray(decision.accountableOwners) || decision.accountableOwners.length === 0) {
      failures.push(`${decision.id}: missing accountable owners`);
    }
    if (!Array.isArray(decision.requiredFinalStates) || decision.requiredFinalStates.length === 0) {
      failures.push(`${decision.id}: missing required final states`);
    }
  }

  for (const [id, expectation] of expectedDecisions.entries()) {
    for (const evidencePath of expectation.evidencePaths) {
      if (!exists(evidencePath)) failures.push(`${id}: missing evidence ${evidencePath}`);
    }

    if (expectation.worktree && !fs.existsSync(expectation.worktree)) {
      failures.push(`${id}: worktree path missing ${expectation.worktree}`);
    }

    if (expectation.branch) {
      const branchHead = safe(() => git(["rev-parse", "--verify", expectation.branch]), "");
      if (!branchHead) failures.push(`${id}: missing branch ${expectation.branch}`);
    }
  }

  if (strict) {
    for (const decision of decisions) {
      if (decisionIsPending(decision)) failures.push(`open lifecycle decision: ${decision.id}`);
    }
  }

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    ledgerPath,
    dirtyMapSignature: dirtyMap.statusSignature,
    ledgerSignature: ledger.dirtyMapStatusSignature,
    decisionCount: decisions.length,
    openDecisionCount: pendingCount,
    failures,
    decisions: decisions.map((decision) => ({
      id: decision.id,
      decisionStatus: decision.decisionStatus,
      currentState: decision.currentState,
      accountableOwners: decision.accountableOwners
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-lifecycle-decision-ledger-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 lifecycle decision ledger gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Open decisions: ${payload.openDecisionCount ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 lifecycle decision ledger gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
