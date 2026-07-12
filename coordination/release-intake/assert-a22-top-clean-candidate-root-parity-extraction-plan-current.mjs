#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS,
  buildTopCleanCandidateRootParityExtractionPlan,
  stableTopCleanCandidateRootParityExtractionPlanProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-extraction-plan-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function unitById(units, unitId) {
  return (units ?? []).find((unit) => unit.unitId === unitId) ?? null;
}

function validationById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function hasOwner(unit, ownerId) {
  return (unit.primaryOwnerIds ?? []).includes(ownerId) || (unit.coordinationOwnerIds ?? []).includes(ownerId);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson);
  const current = buildTopCleanCandidateRootParityExtractionPlan();
  if (!sameJson(
    stableTopCleanCandidateRootParityExtractionPlanProjection(recorded),
    stableTopCleanCandidateRootParityExtractionPlanProjection(current)
  )) {
    failures.push("A22 top clean candidate root-parity extraction plan is stale");
  }

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.dirtyMap);
  const routing = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.topCleanCandidateBuildBlockerRouting);
  const units = recorded.extractionUnits ?? [];
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];

  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("plan dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) failures.push("plan expanded status entries are stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.planStatus !== "reviewable-non-executable") failures.push("planStatus must be reviewable-non-executable");
  if ((summary.blockerRowsCovered ?? -1) !== 5) failures.push("plan should cover all 5 A22 build blocker rows");
  if ((summary.extractionUnitRows ?? -1) !== 4) failures.push("plan should contain 4 deduplicated extraction units");
  if ((summary.rootSourcesAvailable ?? -1) !== 4) failures.push("all 4 root parity sources should be available");
  if (((summary.candidateTargetsMissing ?? 0) + (summary.candidateTargetsMatchingRoot ?? 0)) !== 4) {
    failures.push("all 4 candidate target paths should be either missing or verified against the root source");
  }
  if ((summary.buildBlockerRows ?? -1) !== (routing.summary?.moduleBlockerRows ?? 0)) {
    failures.push("summary.buildBlockerRows must match routing moduleBlockerRows");
  }
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");
  if (summary.allRootSourcesAvailable !== true) failures.push("summary.allRootSourcesAvailable must be true");
  if (summary.allCandidateTargetsMissingOrVerified !== true) failures.push("summary.allCandidateTargetsMissingOrVerified must be true");
  if (summary.allRowsNonExecutable !== true) failures.push("summary.allRowsNonExecutable must be true");

  for (const unit of units) {
    if (unit.rootSource?.existsInRoot !== true) failures.push(`${unit.unitId} must have a root source`);
    if (!unit.rootSource?.sha256) failures.push(`${unit.unitId} must include root source SHA-256`);
    if ((unit.rootSource?.bytes ?? 0) <= 0) failures.push(`${unit.unitId} root source must have bytes`);
    if (unit.candidateTargetExists !== false && unit.candidateTargetMatchesRoot !== true) {
      failures.push(`${unit.unitId} target should be missing or match the root source under controlled recovery`);
    }
    if (unit.executionInstructionRecorded !== false) failures.push(`${unit.unitId} must not record execution instruction`);
    if (unit.cleanupAuthorized !== false || unit.executableNow !== false || unit.deployAuthorized !== false || unit.mergeAuthorized !== false) {
      failures.push(`${unit.unitId} must remain non-executable and non-authorizing`);
    }
  }

  const viz = unitById(units, "a06-visualization-back-to-top-import-parity");
  if (!viz) failures.push("missing A06 visualization parity unit");
  if (viz && (!hasOwner(viz, "A06") || viz.rootSource.path !== "components/visualizations/VisualizationLabBackToTopButton.tsx")) {
    failures.push("A06 visualization unit must point to the visualization component parity source");
  }

  const mathVirus = unitById(units, "a20-math-virus-blaster-data-parity");
  if (!mathVirus) failures.push("missing A20 math virus blaster data parity unit");
  if (mathVirus && (!hasOwner(mathVirus, "A20") || mathVirus.rootSource.path !== "data/mathVirusBlaster.ts")) {
    failures.push("mathVirusBlaster unit must route to A20 and the root data module");
  }

  const tank = unitById(units, "a20-mighty-tank-battle-data-parity");
  if (!tank) failures.push("missing A20 mighty tank battle data parity unit");
  if (tank && (!hasOwner(tank, "A20") || tank.rootSource.path !== "data/mightyTankBattle.ts")) {
    failures.push("mightyTankBattle unit must route to A20 and the root data module");
  }

  const illustrations = unitById(units, "a05-california-high-school-lesson-illustration-data-parity");
  if (!illustrations) failures.push("missing A05 California high-school illustration data parity unit");
  if (illustrations) {
    for (const ownerId of ["A05", "A18", "A21", "A24"]) {
      if (!hasOwner(illustrations, ownerId)) failures.push(`California illustration unit must include ${ownerId}`);
    }
    if (illustrations.rootSource.path !== "data/usCaliforniaHighSchoolLessonIllustrations.ts") {
      failures.push("California illustration unit must point to the root high-school illustration data module");
    }
    if (illustrations.coveredBlockerRows !== 2) {
      failures.push("California illustration unit should cover both importer blocker rows");
    }
  }

  for (const requiredId of [
    "build-blocker-routing-current",
    "root-parity-sources-fingerprinted",
    "candidate-targets-still-missing",
    "extraction-plan-non-executable"
  ]) {
    const row = validationById(validationRows, requiredId);
    if (!row) failures.push(`missing validation row: ${requiredId}`);
    if (row?.passed !== true) failures.push(`${requiredId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["rootParityPlanOnly", true],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["writesRootSourceFiles", false],
    ["selectsReleaseSource", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["stagesFiles", false],
    ["commits", false],
    ["merges", false],
    ["pushes", false],
    ["deploys", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const commands = recorded.safeValidationCommands ?? [];
  for (const requiredCommand of [
    "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Root-Parity Extraction Plan",
    "root-parity extraction planning evidence only",
    "Extraction Units",
    "Validation Rows",
    "not executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`extraction plan markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("extraction plan markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    planStatus: recorded.planStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    blockerRowsCovered: summary.blockerRowsCovered ?? 0,
    extractionUnitRows: summary.extractionUnitRows ?? 0,
    rootSourcesAvailable: summary.rootSourcesAvailable ?? 0,
    candidateTargetsMissing: summary.candidateTargetsMissing ?? 0,
    candidateTargetsMatchingRoot: summary.candidateTargetsMatchingRoot ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 top clean candidate root-parity extraction plan gate");
    console.log(`Plan status: ${payload.planStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Extraction units: ${payload.extractionUnitRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate root-parity extraction plan gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
