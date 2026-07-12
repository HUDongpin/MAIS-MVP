#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validationHoldWithCommands } from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  authorizationRoundValidationPlan: "coordination/release-intake/latest-A25-authorization-round-validation-plan.json",
  validateFrontierPostInputRunway: "coordination/release-intake/latest-A25-validate-frontier-post-input-runway.json",
  ownerConfirmationInput: "coordination/release-intake/latest-A25-validation-hold-release-owner-confirmation.json",
  latestJson: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-scaffold.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validation-hold-release-confirmation-scaffold.md",
  datedJson: `coordination/release-intake/${date}-A25-validation-hold-release-confirmation-scaffold.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validation-hold-release-confirmation-scaffold.md`
};

export const REQUIRED_OWNER_CONFIRMATION_TEXT_ZH =
  "确认 A10-A22-A08-A12-A06 compose worktree exact deletion 已完成，可以继续 validation hold release 评估。";

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

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.baseline?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function stableSourceArtifacts(sourceArtifacts) {
  return Object.fromEntries(Object.entries(sourceArtifacts ?? {}).map(([key, stamp]) => [key, {
    key: stamp.key,
    path: stamp.path,
    dirtyMapStatusSignature: stamp.dirtyMapStatusSignature,
    expandedStatusEntries: stamp.expandedStatusEntries
  }]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature ?? null;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap")
    .map(([key, payload]) => artifactStamp(key, VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function validateOwnerConfirmationInput(ownerInput, validationHold) {
  const failures = [];
  if (!ownerInput || typeof ownerInput !== "object") {
    return { failures: ["owner confirmation input must be a JSON object"], accepted: false };
  }
  if (ownerInput.confirmationText !== REQUIRED_OWNER_CONFIRMATION_TEXT_ZH) {
    failures.push("confirmationText must match the required owner confirmation text exactly");
  }
  if (ownerInput.activeWorktreePath !== validationHold.activeWorktreePath) {
    failures.push("activeWorktreePath must match the validation hold worktree path");
  }
  if (ownerInput.scope !== "validation-hold-release-review-only") {
    failures.push("scope must be validation-hold-release-review-only");
  }
  for (const key of ["confirmedBy", "confirmedAt"]) {
    if (typeof ownerInput[key] !== "string" || ownerInput[key].trim().length === 0) {
      failures.push(`${key} must be present`);
    }
  }
  if (ownerInput.ownerConfirmed !== true) failures.push("ownerConfirmed must be true");
  for (const [key, expected] of [
    ["mergeAuthorized", false],
    ["cleanupAuthorized", false],
    ["deployAuthorized", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (ownerInput[key] !== expected) failures.push(`${key} must be ${expected}`);
  }
  return { failures, accepted: failures.length === 0 };
}

function ownerConfirmationTemplate(validationHold) {
  return {
    ownerConfirmed: true,
    confirmationText: REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
    activeWorktreePath: validationHold.activeWorktreePath,
    scope: "validation-hold-release-review-only",
    confirmedBy: "<owner>",
    confirmedAt: "<ISO-8601>",
    mergeAuthorized: false,
    cleanupAuthorized: false,
    deployAuthorized: false,
    destructiveGitAuthorized: false,
    physicalLifecycleCleanupAuthorized: false,
    notes: "This confirms only that the compose worktree deletion hold may be reviewed for release. It does not authorize merge, cleanup, deploy, or destructive Git operations."
  };
}

export function buildValidationHoldReleaseConfirmationScaffold() {
  const artifacts = {
    dirtyMap: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.dirtyMap),
    ownerClosureInputReadiness: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerClosureInputReadiness),
    authorizationRoundValidationPlan: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.authorizationRoundValidationPlan),
    validateFrontierPostInputRunway: readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.validateFrontierPostInputRunway)
  };
  const validationHold = validationHoldWithCommands();
  const ownerConfirmationInputPresent = exists(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput);
  const ownerConfirmationInput = ownerConfirmationInputPresent
    ? readJson(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput)
    : null;
  const ownerConfirmationValidation = ownerConfirmationInputPresent
    ? validateOwnerConfirmationInput(ownerConfirmationInput, validationHold)
    : { failures: [], accepted: false };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const holdStatusRows = [
    {
      source: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerClosureInputReadiness,
      status: artifacts.ownerClosureInputReadiness.validationHold?.status ?? "missing",
      activeWorktreePath: artifacts.ownerClosureInputReadiness.validationHold?.activeWorktreePath ?? ""
    },
    {
      source: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.authorizationRoundValidationPlan,
      status: artifacts.authorizationRoundValidationPlan.validationHold?.status ?? "missing",
      activeWorktreePath: artifacts.authorizationRoundValidationPlan.validationHold?.activeWorktreePath ?? ""
    },
    {
      source: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.validateFrontierPostInputRunway,
      status: artifacts.validateFrontierPostInputRunway.blockers?.validationHold?.status ?? "missing",
      activeWorktreePath: artifacts.validateFrontierPostInputRunway.blockers?.validationHold?.activeWorktreePath ?? ""
    }
  ];
  const holdRowsCurrent = holdStatusRows.every((row) => (
    row.status === validationHold.status &&
    row.activeWorktreePath === validationHold.activeWorktreePath
  ));
  const confirmationAccepted = ownerConfirmationValidation.accepted === true;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    scaffoldKind: "a25-validation-hold-release-confirmation-scaffold",
    scaffoldStatus: confirmationAccepted ? "owner-confirmation-recorded-awaiting-separate-release-gate" : "waiting-for-owner-compose-deletion-confirmation",
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
      key,
      artifactStamp(key, VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS[key], payload)
    ])),
    sourceCurrentnessFailures: sourceFailures,
    validationHold,
    holdStatusRows,
    ownerConfirmation: {
      inputFile: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput,
      inputFilePresent: ownerConfirmationInputPresent,
      requiredConfirmationTextZh: REQUIRED_OWNER_CONFIRMATION_TEXT_ZH,
      template: ownerConfirmationTemplate(validationHold),
      recordedConfirmationText: ownerConfirmationInput?.confirmationText ?? "",
      validationFailures: ownerConfirmationValidation.failures,
      confirmationAccepted,
      holdRowsCurrent,
      releaseReviewReady: confirmationAccepted && holdRowsCurrent && sourceFailures.length === 0,
      validationHoldReleased: false
    },
    nextSteps: {
      beforeOwnerConfirmation: [
        "Ask the owner for the exact requiredConfirmationTextZh if the compose worktree deletion is complete.",
        `Do not create ${VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.ownerConfirmationInput} from inference or partial wording.`,
        "Keep linked-worktree archive and aggregate refreshes deferred while the hold remains active."
      ],
      afterRecordedConfirmation: [
        "Run this scaffold current gate.",
        "Run the validation-hold release confirmation recorder in dry-run mode.",
        "Run the validation-hold release confirmation recorder current gate.",
        "Run no-staged and dirty-map current gates.",
        "Only then implement a separate validation-hold release gate if the owner confirmation is exact and current."
      ],
      safeCurrentnessCommands: [
        "node coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs",
        "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
        "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs",
        "node coordination/release-intake/assert-no-staged-changes.mjs",
        "npm run release:dirty-map -- --assert-current --max-age-minutes 60"
      ],
      stillDeferredCommands: validationHold.deferredAggregateValidationCommands
    },
    summary: {
      ownerConfirmationInputPresent,
      ownerConfirmationAccepted: confirmationAccepted,
      ownerConfirmationValidationFailures: ownerConfirmationValidation.failures.length,
      holdRowsCurrent,
      releaseReviewReady: confirmationAccepted && holdRowsCurrent && sourceFailures.length === 0,
      validationHoldReleased: false,
      safePostInputValidationCommands: validationHold.safePostInputValidationCommands.length,
      deferredAggregateValidationCommands: validationHold.deferredAggregateValidationCommands.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      recordsOwnerConfirmation: false,
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
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

export function stableValidationHoldReleaseConfirmationScaffoldProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    scaffoldKind: payload.scaffoldKind,
    scaffoldStatus: payload.scaffoldStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: stableSourceArtifacts(payload.sourceArtifacts),
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    validationHold: payload.validationHold,
    holdStatusRows: payload.holdStatusRows,
    ownerConfirmation: payload.ownerConfirmation,
    nextSteps: payload.nextSteps,
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
  const holdRows = payload.holdStatusRows.map((row) => (
    `| \`${cell(row.source)}\` | \`${cell(row.status)}\` | \`${cell(row.activeWorktreePath)}\` |`
  )).join("\n");
  const validationFailures = payload.ownerConfirmation.validationFailures.length
    ? payload.ownerConfirmation.validationFailures.map((failure) => `- ${failure}`).join("\n")
    : "- none";
  const templateJson = JSON.stringify(payload.ownerConfirmation.template, null, 2);

  return `# A25 Validation Hold Release Confirmation Scaffold

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This scaffold is evidence-only. It does not record owner confirmation, release the validation hold, authorize staging, commit, merge, cleanup, deploy, destructive Git operations, physical lifecycle cleanup, file deletion, worktree removal, or candidate mutation.

## Current Status

- Scaffold status: \`${payload.scaffoldStatus}\`
- Validation hold: \`${payload.validationHold.status}\`
- Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`
- Resume condition: ${payload.validationHold.resumeCondition}
- Owner confirmation input file: \`${payload.ownerConfirmation.inputFile}\`
- Owner confirmation file present: ${payload.ownerConfirmation.inputFilePresent ? "yes" : "no"}
- Owner confirmation accepted: ${payload.ownerConfirmation.confirmationAccepted ? "yes" : "no"}
- Hold rows current: ${payload.ownerConfirmation.holdRowsCurrent ? "yes" : "no"}
- Release review ready: ${payload.ownerConfirmation.releaseReviewReady ? "yes" : "no"}
- Validation hold released by this artifact: no
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Exact Owner Confirmation Text

\`${payload.ownerConfirmation.requiredConfirmationTextZh}\`

## Owner Confirmation JSON Template

\`\`\`json
${templateJson}
\`\`\`

## Hold Status Sources

| Source | Status | Active worktree |
| --- | --- | --- |
${holdRows}

## Owner Confirmation Validation Failures

${validationFailures}

## Safe Currentness Commands

${bullet(payload.nextSteps.safeCurrentnessCommands.map((command) => `\`${command}\``))}

## Still Deferred While Hold Is Active

${bullet(payload.nextSteps.stillDeferredCommands.map((command) => `\`${command}\``))}

## Boundary

This artifact only makes the owner-confirmation boundary explicit. A separate, current validation-hold release gate is still required before linked-worktree archive refreshes, Wave 06 refreshes, aggregate remediation refreshes, merge, cleanup, or deploy can proceed.
`;
}

function main() {
  const payload = buildValidationHoldReleaseConfirmationScaffold();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestJson, json);
  write(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.datedJson, json);
  write(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestMarkdown, md);
  write(VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestJson,
    latestMarkdown: VALIDATION_HOLD_RELEASE_CONFIRMATION_SCAFFOLD_PATHS.latestMarkdown,
    scaffoldStatus: payload.scaffoldStatus,
    ownerConfirmationInputPresent: payload.summary.ownerConfirmationInputPresent,
    ownerConfirmationAccepted: payload.summary.ownerConfirmationAccepted,
    releaseReviewReady: payload.summary.releaseReviewReady,
    validationHoldReleased: payload.summary.validationHoldReleased,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
