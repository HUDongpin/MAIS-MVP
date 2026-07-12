#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  matrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  latestJson: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-routing.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-blocker-routing.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-blocker-routing.md`
};

const ownerNames = {
  A01: "A01 app shell lead",
  A02: "A02 dashboard lead",
  A03: "A03 curriculum roadmap lead",
  A04: "A04 practice lead",
  A05: "A05 lesson lead",
  A06: "A06 visualization lead",
  A07: "A07 AI tutor lead",
  A08: "A08 state and analytics lead",
  A09: "A09 copy, i18n, accessibility lead",
  A10: "A10 tooling, docs, and report lead",
  A11: "A11 QA and release quality lead",
  A12: "A12 backend/API platform lead",
  A13: "A13 teacher console lead",
  A14: "A14 parent console lead",
  A15: "A15 adaptive engine lead",
  A16: "A16 research and learning science lead",
  A17: "A17 gamification and motivation lead",
  A18: "A18 curriculum QA and content quality lead",
  A19: "A19 API configuration and deployment env lead",
  A20: "A20 game design and game-based learning lead",
  A21: "A21 content pipeline and RAG operations lead",
  A22: "A22 production reliability and release engineering lead",
  A23: "A23 integration and promotion lead",
  A24: "A24 illustration exact-layer lead",
  A25: "A25 git hygiene and release intake lead"
};

const pathOwnerRules = [
  { ownerIds: ["A06"], prefixes: ["components/visualizations/", "app/visualization-lab/", "app/student/tools/visualizations/", "data/visualizationLabs.ts", "lib/math.ts"] },
  { ownerIds: ["A13"], prefixes: ["components/teacher/", "app/teacher/", "lib/teacher"] },
  { ownerIds: ["A12", "A13"], prefixes: ["app/api/teacher/"] },
  { ownerIds: ["A14"], prefixes: ["components/parent/", "app/parent/", "lib/parent"] },
  { ownerIds: ["A20"], prefixes: ["components/games/", "app/games/", "app/student/practice/games/", "lib/gameBasedLearning", "data/gameBasedLearning"] },
  { ownerIds: ["A20"], prefixes: ["components/gamification/FishingGame", "components/gamification/AdventureIslandGame", "components/gamification/QuadraticBonusGame"] },
  { ownerIds: ["A17"], prefixes: ["components/gamification/", "lib/gamification", "data/gamification", "app/api/gamification/"] },
  { ownerIds: ["A04", "A18"], prefixes: ["data/questions.ts"] },
  { ownerIds: ["A03", "A18"], prefixes: ["data/topics.ts", "data/grades.ts", "data/mainland", "data/us"] },
  { ownerIds: ["A15"], prefixes: ["lib/adaptiveLearning", "app/api/adaptive-learning/"] },
  { ownerIds: ["A02"], prefixes: ["components/dashboard/", "components/cards/", "app/dashboard/", "app/progress/", "data/progress.ts", "data/learningAnalytics.ts"] },
  { ownerIds: ["A07"], prefixes: ["components/ai/", "app/api/ai-tutor/", "lib/server/llmProvider.ts"] },
  { ownerIds: ["A12"], prefixes: ["lib/server/userStore.ts", "lib/server/auth.ts", "lib/server/sessionCookie.ts", "app/api/"] },
  { ownerIds: ["A08"], prefixes: ["components/providers/AppProviders.tsx", "lib/learningAnalytics", "lib/difficulty", "lib/utils.ts", "types/index.ts"] },
  { ownerIds: ["A11"], prefixes: ["tests/e2e/", "lib/mvpReadiness.test.ts"] },
  { ownerIds: ["A09"], prefixes: ["lib/i18n.ts"] },
  { ownerIds: ["A25"], prefixes: ["coordination/release-intake/"] },
  { ownerIds: ["A10"], prefixes: ["coordination/", "README.md", "AGENTS.md", ".gitignore", "package.json", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "app/globals.css"] },
  { ownerIds: ["A22"], prefixes: [".vercelignore", "playwright.config.ts"] },
  { ownerIds: ["A10", "A22"], prefixes: ["scripts/cleanup-generated-artifacts", "scripts/deploy-vercel", "scripts/release-"] },
  { ownerIds: ["A19"], prefixes: [".env.local.example"] }
];

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ownerIdsFromNames(owners) {
  return unique((owners ?? []).map((owner) => String(owner).match(/\bA\d\d\b/)?.[0]).filter(Boolean));
}

function inferOwnerIds(file) {
  const normalized = String(file ?? "");
  const matched = pathOwnerRules
    .filter((rule) => rule.prefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix)))
    .flatMap((rule) => rule.ownerIds);
  return unique(matched.length > 0 ? matched : ["A25"]);
}

function ownerRouteRows(ownerFileMap, packageOwnerIds) {
  return [...ownerFileMap.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([ownerId, files]) => ({
      ownerId,
      owner: ownerNames[ownerId] ?? ownerId,
      routeKind: packageOwnerIds.includes(ownerId) ? "package-owner" : "cross-owner-blocker",
      files: files
        .sort((left, right) => right.errors - left.errors || left.file.localeCompare(right.file))
        .slice(0, 12)
    }));
}

function countOwnerFiles(topFiles) {
  const map = new Map();
  for (const topFile of topFiles) {
    for (const ownerId of inferOwnerIds(topFile.file)) {
      if (!map.has(ownerId)) map.set(ownerId, []);
      map.get(ownerId).push({
        file: topFile.file,
        errors: topFile.errors ?? 0
      });
    }
  }
  return map;
}

function topBlockingOwners(ownerRoutes) {
  return ownerRoutes
    .map((route) => ({
      ownerId: route.ownerId,
      owner: route.owner,
      routeKind: route.routeKind,
      files: route.files.length,
      errors: route.files.reduce((sum, file) => sum + file.errors, 0)
    }))
    .sort((left, right) => right.errors - left.errors || left.ownerId.localeCompare(right.ownerId));
}

function failedCheckRows(row) {
  const failedNames = new Set(row.failedCheckNames ?? []);
  return (row.checks ?? [])
    .filter((check) => failedNames.has(check.name) || (check.passed === false && check.skipped !== true))
    .map((check) => ({
      name: check.name,
      command: check.command,
      status: check.status
    }));
}

function resyncRows(row) {
  return (row.packageResyncRecommendations ?? []).map((recommendation) => ({
    path: recommendation.path,
    actionKind: recommendation.actionKind,
    approvalNeeded: recommendation.approvalNeeded,
    executableNow: false,
    cleanupAuthorized: false
  }));
}

function nextActions(row, packageOwnerIds, ownerRoutes, resyncRecommendations) {
  const actions = [];
  const routeKinds = new Set(ownerRoutes.map((route) => route.routeKind));

  if (row.waveId === "wave-01-governance-release-hygiene" && row.wave01FrontierStatus) {
    actions.push("Use the Wave01 governance frontier as the current source of truth: six A25 artifact-clean rows are owner-authorized but still need a separate execution instruction.");
    actions.push("Keep wave01-resync-01-tsconfig-json held; do not restore tsconfig.json until the owner explicitly changes that hold.");
    actions.push("Do not run restore, clean, discard, or file deletion in the package worktree until an exact owner execution instruction is recorded.");
  } else if (resyncRecommendations.length > 0 || (row.uncoveredPaths ?? []).length > 0) {
    actions.push("A25/A10/A22 must keep package-only resync or uncovered-path rows parked until canonical owner input plus execution-instruction gates both pass; no restore, clean, or discard is authorized by this routing row.");
  }

  if (resyncRecommendations.length > 0 || (row.uncoveredPaths ?? []).length > 0) {
    actions.push("Keep package-only resync or uncovered-path rows non-executable until the recorded owner input and execution-instruction gates both pass.");
  }

  if (row.sourceKind === "physical-lifecycle-readiness") {
    actions.push("A25/A22 must keep this as a lifecycle decision until the release-source clean gate and strict worktree lifecycle gate both pass.");
  }

  if ((row.failedCheckNames ?? []).includes("typeCheck") && routeKinds.has("cross-owner-blocker")) {
    actions.push("Route type-check top-file blockers to the inferred cross-owner agents before the package owner attempts a reviewed commit.");
  }

  if ((row.failedCheckNames ?? []).some((name) => name !== "typeCheck")) {
    actions.push("The owning package session must inspect the named failed checks in its isolated worktree and either fix in scope or produce a blocker report.");
  }

  if ((row.failedCheckNames ?? []).includes("typeCheck") && !routeKinds.has("cross-owner-blocker")) {
    actions.push("The owning package session must address in-scope type-check blockers and rerun the listed checks.");
  }

  if (packageOwnerIds.length === 0) {
    actions.push("A25 must assign an explicit owner before this row can move to execution.");
  }

  actions.push("After any approved package action, refresh the dirty map and rerun the A25 aggregate currentness gate.");
  return unique(actions);
}

function routeRow(row) {
  const packageOwnerIds = ownerIdsFromNames(row.owners);
  const topFiles = (row.typeCheck?.topFiles ?? []).map((topFile) => ({
    file: topFile.file,
    errors: topFile.errors ?? 0,
    inferredOwners: inferOwnerIds(topFile.file).map((ownerId) => ({
      ownerId,
      owner: ownerNames[ownerId] ?? ownerId
    }))
  }));
  const ownerRoutes = ownerRouteRows(countOwnerFiles(topFiles), packageOwnerIds);
  const resyncRecommendations = resyncRows(row);
  return {
    matrixId: row.matrixId,
    sourceKind: row.sourceKind,
    waveId: row.waveId,
    packageId: row.packageId,
    packageName: row.packageName,
    readiness: row.readiness,
    packageOwners: row.owners ?? [],
    packageOwnerIds,
    routeToOwners: topBlockingOwners(ownerRoutes),
    ownerRoutes,
    blockingReasons: row.blockingReasons ?? [],
    failedCheckNames: row.failedCheckNames ?? [],
    failedChecks: failedCheckRows(row),
    typeCheckErrorLines: row.typeCheckErrorLines ?? 0,
    typeCheckTopFiles: topFiles,
    uncoveredPaths: (row.uncoveredPaths ?? []).slice(0, 20).map((file) => ({
      path: file,
      inferredOwners: inferOwnerIds(file).map((ownerId) => ({
        ownerId,
        owner: ownerNames[ownerId] ?? ownerId
      }))
    })),
    resyncRecommendationCount: resyncRecommendations.length,
    resyncRecommendations,
    wave01FrontierStatus: row.wave01FrontierStatus ?? null,
    wave01ArtifactCleanAuthorizedRows: row.wave01ArtifactCleanAuthorizedRows ?? null,
    wave01ArtifactCleanTargetDirtyRows: row.wave01ArtifactCleanTargetDirtyRows ?? null,
    wave01HeldRows: row.wave01HeldRows ?? null,
    wave01ValidExecutionInstructionRows: row.wave01ValidExecutionInstructionRows ?? null,
    wave01CleanupAuthorizedRows: row.wave01CleanupAuthorizedRows ?? null,
    wave01ExecutableRows: row.wave01ExecutableRows ?? null,
    approvalIds: row.approvalIds ?? [],
    physicalLifecycleApprovalIds: row.physicalLifecycleApprovalIds ?? [],
    nextActions: nextActions(row, packageOwnerIds, ownerRoutes, resyncRecommendations),
    cleanupAuthorized: false,
    executableNow: false
  };
}

function summarize(rows, matrix) {
  const ownerCounts = new Map();
  for (const row of rows) {
    for (const owner of row.routeToOwners) {
      const current = ownerCounts.get(owner.ownerId) ?? {
        ownerId: owner.ownerId,
        owner: owner.owner,
        routeRows: 0,
        files: 0,
        errors: 0
      };
      current.routeRows += 1;
      current.files += owner.files;
      current.errors += owner.errors;
      ownerCounts.set(owner.ownerId, current);
    }
  }

  return {
    matrixRows: matrix.summary?.rows ?? 0,
    matrixReadyRows: matrix.summary?.readyRows ?? 0,
    matrixBlockedRows: matrix.summary?.blockedRows ?? rows.length,
    routingRows: rows.length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length,
    failedChecks: rows.reduce((sum, row) => sum + row.failedCheckNames.length, 0),
    resyncRecommendationRows: rows.filter((row) => row.resyncRecommendationCount > 0).length,
    typeCheckErrorLines: rows.reduce((sum, row) => sum + row.typeCheckErrorLines, 0),
    topRoutingOwners: [...ownerCounts.values()]
      .sort((left, right) => right.errors - left.errors || right.routeRows - left.routeRows || left.ownerId.localeCompare(right.ownerId))
      .slice(0, 12)
  };
}

function escapeTable(value) {
  return String(value ?? "n/a").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdown(payload) {
  const overviewRows = payload.rows.map((row) => {
    const routeOwners = row.routeToOwners.slice(0, 4).map((owner) => `${owner.ownerId} (${owner.errors})`).join(", ") || "n/a";
    return `| \`${escapeTable(row.waveId)}\` | \`${escapeTable(row.packageId)}\` | ${escapeTable(row.packageOwnerIds.join(", ") || "n/a")} | ${escapeTable(routeOwners)} | ${row.failedCheckNames.length} | ${row.typeCheckErrorLines} | ${row.resyncRecommendationCount} |`;
  }).join("\n");

  const details = payload.rows.map((row) => `## ${row.packageName}

- Matrix ID: \`${row.matrixId}\`
- Package owners: ${row.packageOwnerIds.length > 0 ? row.packageOwnerIds.join(", ") : "n/a"}
- Route to owners: ${row.routeToOwners.length > 0 ? row.routeToOwners.map((owner) => `${owner.ownerId} (${owner.routeKind}, ${owner.errors} type errors)`).join(", ") : "n/a"}
- Failed checks: ${row.failedCheckNames.length > 0 ? row.failedCheckNames.join(", ") : "none"}
- Blocking reasons: ${row.blockingReasons.length > 0 ? row.blockingReasons.join("; ") : "none"}
- Resync recommendations: ${row.resyncRecommendationCount}
- Next actions:
${row.nextActions.map((action) => `  - ${action}`).join("\n")}
- Top type-check files:
${row.typeCheckTopFiles.length > 0 ? row.typeCheckTopFiles.slice(0, 8).map((file) => `  - \`${file.file}\` (${file.errors}) -> ${file.inferredOwners.map((owner) => owner.ownerId).join(", ")}`).join("\n") : "  - n/a"}
`).join("\n");

  return `# A25 Owner Package Blocker Routing

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source matrix generated: ${payload.sourceMatrixGeneratedAt}

This is blocker routing evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, or any other physical cleanup.

## Summary

- Matrix rows: ${payload.summary.matrixRows}
- Matrix ready rows: ${payload.summary.matrixReadyRows}
- Matrix blocked rows: ${payload.summary.matrixBlockedRows}
- Routing rows: ${payload.summary.routingRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Rows with package resync recommendations: ${payload.summary.resyncRecommendationRows}
- Type-check error lines routed: ${payload.summary.typeCheckErrorLines}

| Wave | Package | Package owners | Route to owners | Failed checks | Type errors | Resyncs |
| --- | --- | --- | --- | ---: | ---: | ---: |
${overviewRows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const matrix = readJson(paths.matrix);

  if (matrix.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("owner package readiness matrix is stale relative to latest dirty map");
  }

  const rows = (matrix.rows ?? [])
    .filter((row) => row.readiness !== "ready")
    .map(routeRow);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceMatrixGeneratedAt: matrix.generatedAt,
    note: "Blocker routing evidence only. A separate explicit owner instruction is required for any Git or physical cleanup operation.",
    summary: summarize(rows, matrix),
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
    routingRows: payload.summary.routingRows,
    blockedRows: payload.summary.matrixBlockedRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
