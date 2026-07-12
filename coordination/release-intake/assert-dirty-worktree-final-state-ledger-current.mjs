#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ledgerMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.md"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function ownerLedgerId(request) {
  return `owner-package:${request.approvalId}`;
}

function physicalLedgerId(request) {
  return `physical:${request.approvalId}`;
}

function finalStateNames(request) {
  return (request.allowedFinalStates ?? []).map((state) => state.selectedFinalState);
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

function validateOwnerEntry(request, entry, failures) {
  if (!entry) {
    failures.push(`missing final-state ledger row: ${ownerLedgerId(request)}`);
    return;
  }
  if (entry.sourceKind !== "owner-package") failures.push(`${entry.ledgerId}: sourceKind is stale`);
  if (entry.approvalId !== request.approvalId) failures.push(`${entry.ledgerId}: approvalId is stale`);
  if (entry.owner !== request.owner) failures.push(`${entry.ledgerId}: owner is stale`);
  if (entry.packageKind !== request.kind) failures.push(`${entry.ledgerId}: packageKind is stale`);
  if (entry.priority !== request.priority) failures.push(`${entry.ledgerId}: priority is stale`);
  if (entry.entries !== request.entries) failures.push(`${entry.ledgerId}: entries is stale`);
  if (!sameJson(entry.allowedFinalStates, finalStateNames(request))) failures.push(`${entry.ledgerId}: allowedFinalStates are stale`);
  for (const evidencePath of entry.evidenceLinks ?? []) {
    if (String(evidencePath).includes("undefined")) failures.push(`${entry.ledgerId}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${entry.ledgerId}: missing evidence file ${evidencePath}`);
  }
}

function validatePhysicalEntry(request, entry, failures) {
  if (!entry) {
    failures.push(`missing final-state ledger row: ${physicalLedgerId(request)}`);
    return;
  }
  if (entry.sourceKind !== "physical-lifecycle") failures.push(`${entry.ledgerId}: sourceKind is stale`);
  if (entry.approvalId !== request.approvalId) failures.push(`${entry.ledgerId}: approvalId is stale`);
  if (entry.branch !== request.branch) failures.push(`${entry.ledgerId}: branch is stale`);
  if (entry.path !== request.path) failures.push(`${entry.ledgerId}: path is stale`);
  if (entry.packageKind !== request.kind) failures.push(`${entry.ledgerId}: packageKind is stale`);
  if (entry.currentBlocker !== request.currentBlocker) failures.push(`${entry.ledgerId}: currentBlocker is stale`);
  if (!sameJson(entry.allowedFinalStates, finalStateNames(request))) failures.push(`${entry.ledgerId}: allowedFinalStates are stale`);
  for (const evidencePath of entry.evidenceLinks ?? []) {
    if (String(evidencePath).includes("undefined")) failures.push(`${entry.ledgerId}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${entry.ledgerId}: missing evidence file ${evidencePath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, entryCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerPackageApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const ledger = readJson(paths.ledger);
  const entries = ledger.entries ?? [];
  const entriesById = new Map(entries.map((entry) => [entry.ledgerId, entry]));

  if (ledger.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("final-state ledger dirty-map signature is stale");
  if (ledger.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("final-state ledger expanded dirty entry count is stale");
  }
  if (ledger.ownerPackageApprovalRequestsGeneratedAt !== ownerApprovals.generatedAt) {
    failures.push("final-state ledger owner package approval timestamp is stale");
  }
  if (ledger.physicalLifecycleApprovalRequestsGeneratedAt !== physicalApprovals.generatedAt) {
    failures.push("final-state ledger physical lifecycle approval timestamp is stale");
  }

  const expectedEntryCount = (ownerApprovals.requests?.length ?? 0) + (physicalApprovals.requests?.length ?? 0);
  if (entries.length !== expectedEntryCount) {
    failures.push(`final-state ledger row count mismatch: ledger ${entries.length}, expected ${expectedEntryCount}`);
  }

  for (const request of ownerApprovals.requests ?? []) validateOwnerEntry(request, entriesById.get(ownerLedgerId(request)), failures);
  for (const request of physicalApprovals.requests ?? []) validatePhysicalEntry(request, entriesById.get(physicalLedgerId(request)), failures);

  const expectedIds = new Set([
    ...(ownerApprovals.requests ?? []).map(ownerLedgerId),
    ...(physicalApprovals.requests ?? []).map(physicalLedgerId)
  ]);
  for (const entry of entries) {
    if (!expectedIds.has(entry.ledgerId)) failures.push(`unexpected final-state ledger row: ${entry.ledgerId}`);
    if (entry.decisionStatus === "invalid-owner-selection") failures.push(`invalid owner final-state selection: ${entry.ledgerId}`);
    if (strict && entry.decisionStatus === "pending-owner-approval") {
      failures.push(`pending final-state decision: ${entry.ledgerId}`);
    }
  }

  const expectedSummary = summarize(entries);
  if (!sameJson(ledger.summary, expectedSummary)) failures.push("final-state ledger summary is stale");

  const markdown = fs.readFileSync(path.join(root, paths.ledgerMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("final-state ledger markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    entryCount: entries.length,
    summary: ledger.summary,
    failures,
    entries: entries.map((entry) => ({
      ledgerId: entry.ledgerId,
      sourceKind: entry.sourceKind,
      decisionStatus: entry.decisionStatus,
      selectedFinalState: entry.selectedFinalState
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-dirty-worktree-final-state-ledger-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state ledger gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Ledger entries: ${payload.entryCount ?? 0}`);
    console.log(`Pending decisions: ${payload.summary?.pending ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state ledger gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
