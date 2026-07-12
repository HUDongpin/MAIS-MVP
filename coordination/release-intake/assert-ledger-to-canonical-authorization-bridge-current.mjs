#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS,
  buildLedgerToCanonicalAuthorizationBridge,
  stableLedgerToCanonicalAuthorizationBridgeProjection
} from "./generate-ledger-to-canonical-authorization-bridge.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-ledger-to-canonical-authorization-bridge-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestJson,
    LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestJson);
  const current = buildLedgerToCanonicalAuthorizationBridge();
  if (!sameJson(
    stableLedgerToCanonicalAuthorizationBridgeProjection(recorded),
    stableLedgerToCanonicalAuthorizationBridgeProjection(current)
  )) {
    failures.push("A25 ledger-to-canonical authorization bridge is stale");
  }

  const summary = recorded.summary ?? {};
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("sourceCurrentnessFailures must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if ((summary.ledgerApprovedRows ?? 0) !== (summary.ledgerBackedCanonicalRows ?? 0) + (summary.ledgerBackedPendingCanonicalRows ?? 0) + (summary.missingCanonicalDraftRows ?? 0)) {
    failures.push("ledger approved rows must equal accepted plus pending plus missing draft rows");
  }
  if ((recorded.bridgeRows ?? []).length !== (summary.ledgerBackedPendingCanonicalRows ?? 0)) {
    failures.push("bridgeRows length must match ledgerBackedPendingCanonicalRows");
  }
  for (const row of recorded.bridgeRows ?? []) {
    if (!row.approvalId) failures.push("bridge row missing approvalId");
    if (!row.selectedFinalState) failures.push(`${row.approvalId} missing selectedFinalState`);
    if (!row.canonicalAuthorizationText?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`${row.approvalId} canonicalAuthorizationText must include approvalId`);
    }
    if (!row.canonicalAuthorizationText?.includes(`selectedFinalState=${row.selectedFinalState}`)) {
      failures.push(`${row.approvalId} canonicalAuthorizationText must include selected final state`);
    }
    if (row.cleanupAuthorized === true) failures.push(`${row.approvalId} must not be cleanup-authorized`);
    if (row.executableNow === true) failures.push(`${row.approvalId} must not be executable`);
  }
  const boundary = recorded.boundary ?? {};
  for (const [field, expected] of Object.entries({
    evidenceOnly: true,
    recordsAuthorization: false,
    recordsExecutionInstruction: false,
    recordsOwnerApproval: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    destructiveGitAuthorized: false,
    deployAuthorized: false,
    dirtyRootDeployAuthorized: false,
    physicalCleanupAuthorized: false
  })) {
    if (boundary[field] !== expected) failures.push(`boundary.${field} must be ${expected}`);
  }
  const markdown = readText(LEDGER_TO_CANONICAL_AUTHORIZATION_BRIDGE_PATHS.latestMarkdown);
  for (const needle of [
    "A25 Ledger-To-Canonical Authorization Bridge",
    "evidence-only",
    "Ledger-Backed Pending Rows",
    "Copyable Canonical Authorization Texts",
    "Non-Ledger Draft Rows"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing text: ${needle}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    ledgerBackedPendingCanonicalRows: summary.ledgerBackedPendingCanonicalRows ?? 0,
    nonLedgerDraftRows: summary.nonLedgerDraftRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 ledger-to-canonical authorization bridge gate");
    console.log(`Ledger-backed pending canonical rows: ${payload.ledgerBackedPendingCanonicalRows ?? 0}`);
    console.log(`Non-ledger draft rows: ${payload.nonLedgerDraftRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 ledger-to-canonical authorization bridge gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
