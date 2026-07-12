#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-owner-package-readiness-blocker-matrix-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerApprovals: "coordination/release-intake/latest-A25-owner-package-approval-requests.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  a16PostExtractionVerification: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
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
  matrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  markdown: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.md"
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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
  return unique([...explicit, matched].filter(Boolean).map((row) => row.approvalId))
    .map((approvalId) => byId.get(approvalId))
    .filter(Boolean)
    .map((row) => ({
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
    blockingReasons: item.blockingReasons ?? [],
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

function expectedRows(waves, ownerQueue, physicalQueue, wave01Frontier) {
  return applyWave01Frontier(
    waves.flatMap((wave) => rowsForWave(wave, ownerQueue, physicalQueue)),
    wave01Frontier
  );
}

function summarize(rows) {
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
    typeCheckErrorLines: rows.reduce((sum, row) => sum + row.typeCheckErrorLines, 0)
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package readiness blocker matrix gate");
    console.log(`Rows: ${payload.rows ?? 0}`);
    console.log(`Blocked rows: ${payload.blockedRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package readiness blocker matrix gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of [
    paths.dirtyMap,
    paths.ownerApprovals,
    paths.physicalQueue,
    paths.a16PostExtractionVerification,
    paths.wave01AuthorizationsGate,
    paths.wave01ArtifactCleanApprovalCapsule,
    paths.wave01ArtifactCleanPostCleanVerificationPlan,
    paths.wave01PackageResyncAcceptanceDocket,
    paths.matrix,
    paths.markdown,
    ...paths.waves
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, rows: 0, blockedRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const ownerApprovals = readJson(paths.ownerApprovals);
  const physicalQueue = readJson(paths.physicalQueue);
  const a16PostExtractionVerification = readJson(paths.a16PostExtractionVerification);
  const wave01AuthorizationsGate = readJson(paths.wave01AuthorizationsGate);
  const wave01ArtifactCleanApprovalCapsule = readJson(paths.wave01ArtifactCleanApprovalCapsule);
  const wave01ArtifactCleanPostCleanVerificationPlan = readJson(paths.wave01ArtifactCleanPostCleanVerificationPlan);
  const wave01PackageResyncAcceptanceDocket = readJson(paths.wave01PackageResyncAcceptanceDocket);
  const waves = paths.waves.map((wavePath) => readJson(wavePath));
  const matrix = readJson(paths.matrix);
  const expected = expectedRows(
    waves,
    physicalQueue,
    physicalQueue,
    wave01FrontierSeed({
      wave01: waves[0],
      authorizationsGate: wave01AuthorizationsGate,
      artifactCleanApprovalCapsule: wave01ArtifactCleanApprovalCapsule,
      artifactCleanPostCleanVerificationPlan: wave01ArtifactCleanPostCleanVerificationPlan,
      packageResyncAcceptanceDocket: wave01PackageResyncAcceptanceDocket
    })
  );
  const expectedById = new Map(expected.map((row) => [row.matrixId, row]));
  const rows = matrix.rows ?? [];
  const rowsById = new Map(rows.map((row) => [row.matrixId, row]));

  if (matrix.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("matrix dirty-map signature is stale");
  if (matrix.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("matrix expanded status count is stale");
  if (matrix.ownerPackageApprovalRequestsGeneratedAt !== ownerApprovals.generatedAt) failures.push("matrix owner-package approval timestamp is stale");
  if (matrix.physicalClosureAuthorizationQueueGeneratedAt !== physicalQueue.generatedAt) failures.push("matrix physical-closure queue timestamp is stale");
  if (!sameJson(matrix.wave01FrontierSourceState?.authorizationsGate, authorizationGateStableState(wave01AuthorizationsGate))) failures.push("matrix Wave01 authorizations gate state is stale");
  if (matrix.wave01FrontierSourceGeneratedAt?.artifactCleanApprovalCapsuleGeneratedAt !== wave01ArtifactCleanApprovalCapsule.generatedAt) failures.push("matrix Wave01 artifact-clean approval timestamp is stale");
  if (matrix.wave01FrontierSourceGeneratedAt?.artifactCleanPostCleanVerificationPlanGeneratedAt !== wave01ArtifactCleanPostCleanVerificationPlan.generatedAt) failures.push("matrix Wave01 artifact-clean post-clean timestamp is stale");
  if (matrix.wave01FrontierSourceGeneratedAt?.packageResyncAcceptanceDocketGeneratedAt !== wave01PackageResyncAcceptanceDocket.generatedAt) failures.push("matrix Wave01 package acceptance timestamp is stale");
  for (const [label, artifact] of [
    ["Wave01 authorizations gate", wave01AuthorizationsGate],
    ["Wave01 artifact-clean approval capsule", wave01ArtifactCleanApprovalCapsule],
    ["Wave01 artifact-clean post-clean verification plan", wave01ArtifactCleanPostCleanVerificationPlan],
    ["Wave01 package resync acceptance docket", wave01PackageResyncAcceptanceDocket]
  ]) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} is stale relative to dirty map`);
    if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const wave of waves) {
    if (matrix.waveGeneratedAt?.[wave.wave.waveId] !== wave.generatedAt) failures.push(`matrix ${wave.wave.waveId} timestamp is stale`);
    if (wave.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${wave.wave.waveId} is stale relative to dirty map`);
  }

  if (rows.length !== expected.length) failures.push(`matrix row count mismatch: ${rows.length} rows, expected ${expected.length}`);
  for (const expectedRow of expected) {
    const row = rowsById.get(expectedRow.matrixId);
    if (!row) {
      failures.push(`missing matrix row: ${expectedRow.matrixId}`);
      continue;
    }
    for (const key of [
      "sourceKind",
      "waveId",
      "packageId",
      "packageName",
      "owners",
      "approvalIds",
      "physicalLifecycleApprovalIds",
      "pathspecFiles",
      "statusEntries",
      "coveredEntries",
      "uncoveredEntries",
      "uncoveredPaths",
      "readiness",
      "readyForReviewedCommit",
      "checkCount",
      "passedChecks",
      "failedChecks",
      "skippedChecks",
      "failedCheckNames",
      "skippedCheckNames",
      "typeCheckErrorLines",
      "blockingReasons",
      "wave01FrontierGeneratedAt",
      "wave01FrontierStatus",
      "wave01ArtifactCleanAuthorizedRows",
      "wave01ArtifactCleanTargetDirtyRows",
      "wave01HeldRows",
      "wave01ValidExecutionInstructionRows",
      "wave01CleanupAuthorizedRows",
      "wave01ExecutableRows",
      "wave01FrontierEvidence"
    ]) {
      if (!sameJson(row[key], expectedRow[key])) failures.push(`${expectedRow.matrixId}: ${key} is stale`);
    }
    if (!sameJson(row.typeCheck?.topFiles, expectedRow.typeCheck.topFiles)) failures.push(`${expectedRow.matrixId}: typeCheck top files are stale`);
    if (row.cleanupAuthorized !== false) failures.push(`${expectedRow.matrixId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${expectedRow.matrixId}: executableNow must be false`);
    if ((row.requiredAuthorizationTexts ?? []).length !== expectedRow.requiredAuthorizationTexts.length) {
      failures.push(`${expectedRow.matrixId}: required authorization text count is stale`);
    }
    const a16OwnerApprovalConsumed =
      expectedRow.matrixId === "wave-05-visualization-ai-runtime:a16-research-evidence" &&
      a16PostExtractionVerification.lifecycleStatus === "post-extraction-verified" &&
      a16PostExtractionVerification.summary?.postExtractionVerified === true &&
      (row.ownerApprovals ?? []).length === 0;
    if (!a16OwnerApprovalConsumed && (expectedRow.approvalIds ?? []).length > 0 && (row.ownerApprovals ?? []).length !== expectedRow.approvalIds.length) {
      failures.push(`${expectedRow.matrixId}: missing owner approval rows`);
    }
    if ((expectedRow.physicalLifecycleApprovalIds ?? []).length > 0 && (row.physicalLifecycleApprovals ?? []).length !== expectedRow.physicalLifecycleApprovalIds.length) {
      failures.push(`${expectedRow.matrixId}: missing physical lifecycle approval rows`);
    }
    for (const approvalRow of [...(row.ownerApprovals ?? []), ...(row.physicalLifecycleApprovals ?? [])]) {
      if (!approvalRow.requiredAuthorizationText) failures.push(`${expectedRow.matrixId}: ${approvalRow.approvalId} missing required authorization text`);
      if (!Array.isArray(approvalRow.postApprovalChecks) || approvalRow.postApprovalChecks.length === 0) {
        failures.push(`${expectedRow.matrixId}: ${approvalRow.approvalId} missing post-approval checks`);
      }
      if (approvalRow.cleanupAuthorized !== false) failures.push(`${expectedRow.matrixId}: ${approvalRow.approvalId} cleanupAuthorized must be false`);
      if (approvalRow.executableNow !== false) failures.push(`${expectedRow.matrixId}: ${approvalRow.approvalId} executableNow must be false`);
    }
  }
  for (const row of rows) {
    if (!expectedById.has(row.matrixId)) failures.push(`unexpected matrix row: ${row.matrixId}`);
  }

  const expectedSummary = summarize(expected);
  for (const [key, value] of Object.entries(expectedSummary)) {
    if (!sameJson(matrix.summary?.[key], value)) failures.push(`summary ${key} is stale`);
  }
  if (matrix.summary?.cleanupAuthorizedRows !== 0) failures.push("summary cleanupAuthorizedRows must be 0");
  if (matrix.summary?.executableRows !== 0) failures.push("summary executableRows must be 0");

  const markdown = fs.readFileSync(path.join(root, paths.markdown), "utf8");
  if (markdown.includes("undefined")) failures.push("matrix markdown contains undefined");
  if (!markdown.includes("This is readiness and blocker evidence only.")) failures.push("matrix markdown missing non-authorization boundary");
  if (markdown.includes("7 package-only dirty entries need owner-approved package resync authorization")) {
    failures.push("matrix markdown contains stale Wave01 broad authorization blocker");
  }
  const artifactCleanPostCleanVerified = wave01ArtifactCleanPostCleanVerificationPlan.summary?.postCleanVerified === true;
  if (!artifactCleanPostCleanVerified && !markdown.includes("six") && !markdown.includes("6 owner-authorized Wave01 artifact-clean row")) {
    failures.push("matrix markdown missing normalized Wave01 artifact-clean blocker");
  }
  if (artifactCleanPostCleanVerified && !markdown.includes("post-clean-verified")) {
    failures.push("matrix markdown missing Wave01 artifact-clean post-clean state");
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    rows: rows.length,
    readyRows: matrix.summary?.readyRows ?? null,
    blockedRows: matrix.summary?.blockedRows ?? null,
    cleanupAuthorizedRows: matrix.summary?.cleanupAuthorizedRows ?? null,
    executableRows: matrix.summary?.executableRows ?? null,
    failures
  });
}

main();
