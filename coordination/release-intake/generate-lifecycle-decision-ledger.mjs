#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();
const latestLedgerPath = path.join(outDir, "latest-A25-lifecycle-decision-ledger.json");
const approvalSelectionPath = path.join(outDir, "latest-A25-owner-approval-selection.json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function statusCount(cwd) {
  const raw = git(["status", "--porcelain=v1", "-uall"], cwd);
  return raw ? raw.split("\n").filter(Boolean).length : 0;
}

function branchDivergence(branch) {
  const [behind, ahead] = git(["rev-list", "--left-right", "--count", `main...${branch}`]).split(/\s+/).map(Number);
  return { behind, ahead };
}

function existingDecisions() {
  if (!fs.existsSync(latestLedgerPath)) return new Map();
  const current = JSON.parse(fs.readFileSync(latestLedgerPath, "utf8"));
  return new Map((current.decisions ?? []).map((decision) => [decision.id, decision]));
}

function approvalSelection() {
  if (!fs.existsSync(approvalSelectionPath)) return null;
  return JSON.parse(fs.readFileSync(approvalSelectionPath, "utf8"));
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function preserve(existing, next) {
  if (!existing) return next;
  return {
    ...next,
    decisionStatus: existing.decisionStatus ?? next.decisionStatus,
    ownerDecision: existing.ownerDecision ?? next.ownerDecision,
    approvedBy: existing.approvedBy ?? next.approvedBy,
    approvedAt: existing.approvedAt ?? next.approvedAt,
    notes: existing.notes ?? next.notes,
    links: existing.links ?? next.links
  };
}

function applyApproval(decision, selection) {
  const approval = selection?.decisions?.[decision.id];
  if (!approval) return decision;
  return {
    ...decision,
    decisionStatus: `approved-${slug(approval.selectedFinalState)}`,
    ownerDecision: approval.ownerDecision ?? decision.ownerDecision,
    approvedBy: selection.approvedBy ?? decision.approvedBy,
    approvedAt: selection.approvedAt ?? decision.approvedAt,
    notes: `${decision.notes} Owner-selected final state: ${approval.selectedFinalState}.`,
    links: [
      ...(decision.links ?? []),
      "coordination/release-intake/latest-A25-owner-approval-selection.md",
      "coordination/release-intake/latest-A25-owner-approval-matrix.md"
    ]
  };
}

function main() {
  const effectiveQueue = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-effective-disposition-queue.json"), "utf8"));
  const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
  const existing = existingDecisions();
  const selection = approvalSelection();

  const visualizationPath = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release";
  const californiaBranch = "codex/california-practice-beta-clean";
  const releaseHygieneBranch = "codex/s22-release-hygiene-2026-06-15";

  const decisions = [
    preserve(existing.get("root-dirty-packages"), {
      id: "root-dirty-packages",
      title: "Root dirty package closure",
      accountableOwners: ["A25", "A10", "all effective owner work orders"],
      currentState: "open",
      decisionStatus: "pending-owner-decisions",
      requiredFinalStates: ["reviewed commit", "owner-approved discard", "evidence archive", "blocker"],
      evidence: {
        dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
        expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
        effectiveQueue: "coordination/release-intake/latest-A25-effective-disposition-queue.md",
        effectiveQueueItems: effectiveQueue.queue.length,
        effectiveQueueP0: effectiveQueue.queue.filter((item) => item.priority === 0).length
      },
      ownerDecision: "",
      approvedBy: "",
      approvedAt: "",
      notes: "Each effective owner work order must be closed before strict lifecycle closure can pass.",
      links: []
    }),
    preserve(existing.get("dirty-visualization-production-release"), {
      id: "dirty-visualization-production-release",
      title: "Dirty visualization production-release worktree",
      accountableOwners: ["A06", "A22", "A10"],
      currentState: "open",
      decisionStatus: "pending-owner-decision",
      requiredFinalStates: ["reviewed package", "owner-approved discard", "evidence archive with worktree removal blocker", "blocker"],
      evidence: {
        worktree: visualizationPath,
        branch: "codex/visualization-production-release",
        statusEntries: statusCount(visualizationPath),
        evidenceArchive: "coordination/release-intake/2026-06-26-A25-worktree-evidence-visualization-production-release/README.md"
      },
      ownerDecision: "",
      approvedBy: "",
      approvedAt: "",
      notes: "A25 has archived recoverable evidence; A06/A22 must decide package/archive/discard before cleanup.",
      links: []
    }),
    preserve(existing.get("california-practice-beta-clean"), {
      id: "california-practice-beta-clean",
      title: "Clean diverged California practice beta worktree",
      accountableOwners: ["A21", "A18", "A04", "A22"],
      currentState: "open",
      decisionStatus: "pending-owner-decision",
      requiredFinalStates: ["PR candidate", "archive tag", "owner-approved branch retirement", "blocker"],
      evidence: {
        branch: californiaBranch,
        divergence: branchDivergence(californiaBranch),
        evidenceArchive: "coordination/release-intake/2026-06-26-A25-branch-evidence-california-practice-beta-clean/README.md"
      },
      ownerDecision: "",
      approvedBy: "",
      approvedAt: "",
      notes: "Large generated-content branch; do not merge casually.",
      links: []
    }),
    preserve(existing.get("s22-release-hygiene-2026-06-15"), {
      id: "s22-release-hygiene-2026-06-15",
      title: "Clean diverged S22 release-hygiene worktree",
      accountableOwners: ["A22", "A10"],
      currentState: "open",
      decisionStatus: "pending-owner-decision",
      requiredFinalStates: ["PR candidate", "archive tag", "owner-approved branch retirement", "blocker"],
      evidence: {
        branch: releaseHygieneBranch,
        divergence: branchDivergence(releaseHygieneBranch),
        evidenceArchive: "coordination/release-intake/2026-06-26-A25-branch-evidence-s22-release-hygiene-2026-06-15/README.md"
      },
      ownerDecision: "",
      approvedBy: "",
      approvedAt: "",
      notes: "Release tooling branch has full patch evidence; A22/A10 decide whether current root tooling supersedes it.",
      links: []
    })
  ].map((decision) => applyApproval(decision, selection));

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    decisionCount: decisions.length,
    openDecisionCount: decisions.filter((decision) => decision.decisionStatus.startsWith("pending")).length,
    decisions
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-lifecycle-decision-ledger.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-lifecycle-decision-ledger.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-lifecycle-decision-ledger.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-lifecycle-decision-ledger.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-lifecycle-decision-ledger.json",
    latestMarkdown: "coordination/release-intake/latest-A25-lifecycle-decision-ledger.md",
    decisionCount: payload.decisionCount,
    openDecisionCount: payload.openDecisionCount
  }, null, 2));
}

function markdown(payload) {
  const rows = payload.decisions.map((decision) => {
    return `| ${decision.id} | ${decision.decisionStatus} | ${decision.accountableOwners.join(", ")} | ${decision.requiredFinalStates.join("; ")} |`;
  }).join("\n");

  return `# ${date} A25 Lifecycle Decision Ledger

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Open decisions: ${payload.openDecisionCount}

## Decisions

| ID | Status | Accountable owners | Required final states |
| --- | --- | --- | --- |
${rows}

## Closure Rule

Strict lifecycle closure can pass only when every decision has a non-pending \`decisionStatus\`, evidence links remain current, and the related worktree/root state has been updated accordingly.
`;
}

main();
