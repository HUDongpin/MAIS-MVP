#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  strictGate: "coordination/release-intake/latest-A25-dirty-worktree-remediation-strict-gate.json",
  worktreeLifecycleGate: "coordination/release-intake/latest-A25-worktree-lifecycle-gate.json",
  physicalBlockerCoverage: "coordination/release-intake/latest-A25-physical-lifecycle-blocker-coverage-current-gate.json",
  effectiveDispositionQueue: "coordination/release-intake/latest-A25-effective-disposition-queue.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  latestJson: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-remaining-strict-blocker-authorization-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-remaining-strict-blocker-authorization-packet.md`
};

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function statusSignatureOf(artifact) {
  return artifact?.statusSignature
    ?? artifact?.dirtyMapStatusSignature
    ?? artifact?.dirtyMap?.statusSignature
    ?? artifact?.overlay?.dirtyMapStatusSignature
    ?? artifact?.artifacts?.dirtyMap?.statusSignature;
}

function requiredPhysicalDecision(row) {
  if (row.branch === "main") {
    return "Owner packages must be reviewed, committed/extracted, archived, or explicitly discarded before root can become a clean release source.";
  }
  if (row.state === "clean-diverged-open-decision") {
    return "Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch.";
  }
  return "Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling.";
}

function markdown(payload) {
  const strictRows = payload.remainingStrictBlockers.map((blocker) => {
    return `| ${blocker.id} | ${blocker.owner} | ${blocker.status} | ${blocker.authorizationNeeded} |`;
  }).join("\n");

  const physicalRows = payload.physicalLifecycleApprovalsNeeded.map((row) => {
    return `| \`${row.ledgerId}\` | ${row.branch} | ${row.state} | ${row.currentBlocker} | ${row.authorizationNeeded} |`;
  }).join("\n");

  return `# A25 Remaining Strict Blocker Authorization Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Strict remediation status: ${payload.strictResult}

Strict checks: ${payload.strictPassed}/${payload.strictTotal}

This packet is an authorization request, not authorization. It does not approve staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. A25/A22 must keep the dirty root out of release use until the strict gates pass.

## Remaining Strict Blockers

| Blocker | Owner | Status | Authorization needed |
| --- | --- | --- | --- |
${strictRows}

## Physical Lifecycle Decisions Still Requiring Action

| Ledger ID | Branch | State | Current blocker | Authorization needed |
| --- | --- | --- | --- | --- |
${physicalRows}

## Required Approval Shape

For any physical cleanup action, the owner must name the exact approval ID, branch/worktree/pathspec scope, selected action, evidence reviewed, approver, timestamp, and accepted risk. Commands must be executed only after that exact approval and only inside the approved scope.
`;
}

function main() {
  for (const requiredPath of [
    paths.dirtyMap,
    paths.strictGate,
    paths.worktreeLifecycleGate,
    paths.physicalBlockerCoverage,
    paths.effectiveDispositionQueue,
    paths.finalStateLedger,
    paths.actionRunbook
  ]) {
    if (!exists(requiredPath)) throw new Error(`Missing required file: ${requiredPath}`);
  }

  const dirtyMap = readJson(paths.dirtyMap);
  const strictGate = readJson(paths.strictGate);
  const lifecycleGate = readJson(paths.worktreeLifecycleGate);
  const coverage = readJson(paths.physicalBlockerCoverage);
  const dispositionQueue = readJson(paths.effectiveDispositionQueue);
  const finalStateLedger = readJson(paths.finalStateLedger);
  const actionRunbook = readJson(paths.actionRunbook);

  for (const [label, artifact] of [
    ["physical blocker coverage", coverage],
    ["effective disposition queue", dispositionQueue],
    ["final-state ledger", finalStateLedger],
    ["action runbook", actionRunbook]
  ]) {
    const signature = statusSignatureOf(artifact);
    if (signature !== dirtyMap.statusSignature) throw new Error(`${label} is stale relative to latest dirty map.`);
  }

  const failures = strictGate.failures ?? [];
  const expectedFailures = new Set(["A22 release-source clean gate failed", "A25 strict worktree lifecycle gate failed"]);
  const bootstrapFailures = new Set([
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
  ]);
  for (const failure of failures) {
    if (!expectedFailures.has(failure) && !bootstrapFailures.has(failure)) {
      throw new Error(`Unexpected strict blocker in latest strict gate: ${failure}`);
    }
  }

  const remainingStrictBlockers = [
    {
      id: "A22 release-source clean gate",
      owner: "A22 production reliability and release engineering",
      status: failures.includes("A22 release-source clean gate failed") ? "blocked" : "clear",
      evidence: [
        paths.dirtyMap,
        paths.effectiveDispositionQueue,
        paths.finalStateLedger
      ],
      authorizationNeeded: "Root must become clean through reviewed owner-package commits, exact-path discards, archives, or retained blockers before any release-source use."
    },
    {
      id: "A25 strict worktree lifecycle gate",
      owner: "A25 git hygiene and release intake",
      status: failures.includes("A25 strict worktree lifecycle gate failed") ? "blocked" : "clear",
      evidence: [
        paths.worktreeLifecycleGate,
        paths.physicalBlockerCoverage,
        paths.actionRunbook
      ],
      authorizationNeeded: "Every live dirty or diverged worktree needs owner-approved commit/extraction, archive, retirement, removal, or continued blocker disposition."
    }
  ];

  const physicalLifecycleApprovalsNeeded = (coverage.covered ?? []).map((row) => ({
    ...row,
    authorizationNeeded: requiredPhysicalDecision(row),
    cleanupAuthorized: false
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    strictResult: strictGate.result,
    strictGateCurrentnessSnapshot: {
      currentTotal: strictGate.summary?.currentTotal ?? null,
      currentPassed: strictGate.summary?.currentPassed ?? null,
      note: "Informational only. The remaining-strict packet currentness gate is self-referential inside the strict aggregate, so blocker authorization validity does not depend on this count."
    },
    strictTotal: strictGate.summary?.strictTotal ?? null,
    strictPassed: strictGate.summary?.strictPassed ?? null,
    worktreeCount: lifecycleGate.worktreeCount,
    liveOpenDecisions: coverage.openDecisionCount,
    coveredBlockerRows: coverage.coveredCount,
    releaseSourceDirtyEntries: dirtyMap.statusCounts.expandedStatusEntries,
    cleanupAuthorized: false,
    note: "Authorization request only. No cleanup, deploy, staging, commit, reset, restore, clean, worktree removal, prune, branch deletion, tag, or push is approved by this artifact.",
    remainingStrictBlockers,
    physicalLifecycleApprovalsNeeded
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    strictResult: payload.strictResult,
    remainingStrictBlockers: payload.remainingStrictBlockers.filter((blocker) => blocker.status === "blocked").length,
    physicalLifecycleApprovalsNeeded: payload.physicalLifecycleApprovalsNeeded.length,
    cleanupAuthorized: payload.cleanupAuthorized
  }, null, 2));
}

main();
