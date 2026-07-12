#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerPackageApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  templateMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.md"
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

function validateDecision(id, expected, actual, failures) {
  if (!actual) {
    failures.push(`missing selection template row: ${id}`);
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
  if (!sameJson(actual.evidenceReviewed, expected.evidenceReviewed)) failures.push(`${id}: evidenceReviewed is stale`);
  if (actual.selectedFinalState !== "") failures.push(`${id}: template selectedFinalState must be blank`);
  if (actual.approvedBy !== "") failures.push(`${id}: template approvedBy must be blank`);
  if (actual.approvedAt !== "") failures.push(`${id}: template approvedAt must be blank`);
  if (actual.ownerDecision !== "") failures.push(`${id}: template ownerDecision must be blank`);

  for (const evidencePath of actual.evidenceReviewed ?? []) {
    if (String(evidencePath).includes("undefined")) failures.push(`${id}: evidence path contains undefined`);
    if (!exists(evidencePath)) failures.push(`${id}: missing evidence file ${evidencePath}`);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, decisionCount: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerPackageApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const template = readJson(paths.template);
  const decisions = template.decisions ?? {};

  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("selection template dirty-map signature is stale");
  }
  if (template.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    failures.push("selection template expanded dirty entry count is stale");
  }
  if (template.ownerPackageApprovalRequestsGeneratedAt !== ownerApprovals.generatedAt) {
    failures.push("selection template owner package approval timestamp is stale");
  }
  if (template.physicalLifecycleApprovalRequestsGeneratedAt !== physicalApprovals.generatedAt) {
    failures.push("selection template physical lifecycle approval timestamp is stale");
  }

  const expectedRows = [
    ...(ownerApprovals.requests ?? []).map(expectedOwnerDecision),
    ...(physicalApprovals.requests ?? []).map(expectedPhysicalDecision)
  ];
  const expectedIds = new Set(expectedRows.map((decision) => decision.ledgerId));
  const actualIds = new Set(Object.keys(decisions));

  if (actualIds.size !== expectedRows.length) {
    failures.push(`selection template row count mismatch: template ${actualIds.size}, expected ${expectedRows.length}`);
  }
  for (const expected of expectedRows) validateDecision(expected.ledgerId, expected, decisions[expected.ledgerId], failures);
  for (const id of actualIds) {
    if (!expectedIds.has(id)) failures.push(`unexpected selection template row: ${id}`);
  }

  const expectedSummary = summarize(expectedRows);
  if (!sameJson(template.summary, expectedSummary)) failures.push("selection template summary is stale");

  const markdown = fs.readFileSync(path.join(root, paths.templateMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("selection template markdown contains undefined");
  if (!markdown.includes(template.selectionTarget ?? "")) failures.push("selection template markdown does not name selection target");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    selectionTarget: template.selectionTarget,
    decisionCount: expectedRows.length,
    summary: template.summary,
    failures,
    decisions: expectedRows.map((decision) => ({
      ledgerId: decision.ledgerId,
      sourceKind: decision.sourceKind,
      allowedFinalStates: decision.allowedFinalStates
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-dirty-worktree-final-state-selection-template-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree final-state selection template gate");
    console.log(`Template decisions: ${payload.decisionCount ?? 0}`);
    console.log(`Expanded dirty entries: ${payload.expandedStatusEntries ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree final-state selection template gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
