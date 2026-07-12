#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-build-snapshot.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-build-snapshot.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-build-snapshot.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-build-snapshot.md`
};

const MODULE_BLOCKERS = [
  {
    importer: "app/visualization-lab/page.tsx",
    moduleSpecifier: "@/app/visualization-lab/VisualizationLabBackToTopButton",
    expectedPaths: ["app/visualization-lab/VisualizationLabBackToTopButton.tsx"],
    observedAlternatePaths: ["components/visualizations/VisualizationLabBackToTopButton.tsx"]
  },
  {
    importer: "components/games/MathVirusBlasterGame.tsx",
    moduleSpecifier: "@/data/mathVirusBlaster",
    expectedPaths: ["data/mathVirusBlaster.ts", "data/mathVirusBlaster.tsx"]
  },
  {
    importer: "components/games/MightyTankBattleGame.tsx",
    moduleSpecifier: "@/data/mightyTankBattle",
    expectedPaths: ["data/mightyTankBattle.ts", "data/mightyTankBattle.tsx"]
  },
  {
    importer: "components/lesson/CaliforniaHighSchoolTextbookPage.tsx",
    moduleSpecifier: "@/data/usCaliforniaHighSchoolLessonIllustrations",
    expectedPaths: [
      "data/usCaliforniaHighSchoolLessonIllustrations.ts",
      "data/usCaliforniaHighSchoolLessonIllustrations.tsx"
    ]
  },
  {
    importer: "components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx",
    moduleSpecifier: "@/data/usCaliforniaHighSchoolLessonIllustrations",
    expectedPaths: [
      "data/usCaliforniaHighSchoolLessonIllustrations.ts",
      "data/usCaliforniaHighSchoolLessonIllustrations.tsx"
    ]
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

function gitRaw(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).replace(/\n$/u, "");
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

function readTextAbsolute(absolutePath) {
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
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
    artifactStamp(key, TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function existsInCandidate(candidatePath, relativePath) {
  return fs.existsSync(path.join(candidatePath, relativePath));
}

function parseStatusEntries(statusText) {
  return statusText.split("\n").filter(Boolean);
}

function sameStatusRows(left, right) {
  return left.length === right.length && left.every((row) => right.includes(row));
}

function statusRowsAllowed(statusRows, allowedRows) {
  if (allowedRows.length === 0) return statusRows.length === 0;
  return sameStatusRows(statusRows, allowedRows);
}

function directorySizeKiB(absolutePath) {
  if (!fs.existsSync(absolutePath)) return 0;
  const output = execFileSync("du", ["-sk", absolutePath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  const [size] = output.split(/\s+/);
  return count(size);
}

function inspectModuleBlocker(candidatePath, blocker) {
  const importerPath = path.join(candidatePath, blocker.importer);
  const importerText = readTextAbsolute(importerPath);
  const expectedPaths = blocker.expectedPaths.map((relativePath) => ({
    path: relativePath,
    exists: existsInCandidate(candidatePath, relativePath)
  }));
  const alternatePaths = (blocker.observedAlternatePaths ?? []).map((relativePath) => ({
    path: relativePath,
    exists: existsInCandidate(candidatePath, relativePath)
  }));
  return {
    importer: blocker.importer,
    importerExists: fs.existsSync(importerPath),
    moduleSpecifier: blocker.moduleSpecifier,
    importPresent: importerText.includes(blocker.moduleSpecifier),
    expectedPaths,
    expectedModuleResolved: expectedPaths.some((item) => item.exists),
    observedAlternatePaths: alternatePaths,
    blockerConfirmed: fs.existsSync(importerPath) &&
      importerText.includes(blocker.moduleSpecifier) &&
      expectedPaths.every((item) => !item.exists)
  };
}

export function buildTopCleanCandidateBuildSnapshot() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.dirtyMap),
    cleanSourceCandidatePromotion: readJson(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.cleanSourceCandidatePromotion)
  };
  const topCandidate = artifacts.cleanSourceCandidatePromotion.topCandidate ?? null;
  const rawSourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const sourceFailures = rawSourceFailures.filter((failure) => !(
    topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery" &&
    failure.startsWith("cleanSourceCandidatePromotion is stale")
  ));
  const candidatePath = topCandidate?.path ?? "";
  const nextDir = path.join(candidatePath, ".next");
  const statusShort = candidatePath ? gitRaw(["-C", candidatePath, "status", "--short"]) : "";
  const statusIgnored = candidatePath ? gitRaw(["-C", candidatePath, "status", "--short", "--ignored"]) : "";
  const ignoredEntries = parseStatusEntries(statusIgnored).filter((line) => line.startsWith("!! "));
  const moduleBlockers = candidatePath
    ? MODULE_BLOCKERS.map((blocker) => inspectModuleBlocker(candidatePath, blocker))
    : [];
  const statusEntries = parseStatusEntries(statusShort);
  const allowedDirtyStatusRows = topCandidate?.allowedDirtyStatusRows ?? [];
  const boundedDirtyAccepted = topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery" &&
    allowedDirtyStatusRows.length > 0;
  const statusAllowed = boundedDirtyAccepted
    ? statusRowsAllowed(statusEntries, allowedDirtyStatusRows)
    : statusEntries.length === 0;
  const buildPassed = false;
  const blockerCount = moduleBlockers.filter((blocker) => blocker.blockerConfirmed).length;
  const resolvedBlockerCount = moduleBlockers.filter((blocker) => blocker.expectedModuleResolved).length;
  const buildRefreshRequired = moduleBlockers.length > 0 && blockerCount === 0 && resolvedBlockerCount === moduleBlockers.length;
  const buildStatus = buildRefreshRequired ? "blocked-build-refresh-required" : "failed";
  const failureCategory = buildRefreshRequired ? "post-extraction-build-refresh-required" : "webpack-module-not-found";
  const observedExitStatus = buildRefreshRequired ? null : 1;
  const nextDirPresent = fs.existsSync(nextDir);
  const nextDirSizeKiB = directorySizeKiB(nextDir);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    buildStatus,
    topCandidate: {
      branch: topCandidate?.branch ?? "",
      path: candidatePath,
      head: topCandidate?.head ?? "",
      promotionRank: count(topCandidate?.promotionRank),
      promotionLane: topCandidate?.promotionLane ?? "",
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      allowedDirtyStatusRows
    },
    buildObservation: {
      mode: "manual-escalated-build-observed",
      command: {
        cwd: candidatePath,
        argv: ["env", "NEXT_TELEMETRY_DISABLED=1", "npm", "run", "build"]
      },
      exitStatus: observedExitStatus,
      buildPassed,
      failureCategory,
      firstFailureLines: buildRefreshRequired ? [] : [
        "Module not found: Can't resolve '@/app/visualization-lab/VisualizationLabBackToTopButton'",
        "Module not found: Can't resolve '@/data/mathVirusBlaster'",
        "Module not found: Can't resolve '@/data/mightyTankBattle'",
        "Module not found: Can't resolve '@/data/usCaliforniaHighSchoolLessonIllustrations'"
      ],
      note: buildRefreshRequired
        ? "The previous observed module-not-found build failure is stale after the authorized root-parity extraction; a fresh escalated build observation is required before build status can be promoted."
        : "The actual Next build was run once with owner-approved escalated write access because Next writes .next in the linked worktree; this snapshot does not rerun build."
    },
    moduleBlockers,
    candidateWorktreeStatus: {
      statusEntries,
      statusEntryCount: statusEntries.length,
      cleanForGit: statusShort.length === 0,
      allowedDirtyStatusRows,
      boundedDirtyAccepted,
      statusAllowed,
      ignoredEntries,
      ignoredEntryCount: ignoredEntries.length,
      nextDirIgnored: ignoredEntries.some((line) => line === "!! .next/"),
      nodeModulesIgnored: ignoredEntries.some((line) => line === "!! node_modules/")
    },
    buildArtifacts: {
      nextDirPresent,
      nextDirSizeKiB,
      nextDirSizeMiB: Math.round(nextDirSizeKiB / 1024),
      tsbuildInfoPresent: fs.existsSync(path.join(candidatePath, "tsconfig.tsbuildinfo")),
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    validationRows: [
      {
        id: "candidate-build-observed",
        owner: "A22 production reliability and release engineering",
        passed: !buildRefreshRequired,
        status: buildRefreshRequired ? "blocked" : "observed",
        detail: buildRefreshRequired
          ? "Previous build observation is stale after root-parity extraction; a fresh escalated build observation is required."
          : "A real candidate npm run build was observed with owner-approved escalated write access."
      },
      {
        id: "candidate-build-passed",
        owner: "A22 production reliability and release engineering",
        passed: buildPassed,
        status: "failed",
        detail: `Candidate build failed with ${blockerCount} confirmed module-resolution blocker row(s).`
      },
      {
        id: "candidate-build-blockers-confirmed",
        owner: "A22 production reliability and release engineering",
        passed: blockerCount === moduleBlockers.length && moduleBlockers.length > 0,
        status: blockerCount === moduleBlockers.length && moduleBlockers.length > 0 ? "passed" : "blocked",
        detail: `${blockerCount}/${moduleBlockers.length} module-resolution blocker row(s) are confirmed by source inspection.`
      },
      {
        id: "candidate-build-blockers-resolved",
        owner: "A22 production reliability and release engineering",
        passed: buildRefreshRequired,
        status: buildRefreshRequired ? "passed" : "blocked",
        detail: `${resolvedBlockerCount}/${moduleBlockers.length} previous module-resolution blocker row(s) now resolve in the candidate.`
      },
      {
        id: "candidate-build-git-clean-after",
        owner: "A25 git hygiene and release intake",
        passed: statusAllowed,
        status: statusAllowed ? "passed" : "blocked",
        detail: `Candidate worktree normal git status entries after build snapshot: ${statusEntries.length}; boundedDirtyAccepted=${boundedDirtyAccepted}.`
      },
      {
        id: "candidate-build-artifact-present",
        owner: "A22 production reliability and release engineering",
        passed: nextDirPresent && nextDirSizeKiB > 0,
        status: nextDirPresent && nextDirSizeKiB > 0 ? "observed" : "blocked",
        detail: `.next build artifact is present and ignored; cleanup is not authorized in this pass.`
      }
    ],
    summary: {
      buildPassed,
      exitStatus: observedExitStatus,
      failureCategory,
      moduleBlockerRows: moduleBlockers.length,
      confirmedModuleBlockerRows: blockerCount,
      resolvedModuleBlockerRows: resolvedBlockerCount,
      buildRefreshRequired,
      statusEntryCount: statusEntries.length,
      statusAllowed,
      boundedDirtyAccepted,
      ignoredEntryCount: ignoredEntries.length,
      nextDirPresent,
      nextDirSizeKiB,
      nextDirSizeMiB: Math.round(nextDirSizeKiB / 1024),
      tsbuildInfoPresent: fs.existsSync(path.join(candidatePath, "tsconfig.tsbuildinfo")),
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      rerunsBuild: false,
      usesObservedEscalatedBuild: true,
      requiresEscalatedBuildToRefreshActualBuild: true,
      runsTypeCheck: false,
      runsRegression: false,
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

export function stableTopCleanCandidateBuildSnapshotProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    buildStatus: payload.buildStatus,
    topCandidate: payload.topCandidate,
    buildObservation: payload.buildObservation,
    moduleBlockers: payload.moduleBlockers,
    candidateWorktreeStatus: payload.candidateWorktreeStatus,
    buildArtifacts: payload.buildArtifacts,
    validationRows: payload.validationRows,
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

function markdown(payload) {
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";
  const blockerRows = payload.moduleBlockers.map((blocker) => (
    `| \`${cell(blocker.importer)}\` | \`${cell(blocker.moduleSpecifier)}\` | ${blocker.importPresent ? "yes" : "no"} | ${blocker.expectedModuleResolved ? "yes" : "no"} | ${blocker.blockerConfirmed ? "yes" : "no"} |`
  )).join("\n") || "| none | none | no | no | no |";
  const artifactSize = `${payload.summary.nextDirSizeMiB} MiB`;

  return `# A22 Top Clean Candidate Build Snapshot

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This snapshot records the observed A22 top candidate build result without rerunning \`next build\`. The real build required owner-approved escalated write access because Next writes \`.next\` in the linked worktree. This artifact does not select a release source, rerun build, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Build status: ${payload.buildStatus}
- Top candidate branch: \`${payload.topCandidate.branch}\`
- Top candidate path: \`${payload.topCandidate.path}\`
- Command observed: \`${payload.buildObservation.command.argv.join(" ")}\`
- Exit status: ${payload.summary.exitStatus}
- Failure category: ${payload.summary.failureCategory}
- Module blocker rows: ${payload.summary.confirmedModuleBlockerRows}/${payload.summary.moduleBlockerRows}
- Resolved previous module blocker rows: ${payload.summary.resolvedModuleBlockerRows}/${payload.summary.moduleBlockerRows}
- Build refresh required: ${payload.summary.buildRefreshRequired ? "yes" : "no"}
- Candidate normal git status entries: ${payload.summary.statusEntryCount}
- Candidate status allowed: ${payload.summary.statusAllowed ? "yes" : "no"}
- Bounded dirty accepted: ${payload.summary.boundedDirtyAccepted ? "yes" : "no"}
- Ignored entries: ${payload.summary.ignoredEntryCount}
- .next present: ${payload.summary.nextDirPresent ? "yes" : "no"}
- .next size: ${artifactSize}
- tsconfig.tsbuildinfo present: ${payload.summary.tsbuildInfoPresent ? "yes" : "no"}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Module Blockers

| Importer | Module | Import present | Target resolved | Blocker confirmed |
| --- | --- | --- | --- | --- |
${blockerRows}

## Boundary

Failed build or stale build-observation status remains a validation blocker. The ignored \`.next\` artifact remains present because cleanup is not authorized in this pass.
`;
}

function main() {
  const payload = buildTopCleanCandidateBuildSnapshot();
  write(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_BUILD_SNAPSHOT_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate build snapshot generated");
  console.log(`Build status: ${payload.buildStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Module blockers: ${payload.summary.confirmedModuleBlockerRows}/${payload.summary.moduleBlockerRows}`);
  console.log(`.next present: ${payload.summary.nextDirPresent ? "yes" : "no"}`);
  console.log(`Cleanup authorized rows: ${payload.summary.cleanupAuthorizedRows}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
