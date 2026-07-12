#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

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

function slugOwner(owner) {
  return owner.slice(0, 3);
}

function repoPath(relativePath) {
  return relativePath.replaceAll("\\", "/");
}

function queueForDecision(decision, queue) {
  if (decision.id === "root-dirty-packages") return queue.queue;
  const ownerIds = new Set(decision.accountableOwners.map(slugOwner));
  return queue.queue.filter((item) => ownerIds.has(slugOwner(item.owner)));
}

function approvalTemplate(decision) {
  return {
    decisionId: decision.id,
    selectedFinalState: "",
    ownerDecision: "",
    approvedBy: "",
    approvedAt: "",
    evidenceLinks: [],
    requiredFollowUpGate: "Rerun A25 normal and strict lifecycle gates after the approved action is applied."
  };
}

function decisionRequest(decision, queue, dirtyMap) {
  const relatedWorkOrders = queueForDecision(decision, queue).map((item) => ({
    owner: item.owner,
    priority: item.priority,
    entries: item.entries,
    priorityReason: item.priorityReason,
    workOrder: item.workOrder,
    pathspec: item.latestPathspec,
    requiredFinalState: item.requiredFinalState
  }));

  return {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    dirtyMapExpandedEntries: dirtyMap.statusCounts.expandedStatusEntries,
    id: decision.id,
    title: decision.title,
    decisionStatus: decision.decisionStatus,
    currentState: decision.currentState,
    accountableOwners: decision.accountableOwners,
    requiredFinalStates: decision.requiredFinalStates,
    evidence: decision.evidence,
    notes: decision.notes,
    relatedWorkOrders,
    approvalTemplate: approvalTemplate(decision),
    forbiddenActions: [
      "Do not stage, commit, branch, merge, rebase, push, delete, reset, revert, clean, or deploy without explicit owner approval.",
      "Do not publish from the dirty root.",
      "Do not mix runtime code, generated content backlog, test evidence, and coordination evidence into one release slice.",
      "Do not discard dirty worktree or branch evidence without a recorded owner decision."
    ],
    verificationBeforeClosure: [
      "Refresh the A25 dirty map.",
      "Regenerate effective owner overlay, effective disposition queue, lifecycle ledger, and lifecycle decision requests.",
      "Run A25 normal gates.",
      "Run strict lifecycle gates; strict gates must pass before marking this decision closed."
    ]
  };
}

function writeRequest(request) {
  const base = `A25-lifecycle-decision-request-${request.id}`;
  const latestJson = path.join(outDir, `latest-${base}.json`);
  const latestMarkdown = path.join(outDir, `latest-${base}.md`);
  const datedJson = path.join(outDir, `${date}-${base}.json`);
  const datedMarkdown = path.join(outDir, `${date}-${base}.md`);

  fs.writeFileSync(latestJson, `${JSON.stringify(request, null, 2)}\n`);
  fs.writeFileSync(datedJson, `${JSON.stringify(request, null, 2)}\n`);
  fs.writeFileSync(latestMarkdown, requestMarkdown(request));
  fs.writeFileSync(datedMarkdown, requestMarkdown(request));

  return {
    id: request.id,
    title: request.title,
    decisionStatus: request.decisionStatus,
    accountableOwners: request.accountableOwners,
    latestJson: repoPath(path.relative(root, latestJson)),
    latestMarkdown: repoPath(path.relative(root, latestMarkdown)),
    datedJson: repoPath(path.relative(root, datedJson)),
    datedMarkdown: repoPath(path.relative(root, datedMarkdown))
  };
}

function requestMarkdown(request) {
  const workOrders = request.relatedWorkOrders.length > 0
    ? [
        "| Owner | Priority | Entries | Work order | Pathspec |",
        "| --- | ---: | ---: | --- | --- |",
        ...request.relatedWorkOrders.map((item) => {
          return `| ${item.owner} | ${item.priority} | ${item.entries} | \`${item.workOrder}\` | \`${item.pathspec}\` |`;
        })
      ].join("\n")
    : "No directly mapped effective work order; use the evidence archive and accountable owners above.";

  return `# ${date} A25 Lifecycle Decision Request: ${request.title}

Generated: ${request.generatedAt}

Decision ID: \`${request.id}\`

Dirty map signature: \`${request.dirtyMapStatusSignature}\`

Expanded dirty entries: ${request.dirtyMapExpandedEntries}

Status: \`${request.decisionStatus}\`

Current state: \`${request.currentState}\`

Accountable owners: ${request.accountableOwners.join(", ")}

## Evidence

\`\`\`json
${JSON.stringify(request.evidence, null, 2)}
\`\`\`

## Owner Decision Menu

Allowed final states:

${request.requiredFinalStates.map((state) => `- ${state}`).join("\n")}

## Related Effective Work Orders

${workOrders}

## Approval Record Template

\`\`\`json
${JSON.stringify(request.approvalTemplate, null, 2)}
\`\`\`

## Forbidden Without Explicit Owner Approval

${request.forbiddenActions.map((action) => `- ${action}`).join("\n")}

## Verification Before Closure

${request.verificationBeforeClosure.map((item) => `- ${item}`).join("\n")}

## A25 Note

${request.notes}
`;
}

function indexMarkdown(index) {
  const rows = index.requests.map((request) => {
    return `| ${request.id} | ${request.decisionStatus} | ${request.accountableOwners.join(", ")} | \`${request.latestMarkdown}\` |`;
  }).join("\n");

  return `# ${date} A25 Lifecycle Decision Request Index

Generated: ${index.generatedAt}

Dirty map signature: \`${index.dirtyMapStatusSignature}\`

Decision requests: ${index.decisionCount}

Open decision requests: ${index.openDecisionCount}

## Requests

| Decision ID | Status | Accountable owners | Request |
| --- | --- | --- | --- |
${rows}

## Closure Rule

These request packets are not approval. They are owner-facing decision records. A25 strict lifecycle closure remains blocked until every request has a recorded non-pending decision, related state is updated, and strict gates pass.
`;
}

function main() {
  const ledger = readJson("latest-A25-lifecycle-decision-ledger.json");
  const queue = readJson("latest-A25-effective-disposition-queue.json");
  const dirtyMap = readJson("latest-A25-dirty-tree-map.json");

  const requests = ledger.decisions.map((decision) => writeRequest(decisionRequest(decision, queue, dirtyMap)));
  const index = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    ledgerGeneratedAt: ledger.generatedAt,
    ledgerDirtyMapStatusSignature: ledger.dirtyMapStatusSignature,
    decisionCount: requests.length,
    openDecisionCount: ledger.openDecisionCount,
    requests
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-lifecycle-decision-request-index.json"), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-lifecycle-decision-request-index.json`), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-lifecycle-decision-request-index.md"), indexMarkdown(index));
  fs.writeFileSync(path.join(outDir, `${date}-A25-lifecycle-decision-request-index.md`), indexMarkdown(index));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-lifecycle-decision-request-index.json",
    latestMarkdown: "coordination/release-intake/latest-A25-lifecycle-decision-request-index.md",
    decisionCount: index.decisionCount,
    openDecisionCount: index.openDecisionCount
  }, null, 2));
}

main();
