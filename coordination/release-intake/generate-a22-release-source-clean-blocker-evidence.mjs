#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const RELEASE_SOURCE_BLOCKER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  latestJson: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json",
  latestMarkdown: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.md",
  datedJson: `coordination/release-intake/${date}-A22-release-source-clean-blocker-evidence.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-release-source-clean-blocker-evidence.md`
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

function splitLines(value) {
  return String(value ?? "").split("\n").filter(Boolean);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compactLines(value, maxLines = 30) {
  const lines = splitLines(value);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-(maxLines - head))
  ];
}

function runReleaseSourceGate() {
  const result = spawnSync(process.execPath, ["coordination/release-intake/assert-release-source-clean.mjs"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const status = typeof result.status === "number" ? result.status : 1;
  return {
    command: "node coordination/release-intake/assert-release-source-clean.mjs",
    status,
    passed: status === 0,
    stdout: compactLines(result.stdout, 24),
    stderr: compactLines(result.stderr, 34),
    error: result.error?.message ?? null
  };
}

function rootStatusSnapshot() {
  const lines = splitLines(git(["status", "--porcelain=v1", "-uall"], root));
  const countsByCode = {};
  const summary = {
    rootStatusEntries: lines.length,
    trackedModified: 0,
    trackedDeleted: 0,
    untrackedStatusEntries: 0
  };

  for (const line of lines) {
    const code = line.slice(0, 2);
    countsByCode[code] = (countsByCode[code] ?? 0) + 1;
    if (line.startsWith("??")) {
      summary.untrackedStatusEntries += 1;
    } else if ((line[0] ?? " ") === "D" || (line[1] ?? " ") === "D") {
      summary.trackedDeleted += 1;
    } else {
      summary.trackedModified += 1;
    }
  }

  return {
    ...summary,
    countsByCode,
    statusSignature: sha256(lines.join("\n")),
    sample: lines.slice(0, 30)
  };
}

function dirtyMapSnapshot() {
  const dirtyMap = readJson(RELEASE_SOURCE_BLOCKER_PATHS.dirtyMap);
  return {
    generatedAt: dirtyMap.generatedAt,
    reason: dirtyMap.reason,
    statusSignature: dirtyMap.statusSignature,
    collapsedStatusEntries: dirtyMap.statusCounts?.collapsedStatusEntries ?? null,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length,
    trackedModified: dirtyMap.statusCounts?.trackedModified ?? null,
    trackedDeleted: dirtyMap.statusCounts?.trackedDeleted ?? null,
    untrackedStatusEntries: dirtyMap.statusCounts?.untrackedStatusEntries ?? null,
    untrackedFiles: dirtyMap.statusCounts?.untrackedFiles ?? null
  };
}

export function buildReleaseSourceBlockerEvidence() {
  const repoRoot = root;
  const branch = git(["branch", "--show-current"]) || "(detached)";
  const head = git(["rev-parse", "--short", "HEAD"]);
  const releaseGate = runReleaseSourceGate();
  const rootStatus = rootStatusSnapshot();
  const dirtyMap = dirtyMapSnapshot();
  const releaseSourceClean = releaseGate.passed && rootStatus.rootStatusEntries === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    branch,
    head,
    gate: releaseGate,
    rootStatus,
    dirtyMap,
    allowedReleaseSources: [
      "clean worktree",
      "clean clone",
      "reviewed clean release slice",
      "explicitly owner-approved pruned staging package"
    ],
    summary: {
      releaseSourceClean,
      releaseSourceBlocked: !releaseSourceClean,
      rootStatusEntries: rootStatus.rootStatusEntries,
      dirtyMapExpandedEntries: dirtyMap.expandedStatusEntries,
      dirtyMapCollapsedEntries: dirtyMap.collapsedStatusEntries,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      contentCapturedRows: 0
    },
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      contentCaptured: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableReleaseSourceBlockerProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    branch: payload.branch,
    head: payload.head,
    gate: payload.gate,
    rootStatus: payload.rootStatus,
    dirtyMap: payload.dirtyMap,
    allowedReleaseSources: payload.allowedReleaseSources,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  const statusRows = Object.entries(payload.rootStatus.countsByCode)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => `| \`${code}\` | ${count} |`)
    .join("\n") || "| none | 0 |";
  const sampleRows = payload.rootStatus.sample
    .map((line) => `| \`${line.replaceAll("|", "\\|")}\` |`)
    .join("\n") || "| none |";
  const gateOutput = [...payload.gate.stderr, ...payload.gate.stdout]
    .slice(0, 40)
    .map((line) => `| \`${line.replaceAll("|", "\\|")}\` |`)
    .join("\n") || "| none |";

  return `# A22 Release-Source Clean Blocker Evidence

Generated: ${payload.generatedAt}

Release-source gate command: \`${payload.gate.command}\`

This is A25 release-intake evidence for the A22-owned release-source clean gate. It records only status counts, hashes, command status, and path-only samples. It does not copy file contents and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Release source clean: ${payload.summary.releaseSourceClean ? "yes" : "no"}
- Release source blocked: ${payload.summary.releaseSourceBlocked ? "yes" : "no"}
- Root status entries: ${payload.summary.rootStatusEntries}
- Dirty-map expanded entries: ${payload.summary.dirtyMapExpandedEntries}
- Dirty-map collapsed entries: ${payload.summary.dirtyMapCollapsedEntries}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Content-captured rows: ${payload.summary.contentCapturedRows}

## Gate Result

- Status: ${payload.gate.status}
- Passed: ${payload.gate.passed ? "yes" : "no"}

| Gate output |
| --- |
${gateOutput}

## Status Counts

- Status signature: \`${payload.rootStatus.statusSignature}\`
- Dirty-map signature: \`${payload.dirtyMap.statusSignature}\`

| Status code | Count |
| --- | ---: |
${statusRows}

## Status Sample

| Path-only status sample |
| --- |
${sampleRows}

## Allowed Release Sources

${payload.allowedReleaseSources.map((source) => `- ${source}`).join("\n")}

## Boundary

Every row remains non-executable. This evidence preserves why the A22 release-source clean gate is blocked; it does not make any root dirty entry eligible for cleanup, discard, staging, commit, deploy, or worktree lifecycle action.
`;
}

function main() {
  const payload = buildReleaseSourceBlockerEvidence();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);

  for (const target of [RELEASE_SOURCE_BLOCKER_PATHS.latestJson, RELEASE_SOURCE_BLOCKER_PATHS.datedJson]) {
    write(target, json);
  }
  for (const target of [RELEASE_SOURCE_BLOCKER_PATHS.latestMarkdown, RELEASE_SOURCE_BLOCKER_PATHS.datedMarkdown]) {
    write(target, md);
  }

  console.log(JSON.stringify({
    latestJson: RELEASE_SOURCE_BLOCKER_PATHS.latestJson,
    latestMarkdown: RELEASE_SOURCE_BLOCKER_PATHS.latestMarkdown,
    releaseSourceClean: payload.summary.releaseSourceClean,
    rootStatusEntries: payload.summary.rootStatusEntries,
    dirtyMapExpandedEntries: payload.summary.dirtyMapExpandedEntries,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
