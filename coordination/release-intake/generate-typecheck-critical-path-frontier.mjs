#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  matrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  routing: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  assignmentPacket: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  latestJson: "coordination/release-intake/latest-A25-typecheck-critical-path-frontier.json",
  latestMarkdown: "coordination/release-intake/latest-A25-typecheck-critical-path-frontier.md",
  datedJson: `coordination/release-intake/${date}-A25-typecheck-critical-path-frontier.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-typecheck-critical-path-frontier.md`
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

function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function sourceCurrentnessFailures({ dirtyMap, matrix, routing, assignmentPacket }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  for (const [label, artifact] of [
    ["owner package readiness matrix", matrix],
    ["owner package blocker routing", routing],
    ["owner package blocker assignment packet", assignmentPacket]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if (routing.sourceMatrixGeneratedAt !== matrix.generatedAt) failures.push("owner package blocker routing source matrix timestamp is stale");
  if (assignmentPacket.sourceRoutingGeneratedAt !== routing.generatedAt) failures.push("owner package blocker assignment packet source routing timestamp is stale");
  for (const [label, summary] of [
    ["owner package readiness matrix", matrix.summary ?? {}],
    ["owner package blocker routing", routing.summary ?? {}],
    ["owner package blocker assignment packet", assignmentPacket.summary ?? {}]
  ]) {
    if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push(`${label} exposes cleanup-authorized rows`);
    if ((summary.executableRows ?? 0) !== 0) failures.push(`${label} exposes executable rows`);
  }
  if (assignmentPacket.cleanupAuthorized === true) failures.push("owner package blocker assignment packet is cleanup-authorized");
  if (assignmentPacket.executableNow === true) failures.push("owner package blocker assignment packet is executable");
  return failures;
}

function assignmentByOwner(assignments) {
  return new Map((assignments ?? []).filter((row) => row.agentId).map((row) => [row.agentId, row]));
}

function addOwnerAggregate(map, route, packageRow, errors) {
  if (!route?.ownerId) return;
  const current = map.get(route.ownerId) ?? {
    ownerId: route.ownerId,
    owner: route.owner ?? route.ownerId,
    routeKinds: new Set(),
    files: new Set(),
    packageRows: new Set(),
    waves: new Set(),
    errors: 0
  };
  current.routeKinds.add(route.routeKind ?? "cross-owner-blocker");
  current.files.add(packageRow.file);
  current.packageRows.add(packageRow.matrixId);
  current.waves.add(packageRow.waveId);
  current.errors += errors;
  map.set(route.ownerId, current);
}

function matchingRouteFiles(route, file) {
  return (route.files ?? []).filter((routeFile) => routeFile.file === file);
}

function typeTopEntryFor(row, file) {
  return (row.typeCheckTopFiles ?? []).find((entry) => entry.file === file) ?? null;
}

function impactedRowsForFile(file, routingRows) {
  const impacts = [];
  const ownerAggregate = new Map();
  for (const row of routingRows) {
    const topEntry = typeTopEntryFor(row, file);
    const ownerRoutes = [];
    for (const route of row.ownerRoutes ?? []) {
      const matches = matchingRouteFiles(route, file);
      if (matches.length === 0) continue;
      const errors = matches.reduce((sum, match) => sum + Number(match.errors ?? 0), 0);
      const routeRow = {
        ownerId: route.ownerId,
        owner: route.owner,
        routeKind: route.routeKind,
        errors
      };
      ownerRoutes.push(routeRow);
    }
    if (ownerRoutes.length === 0 && topEntry) {
      for (const owner of topEntry.inferredOwners ?? []) {
        ownerRoutes.push({
          ownerId: owner.ownerId,
          owner: owner.owner,
          routeKind: (row.packageOwnerIds ?? []).includes(owner.ownerId) ? "package-owner" : "cross-owner-blocker",
          errors: Number(topEntry.errors ?? 0)
        });
      }
    }
    if (ownerRoutes.length === 0 && !topEntry) continue;
    const impact = {
      matrixId: row.matrixId,
      waveId: row.waveId,
      packageId: row.packageId,
      packageName: row.packageName,
      readiness: row.readiness,
      failedCheckNames: row.failedCheckNames ?? [],
      blockingReasons: row.blockingReasons ?? [],
      typeCheckErrorsInPackage: Number(topEntry?.errors ?? ownerRoutes.reduce((sum, route) => sum + route.errors, 0)),
      ownerRoutes
    };
    impacts.push(impact);
    for (const route of ownerRoutes) {
      addOwnerAggregate(ownerAggregate, route, { ...impact, file }, route.errors);
    }
  }
  return { impacts, ownerAggregate };
}

function ownerAggregateRows(ownerAggregate, assignmentsByOwner) {
  return [...ownerAggregate.values()]
    .map((row) => {
      const assignment = assignmentsByOwner.get(row.ownerId);
      return {
        ownerId: row.ownerId,
        owner: row.owner,
        routeKinds: [...row.routeKinds].sort(),
        files: row.files.size,
        frontierRows: row.files.size,
        impactedPackageRows: row.packageRows.size,
        impactedWaves: [...row.waves].sort(),
        totalMatchedErrors: row.errors,
        recommendedWorktree: assignment?.recommendedWorktree ?? "",
        writeScope: assignment?.writeScope ?? [],
        cleanupAuthorized: false,
        executableNow: false
      };
    })
    .sort((left, right) => right.totalMatchedErrors - left.totalMatchedErrors || left.ownerId.localeCompare(right.ownerId));
}

function choosePrimaryRoute(ownerRoutes, assignmentsByOwner) {
  const rows = ownerRoutes
    .map((row) => ({
      ...row,
      routeKindPriority: row.routeKinds.includes("package-owner") ? 0 : 1
    }))
    .sort((left, right) =>
      left.routeKindPriority - right.routeKindPriority ||
      right.totalMatchedErrors - left.totalMatchedErrors ||
      left.ownerId.localeCompare(right.ownerId)
    );
  const primary = rows[0] ?? {
    ownerId: "A25",
    owner: "A25 git hygiene and release intake lead",
    routeKinds: ["unrouted"],
    totalMatchedErrors: 0
  };
  const assignment = assignmentsByOwner.get(primary.ownerId);
  return {
    ownerId: primary.ownerId,
    owner: primary.owner,
    routeKind: primary.routeKinds.includes("package-owner") ? "package-owner" : (primary.routeKinds[0] ?? "cross-owner-blocker"),
    recommendedWorktree: assignment?.recommendedWorktree ?? "",
    writeScope: assignment?.writeScope ?? []
  };
}

function nextAction(primary, file, impacts) {
  const worktree = primary.recommendedWorktree ? ` in ${primary.recommendedWorktree}` : "";
  return `${primary.ownerId} should inspect \`${file}\`${worktree}, fix only its assigned owner scope, then rerun the impacted package checks for ${impacts.length} package row(s) before A25 refreshes the aggregate gates.`;
}

function frontierRows(topFiles, routingRows, assignmentsByOwner) {
  return topFiles.map((topFile, index) => {
    const { impacts, ownerAggregate } = impactedRowsForFile(topFile.file, routingRows);
    const ownerRoutes = ownerAggregateRows(ownerAggregate, assignmentsByOwner);
    const primary = choosePrimaryRoute(ownerRoutes, assignmentsByOwner);
    return {
      rank: index + 1,
      file: topFile.file,
      totalErrors: Number(topFile.errors ?? 0),
      matchedRouteErrors: ownerRoutes.reduce((sum, owner) => sum + owner.totalMatchedErrors, 0),
      primaryOwnerId: primary.ownerId,
      primaryOwner: primary.owner,
      primaryRouteKind: primary.routeKind,
      recommendedWorktree: primary.recommendedWorktree,
      writeScope: primary.writeScope,
      impactedPackageRows: impacts.length,
      impactedWaves: unique(impacts.map((row) => row.waveId)).sort(),
      impactedPackages: unique(impacts.map((row) => row.packageId)).sort(),
      ownerRoutes,
      packageImpacts: impacts,
      nextAction: nextAction(primary, topFile.file, impacts),
      evidence: [
        TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.matrix,
        TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.routing,
        TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.assignmentPacket
      ],
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function ownerFrontierRows(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const owner of row.ownerRoutes) {
      const current = map.get(owner.ownerId) ?? {
        ownerId: owner.ownerId,
        owner: owner.owner,
        files: new Set(),
        frontierRows: 0,
        impactedPackageRows: 0,
        totalMatchedErrors: 0,
        recommendedWorktree: owner.recommendedWorktree,
        cleanupAuthorized: false,
        executableNow: false
      };
      current.files.add(row.file);
      current.frontierRows += 1;
      current.impactedPackageRows += owner.impactedPackageRows;
      current.totalMatchedErrors += owner.totalMatchedErrors;
      if (!current.recommendedWorktree) current.recommendedWorktree = owner.recommendedWorktree;
      map.set(owner.ownerId, current);
    }
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      files: row.files.size
    }))
    .sort((left, right) => right.totalMatchedErrors - left.totalMatchedErrors || left.ownerId.localeCompare(right.ownerId));
}

function blockedOwnerPackageRows(matrix) {
  return (matrix.rows ?? []).filter((row) => row.readiness !== "ready" && row.sourceKind !== "physical-lifecycle-readiness").length;
}

function buildTypecheckCriticalPathFrontier() {
  const dirtyMap = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.dirtyMap);
  const matrix = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.matrix);
  const routing = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.routing);
  const assignmentPacket = readJson(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.assignmentPacket);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, matrix, routing, assignmentPacket });
  const assignmentsByOwner = assignmentByOwner(assignmentPacket.assignments ?? []);
  const rows = frontierRows(matrix.summary?.topTypeCheckFiles ?? [], routing.rows ?? [], assignmentsByOwner);
  const owners = ownerFrontierRows(rows);
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    frontierKind: "typecheck-critical-path-frontier",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      matrixGeneratedAt: matrix.generatedAt,
      routingGeneratedAt: routing.generatedAt,
      assignmentPacketGeneratedAt: assignmentPacket.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    summary: {
      typeCheckErrorLines: matrix.summary?.typeCheckErrorLines ?? 0,
      topTypeCheckFiles: matrix.summary?.topTypeCheckFiles?.length ?? 0,
      frontierRows: rows.length,
      criticalOwnerRows: owners.length,
      failedChecks: matrix.summary?.failedChecks ?? 0,
      blockedOwnerPackageRows: blockedOwnerPackageRows(matrix),
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length
    },
    ownerFrontierRows: owners,
    frontierRows: rows,
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

export function stableTypecheckCriticalPathFrontierProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    frontierKind: payload.frontierKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    summary: payload.summary,
    ownerFrontierRows: payload.ownerFrontierRows,
    frontierRows: payload.frontierRows,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const ownerRows = payload.ownerFrontierRows.map((row) =>
    `| ${cell(row.ownerId)} | ${cell(row.owner)} | ${row.files} | ${row.frontierRows} | ${row.impactedPackageRows} | ${row.totalMatchedErrors} | \`${cell(row.recommendedWorktree || "n/a")}\` |`
  ).join("\n") || "| none | n/a | 0 | 0 | 0 | 0 | n/a |";
  const fileRows = payload.frontierRows.map((row) =>
    `| ${row.rank} | \`${cell(row.file)}\` | ${row.totalErrors} | ${cell(row.primaryOwnerId)} | ${cell(row.primaryRouteKind)} | ${row.impactedPackageRows} | ${cell(row.impactedWaves.join(", "))} |`
  ).join("\n") || "| 0 | none | 0 | n/a | n/a | 0 | n/a |";
  const details = payload.frontierRows.map((row) => `## ${row.rank}. \`${row.file}\`

- Total type-check errors: ${row.totalErrors}
- Primary owner: ${row.primaryOwnerId} (${row.primaryOwner})
- Recommended worktree: \`${row.recommendedWorktree || "n/a"}\`
- Impacted package rows: ${row.impactedPackageRows}
- Impacted waves: ${row.impactedWaves.join(", ") || "n/a"}
- Next action: ${row.nextAction}
- Owner routes: ${row.ownerRoutes.map((owner) => `${owner.ownerId} (${owner.totalMatchedErrors})`).join(", ") || "n/a"}
`).join("\n");

  return `# A25 Type-Check Critical Path Frontier

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is A25-owned verification-routing evidence only. It does not authorize staging, committing, merging, cleanup, destructive Git, worktree removal, branch deletion, deploy, or dirty-root release.

## Summary

- Type-check error lines: ${payload.summary.typeCheckErrorLines}
- Top type-check files: ${payload.summary.topTypeCheckFiles}
- Frontier rows: ${payload.summary.frontierRows}
- Critical owner rows: ${payload.summary.criticalOwnerRows}
- Failed checks: ${payload.summary.failedChecks}
- Blocked owner-package rows: ${payload.summary.blockedOwnerPackageRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Frontier

| Owner ID | Owner | Files | Frontier rows | Impacted package rows | Matched errors | Recommended worktree |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${ownerRows}

## File Frontier

| Rank | File | Errors | Primary owner | Route kind | Impacted package rows | Waves |
| ---: | --- | ---: | --- | --- | ---: | --- |
${fileRows}

${details}
`;
}

export function buildTypecheckCriticalPathFrontierPayload() {
  return buildTypecheckCriticalPathFrontier();
}

function persist(payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestJson, json);
  write(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.datedJson, json);
  write(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestMarkdown, md);
  write(TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.datedMarkdown, md);
}

function main() {
  const payload = buildTypecheckCriticalPathFrontier();
  persist(payload);
  console.log(JSON.stringify({
    latestJson: TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestJson,
    latestMarkdown: TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.latestMarkdown,
    datedJson: TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.datedJson,
    datedMarkdown: TYPECHECK_CRITICAL_PATH_FRONTIER_PATHS.datedMarkdown,
    frontierRows: payload.summary.frontierRows,
    criticalOwnerRows: payload.summary.criticalOwnerRows,
    typeCheckErrorLines: payload.summary.typeCheckErrorLines,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
