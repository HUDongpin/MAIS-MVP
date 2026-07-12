#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-remaining-strict-blocker-authorization-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  strictGate: "coordination/release-intake/latest-A25-dirty-worktree-remediation-strict-gate.json",
  worktreeLifecycleGate: "coordination/release-intake/latest-A25-worktree-lifecycle-gate.json",
  physicalBlockerCoverage: "coordination/release-intake/latest-A25-physical-lifecycle-blocker-coverage-current-gate.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  packet: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  packetMarkdown: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.md"
};

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

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, physicalLifecycleApprovalsNeeded: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const strictGate = readJson(paths.strictGate);
  const lifecycleGate = readJson(paths.worktreeLifecycleGate);
  const coverage = readJson(paths.physicalBlockerCoverage);
  const ledger = readJson(paths.finalStateLedger);
  const runbook = readJson(paths.actionRunbook);
  const packet = readJson(paths.packet);

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded status count is stale");
  if (packet.strictResult !== strictGate.result) failures.push("packet strict result is stale");
  if (packet.strictTotal !== strictGate.summary?.strictTotal) failures.push("packet strictTotal is stale");
  if (packet.strictPassed !== strictGate.summary?.strictPassed) failures.push("packet strictPassed is stale");
  if (packet.worktreeCount !== lifecycleGate.worktreeCount) failures.push("packet worktreeCount is stale");
  if (packet.liveOpenDecisions !== coverage.openDecisionCount) failures.push("packet liveOpenDecisions is stale");
  if (packet.coveredBlockerRows !== coverage.coveredCount) failures.push("packet coveredBlockerRows is stale");
  if (packet.releaseSourceDirtyEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet releaseSourceDirtyEntries is stale");
  if (packet.cleanupAuthorized !== false) failures.push("packet cleanupAuthorized must be false");

  const strictFailures = strictGate.failures ?? [];
  const expectedFailures = ["A22 release-source clean gate failed", "A25 strict worktree lifecycle gate failed"];
  const bootstrapFailures = [
    "A25 dirty-tree map current failed",
    "A25 physical lifecycle blocker coverage current failed",
    "A25 remaining strict blocker authorization packet current failed",
    "A25 physical closure authorization queue current failed",
    "A25 dirty-worktree closure execution sequence current failed",
    "A25 dirty-worktree blocker report index current failed",
    "A25 owner package readiness blocker matrix current failed",
    "A25 owner package blocker routing current failed",
    "A25 next owner approval packet current failed",
    "A25 Wave 01 governance readiness current failed",
    "A25 Wave 01 package resync approval requests current failed",
    "A25 Wave 02 shared contract readiness current failed",
    "A25 Wave 03 shell dashboard roadmap readiness current failed",
    "A25 Wave 04 practice lesson content readiness current failed",
    "A25 Wave 05 visualization AI runtime readiness current failed",
    "A25 Wave 06 final root lifecycle readiness current failed",
    "A25 linked-worktree archive evidence current failed",
    "A25 dirty-worktree remediation refresh runner current failed",
    "A25 no dirty root deploy evidence current failed",
    "A25 dirty-worktree remediation completion audit current failed"
  ];
  for (const expected of expectedFailures) {
    if (!strictFailures.includes(expected)) failures.push(`strict gate missing expected remaining blocker: ${expected}`);
  }
  for (const failure of strictFailures) {
    if (!expectedFailures.includes(failure) && !bootstrapFailures.includes(failure)) {
      failures.push(`unexpected strict blocker: ${failure}`);
    }
  }

  const blockedRows = (packet.remainingStrictBlockers ?? []).filter((blocker) => blocker.status === "blocked");
  if (blockedRows.length !== expectedFailures.length) failures.push(`blocked strict rows mismatch: ${blockedRows.length}`);
  if ((packet.physicalLifecycleApprovalsNeeded ?? []).length !== coverage.openDecisionCount) {
    failures.push("physical lifecycle authorization row count is stale");
  }

  const coveredByLedgerId = new Map((coverage.covered ?? []).map((row) => [row.ledgerId, row]));
  const ledgerById = new Map((ledger.entries ?? []).map((entry) => [entry.ledgerId, entry]));
  const actionById = new Map((runbook.actions ?? []).map((action) => [action.ledgerId, action]));
  for (const row of packet.physicalLifecycleApprovalsNeeded ?? []) {
    const covered = coveredByLedgerId.get(row.ledgerId);
    const ledgerRow = ledgerById.get(row.ledgerId);
    const action = actionById.get(row.ledgerId);
    if (!covered) failures.push(`${row.ledgerId}: no matching coverage row`);
    else {
      for (const key of ["branch", "state", "currentBlocker", "selectedFinalState", "actionKind"]) {
        if (row[key] !== covered[key]) failures.push(`${row.ledgerId}: ${key} is stale`);
      }
    }
    if (!String(ledgerRow?.decisionStatus ?? "").startsWith("approved-")) failures.push(`${row.ledgerId}: ledger row must be approved`);
    if (!ledgerRow?.allowedFinalStates?.includes(ledgerRow?.selectedFinalState)) failures.push(`${row.ledgerId}: ledger row selected final state must be allowed`);
    if (action?.executableNow !== false) failures.push(`${row.ledgerId}: action row must remain non-executable`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.ledgerId}: cleanupAuthorized must be false`);
    if (!row.authorizationNeeded) failures.push(`${row.ledgerId}: authorizationNeeded is required`);
  }

  const markdown = fs.readFileSync(path.join(root, paths.packetMarkdown), "utf8");
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes("This packet is an authorization request, not authorization")) {
    failures.push("packet markdown missing non-authorization boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    strictResult: strictGate.result,
    remainingStrictBlockers: blockedRows.length,
    physicalLifecycleApprovalsNeeded: packet.physicalLifecycleApprovalsNeeded?.length ?? 0,
    cleanupAuthorized: packet.cleanupAuthorized,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 remaining strict blocker authorization packet gate");
    console.log(`Remaining strict blockers: ${payload.remainingStrictBlockers ?? 0}`);
    console.log(`Physical approvals needed: ${payload.physicalLifecycleApprovalsNeeded ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 remaining strict blocker authorization packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
