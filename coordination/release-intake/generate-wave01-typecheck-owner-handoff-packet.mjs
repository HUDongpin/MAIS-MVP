#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  routing: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-typecheck-owner-handoff-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-typecheck-owner-handoff-packet.md`
};

const ownerCheckHints = {
  A05: [
    "npm run type-check -- --pretty false",
    "manual lesson page smoke for affected lesson/textbook routes"
  ],
  A06: [
    "npm run type-check -- --pretty false",
    "node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts",
    "npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome"
  ],
  A07: [
    "npm run type-check -- --pretty false",
    "coordinate any LLM provider behavior change with A07-owned provider contracts"
  ],
  A12: [
    "npm run type-check -- --pretty false",
    "npx playwright test tests/e2e/backend-api.spec.ts --project=desktop-chrome"
  ],
  A13: [
    "npm run type-check -- --pretty false",
    "npx playwright test tests/e2e/teacher-workspace.spec.ts --project=desktop-chrome"
  ],
  A20: [
    "npm run type-check -- --pretty false",
    "npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome"
  ],
  A25: [
    "node coordination/release-intake/generate-wave01-typecheck-blocker-routing.mjs",
    "node coordination/release-intake/assert-wave01-typecheck-blocker-routing-current.mjs"
  ]
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

function filesForOwner(routing, ownerId) {
  return (routing.typeCheckTopFiles ?? [])
    .filter((row) => (row.inferredOwners ?? []).some((owner) => owner.ownerId === ownerId))
    .map((row) => ({
      file: row.file,
      errors: row.errors ?? 0,
      routeKind: row.inferredOwners.find((owner) => owner.ownerId === ownerId)?.routeKind ?? "cross-owner-blocker",
      coOwners: row.inferredOwners
        .filter((owner) => owner.ownerId !== ownerId)
        .map((owner) => ({ ownerId: owner.ownerId, owner: owner.owner, routeKind: owner.routeKind }))
    }))
    .sort((left, right) => right.errors - left.errors || left.file.localeCompare(right.file));
}

function handoffRows(routing) {
  return (routing.ownerRoutes ?? []).map((route) => {
    const files = filesForOwner(routing, route.ownerId);
    return {
      ownerId: route.ownerId,
      owner: route.owner,
      routeKind: route.routeKind,
      fileCount: files.length,
      errorLinks: files.reduce((sum, file) => sum + file.errors, 0),
      files,
      suggestedChecks: ownerCheckHints[route.ownerId] ?? ["npm run type-check -- --pretty false"],
      nextActions: nextActions(route, files),
      stopConditions: [
        "Stop if the fix needs files outside this owner's AGENTS.md write scope.",
        "Stop if the fix needs secrets, provider credential values, or real env files.",
        "Stop if the package needs staging, commit, branch, push, reset, restore, clean, worktree removal, pruning, deploy, or file deletion without exact owner approval.",
        "After owner resolution or blocker report, ask A25 to rerun Wave 01 governance readiness and the aggregate currentness gate."
      ],
      cleanupAuthorized: false,
      executableNow: false
    };
  });
}

function nextActions(route, files) {
  const fileList = files.map((file) => file.file);
  const actions = [
    `Use an isolated ${route.ownerId}-owned worktree or owner-approved clean clone before changing any listed source file.`,
    `Inspect the listed top type-check files: ${fileList.join(", ") || "none"}.`,
    "Fix only in-scope owner files, or write a blocker report naming the upstream owner if the failure depends on shared types, API contracts, LLM provider behavior, or another owner package.",
    "Rerun the suggested checks and record results in the owning session log."
  ];
  if (files.some((file) => file.coOwners.length > 0)) {
    actions.push("Coordinate files with multiple inferred owners before implementation.");
  }
  if (route.routeKind === "wave-01-owner") {
    actions.push("A25/A10/A22 must keep the governance package non-commit-ready until this row is either resolved or owner-routed elsewhere.");
  }
  return actions;
}

function markdown(payload) {
  const overviewRows = payload.handoffs.map((row) => (
    `| ${row.ownerId} | ${row.owner} | ${row.routeKind} | ${row.fileCount} | ${row.errorLinks} | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | none | n/a | 0 | 0 | no | no |";

  const details = payload.handoffs.map((row) => `## ${row.ownerId} ${row.owner}

- Route kind: ${row.routeKind}
- Files: ${row.fileCount}
- Error links: ${row.errorLinks}
- Suggested checks:
${row.suggestedChecks.map((check) => `  - \`${check}\``).join("\n")}
- Files:
${row.files.length > 0 ? row.files.map((file) => `  - \`${file.file}\` (${file.errors} errors)${file.coOwners.length ? `; co-owners: ${file.coOwners.map((owner) => owner.ownerId).join(", ")}` : ""}`).join("\n") : "  - none"}
- Next actions:
${row.nextActions.map((action) => `  - ${action}`).join("\n")}
- Stop conditions:
${row.stopConditions.map((condition) => `  - ${condition}`).join("\n")}
`).join("\n");

  return `# A25 Wave 01 Type-Check Owner Handoff Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source routing generated: ${payload.sourceRoutingGeneratedAt}

This is owner handoff evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, feature fixes, or any physical cleanup.

## Summary

- Handoffs: ${payload.summary.handoffs}
- Cross-owner handoffs: ${payload.summary.crossOwnerHandoffs}
- Wave 01 owner handoffs: ${payload.summary.wave01OwnerHandoffs}
- Unique routed files: ${payload.summary.uniqueFiles}
- Owner file links: ${payload.summary.ownerFileLinks}
- Type-check error lines in source readiness: ${payload.summary.typeCheckErrorLines}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

| Owner ID | Owner | Route kind | Files | Error links | Cleanup authorized | Executable |
| --- | --- | --- | ---: | ---: | --- | --- |
${overviewRows}

${details}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const routing = readJson(paths.routing);
  if (routing.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 type-check routing is stale relative to dirty map.");
  }
  if (routing.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 type-check routing dirty entry count is stale.");
  }

  const handoffs = handoffRows(routing);
  const uniqueFiles = new Set((routing.typeCheckTopFiles ?? []).map((row) => row.file));
  const summary = {
    handoffs: handoffs.length,
    crossOwnerHandoffs: handoffs.filter((row) => row.routeKind === "cross-owner-blocker").length,
    wave01OwnerHandoffs: handoffs.filter((row) => row.routeKind === "wave-01-owner").length,
    uniqueFiles: uniqueFiles.size,
    ownerFileLinks: handoffs.reduce((sum, row) => sum + row.fileCount, 0),
    typeCheckErrorLines: routing.typeCheck?.errorLines ?? 0,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceRoutingGeneratedAt: routing.generatedAt,
    sourceRoutingSummary: routing.summary,
    wave01ReadinessGeneratedAt: routing.wave01ReadinessGeneratedAt,
    wave01CommitReady: routing.wave01CommitReady,
    handoffs,
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
    handoffs: summary.handoffs,
    crossOwnerHandoffs: summary.crossOwnerHandoffs,
    wave01OwnerHandoffs: summary.wave01OwnerHandoffs,
    ownerFileLinks: summary.ownerFileLinks,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
