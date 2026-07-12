#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-focused-smoke.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-focused-smoke.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-focused-smoke.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-focused-smoke.md`
};

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

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function existsAbsolute(absolutePath) {
  return fs.existsSync(absolutePath);
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
    artifactStamp(key, TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function parseNodeTestSummary(stdout) {
  const summary = { tests: 0, suites: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0 };
  for (const line of stdout.split("\n")) {
    for (const key of Object.keys(summary)) {
      const match = line.match(new RegExp(`\\b${key}\\s+(\\d+)`));
      if (match) summary[key] = Number(match[1]);
    }
  }
  return summary;
}

function sameStatusRows(left, right) {
  return left.length === right.length && left.every((row) => right.includes(row));
}

function statusRowsAllowed(statusRows, allowedRows) {
  if (allowedRows.length === 0) return statusRows.length === 0;
  return sameStatusRows(statusRows, allowedRows);
}

function runFocusedSmoke(candidatePath, topCandidate) {
  const command = {
    cwd: candidatePath,
    argv: [process.execPath, "scripts/vercel-region-config.test.mjs"]
  };
  const beforeStatus = gitRaw(["-C", candidatePath, "status", "--short"]);
  const beforeStatusRows = beforeStatus ? beforeStatus.split("\n").filter(Boolean) : [];
  const allowedDirtyStatusRows = topCandidate?.allowedDirtyStatusRows ?? [];
  const startedAt = new Date().toISOString();
  const result = spawnSync(command.argv[0], [command.argv[1]], {
    cwd: candidatePath,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const finishedAt = new Date().toISOString();
  const afterStatus = gitRaw(["-C", candidatePath, "status", "--short"]);
  const afterStatusRows = afterStatus ? afterStatus.split("\n").filter(Boolean) : [];
  const nodeTestSummary = parseNodeTestSummary(result.stdout ?? "");
  const boundedDirtyAccepted = topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery" &&
    allowedDirtyStatusRows.length > 0;
  const beforeStatusAllowed = boundedDirtyAccepted
    ? statusRowsAllowed(beforeStatusRows, allowedDirtyStatusRows)
    : beforeStatusRows.length === 0;
  const afterStatusAllowed = boundedDirtyAccepted
    ? statusRowsAllowed(afterStatusRows, allowedDirtyStatusRows)
    : afterStatusRows.length === 0;
  return {
    command,
    startedAt,
    finishedAt,
    exitStatus: result.status,
    signal: result.signal,
    error: result.error ? String(result.error) : "",
    stdoutLineCount: (result.stdout ?? "").trim() ? (result.stdout ?? "").trim().split("\n").length : 0,
    stderrLineCount: (result.stderr ?? "").trim() ? (result.stderr ?? "").trim().split("\n").length : 0,
    nodeTestSummary,
    allowedDirtyStatusRows,
    boundedDirtyAccepted,
    beforeStatusRows,
    afterStatusRows,
    beforeStatusEntries: beforeStatusRows.length,
    afterStatusEntries: afterStatusRows.length,
    beforeStatusClean: beforeStatus.length === 0,
    afterStatusClean: afterStatus.length === 0,
    beforeStatusAllowed,
    afterStatusAllowed,
    mutationDetected: beforeStatus !== afterStatus,
    smokePassed: result.status === 0 &&
      nodeTestSummary.tests >= 2 &&
      nodeTestSummary.pass === nodeTestSummary.tests &&
      nodeTestSummary.fail === 0 &&
      beforeStatusAllowed &&
      afterStatusAllowed &&
      beforeStatus === afterStatus
  };
}

export function buildTopCleanCandidateFocusedSmoke() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.dirtyMap),
    cleanSourceCandidatePromotion: readJson(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.cleanSourceCandidatePromotion)
  };
  const topCandidate = artifacts.cleanSourceCandidatePromotion.topCandidate ?? null;
  const rawSourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const sourceFailures = rawSourceFailures.filter((failure) => !(
    topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery" &&
    failure.startsWith("cleanSourceCandidatePromotion is stale")
  ));
  const candidatePath = topCandidate?.path ?? "";
  const scriptPath = candidatePath ? path.join(candidatePath, "scripts", "vercel-region-config.test.mjs") : "";
  const scriptPresent = Boolean(scriptPath && existsAbsolute(scriptPath));
  const smoke = scriptPresent
    ? runFocusedSmoke(candidatePath, topCandidate)
    : {
        command: { cwd: candidatePath, argv: [process.execPath, "scripts/vercel-region-config.test.mjs"] },
        startedAt: "",
        finishedAt: "",
        exitStatus: null,
        signal: null,
        error: "focused smoke script is missing",
        stdoutLineCount: 0,
        stderrLineCount: 0,
        nodeTestSummary: { tests: 0, suites: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0 },
        allowedDirtyStatusRows: topCandidate?.allowedDirtyStatusRows ?? [],
        boundedDirtyAccepted: false,
        beforeStatusRows: [],
        afterStatusRows: [],
        beforeStatusEntries: 0,
        afterStatusEntries: 0,
        beforeStatusClean: false,
        afterStatusClean: false,
        beforeStatusAllowed: false,
        afterStatusAllowed: false,
        mutationDetected: false,
        smokePassed: false
      };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    smokeStatus: smoke.smokePassed ? "passed" : "blocked",
    topCandidate: {
      branch: topCandidate?.branch ?? "",
      path: candidatePath,
      head: topCandidate?.head ?? "",
      promotionRank: count(topCandidate?.promotionRank),
      promotionLane: topCandidate?.promotionLane ?? "",
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      allowedDirtyStatusRows: topCandidate?.allowedDirtyStatusRows ?? []
    },
    focusedSmoke: {
      scriptPath,
      scriptPresent,
      command: smoke.command,
      exitStatus: smoke.exitStatus,
      signal: smoke.signal,
      error: smoke.error,
      stdoutLineCount: smoke.stdoutLineCount,
      stderrLineCount: smoke.stderrLineCount,
      nodeTestSummary: smoke.nodeTestSummary,
      allowedDirtyStatusRows: smoke.allowedDirtyStatusRows,
      boundedDirtyAccepted: smoke.boundedDirtyAccepted,
      beforeStatusRows: smoke.beforeStatusRows,
      afterStatusRows: smoke.afterStatusRows,
      beforeStatusEntries: smoke.beforeStatusEntries,
      afterStatusEntries: smoke.afterStatusEntries,
      beforeStatusClean: smoke.beforeStatusClean,
      afterStatusClean: smoke.afterStatusClean,
      beforeStatusAllowed: smoke.beforeStatusAllowed,
      afterStatusAllowed: smoke.afterStatusAllowed,
      mutationDetected: smoke.mutationDetected,
      smokePassed: smoke.smokePassed
    },
    validationRows: [
      {
        id: "focused-smoke-script-present",
        owner: "A22 production reliability and release engineering",
        passed: scriptPresent,
        status: scriptPresent ? "passed" : "blocked",
        detail: scriptPresent ? "Focused Vercel region smoke script exists in the top candidate worktree." : "Focused smoke script is missing."
      },
      {
        id: "focused-smoke-command-passed",
        owner: "A22 production reliability and release engineering",
        passed: smoke.exitStatus === 0 && smoke.nodeTestSummary.fail === 0,
        status: smoke.exitStatus === 0 && smoke.nodeTestSummary.fail === 0 ? "passed" : "blocked",
        detail: `Node test exit=${smoke.exitStatus}; tests=${smoke.nodeTestSummary.tests}; pass=${smoke.nodeTestSummary.pass}; fail=${smoke.nodeTestSummary.fail}.`
      },
      {
        id: "focused-smoke-no-mutation",
        owner: "A25 git hygiene and release intake",
        passed: smoke.beforeStatusAllowed === true && smoke.afterStatusAllowed === true && smoke.mutationDetected === false,
        status: smoke.beforeStatusAllowed === true && smoke.afterStatusAllowed === true && smoke.mutationDetected === false ? "passed" : "blocked",
        detail: `Candidate worktree status stayed within allowed bounds before/after smoke; mutationDetected=${smoke.mutationDetected}.`
      }
    ],
    summary: {
      smokePassed: smoke.smokePassed,
      scriptPresent,
      tests: smoke.nodeTestSummary.tests,
      pass: smoke.nodeTestSummary.pass,
      fail: smoke.nodeTestSummary.fail,
      beforeStatusEntries: smoke.beforeStatusEntries,
      afterStatusEntries: smoke.afterStatusEntries,
      beforeStatusAllowed: smoke.beforeStatusAllowed,
      afterStatusAllowed: smoke.afterStatusAllowed,
      boundedDirtyAccepted: smoke.boundedDirtyAccepted,
      mutationDetected: smoke.mutationDetected,
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      runsFocusedSmoke: true,
      runsTypeCheck: false,
      runsBuild: false,
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

export function stableTopCleanCandidateFocusedSmokeProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    smokeStatus: payload.smokeStatus,
    topCandidate: payload.topCandidate,
    focusedSmoke: {
      scriptPath: payload.focusedSmoke?.scriptPath,
      scriptPresent: payload.focusedSmoke?.scriptPresent,
      command: payload.focusedSmoke?.command,
      exitStatus: payload.focusedSmoke?.exitStatus,
      signal: payload.focusedSmoke?.signal,
      error: payload.focusedSmoke?.error,
      stderrLineCount: payload.focusedSmoke?.stderrLineCount,
      nodeTestSummary: payload.focusedSmoke?.nodeTestSummary,
      allowedDirtyStatusRows: payload.focusedSmoke?.allowedDirtyStatusRows,
      boundedDirtyAccepted: payload.focusedSmoke?.boundedDirtyAccepted,
      beforeStatusRows: payload.focusedSmoke?.beforeStatusRows,
      afterStatusRows: payload.focusedSmoke?.afterStatusRows,
      beforeStatusEntries: payload.focusedSmoke?.beforeStatusEntries,
      afterStatusEntries: payload.focusedSmoke?.afterStatusEntries,
      beforeStatusClean: payload.focusedSmoke?.beforeStatusClean,
      afterStatusClean: payload.focusedSmoke?.afterStatusClean,
      beforeStatusAllowed: payload.focusedSmoke?.beforeStatusAllowed,
      afterStatusAllowed: payload.focusedSmoke?.afterStatusAllowed,
      mutationDetected: payload.focusedSmoke?.mutationDetected,
      smokePassed: payload.focusedSmoke?.smokePassed
    },
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
  const rows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";
  const command = payload.focusedSmoke.command ?? { cwd: "", argv: [] };

  return `# A22 Top Clean Candidate Focused Smoke

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This evidence runs only the focused A22 Vercel region smoke in the top clean candidate worktree. It does not run type-check, run build, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Smoke status: ${payload.smokeStatus}
- Top candidate branch: \`${payload.topCandidate.branch}\`
- Top candidate path: \`${payload.topCandidate.path}\`
- Script present: ${payload.summary.scriptPresent ? "yes" : "no"}
- Command: \`${command.argv.join(" ")}\`
- Command cwd: \`${command.cwd}\`
- Tests: ${payload.summary.tests}
- Pass: ${payload.summary.pass}
- Fail: ${payload.summary.fail}
- Worktree status entries before smoke: ${payload.summary.beforeStatusEntries}
- Worktree status entries after smoke: ${payload.summary.afterStatusEntries}
- Bounded dirty accepted: ${payload.summary.boundedDirtyAccepted ? "yes" : "no"}
- Worktree status allowed before smoke: ${payload.summary.beforeStatusAllowed ? "yes" : "no"}
- Worktree status allowed after smoke: ${payload.summary.afterStatusAllowed ? "yes" : "no"}
- Mutation detected: ${payload.summary.mutationDetected ? "yes" : "no"}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${rows}

## Boundary

Focused smoke passing makes one validation row stronger. It does not make the candidate deployable: candidate-specific type-check, build, clean-source selection, and merge authorization remain required.
`;
}

function main() {
  const payload = buildTopCleanCandidateFocusedSmoke();
  write(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_FOCUSED_SMOKE_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate focused smoke generated");
  console.log(`Smoke status: ${payload.smokeStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Tests: ${payload.summary.tests}`);
  console.log(`Pass: ${payload.summary.pass}`);
  console.log(`Fail: ${payload.summary.fail}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
