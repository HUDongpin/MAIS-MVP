#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const ROOT_TYPECHECK_STATUS_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  packageFrontier: "coordination/release-intake/latest-A25-typecheck-critical-path-frontier.json",
  latestJson: "coordination/release-intake/latest-A25-root-typecheck-status.json",
  latestMarkdown: "coordination/release-intake/latest-A25-root-typecheck-status.md",
  datedJson: `coordination/release-intake/${date}-A25-root-typecheck-status.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-root-typecheck-status.md`
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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function lineArray(value) {
  return String(value ?? "").split(/\r?\n/).filter((line) => line.length > 0);
}

function parseTypecheckOutput(output) {
  const topFiles = new Map();
  const errorLines = [];
  for (const line of lineArray(output)) {
    if (!line.includes("error TS")) continue;
    errorLines.push(line);
    const match = line.match(/^(.+?)\(\d+,\d+\): error TS\d+:/);
    const file = match?.[1] ?? "(unparsed)";
    topFiles.set(file, (topFiles.get(file) ?? 0) + 1);
  }
  return {
    errorLines: errorLines.length,
    topFiles: [...topFiles.entries()]
      .map(([file, errors]) => ({ file, errors }))
      .sort((left, right) => right.errors - left.errors || left.file.localeCompare(right.file))
      .slice(0, 20),
    firstErrors: errorLines.slice(0, 20)
  };
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function packageFrontierSummary(packageFrontier) {
  const summary = packageFrontier.summary ?? {};
  return {
    generatedAt: packageFrontier.generatedAt ?? null,
    dirtyMapStatusSignature: packageFrontier.dirtyMapStatusSignature ?? null,
    expandedStatusEntries: packageFrontier.expandedStatusEntries ?? null,
    typeCheckErrorLines: summary.typeCheckErrorLines ?? 0,
    frontierRows: summary.frontierRows ?? 0,
    criticalOwnerRows: summary.criticalOwnerRows ?? 0,
    blockedOwnerPackageRows: summary.blockedOwnerPackageRows ?? 0,
    failedChecks: summary.failedChecks ?? 0
  };
}

export function buildRootTypecheckStatus() {
  const dirtyMap = readJson(ROOT_TYPECHECK_STATUS_PATHS.dirtyMap);
  const packageFrontier = readJson(ROOT_TYPECHECK_STATUS_PATHS.packageFrontier);
  const startedAtMs = Date.now();
  const result = spawnSync("npm", ["run", "type-check", "--", "--pretty", "false"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
  const durationMs = Date.now() - startedAtMs;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combinedOutput = `${stdout}${stderr}`;
  const parsed = parseTypecheckOutput(combinedOutput);
  const packageSummary = packageFrontierSummary(packageFrontier);
  const dirtyMapStatusSignature = dirtyMap.statusSignature ?? null;
  const expandedStatusEntries = dirtyMapEntryCount(dirtyMap);
  const sourceCurrentnessFailures = [];

  if (packageSummary.dirtyMapStatusSignature !== dirtyMapStatusSignature) {
    sourceCurrentnessFailures.push("package frontier dirty-map signature is stale");
  }
  if (packageSummary.expandedStatusEntries !== expandedStatusEntries) {
    sourceCurrentnessFailures.push("package frontier expanded dirty entry count is stale");
  }

  const passed = result.status === 0;
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    branch: git(["branch", "--show-current"]) || "(detached)",
    head: git(["rev-parse", "--short", "HEAD"]),
    dirtyMapStatusSignature,
    expandedStatusEntries,
    sourceArtifacts: {
      dirtyMap: ROOT_TYPECHECK_STATUS_PATHS.dirtyMap,
      packageFrontier: ROOT_TYPECHECK_STATUS_PATHS.packageFrontier,
      packageFrontierGeneratedAt: packageFrontier.generatedAt ?? null
    },
    sourceCurrentnessFailures,
    rootTypeCheck: {
      layer: "dirty-root-current-install",
      command: "npm run type-check -- --pretty false",
      status: typeof result.status === "number" ? result.status : null,
      signal: result.signal ?? null,
      passed,
      durationMs,
      errorLines: parsed.errorLines,
      topFiles: parsed.topFiles,
      firstErrors: parsed.firstErrors,
      stdoutLineCount: lineArray(stdout).length,
      stderrLineCount: lineArray(stderr).length,
      combinedOutputSha256: sha256(combinedOutput)
    },
    packageWorktreeTypeCheck: packageSummary,
    layerComparison: {
      rootPassed: passed,
      rootErrorLines: parsed.errorLines,
      packageWorktreeErrorLines: packageSummary.typeCheckErrorLines,
      packageFrontierRows: packageSummary.frontierRows,
      status:
        passed && packageSummary.typeCheckErrorLines > 0
          ? "root-green-package-worktree-red"
          : passed
            ? "root-green"
            : "root-red",
      interpretation:
        passed && packageSummary.typeCheckErrorLines > 0
          ? "Root type-check currently passes in the dirty root install, while owner-package/worktree gates still report type-check blockers. Treat these as separate evidence layers."
          : passed
            ? "Root type-check currently passes in the dirty root install."
            : "Root type-check currently fails and blocks any clean release-source claim."
    },
    summary: {
      rootTypeCheckPassed: passed,
      rootTypeCheckStatus: typeof result.status === "number" ? result.status : null,
      rootTypeCheckErrorLines: parsed.errorLines,
      packageWorktreeTypeCheckErrorLines: packageSummary.typeCheckErrorLines,
      packageFrontierRows: packageSummary.frontierRows,
      packageCriticalOwnerRows: packageSummary.criticalOwnerRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableRootTypecheckStatusProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    branch: payload.branch,
    head: payload.head,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    rootTypeCheck: {
      layer: payload.rootTypeCheck?.layer,
      command: payload.rootTypeCheck?.command,
      status: payload.rootTypeCheck?.status,
      signal: payload.rootTypeCheck?.signal,
      passed: payload.rootTypeCheck?.passed,
      errorLines: payload.rootTypeCheck?.errorLines,
      topFiles: payload.rootTypeCheck?.topFiles,
      firstErrors: payload.rootTypeCheck?.firstErrors,
      stdoutLineCount: payload.rootTypeCheck?.stdoutLineCount,
      stderrLineCount: payload.rootTypeCheck?.stderrLineCount,
      combinedOutputSha256: payload.rootTypeCheck?.combinedOutputSha256
    },
    packageWorktreeTypeCheck: payload.packageWorktreeTypeCheck,
    layerComparison: payload.layerComparison,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const topFiles = payload.rootTypeCheck.topFiles.map((row) => `| \`${cell(row.file)}\` | ${row.errors} |`).join("\n") || "| none | 0 |";
  const firstErrors = payload.rootTypeCheck.firstErrors.map((line) => `- \`${cell(line)}\``).join("\n") || "- none";
  return `# A25 Root Type-Check Status

Generated: ${payload.generatedAt}

This is A25-owned verification evidence only. It separates the current dirty-root TypeScript gate from owner-package/worktree type-check frontiers. It does not authorize staging, committing, merging, cleanup, destructive Git, worktree removal, branch deletion, deploy, or dirty-root release.

## Summary

- Root type-check layer: ${payload.rootTypeCheck.layer}
- Root command: \`${payload.rootTypeCheck.command}\`
- Root type-check passed: ${payload.rootTypeCheck.passed ? "yes" : "no"}
- Root type-check status: ${payload.rootTypeCheck.status ?? "n/a"}
- Root type-check error lines: ${payload.rootTypeCheck.errorLines}
- Package/worktree type-check error lines: ${payload.packageWorktreeTypeCheck.typeCheckErrorLines}
- Package frontier rows: ${payload.packageWorktreeTypeCheck.frontierRows}
- Critical owner rows: ${payload.packageWorktreeTypeCheck.criticalOwnerRows}
- Layer comparison: ${payload.layerComparison.status}
- Interpretation: ${payload.layerComparison.interpretation}
- Source currentness failures: ${payload.sourceCurrentnessFailures.length}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Root Top Errors

| File | Errors |
| --- | ---: |
${topFiles}

## Root First Errors

${firstErrors}

## Boundary

This artifact is evidence-only. A green root type-check does not make the dirty root a deploy source and does not override A22 release-source cleanliness, A25 strict lifecycle, owner authorization, execution-instruction, merge, or cleanup gates.
`;
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  for (const target of [ROOT_TYPECHECK_STATUS_PATHS.latestJson, ROOT_TYPECHECK_STATUS_PATHS.datedJson]) write(target, json);
  for (const target of [ROOT_TYPECHECK_STATUS_PATHS.latestMarkdown, ROOT_TYPECHECK_STATUS_PATHS.datedMarkdown]) write(target, md);
}

function main() {
  const payload = buildRootTypecheckStatus();
  persist(payload);
  console.log(JSON.stringify({
    latestJson: ROOT_TYPECHECK_STATUS_PATHS.latestJson,
    latestMarkdown: ROOT_TYPECHECK_STATUS_PATHS.latestMarkdown,
    rootTypeCheckPassed: payload.summary.rootTypeCheckPassed,
    rootTypeCheckErrorLines: payload.summary.rootTypeCheckErrorLines,
    packageWorktreeTypeCheckErrorLines: payload.summary.packageWorktreeTypeCheckErrorLines,
    layerComparisonStatus: payload.layerComparison.status,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
