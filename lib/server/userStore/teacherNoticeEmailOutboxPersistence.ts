import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  TeacherNoticeEmailDeliveryResult,
  TeacherNoticeEmailInput,
  TeacherNoticeEmailLocale
} from "@/lib/server/teacherNoticeEmailDelivery";

type JsonRecord = Record<string, unknown>;

export type TeacherNoticeEmailOutboxStatus =
  | "pending"
  | "leased"
  | "retryable"
  | "provider-accepted"
  | "blocked"
  | "dead-letter";

export type TeacherNoticeEmailOutboxRow = {
  id: string;
  notice_id: string;
  recipient_id: string | null;
  recipient_fingerprint: string;
  student_id: string | null;
  guardian_id: string | null;
  teacher_id: string | null;
  queued_by_id: string | null;
  queued_by_fingerprint: string;
  class_id: string | null;
  email: string | null;
  locale: TeacherNoticeEmailLocale | null;
  durable_delivery_key: string;
  content_revision: string;
  status: TeacherNoticeEmailOutboxStatus;
  attempt_count: number;
  first_enqueued_at: string;
  next_attempt_at: string;
  lease_token: string | null;
  lease_expires_at: string | null;
  provider_message_id: string | null;
  last_error_code: string | null;
  last_http_status: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  pii_expires_at: string | null;
  pii_purged_at: string | null;
  tombstone_expires_at: string | null;
  delivery: TeacherNoticeEmailInput | null;
};

export type TeacherNoticeEmailPublicationDatabase = {
  users: JsonRecord[];
  user_settings: JsonRecord[];
  teacher_classes: JsonRecord[];
  teacher_class_collaborators: JsonRecord[];
  school_memberships: JsonRecord[];
  class_enrollments: JsonRecord[];
  guardian_links: JsonRecord[];
  teacher_notices: JsonRecord[];
  teacher_notice_recipients: JsonRecord[];
};

export type TeacherNoticeEmailOutboxCompletion = {
  status: Exclude<TeacherNoticeEmailOutboxStatus, "pending" | "leased">;
  providerMessageId: string | null;
  nextAttemptAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  httpStatus: number | null;
};

export type TeacherNoticeEmailOutboxClaim = {
  id: string;
  leaseToken: string;
  attempt_count: number;
  first_enqueued_at: string;
  previousStatus: "pending" | "retryable";
  previousAttemptCount: number;
  previousNextAttemptAt: string;
  delivery: TeacherNoticeEmailInput;
};

export type TeacherNoticeEmailOutboxDeadline = {
  deadlineAtMs: number;
  claimReserveMs: number;
  monotonicNow: () => number;
};

export const teacherNoticeEmailOutboxMaxAttempts = 8;
export const teacherNoticeEmailOutboxCutoffMs = 23 * 60 * 60 * 1_000;
export const teacherNoticeEmailOutboxLeaseMs = 2 * 60 * 1_000;
export const teacherNoticeEmailOutboxSchemaVersion = 2;
export const teacherNoticeEmailOutboxInvocationBudgetMs = 290_000;
export const teacherNoticeEmailOutboxClaimReserveMs = 60_000;
export const teacherNoticeEmailOutboxInvalidQuarantineLimit = 25;
export const teacherNoticeEmailOutboxPiiRetentionMs = 30 * 24 * 60 * 60 * 1_000;
export const teacherNoticeEmailOutboxTombstoneRetentionMs = 400 * 24 * 60 * 60 * 1_000;
export const teacherNoticeEmailOutboxPostgresSafeSearchPath = "pg_catalog, public";
export const teacherNoticeEmailOutboxPostgresAdvisoryKey = "mais-teacher-notice-email-outbox-v2";
export const teacherNoticeEmailOutboxWebhookPostgresAdvisoryKey = "mais-resend-teacher-notice-webhook-v2";
export const teacherNoticeEmailOutboxProviderMappingAdvisoryPrefix = "mais-resend-teacher-notice-webhook-v2:";

export function teacherNoticeEmailOutboxPostgresTransactionSettings({
  lockTimeout,
  statementTimeout,
  idleTransactionTimeout
}: {
  lockTimeout: string;
  statementTimeout: string;
  idleTransactionTimeout?: string;
}) {
  return {
    searchPath: teacherNoticeEmailOutboxPostgresSafeSearchPath,
    lockTimeout,
    statementTimeout,
    idleTransactionTimeout: idleTransactionTimeout ?? null
  } as const;
}

export async function runTeacherNoticeEmailOutboxAtomicMigration<Sql>({
  begin,
  migrate,
  attest
}: {
  begin: (operation: (sql: Sql) => Promise<void>) => Promise<void>;
  migrate: (sql: Sql) => Promise<void>;
  attest: (sql: Sql) => Promise<boolean>;
}) {
  await begin(async (sql) => {
    await migrate(sql);
    if (!await attest(sql)) {
      throw new Error("Teacher notice email outbox PostgreSQL schema could not be attested.");
    }
  });
}

export async function runTeacherNoticeEmailOutboxAttestedTransaction<Sql, Result>({
  sql,
  configure,
  acquireCooperativeAdvisoryLock,
  acquireWebhookSchemaAdvisoryLock,
  acquireProviderMessageAdvisoryLock,
  lockOutbox,
  lockMigrationMarker,
  attest,
  operation
}: {
  sql: Sql;
  configure: (sql: Sql) => Promise<void>;
  acquireCooperativeAdvisoryLock: (sql: Sql) => Promise<void>;
  acquireWebhookSchemaAdvisoryLock?: (sql: Sql) => Promise<void>;
  acquireProviderMessageAdvisoryLock?: (sql: Sql) => Promise<void>;
  lockOutbox: (sql: Sql) => Promise<void>;
  lockMigrationMarker: (sql: Sql) => Promise<void>;
  attest: (sql: Sql) => Promise<boolean>;
  operation: (sql: Sql) => Promise<Result>;
}) {
  await configure(sql);
  await acquireCooperativeAdvisoryLock(sql);
  if (acquireWebhookSchemaAdvisoryLock) await acquireWebhookSchemaAdvisoryLock(sql);
  if (acquireProviderMessageAdvisoryLock) await acquireProviderMessageAdvisoryLock(sql);
  await lockOutbox(sql);
  await lockMigrationMarker(sql);
  if (!await attest(sql)) {
    throw new Error("Teacher notice email outbox PostgreSQL schema could not be attested.");
  }
  return operation(sql);
}

export async function runTeacherNoticeEmailOutboxStorageAttestedTransaction<Sql, Capability, Result>({
  sql,
  configure,
  acquireStorageCooperativeAdvisoryLock,
  acquireOutboxCooperativeAdvisoryLock,
  acquireWebhookSchemaAdvisoryLock,
  acquireProviderMessageAdvisoryLock,
  lockStorageRelations,
  lockOutbox,
  lockMigrationMarker,
  attestOutbox,
  acquireStorageCapability,
  operation
}: {
  sql: Sql;
  configure: (sql: Sql) => Promise<void>;
  acquireStorageCooperativeAdvisoryLock: (sql: Sql) => Promise<void>;
  acquireOutboxCooperativeAdvisoryLock: (sql: Sql) => Promise<void>;
  acquireWebhookSchemaAdvisoryLock?: (sql: Sql) => Promise<void>;
  acquireProviderMessageAdvisoryLock?: (sql: Sql) => Promise<void>;
  lockStorageRelations: (sql: Sql) => Promise<void>;
  lockOutbox: (sql: Sql) => Promise<void>;
  lockMigrationMarker: (sql: Sql) => Promise<void>;
  attestOutbox: (sql: Sql) => Promise<boolean>;
  acquireStorageCapability: (sql: Sql) => Promise<Capability>;
  operation: (sql: Sql, capability: Capability) => Promise<Result>;
}) {
  await configure(sql);
  // A publication spans both storage contracts. Acquire every cooperative
  // advisory lock before any relation or row lock so storage bootstrap and
  // outbox migration cannot form a cross-contract wait cycle.
  await acquireStorageCooperativeAdvisoryLock(sql);
  await acquireOutboxCooperativeAdvisoryLock(sql);
  if (acquireWebhookSchemaAdvisoryLock) await acquireWebhookSchemaAdvisoryLock(sql);
  if (acquireProviderMessageAdvisoryLock) await acquireProviderMessageAdvisoryLock(sql);
  await lockStorageRelations(sql);
  await lockOutbox(sql);
  await lockMigrationMarker(sql);
  if (!await attestOutbox(sql)) {
    throw new Error("Teacher notice email outbox PostgreSQL schema could not be attested.");
  }
  const capability = await acquireStorageCapability(sql);
  return operation(sql, capability);
}

// Terminal rows retain direct family delivery data for 30 days for bounded
// support/recovery, then keep only opaque internal identifiers, one-way
// fingerprints, delivery-state evidence, and retention timestamps. The entire
// non-PII tombstone is deleted at 400 days.
export const teacherNoticeEmailOutboxRetentionContract = {
  directPiiFields: [
    "recipient_id", "student_id", "guardian_id", "teacher_id", "queued_by_id",
    "class_id", "email", "locale", "delivery"
  ],
  tombstoneFields: [
    "id", "notice_id", "recipient_fingerprint", "queued_by_fingerprint",
    "durable_delivery_key", "content_revision", "status", "attempt_count",
    "first_enqueued_at", "next_attempt_at", "provider_message_id", "last_error_code",
    "last_http_status", "completed_at", "created_at", "updated_at", "pii_expires_at",
    "pii_purged_at", "tombstone_expires_at"
  ]
} as const;

export class TeacherNoticeEmailOutboxDeadlineError extends Error {
  constructor() {
    super("Teacher notice email outbox operation deadline exceeded.");
    this.name = "TeacherNoticeEmailOutboxDeadlineError";
  }
}

export function createContinuousTeacherNoticeEmailOutboxReadiness({
  attest
}: {
  attest: () => Promise<boolean>;
}) {
  return async function ensureTeacherNoticeEmailOutboxReady(): Promise<void> {
    if (!await attest()) {
      throw new Error("Teacher notice email outbox PostgreSQL schema migration is required.");
    }
  };
}

function teacherNoticeEmailOutboxSha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function teacherNoticeEmailOutboxTerminalRetention(now: string) {
  if (!isTeacherNoticeEmailOutboxRfc3339Timestamp(now)) {
    throw new Error("Teacher notice email outbox terminal retention time is invalid.");
  }
  const nowMs = Date.parse(now);
  return {
    pii_expires_at: new Date(nowMs + teacherNoticeEmailOutboxPiiRetentionMs).toISOString(),
    pii_purged_at: null,
    tombstone_expires_at: new Date(nowMs + teacherNoticeEmailOutboxTombstoneRetentionMs).toISOString()
  } as const;
}

export function teacherNoticeEmailOutboxTerminalTombstone({
  recipientId,
  providerMessageId,
  now
}: {
  recipientId: string;
  providerMessageId: string | null;
  now: string;
}) {
  if (!isTeacherNoticeEmailOutboxIdentifier(recipientId) || !isTeacherNoticeEmailOutboxRfc3339Timestamp(now)) {
    throw new Error("Teacher notice email outbox tombstone input is invalid.");
  }
  return {
    recipient_id: null,
    student_id: null,
    guardian_id: null,
    teacher_id: null,
    queued_by_id: null,
    class_id: null,
    email: null,
    locale: null,
    recipient_fingerprint: teacherNoticeEmailOutboxSha256(recipientId),
    provider_message_id: providerMessageId,
    pii_expires_at: now,
    pii_purged_at: now,
    tombstone_expires_at: new Date(Date.parse(now) + teacherNoticeEmailOutboxTombstoneRetentionMs).toISOString()
  } as const;
}

export function resolveTeacherNoticeEmailOutboxRetentionAction({
  row,
  now
}: {
  row: Pick<TeacherNoticeEmailOutboxRow, "status" | "pii_expires_at" | "pii_purged_at" | "tombstone_expires_at">;
  now: string;
}): "retain" | "purge-pii" | "delete-tombstone" {
  if (!isTeacherNoticeEmailOutboxRfc3339Timestamp(now)) return "retain";
  if (row.status !== "provider-accepted" && row.status !== "blocked" && row.status !== "dead-letter") {
    return "retain";
  }
  if (
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.pii_expires_at) ||
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.tombstone_expires_at) ||
    !validNullableTimestamp(row.pii_purged_at)
  ) return "retain";
  const nowMs = Date.parse(now);
  if (nowMs >= Date.parse(row.tombstone_expires_at)) return "delete-tombstone";
  if (row.pii_purged_at === null && nowMs >= Date.parse(row.pii_expires_at)) return "purge-pii";
  return "retain";
}

function teacherNoticeEmailOutboxDeadlineRemainingMs(
  deadline: TeacherNoticeEmailOutboxDeadline,
  preserveClaimReserve: boolean
) {
  if (!deadline || typeof deadline.monotonicNow !== "function") return 0;
  let now: number;
  try {
    now = deadline.monotonicNow();
  } catch {
    return 0;
  }
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(deadline.deadlineAtMs) ||
    !Number.isFinite(deadline.claimReserveMs) ||
    deadline.claimReserveMs < 0
  ) return 0;
  const reserve = preserveClaimReserve ? deadline.claimReserveMs : 0;
  return Math.max(0, deadline.deadlineAtMs - now - reserve);
}

export function teacherNoticeEmailOutboxDeadlineHasClaimReserve(
  deadline: TeacherNoticeEmailOutboxDeadline
) {
  return teacherNoticeEmailOutboxDeadlineRemainingMs(deadline, true) > 0;
}

export function teacherNoticeEmailOutboxDeadlineHasAnyTime(
  deadline: TeacherNoticeEmailOutboxDeadline
) {
  return teacherNoticeEmailOutboxDeadlineRemainingMs(deadline, false) > 0;
}

export function teacherNoticeEmailOutboxDeadlineStatementTimeoutMs(
  deadline: TeacherNoticeEmailOutboxDeadline,
  preserveClaimReserve: boolean
) {
  return Math.min(
    5_000,
    Math.floor(teacherNoticeEmailOutboxDeadlineRemainingMs(deadline, preserveClaimReserve))
  );
}

const strictIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u;
const strictProviderMessageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const strictRfc3339Pattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/u;

export const teacherNoticeEmailOutboxSqliteSchema = `
  CREATE TABLE IF NOT EXISTS teacher_notice_email_outbox (
    id TEXT PRIMARY KEY,
    notice_id TEXT NOT NULL,
    recipient_id TEXT,
    recipient_fingerprint TEXT NOT NULL,
    student_id TEXT,
    guardian_id TEXT,
    teacher_id TEXT,
    queued_by_id TEXT,
    queued_by_fingerprint TEXT NOT NULL,
    class_id TEXT,
    email TEXT,
    locale TEXT CONSTRAINT teacher_notice_email_outbox_locale_ck CHECK (locale IS NULL OR locale IN ('en', 'zh-Hant', 'zh-Hans')),
    durable_delivery_key TEXT NOT NULL,
    content_revision TEXT NOT NULL,
    status TEXT NOT NULL CONSTRAINT teacher_notice_email_outbox_status_ck CHECK (status IN ('pending', 'leased', 'retryable', 'provider-accepted', 'blocked', 'dead-letter')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT teacher_notice_email_outbox_attempt_count_ck CHECK (attempt_count >= 0),
    first_enqueued_at TEXT NOT NULL,
    next_attempt_at TEXT NOT NULL,
    lease_token TEXT,
    lease_expires_at TEXT,
    provider_message_id TEXT,
    last_error_code TEXT,
    last_http_status INTEGER CONSTRAINT teacher_notice_email_outbox_http_status_ck CHECK (
      last_http_status IS NULL OR (typeof(last_http_status) = 'integer' AND last_http_status BETWEEN 100 AND 599)
    ),
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    pii_expires_at TEXT,
    pii_purged_at TEXT,
    tombstone_expires_at TEXT,
    CONSTRAINT teacher_notice_email_outbox_state_fields_ck CHECK (
      (status IN ('pending', 'retryable') AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
        AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL
        AND lease_token IS NULL AND lease_expires_at IS NULL AND provider_message_id IS NULL AND completed_at IS NULL
        AND pii_expires_at IS NULL AND pii_purged_at IS NULL AND tombstone_expires_at IS NULL)
      OR (status = 'leased' AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
        AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL
        AND lease_token IS NOT NULL AND lease_token <> '' AND lease_expires_at IS NOT NULL AND provider_message_id IS NULL
        AND completed_at IS NULL AND pii_expires_at IS NULL AND pii_purged_at IS NULL AND tombstone_expires_at IS NULL)
      OR (status = 'provider-accepted' AND lease_token IS NULL AND lease_expires_at IS NULL
        AND provider_message_id IS NOT NULL AND provider_message_id <> '' AND completed_at IS NOT NULL
        AND pii_expires_at IS NOT NULL AND tombstone_expires_at IS NOT NULL
        AND ((pii_purged_at IS NULL AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
          AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL)
          OR (pii_purged_at IS NOT NULL AND recipient_id IS NULL AND student_id IS NULL AND guardian_id IS NULL
          AND teacher_id IS NULL AND queued_by_id IS NULL AND class_id IS NULL AND email IS NULL AND locale IS NULL)))
      OR (status IN ('blocked', 'dead-letter') AND lease_token IS NULL AND lease_expires_at IS NULL AND completed_at IS NOT NULL
        AND pii_expires_at IS NOT NULL AND tombstone_expires_at IS NOT NULL
        AND ((pii_purged_at IS NULL AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
          AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL)
          OR (pii_purged_at IS NOT NULL AND recipient_id IS NULL AND student_id IS NULL AND guardian_id IS NULL
          AND teacher_id IS NULL AND queued_by_id IS NULL AND class_id IS NULL AND email IS NULL AND locale IS NULL)))
    ),
    CONSTRAINT teacher_notice_email_outbox_delivery_revision_uq UNIQUE (notice_id, recipient_fingerprint, content_revision)
  );
  CREATE INDEX IF NOT EXISTS teacher_notice_email_outbox_eligible_idx
    ON teacher_notice_email_outbox (status, next_attempt_at, lease_expires_at, first_enqueued_at);
  CREATE UNIQUE INDEX IF NOT EXISTS teacher_notice_email_outbox_provider_message_uq
    ON teacher_notice_email_outbox (provider_message_id)
    WHERE provider_message_id IS NOT NULL;
`;

export function normalizeTeacherNoticeEmailOutboxSqliteSchemaSql(value: string | null): string | null {
  if (value === null) return null;
  return value
    .replace(/\bIF\s+NOT\s+EXISTS\b/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function teacherNoticeEmailOutboxSqliteSchemaStatements() {
  return teacherNoticeEmailOutboxSqliteSchema
    .split(/;\s*(?=(?:CREATE|INSERT)\b|$)/giu)
    .map((statement) => statement.trim())
    .filter((statement) => /^CREATE\b/iu.test(statement));
}

function teacherNoticeEmailOutboxExpectedSqliteObjects() {
  const objects = teacherNoticeEmailOutboxSqliteSchemaStatements().map((statement) => {
    const relation = /^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/iu.exec(statement);
    if (relation) return {
      type: "table",
      name: relation[1],
      table: relation[1],
      sql: normalizeTeacherNoticeEmailOutboxSqliteSchemaSql(statement)
    };
    const index = /^CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s+ON\s+(\w+)/iu.exec(statement);
    if (!index) throw new Error("Teacher notice email outbox SQLite schema contains an unsupported statement.");
    return {
      type: "index",
      name: index[1],
      table: index[2],
      sql: normalizeTeacherNoticeEmailOutboxSqliteSchemaSql(statement)
    };
  });
  objects.push(
    { type: "index", name: "sqlite_autoindex_teacher_notice_email_outbox_1", table: "teacher_notice_email_outbox", sql: null },
    { type: "index", name: "sqlite_autoindex_teacher_notice_email_outbox_2", table: "teacher_notice_email_outbox", sql: null }
  );
  return objects.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

const teacherNoticeEmailOutboxExpectedSqliteColumns = [
  ["id", "TEXT", 0, null, 1, 0],
  ["notice_id", "TEXT", 1, null, 0, 0],
  ["recipient_id", "TEXT", 0, null, 0, 0],
  ["recipient_fingerprint", "TEXT", 1, null, 0, 0],
  ["student_id", "TEXT", 0, null, 0, 0],
  ["guardian_id", "TEXT", 0, null, 0, 0],
  ["teacher_id", "TEXT", 0, null, 0, 0],
  ["queued_by_id", "TEXT", 0, null, 0, 0],
  ["queued_by_fingerprint", "TEXT", 1, null, 0, 0],
  ["class_id", "TEXT", 0, null, 0, 0],
  ["email", "TEXT", 0, null, 0, 0],
  ["locale", "TEXT", 0, null, 0, 0],
  ["durable_delivery_key", "TEXT", 1, null, 0, 0],
  ["content_revision", "TEXT", 1, null, 0, 0],
  ["status", "TEXT", 1, null, 0, 0],
  ["attempt_count", "INTEGER", 1, "0", 0, 0],
  ["first_enqueued_at", "TEXT", 1, null, 0, 0],
  ["next_attempt_at", "TEXT", 1, null, 0, 0],
  ["lease_token", "TEXT", 0, null, 0, 0],
  ["lease_expires_at", "TEXT", 0, null, 0, 0],
  ["provider_message_id", "TEXT", 0, null, 0, 0],
  ["last_error_code", "TEXT", 0, null, 0, 0],
  ["last_http_status", "INTEGER", 0, null, 0, 0],
  ["completed_at", "TEXT", 0, null, 0, 0],
  ["created_at", "TEXT", 1, null, 0, 0],
  ["updated_at", "TEXT", 1, null, 0, 0],
  ["pii_expires_at", "TEXT", 0, null, 0, 0],
  ["pii_purged_at", "TEXT", 0, null, 0, 0],
  ["tombstone_expires_at", "TEXT", 0, null, 0, 0]
] as const;

function teacherNoticeEmailOutboxSqliteIndexKeys(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA index_xinfo('${name}')`).all() as Array<{
    name: string | null;
    desc: number;
    coll: string | null;
    key: number;
  }>).filter((row) => row.key === 1).map((row) => [row.name, row.desc, row.coll]);
}

export function attestTeacherNoticeEmailOutboxSqliteSchema(storage: DatabaseSync): boolean {
  try {
    const objects = (storage.prepare(`
      SELECT type, name, tbl_name AS "table", sql
      FROM sqlite_master
      WHERE name = 'teacher_notice_email_outbox'
        OR tbl_name = 'teacher_notice_email_outbox'
      ORDER BY name
    `).all() as Array<{ type: string; name: string; table: string; sql: string | null }>)
      .map((row) => ({ ...row, sql: normalizeTeacherNoticeEmailOutboxSqliteSchemaSql(row.sql) }));
    if (JSON.stringify(objects) !== JSON.stringify(teacherNoticeEmailOutboxExpectedSqliteObjects())) return false;

    const columns = (storage.prepare("PRAGMA table_xinfo('teacher_notice_email_outbox')").all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
      hidden: number;
    }>).map((row) => [row.name, row.type, row.notnull, row.dflt_value, row.pk, row.hidden]);
    if (JSON.stringify(columns) !== JSON.stringify(teacherNoticeEmailOutboxExpectedSqliteColumns)) return false;

    const indexes = (storage.prepare("PRAGMA index_list('teacher_notice_email_outbox')").all() as Array<{
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>).map((row) => [row.name, row.unique, row.origin, row.partial])
      .sort((left, right) => String(left[0]) < String(right[0]) ? -1 : String(left[0]) > String(right[0]) ? 1 : 0);
    if (JSON.stringify(indexes) !== JSON.stringify([
      ["sqlite_autoindex_teacher_notice_email_outbox_1", 1, "pk", 0],
      ["sqlite_autoindex_teacher_notice_email_outbox_2", 1, "u", 0],
      ["teacher_notice_email_outbox_eligible_idx", 0, "c", 0],
      ["teacher_notice_email_outbox_provider_message_uq", 1, "c", 1]
    ])) return false;
    if (storage.prepare("PRAGMA foreign_key_list('teacher_notice_email_outbox')").all().length !== 0) return false;
    return (
      JSON.stringify(teacherNoticeEmailOutboxSqliteIndexKeys(storage, "sqlite_autoindex_teacher_notice_email_outbox_1")) ===
        JSON.stringify([["id", 0, "BINARY"]]) &&
      JSON.stringify(teacherNoticeEmailOutboxSqliteIndexKeys(storage, "sqlite_autoindex_teacher_notice_email_outbox_2")) ===
        JSON.stringify([["notice_id", 0, "BINARY"], ["recipient_fingerprint", 0, "BINARY"], ["content_revision", 0, "BINARY"]]) &&
      JSON.stringify(teacherNoticeEmailOutboxSqliteIndexKeys(storage, "teacher_notice_email_outbox_eligible_idx")) ===
        JSON.stringify([["status", 0, "BINARY"], ["next_attempt_at", 0, "BINARY"], ["lease_expires_at", 0, "BINARY"], ["first_enqueued_at", 0, "BINARY"]]) &&
      JSON.stringify(teacherNoticeEmailOutboxSqliteIndexKeys(storage, "teacher_notice_email_outbox_provider_message_uq")) ===
        JSON.stringify([["provider_message_id", 0, "BINARY"]])
    );
  } catch {
    return false;
  }
}

export const teacherNoticeEmailOutboxSqliteNoContactReleaseSql = `
  UPDATE teacher_notice_email_outbox
  SET status = ?, attempt_count = ?, next_attempt_at = ?, lease_token = NULL,
      lease_expires_at = NULL, updated_at = ?
  WHERE id = ? AND status = 'leased' AND lease_token = ? AND attempt_count = ?
`;

export const teacherNoticeEmailOutboxPostgresSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS public.teacher_notice_email_outbox (
    id pg_catalog.text CONSTRAINT teacher_notice_email_outbox_pkey PRIMARY KEY,
    notice_id pg_catalog.text NOT NULL,
    recipient_id pg_catalog.text,
    recipient_fingerprint pg_catalog.text NOT NULL,
    student_id pg_catalog.text,
    guardian_id pg_catalog.text,
    teacher_id pg_catalog.text,
    queued_by_id pg_catalog.text,
    queued_by_fingerprint pg_catalog.text NOT NULL,
    class_id pg_catalog.text,
    email pg_catalog.text,
    locale pg_catalog.text CONSTRAINT teacher_notice_email_outbox_locale_ck CHECK (locale IS NULL OR locale IN ('en', 'zh-Hant', 'zh-Hans')),
    durable_delivery_key pg_catalog.text NOT NULL,
    content_revision pg_catalog.text NOT NULL,
    status pg_catalog.text NOT NULL CONSTRAINT teacher_notice_email_outbox_status_ck CHECK (status IN ('pending', 'leased', 'retryable', 'provider-accepted', 'blocked', 'dead-letter')),
    attempt_count pg_catalog.int4 NOT NULL DEFAULT 0 CONSTRAINT teacher_notice_email_outbox_attempt_count_ck CHECK (attempt_count >= 0),
    first_enqueued_at pg_catalog.timestamptz NOT NULL,
    next_attempt_at pg_catalog.timestamptz NOT NULL,
    lease_token pg_catalog.text,
    lease_expires_at pg_catalog.timestamptz,
    provider_message_id pg_catalog.text,
    last_error_code pg_catalog.text,
    last_http_status pg_catalog.int4 CONSTRAINT teacher_notice_email_outbox_http_status_ck CHECK (last_http_status IS NULL OR (last_http_status BETWEEN 100 AND 599)),
    completed_at pg_catalog.timestamptz,
    created_at pg_catalog.timestamptz NOT NULL,
    updated_at pg_catalog.timestamptz NOT NULL,
    pii_expires_at pg_catalog.timestamptz,
    pii_purged_at pg_catalog.timestamptz,
    tombstone_expires_at pg_catalog.timestamptz,
    CONSTRAINT teacher_notice_email_outbox_state_fields_ck CHECK (
      (status IN ('pending', 'retryable') AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
        AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL
        AND lease_token IS NULL AND lease_expires_at IS NULL AND provider_message_id IS NULL AND completed_at IS NULL
        AND pii_expires_at IS NULL AND pii_purged_at IS NULL AND tombstone_expires_at IS NULL)
      OR (status = 'leased' AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
        AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL
        AND lease_token IS NOT NULL AND lease_token <> '' AND lease_expires_at IS NOT NULL AND provider_message_id IS NULL
        AND completed_at IS NULL AND pii_expires_at IS NULL AND pii_purged_at IS NULL AND tombstone_expires_at IS NULL)
      OR (status = 'provider-accepted' AND lease_token IS NULL AND lease_expires_at IS NULL
        AND provider_message_id IS NOT NULL AND provider_message_id <> '' AND completed_at IS NOT NULL
        AND pii_expires_at IS NOT NULL AND tombstone_expires_at IS NOT NULL
        AND ((pii_purged_at IS NULL AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
          AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL)
          OR (pii_purged_at IS NOT NULL AND recipient_id IS NULL AND student_id IS NULL AND guardian_id IS NULL
          AND teacher_id IS NULL AND queued_by_id IS NULL AND class_id IS NULL AND email IS NULL AND locale IS NULL)))
      OR (status IN ('blocked', 'dead-letter') AND lease_token IS NULL AND lease_expires_at IS NULL AND completed_at IS NOT NULL
        AND pii_expires_at IS NOT NULL AND tombstone_expires_at IS NOT NULL
        AND ((pii_purged_at IS NULL AND recipient_id IS NOT NULL AND student_id IS NOT NULL AND guardian_id IS NOT NULL
          AND teacher_id IS NOT NULL AND queued_by_id IS NOT NULL AND class_id IS NOT NULL AND email IS NOT NULL AND locale IS NOT NULL)
          OR (pii_purged_at IS NOT NULL AND recipient_id IS NULL AND student_id IS NULL AND guardian_id IS NULL
          AND teacher_id IS NULL AND queued_by_id IS NULL AND class_id IS NULL AND email IS NULL AND locale IS NULL)))
    ),
    CONSTRAINT teacher_notice_email_outbox_delivery_revision_uq UNIQUE (notice_id, recipient_fingerprint, content_revision)
  )`,
  `CREATE INDEX IF NOT EXISTS teacher_notice_email_outbox_eligible_idx
    ON public.teacher_notice_email_outbox (status, next_attempt_at, lease_expires_at, first_enqueued_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS teacher_notice_email_outbox_provider_message_uq
    ON public.teacher_notice_email_outbox (provider_message_id)
    WHERE provider_message_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS public.teacher_notice_email_outbox_schema_migrations (
    singleton pg_catalog.bool CONSTRAINT teacher_notice_email_outbox_schema_migrations_pkey PRIMARY KEY DEFAULT TRUE,
    version pg_catalog.int4 NOT NULL DEFAULT 2 CONSTRAINT teacher_notice_email_outbox_schema_version_ck CHECK (version = 2),
    applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT teacher_notice_email_outbox_schema_singleton_ck CHECK (singleton)
  )`,
  `INSERT INTO public.teacher_notice_email_outbox_schema_migrations (singleton, version)
    VALUES (TRUE, 2)
    ON CONFLICT (singleton) DO UPDATE SET version = EXCLUDED.version`,
  `COMMENT ON TABLE public.teacher_notice_email_outbox_schema_migrations IS 'mais:teacher-notice-email-outbox:v2'`
] as const;

export const teacherNoticeEmailOutboxExpectedPostgresCatalog = {
  relations: [
    {
      name: "teacher_notice_email_outbox",
      kind: "r",
      persistence: "p",
      rowSecurity: false,
      forceRowSecurity: false
    },
    {
      name: "teacher_notice_email_outbox_schema_migrations",
      kind: "r",
      persistence: "p",
      rowSecurity: false,
      forceRowSecurity: false
    }
  ],
  columns: [
    { relation: "teacher_notice_email_outbox", name: "id", position: 1, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "notice_id", position: 2, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "recipient_id", position: 3, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "recipient_fingerprint", position: 4, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "student_id", position: 5, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "guardian_id", position: 6, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "teacher_id", position: 7, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "queued_by_id", position: 8, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "queued_by_fingerprint", position: 9, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "class_id", position: 10, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "email", position: 11, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "locale", position: 12, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "durable_delivery_key", position: 13, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "content_revision", position: 14, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "status", position: 15, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "attempt_count", position: 16, type: "integer", notNull: true, defaultExpression: "0" },
    { relation: "teacher_notice_email_outbox", name: "first_enqueued_at", position: 17, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "next_attempt_at", position: 18, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "lease_token", position: 19, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "lease_expires_at", position: 20, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "provider_message_id", position: 21, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "last_error_code", position: 22, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "last_http_status", position: 23, type: "integer", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "completed_at", position: 24, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "created_at", position: 25, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "updated_at", position: 26, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "pii_expires_at", position: 27, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "pii_purged_at", position: 28, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox", name: "tombstone_expires_at", position: 29, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "singleton", position: 1, type: "boolean", notNull: true, defaultExpression: "true" },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "version", position: 2, type: "integer", notNull: true, defaultExpression: "2" },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "applied_at", position: 3, type: "timestamp with time zone", notNull: true, defaultExpression: "now()" }
  ],
  constraints: [
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_attempt_count_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(attempt_count >= 0)"
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_delivery_revision_uq",
      type: "u",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: "teacher_notice_email_outbox_delivery_revision_uq",
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: ["notice_id", "recipient_fingerprint", "content_revision"],
      expression: null
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_http_status_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "((last_http_status IS NULL) OR ((last_http_status >= 100) AND (last_http_status <= 599)))"
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_locale_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "((locale IS NULL) OR (locale = ANY (ARRAY['en'::text, 'zh-Hant'::text, 'zh-Hans'::text])))"
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_pkey",
      type: "p",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: "teacher_notice_email_outbox_pkey",
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: ["id"],
      expression: null
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_state_fields_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(((status = ANY (ARRAY['pending'::text, 'retryable'::text])) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (provider_message_id IS NULL) AND (completed_at IS NULL) AND (pii_expires_at IS NULL) AND (pii_purged_at IS NULL) AND (tombstone_expires_at IS NULL)) OR ((status = 'leased'::text) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL) AND (lease_token IS NOT NULL) AND (lease_token <> ''::text) AND (lease_expires_at IS NOT NULL) AND (provider_message_id IS NULL) AND (completed_at IS NULL) AND (pii_expires_at IS NULL) AND (pii_purged_at IS NULL) AND (tombstone_expires_at IS NULL)) OR ((status = 'provider-accepted'::text) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (provider_message_id IS NOT NULL) AND (provider_message_id <> ''::text) AND (completed_at IS NOT NULL) AND (pii_expires_at IS NOT NULL) AND (tombstone_expires_at IS NOT NULL) AND (((pii_purged_at IS NULL) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL)) OR ((pii_purged_at IS NOT NULL) AND (recipient_id IS NULL) AND (student_id IS NULL) AND (guardian_id IS NULL) AND (teacher_id IS NULL) AND (queued_by_id IS NULL) AND (class_id IS NULL) AND (email IS NULL) AND (locale IS NULL)))) OR ((status = ANY (ARRAY['blocked'::text, 'dead-letter'::text])) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (completed_at IS NOT NULL) AND (pii_expires_at IS NOT NULL) AND (tombstone_expires_at IS NOT NULL) AND (((pii_purged_at IS NULL) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL)) OR ((pii_purged_at IS NOT NULL) AND (recipient_id IS NULL) AND (student_id IS NULL) AND (guardian_id IS NULL) AND (teacher_id IS NULL) AND (queued_by_id IS NULL) AND (class_id IS NULL) AND (email IS NULL) AND (locale IS NULL)))))"
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_status_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(status = ANY (ARRAY['pending'::text, 'leased'::text, 'retryable'::text, 'provider-accepted'::text, 'blocked'::text, 'dead-letter'::text]))"
    },
    {
      relation: "teacher_notice_email_outbox_schema_migrations",
      name: "teacher_notice_email_outbox_schema_migrations_pkey",
      type: "p",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: "teacher_notice_email_outbox_schema_migrations_pkey",
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: ["singleton"],
      expression: null
    },
    {
      relation: "teacher_notice_email_outbox_schema_migrations",
      name: "teacher_notice_email_outbox_schema_singleton_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "singleton"
    },
    {
      relation: "teacher_notice_email_outbox_schema_migrations",
      name: "teacher_notice_email_outbox_schema_version_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(version = 2)"
    }
  ],
  indexes: [
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_eligible_idx",
      accessMethod: "btree",
      valid: true,
      ready: true,
      live: true,
      unique: false,
      primary: false,
      immediate: true,
      partial: false,
      predicate: null,
      keyCount: 4,
      attributeCount: 4,
      keyColumns: ["status", "next_attempt_at", "lease_expires_at", "first_enqueued_at"],
      indOptions: [0, 0, 0, 0],
      opclasses: [
        { schema: "pg_catalog", name: "text_ops", inputType: "text", accessMethod: "btree", isDefault: true },
        { schema: "pg_catalog", name: "timestamptz_ops", inputType: "timestamp with time zone", accessMethod: "btree", isDefault: true },
        { schema: "pg_catalog", name: "timestamptz_ops", inputType: "timestamp with time zone", accessMethod: "btree", isDefault: true },
        { schema: "pg_catalog", name: "timestamptz_ops", inputType: "timestamp with time zone", accessMethod: "btree", isDefault: true }
      ],
      collations: [
        { schema: "pg_catalog", name: "default" },
        null,
        null,
        null
      ]
    },
    {
      relation: "teacher_notice_email_outbox",
      name: "teacher_notice_email_outbox_provider_message_uq",
      accessMethod: "btree",
      valid: true,
      ready: true,
      live: true,
      unique: true,
      primary: false,
      immediate: true,
      partial: true,
      predicate: "(provider_message_id IS NOT NULL)",
      keyCount: 1,
      attributeCount: 1,
      keyColumns: ["provider_message_id"],
      indOptions: [0],
      opclasses: [
        { schema: "pg_catalog", name: "text_ops", inputType: "text", accessMethod: "btree", isDefault: true }
      ],
      collations: [
        { schema: "pg_catalog", name: "default" }
      ]
    }
  ],
  integrity: {
    relationOidCount: 2,
    columnCount: 32,
    constraintCount: 10,
    indexCount: 5,
    unexpectedIndexCount: 0,
    userTriggerCount: 0,
    ruleCount: 0,
    inheritanceCount: 0,
    constraintRelationOidsMatch: true,
    constraintBackingIndexOidsMatch: true,
    indexRelationOidsMatch: true
  },
  markerComment: "mais:teacher-notice-email-outbox:v2",
  markerRows: [{ singleton: true, version: 2 }]
} as const;

export type TeacherNoticeEmailOutboxPostgresCatalogAttestation = typeof teacherNoticeEmailOutboxExpectedPostgresCatalog;

function canonicalCatalogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalCatalogValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalCatalogValue(entry)])
  );
}

export function attestTeacherNoticeEmailOutboxPostgresCatalog(
  value: unknown
): value is TeacherNoticeEmailOutboxPostgresCatalogAttestation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return JSON.stringify(canonicalCatalogValue(value)) ===
    JSON.stringify(canonicalCatalogValue(teacherNoticeEmailOutboxExpectedPostgresCatalog));
}

function field(record: JsonRecord, name: string): string {
  return typeof record[name] === "string" ? record[name] as string : "";
}

function recordsWithField(records: JsonRecord[], name: string, value: string): JsonRecord[] {
  return records.filter((record) => field(record, name) === value);
}

function uniqueRecord(
  records: JsonRecord[],
  name: string,
  value: string,
  label: string
): JsonRecord | null {
  const matches = recordsWithField(records, name, value);
  if (matches.length > 1) {
    throw new Error(`Teacher notice email outbox contains a conflicting ${label}.`);
  }
  return matches[0] ?? null;
}

function assertGloballyUniqueIds(records: JsonRecord[], label: string): void {
  const seen = new Set<string>();
  for (const record of records) {
    const id = field(record, "id");
    if (!id) throw new Error(`Teacher notice email outbox contains an invalid ${label} identifier.`);
    if (seen.has(id)) throw new Error(`Teacher notice email outbox contains a conflicting ${label} identifier.`);
    seen.add(id);
  }
}

function hasNullDisabledAt(record: JsonRecord): boolean {
  return Object.prototype.hasOwnProperty.call(record, "disabled_at") && record.disabled_at === null;
}

export function isTeacherNoticeEmailOutboxIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 200 && strictIdentifierPattern.test(value);
}

export function isTeacherNoticeEmailOutboxProviderMessageId(value: unknown): value is string {
  return typeof value === "string" && strictProviderMessageIdPattern.test(value);
}

export function isTeacherNoticeEmailOutboxRfc3339Timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = strictRfc3339Pattern.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction = ""] = match;
  const normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}.${fraction.padEnd(3, "0")}Z`;
  const milliseconds = Date.parse(normalized);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === normalized;
}

function validHttpStatus(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599);
}

function validNullableIdentifier(value: unknown): value is string | null {
  return value === null || isTeacherNoticeEmailOutboxIdentifier(value);
}

function validNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTeacherNoticeEmailOutboxRfc3339Timestamp(value);
}

function validTeacherNoticeEmailOutboxFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function teacherNoticeEmailOutboxDeliveryMatchesRow(row: JsonRecord): boolean {
  const delivery = row.delivery;
  if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) return false;
  const deliveryRecord = delivery as JsonRecord;
  return Object.keys(deliveryRecord).sort().join(",") === "contentRevision,durableDeliveryKey,email,locale,recipientId" &&
    deliveryRecord.recipientId === row.recipient_id &&
    deliveryRecord.email === row.email &&
    deliveryRecord.locale === row.locale &&
    deliveryRecord.durableDeliveryKey === row.durable_delivery_key &&
    deliveryRecord.contentRevision === row.content_revision;
}

export function validateTeacherNoticeEmailOutboxRow(value: unknown): value is TeacherNoticeEmailOutboxRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as JsonRecord;
  const commonIdentifiers = [row.id, row.notice_id, row.durable_delivery_key, row.content_revision];
  if (!commonIdentifiers.every(isTeacherNoticeEmailOutboxIdentifier)) return false;
  if (
    !validTeacherNoticeEmailOutboxFingerprint(row.recipient_fingerprint) ||
    !validTeacherNoticeEmailOutboxFingerprint(row.queued_by_fingerprint)
  ) return false;
  if (!Number.isInteger(row.attempt_count) || Number(row.attempt_count) < 0 || !validHttpStatus(row.last_http_status)) return false;
  if (!validNullableIdentifier(row.last_error_code)) return false;
  if (
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.first_enqueued_at) ||
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.next_attempt_at) ||
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.created_at) ||
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.updated_at) ||
    !validNullableTimestamp(row.lease_expires_at) ||
    !validNullableTimestamp(row.completed_at) ||
    !validNullableTimestamp(row.pii_expires_at) ||
    !validNullableTimestamp(row.pii_purged_at) ||
    !validNullableTimestamp(row.tombstone_expires_at)
  ) return false;

  const status = row.status;
  const leaseToken = row.lease_token;
  const leaseExpiresAt = row.lease_expires_at;
  const providerMessageId = row.provider_message_id;
  const completedAt = row.completed_at;
  if (
    (status === "pending" || status === "retryable") &&
    (leaseToken !== null || leaseExpiresAt !== null || providerMessageId !== null || completedAt !== null)
  ) return false;
  if (
    status === "leased" &&
    (!isTeacherNoticeEmailOutboxIdentifier(leaseToken) || leaseExpiresAt === null || providerMessageId !== null || completedAt !== null)
  ) return false;
  if (
    status === "provider-accepted" &&
    (leaseToken !== null || leaseExpiresAt !== null || !isTeacherNoticeEmailOutboxProviderMessageId(providerMessageId) || completedAt === null)
  ) return false;
  if (
    (status === "blocked" || status === "dead-letter") &&
    (leaseToken !== null || leaseExpiresAt !== null || completedAt === null ||
      (providerMessageId !== null && !isTeacherNoticeEmailOutboxProviderMessageId(providerMessageId)))
  ) return false;
  if (![
    "pending", "retryable", "leased", "provider-accepted", "blocked", "dead-letter"
  ].includes(String(status))) return false;

  const directIdentifiers = [
    row.recipient_id, row.student_id, row.guardian_id, row.teacher_id, row.queued_by_id, row.class_id
  ];
  const hasDirectPii = directIdentifiers.every(isTeacherNoticeEmailOutboxIdentifier) &&
    strictEmail(row.email) &&
    (row.locale === "en" || row.locale === "zh-Hant" || row.locale === "zh-Hans") &&
    row.recipient_fingerprint === teacherNoticeEmailOutboxSha256(String(row.recipient_id)) &&
    row.queued_by_fingerprint === teacherNoticeEmailOutboxSha256(String(row.queued_by_id)) &&
    teacherNoticeEmailOutboxDeliveryMatchesRow(row);
  const isPurged = row.pii_purged_at !== null;
  const directPiiIsCleared = directIdentifiers.every((entry) => entry === null) &&
    row.email === null && row.locale === null && row.delivery === null;
  const isTerminal = status === "provider-accepted" || status === "blocked" || status === "dead-letter";

  if (!isTerminal) {
    return hasDirectPii && !isPurged && row.pii_expires_at === null && row.tombstone_expires_at === null;
  }
  if (
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.pii_expires_at) ||
    !isTeacherNoticeEmailOutboxRfc3339Timestamp(row.tombstone_expires_at)
  ) return false;
  return isPurged ? directPiiIsCleared : hasDirectPii;
}

export function validateTeacherNoticeEmailOutboxCompletion(
  value: unknown
): value is TeacherNoticeEmailOutboxCompletion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const completion = value as JsonRecord;
  if (Object.keys(completion).sort().join(",") !== [
    "completedAt", "errorCode", "httpStatus", "nextAttemptAt", "providerMessageId", "status"
  ].sort().join(",")) return false;
  if (!validNullableIdentifier(completion.errorCode) || !validHttpStatus(completion.httpStatus)) return false;
  const status = completion.status;
  if (status === "retryable") {
    return completion.providerMessageId === null && completion.completedAt === null &&
      isTeacherNoticeEmailOutboxRfc3339Timestamp(completion.nextAttemptAt);
  }
  if (status === "provider-accepted") {
    return isTeacherNoticeEmailOutboxProviderMessageId(completion.providerMessageId) &&
      completion.nextAttemptAt === null && isTeacherNoticeEmailOutboxRfc3339Timestamp(completion.completedAt);
  }
  if (status === "blocked" || status === "dead-letter") {
    return (completion.providerMessageId === null || isTeacherNoticeEmailOutboxProviderMessageId(completion.providerMessageId)) &&
      completion.nextAttemptAt === null && isTeacherNoticeEmailOutboxRfc3339Timestamp(completion.completedAt);
  }
  return false;
}

function strictEmail(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > 254 ||
    value !== value.trim() ||
    /[^\x21-\x7e]/u.test(value) ||
    value.includes(",") ||
    value.includes("<") ||
    value.includes(">")
  ) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || !domain || localPart.length > 64 || localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return false;
  }
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(localPart) || domain.includes("..")) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) => (
    label.length >= 1 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label)
  ));
}

function emailLocale(value: unknown): TeacherNoticeEmailLocale | null {
  if (value === "en") return "en";
  if (value === "zh") return "zh-Hant";
  if (value === "zh-Hans") return "zh-Hans";
  return null;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function teacherNoticeEmailContentRevision(notice: JsonRecord): string {
  return `v1-${stableHash({
    id: field(notice, "id"),
    teacherId: field(notice, "teacher_id"),
    classId: field(notice, "class_id"),
    audience: field(notice, "audience"),
    subjectEn: field(notice, "subject_en"),
    subjectZh: field(notice, "subject_zh"),
    bodyEn: field(notice, "body_en"),
    bodyZh: field(notice, "body_zh"),
    assignmentId: field(notice, "assignment_id"),
    sourceKind: field(notice, "source_kind"),
    sourceId: field(notice, "source_id"),
    dueAt: notice.due_at === null ? null : field(notice, "due_at"),
    createdAt: field(notice, "created_at")
  })}`;
}

function teacherNoticeEmailDeliveryContentRevision(
  notice: JsonRecord,
  email: string,
  locale: TeacherNoticeEmailLocale
): string {
  return `v2-${stableHash({
    noticeRevision: teacherNoticeEmailContentRevision(notice),
    destinationRevision: stableHash({ email, locale })
  })}`;
}

function countExact(records: JsonRecord[], predicate: (record: JsonRecord) => boolean, label: string): number {
  const count = records.filter(predicate).length;
  if (count > 1) throw new Error(`Teacher notice email outbox contains a conflicting ${label}.`);
  return count;
}

function currentTeacherNoticeEmailAuthorityIds(
  database: TeacherNoticeEmailPublicationDatabase,
  teacherClass: JsonRecord
): Set<string> {
  const classId = field(teacherClass, "id");
  const ownerId = field(teacherClass, "teacher_id");
  if (!classId || !ownerId) {
    throw new Error("Teacher notice email outbox contains invalid class authority.");
  }
  const authorityIds = new Set([ownerId]);
  const collaboratorTeacherIds = new Set<string>();
  for (const collaborator of database.teacher_class_collaborators) {
    if (field(collaborator, "class_id") !== classId) continue;
    const teacherId = field(collaborator, "teacher_id");
    const role = field(collaborator, "role");
    const status = field(collaborator, "status");
    if (
      !teacherId ||
      (role !== "co-teacher" && role !== "viewer") ||
      !["active", "revoked", "invited", "inactive"].includes(status)
    ) {
      throw new Error("Teacher notice email outbox contains invalid class authority.");
    }
    if (collaboratorTeacherIds.has(teacherId)) {
      throw new Error("Teacher notice email outbox contains conflicting class authority.");
    }
    collaboratorTeacherIds.add(teacherId);
    if (role === "co-teacher" && status === "active") authorityIds.add(teacherId);
  }

  const membershipUserIds = new Set<string>();
  for (const membership of database.school_memberships) {
    if (field(membership, "class_id") !== classId) continue;
    const userId = field(membership, "user_id");
    const role = field(membership, "role");
    if (!userId || !["student", "teacher", "parent", "admin"].includes(role)) {
      throw new Error("Teacher notice email outbox contains invalid class membership.");
    }
    if (membershipUserIds.has(userId)) {
      throw new Error("Teacher notice email outbox contains conflicting class membership.");
    }
    membershipUserIds.add(userId);
    if (role === "teacher" || role === "admin") authorityIds.add(userId);
  }
  return authorityIds;
}

function teacherCanPublishNoticeEmailForClass(
  database: TeacherNoticeEmailPublicationDatabase,
  teacherId: string,
  teacherClass: JsonRecord
): boolean {
  return currentTeacherNoticeEmailAuthorityIds(database, teacherClass).has(teacherId);
}

function classHasCurrentTeacherNoticeEmailAuthority(
  database: TeacherNoticeEmailPublicationDatabase,
  teacherClass: JsonRecord
): boolean {
  return Array.from(currentTeacherNoticeEmailAuthorityIds(database, teacherClass)).some((teacherId) => {
    const teacher = uniqueRecord(database.users, "id", teacherId, "teacher authority");
    return Boolean(teacher && field(teacher, "role") === "teacher" && hasNullDisabledAt(teacher));
  });
}

export function prepareTeacherNoticeEmailPublication({
  database,
  teacherId,
  noticeId,
  now
}: {
  database: TeacherNoticeEmailPublicationDatabase;
  teacherId: string;
  noticeId: string;
  now: string;
}):
  | { status: "not-found" }
  | { status: "no-eligible"; rows: []; skipped: number }
  | { status: "prepared"; rows: TeacherNoticeEmailOutboxRow[]; skipped: number } {
  assertGloballyUniqueIds(database.users, "user");
  assertGloballyUniqueIds(database.teacher_classes, "class");
  assertGloballyUniqueIds(database.teacher_class_collaborators, "class collaborator");
  assertGloballyUniqueIds(database.school_memberships, "school membership");
  assertGloballyUniqueIds(database.class_enrollments, "enrollment");
  assertGloballyUniqueIds(database.guardian_links, "guardian link");
  assertGloballyUniqueIds(database.teacher_notices, "notice");
  assertGloballyUniqueIds(database.teacher_notice_recipients, "recipient");

  const teacher = uniqueRecord(database.users, "id", teacherId, "teacher");
  if (!teacher || field(teacher, "role") !== "teacher" || !hasNullDisabledAt(teacher)) {
    return { status: "not-found" };
  }
  const notice = uniqueRecord(database.teacher_notices, "id", noticeId, "notice");
  if (!notice) return { status: "not-found" };
  const noticeAuthorId = field(notice, "teacher_id");
  const noticeAuthor = uniqueRecord(database.users, "id", noticeAuthorId, "notice author");
  if (!noticeAuthor || field(noticeAuthor, "role") !== "teacher" || !hasNullDisabledAt(noticeAuthor)) {
    return { status: "not-found" };
  }
  if (field(notice, "status") !== "draft" && field(notice, "status") !== "queued") {
    return { status: "not-found" };
  }
  const classId = field(notice, "class_id");
  const teacherClass = uniqueRecord(database.teacher_classes, "id", classId, "class");
  if (!teacherClass || !teacherCanPublishNoticeEmailForClass(database, teacherId, teacherClass)) return { status: "not-found" };

  const durableDeliveryKey = `teacher-notice-email/${noticeId}`;
  const rows: TeacherNoticeEmailOutboxRow[] = [];
  let skipped = 0;
  const recipients = database.teacher_notice_recipients.filter((recipient) => field(recipient, "notice_id") === noticeId);
  if (field(notice, "audience") !== "parents" && field(notice, "audience") !== "both") {
    return { status: "no-eligible", rows: [], skipped: recipients.length };
  }

  for (const recipient of recipients) {
    const recipientId = field(recipient, "id");
    const studentId = field(recipient, "student_id");
    const guardianId = field(recipient, "guardian_id");
    if (recipientId && studentId && guardianId) {
      countExact(
        database.teacher_notice_recipients,
        (candidate) => field(candidate, "notice_id") === noticeId &&
          field(candidate, "student_id") === studentId &&
          field(candidate, "guardian_id") === guardianId,
        "notice recipient"
      );
    }
    if (
      !recipientId || !studentId || !guardianId ||
      field(recipient, "status") !== "pending" || recipient.acknowledged_at !== null
    ) {
      skipped += 1;
      continue;
    }
    const student = uniqueRecord(database.users, "id", studentId, "student");
    const parent = uniqueRecord(database.users, "id", guardianId, "parent");
    const settings = recordsWithField(database.user_settings, "user_id", guardianId);
    if (settings.length > 1) throw new Error("Teacher notice email outbox contains conflicting parent settings.");
    const enrollmentCount = countExact(
      database.class_enrollments,
      (enrollment) => field(enrollment, "class_id") === classId && field(enrollment, "student_id") === studentId,
      "class enrollment"
    );
    const guardianLinkCount = countExact(
      database.guardian_links,
      (link) => field(link, "parent_id") === guardianId && field(link, "student_id") === studentId && field(link, "status") === "active",
      "active guardian link"
    );
    const locale = emailLocale(settings[0]?.language);
    const email = parent?.email;
    if (
      !student || field(student, "role") !== "student" || !hasNullDisabledAt(student) ||
      !parent || field(parent, "role") !== "parent" || !hasNullDisabledAt(parent) ||
      enrollmentCount !== 1 || guardianLinkCount !== 1 || !strictEmail(email) || !locale
    ) {
      skipped += 1;
      continue;
    }
    const contentRevision = teacherNoticeEmailDeliveryContentRevision(notice, email, locale);
    const id = `teacher-notice-email-outbox/${stableHash({ noticeId, recipientId, contentRevision })}`;
    const delivery: TeacherNoticeEmailInput = {
      recipientId,
      email,
      locale,
      durableDeliveryKey,
      contentRevision
    };
    const row: TeacherNoticeEmailOutboxRow = {
      id,
      notice_id: noticeId,
      recipient_id: recipientId,
      recipient_fingerprint: teacherNoticeEmailOutboxSha256(recipientId),
      student_id: studentId,
      guardian_id: guardianId,
      teacher_id: noticeAuthorId,
      queued_by_id: teacherId,
      queued_by_fingerprint: teacherNoticeEmailOutboxSha256(teacherId),
      class_id: classId,
      email,
      locale,
      durable_delivery_key: durableDeliveryKey,
      content_revision: contentRevision,
      status: "pending",
      attempt_count: 0,
      first_enqueued_at: now,
      next_attempt_at: now,
      lease_token: null,
      lease_expires_at: null,
      provider_message_id: null,
      last_error_code: null,
      last_http_status: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
      pii_expires_at: null,
      pii_purged_at: null,
      tombstone_expires_at: null,
      delivery
    };
    if (!validateTeacherNoticeEmailOutboxRow(row)) {
      throw new Error("Teacher notice email outbox generated an invalid delivery row.");
    }
    rows.push(row);
  }

  if (rows.length === 0) return { status: "no-eligible", rows: [], skipped };
  notice.status = "queued";
  notice.sent_at = null;
  notice.updated_at = now;
  return { status: "prepared", rows, skipped };
}

export function validateTeacherNoticeEmailOutboxClaim({
  database,
  row
}: {
  database: TeacherNoticeEmailPublicationDatabase;
  row: TeacherNoticeEmailOutboxRow;
}): boolean {
  try {
    assertGloballyUniqueIds(database.users, "user");
    assertGloballyUniqueIds(database.teacher_classes, "class");
    assertGloballyUniqueIds(database.teacher_class_collaborators, "class collaborator");
    assertGloballyUniqueIds(database.school_memberships, "school membership");
    assertGloballyUniqueIds(database.class_enrollments, "enrollment");
    assertGloballyUniqueIds(database.guardian_links, "guardian link");
    assertGloballyUniqueIds(database.teacher_notices, "notice");
    assertGloballyUniqueIds(database.teacher_notice_recipients, "recipient");

    if (
      !row.teacher_id || !row.queued_by_id || !row.student_id || !row.guardian_id ||
      !row.class_id || !row.recipient_id || !row.email || !row.locale
    ) return false;
    const noticeAuthor = uniqueRecord(database.users, "id", row.teacher_id, "notice author");
    const queueActor = uniqueRecord(database.users, "id", row.queued_by_id, "queue actor");
    const student = uniqueRecord(database.users, "id", row.student_id, "student");
    const parent = uniqueRecord(database.users, "id", row.guardian_id, "parent");
    const teacherClass = uniqueRecord(database.teacher_classes, "id", row.class_id, "class");
    const notice = uniqueRecord(database.teacher_notices, "id", row.notice_id, "notice");
    const recipient = uniqueRecord(database.teacher_notice_recipients, "id", row.recipient_id, "recipient");
    const settings = recordsWithField(database.user_settings, "user_id", row.guardian_id);
    if (settings.length !== 1) return false;
    const locale = emailLocale(settings[0]?.language);

    if (
      !noticeAuthor || field(noticeAuthor, "role") !== "teacher" || !hasNullDisabledAt(noticeAuthor) ||
      !queueActor || field(queueActor, "role") !== "teacher" || !hasNullDisabledAt(queueActor) ||
      !student || field(student, "role") !== "student" || !hasNullDisabledAt(student) ||
      !parent || field(parent, "role") !== "parent" || !hasNullDisabledAt(parent) ||
      !teacherClass || !teacherCanPublishNoticeEmailForClass(database, row.queued_by_id, teacherClass) ||
      !notice || field(notice, "teacher_id") !== row.teacher_id || field(notice, "class_id") !== row.class_id ||
      field(notice, "status") !== "queued" ||
      (field(notice, "audience") !== "parents" && field(notice, "audience") !== "both") ||
      !recipient || field(recipient, "notice_id") !== row.notice_id ||
      field(recipient, "student_id") !== row.student_id || field(recipient, "guardian_id") !== row.guardian_id ||
      field(recipient, "status") !== "pending" || recipient.acknowledged_at !== null ||
      countExact(
        database.teacher_notice_recipients,
        (candidate) => field(candidate, "notice_id") === row.notice_id &&
          field(candidate, "student_id") === row.student_id &&
          field(candidate, "guardian_id") === row.guardian_id,
        "notice recipient"
      ) !== 1 ||
      countExact(
        database.class_enrollments,
        (enrollment) => field(enrollment, "class_id") === row.class_id && field(enrollment, "student_id") === row.student_id,
        "class enrollment"
      ) !== 1 ||
      countExact(
        database.guardian_links,
        (link) => field(link, "parent_id") === row.guardian_id && field(link, "student_id") === row.student_id && field(link, "status") === "active",
        "active guardian link"
      ) !== 1 ||
      !strictEmail(parent.email) || parent.email !== row.email || !locale || locale !== row.locale ||
      row.durable_delivery_key !== `teacher-notice-email/${row.notice_id}` ||
      row.content_revision !== teacherNoticeEmailDeliveryContentRevision(notice, parent.email, locale)
    ) return false;

    return validateTeacherNoticeEmailOutboxRow(row);
  } catch {
    return false;
  }
}

function retryDelayMs(attemptCount: number, retryAfterSeconds: number | undefined): number {
  const exponentialSeconds = Math.min(6 * 60 * 60, 60 * (2 ** Math.max(0, attemptCount - 1)));
  const providerSeconds = retryAfterSeconds === undefined ? 0 : Math.max(0, retryAfterSeconds);
  return Math.max(exponentialSeconds, providerSeconds) * 1_000;
}

export function resolveTeacherNoticeEmailOutboxCompletion({
  row,
  result,
  now
}: {
  row: Pick<TeacherNoticeEmailOutboxClaim, "attempt_count" | "first_enqueued_at">;
  result: TeacherNoticeEmailDeliveryResult;
  now: string;
}): TeacherNoticeEmailOutboxCompletion {
  const base = {
    providerMessageId: null,
    nextAttemptAt: null,
    completedAt: now,
    errorCode: result.errorCode ?? null,
    httpStatus: result.httpStatus ?? null
  };
  if (result.status === "accepted") {
    if (!isTeacherNoticeEmailOutboxProviderMessageId(result.providerMessageId)) {
      return { ...base, status: "dead-letter", errorCode: "invalid-response" };
    }
    return { ...base, status: "provider-accepted", providerMessageId: result.providerMessageId.toLowerCase() };
  }
  if (result.status === "disabled") {
    return { ...base, status: "blocked", errorCode: "delivery-disabled" };
  }
  if (result.status === "configuration-blocked") {
    return { ...base, status: "blocked" };
  }
  if (result.status === "terminal-failure") {
    return { ...base, status: "dead-letter" };
  }

  const nowMs = isTeacherNoticeEmailOutboxRfc3339Timestamp(now) ? Date.parse(now) : Number.NaN;
  const firstEnqueuedMs = isTeacherNoticeEmailOutboxRfc3339Timestamp(row.first_enqueued_at)
    ? Date.parse(row.first_enqueued_at)
    : Number.NaN;
  if (
    row.attempt_count >= teacherNoticeEmailOutboxMaxAttempts ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(firstEnqueuedMs) ||
    nowMs - firstEnqueuedMs >= teacherNoticeEmailOutboxCutoffMs
  ) {
    return { ...base, status: "dead-letter" };
  }
  return {
    ...base,
    status: "retryable",
    nextAttemptAt: new Date(nowMs + retryDelayMs(row.attempt_count, result.retryAfterSeconds)).toISOString(),
    completedAt: null
  };
}

export function resolveTeacherNoticeEmailOutboxRecovery({
  row,
  now
}: {
  row: Pick<
    TeacherNoticeEmailOutboxRow,
    "status" | "attempt_count" | "first_enqueued_at" | "last_error_code" | "provider_message_id" | "pii_purged_at"
  >;
  now: string;
}) {
  if (
    row.status === "blocked" &&
    row.provider_message_id === null &&
    row.pii_purged_at === null &&
    (row.last_error_code === "delivery-disabled" ||
      row.last_error_code === "missing-configuration" ||
      row.last_error_code === "invalid-configuration")
  ) {
    return { recover: true, resetDeliveryWindow: false } as const;
  }
  return { recover: false, resetDeliveryWindow: false } as const;
}

export function createTeacherNoticeEmailOutboxWorker({
  claimNext,
  releaseWithoutProviderContact,
  complete,
  deliver,
  now = () => new Date(),
  monotonicNow = () => performance.now(),
  invocationBudgetMs = teacherNoticeEmailOutboxInvocationBudgetMs,
  claimReserveMs = teacherNoticeEmailOutboxClaimReserveMs
}: {
  claimNext: (
    now: string,
    deadline: TeacherNoticeEmailOutboxDeadline
  ) => Promise<TeacherNoticeEmailOutboxClaim | null>;
  releaseWithoutProviderContact: (input: {
    id: string;
    leaseToken: string;
    now: string;
    previousStatus: "pending" | "retryable";
    previousAttemptCount: number;
    previousNextAttemptAt: string;
    deadline: TeacherNoticeEmailOutboxDeadline;
  }) => Promise<boolean>;
  complete: (input: {
    id: string;
    leaseToken: string;
    completion: TeacherNoticeEmailOutboxCompletion;
    now: string;
    deadline: TeacherNoticeEmailOutboxDeadline;
  }) => Promise<boolean>;
  deliver: (input: TeacherNoticeEmailInput) => Promise<TeacherNoticeEmailDeliveryResult>;
  now?: () => Date;
  monotonicNow?: () => number;
  invocationBudgetMs?: number;
  claimReserveMs?: number;
}) {
  return {
    async runBatch(requestedLimit = 10) {
      const limit = Number.isInteger(requestedLimit) ? Math.min(25, Math.max(1, requestedLimit)) : 10;
      const aggregate = {
        claimed: 0,
        accepted: 0,
        deferred: 0,
        blocked: 0,
        deadLetter: 0,
        staleCompletions: 0,
        releasedWithoutProviderContact: 0,
        releaseFailures: 0
      };
      const startedAt = monotonicNow();
      const boundedBudgetMs = Number.isFinite(invocationBudgetMs) ? Math.max(1, invocationBudgetMs) : teacherNoticeEmailOutboxInvocationBudgetMs;
      const boundedReserveMs = Number.isFinite(claimReserveMs) ? Math.max(0, claimReserveMs) : teacherNoticeEmailOutboxClaimReserveMs;
      const deadline: TeacherNoticeEmailOutboxDeadline = {
        deadlineAtMs: Number.isFinite(startedAt) ? startedAt + boundedBudgetMs : 0,
        claimReserveMs: boundedReserveMs,
        monotonicNow
      };
      for (let index = 0; index < limit; index += 1) {
        if (!teacherNoticeEmailOutboxDeadlineHasClaimReserve(deadline)) break;
        const claim = await claimNext(now().toISOString(), deadline);
        if (!claim) break;
        aggregate.claimed += 1;
        if (!teacherNoticeEmailOutboxDeadlineHasClaimReserve(deadline)) {
          try {
            const released = await releaseWithoutProviderContact({
              id: claim.id,
              leaseToken: claim.leaseToken,
              now: now().toISOString(),
              previousStatus: claim.previousStatus,
              previousAttemptCount: claim.previousAttemptCount,
              previousNextAttemptAt: claim.previousNextAttemptAt,
              deadline
            });
            if (released) aggregate.releasedWithoutProviderContact += 1;
            else aggregate.releaseFailures += 1;
          } catch {
            aggregate.releaseFailures += 1;
          }
          break;
        }
        let result: TeacherNoticeEmailDeliveryResult;
        try {
          const { recipientId, email, locale, durableDeliveryKey, contentRevision } = claim.delivery;
          result = await deliver({ recipientId, email, locale, durableDeliveryKey, contentRevision });
        } catch {
          result = {
            channel: "email",
            provider: "resend",
            status: "ambiguous",
            errorCode: "transport-error"
          };
        }
        const completedAt = now().toISOString();
        const completion = resolveTeacherNoticeEmailOutboxCompletion({ row: claim, result, now: completedAt });
        const completed = await complete({
          id: claim.id,
          leaseToken: claim.leaseToken,
          completion,
          now: completedAt,
          deadline
        });
        if (!completed) {
          aggregate.staleCompletions += 1;
          continue;
        }
        if (completion.status === "provider-accepted") aggregate.accepted += 1;
        else if (completion.status === "retryable") aggregate.deferred += 1;
        else if (completion.status === "blocked") aggregate.blocked += 1;
        else aggregate.deadLetter += 1;
      }
      return aggregate;
    }
  };
}
