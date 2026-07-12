#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-final-state-owner-decision-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  packet: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  packetMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.md"
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
  if (failures.length > 0) return finish({ failures, decisionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const template = readJson(paths.template);
  const ledger = readJson(paths.ledger);
  const packet = readJson(paths.packet);
  const templateRows = Object.values(template.decisions ?? {});
  const packetRows = packet.decisions ?? [];
  const packetById = new Map(packetRows.map((row) => [row.ledgerId, row]));
  const ledgerById = new Map((ledger.entries ?? []).map((row) => [row.ledgerId, row]));

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded status count is stale");
  if (packet.templateGeneratedAt !== template.generatedAt) failures.push("packet template timestamp is stale");
  if (packet.ledgerGeneratedAt !== ledger.generatedAt) failures.push("packet ledger timestamp is stale");
  if (packetRows.length !== templateRows.length) failures.push(`packet decision count mismatch: packet ${packetRows.length}, template ${templateRows.length}`);

  for (const expected of templateRows) {
    const actual = packetById.get(expected.ledgerId);
    if (!actual) {
      failures.push(`missing decision row: ${expected.ledgerId}`);
      continue;
    }
    for (const key of ["ledgerId", "sourceKind", "approvalId", "owner", "branch", "path", "packageKind", "priority", "entries", "currentBlocker"]) {
      if (!sameJson(actual[key], expected[key])) failures.push(`${expected.ledgerId}: ${key} is stale`);
    }
    if (!sameJson(actual.allowedFinalStates, expected.allowedFinalStates)) failures.push(`${expected.ledgerId}: allowedFinalStates are stale`);
    if (!sameJson(actual.evidenceReviewed, expected.evidenceReviewed)) failures.push(`${expected.ledgerId}: evidenceReviewed is stale`);
    if (!actual.actionGroup) failures.push(`${expected.ledgerId}: missing actionGroup`);
    if (!actual.selectionSnippet) failures.push(`${expected.ledgerId}: missing selectionSnippet`);
    if (actual.currentDecisionStatus !== (ledgerById.get(expected.ledgerId)?.decisionStatus ?? "missing-ledger-row")) {
      failures.push(`${expected.ledgerId}: currentDecisionStatus is stale`);
    }
  }

  for (const row of packetRows) {
    if (!template.decisions?.[row.ledgerId]) failures.push(`unexpected decision row: ${row.ledgerId}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.packetMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes(packet.selectionTarget)) failures.push("packet markdown missing selection target");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    decisionCount: templateRows.length,
    pendingDecisionCount: (ledger.entries ?? []).filter((entry) => entry.decisionStatus === "pending-owner-approval").length,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state owner decision packet gate");
    console.log(`Decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state owner decision packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
