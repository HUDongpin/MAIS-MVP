#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  wave01Readiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  artifactCleanApprovalCapsule: "coordination/release-intake/latest-A25-wave01-a25-artifact-clean-owner-approval-capsule.json",
  packageResyncAcceptanceDocket: "coordination/release-intake/latest-A25-wave01-package-resync-owner-acceptance-docket.json",
  executionInstructionReadiness: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-readiness.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-governance-frontier-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-governance-frontier-readiness.md`
};

function git(args, cwd) {
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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function currentness(artifact, dirtyMap, label) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const signature = artifact.dirtyMapStatusSignature ?? artifact.statusSignature ?? artifact.dirtyMap?.statusSignature ?? null;
  const entries = artifact.expandedStatusEntries ?? artifact.statusCounts?.expandedStatusEntries ?? artifact.dirtyMap?.expandedStatusEntries ?? null;
  return {
    label,
    generatedAt: artifact.generatedAt ?? artifact.checkedAt ?? null,
    dirtyMapStatusSignature: signature,
    expandedStatusEntries: entries,
    signatureMatches: signature === expectedSignature,
    entryCountMatches: entries === expectedEntries,
    current: signature === expectedSignature && entries === expectedEntries
  };
}

function check(id, passed, detail) {
  return {
    id,
    status: passed ? "pass" : "fail",
    detail
  };
}

function frontierStatus(summary) {
  if (summary.sourceCurrentnessFailures > 0) return "blocked-stale-source";
  if (summary.postCleanVerificationStatus === "post-clean-verified") return "post-clean-verified";
  if (summary.validInstructionRows >= summary.requestRows && summary.targetDirtyRows > 0) return "ready-for-guarded-clean-apply";
  if (summary.cleanApprovalRows === 6 && summary.heldRows === 1 && summary.targetDirtyRows > 0) {
    return "waiting-for-owner-execution-instruction";
  }
  return "blocked-by-package-authorization";
}

function normalizedBlockingReasons(summary, wave01Checks) {
  const reasons = [];
  if (summary.sourceCurrentnessFailures > 0) {
    reasons.push(`${summary.sourceCurrentnessFailures} Wave01 frontier source artifact(s) are stale`);
  }
  if (summary.heldRows > 0) {
    reasons.push(`${summary.heldRows} held package-resync row remains: wave01-resync-01-tsconfig-json`);
  }
  if (summary.cleanApprovalRows < 6) {
    reasons.push(`${6 - summary.cleanApprovalRows} A25 artifact-clean row(s) still need owner authorization`);
  }
  if (summary.targetDirtyRows > 0 && summary.validInstructionRows < summary.requestRows) {
    reasons.push(`${summary.targetDirtyRows} owner-authorized Wave01 artifact-clean row(s) still need separate execution instruction`);
  }
  if (wave01Checks.highAudit?.passed === false) {
    const timedOut = wave01Checks.highAudit?.timedOut === true;
    reasons.push(timedOut ? "npm audit --audit-level=high timed out" : "npm audit --audit-level=high failed or unavailable");
  }
  if (wave01Checks.releaseHelperTests?.passed === false) {
    const timedOut = wave01Checks.releaseHelperTests?.timedOut === true;
    reasons.push(timedOut ? "release helper tests timed out" : "release helper tests failed");
  }
  if (wave01Checks.typeCheck?.passed === false) {
    const timedOut = wave01Checks.typeCheck?.timedOut === true;
    reasons.push(timedOut ? "npm run type-check timed out" : "npm run type-check failed");
  }
  return reasons;
}

function markdown(payload) {
  const checkRows = payload.checks.map((row) => `| ${row.id} | ${row.status} | ${row.detail} |`).join("\n");
  const blockerRows = payload.normalizedBlockingReasons.map((reason) => `- ${reason}`).join("\n") || "- none";
  return `# A25 Wave01 Governance Frontier Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is frontier evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any physical cleanup.

## Result

- Frontier status: ${payload.frontierStatus}
- Commit ready: ${payload.commitReady ? "yes" : "no"}
- Package-only rows in A25 governance worktree: ${payload.summary.packageOnlyRows}
- A25 artifact-clean authorized rows: ${payload.summary.cleanApprovalRows}
- Held rows: ${payload.summary.heldRows}
- Target dirty artifact-clean rows: ${payload.summary.targetDirtyRows}
- Valid owner execution instruction rows: ${payload.summary.validInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Deploy authorized: ${payload.summary.deployAuthorized ? "yes" : "no"}

## Normalized Blocking Reasons

${blockerRows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const wave01 = readJson(paths.wave01Readiness);
  const cleanApproval = readJson(paths.artifactCleanApprovalCapsule);
  const acceptance = readJson(paths.packageResyncAcceptanceDocket);
  const executionReadiness = readJson(paths.executionInstructionReadiness);

  const sourceCurrentness = [
    currentness(wave01, dirtyMap, "wave01-governance-readiness"),
    currentness(cleanApproval, dirtyMap, "artifact-clean-owner-approval-capsule"),
    currentness(acceptance, dirtyMap, "package-resync-owner-acceptance-docket"),
    currentness(executionReadiness, dirtyMap, "artifact-clean-execution-instruction-readiness")
  ];

  const acceptanceSummary = acceptance.summary ?? {};
  const cleanSummary = cleanApproval.summary ?? {};
  const executionSummary = executionReadiness.summary ?? {};
  const wave01Coverage = wave01.packageResyncCoverage ?? {};
  const wave01Checks = wave01.checks ?? {};

  const summary = {
    packageOnlyRows: count(wave01Coverage.packageOnlyRows),
    originalOwnerAuthorizationRequiredRows: count(wave01Coverage.ownerAuthorizationRequiredRows),
    packageAcceptanceRows: count(acceptanceSummary.rowCount),
    packageAuthorizedRows: count(acceptanceSummary.authorizedRows),
    packagePendingRows: count(acceptanceSummary.pendingRows),
    cleanApprovalRows: count(cleanSummary.cleanApprovalRows),
    heldRows: count(cleanSummary.heldRows),
    requestRows: count(executionSummary.requestRows),
    acceptanceRows: count(executionSummary.acceptanceRows),
    targetRows: count(executionSummary.targetRows),
    targetDirtyRows: count(executionSummary.targetDirtyRows),
    targetAlreadyCleanRows: count(executionSummary.targetAlreadyCleanRows),
    validInstructionRows: count(executionSummary.validInstructionRows),
    readinessStatus: executionReadiness.readinessStatus ?? executionSummary.readinessStatus ?? "unknown",
    recorderStatus: executionSummary.recorderStatus ?? "unknown",
    executorStatus: executionSummary.executorStatus ?? "unknown",
    postCleanVerificationStatus: executionSummary.postCleanVerificationStatus ?? "unknown",
    sourceCurrentnessFailures: sourceCurrentness.filter((row) => !row.current).length,
    cleanupAuthorizedRows:
      count(cleanSummary.cleanupAuthorizedRows) +
      count(acceptanceSummary.cleanupAuthorizedRows) +
      count(executionSummary.cleanupAuthorizedRows),
    executableRows:
      count(cleanSummary.executableRows) +
      count(acceptanceSummary.executableRows) +
      count(executionSummary.executableRows),
    deployAuthorized: cleanApproval.boundary?.deployAuthorized === true || acceptance.boundary?.deployAuthorized === true || executionReadiness.boundary?.deployAuthorized === true
  };
  const status = frontierStatus(summary);
  const reasons = normalizedBlockingReasons(summary, wave01Checks);
  const checks = [
    check("source-current", summary.sourceCurrentnessFailures === 0, `failures=${summary.sourceCurrentnessFailures}`),
    check(
      "authorization-frontier-normalized",
      summary.cleanApprovalRows === 6 && summary.heldRows === 1 && summary.packageAuthorizedRows === 6,
      `cleanApprovalRows=${summary.cleanApprovalRows}; heldRows=${summary.heldRows}; packageAuthorizedRows=${summary.packageAuthorizedRows}`
    ),
    check(
      "execution-instruction-frontier",
      summary.requestRows === 6 && summary.targetDirtyRows === 6 && summary.validInstructionRows === 0,
      `requestRows=${summary.requestRows}; targetDirtyRows=${summary.targetDirtyRows}; validInstructionRows=${summary.validInstructionRows}`
    ),
    check(
      "tsconfig-hold-preserved",
      summary.heldRows === 1 && (cleanApproval.boundary?.heldTsconfigRestore === true),
      `heldRows=${summary.heldRows}; heldTsconfigRestore=${cleanApproval.boundary?.heldTsconfigRestore === true}`
    ),
    check(
      "non-executable-boundary",
      summary.cleanupAuthorizedRows === 0 && summary.executableRows === 0 && summary.deployAuthorized === false,
      `cleanupAuthorizedRows=${summary.cleanupAuthorizedRows}; executableRows=${summary.executableRows}; deployAuthorized=${summary.deployAuthorized}`
    )
  ];
  const payload = {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    frontierKind: "wave01-governance-frontier-readiness",
    frontierStatus: status,
    sourceArtifacts: {
      wave01ReadinessGeneratedAt: wave01.generatedAt ?? null,
      artifactCleanApprovalCapsuleGeneratedAt: cleanApproval.generatedAt ?? null,
      packageResyncAcceptanceDocketGeneratedAt: acceptance.generatedAt ?? null,
      executionInstructionReadinessGeneratedAt: executionReadiness.generatedAt ?? null
    },
    sourceCurrentness,
    summary,
    normalizedBlockingReasons: reasons,
    checks,
    commitReady: reasons.length === 0 && checks.every((row) => row.status === "pass"),
    boundary: {
      evidenceOnly: true,
      frontierOnly: true,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: status === "waiting-for-owner-execution-instruction",
      requiresSeparateGuardedExecutorApply: status === "ready-for-guarded-clean-apply"
    }
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, markdown(payload));
  write(paths.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    frontierStatus: payload.frontierStatus,
    commitReady: payload.commitReady,
    normalizedBlockingReasons: payload.normalizedBlockingReasons.length,
    targetDirtyRows: payload.summary.targetDirtyRows,
    validInstructionRows: payload.summary.validInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
