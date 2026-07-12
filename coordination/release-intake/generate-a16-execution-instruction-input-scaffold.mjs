#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  executionAuthorizationDocket: "coordination/release-intake/latest-A25-a16-execution-authorization-docket.json",
  preExecutionValidationReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  postExtractionVerification: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  latestJson: "coordination/release-intake/latest-A25-a16-execution-instruction-input-scaffold.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-execution-instruction-input-scaffold.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-execution-instruction-input-scaffold.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-execution-instruction-input-scaffold.md`
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

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function readOptionalJson(relativePath) {
  const absolutePath = absolute(relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function currentInstructions() {
  if (!exists(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson)) return [];
  const current = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson);
  return Array.isArray(current.instructions) ? current.instructions : [];
}

function postExtractionVerified(report) {
  return report?.postExtractionVerified === true
    && report?.lifecycleStatus === "post-extraction-verified"
    && (report?.summary?.packageStatusRows ?? 1) === 0
    && (report?.summary?.stagedPackageRows ?? 1) === 0
    && (report?.latestPackageCommit?.files ?? []).length === 6;
}

function consumedA16OwnerApproval(authorizations, postExtractionReport) {
  const approvedIds = new Set((authorizations.authorizations ?? []).map((row) => row.approvalId));
  return postExtractionVerified(postExtractionReport)
    && !approvedIds.has("a16-research-and-learning-science")
    && approvedIds.has("codex-a16-research-evidence-closure");
}

function sourceCurrentnessFailures({ dirtyMap, authorizations, docket, report, postExtractionReport }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;

  for (const [label, payload] of [
    ["owner authorizations", authorizations],
    ["A16 execution authorization docket", docket],
    ["A16 pre-execution validation report", report]
  ]) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }

  if (report.summary?.preExecutionValidationReady !== true) failures.push("A16 pre-execution validation is not ready");
  if ((report.summary?.passingChecks ?? 0) !== (report.summary?.totalChecks ?? -1)) {
    failures.push("A16 pre-execution validation checks are not all passing");
  }
  if ((docket.summary?.failedAcceptanceChecks ?? -1) !== 0) failures.push("A16 execution authorization docket has failed acceptance checks");
  if ((docket.summary?.sourceCurrentnessFailures ?? -1) !== 0) failures.push("A16 execution authorization docket has source currentness failures");
  if ((authorizations.authorizations ?? []).length < 2 && !consumedA16OwnerApproval(authorizations, postExtractionReport)) {
    failures.push("canonical owner authorizations do not include the two A16 approval rows or a verified consumed A16 owner-package row");
  }
  if (authorizations.cleanupAuthorized !== false || authorizations.executableNow !== false) {
    failures.push("canonical owner authorizations must remain non-executable");
  }

  return failures;
}

function buildDraft({ docket, report }) {
  const authorizationRow = (docket.authorizationRows ?? [])[0] ?? {};
  return {
    instructionId: "a16-root-pathspec-commit-execution-execution-instruction",
    approvalId: authorizationRow.approvalId,
    owner: authorizationRow.owner,
    status: "draft-owner-execution-instruction-input",
    candidateId: report.candidateId,
    sourceApprovalIds: authorizationRow.sourceApprovalIds ?? [],
    targetCwd: authorizationRow.targetCwd,
    exactCommandSequence: authorizationRow.exactCommandSequence ?? [],
    commandSequence: authorizationRow.exactCommandSequence ?? [],
    packageFiles: authorizationRow.packageFiles ?? [],
    packageFingerprints: report.packageFingerprints ?? [],
    packageFingerprintSha256: report.packageFingerprintSha256 ?? "",
    packageFingerprintSource: A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.preExecutionValidationReport,
    evidenceReviewed: [
      A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.ownerAuthorizations,
      A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.executionAuthorizationDocket,
      A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.preExecutionValidationReport
    ],
    requiredPreExecutionChecks: authorizationRow.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: authorizationRow.requiredPostExecutionChecks ?? [],
    requiredExecutionText: authorizationRow.copyableAuthorizationText ?? "",
    companionLifecycleHoldText: authorizationRow.companionLifecycleHoldText ?? "",
    approvedBy: "",
    approvedAt: "",
    notes: "",
    executionText: "",
    cleanupAuthorized: false,
    executableNow: false,
    destructiveGitAuthorized: false,
    deployAuthorized: false
  };
}

function acceptanceChecks({ dirtyMap, authorizations, docket, report, draft, instructions, sourceFailures, postExtractionReport }) {
  const exactCommands = draft.exactCommandSequence ?? [];
  const packageFiles = draft.packageFiles ?? [];
  const approvedIds = new Set((authorizations.authorizations ?? []).map((row) => row.approvalId));
  const a16OwnerApprovalConsumed = consumedA16OwnerApproval(authorizations, postExtractionReport);

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
	    {
	      id: "two-canonical-a16-approvals-recorded",
	      status: (approvedIds.has("a16-research-and-learning-science") && approvedIds.has("codex-a16-research-evidence-closure")) || a16OwnerApprovalConsumed ? "pass" : "fail",
	      detail: a16OwnerApprovalConsumed
	        ? "Canonical input keeps the lifecycle row and the A16 owner-package row is consumed by verified post-extraction evidence."
	        : "Canonical owner authorization input contains both A16 approval IDs."
	    },
    {
      id: "pre-execution-validation-ready",
      status: report.summary?.preExecutionValidationReady === true ? "pass" : "fail",
      detail: `checks=${report.summary?.passingChecks ?? 0}/${report.summary?.totalChecks ?? 0}`
    },
    {
      id: "one-execution-docket-row",
      status: (docket.authorizationRows ?? []).length === 1 && draft.approvalId === "a16-root-pathspec-commit-execution" ? "pass" : "fail",
      detail: `authorization rows=${(docket.authorizationRows ?? []).length}`
    },
    {
      id: "two-exact-commands",
      status: exactCommands.length === 2 &&
        exactCommands[0] === "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" &&
        exactCommands[1] === "git commit -m \"Add A16 research evidence package\""
        ? "pass"
        : "fail",
      detail: `exact commands=${exactCommands.length}`
    },
    {
      id: "six-research-package-files",
      status: packageFiles.length === 6 && packageFiles.every((filePath) => filePath.startsWith("coordination/research/")) ? "pass" : "fail",
      detail: `package files=${packageFiles.length}`
    },
    {
      id: "six-package-fingerprints",
      status: (draft.packageFingerprints ?? []).length === 6 &&
        typeof draft.packageFingerprintSha256 === "string" &&
        draft.packageFingerprintSha256.length === 64
        ? "pass"
        : "fail",
      detail: `package fingerprints=${(draft.packageFingerprints ?? []).length}`
    },
    {
      id: "required-execution-text-present",
      status: typeof draft.requiredExecutionText === "string" &&
        draft.requiredExecutionText.includes("Authorize separate execution") &&
        draft.requiredExecutionText.includes("No cleanup") &&
        draft.requiredExecutionText.includes("broad staging")
        ? "pass"
        : "fail",
      detail: "Draft includes the exact copyable owner instruction text from the A16 execution docket."
    },
    {
      id: "no-real-instruction-rows-yet",
      status: instructions.length === 0 ? "pass" : "fail",
      detail: `instruction rows=${instructions.length}`
    },
    {
      id: "non-executable-boundary",
      status: dirtyMap.statusCounts?.expandedStatusEntries >= 0 &&
        authorizations.cleanupAuthorized === false &&
        authorizations.executableNow === false &&
        draft.cleanupAuthorized === false &&
        draft.executableNow === false
        ? "pass"
        : "fail",
      detail: "The scaffold remains input-only and non-executable."
    }
  ];
}

export function buildA16ExecutionInstructionInputScaffold() {
  const dirtyMap = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.dirtyMap);
  const authorizations = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.ownerAuthorizations);
	  const docket = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.executionAuthorizationDocket);
	  const report = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.preExecutionValidationReport);
	  const postExtractionReport = readOptionalJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.postExtractionVerification);
	  const instructions = currentInstructions();
	  const draft = buildDraft({ docket, report });
	  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, authorizations, docket, report, postExtractionReport });
	  const checks = acceptanceChecks({ dirtyMap, authorizations, docket, report, draft, instructions, sourceFailures, postExtractionReport });
	  const failedChecks = checks.filter((row) => row.status !== "pass");
	  const verifiedPostExtraction = postExtractionVerified(postExtractionReport);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    scaffoldKind: "a16-execution-instruction-input",
    note: "A25 scaffold only. This prepares the next owner execution-instruction input for A16, but it does not authorize or run Git commands.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
	      ownerAuthorizationsGeneratedAt: authorizations.generatedAt,
	      executionAuthorizationDocketGeneratedAt: docket.generatedAt,
	      preExecutionValidationReportGeneratedAt: report.generatedAt,
	      postExtractionVerificationReportGeneratedAt: postExtractionReport?.generatedAt ?? null
	    },
    sourceCurrentnessFailures: sourceFailures,
    candidateId: report.candidateId,
    cleanupAuthorized: false,
    executableNow: false,
    summary: {
      draftInstructionRows: 1,
      instructionRowsInFile: instructions.length,
      validInstructionRows: 0,
	      readyForSeparateInstructionRows: failedChecks.length === 0 && !verifiedPostExtraction ? 1 : 0,
	      postExtractionVerified: verifiedPostExtraction,
      packageFileRows: draft.packageFiles.length,
      packageFingerprintRows: draft.packageFingerprints.length,
      packageFingerprintSha256: draft.packageFingerprintSha256,
      exactCommandRows: draft.exactCommandSequence.length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    instructions,
    draftInstructionsDoNotExecute: [draft],
    acceptanceChecks: checks,
    boundary: {
      evidenceOnly: true,
      scaffoldOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: true
    },
    notAuthorizedByThisScaffold: [
      "git add",
      "git commit",
      "git reset",
      "git restore",
      "git clean",
      "git push",
      "worktree removal",
      "branch deletion",
      "deploy",
      "cleanup apply"
    ]
  };
}

export function stableA16ExecutionInstructionInputScaffoldProjection(payload) {
  const sourceArtifacts = { ...(payload.sourceArtifacts ?? {}) };
  delete sourceArtifacts.postExtractionVerificationReportGeneratedAt;
  return {
    repoRoot: payload.repoRoot,
    scaffoldKind: payload.scaffoldKind,
    note: payload.note,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    candidateId: payload.candidateId,
    cleanupAuthorized: payload.cleanupAuthorized,
    executableNow: payload.executableNow,
    summary: payload.summary,
    instructions: payload.instructions,
    draftInstructionsDoNotExecute: payload.draftInstructionsDoNotExecute,
    acceptanceChecks: payload.acceptanceChecks,
    boundary: payload.boundary,
    notAuthorizedByThisScaffold: payload.notAuthorizedByThisScaffold
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const draft = payload.draftInstructionsDoNotExecute[0] ?? {};
  const commandRows = (draft.exactCommandSequence ?? []).map((command, index) => `${index + 1}. \`${command}\``).join("\n");
  const fileRows = (draft.packageFiles ?? []).map((filePath) => `- \`${filePath}\``).join("\n");
  const checkRows = payload.acceptanceChecks
    .map((check) => `| \`${cell(check.id)}\` | ${cell(check.status)} | ${cell(check.detail)} |`)
    .join("\n");

  return `# A25 A16 Execution Instruction Input Scaffold

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Candidate: \`${payload.candidateId}\`

This scaffold prepares the next owner execution-instruction input for the A16 research evidence package. It does not record execution approval, does not stage, does not commit, does not merge, does not clean, does not push, does not deploy, and does not remove worktrees or branches.

## Summary

- Draft instruction rows: ${payload.summary.draftInstructionRows}
- Real instruction rows: ${payload.summary.instructionRowsInFile}
	- Ready for separate instruction rows: ${payload.summary.readyForSeparateInstructionRows}
	- Post-extraction verified: ${payload.summary.postExtractionVerified ? "yes" : "no"}
	- Package file rows: ${payload.summary.packageFileRows}
- Exact command rows: ${payload.summary.exactCommandRows}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Required Owner Execution Text

\`\`\`text
${draft.requiredExecutionText ?? ""}
\`\`\`

## Future Exact Command Sequence

${commandRows}

## Package Files

${fileRows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

- Records owner approval: false.
- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- A separate owner execution instruction is still required before any Git command can run.
`;
}

function main() {
  const payload = buildA16ExecutionInstructionInputScaffold();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson, json);
  write(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.datedJson, json);
  write(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestMarkdown, md);
  write(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson,
    latestMarkdown: A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestMarkdown,
    draftInstructionRows: payload.summary.draftInstructionRows,
    instructionRowsInFile: payload.summary.instructionRowsInFile,
    readyForSeparateInstructionRows: payload.summary.readyForSeparateInstructionRows,
    packageFileRows: payload.summary.packageFileRows,
    exactCommandRows: payload.summary.exactCommandRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
