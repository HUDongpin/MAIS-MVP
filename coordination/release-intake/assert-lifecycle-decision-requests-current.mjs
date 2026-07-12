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

function sameArray(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function main() {
  const failures = [];
  const dirtyMapPath = "coordination/release-intake/latest-A25-dirty-tree-map.json";
  const ledgerPath = "coordination/release-intake/latest-A25-lifecycle-decision-ledger.json";
  const indexPath = "coordination/release-intake/latest-A25-lifecycle-decision-request-index.json";

  for (const requiredPath of [dirtyMapPath, ledgerPath, indexPath]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) finish({ failures, requests: [] });

  const dirtyMap = readJson(dirtyMapPath);
  const ledger = readJson(ledgerPath);
  const index = readJson(indexPath);
  const ledgerDecisions = new Map((ledger.decisions ?? []).map((decision) => [decision.id, decision]));
  const indexRequests = new Map((index.requests ?? []).map((request) => [request.id, request]));

  if (index.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("decision request index dirty-map signature is stale");
  }
  if (index.ledgerDirtyMapStatusSignature !== ledger.dirtyMapStatusSignature) {
    failures.push("decision request index ledger signature is stale");
  }
  if (index.decisionCount !== ledger.decisionCount) {
    failures.push(`decisionCount mismatch: index ${index.decisionCount}, ledger ${ledger.decisionCount}`);
  }
  if (index.openDecisionCount !== ledger.openDecisionCount) {
    failures.push(`openDecisionCount mismatch: index ${index.openDecisionCount}, ledger ${ledger.openDecisionCount}`);
  }

  for (const id of ledgerDecisions.keys()) {
    if (!indexRequests.has(id)) failures.push(`missing decision request index row: ${id}`);
  }
  for (const id of indexRequests.keys()) {
    if (!ledgerDecisions.has(id)) failures.push(`unexpected decision request index row: ${id}`);
  }

  const checkedRequests = [];
  for (const [id, row] of indexRequests.entries()) {
    for (const filePath of [row.latestJson, row.latestMarkdown]) {
      if (!exists(filePath)) failures.push(`${id}: missing request artifact ${filePath}`);
    }
    if (!exists(row.latestJson)) continue;

    const request = readJson(row.latestJson);
    const ledgerDecision = ledgerDecisions.get(id);
    checkedRequests.push({ id, decisionStatus: request.decisionStatus, latestJson: row.latestJson });

    if (!ledgerDecision) continue;
    if (request.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      failures.push(`${id}: request dirty-map signature is stale`);
    }
    if (request.decisionStatus !== ledgerDecision.decisionStatus) {
      failures.push(`${id}: request decisionStatus does not match ledger`);
    }
    if (!sameArray(request.accountableOwners, ledgerDecision.accountableOwners)) {
      failures.push(`${id}: request accountableOwners do not match ledger`);
    }
    if (!sameArray(request.requiredFinalStates, ledgerDecision.requiredFinalStates)) {
      failures.push(`${id}: request requiredFinalStates do not match ledger`);
    }
    if (strict && pending(request.decisionStatus)) {
      failures.push(`open lifecycle decision request: ${id}`);
    }
  }

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    decisionCount: index.decisionCount,
    openDecisionCount: index.openDecisionCount,
    requestCount: index.requests?.length ?? 0,
    failures,
    requests: checkedRequests
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-lifecycle-decision-requests-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 lifecycle decision requests gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Requests: ${payload.requestCount ?? 0}`);
    console.log(`Open decisions: ${payload.openDecisionCount ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 lifecycle decision requests gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
