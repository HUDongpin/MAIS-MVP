#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  remediationRouting: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck-remediation-routing.json",
  topCandidateTypeCheck: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestJson: "coordination/release-intake/latest-A22-typecheck-remediation-owner-work-orders.json",
  latestMarkdown: "coordination/release-intake/latest-A22-typecheck-remediation-owner-work-orders.md",
  datedJson: `coordination/release-intake/${date}-A22-typecheck-remediation-owner-work-orders.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-typecheck-remediation-owner-work-orders.md`
};

const OWNER_ALLOWED_SCOPE = {
  A06: [
    "app/visualization-lab/",
    "app/student/tools/visualizations/",
    "components/visualizations/",
    "data/visualizationLabs.ts",
    "lib/math.ts"
  ],
  A08: [
    "components/providers/AppProviders.tsx",
    "lib/learningAnalytics.ts",
    "lib/learningAnalytics.test.ts",
    "lib/utils.ts",
    "types/index.ts",
    "lib/difficulty.ts",
    "lib/difficulty.test.ts"
  ],
  A10: [
    "README.md",
    "AGENTS.md",
    ".gitignore",
    "package.json",
    "next.config.ts",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "app/globals.css",
    "coordination/"
  ],
  A12: [
    "app/api/",
    "lib/server/auth.ts",
    "lib/server/sessionCookie.ts",
    "lib/server/userStore.ts",
    "lib/server/userStore/"
  ],
  A13: [
    "app/teacher/",
    "components/teacher/",
    "lib/teacher"
  ],
  A20: [
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

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function workOrderMarkdownPath(ownerId) {
  return `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-${slug(ownerId)}.md`;
}

function datedWorkOrderMarkdownPath(ownerId) {
  return `coordination/release-intake/${date}-A22-typecheck-remediation-owner-work-order-${slug(ownerId)}.md`;
}

function sampleErrorsForOwner(rows, ownerId) {
  return rows
    .filter((row) => (row.primaryOwnerIds ?? []).includes(ownerId))
    .slice(0, 12)
    .map((row) => ({
      file: row.file,
      line: row.line,
      column: row.column,
      code: row.code,
      message: row.message
    }));
}

function buildWorkOrder(route, routing, typeCheck, queue) {
  const isCoordinationOnly = route.primaryErrorRows === 0 && route.coordinationErrorRows > 0;
  const ownerId = route.ownerId;
  const topCandidatePath = routing.topCandidate?.path ?? typeCheck.topCandidate?.path ?? "";
  const topCandidateBranch = routing.topCandidate?.branch ?? typeCheck.topCandidate?.branch ?? "";
  return {
    workOrderId: `a22-typecheck-remediation-${ownerId.toLowerCase()}`,
    ownerId,
    ownerLabel: route.ownerLabel,
    workOrderRole: isCoordinationOnly ? "coordination-support" : "primary-remediation",
    remediationStatus: routing.remediationStatus,
    topCandidateBranch,
    topCandidatePath,
    objective: isCoordinationOnly
      ? "Coordinate shared contract/type remediation needed by the A22 top clean candidate; do not edit non-owned feature surfaces without owner coordination."
      : "Reduce this owner's A22 top clean candidate TypeScript error rows to zero or record a concrete owner-routed blocker inside the approved owner scope.",
    allowedWriteScope: OWNER_ALLOWED_SCOPE[ownerId] ?? ["coordination/"],
    forbiddenActions: [
      "Do not stage, commit, merge, push, deploy, clean, reset, delete, or prune from this work order.",
      "Do not edit outside the owner allowed write scope unless a separate coordination instruction names the exact files.",
      "Do not use the dirty root as a production deploy source."
    ],
    primaryErrorRows: route.primaryErrorRows,
    coordinationErrorRows: route.coordinationErrorRows,
    totalRoutedErrorRows: route.totalRoutedErrorRows,
    topFiles: route.topFiles ?? [],
    topCodes: route.topCodes ?? [],
    remediationKinds: route.remediationKinds ?? [],
    coordinationOwnerIds: route.coordinationOwnerIds ?? [],
    sampleErrors: sampleErrorsForOwner(routing.routedErrorRows ?? [], ownerId),
    checks: [
      {
        command: "npm run type-check",
        cwd: topCandidatePath || "<owner remediation worktree>",
        owner: ownerId,
        purpose: "Prove the owner remediation no longer contributes TypeScript errors in the A22 candidate context."
      },
      {
        command: "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
        cwd: root,
        owner: "A22",
        purpose: "Refresh structured A22 top-candidate type-check evidence after owner remediation."
      },
      {
        command: "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
        cwd: root,
        owner: "A22",
        purpose: "Confirm refreshed type-check evidence is current."
      },
      {
        command: "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs",
        cwd: root,
        owner: "A25",
        purpose: "Refresh owner routing after remediation."
      },
      {
        command: "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs",
        cwd: root,
        owner: "A25",
        purpose: "Confirm routing is current after remediation."
      },
      {
        command: "node coordination/release-intake/generate-a22-typecheck-remediation-owner-work-orders.mjs",
        cwd: root,
        owner: "A25",
        purpose: "Refresh this owner work-order bundle."
      },
      {
        command: "node coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs",
        cwd: root,
        owner: "A25",
        purpose: "Confirm this owner work-order bundle is current."
      },
      {
        command: "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
        cwd: root,
        owner: "A22",
        purpose: "Refresh A22 build evidence after type-check remediation."
      }
    ],
    acceptanceCriteria: [
      "Owner-owned TypeScript error rows are remediated in an isolated owner worktree or explicitly approved compose worktree.",
      "Any shared type/API dependency is coordinated with the listed coordination owners before changing shared contracts.",
      "Fresh A22 type-check evidence is green, or this work order records a precise owner-routed blocker with files and error codes.",
      "A22 build evidence is refreshed only after type-check remediation evidence is current."
    ],
    stopConditions: [
      "The fix requires editing outside this owner's allowed write scope.",
      "The fix requires package upgrades, secret/env changes, deploy, merge, cleanup, reset, or destructive Git.",
      "The A22 candidate path is missing or no longer matches the routing packet.",
      `The clean-source validation queue is not ${queue.queueStatus}.`
    ],
    latestMarkdown: workOrderMarkdownPath(ownerId),
    datedMarkdown: datedWorkOrderMarkdownPath(ownerId),
    cleanupAuthorized: false,
    executableNow: false,
    candidateMutationAuthorized: false
  };
}

export function buildA22TypecheckRemediationOwnerWorkOrders() {
  const artifacts = {
    dirtyMap: readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.dirtyMap),
    remediationRouting: readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.remediationRouting),
    topCandidateTypeCheck: readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.topCandidateTypeCheck),
    cleanSourceValidationQueue: readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.cleanSourceValidationQueue)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const routing = artifacts.remediationRouting;
  const typeCheckPassed = artifacts.topCandidateTypeCheck.summary?.typeCheckPassed === true;
  const workOrders = typeCheckPassed
    ? []
    : (routing.ownerRoutes ?? []).map((route) => buildWorkOrder(
      route,
      routing,
      artifacts.topCandidateTypeCheck,
      artifacts.cleanSourceValidationQueue
    ));
  const primaryOwnerIds = workOrders.filter((row) => row.primaryErrorRows > 0).map((row) => row.ownerId).sort();
  const coordinationOwnerIds = workOrders.filter((row) => row.workOrderRole === "coordination-support").map((row) => row.ownerId).sort();
  const ownerWorkOrderStatus = typeCheckPassed
    ? "not-required-typecheck-green"
    : routing.remediationStatus === "owner-routed-cross-owner-remediation-required"
      ? "ready-for-owner-remediation"
      : "blocked-unexpected-routing-status";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    ownerWorkOrderStatus,
    remediationStatus: routing.remediationStatus,
    topCandidate: routing.topCandidate ?? artifacts.topCandidateTypeCheck.topCandidate,
    cleanSourceQueueStatus: artifacts.cleanSourceValidationQueue.queueStatus,
    typeCheckSummary: routing.typeCheckSummary,
    workOrders,
    summary: {
      ownerWorkOrderCount: workOrders.length,
      primaryOwnerIds,
      coordinationOwnerIds,
      routedErrorRows: routing.summary?.routedErrorRows ?? 0,
      primaryErrorRows: workOrders.reduce((sum, row) => sum + row.primaryErrorRows, 0),
      coordinationErrorRows: workOrders.reduce((sum, row) => sum + row.coordinationErrorRows, 0),
      typeCheckPassed,
      sourceCurrentnessFailures: sourceFailures.length,
      candidateMutationRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      releaseSourceSelected: false,
      promotionEligibleNow: false
    },
    validationRows: [
      {
        id: "routing-current-source",
        owner: "A25 git hygiene and release intake",
        passed: sourceFailures.length === 0,
        status: sourceFailures.length === 0 ? "passed" : "failed",
        detail: `sourceCurrentnessFailures=${sourceFailures.length}`
      },
      {
        id: "owner-work-orders-match-routes",
        owner: "A25 git hygiene and release intake",
        passed: typeCheckPassed || workOrders.length === (routing.ownerRoutes ?? []).length,
        status: typeCheckPassed ? "not-required" : "passed",
        detail: `workOrders=${workOrders.length}; routes=${routing.ownerRoutes?.length ?? 0}`
      },
      {
        id: "a22-direct-mutation-blocked",
        owner: "A22 production reliability and release engineering",
        passed: workOrders.every((row) => row.candidateMutationAuthorized === false),
        status: "passed",
        detail: "Work orders route remediation to owners; A22 direct feature/API/type mutation remains blocked."
      },
      {
        id: "merge-deploy-cleanup-still-blocked",
        owner: "A25 git hygiene and release intake",
        passed: true,
        status: "passed",
        detail: "cleanupAuthorizedRows=0; executableRows=0; releaseSourceSelected=false."
      }
    ],
    boundary: {
      evidenceOnly: true,
      routesOwnerRemediation: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      selectsReleaseSource: false,
      stagesFiles: false,
      commits: false,
      merges: false,
      pushes: false,
      deploys: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableA22TypecheckRemediationOwnerWorkOrdersProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: Object.fromEntries(Object.entries(payload.sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
      path: stamp.path,
      dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
      expandedStatusEntries: stamp.expandedStatusEntries
    }])),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    ownerWorkOrderStatus: payload.ownerWorkOrderStatus,
    remediationStatus: payload.remediationStatus,
    topCandidate: payload.topCandidate,
    cleanSourceQueueStatus: payload.cleanSourceQueueStatus,
    typeCheckSummary: payload.typeCheckSummary,
    workOrders: payload.workOrders,
    summary: payload.summary,
    validationRows: payload.validationRows,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function workOrderMarkdown(payload, order) {
  const topFileRows = order.topFiles.map((row) => `| \`${cell(row.file)}\` | ${row.errors} |`).join("\n") || "| none | 0 |";
  const codeRows = order.topCodes.map((row) => `| \`${cell(row.code)}\` | ${row.errors} |`).join("\n") || "| none | 0 |";
  const sampleRows = order.sampleErrors.map((row) => (
    `| \`${cell(row.file)}\` | ${row.line ?? ""} | ${row.column ?? ""} | \`${cell(row.code)}\` | ${cell(row.message)} |`
  )).join("\n") || "| none | n/a | n/a | n/a | none |";
  const checks = order.checks.map((row) => `- \`${row.command}\` (${row.owner}, cwd: \`${row.cwd}\`) - ${row.purpose}`).join("\n");

  return `# A22 Typecheck Remediation Owner Work Order - ${order.ownerId}

Generated: ${payload.generatedAt}

Owner: ${order.ownerId} ${order.ownerLabel}

Role: ${order.workOrderRole}

Top candidate: \`${order.topCandidateBranch}\` at \`${order.topCandidatePath}\`

This work order is evidence and assignment guidance only. It does not authorize staging, committing, merging, pushing, deploying, cleanup, deletion, reset, pruning, broad candidate mutation, or physical lifecycle cleanup.

## Objective

${order.objective}

## Scope

Allowed write scope:

${list(order.allowedWriteScope.map((scope) => `\`${scope}\``))}

Forbidden actions:

${list(order.forbiddenActions)}

## Error Summary

- Primary error rows: ${order.primaryErrorRows}
- Coordination error rows: ${order.coordinationErrorRows}
- Total routed error rows: ${order.totalRoutedErrorRows}
- Coordination owners: ${order.coordinationOwnerIds.join(", ") || "none"}

| File | Error rows |
| --- | ---: |
${topFileRows}

| TypeScript code | Error rows |
| --- | ---: |
${codeRows}

| File | Line | Column | Code | Message |
| --- | ---: | ---: | --- | --- |
${sampleRows}

## Checks

${checks}

## Acceptance Criteria

${list(order.acceptanceCriteria)}

## Stop Conditions

${list(order.stopConditions)}

## Boundary

- Cleanup authorized: false
- Executable now: false
- Candidate mutation authorized: false
`;
}

function markdown(payload) {
  const rows = payload.workOrders.map((row) => (
    `| \`${row.ownerId}\` | ${cell(row.ownerLabel)} | ${cell(row.workOrderRole)} | ${row.primaryErrorRows} | ${row.coordinationErrorRows} | \`${cell(row.latestMarkdown)}\` |`
  )).join("\n") || "| none | none | none | 0 | 0 | n/a |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";

  return `# A22 Typecheck Remediation Owner Work Orders

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This bundle turns the A22 top clean candidate type-check remediation routing into owner work orders. It is guidance/evidence only and does not execute remediation, stage, commit, merge, deploy, cleanup, delete, reset, prune, record owner approval, or authorize physical lifecycle cleanup.

## Summary

- Owner work-order status: ${payload.ownerWorkOrderStatus}
- Remediation status: ${payload.remediationStatus}
- Top candidate branch: \`${payload.topCandidate?.branch ?? ""}\`
- Top candidate path: \`${payload.topCandidate?.path ?? ""}\`
- Clean-source queue status: ${payload.cleanSourceQueueStatus}
- Type-check status: ${payload.typeCheckSummary?.typeCheckStatus ?? ""}
- TypeScript error rows: ${payload.typeCheckSummary?.structuredErrorRows ?? 0}
- Work orders: ${payload.summary.ownerWorkOrderCount}
- Primary owners: ${payload.summary.primaryOwnerIds.join(", ") || "none"}
- Coordination owners: ${payload.summary.coordinationOwnerIds.join(", ") || "none"}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Work Orders

| Owner | Label | Role | Primary error rows | Coordination error rows | Work order |
| --- | --- | --- | ---: | ---: | --- |
${rows}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Boundary

A22 remains blocked from clean-source promotion until owner remediation is completed and fresh A22 type-check/build evidence is green or explicitly accepted by the release gate.
`;
}

function main() {
  const payload = buildA22TypecheckRemediationOwnerWorkOrders();
  for (const order of payload.workOrders) {
    const content = workOrderMarkdown(payload, order);
    write(order.latestMarkdown, content);
    write(order.datedMarkdown, content);
  }
  write(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestMarkdown, markdown(payload));
  write(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 typecheck remediation owner work orders generated");
  console.log(`Status: ${payload.ownerWorkOrderStatus}`);
  console.log(`Work orders: ${payload.summary.ownerWorkOrderCount}`);
  console.log(`Routed error rows: ${payload.summary.routedErrorRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
