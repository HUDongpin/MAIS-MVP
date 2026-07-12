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

function repoRelative(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function lifecycleOptions(decision) {
  if (decision.id === "root-dirty-packages") {
    return [
      "Owner-reviewed commit: each effective owner works from its pathspec package, validates its own scope, and commits only that approved slice from an isolated branch/worktree.",
      "Owner-approved discard: owner provides explicit written approval for exact paths; A25 archives evidence first, then a separately authorized Git operation may discard that slice.",
      "Evidence archive: keep package out of runtime release and preserve pathspec/work-order evidence as the final state.",
      "Blocker: owner records why the package cannot be committed, discarded, or archived yet."
    ];
  }

  if (decision.id === "dirty-visualization-production-release") {
    return [
      "Reviewed package: A06/A22 inspect the archived patch and dirty worktree, then decide whether to produce a PR/review package.",
      "Owner-approved discard: A06/A22/A10 approve exact discard/removal after confirming the archive is current.",
      "Evidence archive with worktree removal blocker: preserve archive and leave cleanup blocked if semantic review is incomplete.",
      "Blocker: record missing evidence, ownership disagreement, or release-risk reason."
    ];
  }

  return [
    "PR candidate: owning sessions review the branch archive and produce a clean PR or reviewed slice.",
    "Archive tag: owner records the branch as preserved evidence and blocks merge/deploy use.",
    "Owner-approved branch retirement: owner approves branch/worktree retirement after evidence is current.",
    "Blocker: record why the branch cannot be promoted, archived, or retired yet."
  ];
}

function closurePlan(decision, requestIndex, queue) {
  const request = requestIndex.requests.find((item) => item.id === decision.id);
  const relatedOwners = new Set(decision.accountableOwners.map((owner) => owner.slice(0, 3)));
  const relatedWorkOrders = decision.id === "root-dirty-packages"
    ? queue.queue.map((item) => item.workOrder)
    : queue.queue.filter((item) => relatedOwners.has(item.owner.slice(0, 3))).map((item) => item.workOrder);

  return {
    id: decision.id,
    title: decision.title,
    status: decision.decisionStatus,
    accountableOwners: decision.accountableOwners,
    requestPacket: request?.latestMarkdown ?? "",
    allowedClosureOptions: lifecycleOptions(decision),
    relatedWorkOrders,
    requiredApprovalFields: [
      "selectedFinalState",
      "ownerDecision",
      "approvedBy",
      "approvedAt",
      "evidenceLinks"
    ],
    nonDestructiveBeforeApproval: [
      "Refresh dirty map and lifecycle evidence.",
      "Confirm request packet is current.",
      "Confirm evidence archives remain current.",
      "Do not stage, commit, branch, push, delete, reset, revert, clean, or deploy."
    ],
    afterApprovalVerification: [
      "Apply only the owner-approved action, in the owner-approved scope.",
      "Refresh dirty map and dependent A25 artifacts.",
      "Run normal A25 gates.",
      "Run strict lifecycle gates and confirm this decision no longer appears as pending."
    ]
  };
}

function markdown(payload) {
  const rows = payload.closurePlans.map((plan) => {
    return `| ${plan.id} | ${plan.status} | ${plan.accountableOwners.join(", ")} | \`${plan.requestPacket}\` |`;
  }).join("\n");

  const sections = payload.closurePlans.map((plan) => {
    return `## ${plan.id}

Status: \`${plan.status}\`

Accountable owners: ${plan.accountableOwners.join(", ")}

Request packet: \`${plan.requestPacket}\`

Allowed closure options:

${plan.allowedClosureOptions.map((item) => `- ${item}`).join("\n")}

Required approval fields:

${plan.requiredApprovalFields.map((item) => `- ${item}`).join("\n")}

Non-destructive before approval:

${plan.nonDestructiveBeforeApproval.map((item) => `- ${item}`).join("\n")}

After approval verification:

${plan.afterApprovalVerification.map((item) => `- ${item}`).join("\n")}

Related work orders:

${plan.relatedWorkOrders.length > 0 ? plan.relatedWorkOrders.map((item) => `- \`${item}\``).join("\n") : "- No direct effective work order; use request evidence archive."}
`;
  }).join("\n");

  return `# ${date} A25 Lifecycle Closure Runbook

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Open lifecycle decisions: ${payload.openDecisionCount}

## Decision Index

| Decision ID | Status | Accountable owners | Request packet |
| --- | --- | --- | --- |
${rows}

## Global Closure Gates

${payload.globalClosureGates.map((item) => `- \`${item}\``).join("\n")}

## Global Stop Conditions

${payload.globalStopConditions.map((item) => `- ${item}`).join("\n")}

${sections}
`;
}

function main() {
  const dirtyMap = readJson("latest-A25-dirty-tree-map.json");
  const ledger = readJson("latest-A25-lifecycle-decision-ledger.json");
  const requestIndex = readJson("latest-A25-lifecycle-decision-request-index.json");
  const queue = readJson("latest-A25-effective-disposition-queue.json");

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    ledgerDirtyMapStatusSignature: ledger.dirtyMapStatusSignature,
    requestIndexDirtyMapStatusSignature: requestIndex.dirtyMapStatusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    decisionCount: ledger.decisionCount,
    openDecisionCount: ledger.openDecisionCount,
    globalClosureGates: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60 --json",
      "node coordination/release-intake/assert-effective-disposition-queue-current.mjs",
      "node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs",
      "node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs",
      "node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs",
      "node coordination/release-intake/assert-worktree-lifecycle.mjs --strict",
      "node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs --strict",
      "node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs --strict",
      "node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs --strict"
    ],
    globalStopConditions: [
      "Owner approval is absent for a destructive Git operation.",
      "Dirty root is requested as a release source.",
      "A request packet, evidence archive, or pathspec is stale.",
      "A cleanup action would mix runtime code, content backlog, test evidence, and coordination evidence.",
      "Strict lifecycle gates still report open decisions."
    ],
    closurePlans: ledger.decisions.map((decision) => closurePlan(decision, requestIndex, queue))
  };

  const latestJson = path.join(outDir, "latest-A25-lifecycle-closure-runbook.json");
  const latestMarkdown = path.join(outDir, "latest-A25-lifecycle-closure-runbook.md");
  const datedJson = path.join(outDir, `${date}-A25-lifecycle-closure-runbook.json`);
  const datedMarkdown = path.join(outDir, `${date}-A25-lifecycle-closure-runbook.md`);

  fs.writeFileSync(latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(latestMarkdown, markdown(payload));
  fs.writeFileSync(datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: repoRelative(latestJson),
    latestMarkdown: repoRelative(latestMarkdown),
    decisionCount: payload.decisionCount,
    openDecisionCount: payload.openDecisionCount
  }, null, 2));
}

main();
