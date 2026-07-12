#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_EXTRACTION_EXECUTION_READINESS_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  acceptanceDocket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  ownerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  ownerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  preExecutionReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  postExtractionReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  closeoutDocket: "coordination/release-intake/latest-A25-a16-extraction-closeout-docket.json",
  pathspec: "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  latestJson: "coordination/release-intake/latest-A25-a16-extraction-execution-readiness.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-extraction-execution-readiness.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-extraction-execution-readiness.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-extraction-execution-readiness.md`
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

function readLines(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8").split(/\r?\n/).filter(Boolean);
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function unique(values) {
  return Array.from(new Set(values ?? []));
}

function sameStringArray(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function gitStatusRows(paths) {
  const output = git(["status", "--short", "--", ...paths]);
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => ({
    status: line.slice(0, 2).trim() || line.slice(0, 2),
    rawStatus: line.slice(0, 2),
    path: line.slice(3)
  }));
}

function gitNameRows(args) {
  const output = git(args);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

function sourceCurrentnessFailures({ dirtyMap, requestPacket, acceptanceDocket, ownerInput, ownerInputGate, preExecution, postExtraction, closeout }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const verified = closeout.lifecycleStatus === "post-extraction-verified" &&
    closeout.postExtractionVerified === true &&
    postExtraction.lifecycleStatus === "post-extraction-verified" &&
    postExtraction.postExtractionVerified === true;
  const requiredCurrentSources = verified
    ? [
        ["A16 post-extraction verification report", postExtraction],
        ["A16 extraction closeout docket", closeout]
      ]
    : [
        ["next-owner execution instruction request packet", requestPacket],
        ["next-owner execution instruction acceptance docket", acceptanceDocket],
        ["A16 execution-instruction owner input", ownerInput],
        ["A16 pre-execution validation report", preExecution],
        ["A16 post-extraction verification report", postExtraction],
        ["A16 extraction closeout docket", closeout]
      ];
  for (const [label, payload] of requiredCurrentSources) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if (!verified) {
    if (ownerInputGate.dirtyMapStatusSignature !== expectedSignature) failures.push("A16 owner-input gate dirty-map signature is stale");
    if (ownerInputGate.expandedStatusEntries !== expectedEntries) failures.push("A16 owner-input gate expanded dirty entry count is stale");
  }
  if ((ownerInputGate.failures ?? []).length !== 0) failures.push("A16 owner-input gate has failures");
  return failures;
}

function readinessStatus({ sourceFailures, ownerInputGate, closeout }) {
  if (sourceFailures.length > 0) return "not-ready-source-stale";
  if (closeout.lifecycleStatus === "post-extraction-verified" && closeout.postExtractionVerified === true) return "post-extraction-verified";
  if ((ownerInputGate.validInstructionRows ?? 0) === 1) return "owner-execution-instruction-recorded-pre-extraction";
  return "waiting-for-owner-execution-instruction";
}

function buildChecks({ sourceFailures, requestPacket, acceptanceDocket, ownerInput, ownerInputGate, preExecution, postExtraction, closeout, pathspecRows, packageStatusRows, packageStagedRows, stagedRows, trackedDiffStat, exactCommands, status }) {
  const packageFiles = closeout.packageFiles ?? preExecution.packageFiles ?? [];
  const pending = status === "waiting-for-owner-execution-instruction" || status === "owner-execution-instruction-recorded-pre-extraction";
  const verified = status === "post-extraction-verified";
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "request-and-acceptance-ready",
      status: verified || ((
          requestPacket.summary?.readyInstructionRequestRows === 1 &&
          acceptanceDocket.summary?.acceptanceRows === 1
        ) || (
          requestPacket.summary?.readyInstructionRequestRows === 0 &&
          acceptanceDocket.summary?.acceptanceRows === 0 &&
          ownerInputGate.validInstructionRows === 1 &&
          acceptanceDocket.summary?.ownerInputValidInstructionRows === 1
        )) &&
        acceptanceDocket.summary?.passingAcceptanceChecks === acceptanceDocket.summary?.acceptanceChecks
        ? "pass"
        : "fail",
      detail: `request rows=${requestPacket.summary?.readyInstructionRequestRows ?? 0}; acceptance=${acceptanceDocket.summary?.passingAcceptanceChecks ?? 0}/${acceptanceDocket.summary?.acceptanceChecks ?? 0}`
    },
    {
      id: "pre-execution-validation-ready",
      status: preExecution.summary?.preExecutionValidationReady === true &&
        preExecution.summary?.passingChecks === preExecution.summary?.totalChecks
        ? "pass"
        : "fail",
      detail: `pre-execution=${preExecution.summary?.passingChecks ?? 0}/${preExecution.summary?.totalChecks ?? 0}`
    },
    {
      id: "pathspec-matches-a16-package",
      status: sameStringArray(pathspecRows, packageFiles) &&
        packageFiles.length === 6 &&
        packageFiles.every((filePath) => filePath.startsWith("coordination/research/"))
        ? "pass"
        : "fail",
      detail: `pathspec rows=${pathspecRows.length}; package files=${packageFiles.length}`
    },
    {
      id: "package-status-shape",
      status: (pending && packageStatusRows.length === 6 && packageStatusRows.every((row) => row.rawStatus === "??")) ||
        (verified && packageStatusRows.length === 0)
        ? "pass"
        : "fail",
      detail: `status=${status}; package dirty rows=${packageStatusRows.length}`
    },
    {
      id: "no-staged-entries-before-extraction",
      status: stagedRows.length === 0 && packageStagedRows.length === 0 ? "pass" : "fail",
      detail: `staged rows=${stagedRows.length}; package staged rows=${packageStagedRows.length}`
    },
    {
      id: "no-tracked-diff-in-a16-pathspec",
      status: trackedDiffStat.length === 0 ? "pass" : "fail",
      detail: trackedDiffStat.length === 0 ? "no tracked diff" : trackedDiffStat
    },
    {
      id: "two-exact-git-commands",
      status: exactCommands.length === 2 &&
        exactCommands[0] === "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" &&
        exactCommands[1] === "git commit -m \"Add A16 research evidence package\""
        ? "pass"
        : "fail",
      detail: `exact commands=${exactCommands.length}`
    },
    {
      id: "owner-execution-instruction-state-coherent",
      status: (ownerInputGate.instructionRows === 0 && ownerInputGate.validInstructionRows === 0) ||
        (ownerInputGate.instructionRows === 1 && ownerInputGate.validInstructionRows === 1)
        ? "pass"
        : "fail",
      detail: `owner input rows=${ownerInputGate.instructionRows ?? 0}; valid rows=${ownerInputGate.validInstructionRows ?? 0}`
    },
    {
      id: "closeout-shrink-expectation-present",
      status: closeout.summary?.expectedPackageDirtyRowsAfterExtraction === 0 &&
        closeout.summary?.expectedPackageDirtyRowReduction >= 0 &&
        closeout.summary?.failedAcceptanceChecks === 0
        ? "pass"
        : "fail",
      detail: `expected after extraction=${closeout.summary?.expectedPackageDirtyRowsAfterExtraction ?? "unknown"}; current=${closeout.summary?.currentPackageDirtyRows ?? "unknown"}`
    },
    {
      id: "post-extraction-verification-coherent",
      status: (pending && ["pending-owner-execution-instruction", "pending-extraction-execution"].includes(postExtraction.lifecycleStatus) && postExtraction.postExtractionVerified === false) ||
        (verified && postExtraction.lifecycleStatus === "post-extraction-verified" && postExtraction.postExtractionVerified === true)
        ? "pass"
        : "fail",
      detail: `lifecycle=${postExtraction.lifecycleStatus}; verified=${postExtraction.postExtractionVerified === true}`
    },
    {
      id: "fail-closed-boundary",
      status: ownerInput.cleanupAuthorized === false &&
        ownerInput.executableNow === false &&
        acceptanceDocket.summary?.cleanupAuthorizedRows === 0 &&
        acceptanceDocket.summary?.executableRows === 0 &&
        closeout.summary?.cleanupAuthorizedRows === 0 &&
        closeout.summary?.executableRows === 0
        ? "pass"
        : "fail",
      detail: "Readiness evidence does not authorize cleanup, broad staging, deploy, or automatic Git execution."
    }
  ];
}

export function buildA16ExtractionExecutionReadiness() {
  const dirtyMap = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.dirtyMap);
  const requestPacket = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.requestPacket);
  const acceptanceDocket = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.acceptanceDocket);
  const ownerInput = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.ownerInput);
  const ownerInputGate = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.ownerInputGate);
  const preExecution = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.preExecutionReport);
  const postExtraction = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.postExtractionReport);
  const closeout = readJson(A16_EXTRACTION_EXECUTION_READINESS_PATHS.closeoutDocket);
  const pathspecRows = readLines(A16_EXTRACTION_EXECUTION_READINESS_PATHS.pathspec);
  const packageFiles = closeout.packageFiles ?? preExecution.packageFiles ?? [];
  const packageStatusRows = gitStatusRows(packageFiles);
  const stagedRows = gitNameRows(["diff", "--cached", "--name-only"]);
  const packageStagedRows = gitNameRows(["diff", "--cached", "--name-only", "--", ...packageFiles]);
  const trackedDiffStat = git(["diff", "--stat", "--", ...packageFiles]);
  const ownerInstructionRow = (ownerInput.instructions ?? [])[0] ?? {};
  const a16AcceptanceRow = (acceptanceDocket.acceptanceRows ?? []).find((row) =>
    row.rowKind === "a16-authorized-extraction" ||
    row.sourceKind === "a16-authorized-extraction" ||
    (row.candidateId ?? "").includes("a16")
  ) ?? {};
  const exactCommands = ownerInstructionRow.exactCommandSequence ??
    ownerInstructionRow.commandSequence ??
    a16AcceptanceRow.exactCommandSequence ??
    [];
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    requestPacket,
    acceptanceDocket,
    ownerInput,
    ownerInputGate,
    preExecution,
    postExtraction,
    closeout
  });
  const status = readinessStatus({ sourceFailures, ownerInputGate, closeout });
  const checks = buildChecks({
    sourceFailures,
    requestPacket,
    acceptanceDocket,
    ownerInput,
    ownerInputGate,
    preExecution,
    postExtraction,
    closeout,
    pathspecRows,
    packageStatusRows,
    packageStagedRows,
    stagedRows,
    trackedDiffStat,
    exactCommands,
    status
  });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    evidenceKind: "a16-extraction-execution-readiness",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      requestPacketGeneratedAt: requestPacket.generatedAt,
      acceptanceDocketGeneratedAt: acceptanceDocket.generatedAt,
      ownerInputGeneratedAt: ownerInput.generatedAt,
      ownerInputGateCheckedAt: ownerInputGate.checkedAt,
      preExecutionReportGeneratedAt: preExecution.generatedAt,
      postExtractionReportGeneratedAt: postExtraction.generatedAt,
      closeoutDocketGeneratedAt: closeout.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    readinessStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
    candidateId: closeout.candidateId,
    approvalId: a16AcceptanceRow.approvalId ?? ownerInstructionRow.approvalId ?? "",
    targetInputFile: a16AcceptanceRow.targetInputFile ?? A16_EXTRACTION_EXECUTION_READINESS_PATHS.ownerInput,
    expectedInstructionId: a16AcceptanceRow.expectedInstructionId ?? ownerInstructionRow.instructionId ?? "",
    packageFiles,
    pathspecRows,
    packageStatusRows,
    stagedRows,
    packageStagedRows,
    trackedDiffStat,
    exactCommandSequence: exactCommands,
    copyableOwnerExecutionText: a16AcceptanceRow.expectedExecutionText ?? ownerInstructionRow.executionText ?? "",
    requiredPreExecutionChecks: a16AcceptanceRow.requiredPreExecutionChecks ?? ownerInstructionRow.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: unique([
      ...(a16AcceptanceRow.requiredPostExecutionChecks ?? ownerInstructionRow.requiredPostExecutionChecks ?? []),
      ...(closeout.requiredPostExecutionCommands ?? [])
    ]),
    acceptanceChecks: checks,
    summary: {
      readinessStatus: failedChecks.length === 0 ? status : "not-ready-check-failures",
      packageFileRows: packageFiles.length,
      pathspecRows: pathspecRows.length,
      packageDirtyRows: packageStatusRows.length,
      stagedRows: stagedRows.length,
      packageStagedRows: packageStagedRows.length,
      ownerInstructionRows: ownerInputGate.instructionRows ?? 0,
      validOwnerInstructionRows: ownerInputGate.validInstructionRows ?? 0,
      exactCommandRows: exactCommands.length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      readinessOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      runsGitAdd: false,
      runsGitCommit: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: status === "waiting-for-owner-execution-instruction"
    }
  };
}

export function stableA16ExtractionExecutionReadinessProjection(payload) {
  const sourceArtifacts = {
    ...(payload.sourceArtifacts ?? {})
  };
  delete sourceArtifacts.ownerInputGateCheckedAt;
  return {
    repoRoot: payload.repoRoot,
    evidenceKind: payload.evidenceKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    readinessStatus: payload.readinessStatus,
    candidateId: payload.candidateId,
    approvalId: payload.approvalId,
    targetInputFile: payload.targetInputFile,
    expectedInstructionId: payload.expectedInstructionId,
    packageFiles: payload.packageFiles,
    pathspecRows: payload.pathspecRows,
    packageStatusRows: payload.packageStatusRows,
    stagedRows: payload.stagedRows,
    packageStagedRows: payload.packageStagedRows,
    trackedDiffStat: payload.trackedDiffStat,
    exactCommandSequence: payload.exactCommandSequence,
    copyableOwnerExecutionText: payload.copyableOwnerExecutionText,
    requiredPreExecutionChecks: payload.requiredPreExecutionChecks,
    requiredPostExecutionChecks: payload.requiredPostExecutionChecks,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const checkRows = payload.acceptanceChecks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");
  const statusRows = payload.packageStatusRows.map((row) => (
    `| \`${cell(row.path)}\` | \`${cell(row.rawStatus)}\` |`
  )).join("\n") || "| _none_ | _none_ |";
  const commandRows = payload.exactCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n");
  return `# A25 A16 Extraction Execution Readiness

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Readiness status: \`${payload.readinessStatus}\`

This evidence is fail-closed. It does not run \`git add\`, \`git commit\`, cleanup, push, deploy, or broad staging.

## Summary

- Package files: ${payload.summary.packageFileRows}
- Pathspec rows: ${payload.summary.pathspecRows}
- Package dirty rows: ${payload.summary.packageDirtyRows}
- Staged rows: ${payload.summary.stagedRows}
- Owner instruction rows: ${payload.summary.ownerInstructionRows}
- Valid owner instruction rows: ${payload.summary.validOwnerInstructionRows}
- Exact command rows: ${payload.summary.exactCommandRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Exact Command Sequence

${commandRows}

## Package Status Rows

| Path | Status |
| --- | --- |
${statusRows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Copyable Owner Execution Text

\`\`\`text
${payload.copyableOwnerExecutionText}
\`\`\`

## Boundary

- Records owner approval: ${payload.boundary.recordsOwnerApproval}.
- Records execution instruction: ${payload.boundary.recordsExecutionInstruction}.
- Runs git add: ${payload.boundary.runsGitAdd}.
- Runs git commit: ${payload.boundary.runsGitCommit}.
- Stage authorized: ${payload.boundary.stageAuthorized}.
- Commit authorized: ${payload.boundary.commitAuthorized}.
- Cleanup authorized: ${payload.boundary.cleanupAuthorized}.
- Executable now: ${payload.boundary.executableNow}.
- Deploy authorized: ${payload.boundary.deployAuthorized}.
- Requires separate owner execution instruction: ${payload.boundary.requiresSeparateOwnerExecutionInstruction}.
`;
}

export function writeA16ExtractionExecutionReadiness() {
  const payload = buildA16ExtractionExecutionReadiness();
  write(A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestMarkdown, markdown(payload));
  write(A16_EXTRACTION_EXECUTION_READINESS_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_EXTRACTION_EXECUTION_READINESS_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

function main() {
  const payload = writeA16ExtractionExecutionReadiness();
  console.log(JSON.stringify({
    latestJson: A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestJson,
    latestMarkdown: A16_EXTRACTION_EXECUTION_READINESS_PATHS.latestMarkdown,
    readinessStatus: payload.readinessStatus,
    packageFileRows: payload.summary.packageFileRows,
    packageDirtyRows: payload.summary.packageDirtyRows,
    stagedRows: payload.summary.stagedRows,
    ownerInstructionRows: payload.summary.ownerInstructionRows,
    validOwnerInstructionRows: payload.summary.validOwnerInstructionRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
