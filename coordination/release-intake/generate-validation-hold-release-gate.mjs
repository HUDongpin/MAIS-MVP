#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validationHoldWithCommands } from "./validation-hold.mjs";
import { REQUIRED_OWNER_CONFIRMATION_TEXT_ZH } from "./generate-validation-hold-release-confirmation-scaffold.mjs";
import {
  VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS,
  buildValidationHoldReleaseConfirmationRecordingState,
  stableOwnerConfirmationRecordProjection,
  stableValidationHoldReleaseConfirmationRecordingProjection
} from "./run-validation-hold-release-confirmation-recording.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATION_HOLD_RELEASE_GATE_PATHS = {
  ownerConfirmationRecord: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.ownerConfirmationRecord,
  recordingDryRun: VALIDATION_HOLD_RELEASE_CONFIRMATION_RECORDING_PATHS.latestDryRunJson,
  recordingGate: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-recording-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-validation-hold-release-gate.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validation-hold-release-gate.md",
  datedJson: `coordination/release-intake/${date}-A25-validation-hold-release-gate.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validation-hold-release-gate.md`
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

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function parseWorktreePorcelain(raw) {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const row = {};
      for (const line of block.split("\n")) {
        const [key, ...rest] = line.split(" ");
        row[key] = rest.join(" ");
      }
      return {
        path: row.worktree ?? "",
        head: row.HEAD ?? "",
        branch: row.branch ?? "",
        bare: row.bare === "true",
        detached: Object.prototype.hasOwnProperty.call(row, "detached")
      };
    });
}

function readGitWorktrees() {
  const raw = git(["worktree", "list", "--porcelain"]);
  return parseWorktreePorcelain(raw);
}

function inspectWorktreePath(activeWorktreePath) {
  const existsOnDisk = fs.existsSync(activeWorktreePath);
  const lstat = existsOnDisk ? fs.lstatSync(activeWorktreePath) : null;
  const gitStatus = existsOnDisk && lstat?.isDirectory()
    ? git(["-C", activeWorktreePath, "status", "--short"])
    : "";
  const statusRows = gitStatus ? gitStatus.split("\n").filter(Boolean) : [];
  const branch = existsOnDisk && lstat?.isDirectory()
    ? git(["-C", activeWorktreePath, "rev-parse", "--abbrev-ref", "HEAD"])
    : "";
  const head = existsOnDisk && lstat?.isDirectory()
    ? git(["-C", activeWorktreePath, "rev-parse", "HEAD"])
    : "";

  return {
    path: activeWorktreePath,
    existsOnDisk,
    isDirectory: lstat?.isDirectory() ?? false,
    isSymbolicLink: lstat?.isSymbolicLink() ?? false,
    branch,
    head,
    statusEntryCount: statusRows.length,
    statusPreview: statusRows.slice(0, 20),
    statusPreviewTruncated: statusRows.length > 20
  };
}

function readWorktreePruneDryRun() {
  const output = git(["worktree", "prune", "--dry-run", "--verbose"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function validateOwnerConfirmationRecord(record, validationHold) {
  const failures = [];
  if (!record || typeof record !== "object") return { valid: false, failures: ["owner confirmation record is missing"] };
  if (record.recordKind !== "a25-validation-hold-release-owner-confirmation-record") failures.push("recordKind is invalid");
  if (record.sourceOwnerConfirmationInput !== "coordination/release-intake/latest-A25-validation-hold-release-owner-confirmation.json") {
    failures.push("source owner confirmation input path is invalid");
  }
  if (!sameJson(record.validationHold, validationHold)) failures.push("validationHold snapshot does not match current validation hold contract");
  const ownerConfirmation = record.ownerConfirmation ?? {};
  if (ownerConfirmation.ownerConfirmed !== true) failures.push("ownerConfirmed must be true");
  if (ownerConfirmation.confirmationText !== REQUIRED_OWNER_CONFIRMATION_TEXT_ZH) {
    failures.push("confirmationText must match the required owner confirmation text exactly");
  }
  if (ownerConfirmation.activeWorktreePath !== validationHold.activeWorktreePath) {
    failures.push("activeWorktreePath must match the validation hold worktree path");
  }
  if (ownerConfirmation.scope !== "validation-hold-release-review-only") {
    failures.push("scope must be validation-hold-release-review-only");
  }
  for (const key of ["mergeAuthorized", "cleanupAuthorized", "deployAuthorized", "destructiveGitAuthorized", "physicalLifecycleCleanupAuthorized"]) {
    if (ownerConfirmation[key] !== false) failures.push(`${key} must be false`);
  }
  const boundary = record.boundary ?? {};
  for (const [key, expected] of Object.entries({
    recordsOwnerConfirmation: true,
    releasesValidationHold: false,
    recordsAuthorization: false,
    recordsExecutionInstruction: false,
    stageAuthorized: false,
    commitAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false,
    deployAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    requiresSeparateValidationHoldReleaseGate: true
  })) {
    if (boundary[key] !== expected) failures.push(`record boundary.${key} must be ${expected}`);
  }
  return { valid: failures.length === 0, failures };
}

function sourceCurrentnessFailures({ recordingDryRun, recordingGate, currentRecordingState }) {
  const failures = [];
  if (!sameJson(
    stableValidationHoldReleaseConfirmationRecordingProjection(recordingDryRun),
    stableValidationHoldReleaseConfirmationRecordingProjection(currentRecordingState)
  )) {
    failures.push("validation-hold release confirmation recording dry-run is stale");
  }
  if ((recordingGate.failures ?? []).length > 0) failures.push("validation-hold release confirmation recording current gate has failures");
  if (recordingGate.ownerConfirmationAccepted !== true) failures.push("owner confirmation is not accepted by the recording current gate");
  if (recordingDryRun.summary?.ownerConfirmationAccepted !== true) failures.push("owner confirmation is not accepted by the recording dry-run");
  if (recordingDryRun.summary?.cleanupAuthorizedRows !== 0) failures.push("recording dry-run exposes cleanup-authorized rows");
  if (recordingDryRun.summary?.executableRows !== 0) failures.push("recording dry-run exposes executable rows");
  return failures;
}

function releaseGateStatus({ sourceFailures, ownerRecordPresent, ownerRecordValid, recordingCurrent, worktreeStillRegistered }) {
  if (sourceFailures.length > 0) return "blocked-source-stale";
  if (!ownerRecordPresent) return "blocked-missing-owner-confirmation-record";
  if (!ownerRecordValid) return "blocked-owner-confirmation-record-invalid";
  if (!recordingCurrent) return "blocked-recording-not-current";
  if (worktreeStillRegistered) return "blocked-worktree-still-registered";
  return "released";
}

function buildChecks({ status, sourceFailures, ownerRecordPresent, ownerRecordValidation, recordingCurrent, activeWorktreeMatch }) {
  const ownerRecordValid = ownerRecordValidation.valid === true;
  const worktreeStillRegistered = activeWorktreeMatch !== null;
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "owner-confirmation-record-present-or-blocked",
      status: ownerRecordPresent || status === "blocked-missing-owner-confirmation-record" ? "pass" : "fail",
      detail: `ownerRecordPresent=${ownerRecordPresent}`
    },
    {
      id: "owner-confirmation-record-valid-or-blocked",
      status: ownerRecordValid || status === "blocked-owner-confirmation-record-invalid" || status === "blocked-missing-owner-confirmation-record" ? "pass" : "fail",
      detail: `ownerRecordValid=${ownerRecordValid}; validationFailures=${ownerRecordValidation.failures.length}`
    },
    {
      id: "confirmation-recording-current-or-blocked",
      status: recordingCurrent || status === "blocked-recording-not-current" || status.startsWith("blocked-missing") || status.startsWith("blocked-owner") ? "pass" : "fail",
      detail: `recordingCurrent=${recordingCurrent}`
    },
    {
      id: "git-worktree-ledger-status-coherent",
      status: (worktreeStillRegistered
        ? status === "blocked-worktree-still-registered"
        : ["released", "blocked-source-stale", "blocked-missing-owner-confirmation-record", "blocked-owner-confirmation-record-invalid", "blocked-recording-not-current"].includes(status)) ? "pass" : "fail",
      detail: `activeWorktreeRegistered=${worktreeStillRegistered}`
    },
    {
      id: "release-only-when-worktree-absent",
      status: status !== "released" || worktreeStillRegistered === false ? "pass" : "fail",
      detail: `status=${status}; activeWorktreeRegistered=${worktreeStillRegistered}`
    },
    {
      id: "safe-boundary-no-cleanup-merge-deploy",
      status: "pass",
      detail: "this gate is evidence-only and grants no cleanup, merge, deploy, destructive git, or physical lifecycle cleanup"
    },
    {
      id: "status-coherent",
      status: [
        "blocked-source-stale",
        "blocked-missing-owner-confirmation-record",
        "blocked-owner-confirmation-record-invalid",
        "blocked-recording-not-current",
        "blocked-worktree-still-registered",
        "released"
      ].includes(status) ? "pass" : "fail",
      detail: `status=${status}`
    }
  ];
}

export function buildValidationHoldReleaseGate() {
  const validationHold = validationHoldWithCommands();
  const ownerRecordPresent = exists(VALIDATION_HOLD_RELEASE_GATE_PATHS.ownerConfirmationRecord);
  const recordingDryRun = readJson(VALIDATION_HOLD_RELEASE_GATE_PATHS.recordingDryRun);
  const recordingGate = readJson(VALIDATION_HOLD_RELEASE_GATE_PATHS.recordingGate);
  const currentRecordingState = buildValidationHoldReleaseConfirmationRecordingState();
  const ownerRecord = ownerRecordPresent ? readJson(VALIDATION_HOLD_RELEASE_GATE_PATHS.ownerConfirmationRecord) : null;
  const ownerRecordValidation = validateOwnerConfirmationRecord(ownerRecord, validationHold);
  const worktrees = readGitWorktrees();
  const activeWorktreeMatch = worktrees.find((row) => row.path === validationHold.activeWorktreePath) ?? null;
  const activeWorktreeFilesystem = inspectWorktreePath(validationHold.activeWorktreePath);
  const pruneDryRunRows = readWorktreePruneDryRun();
  const sourceFailures = sourceCurrentnessFailures({ recordingDryRun, recordingGate, currentRecordingState });
  const recordingCurrent = sourceFailures.length === 0;
  const status = releaseGateStatus({
    sourceFailures,
    ownerRecordPresent,
    ownerRecordValid: ownerRecordValidation.valid === true,
    recordingCurrent,
    worktreeStillRegistered: activeWorktreeMatch !== null
  });
  const checks = buildChecks({
    status,
    sourceFailures,
    ownerRecordPresent,
    ownerRecordValidation,
    recordingCurrent,
    activeWorktreeMatch
  });
  checks.splice(5, 0, {
    id: "active-worktree-filesystem-status-coherent",
    status: activeWorktreeMatch === null || activeWorktreeFilesystem.existsOnDisk === true ? "pass" : "fail",
    detail: `existsOnDisk=${activeWorktreeFilesystem.existsOnDisk}; statusEntryCount=${activeWorktreeFilesystem.statusEntryCount}; pruneDryRunRows=${pruneDryRunRows.length}`
  });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    gateKind: "a25-validation-hold-release-gate",
    gateStatus: status,
    validationHoldReleased: status === "released",
    validationHold,
    sourceArtifacts: {
      ownerConfirmationRecord: {
        path: VALIDATION_HOLD_RELEASE_GATE_PATHS.ownerConfirmationRecord,
        present: ownerRecordPresent,
        recordedAt: ownerRecord?.recordedAt ?? null,
        dirtyMapStatusSignature: ownerRecord?.dirtyMapStatusSignature ?? null,
        expandedStatusEntries: ownerRecord?.expandedStatusEntries ?? null
      },
      recordingDryRun: {
        path: VALIDATION_HOLD_RELEASE_GATE_PATHS.recordingDryRun,
        recorderStatus: recordingDryRun.recorderStatus ?? "missing",
        ownerConfirmationAccepted: recordingDryRun.summary?.ownerConfirmationAccepted === true,
        existingRecordPresent: recordingDryRun.existingRecordPresent === true,
        existingRecordMatchesCurrent: recordingDryRun.existingRecordMatchesCurrent === true
      },
      recordingGate: {
        path: VALIDATION_HOLD_RELEASE_GATE_PATHS.recordingGate,
        recorderStatus: recordingGate.recorderStatus ?? "missing",
        ownerConfirmationAccepted: recordingGate.ownerConfirmationAccepted === true,
        failures: recordingGate.failures ?? []
      }
    },
    sourceCurrentnessFailures: sourceFailures,
    ownerConfirmationRecord: {
      present: ownerRecordPresent,
      valid: ownerRecordValidation.valid === true,
      validationFailures: ownerRecordValidation.failures,
      stableProjection: stableOwnerConfirmationRecordProjection(ownerRecord)
    },
    gitWorktreeLedger: {
      activeWorktreePath: validationHold.activeWorktreePath,
      activeWorktreeRegistered: activeWorktreeMatch !== null,
      activeWorktreeMatch,
      worktreeCount: worktrees.length,
      activeWorktreeFilesystem,
      pruneDryRunRows
    },
    releaseGateChecks: checks,
    summary: {
      ownerConfirmationRecorded: ownerRecordPresent && ownerRecordValidation.valid === true,
      ownerConfirmationRecordPresent: ownerRecordPresent,
      ownerConfirmationRecordValid: ownerRecordValidation.valid === true,
      confirmationRecordingCurrent: recordingCurrent,
      worktreeStillRegistered: activeWorktreeMatch !== null,
      activeWorktreePathExists: activeWorktreeFilesystem.existsOnDisk,
      activeWorktreeDirtyStatusEntries: activeWorktreeFilesystem.statusEntryCount,
      worktreePruneDryRunRows: pruneDryRunRows.length,
      validationHoldReleased: status === "released",
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failedReleaseGateChecks: checks.filter((row) => row.status === "fail").length
    },
    boundary: {
      evidenceOnly: true,
      recordsOwnerConfirmation: false,
      releasesValidationHold: status === "released",
      recordsAuthorization: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false,
      requiresSeparateMergeInstruction: true,
      requiresSeparateCleanupInstruction: true,
      requiresSeparateDeployInstruction: true
    }
  };
}

export function stableValidationHoldReleaseGateProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    gateKind: payload.gateKind,
    gateStatus: payload.gateStatus,
    validationHoldReleased: payload.validationHoldReleased,
    validationHold: payload.validationHold,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    ownerConfirmationRecord: payload.ownerConfirmationRecord,
    gitWorktreeLedger: payload.gitWorktreeLedger,
    releaseGateChecks: payload.releaseGateChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const checkRows = payload.releaseGateChecks
    .map((row) => `| \`${row.id}\` | \`${row.status}\` | ${cell(row.detail)} |`)
    .join("\n");
  const ownerFailures = bullet(payload.ownerConfirmationRecord.validationFailures);
  const activeMatch = payload.gitWorktreeLedger.activeWorktreeMatch
    ? JSON.stringify(payload.gitWorktreeLedger.activeWorktreeMatch, null, 2)
    : "null";

  return `# A25 Validation Hold Release Gate

Generated: ${payload.generatedAt}

Gate status: \`${payload.gateStatus}\`

Validation hold released: ${payload.validationHoldReleased ? "yes" : "no"}

This gate is evidence-only. It reads the owner confirmation record, the validation-hold confirmation recording current gate, and Git's worktree ledger. It does not stage, commit, merge, cleanup, deploy, delete, prune, reset, restore, or perform physical lifecycle cleanup.

## Owner Confirmation

- Owner confirmation recorded: ${payload.summary.ownerConfirmationRecorded ? "yes" : "no"}
- Owner confirmation record present: ${payload.summary.ownerConfirmationRecordPresent ? "yes" : "no"}
- Owner confirmation record valid: ${payload.summary.ownerConfirmationRecordValid ? "yes" : "no"}
- Recording current: ${payload.summary.confirmationRecordingCurrent ? "yes" : "no"}
- Required confirmation text: \`${REQUIRED_OWNER_CONFIRMATION_TEXT_ZH}\`

Owner confirmation validation failures:

${ownerFailures}

## Git Worktree Ledger

- Active worktree path: \`${payload.gitWorktreeLedger.activeWorktreePath}\`
- Active worktree still registered: ${payload.gitWorktreeLedger.activeWorktreeRegistered ? "yes" : "no"}
- Active worktree path exists on disk: ${payload.gitWorktreeLedger.activeWorktreeFilesystem.existsOnDisk ? "yes" : "no"}
- Active worktree dirty status entries: ${payload.gitWorktreeLedger.activeWorktreeFilesystem.statusEntryCount}
- Git worktree prune dry-run rows: ${payload.gitWorktreeLedger.pruneDryRunRows.length}
- Worktree count: ${payload.gitWorktreeLedger.worktreeCount}

Active worktree match:

\`\`\`json
${activeMatch}
\`\`\`

Active worktree filesystem status:

\`\`\`json
${JSON.stringify(payload.gitWorktreeLedger.activeWorktreeFilesystem, null, 2)}
\`\`\`

Git worktree prune dry-run rows:

${bullet(payload.gitWorktreeLedger.pruneDryRunRows)}

## Release Gate Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

${bullet([
  `Records owner confirmation: ${payload.boundary.recordsOwnerConfirmation}`,
  `Releases validation hold: ${payload.boundary.releasesValidationHold}`,
  `Merge authorized: ${payload.boundary.mergeAuthorized}`,
  `Cleanup authorized: ${payload.boundary.cleanupAuthorized}`,
  `Deploy authorized: ${payload.boundary.deployAuthorized}`,
  `Destructive Git authorized: ${payload.boundary.destructiveGitAuthorized}`,
  `Physical lifecycle cleanup authorized: ${payload.boundary.physicalLifecycleCleanupAuthorized}`,
  `Requires separate merge instruction: ${payload.boundary.requiresSeparateMergeInstruction}`,
  `Requires separate cleanup instruction: ${payload.boundary.requiresSeparateCleanupInstruction}`,
  `Requires separate deploy instruction: ${payload.boundary.requiresSeparateDeployInstruction}`
])}
`;
}

function main() {
  const payload = buildValidationHoldReleaseGate();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATION_HOLD_RELEASE_GATE_PATHS.latestJson, json);
  write(VALIDATION_HOLD_RELEASE_GATE_PATHS.datedJson, json);
  write(VALIDATION_HOLD_RELEASE_GATE_PATHS.latestMarkdown, md);
  write(VALIDATION_HOLD_RELEASE_GATE_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: VALIDATION_HOLD_RELEASE_GATE_PATHS.latestJson,
    latestMarkdown: VALIDATION_HOLD_RELEASE_GATE_PATHS.latestMarkdown,
    gateStatus: payload.gateStatus,
    ownerConfirmationRecorded: payload.summary.ownerConfirmationRecorded,
    worktreeStillRegistered: payload.summary.worktreeStillRegistered,
    activeWorktreePathExists: payload.summary.activeWorktreePathExists,
    activeWorktreeDirtyStatusEntries: payload.summary.activeWorktreeDirtyStatusEntries,
    worktreePruneDryRunRows: payload.summary.worktreePruneDryRunRows,
    validationHoldReleased: payload.summary.validationHoldReleased,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
