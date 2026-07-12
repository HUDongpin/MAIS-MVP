#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerDecisionPacket: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  selection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-action-runbook.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-action-runbook.md`
};

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function actionKindFor(entry) {
  if (entry.decisionStatus === "pending-owner-approval") return "blocked-pending-owner-approval";
  if (entry.decisionStatus === "invalid-owner-selection") return "blocked-invalid-owner-selection";
  if (entry.selectedFinalState === "reviewed commit" || entry.selectedFinalState === "reviewed owner package commit") {
    return "owner-reviewed-commit-required";
  }
  if (entry.selectedFinalState === "owner-reviewed commit or package extraction") {
    return "owner-reviewed-worktree-package-required";
  }
  if (entry.selectedFinalState === "owner-approved exact-path discard") {
    return "owner-approved-exact-discard-required";
  }
  if (entry.selectedFinalState === "owner-approved worktree removal after dirty state closure") {
    return "owner-approved-worktree-removal-after-closure-required";
  }
  if (entry.selectedFinalState === "owner-approved branch or worktree retirement") {
    return "owner-approved-branch-or-worktree-retirement-required";
  }
  if (entry.selectedFinalState === "owner-approved PR or review package") {
    return "owner-approved-pr-or-review-package-required";
  }
  if (entry.selectedFinalState === "archive-state record") return "archive-state-record-required";
  if (String(entry.selectedFinalState).includes("evidence archive")) return "evidence-archive-record-required";
  if (entry.selectedFinalState === "blocker") return "blocker-report-required";
  return "owner-approved-action-required";
}

function executableCommandsFor(entry) {
  if (entry.decisionStatus === "pending-owner-approval" || entry.decisionStatus === "invalid-owner-selection") return [];
  if (entry.selectedFinalState === "evidence archive" || String(entry.selectedFinalState).includes("evidence archive")) return [];
  if (entry.selectedFinalState === "blocker") return [];
  return [
    "Do not execute from this generated runbook alone.",
    "Use the approved owner/path/worktree scope, then run the plan's exact command from the owning worktree after a separate explicit owner instruction."
  ];
}

function requiredPreconditions(entry) {
  const common = [
    "dirty map is current",
    "owner decision packet is current",
    "final-state ledger is current",
    "evidence links exist"
  ];
  if (entry.decisionStatus === "pending-owner-approval") {
    return [
      ...common,
      `owner fills ${paths.selection} with one exact allowed final state`,
      "approvedBy is non-empty",
      "approvedAt is ISO-compatible",
      "ownerDecision names exact scope and evidence reviewed"
    ];
  }
  return [
    ...common,
    "selected final state is valid",
    "separate explicit owner instruction exists for any Git/destructive operation"
  ];
}

function rowFor(entry, packetById) {
  const decisionPacketRow = packetById.get(entry.ledgerId);
  return {
    ledgerId: entry.ledgerId,
    approvalId: entry.approvalId,
    sourceKind: entry.sourceKind,
    owner: entry.owner,
    branch: entry.branch,
    path: entry.path,
    packageKind: entry.packageKind,
    priority: entry.priority,
    currentBlocker: entry.currentBlocker,
    decisionStatus: entry.decisionStatus,
    selectedFinalState: entry.selectedFinalState,
    actionKind: actionKindFor(entry),
    executableNow: false,
    executableCommands: executableCommandsFor(entry),
    requiredPreconditions: requiredPreconditions(entry),
    evidenceLinks: entry.evidenceLinks ?? [],
    ownerDecisionPacketRow: decisionPacketRow ? paths.ownerDecisionPacket : null,
    selectionSource: entry.selectedFinalState ? paths.selection : null
  };
}

function summarize(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    if (!row.executableNow) summary.notExecutable += 1;
    summary.byActionKind[row.actionKind] = (summary.byActionKind[row.actionKind] ?? 0) + 1;
    summary.byDecisionStatus[row.decisionStatus] = (summary.byDecisionStatus[row.decisionStatus] ?? 0) + 1;
    summary.bySourceKind[row.sourceKind] = (summary.bySourceKind[row.sourceKind] ?? 0) + 1;
    return summary;
  }, { total: 0, notExecutable: 0, byActionKind: {}, byDecisionStatus: {}, bySourceKind: {} });
}

function markdown(payload) {
  const rows = payload.actions.map((action) => {
    const ownerOrBranch = action.sourceKind === "owner-package" ? action.owner : action.branch;
    return `| \`${action.ledgerId}\` | ${ownerOrBranch} | ${action.decisionStatus} | ${action.selectedFinalState || "pending"} | ${action.actionKind} | ${action.executableNow ? "yes" : "no"} |`;
  }).join("\n");

  const actionSummary = Object.entries(payload.summary.byActionKind)
    .map(([kind, count]) => `- ${kind}: ${count}`)
    .join("\n");

  const sections = payload.actions.map((action) => {
    return `## ${action.ledgerId}

- Source kind: ${action.sourceKind}
- Owner: ${action.owner || "n/a"}
- Branch: ${action.branch || "n/a"}
- Path: ${action.path || "n/a"}
- Current blocker: ${action.currentBlocker}
- Decision status: ${action.decisionStatus}
- Selected final state: ${action.selectedFinalState || "pending"}
- Action kind: ${action.actionKind}
- Executable now: ${action.executableNow ? "yes" : "no"}
- Required preconditions:
${action.requiredPreconditions.map((item) => `  - ${item}`).join("\n")}
- Evidence links:
${action.evidenceLinks.length > 0 ? action.evidenceLinks.map((item) => `  - \`${item}\``).join("\n") : "  - No evidence link recorded."}
- Executable commands:
${action.executableCommands.length > 0 ? action.executableCommands.map((item) => `  - ${item}`).join("\n") : "  - None while this row is pending or archive/blocker-only."}
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Final-State Action Runbook

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Selection source: ${payload.selectionSource ? `\`${payload.selectionSource}\`` : "none"}

Rows: ${payload.summary.total}

Executable rows now: ${payload.summary.total - payload.summary.notExecutable}

${actionSummary}

This runbook is execution gating evidence only. It does not approve any final state and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. Rows with pending owner approval deliberately have no executable commands.

| Ledger ID | Owner or branch | Decision status | Selected final state | Action kind | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  for (const requiredPath of [paths.dirtyMap, paths.ledger, paths.ownerDecisionPacket]) {
    if (!exists(requiredPath)) throw new Error(`Missing required file: ${requiredPath}`);
  }

  const dirtyMap = readJson(paths.dirtyMap);
  const ledger = readJson(paths.ledger);
  const packet = readJson(paths.ownerDecisionPacket);
  const selectionSource = exists(paths.selection) ? paths.selection : null;

  for (const [label, artifact] of [["ledger", ledger], ["owner decision packet", packet]]) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      throw new Error(`${label} is stale relative to latest dirty map.`);
    }
  }

  const packetById = new Map((packet.decisions ?? []).map((row) => [row.ledgerId, row]));
  const actions = (ledger.entries ?? []).map((entry) => rowFor(entry, packetById));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ledgerGeneratedAt: ledger.generatedAt,
    ownerDecisionPacketGeneratedAt: packet.generatedAt,
    selectionSource,
    note: "Execution gating evidence only. Rows with pending owner approval have no executable commands.",
    summary: summarize(actions),
    actions
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    actions: payload.summary.total,
    executableNow: payload.summary.total - payload.summary.notExecutable,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
