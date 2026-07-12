#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const AUTHORIZATION_TRANSITION_FORECAST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationBacklogQueue: "coordination/release-intake/latest-A25-authorization-backlog-queue.json",
  focusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  compactRequestBundle: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  latestJson: "coordination/release-intake/latest-A25-authorization-transition-forecast.json",
  latestMarkdown: "coordination/release-intake/latest-A25-authorization-transition-forecast.md",
  datedJson: `coordination/release-intake/${date}-A25-authorization-transition-forecast.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-authorization-transition-forecast.md`
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
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function artifactStamp(relativePath, payload) {
  return {
    path: relativePath,
    generatedAt: payload.generatedAt ?? null,
    dirtyMapStatusSignature:
      payload.dirtyMapStatusSignature ??
      payload.statusSignature ??
      payload.dirtyMap?.statusSignature ??
      null,
    expandedStatusEntries:
      payload.expandedStatusEntries ??
      payload.statusCounts?.expandedStatusEntries ??
      payload.dirtyMap?.expandedStatusEntries ??
      null
  };
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, artifact]) => {
      const stamp = artifactStamp(AUTHORIZATION_TRANSITION_FORECAST_PATHS[key], artifact);
      const hasSignature = Boolean(stamp.dirtyMapStatusSignature);
      const hasEntries = stamp.expandedStatusEntries !== null && stamp.expandedStatusEntries !== undefined;
      return {
        key,
        hasSignature,
        hasEntries,
        signatureMatches: !hasSignature || stamp.dirtyMapStatusSignature === expectedSignature,
        entryCountMatches: !hasEntries || stamp.expandedStatusEntries === expectedEntries
      };
    })
    .filter((row) => row.hasSignature || row.hasEntries)
    .filter((row) => row.signatureMatches !== true || row.entryCountMatches !== true)
    .map((row) => `${row.key} is stale relative to latest dirty map`);
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, artifact]) => [
    key,
    artifactStamp(AUTHORIZATION_TRANSITION_FORECAST_PATHS[key], artifact)
  ]));
}

function currentFocusRows(backlog) {
  return (backlog.queueRows ?? []).filter((row) => row.queueClass === "current-focus-batch");
}

function heldRows(backlog) {
  return (backlog.queueRows ?? []).filter((row) => row.queueClass === "held-not-authorizable");
}

function projectedBlockers({ backlog, exitCriteria, projectedPendingCanonicalRows }) {
  const blockers = [];
  const held = heldRows(backlog);
  if (projectedPendingCanonicalRows > 0) {
    blockers.push({
      id: "canonical-authorization-backlog",
      blockerClass: "owner-input",
      statusAfterCurrentFocus: "still-blocked",
      count: projectedPendingCanonicalRows,
      detail: `${projectedPendingCanonicalRows} canonical authorization row(s) would still be pending after the current focus batch.`
    });
  }
  if (held.length > 0) {
    blockers.push({
      id: "wave01-resync-hold",
      blockerClass: "owner-confirmation-hold",
      statusAfterCurrentFocus: "still-blocked",
      count: held.length,
      approvalIds: held.map((row) => row.approvalId),
      detail: "Held rows remain non-authorizable until explicit owner release."
    });
  }
  if ((exitCriteria.summary?.validationHoldBlockers ?? 0) > 0) {
    blockers.push({
      id: "validation-hold",
      blockerClass: "owner-confirmation-hold",
      statusAfterCurrentFocus: "still-blocked",
      count: exitCriteria.summary.validationHoldBlockers,
      detail: "Validation hold remains waiting for owner compose deletion confirmation."
    });
  }
  if (exitCriteria.summary?.releaseSourceClean !== true) {
    blockers.push({
      id: "a22-clean-release-source",
      blockerClass: "release-source-clean",
      statusAfterCurrentFocus: "still-blocked",
      count: 1,
      detail: "A22 release source remains dirty; root is still an integration inventory."
    });
  }
  if ((backlog.summary?.deferredPhysicalLifecycleRows ?? 0) > 0) {
    blockers.push({
      id: "physical-lifecycle-deferred",
      blockerClass: "deferred-cleanup",
      statusAfterCurrentFocus: "deferred",
      count: backlog.summary.deferredPhysicalLifecycleRows,
      detail: "Physical lifecycle cleanup stays deferred until validation, clean release source, and exact cleanup authorization are ready."
    });
  }
  blockers.push({
    id: "merge-not-authorized",
    blockerClass: "explicit-owner-merge-instruction",
    statusAfterCurrentFocus: "still-blocked",
    count: 1,
    detail: "No merge instruction is recorded by owner-package authorization."
  });
  return blockers.map((row) => ({
    ...row,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  }));
}

export function buildAuthorizationTransitionForecast() {
  const artifacts = {
    dirtyMap: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.dirtyMap),
    authorizationBacklogQueue: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.authorizationBacklogQueue),
    focusBatchRecordingIntake: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.focusBatchRecordingIntake),
    compactRequestBundle: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.compactRequestBundle),
    ownerClosureInputReadiness: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.ownerClosureInputReadiness),
    validateToMergeExitCriteria: readJson(AUTHORIZATION_TRANSITION_FORECAST_PATHS.validateToMergeExitCriteria)
  };
  const backlog = artifacts.authorizationBacklogQueue;
  const recordingIntake = artifacts.focusBatchRecordingIntake;
  const pendingFocusRowCount = count(recordingIntake.summary?.pendingRows, currentFocusRows(backlog).length);
  const focusRows = pendingFocusRowCount > 0 ? currentFocusRows(backlog) : [];
  const focusIds = focusRows.map((row) => row.approvalId);
  const pendingCanonicalRows = count(
    artifacts.ownerClosureInputReadiness.summary?.pendingCanonicalAuthorizationRows,
    count(backlog.summary?.pendingCanonicalAuthorizationRows)
  );
  const validAuthorizationRows = count(artifacts.ownerClosureInputReadiness.summary?.validAuthorizationRows);
  const heldPolicyApprovalIds = [...new Set(backlog.heldPolicyApprovalIds ?? [])].sort();
  const projectedPendingCanonicalRows = Math.max(0, pendingCanonicalRows - focusRows.length);
  const projectedValidAuthorizationRows = validAuthorizationRows + focusRows.length;
  const projectedCurrentFocusRows = 0;
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const blockersAfterCurrentFocus = projectedBlockers({
    backlog,
    exitCriteria: artifacts.validateToMergeExitCriteria,
    projectedPendingCanonicalRows
  });
  const compactRequest = artifacts.compactRequestBundle.batchAuthorizationRequest ?? {};

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    currentState: {
      pendingCanonicalAuthorizationRows: pendingCanonicalRows,
      validAuthorizationRows,
      currentFocusRows: focusRows.length,
      currentFocusApprovalIds: focusIds,
      heldRows: count(backlog.summary?.heldRows),
      heldApprovalIds: backlog.heldApprovalIds ?? [],
      heldPolicyRows: heldPolicyApprovalIds.length,
      heldPolicyApprovalIds,
      deferredPhysicalLifecycleRows: count(backlog.summary?.deferredPhysicalLifecycleRows),
      ownerInputsReady: artifacts.ownerClosureInputReadiness.summary?.ownerInputsReady === true,
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    assumedOwnerAction: {
      action: "authorize-current-owner-package-focus-batch",
      approvalIds: focusIds,
      selectedFinalState: "reviewed commit",
      copyableOwnerReplyTextZh: compactRequest.copyableOwnerReplyTextZh ?? "",
      recordsAuthorizationOnlyAfterExplicitOwnerReply: true,
      cleanupAuthorized: false,
      executableNow: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    },
    projectedAfterCurrentFocusAuthorization: {
      projectedPendingCanonicalAuthorizationRows: projectedPendingCanonicalRows,
      projectedValidAuthorizationRows,
      projectedCurrentFocusRows,
      projectedHeldRows: count(backlog.summary?.heldRows),
      projectedHeldPolicyRows: heldPolicyApprovalIds.length,
      projectedHeldPolicyApprovalIds: heldPolicyApprovalIds,
      projectedDeferredPhysicalLifecycleRows: count(backlog.summary?.deferredPhysicalLifecycleRows),
      projectedOwnerInputsReady: projectedPendingCanonicalRows === 0 && count(backlog.summary?.heldRows) === 0,
      projectedValidateExitReady: false,
      projectedReadyForMerge: false,
      projectedCleanupAuthorizedRows: 0,
      projectedExecutableRows: 0
    },
    blockersAfterCurrentFocus,
    validationCommandsAfterOwnerInput: {
      postInputValidationCommands: recordingIntake.nextValidationCommands ?? recordingIntake.postInputValidationCommands ?? [],
      deferredAggregateValidationCommands: recordingIntake.deferredAggregateValidationCommands ?? [],
      postInputValidationCommandRows: count(recordingIntake.summary?.postInputValidationCommands),
      deferredAggregateValidationCommandRows: count(recordingIntake.summary?.deferredAggregateValidationCommands)
    },
    forecastConclusion: {
      zh: `授权当前 ${focusIds.join(", ") || "focus batch"} 只会推进 owner-package authorization frontier; 不会授权 cleanup/merge/deploy, 也不会直接让 validate 进入 merge。`,
      nextHardGateAfterCurrentFocus: projectedPendingCanonicalRows > 0
        ? `${projectedPendingCanonicalRows} canonical authorization row(s) plus deferred physical-lifecycle rows remain before owner inputs can be green`
        : "owner input readiness can be rechecked, but merge still needs clean release source and explicit owner merge instruction",
      mergeStillRequiresCleanSource: true,
      physicalLifecycleStillDeferred: count(backlog.summary?.deferredPhysicalLifecycleRows) > 0
    },
    summary: {
      currentFocusRows: focusRows.length,
      pendingCanonicalAuthorizationRows: pendingCanonicalRows,
      projectedPendingCanonicalAuthorizationRows: projectedPendingCanonicalRows,
      projectedValidAuthorizationRows,
      heldRows: count(backlog.summary?.heldRows),
      heldPolicyRows: heldPolicyApprovalIds.length,
      deferredPhysicalLifecycleRows: count(backlog.summary?.deferredPhysicalLifecycleRows),
      blockersAfterCurrentFocus: blockersAfterCurrentFocus.length,
      postInputValidationCommandRows: count(recordingIntake.summary?.postInputValidationCommands),
      deferredAggregateValidationCommandRows: count(recordingIntake.summary?.deferredAggregateValidationCommands),
      validateExitReadyNow: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      projectedValidateExitReady: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableAuthorizationTransitionForecastProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    currentState: payload.currentState,
    assumedOwnerAction: payload.assumedOwnerAction,
    projectedAfterCurrentFocusAuthorization: payload.projectedAfterCurrentFocusAuthorization,
    blockersAfterCurrentFocus: payload.blockersAfterCurrentFocus,
    validationCommandsAfterOwnerInput: payload.validationCommandsAfterOwnerInput,
    forecastConclusion: payload.forecastConclusion,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function stableSourceArtifacts(sourceArtifacts) {
  return Object.fromEntries(Object.entries(sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const blockers = payload.blockersAfterCurrentFocus.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.statusAfterCurrentFocus)} | ${cell(row.blockerClass)} | ${row.count} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | 0 | none |";

  return `# A25 Authorization Transition Forecast

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This forecast is evidence-only. It simulates the next owner-authorization transition without recording approval, creating execution instructions, staging, committing, merging, cleaning, deleting, pushing, deploying, or touching physical lifecycle state.

## Current State

- Pending canonical authorization rows: ${payload.currentState.pendingCanonicalAuthorizationRows}
- Valid authorization rows: ${payload.currentState.validAuthorizationRows}
- Current focus rows: ${payload.currentState.currentFocusRows}
- Current focus approval IDs: ${payload.currentState.currentFocusApprovalIds.join(", ") || "none"}
- Held rows: ${payload.currentState.heldRows}
- Held approval IDs: ${payload.currentState.heldApprovalIds.join(", ") || "none"}
- Deferred physical lifecycle rows: ${payload.currentState.deferredPhysicalLifecycleRows}
- Validate exit ready now: ${payload.currentState.validateExitReady ? "yes" : "no"}

## Assumed Owner Action

\`\`\`text
${payload.assumedOwnerAction.copyableOwnerReplyTextZh || "none"}
\`\`\`

This assumed action remains authorization-only. It does not authorize cleanup, deploy, merge, destructive Git, or physical lifecycle cleanup.

## Projected After Current Focus Authorization

- Projected pending canonical authorization rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedPendingCanonicalAuthorizationRows}
- Projected valid authorization rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedValidAuthorizationRows}
- Projected current focus rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedCurrentFocusRows}
- Projected held rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedHeldRows}
- Projected deferred physical lifecycle rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedDeferredPhysicalLifecycleRows}
- Projected validate exit ready: ${payload.projectedAfterCurrentFocusAuthorization.projectedValidateExitReady ? "yes" : "no"}
- Projected cleanup-authorized rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedCleanupAuthorizedRows}
- Projected executable rows: ${payload.projectedAfterCurrentFocusAuthorization.projectedExecutableRows}

## Blockers After Current Focus

| ID | Status | Class | Count | Detail |
| --- | --- | --- | ---: | --- |
${blockers}

## Safe Post-Input Validation Commands

Immediate commands:
${list(payload.validationCommandsAfterOwnerInput.postInputValidationCommands.map((command) => `\`${command}\``))}

Deferred aggregate commands:
${list(payload.validationCommandsAfterOwnerInput.deferredAggregateValidationCommands.map((command) => `\`${command}\``))}

## Conclusion

${payload.forecastConclusion.zh}

Next hard gate: ${payload.forecastConclusion.nextHardGateAfterCurrentFocus}

## Boundary

Every projected row remains non-executable. This forecast does not authorize cleanup, merge, deploy, destructive Git, dirty-root deploy, or physical lifecycle cleanup.
`;
}

function main() {
  const payload = buildAuthorizationTransitionForecast();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestJson, json);
  write(AUTHORIZATION_TRANSITION_FORECAST_PATHS.datedJson, json);
  write(AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestMarkdown, md);
  write(AUTHORIZATION_TRANSITION_FORECAST_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestJson,
    latestMarkdown: AUTHORIZATION_TRANSITION_FORECAST_PATHS.latestMarkdown,
    currentFocusRows: payload.summary.currentFocusRows,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    projectedPendingCanonicalAuthorizationRows: payload.summary.projectedPendingCanonicalAuthorizationRows,
    heldRows: payload.summary.heldRows,
    deferredPhysicalLifecycleRows: payload.summary.deferredPhysicalLifecycleRows,
    blockersAfterCurrentFocus: payload.summary.blockersAfterCurrentFocus,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
