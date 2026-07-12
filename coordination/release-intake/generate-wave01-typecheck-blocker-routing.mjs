#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-typecheck-blocker-routing.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-typecheck-blocker-routing.md`
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
  return [...new Set(values.filter(Boolean))];
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

function routeTopFiles(topFiles) {
  return topFiles.map((topFile) => {
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

function summarizeOwners(routeRows) {
  const ownerCounts = new Map();
  for (const row of routeRows) {
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

function markdown(payload) {
  const ownerRows = payload.ownerRoutes.map((route) => (
    `| ${route.ownerId} | ${route.owner} | ${route.routeKind} | ${route.files} | ${route.errors} |`
  )).join("\n") || "| none | none | n/a | 0 | 0 |";

  const fileRows = payload.typeCheckTopFiles.map((row) => (
    `| \`${row.file}\` | ${row.errors} | ${row.inferredOwners.map((owner) => `${owner.ownerId} ${owner.routeKind}`).join(", ")} |`
  )).join("\n") || "| none | 0 | none |";

  return `# A25 Wave 01 Type-Check Blocker Routing

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Wave 01 readiness generated: ${payload.wave01ReadinessGeneratedAt}

This is blocker routing evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Type-check passed: ${payload.typeCheck.passed ? "yes" : "no"}
- Type-check errors: ${payload.typeCheck.errorLines}
- Top files routed: ${payload.summary.topFilesRouted}
- Cross-owner blocker files: ${payload.summary.crossOwnerFiles}
- Wave 01 owner files: ${payload.summary.wave01OwnerFiles}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Routes

| Owner ID | Owner | Route kind | Files | Errors |
| --- | --- | --- | ---: | ---: |
${ownerRows}

## Top File Routes

| File | Errors | Inferred owners |
| --- | ---: | --- |
${fileRows}

## Required Next Actions

- A25/A10/A22 must keep Wave 01 non-commit-ready while these off-scope type-check blockers remain.
- A25 must route the listed cross-owner files to their owning sessions instead of folding runtime fixes into the governance package.
- After the owning sessions resolve or explicitly block their rows, rerun \`node coordination/release-intake/generate-wave01-governance-readiness.mjs\` and the A25 aggregate currentness gate.
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const readiness = readJson(paths.readiness);
  if (readiness.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 readiness is stale relative to dirty map.");
  }
  if (readiness.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 readiness dirty entry count is stale.");
  }

  const typeCheckTopFiles = routeTopFiles(readiness.typeCheck?.summary?.topFiles ?? []);
  const ownerRoutes = summarizeOwners(typeCheckTopFiles);
  const summary = {
    topFilesRouted: typeCheckTopFiles.length,
    ownerRoutes: ownerRoutes.length,
    crossOwnerFiles: typeCheckTopFiles.filter((row) => row.inferredOwners.some((owner) => owner.routeKind === "cross-owner-blocker")).length,
    wave01OwnerFiles: typeCheckTopFiles.filter((row) => row.inferredOwners.some((owner) => owner.routeKind === "wave-01-owner")).length,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    wave01ReadinessGeneratedAt: readiness.generatedAt,
    wave01CommitReady: readiness.commitReady,
    wave01BlockingReasons: readiness.blockingReasons ?? [],
    typeCheck: {
      passed: readiness.typeCheck?.passed ?? false,
      status: readiness.typeCheck?.status ?? null,
      errorLines: readiness.typeCheck?.summary?.errorLines ?? 0,
      byTop: readiness.typeCheck?.summary?.byTop ?? {},
      firstErrors: readiness.typeCheck?.summary?.firstErrors ?? []
    },
    wave01Owners: wave01OwnerIds.map((ownerId) => ({ ownerId, owner: ownerNames[ownerId] })),
    ownerRoutes,
    typeCheckTopFiles,
    cleanupAuthorized: false,
    executableNow: false,
    summary
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
    topFilesRouted: summary.topFilesRouted,
    ownerRoutes: summary.ownerRoutes,
    crossOwnerFiles: summary.crossOwnerFiles,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
