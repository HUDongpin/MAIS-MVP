#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS,
  buildA16AuthorizedPackageExtractionRequest
} from "./generate-a16-authorized-package-extraction-request.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  packageExtractionRequest: "coordination/release-intake/latest-A25-a16-authorized-package-extraction-request.json",
  latestJson: "coordination/release-intake/latest-A25-a16-execution-authorization-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-execution-authorization-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-execution-authorization-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-execution-authorization-docket.md`
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function packageInstruction(request) {
  return (request.proposedSeparateOwnerInstructions ?? [])
    .find((row) => row.id === "a16-root-pathspec-commit-request") ?? null;
}

function lifecycleInstruction(request) {
  return (request.proposedSeparateOwnerInstructions ?? [])
    .find((row) => row.id === "a16-physical-lifecycle-hold-request") ?? null;
}

function commandText(instruction) {
  return (instruction?.commandSequence ?? []).map((row) => row.command);
}

function currentnessFailures(dirtyMap, request) {
  const failures = [];
  const rebuiltRequest = buildA16AuthorizedPackageExtractionRequest();
  if (request.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("A16 package extraction request dirty-map signature is stale");
  if (request.expandedStatusEntries !== (dirtyMap.statusCounts?.expandedStatusEntries ?? null)) {
    failures.push("A16 package extraction request expanded dirty entry count is stale");
  }
  if (!sameJson(
    request.summary,
    rebuiltRequest.summary
  )) {
    failures.push("A16 package extraction request summary is stale");
  }
  if ((request.sourceCurrentnessFailures ?? []).length !== 0) failures.push("A16 package extraction request has source currentness failures");
  return failures;
}

function buildAuthorizationRow({ request, instruction, lifecycle }) {
  const commands = commandText(instruction);
  return {
    approvalId: "a16-root-pathspec-commit-execution",
    owner: "A16 research and learning science",
    sourceApprovalIds: instruction.approvalIds ?? [],
    status: "ready-for-owner-execution-authorization",
    proposedOnly: true,
    targetCwd: instruction.targetCwd,
    exactCommandSequence: commands,
    packageFiles: request.candidate?.packageFiles ?? [],
    evidenceReviewed: [
      A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.packageExtractionRequest,
      A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestJson,
      A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec,
      A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.readyCandidateAcceptanceDocket
    ],
    requiredPreExecutionChecks: instruction.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: instruction.requiredPostExecutionChecks ?? [],
    copyableAuthorizationText: instruction.ownerInstructionText,
    companionLifecycleHoldText: lifecycle?.ownerInstructionText ?? "",
    notAuthorizedByThisDocket: [
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
    ],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function acceptanceChecks({ request, authorizationRow, lifecycle }) {
  const commands = authorizationRow.exactCommandSequence ?? [];
  const packageFiles = authorizationRow.packageFiles ?? [];
  return [
    {
      id: "source-request-current",
      status: (request.sourceCurrentnessFailures ?? []).length === 0 ? "pass" : "fail",
      detail: "A16 package extraction request has no source currentness failures."
    },
    {
      id: "two-source-approvals",
      status: (authorizationRow.sourceApprovalIds ?? []).length === 2 ? "pass" : "fail",
      detail: `source approvals=${(authorizationRow.sourceApprovalIds ?? []).join(",")}`
    },
    {
      id: "six-package-files",
      status: packageFiles.length === 6 ? "pass" : "fail",
      detail: `package files=${packageFiles.length}`
    },
    {
      id: "all-package-files-research",
      status: packageFiles.every((item) => item.startsWith("coordination/research/")) ? "pass" : "fail",
      detail: "Package files stay inside coordination/research/."
    },
    {
      id: "two-exact-commands",
      status: commands.length === 2 ? "pass" : "fail",
      detail: `commands=${commands.length}`
    },
    {
      id: "pathspec-only-stage-command",
      status: commands[0] === "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" ? "pass" : "fail",
      detail: commands[0] ?? ""
    },
    {
      id: "single-package-commit-command",
      status: commands[1] === "git commit -m \"Add A16 research evidence package\"" ? "pass" : "fail",
      detail: commands[1] ?? ""
    },
    {
      id: "lifecycle-hold-has-no-command",
      status: (lifecycle?.commandSequence ?? []).length === 0 ? "pass" : "fail",
      detail: "Physical lifecycle remains a hold, not cleanup."
    },
    {
      id: "copyable-authorization-text-present",
      status: typeof authorizationRow.copyableAuthorizationText === "string" && authorizationRow.copyableAuthorizationText.includes("Authorize separate execution") ? "pass" : "fail",
      detail: "Owner can copy one exact instruction text."
    },
    {
      id: "non-executable-boundary",
      status: authorizationRow.cleanupAuthorized === false && authorizationRow.executableNow === false ? "pass" : "fail",
      detail: "Docket rows remain non-executable."
    }
  ];
}

export function buildA16ExecutionAuthorizationDocket() {
  const dirtyMap = readJson(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.dirtyMap);
  const request = readJson(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.packageExtractionRequest);
  const instruction = packageInstruction(request);
  const lifecycle = lifecycleInstruction(request);
  const authorizationRow = buildAuthorizationRow({ request, instruction, lifecycle });
  const checks = acceptanceChecks({ request, authorizationRow, lifecycle });
  const failedChecks = checks.filter((row) => row.status !== "pass");
  const sourceCurrentnessFailures = currentnessFailures(dirtyMap, request);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      packageExtractionRequestGeneratedAt: request.generatedAt,
      packageExtractionRequestPath: A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.packageExtractionRequest
    },
    sourceCurrentnessFailures,
    authorizationRows: [authorizationRow],
    lifecycleHoldRows: [
      {
        approvalId: "codex-a16-research-evidence-closure",
        status: lifecycle?.status ?? "",
        ownerInstructionText: lifecycle?.ownerInstructionText ?? "",
        commandSequence: lifecycle?.commandSequence ?? [],
        cleanupAuthorized: false,
        executableNow: false
      }
    ],
    acceptanceChecks: checks,
    summary: {
      authorizationRows: 1,
      lifecycleHoldRows: 1,
      packageFileRows: authorizationRow.packageFiles.length,
      exactCommandRows: authorizationRow.exactCommandSequence.length,
      copyableAuthorizationTexts: 1,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      docketOnly: true,
      proposedOnly: true,
      writesExecutionInstructions: false,
      recordsOwnerApproval: false,
      stagingAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: true
    }
  };
}

export function stableA16ExecutionAuthorizationDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    authorizationRows: payload.authorizationRows,
    lifecycleHoldRows: payload.lifecycleHoldRows,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  const row = payload.authorizationRows[0] ?? {};
  const checks = payload.acceptanceChecks
    .map((check) => `| \`${check.id}\` | ${check.status} | ${check.detail} |`)
    .join("\n");
  const files = (row.packageFiles ?? []).map((item) => `- \`${item}\``).join("\n");
  const commands = (row.exactCommandSequence ?? []).map((item, index) => `${index + 1}. \`${item}\``).join("\n");

  return `# A25 A16 Execution Authorization Docket

Generated: ${payload.generatedAt}

This docket is evidence-only. It gives the owner one exact execution authorization text for the A16 research evidence package, but it does not record approval, does not write execution instructions, does not stage, does not commit, does not merge, does not clean, does not push, does not deploy, and does not remove worktrees or branches.

## Summary

- Authorization rows: ${payload.summary.authorizationRows}
- Lifecycle hold rows: ${payload.summary.lifecycleHoldRows}
- Package files: ${payload.summary.packageFileRows}
- Exact command rows: ${payload.summary.exactCommandRows}
- Copyable authorization texts: ${payload.summary.copyableAuthorizationTexts}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Exact Commands For Future Owner Instruction

${commands}

## Copyable Owner Authorization Text

\`\`\`text
${row.copyableAuthorizationText ?? ""}
\`\`\`

## Companion Lifecycle Hold Text

\`\`\`text
${row.companionLifecycleHoldText ?? ""}
\`\`\`

## Package Files

${files}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Docket only: true.
- Proposed only: true.
- Writes execution instructions: false.
- Records owner approval: false.
- Staging authorized: false.
- Commit authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- A separate owner instruction naming the exact approval IDs and exact commands is still required before any Git command can run.
`;
}

function main() {
  const payload = buildA16ExecutionAuthorizationDocket();
  write(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestMarkdown, markdown(payload));
  write(A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestJson,
    latestMarkdown: A16_EXECUTION_AUTHORIZATION_DOCKET_PATHS.latestMarkdown,
    authorizationRows: payload.summary.authorizationRows,
    packageFileRows: payload.summary.packageFileRows,
    exactCommandRows: payload.summary.exactCommandRows,
    copyableAuthorizationTexts: payload.summary.copyableAuthorizationTexts,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
