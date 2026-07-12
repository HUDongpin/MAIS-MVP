#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  wave01Resync: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  executionSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  readinessMatrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  blockerRouting: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-approval-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-approval-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-approval-packet.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function ensureCurrent(label, artifact, dirtyMap) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error(`${label} dirty-map signature is stale.`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error(`${label} expanded dirty entry count is stale.`);
  }
}

function compactOwnerApproval(row) {
  return {
    approvalId: row.approvalId,
    owner: row.owner,
    priority: row.priority,
    entries: row.entries,
    packageKind: row.packageKind,
    currentBlocker: row.currentBlocker,
    pathspec: row.pathspec,
    workOrder: row.workOrder,
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactPhysicalApproval(row) {
  return {
    approvalId: row.approvalId,
    branch: row.branch,
    path: row.path,
    state: row.state,
    queueKind: row.queueKind,
    currentBlocker: row.currentBlocker,
    ownerHints: row.ownerHints,
    evidence: row.evidence,
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactWave(wave) {
  return {
    waveIndex: wave.waveIndex,
    waveId: wave.waveId,
    name: wave.name,
    planTasks: wave.planTasks,
    blockedUntil: wave.blockedUntil,
    summary: wave.summary,
    ownerApprovalIds: wave.ownerApprovals.map((row) => row.approvalId),
    physicalApprovalIds: wave.physicalLifecycleApprovals.map((row) => row.approvalId)
  };
}

function makePacket() {
  const dirtyMap = readJson(paths.dirtyMap);
  const completionAudit = readJson(paths.completionAudit);
  const wave01Resync = readJson(paths.wave01Resync);
  const physicalQueue = readJson(paths.physicalQueue);
  const executionSequence = readJson(paths.executionSequence);
  const readinessMatrix = readJson(paths.readinessMatrix);
  const blockerRouting = readJson(paths.blockerRouting);

  ensureCurrent("completion audit", completionAudit, dirtyMap);
  ensureCurrent("Wave 01 resync approval requests", wave01Resync, dirtyMap);
  ensureCurrent("physical closure authorization queue", physicalQueue, dirtyMap);
  ensureCurrent("closure execution sequence", executionSequence, dirtyMap);
  ensureCurrent("owner package readiness blocker matrix", readinessMatrix, dirtyMap);
  ensureCurrent("owner package blocker routing", blockerRouting, dirtyMap);

  const packageResyncApprovals = (wave01Resync.requests ?? []).map((row) => ({
    approvalId: row.approvalId,
    owner: row.owner,
    path: row.path,
    worktreePath: row.worktreePath,
    branch: row.branch,
    actionKind: row.actionKind,
    commandHint: row.commandHint,
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks,
    cleanupAuthorized: false,
    executableNow: false
  }));
  const ownerPackageApprovals = (physicalQueue.ownerPackageQueue ?? []).map(compactOwnerApproval);
  const physicalLifecycleApprovals = (physicalQueue.physicalLifecycleQueue ?? []).map(compactPhysicalApproval);
  const waves = (executionSequence.waves ?? []).map(compactWave);

  return {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    rootStatusEntries: completionAudit.rootStatusEntries,
    cleanupAuthorized: false,
    executableNow: false,
    completion: {
      complete: completionAudit.complete,
      summary: completionAudit.summary,
      incompleteRequirements: (completionAudit.requirements ?? [])
        .filter((row) => !row.passed)
        .map((row) => ({ id: row.id, label: row.label, status: row.status })),
      incompletePlanTasks: (completionAudit.planTasks ?? [])
        .filter((row) => row.status !== "complete")
        .map((row) => ({
          id: row.id,
          label: row.label,
          status: row.status,
          blockingReasons: row.blockingReasons
        }))
    },
    nextApprovalSummary: {
      packageResyncApprovals: packageResyncApprovals.length,
      ownerPackageApprovals: ownerPackageApprovals.length,
      physicalLifecycleApprovals: physicalLifecycleApprovals.length,
      totalApprovalIds: packageResyncApprovals.length + ownerPackageApprovals.length + physicalLifecycleApprovals.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    recommendedOrder: [
      {
        order: 1,
        queue: "wave01-package-resync",
        reason: "Clear package-worktree-only stale entries before the A25/A10/A22 governance package can be reviewed.",
        approvalIds: packageResyncApprovals.map((row) => row.approvalId)
      },
      {
        order: 2,
        queue: "owner-package-approvals",
        reason: "Owner package final-state approvals are required before root dirty entries can move to reviewed commits, exact-path discards, evidence archives, or blockers.",
        approvalIds: ownerPackageApprovals.map((row) => row.approvalId)
      },
      {
        order: 3,
        queue: "physical-lifecycle-approvals",
        reason: "Linked worktrees and diverged branches need explicit lifecycle final-state choices before strict lifecycle can pass.",
        approvalIds: physicalLifecycleApprovals.map((row) => row.approvalId)
      }
    ],
    packageReadiness: {
      summary: readinessMatrix.summary,
      topTypeCheckFiles: (readinessMatrix.summary?.topTypeCheckFiles ?? []).slice(0, 12)
    },
    blockerRouting: {
      summary: blockerRouting.summary,
      topRoutingOwners: (blockerRouting.summary?.topRoutingOwners ?? []).slice(0, 12)
    },
    waves,
    packageResyncApprovals,
    ownerPackageApprovals,
    physicalLifecycleApprovals
  };
}

function markdown(payload) {
  const orderRows = payload.recommendedOrder.map((row) => (
    `| ${row.order} | ${row.queue} | ${row.approvalIds.length} | ${row.reason} |`
  )).join("\n");
  const resyncRows = payload.packageResyncApprovals.map((row) => (
    `| \`${row.approvalId}\` | ${row.owner} | \`${row.path}\` | ${row.actionKind} | \`${row.commandHint}\` |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a |";
  const ownerRows = payload.ownerPackageApprovals.slice(0, 12).map((row) => (
    `| \`${row.approvalId}\` | ${row.owner} | P${row.priority} | ${row.entries} | ${row.currentBlocker} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a |";
  const physicalRows = payload.physicalLifecycleApprovals.slice(0, 12).map((row) => (
    `| \`${row.approvalId}\` | \`${row.branch}\` | ${row.state} | ${row.currentBlocker} | ${row.ownerHints.join(", ")} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a |";
  const waveRows = payload.waves.map((wave) => (
    `| ${wave.waveIndex} | ${wave.waveId} | ${wave.ownerApprovalIds.length} | ${wave.physicalApprovalIds.length} | ${wave.blockedUntil} |`
  )).join("\n");
  const blockerRows = payload.blockerRouting.topRoutingOwners.map((row) => (
    `| ${row.ownerId} | ${row.owner} | ${row.routeRows} | ${row.files} | ${row.errors} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a |";
  const typeRows = payload.packageReadiness.topTypeCheckFiles.map((row) => (
    `| \`${row.file}\` | ${row.errors} |`
  )).join("\n") || "| none | 0 |";

  return `# A25 Next Owner Approval Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Root status entries: ${payload.rootStatusEntries}

This packet is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup. Every approval row remains non-executable until the owner explicitly authorizes the exact approval ID and selected final state or command.

## Summary

- Completion: ${payload.completion.complete ? "complete" : "not complete"}
- Requirements complete: ${payload.completion.summary.completedRequirements}/${payload.completion.summary.totalRequirements}
- Plan tasks complete: ${payload.completion.summary.completedPlanTasks}/${payload.completion.summary.totalPlanTasks}
- Package resync approvals: ${payload.nextApprovalSummary.packageResyncApprovals}
- Owner package approvals: ${payload.nextApprovalSummary.ownerPackageApprovals}
- Physical lifecycle approvals: ${payload.nextApprovalSummary.physicalLifecycleApprovals}
- Cleanup-authorized rows: ${payload.nextApprovalSummary.cleanupAuthorizedRows}
- Executable rows: ${payload.nextApprovalSummary.executableRows}

## Recommended Approval Order

| Order | Queue | Approval IDs | Reason |
| ---: | --- | ---: | --- |
${orderRows}

## Immediate Wave 01 Package Resync Approvals

| Approval ID | Owner | Path | Action kind | Command hint |
| --- | --- | --- | --- | --- |
${resyncRows}

## First Owner Package Approvals

Showing first 12 of ${payload.ownerPackageApprovals.length}.

| Approval ID | Owner | Priority | Entries | Current blocker |
| --- | --- | ---: | ---: | --- |
${ownerRows}

## First Physical Lifecycle Approvals

Showing first 12 of ${payload.physicalLifecycleApprovals.length}.

| Approval ID | Branch | State | Current blocker | Owner hints |
| --- | --- | --- | --- | --- |
${physicalRows}

## Wave Sequence

| Wave | ID | Owner approvals | Physical approvals | Blocked until |
| ---: | --- | ---: | ---: | --- |
${waveRows}

## Top Cross-Owner Routing Owners

| Owner ID | Owner | Route rows | Files | Type errors |
| --- | --- | ---: | ---: | ---: |
${blockerRows}

## Top Type-Check Files

| File | Errors |
| --- | ---: |
${typeRows}
`;
}

function main() {
  const payload = makePacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, markdown(payload));
  write(paths.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    packageResyncApprovals: payload.nextApprovalSummary.packageResyncApprovals,
    ownerPackageApprovals: payload.nextApprovalSummary.ownerPackageApprovals,
    physicalLifecycleApprovals: payload.nextApprovalSummary.physicalLifecycleApprovals,
    cleanupAuthorizedRows: payload.nextApprovalSummary.cleanupAuthorizedRows,
    executableRows: payload.nextApprovalSummary.executableRows
  }, null, 2));
}

main();
