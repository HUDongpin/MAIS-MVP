#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  finalStateActionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-closure-execution-sequence.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-closure-execution-sequence.md`
};

const waveDefinitions = [
  {
    waveId: "wave-01-governance-release-hygiene",
    planTasks: ["Task 3"],
    name: "A25/A10/A22 governance and release hygiene",
    purpose: "Close the governance, release-hygiene, and clean-release-control package before runtime features.",
    ownerApprovalIds: [
      "a25-git-hygiene-and-release-intake",
      "a22-production-reliability-and-release-engineering",
      "a10-tooling-docs-and-report"
    ],
    optionalOwnerApprovalIds: [
      "manual-a10-a25-owner-assignment-required"
    ],
    physicalApprovalIds: [
      "codex-a25-dirty-closure-governance",
      "codex-a10-a22-release-governance",
      "codex-a22-p1-release-hygiene-security",
      "codex-a22-next-15-5-19-audit",
      "codex-a22-us-region-alignment",
      "codex-a22-missing-module-release-slice"
    ],
    optionalPhysicalApprovalIds: [
      "codex-a25-ci-backup-workflow"
    ]
  },
  {
    waveId: "wave-02-shared-contracts",
    planTasks: ["Task 4"],
    name: "A08/A12 shared contracts and storage/API stability",
    purpose: "Stabilize shared type, provider, analytics, storage, and backend contracts before dependent runtime packages.",
    ownerApprovalIds: [
      "a08-state-and-analytics-lead",
      "a12-backend-api-platform"
    ],
    physicalApprovalIds: [
      "codex-a08-a12-shared-contract-closure",
      "codex-a12-userstore-storage-contract",
      "codex-a12-google-oauth-login",
      "codex-a07-a15-a08-ai-adaptive-types"
    ]
  },
  {
    waveId: "wave-03-shell-dashboard-roadmap",
    planTasks: ["Task 5 Step 1", "Task 5 Step 2", "Task 5 Step 3"],
    name: "A01/A02/A03/A15 student shell, dashboard, and roadmap",
    purpose: "Close student entry, dashboard, adaptive UI, and roadmap packages after shared contracts are stable.",
    ownerApprovalIds: [
      "a01-app-shell-lead",
      "a02-dashboard-lead",
      "a03-curriculum-roadmap-lead",
      "a15-adaptive-engine-lead"
    ],
    physicalApprovalIds: [
      "codex-a01-app-shell-closure",
      "codex-a01-shell-lazy-load"
    ],
    optionalPhysicalApprovalIds: [
      "codex-a02-a15-dashboard-adaptive-closure",
      "codex-a03-roadmap-closure"
    ]
  },
  {
    waveId: "wave-04-practice-lesson-content",
    planTasks: ["Task 5 Step 4", "Task 5 Step 5", "Task 6 Step 1"],
    name: "A04/A05/A18/A21/A23/A24 practice, lesson, and content evidence",
    purpose: "Close practice, lesson, content QA, RAG, integration, and exact-layer packages without unreviewed live promotion.",
    ownerApprovalIds: [
      "a04-practice-lead",
      "a05-lesson-lead",
      "a18-curriculum-qa-a21-content-pipeline",
      "a18-curriculum-qa-and-content-quality-lead",
      "a21-content-pipeline-and-rag-operations",
      "a23-integration-and-promotion-lead",
      "a24-illustration-exact-layer"
    ],
    physicalApprovalIds: [
      "codex-california-practice-beta-clean"
    ],
    optionalPhysicalApprovalIds: [
      "codex-a04-practice-closure",
      "codex-a05-lesson-checklist-p0",
      "codex-a05-lesson-closure",
      "codex-a05-lesson-pep-load",
      "codex-a05-next-item-button-scroll",
      "codex-a18-a21-content-evidence-closure"
    ]
  },
  {
    waveId: "wave-05-visualization-ai-runtime",
    planTasks: ["Task 5 Step 6", "Task 5 Step 7", "Task 5 Step 8", "Task 5 Step 9", "Task 6 Step 2"],
    name: "A06/A07/A09/A11/A13/A14/A16/A17/A20 runtime and QA surfaces",
    purpose: "Close the remaining visualization, AI tutor, copy, QA, console, research, motivation, and game packages.",
    ownerApprovalIds: [
      "a06-visualization-lead",
      "a07-ai-tutor-lead",
      "a09-copy-i18n-accessibility",
      "a11-qa-and-release-quality",
      "a13-teacher-console",
      "a14-parent-console",
      "a17-gamification-and-motivation",
      "a20-game-design-and-game-based-learning"
    ],
    optionalOwnerApprovalIds: [
      "a13-teacher-console-lead",
      "a16-research-and-learning-science"
    ],
    physicalApprovalIds: [
      "codex-a06-manim-three-closure",
      "codex-a06-visualization-closure",
      "codex-visualization-production-release",
      "codex-a07-ai-tutor-classroom-switches"
    ],
    optionalPhysicalApprovalIds: [
      "codex-a07-ai-tutor-closure",
      "codex-a09-copy-i18n-accessibility-closure",
      "codex-a11-fix-126-128-129",
      "codex-a11-regression-evidence-closure",
      "codex-a14-profile-avatar-save",
      "codex-a13-a14-console-closure",
      "codex-a16-research-evidence-closure",
      "codex-a17-a20-game-motivation-closure"
    ]
  },
  {
    waveId: "wave-06-final-root-and-compose-lifecycle",
    planTasks: ["Task 7"],
    name: "Final root and compose/legacy lifecycle closure",
    purpose: "Close root main and remaining compose or legacy physical lifecycle records after owner packages are resolved.",
    ownerApprovalIds: [],
    physicalApprovalIds: [
      "root-main",
      "codex-a10-a22-a08-a12-a06-compose-20260628",
      "codex-a25-full-dirty-compose-verification",
      "codex-a19-vercel-postgres-region",
      "codex-s22-release-hygiene-2026-06-15"
    ]
  }
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

function ensureCurrent(label, artifact, dirtyMap) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error(`${label} dirty-map signature is stale.`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error(`${label} expanded dirty entry count is stale.`);
  }
}

function byApprovalId(rows) {
  return new Map((rows ?? []).map((row) => [row.approvalId, row]));
}

function actionFor(actionRunbook, approvalId) {
  return (actionRunbook.actions ?? []).find((action) => action.approvalId === approvalId);
}

function queueRow(row, actionRunbook, queueKind) {
  const action = actionFor(actionRunbook, row.approvalId);
  return {
    approvalId: row.approvalId,
    queueKind,
    owner: row.owner ?? "",
    branch: row.branch ?? "",
    state: row.state ?? "",
    currentBlocker: row.currentBlocker,
    entries: row.entries ?? null,
    priority: row.priority ?? null,
    allowedFinalStates: row.allowedFinalStates,
    actionKind: action?.actionKind ?? "blocker-report-required",
    executableNow: false,
    cleanupAuthorized: false,
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks
  };
}

function buildWaves(queue, actionRunbook) {
  const ownerRowsById = byApprovalId(queue.ownerPackageQueue);
  const physicalRowsById = byApprovalId(queue.physicalLifecycleQueue);
  const seenOwner = new Set();
  const seenPhysical = new Set();

  const waves = waveDefinitions.map((definition, index) => {
    const ownerRows = definition.ownerApprovalIds.map((id) => {
      const row = ownerRowsById.get(id);
      if (!row) throw new Error(`${definition.waveId} missing owner approval ${id}`);
      seenOwner.add(id);
      return queueRow(row, actionRunbook, "root-owner-package");
    });
    const optionalOwnerRows = (definition.optionalOwnerApprovalIds ?? []).flatMap((id) => {
      const row = ownerRowsById.get(id);
      if (!row) return [];
      seenOwner.add(id);
      return [queueRow(row, actionRunbook, "root-owner-package")];
    });

    const physicalRows = definition.physicalApprovalIds.map((id) => {
      const row = physicalRowsById.get(id);
      if (!row) throw new Error(`${definition.waveId} missing physical approval ${id}`);
      seenPhysical.add(id);
      return queueRow(row, actionRunbook, "physical-lifecycle");
    });
    const optionalPhysicalRows = (definition.optionalPhysicalApprovalIds ?? []).flatMap((id) => {
      const row = physicalRowsById.get(id);
      if (!row) return [];
      seenPhysical.add(id);
      return [queueRow(row, actionRunbook, "physical-lifecycle")];
    });

    return {
      waveIndex: index + 1,
      waveId: definition.waveId,
      name: definition.name,
      planTasks: definition.planTasks,
      purpose: definition.purpose,
      blockedUntil: "Owner authorizes every selected final state and exact Git operation needed for this wave.",
      ownerApprovals: [...ownerRows, ...optionalOwnerRows],
      physicalLifecycleApprovals: [...physicalRows, ...optionalPhysicalRows],
      summary: summarizeRows([...ownerRows, ...optionalOwnerRows, ...physicalRows, ...optionalPhysicalRows])
    };
  });

  const missingOwner = [...ownerRowsById.keys()].filter((id) => !seenOwner.has(id));
  const missingPhysical = [...physicalRowsById.keys()].filter((id) => !seenPhysical.has(id));
  if (missingOwner.length > 0 || missingPhysical.length > 0) {
    throw new Error(`Unsequenced approvals: owner=${missingOwner.join(", ") || "none"} physical=${missingPhysical.join(", ") || "none"}`);
  }

  return waves;
}

function summarizeRows(rows) {
  return {
    approvals: rows.length,
    ownerPackageApprovals: rows.filter((row) => row.queueKind === "root-owner-package").length,
    physicalLifecycleApprovals: rows.filter((row) => row.queueKind === "physical-lifecycle").length,
    entries: rows.reduce((sum, row) => sum + (Number.isFinite(row.entries) ? row.entries : 0), 0),
    executableRows: rows.filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length
  };
}

function summarizeWaves(waves) {
  const rows = waves.flatMap((wave) => [...wave.ownerApprovals, ...wave.physicalLifecycleApprovals]);
  return {
    waves: waves.length,
    totalApprovals: rows.length,
    ownerPackageApprovals: rows.filter((row) => row.queueKind === "root-owner-package").length,
    physicalLifecycleApprovals: rows.filter((row) => row.queueKind === "physical-lifecycle").length,
    ownerPackageEntries: rows.reduce((sum, row) => sum + (Number.isFinite(row.entries) ? row.entries : 0), 0),
    executableRows: rows.filter((row) => row.executableNow).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length
  };
}

function markdown(payload) {
  const summaryRows = payload.waves.map((wave) => {
    return `| ${wave.waveIndex} | \`${wave.waveId}\` | ${wave.name} | ${wave.summary.ownerPackageApprovals} | ${wave.summary.physicalLifecycleApprovals} | ${wave.summary.entries} |`;
  }).join("\n");

  const sections = payload.waves.map((wave) => {
    const ownerRows = wave.ownerApprovals.map((row) => {
      return `| \`${row.approvalId}\` | ${row.owner} | P${row.priority} | ${row.entries} |`;
    }).join("\n") || "| _none_ |  |  |  |";

    const physicalRows = wave.physicalLifecycleApprovals.map((row) => {
      return `| \`${row.approvalId}\` | \`${row.branch}\` | ${row.state} | ${row.currentBlocker} |`;
    }).join("\n") || "| _none_ |  |  |  |";

    return `## ${wave.waveIndex}. ${wave.name}

Plan tasks: ${wave.planTasks.join("; ")}

Purpose: ${wave.purpose}

Blocked until: ${wave.blockedUntil}

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
${ownerRows}

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
${physicalRows}
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Closure Execution Sequence

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is a sequencing artifact only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID, selected final state, and exact Git operation.

## Summary

- Waves: ${payload.summary.waves}
- Total approval IDs: ${payload.summary.totalApprovals}
- Owner package approval IDs: ${payload.summary.ownerPackageApprovals}
- Physical lifecycle approval IDs: ${payload.summary.physicalLifecycleApprovals}
- Owner package entries: ${payload.summary.ownerPackageEntries}
- Executable rows now: ${payload.summary.executableRows}
- Cleanup-authorized rows now: ${payload.summary.cleanupAuthorizedRows}

| Wave | Wave ID | Name | Owner approvals | Physical approvals | Owner entries |
| ---: | --- | --- | ---: | ---: | ---: |
${summaryRows}

${sections}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const authorizationQueue = readJson(paths.authorizationQueue);
  const actionRunbook = readJson(paths.finalStateActionRunbook);

  ensureCurrent("authorization queue", authorizationQueue, dirtyMap);
  ensureCurrent("action runbook", actionRunbook, dirtyMap);

  const waves = buildWaves(authorizationQueue, actionRunbook);
  const summary = summarizeWaves(waves);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    authorizationQueueGeneratedAt: authorizationQueue.generatedAt,
    actionRunbookGeneratedAt: actionRunbook.generatedAt,
    cleanupAuthorized: false,
    note: "Sequencing artifact only. It cannot be used as authorization for any physical cleanup or Git operation.",
    summary,
    waves
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
    waves: summary.waves,
    totalApprovals: summary.totalApprovals,
    ownerPackageApprovals: summary.ownerPackageApprovals,
    physicalLifecycleApprovals: summary.physicalLifecycleApprovals,
    executableRows: summary.executableRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows
  }, null, 2));
}

main();
