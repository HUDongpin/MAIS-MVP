#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_TYPECHECK_REMEDIATION_ROUTING_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  topCandidateTypeCheck: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck.json",
  cleanSourceValidationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  latestJson: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck-remediation-routing.json",
  latestMarkdown: "coordination/release-intake/latest-A22-top-clean-candidate-typecheck-remediation-routing.md",
  datedJson: `coordination/release-intake/${date}-A22-top-clean-candidate-typecheck-remediation-routing.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-top-clean-candidate-typecheck-remediation-routing.md`
};

const OWNER_LABELS = {
  A06: "Visualization lead",
  A08: "State and analytics / shared types lead",
  A10: "Tooling, docs, report lead",
  A12: "Backend/API platform lead",
  A13: "Teacher console lead",
  A20: "Game design and game-based learning lead",
  A22: "Production reliability and release engineering lead",
  A25: "Git hygiene and release intake lead"
};

const REMEDIATION_COMPATIBLE_QUEUE_STATUSES = new Set([
  "waiting-top-candidate-typecheck-build-remediation",
  "fallback-candidate-green-await-clean-source-selection-review"
]);

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
    artifactStamp(key, A22_TYPECHECK_REMEDIATION_ROUTING_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, A22_TYPECHECK_REMEDIATION_ROUTING_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function ownerForFile(file) {
  if (file.startsWith("components/visualizations/") ||
    file.startsWith("app/visualization-lab/") ||
    file.startsWith("app/student/tools/visualizations/")) {
    return ["A06"];
  }
  if (file.startsWith("components/games/") ||
    file.startsWith("app/games/") ||
    file.startsWith("app/student/practice/games/") ||
    file.startsWith("app/practice/fishing-game/") ||
    file.startsWith("app/practice/quadratic-bonus/")) {
    return ["A20"];
  }
  if (file.startsWith("components/teacher/") ||
    file.startsWith("app/teacher/") ||
    file.startsWith("lib/teacher")) {
    return ["A13"];
  }
  if (file.startsWith("app/api/")) {
    return ["A12"];
  }
  if (file === "types/index.ts" || file.startsWith("lib/difficulty")) {
    return ["A08"];
  }
  return ["A10"];
}

function dependencyOwners(message) {
  const owners = [];
  if (message.includes("@/types") || message.includes("NovaLensPolicy") || message.includes("LearnerProfile") ||
    message.includes("TeacherLessonKit") || message.includes("AssignmentSubmission") || message.includes("ClassroomWorkSample")) {
    owners.push("A08");
  }
  if (message.includes("@/lib/server/userStore") || message.includes("@/lib/server/aiGovernance") ||
    message.includes("@/lib/server/") || message.includes("userStore")) {
    owners.push("A12");
  }
  if (message.includes("@/lib/difficulty")) {
    owners.push("A08");
  }
  if (message.includes("Teacher") || message.includes("teacher")) {
    owners.push("A13");
  }
  if (message.includes("Visualization") || message.includes("ThreeD") || message.includes("threeD")) {
    owners.push("A06");
  }
  if (message.includes("Game") || message.includes("game")) {
    owners.push("A20");
  }
  return unique(owners);
}

function classify(row) {
  const primaryOwnerIds = ownerForFile(row.file ?? "");
  const coordinationOwnerIds = unique(dependencyOwners(row.message ?? "").filter((owner) => !primaryOwnerIds.includes(owner)));
  const allOwnerIds = unique([...primaryOwnerIds, ...coordinationOwnerIds]);
  let remediationKind = "targeted-owner-code-remediation";
  if (["TS2305", "TS2307", "TS2724"].includes(row.code)) remediationKind = "missing-shared-contract-or-module-parity";
  if (row.code === "TS7006") remediationKind = "strict-typing-cleanup";
  if (row.code === "TS2339") remediationKind = "object-contract-drift";
  if (row.code === "TS2322") remediationKind = "assignment-type-drift";

  return {
    ...row,
    primaryOwnerIds,
    coordinationOwnerIds,
    allOwnerIds,
    remediationKind,
    directA22MutationPermitted: false
  };
}

function summarizeRoutes(rows) {
  const byOwner = new Map();
  for (const row of rows) {
    for (const ownerId of row.primaryOwnerIds) {
      const item = byOwner.get(ownerId) ?? {
        ownerId,
        ownerLabel: OWNER_LABELS[ownerId] ?? ownerId,
        primaryErrorRows: 0,
        coordinationErrorRows: 0,
        files: new Map(),
        codes: new Map(),
        remediationKinds: new Map(),
        coordinationOwnerIds: new Set()
      };
      item.primaryErrorRows += 1;
      item.files.set(row.file, (item.files.get(row.file) ?? 0) + 1);
      item.codes.set(row.code, (item.codes.get(row.code) ?? 0) + 1);
      item.remediationKinds.set(row.remediationKind, (item.remediationKinds.get(row.remediationKind) ?? 0) + 1);
      for (const coordinationOwnerId of row.coordinationOwnerIds) item.coordinationOwnerIds.add(coordinationOwnerId);
      byOwner.set(ownerId, item);
    }
    for (const ownerId of row.coordinationOwnerIds) {
      const item = byOwner.get(ownerId) ?? {
        ownerId,
        ownerLabel: OWNER_LABELS[ownerId] ?? ownerId,
        primaryErrorRows: 0,
        coordinationErrorRows: 0,
        files: new Map(),
        codes: new Map(),
        remediationKinds: new Map(),
        coordinationOwnerIds: new Set()
      };
      item.coordinationErrorRows += 1;
      item.codes.set(row.code, (item.codes.get(row.code) ?? 0) + 1);
      item.remediationKinds.set(row.remediationKind, (item.remediationKinds.get(row.remediationKind) ?? 0) + 1);
      byOwner.set(ownerId, item);
    }
  }

  return [...byOwner.values()]
    .sort((a, b) => (b.primaryErrorRows + b.coordinationErrorRows) - (a.primaryErrorRows + a.coordinationErrorRows) || a.ownerId.localeCompare(b.ownerId))
    .map((item) => ({
      ownerId: item.ownerId,
      ownerLabel: item.ownerLabel,
      primaryErrorRows: item.primaryErrorRows,
      coordinationErrorRows: item.coordinationErrorRows,
      totalRoutedErrorRows: item.primaryErrorRows + item.coordinationErrorRows,
      fileCount: item.files.size,
      topFiles: [...item.files.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([file, errors]) => ({ file, errors })),
      topCodes: [...item.codes.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([code, errors]) => ({ code, errors })),
      remediationKinds: [...item.remediationKinds.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([kind, errors]) => ({ kind, errors })),
      coordinationOwnerIds: [...item.coordinationOwnerIds].sort(),
      nextInstruction: "Remediate this owner slice in an isolated owner worktree or explicitly approved compose worktree, then rerun A22 top-candidate type-check/build gates."
    }));
}

function topRoutedFiles(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.file, (counts.get(row.file) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30)
    .map(([file, errors]) => ({ file, errors, primaryOwnerIds: ownerForFile(file) }));
}

export function buildA22TypecheckRemediationRouting() {
  const artifacts = {
    dirtyMap: readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.dirtyMap),
    topCandidateTypeCheck: readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.topCandidateTypeCheck),
    cleanSourceValidationQueue: readJson(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.cleanSourceValidationQueue)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const typeCheck = artifacts.topCandidateTypeCheck.typeCheck ?? {};
  const rawErrorRows = typeCheck.errorRows ?? [];
  const routedErrorRows = rawErrorRows.map(classify);
  const ownerRoutes = summarizeRoutes(routedErrorRows);
  const primaryOwnerIds = unique(ownerRoutes.filter((row) => row.primaryErrorRows > 0).map((row) => row.ownerId));
  const coordinationOwnerIds = unique(ownerRoutes.filter((row) => row.coordinationErrorRows > 0).map((row) => row.ownerId));
  const typeCheckPassed = artifacts.topCandidateTypeCheck.summary?.typeCheckPassed === true;
  const queueStatus = artifacts.cleanSourceValidationQueue.queueStatus ?? "";
  const remediationCompatibleQueueStatus = REMEDIATION_COMPATIBLE_QUEUE_STATUSES.has(queueStatus);
  const remediationStatus = typeCheckPassed
    ? "not-required-typecheck-green"
    : remediationCompatibleQueueStatus
      ? "owner-routed-cross-owner-remediation-required"
      : "blocked-unexpected-clean-source-queue-status";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    remediationStatus,
    topCandidate: artifacts.topCandidateTypeCheck.topCandidate,
    cleanSourceQueueStatus: queueStatus,
    typeCheckSummary: {
      typeCheckStatus: artifacts.topCandidateTypeCheck.typeCheckStatus,
      typeCheckPassed,
      exitStatus: artifacts.topCandidateTypeCheck.summary?.exitStatus ?? null,
      errorLineCount: artifacts.topCandidateTypeCheck.summary?.errorLineCount ?? 0,
      structuredErrorRows: rawErrorRows.length,
      topFileCount: artifacts.topCandidateTypeCheck.summary?.topFileCount ?? 0,
      topCodeCount: artifacts.topCandidateTypeCheck.summary?.topCodeCount ?? 0
    },
    ownerRoutes,
    topRoutedFiles: topRoutedFiles(routedErrorRows),
    routedErrorRows,
    summary: {
      ownerRouteCount: ownerRoutes.length,
      primaryOwnerIds,
      coordinationOwnerIds,
      routedErrorRows: routedErrorRows.length,
      crossOwnerErrorRows: routedErrorRows.filter((row) => row.allOwnerIds.length > 1).length,
      directA22MutationPermitted: false,
      candidateMutationRows: 0,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      sourceCurrentnessFailures: sourceFailures.length
    },
    validationRows: [
      {
        id: "typecheck-error-rows-structured",
        owner: "A22 production reliability and release engineering",
        passed: typeCheckPassed || rawErrorRows.length === (artifacts.topCandidateTypeCheck.summary?.errorLineCount ?? 0),
        status: typeCheckPassed ? "not-required" : "passed",
        detail: `structured=${rawErrorRows.length}; errorLineCount=${artifacts.topCandidateTypeCheck.summary?.errorLineCount ?? 0}`
      },
      {
        id: "clean-source-queue-is-typecheck-build-remediation",
        owner: "A22 production reliability and release engineering",
        passed: typeCheckPassed || remediationCompatibleQueueStatus,
        status: typeCheckPassed ? "not-required" : "passed",
        detail: `queueStatus=${queueStatus}`
      },
      {
        id: "owner-routes-present",
        owner: "A25 git hygiene and release intake",
        passed: typeCheckPassed || ownerRoutes.length > 0,
        status: typeCheckPassed ? "not-required" : "passed",
        detail: `ownerRoutes=${ownerRoutes.length}; routedErrorRows=${routedErrorRows.length}`
      },
      {
        id: "a22-direct-feature-mutation-blocked",
        owner: "A22 production reliability and release engineering",
        passed: true,
        status: "passed",
        detail: "Routing packet records owner work orders only; A22 does not mutate cross-owner feature/API/type files."
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
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      selectsReleaseSource: false,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
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

export function stableA22TypecheckRemediationRoutingProjection(payload) {
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
    remediationStatus: payload.remediationStatus,
    topCandidate: payload.topCandidate,
    cleanSourceQueueStatus: payload.cleanSourceQueueStatus,
    typeCheckSummary: payload.typeCheckSummary,
    ownerRoutes: payload.ownerRoutes,
    topRoutedFiles: payload.topRoutedFiles,
    routedErrorRows: payload.routedErrorRows,
    summary: payload.summary,
    validationRows: payload.validationRows,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const ownerRows = payload.ownerRoutes.map((row) => (
    `| \`${row.ownerId}\` | ${cell(row.ownerLabel)} | ${row.primaryErrorRows} | ${row.coordinationErrorRows} | ${cell(row.coordinationOwnerIds.join(", ") || "none")} | ${cell(row.remediationKinds.map((kind) => `${kind.kind}:${kind.errors}`).join("; "))} |`
  )).join("\n") || "| none | none | 0 | 0 | none | none |";
  const topFiles = payload.topRoutedFiles.map((row) => (
    `| \`${cell(row.file)}\` | ${row.errors} | ${cell(row.primaryOwnerIds.join(", "))} |`
  )).join("\n") || "| none | 0 | none |";
  const validationRows = payload.validationRows.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.owner)} | ${cell(row.status)} | ${row.passed ? "yes" : "no"} | ${cell(row.detail)} |`
  )).join("\n") || "| none | none | none | no | none |";

  return `# A22 Top Clean Candidate Type-Check Remediation Routing

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet routes the current A22 top-candidate \`npm run type-check\` errors to owning sessions before clean-source selection. It does not edit the candidate, copy root files, stage, commit, merge, deploy, clean, delete, reset, prune, record owner approval, or authorize physical lifecycle cleanup.

## Summary

- Remediation status: ${payload.remediationStatus}
- Top candidate branch: \`${payload.topCandidate?.branch ?? ""}\`
- Top candidate path: \`${payload.topCandidate?.path ?? ""}\`
- Clean-source queue status: ${payload.cleanSourceQueueStatus}
- Type-check status: ${payload.typeCheckSummary.typeCheckStatus}
- TypeScript error lines: ${payload.typeCheckSummary.errorLineCount}
- Structured error rows: ${payload.typeCheckSummary.structuredErrorRows}
- Owner routes: ${payload.summary.ownerRouteCount}
- Primary owners: ${payload.summary.primaryOwnerIds.join(", ") || "none"}
- Coordination owners: ${payload.summary.coordinationOwnerIds.join(", ") || "none"}
- Direct A22 candidate mutation permitted: ${payload.summary.directA22MutationPermitted ? "yes" : "no"}
- Candidate mutation rows: ${payload.summary.candidateMutationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Routes

| Owner | Label | Primary error rows | Coordination error rows | Coordination owners | Remediation kinds |
| --- | --- | ---: | ---: | --- | --- |
${ownerRows}

## Top Routed Files

| File | Error rows | Primary owners |
| --- | ---: | --- |
${topFiles}

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
${validationRows}

## Boundary

This is routing evidence only. A22 remains blocked from clean-source promotion until the owner-routed type-check remediation is completed and fresh A22 type-check/build evidence is green or explicitly accepted by the release gate.
`;
}

function main() {
  const payload = buildA22TypecheckRemediationRouting();
  write(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.latestMarkdown, markdown(payload));
  write(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_TYPECHECK_REMEDIATION_ROUTING_PATHS.datedMarkdown, markdown(payload));

  console.log("A22 top clean candidate type-check remediation routing generated");
  console.log(`Remediation status: ${payload.remediationStatus}`);
  console.log(`Owner routes: ${payload.summary.ownerRouteCount}`);
  console.log(`Routed error rows: ${payload.summary.routedErrorRows}`);
  console.log(`Executable rows: ${payload.summary.executableRows}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
