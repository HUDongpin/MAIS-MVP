#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const CLEAN_RELEASE_SOURCE_RUNWAY_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  releaseSourceBlocker: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  noDirtyRootDeployEvidence: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  worktreeDashboard: "coordination/release-intake/latest-A25-worktree-hygiene-dashboard.json",
  ownerPackageReadiness: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  validateToMergeExitCriteria: "coordination/release-intake/latest-A25-validate-to-merge-exit-criteria.json",
  authorizationTransitionForecast: "coordination/release-intake/latest-A25-authorization-transition-forecast.json",
  sevenStepClosureBridge: "coordination/release-intake/latest-A25-seven-step-closure-bridge.json",
  latestJson: "coordination/release-intake/latest-A22-clean-release-source-runway.json",
  latestMarkdown: "coordination/release-intake/latest-A22-clean-release-source-runway.md",
  datedJson: `coordination/release-intake/${date}-A22-clean-release-source-runway.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-clean-release-source-runway.md`
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

function dirtyMapSignature(payload) {
  return payload.statusSignature ?? payload.dirtyMapStatusSignature ?? payload.dirtyMap?.statusSignature ?? payload.baseline?.dirtyMapStatusSignature ?? null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.baseline?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, CLEAN_RELEASE_SOURCE_RUNWAY_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, CLEAN_RELEASE_SOURCE_RUNWAY_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function cleanWorktreeCandidates(worktreeDashboard) {
  return (worktreeDashboard.worktreeLedger ?? [])
    .filter((row) => count(row.statusCounts?.total) === 0)
    .map((row) => ({
      branch: row.branch,
      path: row.path,
      head: row.head,
      divergence: row.divergence ?? { behind: 0, ahead: 0 },
      lifecycleState: row.lifecycleState,
      nextAction: row.nextAction,
      releaseSourceEligibleNow: false,
      blockers: [
        "clean-diverged-worktree-still-needs-owner review",
        "no reviewed clean release slice gate is green for this branch",
        "no deploy or merge instruction is recorded"
      ]
    }));
}

function dirtyWorktreeCount(worktreeDashboard) {
  return (worktreeDashboard.worktreeLedger ?? [])
    .filter((row) => count(row.statusCounts?.total) > 0)
    .length;
}

function allowedSourceOptions({ artifacts, cleanCandidates }) {
  const releaseSource = artifacts.releaseSourceBlocker;
  const ownerReadiness = artifacts.ownerPackageReadiness;
  const exitCriteria = artifacts.validateToMergeExitCriteria;
  const forecast = artifacts.authorizationTransitionForecast;
  const bridge = artifacts.sevenStepClosureBridge;
  const rootEntries = count(releaseSource.summary?.rootStatusEntries);
  const blockedOwnerPackages = count(ownerReadiness.summary?.blockedRows);
  const readyOwnerPackages = count(ownerReadiness.summary?.readyRows);
  const typeCheckErrors = count(ownerReadiness.summary?.typeCheckErrorLines);
  const pendingCanonical = count(exitCriteria.summary?.pendingCanonicalAuthorizationRows);
  const currentFocusRows = count(forecast.summary?.currentFocusRows);
  const projectedPending = count(forecast.summary?.projectedPendingCanonicalAuthorizationRows);
  const failedMergeChecks = count(exitCriteria.summary?.directFailedMergeChecks);

  return [
    {
      id: "current-root-clean-worktree",
      allowedSource: "clean worktree",
      status: rootEntries === 0 ? "ready" : "blocked",
      releaseSourceEligibleNow: false,
      blockerCount: rootEntries === 0 ? 1 : 3,
      evidence: {
        rootStatusEntries: rootEntries,
        releaseSourceClean: releaseSource.summary?.releaseSourceClean === true,
        noDirtyRootDeployPassed: artifacts.noDirtyRootDeployEvidence.passed === true
      },
      blockers: [
        `${rootEntries} root dirty status entr${rootEntries === 1 ? "y" : "ies"} remain in integration inventory`,
        "dirty-root deploy guard is expected to block direct preview/production publish",
        "A22 policy requires a clean worktree, clean clone, reviewed clean release slice, or owner-approved pruned staging package"
      ]
    },
    {
      id: "fresh-clean-clone",
      allowedSource: "clean clone",
      status: "not-materialized",
      releaseSourceEligibleNow: false,
      blockerCount: 4,
      evidence: {
        cleanCloneArtifactPresent: false,
        cleanDivergedWorktreeCandidates: cleanCandidates.length
      },
      blockers: [
        "no owner-assigned clean clone path is recorded in release-intake evidence",
        "no clean clone build/type/regression gate is recorded",
        "clean diverged worktrees are evidence candidates only, not a selected clean clone",
        "no deploy or merge instruction is recorded"
      ]
    },
    {
      id: "reviewed-clean-release-slice",
      allowedSource: "reviewed clean release slice",
      status: blockedOwnerPackages === 0 && failedMergeChecks === 0 ? "ready" : "blocked",
      releaseSourceEligibleNow: false,
      blockerCount: 5,
      evidence: {
        readyOwnerPackageRows: readyOwnerPackages,
        blockedOwnerPackageRows: blockedOwnerPackages,
        typeCheckErrorLines: typeCheckErrors,
        packageWorktreeTypeCheckErrorLines: count(bridge.summary?.packageWorktreeTypeCheckErrorLines),
        failedMergeChecks
      },
      blockers: [
        `${blockedOwnerPackages} owner-package row(s) remain blocked before a reviewed release slice can be trusted`,
        `${typeCheckErrors} package/worktree type-check error line(s) remain on the critical path`,
        `${pendingCanonical} canonical authorization row(s) remain pending now`,
        `${projectedPending} canonical authorization row(s) would still remain after the current ${currentFocusRows}-row focus batch`,
        "validate-to-merge exit criteria are not green"
      ]
    },
    {
      id: "owner-approved-pruned-staging-package",
      allowedSource: "explicitly owner-approved pruned staging package",
      status: "blocked",
      releaseSourceEligibleNow: false,
      blockerCount: 5,
      evidence: {
        cleanupAuthorizedRows: 0,
        executableRows: 0,
        mergeAuthorized: false,
        deployAuthorized: false
      },
      blockers: [
        "no explicit owner authorization exists for pruned staging package creation",
        "no staging pathspec/package manifest is selected for release",
        "no merge instruction is recorded",
        "no deploy instruction is recorded",
        "cleanup and executable rows remain 0"
      ]
    }
  ];
}

function runwayBlockers({ artifacts, options }) {
  const exitSummary = artifacts.validateToMergeExitCriteria.summary ?? {};
  const forecastSummary = artifacts.authorizationTransitionForecast.summary ?? {};
  const bridgeSummary = artifacts.sevenStepClosureBridge.summary ?? {};
  const blockers = [
    {
      id: "a22-release-source-not-clean",
      owner: "A22 production reliability and release engineering",
      status: "blocked",
      count: count(artifacts.releaseSourceBlocker.summary?.rootStatusEntries),
      detail: "The current root remains a dirty integration inventory and cannot be used as the release source."
    },
    {
      id: "current-focus-authorization-pending",
      owner: "A25 git hygiene and release intake",
      status: "waiting-for-owner-input",
      count: count(forecastSummary.currentFocusRows),
      detail: "A09/A17/A23 owner-package canonical authorization preview remains pending."
    },
    {
      id: "canonical-authorization-backlog",
      owner: "A25 git hygiene and release intake",
      status: "blocked",
      count: count(exitSummary.pendingCanonicalAuthorizationRows),
      detail: "Canonical authorization backlog remains before owner inputs can be green."
    },
    {
      id: "validation-hold",
      owner: "A25 git hygiene and release intake",
      status: "waiting-for-owner-confirmation",
      count: count(exitSummary.validationHoldBlockers),
      detail: "Validation hold remains waiting for owner compose deletion confirmation."
    },
    {
      id: "package-worktree-typecheck-red",
      owner: "A08/A10/A22 plus owning package sessions",
      status: "blocked",
      count: count(bridgeSummary.packageWorktreeTypeCheckErrorLines),
      detail: "Package/worktree type-check evidence remains red even though root type-check is green."
    },
    {
      id: "merge-not-authorized",
      owner: "Owner",
      status: "not-authorized",
      count: 1,
      detail: "No explicit merge instruction is recorded."
    }
  ];

  return blockers.map((row) => ({
    ...row,
    releaseSourceEligibleNow: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    blockedAllowedSources: options.filter((option) => option.releaseSourceEligibleNow !== true).length
  }));
}

export function buildCleanReleaseSourceRunway() {
  const artifacts = {
    dirtyMap: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.dirtyMap),
    releaseSourceBlocker: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.releaseSourceBlocker),
    noDirtyRootDeployEvidence: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.noDirtyRootDeployEvidence),
    worktreeDashboard: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.worktreeDashboard),
    ownerPackageReadiness: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.ownerPackageReadiness),
    validateToMergeExitCriteria: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.validateToMergeExitCriteria),
    authorizationTransitionForecast: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.authorizationTransitionForecast),
    sevenStepClosureBridge: readJson(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.sevenStepClosureBridge)
  };
  const cleanCandidates = cleanWorktreeCandidates(artifacts.worktreeDashboard);
  const dirtyLinkedWorktrees = dirtyWorktreeCount(artifacts.worktreeDashboard);
  const options = allowedSourceOptions({ artifacts, cleanCandidates });
  const blockers = runwayBlockers({ artifacts, options });
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const releaseSourceEligibleNow = options.some((option) => option.releaseSourceEligibleNow === true);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    runwayStatus: releaseSourceEligibleNow ? "ready" : "blocked-before-clean-source-selection",
    recommendedNextPath: "reviewed clean release slice after current focus authorization, package/worktree validation, clean-source evidence, and explicit owner merge instruction",
    allowedSourceOptions: options,
    cleanWorktreeCandidates: cleanCandidates,
    runwayBlockers: blockers,
    safeValidationCommands: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-a22-release-source-clean-blocker-evidence-current.mjs",
      "node coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs",
      "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
      "node coordination/release-intake/assert-authorization-transition-forecast-current.mjs",
      "node coordination/release-intake/assert-seven-step-closure-bridge-current.mjs",
      "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs"
    ],
    summary: {
      releaseSourceEligibleNow,
      allowedSourceOptions: options.length,
      blockedAllowedSourceOptions: options.filter((option) => option.releaseSourceEligibleNow !== true).length,
      cleanWorktreeCandidates: cleanCandidates.length,
      dirtyWorktrees: dirtyLinkedWorktrees,
      rootStatusEntries: count(artifacts.releaseSourceBlocker.summary?.rootStatusEntries),
      dirtyMapExpandedEntries: dirtyMapEntryCount(artifacts.dirtyMap),
      ownerPackageReadyRows: count(artifacts.ownerPackageReadiness.summary?.readyRows),
      ownerPackageBlockedRows: count(artifacts.ownerPackageReadiness.summary?.blockedRows),
      pendingCanonicalAuthorizationRows: count(artifacts.validateToMergeExitCriteria.summary?.pendingCanonicalAuthorizationRows),
      currentFocusRows: count(artifacts.authorizationTransitionForecast.summary?.currentFocusRows),
      projectedPendingCanonicalAuthorizationRows: count(artifacts.authorizationTransitionForecast.summary?.projectedPendingCanonicalAuthorizationRows),
      validateExitReady: artifacts.validateToMergeExitCriteria.validateExitReady === true,
      readyForMerge: artifacts.validateToMergeExitCriteria.readyForMerge === true,
      releaseSourceClean: artifacts.releaseSourceBlocker.summary?.releaseSourceClean === true,
      directFailedMergeChecks: count(artifacts.validateToMergeExitCriteria.summary?.directFailedMergeChecks),
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      createsClone: false,
      createsWorktree: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      pushes: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableCleanReleaseSourceRunwayProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    runwayStatus: payload.runwayStatus,
    recommendedNextPath: payload.recommendedNextPath,
    allowedSourceOptions: payload.allowedSourceOptions,
    cleanWorktreeCandidates: payload.cleanWorktreeCandidates,
    runwayBlockers: payload.runwayBlockers,
    safeValidationCommands: payload.safeValidationCommands,
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
  const optionRows = payload.allowedSourceOptions.map((option) => (
    `| \`${cell(option.id)}\` | ${cell(option.allowedSource)} | ${cell(option.status)} | ${option.releaseSourceEligibleNow ? "yes" : "no"} | ${option.blockerCount} | ${cell(option.blockers.join("; "))} |`
  )).join("\n") || "| none | none | none | no | 0 | none |";
  const candidateRows = payload.cleanWorktreeCandidates.slice(0, 12).map((candidate) => (
    `| \`${cell(candidate.branch)}\` | ${cell(candidate.lifecycleState)} | behind ${candidate.divergence.behind ?? 0}, ahead ${candidate.divergence.ahead ?? 0} | no | ${cell(candidate.path)} |`
  )).join("\n") || "| none | none | none | no | none |";
  const blockerRows = payload.runwayBlockers.map((blocker) => (
    `| \`${cell(blocker.id)}\` | ${cell(blocker.owner)} | ${cell(blocker.status)} | ${blocker.count} | ${cell(blocker.detail)} |`
  )).join("\n") || "| none | none | none | 0 | none |";

  return `# A22 Clean Release Source Runway

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This runway is evidence-only. It does not create a clone, create or remove a worktree, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, or authorize cleanup.

## Summary

- Runway status: ${payload.runwayStatus}
- Release source eligible now: ${payload.summary.releaseSourceEligibleNow ? "yes" : "no"}
- Allowed source options: ${payload.summary.allowedSourceOptions}
- Blocked allowed source options: ${payload.summary.blockedAllowedSourceOptions}
- Clean worktree candidates: ${payload.summary.cleanWorktreeCandidates}
- Dirty worktrees: ${payload.summary.dirtyWorktrees}
- Root status entries: ${payload.summary.rootStatusEntries}
- Owner-package ready rows: ${payload.summary.ownerPackageReadyRows}
- Owner-package blocked rows: ${payload.summary.ownerPackageBlockedRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Projected pending canonical rows after current focus: ${payload.summary.projectedPendingCanonicalAuthorizationRows}
- Validate exit ready: ${payload.summary.validateExitReady ? "yes" : "no"}
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Recommended Next Path

${payload.recommendedNextPath}

## Allowed Source Options

| ID | Allowed source | Status | Eligible now | Blockers | Detail |
| --- | --- | --- | --- | ---: | --- |
${optionRows}

## Clean Worktree Candidates

These clean worktrees are candidates for review or retirement only. They are not selected release sources.

| Branch | Lifecycle state | Divergence | Release source eligible now | Path |
| --- | --- | --- | --- | --- |
${candidateRows}

## Runway Blockers

| ID | Owner | Status | Count | Detail |
| --- | --- | --- | ---: | --- |
${blockerRows}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

Every option remains non-executable. This runway does not authorize cleanup, merge, deploy, destructive Git, dirty-root deploy, or physical lifecycle cleanup.
`;
}

function main() {
  const payload = buildCleanReleaseSourceRunway();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestJson, json);
  write(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.datedJson, json);
  write(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestMarkdown, md);
  write(CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestJson,
    latestMarkdown: CLEAN_RELEASE_SOURCE_RUNWAY_PATHS.latestMarkdown,
    runwayStatus: payload.runwayStatus,
    releaseSourceEligibleNow: payload.summary.releaseSourceEligibleNow,
    allowedSourceOptions: payload.summary.allowedSourceOptions,
    blockedAllowedSourceOptions: payload.summary.blockedAllowedSourceOptions,
    cleanWorktreeCandidates: payload.summary.cleanWorktreeCandidates,
    rootStatusEntries: payload.summary.rootStatusEntries,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
