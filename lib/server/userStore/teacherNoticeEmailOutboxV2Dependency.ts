import { DatabaseSync } from "node:sqlite";

export const teacherNoticeEmailOutboxProviderMappingIntegrationContract = {
  providerUniqueIndexName: "teacher_notice_email_outbox_provider_message_uq",
  providerAdvisoryPrefix: "mais-resend-teacher-notice-webhook-v2:",
  sqliteBarrier: "BEGIN IMMEDIATE",
  requiredOutboxCompletionOrder: [
    "outbox-schema-shared-advisory",
    "webhook-schema-shared-advisory",
    "provider-exclusive-advisory",
    "outbox-relation-lock",
    "outbox-exact-attestation",
    "assign-provider-message-id"
  ]
} as const;

// Read-only contract snapshot from the frozen A12 outbox-v2 candidate. The
// provider-message uniqueness index is the exact same-SHA amendment required
// by webhook reconciliation; this module never installs or normalizes outbox
// storage.
export const teacherNoticeEmailOutboxSqliteV2DependencySchema = `
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

// Fixture-only copy of the frozen PostgreSQL v2 migration plus the webhook
// composition amendment. Webhook runtime never executes these statements.
export const teacherNoticeEmailOutboxPostgresV2DependencyFixtureStatements = [
  `CREATE TABLE public.teacher_notice_email_outbox (
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
  `CREATE INDEX teacher_notice_email_outbox_eligible_idx
    ON public.teacher_notice_email_outbox (status, next_attempt_at, lease_expires_at, first_enqueued_at)`,
  `CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq
    ON public.teacher_notice_email_outbox (provider_message_id)
    WHERE provider_message_id IS NOT NULL`,
  `CREATE TABLE public.teacher_notice_email_outbox_schema_migrations (
    singleton pg_catalog.bool CONSTRAINT teacher_notice_email_outbox_schema_migrations_pkey PRIMARY KEY DEFAULT TRUE,
    version pg_catalog.int4 NOT NULL DEFAULT 2 CONSTRAINT teacher_notice_email_outbox_schema_version_ck CHECK (version = 2),
    applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT teacher_notice_email_outbox_schema_singleton_ck CHECK (singleton)
  )`,
  `INSERT INTO public.teacher_notice_email_outbox_schema_migrations (singleton, version)
    VALUES (TRUE, 2)`,
  `COMMENT ON TABLE public.teacher_notice_email_outbox_schema_migrations
    IS 'mais:teacher-notice-email-outbox:v2'`
] as const;

const expectedColumns = [
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

const pgTextOpclass = { schema: "pg_catalog", name: "text_ops", inputType: "text", accessMethod: "btree", isDefault: true };
const pgTimestampOpclass = { schema: "pg_catalog", name: "timestamptz_ops", inputType: "timestamp with time zone", accessMethod: "btree", isDefault: true };
const pgBooleanOpclass = { schema: "pg_catalog", name: "bool_ops", inputType: "boolean", accessMethod: "btree", isDefault: true };
const pgDefaultCollation = { schema: "pg_catalog", name: "default" };

export const teacherNoticeEmailOutboxV2ExpectedPostgresCatalog = {
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
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_attempt_count_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(attempt_count >= 0)" },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_delivery_revision_uq", type: "u", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_email_outbox_delivery_revision_uq", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["notice_id", "recipient_fingerprint", "content_revision"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_http_status_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "((last_http_status IS NULL) OR ((last_http_status >= 100) AND (last_http_status <= 599)))" },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_locale_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "((locale IS NULL) OR (locale = ANY (ARRAY['en'::text, 'zh-Hant'::text, 'zh-Hans'::text])))" },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_pkey", type: "p", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_email_outbox_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["id"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_state_fields_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "((((status = ANY (ARRAY['pending'::text, 'retryable'::text])) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (provider_message_id IS NULL) AND (completed_at IS NULL) AND (pii_expires_at IS NULL) AND (pii_purged_at IS NULL) AND (tombstone_expires_at IS NULL)) OR ((status = 'leased'::text) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL) AND (lease_token IS NOT NULL) AND (lease_token <> ''::text) AND (lease_expires_at IS NOT NULL) AND (provider_message_id IS NULL) AND (completed_at IS NULL) AND (pii_expires_at IS NULL) AND (pii_purged_at IS NULL) AND (tombstone_expires_at IS NULL)) OR ((status = 'provider-accepted'::text) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (provider_message_id IS NOT NULL) AND (provider_message_id <> ''::text) AND (completed_at IS NOT NULL) AND (pii_expires_at IS NOT NULL) AND (tombstone_expires_at IS NOT NULL) AND (((pii_purged_at IS NULL) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL)) OR ((pii_purged_at IS NOT NULL) AND (recipient_id IS NULL) AND (student_id IS NULL) AND (guardian_id IS NULL) AND (teacher_id IS NULL) AND (queued_by_id IS NULL) AND (class_id IS NULL) AND (email IS NULL) AND (locale IS NULL)))) OR ((status = ANY (ARRAY['blocked'::text, 'dead-letter'::text])) AND (lease_token IS NULL) AND (lease_expires_at IS NULL) AND (completed_at IS NOT NULL) AND (pii_expires_at IS NOT NULL) AND (tombstone_expires_at IS NOT NULL) AND (((pii_purged_at IS NULL) AND (recipient_id IS NOT NULL) AND (student_id IS NOT NULL) AND (guardian_id IS NOT NULL) AND (teacher_id IS NOT NULL) AND (queued_by_id IS NOT NULL) AND (class_id IS NOT NULL) AND (email IS NOT NULL) AND (locale IS NOT NULL)) OR ((pii_purged_at IS NOT NULL) AND (recipient_id IS NULL) AND (student_id IS NULL) AND (guardian_id IS NULL) AND (teacher_id IS NULL) AND (queued_by_id IS NULL) AND (class_id IS NULL) AND (email IS NULL) AND (locale IS NULL)))))" },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_status_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(status = ANY (ARRAY['pending'::text, 'leased'::text, 'retryable'::text, 'provider-accepted'::text, 'blocked'::text, 'dead-letter'::text]))" },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "teacher_notice_email_outbox_schema_migrations_pkey", type: "p", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_email_outbox_schema_migrations_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["singleton"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "teacher_notice_email_outbox_schema_singleton_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "singleton" },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "teacher_notice_email_outbox_schema_version_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(version = 2)" }
  ],
  indexes: [
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_delivery_revision_uq", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: false, immediate: true, partial: false, predicate: null, keyColumns: ["notice_id", "recipient_fingerprint", "content_revision"], indOptions: [0, 0, 0], opclasses: [pgTextOpclass, pgTextOpclass, pgTextOpclass], collations: [pgDefaultCollation, pgDefaultCollation, pgDefaultCollation] },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_eligible_idx", accessMethod: "btree", valid: true, ready: true, live: true, unique: false, primary: false, immediate: true, partial: false, predicate: null, keyColumns: ["status", "next_attempt_at", "lease_expires_at", "first_enqueued_at"], indOptions: [0, 0, 0, 0], opclasses: [pgTextOpclass, pgTimestampOpclass, pgTimestampOpclass, pgTimestampOpclass], collations: [pgDefaultCollation, null, null, null] },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_pkey", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: true, immediate: true, partial: false, predicate: null, keyColumns: ["id"], indOptions: [0], opclasses: [pgTextOpclass], collations: [pgDefaultCollation] },
    { relation: "teacher_notice_email_outbox", name: "teacher_notice_email_outbox_provider_message_uq", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: false, immediate: true, partial: true, predicate: "(provider_message_id IS NOT NULL)", keyColumns: ["provider_message_id"], indOptions: [0], opclasses: [pgTextOpclass], collations: [pgDefaultCollation] },
    { relation: "teacher_notice_email_outbox_schema_migrations", name: "teacher_notice_email_outbox_schema_migrations_pkey", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: true, immediate: true, partial: false, predicate: null, keyColumns: ["singleton"], indOptions: [0], opclasses: [pgBooleanOpclass], collations: [null] }
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

function canonicalCatalogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalCatalogValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => [key, canonicalCatalogValue(entry)])
  );
}

export function attestTeacherNoticeEmailOutboxV2PostgresCatalog(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(canonicalCatalogValue(value)) ===
      JSON.stringify(canonicalCatalogValue(teacherNoticeEmailOutboxV2ExpectedPostgresCatalog))
  );
}

export function normalizeTeacherNoticeSqliteSchemaSql(value: string | null): string | null {
  if (value === null) return null;
  return value
    .replace(/\bIF\s+NOT\s+EXISTS\b/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function schemaStatements(schema: string) {
  return schema
    .split(/;\s*(?=(?:CREATE|INSERT)\b|$)/giu)
    .map((statement) => statement.trim())
    .filter((statement) => /^CREATE\b/iu.test(statement));
}

function expectedSchemaObjects() {
  const objects = schemaStatements(teacherNoticeEmailOutboxSqliteV2DependencySchema)
    .map((statement) => {
      const relation = /^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/iu.exec(statement);
      if (relation) return {
        type: "table",
        name: relation[1],
        table: relation[1],
        sql: normalizeTeacherNoticeSqliteSchemaSql(statement)
      };
      const index = /^CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s+ON\s+(\w+)/iu.exec(statement);
      if (!index) throw new Error("Outbox dependency schema contains an unsupported statement.");
      return {
        type: "index",
        name: index[1],
        table: index[2],
        sql: normalizeTeacherNoticeSqliteSchemaSql(statement)
      };
    });
  objects.push(
    { type: "index", name: "sqlite_autoindex_teacher_notice_email_outbox_1", table: "teacher_notice_email_outbox", sql: null },
    { type: "index", name: "sqlite_autoindex_teacher_notice_email_outbox_2", table: "teacher_notice_email_outbox", sql: null }
  );
  return objects.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

function indexKeys(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA index_xinfo('${name}')`).all() as Array<{
    name: string | null;
    desc: number;
    coll: string | null;
    key: number;
  }>).filter((row) => row.key === 1).map((row) => [row.name, row.desc, row.coll]);
}

export function attestTeacherNoticeEmailOutboxV2SqliteDependency(
  storage: DatabaseSync
): boolean {
  try {
    const objects = (storage.prepare(`
      SELECT type, name, tbl_name AS "table", sql
      FROM sqlite_master
      WHERE name = 'teacher_notice_email_outbox'
        OR tbl_name = 'teacher_notice_email_outbox'
      ORDER BY name
    `).all() as Array<{ type: string; name: string; table: string; sql: string | null }>)
      .map((row) => ({ ...row, sql: normalizeTeacherNoticeSqliteSchemaSql(row.sql) }));
    if (JSON.stringify(objects) !== JSON.stringify(expectedSchemaObjects())) return false;

    const columns = (storage.prepare("PRAGMA table_xinfo('teacher_notice_email_outbox')").all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
      hidden: number;
    }>).map((row) => [row.name, row.type, row.notnull, row.dflt_value, row.pk, row.hidden]);
    if (JSON.stringify(columns) !== JSON.stringify(expectedColumns)) return false;

    const indexes = (storage.prepare("PRAGMA index_list('teacher_notice_email_outbox')").all() as Array<{
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>).map((row) => [row.name, row.unique, row.origin, row.partial])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
    const expectedIndexes = [
      ["sqlite_autoindex_teacher_notice_email_outbox_1", 1, "pk", 0],
      ["sqlite_autoindex_teacher_notice_email_outbox_2", 1, "u", 0],
      ["teacher_notice_email_outbox_eligible_idx", 0, "c", 0],
      ["teacher_notice_email_outbox_provider_message_uq", 1, "c", 1]
    ];
    if (JSON.stringify(indexes) !== JSON.stringify(expectedIndexes)) return false;
    if ((storage.prepare("PRAGMA foreign_key_list('teacher_notice_email_outbox')").all()).length !== 0) {
      return false;
    }
    return (
      JSON.stringify(indexKeys(storage, "sqlite_autoindex_teacher_notice_email_outbox_1")) ===
        JSON.stringify([["id", 0, "BINARY"]]) &&
      JSON.stringify(indexKeys(storage, "sqlite_autoindex_teacher_notice_email_outbox_2")) ===
        JSON.stringify([["notice_id", 0, "BINARY"], ["recipient_fingerprint", 0, "BINARY"], ["content_revision", 0, "BINARY"]]) &&
      JSON.stringify(indexKeys(storage, "teacher_notice_email_outbox_eligible_idx")) ===
        JSON.stringify([["status", 0, "BINARY"], ["next_attempt_at", 0, "BINARY"], ["lease_expires_at", 0, "BINARY"], ["first_enqueued_at", 0, "BINARY"]]) &&
      JSON.stringify(indexKeys(storage, "teacher_notice_email_outbox_provider_message_uq")) ===
        JSON.stringify([["provider_message_id", 0, "BINARY"]])
    );
  } catch {
    return false;
  }
}
