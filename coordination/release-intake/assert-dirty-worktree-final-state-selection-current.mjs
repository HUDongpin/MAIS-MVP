#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");
const outputPath = path.join(
  outDir,
  strict
    ? "latest-A25-dirty-worktree-final-state-selection-strict-gate.json"
    : "latest-A25-dirty-worktree-final-state-selection-current-gate.json"
);

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  selection: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json"
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

function finalStateNames(request) {
  return (request.allowedFinalStates ?? []).map((state) => state.selectedFinalState);
}

function ownerLedgerId(request) {
  return `owner-package:${request.approvalId}`;
}

function physicalLedgerId(request) {
  return `physical:${request.approvalId}`;
}

function expectedOwnerDecision(request) {
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
    allowedFinalStates: finalStateNames(request)
  };
}

function expectedPhysicalDecision(request) {
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
    allowedFinalStates: finalStateNames(request)
  };
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoTimestamp(value) {
  if (!nonEmpty(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function summarize(expectedRows, decisions, missingSelection) {
  const summary = {
    total: expectedRows.length,
    selected: 0,
    complete: 0,
    missingSelection,
    bySourceKind: {},
    byStatus: {}
  };

  for (const expected of expectedRows) {
    summary.bySourceKind[expected.sourceKind] = (summary.bySourceKind[expected.sourceKind] ?? 0) + 1;
    const decision = decisions?.[expected.ledgerId];
    const selected = nonEmpty(decision?.selectedFinalState);
    const complete = selected
      && nonEmpty(decision?.approvedBy)
      && validIsoTimestamp(decision?.approvedAt)
      && nonEmpty(decision?.ownerDecision)
      && Array.isArray(decision?.evidenceReviewed)
      && decision.evidenceReviewed.length > 0;
    const status = !decision ? "missing-row" : complete ? "complete" : selected ? "selected-incomplete" : "pending";
    if (selected) summary.selected += 1;
    if (complete) summary.complete += 1;
    summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1;
  }

  return summary;
}

function validateDecision(expected, actual, failures) {
  const id = expected.ledgerId;
  if (!actual) {
    failures.push(`missing final-state selection row: ${id}`);
    return;
  }

  for (const key of [
    "ledgerId",
    "sourceKind",
    "approvalId",
    "owner",
    "branch",
    "path",
    "packageKind",
    "priority",
    "entries",
    "currentBlocker"
  ]) {
    if (!sameJson(actual[key], expected[key])) failures.push(`${id}: ${key} is stale`);
  }

  if (!sameJson(actual.allowedFinalStates, expected.allowedFinalStates)) failures.push(`${id}: allowedFinalStates are stale`);
  if (!expected.allowedFinalStates.includes(actual.selectedFinalState)) {
    failures.push(`${id}: selectedFinalState must be one allowed value`);
  }
  if (!nonEmpty(actual.approvedBy)) failures.push(`${id}: approvedBy is required`);
  if (!validIsoTimestamp(actual.approvedAt)) failures.push(`${id}: approvedAt must be an ISO-compatible timestamp`);
  if (!nonEmpty(actual.ownerDecision)) failures.push(`${id}: ownerDecision is required`);
  if (!Array.isArray(actual.evidenceReviewed) || actual.evidenceReviewed.length === 0) {
    failures.push(`${id}: evidenceReviewed is required`);
  }

  for (const evidencePath of actual.evidenceReviewed ?? []) {
    if (String(evidencePath).includes("undefined")) failures.push(`${id}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${id}: missing evidence file ${evidencePath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.ownerPackageApprovals, paths.physicalApprovals, paths.template]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, decisionCount: 0, missingSelection: !exists(paths.selection) });

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerPackageApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const template = readJson(paths.template);
  const expectedRows = [
    ...(ownerApprovals.requests ?? []).map(expectedOwnerDecision),
    ...(physicalApprovals.requests ?? []).map(expectedPhysicalDecision)
  ];

  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("selection template dirty-map signature is stale");
  }
  if (ownerApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("owner package approval requests dirty-map signature is stale");
  }
  if (physicalApprovals.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("physical lifecycle approval requests dirty-map signature is stale");
  }

  if (!exists(paths.selection)) {
    if (strict) failures.push(`missing final-state selection file: ${paths.selection}`);
    return finish({
      checkedAt: new Date().toISOString(),
      strict,
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      selectionPath: paths.selection,
      missingSelection: true,
      decisionCount: expectedRows.length,
      summary: summarize(expectedRows, null, true),
      failures
    });
  }

  const selection = readJson(paths.selection);
  const decisions = selection.decisions ?? {};
  const expectedIds = new Set(expectedRows.map((row) => row.ledgerId));
  const actualIds = new Set(Object.keys(decisions));

  if (selection.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("final-state selection dirty-map signature is stale");
  }
  if (selection.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("final-state selection expanded dirty entry count is stale");
  }
  if (selection.ownerPackageApprovalRequestsGeneratedAt !== ownerApprovals.generatedAt) {
    failures.push("final-state selection owner package approval timestamp is stale");
  }
  if (selection.physicalLifecycleApprovalRequestsGeneratedAt !== physicalApprovals.generatedAt) {
    failures.push("final-state selection physical lifecycle approval timestamp is stale");
  }
  if (actualIds.size !== expectedRows.length) {
    failures.push(`final-state selection row count mismatch: selection ${actualIds.size}, expected ${expectedRows.length}`);
  }

  for (const expected of expectedRows) validateDecision(expected, decisions[expected.ledgerId], failures);
  for (const id of actualIds) {
    if (!expectedIds.has(id)) failures.push(`unexpected final-state selection row: ${id}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    selectionPath: paths.selection,
    missingSelection: false,
    decisionCount: expectedRows.length,
    summary: summarize(expectedRows, decisions, false),
    failures,
    decisions: expectedRows.map((expected) => ({
      ledgerId: expected.ledgerId,
      sourceKind: expected.sourceKind,
      selectedFinalState: decisions[expected.ledgerId]?.selectedFinalState ?? ""
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state selection gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Selection file: ${payload.missingSelection ? "missing" : "present"}`);
    console.log(`Template decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Complete selections: ${payload.summary?.complete ?? 0}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state selection gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
