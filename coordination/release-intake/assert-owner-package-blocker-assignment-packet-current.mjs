#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-package-blocker-assignment-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  routing: "coordination/release-intake/latest-A25-owner-package-blocker-routing.json",
  packet: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  markdown: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.md"
};

const ownerProfiles = {
  A01: { role: "App shell lead", allowedPrefixes: ["app/layout.tsx", "app/page.tsx", "components/layout/", "components/home/", "components/background/", "components/ui/ThemeToggle.tsx", "components/ui/LanguageToggle.tsx"], forbiddenScope: ["API routes", "analytics logic", "practice", "visualizations", "data files except with approval"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure" },
  A02: { role: "Dashboard lead", allowedPrefixes: ["app/dashboard/", "app/progress/", "components/dashboard/", "components/cards/", "data/progress.ts", "data/learningAnalytics.ts"], forbiddenScope: ["lib/learningAnalytics.ts", "test files", "AI route", "global config"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-dashboard-closure" },
  A03: { role: "Curriculum roadmap lead", allowedPrefixes: ["app/learning-path/", "app/secondary-roadmap/", "components/learning/", "components/visualizations/RoadmapVisualizationSuite.tsx", "data/grades.ts", "data/topics.ts"], forbiddenScope: ["practice question bank", "AI route", "shared provider state", "global config"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure" },
  A04: { role: "Practice lead", allowedPrefixes: ["app/practice/", "app/mistake-book/", "components/practice/", "data/questions.ts"], forbiddenScope: ["roadmap data", "visualization modules", "AI route", "global config"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure" },
  A05: { role: "Lesson lead", allowedPrefixes: ["app/lesson/", "data/lessons.ts", "components/lesson/"], forbiddenScope: ["dashboard", "practice", "visualization lab", "AI route", "global config"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure" },
  A06: { role: "Visualization lead", allowedPrefixes: ["app/visualization-lab/", "app/student/tools/visualizations/", "components/visualizations/", "data/visualizationLabs.ts", "lib/math.ts"], forbiddenScope: ["RoadmapVisualizationSuite.tsx unless coordinated with A03", "AI route", "provider state", "curriculum/content final signoff without A18"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure" },
  A07: { role: "AI tutor/provider integration lead", allowedPrefixes: ["components/ai/", "app/api/ai-tutor/", ".env.local.example", "lib/server/llmProvider.ts"], forbiddenScope: ["real .env* secret files", "visualization logic", "analytics test logic", "global config unless approved"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure" },
  A08: { role: "State and analytics lead", allowedPrefixes: ["components/providers/AppProviders.tsx", "lib/learningAnalytics.ts", "lib/learningAnalytics.test.ts", "lib/utils.ts", "types/index.ts", "lib/difficulty.ts", "lib/difficulty.test.ts"], forbiddenScope: ["UI page rewrites outside direct integration needs", "AI route", "package/config files"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-shared-contract-closure" },
  A09: { role: "Copy, i18n, accessibility lead", allowedPrefixes: ["lib/i18n.ts"], forbiddenScope: ["business logic", "route rewrites", "package/config files", "real env files"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-accessibility-closure" },
  A10: { role: "Tooling, docs, report lead", allowedPrefixes: ["README.md", "AGENTS.md", ".gitignore", "package.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "app/globals.css", "coordination/"], forbiddenScope: ["feature implementation inside other sessions' scopes unless assigned"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-tooling-docs-closure" },
  A11: { role: "QA and release quality lead", allowedPrefixes: ["tests/e2e/", "coordination/reports/", "coordination/release-intake/", "lib/mvpReadiness.test.ts"], forbiddenScope: ["feature implementation in app/components/lib/data unless explicitly assigned", "real production write tests without approval"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure" },
  A12: { role: "Backend/API platform lead", allowedPrefixes: ["app/api/", "lib/server/auth.ts", "lib/server/sessionCookie.ts", "lib/server/userStore.ts"], forbiddenScope: ["app/api/ai-tutor/", "app/api/adaptive-learning/", "feature UI pages", "real .env*", "LLM prompt/provider behavior without A07/A15 coordination"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure" },
  A13: { role: "Teacher console lead", allowedPrefixes: ["app/teacher/", "components/teacher/", "coordination/session-logs/"], forbiddenScope: ["general API implementation", "parent/student UI", "AI Tutor", "adaptive engine", "shared types/i18n except coordinated copy-only edits"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure" },
  A14: { role: "Parent console lead", allowedPrefixes: ["app/parent/", "components/parent/", "coordination/session-logs/"], forbiddenScope: ["teacher/student UI", "general API implementation", "shared i18n decisions without A09", "auth/session internals"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A14-parent-console-closure" },
  A15: { role: "Adaptive engine lead", allowedPrefixes: ["lib/adaptiveLearning.ts", "lib/adaptiveLearning.test.ts", "app/api/adaptive-learning/"], forbiddenScope: ["AI Tutor chat API", "global LLM provider changes without A07", "dashboard/practice/lesson layout rewrites", "shared types without A08 coordination"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure" },
  A16: { role: "Research and learning science lead", allowedPrefixes: ["coordination/reports/", "coordination/research/"], forbiddenScope: ["feature code unless explicitly assigned", "real student data analysis without approval", "unverified latest-research claims"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-closure" },
  A17: { role: "Gamification and motivation lead", allowedPrefixes: ["lib/gamification.ts", "lib/gamification.test.ts", "data/gamification.ts", "components/gamification/"], forbiddenScope: ["actual game loops", "game-specific routes without A20 coordination", "adaptive behavior without A15", "backend storage without A12", "curriculum/content correctness decisions"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure" },
  A18: { role: "Curriculum QA and content quality lead", allowedPrefixes: ["coordination/content-qa/"], forbiddenScope: ["content generation pipeline ownership", "large direct edits to question/topic/lesson source files without assignment", "adaptive implementation", "practice/lesson UI rewrites"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure" },
  A19: { role: "API configuration and deployment env lead", allowedPrefixes: [".env.local.example", "coordination/"], forbiddenScope: ["API/provider business logic", "app/api/", "lib/server/llmProvider.ts", "feature UI", "real secret values"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-api-env-closure" },
  A20: { role: "Game design and game-based learning lead", allowedPrefixes: ["app/games/", "app/student/practice/games/", "components/games/", "lib/gameBasedLearning.ts", "lib/gameBasedLearning.test.ts", "data/gameBasedLearning.ts", "components/gamification/FishingGame.tsx", "components/gamification/AdventureIslandGame.tsx", "components/gamification/QuadraticBonusGame.tsx", "app/practice/fishing-game/", "app/practice/quadratic-bonus/"], forbiddenScope: ["reward economy", "badges/streaks/leaderboards", "broad gamification storage/API", "curriculum correctness without A18", "question-bank edits without A04/A18"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure" },
  A21: { role: "Content pipeline and RAG operations lead", allowedPrefixes: ["coordination/content-qa/", "data/generated-content/", "public/question-illustrations/", ".local/rag/"], forbiddenScope: ["final curriculum signoff", "live question/topic/lesson source edits without assignment", "app UI/routes", "provider/API behavior", "real .env*"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A21-content-pipeline-closure" },
  A22: { role: "Production reliability and release engineering lead", allowedPrefixes: ["playwright.config.ts", ".vercelignore", "coordination/reports/", "coordination/release-intake/"], forbiddenScope: ["feature bug fixes unless explicitly assigned", "test assertion ownership without A11", "API/provider business logic", "real .env*", "package upgrades without A10/owner approval"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-release-engineering-closure" },
  A23: { role: "Integration and promotion lead", allowedPrefixes: ["coordination/integration/", "coordination/reports/"], forbiddenScope: ["direct live source edits without explicit assignment", "final curriculum QA signoff", "regression ownership"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A23-integration-closure" },
  A24: { role: "Illustration exact-layer lead", allowedPrefixes: ["coordination/content-qa/", "public/question-illustrations/"], forbiddenScope: ["bitmap image generation", "final curriculum/source-distance approval", "live lesson/question integration", "unrelated UI routes/components"], recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A24-exact-layer-closure" },
  A25: { role: "Git hygiene and release intake lead", allowedPrefixes: ["coordination/release-intake/", "coordination/reports/", "coordination/session-logs/"], forbiddenScope: ["staging", "committing", "branching", "merging", "rebasing", "pushing", "deleting", "resetting", "reverting", "feature code edits", "secrets"], recommendedWorktree: "/Users/dongpinhu/Desktop/MAIS-MVP" }
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function worktreeExists(worktreePath) {
  if (!worktreePath || worktreePath === "owner-approved clean worktree required") return true;
  try {
    git(["-C", worktreePath, "rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function isAllowedFile(ownerId, file) {
  const profile = ownerProfiles[ownerId];
  if (!profile) return false;
  if (ownerId === "A12" && (file.startsWith("app/api/ai-tutor/") || file.startsWith("app/api/adaptive-learning/"))) return false;
  return profile.allowedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function fileEntriesForOwner(routing, ownerId) {
  const entries = [];
  for (const row of routing.rows ?? []) {
    for (const route of row.ownerRoutes ?? []) {
      if (route.ownerId !== ownerId) continue;
      for (const file of route.files ?? []) {
        entries.push({
          file: file.file,
          errors: file.errors ?? 0,
          routeKind: route.routeKind,
          matrixId: row.matrixId,
          waveId: row.waveId,
          packageId: row.packageId,
          packageName: row.packageName,
          packageOwnerIds: row.packageOwnerIds ?? []
        });
      }
    }
  }
  return entries.sort((left, right) => left.file.localeCompare(right.file) || left.matrixId.localeCompare(right.matrixId));
}

function packageEntriesForOwner(routing, ownerId) {
  return (routing.rows ?? [])
    .filter((row) => (row.ownerRoutes ?? []).some((route) => route.ownerId === ownerId))
    .map((row) => ({
      matrixId: row.matrixId,
      waveId: row.waveId,
      packageId: row.packageId,
      packageName: row.packageName,
      packageOwnerIds: row.packageOwnerIds ?? [],
      blockingReasons: row.blockingReasons ?? [],
      failedCheckNames: row.failedCheckNames ?? [],
      failedChecks: row.failedChecks ?? [],
      nextActions: row.nextActions ?? []
    }));
}

function expectedAssignment(routing, ownerSummary) {
  const ownerId = ownerSummary.ownerId;
  const profile = ownerProfiles[ownerId] ?? { role: ownerSummary.owner, allowedPrefixes: [], forbiddenScope: ["unassigned owner scope"], recommendedWorktree: "owner-approved clean worktree required" };
  const readScope = fileEntriesForOwner(routing, ownerId);
  const uniqueReadFiles = uniqueBy(readScope, (entry) => entry.file);
  const writeScope = uniqueReadFiles.filter((entry) => isAllowedFile(ownerId, entry.file)).map((entry) => entry.file);
  const coordinationRequired = uniqueReadFiles
    .filter((entry) => !isAllowedFile(ownerId, entry.file) || entry.routeKind === "cross-owner-blocker")
    .map((entry) => ({
      file: entry.file,
      reason: !isAllowedFile(ownerId, entry.file)
        ? "outside this owner's AGENTS.md write scope"
        : "cross-owner blocker; coordinate with package owner before editing"
    }));
  const packageRows = packageEntriesForOwner(routing, ownerId);
  const checks = uniqueBy(packageRows.flatMap((row) => row.failedChecks), (check) => `${check.name}:${check.command ?? ""}`)
    .map((check) => check.command ? `${check.command}` : check.name);

  return {
    assignmentId: `owner-package-blocker-${ownerId.toLowerCase()}`,
    agentId: ownerId,
    owner: ownerSummary.owner,
    role: profile.role,
    objective: `Resolve or formally block the owner-package blockers routed to ${ownerId} without widening beyond AGENTS.md owner scope.`,
    recommendedWorktree: profile.recommendedWorktree,
    packageRows,
    readScope,
    uniqueReadFiles: uniqueReadFiles.map((entry) => entry.file),
    writeScope,
    coordinationRequired,
    forbiddenScope: profile.forbiddenScope,
    acceptanceCriteria: [
      "Every routed package row is either fixed inside this owner's allowed write scope or covered by an owner-routed blocker report.",
      "Files outside this owner's AGENTS.md write scope stay read-only unless the owner explicitly expands scope.",
      "Cross-owner files are coordinated with the package owner before edits.",
      "No dirty-root deploy, broad staging, physical cleanup, branch deletion, reset, clean, restore, or worktree removal is performed.",
      "A25 can rerun owner-package readiness, blocker routing, assignment packet currentness, and aggregate currentness after handoff."
    ],
    checks: [
      ...checks,
      "node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs",
      "node coordination/release-intake/assert-owner-package-blocker-routing-current.mjs",
      "node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
    ],
    stopConditions: [
      "Stop if the fix requires adding/removing package dependencies without A10/A22 approval.",
      "Stop if the fix requires shared type/schema changes without A08 coordination.",
      "Stop if a routed file is outside this owner's write scope and no explicit scope expansion exists.",
      "Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization.",
      "Stop if the work would expose or edit real secrets."
    ],
    dirtyStateFinalAction: "pending owner reviewed commit, owner-routed blocker, evidence archive, or exact owner-approved final state",
    worktreeLifecycleAction: "retain isolated worktree until owner handoff is reviewed",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function expectedAssignments(routing) {
  return (routing.summary?.topRoutingOwners ?? []).map((ownerSummary) => expectedAssignment(routing, ownerSummary));
}

function expectedSummary(assignments, routing) {
  return {
    assignments: assignments.length,
    sourceRoutingRows: routing.summary?.routingRows ?? (routing.rows ?? []).length,
    sourceMatrixBlockedRows: routing.summary?.matrixBlockedRows ?? 0,
    packageRowLinks: assignments.reduce((sum, assignment) => sum + assignment.packageRows.length, 0),
    readScopeFileLinks: assignments.reduce((sum, assignment) => sum + assignment.readScope.length, 0),
    uniqueReadFiles: new Set(assignments.flatMap((assignment) => assignment.uniqueReadFiles)).size,
    writeScopeFiles: assignments.reduce((sum, assignment) => sum + assignment.writeScope.length, 0),
    coordinationRequiredFiles: assignments.reduce((sum, assignment) => sum + assignment.coordinationRequired.length, 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package blocker assignment packet gate");
    console.log(`Assignments: ${payload.assignments ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package blocker assignment packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, assignments: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const routing = readJson(paths.routing);
  const packet = readJson(paths.packet);
  const assignments = expectedAssignments(routing);
  const summary = expectedSummary(assignments, routing);

  if (routing.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("source routing is stale relative to dirty map");
  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded dirty entry count is stale");
  if (packet.sourceRoutingGeneratedAt !== routing.generatedAt) failures.push("packet source routing timestamp is stale");
  if (packet.cleanupAuthorized !== false) failures.push("packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("packet executableNow must be false");
  if (!sameJson(packet.sourceRoutingSummary, routing.summary)) failures.push("packet source routing summary is stale");
  if (!sameJson(packet.assignments, assignments)) failures.push("packet assignments are stale");
  if (!sameJson(packet.summary, summary)) failures.push("packet summary is stale");
  if (packet.summary?.cleanupAuthorizedRows !== 0) failures.push("packet summary cleanupAuthorizedRows must be 0");
  if (packet.summary?.executableRows !== 0) failures.push("packet summary executableRows must be 0");
  for (const assignment of assignments) {
    if (!worktreeExists(assignment.recommendedWorktree)) {
      failures.push(`${assignment.agentId}: recommended worktree does not exist: ${assignment.recommendedWorktree}`);
    }
  }

  const markdown = readText(paths.markdown);
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes("This is assignment evidence only.")) failures.push("packet markdown missing non-authorization boundary");
  if (!markdown.includes("Acceptance criteria")) failures.push("packet markdown missing acceptance criteria");
  if (!markdown.includes("Coordination required")) failures.push("packet markdown missing coordination-required section");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    assignments: assignments.length,
    sourceRoutingRows: summary.sourceRoutingRows,
    packageRowLinks: summary.packageRowLinks,
    readScopeFileLinks: summary.readScopeFileLinks,
    uniqueReadFiles: summary.uniqueReadFiles,
    writeScopeFiles: summary.writeScopeFiles,
    coordinationRequiredFiles: summary.coordinationRequiredFiles,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
