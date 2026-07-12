#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestJson: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-snapshot.json",
  latestMarkdown: "coordination/release-intake/latest-A22-fallback-clean-candidate-validation-snapshot.md",
  datedJson: `coordination/release-intake/${date}-A22-fallback-clean-candidate-validation-snapshot.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-fallback-clean-candidate-validation-snapshot.md`
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

function statusRows(candidatePath) {
  const status = git(["-C", candidatePath, "status", "--short"]);
  return status ? status.split("\n").filter(Boolean) : [];
}

function branchHead(candidatePath) {
  return git(["-C", candidatePath, "rev-parse", "HEAD"]);
}

function currentBranch(candidatePath) {
  return git(["-C", candidatePath, "branch", "--show-current"]);
}

function parseOutput(stdout, stderr) {
  const combined = `${stdout ?? ""}\n${stderr ?? ""}`;
  const lines = combined.split(/\r?\n/).filter(Boolean);
  const errorLines = lines.filter((line) => /error TS\d+:/.test(line));
  const topFiles = new Map();
  const topCodes = new Map();
  for (const line of errorLines) {
    const fileMatch = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+):/);
    const altFileMatch = line.match(/^(.+?):\d+:\d+ - error (TS\d+):/);
    const file = fileMatch?.[1] || altFileMatch?.[1] || "<unknown>";
    const code = fileMatch?.[2] || altFileMatch?.[2] || "<unknown>";
    topFiles.set(file, (topFiles.get(file) || 0) + 1);
    topCodes.set(code, (topCodes.get(code) || 0) + 1);
  }
  return {
    outputLineCount: lines.length,
    errorLineCount: errorLines.length,
    topFiles: [...topFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, errors]) => ({ file, errors })),
    topCodes: [...topCodes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([code, errors]) => ({ code, errors })),
    firstErrors: errorLines.slice(0, 12)
  };
}

function runCommand(candidatePath, argv) {
  const beforeStatusRows = statusRows(candidatePath);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: candidatePath,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const durationMs = Date.now() - started;
  const finishedAt = new Date().toISOString();
  const afterStatusRows = statusRows(candidatePath);
  const output = parseOutput(result.stdout ?? "", result.stderr ?? "");
  return {
    argv,
    startedAt,
    finishedAt,
    durationMs,
    exitStatus: result.status,
    signal: result.signal,
    error: result.error ? String(result.error) : "",
    stdoutLineCount: (result.stdout ?? "").trim() ? (result.stdout ?? "").trim().split("\n").length : 0,
    stderrLineCount: (result.stderr ?? "").trim() ? (result.stderr ?? "").trim().split("\n").length : 0,
    ...output,
    beforeStatusRows,
    afterStatusRows,
    beforeStatusEntries: beforeStatusRows.length,
    afterStatusEntries: afterStatusRows.length,
    mutationDetected: beforeStatusRows.join("\n") !== afterStatusRows.join("\n")
  };
}

function candidateFromQueue(queue, branch) {
  const rows = queue.validationQueueRows ?? [];
  const exact = rows.find((row) => row.branch === branch);
  if (!exact) {
    throw new Error(`candidate branch not found in validation queue: ${branch}`);
  }
  return exact;
}

export function buildA22FallbackCleanCandidateValidationSnapshot(options = {}) {
  const candidateBranch = options.candidateBranch ?? "codex/s22-release-hygiene-2026-06-15";
  const dirtyMap = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.dirtyMap);
  const queue = readJson(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.cleanSourceValidationQueue);
  const candidate = candidateFromQueue(queue, candidateBranch);
  const candidatePath = candidate.path ?? "";
  const beforeStatusRows = statusRows(candidatePath);
  const head = branchHead(candidatePath);
  const branch = currentBranch(candidatePath);
  const typeCheck = runCommand(candidatePath, ["npm", "run", "type-check", "--", "--pretty", "false"]);
  const build = runCommand(candidatePath, ["npm", "run", "build"]);
  const afterStatusRows = statusRows(candidatePath);
  const trackedMutationDetected = beforeStatusRows.join("\n") !== afterStatusRows.join("\n");
  const validationPassed = typeCheck.exitStatus === 0 &&
    typeCheck.errorLineCount === 0 &&
    build.exitStatus === 0 &&
    typeCheck.mutationDetected === false &&
    build.mutationDetected === false &&
    trackedMutationDetected === false &&
    afterStatusRows.length === beforeStatusRows.length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    snapshotKind: "a22-fallback-clean-candidate-validation-snapshot",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      dirtyMap: {
        path: A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.dirtyMap,
        generatedAt: dirtyMap.generatedAt ?? null,
        dirtyMapStatusSignature: dirtyMap.statusSignature,
        expandedStatusEntries: dirtyMapEntryCount(dirtyMap)
      },
      cleanSourceValidationQueue: {
        path: A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.cleanSourceValidationQueue,
        generatedAt: queue.generatedAt ?? null,
        dirtyMapStatusSignature: queue.dirtyMapStatusSignature ?? null,
        expandedStatusEntries: queue.expandedStatusEntries ?? null
      }
    },
    candidate: {
      branch,
      expectedBranch: candidateBranch,
      path: candidatePath,
      head,
      queueRank: candidate.queueRank ?? null,
      wasTopCandidate: candidate.isTopCandidate === true,
      queueActionStatusBeforeValidation: candidate.queueActionStatus ?? "",
      gateCoverageStatusBeforeValidation: candidate.gateCoverageStatus ?? ""
    },
    summary: {
      validationPassed,
      typeCheckPassed: typeCheck.exitStatus === 0 && typeCheck.errorLineCount === 0,
      typeCheckErrorLines: typeCheck.errorLineCount,
      buildPassed: build.exitStatus === 0,
      trackedStatusCleanBefore: beforeStatusRows.length === 0,
      trackedStatusCleanAfter: afterStatusRows.length === 0,
      trackedMutationDetected,
      releaseSourceSelected: false,
      promotionEligibleNow: validationPassed,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    typeCheck,
    build,
    beforeStatusRows,
    afterStatusRows,
    checks: [
      {
        id: "candidate-in-validation-queue",
        status: candidate.branch === candidateBranch ? "pass" : "fail",
        detail: `candidate=${candidate.branch ?? "missing"}`
      },
      {
        id: "candidate-is-fallback",
        status: candidate.isTopCandidate === false ? "pass" : "fail",
        detail: `isTopCandidate=${candidate.isTopCandidate}`
      },
      {
        id: "tracked-status-stable",
        status: trackedMutationDetected === false && beforeStatusRows.length === afterStatusRows.length ? "pass" : "fail",
        detail: `before=${beforeStatusRows.length}; after=${afterStatusRows.length}`
      },
      {
        id: "type-check-green",
        status: typeCheck.exitStatus === 0 && typeCheck.errorLineCount === 0 ? "pass" : "fail",
        detail: `exit=${typeCheck.exitStatus}; errors=${typeCheck.errorLineCount}`
      },
      {
        id: "build-green",
        status: build.exitStatus === 0 ? "pass" : "fail",
        detail: `exit=${build.exitStatus}`
      },
      {
        id: "non-executable-boundary",
        status: "pass",
        detail: "snapshot records validation evidence only; release-source selection, merge, deploy, cleanup, staging, and destructive git remain unauthorized"
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
  const checks = payload.checks.map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`).join("\n");
  return `# A22 Fallback Clean Candidate Validation Snapshot

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This snapshot validates one fallback clean-source candidate after the current top candidate remained blocked by type-check/build remediation. It runs candidate-local type-check and build only. It does not select a release source, stage, commit, merge, deploy, clean, delete, reset, prune, record owner input, or authorize physical lifecycle cleanup.

## Candidate

- Branch: \`${payload.candidate.branch}\`
- Path: \`${payload.candidate.path}\`
- Head: \`${payload.candidate.head}\`
- Queue rank: ${payload.candidate.queueRank}
- Was top candidate: ${payload.candidate.wasTopCandidate ? "yes" : "no"}
- Queue action before validation: \`${payload.candidate.queueActionStatusBeforeValidation}\`

## Summary

- Validation passed: ${payload.summary.validationPassed ? "yes" : "no"}
- Type-check passed: ${payload.summary.typeCheckPassed ? "yes" : "no"}
- Type-check error lines: ${payload.summary.typeCheckErrorLines}
- Build passed: ${payload.summary.buildPassed ? "yes" : "no"}
- Tracked status clean before: ${payload.summary.trackedStatusCleanBefore ? "yes" : "no"}
- Tracked status clean after: ${payload.summary.trackedStatusCleanAfter ? "yes" : "no"}
- Tracked mutation detected: ${payload.summary.trackedMutationDetected ? "yes" : "no"}
- Release source selected: no
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Cleanup-authorized rows: 0
- Executable rows: 0

## Commands

- Type-check: \`${payload.typeCheck.argv.join(" ")}\` exit=${payload.typeCheck.exitStatus}, duration=${payload.typeCheck.durationMs}ms
- Build: \`${payload.build.argv.join(" ")}\` exit=${payload.build.exitStatus}, duration=${payload.build.durationMs}ms

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

export function writeA22FallbackCleanCandidateValidationSnapshot(options = {}) {
  const payload = buildA22FallbackCleanCandidateValidationSnapshot(options);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.latestMarkdown, markdown(payload));
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_FALLBACK_CLEAN_CANDIDATE_VALIDATION_SNAPSHOT_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const branchArg = process.argv.find((arg) => arg.startsWith("--candidate-branch="));
  const candidateBranch = branchArg ? branchArg.slice("--candidate-branch=".length) : undefined;
  const payload = writeA22FallbackCleanCandidateValidationSnapshot({ candidateBranch });
  console.log("A22 fallback clean candidate validation snapshot generated");
  console.log(`Candidate: ${payload.candidate.branch}`);
  console.log(`Validation passed: ${payload.summary.validationPassed ? "yes" : "no"}`);
  console.log(`Type-check error lines: ${payload.summary.typeCheckErrorLines}`);
  console.log(`Build passed: ${payload.summary.buildPassed ? "yes" : "no"}`);
}
