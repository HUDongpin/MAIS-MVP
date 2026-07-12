#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  requestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  a16OwnerInput: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json",
  a16OwnerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  a16PreExecutionReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-acceptance-docket.md`
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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function unique(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function rowKind(row) {
  if ((row.approvalKind ?? "") === "wave01-package-resync" || (row.approvalId ?? "").startsWith("wave01-resync-")) {
    return "wave01-package-resync";
  }
  if ((row.sourceKind ?? "") === "a16-authorized-extraction" || (row.candidateId ?? "").includes("a16")) {
    return "a16-authorized-extraction";
  }
  return row.sourceKind ?? "generic-manifest";
}

function rowAcceptanceCriteria(row) {
  if (rowKind(row) === "a16-authorized-extraction") {
    return [
      "Owner instruction row must match the draft approvalId, instructionId, owner, candidateId, targetCwd, package files, package fingerprints, and exact command sequence.",
      "executionText must include the copyable A16 separate-execution text, both source approval IDs, target cwd, both exact Git commands, and the no-cleanup/no-broad-staging exclusions.",
      "evidenceReviewed must include canonical A16 authorization, A16 execution docket, A16 pre-execution validation report, and A16 input scaffold evidence.",
      "cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed stage/commit sequence after pre-checks pass.",
      "Required pre-execution checks and post-execution checks must remain attached to the accepted instruction row."
    ];
  }
  return [
    "Owner instruction row must match the draft approvalId, instructionId, owner, target cwd, package file, and exact command sequence.",
    "executionText must include the separate-execution wording, target cwd, exact command, and the no-cleanup/no-broad-staging exclusions.",
    "cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed command after pre-checks pass.",
    "This request packet does not execute, stage, commit, merge, clean, remove, push, deploy, or otherwise mutate the worktree."
  ];
}

function sourceCurrentnessFailures({ dirtyMap, instructions, instructionGate, requestPacket, requestGate, ownerInput, ownerInputGate, preExecution }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  for (const [label, payload] of [
    ["next-owner execution instructions", instructions],
    ["next-owner execution instruction request packet", requestPacket],
    ["A16 execution-instruction owner input", ownerInput],
    ["A16 pre-execution validation report", preExecution]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  for (const [label, gate] of [
    ["next-owner execution instructions gate", instructionGate],
    ["next-owner execution instruction request packet gate", requestGate],
    ["A16 execution-instruction owner input gate", ownerInputGate]
  ]) {
    if (gate.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (gate.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if ((gate.failures ?? []).length !== 0) failures.push(`${label} has currentness failures`);
  }
  if (requestPacket.sourceArtifacts?.executionInstructionsGeneratedAt !== instructions.generatedAt) {
    failures.push("request packet source execution-instructions timestamp is stale");
  }
  if (ownerInput.sourcePreExecutionValidationReportGeneratedAt !== preExecution.generatedAt) {
    failures.push("A16 owner input source pre-execution timestamp is stale");
  }
  if (preExecution.summary?.preExecutionValidationReady !== true) {
    failures.push("A16 pre-execution validation is not ready");
  }
  return failures;
}

function requestAcceptanceRow(row, ownerInput) {
  const template = row.instructionTemplateDoNotExecute ?? {};
  const ownerInstructionRows = (ownerInput.instructions ?? []).filter((instruction) => instruction.approvalId === row.approvalId);
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind ?? "",
    owner: row.owner,
    candidateId: row.candidateId ?? "",
    sourceKind: row.sourceKind ?? "",
    rowKind: rowKind(row),
    status: ownerInstructionRows.length === 0 ? "waiting-for-owner-execution-instruction" : "owner-instruction-present-check-gates",
    targetInputFile: row.targetInputFile,
    expectedInstructionId: template.instructionId ?? "",
    expectedExecutionText: row.copyableExecutionText ?? "",
    exactCommandSequence: row.exactCommandSequence ?? [],
    packageFiles: row.packageFiles ?? [],
    packageFingerprintSha256: row.packageFingerprintSha256 ?? "",
    requiredEvidenceReviewed: unique([
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacket,
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInput,
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16PreExecutionReport,
      ...(row.evidenceReviewed ?? [])
    ]),
    requiredPreExecutionChecks: row.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: row.requiredPostExecutionChecks ?? [],
    ownerInstructionRows: ownerInstructionRows.length,
    cleanupAuthorized: false,
    executableNow: false,
    acceptanceCriteria: rowAcceptanceCriteria(row)
  };
}

function acceptanceChecks({ requestPacket, instructionGate, ownerInputGate, preExecution, rows, sourceFailures }) {
  const summary = requestPacket.summary ?? {};
  const waitingRequestRows = count(summary.readyInstructionRequestRows);
  const pendingRequestRows = count(summary.effectivePendingReadyInstructionRows);
  const ownerInstructionConsumed = rows.length === 0 && waitingRequestRows === 0 && pendingRequestRows === 0;
  const recordedGenericInstructionRows = ownerInstructionConsumed &&
    count(summary.instructionRowsInFile) > 0 &&
    count(summary.validInstructionRows) === count(summary.instructionRowsInFile);
  const pendingRequestsAligned = rows.length === waitingRequestRows &&
    waitingRequestRows === pendingRequestRows &&
    pendingRequestRows === count(instructionGate.effectivePendingReadyInstructionRows);
  const a16Rows = rows.filter((row) => row.rowKind === "a16-authorized-extraction");
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "ready-request-rows-aligned",
      status: pendingRequestsAligned || ownerInstructionConsumed ? "pass" : "fail",
      detail: `ready request rows=${summary.readyInstructionRequestRows ?? 0}`
    },
    {
      id: "pending-ready-instruction-row",
      status: pendingRequestsAligned || ownerInstructionConsumed
        ? "pass"
        : "fail",
      detail: `pending=${summary.effectivePendingReadyInstructionRows ?? 0}, instructionGatePending=${instructionGate.effectivePendingReadyInstructionRows ?? 0}, ownerInputReady=${ownerInputGate.readyForOwnerInputRows ?? 0}`
    },
    {
      id: "execution-instruction-state",
      status: ((summary.instructionRowsInFile ?? 0) === 0 &&
        (summary.validInstructionRows ?? 0) === 0) ||
        recordedGenericInstructionRows
        ? "pass"
        : "fail",
      detail: ownerInstructionConsumed
        ? `The pending request has been consumed by ${summary.validInstructionRows ?? 0} valid recorded instruction row(s).`
        : "Current state is request-only until the owner records a separate execution instruction."
    },
    {
      id: "a16-pre-execution-ready",
      status: preExecution.summary?.preExecutionValidationReady === true &&
        preExecution.summary?.passingChecks === preExecution.summary?.totalChecks
        ? "pass"
        : "fail",
      detail: `pre-execution checks=${preExecution.summary?.passingChecks ?? 0}/${preExecution.summary?.totalChecks ?? 0}`
    },
    {
      id: "package-files-present",
      status: rows.every((row) => Array.isArray(row.packageFiles) && row.packageFiles.length > 0) &&
        a16Rows.every((row) => row.packageFiles.length === 6 && row.packageFiles.every((filePath) => filePath.startsWith("coordination/research/")))
        ? "pass"
        : "fail",
      detail: `request rows=${rows.length}`
    },
    {
      id: "exact-commands-present",
      status: rows.every((row) => Array.isArray(row.exactCommandSequence) && row.exactCommandSequence.length > 0) &&
        a16Rows.every((row) => row.exactCommandSequence.length === 2 &&
          row.exactCommandSequence[0] === "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" &&
          row.exactCommandSequence[1] === "git commit -m \"Add A16 research evidence package\"")
        ? "pass"
        : "fail",
      detail: `request rows=${rows.length}`
    },
    {
      id: "copyable-execution-text-complete",
      status: rows.every((row) =>
        row.expectedExecutionText.includes("Authorize separate execution") &&
        row.expectedExecutionText.includes("No cleanup") &&
        row.expectedExecutionText.includes("broad staging") &&
        row.exactCommandSequence.every((command) => row.expectedExecutionText.includes(command) || row.expectedExecutionText.includes(command.replaceAll("\"", "'")))
      ) &&
        a16Rows.every((row) => row.expectedExecutionText.includes("approvalIds=a16-research-and-learning-science,codex-a16-research-evidence-closure"))
        ? "pass"
        : "fail",
      detail: "Request row carries the exact owner-facing execution instruction text."
    },
    {
      id: "non-executable-boundary",
      status: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false) &&
        (summary.cleanupAuthorizedRows ?? 0) === 0 &&
        (summary.executableRows ?? 0) === 0
        ? "pass"
        : "fail",
      detail: "Acceptance docket does not authorize cleanup or executable rows."
    }
  ];
}

export function buildNextOwnerExecutionInstructionAcceptanceDocket() {
  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const instructions = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructions);
  const instructionGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructionsGate);
  const requestPacket = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacket);
  const requestGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacketGate);
  const ownerInput = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInput);
  const ownerInputGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInputGate);
  const preExecution = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16PreExecutionReport);
  const rows = (requestPacket.requests ?? []).map((row) => requestAcceptanceRow(row, ownerInput));
  const sourceFailures = sourceCurrentnessFailures({
    dirtyMap,
    instructions,
    instructionGate,
    requestPacket,
    requestGate,
    ownerInput,
    ownerInputGate,
    preExecution
  });
  const checks = acceptanceChecks({ requestPacket, instructionGate, ownerInputGate, preExecution, rows, sourceFailures });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const summary = requestPacket.summary ?? {};
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    docketKind: "next-owner-execution-instruction-acceptance",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      executionInstructionsGeneratedAt: instructions.generatedAt,
      executionInstructionsGatePath: NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructionsGate,
      requestPacketGeneratedAt: requestPacket.generatedAt,
      requestPacketGatePath: NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacketGate,
      a16OwnerInputGeneratedAt: ownerInput.generatedAt,
      a16OwnerInputGatePath: NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInputGate,
      a16PreExecutionReportGeneratedAt: preExecution.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    acceptanceRows: rows,
    acceptanceChecks: checks,
    summary: {
      acceptanceRows: rows.length,
      readyInstructionRequestRows: count(summary.readyInstructionRequestRows),
      effectivePendingReadyInstructionRows: count(summary.effectivePendingReadyInstructionRows),
      instructionRowsInFile: count(summary.instructionRowsInFile),
      validInstructionRows: count(summary.validInstructionRows),
      ownerInputInstructionRows: count(ownerInputGate.instructionRows),
      ownerInputValidInstructionRows: count(ownerInputGate.validInstructionRows),
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      preExecutionValidationReady: preExecution.summary?.preExecutionValidationReady === true,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      acceptanceDocketOnly: true,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: rows.length > 0
    }
  };
}

export function stableNextOwnerExecutionInstructionAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    docketKind: payload.docketKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    acceptanceRows: payload.acceptanceRows,
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
  const rows = payload.acceptanceRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.status)} | ${row.exactCommandSequence.length} | ${row.packageFiles.length} | ${row.ownerInstructionRows} | \`${cell(row.packageFingerprintSha256 || "n/a")}\` |`
  )).join("\n") || "| none | n/a | 0 | 0 | 0 | n/a |";
  const checks = payload.acceptanceChecks.map((row) => `| \`${cell(row.id)}\` | ${row.status} | ${cell(row.detail)} |`).join("\n");
  const details = payload.acceptanceRows.map((row) => `## Acceptance Row: ${row.approvalId}

Status: ${row.status}

Target input file: \`${row.targetInputFile}\`

Expected instruction id: \`${row.expectedInstructionId}\`

Expected owner execution text:

${fenced(row.expectedExecutionText)}

Exact command sequence:

${row.exactCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n") || "- none"}

Required evidence:

${row.requiredEvidenceReviewed.map((item) => `- \`${item}\``).join("\n") || "- none"}

Acceptance criteria:

${row.acceptanceCriteria.map((item) => `- ${item}`).join("\n") || "- none"}
`).join("\n");

  return `# A25 Next Owner Execution Instruction Acceptance Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is evidence-only. It defines how the next owner execution instruction will be accepted, but it does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Acceptance rows: ${payload.summary.acceptanceRows}
- Ready instruction request rows: ${payload.summary.readyInstructionRequestRows}
- Effective pending ready instruction rows: ${payload.summary.effectivePendingReadyInstructionRows}
- Instruction rows in file: ${payload.summary.instructionRowsInFile}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Owner-input instruction rows: ${payload.summary.ownerInputInstructionRows}
- Owner-input valid instruction rows: ${payload.summary.ownerInputValidInstructionRows}
- Pre-execution validation ready: ${payload.summary.preExecutionValidationReady ? "yes" : "no"}
- Passing acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Acceptance Rows

| Approval ID | Status | Commands | Package files | Owner instruction rows | Package fingerprint SHA256 |
| --- | --- | ---: | ---: | ---: | --- |
${rows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

${details}

## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Requires separate owner execution instruction: true.
`;
}

function main() {
  const payload = buildNextOwnerExecutionInstructionAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown,
    acceptanceRows: payload.summary.acceptanceRows,
    readyInstructionRequestRows: payload.summary.readyInstructionRequestRows,
    effectivePendingReadyInstructionRows: payload.summary.effectivePendingReadyInstructionRows,
    instructionRowsInFile: payload.summary.instructionRowsInFile,
    validInstructionRows: payload.summary.validInstructionRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
