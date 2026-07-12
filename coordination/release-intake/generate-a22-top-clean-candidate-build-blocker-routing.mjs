#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS } from "./generate-a22-top-clean-candidate-build-snapshot.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  topCleanCandidateBuildSnapshot: TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestJson,
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-build-blocker-routing.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-build-blocker-routing.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-build-blocker-routing.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-build-blocker-routing.md`
};

const ownerNames = {
  A05: "A05 lesson lead",
  A06: "A06 visualization lead",
  A10: "A10 tooling, docs, and report lead",
  A18: "A18 curriculum QA and content quality lead",
  A20: "A20 game design and game-based learning lead",
  A21: "A21 content pipeline and RAG operations lead",
  A22: "A22 production reliability and release engineering lead",
  A24: "A24 illustration exact-layer lead",
  A25: "A25 git hygiene and release intake lead"
};

const routeRules = [
  {
    match: "@/app/visualization-lab/VisualizationLabBackToTopButton",
    groupId: "a22-build-blocker-a06-visualization-back-to-top",
    primaryOwnerIds: ["A06"],
    coordinationOwnerIds: ["A22", "A25"],
    blockerClass: "import-path-parity",
    recommendedFix: "A06 should align the visualization-lab page import with the existing components/visualizations/VisualizationLabBackToTopButton.tsx module, or add an app-level re-export in A06 scope, then ask A22 to rerun candidate build evidence."
  },
  {
    match: "@/data/mathVirusBlaster",
    groupId: "a22-build-blocker-a20-game-data",
    primaryOwnerIds: ["A20"],
    coordinationOwnerIds: ["A10", "A22", "A25"],
    blockerClass: "root-local-data-module-missing-from-candidate",
    recommendedFix: "A20 should review the root-local data/mathVirusBlaster.ts parity source and either promote it as the game data module or refactor the game import inside A20 scope; any data-scope expansion must remain owner-coordinated before A22 reruns build evidence."
  },
  {
    match: "@/data/mightyTankBattle",
    groupId: "a22-build-blocker-a20-game-data",
    primaryOwnerIds: ["A20"],
    coordinationOwnerIds: ["A10", "A22", "A25"],
    blockerClass: "root-local-data-module-missing-from-candidate",
    recommendedFix: "A20 should review the root-local data/mightyTankBattle.ts parity source and either promote it as the game data module or refactor the game import inside A20 scope; any data-scope expansion must remain owner-coordinated before A22 reruns build evidence."
  },
  {
    match: "@/data/usCaliforniaHighSchoolLessonIllustrations",
    groupId: "a22-build-blocker-a05-a18-a21-a24-california-illustrations",
    primaryOwnerIds: ["A05"],
    coordinationOwnerIds: ["A18", "A21", "A24", "A22", "A25"],
    blockerClass: "root-local-lesson-illustration-data-missing-from-candidate",
    recommendedFix: "A05 should coordinate with A18/A21/A24 to review the root-local data/usCaliforniaHighSchoolLessonIllustrations.ts parity source, then either promote it with curriculum/exact-layer signoff or gate the high-school textbook imports before A22 reruns build evidence."
  }
];

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
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.generatedAtHkt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function existsAt(basePath, relativePath) {
  return fs.existsSync(path.join(basePath, relativePath));
}

function routeRuleFor(blocker) {
  return routeRules.find((rule) => blocker.moduleSpecifier === rule.match) ?? {
    match: blocker.moduleSpecifier,
    groupId: "a22-build-blocker-unrouted",
    primaryOwnerIds: ["A25"],
    coordinationOwnerIds: ["A22"],
    blockerClass: "unrouted-build-blocker",
    recommendedFix: "A25/A22 must assign an explicit owner before this blocker can move toward a reviewed fix."
  };
}

function ownerLabels(ownerIds) {
  return ownerIds.map((ownerId) => ({
    ownerId,
    owner: ownerNames[ownerId] ?? ownerId
  }));
}

function inspectRootPaths(pathsToCheck) {
  return (pathsToCheck ?? []).map((relativePath) => ({
    path: relativePath,
    existsInRoot: existsAt(root, relativePath)
  }));
}

function routeBlocker(blocker) {
  const rule = routeRuleFor(blocker);
  const rootExpectedPaths = inspectRootPaths((blocker.expectedPaths ?? []).map((item) => item.path));
  const rootAlternatePaths = inspectRootPaths((blocker.observedAlternatePaths ?? []).map((item) => item.path));
  const rootParitySourceAvailable = rootExpectedPaths.some((item) => item.existsInRoot) ||
    rootAlternatePaths.some((item) => item.existsInRoot);
  return {
    id: `${rule.groupId}:${blocker.importer}:${blocker.moduleSpecifier}`,
    groupId: rule.groupId,
    importer: blocker.importer,
    moduleSpecifier: blocker.moduleSpecifier,
    blockerClass: rule.blockerClass,
    blockerConfirmed: blocker.blockerConfirmed === true,
    importPresent: blocker.importPresent === true,
    expectedModuleResolvedInCandidate: blocker.expectedModuleResolved === true,
    candidateExpectedPaths: blocker.expectedPaths ?? [],
    candidateObservedAlternatePaths: blocker.observedAlternatePaths ?? [],
    rootExpectedPaths,
    rootAlternatePaths,
    rootParitySourceAvailable,
    primaryOwnerIds: rule.primaryOwnerIds,
    primaryOwners: ownerLabels(rule.primaryOwnerIds),
    coordinationOwnerIds: rule.coordinationOwnerIds,
    coordinationOwners: ownerLabels(rule.coordinationOwnerIds),
    recommendedFix: rule.recommendedFix,
    requiredNextEvidence: [
      "owner-reviewed parity fix or explicit blocker report in the relevant isolated owner worktree",
      "candidate-specific npm run type-check evidence after the fix",
      "candidate-specific npm run build evidence after the fix",
      "A22 review packet refresh showing candidate-build passed before promotion"
    ],
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false
  };
}

function ownerRouteSummary(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const ownerId of row.primaryOwnerIds) {
      if (!map.has(ownerId)) {
        map.set(ownerId, {
          ownerId,
          owner: ownerNames[ownerId] ?? ownerId,
          blockerRows: 0,
          groupIds: new Set(),
          rootParitySourceRows: 0
        });
      }
      const entry = map.get(ownerId);
      entry.blockerRows += 1;
      entry.groupIds.add(row.groupId);
      if (row.rootParitySourceAvailable) entry.rootParitySourceRows += 1;
    }
  }
  return [...map.values()]
    .map((entry) => ({
      ownerId: entry.ownerId,
      owner: entry.owner,
      blockerRows: entry.blockerRows,
      routeGroups: [...entry.groupIds].sort(),
      rootParitySourceRows: entry.rootParitySourceRows
    }))
    .sort((left, right) => right.blockerRows - left.blockerRows || left.ownerId.localeCompare(right.ownerId));
}

export function buildTopCleanCandidateBuildBlockerRouting() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.dirtyMap),
    topCleanCandidateBuildSnapshot: readJson(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.topCleanCandidateBuildSnapshot)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const snapshot = artifacts.topCleanCandidateBuildSnapshot;
  const rows = (snapshot.moduleBlockers ?? []).map(routeBlocker);
  const routeGroups = [...new Set(rows.map((row) => row.groupId))].sort();
  const buildRefreshRequired = snapshot.summary?.buildRefreshRequired === true;
  const allBuildBlockersRouted = !buildRefreshRequired && rows.length > 0 &&
    rows.every((row) => row.blockerConfirmed && row.primaryOwnerIds.length > 0 && row.executableNow === false);
  const allPreviousBlockersResolved = buildRefreshRequired &&
    rows.length > 0 &&
    rows.every((row) => row.expectedModuleResolvedInCandidate === true && row.blockerConfirmed === false);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    routingStatus: buildRefreshRequired ? "routing-not-required-build-refresh-required" : allBuildBlockersRouted ? "routed-non-executable" : "routing-incomplete",
    topCandidate: snapshot.topCandidate ?? null,
    buildStatus: snapshot.buildStatus ?? "unknown",
    buildFailureCategory: snapshot.summary?.failureCategory ?? "",
    rows,
    ownerRoutes: ownerRouteSummary(rows),
    validationRows: [
      {
        id: "build-snapshot-current",
        owner: "A22 production reliability and release engineering",
        passed: sourceFailures.length === 0,
        status: sourceFailures.length === 0 ? "passed" : "stale",
        detail: sourceFailures.length === 0 ? "Build snapshot is aligned with the latest dirty map." : sourceFailures.join("; ")
      },
      {
        id: "build-blockers-confirmed",
        owner: "A22 production reliability and release engineering",
        passed: rows.length > 0 && rows.every((row) => row.blockerConfirmed),
        status: rows.length > 0 && rows.every((row) => row.blockerConfirmed) ? "passed" : "blocked",
        detail: `${rows.filter((row) => row.blockerConfirmed).length}/${rows.length} build blocker row(s) are confirmed.`
      },
      {
        id: "previous-build-blockers-resolved",
        owner: "A22 production reliability and release engineering",
        passed: allPreviousBlockersResolved,
        status: allPreviousBlockersResolved ? "passed" : "blocked",
        detail: `${rows.filter((row) => row.expectedModuleResolvedInCandidate).length}/${rows.length} previous module-resolution blocker row(s) now resolve in the candidate.`
      },
      {
        id: "build-blockers-owner-routed",
        owner: "A25 git hygiene and release intake",
        passed: buildRefreshRequired || (rows.length > 0 && rows.every((row) => row.primaryOwnerIds.length > 0)),
        status: buildRefreshRequired || (rows.length > 0 && rows.every((row) => row.primaryOwnerIds.length > 0)) ? "passed" : "blocked",
        detail: `${rows.filter((row) => row.primaryOwnerIds.length > 0).length}/${rows.length} blocker row(s) have primary owner routes.`
      },
      {
        id: "build-blockers-non-executable",
        owner: "A25 git hygiene and release intake",
        passed: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false && row.deployAuthorized === false && row.mergeAuthorized === false),
        status: "passed",
        detail: "Routing rows do not authorize cleanup, execution, deployment, or merge."
      }
    ],
    safeValidationCommands: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
    ],
    summary: {
      moduleBlockerRows: rows.length,
      confirmedModuleBlockerRows: rows.filter((row) => row.blockerConfirmed).length,
      resolvedModuleBlockerRows: rows.filter((row) => row.expectedModuleResolvedInCandidate).length,
      routeGroupRows: routeGroups.length,
      routedOwnerRows: rows.filter((row) => row.primaryOwnerIds.length > 0).length,
      rootParitySourceRows: rows.filter((row) => row.rootParitySourceAvailable).length,
      allBuildBlockersRouted,
      allPreviousBlockersResolved,
      buildRefreshRequired,
      buildPassed: snapshot.summary?.buildPassed === true,
      buildStatus: snapshot.buildStatus ?? "unknown",
      buildFailureCategory: snapshot.summary?.failureCategory ?? "",
      candidateCleanForGit: snapshot.candidateWorktreeStatus?.cleanForGit === true,
      candidateStatusAllowed: snapshot.candidateWorktreeStatus?.statusAllowed === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      routesBuildBlockersOnly: true,
      modifiesCandidate: false,
      copiesRootFiles: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
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

export function stableTopCleanCandidateBuildBlockerRoutingProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    routingStatus: payload.routingStatus,
    topCandidate: payload.topCandidate,
    buildStatus: payload.buildStatus,
    buildFailureCategory: payload.buildFailureCategory,
    rows: payload.rows,
    ownerRoutes: payload.ownerRoutes,
    validationRows: payload.validationRows,
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
  const routeRows = payload.rows.map((row) => (
    `| \`${cell(row.importer)}\` | \`${cell(row.moduleSpecifier)}\` | ${cell(row.primaryOwnerIds.join(", "))} | ${row.rootParitySourceAvailable ? "yes" : "no"} | ${cell(row.blockerClass)} |`
  )).join("\n") || "| none | none | none | no | none |";
  const ownerRows = payload.ownerRoutes.map((route) => (
    `| ${cell(route.ownerId)} | ${cell(route.owner)} | ${route.blockerRows} | ${route.rootParitySourceRows} | ${cell(route.routeGroups.join(", "))} |`
  )).join("\n") || "| none | none | 0 | 0 | none |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";

  return `# A22 Top Clean Candidate Build Blocker Routing

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is build-blocker routing evidence only. It maps the observed A22 top clean candidate module-resolution blockers to owners and root-local parity sources. It does not copy files, edit the candidate, select a release source, run type-check, run build, run regression, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Routing status: ${payload.routingStatus}
- Top candidate branch: \`${payload.topCandidate?.branch ?? ""}\`
- Build status: ${payload.summary.buildStatus}
- Build failure category: ${payload.summary.buildFailureCategory || "none"}
- Module blocker rows: ${payload.summary.confirmedModuleBlockerRows}/${payload.summary.moduleBlockerRows}
- Resolved previous blocker rows: ${payload.summary.resolvedModuleBlockerRows}/${payload.summary.moduleBlockerRows}
- Build refresh required: ${payload.summary.buildRefreshRequired ? "yes" : "no"}
- Route groups: ${payload.summary.routeGroupRows}
- Routed owner rows: ${payload.summary.routedOwnerRows}
- Root parity source rows: ${payload.summary.rootParitySourceRows}
- Candidate clean for Git: ${payload.summary.candidateCleanForGit ? "yes" : "no"}
- Candidate status allowed: ${payload.summary.candidateStatusAllowed ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Routes

| Owner ID | Owner | Blocker rows | Root parity rows | Route groups |
| --- | --- | ---: | ---: | --- |
${ownerRows}

## Build Blocker Rows

| Importer | Missing module | Primary owners | Root parity source | Class |
| --- | --- | --- | --- | --- |
${routeRows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

These routing rows make the A22 build blockers assignable, not executable. Cleanup, merge, deployment, destructive Git, and physical lifecycle cleanup remain unauthorized.
`;
}

function main() {
  const payload = buildTopCleanCandidateBuildBlockerRouting();
  write(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate build blocker routing generated");
  console.log(`Routing status: ${payload.routingStatus}`);
  console.log(`Top candidate: ${payload.topCandidate?.branch || "none"}`);
  console.log(`Module blockers: ${payload.summary.confirmedModuleBlockerRows}/${payload.summary.moduleBlockerRows}`);
  console.log(`Route groups: ${payload.summary.routeGroupRows}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
