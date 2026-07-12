#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-typecheck-owner-handoff-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  routing: "coordination/release-intake/latest-A25-wave01-typecheck-blocker-routing.json",
  packet: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.json",
  markdown: "coordination/release-intake/latest-A25-wave01-typecheck-owner-handoff-packet.md"
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

function expectedHandoffs(routing) {
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
      nextActions: expectedNextActions(route, files),
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

function expectedNextActions(route, files) {
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

function expectedSummary(routing, handoffs) {
  const uniqueFiles = new Set((routing.typeCheckTopFiles ?? []).map((row) => row.file));
  return {
    handoffs: handoffs.length,
    crossOwnerHandoffs: handoffs.filter((row) => row.routeKind === "cross-owner-blocker").length,
    wave01OwnerHandoffs: handoffs.filter((row) => row.routeKind === "wave-01-owner").length,
    uniqueFiles: uniqueFiles.size,
    ownerFileLinks: handoffs.reduce((sum, row) => sum + row.fileCount, 0),
    typeCheckErrorLines: routing.typeCheck?.errorLines ?? 0,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave 01 type-check owner handoff packet gate");
    console.log(`Handoffs: ${payload.handoffs ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 Wave 01 type-check owner handoff packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, handoffs: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const routing = readJson(paths.routing);
  const packet = readJson(paths.packet);
  const handoffs = expectedHandoffs(routing);
  const summary = expectedSummary(routing, handoffs);

  if (routing.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("source routing is stale relative to dirty map");
  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded dirty entry count is stale");
  if (packet.sourceRoutingGeneratedAt !== routing.generatedAt) failures.push("packet source routing timestamp is stale");
  if (packet.cleanupAuthorized !== false) failures.push("packet cleanupAuthorized must be false");
  if (packet.executableNow !== false) failures.push("packet executableNow must be false");
  if (!sameJson(packet.sourceRoutingSummary, routing.summary)) failures.push("packet source routing summary is stale");
  if (!sameJson(packet.handoffs, handoffs)) failures.push("packet handoff rows are stale");
  if (!sameJson(packet.summary, summary)) failures.push("packet summary is stale");
  if (packet.summary?.cleanupAuthorizedRows !== 0) failures.push("packet summary cleanupAuthorizedRows must be 0");
  if (packet.summary?.executableRows !== 0) failures.push("packet summary executableRows must be 0");

  const markdown = readText(paths.markdown);
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes("This is owner handoff evidence only.")) failures.push("packet markdown missing non-authorization boundary");
  if (!markdown.includes("Stop conditions")) failures.push("packet markdown missing stop conditions");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    handoffs: handoffs.length,
    crossOwnerHandoffs: summary.crossOwnerHandoffs,
    wave01OwnerHandoffs: summary.wave01OwnerHandoffs,
    ownerFileLinks: summary.ownerFileLinks,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
