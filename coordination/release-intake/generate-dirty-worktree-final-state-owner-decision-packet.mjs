#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  selectionTarget: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-owner-decision-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-owner-decision-packet.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function ownerOrBranch(decision) {
  if (decision.sourceKind === "owner-package") return decision.owner;
  return decision.branch || decision.path || decision.owner;
}

function actionGroup(decision) {
  if (decision.sourceKind === "owner-package") {
    if (decision.priority === 1) return "P1 owner-package release gates";
    if (decision.priority === 2) return "P2 owner-package shared/runtime blockers";
    return `P${decision.priority ?? "unprioritized"} owner-package decisions`;
  }
  if (decision.packageKind === "root-owner-package") return "Physical root lifecycle";
  if (decision.packageKind === "clean-diverged-branch") return "Clean-diverged linked branches";
  return "Dirty linked worktrees";
}

function selectionSnippet(decision) {
  return {
    ledgerId: decision.ledgerId,
    sourceKind: decision.sourceKind,
    approvalId: decision.approvalId,
    owner: decision.owner,
    branch: decision.branch,
    path: decision.path,
    packageKind: decision.packageKind,
    priority: decision.priority,
    entries: decision.entries,
    currentBlocker: decision.currentBlocker,
    allowedFinalStates: decision.allowedFinalStates,
    selectedFinalState: "<choose one exact allowedFinalStates value>",
    approvedBy: "<owner or owning agent>",
    approvedAt: "<ISO-8601 timestamp>",
    ownerDecision: "<short reason and exact scope>",
    evidenceReviewed: decision.evidenceReviewed,
    notes: "<checks, risks, and any exact paths for discard/removal>"
  };
}

function summarize(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary.bySourceKind[row.sourceKind] = (summary.bySourceKind[row.sourceKind] ?? 0) + 1;
    summary.byPackageKind[row.packageKind] = (summary.byPackageKind[row.packageKind] ?? 0) + 1;
    summary.byActionGroup[row.actionGroup] = (summary.byActionGroup[row.actionGroup] ?? 0) + 1;
    if (row.priority !== null && row.priority !== undefined) {
      summary.byPriority[`P${row.priority}`] = (summary.byPriority[`P${row.priority}`] ?? 0) + 1;
    }
    return summary;
  }, { total: 0, bySourceKind: {}, byPackageKind: {}, byPriority: {}, byActionGroup: {} });
}

function markdown(payload) {
  const rows = payload.decisions.map((decision) => {
    return `| \`${decision.ledgerId}\` | ${decision.actionGroup} | ${ownerOrBranch(decision)} | ${decision.currentBlocker} | ${decision.allowedFinalStates.join("; ")} |`;
  }).join("\n");

  const groups = Object.entries(payload.summary.byActionGroup)
    .map(([group, count]) => `- ${group}: ${count}`)
    .join("\n");

  const sections = payload.decisions.map((decision) => {
    return `## ${decision.ledgerId}

- Action group: ${decision.actionGroup}
- Source kind: ${decision.sourceKind}
- Owner or branch: ${ownerOrBranch(decision)}
- Package/lifecycle kind: ${decision.packageKind}
- Current blocker: ${decision.currentBlocker}
- Evidence to review:
${decision.evidenceReviewed.map((item) => `  - \`${item}\``).join("\n")}
- Allowed final states:
${decision.allowedFinalStates.map((item) => `  - ${item}`).join("\n")}
- Copyable selection row:

\`\`\`json
${JSON.stringify(decision.selectionSnippet, null, 2)}
\`\`\`
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Final-State Owner Decision Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Selection target: \`${payload.selectionTarget}\`

Decision rows needing approval: ${payload.summary.total}

${groups}

This packet is approval support only. It does not approve any final state and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. To unblock the strict final-state gate, the owner or owning agents must copy the selected rows into \`${payload.selectionTarget}\` with exact allowed final states, approver, timestamp, owner decision, and reviewed evidence.

| Ledger ID | Group | Owner or branch | Current blocker | Allowed final states |
| --- | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  for (const requiredPath of [paths.dirtyMap, paths.template, paths.ledger, paths.ownerApprovals, paths.physicalApprovals]) {
    if (!exists(requiredPath)) throw new Error(`Missing required file: ${requiredPath}`);
  }

  const dirtyMap = readJson(paths.dirtyMap);
  const template = readJson(paths.template);
  const ledger = readJson(paths.ledger);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);

  for (const [label, artifact] of [
    ["template", template],
    ["ledger", ledger],
    ["owner package approval requests", ownerApprovals],
    ["physical lifecycle approval requests", physicalApprovals]
  ]) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      throw new Error(`${label} is stale relative to latest dirty map.`);
    }
  }

  const ledgerById = new Map((ledger.entries ?? []).map((entry) => [entry.ledgerId, entry]));
  const decisions = Object.values(template.decisions ?? {}).map((decision) => {
    const ledgerEntry = ledgerById.get(decision.ledgerId);
    return {
      ledgerId: decision.ledgerId,
      sourceKind: decision.sourceKind,
      approvalId: decision.approvalId,
      owner: decision.owner,
      branch: decision.branch,
      path: decision.path,
      packageKind: decision.packageKind,
      priority: decision.priority,
      entries: decision.entries,
      currentBlocker: decision.currentBlocker,
      allowedFinalStates: decision.allowedFinalStates,
      evidenceReviewed: decision.evidenceReviewed,
      currentDecisionStatus: ledgerEntry?.decisionStatus ?? "missing-ledger-row",
      actionGroup: actionGroup(decision),
      selectionSnippet: selectionSnippet(decision)
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    templateGeneratedAt: template.generatedAt,
    ledgerGeneratedAt: ledger.generatedAt,
    ownerPackageApprovalRequestsGeneratedAt: ownerApprovals.generatedAt,
    physicalLifecycleApprovalRequestsGeneratedAt: physicalApprovals.generatedAt,
    selectionTarget: paths.selectionTarget,
    note: "Approval support only. The owner or owning agents must approve exact rows before final-state closure or physical cleanup.",
    summary: summarize(decisions),
    decisions
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
    decisions: payload.summary.total,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
