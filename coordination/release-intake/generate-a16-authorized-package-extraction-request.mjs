#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizedCommandManifest: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  executionPreview: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  readyCandidateAcceptanceDocket: "coordination/release-intake/latest-A25-ready-candidate-owner-acceptance-docket.json",
  postExtractionVerification: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  ownerPathspec: "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  ownerWorkOrder: "coordination/release-intake/latest-A25-effective-work-order-a16-research-and-learning-science.md",
  latestJson: "coordination/release-intake/latest-A25-a16-authorized-package-extraction-request.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-authorized-package-extraction-request.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-authorized-package-extraction-request.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-authorized-package-extraction-request.md`
};

const OWNER_APPROVAL_ID = "a16-research-and-learning-science";
const LIFECYCLE_APPROVAL_ID = "codex-a16-research-evidence-closure";

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

function readOptionalJson(relativePath) {
  const absolutePath = absolute(relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function pathspecRows() {
  return readText(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusRows(paths) {
  if (paths.length === 0) return [];
  const output = git(["status", "--short", "--", ...paths]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3)
    }));
}

function candidateById(manifest, approvalId) {
  return (manifest.candidates ?? []).find((candidate) => candidate.approvalId === approvalId) ?? null;
}

function previewRowById(preview, approvalId) {
  return (preview.rows ?? []).find((row) => row.approvalId === approvalId) ?? null;
}

function currentnessFailures({ dirtyMap, manifest, preview, docket, postExtractionReport }) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const failures = [];
  for (const [label, artifact] of [
    ["authorized command manifest", manifest],
    ["authorization execution preview", preview]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    if (Array.isArray(artifact.failures) && artifact.failures.length > 0) failures.push(`${label} has failures`);
    if (Array.isArray(artifact.sourceCurrentnessFailures) && artifact.sourceCurrentnessFailures.length > 0) {
      failures.push(`${label} has source currentness failures`);
    }
  }
  if (!postExtractionVerified(postExtractionReport)) {
    if (docket.dirtyMapStatusSignature !== expectedSignature) failures.push("ready candidate acceptance docket dirty-map signature is stale");
    if (docket.expandedStatusEntries !== expectedEntries) failures.push("ready candidate acceptance docket expanded dirty entry count is stale");
    if (Array.isArray(docket.failures) && docket.failures.length > 0) failures.push("ready candidate acceptance docket has failures");
    if (Array.isArray(docket.sourceCurrentnessFailures) && docket.sourceCurrentnessFailures.length > 0) {
      failures.push("ready candidate acceptance docket has source currentness failures");
    }
  }
  return failures;
}

function packageExtractionInstruction(paths) {
  return {
    id: "a16-root-pathspec-commit-request",
    approvalIds: [OWNER_APPROVAL_ID, LIFECYCLE_APPROVAL_ID],
    status: "proposed-for-separate-owner-instruction",
    proposedOnly: true,
    targetCwd: root,
    commandSequence: [
      {
        order: 1,
        command: `git add --pathspec-from-file=${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec}`,
        purpose: "Stage only the six owner-approved A16 research evidence paths."
      },
      {
        order: 2,
        command: "git commit -m \"Add A16 research evidence package\"",
        purpose: "Create one reviewed package commit after the pathspec-only staging check is accepted."
      }
    ],
    requiredPreExecutionChecks: [
      `node coordination/release-intake/review-owner-pathspec.mjs ${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec} --status`,
      `node coordination/release-intake/review-owner-pathspec.mjs ${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec} --diffstat`,
      "node coordination/release-intake/assert-next-owner-authorizations-current.mjs --json",
      "node coordination/release-intake/assert-a16-authorized-package-extraction-request-current.mjs --json",
      "node coordination/release-intake/assert-no-staged-changes.mjs --json"
    ],
    requiredPostExecutionChecks: [
      "node coordination/release-intake/assert-no-staged-changes.mjs --json",
      "npm run release:dirty-map -- --reason \"A25 post-A16 package extraction commit\"",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs --json"
    ],
    ownerInstructionText: `Authorize separate execution for approvalIds=${OWNER_APPROVAL_ID},${LIFECYCLE_APPROVAL_ID}; cwd=${root}; commandSequence=\"git add --pathspec-from-file=${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec}\" then \"git commit -m 'Add A16 research evidence package'\"; approvedBy=dongpinhu; approvedAt=<ISO-8601>; notes=Stage and commit only the ${paths.length} A16 research evidence files listed in ${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec}. No cleanup, worktree removal, branch deletion, reset, clean, push, deploy, broad staging, or unrelated dirty-root inventory is authorized.`,
    forbiddenWithoutSeparateOwnerInstruction: [
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

function lifecycleHoldInstruction() {
  return {
    id: "a16-physical-lifecycle-hold-request",
    approvalId: LIFECYCLE_APPROVAL_ID,
    status: "hold-after-package-extraction-until-cleanup-is-separately-approved",
    proposedOnly: true,
    targetWorktree: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure",
    commandSequence: [],
    ownerInstructionText: `Record approvalId=${LIFECYCLE_APPROVAL_ID} as validated package-extraction hold after the A16 package commit/extraction is complete. No worktree removal, branch deletion, cleanup, reset, clean, push, deploy, or physical lifecycle command is authorized by this hold request.`,
    whyNoCommandYet: "The approved lifecycle final state is owner-reviewed commit or package extraction, not physical cleanup. A worktree removal or branch deletion command would require a later A22/A25 cleanup authorization packet."
  };
}

function postExtractionVerified(report) {
  return report?.postExtractionVerified === true
    && report?.lifecycleStatus === "post-extraction-verified"
    && (report?.summary?.packageStatusRows ?? 1) === 0
    && (report?.summary?.stagedPackageRows ?? 1) === 0
    && (report?.latestPackageCommit?.files ?? []).length === 6;
}

function consumedOwnerApproval(docket, report) {
  return postExtractionVerified(report)
    && (docket.ownerDecisionDocket?.consumedApprovalIds ?? []).includes(OWNER_APPROVAL_ID);
}

function checks({ paths, rows, ownerCandidate, lifecycleCandidate, ownerPreviewRow, lifecyclePreviewRow, docket, postExtractionReport }) {
  const verifiedExtraction = postExtractionVerified(postExtractionReport);
  const ownerApprovalSatisfied = Boolean(ownerCandidate?.approvedBy) || consumedOwnerApproval(docket, postExtractionReport);
  const activeAndConsumedApprovalRows = (docket.summary?.authorizedApprovalRows ?? 0) + (docket.summary?.consumedApprovalRows ?? 0);
  const committedResearchFiles = (postExtractionReport?.latestPackageCommit?.files ?? [])
    .filter((filePath) => filePath.startsWith("coordination/research/"));
  return [
    {
      id: "owner-authorization-recorded",
      status: ownerApprovalSatisfied ? "pass" : "fail",
      detail: `approvalId=${OWNER_APPROVAL_ID}`
    },
    {
      id: "lifecycle-authorization-recorded",
      status: lifecycleCandidate?.approvedBy ? "pass" : "fail",
      detail: `approvalId=${LIFECYCLE_APPROVAL_ID}`
    },
    {
      id: "owner-candidate-blocked-for-exact-command",
      status: verifiedExtraction || (ownerCandidate?.readyForSeparateInstruction === false && (ownerCandidate?.blockers ?? []).some((item) => item.includes("no exact command"))) ? "pass" : "fail",
      detail: verifiedExtraction ? "The exact-command gap was consumed by the verified A16 package extraction commit." : "The request exists to close this exact-command gap."
    },
    {
      id: "lifecycle-candidate-blocked-for-exact-command",
      status: lifecycleCandidate?.readyForSeparateInstruction === false && (lifecycleCandidate?.blockers ?? []).some((item) => item.includes("no exact command")) ? "pass" : "fail",
      detail: "The lifecycle row remains non-executable."
    },
    {
      id: "pathspec-file-count",
      status: paths.length === 6 ? "pass" : "fail",
      detail: `paths=${paths.length}`
    },
    {
      id: "status-file-count",
      status: rows.length === paths.length || (verifiedExtraction && rows.length === 0) ? "pass" : "fail",
      detail: `statusRows=${rows.length}`
    },
    {
      id: "all-paths-untracked-research-evidence",
      status: rows.length > 0
        ? rows.every((row) => row.status === "??" && row.path.startsWith("coordination/research/")) ? "pass" : "fail"
        : verifiedExtraction && committedResearchFiles.length === 6 ? "pass" : "fail",
      detail: "Every package path must remain untracked coordination/research evidence."
    },
    {
      id: "acceptance-docket-authorized",
      status: verifiedExtraction
        ? consumedOwnerApproval(docket, postExtractionReport) && Boolean(lifecycleCandidate?.approvedBy) ? "pass" : "fail"
        : activeAndConsumedApprovalRows === 2 && (docket.summary?.pendingApprovalRows ?? -1) === 0 ? "pass" : "fail",
      detail: verifiedExtraction
        ? "A16 owner-package approval is consumed by verified extraction and the physical lifecycle row remains authorized."
        : "A16 ready-candidate owner docket reflects both recorded approvals."
    },
    {
      id: "preview-requires-separate-instruction",
      status: verifiedExtraction || (ownerPreviewRow?.requiresSeparateExecutionInstruction === true && lifecyclePreviewRow?.requiresSeparateExecutionInstruction === true) ? "pass" : "fail",
      detail: verifiedExtraction ? "The package extraction instruction has already been consumed and verified." : "Both rows still require a separate owner execution instruction."
    }
  ];
}

export function buildA16AuthorizedPackageExtractionRequest() {
  const dirtyMap = readJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.dirtyMap);
  const manifest = readJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.authorizedCommandManifest);
  const preview = readJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.executionPreview);
  const docket = readJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.readyCandidateAcceptanceDocket);
  const postExtractionReport = readOptionalJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.postExtractionVerification);
  const paths = pathspecRows();
  const rows = statusRows(paths);
  const ownerCandidate = candidateById(manifest, OWNER_APPROVAL_ID);
  const lifecycleCandidate = candidateById(manifest, LIFECYCLE_APPROVAL_ID);
  const ownerPreviewRow = previewRowById(preview, OWNER_APPROVAL_ID);
  const lifecyclePreviewRow = previewRowById(preview, LIFECYCLE_APPROVAL_ID);
  const acceptanceChecks = checks({
    paths,
    rows,
    ownerCandidate,
	    lifecycleCandidate,
	    ownerPreviewRow,
	    lifecyclePreviewRow,
	    docket,
	    postExtractionReport
	  });
  const failedChecks = acceptanceChecks.filter((row) => row.status !== "pass");
  const sourceCurrentnessFailures = currentnessFailures({ dirtyMap, manifest, preview, docket, postExtractionReport });
  const proposedInstructions = [
    packageExtractionInstruction(paths),
    lifecycleHoldInstruction()
  ];

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      authorizedCommandManifestGeneratedAt: manifest.generatedAt,
      executionPreviewGeneratedAt: preview.generatedAt,
      readyCandidateAcceptanceDocketGeneratedAt: docket.generatedAt
    },
    sourceCurrentnessFailures,
    candidate: {
      candidateId: docket.summary?.candidateId ?? "",
      ownerApprovalId: OWNER_APPROVAL_ID,
      lifecycleApprovalId: LIFECYCLE_APPROVAL_ID,
	      selectedFinalStates: [
	        ownerCandidate?.selectedFinalState ?? "",
	        lifecycleCandidate?.selectedFinalState ?? ""
	      ],
	      packageFiles: paths,
	      statusRows: rows,
	      postExtractionVerified: postExtractionVerified(postExtractionReport),
	      latestPackageCommit: postExtractionReport?.latestPackageCommit ?? null
	    },
    currentBlockers: [
      ...(ownerCandidate?.blockers ?? []).map((blocker) => ({ approvalId: OWNER_APPROVAL_ID, blocker })),
      ...(lifecycleCandidate?.blockers ?? []).map((blocker) => ({ approvalId: LIFECYCLE_APPROVAL_ID, blocker }))
    ],
    proposedSeparateOwnerInstructions: proposedInstructions,
    acceptanceChecks,
    summary: {
	      approvedRows: [
	        Boolean(ownerCandidate?.approvedBy) || consumedOwnerApproval(docket, postExtractionReport),
	        Boolean(lifecycleCandidate?.approvedBy)
	      ].filter(Boolean).length,
	      packageFileRows: paths.length,
	      statusRows: rows.length,
	      untrackedResearchRows: rows.filter((row) => row.status === "??" && row.path.startsWith("coordination/research/")).length,
	      committedResearchRows: (postExtractionReport?.latestPackageCommit?.files ?? [])
	        .filter((filePath) => filePath.startsWith("coordination/research/")).length,
	      postExtractionVerified: postExtractionVerified(postExtractionReport),
      proposedInstructionRows: proposedInstructions.length,
      proposedCommandRows: proposedInstructions.flatMap((row) => row.commandSequence).length,
      readyForSeparateInstructionRows: 0,
      validExecutionInstructionRows: 0,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      acceptanceChecks: acceptanceChecks.length,
      passingAcceptanceChecks: acceptanceChecks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      requestOnly: true,
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

export function stableA16AuthorizedPackageExtractionRequestProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    candidate: payload.candidate,
    currentBlockers: payload.currentBlockers,
    proposedSeparateOwnerInstructions: payload.proposedSeparateOwnerInstructions,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function markdown(payload) {
  const checksTable = payload.acceptanceChecks
    .map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`)
    .join("\n");
  const fileRows = payload.candidate.packageFiles
    .map((item) => `- \`${item}\``)
    .join("\n");
  const instructionRows = payload.proposedSeparateOwnerInstructions
    .map((item, index) => {
      const commands = item.commandSequence.length > 0
        ? item.commandSequence.map((command) => `  ${command.order}. \`${command.command}\` - ${command.purpose}`).join("\n")
        : "  - No command is proposed for this lifecycle hold.";
      return `### ${index + 1}. ${item.id}

- Status: ${item.status}
- Proposed only: ${item.proposedOnly ? "yes" : "no"}
- Owner instruction text:

\`\`\`text
${item.ownerInstructionText}
\`\`\`

Commands:
${commands}`;
    })
    .join("\n\n");

  return `# A25 A16 Authorized Package Extraction Request

Generated: ${payload.generatedAt}

This request is evidence-only. It translates the already recorded A16 approvals into the next exact owner-instruction surface, but it does not write execution instructions, stage files, commit, merge, clean, remove worktrees, delete branches, push, deploy, or authorize any command.

## Summary

- Candidate: \`${payload.candidate.candidateId}\`
- Approved rows: ${payload.summary.approvedRows}
	- Package files: ${payload.summary.packageFileRows}
	- Untracked research rows: ${payload.summary.untrackedResearchRows}
	- Committed research rows: ${payload.summary.committedResearchRows}
	- Post-extraction verified: ${payload.summary.postExtractionVerified ? "yes" : "no"}
	- Proposed instruction rows: ${payload.summary.proposedInstructionRows}
- Proposed command rows: ${payload.summary.proposedCommandRows}
- Ready for separate instruction rows: ${payload.summary.readyForSeparateInstructionRows}
- Valid execution instruction rows: ${payload.summary.validExecutionInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Package Files

${fileRows}

## Why This Exists

The current authorized command manifest has two authorized A16 candidates, but both remain blocked because no exact command is available and a separate owner execution instruction is still required.

## Proposed Separate Owner Instructions

${instructionRows}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checksTable}

## Boundary

- Request only: true.
- Proposed only: true.
- Writes execution instructions: false.
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
  const payload = buildA16AuthorizedPackageExtractionRequest();
  write(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestMarkdown, markdown(payload));
  write(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestJson,
    latestMarkdown: A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestMarkdown,
    approvedRows: payload.summary.approvedRows,
    packageFileRows: payload.summary.packageFileRows,
    proposedInstructionRows: payload.summary.proposedInstructionRows,
    proposedCommandRows: payload.summary.proposedCommandRows,
    acceptanceChecks: payload.summary.acceptanceChecks,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
