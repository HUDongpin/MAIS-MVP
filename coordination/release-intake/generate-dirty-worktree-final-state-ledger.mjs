#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  selection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-ledger.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-ledger.md`
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

function maybeReadJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function selectionFor(selection, ledgerId) {
  return selection?.decisions?.[ledgerId] ?? null;
}

function finalStateNames(request) {
  return (request.allowedFinalStates ?? []).map((state) => state.selectedFinalState);
}

function applySelection(base, request, selection) {
  const selected = selectionFor(selection, base.ledgerId);
  const allowed = finalStateNames(request);
  if (!selected) {
    return {
      ...base,
      allowedFinalStates: allowed,
      decisionStatus: "pending-owner-approval",
      selectedFinalState: "",
      approvedBy: "",
      approvedAt: "",
      ownerDecision: "",
      notes: "No owner final-state selection recorded yet."
    };
  }

  const selectedFinalState = selected.selectedFinalState ?? "";
  const valid = allowed.includes(selectedFinalState);
  return {
    ...base,
    allowedFinalStates: allowed,
    decisionStatus: valid ? `approved-${slug(selectedFinalState)}` : "invalid-owner-selection",
    selectedFinalState,
    approvedBy: selected.approvedBy ?? "",
    approvedAt: selected.approvedAt ?? "",
    ownerDecision: selected.ownerDecision ?? "",
    notes: selected.notes ?? "",
    selectionEvidenceLinks: selected.evidenceLinks ?? selected.evidenceReviewed ?? []
  };
}

function ownerPackageEntry(request, selection) {
  const evidence = [
    request.latestPathspec,
    request.workOrder
  ].filter(Boolean);
  const base = {
    ledgerId: `owner-package:${request.approvalId}`,
    approvalId: request.approvalId,
    sourceKind: "owner-package",
    owner: request.owner,
    branch: "",
    path: "",
    packageKind: request.kind,
    priority: request.priority,
    entries: request.entries,
    currentBlocker: `root package has ${request.entries} dirty entries`,
    evidenceLinks: evidence,
    approvalRequestEvidence: paths.ownerPackageApprovals,
    requiredNextAction: "Owner selects reviewed commit, exact-path discard, evidence archive, or blocker for this package."
  };
  return applySelection(base, request, selection);
}

function physicalEntry(request, selection) {
  const base = {
    ledgerId: `physical:${request.approvalId}`,
    approvalId: request.approvalId,
    sourceKind: "physical-lifecycle",
    owner: request.ownerHints?.join(", ") ?? "",
    branch: request.branch,
    path: request.path,
    packageKind: request.kind,
    priority: null,
    entries: request.branch === "main" ? null : undefined,
    currentBlocker: request.currentBlocker,
    evidenceLinks: request.evidence ?? [],
    approvalRequestEvidence: paths.physicalApprovals,
    requiredNextAction: "Owner selects a lifecycle final state before any physical cleanup operation."
  };
  return applySelection(base, request, selection);
}

function summarize(entries) {
  return entries.reduce((summary, entry) => {
    summary.total += 1;
    if (entry.decisionStatus === "pending-owner-approval") summary.pending += 1;
    else if (entry.decisionStatus === "invalid-owner-selection") summary.invalid += 1;
    else summary.approved += 1;
    summary.bySourceKind[entry.sourceKind] = (summary.bySourceKind[entry.sourceKind] ?? 0) + 1;
    summary.byStatus[entry.decisionStatus] = (summary.byStatus[entry.decisionStatus] ?? 0) + 1;
    return summary;
  }, { total: 0, pending: 0, approved: 0, invalid: 0, bySourceKind: {}, byStatus: {} });
}

function markdown(payload) {
  const rows = payload.entries.map((entry) => {
    const ownerOrBranch = entry.sourceKind === "owner-package" ? entry.owner : entry.branch;
    return `| \`${entry.ledgerId}\` | ${entry.sourceKind} | ${ownerOrBranch} | ${entry.currentBlocker} | ${entry.decisionStatus} | ${entry.selectedFinalState || "pending"} |`;
  }).join("\n");

  const sections = payload.entries.map((entry) => {
    const evidence = entry.evidenceLinks.map((item) => `  - \`${item}\``).join("\n");
    const finalStates = entry.allowedFinalStates.map((item) => `  - ${item}`).join("\n");
    return `## ${entry.ledgerId}

- Source kind: ${entry.sourceKind}
- Owner: ${entry.owner || "n/a"}
- Branch: ${entry.branch || "n/a"}
- Path: ${entry.path || "n/a"}
- Package/lifecycle kind: ${entry.packageKind}
- Current blocker: ${entry.currentBlocker}
- Decision status: ${entry.decisionStatus}
- Selected final state: ${entry.selectedFinalState || "pending"}
- Approved by: ${entry.approvedBy || "pending"}
- Approved at: ${entry.approvedAt || "pending"}
- Required next action: ${entry.requiredNextAction}
- Approval request evidence: \`${entry.approvalRequestEvidence}\`
- Evidence links:
${evidence || "  - No evidence link recorded."}
- Allowed final states:
${finalStates}
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Final-State Ledger

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Ledger entries: ${payload.summary.total}

- Pending owner approval: ${payload.summary.pending}
- Approved/finalized: ${payload.summary.approved}
- Invalid selections: ${payload.summary.invalid}

This ledger is decision-state evidence only. Pending rows do not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal.

| Ledger ID | Source kind | Owner or branch | Current blocker | Decision status | Selected final state |
| --- | --- | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerPackageApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const selection = maybeReadJson(paths.selection);

  if (ownerApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Owner package approval requests are stale relative to latest dirty map.");
  }
  if (physicalApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Physical lifecycle approval requests are stale relative to latest dirty map.");
  }

  const entries = [
    ...(ownerApprovals.requests ?? []).map((request) => ownerPackageEntry(request, selection)),
    ...(physicalApprovals.requests ?? []).map((request) => physicalEntry(request, selection))
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovalRequestsGeneratedAt: ownerApprovals.generatedAt,
    physicalLifecycleApprovalRequestsGeneratedAt: physicalApprovals.generatedAt,
    selectionSource: selection ? paths.selection : null,
    summary: summarize(entries),
    note: "Final-state ledger only. Physical cleanup requires separate explicit owner authorization.",
    entries
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
    entries: payload.summary.total,
    pending: payload.summary.pending,
    approved: payload.summary.approved,
    invalid: payload.summary.invalid
  }, null, 2));
}

main();
