#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS,
  buildTopCleanCandidateBuildBlockerRouting,
  stableTopCleanCandidateBuildBlockerRoutingProjection
} from "./generate-a22-top-clean-candidate-build-blocker-routing.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-build-blocker-routing-current-gate.json");
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

function rowByModule(rows, moduleSpecifier) {
  return (rows ?? []).filter((row) => row.moduleSpecifier === moduleSpecifier);
}

function hasOwner(row, ownerId) {
  return (row.primaryOwnerIds ?? []).includes(ownerId) || (row.coordinationOwnerIds ?? []).includes(ownerId);
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestJson);
  const current = buildTopCleanCandidateBuildBlockerRouting();
  if (!sameJson(
    stableTopCleanCandidateBuildBlockerRoutingProjection(recorded),
    stableTopCleanCandidateBuildBlockerRoutingProjection(current)
  )) {
    failures.push("A22 top clean candidate build blocker routing is stale");
  }

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.dirtyMap);
  const buildSnapshot = readJson(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.topCleanCandidateBuildSnapshot);
  const rows = recorded.rows ?? [];
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];
  const buildRefreshRequired = buildSnapshot.summary?.buildRefreshRequired === true;

  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("routing dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) failures.push("routing expanded status entries are stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (buildRefreshRequired) {
    if (recorded.routingStatus !== "routing-not-required-build-refresh-required") {
      failures.push("routingStatus must be routing-not-required-build-refresh-required");
    }
  } else if (recorded.routingStatus !== "routed-non-executable") {
    failures.push("routingStatus must be routed-non-executable");
  }
  if (recorded.buildStatus !== buildSnapshot.buildStatus) failures.push("buildStatus must match build snapshot");
  if ((summary.buildFailureCategory ?? "") !== (buildSnapshot.summary?.failureCategory ?? "")) {
    failures.push("summary.buildFailureCategory must match build snapshot");
  }
  if ((summary.moduleBlockerRows ?? -1) !== (buildSnapshot.summary?.moduleBlockerRows ?? 0)) {
    failures.push("summary.moduleBlockerRows must match build snapshot");
  }
  if ((summary.confirmedModuleBlockerRows ?? -1) !== (buildSnapshot.summary?.confirmedModuleBlockerRows ?? 0)) {
    failures.push("summary.confirmedModuleBlockerRows must match build snapshot");
  }
  if (rows.length !== (buildSnapshot.moduleBlockers ?? []).length) failures.push("routing rows must match build snapshot module blockers");
  if (buildRefreshRequired) {
    if (!rows.every((row) => row.blockerConfirmed === false)) failures.push("resolved routing rows must not remain confirmed blockers");
    if (!rows.every((row) => row.expectedModuleResolvedInCandidate === true)) {
      failures.push("all previous routing rows should be resolved in candidate");
    }
  } else {
    if (!rows.every((row) => row.blockerConfirmed === true)) failures.push("all routing rows must be confirmed blockers");
    if (!rows.every((row) => row.expectedModuleResolvedInCandidate === false)) {
      failures.push("all routing rows should be unresolved in candidate");
    }
  }
  if (!rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false && row.deployAuthorized === false && row.mergeAuthorized === false)) {
    failures.push("all routing rows must remain non-executable and non-authorizing");
  }
  if (!rows.every((row) => (row.primaryOwnerIds ?? []).length > 0)) failures.push("all routing rows need primary owners");
  if (!buildRefreshRequired && (summary.rootParitySourceRows ?? 0) < 5) failures.push("all five blocker rows should have a root parity or alternate source");
  if (buildRefreshRequired) {
    if (summary.allBuildBlockersRouted !== false) failures.push("summary.allBuildBlockersRouted must be false when fresh build is required");
    if (summary.allPreviousBlockersResolved !== true) failures.push("summary.allPreviousBlockersResolved must be true when fresh build is required");
    if (summary.resolvedModuleBlockerRows !== summary.moduleBlockerRows) failures.push("resolvedModuleBlockerRows must match moduleBlockerRows");
  } else if (summary.allBuildBlockersRouted !== true) {
    failures.push("summary.allBuildBlockersRouted must be true");
  }
  if (summary.buildPassed !== false) failures.push("summary.buildPassed must be false until A22 build evidence is green");
  if (buildRefreshRequired) {
    if (summary.candidateStatusAllowed !== true) failures.push("summary.candidateStatusAllowed must be true");
  } else if (summary.candidateCleanForGit !== true) {
    failures.push("summary.candidateCleanForGit must be true");
  }
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("summary.executableRows must be 0");

  const vizRows = rowByModule(rows, "@/app/visualization-lab/VisualizationLabBackToTopButton");
  if (vizRows.length !== 1) failures.push("expected one visualization back-to-top blocker row");
  if (vizRows[0] && !hasOwner(vizRows[0], "A06")) failures.push("visualization blocker must route to A06");

  for (const moduleSpecifier of ["@/data/mathVirusBlaster", "@/data/mightyTankBattle"]) {
    const gameRows = rowByModule(rows, moduleSpecifier);
    if (gameRows.length !== 1) failures.push(`expected one game data blocker row for ${moduleSpecifier}`);
    if (gameRows[0] && !hasOwner(gameRows[0], "A20")) failures.push(`${moduleSpecifier} blocker must route to A20`);
    if (!buildRefreshRequired && gameRows[0] && !gameRows[0].rootExpectedPaths?.some((item) => item.existsInRoot)) {
      failures.push(`${moduleSpecifier} blocker must record root data parity source`);
    }
  }

  const illustrationRows = rowByModule(rows, "@/data/usCaliforniaHighSchoolLessonIllustrations");
  if (illustrationRows.length !== 2) failures.push("expected two California high-school illustration blocker rows");
  for (const row of illustrationRows) {
    for (const ownerId of ["A05", "A18", "A21", "A24"]) {
      if (!hasOwner(row, ownerId)) failures.push(`California illustration blocker must include ${ownerId}`);
    }
    if (!buildRefreshRequired && !row.rootExpectedPaths?.some((item) => item.existsInRoot)) {
      failures.push("California illustration blocker must record root data parity source");
    }
  }

  for (const requiredId of [
    "build-snapshot-current",
    buildRefreshRequired ? "previous-build-blockers-resolved" : "build-blockers-confirmed",
    "build-blockers-owner-routed",
    "build-blockers-non-executable"
  ]) {
    const row = validationRows.find((item) => item.id === requiredId);
    if (!row) failures.push(`missing validation row: ${requiredId}`);
    if (row?.passed !== true) failures.push(`${requiredId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["routesBuildBlockersOnly", true],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
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
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_BUILD_BLOCKER_ROUTING_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Build Blocker Routing",
    "This is build-blocker routing evidence only.",
    "Owner Routes",
    "Build Blocker Rows",
    "non-executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`routing markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("routing markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    routingStatus: recorded.routingStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    moduleBlockerRows: summary.moduleBlockerRows ?? 0,
    confirmedModuleBlockerRows: summary.confirmedModuleBlockerRows ?? 0,
    routeGroupRows: summary.routeGroupRows ?? 0,
    routedOwnerRows: summary.routedOwnerRows ?? 0,
    rootParitySourceRows: summary.rootParitySourceRows ?? 0,
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
    console.log("A22 top clean candidate build blocker routing gate");
    console.log(`Routing status: ${payload.routingStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Module blockers: ${payload.confirmedModuleBlockerRows ?? 0}/${payload.moduleBlockerRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate build blocker routing gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
