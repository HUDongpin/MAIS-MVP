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
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-selection-template.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-selection-template.md`,
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

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function finalStateNames(request) {
  return (request.allowedFinalStates ?? []).map((state) => state.selectedFinalState);
}

function ownerLedgerId(request) {
  return `owner-package:${request.approvalId}`;
}

function physicalLedgerId(request) {
  return `physical:${request.approvalId}`;
}

function ownerDecisionTemplate(request) {
  return {
    ledgerId: ownerLedgerId(request),
    sourceKind: "owner-package",
    approvalId: request.approvalId,
    owner: request.owner,
    branch: "",
    path: "",
    packageKind: request.kind,
    priority: request.priority,
    entries: request.entries,
    currentBlocker: `root package has ${request.entries} dirty entries`,
    allowedFinalStates: finalStateNames(request),
    selectedFinalState: "",
    approvedBy: "",
    approvedAt: "",
    ownerDecision: "",
    evidenceReviewed: [
      request.latestPathspec,
      request.workOrder,
      paths.ownerPackageApprovals
    ].filter(Boolean),
    notes: ""
  };
}

function physicalDecisionTemplate(request) {
  return {
    ledgerId: physicalLedgerId(request),
    sourceKind: "physical-lifecycle",
    approvalId: request.approvalId,
    owner: request.ownerHints?.join(", ") ?? "",
    branch: request.branch,
    path: request.path,
    packageKind: request.kind,
    priority: null,
    entries: null,
    currentBlocker: request.currentBlocker,
    allowedFinalStates: finalStateNames(request),
    selectedFinalState: "",
    approvedBy: "",
    approvedAt: "",
    ownerDecision: "",
    evidenceReviewed: [
      ...(request.evidence ?? []),
      paths.physicalApprovals
    ].filter(Boolean),
    notes: ""
  };
}

function summarize(decisions) {
  return decisions.reduce((summary, decision) => {
    summary.total += 1;
    summary.bySourceKind[decision.sourceKind] = (summary.bySourceKind[decision.sourceKind] ?? 0) + 1;
    summary.byPackageKind[decision.packageKind] = (summary.byPackageKind[decision.packageKind] ?? 0) + 1;
    if (decision.priority !== null && decision.priority !== undefined) {
      summary.byPriority[`P${decision.priority}`] = (summary.byPriority[`P${decision.priority}`] ?? 0) + 1;
    }
    return summary;
  }, { total: 0, bySourceKind: {}, byPackageKind: {}, byPriority: {} });
}

function markdown(payload) {
  const rows = Object.values(payload.decisions).map((decision) => {
    const ownerOrBranch = decision.sourceKind === "owner-package" ? decision.owner : decision.branch;
    return `| \`${decision.ledgerId}\` | ${decision.sourceKind} | ${ownerOrBranch} | ${decision.currentBlocker} | ${decision.allowedFinalStates.join("; ")} |`;
  }).join("\n");

  const examples = Object.values(payload.decisions).slice(0, 3).map((decision) => {
    return `## ${decision.ledgerId}

\`\`\`json
${JSON.stringify(decision, null, 2)}
\`\`\``;
  }).join("\n\n");

  return `# A25 Dirty-Worktree Final-State Selection Template

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Selection target: \`${payload.selectionTarget}\`

Template decisions: ${payload.summary.total}

- Owner-package decisions: ${payload.summary.bySourceKind["owner-package"] ?? 0}
- Physical lifecycle decisions: ${payload.summary.bySourceKind["physical-lifecycle"] ?? 0}

This is a template, not an approval record. To record final states, copy the JSON shape to \`${payload.selectionTarget}\`, fill each \`selectedFinalState\` with one exact allowed value, and fill \`approvedBy\`, \`approvedAt\`, \`ownerDecision\`, and reviewed evidence notes. Do not use this template as authorization for staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal.

| Ledger ID | Source kind | Owner or branch | Current blocker | Allowed final states |
| --- | --- | --- | --- | --- |
${rows}

## JSON Examples

${examples}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerPackageApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);

  if (ownerApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Owner package approval requests are stale relative to latest dirty map.");
  }
  if (physicalApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Physical lifecycle approval requests are stale relative to latest dirty map.");
  }

  const decisionRows = [
    ...(ownerApprovals.requests ?? []).map(ownerDecisionTemplate),
    ...(physicalApprovals.requests ?? []).map(physicalDecisionTemplate)
  ];
  const decisions = Object.fromEntries(decisionRows.map((decision) => [decision.ledgerId, decision]));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovalRequestsGeneratedAt: ownerApprovals.generatedAt,
    physicalLifecycleApprovalRequestsGeneratedAt: physicalApprovals.generatedAt,
    selectionTarget: paths.selectionTarget,
    instructions: [
      "Fill selectedFinalState with one exact value from allowedFinalStates.",
      "Fill approvedBy, approvedAt, ownerDecision, and evidenceReviewed before regenerating the final-state ledger.",
      "This template does not authorize destructive Git operations or deploys."
    ],
    summary: summarize(decisionRows),
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
    ownerPackageDecisions: payload.summary.bySourceKind["owner-package"] ?? 0,
    physicalLifecycleDecisions: payload.summary.bySourceKind["physical-lifecycle"] ?? 0
  }, null, 2));
}

main();
