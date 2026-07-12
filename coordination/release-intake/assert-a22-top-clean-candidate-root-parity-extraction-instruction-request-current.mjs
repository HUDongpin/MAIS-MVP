#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS,
  buildTopCleanCandidateRootParityExtractionInstructionRequest,
  stableTopCleanCandidateRootParityExtractionInstructionRequestProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-top-clean-candidate-root-parity-extraction-instruction-request-current-gate.json");
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

function instructionByUnit(rows, unitId) {
  return (rows ?? []).find((row) => row.unitId === unitId) ?? null;
}

function validationById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function hasAllText(value, needles) {
  return typeof value === "string" && needles.every((needle) => value.includes(needle));
}

function main() {
  const failures = [];
  for (const requiredPath of [
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson,
    TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson);
  const current = buildTopCleanCandidateRootParityExtractionInstructionRequest();
  if (!sameJson(
    stableTopCleanCandidateRootParityExtractionInstructionRequestProjection(recorded),
    stableTopCleanCandidateRootParityExtractionInstructionRequestProjection(current)
  )) {
    failures.push("A22 root-parity extraction instruction request is stale");
  }

  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.dirtyMap);
  const plan = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.rootParityExtractionPlan);
  const rows = recorded.instructionRows ?? [];
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const validationRows = recorded.validationRows ?? [];

  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("request dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) failures.push("request expanded status entries are stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.requestStatus !== "waiting-for-owner-execution-instruction") {
    failures.push("requestStatus must be waiting-for-owner-execution-instruction");
  }
  if (plan.planStatus !== "reviewable-non-executable") failures.push("source root parity plan must remain reviewable-non-executable");
  if ((summary.instructionRows ?? -1) !== 4) failures.push("instructionRows must be 4");
  if ((summary.readyForOwnerInstructionRows ?? -1) !== 4) failures.push("readyForOwnerInstructionRows must be 4");
  if ((summary.rootSourcesAvailable ?? -1) !== 4) failures.push("rootSourcesAvailable must be 4");
  if (((summary.candidateTargetsMissing ?? 0) + (summary.candidateTargetsMatchingRoot ?? 0)) !== 4) {
    failures.push("all 4 candidate targets must be missing or verified against the root source");
  }
  if (summary.candidateTargetsMissingOrVerified !== true) failures.push("candidateTargetsMissingOrVerified must be true");
  if ((summary.blockerRowsCovered ?? -1) !== 5) failures.push("blockerRowsCovered must be 5");
  if ((summary.proposedActionOptionRows ?? -1) !== 5) failures.push("proposedActionOptionRows must be 5");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  for (const requiredUnit of [
    "a06-visualization-back-to-top-import-parity",
    "a20-math-virus-blaster-data-parity",
    "a20-mighty-tank-battle-data-parity",
    "a05-california-high-school-lesson-illustration-data-parity"
  ]) {
    const row = instructionByUnit(rows, requiredUnit);
    if (!row) failures.push(`missing instruction row: ${requiredUnit}`);
    if (!row) continue;
    if (row.instructionStatus !== "waiting-for-owner-execution-instruction") {
      failures.push(`${requiredUnit} must wait for owner execution instruction`);
    }
    if (row.rootSource?.existsInRoot !== true) failures.push(`${requiredUnit} root source must exist`);
    if (!/^[a-f0-9]{64}$/.test(row.rootSource?.sha256 ?? "")) failures.push(`${requiredUnit} root source sha must be sha256`);
    if (row.candidateTargetExists !== false && row.candidateTargetMatchesRoot !== true) {
      failures.push(`${requiredUnit} target must be missing or match the root source under controlled recovery`);
    }
    if (!hasAllText(row.authorizationText, [
      `unitId=${requiredUnit}`,
      "No cleanup",
      "No deploy",
      "No merge",
      "No broad staging",
      "No destructive git",
      "No physical lifecycle cleanup"
    ])) {
      failures.push(`${requiredUnit} authorization text missing required boundary text`);
    }
    if (!Array.isArray(row.proposedActionOptions) || row.proposedActionOptions.length < 1) {
      failures.push(`${requiredUnit} must include at least one proposed action option`);
    }
    if (row.cleanupAuthorized !== false || row.executableNow !== false || row.deployAuthorized !== false || row.mergeAuthorized !== false) {
      failures.push(`${requiredUnit} must remain non-executable and non-authorizing`);
    }
  }

  const a06 = instructionByUnit(rows, "a06-visualization-back-to-top-import-parity");
  if (a06 && (a06.proposedActionOptions ?? []).length !== 2) failures.push("A06 instruction must include re-export and import-align options");
  if (a06 && !(a06.primaryOwnerIds ?? []).includes("A06")) failures.push("A06 instruction must include A06 as primary owner");

  const mathVirus = instructionByUnit(rows, "a20-math-virus-blaster-data-parity");
  if (mathVirus && !mathVirus.proposedActionOptions?.[0]?.draftCommandsDoNotRun?.some((command) => command.includes("data/mathVirusBlaster.ts"))) {
    failures.push("mathVirusBlaster instruction must include same-path data command draft");
  }

  const tank = instructionByUnit(rows, "a20-mighty-tank-battle-data-parity");
  if (tank && !tank.proposedActionOptions?.[0]?.draftCommandsDoNotRun?.some((command) => command.includes("data/mightyTankBattle.ts"))) {
    failures.push("mightyTankBattle instruction must include same-path data command draft");
  }

  const illustrations = instructionByUnit(rows, "a05-california-high-school-lesson-illustration-data-parity");
  if (illustrations) {
    for (const ownerId of ["A05", "A18", "A21", "A24", "A22", "A25"]) {
      const owners = [...(illustrations.primaryOwnerIds ?? []), ...(illustrations.coordinationOwnerIds ?? [])];
      if (!owners.includes(ownerId)) failures.push(`California illustration instruction must include ${ownerId}`);
    }
    if ((illustrations.coveredBlockerRows ?? 0) !== 2) failures.push("California illustration instruction must cover 2 blocker rows");
  }

  for (const requiredId of [
    "root-parity-plan-current",
    "owner-instruction-texts-prepared",
    "candidate-targets-still-missing",
    "request-non-executable"
  ]) {
    const row = validationById(validationRows, requiredId);
    if (!row) failures.push(`missing validation row: ${requiredId}`);
    if (row?.passed !== true) failures.push(`${requiredId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["ownerInstructionRequestOnly", true],
    ["writesOwnerInput", false],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["writesRootSourceFiles", false],
    ["selectsReleaseSource", false],
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
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
  ]) {
    if (!commands.includes(requiredCommand)) failures.push(`missing safe validation command: ${requiredCommand}`);
  }

  const markdown = readText(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Top Clean Candidate Root-Parity Extraction Instruction Request",
    "owner-instruction request only",
    "Copyable Owner Instruction Texts",
    "No cleanup",
    "not executable"
  ]) {
    if (!markdown.includes(needle)) failures.push(`instruction request markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("instruction request markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    requestStatus: recorded.requestStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    instructionRows: summary.instructionRows ?? 0,
    readyForOwnerInstructionRows: summary.readyForOwnerInstructionRows ?? 0,
    blockerRowsCovered: summary.blockerRowsCovered ?? 0,
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
    console.log("A22 top clean candidate root-parity extraction instruction request gate");
    console.log(`Request status: ${payload.requestStatus ?? "unknown"}`);
    console.log(`Top candidate: ${payload.topCandidateBranch || "none"}`);
    console.log(`Instruction rows: ${payload.instructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 top clean candidate root-parity extraction instruction request gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
