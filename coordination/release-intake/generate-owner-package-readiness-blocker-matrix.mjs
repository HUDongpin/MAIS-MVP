#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  wave01AuthorizationsGate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-current-gate.json",
  wave01ArtifactCleanApprovalCapsule: "coordination/release-intake/latest-A25-wave01-a25-artifact-clean-owner-approval-capsule.json",
  wave01ArtifactCleanPostCleanVerificationPlan: "coordination/release-intake/latest-A25-wave01-artifact-clean-post-clean-verification-plan.json",
  wave01PackageResyncAcceptanceDocket: "coordination/release-intake/latest-A25-wave01-package-resync-owner-acceptance-docket.json",
  waves: [
    "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
    "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.json",
    "coordination/release-intake/latest-A25-wave03-shell-dashboard-roadmap-readiness.json",
    "coordination/release-intake/latest-A25-wave04-practice-lesson-content-readiness.json",
    "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.json",
    "coordination/release-intake/latest-A25-wave06-final-root-lifecycle-readiness.json"
  ],
  latestJson: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-readiness-blocker-matrix.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-readiness-blocker-matrix.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizePhysicalApprovalIds(values) {
  return (values ?? []).map((item) => (typeof item === "string" ? item : item.approvalId)).filter(Boolean);
}

function authorizationGateStableState(gate) {
  return {
    authorizationFile: gate.authorizationFile ?? "",
    authorizationFilePresent: gate.authorizationFilePresent === true,
    templateRows: Number(gate.templateRows ?? 0),
    authorizationRowsInFile: Number(gate.authorizationRowsInFile ?? 0),
    authorizedRows: Number(gate.authorizedRows ?? 0),
    pendingRows: Number(gate.pendingRows ?? 0),
    cleanupAuthorizedRows: Number(gate.cleanupAuthorizedRows ?? 0),
    executableRows: Number(gate.executableRows ?? 0),
    dirtyMapStatusSignature: gate.dirtyMapStatusSignature ?? "",
    expandedStatusEntries: Number(gate.expandedStatusEntries ?? 0),
    failures: gate.failures ?? []
  };
}

function postCleanBridgeCurrent(artifact, dirtyMap) {
  const summary = artifact.summary ?? {};
  if (artifact.verificationStatus !== "post-clean-verified") return false;
  if (summary.postCleanVerified !== true) return false;
  if (Number(summary.targetRows ?? 0) !== 6) return false;
  if (Number(summary.targetDirtyRows ?? -1) !== 0) return false;
  if (Number(summary.targetAlreadyCleanRows ?? 0) !== 6) return false;
  if (Number(summary.cleanupAuthorizedRows ?? -1) !== 0) return false;
  if (Number(summary.executableRows ?? -1) !== 0) return false;
  const targetsRemainClean = (artifact.targetRows ?? []).every((row) => {
    if (!row.cwd || !row.packageFile) return false;
    const status = git(["status", "--short", "--", row.packageFile], row.cwd);
    return status === "";
  });
  const staged = git(["diff", "--cached", "--name-only"], root);
  return targetsRemainClean && staged === "" && Number(dirtyMap.statusCounts?.expandedStatusEntries ?? 0) >= 0;
}

function checkSummary(checks) {
  const rows = Object.entries(checks ?? {}).map(([name, check]) => ({
    name,
    command: check.command ?? "",
    status: typeof check.status === "number" ? check.status : null,
    passed: check.passed === true,
    skipped: check.skipped === true
  }));
  return {
    checks: rows,
    checkCount: rows.length,
    passedChecks: rows.filter((row) => row.passed).length,
    failedChecks: rows.filter((row) => !row.passed && !row.skipped).length,
    skippedChecks: rows.filter((row) => row.skipped).length,
    failedCheckNames: rows.filter((row) => !row.passed && !row.skipped).map((row) => row.name),
    skippedCheckNames: rows.filter((row) => row.skipped).map((row) => row.name)
  };
}

function typeCheckSummary(typeCheck) {
  const summary = typeCheck?.summary ?? {};
  return {
    passed: typeCheck?.passed === true,
    status: typeof typeCheck?.status === "number" ? typeCheck.status : null,
    skipped: typeCheck?.skipped === true,
    errorLines: summary.errorLines ?? 0,
    topFiles: (summary.topFiles ?? []).slice(0, 10).map((row) => ({
      file: row.file,
      errors: row.errors
    })),
    firstErrors: (summary.firstErrors ?? []).slice(0, 5)
  };
}

function ownerApprovalRows(ownerQueue, approvalIds) {
  const byId = new Map((ownerQueue.ownerPackageQueue ?? []).map((row) => [row.approvalId, row]));
  return approvalIds.map((approvalId) => byId.get(approvalId)).filter(Boolean).map((row) => ({
    approvalId: row.approvalId,
    owner: row.owner,
    entries: row.entries,
    packageKind: row.packageKind,
    pathspec: row.pathspec,
    workOrder: row.workOrder,
    currentBlocker: row.currentBlocker,
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  }));
}

function physicalApprovalRows(physicalQueue, approvalIds, worktreeBranch) {
  const byId = new Map((physicalQueue.physicalLifecycleQueue ?? []).map((row) => [row.approvalId, row]));
  const byBranch = new Map((physicalQueue.physicalLifecycleQueue ?? []).map((row) => [row.branch, row]));
  const explicit = approvalIds.map((approvalId) => byId.get(approvalId)).filter(Boolean);
  const matched = worktreeBranch ? byBranch.get(worktreeBranch) : null;
  const rows = unique([...explicit, matched].filter(Boolean).map((row) => row.approvalId))
    .map((approvalId) => byId.get(approvalId))
    .filter(Boolean);
  return rows.map((row) => ({
    approvalId: row.approvalId,
    queueKind: row.queueKind,
    branch: row.branch,
    path: row.path,
    state: row.state,
    currentBlocker: row.currentBlocker,
    ownerHints: row.ownerHints ?? [],
    evidence: row.evidence ?? [],
    requiredAuthorizationText: row.requiredAuthorizationText,
    postApprovalChecks: row.postApprovalChecks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  }));
}

function baseRow({ wave, packageId, packageName, sourceKind, owners, approvalIds, physicalApprovalIds, readiness, item, ownerQueue, physicalQueue }) {
  const checks = checkSummary(item.checks);
  const typeCheck = typeCheckSummary(item.typeCheck);
  const ownerApprovals = ownerApprovalRows(ownerQueue, approvalIds);
  const physicalApprovals = physicalApprovalRows(physicalQueue, physicalApprovalIds, item.worktree?.branch);
  const coverage = item.pathspecCoverage ?? {};
  const pathspecs = item.pathspecs ?? {};
  const blockingReasons = item.blockingReasons ?? [];
  return {
    matrixId: `${wave.waveId}:${packageId}`,
    sourceKind,
    waveId: wave.waveId,
    waveName: wave.name,
    packageId,
    packageName,
    owners,
    approvalIds,
    physicalLifecycleApprovalIds: physicalApprovals.map((row) => row.approvalId),
    worktree: item.worktree ?? null,
    pathspecFiles: pathspecs.files ?? [],
    pathspecChecksum: pathspecs.checksum ?? null,
    allowedPathCount: pathspecs.allowedPaths ?? null,
    statusEntries: coverage.statusEntries ?? 0,
    coveredEntries: coverage.coveredEntries ?? 0,
    uncoveredEntries: coverage.uncoveredEntries ?? 0,
    uncoveredPaths: (coverage.uncovered ?? []).map((row) => row.path),
    readiness,
    readyForReviewedCommit: readiness === "ready",
    checkCount: checks.checkCount,
    passedChecks: checks.passedChecks,
    failedChecks: checks.failedChecks,
    skippedChecks: checks.skippedChecks,
    failedCheckNames: checks.failedCheckNames,
    skippedCheckNames: checks.skippedCheckNames,
    checks: checks.checks,
    typeCheck,
    typeCheckErrorLines: typeCheck.errorLines,
    blockingReasons,
    packageResyncRecommendations: item.packageResyncRecommendations ?? [],
    ownerApprovals,
    physicalLifecycleApprovals: physicalApprovals,
    requiredAuthorizationTexts: [
      ...ownerApprovals.map((row) => row.requiredAuthorizationText),
      ...physicalApprovals.map((row) => row.requiredAuthorizationText)
    ].filter(Boolean),
    postApprovalChecks: unique([
      ...ownerApprovals.flatMap((row) => row.postApprovalChecks ?? []),
      ...physicalApprovals.flatMap((row) => row.postApprovalChecks ?? [])
    ]),
    cleanupAuthorized: false,
    executableNow: false
  };
}

function rowsForWave(waveArtifact, ownerQueue, physicalQueue) {
  const wave = waveArtifact.wave;
  if ((waveArtifact.packages ?? []).length > 0) {
    return waveArtifact.packages.map((pkg) => baseRow({
      wave,
      packageId: pkg.packageId,
      packageName: pkg.name,
      sourceKind: "owner-package-readiness",
      owners: pkg.owners ?? [],
      approvalIds: pkg.approvalIds ?? [],
      physicalApprovalIds: [],
      readiness: pkg.ready === true ? "ready" : "blocked",
      item: pkg,
      ownerQueue,
      physicalQueue
    }));
  }

  if (wave.waveId === "wave-06-final-root-and-compose-lifecycle") {
    return [baseRow({
      wave,
      packageId: "wave-06-final-root-and-compose-lifecycle",
      packageName: wave.name,
      sourceKind: "physical-lifecycle-readiness",
      owners: ["A25 git hygiene and release intake", "A22 production reliability and release engineering"],
      approvalIds: [],
      physicalApprovalIds: normalizePhysicalApprovalIds(wave.physicalLifecycleApprovals),
      readiness: waveArtifact.finalClosureReady === true ? "ready" : "blocked",
      item: {
        checks: waveArtifact.checks,
        typeCheck: null,
        pathspecCoverage: null,
        pathspecs: null,
        blockingReasons: waveArtifact.blockingReasons ?? []
      },
      ownerQueue,
      physicalQueue
    })];
  }

  return [baseRow({
    wave,
    packageId: wave.waveId,
    packageName: wave.name,
    sourceKind: "owner-package-readiness",
    owners: ownerApprovalRows(ownerQueue, wave.ownerApprovals ?? []).map((row) => row.owner),
    approvalIds: wave.ownerApprovals ?? [],
    physicalApprovalIds: normalizePhysicalApprovalIds(wave.physicalLifecycleApprovals),
    readiness: waveArtifact.commitReady === true ? "ready" : "blocked",
    item: waveArtifact,
    ownerQueue,
    physicalQueue
  })];
}

function wave01FrontierSeed({ wave01, authorizationsGate, artifactCleanApprovalCapsule, artifactCleanPostCleanVerificationPlan, packageResyncAcceptanceDocket }) {
  const wave01Checks = wave01.checks ?? {};
  const approvalSummary = artifactCleanApprovalCapsule.summary ?? {};
  const postCleanSummary = artifactCleanPostCleanVerificationPlan.summary ?? {};
  const acceptanceSummary = packageResyncAcceptanceDocket.summary ?? {};
  const authorizedRows = Number(authorizationsGate.authorizedRows ?? acceptanceSummary.authorizedRows ?? 0);
  const heldRows = Number(approvalSummary.heldRows ?? 0);
  const cleanApprovalRows = Number(approvalSummary.cleanApprovalRows ?? authorizedRows);
  const artifactCleanPostCleanVerified =
    postCleanSummary.postCleanVerified === true &&
    Number(postCleanSummary.targetRows ?? 0) === 6 &&
    Number(postCleanSummary.targetDirtyRows ?? -1) === 0 &&
    Number(postCleanSummary.targetAlreadyCleanRows ?? 0) === 6;
  const cleanupAuthorizedRows =
    Number(authorizationsGate.cleanupAuthorizedRows ?? 0) +
    Number(approvalSummary.cleanupAuthorizedRows ?? 0) +
    Number(postCleanSummary.cleanupAuthorizedRows ?? 0) +
    Number(acceptanceSummary.cleanupAuthorizedRows ?? 0);
  const executableRows =
    Number(authorizationsGate.executableRows ?? 0) +
    Number(approvalSummary.executableRows ?? 0) +
    Number(postCleanSummary.executableRows ?? 0) +
    Number(acceptanceSummary.executableRows ?? 0);
  const reasons = [];

  if (heldRows > 0) {
    reasons.push(`${heldRows} held package-resync row remains: wave01-resync-01-tsconfig-json`);
  }
  if (!artifactCleanPostCleanVerified && cleanApprovalRows < 6) {
    reasons.push(`${6 - cleanApprovalRows} A25 artifact-clean row(s) still need owner authorization`);
  }
  if (!artifactCleanPostCleanVerified && cleanApprovalRows > 0) {
    reasons.push(`${cleanApprovalRows} owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction`);
  }
  if (wave01Checks.highAudit?.passed === false) {
    reasons.push(wave01Checks.highAudit?.timedOut === true ? "npm audit --audit-level=high timed out" : "npm audit --audit-level=high failed or unavailable");
  }
  if (wave01Checks.releaseHelperTests?.passed === false) {
    reasons.push(wave01Checks.releaseHelperTests?.timedOut === true ? "release helper tests timed out" : "release helper tests failed");
  }
  if (wave01Checks.typeCheck?.passed === false) {
    reasons.push(wave01Checks.typeCheck?.timedOut === true ? "npm run type-check timed out" : "npm run type-check failed");
  }

  return {
    generatedAt: [
      JSON.stringify(authorizationGateStableState(authorizationsGate)),
      artifactCleanApprovalCapsule.generatedAt,
      artifactCleanPostCleanVerificationPlan.generatedAt,
      packageResyncAcceptanceDocket.generatedAt
    ].filter(Boolean).join("|"),
    frontierStatus:
      artifactCleanPostCleanVerified
        ? "post-clean-verified"
        : cleanApprovalRows === 6 && heldRows === 1
        ? "waiting-for-owner-execution-instruction"
        : "blocked-by-package-authorization",
    normalizedBlockingReasons: reasons,
    summary: {
      cleanApprovalRows,
      artifactCleanPostCleanVerified,
      targetDirtyRows: artifactCleanPostCleanVerified ? 0 : cleanApprovalRows,
      targetAlreadyCleanRows: artifactCleanPostCleanVerified ? 6 : 0,
      heldRows,
      validInstructionRows: 0,
      cleanupAuthorizedRows,
      executableRows
    },
    evidence: [
      paths.wave01AuthorizationsGate,
      paths.wave01ArtifactCleanApprovalCapsule,
      paths.wave01ArtifactCleanPostCleanVerificationPlan,
      paths.wave01PackageResyncAcceptanceDocket
    ]
  };
}

function applyWave01Frontier(rows, wave01Frontier) {
  return rows.map((row) => {
    if (row.waveId !== "wave-01-governance-release-hygiene") return row;
    return {
      ...row,
      blockingReasons: wave01Frontier.normalizedBlockingReasons ?? row.blockingReasons,
      wave01FrontierGeneratedAt: wave01Frontier.generatedAt,
      wave01FrontierStatus: wave01Frontier.frontierStatus,
      wave01ArtifactCleanAuthorizedRows: wave01Frontier.summary.cleanApprovalRows,
      wave01ArtifactCleanTargetDirtyRows: wave01Frontier.summary.targetDirtyRows,
      wave01HeldRows: wave01Frontier.summary.heldRows,
      wave01ValidExecutionInstructionRows: wave01Frontier.summary.validInstructionRows,
      wave01CleanupAuthorizedRows: wave01Frontier.summary.cleanupAuthorizedRows,
      wave01ExecutableRows: wave01Frontier.summary.executableRows,
      wave01FrontierEvidence: wave01Frontier.evidence ?? []
    };
  });
}

function summarize(rows) {
  const topFiles = new Map();
  for (const row of rows) {
    for (const file of row.typeCheck.topFiles ?? []) {
      topFiles.set(file.file, (topFiles.get(file.file) ?? 0) + file.errors);
    }
  }
  return {
    rows: rows.length,
    readyRows: rows.filter((row) => row.readiness === "ready").length,
    blockedRows: rows.filter((row) => row.readiness !== "ready").length,
    ownerPackageRows: rows.filter((row) => row.sourceKind === "owner-package-readiness").length,
    physicalLifecycleRows: rows.filter((row) => row.sourceKind === "physical-lifecycle-readiness").length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length,
    statusEntries: rows.reduce((sum, row) => sum + row.statusEntries, 0),
    uncoveredEntries: rows.reduce((sum, row) => sum + row.uncoveredEntries, 0),
    failedChecks: rows.reduce((sum, row) => sum + row.failedChecks, 0),
    skippedChecks: rows.reduce((sum, row) => sum + row.skippedChecks, 0),
    typeCheckErrorLines: rows.reduce((sum, row) => sum + row.typeCheckErrorLines, 0),
    topTypeCheckFiles: [...topFiles.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 12)
      .map(([file, errors]) => ({ file, errors }))
  };
}

function escapeTable(value) {
  return String(value ?? "n/a").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdown(payload) {
  const overviewRows = payload.rows.map((row) => `| \`${escapeTable(row.waveId)}\` | \`${escapeTable(row.packageId)}\` | ${escapeTable(row.owners.join(", ") || "n/a")} | ${row.readiness} | ${row.statusEntries} | ${row.failedChecks} | ${row.typeCheckErrorLines} | ${row.uncoveredEntries} |`).join("\n");
  const details = payload.rows.map((row) => `## ${row.packageName}

- Matrix ID: \`${row.matrixId}\`
- Source kind: ${row.sourceKind}
- Owners: ${row.owners.join(", ") || "n/a"}
- Owner approval IDs: ${row.approvalIds.length > 0 ? row.approvalIds.map((item) => `\`${item}\``).join(", ") : "n/a"}
- Physical lifecycle approval IDs: ${row.physicalLifecycleApprovalIds.length > 0 ? row.physicalLifecycleApprovalIds.map((item) => `\`${item}\``).join(", ") : "n/a"}
- Worktree: ${row.worktree?.path ? `\`${row.worktree.path}\`` : "n/a"}
- Branch: ${row.worktree?.branch ? `\`${row.worktree.branch}\`` : "n/a"}
- Status entries: ${row.statusEntries}
- Covered / uncovered: ${row.coveredEntries} / ${row.uncoveredEntries}
- Wave01 frontier: ${row.wave01FrontierStatus ? `${row.wave01FrontierStatus}; artifact-clean authorized=${row.wave01ArtifactCleanAuthorizedRows}; held=${row.wave01HeldRows}; valid execution instructions=${row.wave01ValidExecutionInstructionRows}` : "n/a"}
- Wave01 frontier evidence: ${row.wave01FrontierEvidence ? `\`${row.wave01FrontierEvidence}\`` : "n/a"}
- Failed checks: ${row.failedCheckNames.length > 0 ? row.failedCheckNames.join(", ") : "none"}
- Type-check error lines: ${row.typeCheckErrorLines}
- Blocking reasons: ${row.blockingReasons.length > 0 ? row.blockingReasons.join("; ") : "none"}
- Pathspecs:
${row.pathspecFiles.length > 0 ? row.pathspecFiles.map((item) => `  - \`${item}\``).join("\n") : "  - n/a"}
- Required authorization text:
${row.requiredAuthorizationTexts.length > 0 ? row.requiredAuthorizationTexts.map((item) => `  - ${item}`).join("\n") : "  - n/a"}
- Post-approval checks:
${row.postApprovalChecks.length > 0 ? row.postApprovalChecks.map((item) => `  - \`${item}\``).join("\n") : "  - n/a"}
`).join("\n");

  return `# A25 Owner Package Readiness Blocker Matrix

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is readiness and blocker evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, or any other physical cleanup.

## Summary

- Matrix rows: ${payload.summary.rows}
- Ready rows: ${payload.summary.readyRows}
- Blocked rows: ${payload.summary.blockedRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Failed checks: ${payload.summary.failedChecks}
- Type-check error lines: ${payload.summary.typeCheckErrorLines}

| Wave | Package | Owners | Readiness | Status entries | Failed checks | Type errors | Uncovered |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
${overviewRows}

${details}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalQueue = readJson(paths.physicalQueue);
  const waves = paths.waves.map((wavePath) => readJson(wavePath));
  const wave01AuthorizationsGate = readJson(paths.wave01AuthorizationsGate);
  const wave01ArtifactCleanApprovalCapsule = readJson(paths.wave01ArtifactCleanApprovalCapsule);
  const wave01ArtifactCleanPostCleanVerificationPlan = readJson(paths.wave01ArtifactCleanPostCleanVerificationPlan);
  const wave01PackageResyncAcceptanceDocket = readJson(paths.wave01PackageResyncAcceptanceDocket);

  for (const [label, artifact] of [
    ["owner package approvals", ownerApprovals],
    ["physical closure queue", physicalQueue],
    ["Wave01 owner authorizations gate", wave01AuthorizationsGate],
    ["Wave01 artifact-clean approval capsule", wave01ArtifactCleanApprovalCapsule],
    ["Wave01 artifact-clean post-clean verification plan", wave01ArtifactCleanPostCleanVerificationPlan],
    ["Wave01 package resync acceptance docket", wave01PackageResyncAcceptanceDocket],
    ...waves.map((wave, index) => [`wave ${index + 1}`, wave])
  ]) {
    if (
      label === "Wave01 artifact-clean post-clean verification plan" &&
      postCleanBridgeCurrent(artifact, dirtyMap)
    ) {
      continue;
    }
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      throw new Error(`${label} is stale relative to latest dirty map.`);
    }
  }

  const rows = applyWave01Frontier(
    waves.flatMap((wave) => rowsForWave(wave, physicalQueue, physicalQueue)),
    wave01FrontierSeed({
      wave01: waves[0],
      authorizationsGate: wave01AuthorizationsGate,
      artifactCleanApprovalCapsule: wave01ArtifactCleanApprovalCapsule,
      artifactCleanPostCleanVerificationPlan: wave01ArtifactCleanPostCleanVerificationPlan,
      packageResyncAcceptanceDocket: wave01PackageResyncAcceptanceDocket
    })
  );
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    ownerPackageApprovalRequestsGeneratedAt: ownerApprovals.generatedAt,
    physicalClosureAuthorizationQueueGeneratedAt: physicalQueue.generatedAt,
    wave01FrontierSourceState: {
      authorizationsGate: authorizationGateStableState(wave01AuthorizationsGate),
      artifactCleanPostCleanBridgeCurrent: postCleanBridgeCurrent(wave01ArtifactCleanPostCleanVerificationPlan, dirtyMap)
    },
    wave01FrontierSourceGeneratedAt: {
      artifactCleanApprovalCapsuleGeneratedAt: wave01ArtifactCleanApprovalCapsule.generatedAt,
      artifactCleanPostCleanVerificationPlanGeneratedAt: wave01ArtifactCleanPostCleanVerificationPlan.generatedAt,
      packageResyncAcceptanceDocketGeneratedAt: wave01PackageResyncAcceptanceDocket.generatedAt
    },
    waveGeneratedAt: Object.fromEntries(waves.map((wave) => [wave.wave.waveId, wave.generatedAt])),
    note: "Readiness and blocker evidence only. A separate explicit owner instruction is required for any Git or physical cleanup operation.",
    summary: summarize(rows),
    rows
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
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    rows: payload.summary.rows,
    readyRows: payload.summary.readyRows,
    blockedRows: payload.summary.blockedRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
