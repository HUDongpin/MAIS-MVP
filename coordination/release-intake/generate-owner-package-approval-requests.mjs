#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  effectiveQueue: "coordination/release-intake/latest-A25-effective-disposition-queue.json",
  ownerQueue: "coordination/release-intake/latest-A25-owner-disposition-queue.json",
  latestJson: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-approval-requests.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-approval-requests.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-approval-requests.md`
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

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function dominantSlice(sliceBuckets = {}) {
  const entries = Object.entries(sliceBuckets).sort((left, right) => right[1] - left[1]);
  if (entries.length === 0) return { name: "none", count: 0 };
  return { name: entries[0][0], count: entries[0][1] };
}

function packageKind(item) {
  const buckets = item.sliceBuckets ?? {};
  if (buckets["release hygiene tooling/config"]) return "release-hygiene";
  if (buckets["runtime app/API/data/public"]) return "runtime";
  if (buckets["tests/regression evidence"]) return "regression-evidence";
  if (buckets["generated/content/RAG backlog"]) return "content-rag";
  if (buckets["docs/coordination evidence"]) return "coordination-evidence";
  return "mixed-owner-package";
}

function allowedFinalStates(item) {
  const base = [
    {
      selectedFinalState: "reviewed commit",
      effect: "Owning agent commits only this pathspec package from an isolated clean worktree after package-specific checks."
    },
    {
      selectedFinalState: "owner-approved exact-path discard",
      effect: "A separately authorized Git operation discards only exact paths from this package after evidence review."
    },
    {
      selectedFinalState: "evidence archive",
      effect: "A25 preserves this package's pathspec/status/diff evidence and keeps it out of the release source."
    },
    {
      selectedFinalState: "blocker",
      effect: "A25 records the unresolved owner, check, content, or coordination reason blocking package closure."
    }
  ];

  if (packageKind(item) === "content-rag") {
    return base.map((state) => {
      if (state.selectedFinalState !== "reviewed commit") return state;
      return {
        ...state,
        effect: "Owning content agents commit only reviewed evidence/candidate artifacts; raw private corpus text and live promotion remain blocked without A18/A23/A24 gates."
      };
    });
  }

  return base;
}

function approvalTemplate(request) {
  return {
    approvalId: request.approvalId,
    owner: request.owner,
    selectedFinalState: "<one allowed final state from this request>",
    approvedBy: "<owner or owning agent>",
    approvedAt: "<ISO-8601 timestamp>",
    evidenceReviewed: [
      request.latestPathspec,
      request.workOrder
    ].filter(Boolean),
    notes: "<scope, checks, and any exact paths if approving discard>"
  };
}

function summarize(requests) {
  return requests.reduce((summary, request) => {
    summary.total += 1;
    summary.entries += request.entries;
    summary.byPriority[`P${request.priority}`] = (summary.byPriority[`P${request.priority}`] ?? 0) + 1;
    summary.byKind[request.kind] = (summary.byKind[request.kind] ?? 0) + 1;
    return summary;
  }, { total: 0, entries: 0, byPriority: {}, byKind: {} });
}

function markdown(payload) {
  const rows = payload.requests.map((request) => {
    return `| \`${request.approvalId}\` | ${request.owner} | P${request.priority} | ${request.entries} | ${request.kind} | ${request.dominantSlice.name}: ${request.dominantSlice.count} | \`${request.latestPathspec}\` | ${request.allowedFinalStates.map((state) => state.selectedFinalState).join("; ")} |`;
  }).join("\n");

  const sections = payload.requests.map((request) => {
    const finalStates = request.allowedFinalStates.map((state) => `  - ${state.selectedFinalState}: ${state.effect}`).join("\n");
    return `## ${request.approvalId}

- Owner: ${request.owner}
- Priority: P${request.priority}
- Entries: ${request.entries}
- Kind: ${request.kind}
- Dominant slice: ${request.dominantSlice.name}: ${request.dominantSlice.count}
- Priority reason: ${request.priorityReason}
- Pathspec: \`${request.latestPathspec}\`
- Work order: \`${request.workOrder}\`
- Required final state: ${request.requiredFinalState}
- Slice buckets: \`${JSON.stringify(request.sliceBuckets)}\`
- Allowed final states:
${finalStates}
- Approval template:

\`\`\`json
${JSON.stringify(request.approvalTemplate, null, 2)}
\`\`\`
`;
  }).join("\n");

  return `# A25 Owner Package Approval Requests

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Requests: ${payload.summary.total}

Entries represented: ${payload.summary.entries}

This artifact is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. Every package action still requires a separate explicit owner instruction naming the exact approval ID, owner/pathspec package, selected final state, approver, timestamp, and reviewed evidence.

| Approval ID | Owner | Priority | Entries | Kind | Dominant slice | Pathspec | Allowed final states |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const effectiveQueue = readJson(paths.effectiveQueue);
  const ownerQueue = readJson(paths.ownerQueue);
  if (effectiveQueue.overlay?.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Effective disposition queue is stale relative to latest dirty map. Regenerate it first.");
  }
  if (ownerQueue.dirtyMap?.statusSignature !== dirtyMap.statusSignature) {
    throw new Error("Owner disposition queue is stale relative to latest dirty map. Regenerate it first.");
  }

  const requests = (effectiveQueue.queue ?? []).map((item) => {
    const request = {
      approvalId: slug(item.owner),
      owner: item.owner,
      entries: item.entries,
      kind: packageKind(item),
      priority: item.priority,
      priorityReason: item.priorityReason,
      dominantSlice: dominantSlice(item.sliceBuckets),
      sliceBuckets: item.sliceBuckets ?? {},
      originalOwnerBuckets: item.originalOwnerBuckets ?? {},
      fromUnmappedRuntimeProposals: item.fromUnmappedRuntimeProposals ?? 0,
      latestPathspec: item.latestPathspec,
      datedPathspec: item.datedPathspec,
      workOrder: item.workOrder,
      datedWorkOrder: item.datedWorkOrder,
      requiredFinalState: item.requiredFinalState,
      allowedFinalStates: allowedFinalStates(item)
    };
    return {
      ...request,
      approvalTemplate: approvalTemplate(request)
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    effectiveQueueGeneratedAt: effectiveQueue.generatedAt,
    ownerQueueGeneratedAt: ownerQueue.generatedAt,
    summary: summarize(requests),
    note: "Approval support only. Destructive Git actions require separate explicit owner authorization.",
    requests
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
    requests: payload.summary.total,
    entries: payload.summary.entries
  }, null, 2));
}

main();
