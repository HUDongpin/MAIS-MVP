#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  requestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  preflight: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight.json",
  preflightGate: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight-current-gate.json",
  authorizedCommandManifest: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-instruction-capsule.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-capsule.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-instruction-capsule.md`
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

function wave01ArtifactCleanRequest(row) {
  return row.approvalId?.startsWith("wave01-resync-") &&
    row.approvalId !== "wave01-resync-01-tsconfig-json" &&
    row.exactCommandSequence?.length === 1 &&
    row.exactCommandSequence[0]?.startsWith("git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-");
}

function wave01ArtifactCleanCandidate(row) {
  return row.approvalId?.startsWith("wave01-resync-") &&
    row.approvalId !== "wave01-resync-01-tsconfig-json" &&
    row.readyForSeparateInstruction === true &&
    row.command?.startsWith("git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-");
}

function sourceCurrentnessFailures({ dirtyMap, requestPacket, requestPacketGate, preflight, preflightGate, manifest, instructions }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (requestPacket.dirtyMapStatusSignature !== expectedSignature) failures.push("request packet dirty-map signature is stale");
  if (requestPacket.expandedStatusEntries !== expectedEntries) failures.push("request packet expanded dirty entry count is stale");
  if ((requestPacketGate.failures ?? []).length !== 0) failures.push("request packet gate has failures");
  if (requestPacketGate.dirtyMapStatusSignature !== expectedSignature) failures.push("request packet gate dirty-map signature is stale");
  if (preflight.dirtyMapStatusSignature !== expectedSignature) failures.push("preflight dirty-map signature is stale");
  if (preflight.expandedStatusEntries !== expectedEntries) failures.push("preflight expanded dirty entry count is stale");
  if ((preflight.sourceCurrentnessFailures ?? []).length !== 0) failures.push("preflight source currentness failures are present");
  if ((preflightGate.failures ?? []).length !== 0) failures.push("preflight gate has failures");
  if (preflightGate.dirtyMapStatusSignature !== expectedSignature) failures.push("preflight gate dirty-map signature is stale");
  if (manifest.dirtyMapStatusSignature !== expectedSignature) failures.push("authorized command manifest dirty-map signature is stale");
  if (instructions.dirtyMapStatusSignature !== expectedSignature) failures.push("execution instructions scaffold dirty-map signature is stale");
  return failures;
}

function buildInstructionRows({ requestPacket, preflight, manifest }) {
  if (preflight.preflightStatus === "post-clean-verified") {
    return (preflight.rows ?? []).map((row, index) => {
      const checks = [
        {
          id: "post-clean-target-already-clean",
          status: row.targetAlreadyClean === true ? "pass" : "fail",
          detail: `targetAlreadyClean=${row.targetAlreadyClean ?? "missing"}`
        },
        {
          id: "single-allowlisted-artifact-command",
          status: /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.command ?? "") ? "pass" : "fail",
          detail: row.command || "missing command"
        },
        {
          id: "tsconfig-and-deploy-excluded",
          status: row.approvalId !== "wave01-resync-01-tsconfig-json" && row.packageFile !== "tsconfig.json" && row.copyableExecutionInstructionText?.includes("deploy") === true ? "pass" : "fail",
          detail: `package=${row.packageFile || "missing"}`
        },
        {
          id: "non-executable-boundary",
          status: row.cleanupAuthorized === false && row.executableNow === false ? "pass" : "fail",
          detail: `cleanup=${row.cleanupAuthorized} executable=${row.executableNow}`
        }
      ];
      const failedChecks = checks.filter((check) => check.status !== "pass").length;
      return {
        order: index + 1,
        approvalId: row.approvalId,
        owner: row.owner,
        cwd: row.cwd,
        packageFile: row.packageFile,
        command: row.command,
        dryRunCommand: row.dryRunCommand ?? "",
        dryRunOutput: row.dryRunOutput ?? "",
        statusShort: row.statusShort ?? "",
        targetAlreadyClean: row.targetAlreadyClean === true,
        copyableExecutionInstructionText: row.copyableExecutionInstructionText ?? "",
        targetInputFile: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.executionInstructions,
        checks,
        passingChecks: checks.length - failedChecks,
        failedChecks,
        cleanupAuthorized: false,
        executableNow: false
      };
    });
  }
  const preflightByApprovalId = new Map((preflight.rows ?? []).map((row) => [row.approvalId, row]));
  const manifestByApprovalId = new Map((manifest.candidates ?? []).map((row) => [row.approvalId, row]));
  return (requestPacket.requests ?? [])
    .filter(wave01ArtifactCleanRequest)
    .map((request, index) => {
      const preflightRow = preflightByApprovalId.get(request.approvalId) ?? {};
      const manifestRow = manifestByApprovalId.get(request.approvalId) ?? {};
      const command = request.exactCommandSequence?.[0] ?? "";
      const packageFile = request.packageFiles?.[0] ?? "";
      const checks = [
        {
          id: "request-waits-for-owner-execution-instruction",
          status: request.status === "waiting-for-owner-execution-instruction" ? "pass" : "fail",
          detail: `status=${request.status ?? "missing"}`
        },
        {
          id: "manifest-candidate-ready",
          status: wave01ArtifactCleanCandidate(manifestRow) ? "pass" : "fail",
          detail: `ready=${manifestRow.readyForSeparateInstruction ?? "missing"}`
        },
        {
          id: "preflight-row-passed",
          status: preflightRow.failedChecks === 0 && preflightRow.wouldRemoveOnlyTarget === true ? "pass" : "fail",
          detail: `failedChecks=${preflightRow.failedChecks ?? "missing"} wouldRemoveOnlyTarget=${preflightRow.wouldRemoveOnlyTarget ?? "missing"}`
        },
        {
          id: "single-allowlisted-artifact-command",
          status: /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(command) ? "pass" : "fail",
          detail: command || "missing command"
        },
        {
          id: "tsconfig-and-deploy-excluded",
          status: request.approvalId !== "wave01-resync-01-tsconfig-json" && packageFile !== "tsconfig.json" && request.copyableExecutionText?.includes("deploy") === true ? "pass" : "fail",
          detail: `package=${packageFile || "missing"}`
        },
        {
          id: "non-executable-boundary",
          status: request.cleanupAuthorized === false && request.executableNow === false ? "pass" : "fail",
          detail: `cleanup=${request.cleanupAuthorized} executable=${request.executableNow}`
        }
      ];
      const failedChecks = checks.filter((row) => row.status !== "pass").length;
      return {
        order: index + 1,
        approvalId: request.approvalId,
        owner: request.owner,
        cwd: request.cwd,
        packageFile,
        command,
        dryRunCommand: preflightRow.dryRunCommand ?? "",
        dryRunOutput: preflightRow.dryRunOutput ?? "",
        statusShort: preflightRow.statusShort ?? "",
        copyableExecutionInstructionText: request.copyableExecutionText,
        targetInputFile: request.targetInputFile,
        checks,
        passingChecks: checks.length - failedChecks,
        failedChecks,
        cleanupAuthorized: false,
        executableNow: false
      };
    });
}

function buildAcceptanceChecks({ rows, sourceFailures, capsuleStatus }) {
  if (capsuleStatus === "post-clean-verified") {
    return [
      {
        id: "source-currentness-green",
        status: sourceFailures.length === 0 ? "pass" : "fail",
        detail: `sourceFailures=${sourceFailures.length}`
      },
      {
        id: "six-instruction-rows",
        status: rows.length === 6 ? "pass" : "fail",
        detail: `rows=${rows.length}`
      },
      {
        id: "all-row-checks-pass",
        status: rows.every((row) => row.failedChecks === 0) ? "pass" : "fail",
        detail: `failedRows=${rows.filter((row) => row.failedChecks > 0).length}`
      },
      {
        id: "all-targets-already-clean",
        status: rows.every((row) => row.targetAlreadyClean === true && row.statusShort === "" && row.dryRunOutput === "") ? "pass" : "fail",
        detail: `alreadyCleanRows=${rows.filter((row) => row.targetAlreadyClean === true).length}/${rows.length}`
      },
      {
        id: "copyable-instructions-preserve-exclusions",
        status: rows.every((row) =>
          row.copyableExecutionInstructionText?.includes("No cleanup") &&
          row.copyableExecutionInstructionText?.includes("broad staging") &&
          row.copyableExecutionInstructionText?.includes("deploy")
        ) ? "pass" : "fail",
        detail: "retains no cleanup, no broad staging, no deploy"
      },
      {
        id: "non-executable-capsule",
        status: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) ? "pass" : "fail",
        detail: `cleanup=${rows.filter((row) => row.cleanupAuthorized === true).length} executable=${rows.filter((row) => row.executableNow === true).length}`
      }
    ];
  }
  const checks = [
    {
      id: "source-currentness-green",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceFailures=${sourceFailures.length}`
    },
    {
      id: "six-instruction-rows",
      status: rows.length === 6 ? "pass" : "fail",
      detail: `rows=${rows.length}`
    },
    {
      id: "all-row-checks-pass",
      status: rows.every((row) => row.failedChecks === 0) ? "pass" : "fail",
      detail: `failedRows=${rows.filter((row) => row.failedChecks > 0).length}`
    },
    {
      id: "all-dry-run-outputs-present",
      status: rows.every((row) => row.dryRunOutput?.includes(`Would remove ${row.packageFile}`)) ? "pass" : "fail",
      detail: `dryRunRows=${rows.filter((row) => row.dryRunOutput?.includes(`Would remove ${row.packageFile}`)).length}/${rows.length}`
    },
    {
      id: "copyable-instructions-preserve-exclusions",
      status: rows.every((row) =>
        row.copyableExecutionInstructionText?.includes("Authorize separate execution") &&
        row.copyableExecutionInstructionText?.includes("No cleanup") &&
        row.copyableExecutionInstructionText?.includes("broad staging") &&
        row.copyableExecutionInstructionText?.includes("deploy")
      ) ? "pass" : "fail",
      detail: "requires separate execution, no cleanup, no broad staging, no deploy"
    },
    {
      id: "non-executable-capsule",
      status: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) ? "pass" : "fail",
      detail: `cleanup=${rows.filter((row) => row.cleanupAuthorized === true).length} executable=${rows.filter((row) => row.executableNow === true).length}`
    }
  ];
  return checks;
}

export function buildWave01ArtifactCleanExecutionInstructionCapsule() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.dirtyMap);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.requestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.requestPacketGate);
  const preflight = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.preflight);
  const preflightGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.preflightGate);
  const manifest = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.authorizedCommandManifest);
  const instructions = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.executionInstructions);
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    requestPacket,
    requestPacketGate,
    preflight,
    preflightGate,
    manifest,
    instructions
  });
  const rows = buildInstructionRows({ requestPacket, preflight, manifest });
  const capsuleStatus = preflight.preflightStatus === "post-clean-verified" && rows.length === 6
    ? "post-clean-verified"
    : "waiting-for-owner-execution-instruction";
  const acceptanceChecks = buildAcceptanceChecks({ rows, sourceFailures, capsuleStatus });
  const failedRows = rows.filter((row) => row.failedChecks > 0);
  const failedAcceptanceChecks = acceptanceChecks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    evidenceKind: "wave01-artifact-clean-execution-instruction-capsule",
    capsuleStatus,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      requestPacketGeneratedAt: requestPacket.generatedAt,
      requestPacketGateCheckedAt: requestPacketGate.checkedAt,
      preflightGeneratedAt: preflight.generatedAt,
      preflightGateCheckedAt: preflightGate.checkedAt,
      authorizedCommandManifestGeneratedAt: manifest.generatedAt,
      executionInstructionsGeneratedAt: instructions.generatedAt
    },
    targetInputFile: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.executionInstructions,
    sourceCurrentnessFailures: sourceFailures,
    instructionRows: rows,
    acceptanceChecks,
    summary: {
      instructionRows: rows.length,
      passingRows: rows.length - failedRows.length,
      failedRows: failedRows.length,
      rowChecks: rows.reduce((total, row) => total + row.checks.length, 0),
      passingRowChecks: rows.reduce((total, row) => total + row.passingChecks, 0),
      acceptanceChecks: acceptanceChecks.length,
      passingAcceptanceChecks: acceptanceChecks.filter((row) => row.status === "pass").length,
      failedAcceptanceChecks: failedAcceptanceChecks.length,
      targetAlreadyCleanRows: rows.filter((row) => row.targetAlreadyClean === true).length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      capsuleStatus
    },
    boundary: {
      evidenceOnly: true,
      instructionCapsuleOnly: true,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      excludesTsconfigRestore: true,
      requiresSeparateOwnerExecutionInstruction: rows.length > 0 && capsuleStatus !== "post-clean-verified"
    }
  };
}

export function stableWave01ArtifactCleanExecutionInstructionCapsuleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    evidenceKind: payload.evidenceKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: {
      requestPacketGeneratedAt: payload.sourceArtifacts?.requestPacketGeneratedAt,
      preflightGeneratedAt: payload.sourceArtifacts?.preflightGeneratedAt,
      authorizedCommandManifestGeneratedAt: payload.sourceArtifacts?.authorizedCommandManifestGeneratedAt,
      executionInstructionsGeneratedAt: payload.sourceArtifacts?.executionInstructionsGeneratedAt
    },
    targetInputFile: payload.targetInputFile,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    instructionRows: payload.instructionRows,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function fenced(value) {
  return `\`\`\`text\n${value ?? ""}\n\`\`\``;
}

function markdown(payload) {
  const rows = payload.instructionRows.map((row) =>
    `| ${row.order} | \`${cell(row.approvalId)}\` | \`${cell(row.packageFile)}\` | \`${cell(row.statusShort)}\` | ${row.passingChecks}/${row.checks.length} |`
  ).join("\n") || "| none | n/a | n/a | n/a | 0/0 |";
  const details = payload.instructionRows.map((row) => `## ${row.order}. ${row.approvalId}

CWD: \`${row.cwd}\`

Exact command requiring separate owner execution instruction:

${fenced(row.command)}

Dry-run evidence:

${fenced(`${row.dryRunCommand}\n${row.dryRunOutput}`)}

Copyable owner execution instruction text:

${fenced(row.copyableExecutionInstructionText)}

Checks:

${row.checks.map((check) => `- ${check.status.toUpperCase()} ${check.id}: ${check.detail}`).join("\n")}
`).join("\n");
  const checks = payload.acceptanceChecks.map((check) => (
    `| \`${cell(check.id)}\` | ${cell(check.status)} | ${cell(check.detail)} |`
  )).join("\n");

  return `# A25 Wave01 Artifact-Clean Execution Instruction Capsule

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is evidence-only. It narrows the already-authorized Wave01 A25 artifact-clean rows into six copyable owner execution-instruction texts. It does not record an execution instruction and does not authorize \`git clean -f\`, staging, committing, merging, cleanup, worktree removal, branch deletion, reset, push, deploy, \`tsconfig.json\` restore, or any unrelated file operation.

## Summary

- Instruction rows: ${payload.summary.instructionRows}
- Passing rows: ${payload.summary.passingRows}/${payload.summary.instructionRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Target owner input file: \`${payload.targetInputFile}\`

## Rows

| # | Approval ID | Package file | Status | Checks |
| --- | --- | --- | --- | --- |
${rows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

${details}

## Boundary

- Records execution instruction: false
- Cleanup authorized: false
- Executable now: false
- Destructive Git authorized: false
- Deploy authorized: false
- Excludes tsconfig restore: true
`;
}

export function writeWave01ArtifactCleanExecutionInstructionCapsule() {
  const payload = buildWave01ArtifactCleanExecutionInstructionCapsule();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestJson, json);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.datedJson, json);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestMarkdown, md);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.datedMarkdown, md);
  return payload;
}

function main() {
  const payload = writeWave01ArtifactCleanExecutionInstructionCapsule();
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_EXECUTION_INSTRUCTION_CAPSULE_PATHS.latestMarkdown,
    instructionRows: payload.summary.instructionRows,
    passingRows: payload.summary.passingRows,
    failedRows: payload.summary.failedRows,
    sourceCurrentnessFailures: payload.summary.sourceCurrentnessFailures,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
