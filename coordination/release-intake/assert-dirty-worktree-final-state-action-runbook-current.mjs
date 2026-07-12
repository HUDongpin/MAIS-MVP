#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-final-state-action-runbook-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerDecisionPacket: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  runbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  runbookMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, actionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const ledger = readJson(paths.ledger);
  const packet = readJson(paths.ownerDecisionPacket);
  const runbook = readJson(paths.runbook);
  const actions = runbook.actions ?? [];
  const actionsById = new Map(actions.map((action) => [action.ledgerId, action]));
  const packetIds = new Set((packet.decisions ?? []).map((row) => row.ledgerId));

  if (runbook.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("runbook dirty-map signature is stale");
  if (runbook.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("runbook expanded status count is stale");
  if (runbook.ledgerGeneratedAt !== ledger.generatedAt) failures.push("runbook ledger timestamp is stale");
  if (runbook.ownerDecisionPacketGeneratedAt !== packet.generatedAt) failures.push("runbook owner-decision packet timestamp is stale");
  if (actions.length !== (ledger.entries ?? []).length) failures.push(`action count mismatch: runbook ${actions.length}, ledger ${(ledger.entries ?? []).length}`);

  for (const entry of ledger.entries ?? []) {
    const action = actionsById.get(entry.ledgerId);
    if (!action) {
      failures.push(`missing action row: ${entry.ledgerId}`);
      continue;
    }
    for (const key of ["ledgerId", "approvalId", "sourceKind", "owner", "branch", "path", "packageKind", "priority", "currentBlocker", "decisionStatus", "selectedFinalState"]) {
      if (!sameJson(action[key], entry[key])) failures.push(`${entry.ledgerId}: ${key} is stale`);
    }
    if (!packetIds.has(entry.ledgerId)) failures.push(`${entry.ledgerId}: missing owner-decision packet row`);
    if (!Array.isArray(action.requiredPreconditions) || action.requiredPreconditions.length === 0) failures.push(`${entry.ledgerId}: missing requiredPreconditions`);
    if (!Array.isArray(action.evidenceLinks)) failures.push(`${entry.ledgerId}: evidenceLinks must be an array`);
    if (!Array.isArray(action.executableCommands)) failures.push(`${entry.ledgerId}: executableCommands must be an array`);
    if (entry.decisionStatus === "pending-owner-approval" && action.executableCommands.length > 0) {
      failures.push(`${entry.ledgerId}: pending row must not list executable commands`);
    }
    if (action.executableNow !== false) failures.push(`${entry.ledgerId}: executableNow must be false until a separate explicit owner instruction is recorded`);
  }

  for (const action of actions) {
    if (!ledger.entries?.some((entry) => entry.ledgerId === action.ledgerId)) failures.push(`unexpected action row: ${action.ledgerId}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.runbookMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("runbook markdown contains undefined");
  if (!markdown.includes("Rows with pending owner approval deliberately have no executable commands")) {
    failures.push("runbook markdown missing pending-row execution boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    actionCount: ledger.entries?.length ?? 0,
    executableNow: actions.filter((action) => action.executableNow).length,
    pendingOwnerApproval: (ledger.entries ?? []).filter((entry) => entry.decisionStatus === "pending-owner-approval").length,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state action runbook gate");
    console.log(`Actions: ${payload.actionCount ?? 0}`);
    console.log(`Executable now: ${payload.executableNow ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state action runbook gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
