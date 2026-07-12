#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-final-state-selection-draft-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerDecisionPacket: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  draft: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-draft.json",
  draftMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-draft.md",
  selectionTarget: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json"
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

function recommendationFor(decision) {
  if (decision.sourceKind === "owner-package") return "reviewed commit";
  if (decision.packageKind === "root-owner-package") return "reviewed owner package commit";
  if (decision.packageKind === "clean-diverged-branch") return "owner-approved PR or review package";
  if (decision.packageKind === "dirty-linked-worktree" || decision.packageKind === "dirty-diverged-worktree") {
    return "owner-reviewed commit or package extraction";
  }
  return decision.allowedFinalStates?.[0] ?? "";
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths).filter((item) => item !== paths.selectionTarget)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, decisionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const template = readJson(paths.template);
  const ledger = readJson(paths.ledger);
  const packet = readJson(paths.ownerDecisionPacket);
  const draft = readJson(paths.draft);
  const approvedSelection = exists(paths.selectionTarget) ? readJson(paths.selectionTarget) : null;
  const ownerApprovedSelection = approvedSelection?.approvalMode === "owner-approved-draft-recommendations"
    && approvedSelection?.draftGeneratedAt === draft.generatedAt
    && approvedSelection?.dirtyMapStatusSignature === dirtyMap.statusSignature;
  const templateDecisions = template.decisions ?? {};
  const draftDecisions = draft.decisions ?? {};
  const draftIds = new Set(Object.keys(draftDecisions));
  const templateIds = new Set(Object.keys(templateDecisions));

  if (draft.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("draft dirty-map signature is stale");
  if (draft.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("draft expanded status count is stale");
  if (draft.templateGeneratedAt !== template.generatedAt) failures.push("draft template timestamp is stale");
  if (!ownerApprovedSelection && draft.ledgerGeneratedAt !== ledger.generatedAt) failures.push("draft ledger timestamp is stale");
  if (!ownerApprovedSelection && draft.ownerDecisionPacketGeneratedAt !== packet.generatedAt) failures.push("draft owner-decision packet timestamp is stale");
  if (draft.selectionTarget !== paths.selectionTarget) failures.push("draft selection target is stale");
  if (draftIds.size !== templateIds.size) failures.push(`draft row count mismatch: draft ${draftIds.size}, template ${templateIds.size}`);

  for (const [id, expected] of Object.entries(templateDecisions)) {
    const row = draftDecisions[id];
    if (!row) {
      failures.push(`missing draft row: ${id}`);
      continue;
    }
    for (const key of [
      "ledgerId",
      "sourceKind",
      "approvalId",
      "owner",
      "branch",
      "path",
      "packageKind",
      "priority",
      "entries",
      "currentBlocker",
      "allowedFinalStates",
      "evidenceReviewed"
    ]) {
      if (!sameJson(row[key], expected[key])) failures.push(`${id}: ${key} is stale`);
    }
    const recommended = recommendationFor(expected);
    if (row.selectedFinalState !== recommended) failures.push(`${id}: selectedFinalState does not match draft recommendation`);
    if (!expected.allowedFinalStates.includes(row.selectedFinalState)) failures.push(`${id}: selectedFinalState is not allowed`);
    if (row.approvedBy !== "") failures.push(`${id}: draft approvedBy must stay empty`);
    if (row.approvedAt !== "") failures.push(`${id}: draft approvedAt must stay empty`);
    if (row.draftStatus !== "needs-owner-approval") failures.push(`${id}: draftStatus must be needs-owner-approval`);
    if (row.notApproval !== true) failures.push(`${id}: notApproval must be true`);
    if (typeof row.ownerDecision !== "string" || row.ownerDecision.trim().length === 0) failures.push(`${id}: draft ownerDecision rationale is required`);
    for (const evidencePath of row.evidenceReviewed ?? []) {
      if (String(evidencePath).includes("undefined")) failures.push(`${id}: evidence path contains undefined`);
      if (!exists(evidencePath)) failures.push(`${id}: missing evidence file ${evidencePath}`);
    }
  }

  for (const id of draftIds) {
    if (!templateIds.has(id)) failures.push(`unexpected draft row: ${id}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.draftMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("draft markdown contains undefined");
  if (!markdown.includes("This draft is not an approval record")) failures.push("draft markdown missing non-approval boundary");
  if (markdown.includes(paths.selectionTarget) === false) failures.push("draft markdown missing real selection target");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    decisionCount: templateIds.size,
    realSelectionPresent: exists(paths.selectionTarget),
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state selection draft gate");
    console.log(`Decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Real selection present: ${payload.realSelectionPresent ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state selection draft gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
