#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  effectiveQueue: "coordination/release-intake/latest-A25-effective-disposition-queue.json",
  ownerQueue: "coordination/release-intake/latest-A25-owner-disposition-queue.json",
  approvals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  approvalsMarkdown: "coordination/release-intake/latest-A25-owner-package-approval-requests.md"
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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

function validateRequest(item, request, failures) {
  if (!request) {
    failures.push(`missing owner package approval request: ${item.owner}`);
    return;
  }

  if (request.approvalId !== slug(item.owner)) failures.push(`${item.owner}: approvalId is stale`);
  if (request.owner !== item.owner) failures.push(`${item.owner}: owner is stale`);
  if (request.entries !== item.entries) failures.push(`${item.owner}: entries is stale`);
  if (request.kind !== packageKind(item)) failures.push(`${item.owner}: kind is stale`);
  if (request.priority !== item.priority) failures.push(`${item.owner}: priority is stale`);
  if (request.priorityReason !== item.priorityReason) failures.push(`${item.owner}: priorityReason is stale`);
  if (!sameJson(request.dominantSlice, dominantSlice(item.sliceBuckets))) failures.push(`${item.owner}: dominantSlice is stale`);
  if (!sameJson(request.sliceBuckets, item.sliceBuckets ?? {})) failures.push(`${item.owner}: sliceBuckets are stale`);
  if (!sameJson(request.originalOwnerBuckets, item.originalOwnerBuckets ?? {})) {
    failures.push(`${item.owner}: originalOwnerBuckets are stale`);
  }
  if (request.fromUnmappedRuntimeProposals !== (item.fromUnmappedRuntimeProposals ?? 0)) {
    failures.push(`${item.owner}: fromUnmappedRuntimeProposals is stale`);
  }
  if (request.latestPathspec !== item.latestPathspec) failures.push(`${item.owner}: latestPathspec is stale`);
  if (request.datedPathspec !== item.datedPathspec) failures.push(`${item.owner}: datedPathspec is stale`);
  if (request.workOrder !== item.workOrder) failures.push(`${item.owner}: workOrder is stale`);
  if (request.datedWorkOrder !== item.datedWorkOrder) failures.push(`${item.owner}: datedWorkOrder is stale`);
  if (request.requiredFinalState !== item.requiredFinalState) failures.push(`${item.owner}: requiredFinalState is stale`);
  if (!Array.isArray(request.allowedFinalStates) || request.allowedFinalStates.length === 0) {
    failures.push(`${item.owner}: missing allowedFinalStates`);
  }
  for (const finalState of request.allowedFinalStates ?? []) {
    if (!finalState.selectedFinalState) failures.push(`${item.owner}: allowed final state missing selectedFinalState`);
    if (!finalState.effect) failures.push(`${item.owner}: allowed final state missing effect`);
  }

  const template = request.approvalTemplate ?? {};
  if (template.approvalId !== request.approvalId) failures.push(`${item.owner}: template approvalId is stale`);
  if (template.owner !== request.owner) failures.push(`${item.owner}: template owner is stale`);
  if (!Array.isArray(template.evidenceReviewed) || template.evidenceReviewed.length === 0) {
    failures.push(`${item.owner}: template missing evidenceReviewed`);
  }

  for (const evidencePath of [request.latestPathspec, request.workOrder, request.datedPathspec, request.datedWorkOrder]) {
    if (!evidencePath) continue;
    if (String(evidencePath).includes("undefined")) failures.push(`${item.owner}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${item.owner}: missing evidence file ${evidencePath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, requestCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const effectiveQueue = readJson(paths.effectiveQueue);
  const ownerQueue = readJson(paths.ownerQueue);
  const approvals = readJson(paths.approvals);
  const requests = approvals.requests ?? [];
  const requestsByOwner = new Map(requests.map((request) => [request.owner, request]));
  const queueOwners = new Set((effectiveQueue.queue ?? []).map((item) => item.owner));

  if (approvals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("owner package approval requests dirty-map signature is stale");
  }
  if (approvals.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("owner package approval requests expanded dirty entry count is stale");
  }
  if (approvals.effectiveQueueGeneratedAt !== effectiveQueue.generatedAt) {
    failures.push("owner package approval requests effective queue timestamp is stale");
  }
  if (approvals.ownerQueueGeneratedAt !== ownerQueue.generatedAt) {
    failures.push("owner package approval requests owner queue timestamp is stale");
  }
  if (effectiveQueue.overlay?.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("effective disposition queue signature is stale");
  }
  if (ownerQueue.dirtyMap?.statusSignature !== dirtyMap.statusSignature) {
    failures.push("owner disposition queue signature is stale");
  }
  if (requests.length !== (effectiveQueue.queue ?? []).length) {
    failures.push(`request count mismatch: approvals ${requests.length}, queue ${(effectiveQueue.queue ?? []).length}`);
  }
  if (!sameJson(approvals.summary, summarize(requests))) failures.push("owner package approval request summary is stale");

  for (const item of effectiveQueue.queue ?? []) validateRequest(item, requestsByOwner.get(item.owner), failures);
  for (const request of requests) {
    if (!queueOwners.has(request.owner)) failures.push(`unexpected owner package approval request: ${request.owner}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.approvalsMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("owner package approval requests markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    requestCount: requests.length,
    summary: approvals.summary,
    failures,
    requests: requests.map((request) => ({
      approvalId: request.approvalId,
      owner: request.owner,
      entries: request.entries,
      kind: request.kind,
      priority: request.priority
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-owner-package-approval-requests-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package approval requests gate");
    console.log(`Requests: ${payload.requestCount ?? 0}`);
    console.log(`Expanded dirty entries: ${payload.expandedStatusEntries ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 owner package approval requests gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
