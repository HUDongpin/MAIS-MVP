#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-physical-lifecycle-blocker-coverage-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  lifecycleGate: "coordination/release-intake/latest-A25-worktree-lifecycle-gate.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  finalStateSelection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function runNode(args) {
  return execFileSync(process.execPath, args, {
    cwd: root,
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

function openLifecycleWorktrees(lifecycleGate) {
  return (lifecycleGate.worktrees ?? []).filter((worktree) => {
    return worktree.state === "dirty-open-decision" || worktree.state === "clean-diverged-open-decision";
  });
}

function expectedBlocker(worktree) {
  if (worktree.state === "dirty-open-decision") return `dirty ${worktree.statusEntries}`;
  if (worktree.state === "clean-diverged-open-decision") {
    return `behind ${worktree.divergence?.behind ?? "?"}, ahead ${worktree.divergence?.ahead ?? "?"}`;
  }
  return "";
}

function main() {
  const failures = [];

  for (const requiredPath of Object.values(paths).filter((item) => item !== paths.lifecycleGate)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length === 0) {
    runNode(["coordination/release-intake/assert-worktree-lifecycle.mjs"]);
  }
  if (!exists(paths.lifecycleGate)) failures.push(`missing required file: ${paths.lifecycleGate}`);
  if (failures.length > 0) return finish({ failures, openDecisionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const lifecycleGate = readJson(paths.lifecycleGate);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const ledger = readJson(paths.finalStateLedger);
  const selection = readJson(paths.finalStateSelection);
  const runbook = readJson(paths.actionRunbook);

  if (physicalApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("physical lifecycle approval requests are stale relative to dirty map");
  }
  if (ledger.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("final-state ledger is stale relative to dirty map");
  }
  if (selection.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("final-state selection is stale relative to dirty map");
  }
  if (runbook.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("action runbook is stale relative to dirty map");
  }

  const requestsByBranch = new Map((physicalApprovals.requests ?? []).map((request) => [request.branch, request]));
  const ledgerById = new Map((ledger.entries ?? []).map((entry) => [entry.ledgerId, entry]));
  const actionsById = new Map((runbook.actions ?? []).map((action) => [action.ledgerId, action]));
  const openWorktrees = openLifecycleWorktrees(lifecycleGate);
  const covered = [];

  for (const worktree of openWorktrees) {
    const request = requestsByBranch.get(worktree.branch);
    if (!request) {
      failures.push(`${worktree.branch}: missing physical approval request`);
      continue;
    }
    const ledgerId = `physical:${request.approvalId}`;
    const entry = ledgerById.get(ledgerId);
    const action = actionsById.get(ledgerId);
    const expectedCurrentBlocker = expectedBlocker(worktree);

    if (request.currentBlocker !== expectedCurrentBlocker) {
      failures.push(`${worktree.branch}: physical approval currentBlocker is stale (${request.currentBlocker} != ${expectedCurrentBlocker})`);
    }
    if (!entry) {
      failures.push(`${worktree.branch}: missing final-state ledger row ${ledgerId}`);
      continue;
    }
    if (entry.sourceKind !== "physical-lifecycle") failures.push(`${ledgerId}: sourceKind must be physical-lifecycle`);
    if (entry.currentBlocker !== expectedCurrentBlocker) {
      failures.push(`${ledgerId}: ledger currentBlocker is stale (${entry.currentBlocker} != ${expectedCurrentBlocker})`);
    }
    if (!String(entry.decisionStatus).startsWith("approved-")) failures.push(`${ledgerId}: decisionStatus must be approved`);
    if (!entry.allowedFinalStates?.includes(entry.selectedFinalState)) failures.push(`${ledgerId}: selectedFinalState must be allowed`);
    if (!entry.ownerDecision?.trim()) failures.push(`${ledgerId}: owner decision must be recorded`);
    if (!action) failures.push(`${ledgerId}: missing action runbook row`);
    else {
      if (action.executableNow !== false) failures.push(`${ledgerId}: executableNow must be false`);
    }

    covered.push({
      branch: worktree.branch,
      state: worktree.state,
      currentBlocker: expectedCurrentBlocker,
      ledgerId,
      selectedFinalState: entry.selectedFinalState,
      actionKind: action?.actionKind ?? ""
    });
  }

  const physicalRows = (ledger.entries ?? []).filter((entry) => entry.sourceKind === "physical-lifecycle");
  const physicalApprovedRows = physicalRows.filter((entry) => String(entry.decisionStatus).startsWith("approved-"));
  if (physicalRows.length !== (physicalApprovals.requests?.length ?? 0)) {
    failures.push(`physical ledger row count mismatch: ledger ${physicalRows.length}, requests ${physicalApprovals.requests?.length ?? 0}`);
  }
  if (physicalApprovedRows.length !== physicalRows.length) {
    failures.push(`physical approved row count mismatch: approved ${physicalApprovedRows.length}, physical rows ${physicalRows.length}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    lifecycleCheckedAt: lifecycleGate.checkedAt,
    worktreeCount: lifecycleGate.worktreeCount,
    openDecisionCount: openWorktrees.length,
    coveredCount: covered.length,
    physicalRequestCount: physicalApprovals.requests?.length ?? 0,
    physicalLedgerRows: physicalRows.length,
    physicalApprovedRows: physicalApprovedRows.length,
    failures,
    covered
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 physical lifecycle final-state coverage gate");
    console.log(`Open decisions: ${payload.openDecisionCount ?? 0}`);
    console.log(`Covered final-state rows: ${payload.coveredCount ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 physical lifecycle blocker coverage gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
