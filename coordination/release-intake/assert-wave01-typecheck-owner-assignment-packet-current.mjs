#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-typecheck-owner-assignment-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  handoff: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.json",
  packet: "coordination/release-intake/latest-A25-wave01-typecheck-owner-assignment-packet.json",
  markdown: "coordination/release-intake/latest-A25-wave01-typecheck-owner-assignment-packet.md"
};

const ownerProfiles = {
  A05: {
    role: "Lesson lead",
    allowedPrefixes: ["app/lesson/", "components/lesson/"],
    forbiddenScope: ["dashboard", "practice", "visualization lab", "AI route", "global config"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure"
  },
  A06: {
    role: "Visualization lead",
    allowedPrefixes: [
      "app/visualization-lab/",
      "app/student/tools/visualizations/",
      "components/visualizations/",
      "data/visualizationLabs.ts",
      "lib/math.ts"
    ],
    forbiddenScope: ["AI route", "provider state", "curriculum/content final signoff"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure"
  },
  A07: {
    role: "AI tutor/provider integration lead",
    allowedPrefixes: ["components/ai/", "app/api/ai-tutor/route.ts", ".env.local.example", "lib/server/llmProvider.ts"],
    forbiddenScope: ["real .env* secret files", "visualization logic", "analytics test logic", "feature UI outside AI tutor"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure"
  },
  A12: {
    role: "Backend/API platform lead",
    allowedPrefixes: ["app/api/", "lib/server/auth.ts", "lib/server/sessionCookie.ts", "backend API tests"],
    forbiddenScope: ["app/api/ai-tutor/", "app/api/adaptive-learning/", "feature UI pages", "real .env*", "LLM prompt/provider behavior without A07/A15 coordination"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-backend-api-closure"
  },
  A13: {
    role: "Teacher console lead",
    allowedPrefixes: ["app/teacher/", "components/teacher/", "coordination/session-logs/"],
    forbiddenScope: ["general API implementation", "parent/student UI", "AI Tutor", "adaptive engine", "shared types/i18n except coordinated copy-only edits"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure"
  },
  A20: {
    role: "Game design and game-based learning lead",
    allowedPrefixes: [
      "app/games/",
      "app/student/practice/games/",
      "components/games/",
      "lib/gameBasedLearning.ts",
      "lib/gameBasedLearning.test.ts",
      "data/gameBasedLearning.ts",
      "components/gamification/FishingGame.tsx",
      "components/gamification/AdventureIslandGame.tsx",
      "components/gamification/QuadraticBonusGame.tsx",
      "app/practice/fishing-game/",
      "app/practice/quadratic-bonus/"
    ],
    forbiddenScope: ["reward economy", "badges/streaks/leaderboards", "broad gamification storage/API", "curriculum correctness without A18", "question-bank edits without A04/A18"],
    recommendedWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure"
  }
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

function isAllowedFile(ownerId, file) {
  const profile = ownerProfiles[ownerId];
  if (!profile) return false;
  return profile.allowedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function expectedAssignment(handoff) {
  const profile = ownerProfiles[handoff.ownerId] ?? {
    role: handoff.owner,
    allowedPrefixes: [],
    forbiddenScope: ["unassigned owner scope"],
    recommendedWorktree: ""
  };
  const readTargets = handoff.files.map((file) => ({
    file: file.file,
    errors: file.errors,
    coOwners: file.coOwners ?? []
  }));
  const writeScope = readTargets.filter((file) => isAllowedFile(handoff.ownerId, file.file));
  const coordinationRequired = readTargets.filter((file) => !isAllowedFile(handoff.ownerId, file.file) || file.coOwners.length > 0);
  return {
    assignmentId: `wave01-typecheck-${handoff.ownerId.toLowerCase()}`,
    agentId: handoff.ownerId,
    owner: handoff.owner,
    role: profile.role,
    objective: `Resolve or formally block the Wave 01 type-check blockers routed to ${handoff.ownerId} without widening the A25/A10/A22 governance package.`,
    recommendedWorktree: profile.recommendedWorktree,
    readScope: readTargets,
    writeScope: writeScope.map((file) => file.file),
    coordinationRequired: coordinationRequired.map((file) => ({
      file: file.file,
      reason: file.coOwners.length > 0
        ? `co-owned with ${file.coOwners.map((owner) => owner.ownerId).join(", ")}`
        : "outside this owner's AGENTS.md write scope"
    })),
    forbiddenScope: profile.forbiddenScope,
    acceptanceCriteria: [
      "Every listed file is either fixed inside the owner's allowed write scope or covered by an owner-routed blocker report.",
      "No runtime/source file outside the listed write scope is edited without explicit owner expansion.",
      "No dirty-root deploy, broad staging, or physical cleanup is performed.",
      "Suggested checks are rerun, or failures are recorded with exact owning-agent blockers.",
      "A25 can rerun Wave 01 governance readiness and the aggregate currentness gate after the owner session hands off."
    ],
    checks: [
      ...handoff.suggestedChecks,
      "node coordination/release-intake/generate-wave01-governance-readiness.mjs",
      "node coordination/release-intake/assert-wave01-governance-readiness-current.mjs",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
    ],
    stopConditions: [
      ...handoff.stopConditions,
      "Stop if the fix requires adding/removing package dependencies without A10/A22 approval.",
      "Stop if the fix requires shared type/schema changes without A08 coordination.",
      "Stop if the assignment needs owner-approved Git operations; A25 evidence alone is not authorization."
    ],
    dirtyStateFinalAction: "pending owner reviewed commit, owner-routed blocker, or exact owner-approved final state",
    worktreeLifecycleAction: "retain isolated worktree until owner handoff is reviewed",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function expectedAssignments(handoff) {
  return (handoff.handoffs ?? []).map(expectedAssignment);
}

function expectedSummary(assignments) {
  return {
    assignments: assignments.length,
    readScopeFiles: assignments.reduce((sum, assignment) => sum + assignment.readScope.length, 0),
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
    console.log("A25 Wave 01 type-check owner assignment packet gate");
    console.log(`Assignments: ${payload.assignments ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 type-check owner assignment packet gate failed.");
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
  const handoff = readJson(paths.handoff);
  const packet = readJson(paths.packet);
  const assignments = expectedAssignments(handoff);
  const summary = expectedSummary(assignments);

  if (handoff.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("source handoff is stale relative to dirty map");
  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded dirty entry count is stale");
  if (packet.sourceHandoffGeneratedAt !== handoff.generatedAt) failures.push("packet source handoff timestamp is stale");
  if (packet.cleanupAuthorized !== false) failures.push("packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("packet executableNow must be false");
  if (!sameJson(packet.sourceHandoffSummary, handoff.summary)) failures.push("packet source handoff summary is stale");
  if (!sameJson(packet.assignments, assignments)) failures.push("packet assignments are stale");
  if (!sameJson(packet.summary, summary)) failures.push("packet summary is stale");
  if (packet.summary?.cleanupAuthorizedRows !== 0) failures.push("packet summary cleanupAuthorizedRows must be 0");
  if (packet.summary?.executableRows !== 0) failures.push("packet summary executableRows must be 0");

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
    readScopeFiles: summary.readScopeFiles,
    writeScopeFiles: summary.writeScopeFiles,
    coordinationRequiredFiles: summary.coordinationRequiredFiles,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
