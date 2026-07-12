#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  validateToMergeHandoff: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  validateToMergeBlockerFrontier: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  authorizationBacklogQueue: "coordination/release-intake/latest-A25-authorization-backlog-queue.json",
  compactRequestBundle: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  currentCleanupStatus: "coordination/release-intake/latest-A25-current-cleanup-status-snapshot.json",
  a22ReleaseSourceBlocker: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  latestJson: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-to-merge-exit-criteria.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-to-merge-exit-criteria.md`
};

const blockerClassByCheckId = {
  "sources-current": "source-currentness",
  "closure-loop-validate": "closure-loop-position",
  "preauthorization-clean": "preauthorization-safety",
  "focus-batch-recorded": "owner-authorization-focus",
  "canonical-authorizations-complete": "canonical-authorization-backlog",
  "owner-inputs-ready": "owner-input-readiness",
  "execution-instructions-complete": "execution-instruction-readiness",
  "validation-hold-released": "validation-hold",
  "release-source-clean": "clean-release-source",
  "no-dirty-root-deploy": "dirty-root-deploy-protection",
  "non-executable-boundary": "non-executable-boundary",
  "strict-lifecycle-not-yet-clean": "deferred-lifecycle-cleanup"
};

const ownerByCheckId = {
  "focus-batch-recorded": "A25 git hygiene and release intake",
  "canonical-authorizations-complete": "A25 git hygiene and release intake with routed owner sessions",
  "owner-inputs-ready": "A25 git hygiene and release intake",
  "validation-hold-released": "A25 git hygiene and release intake with owner confirmation",
  "release-source-clean": "A22 production reliability and release engineering",
  "strict-lifecycle-not-yet-clean": "A25 git hygiene and release intake",
  "no-dirty-root-deploy": "A22 production reliability and release engineering",
  "non-executable-boundary": "A25 git hygiene and release intake"
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
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature:
      payload.dirtyMapStatusSignature ??
      payload.statusSignature ??
      payload.dirtyMap?.statusSignature ??
      payload.status?.dirtyMapStatusSignature ??
      null,
    expandedStatusEntries:
      payload.expandedStatusEntries ??
      payload.statusCounts?.expandedStatusEntries ??
      payload.dirtyMap?.expandedStatusEntries ??
      payload.status?.expandedStatusEntries ??
      payload.summary?.dirtyMapExpandedEntries ??
      null
  };
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .map(([key, artifact]) => {
      const stamp = artifactStamp(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS[key], artifact);
      const signatureMatches = stamp.dirtyMapStatusSignature === expectedSignature;
      const entryCountMatches = stamp.expandedStatusEntries === expectedEntries;
      return {
        key,
        signatureMatches,
        entryCountMatches,
        hasSignature: Boolean(stamp.dirtyMapStatusSignature),
        hasEntries: stamp.expandedStatusEntries !== null && stamp.expandedStatusEntries !== undefined
      };
    })
    .filter((row) => row.key !== "dirtyMap")
    .filter((row) => row.hasSignature || row.hasEntries)
    .filter((row) => row.signatureMatches !== true || row.entryCountMatches !== true)
    .map((row) => `${row.key} is stale relative to latest dirty map`);
}

function criterionFromMergeCheck(check) {
  const passed = check.passed === true;
  return {
    id: check.id,
    label: check.label,
    passed,
    status: passed ? "passed" : "blocked",
    blocker: check.blocker ?? "",
    blockerClass: blockerClassByCheckId[check.id] ?? "merge-readiness",
    owner: ownerByCheckId[check.id] ?? "A25/A22 routed release owner",
    evidence: check.evidence ?? [],
    directValidateExitBlocker: !passed,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function classCounts(rows) {
  const counts = {};
  for (const row of rows) counts[row.blockerClass] = (counts[row.blockerClass] ?? 0) + 1;
  return counts;
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, artifact]) => [
    key,
    artifactStamp(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS[key], artifact)
  ]));
}

function buildExitBlockerRows({ handoff, frontier, backlog, compactBundle, ownerInputAction, currentCleanup, a22ReleaseSource }) {
  const focusIds = compactBundle.batchAuthorizationRequest?.approvalIds ?? backlog.currentFocusApprovalIds ?? [];
  const recordingIntake = ownerInputAction.nextOwnerAuthorizationFocusBatchRecordingIntake ?? {};
  const validationHoldStatus = handoff.summary?.validationHoldStatus ?? ownerInputAction.validationHold?.status ?? "missing";
  return [
    {
      id: "current-focus-batch-not-recorded",
      owner: "A25 git hygiene and release intake",
      blockerClass: "owner-authorization-focus",
      status: count(backlog.summary?.currentFocusRows) === 0 ? "passed" : "blocked",
      count: count(backlog.summary?.currentFocusRows),
      detail: `${count(backlog.summary?.currentFocusRows)} current focus row(s) still require explicit owner authorization`,
      approvalIds: focusIds,
      evidence: [
        VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.authorizationBacklogQueue,
        VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.compactRequestBundle
      ]
    },
    {
      id: "canonical-authorization-backlog-not-empty",
      owner: "A25 git hygiene and release intake",
      blockerClass: "canonical-authorization-backlog",
      status: count(backlog.summary?.pendingCanonicalAuthorizationRows) === 0 ? "passed" : "blocked",
      count: count(backlog.summary?.pendingCanonicalAuthorizationRows),
      detail: `${count(backlog.summary?.pendingCanonicalAuthorizationRows)} canonical authorization row(s) remain pending`,
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.authorizationBacklogQueue]
    },
    {
      id: "owner-input-readiness-not-green",
      owner: "A25 git hygiene and release intake",
      blockerClass: "owner-input-readiness",
      status: handoff.summary?.ownerInputsReady === true ? "passed" : "blocked",
      count: handoff.summary?.ownerInputsReady === true ? 0 : 1,
      detail: `ownerInputsReady=${handoff.summary?.ownerInputsReady === true}`,
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.ownerInputActionPacket]
    },
    {
      id: "validation-hold-not-released",
      owner: "A25 git hygiene and release intake with owner confirmation",
      blockerClass: "validation-hold",
      status: validationHoldStatus === "released" ? "passed" : "blocked",
      count: validationHoldStatus === "released" ? 0 : 1,
      detail: `validationHoldStatus=${validationHoldStatus}`,
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.ownerInputActionPacket]
    },
    {
      id: "release-source-not-clean",
      owner: "A22 production reliability and release engineering",
      blockerClass: "clean-release-source",
      status: a22ReleaseSource.summary?.releaseSourceClean === true ? "passed" : "blocked",
      count: a22ReleaseSource.summary?.releaseSourceClean === true ? 0 : 1,
      detail: `rootStatusEntries=${a22ReleaseSource.summary?.rootStatusEntries ?? currentCleanup.releaseSource?.rootStatusEntries ?? "unknown"}`,
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.a22ReleaseSourceBlocker]
    },
    {
      id: "strict-lifecycle-still-deferred",
      owner: "A25 git hygiene and release intake",
      blockerClass: "deferred-physical-lifecycle",
      status: currentCleanup.strictLifecycle?.strictLifecycleClean === true ? "passed" : "deferred",
      count: count(backlog.summary?.deferredPhysicalLifecycleRows),
      detail: `${count(currentCleanup.strictLifecycle?.dirtyOpenDecisions)} dirty worktree decision(s), ${count(currentCleanup.strictLifecycle?.cleanDivergedOpenDecisions)} clean diverged decision(s), ${count(backlog.summary?.deferredPhysicalLifecycleRows)} deferred physical-lifecycle row(s)`,
      evidence: [
        VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.currentCleanupStatus,
        VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.authorizationBacklogQueue
      ]
    },
    {
      id: "merge-not-authorized",
      owner: "owner",
      blockerClass: "explicit-merge-authorization",
      status: "blocked",
      count: 1,
      detail: "No exact owner merge instruction is recorded; this artifact is evidence-only.",
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.validateToMergeHandoff]
    },
    {
      id: "post-input-validation-commands",
      owner: "A25 git hygiene and release intake",
      blockerClass: "post-input-validation",
      status: recordingIntake.postInputValidationCommandRows === 5 && recordingIntake.deferredAggregateValidationCommandRows === 8 ? "ready-after-owner-input" : "attention",
      count: count(recordingIntake.postInputValidationCommandRows) + count(recordingIntake.deferredAggregateValidationCommandRows),
      detail: `${count(recordingIntake.postInputValidationCommandRows)} immediate command(s), ${count(recordingIntake.deferredAggregateValidationCommandRows)} deferred aggregate command(s)`,
      evidence: [VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.ownerInputActionPacket]
    }
  ].map((row) => ({
    ...row,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  }));
}

export function buildValidateToMergeExitCriteria() {
  const artifacts = {
    dirtyMap: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.dirtyMap),
    validateToMergeHandoff: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.validateToMergeHandoff),
    validateToMergeBlockerFrontier: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.validateToMergeBlockerFrontier),
    authorizationBacklogQueue: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.authorizationBacklogQueue),
    compactRequestBundle: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.compactRequestBundle),
    ownerInputActionPacket: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.ownerInputActionPacket),
    currentCleanupStatus: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.currentCleanupStatus),
    a22ReleaseSourceBlocker: readJson(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.a22ReleaseSourceBlocker)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const directCriteria = (artifacts.validateToMergeHandoff.mergeChecks ?? []).map(criterionFromMergeCheck);
  const failedDirectCriteria = directCriteria.filter((row) => row.directValidateExitBlocker);
  const exitBlockerRows = buildExitBlockerRows({
    handoff: artifacts.validateToMergeHandoff,
    frontier: artifacts.validateToMergeBlockerFrontier,
    backlog: artifacts.authorizationBacklogQueue,
    compactBundle: artifacts.compactRequestBundle,
    ownerInputAction: artifacts.ownerInputActionPacket,
    currentCleanup: artifacts.currentCleanupStatus,
    a22ReleaseSource: artifacts.a22ReleaseSourceBlocker
  });
  const recordingIntake = artifacts.ownerInputActionPacket.nextOwnerAuthorizationFocusBatchRecordingIntake ?? {};
  const postInputValidationCommands = recordingIntake.postInputValidationCommands ?? [];
  const deferredAggregateValidationCommands = recordingIntake.deferredAggregateValidationCommands ?? [];
  const validateExitReady = artifacts.validateToMergeHandoff.readyForMerge === true && failedDirectCriteria.length === 0;
  const directExitBlockerClassCounts = classCounts(failedDirectCriteria);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    validateExitReady,
    handoffStatus: artifacts.validateToMergeHandoff.handoffStatus,
    readyForMerge: artifacts.validateToMergeHandoff.readyForMerge === true,
    directCriteria,
    exitBlockerRows,
    exitEquation: {
      validateExitReady,
      directFailedMergeChecks: failedDirectCriteria.length,
      directExitBlockerClassCounts,
      ownerAuthorizationRows: count(artifacts.authorizationBacklogQueue.summary?.currentFocusRows),
      pendingCanonicalAuthorizationRows: count(artifacts.authorizationBacklogQueue.summary?.pendingCanonicalAuthorizationRows),
      ownerHoldRows: count(artifacts.authorizationBacklogQueue.summary?.heldRows),
      deferredPhysicalLifecycleRows: count(artifacts.authorizationBacklogQueue.summary?.deferredPhysicalLifecycleRows),
      cleanSourceBlockers: count(artifacts.validateToMergeBlockerFrontier.summary?.cleanSourceFrontierRows),
      validationHoldBlockers: failedDirectCriteria.some((row) => row.id === "validation-hold-released") ? 1 : 0,
      mergeAuthorized: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    currentFocus: {
      approvalIds: artifacts.authorizationBacklogQueue.currentFocusApprovalIds ?? [],
      pendingRows: count(artifacts.authorizationBacklogQueue.summary?.currentFocusRows),
      copyableOwnerReplyTextZh: artifacts.compactRequestBundle.batchAuthorizationRequest?.copyableOwnerReplyTextZh ?? "",
      copyableApprovalText: artifacts.compactRequestBundle.batchAuthorizationRequest?.copyableApprovalText ?? ""
    },
    validationCommands: {
      postInputValidationCommands,
      deferredAggregateValidationCommands,
      postInputValidationCommandRows: postInputValidationCommands.length,
      deferredAggregateValidationCommandRows: deferredAggregateValidationCommands.length
    },
    a22ReleaseSourceOptions: {
      allowedReleaseSources: artifacts.a22ReleaseSourceBlocker.allowedReleaseSources ?? [],
      releaseSourceClean: artifacts.a22ReleaseSourceBlocker.summary?.releaseSourceClean === true,
      releaseSourceBlocked: artifacts.a22ReleaseSourceBlocker.summary?.releaseSourceBlocked === true,
      rootStatusEntries: count(artifacts.a22ReleaseSourceBlocker.summary?.rootStatusEntries),
      dirtyMapExpandedEntries: count(artifacts.a22ReleaseSourceBlocker.summary?.dirtyMapExpandedEntries)
    },
    downstreamClosureState: {
      strictLifecycleClean: artifacts.currentCleanupStatus.strictLifecycle?.strictLifecycleClean === true,
      dirtyOpenDecisions: count(artifacts.currentCleanupStatus.strictLifecycle?.dirtyOpenDecisions),
      cleanDivergedOpenDecisions: count(artifacts.currentCleanupStatus.strictLifecycle?.cleanDivergedOpenDecisions),
      deferredPhysicalLifecycleRows: count(artifacts.authorizationBacklogQueue.summary?.deferredPhysicalLifecycleRows)
    },
    summary: {
      validateExitReady,
      handoffStatus: artifacts.validateToMergeHandoff.handoffStatus,
      readyForMerge: artifacts.validateToMergeHandoff.readyForMerge === true,
      directCriteriaRows: directCriteria.length,
      directFailedMergeChecks: failedDirectCriteria.length,
      exitBlockerRows: exitBlockerRows.length,
      currentFocusRows: count(artifacts.authorizationBacklogQueue.summary?.currentFocusRows),
      pendingCanonicalAuthorizationRows: count(artifacts.authorizationBacklogQueue.summary?.pendingCanonicalAuthorizationRows),
      heldRows: count(artifacts.authorizationBacklogQueue.summary?.heldRows),
      deferredPhysicalLifecycleRows: count(artifacts.authorizationBacklogQueue.summary?.deferredPhysicalLifecycleRows),
      cleanSourceBlockers: count(artifacts.validateToMergeBlockerFrontier.summary?.cleanSourceFrontierRows),
      validationHoldBlockers: failedDirectCriteria.some((row) => row.id === "validation-hold-released") ? 1 : 0,
      postInputValidationCommandRows: postInputValidationCommands.length,
      deferredAggregateValidationCommandRows: deferredAggregateValidationCommands.length,
      releaseSourceClean: artifacts.a22ReleaseSourceBlocker.summary?.releaseSourceClean === true,
      strictLifecycleClean: artifacts.currentCleanupStatus.strictLifecycle?.strictLifecycleClean === true,
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

export function stableValidateToMergeExitCriteriaProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    validateExitReady: payload.validateExitReady,
    handoffStatus: payload.handoffStatus,
    readyForMerge: payload.readyForMerge,
    directCriteria: payload.directCriteria,
    exitBlockerRows: payload.exitBlockerRows,
    exitEquation: payload.exitEquation,
    currentFocus: payload.currentFocus,
    validationCommands: payload.validationCommands,
    a22ReleaseSourceOptions: payload.a22ReleaseSourceOptions,
    downstreamClosureState: payload.downstreamClosureState,
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
  const equation = payload.exitEquation;
  const criteriaRows = payload.directCriteria.map((row) => (
    `| \`${cell(row.id)}\` | ${row.passed ? "yes" : "no"} | ${cell(row.blockerClass)} | ${cell(row.blocker)} |`
  )).join("\n");
  const blockerRows = payload.exitBlockerRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.blockerClass)} | ${row.count} | ${cell(row.detail)} |`
  )).join("\n");
  return `# A25 Validate-To-Merge Exit Criteria

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This artifact is evidence-only. It explains what must become true before A25/A22 can even request a merge path. It does not authorize staging, committing, merging, cleaning, restoring, resetting, deleting files, deleting branches, removing worktrees, pushing, deploying, dirty-root deploy, or physical lifecycle cleanup.

## Exit Equation

- validate_exit_ready: ${payload.validateExitReady ? "true" : "false"}
- handoff status: \`${payload.handoffStatus}\`
- direct failed merge checks: ${equation.directFailedMergeChecks}
- current focus authorization rows: ${equation.ownerAuthorizationRows}
- pending canonical authorization rows: ${equation.pendingCanonicalAuthorizationRows}
- owner hold rows: ${equation.ownerHoldRows}
- deferred physical lifecycle rows: ${equation.deferredPhysicalLifecycleRows}
- clean source blockers: ${equation.cleanSourceBlockers}
- validation hold blockers: ${equation.validationHoldBlockers}
- merge authorized: ${equation.mergeAuthorized}
- cleanup-authorized rows: ${equation.cleanupAuthorizedRows}
- executable rows: ${equation.executableRows}

## Direct Criteria

| Check | Passed | Class | Blocker |
| --- | --- | --- | --- |
${criteriaRows}

## Current Exit Blockers

| ID | Status | Class | Count | Detail |
| --- | --- | --- | ---: | --- |
${blockerRows}

## Current Focus Authorization

- Approval IDs: ${payload.currentFocus.approvalIds.join(", ") || "none"}
- Pending rows: ${payload.currentFocus.pendingRows}

## Safe Post-Input Validation Commands

Immediate commands:
${list(payload.validationCommands.postInputValidationCommands.map((command) => `\`${command}\``))}

Deferred aggregate commands:
${list(payload.validationCommands.deferredAggregateValidationCommands.map((command) => `\`${command}\``))}

## A22 Release Source Options

Allowed release sources:
${list(payload.a22ReleaseSourceOptions.allowedReleaseSources.map((source) => `\`${source}\``))}

- A22 release source clean: ${payload.a22ReleaseSourceOptions.releaseSourceClean ? "yes" : "no"}
- Root status entries: ${payload.a22ReleaseSourceOptions.rootStatusEntries}

## Downstream Closure State

- A25 strict lifecycle clean: ${payload.downstreamClosureState.strictLifecycleClean ? "yes" : "no"}
- Dirty worktree decisions: ${payload.downstreamClosureState.dirtyOpenDecisions}
- Clean diverged worktree decisions: ${payload.downstreamClosureState.cleanDivergedOpenDecisions}
- Deferred physical lifecycle rows: ${payload.downstreamClosureState.deferredPhysicalLifecycleRows}

## Boundary

Merge remains blocked until validate_exit_ready is true and a separate exact owner merge instruction exists. Cleanup remains blocked until merge verification and separate exact cleanup or lifecycle instructions exist.
`;
}

function main() {
  const payload = buildValidateToMergeExitCriteria();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestJson, json);
  write(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.datedJson, json);
  write(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestMarkdown, md);
  write(VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestJson,
    latestMarkdown: VALIDATE_TO_MERGE_EXIT_CRITERIA_PATHS.latestMarkdown,
    validateExitReady: payload.validateExitReady,
    handoffStatus: payload.handoffStatus,
    directFailedMergeChecks: payload.summary.directFailedMergeChecks,
    currentFocusRows: payload.summary.currentFocusRows,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    deferredPhysicalLifecycleRows: payload.summary.deferredPhysicalLifecycleRows,
    cleanSourceBlockers: payload.summary.cleanSourceBlockers,
    validationHoldBlockers: payload.summary.validationHoldBlockers,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
