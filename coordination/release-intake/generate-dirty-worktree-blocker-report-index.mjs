#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  authorizationQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-blocker-report-index.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-blocker-report-index.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-blocker-report-index.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-blocker-report-index.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function queueRows(queue, sourceKind) {
  if (sourceKind === "owner-package") return queue.ownerPackageQueue ?? [];
  return queue.physicalLifecycleQueue ?? [];
}

function queueRowFor(queue, action) {
  return queueRows(queue, action.sourceKind).find((row) => row.approvalId === action.approvalId) ?? null;
}

function ownerActionNeeded(action, queueRow) {
  if (action.sourceKind === "owner-package") {
    return "Owning agent must choose reviewed commit, exact-path discard, evidence archive, or continued blocker for this owner package.";
  }
  if (queueRow?.queueKind === "root-owner-package") {
    return "A25/A22 must keep root excluded from release sources until root package closure has a reviewed final state.";
  }
  if (String(queueRow?.queueKind ?? "").includes("clean-diverged")) {
    return "Owning agent must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker.";
  }
  return "Owning agent must choose commit/package extraction, exact-path discard, retained-worktree blocker, removal after closure, or continued blocker.";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function rowFor(action, queue) {
  const queueRow = queueRowFor(queue, action);
  const ownerOrBranch = action.sourceKind === "owner-package" ? action.owner : action.branch;
  const allowedFinalStates = (queueRow?.allowedFinalStates ?? []).map((item) => (
    typeof item === "string" ? item : item.selectedFinalState
  )).filter(Boolean);

  return {
    blockerId: `blocker-${slug(action.ledgerId)}`,
    ledgerId: action.ledgerId,
    approvalId: action.approvalId,
    sourceKind: action.sourceKind,
    owner: action.owner,
    branch: action.branch,
    path: action.path,
    ownerOrBranch,
    packageKind: action.packageKind,
    priority: action.priority,
    currentBlocker: action.currentBlocker,
    decisionStatus: action.decisionStatus,
    selectedFinalState: action.selectedFinalState,
    actionKind: action.actionKind,
    blockerReportStatus: action.actionKind === "blocker-report-required" ? "recorded" : "not-a-blocker-row",
    ownerActionNeeded: ownerActionNeeded(action, queueRow),
    allowedFinalStates,
    evidenceLinks: unique([...(action.evidenceLinks ?? []), ...(queueRow?.evidence ?? [])]),
    requiredAuthorizationText: queueRow?.requiredAuthorizationText ?? "",
    postApprovalChecks: queueRow?.postApprovalChecks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function summarize(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary.bySourceKind[row.sourceKind] = (summary.bySourceKind[row.sourceKind] ?? 0) + 1;
    summary.byActionKind[row.actionKind] = (summary.byActionKind[row.actionKind] ?? 0) + 1;
    summary.byDecisionStatus[row.decisionStatus] = (summary.byDecisionStatus[row.decisionStatus] ?? 0) + 1;
    summary.byPriority[`P${row.priority ?? "none"}`] = (summary.byPriority[`P${row.priority ?? "none"}`] ?? 0) + 1;
    if (row.cleanupAuthorized) summary.cleanupAuthorizedRows += 1;
    if (row.executableNow) summary.executableRows += 1;
    if (row.blockerReportStatus === "recorded") summary.recordedBlockers += 1;
    return summary;
  }, {
    total: 0,
    recordedBlockers: 0,
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    bySourceKind: {},
    byActionKind: {},
    byDecisionStatus: {},
    byPriority: {}
  });
}

function markdown(payload) {
  const summaryRows = Object.entries(payload.summary.bySourceKind)
    .map(([kind, count]) => `- ${kind}: ${count}`)
    .join("\n");
  const rows = payload.blockerReports.map((row) => `| \`${row.blockerId}\` | \`${row.ledgerId}\` | ${row.ownerOrBranch || "n/a"} | ${row.currentBlocker} | ${row.blockerReportStatus} | ${row.executableNow ? "yes" : "no"} |`).join("\n");
  const details = payload.blockerReports.map((row) => `## ${row.blockerId}

- Ledger ID: \`${row.ledgerId}\`
- Approval ID: \`${row.approvalId}\`
- Source kind: ${row.sourceKind}
- Owner: ${row.owner || "n/a"}
- Branch: ${row.branch || "n/a"}
- Path: ${row.path || "n/a"}
- Current blocker: ${row.currentBlocker}
- Decision status: ${row.decisionStatus}
- Selected final state: ${row.selectedFinalState}
- Owner action needed: ${row.ownerActionNeeded}
- Required authorization text:
  - ${row.requiredAuthorizationText || "No authorization text recorded."}
- Evidence:
${row.evidenceLinks.length > 0 ? row.evidenceLinks.map((item) => `  - \`${item}\``).join("\n") : "  - No evidence links recorded."}
- Post-approval checks:
${row.postApprovalChecks.length > 0 ? row.postApprovalChecks.map((item) => `  - \`${item}\``).join("\n") : "  - No post-approval checks recorded."}
`).join("\n");

  return `# A25 Dirty-Worktree Blocker Report Index

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is blocker-report evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, or worktree removal.

## Summary

- Blocker reports: ${payload.summary.recordedBlockers}/${payload.summary.total}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

${summaryRows}

| Blocker ID | Ledger ID | Owner or branch | Current blocker | Status | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const actionRunbook = readJson(paths.actionRunbook);
  const authorizationQueue = readJson(paths.authorizationQueue);

  for (const [label, artifact] of [
    ["action runbook", actionRunbook],
    ["authorization queue", authorizationQueue]
  ]) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      throw new Error(`${label} is stale relative to latest dirty map.`);
    }
  }

  const blockerActions = (actionRunbook.actions ?? []).filter((action) => action.actionKind === "blocker-report-required");
  const blockerReports = blockerActions.map((action) => rowFor(action, authorizationQueue));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    actionRunbookGeneratedAt: actionRunbook.generatedAt,
    authorizationQueueGeneratedAt: authorizationQueue.generatedAt,
    note: "Blocker-report evidence only. A separate explicit owner instruction is required for any Git or physical cleanup operation.",
    summary: summarize(blockerReports),
    blockerReports
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
    blockerReports: payload.summary.total,
    recordedBlockers: payload.summary.recordedBlockers,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
