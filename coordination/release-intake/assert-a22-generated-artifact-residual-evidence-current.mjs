#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-generated-artifact-residual-evidence-current-gate.json");
const json = process.argv.includes("--json");
const activeWriterSampleLimit = 20;

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  latestJson: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
  latestMarkdown: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
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

function cleanupDryRun() {
  const stdout = execFileSync(process.execPath, ["scripts/cleanup-generated-artifacts.mjs", "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return JSON.parse(stdout);
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
    const entries = [{ path: ".", type: "file", bytes: stat.size }];
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

function buildCurrentEvidence() {
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
  return {
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
}

function stableProjection(payload) {
  return {
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    cleanupCommand: payload.cleanupCommand,
    dryRun: {
      scope: payload.dryRun?.scope,
      targetCount: payload.dryRun?.targetCount,
      apply: payload.dryRun?.apply,
      dryRun: payload.dryRun?.dryRun,
      totalBytes: (payload.summary?.activeWriterBlockedRows ?? 0) > 0 ? "volatile-active-writer" : payload.dryRun?.totalBytes
    },
    summary: {
      residualTargets: payload.summary?.residualTargets,
      scratchBaselineTargets: payload.summary?.scratchBaselineTargets ?? 0,
      totalBytes: payload.summary?.totalBytes,
      activeWriterBlockedRows: payload.summary?.activeWriterBlockedRows ?? 0,
      datalessTargets: payload.summary?.datalessTargets,
      contentCapturedRows: payload.summary?.contentCapturedRows,
      cleanupAuthorizedRows: payload.summary?.cleanupAuthorizedRows,
      executableRows: payload.summary?.executableRows
    },
    scratchBaselineRows: (payload.scratchBaselineRows ?? []).map(stableRowProjection),
    rows: (payload.rows ?? []).map(stableRowProjection)
  };
}

function stableRowProjection(row) {
  const base = {
    residualIndex: row.residualIndex,
    path: row.path,
    targetType: row.targetType,
    exists: row.exists,
    manifestType: row.manifestType,
    activeWriterBlocked: row.activeWriterBlocked ?? false,
    evidenceOnly: row.evidenceOnly,
    cleanupAuthorized: row.cleanupAuthorized,
    executableNow: row.executableNow,
    contentCaptured: row.contentCaptured
  };
  if (row.activeWriterBlocked) {
    return {
      ...base,
      dryRunBytesVolatile: row.dryRunBytesVolatile,
      activeWriterProbeAvailable: row.activeWriterProbeAvailable
    };
  }
  return {
    ...base,
    dryRunBytes: row.dryRunBytes,
    dryRunBytesVolatile: row.dryRunBytesVolatile ?? false,
    manifestBytes: row.manifestBytes,
    directoryCount: row.directoryCount,
    fileCount: row.fileCount,
    manifestSha256: row.manifestSha256,
    skipReason: row.skipReason,
    manifestEntries: row.manifestEntries
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
  if (failures.length > 0) return finish({ failures, residualTargets: 0, cleanupAuthorizedRows: 0, executableRows: 0 });

  const recorded = readJson(paths.latestJson);
  const dirtyMap = readJson(paths.dirtyMap);
  const current = buildCurrentEvidence();
  if (!sameJson(stableProjection(recorded), stableProjection(current))) {
    failures.push("A22 generated-artifact residual evidence is stale relative to cleanup dry-run and filesystem manifests");
  }
  if (recorded.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("residual evidence dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== (dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length)) {
    failures.push("residual evidence expanded dirty entry count is stale");
  }

  const rows = recorded.rows ?? [];
  const summary = recorded.summary ?? {};
  if (summary.residualTargets !== rows.length) failures.push("residual target summary is stale");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("residual evidence must not authorize cleanup");
  if ((summary.executableRows ?? 0) !== 0) failures.push("residual evidence must not have executable rows");
  if ((summary.contentCapturedRows ?? 0) !== 0) failures.push("residual evidence must not capture file contents");
  for (const row of rows) {
    if (row.evidenceOnly !== true) failures.push(`${row.path}: evidenceOnly must be true`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.path}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.path}: executableNow must be false`);
    if (row.contentCaptured !== false) failures.push(`${row.path}: contentCaptured must be false`);
  }

  const markdown = readText(paths.latestMarkdown);
  if (markdown.includes("undefined")) failures.push("residual evidence markdown contains undefined");
  if (!markdown.includes("This is A25 release-intake evidence for A22-owned generated-artifact cleanup")) {
    failures.push("residual evidence markdown missing ownership boundary");
  }
  if (!markdown.includes("It does not copy file contents into this report")) {
    failures.push("residual evidence markdown missing no-content boundary");
  }
  if (!markdown.includes("Every row remains non-executable")) {
    failures.push("residual evidence markdown missing non-executable boundary");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    residualTargets: rows.length,
    totalBytes: summary.totalBytes ?? 0,
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
    console.log("A22 generated-artifact residual evidence gate");
    console.log(`Residual targets: ${payload.residualTargets ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 generated-artifact residual evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
