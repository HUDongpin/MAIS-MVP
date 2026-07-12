#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  packet: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.json",
  approvals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  approvalsMarkdown: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.md"
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

function approvalId(decision) {
  return slug(decision.branch === "main" ? "root-main" : decision.branch);
}

function currentBlocker(decision) {
  if (decision.state === "dirty-open-decision") return `dirty ${decision.statusEntries}`;
  return `behind ${decision.divergence?.behind ?? 0}, ahead ${decision.divergence?.ahead ?? 0}`;
}

function requestKind(decision) {
  if (decision.branch === "main") return "root-owner-package";
  if (decision.state === "clean-diverged-open-decision") return "clean-diverged-branch";
  if (decision.evidenceCoverage?.dirtyDivergedArchive) return "dirty-diverged-worktree";
  return "dirty-linked-worktree";
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function summarize(requests) {
  return requests.reduce((summary, request) => {
    summary.total += 1;
    summary.byKind[request.kind] = (summary.byKind[request.kind] ?? 0) + 1;
    if (request.branch === "main") summary.root += 1;
    if (request.state === "dirty-open-decision" && request.branch !== "main") summary.dirtyLinked += 1;
    if (request.state === "clean-diverged-open-decision") summary.cleanDiverged += 1;
    return summary;
  }, { total: 0, root: 0, dirtyLinked: 0, cleanDiverged: 0, byKind: {} });
}

function validateRequest(decision, request, failures) {
  if (!request) {
    failures.push(`missing approval request row: ${decision.branch}`);
    return;
  }

  const id = approvalId(decision);
  if (request.approvalId !== id) failures.push(`${decision.branch}: approvalId is stale`);
  if (request.branch !== decision.branch) failures.push(`${decision.branch}: branch is stale`);
  if (request.path !== decision.path) failures.push(`${decision.branch}: path is stale`);
  if (request.state !== decision.state) failures.push(`${decision.branch}: state is stale`);
  if (request.kind !== requestKind(decision)) failures.push(`${decision.branch}: kind is stale`);
  if (request.currentBlocker !== currentBlocker(decision)) failures.push(`${decision.branch}: currentBlocker is stale`);
  if (!sameJson(request.ownerHints, decision.ownerHints)) failures.push(`${decision.branch}: ownerHints are stale`);
  if (!sameJson(request.evidence, decision.evidence)) failures.push(`${decision.branch}: evidence links are stale`);
  if (!sameJson(request.evidenceCoverage, decision.evidenceCoverage)) {
    failures.push(`${decision.branch}: evidenceCoverage is stale`);
  }

  if (!Array.isArray(request.allowedFinalStates) || request.allowedFinalStates.length === 0) {
    failures.push(`${decision.branch}: missing allowedFinalStates`);
  }
  for (const finalState of request.allowedFinalStates ?? []) {
    if (!finalState.selectedFinalState) failures.push(`${decision.branch}: allowed final state missing selectedFinalState`);
    if (!finalState.effect) failures.push(`${decision.branch}: allowed final state missing effect`);
  }

  const approvalTemplate = request.approvalTemplate ?? {};
  if (approvalTemplate.approvalId !== request.approvalId) failures.push(`${decision.branch}: template approvalId is stale`);
  if (approvalTemplate.branch !== request.branch) failures.push(`${decision.branch}: template branch is stale`);
  if (approvalTemplate.path !== request.path) failures.push(`${decision.branch}: template path is stale`);
  if (!sameJson(approvalTemplate.evidenceReviewed, request.evidence)) {
    failures.push(`${decision.branch}: template evidenceReviewed is stale`);
  }

  for (const evidencePath of request.evidence ?? []) {
    if (String(evidencePath).includes("undefined")) failures.push(`${decision.branch}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${decision.branch}: missing evidence file ${evidencePath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, requestCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const packet = readJson(paths.packet);
  const approvals = readJson(paths.approvals);
  const requests = approvals.requests ?? [];
  const requestsByBranch = new Map(requests.map((request) => [request.branch, request]));
  const packetBranches = new Set((packet.decisions ?? []).map((decision) => decision.branch));

  if (approvals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("approval requests dirty-map signature is stale");
  }
  if (approvals.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("approval requests expanded dirty entry count is stale");
  }
  if (approvals.physicalPacketGeneratedAt !== packet.generatedAt) {
    failures.push("approval requests physical packet timestamp is stale");
  }
  if (approvals.worktreeCount !== packet.worktreeCount) failures.push("approval requests worktreeCount is stale");
  if (approvals.dirtyOpenDecisionCount !== packet.dirtyOpenDecisionCount) {
    failures.push("approval requests dirtyOpenDecisionCount is stale");
  }
  if (approvals.cleanDivergedOpenDecisionCount !== packet.cleanDivergedOpenDecisionCount) {
    failures.push("approval requests cleanDivergedOpenDecisionCount is stale");
  }
  if (requests.length !== (packet.decisions ?? []).length) {
    failures.push(`request count mismatch: approvals ${requests.length}, packet ${(packet.decisions ?? []).length}`);
  }

  const expectedSummary = summarize(requests);
  if (!sameJson(approvals.summary, expectedSummary)) failures.push("approval request summary is stale");

  for (const decision of packet.decisions ?? []) {
    validateRequest(decision, requestsByBranch.get(decision.branch), failures);
  }
  for (const request of requests) {
    if (!packetBranches.has(request.branch)) failures.push(`unexpected approval request row: ${request.branch}`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.approvalsMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("approval requests markdown contains undefined");
  if (markdown.includes("Missing archive evidence")) failures.push("approval requests markdown contains Missing archive evidence");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    physicalPacketGeneratedAt: packet.generatedAt,
    requestCount: requests.length,
    summary: approvals.summary,
    failures,
    requests: requests.map((request) => ({
      approvalId: request.approvalId,
      branch: request.branch,
      state: request.state,
      kind: request.kind,
      currentBlocker: request.currentBlocker
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-physical-lifecycle-approval-requests-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 physical lifecycle approval requests gate");
    console.log(`Requests: ${payload.requestCount ?? 0}`);
    console.log(`Expanded dirty entries: ${payload.expandedStatusEntries ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 physical lifecycle approval requests gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
