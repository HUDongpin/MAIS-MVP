#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  draft: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-draft.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  approvalRecord: "coordination/release-intake/latest-A25-owner-approved-final-state-selection-record.json",
  approvalRecordMarkdown: "coordination/release-intake/latest-A25-owner-approved-final-state-selection-record.md",
  selection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.md",
  datedSelection: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-owner-approved-selection.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-owner-approved-selection.md`,
  datedRecord: `coordination/release-intake/${date}-A25-owner-approved-final-state-selection-record.json`,
  datedRecordMarkdown: `coordination/release-intake/${date}-A25-owner-approved-final-state-selection-record.md`
};

const approvalSource = [
  "User owner approval in Codex goal on 2026-07-01:",
  "I approve explicit owner/owning-agent approval for exact approval IDs and selected actions/final states:",
  "reviewed commits, exact-path discards, evidence archives, worktree removals, branch retirements, or continued blockers."
].join(" ");

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

function ensureCurrent(label, artifact, dirtyMap, failures) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push(`${label} dirty-map signature is stale`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push(`${label} expanded status count is stale`);
  }
}

function approvedDecision(row, approvedAt) {
  return {
    ledgerId: row.ledgerId,
    sourceKind: row.sourceKind,
    approvalId: row.approvalId,
    owner: row.owner,
    branch: row.branch,
    path: row.path,
    packageKind: row.packageKind,
    priority: row.priority,
    entries: row.entries,
    currentBlocker: row.currentBlocker,
    allowedFinalStates: row.allowedFinalStates,
    selectedFinalState: row.selectedFinalState,
    approvedBy: "Owner approval via Codex goal",
    approvedAt,
    ownerDecision: `${row.ownerDecision} ${approvalSource}`,
    evidenceReviewed: [
      ...(row.evidenceReviewed ?? []),
      paths.draft,
      paths.nextOwnerPacket
    ],
    notes: "Owner-approved final-state selection generated from the current A25 draft recommendations. This records final-state approval only; it does not itself run Git cleanup, deploy, push, reset, clean, remove worktrees, or delete branches.",
    approvalSource,
    approvalMode: "owner-approved-draft-recommendations",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function summarize(decisions) {
  return Object.values(decisions).reduce((summary, row) => {
    summary.total += 1;
    summary.bySourceKind[row.sourceKind] = (summary.bySourceKind[row.sourceKind] ?? 0) + 1;
    summary.bySelectedFinalState[row.selectedFinalState] = (summary.bySelectedFinalState[row.selectedFinalState] ?? 0) + 1;
    if (row.cleanupAuthorized) summary.cleanupAuthorizedRows += 1;
    if (row.executableNow) summary.executableRows += 1;
    return summary;
  }, {
    total: 0,
    bySourceKind: {},
    bySelectedFinalState: {},
    cleanupAuthorizedRows: 0,
    executableRows: 0
  });
}

function ownerOrBranch(row) {
  if (row.sourceKind === "owner-package") return row.owner;
  return row.branch || row.path || row.owner;
}

function markdown(payload) {
  const summaryRows = Object.entries(payload.summary.bySelectedFinalState)
    .map(([state, count]) => `- ${state}: ${count}`)
    .join("\n");
  const rows = Object.values(payload.decisions).map((row) => {
    return `| \`${row.ledgerId}\` | ${row.sourceKind} | ${ownerOrBranch(row)} | ${row.selectedFinalState} | ${row.approvedBy} | ${row.executableNow ? "yes" : "no"} |`;
  }).join("\n");

  return `# A25 Dirty-Worktree Owner-Approved Final-State Selection

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Selection file: \`${paths.selection}\`

This selection records owner approval for the current exact approval IDs and selected final states from the A25 draft. It does not execute or authorize any direct Git cleanup by itself. Physical operations still have to be run only inside the scoped package/worktree path and followed by the listed post-approval gates.

## Summary

- Rows: ${payload.summary.total}
- Cleanup-authorized rows in this record: ${payload.summary.cleanupAuthorizedRows}
- Executable rows in this record: ${payload.summary.executableRows}

${summaryRows}

| Ledger ID | Source kind | Owner or branch | Selected final state | Approved by | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.ownerApprovals, paths.physicalApprovals, paths.draft]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const draft = readJson(paths.draft);
  const nextOwnerPacket = exists(paths.nextOwnerPacket) ? readJson(paths.nextOwnerPacket) : null;

  ensureCurrent("owner package approvals", ownerApprovals, dirtyMap, failures);
  ensureCurrent("physical lifecycle approvals", physicalApprovals, dirtyMap, failures);
  ensureCurrent("draft", draft, dirtyMap, failures);
  if (nextOwnerPacket) {
    if (nextOwnerPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      console.warn("A25 owner-approved selection warning: next owner approval packet is stale and will be kept as supporting evidence only.");
    }
  }
  if (draft.selectionTarget !== paths.selection) failures.push("draft selection target is stale");
  if (failures.length > 0) throw new Error(failures.join("\n"));

  const approvedAt = new Date().toISOString();
  const decisions = Object.fromEntries(
    Object.values(draft.decisions ?? {}).map((row) => {
      const decision = approvedDecision(row, approvedAt);
      if (!decision.allowedFinalStates.includes(decision.selectedFinalState)) {
        throw new Error(`${decision.ledgerId}: selected final state is not allowed`);
      }
      return [decision.ledgerId, decision];
    })
  );
  const summary = summarize(decisions);
  const payload = {
    generatedAt: approvedAt,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovalRequestsGeneratedAt: ownerApprovals.generatedAt,
    physicalLifecycleApprovalRequestsGeneratedAt: physicalApprovals.generatedAt,
    draftGeneratedAt: draft.generatedAt,
    nextOwnerPacketGeneratedAt: nextOwnerPacket?.generatedAt ?? "",
    approvalSource,
    approvalMode: "owner-approved-draft-recommendations",
    cleanupAuthorized: false,
    executableNow: false,
    note: "Owner-approved final-state selection only. Git cleanup remains scoped to exact package/worktree commands and post-approval gates.",
    summary,
    decisions
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.selection, json);
  write(paths.datedSelection, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);
  write(paths.approvalRecord, json);
  write(paths.datedRecord, json);
  write(paths.approvalRecordMarkdown, md);
  write(paths.datedRecordMarkdown, md);

  console.log(JSON.stringify({
    selection: paths.selection,
    datedSelection: paths.datedSelection,
    approvalRecord: paths.approvalRecord,
    decisions: summary.total,
    bySelectedFinalState: summary.bySelectedFinalState,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
