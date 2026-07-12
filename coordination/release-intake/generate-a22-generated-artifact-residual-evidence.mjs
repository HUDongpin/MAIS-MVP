#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const activeWriterSampleLimit = 20;

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  latestJson: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
  latestMarkdown: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.md",
  datedJson: `coordination/release-intake/${date}-A22-generated-artifact-residual-evidence.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-residual-evidence.md`
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

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanupDryRun() {
  const stdout = execFileSync(process.execPath, ["scripts/cleanup-generated-artifacts.mjs", "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(stdout);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function activeWriterProbe(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return { available: true, rows: [], totalRows: 0 };

  let stdout = "";
  try {
    stdout = execFileSync("lsof", ["+D", absolutePath], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (error.status === 1 && error.stdout) {
      stdout = error.stdout.toString();
    } else if (error.status === 1) {
      return { available: true, rows: [], totalRows: 0 };
    } else {
      return {
        available: false,
        rows: [],
        totalRows: 0,
        error: error.message
      };
    }
  }

  const rows = stdout.trim().split(/\r?\n/).slice(1)
    .map((line) => parseLsofLine(line, absolutePath))
    .filter((row) => row && /[wu]/i.test(row.fd))
    .sort((left, right) => `${left.path}:${left.fd}`.localeCompare(`${right.path}:${right.fd}`));

  return {
    available: true,
    rows: rows.slice(0, activeWriterSampleLimit),
    totalRows: rows.length,
    sampleTruncated: rows.length > activeWriterSampleLimit
  };
}

function parseLsofLine(line, targetAbsolutePath) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 9) return null;
  const name = parts.slice(8).join(" ");
  const absoluteName = path.isAbsolute(name) ? name : path.resolve(root, name);
  const pathInTarget = absoluteName === targetAbsolutePath
    ? "."
    : path.relative(targetAbsolutePath, absoluteName).split(path.sep).join("/");
  if (pathInTarget.startsWith("..")) return null;
  return {
    command: parts[0],
    pid: Number(parts[1]),
    fd: parts[3],
    type: parts[4],
    path: pathInTarget
  };
}

function shallowManifest(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      exists: false,
      type: "missing"
    };
  }
  const stat = fs.statSync(absolutePath);
  return {
    path: relativePath,
    exists: true,
    type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other"
  };
}

function entryManifest(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      exists: false,
      type: "missing",
      bytes: 0,
      directoryCount: 0,
      fileCount: 0,
      manifestSha256: null,
      entries: []
    };
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    const entries = [{
      path: ".",
      type: "file",
      bytes: stat.size
    }];
    return {
      path: relativePath,
      exists: true,
      type: "file",
      bytes: stat.size,
      directoryCount: 0,
      fileCount: 1,
      manifestSha256: sha256(JSON.stringify(entries)),
      entries
    };
  }

  if (!stat.isDirectory()) {
    const entries = [{ path: ".", type: "other", bytes: 0 }];
    return {
      path: relativePath,
      exists: true,
      type: "other",
      bytes: 0,
      directoryCount: 0,
      fileCount: 0,
      manifestSha256: sha256(JSON.stringify(entries)),
      entries
    };
  }

  const entries = directoryEntries(absolutePath, absolutePath);
  return {
    path: relativePath,
    exists: true,
    type: "directory",
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    directoryCount: entries.filter((entry) => entry.type === "directory").length,
    fileCount: entries.filter((entry) => entry.type === "file").length,
    manifestSha256: sha256(JSON.stringify(entries)),
    entries
  };
}

function directoryEntries(basePath, currentPath) {
  const entries = [];
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(basePath, absolutePath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      entries.push({ path: relativePath, type: "directory", bytes: 0 });
      entries.push(...directoryEntries(basePath, absolutePath));
    } else if (entry.isFile()) {
      entries.push({
        path: relativePath,
        type: "file",
        bytes: fs.statSync(absolutePath).size
      });
    } else {
      entries.push({ path: relativePath, type: "other", bytes: 0 });
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function residualRow(target, index) {
  const activeWriters = activeWriterProbe(target.path);
  const activeWriterBlocked = activeWriters.totalRows > 0;
  const manifest = activeWriterBlocked ? shallowManifest(target.path) : entryManifest(target.path);
  const activeWriterPaths = [...new Set(activeWriters.rows.map((row) => row.path))].sort();
  const skipReason = /^\.s11-parent-audit-next\d+$/.test(target.path)
    ? "cleanup script apply skips this anomalous dataless generated directory until evidence is preserved and separate owner/A22 handling is authorized"
    : target.path === ".tmp"
      ? activeWriterBlocked
        ? "active writer detected under .tmp; preserve evidence and wait for A22/owner confirmation before cleanup"
        : "cleanup script recreates .tmp as an empty scratch directory after apply"
      : "generated artifact target reported by cleanup dry-run";

  return {
    residualIndex: index + 1,
    path: target.path,
    targetType: target.type,
    dryRunBytes: activeWriterBlocked ? null : target.bytes,
    dryRunBytesVolatile: activeWriterBlocked,
    exists: manifest.exists,
    manifestType: manifest.type,
    manifestBytes: activeWriterBlocked ? null : manifest.bytes,
    directoryCount: activeWriterBlocked ? null : manifest.directoryCount,
    fileCount: activeWriterBlocked ? null : manifest.fileCount,
    manifestSha256: activeWriterBlocked ? null : manifest.manifestSha256,
    activeWriterBlocked,
    activeWriterProbeAvailable: activeWriters.available,
    activeWriterCount: activeWriters.totalRows,
    activeWriterPaths,
    activeWriters: activeWriters.rows,
    activeWriterSampleTruncated: activeWriters.sampleTruncated ?? false,
    skipReason,
    evidenceOnly: true,
    cleanupAuthorized: false,
    executableNow: false,
    contentCaptured: false,
    manifestEntries: activeWriterBlocked ? [] : manifest.entries
  };
}

function isEmptyTmpScratchBaseline(row) {
  return row.path === ".tmp"
    && row.targetType === "directory"
    && row.manifestType === "directory"
    && row.manifestBytes === 0
    && row.directoryCount === 0
    && row.fileCount === 0
    && !row.activeWriterBlocked;
}

function markdown(payload) {
  const rows = payload.rows.map((row) => (
    `| ${row.residualIndex} | \`${row.path}\` | ${row.manifestType} | ${formatValue(row.manifestBytes)} | ${formatValue(row.directoryCount)} | ${formatValue(row.fileCount)} | \`${row.manifestSha256 ?? (row.activeWriterBlocked ? "active-writer" : "n/a")}\` | ${row.activeWriterBlocked ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | 0 | 0 | 0 | n/a | no | no |";
  const activeWriterRows = payload.rows
    .filter((row) => row.activeWriterBlocked)
    .flatMap((row) => row.activeWriterPaths.map((activePath) => `\`${row.path}/${activePath}\``));

  return `# A22 Generated Artifact Residual Evidence

Generated: ${payload.generatedAt}

Cleanup dry-run command: \`${payload.cleanupCommand}\`

This is A25 release-intake evidence for A22-owned generated-artifact cleanup. It records only residual target structure, byte counts, and manifest hashes. It does not copy file contents into this report and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Residual targets: ${payload.summary.residualTargets}
- Scratch baseline targets: ${payload.summary.scratchBaselineTargets}
- Known stable bytes: ${payload.summary.totalBytes}
- Active-writer blocked rows: ${payload.summary.activeWriterBlockedRows}
- Active-writer paths: ${activeWriterRows.length > 0 ? activeWriterRows.join(", ") : "none"}
- Dataless targets: ${payload.summary.datalessTargets}
- Content-captured rows: ${payload.summary.contentCapturedRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Residual Rows

| # | Path | Type | Bytes | Directories | Files | Manifest SHA-256 | Active writer | Executable now |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
${rows}

## Boundary

Every row remains non-executable. The \`.s11-parent-audit-next*\` rows are still evidence-protected anomalous dataless generated directories. Active-writer rows keep only path/process metadata and intentionally omit changing size/hash manifests until the writer exits or A22/owner explicitly confirms cleanup handling.

An empty top-level \`.tmp\` directory with no active writer is treated as scratch baseline because the cleanup script recreates it after apply. Any files, nested directories, or active writers under \`.tmp\` remain residual evidence.
`;
}

function formatValue(value) {
  return value === null || value === undefined ? "volatile" : String(value);
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const dryRun = cleanupDryRun();
  const candidateRows = (dryRun.targets ?? []).map(residualRow);
  const scratchBaselineRows = candidateRows.filter(isEmptyTmpScratchBaseline);
  const rows = candidateRows.filter((row) => !isEmptyTmpScratchBaseline(row));
  const summary = {
    residualTargets: rows.length,
    scratchBaselineTargets: scratchBaselineRows.length,
    totalBytes: rows.reduce((total, row) => total + (row.manifestBytes ?? 0), 0),
    activeWriterBlockedRows: rows.filter((row) => row.activeWriterBlocked).length,
    activeWriterOpenFileCount: rows.reduce((total, row) => total + (row.activeWriterCount ?? 0), 0),
    datalessTargets: rows.filter((row) => row.manifestBytes === 0).length,
    contentCapturedRows: rows.filter((row) => row.contentCaptured).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length,
    cleanupCommand: "node scripts/cleanup-generated-artifacts.mjs --dry-run --json",
    dryRun: {
      scope: dryRun.scope,
      targetCount: dryRun.targetCount,
      totalBytes: dryRun.totalBytes,
      apply: dryRun.apply,
      dryRun: dryRun.dryRun
    },
    summary,
    scratchBaselineRows,
    rows
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  for (const target of [paths.latestJson, paths.datedJson]) fs.writeFileSync(path.join(root, target), json);
  for (const target of [paths.latestMarkdown, paths.datedMarkdown]) fs.writeFileSync(path.join(root, target), md);
  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    residualTargets: summary.residualTargets,
    totalBytes: summary.totalBytes,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
