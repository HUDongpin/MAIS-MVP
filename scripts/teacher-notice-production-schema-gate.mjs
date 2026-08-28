#!/usr/bin/env node

import { createHash, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";

import {
  applyPostgresStorageSchemaForProductionGate,
  inspectPostgresStorageSchemaForProductionGate,
  postgresStorageSnapshotContractIsComplete
} from "../lib/server/userStore.ts";
import {
  diagnosePostgresStoragePartialSchemaForProductionGate,
  legacySnapshotRequiredArrayKeys,
  legacySnapshotRequiredObjectKeys,
  teacherNoticeProductionSchemaPartialComponents
} from "./teacher-notice-production-schema-diagnostic.mjs";

import {
  attestTeacherNoticeEmailCronHeartbeatPostgresSchema,
  inspectTeacherNoticeEmailCronHeartbeatPostgresSchema,
  teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace,
  teacherNoticeEmailCronHeartbeatPostgresSchemaStatements,
  teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements
} from "../lib/server/userStore/teacherNoticeEmailCronHeartbeatPersistence.ts";
import {
  teacherNoticeEmailOutboxPostgresAdvisoryKey,
  teacherNoticeEmailOutboxPostgresSchemaStatements
} from "../lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts";
import {
  inspectTeacherNoticeResendWebhookPostgresSchema,
  teacherNoticeEmailOutboxPostgresAdvisoryDependency,
  teacherNoticeResendWebhookPostgresAdvisoryNamespace,
  teacherNoticeResendWebhookPostgresSchemaStatements
} from "../lib/server/userStore/teacherNoticeResendWebhookPersistence.ts";

import {
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  fetchVercelApiJson,
  readVercelToken
} from "./vercel-provider-evidence.mjs";
import { MAIS_GITHUB_REPOSITORY } from "./github-candidate-checks.mjs";

const outboxStates = new Set(["empty", "exact", "partial"]);
const appStorageStates = new Set([
  "empty",
  "legacy-no-readiness-marker",
  "legacy-v1-compatibility-no-readiness-marker",
  "legacy-missing-collections-no-readiness-marker",
  "legacy-missing-guardian-invitations-no-readiness-marker",
  "exact",
  "partial"
]);
const appStoragePartialComponents = new Set(
  teacherNoticeProductionSchemaPartialComponents
);
const appStorageSeedModes = new Set([
  "demo-disabled",
  "demo-enabled",
  "demo-enabled-empty",
  "demo-enabled-default"
]);
const webhookStates = new Set(["empty", "upgradeable", "exact", "partial"]);
const heartbeatStates = new Set(["empty", "v1", "exact", "partial"]);
const postgresStorageContractAdvisoryLockKey =
  "mais-postgres-storage-contract-v1";
const postgresStorageStateIdentity = Object.freeze({
  id: "primary",
  schemaVersion: 1,
  stateKind: "app-snapshot",
  tenantId: "platform"
});
export const postgresStorageProductionRequiredArrayKeys = Object.freeze([
  ...legacySnapshotRequiredArrayKeys,
  "ai_tutor_transcript_access_events",
  "class_ai_tutor_policies",
  "content_safety_flags",
  "deleted_assignment_ids",
  "learning_path_step_progress",
  "student_accommodations",
  "teacher_learning_paths",
  "teacher_student_groups"
]);
const postgresStorageMissingCollectionRepairVersions = Object.freeze([
  Object.freeze({
    missingKeys: Object.freeze(["teacher_notice_delivery_attempts"]),
    operation: "app-storage-repair-missing-collections-v1"
  }),
  Object.freeze({
    missingKeys: Object.freeze(["guardian_invitations"]),
    operation: "app-storage-repair-missing-collections-v2"
  })
]);
const postgresStorageCollectionGapStatuses = new Set([
  "exact",
  "malformed",
  "missing"
]);
const postgresStorageParentAccessLegacyFields = Object.freeze([
  "guardian_links.invite_code",
  "student_profiles.parent_invite_code"
]);
const sha1Pattern = /^[a-f0-9]{40}$/u;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const aggregatePattern = /^(?:0|[1-9][0-9]{0,29})$/u;
const postgresVersionPattern = /^[1-9][0-9]{4,7}$/u;
const databaseOidPattern = /^(?:[1-9][0-9]{0,19})$/u;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxGitOutputBytes = 1024 * 1024;
const maxVercelEnvironmentBytes = 4 * 1024 * 1024;
const productionSchemaEnvironmentSource = "vercel-api-pull-v1";
const productionAppStorageEnvironmentKeys = Object.freeze([
  "HK_MATH_ENABLE_DEMO_USER",
  "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
  "HK_MATH_STORAGE_PROVIDER",
  "MAIS_BOOTSTRAP_ADMIN_EMAIL",
  "MAIS_BOOTSTRAP_ADMIN_NAME",
  "MAIS_BOOTSTRAP_ADMIN_PASSWORD",
  "MAIS_BOOTSTRAP_ADMIN_USERNAME",
  "POSTGRES_MAX_CONNECTIONS"
]);
const productionSchemaFailureStages = new Set([
  "candidate-binding-after",
  "candidate-binding-before",
  "evidence-build",
  "input-binding",
  "postgres-close",
  "postgres-connect",
  "postgres-inspect",
  "provider-context",
  "provider-environment-binding",
  "provider-environment-read",
  "provider-project-identity",
  "provider-project-read",
  "provider-token-read",
  "unknown"
]);
const productionSchemaFailureReasons = new Set([
  "app-storage-partial",
  "heartbeat-partial",
  "outbox-partial",
  "outbox-webhook-inconsistent",
  "schema-state-invalid",
  "unknown",
  "webhook-partial"
]);

export function buildPostgresStorageMissingCollectionRepair(
  snapshot,
  { isComplete = postgresStorageSnapshotContractIsComplete } = {}
) {
  if (
    typeof snapshot !== "object"
    || snapshot === null
    || Array.isArray(snapshot)
    || typeof isComplete !== "function"
  ) return null;

  const missingKeys = [];
  for (const key of postgresStorageProductionRequiredArrayKeys) {
    if (Object.hasOwn(snapshot, key)) {
      if (!Array.isArray(snapshot[key])) return null;
      continue;
    }
    missingKeys.push(key);
  }
  for (const key of legacySnapshotRequiredObjectKeys) {
    if (Object.hasOwn(snapshot, key)) {
      if (
        typeof snapshot[key] !== "object"
        || snapshot[key] === null
        || Array.isArray(snapshot[key])
      ) return null;
      continue;
    }
    return null;
  }
  const version = postgresStorageMissingCollectionRepairVersions.find(
    (candidate) =>
      candidate.missingKeys.length === missingKeys.length
      && candidate.missingKeys.every((key) => missingKeys.includes(key))
  );
  if (!version) return null;
  const repaired = { ...snapshot };
  for (const key of version.missingKeys) repaired[key] = [];
  if (!isComplete(repaired)) return null;
  return Object.freeze({
    addedCollectionCount: version.missingKeys.length,
    operation: version.operation,
    payload: Object.freeze(repaired)
  });
}

function classifyPostgresStorageCollectionRows(rows, expectedKeys) {
  if (!Array.isArray(rows) || rows.length !== expectedKeys.length) {
    throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
  }
  const expected = new Set(expectedKeys);
  const seen = new Set();
  const malformed = [];
  const missing = [];
  for (const row of rows) {
    if (
      typeof row !== "object"
      || row === null
      || Array.isArray(row)
      || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(["key", "status"])
      || typeof row.key !== "string"
      || !expected.has(row.key)
      || seen.has(row.key)
      || !postgresStorageCollectionGapStatuses.has(row.status)
    ) {
      throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
    }
    seen.add(row.key);
    if (row.status === "malformed") malformed.push(row.key);
    if (row.status === "missing") missing.push(row.key);
  }
  if (seen.size !== expected.size) {
    throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
  }
  return {
    malformed: Object.freeze(malformed.sort()),
    missing: Object.freeze(missing.sort())
  };
}

export function buildPostgresStorageCollectionGapDiagnostic({
  arrayRows,
  objectRows
}) {
  const arrays = classifyPostgresStorageCollectionRows(
    arrayRows,
    postgresStorageProductionRequiredArrayKeys
  );
  const objects = classifyPostgresStorageCollectionRows(
    objectRows,
    legacySnapshotRequiredObjectKeys
  );
  return Object.freeze({
    malformedArrays: arrays.malformed,
    malformedObjects: objects.malformed,
    missingArrays: arrays.missing,
    missingObjects: objects.missing
  });
}

function withoutLegacyRecordField(record, field) {
  if (
    typeof record !== "object"
    || record === null
    || Array.isArray(record)
  ) return record;
  const sanitized = { ...record };
  delete sanitized[field];
  return sanitized;
}

function recordHasOwnField(record, field) {
  return typeof record === "object"
    && record !== null
    && !Array.isArray(record)
    && Object.hasOwn(record, field);
}

export function buildPostgresStorageParentAccessRecordContractDiagnostic(
  snapshot,
  { isComplete = postgresStorageSnapshotContractIsComplete } = {}
) {
  if (
    typeof snapshot !== "object"
    || snapshot === null
    || Array.isArray(snapshot)
    || typeof isComplete !== "function"
  ) {
    throw new Error(
      "Postgres production parent-access record-contract diagnostic was rejected."
    );
  }
  for (const key of postgresStorageProductionRequiredArrayKeys) {
    if (key === "guardian_invitations") {
      if (Object.hasOwn(snapshot, key)) {
        throw new Error(
          "Postgres production parent-access record-contract diagnostic was rejected."
        );
      }
      continue;
    }
    if (!Object.hasOwn(snapshot, key) || !Array.isArray(snapshot[key])) {
      throw new Error(
        "Postgres production parent-access record-contract diagnostic was rejected."
      );
    }
  }
  for (const key of legacySnapshotRequiredObjectKeys) {
    if (
      !Object.hasOwn(snapshot, key)
      || typeof snapshot[key] !== "object"
      || snapshot[key] === null
      || Array.isArray(snapshot[key])
    ) {
      throw new Error(
        "Postgres production parent-access record-contract diagnostic was rejected."
      );
    }
  }

  const hasGuardianLinkInviteCode = snapshot.guardian_links.some(
    (record) => recordHasOwnField(record, "invite_code")
  );
  const hasStudentProfileParentInviteCode = snapshot.student_profiles.some(
    (record) => recordHasOwnField(record, "parent_invite_code")
  );
  const legacyFields = postgresStorageParentAccessLegacyFields.filter(
    (field) => field === "guardian_links.invite_code"
      ? hasGuardianLinkInviteCode
      : hasStudentProfileParentInviteCode
  );
  const virtuallyRepaired = {
    ...snapshot,
    guardian_invitations: [],
    guardian_links: snapshot.guardian_links.map((record) =>
      withoutLegacyRecordField(record, "invite_code")
    ),
    student_profiles: snapshot.student_profiles.map((record) =>
      withoutLegacyRecordField(record, "parent_invite_code")
    )
  };
  return Object.freeze({
    legacyFields: Object.freeze(legacyFields),
    virtualRepairComplete: isComplete(virtuallyRepaired) === true
  });
}

function validatePostgresStorageCollectionGapDiagnostic(value) {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([
      "malformedArrays",
      "malformedObjects",
      "missingArrays",
      "missingObjects"
    ])
  ) {
    throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
  }
  const validateKeys = (keys, expectedKeys) => {
    if (!Array.isArray(keys)) {
      throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
    }
    const expected = new Set(expectedKeys);
    const unique = new Set(keys);
    if (
      keys.some((key) => typeof key !== "string" || !expected.has(key))
      || unique.size !== keys.length
      || JSON.stringify(keys) !== JSON.stringify([...keys].sort())
    ) {
      throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
    }
    return Object.freeze([...keys]);
  };
  const malformedArrays = validateKeys(
    value.malformedArrays,
    postgresStorageProductionRequiredArrayKeys
  );
  const malformedObjects = validateKeys(
    value.malformedObjects,
    legacySnapshotRequiredObjectKeys
  );
  const missingArrays = validateKeys(
    value.missingArrays,
    postgresStorageProductionRequiredArrayKeys
  );
  const missingObjects = validateKeys(
    value.missingObjects,
    legacySnapshotRequiredObjectKeys
  );
  if (
    malformedArrays.some((key) => missingArrays.includes(key))
    || malformedObjects.some((key) => missingObjects.includes(key))
  ) {
    throw new Error("Postgres production collection-gap diagnostic contract was rejected.");
  }
  return Object.freeze({
    malformedArrays,
    malformedObjects,
    missingArrays,
    missingObjects
  });
}

function validatePostgresStorageParentAccessRecordContractDiagnostic(value) {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([
      "legacyFields",
      "virtualRepairComplete"
    ])
    || !Array.isArray(value.legacyFields)
    || typeof value.virtualRepairComplete !== "boolean"
  ) {
    throw new Error(
      "Postgres production parent-access record-contract diagnostic was rejected."
    );
  }
  const unique = new Set(value.legacyFields);
  if (
    value.legacyFields.some((field) =>
      typeof field !== "string"
      || !postgresStorageParentAccessLegacyFields.includes(field)
    )
    || unique.size !== value.legacyFields.length
    || JSON.stringify(value.legacyFields) !== JSON.stringify(
      postgresStorageParentAccessLegacyFields.filter((field) => unique.has(field))
    )
  ) {
    throw new Error(
      "Postgres production parent-access record-contract diagnostic was rejected."
    );
  }
  return Object.freeze({
    legacyFields: Object.freeze([...value.legacyFields]),
    virtualRepairComplete: value.virtualRepairComplete
  });
}

class TeacherNoticeProductionSchemaReasonError extends Error {
  constructor(reason, component = "unknown") {
    super("Teacher notice production schema state was rejected; details redacted.");
    this.name = "TeacherNoticeProductionSchemaReasonError";
    this.reason = productionSchemaFailureReasons.has(reason) ? reason : "unknown";
    this.component = this.reason === "app-storage-partial"
      && appStoragePartialComponents.has(component)
      ? component
      : "unknown";
  }
}

class TeacherNoticeProductionSchemaStageError extends Error {
  constructor(stage, reason = "unknown", component = "unknown") {
    super("Teacher notice production schema operation failed; details redacted.");
    this.name = "TeacherNoticeProductionSchemaStageError";
    this.stage = productionSchemaFailureStages.has(stage) ? stage : "unknown";
    this.reason = productionSchemaFailureReasons.has(reason) ? reason : "unknown";
    this.component = this.reason === "app-storage-partial"
      && appStoragePartialComponents.has(component)
      ? component
      : "unknown";
  }
}

function stageError(stage, error) {
  if (error instanceof TeacherNoticeProductionSchemaStageError) return error;
  return new TeacherNoticeProductionSchemaStageError(
    stage,
    error instanceof TeacherNoticeProductionSchemaReasonError
      ? error.reason
      : "unknown",
    error instanceof TeacherNoticeProductionSchemaReasonError
      ? error.component
      : "unknown"
  );
}

async function runProductionSchemaStage(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    throw stageError(stage, error);
  }
}

export function teacherNoticeProductionSchemaFailureStage(error) {
  return error instanceof TeacherNoticeProductionSchemaStageError &&
    productionSchemaFailureStages.has(error.stage)
    ? error.stage
    : "unknown";
}

export function teacherNoticeProductionSchemaFailureReason(error) {
  return error instanceof TeacherNoticeProductionSchemaStageError &&
    productionSchemaFailureReasons.has(error.reason)
    ? error.reason
    : "unknown";
}

export function teacherNoticeProductionSchemaFailureComponent(error) {
  return error instanceof TeacherNoticeProductionSchemaStageError
    && error.reason === "app-storage-partial"
    && appStoragePartialComponents.has(error.component)
    ? error.component
    : "unknown";
}

const teacherNoticeResendWebhookPostgresV2ToV3Statements = [
  `CREATE INDEX teacher_notice_resend_webhook_events_unmatched_received_idx
    ON public.teacher_notice_resend_webhook_events (received_at)
    WHERE matched_outbox_id IS NULL`,
  `ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
    DROP CONSTRAINT teacher_notice_resend_webhook_schema_version_ck`,
  `ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
    ALTER COLUMN version SET DEFAULT 3`,
  `UPDATE public.teacher_notice_resend_webhook_schema_migrations
    SET version = 3, applied_at = pg_catalog.clock_timestamp()
    WHERE singleton = TRUE AND version = 2`,
  `ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
    ADD CONSTRAINT teacher_notice_resend_webhook_schema_version_ck
    CHECK (version = 3)`,
  `COMMENT ON TABLE public.teacher_notice_resend_webhook_schema_migrations
    IS 'mais-resend-teacher-notice-webhook-schema-v3'`
];

export function buildTeacherNoticeProductionSchemaPlan({
  appStoragePartialComponent = "unknown",
  appStorageState,
  heartbeatState,
  outboxState,
  webhookState
}) {
  if (
    !appStorageStates.has(appStorageState) ||
    !outboxStates.has(outboxState) ||
    !webhookStates.has(webhookState) ||
    !heartbeatStates.has(heartbeatState)
  ) {
    throw new TeacherNoticeProductionSchemaReasonError("schema-state-invalid");
  }
  if (appStorageState === "partial") {
    throw new TeacherNoticeProductionSchemaReasonError(
      "app-storage-partial",
      appStoragePartialComponent
    );
  }
  if (outboxState === "partial") {
    throw new TeacherNoticeProductionSchemaReasonError("outbox-partial");
  }
  if (webhookState === "partial") {
    throw new TeacherNoticeProductionSchemaReasonError("webhook-partial");
  }
  if (heartbeatState === "partial") {
    throw new TeacherNoticeProductionSchemaReasonError("heartbeat-partial");
  }
  if (outboxState === "empty" && webhookState !== "empty") {
    throw new TeacherNoticeProductionSchemaReasonError(
      "outbox-webhook-inconsistent"
    );
  }
  const operations = [];
  if (appStorageState === "empty") operations.push("app-storage-install-v1");
  if (appStorageState === "legacy-no-readiness-marker") {
    operations.push("app-storage-complete-readiness-v1");
  }
  if (appStorageState === "legacy-v1-compatibility-no-readiness-marker") {
    operations.push("app-storage-upgrade-legacy-compat-readiness-v2");
  }
  if (appStorageState === "legacy-missing-collections-no-readiness-marker") {
    operations.push("app-storage-repair-missing-collections-v1");
  }
  if (
    appStorageState ===
      "legacy-missing-guardian-invitations-no-readiness-marker"
  ) {
    operations.push("app-storage-repair-missing-collections-v2");
  }
  if (outboxState === "empty") operations.push("outbox-install-v2");
  if (webhookState === "upgradeable") operations.push("webhook-v2-to-v3");
  if (webhookState === "empty") operations.push("webhook-install-v3");
  if (heartbeatState === "v1") operations.push("heartbeat-v1-to-v2");
  if (heartbeatState === "empty") operations.push("heartbeat-install-v2");
  return operations;
}

function assertAggregateStatistics(statistics) {
  if (
    !statistics ||
    typeof statistics !== "object" ||
    Array.isArray(statistics) ||
    !aggregatePattern.test(String(statistics.tableBytes ?? "")) ||
    !aggregatePattern.test(String(statistics.indexBytes ?? "")) ||
    !aggregatePattern.test(String(statistics.rowEstimate ?? ""))
  ) {
    throw new Error("Teacher notice production aggregate statistics were rejected.");
  }
  return {
    tableBytes: String(statistics.tableBytes),
    indexBytes: String(statistics.indexBytes),
    rowEstimate: String(statistics.rowEstimate)
  };
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildTeacherNoticeProductionSchemaPreflightEvidence({
  appStoragePartialComponent,
  appStorageSeedMode,
  appStorageState,
  candidateSha,
  expectedTreeSha,
  heartbeatState,
  outboxState,
  postgresMajor,
  statistics,
  targetFingerprint,
  webhookState
}) {
  const normalizedCandidateSha = String(candidateSha ?? "").trim().toLowerCase();
  const normalizedTreeSha = String(expectedTreeSha ?? "").trim().toLowerCase();
  const normalizedTargetFingerprint = String(targetFingerprint ?? "").trim().toLowerCase();
  if (
    !sha1Pattern.test(normalizedCandidateSha) ||
    !sha1Pattern.test(normalizedTreeSha) ||
    !sha256Pattern.test(normalizedTargetFingerprint) ||
    !Number.isSafeInteger(postgresMajor) ||
    postgresMajor < 16 ||
    postgresMajor > 99 ||
    !appStorageSeedModes.has(appStorageSeedMode)
  ) {
    throw new Error("Teacher notice production preflight binding was rejected.");
  }
  const operations = buildTeacherNoticeProductionSchemaPlan({
    appStoragePartialComponent,
    appStorageState,
    heartbeatState,
    outboxState,
    webhookState
  });
  const normalizedStatistics = assertAggregateStatistics(statistics);
  const safeBinding = {
    schemaVersion: 4,
    candidateSha: normalizedCandidateSha,
    expectedTreeSha: normalizedTreeSha,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
    targetFingerprint: normalizedTargetFingerprint,
    postgresMajor,
    appStorageSeedMode,
    appStorageState,
    outboxState,
    webhookState,
    heartbeatState,
    operations,
    statistics: normalizedStatistics
  };
  const preflightDigest = sha256(JSON.stringify(safeBinding));
  const operationBinding = operations.length === 0 ? "none" : operations.join("+");
  const requiredConfirmation = [
    "confirm",
    "mais-production-schema",
    "v4",
    normalizedCandidateSha,
    normalizedTreeSha,
    APPROVED_VERCEL_PROJECT_ID,
    APPROVED_VERCEL_TEAM_ID,
    normalizedTargetFingerprint,
    operationBinding,
    preflightDigest
  ].join(":");
  return Object.freeze({
    ...safeBinding,
    operations: Object.freeze([...operations]),
    statistics: Object.freeze(normalizedStatistics),
    preflightDigest,
    requiredConfirmation
  });
}

export function assertTeacherNoticeProductionSchemaConfirmation(
  evidence,
  confirmation
) {
  const expected = Buffer.from(String(evidence?.requiredConfirmation ?? ""), "utf8");
  const actual = Buffer.from(typeof confirmation === "string" ? confirmation : "", "utf8");
  if (
    expected.length === 0 ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    throw new Error("Teacher notice production schema confirmation was rejected.");
  }
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value ?? ""), "utf8");
}

export function buildTeacherNoticeProductionSchemaGitEnvironment(env = {}) {
  const child = {};
  for (const key of [
    "COMSPEC",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "TZ",
    "WINDIR"
  ]) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return {
    ...child,
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_VALUE_0: "false",
    GIT_CONFIG_VALUE_1: "/dev/null",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0"
  };
}

async function runQuietCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, {
      cwd: options.cwd,
      env: options.env,
      encoding: "buffer",
      maxBuffer: options.maxOutputBytes ?? maxGitOutputBytes,
      windowsHide: true
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error && typeof error.code === "number" ? error.code : error ? 1 : 0,
        stdout: toBuffer(stdout),
        stderr: toBuffer(stderr)
      });
    });
  });
}

async function runCommandText(runCommand, command, args, options) {
  const result = await runCommand(command, args, options);
  if (!result || result.exitCode !== 0) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
  const output = toBuffer(result.stdout);
  if (output.length > maxGitOutputBytes) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
  return output.toString("utf8").trim();
}

async function assertLocalCandidateBinding({
  candidateSha,
  env,
  expectedTreeSha,
  repositoryRoot,
  runCommand
}) {
  const commandOptions = {
    cwd: repositoryRoot,
    env: buildTeacherNoticeProductionSchemaGitEnvironment(env),
    maxOutputBytes: maxGitOutputBytes
  };
  const objectFormat = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--show-object-format"],
    commandOptions
  );
  const head = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", "HEAD"],
    commandOptions
  );
  const tree = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", `${candidateSha}^{tree}`],
    commandOptions
  );
  const status = await runCommand(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    commandOptions
  );
  if (
    objectFormat !== "sha1" ||
    head.toLowerCase() !== candidateSha ||
    tree.toLowerCase() !== expectedTreeSha ||
    !status ||
    status.exitCode !== 0 ||
    toBuffer(status.stdout).length !== 0
  ) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
}

function validateProductionPostgresUrl(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    value.length < 16 ||
    value.length > 16_384 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new Error("Teacher notice production database target was rejected.");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Teacher notice production database target was rejected.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  const sslMode = parsed.searchParams.get("sslmode");
  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password ||
    !databaseName ||
    databaseName.includes("/") ||
    databaseName.length > 128 ||
    parsed.hash ||
    parsed.searchParams.getAll("sslmode").length !== 1 ||
    (sslMode !== "require" && sslMode !== "verify-full")
  ) {
    throw new Error("Teacher notice production database target was rejected.");
  }
  return {
    databaseName,
    hostname: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    raw: value
  };
}

function assertProductionProviderPullBinding({
  candidateSha,
  env
}) {
  const expectedWorkflow =
    `${MAIS_GITHUB_REPOSITORY}/.github/workflows/production-deploy.yml@refs/heads/main`;
  const runId = String(env?.GITHUB_RUN_ID ?? "");
  const runAttempt = String(env?.GITHUB_RUN_ATTEMPT ?? "");
  if (
    env?.CI !== "true" ||
    env?.GITHUB_ACTIONS !== "true" ||
    env?.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env?.GITHUB_REF !== "refs/heads/main" ||
    env?.GITHUB_REF_PROTECTED !== "true" ||
    env?.GITHUB_REPOSITORY !== MAIS_GITHUB_REPOSITORY ||
    String(env?.GITHUB_SHA ?? "").trim().toLowerCase() !== candidateSha ||
    env?.GITHUB_WORKFLOW_REF !== expectedWorkflow ||
    env?.MAIS_PRODUCTION_SCHEMA_ENV_SOURCE !== productionSchemaEnvironmentSource ||
    !/^[1-9][0-9]{0,19}$/u.test(runId) ||
    !/^[1-9][0-9]{0,5}$/u.test(runAttempt)
  ) {
    throw new Error("Teacher notice production provider-pull context was rejected.");
  }
}

function readProductionAppStorageEnvironment(runtimeEnvironment, buildEnvironment) {
  const environment = {};
  for (const key of productionAppStorageEnvironmentKeys) {
    const runtimeValue = runtimeEnvironment?.[key];
    const buildValue = buildEnvironment?.[key];
    if (runtimeValue === undefined && buildValue === undefined) continue;
    if (
      typeof runtimeValue !== "string" ||
      typeof buildValue !== "string" ||
      runtimeValue.length > 16_384 ||
      buildValue.length > 16_384 ||
      runtimeValue.includes("\0") ||
      buildValue.includes("\0") ||
      !constantTimeStringEqual(runtimeValue, buildValue)
    ) {
      throw new Error("Production app-storage environment binding was rejected.");
    }
    environment[key] = runtimeValue;
  }
  if (
    environment.HK_MATH_STORAGE_PROVIDER !== "postgres" ||
    (
      environment.HK_MATH_ENABLE_DEMO_USER !== undefined &&
      !["", "false", "true"].includes(environment.HK_MATH_ENABLE_DEMO_USER)
    ) ||
    environment.HK_MATH_POSTGRES_HOT_AUTH_TABLES !== "true"
  ) {
    throw new Error("Production app-storage environment binding was rejected.");
  }
  return Object.freeze(environment);
}

function appStorageSeedModeFromProductionEnvironment(environment) {
  if (environment?.HK_MATH_ENABLE_DEMO_USER === "false") return "demo-disabled";
  if (environment?.HK_MATH_ENABLE_DEMO_USER === "true") return "demo-enabled";
  if (environment?.HK_MATH_ENABLE_DEMO_USER === "") return "demo-enabled-empty";
  if (environment?.HK_MATH_ENABLE_DEMO_USER === undefined) {
    return "demo-enabled-default";
  }
  throw new Error("Production app-storage seed mode was rejected.");
}

async function withProductionPostgresSecret({
  candidateSha,
  env,
  fetchImpl,
  fetchJsonImpl,
  readTokenImpl
}, operation) {
  await runProductionSchemaStage("provider-context", async () => {
    assertProductionProviderPullBinding({ candidateSha, env });
  });
  const token = await runProductionSchemaStage(
    "provider-token-read",
    () => readTokenImpl({ env })
  );
  const projectUrl = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(APPROVED_VERCEL_PROJECT_ID)}`
  );
  projectUrl.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
  const project = await runProductionSchemaStage(
    "provider-project-read",
    () => fetchJsonImpl(projectUrl.href, token, {
      fetchImpl,
      maxBytes: maxVercelEnvironmentBytes,
      timeoutMs: 30_000
    })
  );
  await runProductionSchemaStage("provider-project-identity", async () => {
    if (
      project?.id !== APPROVED_VERCEL_PROJECT_ID ||
      project?.name !== APPROVED_VERCEL_PROJECT_NAME ||
      project?.accountId !== APPROVED_VERCEL_TEAM_ID
    ) {
      throw new Error("Teacher notice production Vercel identity was rejected.");
    }
  });
  const environmentUrl = new URL(
    `https://api.vercel.com/v3/env/pull/${encodeURIComponent(APPROVED_VERCEL_PROJECT_ID)}/production`
  );
  environmentUrl.searchParams.set("source", "vercel-cli:env:run");
  environmentUrl.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
  let payload = await runProductionSchemaStage(
    "provider-environment-read",
    () => fetchJsonImpl(environmentUrl.href, token, {
      fetchImpl,
      maxBytes: maxVercelEnvironmentBytes,
      timeoutMs: 30_000
    })
  );
  let runtimeEnvironment = payload?.env;
  let buildEnvironment = payload?.buildEnv;
  let runtimeSecret;
  let buildSecret;
  let appStorageEnvironment;
  await runProductionSchemaStage("provider-environment-binding", async () => {
    if (
      !runtimeEnvironment ||
      typeof runtimeEnvironment !== "object" ||
      Array.isArray(runtimeEnvironment) ||
      !buildEnvironment ||
      typeof buildEnvironment !== "object" ||
      Array.isArray(buildEnvironment)
    ) {
      throw new Error("Teacher notice production POSTGRES_URL binding was rejected.");
    }
    runtimeSecret = validateProductionPostgresUrl(
      runtimeEnvironment.POSTGRES_URL
    ).raw;
    buildSecret = validateProductionPostgresUrl(
      buildEnvironment.POSTGRES_URL
    ).raw;
    if (!constantTimeStringEqual(runtimeSecret, buildSecret)) {
      throw new Error("Teacher notice production POSTGRES_URL binding was rejected.");
    }
    appStorageEnvironment = readProductionAppStorageEnvironment(
      runtimeEnvironment,
      buildEnvironment
    );
  });
  let secret = runtimeSecret;
  payload = null;
  runtimeEnvironment = null;
  buildEnvironment = null;
  runtimeSecret = null;
  buildSecret = null;
  try {
    return await operation(secret, appStorageEnvironment);
  } finally {
    secret = null;
    appStorageEnvironment = null;
  }
}

function validateDatabaseInspection(inspection, productionUrl) {
  const identity = inspection?.databaseIdentity;
  const versionText = String(identity?.serverVersionNum ?? "");
  const databaseOid = String(identity?.databaseOid ?? "");
  const databaseName = typeof identity?.databaseName === "string"
    ? identity.databaseName
    : "";
  const parsedTarget = validateProductionPostgresUrl(productionUrl);
  if (
    databaseName !== parsedTarget.databaseName ||
    !databaseOidPattern.test(databaseOid) ||
    !postgresVersionPattern.test(versionText)
  ) {
    throw new Error("Teacher notice production database identity was rejected.");
  }
  const serverVersionNum = Number(versionText);
  const postgresMajor = Math.floor(serverVersionNum / 10_000);
  if (!Number.isSafeInteger(serverVersionNum) || postgresMajor < 16) {
    throw new Error("Teacher notice production PostgreSQL version was rejected.");
  }
  const outboxState = inspection?.outboxState;
  const appStorageState = inspection?.appStorageState;
  const appStoragePartialComponent = inspection?.appStoragePartialComponent ?? "unknown";
  if (
    !outboxStates.has(outboxState)
    || !appStorageStates.has(appStorageState)
    || !appStoragePartialComponents.has(appStoragePartialComponent)
  ) {
    throw new Error("Teacher notice production outbox state was rejected.");
  }
  const targetFingerprint = sha256([
    "teacher-notice-production-schema-target-v1",
    APPROVED_VERCEL_PROJECT_ID,
    APPROVED_VERCEL_TEAM_ID,
    parsedTarget.hostname,
    parsedTarget.port,
    databaseName,
    databaseOid,
    versionText
  ].join("\0"));
  return {
    appStoragePartialComponent,
    appStorageState,
    heartbeatState: inspection?.heartbeatState,
    outboxState,
    postgresMajor,
    statistics: assertAggregateStatistics(inspection?.statistics),
    targetFingerprint,
    webhookState: inspection?.webhookState
  };
}

function validateBoundProductionInspection(
  inspection,
  productionUrl,
  productionEnvironment
) {
  return {
    ...validateDatabaseInspection(inspection, productionUrl),
    appStorageSeedMode:
      appStorageSeedModeFromProductionEnvironment(productionEnvironment)
  };
}

async function closePostgresClient(client) {
  if (!client || typeof client.end !== "function") {
    throw new Error("Teacher notice production database client was rejected.");
  }
  await client.end({ timeout: 5 });
}

async function inspectOutboxAndWebhookSchema(sql) {
  const relationRows = await sql`
    SELECT pg_catalog.count(*)::pg_catalog.int4 AS "relationCount"
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_outbox',
        'teacher_notice_email_outbox_schema_migrations'
      )
  `;
  if (!Array.isArray(relationRows) || relationRows.length !== 1) {
    throw new Error("Teacher notice production outbox inspection was rejected.");
  }
  const relationCount = Number(relationRows[0]?.relationCount);
  if (!Number.isInteger(relationCount) || relationCount < 0 || relationCount > 2) {
    throw new Error("Teacher notice production outbox inspection was rejected.");
  }
  const webhook = await inspectTeacherNoticeResendWebhookPostgresSchema(sql);
  return {
    outboxState: webhook.outboxDependencyExact
      ? "exact"
      : relationCount === 0
        ? "empty"
        : "partial",
    webhookState: webhook.webhookState
  };
}

function safePostgresStorageRevision(value) {
  const revision = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(revision) && revision >= 1 ? revision : null;
}

export async function inspectPostgresStorageMissingCollectionRepairForProductionGate(
  client
) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Postgres production schema repair inspection was rejected.");
  }
  return client.begin("isolation level repeatable read read only", async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
    )`;
    const rows = await sql`
      /* postgres_storage_missing_collection_repairability_inspection */
      SELECT state.payload, state.revision
      FROM public.app_state AS state
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
        AND (SELECT pg_catalog.count(*) FROM public.app_state) = 1
    `;
    if (
      rows.length !== 1
      || safePostgresStorageRevision(rows[0]?.revision) === null
    ) return null;
    return buildPostgresStorageMissingCollectionRepair(rows[0]?.payload)
      ?.operation ?? null;
  });
}

export async function inspectPostgresStorageRequiredCollectionsForProductionGate(
  client
) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Postgres production schema collection inspection was rejected.");
  }
  return client.begin("isolation level repeatable read read only", async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
    )`;
    const rows = await sql`
      /* postgres_storage_required_collection_inspection */
      SELECT
        NOT EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(
          ${[...postgresStorageProductionRequiredArrayKeys]}::text[]
        ) AS required_collection(key)
        WHERE NOT (state.payload ? required_collection.key)
          OR pg_catalog.jsonb_typeof(state.payload -> required_collection.key)
            IS DISTINCT FROM 'array'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(
            ${[...legacySnapshotRequiredObjectKeys]}::text[]
          ) AS required_object(key)
          WHERE NOT (state.payload ? required_object.key)
            OR pg_catalog.jsonb_typeof(state.payload -> required_object.key)
              IS DISTINCT FROM 'object'
        ) AS "requiredCollectionsComplete"
      FROM public.app_state AS state
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
        AND state.revision >= 1
        AND (SELECT pg_catalog.count(*) FROM public.app_state) = 1
    `;
    return rows.length === 1
      && rows[0]?.requiredCollectionsComplete === true;
  });
}

export async function inspectPostgresStorageCollectionGapForProductionGate(
  client
) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Postgres production collection-gap diagnostic was rejected.");
  }
  return client.begin("isolation level repeatable read read only", async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
    )`;
    const identityRows = await sql`
      /* postgres_storage_collection_gap_identity */
      SELECT
        pg_catalog.jsonb_typeof(state.payload) AS "payloadType",
        state.revision >= 1 AS "revisionValid",
        (SELECT pg_catalog.count(*) FROM public.app_state)::int4 AS "rowCount"
      FROM public.app_state AS state
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
    `;
    if (
      identityRows.length !== 1
      || identityRows[0]?.payloadType !== "object"
      || identityRows[0]?.revisionValid !== true
      || identityRows[0]?.rowCount !== 1
    ) {
      throw new Error("Postgres production collection-gap diagnostic was rejected.");
    }
    const arrayRows = await sql`
      /* postgres_storage_collection_gap_arrays */
      SELECT required.key,
        CASE
          WHEN NOT (state.payload ? required.key) THEN 'missing'
          WHEN pg_catalog.jsonb_typeof(state.payload -> required.key)
            IS DISTINCT FROM 'array' THEN 'malformed'
          ELSE 'exact'
        END AS status
      FROM public.app_state AS state
      CROSS JOIN pg_catalog.unnest(
        ${[...postgresStorageProductionRequiredArrayKeys]}::text[]
      ) AS required(key)
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
      ORDER BY required.key
    `;
    const objectRows = await sql`
      /* postgres_storage_collection_gap_objects */
      SELECT required.key,
        CASE
          WHEN NOT (state.payload ? required.key) THEN 'missing'
          WHEN pg_catalog.jsonb_typeof(state.payload -> required.key)
            IS DISTINCT FROM 'object' THEN 'malformed'
          ELSE 'exact'
        END AS status
      FROM public.app_state AS state
      CROSS JOIN pg_catalog.unnest(
        ${[...legacySnapshotRequiredObjectKeys]}::text[]
      ) AS required(key)
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
      ORDER BY required.key
    `;
    return buildPostgresStorageCollectionGapDiagnostic({
      arrayRows,
      objectRows
    });
  });
}

export async function inspectPostgresStorageParentAccessRecordContractForProductionGate(
  client
) {
  if (!client || typeof client.begin !== "function") {
    throw new Error(
      "Postgres production parent-access record-contract diagnostic was rejected."
    );
  }
  return client.begin("isolation level repeatable read read only", async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
    )`;
    const rows = await sql`
      /* postgres_storage_parent_access_record_contract_diagnostic */
      SELECT
        state.payload,
        state.revision,
        (SELECT pg_catalog.count(*) FROM public.app_state)::int4 AS "rowCount"
      FROM public.app_state AS state
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
    `;
    if (
      rows.length !== 1
      || safePostgresStorageRevision(rows[0]?.revision) === null
      || rows[0]?.rowCount !== 1
    ) {
      throw new Error(
        "Postgres production parent-access record-contract diagnostic was rejected."
      );
    }
    return buildPostgresStorageParentAccessRecordContractDiagnostic(
      rows[0]?.payload
    );
  });
}

export async function inspectProductionDatabase(client) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Teacher notice production database client was rejected.");
  }
  let appStorageState = await inspectPostgresStorageSchemaForProductionGate(client);
  let appStoragePartialComponent = "unknown";
  if ([
    "exact",
    "legacy-no-readiness-marker",
    "legacy-v1-compatibility-no-readiness-marker"
  ].includes(appStorageState)) {
    try {
      if (!await inspectPostgresStorageRequiredCollectionsForProductionGate(client)) {
        appStorageState = "partial";
        appStoragePartialComponent =
          "legacy-snapshot-required-collections";
      }
    } catch {
      appStorageState = "partial";
      appStoragePartialComponent = "unknown";
    }
  } else if (appStorageState === "partial") {
    try {
      appStoragePartialComponent =
        await diagnosePostgresStoragePartialSchemaForProductionGate(client);
      if (appStoragePartialComponent === "legacy-snapshot-missing-collections") {
        const repairOperation =
          await inspectPostgresStorageMissingCollectionRepairForProductionGate(
            client
          );
        if (repairOperation === "app-storage-repair-missing-collections-v1") {
          appStorageState = "legacy-missing-collections-no-readiness-marker";
        }
        if (repairOperation === "app-storage-repair-missing-collections-v2") {
          appStorageState =
            "legacy-missing-guardian-invitations-no-readiness-marker";
        }
      }
    } catch {
      // Supplemental catalog diagnosis must never replace the controlling
      // fail-closed app-storage-partial result or expose provider detail.
    }
  }
  const teacherNoticeInspection = await client.begin(
    "isolation level repeatable read read only",
    async (sql) => {
      await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
      await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
      await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
      await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
      for (const namespace of [
        teacherNoticeEmailOutboxPostgresAdvisoryDependency,
        teacherNoticeResendWebhookPostgresAdvisoryNamespace,
        teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace
      ]) {
        await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
          pg_catalog.hashtextextended(${namespace}, 0))`;
      }
      const identityRows = await sql`
        SELECT
          pg_catalog.current_database() AS "databaseName",
          database_record.oid::pg_catalog.text AS "databaseOid",
          pg_catalog.current_setting('server_version_num') AS "serverVersionNum"
        FROM pg_catalog.pg_database AS database_record
        WHERE database_record.datname = pg_catalog.current_database()
      `;
      if (!Array.isArray(identityRows) || identityRows.length !== 1) {
        throw new Error("Teacher notice production database identity was rejected.");
      }
      const schema = await inspectOutboxAndWebhookSchema(sql);
      const heartbeatState =
        await inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
      const statisticRows = await sql`
        WITH target_relations AS (
          SELECT relation.oid, relation.reltuples
          FROM pg_catalog.pg_class AS relation
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind = 'r'
            AND relation.relname IN (
              'app_state',
              'app_state_readiness_markers',
              'auth_schema_migrations',
              'ai_tutor_message_journal',
              'ai_tutor_usage_journal',
              'auth_users',
              'auth_student_profiles',
              'auth_user_settings',
              'auth_password_reset_tokens',
              'teacher_notice_email_outbox',
              'teacher_notice_email_outbox_schema_migrations',
              'teacher_notice_resend_webhook_events',
              'teacher_notice_resend_message_state',
              'teacher_notice_resend_webhook_schema_migrations',
              'teacher_notice_email_cron_heartbeat',
              'teacher_notice_email_cron_heartbeat_schema_migrations'
            )
        )
        SELECT
          COALESCE((SELECT pg_catalog.sum(pg_catalog.pg_table_size(oid))
            FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "tableBytes",
          COALESCE((SELECT pg_catalog.sum(pg_catalog.pg_indexes_size(oid))
            FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "indexBytes",
          COALESCE((SELECT pg_catalog.ceil(pg_catalog.sum(
            CASE WHEN reltuples > 0 THEN reltuples ELSE 0 END
          )) FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "rowEstimate"
      `;
      if (!Array.isArray(statisticRows) || statisticRows.length !== 1) {
        throw new Error("Teacher notice production aggregate statistics were rejected.");
      }
      return {
        databaseIdentity: identityRows[0],
        heartbeatState,
        outboxState: schema.outboxState,
        statistics: statisticRows[0],
        webhookState: schema.webhookState
      };
    }
  );
  return {
    ...teacherNoticeInspection,
    appStoragePartialComponent,
    appStorageState
  };
}

function assertPostgresStorageMissingCollectionRepairContext({
  allowIntegrationTest = false
} = {}) {
  const environment = process.env;
  if (allowIntegrationTest === true) {
    if (environment.NODE_ENV !== "test") {
      throw new Error("Postgres production schema execution context was rejected.");
    }
    return;
  }
  const expectedWorkflow =
    `${MAIS_GITHUB_REPOSITORY}/.github/workflows/production-deploy.yml@refs/heads/main`;
  if (
    environment.CI !== "true"
    || environment.GITHUB_ACTIONS !== "true"
    || environment.GITHUB_EVENT_NAME !== "workflow_dispatch"
    || environment.GITHUB_REF !== "refs/heads/main"
    || environment.GITHUB_REF_PROTECTED !== "true"
    || environment.GITHUB_REPOSITORY !== MAIS_GITHUB_REPOSITORY
    || !sha1Pattern.test(String(environment.GITHUB_SHA ?? ""))
    || environment.GITHUB_WORKFLOW_REF !== expectedWorkflow
    || environment.MAIS_PRODUCTION_APP_STORAGE_SCHEMA_GATE
      !== "github-actions-serialized-v1"
    || environment.NODE_ENV === "test"
  ) {
    throw new Error("Postgres production schema execution context was rejected.");
  }
}

export async function repairPostgresStorageMissingCollectionsForProductionGate(
  client,
  options = {}
) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Postgres production schema client was rejected.");
  }
  assertPostgresStorageMissingCollectionRepairContext(options);
  const expectedOperation = options.expectedOperation;
  if (!postgresStorageMissingCollectionRepairVersions.some(
    (version) => version.operation === expectedOperation
  )) {
    throw new Error("Postgres production schema operation plan changed.");
  }
  await client.begin(async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '5000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '60000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '60000ms'");
    await sql`
      /* postgres_storage_contract_exclusive_advisory_lock */
      SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
      )
    `;
    await sql`
      LOCK TABLE
        public.app_state,
        public.auth_schema_migrations,
        public.ai_tutor_message_journal,
        public.ai_tutor_usage_journal,
        public.auth_users,
        public.auth_student_profiles,
        public.auth_user_settings,
        public.auth_password_reset_tokens
      IN SHARE ROW EXCLUSIVE MODE
    `;

    const sameTransactionClient = {
      begin: async (_transactionMode, operation) => operation(sql)
    };
    const component =
      await diagnosePostgresStoragePartialSchemaForProductionGate(
        sameTransactionClient
      );
    if (component !== "legacy-snapshot-missing-collections") {
      throw new Error("Postgres production schema operation plan changed.");
    }
    await sql.unsafe("SET LOCAL lock_timeout = '5000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '60000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '60000ms'");

    const snapshotRows = await sql`
      SELECT state.payload, state.revision
      FROM public.app_state AS state
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
        AND (SELECT pg_catalog.count(*) FROM public.app_state) = 1
      FOR UPDATE OF state
    `;
    const previousRevision = safePostgresStorageRevision(
      snapshotRows[0]?.revision
    );
    const repair = buildPostgresStorageMissingCollectionRepair(
      snapshotRows[0]?.payload
    );
    if (
      snapshotRows.length !== 1
      || previousRevision === null
      || !repair
      || repair.operation !== expectedOperation
    ) {
      throw new Error("Postgres production schema operation plan changed.");
    }
    const repairedRevision = previousRevision + 1;
    if (!Number.isSafeInteger(repairedRevision)) {
      throw new Error("Postgres production schema operation plan changed.");
    }
    const repairedPayload = repair.payload;
    const repairedRows = await sql`
      /* postgres_storage_legacy_missing_collections_repair */
      UPDATE public.app_state AS state
      SET
        payload = ${sql.json(repairedPayload)}::pg_catalog.jsonb,
        revision = state.revision + 1,
        updated_at = NOW()
      WHERE state.id = ${postgresStorageStateIdentity.id}
        AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
        AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
        AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
        AND state.revision = ${previousRevision}
      RETURNING
        state.payload,
        state.revision,
        state.payload = ${sql.json(repairedPayload)}::pg_catalog.jsonb
          AS "payloadMatches",
        state.revision = ${repairedRevision} AS "revisionMatches",
        state.id = ${postgresStorageStateIdentity.id}
          AND state.tenant_id = ${postgresStorageStateIdentity.tenantId}
          AND state.state_kind = ${postgresStorageStateIdentity.stateKind}
          AND state.schema_version = ${postgresStorageStateIdentity.schemaVersion}
          AS "identityMatches"
    `;
    const repairedRow = repairedRows[0];
    if (
      repairedRows.length !== 1
      || repairedRow?.payloadMatches !== true
      || repairedRow?.revisionMatches !== true
      || repairedRow?.identityMatches !== true
      || safePostgresStorageRevision(repairedRow?.revision) !== repairedRevision
      || !postgresStorageSnapshotContractIsComplete(repairedRow?.payload)
    ) {
      throw new Error("Postgres production schema operation plan changed.");
    }
  });

  const postflightState =
    await inspectPostgresStorageSchemaForProductionGate(client);
  if (
    postflightState !== "legacy-no-readiness-marker"
    && postflightState !== "legacy-v1-compatibility-no-readiness-marker"
  ) {
    throw new Error("Postgres production schema postflight was rejected.");
  }
  return postflightState;
}

function constantTimeStringEqual(left, right) {
  const leftBuffer = Buffer.from(typeof left === "string" ? left : "", "utf8");
  const rightBuffer = Buffer.from(typeof right === "string" ? right : "", "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function resolveProductionGateDependencies(options) {
  const candidateSha = String(options.candidateSha ?? "").trim().toLowerCase();
  const expectedTreeSha = String(options.expectedTreeSha ?? "").trim().toLowerCase();
  if (!sha1Pattern.test(candidateSha) || !sha1Pattern.test(expectedTreeSha)) {
    throw new Error("invalid candidate binding");
  }
  const dependencies = {
    candidateSha,
    expectedTreeSha,
    repositoryRoot: path.resolve(options.repoRoot ?? repoRoot),
    runCommand: options.runCommand ?? runQuietCommand,
    readTokenImpl: options.readTokenImpl ?? readVercelToken,
    fetchJsonImpl: options.fetchJsonImpl ?? fetchVercelApiJson,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    env: options.env ?? process.env,
    connectPostgres: options.connectPostgres ?? ((url) => postgres(url, {
      connect_timeout: 10,
      idle_timeout: 5,
      max: 1,
      prepare: false
    })),
    inspectCollectionGap: options.inspectCollectionGap
      ?? inspectPostgresStorageCollectionGapForProductionGate,
    inspectParentAccessRecordContract:
      options.inspectParentAccessRecordContract
      ?? inspectPostgresStorageParentAccessRecordContractForProductionGate,
    inspectDatabase: options.inspectDatabase ?? inspectProductionDatabase
  };
  if (
    typeof dependencies.runCommand !== "function" ||
    typeof dependencies.readTokenImpl !== "function" ||
    typeof dependencies.fetchJsonImpl !== "function" ||
    typeof dependencies.fetchImpl !== "function" ||
    typeof dependencies.connectPostgres !== "function" ||
    typeof dependencies.inspectCollectionGap !== "function" ||
    typeof dependencies.inspectParentAccessRecordContract !== "function" ||
    typeof dependencies.inspectDatabase !== "function"
  ) {
    throw new Error("invalid dependencies");
  }
  return dependencies;
}

function localBindingFromDependencies(dependencies) {
  return {
    candidateSha: dependencies.candidateSha,
    env: dependencies.env,
    expectedTreeSha: dependencies.expectedTreeSha,
    repositoryRoot: dependencies.repositoryRoot,
    runCommand: dependencies.runCommand
  };
}

async function readProductionInspection(dependencies) {
  return withProductionPostgresSecret(dependencies, async (
    productionUrl,
    productionEnvironment
  ) => {
    const client = await runProductionSchemaStage(
      "postgres-connect",
      () => dependencies.connectPostgres(productionUrl)
    );
    let primaryError = null;
    try {
      return await runProductionSchemaStage(
        "postgres-inspect",
        async () => validateBoundProductionInspection(
          await withTemporaryProductionAppStorageEnvironment(
            productionEnvironment,
            () => dependencies.inspectDatabase(client)
          ),
          productionUrl,
          productionEnvironment
        )
      );
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        await runProductionSchemaStage(
          "postgres-close",
          () => closePostgresClient(client)
        );
      } catch (closeError) {
        if (primaryError === null) throw closeError;
      }
    }
  });
}

async function readProductionCollectionGap(dependencies) {
  return withProductionPostgresSecret(dependencies, async (productionUrl) => {
    const client = await runProductionSchemaStage(
      "postgres-connect",
      () => dependencies.connectPostgres(productionUrl)
    );
    let primaryError = null;
    try {
      return await runProductionSchemaStage(
        "postgres-inspect",
        async () => validatePostgresStorageCollectionGapDiagnostic(
          await dependencies.inspectCollectionGap(client)
        )
      );
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        await runProductionSchemaStage(
          "postgres-close",
          () => closePostgresClient(client)
        );
      } catch (closeError) {
        if (primaryError === null) throw closeError;
      }
    }
  });
}

async function readProductionParentAccessRecordContract(dependencies) {
  return withProductionPostgresSecret(dependencies, async (
    productionUrl,
    productionEnvironment
  ) => {
    const client = await runProductionSchemaStage(
      "postgres-connect",
      () => dependencies.connectPostgres(productionUrl)
    );
    let primaryError = null;
    try {
      return await runProductionSchemaStage(
        "postgres-inspect",
        async () => validatePostgresStorageParentAccessRecordContractDiagnostic(
          await withTemporaryProductionAppStorageEnvironment(
            productionEnvironment,
            () => dependencies.inspectParentAccessRecordContract(client)
          )
        )
      );
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        await runProductionSchemaStage(
          "postgres-close",
          () => closePostgresClient(client)
        );
      } catch (closeError) {
        if (primaryError === null) throw closeError;
      }
    }
  });
}

function evidenceFromInspection(dependencies, inspection) {
  return buildTeacherNoticeProductionSchemaPreflightEvidence({
    candidateSha: dependencies.candidateSha,
    expectedTreeSha: dependencies.expectedTreeSha,
    ...inspection
  });
}

export async function preflightTeacherNoticeProductionSchema(options = {}) {
  try {
    const dependencies = await runProductionSchemaStage(
      "input-binding",
      async () => resolveProductionGateDependencies(options)
    );
    const localBinding = localBindingFromDependencies(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-before",
      () => assertLocalCandidateBinding(localBinding)
    );
    const inspected = await readProductionInspection(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-after",
      () => assertLocalCandidateBinding(localBinding)
    );
    return await runProductionSchemaStage(
      "evidence-build",
      async () => evidenceFromInspection(dependencies, inspected)
    );
  } catch (error) {
    throw stageError("unknown", error);
  }
}

export async function diagnoseTeacherNoticeProductionSchemaCollections(
  options = {}
) {
  try {
    const dependencies = await runProductionSchemaStage(
      "input-binding",
      async () => resolveProductionGateDependencies(options)
    );
    const localBinding = localBindingFromDependencies(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-before",
      () => assertLocalCandidateBinding(localBinding)
    );
    const diagnostic = await readProductionCollectionGap(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-after",
      () => assertLocalCandidateBinding(localBinding)
    );
    return Object.freeze({
      candidateSha: dependencies.candidateSha,
      expectedTreeSha: dependencies.expectedTreeSha,
      ...diagnostic
    });
  } catch (error) {
    throw stageError("unknown", error);
  }
}

export async function diagnoseTeacherNoticeProductionSchemaParentAccessRecords(
  options = {}
) {
  try {
    const dependencies = await runProductionSchemaStage(
      "input-binding",
      async () => resolveProductionGateDependencies(options)
    );
    const localBinding = localBindingFromDependencies(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-before",
      () => assertLocalCandidateBinding(localBinding)
    );
    const diagnostic =
      await readProductionParentAccessRecordContract(dependencies);
    await runProductionSchemaStage(
      "candidate-binding-after",
      () => assertLocalCandidateBinding(localBinding)
    );
    return Object.freeze({
      candidateSha: dependencies.candidateSha,
      expectedTreeSha: dependencies.expectedTreeSha,
      ...diagnostic
    });
  } catch (error) {
    throw stageError("unknown", error);
  }
}

function statementsForProductionSchemaOperation(operation) {
  if (operation === "outbox-install-v2") {
    return teacherNoticeEmailOutboxPostgresSchemaStatements;
  }
  if (operation === "webhook-install-v3") {
    return teacherNoticeResendWebhookPostgresSchemaStatements;
  }
  if (operation === "webhook-v2-to-v3") {
    return teacherNoticeResendWebhookPostgresV2ToV3Statements;
  }
  if (operation === "heartbeat-install-v2") {
    return teacherNoticeEmailCronHeartbeatPostgresSchemaStatements;
  }
  if (operation === "heartbeat-v1-to-v2") {
    return teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements;
  }
  throw new Error("Teacher notice production schema operation was rejected.");
}

async function withTemporaryProductionAppStorageEnvironment(
  productionEnvironment,
  operation
) {
  if (
    !productionEnvironment ||
    typeof productionEnvironment !== "object" ||
    Array.isArray(productionEnvironment) ||
    typeof operation !== "function" ||
    productionEnvironment.HK_MATH_STORAGE_PROVIDER !== "postgres" ||
    (
      productionEnvironment.HK_MATH_ENABLE_DEMO_USER !== undefined &&
      !["", "false", "true"].includes(productionEnvironment.HK_MATH_ENABLE_DEMO_USER)
    ) ||
    productionEnvironment.HK_MATH_POSTGRES_HOT_AUTH_TABLES !== "true" ||
    Object.keys(productionEnvironment).some(
      (key) => !productionAppStorageEnvironmentKeys.includes(key)
    ) ||
    Object.values(productionEnvironment).some(
      (value) =>
        typeof value !== "string" ||
        value.length > 16_384 ||
        value.includes("\0")
    )
  ) {
    throw new Error("Production app-storage environment was rejected.");
  }
  const keys = [
    ...productionAppStorageEnvironmentKeys,
    "MAIS_PRODUCTION_APP_STORAGE_SCHEMA_GATE"
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of productionAppStorageEnvironmentKeys) {
      if (Object.hasOwn(productionEnvironment, key)) {
        process.env[key] = productionEnvironment[key];
      } else {
        delete process.env[key];
      }
    }
    process.env.MAIS_PRODUCTION_APP_STORAGE_SCHEMA_GATE =
      "github-actions-serialized-v1";
    return await operation();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withPostgresStorageSessionAdvisoryLock(client, operation) {
  if (
    !client
    || typeof client !== "function"
    || typeof client.begin !== "function"
    || client.options?.max !== 1
    || typeof operation !== "function"
  ) {
    throw new Error("MAIS production schema client was rejected.");
  }
  let lockHeld = false;
  let backendPid = null;
  try {
    await client`
      SELECT
        pg_catalog.set_config('lock_timeout', '5000ms', false),
        pg_catalog.set_config('statement_timeout', '60000ms', false)
    `;
    const lockRows = await client`
      /* postgres_storage_contract_session_advisory_lock */
      SELECT
        pg_catalog.pg_backend_pid()::pg_catalog.text AS "backendPid",
        pg_catalog.pg_advisory_lock(
          pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
        )
    `;
    if (
      lockRows.length !== 1
      || !/^[1-9][0-9]{0,19}$/u.test(String(lockRows[0]?.backendPid ?? ""))
    ) {
      throw new Error("MAIS production schema advisory lock acquisition failed.");
    }
    backendPid = String(lockRows[0].backendPid);
    lockHeld = true;
    return await operation(client);
  } finally {
    if (lockHeld) {
      const rows = await client`
        SELECT
          pg_catalog.pg_backend_pid()::pg_catalog.text AS "backendPid",
          pg_catalog.pg_advisory_unlock(
            pg_catalog.hashtextextended(${postgresStorageContractAdvisoryLockKey}, 0)
          ) AS released
      `;
      if (
        rows.length !== 1
        || rows[0]?.backendPid !== backendPid
        || rows[0]?.released !== true
      ) {
        throw new Error("MAIS production schema advisory lock release failed.");
      }
    }
    await client`
      SELECT
        pg_catalog.set_config('lock_timeout', '0', false),
        pg_catalog.set_config('statement_timeout', '0', false)
    `;
  }
}

export async function applyMaisProductionSchemaOperations(
  client,
  operations,
  productionEnvironment,
  options = {}
) {
  if (!client || typeof client.begin !== "function" || !Array.isArray(operations)) {
    throw new Error("MAIS production schema client was rejected.");
  }
  const appStorageOperationExpectedStates = new Map([
    ["app-storage-install-v1", "empty"],
    ["app-storage-complete-readiness-v1", "legacy-no-readiness-marker"],
    [
      "app-storage-upgrade-legacy-compat-readiness-v2",
      "legacy-v1-compatibility-no-readiness-marker"
    ],
    [
      "app-storage-repair-missing-collections-v1",
      "legacy-missing-collections-no-readiness-marker"
    ],
    [
      "app-storage-repair-missing-collections-v2",
      "legacy-missing-guardian-invitations-no-readiness-marker"
    ]
  ]);
  const appOperationIndexes = operations
    .map((operation, index) => appStorageOperationExpectedStates.has(operation) ? index : -1)
    .filter((index) => index >= 0);
  const teacherNoticeOperations = operations.filter(
    (operation) => !appStorageOperationExpectedStates.has(operation)
  );
  const allowedTeacherNoticeOperations = new Set([
    "outbox-install-v2",
    "webhook-install-v3",
    "webhook-v2-to-v3",
    "heartbeat-install-v2",
    "heartbeat-v1-to-v2"
  ]);
  if (
    appOperationIndexes.length > 1 ||
    (appOperationIndexes.length === 1 && appOperationIndexes[0] !== 0) ||
    teacherNoticeOperations.some(
      (operation) => !allowedTeacherNoticeOperations.has(operation)
    ) ||
    new Set(teacherNoticeOperations).size !== teacherNoticeOperations.length
  ) {
    throw new Error("MAIS production schema operation plan was rejected.");
  }
  const applyAppStorageSchema = options.applyAppStorageSchema ??
    applyPostgresStorageSchemaForProductionGate;
  const repairAppStorageMissingCollections =
    options.repairAppStorageMissingCollections
    ?? repairPostgresStorageMissingCollectionsForProductionGate;
  const applyTeacherNoticeSchema = options.applyTeacherNoticeSchema ??
    applyTeacherNoticeProductionSchemaOperationsAtomic;
  if (
    typeof applyAppStorageSchema !== "function" ||
    typeof repairAppStorageMissingCollections !== "function" ||
    typeof applyTeacherNoticeSchema !== "function"
  ) {
    throw new Error("MAIS production schema apply dependency was rejected.");
  }
  if (appOperationIndexes.length === 1) {
    const appStorageOperation = operations[appOperationIndexes[0]];
    const expectedState = appStorageOperationExpectedStates.get(appStorageOperation);
    if (!expectedState) {
      throw new Error("MAIS production schema operation plan was rejected.");
    }
    await withTemporaryProductionAppStorageEnvironment(
      productionEnvironment,
      () => withPostgresStorageSessionAdvisoryLock(
        client,
        async (lockedClient) => {
          if (
            appStorageOperation === "app-storage-repair-missing-collections-v1"
            || appStorageOperation === "app-storage-repair-missing-collections-v2"
          ) {
            const repairedState =
              await repairAppStorageMissingCollections(lockedClient, {
                expectedOperation: appStorageOperation
              });
            if (
              repairedState !== "legacy-no-readiness-marker"
              && repairedState !== "legacy-v1-compatibility-no-readiness-marker"
            ) {
              throw new Error("MAIS production schema operation plan changed.");
            }
            if (
              !await inspectPostgresStorageRequiredCollectionsForProductionGate(
                lockedClient
              )
            ) {
              throw new Error("MAIS production schema operation plan changed.");
            }
            return applyAppStorageSchema(lockedClient, repairedState);
          }
          if (
            expectedState !== "empty"
            && !await inspectPostgresStorageRequiredCollectionsForProductionGate(
              lockedClient
            )
          ) {
            throw new Error("MAIS production schema operation plan changed.");
          }
          return applyAppStorageSchema(lockedClient, expectedState);
        }
      )
    );
  }
  if (teacherNoticeOperations.length > 0) {
    await applyTeacherNoticeSchema(client, teacherNoticeOperations);
  }
}

export async function applyTeacherNoticeProductionSchemaOperationsAtomic(
  client,
  operations
) {
  if (!client || typeof client.begin !== "function" || !Array.isArray(operations)) {
    throw new Error("Teacher notice production schema client was rejected.");
  }
  await client.begin(async (sql) => {
    await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
    await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
    await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
    await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
    for (const namespace of [
      teacherNoticeEmailOutboxPostgresAdvisoryKey,
      teacherNoticeResendWebhookPostgresAdvisoryNamespace,
      teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace
    ]) {
      await sql`SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(${namespace}, 0))`;
    }

    const schema = await inspectOutboxAndWebhookSchema(sql);
    const heartbeatState =
      await inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
    const expectedOperations = buildTeacherNoticeProductionSchemaPlan({
      appStorageState: "exact",
      heartbeatState,
      outboxState: schema.outboxState,
      webhookState: schema.webhookState
    });
    if (JSON.stringify(operations) !== JSON.stringify(expectedOperations)) {
      throw new Error("Teacher notice production schema operation plan changed.");
    }

    for (const operation of operations) {
      for (const statement of statementsForProductionSchemaOperation(operation)) {
        await sql.unsafe(statement);
      }
    }

    const postSchema = await inspectOutboxAndWebhookSchema(sql);
    const postHeartbeatState =
      await inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
    if (
      postSchema.outboxState !== "exact" ||
      postSchema.webhookState !== "exact" ||
      postHeartbeatState !== "exact" ||
      !await attestTeacherNoticeEmailCronHeartbeatPostgresSchema(sql)
    ) {
      throw new Error("Teacher notice production schema atomic attestation failed.");
    }
  });
}

function assertSameConfirmedPreflight(expected, current) {
  if (
    !constantTimeStringEqual(expected?.preflightDigest, current?.preflightDigest) ||
    !constantTimeStringEqual(expected?.targetFingerprint, current?.targetFingerprint) ||
    JSON.stringify(expected?.operations) !== JSON.stringify(current?.operations)
  ) {
    throw new Error("Teacher notice production schema preflight changed.");
  }
}

function assertExactPostflight(preflight, postflight) {
  if (
    postflight?.appStorageSeedMode !== preflight?.appStorageSeedMode ||
    postflight?.appStorageState !== "exact" ||
    postflight?.outboxState !== "exact" ||
    postflight?.webhookState !== "exact" ||
    postflight?.heartbeatState !== "exact" ||
    !constantTimeStringEqual(
      preflight?.targetFingerprint,
      postflight?.targetFingerprint
    )
  ) {
    throw new Error("Teacher notice production schema post-attestation failed.");
  }
}

export async function applyTeacherNoticeProductionSchema(options = {}) {
  try {
    const dependencies = resolveProductionGateDependencies(options);
    const localBinding = localBindingFromDependencies(dependencies);
    const applyMigrations = options.applyMigrations ??
      applyMaisProductionSchemaOperations;
    if (typeof applyMigrations !== "function") {
      throw new Error("invalid apply dependency");
    }

    const confirmedPreflight = await preflightTeacherNoticeProductionSchema(options);
    assertTeacherNoticeProductionSchemaConfirmation(
      confirmedPreflight,
      options.confirmation
    );
    await assertLocalCandidateBinding(localBinding);

    const sameConnectionPostflight = await withProductionPostgresSecret(
      dependencies,
      async (productionUrl, productionEnvironment) => {
        const client = await dependencies.connectPostgres(productionUrl);
        try {
          const immediatePreflight = evidenceFromInspection(
            dependencies,
            validateBoundProductionInspection(
              await withTemporaryProductionAppStorageEnvironment(
                productionEnvironment,
                () => dependencies.inspectDatabase(client)
              ),
              productionUrl,
              productionEnvironment
            )
          );
          assertSameConfirmedPreflight(confirmedPreflight, immediatePreflight);
          assertTeacherNoticeProductionSchemaConfirmation(
            immediatePreflight,
            options.confirmation
          );
          await assertLocalCandidateBinding(localBinding);
          await applyMigrations(
            client,
            [...immediatePreflight.operations],
            productionEnvironment
          );
          const postflight = evidenceFromInspection(
            dependencies,
            validateBoundProductionInspection(
              await withTemporaryProductionAppStorageEnvironment(
                productionEnvironment,
                () => dependencies.inspectDatabase(client)
              ),
              productionUrl,
              productionEnvironment
            )
          );
          assertExactPostflight(confirmedPreflight, postflight);
          return postflight;
        } finally {
          await closePostgresClient(client);
        }
      }
    );
    await assertLocalCandidateBinding(localBinding);

    const independentlyRefetchedPostflight = evidenceFromInspection(
      dependencies,
      await readProductionInspection(dependencies)
    );
    assertExactPostflight(confirmedPreflight, independentlyRefetchedPostflight);
    await assertLocalCandidateBinding(localBinding);

    return Object.freeze({
      candidateSha: confirmedPreflight.candidateSha,
      expectedTreeSha: confirmedPreflight.expectedTreeSha,
      operations: confirmedPreflight.operations,
      preflightDigest: confirmedPreflight.preflightDigest,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      teamId: APPROVED_VERCEL_TEAM_ID,
      targetFingerprint: confirmedPreflight.targetFingerprint,
      postflight: independentlyRefetchedPostflight,
      sameConnectionPostflight
    });
  } catch {
    throw new Error("Teacher notice production schema apply failed; details redacted.");
  }
}

function parseCliArguments(argv) {
  const parsed = {
    apply: false,
    diagnoseCollections: false,
    diagnoseParentAccessRecords: false,
    dryRun: false,
    preflight: false,
    candidateSha: undefined,
    expectedTreeSha: undefined
  };
  for (const argument of argv) {
    if (argument === "--apply") parsed.apply = true;
    else if (argument === "--diagnose-collections") parsed.diagnoseCollections = true;
    else if (argument === "--diagnose-parent-access-records") {
      parsed.diagnoseParentAccessRecords = true;
    }
    else if (argument === "--dry-run") parsed.dryRun = true;
    else if (argument === "--preflight") parsed.preflight = true;
    else if (argument.startsWith("--candidate-sha=")) {
      if (parsed.candidateSha !== undefined) throw new Error("duplicate argument");
      parsed.candidateSha = argument.slice("--candidate-sha=".length);
    } else if (argument.startsWith("--expected-tree-sha=")) {
      if (parsed.expectedTreeSha !== undefined) throw new Error("duplicate argument");
      parsed.expectedTreeSha = argument.slice("--expected-tree-sha=".length);
    } else {
      throw new Error("unknown argument");
    }
  }
  const modeCount = Number(parsed.apply)
    + Number(parsed.diagnoseCollections)
    + Number(parsed.diagnoseParentAccessRecords)
    + Number(parsed.dryRun)
    + Number(parsed.preflight);
  if (modeCount !== 1) throw new Error("exactly one mode is required");
  return parsed;
}

async function main() {
  const arguments_ = parseCliArguments(process.argv.slice(2));
  if (arguments_.dryRun) {
    process.stdout.write(`${JSON.stringify({
      mode: "dry-run",
      mutation: false,
      network: false,
      ok: true,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      teamId: APPROVED_VERCEL_TEAM_ID
    })}\n`);
    return;
  }
  const candidateSha = arguments_.candidateSha ?? process.env.MAIS_RELEASE_SHA;
  const expectedTreeSha = arguments_.expectedTreeSha ?? process.env.MAIS_RELEASE_TREE_SHA;
  if (arguments_.diagnoseCollections) {
    const evidence = await diagnoseTeacherNoticeProductionSchemaCollections({
      candidateSha,
      expectedTreeSha
    });
    process.stdout.write(`${JSON.stringify({
      ...evidence,
      mode: "collection-gap-diagnostic",
      mutation: false,
      network: true,
      ok: true
    })}\n`);
    return;
  }
  if (arguments_.diagnoseParentAccessRecords) {
    const evidence =
      await diagnoseTeacherNoticeProductionSchemaParentAccessRecords({
        candidateSha,
        expectedTreeSha
      });
    process.stdout.write(`${JSON.stringify({
      ...evidence,
      mode: "parent-access-record-diagnostic",
      mutation: false,
      network: true,
      ok: true
    })}\n`);
    return;
  }
  if (arguments_.preflight) {
    const evidence = await preflightTeacherNoticeProductionSchema({
      candidateSha,
      expectedTreeSha
    });
    process.stdout.write(`${JSON.stringify({
      ...evidence,
      mode: "preflight",
      mutation: false,
      network: true,
      ok: true
    })}\n`);
    return;
  }
  const evidence = await applyTeacherNoticeProductionSchema({
    candidateSha,
    confirmation: process.env.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM,
    expectedTreeSha
  });
  process.stdout.write(`${JSON.stringify({
    ...evidence,
    mode: "apply",
    mutation: true,
    network: true,
    ok: true
  })}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      status: "teacher-notice-production-schema-gate-failed",
      stage: teacherNoticeProductionSchemaFailureStage(error),
      reason: teacherNoticeProductionSchemaFailureReason(error),
      component: teacherNoticeProductionSchemaFailureComponent(error),
      detail: "redacted"
    })}\n`);
    process.exitCode = 1;
  });
}
