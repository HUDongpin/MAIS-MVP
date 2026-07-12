#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalApprovals: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  actionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  remainingStrictPacket: "coordination/release-intake/latest-A25-remaining-strict-blocker-authorization-packet.json",
  latestJson: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  latestMarkdown: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.md",
  datedJson: `coordination/release-intake/${date}-A25-physical-closure-authorization-queue.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-physical-closure-authorization-queue.md`
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

function ownerAuthorizationText(request) {
  return `Authorize approvalId=${request.approvalId} for owner=${request.owner}; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=${request.latestPathspec}, ${request.workOrder}; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.`;
}

function physicalAuthorizationText(request) {
  return `Authorize approvalId=${request.approvalId} for branch=${request.branch}; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=${request.evidence.join(", ")}; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.`;
}

function ownerPostChecks(request) {
  return [
    `node coordination/release-intake/review-owner-pathspec.mjs ${request.latestPathspec} --status`,
    `npm run release:dirty-map -- --reason "A25 post-owner-approval ${request.approvalId}"`,
    "node coordination/release-intake/assert-owner-package-approval-requests-current.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
  ];
}

function physicalPostChecks(request) {
  return [
    "node coordination/release-intake/worktree-hygiene-dashboard.mjs",
    `npm run release:dirty-map -- --reason "A25 post-physical-approval ${request.approvalId}"`,
    "node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs",
    "node coordination/release-intake/assert-worktree-lifecycle.mjs",
    "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
  ];
}

function makeOwnerRows(ownerApprovals, actionRunbook) {
  const actionsByApprovalId = new Map((actionRunbook.actions ?? []).map((action) => [action.approvalId, action]));
  return (ownerApprovals.requests ?? [])
    .slice()
    .sort((left, right) => left.priority - right.priority || right.entries - left.entries || left.approvalId.localeCompare(right.approvalId))
    .map((request, index) => {
      const action = actionsByApprovalId.get(request.approvalId);
      return {
        queueIndex: index + 1,
        queueKind: "root-owner-package",
        approvalId: request.approvalId,
        owner: request.owner,
        priority: request.priority,
        entries: request.entries,
        packageKind: request.kind,
        currentBlocker: action?.currentBlocker ?? `root package has ${request.entries} dirty entries`,
        dominantSlice: request.dominantSlice,
        pathspec: request.latestPathspec,
        workOrder: request.workOrder,
        allowedFinalStates: request.allowedFinalStates.map((item) => item.selectedFinalState),
        requiredAuthorizationText: ownerAuthorizationText(request),
        postApprovalChecks: ownerPostChecks(request),
        cleanupAuthorized: false,
        executableNow: false
      };
    });
}

function makePhysicalRows(physicalApprovals, actionRunbook) {
  const actionsByApprovalId = new Map((actionRunbook.actions ?? []).map((action) => [action.approvalId, action]));
  return (physicalApprovals.requests ?? []).map((request, index) => {
    const action = actionsByApprovalId.get(request.approvalId);
    return {
      queueIndex: index + 1,
      queueKind: request.kind,
      approvalId: request.approvalId,
      branch: request.branch,
      path: request.path,
      state: request.state,
      currentBlocker: action?.currentBlocker ?? request.currentBlocker,
      ownerHints: request.ownerHints,
      evidence: request.evidence,
      allowedFinalStates: request.allowedFinalStates.map((item) => item.selectedFinalState),
      requiredAuthorizationText: physicalAuthorizationText(request),
      postApprovalChecks: physicalPostChecks(request),
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function summarize(ownerRows, physicalRows) {
  return {
    ownerPackageApprovals: ownerRows.length,
    physicalLifecycleApprovals: physicalRows.length,
    totalApprovals: ownerRows.length + physicalRows.length,
    ownerPackageEntries: ownerRows.reduce((sum, row) => sum + row.entries, 0),
    physicalRootApprovals: physicalRows.filter((row) => row.branch === "main").length,
    dirtyLinkedApprovals: physicalRows.filter((row) => row.state === "dirty-open-decision" && row.branch !== "main").length,
    cleanDivergedApprovals: physicalRows.filter((row) => row.state === "clean-diverged-open-decision").length,
    executableRows: [...ownerRows, ...physicalRows].filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: [...ownerRows, ...physicalRows].filter((row) => row.cleanupAuthorized).length
  };
}

function markdown(payload) {
  const ownerRows = payload.ownerPackageQueue.map((row) => {
    return `| ${row.queueIndex} | \`${row.approvalId}\` | ${row.owner} | P${row.priority} | ${row.entries} | \`${row.pathspec}\` |`;
  }).join("\n");

  const physicalRows = payload.physicalLifecycleQueue.map((row) => {
    return `| ${row.queueIndex} | \`${row.approvalId}\` | \`${row.branch}\` | ${row.queueKind} | ${row.currentBlocker} | ${row.ownerHints.join(", ")} |`;
  }).join("\n");

  const ownerSections = payload.ownerPackageQueue.slice(0, 8).map((row) => {
    return `### ${row.approvalId}

- Owner: ${row.owner}
- Entries: ${row.entries}
- Pathspec: \`${row.pathspec}\`
- Work order: \`${row.workOrder}\`
- Authorization text:

\`\`\`text
${row.requiredAuthorizationText}
\`\`\`

- Post-approval checks:
${row.postApprovalChecks.map((item) => `  - \`${item}\``).join("\n")}
`;
  }).join("\n");

  const physicalSections = payload.physicalLifecycleQueue.slice(0, 8).map((row) => {
    return `### ${row.approvalId}

- Branch: \`${row.branch}\`
- Path: \`${row.path}\`
- Current blocker: ${row.currentBlocker}
- Owner hints: ${row.ownerHints.join(", ")}
- Authorization text:

\`\`\`text
${row.requiredAuthorizationText}
\`\`\`

- Post-approval checks:
${row.postApprovalChecks.map((item) => `  - \`${item}\``).join("\n")}
`;
  }).join("\n");

  return `# A25 Physical Closure Authorization Queue

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This artifact is authorization support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID and selected final state.

## Summary

- Owner package approval IDs: ${payload.summary.ownerPackageApprovals}
- Physical lifecycle approval IDs: ${payload.summary.physicalLifecycleApprovals}
- Total approval IDs: ${payload.summary.totalApprovals}
- Executable rows now: ${payload.summary.executableRows}
- Cleanup-authorized rows now: ${payload.summary.cleanupAuthorizedRows}
- Remaining strict blockers: ${payload.remainingStrictBlockers.join("; ")}

## Root Owner Package Queue

| Order | Approval ID | Owner | Priority | Entries | Pathspec |
| ---: | --- | --- | ---: | ---: | --- |
${ownerRows}

## Physical Lifecycle Queue

| Order | Approval ID | Branch | Kind | Current blocker | Owner hints |
| ---: | --- | --- | --- | --- | --- |
${physicalRows}

## First Owner Package Authorization Details

${ownerSections}

## First Physical Lifecycle Authorization Details

${physicalSections}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalApprovals = readJson(paths.physicalApprovals);
  const actionRunbook = readJson(paths.actionRunbook);
  const remainingStrictPacket = readJson(paths.remainingStrictPacket);

  ensureCurrent("owner package approvals", ownerApprovals, dirtyMap);
  ensureCurrent("physical lifecycle approvals", physicalApprovals, dirtyMap);
  ensureCurrent("action runbook", actionRunbook, dirtyMap);
  ensureCurrent("remaining strict packet", remainingStrictPacket, dirtyMap);

  const ownerPackageQueue = makeOwnerRows(ownerApprovals, actionRunbook);
  const physicalLifecycleQueue = makePhysicalRows(physicalApprovals, actionRunbook);
  const summary = summarize(ownerPackageQueue, physicalLifecycleQueue);

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovalsGeneratedAt: ownerApprovals.generatedAt,
    physicalLifecycleApprovalsGeneratedAt: physicalApprovals.generatedAt,
    actionRunbookGeneratedAt: actionRunbook.generatedAt,
    remainingStrictPacketGeneratedAt: remainingStrictPacket.generatedAt,
    cleanupAuthorized: false,
    note: "Authorization support only. No row is executable without a separate explicit owner instruction naming the approval ID and selected final state.",
    remainingStrictBlockers: (remainingStrictPacket.remainingStrictBlockers ?? [])
      .filter((blocker) => blocker.status === "blocked")
      .map((blocker) => blocker.id),
    summary,
    ownerPackageQueue,
    physicalLifecycleQueue
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
    ownerPackageApprovals: summary.ownerPackageApprovals,
    physicalLifecycleApprovals: summary.physicalLifecycleApprovals,
    executableRows: summary.executableRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows
  }, null, 2));
}

main();
