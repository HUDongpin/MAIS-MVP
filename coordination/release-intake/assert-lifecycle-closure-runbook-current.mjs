#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pending(status) {
  return String(status ?? "").startsWith("pending");
}

function main() {
  const failures = [];
  const paths = {
    dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
    ledger: "coordination/release-intake/latest-A25-lifecycle-decision-ledger.json",
    requestIndex: "coordination/release-intake/latest-A25-lifecycle-decision-request-index.json",
    runbook: "coordination/release-intake/latest-A25-lifecycle-closure-runbook.json",
    runbookMarkdown: "coordination/release-intake/latest-A25-lifecycle-closure-runbook.md"
  };

  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) finish({ failures, closurePlans: [] });

  const dirtyMap = readJson(paths.dirtyMap);
  const ledger = readJson(paths.ledger);
  const requestIndex = readJson(paths.requestIndex);
  const runbook = readJson(paths.runbook);
  const ledgerDecisionIds = new Set((ledger.decisions ?? []).map((decision) => decision.id));
  const runbookPlans = new Map((runbook.closurePlans ?? []).map((plan) => [plan.id, plan]));

  if (runbook.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("closure runbook dirty-map signature is stale");
  }
  if (runbook.ledgerDirtyMapStatusSignature !== ledger.dirtyMapStatusSignature) {
    failures.push("closure runbook ledger signature is stale");
  }
  if (runbook.requestIndexDirtyMapStatusSignature !== requestIndex.dirtyMapStatusSignature) {
    failures.push("closure runbook request-index signature is stale");
  }
  if (runbook.decisionCount !== ledger.decisionCount) {
    failures.push(`decisionCount mismatch: runbook ${runbook.decisionCount}, ledger ${ledger.decisionCount}`);
  }
  if (runbook.openDecisionCount !== ledger.openDecisionCount) {
    failures.push(`openDecisionCount mismatch: runbook ${runbook.openDecisionCount}, ledger ${ledger.openDecisionCount}`);
  }

  for (const id of ledgerDecisionIds) {
    if (!runbookPlans.has(id)) failures.push(`missing closure plan: ${id}`);
  }
  for (const id of runbookPlans.keys()) {
    if (!ledgerDecisionIds.has(id)) failures.push(`unexpected closure plan: ${id}`);
  }

  for (const [id, plan] of runbookPlans.entries()) {
    if (!Array.isArray(plan.allowedClosureOptions) || plan.allowedClosureOptions.length === 0) {
      failures.push(`${id}: missing allowed closure options`);
    }
    if (!Array.isArray(plan.afterApprovalVerification) || plan.afterApprovalVerification.length === 0) {
      failures.push(`${id}: missing after approval verification`);
    }
    if (!plan.requestPacket || !exists(plan.requestPacket)) {
      failures.push(`${id}: missing request packet ${plan.requestPacket || "(empty)"}`);
    }
    if (strict && pending(plan.status)) failures.push(`open lifecycle closure plan: ${id}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    decisionCount: runbook.decisionCount,
    openDecisionCount: runbook.openDecisionCount,
    closurePlanCount: runbook.closurePlans?.length ?? 0,
    failures,
    closurePlans: [...runbookPlans.values()].map((plan) => ({
      id: plan.id,
      status: plan.status,
      requestPacket: plan.requestPacket
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-lifecycle-closure-runbook-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 lifecycle closure runbook gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Closure plans: ${payload.closurePlanCount ?? 0}`);
    console.log(`Open decisions: ${payload.openDecisionCount ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 lifecycle closure runbook gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
