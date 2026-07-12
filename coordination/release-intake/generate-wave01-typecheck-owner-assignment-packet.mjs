#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  handoff: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-typecheck-owner-assignment-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-typecheck-owner-assignment-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-typecheck-owner-assignment-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-typecheck-owner-assignment-packet.md`
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

function isAllowedFile(ownerId, file) {
  const profile = ownerProfiles[ownerId];
  if (!profile) return false;
  return profile.allowedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function assignmentFromHandoff(handoff) {
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

function markdown(payload) {
  const overviewRows = payload.assignments.map((assignment) => (
    `| ${assignment.agentId} | ${assignment.role} | ${assignment.readScope.length} | ${assignment.writeScope.length} | ${assignment.coordinationRequired.length} | ${assignment.cleanupAuthorized ? "yes" : "no"} | ${assignment.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | none | 0 | 0 | 0 | no | no |";

  const details = payload.assignments.map((assignment) => `## ${assignment.agentId} ${assignment.role}

- Objective: ${assignment.objective}
- Recommended worktree: \`${assignment.recommendedWorktree || "owner-approved clean worktree required"}\`
- Read scope:
${assignment.readScope.map((file) => `  - \`${file.file}\` (${file.errors} errors)${file.coOwners.length ? `; co-owners: ${file.coOwners.map((owner) => owner.ownerId).join(", ")}` : ""}`).join("\n")}
- Write scope candidates:
${assignment.writeScope.length ? assignment.writeScope.map((file) => `  - \`${file}\``).join("\n") : "  - none until owner scope is expanded"}
- Coordination required:
${assignment.coordinationRequired.length ? assignment.coordinationRequired.map((item) => `  - \`${item.file}\`: ${item.reason}`).join("\n") : "  - none"}
- Forbidden scope:
${assignment.forbiddenScope.map((item) => `  - ${item}`).join("\n")}
- Acceptance criteria:
${assignment.acceptanceCriteria.map((item) => `  - ${item}`).join("\n")}
- Checks:
${assignment.checks.map((check) => `  - \`${check}\``).join("\n")}
- Stop conditions:
${assignment.stopConditions.map((item) => `  - ${item}`).join("\n")}
`).join("\n");

  return `# A25 Wave 01 Type-Check Owner Assignment Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source handoff generated: ${payload.sourceHandoffGeneratedAt}

This is assignment evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, feature fixes, or any physical cleanup.

## Summary

- Assignments: ${payload.summary.assignments}
- Read-scope files: ${payload.summary.readScopeFiles}
- Write-scope candidates: ${payload.summary.writeScopeFiles}
- Coordination-required file links: ${payload.summary.coordinationRequiredFiles}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

| Agent | Role | Read files | Write candidates | Coordination required | Cleanup authorized | Executable |
| --- | --- | ---: | ---: | ---: | --- | --- |
${overviewRows}

${details}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const handoff = readJson(paths.handoff);
  if (handoff.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 type-check owner handoff packet is stale relative to dirty map.");
  }
  if (handoff.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 type-check owner handoff packet dirty entry count is stale.");
  }

  const assignments = (handoff.handoffs ?? []).map(assignmentFromHandoff);
  const summary = {
    assignments: assignments.length,
    readScopeFiles: assignments.reduce((sum, assignment) => sum + assignment.readScope.length, 0),
    writeScopeFiles: assignments.reduce((sum, assignment) => sum + assignment.writeScope.length, 0),
    coordinationRequiredFiles: assignments.reduce((sum, assignment) => sum + assignment.coordinationRequired.length, 0),
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceHandoffGeneratedAt: handoff.generatedAt,
    sourceHandoffSummary: handoff.summary,
    assignments,
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
    assignments: summary.assignments,
    readScopeFiles: summary.readScopeFiles,
    writeScopeFiles: summary.writeScopeFiles,
    coordinationRequiredFiles: summary.coordinationRequiredFiles,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
