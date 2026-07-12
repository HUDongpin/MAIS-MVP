#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-owner-package-blocker-routing-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  matrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  routing: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  markdown: "coordination/release-intake/latest-A25-owner-package-blocker-routing.md"
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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

function expectedTopFiles(row) {
  return (row.typeCheck?.topFiles ?? []).map((topFile) => ({
    file: topFile.file,
    errors: topFile.errors ?? 0,
    inferredOwners: inferOwnerIds(topFile.file).map((ownerId) => ({
      ownerId,
      owner: ownerNames[ownerId] ?? ownerId
    }))
  }));
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package blocker routing gate");
    console.log(`Routing rows: ${payload.routingRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package blocker routing gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.matrix, paths.routing, paths.markdown]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, routingRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const matrix = readJson(paths.matrix);
  const routing = readJson(paths.routing);
  const matrixRows = matrix.rows ?? [];
  const blockedRows = matrixRows.filter((row) => row.readiness !== "ready");
  const routingRows = routing.rows ?? [];
  const routingById = new Map(routingRows.map((row) => [row.matrixId, row]));

  if (routing.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("routing dirty-map signature is stale");
  if (routing.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("routing expanded status count is stale");
  if (routing.sourceMatrixGeneratedAt !== matrix.generatedAt) failures.push("routing source matrix timestamp is stale");
  if (matrix.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("source matrix is stale relative to dirty map");

  if (routingRows.length !== blockedRows.length) failures.push(`routing row count mismatch: ${routingRows.length} rows, expected ${blockedRows.length}`);
  for (const matrixRow of blockedRows) {
    const row = routingById.get(matrixRow.matrixId);
    if (!row) {
      failures.push(`missing routing row: ${matrixRow.matrixId}`);
      continue;
    }
    if (row.cleanupAuthorized !== false) failures.push(`${matrixRow.matrixId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${matrixRow.matrixId}: executableNow must be false`);
    if (!Array.isArray(row.nextActions) || row.nextActions.length === 0) failures.push(`${matrixRow.matrixId}: missing next actions`);
    if (matrixRow.waveId === "wave-01-governance-release-hygiene") {
      if (row.wave01FrontierStatus !== matrixRow.wave01FrontierStatus) failures.push(`${matrixRow.matrixId}: Wave01 frontier status is stale`);
      if (row.wave01ArtifactCleanAuthorizedRows !== matrixRow.wave01ArtifactCleanAuthorizedRows) failures.push(`${matrixRow.matrixId}: Wave01 artifact-clean authorized rows are stale`);
      if (row.wave01HeldRows !== matrixRow.wave01HeldRows) failures.push(`${matrixRow.matrixId}: Wave01 held rows are stale`);
      if (row.wave01ValidExecutionInstructionRows !== matrixRow.wave01ValidExecutionInstructionRows) failures.push(`${matrixRow.matrixId}: Wave01 execution-instruction rows are stale`);
      if (!(row.nextActions ?? []).some((action) => action.includes("six A25 artifact-clean rows are owner-authorized"))) {
        failures.push(`${matrixRow.matrixId}: missing normalized Wave01 frontier next action`);
      }
      if ((row.nextActions ?? []).some((action) => action.includes("request exact owner approval for package-only resync"))) {
        failures.push(`${matrixRow.matrixId}: stale Wave01 broad owner-approval next action`);
      }
    }
    if (!sameJson(row.packageOwnerIds, ownerIdsFromNames(matrixRow.owners))) failures.push(`${matrixRow.matrixId}: package owners are stale`);
    if (!sameJson(row.failedCheckNames, matrixRow.failedCheckNames ?? [])) failures.push(`${matrixRow.matrixId}: failed checks are stale`);
    if (!sameJson(row.blockingReasons, matrixRow.blockingReasons ?? [])) failures.push(`${matrixRow.matrixId}: blocking reasons are stale`);
    if (!sameJson(row.typeCheckTopFiles, expectedTopFiles(matrixRow))) failures.push(`${matrixRow.matrixId}: type-check top-file routing is stale`);
    if (row.resyncRecommendationCount !== (matrixRow.packageResyncRecommendations ?? []).length) {
      failures.push(`${matrixRow.matrixId}: package resync recommendation count is stale`);
    }
    for (const route of row.ownerRoutes ?? []) {
      if (!route.ownerId || !ownerNames[route.ownerId]) failures.push(`${matrixRow.matrixId}: unknown owner route ${route.ownerId}`);
      if (!["package-owner", "cross-owner-blocker"].includes(route.routeKind)) {
        failures.push(`${matrixRow.matrixId}: invalid route kind ${route.routeKind}`);
      }
    }
  }

  for (const row of routingRows) {
    if (!blockedRows.some((matrixRow) => matrixRow.matrixId === row.matrixId)) failures.push(`unexpected routing row: ${row.matrixId}`);
    if ((row.nextActions ?? []).some((action) => action.includes("request exact owner approval for package-only resync"))) {
      failures.push(`${row.matrixId}: stale broad owner-approval next action`);
    }
  }

  if (routing.summary?.matrixRows !== (matrix.summary?.rows ?? 0)) failures.push("summary matrixRows is stale");
  if (routing.summary?.matrixReadyRows !== (matrix.summary?.readyRows ?? 0)) failures.push("summary matrixReadyRows is stale");
  if (routing.summary?.matrixBlockedRows !== (matrix.summary?.blockedRows ?? blockedRows.length)) failures.push("summary matrixBlockedRows is stale");
  if (routing.summary?.routingRows !== blockedRows.length) failures.push("summary routingRows is stale");
  if (routing.summary?.cleanupAuthorizedRows !== 0) failures.push("summary cleanupAuthorizedRows must be 0");
  if (routing.summary?.executableRows !== 0) failures.push("summary executableRows must be 0");

  const markdown = fs.readFileSync(path.join(root, paths.markdown), "utf8");
  if (markdown.includes("undefined")) failures.push("routing markdown contains undefined");
  if (!markdown.includes("This is blocker routing evidence only.")) failures.push("routing markdown missing non-authorization boundary");
  if (markdown.includes("7 package-only dirty entries need owner-approved package resync authorization")) {
    failures.push("routing markdown contains stale Wave01 broad authorization blocker");
  }
  if (markdown.includes("request exact owner approval for package-only resync")) {
    failures.push("routing markdown contains stale broad owner-approval next action");
  }
  if (!markdown.includes("six A25 artifact-clean rows are owner-authorized")) {
    failures.push("routing markdown missing normalized Wave01 frontier action");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    routingRows: routingRows.length,
    matrixBlockedRows: blockedRows.length,
    cleanupAuthorizedRows: routing.summary?.cleanupAuthorizedRows ?? null,
    executableRows: routing.summary?.executableRows ?? null,
    failures
  });
}

main();
