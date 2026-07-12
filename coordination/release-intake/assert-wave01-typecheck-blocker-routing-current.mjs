#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-typecheck-blocker-routing-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  routing: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.json",
  routingMarkdown: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.md"
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

const wave01OwnerIds = ["A25", "A10", "A22"];

const pathOwnerRules = [
  { ownerIds: ["A13", "A12", "A07"], prefixes: ["lib/server/teacherReviewLessonLLM.ts"] },
  { ownerIds: ["A13"], prefixes: ["components/teacher/", "app/teacher/", "lib/teacher"] },
  { ownerIds: ["A12", "A13"], prefixes: ["app/api/teacher/"] },
  { ownerIds: ["A06"], prefixes: ["components/visualizations/", "app/visualization-lab/", "app/student/tools/visualizations/", "data/visualizationLabs.ts", "lib/math.ts"] },
  { ownerIds: ["A20"], prefixes: ["components/games/", "app/games/", "app/student/practice/games/", "lib/gameBasedLearning", "data/gameBasedLearning"] },
  { ownerIds: ["A17"], prefixes: ["components/gamification/", "lib/gamification", "data/gamification", "app/api/gamification/"] },
  { ownerIds: ["A05"], prefixes: ["components/lesson/", "app/lesson/"] },
  { ownerIds: ["A04", "A18"], prefixes: ["data/questions.ts", "app/practice/", "components/practice/"] },
  { ownerIds: ["A03", "A18"], prefixes: ["data/topics.ts", "data/grades.ts", "app/learning-path/", "app/secondary-roadmap/"] },
  { ownerIds: ["A15"], prefixes: ["lib/adaptiveLearning", "app/api/adaptive-learning/"] },
  { ownerIds: ["A02"], prefixes: ["components/dashboard/", "components/cards/", "app/dashboard/", "app/progress/", "data/progress.ts", "data/learningAnalytics.ts"] },
  { ownerIds: ["A07"], prefixes: ["components/ai/", "app/api/ai-tutor/", "lib/server/llmProvider.ts"] },
  { ownerIds: ["A12"], prefixes: ["lib/server/userStore.ts", "lib/server/auth.ts", "lib/server/sessionCookie.ts", "app/api/"] },
  { ownerIds: ["A08"], prefixes: ["components/providers/AppProviders.tsx", "lib/learningAnalytics", "lib/difficulty", "lib/utils.ts", "types/index.ts"] },
  { ownerIds: ["A11"], prefixes: ["tests/e2e/", "lib/mvpReadiness.test.ts"] },
  { ownerIds: ["A09"], prefixes: ["lib/i18n.ts"] },
  { ownerIds: ["A25"], prefixes: ["coordination/release-intake/"] },
  { ownerIds: ["A10"], prefixes: ["coordination/", "README.md", "AGENTS.md", ".gitignore", "package.json", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "app/globals.css"] },
  { ownerIds: ["A22"], prefixes: [".vercelignore", "playwright.config.ts", "scripts/release-", "scripts/deploy-vercel", "scripts/cleanup-generated-artifacts"] },
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

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function inferOwnerIds(file) {
  const normalized = String(file ?? "");
  const matched = pathOwnerRules
    .filter((rule) => rule.prefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix)))
    .flatMap((rule) => rule.ownerIds);
  return unique(matched.length > 0 ? matched : ["A25"]);
}

function routeKind(ownerId) {
  return wave01OwnerIds.includes(ownerId) ? "wave-01-owner" : "cross-owner-blocker";
}

function expectedTopFiles(readiness) {
  return (readiness.typeCheck?.summary?.topFiles ?? []).map((topFile) => {
    const ownerIds = inferOwnerIds(topFile.file);
    return {
      file: topFile.file,
      errors: topFile.errors ?? 0,
      inferredOwners: ownerIds.map((ownerId) => ({
        ownerId,
        owner: ownerNames[ownerId] ?? ownerId,
        routeKind: routeKind(ownerId)
      }))
    };
  });
}

function expectedOwnerRoutes(topFiles) {
  const ownerCounts = new Map();
  for (const row of topFiles) {
    for (const owner of row.inferredOwners) {
      const current = ownerCounts.get(owner.ownerId) ?? {
        ownerId: owner.ownerId,
        owner: owner.owner,
        routeKind: owner.routeKind,
        files: 0,
        errors: 0
      };
      current.files += 1;
      current.errors += row.errors;
      ownerCounts.set(owner.ownerId, current);
    }
  }
  return [...ownerCounts.values()].sort((left, right) => right.errors - left.errors || left.ownerId.localeCompare(right.ownerId));
}

function expectedSummary(topFiles, ownerRoutes) {
  return {
    topFilesRouted: topFiles.length,
    ownerRoutes: ownerRoutes.length,
    crossOwnerFiles: topFiles.filter((row) => row.inferredOwners.some((owner) => owner.routeKind === "cross-owner-blocker")).length,
    wave01OwnerFiles: topFiles.filter((row) => row.inferredOwners.some((owner) => owner.routeKind === "wave-01-owner")).length,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, topFilesRouted: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const readiness = readJson(paths.readiness);
  const routing = readJson(paths.routing);
  const topFiles = expectedTopFiles(readiness);
  const ownerRoutes = expectedOwnerRoutes(topFiles);
  const summary = expectedSummary(topFiles, ownerRoutes);

  if (routing.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("routing dirty-map signature is stale");
  if (routing.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("routing expanded dirty entry count is stale");
  if (routing.wave01ReadinessGeneratedAt !== readiness.generatedAt) failures.push("routing Wave 01 readiness timestamp is stale");
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("Wave 01 readiness is stale relative to dirty map");
  if (routing.cleanupAuthorized !== false) failures.push("routing cleanupAuthorized must be false");
  if (routing.executableNow !== false) failures.push("routing executableNow must be false");
  if (!sameJson(routing.wave01Owners, wave01OwnerIds.map((ownerId) => ({ ownerId, owner: ownerNames[ownerId] })))) {
    failures.push("routing Wave 01 owners are stale");
  }
  if (!sameJson(routing.typeCheckTopFiles, topFiles)) failures.push("routing type-check top files are stale");
  if (!sameJson(routing.ownerRoutes, ownerRoutes)) failures.push("routing owner routes are stale");
  if (!sameJson(routing.summary, summary)) failures.push("routing summary is stale");
  if (routing.summary?.cleanupAuthorizedRows !== 0) failures.push("routing summary cleanupAuthorizedRows must be 0");
  if (routing.summary?.executableRows !== 0) failures.push("routing summary executableRows must be 0");
  if (routing.typeCheck?.errorLines !== (readiness.typeCheck?.summary?.errorLines ?? 0)) failures.push("routing type-check error count is stale");
  if (routing.typeCheck?.passed !== (readiness.typeCheck?.passed ?? false)) failures.push("routing type-check pass state is stale");

  const markdown = readText(paths.routingMarkdown);
  if (markdown.includes("undefined")) failures.push("routing markdown contains undefined");
  if (!markdown.includes("This is blocker routing evidence only.")) failures.push("routing markdown missing non-authorization boundary");
  if (!markdown.includes("Required Next Actions")) failures.push("routing markdown missing next actions");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    topFilesRouted: topFiles.length,
    ownerRoutes: ownerRoutes.length,
    crossOwnerFiles: summary.crossOwnerFiles,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 01 type-check blocker routing gate");
    console.log(`Top files routed: ${payload.topFilesRouted ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 type-check blocker routing gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
