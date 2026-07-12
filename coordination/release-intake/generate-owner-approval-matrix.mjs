#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();
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

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(outDir, fileName), "utf8"));
}

function approvalSelection() {
  if (!fs.existsSync(approvalSelectionPath)) return null;
  return JSON.parse(fs.readFileSync(approvalSelectionPath, "utf8"));
}

function requestForDecision(index, id) {
  return index.requests.find((request) => request.id === id);
}

function runbookPlanForDecision(runbook, id) {
  return runbook.closurePlans.find((plan) => plan.id === id);
}

function rowForDecision(decision, requestIndex, runbook, selection) {
  const request = requestForDecision(requestIndex, decision.id);
  const runbookPlan = runbookPlanForDecision(runbook, decision.id);
  const approval = selection?.decisions?.[decision.id];
  return {
    id: decision.id,
    title: decision.title,
    status: decision.decisionStatus,
    approvalStatus: approval ? "approved" : "pending-owner-approval",
    accountableOwners: decision.accountableOwners,
    allowedFinalStates: decision.requiredFinalStates,
    selectedFinalState: approval?.selectedFinalState ?? "",
    approvedBy: approval ? selection.approvedBy : "",
    approvedAt: approval ? selection.approvedAt : "",
    ownerDecision: approval?.ownerDecision ?? "",
    evidenceLinks: approval ? [
      "coordination/release-intake/latest-A25-owner-approval-selection.md"
    ] : [],
    requestPacket: request?.latestMarkdown ?? "",
    closureRunbook: "coordination/release-intake/latest-A25-lifecycle-closure-runbook.md",
    relatedWorkOrders: runbookPlan?.relatedWorkOrders ?? [],
    finalVerificationRequired: [
      "Refresh A25 dirty map and dependent artifacts.",
      "Run normal A25 gates.",
      "Run strict lifecycle, decision-ledger, decision-request, and closure-runbook gates.",
      "Confirm this decision no longer appears as pending."
    ]
  };
}

function markdown(payload) {
  const rows = payload.rows.map((row) => {
    return `| ${row.id} | ${row.approvalStatus} | ${row.accountableOwners.join(", ")} | ${row.allowedFinalStates.join("; ")} | \`${row.requestPacket}\` |`;
  }).join("\n");

  const templates = payload.rows.map((row) => {
    return `## ${row.id}

\`\`\`json
${JSON.stringify({
  id: row.id,
  selectedFinalState: row.selectedFinalState,
  ownerDecision: row.ownerDecision,
  approvedBy: row.approvedBy,
  approvedAt: row.approvedAt,
  evidenceLinks: row.evidenceLinks
}, null, 2)}
\`\`\`
`;
  }).join("\n");

  return `# ${date} A25 Owner Approval Matrix

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Approval rows: ${payload.rowCount}

Pending approvals: ${payload.pendingApprovalCount}

## Matrix

| Decision ID | Approval status | Accountable owners | Allowed final states | Request packet |
| --- | --- | --- | --- | --- |
${rows}

## Approval Templates

${templates}
## Rules

- This matrix records owner-selected lifecycle final states when latest-A25-owner-approval-selection.json is present.
- It does not authorize any separate Git operation by itself.
- A25 must not stage, commit, branch, push, tag, delete, reset, revert, clean, remove worktrees, or deploy from this matrix alone.
- archive tag is recorded as an archive-state approval only; creating a real Git tag requires a separate explicit tag instruction.
- Each approval must name the exact decision ID, selected final state, approver, timestamp, and evidence links.
- Strict decision-ledger/request/runbook/matrix gates can pass after approvals are recorded; strict physical worktree lifecycle remains red until the related Git state is actually cleaned, archived, tagged, removed, or otherwise closed by separately authorized operations.
`;
}

function main() {
  const dirtyMap = readJson("latest-A25-dirty-tree-map.json");
  const ledger = readJson("latest-A25-lifecycle-decision-ledger.json");
  const requestIndex = readJson("latest-A25-lifecycle-decision-request-index.json");
  const runbook = readJson("latest-A25-lifecycle-closure-runbook.json");
  const selection = approvalSelection();
  const rows = ledger.decisions.map((decision) => rowForDecision(decision, requestIndex, runbook, selection));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    ledgerDirtyMapStatusSignature: ledger.dirtyMapStatusSignature,
    requestIndexDirtyMapStatusSignature: requestIndex.dirtyMapStatusSignature,
    runbookDirtyMapStatusSignature: runbook.dirtyMapStatusSignature,
    approvalSelectionRecordedAt: selection?.approvedAt ?? "",
    approvalSelectionSource: selection?.approvalSource ?? "",
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    rowCount: rows.length,
    pendingApprovalCount: rows.filter((row) => row.approvalStatus.startsWith("pending")).length,
    rows
  };

  for (const target of [
    path.join(outDir, "latest-A25-owner-approval-matrix.json"),
    path.join(outDir, `${date}-A25-owner-approval-matrix.json`)
  ]) {
    fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  }

  const rendered = markdown(payload);
  for (const target of [
    path.join(outDir, "latest-A25-owner-approval-matrix.md"),
    path.join(outDir, `${date}-A25-owner-approval-matrix.md`)
  ]) {
    fs.writeFileSync(target, rendered);
  }

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-owner-approval-matrix.json",
    latestMarkdown: "coordination/release-intake/latest-A25-owner-approval-matrix.md",
    rowCount: payload.rowCount,
    pendingApprovalCount: payload.pendingApprovalCount
  }, null, 2));
}

main();
