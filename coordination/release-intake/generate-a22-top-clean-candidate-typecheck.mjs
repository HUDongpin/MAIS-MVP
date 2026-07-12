#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  cleanSourceCandidatePromotion: "coordination/release-intake/latest-A22-clean-source-candidate-promotion-packet.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-typecheck.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-typecheck.md`
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

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
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
    artifactStamp(key, TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function splitLines(text) {
  return String(text ?? "").split("\n").filter((line) => line.length > 0);
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

function parseTypeScriptErrors(output) {
  const errorLines = splitLines(output).filter((line) => /\berror TS\d+:/u.test(line));
  const fileCounts = new Map();
  const codeCounts = new Map();
  const errorRows = [];
  for (const line of errorLines) {
    const parsed = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/u);
    if (parsed) {
      const [, file, lineNumber, columnNumber, code, message] = parsed;
      errorRows.push({
        file,
        line: Number(lineNumber),
        column: Number(columnNumber),
        code,
        message,
        raw: line
      });
      fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      continue;
    }
    const fileMatch = line.match(/^(.+?)\(\d+,\d+\): error TS\d+:/u);
    if (fileMatch) fileCounts.set(fileMatch[1], (fileCounts.get(fileMatch[1]) ?? 0) + 1);
    const codeMatch = line.match(/\berror (TS\d+):/u);
    if (codeMatch) codeCounts.set(codeMatch[1], (codeCounts.get(codeMatch[1]) ?? 0) + 1);
    errorRows.push({
      file: fileMatch?.[1] ?? "",
      line: null,
      column: null,
      code: codeMatch?.[1] ?? "",
      message: line,
      raw: line
    });
  }
  return {
    errorLineCount: errorLines.length,
    errorRows,
    firstErrorLines: errorLines.slice(0, 20),
    topFiles: [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)
      .map(([file, errors]) => ({ file, errors })),
    topCodes: [...codeCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)
      .map(([code, errors]) => ({ code, errors }))
  };
}

function runTypeCheck(candidatePath, topCandidate) {
  const command = {
    cwd: candidatePath,
    argv: ["npm", "run", "type-check"]
  };
  const beforeStatus = gitRaw(["-C", candidatePath, "status", "--short"]);
  const beforeStatusRows = parseStatusEntries(beforeStatus);
  const allowedDirtyStatusRows = topCandidate?.allowedDirtyStatusRows ?? [];
  const startedAt = new Date().toISOString();
  const result = spawnSync(command.argv[0], command.argv.slice(1), {
    cwd: candidatePath,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const finishedAt = new Date().toISOString();
  const afterStatus = gitRaw(["-C", candidatePath, "status", "--short"]);
  const afterStatusRows = parseStatusEntries(afterStatus);
  const afterIgnoredStatus = gitRaw(["-C", candidatePath, "status", "--short", "--ignored"]);
  const afterIgnoredEntries = parseStatusEntries(afterIgnoredStatus).filter((line) => line.startsWith("!! "));
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combinedOutput = `${stdout}\n${stderr}`;
  const parsed = parseTypeScriptErrors(combinedOutput);
  const tsbuildInfoPath = path.join(candidatePath, "tsconfig.tsbuildinfo");
  const nextBuildPath = path.join(candidatePath, ".next");
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
    stdoutLineCount: splitLines(stdout).length,
    stderrLineCount: splitLines(stderr).length,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    errorLineCount: parsed.errorLineCount,
    errorRows: parsed.errorRows,
    firstErrorLines: parsed.firstErrorLines,
    topFiles: parsed.topFiles,
    topCodes: parsed.topCodes,
    tsbuildInfoPresentAfter: existsAbsolute(tsbuildInfoPath),
    nextBuildDirPresentAfter: existsAbsolute(nextBuildPath),
    allowedDirtyStatusRows,
    boundedDirtyAccepted,
    beforeStatusRows,
    afterStatusRows,
    ignoredEntriesAfter: afterIgnoredEntries,
    ignoredEntryCountAfter: afterIgnoredEntries.length,
    nextBuildDirIgnoredAfter: afterIgnoredEntries.some((line) => line === "!! .next/"),
    nodeModulesIgnoredAfter: afterIgnoredEntries.some((line) => line === "!! node_modules/"),
    beforeStatusEntries: beforeStatusRows.length,
    afterStatusEntries: afterStatusRows.length,
    beforeStatusClean: beforeStatus.length === 0,
    afterStatusClean: afterStatus.length === 0,
    beforeStatusAllowed,
    afterStatusAllowed,
    mutationDetected: beforeStatus !== afterStatus,
    typeCheckPassed: result.status === 0 &&
      parsed.errorLineCount === 0 &&
      beforeStatusAllowed &&
      afterStatusAllowed &&
      beforeStatus === afterStatus
  };
}

export function buildTopCleanCandidateTypeCheck() {
  const artifacts = {
    dirtyMap: readJson(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.dirtyMap),
    cleanSourceCandidatePromotion: readJson(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.cleanSourceCandidatePromotion)
  };
  const topCandidate = artifacts.cleanSourceCandidatePromotion.topCandidate ?? null;
  const rawSourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const sourceFailures = rawSourceFailures.filter((failure) => !(
    topCandidate?.promotionLane === "controlled-mutated-root-parity-recovery" &&
    failure.startsWith("cleanSourceCandidatePromotion is stale")
  ));
  const candidatePath = topCandidate?.path ?? "";
  const packageJsonPath = candidatePath ? path.join(candidatePath, "package.json") : "";
  const packageJsonPresent = Boolean(packageJsonPath && existsAbsolute(packageJsonPath));
  const typeCheck = packageJsonPresent
    ? runTypeCheck(candidatePath, topCandidate)
    : {
        command: { cwd: candidatePath, argv: ["npm", "run", "type-check"] },
        startedAt: "",
        finishedAt: "",
        exitStatus: null,
        signal: null,
        error: "package.json is missing",
        stdoutLineCount: 0,
        stderrLineCount: 0,
        stdoutSha256: "",
        stderrSha256: "",
        errorLineCount: 0,
        firstErrorLines: [],
        errorRows: [],
        topFiles: [],
        topCodes: [],
        tsbuildInfoPresentAfter: false,
        nextBuildDirPresentAfter: false,
        allowedDirtyStatusRows: topCandidate?.allowedDirtyStatusRows ?? [],
        boundedDirtyAccepted: false,
        beforeStatusRows: [],
        afterStatusRows: [],
        ignoredEntriesAfter: [],
        ignoredEntryCountAfter: 0,
        nextBuildDirIgnoredAfter: false,
        nodeModulesIgnoredAfter: false,
        beforeStatusEntries: 0,
        afterStatusEntries: 0,
        beforeStatusClean: false,
        afterStatusClean: false,
        beforeStatusAllowed: false,
        afterStatusAllowed: false,
        mutationDetected: false,
        typeCheckPassed: false
      };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    typeCheckStatus: typeCheck.typeCheckPassed ? "passed" : packageJsonPresent ? "failed" : "blocked",
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
    typeCheck: {
      packageJsonPath,
      packageJsonPresent,
      command: typeCheck.command,
      exitStatus: typeCheck.exitStatus,
      signal: typeCheck.signal,
      error: typeCheck.error,
      stdoutLineCount: typeCheck.stdoutLineCount,
      stderrLineCount: typeCheck.stderrLineCount,
      stdoutSha256: typeCheck.stdoutSha256,
      stderrSha256: typeCheck.stderrSha256,
      errorLineCount: typeCheck.errorLineCount,
      firstErrorLines: typeCheck.firstErrorLines,
      errorRows: typeCheck.errorRows,
      topFiles: typeCheck.topFiles,
      topCodes: typeCheck.topCodes,
      tsbuildInfoPresentAfter: typeCheck.tsbuildInfoPresentAfter,
      nextBuildDirPresentAfter: typeCheck.nextBuildDirPresentAfter,
      allowedDirtyStatusRows: typeCheck.allowedDirtyStatusRows,
      boundedDirtyAccepted: typeCheck.boundedDirtyAccepted,
      beforeStatusRows: typeCheck.beforeStatusRows,
      afterStatusRows: typeCheck.afterStatusRows,
      ignoredEntriesAfter: typeCheck.ignoredEntriesAfter,
      ignoredEntryCountAfter: typeCheck.ignoredEntryCountAfter,
      nextBuildDirIgnoredAfter: typeCheck.nextBuildDirIgnoredAfter,
      nodeModulesIgnoredAfter: typeCheck.nodeModulesIgnoredAfter,
      beforeStatusEntries: typeCheck.beforeStatusEntries,
      afterStatusEntries: typeCheck.afterStatusEntries,
      beforeStatusClean: typeCheck.beforeStatusClean,
      afterStatusClean: typeCheck.afterStatusClean,
      beforeStatusAllowed: typeCheck.beforeStatusAllowed,
      afterStatusAllowed: typeCheck.afterStatusAllowed,
      mutationDetected: typeCheck.mutationDetected,
      typeCheckPassed: typeCheck.typeCheckPassed
    },
    validationRows: [
      {
        id: "candidate-package-present",
        owner: "A22 production reliability and release engineering",
        passed: packageJsonPresent,
        status: packageJsonPresent ? "passed" : "blocked",
        detail: packageJsonPresent ? "Top candidate package.json exists." : "Top candidate package.json is missing."
      },
      {
        id: "candidate-type-check-command-run",
        owner: "A22 production reliability and release engineering",
        passed: typeCheck.exitStatus !== null,
        status: typeCheck.exitStatus !== null ? "completed" : "blocked",
        detail: `npm run type-check completed with exit=${typeCheck.exitStatus}.`
      },
      {
        id: "candidate-type-check-passed",
        owner: "A22 production reliability and release engineering",
        passed: typeCheck.typeCheckPassed,
        status: typeCheck.typeCheckPassed ? "passed" : "failed",
        detail: typeCheck.typeCheckPassed
          ? "Candidate-specific type-check passed."
          : `Candidate-specific type-check failed with ${typeCheck.errorLineCount} TypeScript error line(s).`
      },
      {
        id: "candidate-type-check-no-mutation",
        owner: "A25 git hygiene and release intake",
        passed: typeCheck.beforeStatusAllowed === true && typeCheck.afterStatusAllowed === true && typeCheck.mutationDetected === false,
        status: typeCheck.beforeStatusAllowed === true && typeCheck.afterStatusAllowed === true && typeCheck.mutationDetected === false ? "passed" : "blocked",
        detail: `Candidate worktree status stayed within allowed bounds before/after type-check; mutationDetected=${typeCheck.mutationDetected}.`
      }
    ],
    summary: {
      typeCheckPassed: typeCheck.typeCheckPassed,
      packageJsonPresent,
      exitStatus: typeCheck.exitStatus,
      errorLineCount: typeCheck.errorLineCount,
      stdoutLineCount: typeCheck.stdoutLineCount,
      stderrLineCount: typeCheck.stderrLineCount,
      topFileCount: typeCheck.topFiles.length,
      topCodeCount: typeCheck.topCodes.length,
      beforeStatusEntries: typeCheck.beforeStatusEntries,
      afterStatusEntries: typeCheck.afterStatusEntries,
      beforeStatusAllowed: typeCheck.beforeStatusAllowed,
      afterStatusAllowed: typeCheck.afterStatusAllowed,
      boundedDirtyAccepted: typeCheck.boundedDirtyAccepted,
      mutationDetected: typeCheck.mutationDetected,
      tsbuildInfoPresentAfter: typeCheck.tsbuildInfoPresentAfter,
      nextBuildDirPresentAfter: typeCheck.nextBuildDirPresentAfter,
      ignoredEntryCountAfter: typeCheck.ignoredEntryCountAfter,
      nextBuildDirIgnoredAfter: typeCheck.nextBuildDirIgnoredAfter,
      nodeModulesIgnoredAfter: typeCheck.nodeModulesIgnoredAfter,
      promotionEligibleNow: false,
      releaseSourceSelected: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      runsTypeCheck: true,
      runsBuild: false,
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

export function stableTopCleanCandidateTypeCheckProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    typeCheckStatus: payload.typeCheckStatus,
    topCandidate: payload.topCandidate,
    typeCheck: {
      packageJsonPath: payload.typeCheck?.packageJsonPath,
      packageJsonPresent: payload.typeCheck?.packageJsonPresent,
      command: payload.typeCheck?.command,
      exitStatus: payload.typeCheck?.exitStatus,
      signal: payload.typeCheck?.signal,
      error: payload.typeCheck?.error,
      stdoutLineCount: payload.typeCheck?.stdoutLineCount,
      stderrLineCount: payload.typeCheck?.stderrLineCount,
      stdoutSha256: payload.typeCheck?.stdoutSha256,
      stderrSha256: payload.typeCheck?.stderrSha256,
      errorLineCount: payload.typeCheck?.errorLineCount,
      firstErrorLines: payload.typeCheck?.firstErrorLines,
      errorRows: payload.typeCheck?.errorRows,
      topFiles: payload.typeCheck?.topFiles,
      topCodes: payload.typeCheck?.topCodes,
      tsbuildInfoPresentAfter: payload.typeCheck?.tsbuildInfoPresentAfter,
      nextBuildDirPresentAfter: payload.typeCheck?.nextBuildDirPresentAfter,
      allowedDirtyStatusRows: payload.typeCheck?.allowedDirtyStatusRows,
      boundedDirtyAccepted: payload.typeCheck?.boundedDirtyAccepted,
      beforeStatusRows: payload.typeCheck?.beforeStatusRows,
      afterStatusRows: payload.typeCheck?.afterStatusRows,
      ignoredEntriesAfter: payload.typeCheck?.ignoredEntriesAfter,
      ignoredEntryCountAfter: payload.typeCheck?.ignoredEntryCountAfter,
      nextBuildDirIgnoredAfter: payload.typeCheck?.nextBuildDirIgnoredAfter,
      nodeModulesIgnoredAfter: payload.typeCheck?.nodeModulesIgnoredAfter,
      beforeStatusEntries: payload.typeCheck?.beforeStatusEntries,
      afterStatusEntries: payload.typeCheck?.afterStatusEntries,
      beforeStatusClean: payload.typeCheck?.beforeStatusClean,
      afterStatusClean: payload.typeCheck?.afterStatusClean,
      beforeStatusAllowed: payload.typeCheck?.beforeStatusAllowed,
      afterStatusAllowed: payload.typeCheck?.afterStatusAllowed,
      mutationDetected: payload.typeCheck?.mutationDetected,
      typeCheckPassed: payload.typeCheck?.typeCheckPassed
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
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";
  const topFiles = payload.typeCheck.topFiles.map((row) => (
    `| \`${cell(row.file)}\` | ${row.errors} |`
  )).join("\n") || "| none | 0 |";
  const topCodes = payload.typeCheck.topCodes.map((row) => (
    `| \`${cell(row.code)}\` | ${row.errors} |`
  )).join("\n") || "| none | 0 |";
  const firstErrors = payload.typeCheck.firstErrorLines.map((line) => `- \`${cell(line)}\``).join("\n") || "- none";
  const command = payload.typeCheck.command ?? { cwd: "", argv: [] };

  return `# A22 Top Clean Candidate Type-Check

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This evidence runs only \`npm run type-check\` in the top A22 clean candidate worktree. It records a pass or fail result and checks that the candidate worktree remains clean. It does not run build, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Type-check status: ${payload.typeCheckStatus}
- Top candidate branch: \`${payload.topCandidate.branch}\`
- Top candidate path: \`${payload.topCandidate.path}\`
- Command: \`${command.argv.join(" ")}\`
- Command cwd: \`${command.cwd}\`
- Exit status: ${payload.summary.exitStatus}
- TypeScript error lines: ${payload.summary.errorLineCount}
- Worktree status entries before type-check: ${payload.summary.beforeStatusEntries}
- Worktree status entries after type-check: ${payload.summary.afterStatusEntries}
- Bounded dirty accepted: ${payload.summary.boundedDirtyAccepted ? "yes" : "no"}
- Worktree status allowed before type-check: ${payload.summary.beforeStatusAllowed ? "yes" : "no"}
- Worktree status allowed after type-check: ${payload.summary.afterStatusAllowed ? "yes" : "no"}
- Mutation detected: ${payload.summary.mutationDetected ? "yes" : "no"}
- tsconfig.tsbuildinfo present after: ${payload.summary.tsbuildInfoPresentAfter ? "yes" : "no"}
- .next present after: ${payload.summary.nextBuildDirPresentAfter ? "yes" : "no"}
- Ignored entries after type-check: ${payload.summary.ignoredEntryCountAfter}
- .next ignored after: ${payload.summary.nextBuildDirIgnoredAfter ? "yes" : "no"}
- Promotion eligible now: ${payload.summary.promotionEligibleNow ? "yes" : "no"}
- Release source selected: ${payload.summary.releaseSourceSelected ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Top Error Files

| File | Error lines |
| --- | ---: |
${topFiles}

## Top Error Codes

| Code | Error lines |
| --- | ---: |
${topCodes}

## First Error Lines

${firstErrors}

## Boundary

This type-check evidence makes the candidate validation state more concrete. A failed type-check remains a promotion blocker and does not make the candidate mergeable or deployable.
`;
}

function main() {
  const payload = buildTopCleanCandidateTypeCheck();
  write(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.latestMarkdown, markdown(payload));
  write(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(TOP_CLEAN_CANDIDATE_TYPECHECK_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate type-check generated");
  console.log(`Type-check status: ${payload.typeCheckStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch || "none"}`);
  console.log(`Exit status: ${payload.summary.exitStatus}`);
  console.log(`TypeScript error lines: ${payload.summary.errorLineCount}`);
  console.log(`Mutation detected: ${payload.summary.mutationDetected ? "yes" : "no"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
