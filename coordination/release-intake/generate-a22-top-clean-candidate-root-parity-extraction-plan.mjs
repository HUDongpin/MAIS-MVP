#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS } from "./generate-a22-top-clean-candidate-build-blocker-routing.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  topCleanCandidateBuildBlockerRouting: TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestJson,
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-plan.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-plan.md`
};

const extractionRules = [
  {
    match: "@/app/visualization-lab/VisualizationLabBackToTopButton",
    unitId: "a06-visualization-back-to-top-import-parity",
    actionMode: "owner-reviewed-reexport-or-import-align",
    rootSourcePath: "components/visualizations/VisualizationLabBackToTopButton.tsx",
    candidateTargetPath: "app/visualization-lab/VisualizationLabBackToTopButton.tsx",
    targetDescription: "A06 may create an app-level re-export or rewrite the importer to the existing visualization component path after owner review.",
    primaryOwnerIds: ["A06"],
    coordinationOwnerIds: ["A22", "A25"]
  },
  {
    match: "@/data/mathVirusBlaster",
    unitId: "a20-math-virus-blaster-data-parity",
    actionMode: "owner-reviewed-same-path-data-extraction",
    rootSourcePath: "data/mathVirusBlaster.ts",
    candidateTargetPath: "data/mathVirusBlaster.ts",
    targetDescription: "A20 may extract the root-local data module into the candidate at the same path after reviewing game-data scope.",
    primaryOwnerIds: ["A20"],
    coordinationOwnerIds: ["A10", "A22", "A25"]
  },
  {
    match: "@/data/mightyTankBattle",
    unitId: "a20-mighty-tank-battle-data-parity",
    actionMode: "owner-reviewed-same-path-data-extraction",
    rootSourcePath: "data/mightyTankBattle.ts",
    candidateTargetPath: "data/mightyTankBattle.ts",
    targetDescription: "A20 may extract the root-local data module into the candidate at the same path after reviewing game-data scope.",
    primaryOwnerIds: ["A20"],
    coordinationOwnerIds: ["A10", "A22", "A25"]
  },
  {
    match: "@/data/usCaliforniaHighSchoolLessonIllustrations",
    unitId: "a05-california-high-school-lesson-illustration-data-parity",
    actionMode: "owner-reviewed-same-path-data-extraction-with-content-signoff",
    rootSourcePath: "data/usCaliforniaHighSchoolLessonIllustrations.ts",
    candidateTargetPath: "data/usCaliforniaHighSchoolLessonIllustrations.ts",
    targetDescription: "A05 may extract the root-local illustration data after A18/A21/A24 curriculum, content-pipeline, and exact-layer coordination.",
    primaryOwnerIds: ["A05"],
    coordinationOwnerIds: ["A18", "A21", "A24", "A22", "A25"]
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
    artifactStamp(key, TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function inspectRootSource(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      existsInRoot: false,
      bytes: 0,
      sha256: "",
      lineCount: 0
    };
  }
  const buffer = fs.readFileSync(absolutePath);
  const text = buffer.toString("utf8");
  return {
    path: relativePath,
    existsInRoot: true,
    bytes: buffer.length,
    sha256: sha256(buffer),
    lineCount: text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0)
  };
}

function existsInCandidate(candidatePath, relativePath) {
  return Boolean(candidatePath) && fs.existsSync(path.join(candidatePath, relativePath));
}

function inspectCandidateTarget(candidatePath, relativePath, rootSourceSha256) {
  const absolutePath = path.join(candidatePath || "", relativePath);
  if (!candidatePath || !fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      existsInCandidate: false,
      bytes: 0,
      sha256: "",
      matchesRootSource: false
    };
  }
  const buffer = fs.readFileSync(absolutePath);
  const fingerprint = sha256(buffer);
  return {
    path: relativePath,
    existsInCandidate: true,
    bytes: buffer.length,
    sha256: fingerprint,
    matchesRootSource: Boolean(rootSourceSha256) && fingerprint === rootSourceSha256
  };
}

function ruleFor(moduleSpecifier) {
  return extractionRules.find((rule) => rule.match === moduleSpecifier) ?? null;
}

function uniqueRows(rows) {
  const byUnit = new Map();
  for (const row of rows) {
    const rule = ruleFor(row.moduleSpecifier);
    if (!rule) continue;
    if (!byUnit.has(rule.unitId)) {
      byUnit.set(rule.unitId, {
        rule,
        blockers: []
      });
    }
    byUnit.get(rule.unitId).blockers.push(row);
  }
  return [...byUnit.values()];
}

function buildUnit({ rule, blockers }, candidatePath) {
  const rootSource = inspectRootSource(rule.rootSourcePath);
  const candidateTarget = inspectCandidateTarget(candidatePath, rule.candidateTargetPath, rootSource.sha256);
  const candidateTargetExists = candidateTarget.existsInCandidate;
  const importerRows = blockers.map((row) => ({
    importer: row.importer,
    moduleSpecifier: row.moduleSpecifier,
    blockerConfirmed: row.blockerConfirmed === true,
    candidateExpectedPaths: row.candidateExpectedPaths ?? [],
    candidateObservedAlternatePaths: row.candidateObservedAlternatePaths ?? []
  }));
  return {
    unitId: rule.unitId,
    actionMode: rule.actionMode,
    rootSource,
    candidateTargetPath: rule.candidateTargetPath,
    candidateTarget,
    candidateTargetExists,
    candidateTargetMatchesRoot: candidateTarget.matchesRootSource,
    coveredBlockerRows: importerRows.length,
    importerRows,
    primaryOwnerIds: rule.primaryOwnerIds,
    coordinationOwnerIds: rule.coordinationOwnerIds,
    targetDescription: rule.targetDescription,
    requiredOwnerEvidenceBeforeExecution: [
      "owner-reviewed source parity decision",
      "owner-scoped package or branch where the file/import parity change will be applied",
      "post-change candidate npm run type-check evidence",
      "post-change candidate npm run build evidence",
      "A22 review packet refresh showing the build blocker is gone before promotion"
    ],
    executionInstructionRecorded: false,
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false
  };
}

export function buildTopCleanCandidateRootParityExtractionPlan() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.dirtyMap),
    topCleanCandidateBuildBlockerRouting: readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.topCleanCandidateBuildBlockerRouting)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const routing = artifacts.topCleanCandidateBuildBlockerRouting;
  const candidatePath = routing.topCandidate?.path ?? "";
  const groupedRows = uniqueRows(routing.rows ?? []);
  const extractionUnits = groupedRows.map((group) => buildUnit(group, candidatePath));
  const allRootSourcesAvailable = extractionUnits.length > 0 && extractionUnits.every((unit) => unit.rootSource.existsInRoot);
  const allCandidateTargetsMissing = extractionUnits.length > 0 && extractionUnits.every((unit) => unit.candidateTargetExists === false);
  const allCandidateTargetsMissingOrVerified = extractionUnits.length > 0 &&
    extractionUnits.every((unit) => unit.candidateTargetExists === false || unit.candidateTargetMatchesRoot === true);
  const routingCurrentOrResolved = sourceFailures.length === 0 &&
    (routing.summary?.allBuildBlockersRouted === true ||
      (routing.summary?.allPreviousBlockersResolved === true && routing.summary?.buildRefreshRequired === true));
  const allRowsNonExecutable = extractionUnits.every((unit) => (
    unit.executionInstructionRecorded === false &&
    unit.cleanupAuthorized === false &&
    unit.executableNow === false &&
    unit.deployAuthorized === false &&
    unit.mergeAuthorized === false
  ));

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    planStatus: allRootSourcesAvailable && allRowsNonExecutable
      ? "reviewable-non-executable"
      : "blocked-missing-source-or-boundary",
    topCandidate: {
      branch: routing.topCandidate?.branch ?? "",
      path: candidatePath,
      head: routing.topCandidate?.head ?? "",
      releaseSourceSelected: false,
      promotionEligibleNow: false
    },
    extractionUnits,
    validationRows: [
      {
        id: "build-blocker-routing-current",
        owner: "A25 git hygiene and release intake",
        passed: routingCurrentOrResolved,
        status: routingCurrentOrResolved ? "passed" : "blocked",
        detail: sourceFailures.length === 0
          ? "A22 build-blocker routing is current; blockers are either routed or resolved with build refresh still required."
          : sourceFailures.join("; ")
      },
      {
        id: "root-parity-sources-fingerprinted",
        owner: "A25 git hygiene and release intake",
        passed: allRootSourcesAvailable,
        status: allRootSourcesAvailable ? "passed" : "blocked",
        detail: `${extractionUnits.filter((unit) => unit.rootSource.existsInRoot).length}/${extractionUnits.length} extraction unit root source(s) exist and have SHA-256 fingerprints.`
      },
      {
        id: "candidate-targets-still-missing",
        owner: "A22 production reliability and release engineering",
        passed: allCandidateTargetsMissingOrVerified,
        status: allCandidateTargetsMissing ? "passed" : (allCandidateTargetsMissingOrVerified ? "passed-controlled-recovery" : "attention"),
        detail: allCandidateTargetsMissing
          ? "Candidate target paths are still missing, matching the observed module blockers."
          : "Candidate target path(s) now exist and match the root parity source under the controlled recovery candidate; refresh A22 build evidence before promotion."
      },
      {
        id: "extraction-plan-non-executable",
        owner: "A25 git hygiene and release intake",
        passed: allRowsNonExecutable,
        status: allRowsNonExecutable ? "passed" : "blocked",
        detail: "The plan records no execution instruction and authorizes no cleanup, merge, deploy, staging, or destructive Git."
      }
    ],
    safeValidationCommands: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
    ],
    summary: {
      blockerRowsCovered: extractionUnits.reduce((sum, unit) => sum + unit.coveredBlockerRows, 0),
      extractionUnitRows: extractionUnits.length,
      rootSourceRows: extractionUnits.length,
      rootSourcesAvailable: extractionUnits.filter((unit) => unit.rootSource.existsInRoot).length,
      candidateTargetsMissing: extractionUnits.filter((unit) => unit.candidateTargetExists === false).length,
      candidateTargetsMatchingRoot: extractionUnits.filter((unit) => unit.candidateTargetMatchesRoot === true).length,
      allRootSourcesAvailable,
      allCandidateTargetsMissing,
      allCandidateTargetsMissingOrVerified,
      allRowsNonExecutable,
      buildBlockerRouteGroupRows: routing.summary?.routeGroupRows ?? 0,
      buildBlockerRows: routing.summary?.moduleBlockerRows ?? 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      rootParityPlanOnly: true,
      modifiesCandidate: false,
      copiesRootFiles: false,
      writesRootSourceFiles: false,
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

export function stableTopCleanCandidateRootParityExtractionPlanProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    planStatus: payload.planStatus,
    topCandidate: payload.topCandidate,
    extractionUnits: payload.extractionUnits,
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
  const unitRows = payload.extractionUnits.map((unit) => (
    `| \`${cell(unit.unitId)}\` | ${cell(unit.primaryOwnerIds.join(", "))} | \`${cell(unit.rootSource.path)}\` | ${unit.rootSource.existsInRoot ? "yes" : "no"} | \`${cell(unit.candidateTargetPath)}\` | ${unit.candidateTargetExists ? "yes" : "no"} | ${unit.coveredBlockerRows} |`
  )).join("\n") || "| none | none | none | no | none | no | 0 |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";

  return `# A22 Top Clean Candidate Root-Parity Extraction Plan

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is root-parity extraction planning evidence only. It fingerprints root-local parity sources for the A22 top clean candidate build blockers and names the owner-reviewed target paths or import-alignment choices. It does not copy files, edit the candidate, select a release source, run type-check, run build, run regression, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Plan status: ${payload.planStatus}
- Top candidate branch: \`${payload.topCandidate.branch}\`
- Blocker rows covered: ${payload.summary.blockerRowsCovered}
- Extraction unit rows: ${payload.summary.extractionUnitRows}
- Root sources available: ${payload.summary.rootSourcesAvailable}/${payload.summary.rootSourceRows}
- Candidate targets missing: ${payload.summary.candidateTargetsMissing}/${payload.summary.extractionUnitRows}
- Candidate targets matching root: ${payload.summary.candidateTargetsMatchingRoot}/${payload.summary.extractionUnitRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Extraction Units

| Unit | Primary owners | Root parity source | Source exists | Candidate target | Target exists | Covered blockers |
| --- | --- | --- | --- | --- | --- | ---: |
${unitRows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

These rows make extraction reviewable, not executable. Owner instruction is still required before any candidate mutation, merge, deployment, cleanup, destructive Git, or physical lifecycle cleanup.
`;
}

function main() {
  const payload = buildTopCleanCandidateRootParityExtractionPlan();
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate root-parity extraction plan generated");
  console.log(`Plan status: ${payload.planStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Extraction units: ${payload.summary.extractionUnitRows}`);
  console.log(`Blocker rows covered: ${payload.summary.blockerRowsCovered}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
