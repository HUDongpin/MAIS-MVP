#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS,
  buildTopCleanCandidateRootParityExtractionPlan,
  stableTopCleanCandidateRootParityExtractionPlanProjection
} from "./generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  rootParityExtractionPlan: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_PLAN_PATHS.latestJson,
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-request.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-request.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-request.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-root-parity-extraction-instruction-request.md`
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

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function parentDir(filePath) {
  return path.posix.dirname(filePath);
}

function quotedAbsolute(candidatePath, relativePath) {
  return `"${path.join(candidatePath, relativePath)}"`;
}

function rootAbsolute(relativePath) {
  return `"${path.join(root, relativePath)}"`;
}

function proposedActionOptions(unit, candidatePath) {
  if (unit.actionMode === "owner-reviewed-reexport-or-import-align") {
    return [
      {
        optionId: `${unit.unitId}:reexport`,
        label: "A06 app-level re-export",
        proposedFiles: [unit.candidateTargetPath],
        draftCommandsDoNotRun: [
          `mkdir -p ${quotedAbsolute(candidatePath, parentDir(unit.candidateTargetPath))}`,
          `create ${quotedAbsolute(candidatePath, unit.candidateTargetPath)} with: export { VisualizationLabBackToTopButton } from "@/components/visualizations/VisualizationLabBackToTopButton";`
        ],
        ownerReviewNote: "Use only if A06 confirms an app-level re-export is the narrowest parity fix for the candidate import path."
      },
      {
        optionId: `${unit.unitId}:import-align`,
        label: "A06 importer alignment",
        proposedFiles: ["app/visualization-lab/page.tsx"],
        draftCommandsDoNotRun: [
          "edit the candidate importer from @/app/visualization-lab/VisualizationLabBackToTopButton to @/components/visualizations/VisualizationLabBackToTopButton"
        ],
        ownerReviewNote: "Use only if A06 confirms changing the import path is preferable to adding an app-level re-export."
      }
    ];
  }

  return [
    {
      optionId: `${unit.unitId}:same-path-copy`,
      label: "owner-reviewed same-path parity extraction",
      proposedFiles: [unit.candidateTargetPath],
      draftCommandsDoNotRun: [
        `mkdir -p ${quotedAbsolute(candidatePath, parentDir(unit.candidateTargetPath))}`,
        `cp ${rootAbsolute(unit.rootSource.path)} ${quotedAbsolute(candidatePath, unit.candidateTargetPath)}`
      ],
      ownerReviewNote: "Use only after the owning content/runtime session confirms the root-local source is the correct parity source for this candidate."
    }
  ];
}

function instructionText(unit, candidate) {
  const primaryOwners = (unit.primaryOwnerIds ?? []).join(",");
  const coordinationOwners = (unit.coordinationOwnerIds ?? []).join(",");
  return [
    `Authorize A22 root-parity extraction instruction for unitId=${unit.unitId}`,
    `topCandidate=${candidate.branch}`,
    `targetWorktree=${candidate.path}`,
    `primaryOwnerIds=${primaryOwners}`,
    `coordinationOwnerIds=${coordinationOwners}`,
    `actionMode=${unit.actionMode}`,
    `rootSource=${unit.rootSource.path}`,
    `rootSourceSha256=${unit.rootSource.sha256}`,
    `candidateTarget=${unit.candidateTargetPath}`,
    `coveredBlockerRows=${unit.coveredBlockerRows}`,
    "selectedAction=<reexport|import-align|same-path-copy>",
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>",
    "notes=<scope and checks>",
    "No cleanup",
    "No deploy",
    "No merge",
    "No broad staging",
    "No destructive git",
    "No physical lifecycle cleanup"
  ].join("; ") + ".";
}

function instructionRows(plan) {
  const candidate = plan.topCandidate ?? {};
  return (plan.extractionUnits ?? []).map((unit) => ({
    instructionId: `a22-root-parity-${unit.unitId}`,
    unitId: unit.unitId,
    approvalKind: "a22-root-parity-extraction-instruction",
    instructionStatus: "waiting-for-owner-execution-instruction",
    topCandidate: {
      branch: candidate.branch ?? "",
      path: candidate.path ?? "",
      head: candidate.head ?? ""
    },
    primaryOwnerIds: unit.primaryOwnerIds ?? [],
    coordinationOwnerIds: unit.coordinationOwnerIds ?? [],
    actionMode: unit.actionMode,
    rootSource: unit.rootSource,
    candidateTargetPath: unit.candidateTargetPath,
    candidateTargetExists: unit.candidateTargetExists === true,
    candidateTargetMatchesRoot: unit.candidateTargetMatchesRoot === true,
    coveredBlockerRows: unit.coveredBlockerRows ?? 0,
    importerRows: unit.importerRows ?? [],
    proposedActionOptions: proposedActionOptions(unit, candidate.path ?? ""),
    authorizationText: instructionText(unit, candidate),
    requiredPostInstructionEvidence: [
      "owner instruction row recorded with exact unitId, selectedAction, approvedBy, approvedAt, and notes",
      "candidate mutation happens only in the named A22 clean candidate worktree or an owner-approved replacement clean slice",
      "post-change candidate npm run type-check evidence",
      "post-change candidate npm run build evidence",
      "A22 review packet refresh showing candidate-build and root-parity blocker status after extraction"
    ],
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    mergeAuthorized: false,
    stageAuthorized: false,
    destructiveGitAuthorized: false
  }));
}

export function buildTopCleanCandidateRootParityExtractionInstructionRequest() {
  const dirtyMap = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.dirtyMap);
  const plan = readJson(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.rootParityExtractionPlan);
  const currentPlan = buildTopCleanCandidateRootParityExtractionPlan();
  const planCurrent = sameJson(
    stableTopCleanCandidateRootParityExtractionPlanProjection(plan),
    stableTopCleanCandidateRootParityExtractionPlanProjection(currentPlan)
  );
  const rows = instructionRows(plan);
  const rootSourcesAvailable = rows.filter((row) => row.rootSource?.existsInRoot === true).length;
  const candidateTargetsMissing = rows.filter((row) => row.candidateTargetExists === false).length;
  const candidateTargetsMatchingRoot = rows.filter((row) => row.candidateTargetMatchesRoot === true).length;
  const candidateTargetsMissingOrVerified = rows.length > 0 &&
    rows.every((row) => row.candidateTargetExists === false || row.candidateTargetMatchesRoot === true);
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized === true).length;
  const executableRows = rows.filter((row) => row.executableNow === true).length;
  const sourceCurrentnessFailures = [
    ...(plan.sourceCurrentnessFailures ?? []),
    ...(planCurrent ? [] : ["root parity extraction plan projection is stale"])
  ];

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      dirtyMap: {
        path: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.dirtyMap,
        dirtyMapStatusSignature: dirtyMap.statusSignature,
        expandedStatusEntries: dirtyMapEntryCount(dirtyMap)
      },
      rootParityExtractionPlan: {
        path: TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.rootParityExtractionPlan,
        generatedAt: plan.generatedAt ?? null,
        dirtyMapStatusSignature: plan.dirtyMapStatusSignature ?? null,
        expandedStatusEntries: plan.expandedStatusEntries ?? null,
        planStatus: plan.planStatus ?? ""
      }
    },
    sourceCurrentnessFailures,
    requestStatus: plan.planStatus === "reviewable-non-executable" && sourceCurrentnessFailures.length === 0
      ? "waiting-for-owner-execution-instruction"
      : "blocked-stale-or-unreviewable-plan",
    topCandidate: plan.topCandidate ?? {},
    instructionRows: rows,
    validationRows: [
      {
        id: "root-parity-plan-current",
        passed: planCurrent && sourceCurrentnessFailures.length === 0,
        status: planCurrent && sourceCurrentnessFailures.length === 0 ? "passed" : "blocked",
        detail: planCurrent ? "Root-parity extraction plan projection is current." : "Root-parity extraction plan projection is stale."
      },
      {
        id: "owner-instruction-texts-prepared",
        passed: rows.length === 4 && rows.every((row) => row.authorizationText.includes("No cleanup")),
        status: rows.length === 4 ? "passed" : "blocked",
        detail: `${rows.length} owner instruction text row(s) prepared for the 4 root-parity extraction units.`
      },
      {
        id: "candidate-targets-still-missing",
        passed: candidateTargetsMissingOrVerified,
        status: candidateTargetsMissing === rows.length && rows.length > 0 ? "passed" : (candidateTargetsMissingOrVerified ? "passed-controlled-recovery" : "blocked"),
        detail: candidateTargetsMissing === rows.length && rows.length > 0
          ? `${candidateTargetsMissing}/${rows.length} candidate target path(s) remain missing before extraction.`
          : `${candidateTargetsMatchingRoot}/${rows.length} candidate target path(s) already match the root source under controlled recovery.`
      },
      {
        id: "request-non-executable",
        passed: cleanupAuthorizedRows === 0 && executableRows === 0,
        status: cleanupAuthorizedRows === 0 && executableRows === 0 ? "passed" : "blocked",
        detail: "Instruction request does not authorize cleanup or execution."
      }
    ],
    safeValidationCommands: [
      "npm run release:dirty-map -- --assert-current --max-age-minutes 60",
      "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
      "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"
    ],
    summary: {
      instructionRows: rows.length,
      readyForOwnerInstructionRows: rows.filter((row) => row.instructionStatus === "waiting-for-owner-execution-instruction").length,
      rootSourceRows: rows.length,
      rootSourcesAvailable,
      candidateTargetsMissing,
      candidateTargetsMatchingRoot,
      candidateTargetsMissingOrVerified,
      blockerRowsCovered: rows.reduce((sum, row) => sum + (row.coveredBlockerRows ?? 0), 0),
      proposedActionOptionRows: rows.reduce((sum, row) => sum + (row.proposedActionOptions?.length ?? 0), 0),
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
    },
    boundary: {
      evidenceOnly: true,
      ownerInstructionRequestOnly: true,
      writesOwnerInput: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      writesRootSourceFiles: false,
      selectsReleaseSource: false,
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

export function stableTopCleanCandidateRootParityExtractionInstructionRequestProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    requestStatus: payload.requestStatus,
    topCandidate: payload.topCandidate,
    instructionRows: payload.instructionRows,
    validationRows: payload.validationRows,
    safeValidationCommands: payload.safeValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const instructionRows = payload.instructionRows.map((row) => (
    `| \`${cell(row.unitId)}\` | ${cell([...row.primaryOwnerIds, ...row.coordinationOwnerIds].join(", "))} | ${cell(row.actionMode)} | \`${cell(row.rootSource.path)}\` | \`${cell(row.candidateTargetPath)}\` | ${row.coveredBlockerRows} | ${row.candidateTargetExists ? "yes" : "no"} |`
  )).join("\n") || "| none | none | none | none | none | 0 | no |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | no | none |";
  const authorizationTexts = payload.instructionRows.map((row) => (
    `### ${row.unitId}\n\n\`${row.authorizationText}\`\n\nOptions:\n${list(row.proposedActionOptions.map((option) => `${option.label}: ${option.ownerReviewNote}`))}`
  )).join("\n\n");

  return `# A22 Top Clean Candidate Root-Parity Extraction Instruction Request

Generated: ${payload.generatedAt}

Request status: ${payload.requestStatus}

Top candidate: \`${payload.topCandidate.branch ?? ""}\`

This is an owner-instruction request only. It prepares exact review text for the A22 root-parity extraction units, but it does not write owner input, record approval, copy files, mutate the candidate, run type-check, run build, run regression, stage, commit, merge, push, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Instruction rows: ${payload.summary.instructionRows}
- Ready for owner instruction rows: ${payload.summary.readyForOwnerInstructionRows}
- Root sources available: ${payload.summary.rootSourcesAvailable}/${payload.summary.rootSourceRows}
- Candidate targets missing: ${payload.summary.candidateTargetsMissing}/${payload.summary.instructionRows}
- Candidate targets matching root: ${payload.summary.candidateTargetsMatchingRoot}/${payload.summary.instructionRows}
- Blocker rows covered: ${payload.summary.blockerRowsCovered}
- Proposed action options: ${payload.summary.proposedActionOptionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Instruction Rows

| Unit | Owners | Action mode | Root source | Candidate target | Blockers | Target exists |
| --- | --- | --- | --- | --- | ---: | --- |
${instructionRows}

## Copyable Owner Instruction Texts

${authorizationTexts}

## Validation Rows

| ID | Status | Passed | Detail |
| --- | --- | --- | --- |
${validationRows}

## Safe Validation Commands

${list(payload.safeValidationCommands.map((command) => `\`${command}\``))}

## Boundary

This request is reviewable, not executable. It keeps cleanup, merge, deployment, broad staging, destructive Git, candidate mutation, and physical lifecycle cleanup unauthorized.
`;
}

function main() {
  const payload = buildTopCleanCandidateRootParityExtractionInstructionRequest();
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_ROOT_PARITY_EXTRACTION_INSTRUCTION_REQUEST_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate root-parity extraction instruction request generated");
  console.log(`Request status: ${payload.requestStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Instruction rows: ${payload.summary.instructionRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
