#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildA22FallbackCleanCandidateValidationSnapshot
} from "./generate-a22-fallback-clean-candidate-validation-snapshot.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestJson: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-sweep.json",
  latestMarkdown: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-sweep.md",
  datedJson: `coordination/release-intake/${date}-A22-fallback-clean-candidate-validation-sweep.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-fallback-clean-candidate-validation-sweep.md`
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

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function parseArgs(argv) {
  const candidateBranches = argv
    .filter((arg) => arg.startsWith("--candidate-branch="))
    .map((arg) => arg.slice("--candidate-branch=".length))
    .filter(Boolean);
  const maxArg = argv.find((arg) => arg.startsWith("--max-candidates="));
  const maxCandidates = argv.includes("--all")
    ? Number.POSITIVE_INFINITY
    : Number(maxArg ? maxArg.slice("--max-candidates=".length) : 1);
  const normalizedMaxCandidates = maxCandidates === Number.POSITIVE_INFINITY
    ? Number.POSITIVE_INFINITY
    : Number.isFinite(maxCandidates) && maxCandidates > 0
      ? Math.floor(maxCandidates)
      : 1;
  return {
    candidateBranches,
    includeValidated: argv.includes("--include-validated"),
    maxCandidates: normalizedMaxCandidates
  };
}

function selectableFallbackRows(queue, options) {
  const rows = queue.validationQueueRows ?? [];
  const fallbackRows = rows.filter((row) => row.isTopCandidate === false);
  if (options.candidateBranches.length > 0) {
    const wanted = new Set(options.candidateBranches);
    return fallbackRows.filter((row) => wanted.has(row.branch));
  }
  return fallbackRows
    .filter((row) => options.includeValidated ||
      row.queueActionStatus === "fallback-validation-candidate-awaiting-separate-plan")
    .slice(0, options.maxCandidates);
}

function summarizeSnapshot(snapshot) {
  return {
    branch: snapshot.candidate?.branch ?? "",
    expectedBranch: snapshot.candidate?.expectedBranch ?? "",
    path: snapshot.candidate?.path ?? "",
    head: snapshot.candidate?.head ?? "",
    queueRank: snapshot.candidate?.queueRank ?? null,
    queueActionStatusBeforeValidation: snapshot.candidate?.queueActionStatusBeforeValidation ?? "",
    validationPassed: snapshot.summary?.validationPassed === true,
    typeCheckPassed: snapshot.summary?.typeCheckPassed === true,
    typeCheckErrorLines: snapshot.summary?.typeCheckErrorLines ?? null,
    buildPassed: snapshot.summary?.buildPassed === true,
    trackedStatusCleanBefore: snapshot.summary?.trackedStatusCleanBefore === true,
    trackedStatusCleanAfter: snapshot.summary?.trackedStatusCleanAfter === true,
    trackedMutationDetected: snapshot.summary?.trackedMutationDetected === true,
    typeCheckExitStatus: snapshot.typeCheck?.exitStatus ?? null,
    buildExitStatus: snapshot.build?.exitStatus ?? null,
    typeCheckDurationMs: snapshot.typeCheck?.durationMs ?? null,
    buildDurationMs: snapshot.build?.durationMs ?? null,
    beforeStatusRows: snapshot.beforeStatusRows ?? [],
    afterStatusRows: snapshot.afterStatusRows ?? [],
    firstTypeCheckErrors: snapshot.typeCheck?.firstErrors ?? [],
    boundary: snapshot.boundary
  };
}

function buildA22FallbackCleanCandidateValidationSweep(options = parseArgs(process.argv.slice(2))) {
  const dirtyMap = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.dirtyMap);
  const queue = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.cleanSourceValidationQueue);
  const candidates = selectableFallbackRows(queue, options);
  const results = [];

  for (const candidate of candidates) {
    const startedAt = new Date().toISOString();
    try {
      const snapshot = buildA22FallbackCleanCandidateValidationSnapshot({ candidateBranch: candidate.branch });
      results.push({
        status: snapshot.summary?.validationPassed === true ? "pass" : "fail",
        startedAt,
        finishedAt: new Date().toISOString(),
        ...summarizeSnapshot(snapshot)
      });
    } catch (error) {
      results.push({
        status: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        branch: candidate.branch ?? "",
        expectedBranch: candidate.branch ?? "",
        path: candidate.path ?? "",
        head: candidate.head ?? "",
        queueRank: candidate.queueRank ?? null,
        queueActionStatusBeforeValidation: candidate.queueActionStatus ?? "",
        error: String(error?.message ?? error),
        validationPassed: false,
        typeCheckPassed: false,
        typeCheckErrorLines: null,
        buildPassed: false,
        trackedMutationDetected: false,
        beforeStatusRows: [],
        afterStatusRows: [],
        firstTypeCheckErrors: [],
        boundary: null
      });
    }
  }

  const validationPassedRows = results.filter((row) => row.validationPassed === true).length;
  const mutationRows = results.filter((row) => row.trackedMutationDetected === true).length;
  const errorRows = results.filter((row) => row.status === "error").length;
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    sweepKind: "a22-fallback-clean-candidate-validation-sweep",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      dirtyMap: {
        path: A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.dirtyMap,
        generatedAt: dirtyMap.generatedAt ?? null,
        dirtyMapStatusSignature: dirtyMap.statusSignature,
        expandedStatusEntries: dirtyMapEntryCount(dirtyMap)
      },
      cleanSourceValidationQueue: {
        path: A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.cleanSourceValidationQueue,
        generatedAt: queue.generatedAt ?? null,
        dirtyMapStatusSignature: queue.dirtyMapStatusSignature ?? null,
        expandedStatusEntries: queue.expandedStatusEntries ?? null,
        queueStatus: queue.queueStatus ?? ""
      }
    },
    summary: {
      requestedCandidateBranches: options.candidateBranches,
      includeValidated: options.includeValidated,
      maxCandidates: Number.isFinite(options.maxCandidates) ? options.maxCandidates : "all",
      queueFallbackRows: (queue.validationQueueRows ?? []).filter((row) => row.isTopCandidate === false).length,
      selectedRows: candidates.length,
      resultRows: results.length,
      validationPassedRows,
      validationFailedRows: results.filter((row) => row.status === "fail").length,
      errorRows,
      mutationRows,
      releaseSourceSelected: false,
      promotionEligibleNow: validationPassedRows > 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    results,
    checks: [
      {
        id: "selected-fallback-candidates",
        status: candidates.length > 0 ? "pass" : "fail",
        detail: `selectedRows=${candidates.length}`
      },
      {
        id: "candidate-local-validation-only",
        status: "pass",
        detail: "runs candidate-local type-check/build evidence only"
      },
      {
        id: "no-tracked-mutation",
        status: mutationRows === 0 ? "pass" : "fail",
        detail: `mutationRows=${mutationRows}`
      },
      {
        id: "non-executable-boundary",
        status: "pass",
        detail: "does not select release source, stage, commit, merge, deploy, cleanup, or run destructive git"
      }
    ],
    boundary: {
      evidenceOnly: true,
      runsTypeCheck: true,
      runsBuild: true,
      runsRegression: false,
      recordsOwnerInput: false,
      recordsOwnerApproval: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      selectsReleaseSource: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

function markdown(payload) {
  const rows = payload.results.map((row) =>
    `| ${row.queueRank ?? ""} | \`${row.branch}\` | ${row.status} | ${row.typeCheckPassed ? "yes" : "no"} | ${row.typeCheckErrorLines ?? ""} | ${row.buildPassed ? "yes" : "no"} | ${row.trackedMutationDetected ? "yes" : "no"} |`
  ).join("\n");
  const checks = payload.checks.map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`).join("\n");
  return `# A22 Fallback Clean Candidate Validation Sweep

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This sweep records A22 clean-source validation queue evidence only. It runs candidate-local type-check/build commands for selected fallback branches. It does not select a release source, stage, commit, merge, deploy, clean, delete, reset, prune, record owner input, or authorize physical lifecycle cleanup.

## Summary

- Selected rows: ${payload.summary.selectedRows}
- Validation passed rows: ${payload.summary.validationPassedRows}
- Validation failed rows: ${payload.summary.validationFailedRows}
- Error rows: ${payload.summary.errorRows}
- Mutation rows: ${payload.summary.mutationRows}
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Results

| Rank | Branch | Status | Type-check passed | TS errors | Build passed | Tracked mutation |
| ---: | --- | --- | --- | ---: | --- | --- |
${rows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Runs type-check: true
- Runs build: true
- Runs regression: false
- Selects release source: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
`;
}

export function writeA22FallbackCleanCandidateValidationSweep(options = parseArgs(process.argv.slice(2))) {
  const payload = buildA22FallbackCleanCandidateValidationSweep(options);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.latestMarkdown, markdown(payload));
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SWEEP_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22FallbackCleanCandidateValidationSweep();
  console.log("A22 fallback clean candidate validation sweep generated");
  console.log(`Selected rows: ${payload.summary.selectedRows}`);
  console.log(`Validation passed rows: ${payload.summary.validationPassedRows}`);
  console.log(`Validation failed rows: ${payload.summary.validationFailedRows}`);
  console.log(`Error rows: ${payload.summary.errorRows}`);
  console.log(`Mutation rows: ${payload.summary.mutationRows}`);
}
