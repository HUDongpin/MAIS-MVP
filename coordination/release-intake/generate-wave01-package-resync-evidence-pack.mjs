#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  approvalRequests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-evidence-pack.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-evidence-pack.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
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

function fileSha256(absolutePath) {
  return sha256(fs.readFileSync(absolutePath));
}

function statusLines(cwd, relativePath) {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-uall", "--", relativePath], {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return output.split("\n").filter(Boolean);
}

function commandLines(command, args, cwd) {
  const output = execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return output.split("\n").filter(Boolean);
}

function pathEvidence(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      type: "missing",
      bytes: 0,
      sha256: null,
      childCount: 0
    };
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    return {
      exists: true,
      type: "file",
      bytes: stat.size,
      sha256: fileSha256(absolutePath),
      childCount: 0
    };
  }

  if (stat.isDirectory()) {
    const entries = directoryEntries(absolutePath, absolutePath);
    return {
      exists: true,
      type: "directory",
      bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
      sha256: sha256(JSON.stringify(entries)),
      childCount: entries.length
    };
  }

  return {
    exists: true,
    type: "other",
    bytes: 0,
    sha256: null,
    childCount: 0
  };
}

function directoryEntries(basePath, currentPath) {
  const entries = [];
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(basePath, absolutePath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      entries.push(...directoryEntries(basePath, absolutePath));
    } else if (entry.isFile()) {
      const stat = fs.statSync(absolutePath);
      entries.push({
        path: relativePath,
        bytes: stat.size,
        sha256: fileSha256(absolutePath)
      });
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function diffEvidence(cwd, relativePath) {
  const nameStatus = commandLines("git", ["diff", "--name-status", "--", relativePath], cwd);
  const numstat = commandLines("git", ["diff", "--numstat", "--", relativePath], cwd);
  const diff = execFileSync("git", ["diff", "--", relativePath], {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    hasTrackedDiff: diff.length > 0,
    nameStatus,
    numstat,
    diffSha256: diff.length > 0 ? sha256(diff) : null,
    diffBytes: Buffer.byteLength(diff)
  };
}

function approvalRequestByPath(approvalRequests) {
  return new Map((approvalRequests.requests ?? []).map((request) => [request.path, request]));
}

function executionRowByPath(executionPacket) {
  return new Map((executionPacket.executionRows ?? []).map((row) => [row.path, row]));
}

function evidenceRow(recommendation, index, approvalRequests, executionPacket) {
  const request = approvalRequests.get(recommendation.path);
  const execution = executionPacket.get(recommendation.path);
  const worktreePath = request?.worktreePath ?? execution?.worktreePath ?? "";
  const absoluteWorktreePath = path.join(worktreePath, recommendation.path);
  const absoluteRootPath = path.join(root, recommendation.path);
  const worktreeStatusLines = worktreePath ? statusLines(worktreePath, recommendation.path) : [];
  const rootStatusLines = statusLines(root, recommendation.path);
  const worktreeEvidence = pathEvidence(absoluteWorktreePath);
  const rootEvidence = pathEvidence(absoluteRootPath);

  return {
    evidenceIndex: index + 1,
    approvalId: request?.approvalId ?? execution?.approvalId ?? null,
    owner: request?.owner ?? execution?.owner ?? "A25/A10/A22 Wave 01 package resync",
    path: recommendation.path,
    worktreePath,
    branch: request?.branch ?? execution?.branch ?? null,
    actionKind: recommendation.actionKind,
    exactCommandIfLaterAuthorized: recommendation.commandHint,
    packageOnly: recommendation.packageOnly,
    rootPathExists: rootEvidence.exists,
    worktreePathExists: worktreeEvidence.exists,
    rootStatusLines,
    worktreeStatusLines,
    rootEvidence,
    worktreeEvidence,
    worktreeDiffEvidence: diffEvidence(worktreePath, recommendation.path),
    approvalRequestPresent: Boolean(request),
    executionRowPresent: Boolean(execution),
    evidenceOnly: true,
    contentCaptured: false,
    cleanupAuthorized: false,
    executableNow: false,
    stopCondition: "Do not execute cleanup, restore, discard, or deletion from this evidence pack. Use it only to support exact owner authorization review."
  };
}

function markdown(payload) {
  const rows = payload.rows.map((row) => (
    `| ${row.evidenceIndex} | \`${row.approvalId}\` | \`${row.path}\` | ${row.actionKind} | ${row.worktreeEvidence.type} | ${row.worktreeEvidence.bytes} | \`${row.worktreeEvidence.sha256 ?? "n/a"}\` | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | 0 | n/a | no |";

  return `# A25 Wave 01 Package Resync Evidence Pack

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Worktree: \`${payload.worktree.path}\`

Branch: \`${payload.worktree.branch}\`

This is evidence only. It records file existence, size, hashes, status lines, and tracked diff hashes for the current Wave 01 package-resync rows. It does not copy source contents into this report and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup.

## Summary

- Evidence rows: ${payload.summary.evidenceRows}
- Package-only rows: ${payload.summary.packageOnlyRows}
- Worktree-present rows: ${payload.summary.worktreePresentRows}
- Root-missing rows: ${payload.summary.rootMissingRows}
- Modified rows: ${payload.summary.modifiedRows}
- Untracked rows: ${payload.summary.untrackedRows}
- Content-captured rows: ${payload.summary.contentCapturedRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Evidence Rows

| # | Approval ID | Path | Action kind | Evidence type | Bytes | SHA-256 | Executable now |
| ---: | --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Boundary

Every row remains non-executable. The next step, if the owner approves, must name the exact approval ID, exact path, exact command, worktree path, approvedBy, and approvedAt in the owner authorization artifact before any physical action can run.
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const readiness = readJson(paths.readiness);
  const approvalRequests = readJson(paths.approvalRequests);
  const executionPacket = readJson(paths.executionPacket);
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 readiness is stale relative to the latest dirty map.");
  }
  if (approvalRequests.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 package resync approval requests are stale relative to the latest dirty map.");
  }
  if (executionPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 package resync execution packet is stale relative to the latest dirty map.");
  }

  const approvalRequestsByPath = approvalRequestByPath(approvalRequests);
  const executionRowsByPath = executionRowByPath(executionPacket);
  const rows = (readiness.packageResyncRecommendations ?? []).map((recommendation, index) => (
    evidenceRow(recommendation, index, approvalRequestsByPath, executionRowsByPath)
  ));
  const summary = {
    evidenceRows: rows.length,
    packageOnlyRows: rows.filter((row) => row.packageOnly).length,
    worktreePresentRows: rows.filter((row) => row.worktreePathExists).length,
    rootMissingRows: rows.filter((row) => !row.rootPathExists).length,
    modifiedRows: rows.filter((row) => row.worktreeStatusLines.some((line) => line.startsWith(" M"))).length,
    untrackedRows: rows.filter((row) => row.worktreeStatusLines.some((line) => line.startsWith("??"))).length,
    contentCapturedRows: rows.filter((row) => row.contentCaptured).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    readinessGeneratedAt: readiness.generatedAt,
    approvalRequestsGeneratedAt: approvalRequests.generatedAt,
    executionPacketGeneratedAt: executionPacket.generatedAt,
    worktree: readiness.worktree,
    summary,
    rows
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    evidenceRows: summary.evidenceRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
