#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-package-resync-evidence-pack-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  approvalRequests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  evidencePack: "coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.json",
  evidencePackMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
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

function buildCurrentPack() {
  const dirtyMap = readJson(paths.dirtyMap);
  const readiness = readJson(paths.readiness);
  const approvalRequests = readJson(paths.approvalRequests);
  const executionPacket = readJson(paths.executionPacket);
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

  return {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    readinessGeneratedAt: readiness.generatedAt,
    approvalRequestsGeneratedAt: approvalRequests.generatedAt,
    executionPacketGeneratedAt: executionPacket.generatedAt,
    worktree: readiness.worktree,
    summary,
    rows
  };
}

function stableProjection(payload) {
  return {
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    readinessGeneratedAt: payload.readinessGeneratedAt,
    approvalRequestsGeneratedAt: payload.approvalRequestsGeneratedAt,
    executionPacketGeneratedAt: payload.executionPacketGeneratedAt,
    worktree: payload.worktree,
    summary: payload.summary,
    rows: payload.rows
  };
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, evidenceRows: 0, cleanupAuthorizedRows: 0, executableRows: 0 });

  const recorded = readJson(paths.evidencePack);
  const current = buildCurrentPack();
  if (!sameJson(stableProjection(recorded), current)) {
    failures.push("Wave 01 package resync evidence pack is stale");
  }

  const rows = recorded.rows ?? [];
  const summary = recorded.summary ?? {};
  if (summary.evidenceRows !== rows.length) failures.push("evidence row summary is stale");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("evidence pack must not authorize cleanup");
  if ((summary.executableRows ?? 0) !== 0) failures.push("evidence pack must not have executable rows");
  if ((summary.contentCapturedRows ?? 0) !== 0) failures.push("evidence pack must not capture source contents");
  for (const row of rows) {
    if (row.evidenceOnly !== true) failures.push(`${row.path}: evidenceOnly must be true`);
    if (row.contentCaptured !== false) failures.push(`${row.path}: contentCaptured must be false`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.path}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.path}: executableNow must be false`);
    if (!row.approvalRequestPresent) failures.push(`${row.path}: missing approval request link`);
    if (!row.executionRowPresent) failures.push(`${row.path}: missing execution row link`);
  }

  const markdown = readText(paths.evidencePackMarkdown);
  if (markdown.includes("undefined")) failures.push("evidence pack markdown contains undefined");
  if (!markdown.includes("This is evidence only")) failures.push("evidence pack markdown missing evidence-only boundary");
  if (!markdown.includes("does not copy source contents into this report")) {
    failures.push("evidence pack markdown missing no-content boundary");
  }
  if (!markdown.includes("Every row remains non-executable")) {
    failures.push("evidence pack markdown missing non-executable boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: current.dirtyMapStatusSignature,
    expandedStatusEntries: current.expandedStatusEntries,
    evidenceRows: rows.length,
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
    console.log("A25 Wave 01 package resync evidence-pack gate");
    console.log(`Evidence rows: ${payload.evidenceRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 package resync evidence-pack gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
