#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const AUTHORIZATION_BACKLOG_QUEUE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationGapShrinkMap: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.json",
  nextOwnerAuthorizationFocusBatch: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  latestJson: "coordination/release-intake/latest-A25-authorization-backlog-queue.json",
  latestMarkdown: "coordination/release-intake/latest-A25-authorization-backlog-queue.md",
  datedJson: `coordination/release-intake/${date}-A25-authorization-backlog-queue.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-authorization-backlog-queue.md`
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

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  if (Array.isArray(artifact.sourceCurrentnessFailures) && artifact.sourceCurrentnessFailures.length > 0) {
    failures.push(`${label} has source currentness failures`);
  }
  if (Array.isArray(artifact.failures) && artifact.failures.length > 0) failures.push(`${label} has failures`);
  return failures;
}

function pendingRoundRows(round) {
  return (round?.rows ?? [])
    .filter((row) => row.authorized !== true)
    .map((row) => ({
      ...row,
      sourceRoundId: row.sourceRoundId ?? round.id,
      sourceRoundLabel: row.sourceRoundLabel ?? round.label
    }));
}

function classifyRow(row, focusApprovalIds, heldApprovalIds) {
  if (focusApprovalIds.has(row.approvalId)) {
    return {
      queueClass: "current-focus-batch",
      queueStatus: "waiting-for-owner-authorization",
      authorizableNow: true,
      deferred: false,
      nextAction: "Owner may authorize this current focus row as reviewed commit; no cleanup, merge, deploy, or execution is implied."
    };
  }
  if (heldApprovalIds.has(row.approvalId)) {
    return {
      queueClass: "held-not-authorizable",
      queueStatus: "held",
      authorizableNow: false,
      deferred: true,
      nextAction: "Keep this row held until the owner explicitly releases the hold."
    };
  }
  if (row.approvalKind === "physical-lifecycle") {
    return {
      queueClass: "deferred-physical-lifecycle",
      queueStatus: "deferred-until-owner-package-and-validation-holds-clear",
      authorizableNow: false,
      deferred: true,
      nextAction: "Defer physical lifecycle decisions until owner-package authorizations, validation hold, and clean release-source gates are ready."
    };
  }
  if (row.approvalKind === "owner-package") {
    return {
      queueClass: "deferred-owner-package",
      queueStatus: "deferred-after-current-focus-batch",
      authorizableNow: false,
      deferred: true,
      nextAction: "Defer this owner-package row until the current focus batch is recorded and the next focus batch is regenerated."
    };
  }
  if (row.approvalKind === "a22-generated-artifact-residual-cleanup") {
    return {
      queueClass: "deferred-generated-artifact-cleanup",
      queueStatus: "deferred-until-cleanup-instruction",
      authorizableNow: false,
      deferred: true,
      nextAction: "Defer cleanup authorization until a separate owner cleanup instruction exists."
    };
  }
  return {
    queueClass: "deferred-other",
    queueStatus: "deferred",
    authorizableNow: false,
    deferred: true,
    nextAction: "Defer until the owning A25 packet selects this row."
  };
}

function queueRows(shrinkMap, focusBatch) {
  const focusApprovalIds = new Set((focusBatch.nextBatchRows ?? []).map((row) => row.approvalId));
  const heldApprovalIds = new Set((focusBatch.heldRows ?? []).map((row) => row.approvalId));
  return (shrinkMap.rounds ?? [])
    .flatMap((round) => pendingRoundRows(round))
    .map((row) => {
      const classification = classifyRow(row, focusApprovalIds, heldApprovalIds);
      return {
        approvalId: row.approvalId,
        approvalKind: row.approvalKind,
        owner: row.owner,
        subject: row.subject ?? "",
        path: row.path ?? "",
        branch: row.branch ?? "",
        worktreePath: row.worktreePath ?? "",
        sourceRoundId: row.sourceRoundId,
        sourceRoundLabel: row.sourceRoundLabel,
        selectedFinalState: row.selectedFinalState ?? "",
        selectedAction: row.selectedAction ?? "",
        exactCommand: row.exactCommand ?? "",
        evidenceReviewed: row.evidenceReviewed ?? [],
        postApprovalChecks: row.postApprovalChecks ?? [],
        cleanupAuthorized: row.cleanupAuthorized === true,
        executableNow: row.executableNow === true,
        ...classification
      };
    });
}

function countsBy(rows, field) {
  return rows.reduce((memo, row) => {
    const key = row[field] || "unknown";
    memo[key] = (memo[key] ?? 0) + 1;
    return memo;
  }, {});
}

function orderedQueue(rows) {
  const priority = new Map([
    ["current-focus-batch", 1],
    ["held-not-authorizable", 2],
    ["deferred-owner-package", 3],
    ["deferred-physical-lifecycle", 4],
    ["deferred-generated-artifact-cleanup", 5],
    ["deferred-other", 6]
  ]);
  return [...rows].sort((left, right) => {
    const rank = (priority.get(left.queueClass) ?? 99) - (priority.get(right.queueClass) ?? 99);
    if (rank !== 0) return rank;
    return String(left.approvalId).localeCompare(String(right.approvalId));
  });
}

export function buildAuthorizationBacklogQueue() {
  const dirtyMap = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.dirtyMap);
  const shrinkMap = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.authorizationGapShrinkMap);
  const focusBatch = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.nextOwnerAuthorizationFocusBatch);
  const readiness = readJson(AUTHORIZATION_BACKLOG_QUEUE_PATHS.ownerClosureInputReadiness);
  const rows = orderedQueue(queueRows(shrinkMap, focusBatch));
  const heldPolicyApprovalIds = [...new Set(focusBatch.batchPolicy?.heldApprovalIds ?? [])].sort();
  const sourceCurrentnessFailures = [
    ...ensureCurrent("authorization gap shrink map", shrinkMap, dirtyMap),
    ...ensureCurrent("next owner authorization focus batch", focusBatch, dirtyMap),
    ...ensureCurrent("owner closure input readiness", readiness, dirtyMap)
  ];
  const counts = countsBy(rows, "queueClass");
  const currentFocusRows = counts["current-focus-batch"] ?? 0;
  const heldRows = counts["held-not-authorizable"] ?? 0;
  const deferredOwnerPackageRows = counts["deferred-owner-package"] ?? 0;
  const deferredPhysicalLifecycleRows = counts["deferred-physical-lifecycle"] ?? 0;
  const deferredGeneratedArtifactRows = counts["deferred-generated-artifact-cleanup"] ?? 0;
  const deferredOtherRows = counts["deferred-other"] ?? 0;
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized).length;
  const executableRows = rows.filter((row) => row.executableNow).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      authorizationGapShrinkMapGeneratedAt: shrinkMap.generatedAt,
      nextOwnerAuthorizationFocusBatchGeneratedAt: focusBatch.generatedAt,
      ownerClosureInputReadinessGeneratedAt: readiness.generatedAt
    },
    sourceCurrentnessFailures,
    queueRows: rows,
    countsByQueueClass: counts,
    currentFocusApprovalIds: rows
      .filter((row) => row.queueClass === "current-focus-batch")
      .map((row) => row.approvalId),
    heldApprovalIds: rows
      .filter((row) => row.queueClass === "held-not-authorizable")
      .map((row) => row.approvalId),
    heldPolicyApprovalIds,
    nextTransition: {
      currentFocusBatchMustBeRecordedFirst: currentFocusRows > 0,
      validationHoldStatus: readiness.validationHold?.status ?? "",
      releaseSourceCleanRequiredBeforeMerge: true,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false
    },
    summary: {
      pendingCanonicalAuthorizationRows: count(shrinkMap.summary?.pendingCanonicalAuthorizationRows),
      queueRows: rows.length,
      currentFocusRows,
      heldRows,
      deferredOwnerPackageRows,
      deferredPhysicalLifecycleRows,
      deferredGeneratedArtifactRows,
      deferredOtherRows,
      authorizableNowRows: rows.filter((row) => row.authorizableNow).length,
      nonExecutableRows: rows.filter((row) => row.executableNow !== true).length,
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableAuthorizationBacklogQueueProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    queueRows: payload.queueRows,
    countsByQueueClass: payload.countsByQueueClass,
    currentFocusApprovalIds: payload.currentFocusApprovalIds,
    heldApprovalIds: payload.heldApprovalIds,
    heldPolicyApprovalIds: payload.heldPolicyApprovalIds,
    nextTransition: payload.nextTransition,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const summary = payload.summary;
  const equation = `${summary.pendingCanonicalAuthorizationRows} pending = ${summary.currentFocusRows} current focus + ${summary.heldRows} held + ${summary.deferredPhysicalLifecycleRows} deferred physical lifecycle + ${summary.deferredOwnerPackageRows} deferred owner package + ${summary.deferredGeneratedArtifactRows} deferred generated artifact + ${summary.deferredOtherRows} other`;
  const rows = payload.queueRows.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | ${cell(row.queueClass)} | ${cell(row.queueStatus)} | ${cell(row.owner)} | \`${cell(row.sourceRoundId)}\` | ${row.authorizableNow ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n");

  return `# A25 Authorization Backlog Queue

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This queue is evidence-only. It classifies pending canonical authorization rows so the dirty-worktree closure loop can shrink the backlog through bounded owner-reviewed batches. It does not record owner approval, record execution instruction, authorize merge, authorize cleanup, make commands executable, stage, commit, clean, reset, remove worktrees, delete files, push, or deploy.

## Summary

- Pending canonical authorization rows: ${summary.pendingCanonicalAuthorizationRows}
- Queue rows: ${summary.queueRows}
- Current focus rows: ${summary.currentFocusRows}
- Held rows: ${summary.heldRows}
- Deferred owner-package rows: ${summary.deferredOwnerPackageRows}
- Deferred physical lifecycle rows: ${summary.deferredPhysicalLifecycleRows}
- Deferred generated artifact rows: ${summary.deferredGeneratedArtifactRows}
- Deferred other rows: ${summary.deferredOtherRows}
- Authorizable-now rows: ${summary.authorizableNowRows}
- Cleanup-authorized rows: ${summary.cleanupAuthorizedRows}
- Executable rows: ${summary.executableRows}
- Source currentness failures: ${summary.sourceCurrentnessFailures}

## Backlog Equation

${equation}

## Current Focus Approval IDs

${bullet(payload.currentFocusApprovalIds.map((id) => `\`${id}\``))}

## Held Approval IDs

${bullet(payload.heldApprovalIds.map((id) => `\`${id}\``))}

## Held Policy Approval IDs

${bullet(payload.heldPolicyApprovalIds.map((id) => `\`${id}\``))}

## Queue Rows

| # | Approval ID | Queue class | Status | Owner | Round | Authorizable now | Executable |
| ---: | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Next Transition

- Current focus batch must be recorded first: ${payload.nextTransition.currentFocusBatchMustBeRecordedFirst ? "yes" : "no"}
- Validation hold status: \`${payload.nextTransition.validationHoldStatus}\`
- Release source clean required before merge: ${payload.nextTransition.releaseSourceCleanRequiredBeforeMerge ? "yes" : "no"}
- Merge authorized: ${payload.nextTransition.mergeAuthorized ? "yes" : "no"}
- Cleanup authorized: ${payload.nextTransition.cleanupAuthorized ? "yes" : "no"}
- Executable now: ${payload.nextTransition.executableNow ? "yes" : "no"}

## Boundary

Every queued row remains non-executable. This queue does not authorize cleanup, deploy, merge, destructive Git, or physical lifecycle cleanup.
`;
}

function main() {
  const payload = buildAuthorizationBacklogQueue();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestJson, json);
  write(AUTHORIZATION_BACKLOG_QUEUE_PATHS.datedJson, json);
  write(AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestMarkdown, md);
  write(AUTHORIZATION_BACKLOG_QUEUE_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestJson,
    latestMarkdown: AUTHORIZATION_BACKLOG_QUEUE_PATHS.latestMarkdown,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    queueRows: payload.summary.queueRows,
    currentFocusRows: payload.summary.currentFocusRows,
    heldRows: payload.summary.heldRows,
    deferredPhysicalLifecycleRows: payload.summary.deferredPhysicalLifecycleRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
