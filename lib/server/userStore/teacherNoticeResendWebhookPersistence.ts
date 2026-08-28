import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

import {
  compareTeacherNoticeResendWebhookEvents,
  type TeacherNoticeResendWebhookEnvelope,
  type TeacherNoticeResendWebhookEventType
} from "../teacherNoticeResendWebhook";
import {
  attestTeacherNoticeEmailOutboxV2PostgresCatalog,
  attestTeacherNoticeEmailOutboxV2SqliteDependency,
  normalizeTeacherNoticeSqliteSchemaSql,
  teacherNoticeEmailOutboxV2ExpectedPostgresCatalog
} from "./teacherNoticeEmailOutboxV2Dependency";

export const teacherNoticeResendWebhookSchemaVersion = 3;
export const teacherNoticeResendWebhookRetentionMs = 400 * 24 * 60 * 60 * 1_000;
export const teacherNoticeResendWebhookMaintenanceBudgetMs = 20_000;
export const teacherNoticeResendWebhookMaintenanceReserveMs = 2_000;
export const teacherNoticeResendWebhookTombstoneContract = Object.freeze({
  retentionDays: 400,
  retainedFields: Object.freeze([
    "event_id",
    "provider_message_id",
    "event_type",
    "occurred_at",
    "occurred_at_ns",
    "priority",
    "received_at",
    "matched_outbox_id",
    "retention_expires_at"
  ]),
  containsContactPii: false,
  terminalAction: "delete"
});
export const teacherNoticeResendWebhookPostgresAdvisoryNamespace =
  "mais-resend-teacher-notice-webhook-v2";
export const teacherNoticeEmailOutboxPostgresAdvisoryDependency =
  "mais-teacher-notice-email-outbox-v2";
export const teacherNoticeResendWebhookPostgresMigrationDependencyLockStatements = [
  "LOCK TABLE public.teacher_notice_email_outbox IN SHARE MODE",
  "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE"
] as const;
export const teacherNoticeResendWebhookPostgresRuntimeRelationLockStatements = [
  "LOCK TABLE public.teacher_notice_email_outbox IN ROW SHARE MODE",
  "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE",
  "LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW EXCLUSIVE MODE",
  "LOCK TABLE public.teacher_notice_resend_message_state IN ROW EXCLUSIVE MODE",
  "LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE"
] as const;
export const teacherNoticeResendWebhookPostgresReadRelationLockStatements = [
  "LOCK TABLE public.teacher_notice_email_outbox IN ROW SHARE MODE",
  "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE",
  "LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW SHARE MODE",
  "LOCK TABLE public.teacher_notice_resend_message_state IN ROW SHARE MODE",
  "LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE"
] as const;

export async function runTeacherNoticeResendWebhookAtomicMigration<Sql>({
  begin,
  inspect,
  migrate,
  upgrade,
  attest
}: {
  begin: (operation: (sql: Sql) => Promise<void>) => Promise<void>;
  inspect: (sql: Sql) => Promise<"empty" | "upgradeable" | "exact" | "partial">;
  migrate: (sql: Sql) => Promise<void>;
  upgrade?: (sql: Sql) => Promise<void>;
  attest: (sql: Sql) => Promise<boolean>;
}): Promise<void> {
  await begin(async (sql) => {
    const state = await inspect(sql);
    if (state === "exact") return;
    if (state === "partial") {
      throw new Error("Teacher notice Resend webhook partial or malformed schema was rejected.");
    }
    if (state === "upgradeable") {
      if (!upgrade) {
        throw new Error("Teacher notice Resend webhook v2 upgrade is unavailable.");
      }
      await upgrade(sql);
    } else {
      await migrate(sql);
    }
    if (!await attest(sql)) {
      throw new Error("Teacher notice Resend webhook schema v3 could not be attested.");
    }
  });
}

export async function runTeacherNoticeResendWebhookPostgresAttestedTransaction<Sql, Result>({
  sql,
  configure,
  lockOutboxSchema,
  lockWebhookSchema,
  lockProviderMessage,
  lockRelations,
  attest,
  operation,
  beforeStep
}: {
  sql: Sql;
  configure: (sql: Sql) => Promise<void>;
  lockOutboxSchema: (sql: Sql) => Promise<void>;
  lockWebhookSchema: (sql: Sql) => Promise<void>;
  lockProviderMessage: (sql: Sql) => Promise<void>;
  lockRelations: (sql: Sql) => Promise<void>;
  attest: (sql: Sql) => Promise<boolean>;
  operation: (sql: Sql) => Promise<Result>;
  beforeStep?: () => void;
}): Promise<Result> {
  beforeStep?.();
  await configure(sql);
  beforeStep?.();
  await lockOutboxSchema(sql);
  beforeStep?.();
  await lockWebhookSchema(sql);
  beforeStep?.();
  await lockProviderMessage(sql);
  beforeStep?.();
  await lockRelations(sql);
  beforeStep?.();
  const exact = await attest(sql);
  beforeStep?.();
  if (!exact) {
    throw new Error("Teacher notice Resend webhook schema v3 could not be attested.");
  }
  const result = await operation(sql);
  beforeStep?.();
  return result;
}

type PersistResult = { status: "applied" | "unmatched" | "replayed" | "stale" };
type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

type StoredEvent = {
  event_id: string;
  provider_message_id: string;
  event_type: TeacherNoticeResendWebhookEventType;
  occurred_at: string;
  occurred_at_ns: string;
  priority: number;
  matched_outbox_id: string | null;
};

type StoredState = {
  latest_event_id: string;
  latest_event_type: TeacherNoticeResendWebhookEventType;
  latest_occurred_at: string;
  latest_occurred_at_ns: string;
  latest_priority: number;
};

const eventColumns = [
  "event_id",
  "provider_message_id",
  "event_type",
  "occurred_at",
  "occurred_at_ns",
  "priority",
  "received_at",
  "matched_outbox_id",
  "retention_expires_at"
] as const;

const stateColumns = [
  "provider_message_id",
  "matched_outbox_id",
  "latest_event_id",
  "latest_event_type",
  "latest_occurred_at",
  "latest_occurred_at_ns",
  "latest_priority",
  "updated_at"
] as const;

const markerColumns = ["singleton", "version", "applied_at"] as const;

export const teacherNoticeResendWebhookSqliteSchemaV2 = `
  CREATE TABLE teacher_notice_resend_webhook_events (
    event_id TEXT PRIMARY KEY,
    provider_message_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
      'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
      'email.failed', 'email.suppressed', 'email.complained'
    )),
    occurred_at TEXT NOT NULL,
    occurred_at_ns TEXT NOT NULL CHECK (
      length(occurred_at_ns) BETWEEN 1 AND 24 AND occurred_at_ns NOT GLOB '*[^0-9]*'
    ),
    priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 100),
    received_at TEXT NOT NULL,
    matched_outbox_id TEXT,
    retention_expires_at TEXT NOT NULL
  );
  CREATE INDEX teacher_notice_resend_webhook_events_provider_order_idx
    ON teacher_notice_resend_webhook_events
      (provider_message_id, occurred_at_ns, priority, event_id);
  CREATE INDEX teacher_notice_resend_webhook_events_retention_idx
    ON teacher_notice_resend_webhook_events (retention_expires_at);

  CREATE TABLE teacher_notice_resend_message_state (
    provider_message_id TEXT PRIMARY KEY,
    matched_outbox_id TEXT,
    latest_event_id TEXT NOT NULL,
    latest_event_type TEXT NOT NULL CHECK (latest_event_type IN (
      'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
      'email.failed', 'email.suppressed', 'email.complained'
    )),
    latest_occurred_at TEXT NOT NULL,
    latest_occurred_at_ns TEXT NOT NULL CHECK (
      length(latest_occurred_at_ns) BETWEEN 1 AND 24 AND latest_occurred_at_ns NOT GLOB '*[^0-9]*'
    ),
    latest_priority INTEGER NOT NULL CHECK (latest_priority BETWEEN 0 AND 100),
    updated_at TEXT NOT NULL,
    FOREIGN KEY (latest_event_id) REFERENCES teacher_notice_resend_webhook_events(event_id)
  );
  CREATE UNIQUE INDEX teacher_notice_resend_message_state_outbox_uq
    ON teacher_notice_resend_message_state (matched_outbox_id)
    WHERE matched_outbox_id IS NOT NULL;

  CREATE TABLE teacher_notice_resend_webhook_schema_migrations (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    version INTEGER NOT NULL CHECK (version = 2),
    applied_at TEXT NOT NULL
  );
  INSERT INTO teacher_notice_resend_webhook_schema_migrations
    (singleton, version, applied_at)
  VALUES (1, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`;

export const teacherNoticeResendWebhookSqliteSchema =
  teacherNoticeResendWebhookSqliteSchemaV2
    .replace(
      `  CREATE INDEX teacher_notice_resend_webhook_events_retention_idx
    ON teacher_notice_resend_webhook_events (retention_expires_at);`,
      `  CREATE INDEX teacher_notice_resend_webhook_events_retention_idx
    ON teacher_notice_resend_webhook_events (retention_expires_at);
  CREATE INDEX teacher_notice_resend_webhook_events_unmatched_received_idx
    ON teacher_notice_resend_webhook_events (received_at)
    WHERE matched_outbox_id IS NULL;`
    )
    .replace("CHECK (version = 2)", "CHECK (version = 3)")
    .replace("VALUES (1, 2, strftime", "VALUES (1, 3, strftime");

export const teacherNoticeResendWebhookPostgresSchemaStatements = [
  `CREATE TABLE public.teacher_notice_resend_webhook_events (
    event_id pg_catalog.text CONSTRAINT teacher_notice_resend_webhook_events_pkey PRIMARY KEY,
    provider_message_id pg_catalog.uuid NOT NULL,
    event_type pg_catalog.text NOT NULL CONSTRAINT teacher_notice_resend_webhook_events_type_ck CHECK (
      event_type IN ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.failed', 'email.suppressed', 'email.complained')
    ),
    occurred_at pg_catalog.timestamptz NOT NULL,
    occurred_at_ns pg_catalog.numeric(24, 0) NOT NULL CONSTRAINT teacher_notice_resend_webhook_events_ns_ck CHECK (occurred_at_ns >= 0),
    priority pg_catalog.int2 NOT NULL CONSTRAINT teacher_notice_resend_webhook_events_priority_ck CHECK (priority BETWEEN 0 AND 100),
    received_at pg_catalog.timestamptz NOT NULL,
    matched_outbox_id pg_catalog.text,
    retention_expires_at pg_catalog.timestamptz NOT NULL
  )`,
  `CREATE INDEX teacher_notice_resend_webhook_events_provider_order_idx
    ON public.teacher_notice_resend_webhook_events
      (provider_message_id, occurred_at_ns, priority, event_id)`,
  `CREATE INDEX teacher_notice_resend_webhook_events_retention_idx
    ON public.teacher_notice_resend_webhook_events (retention_expires_at)`,
  `CREATE INDEX teacher_notice_resend_webhook_events_unmatched_received_idx
    ON public.teacher_notice_resend_webhook_events (received_at)
    WHERE matched_outbox_id IS NULL`,
  `CREATE TABLE public.teacher_notice_resend_message_state (
    provider_message_id pg_catalog.uuid CONSTRAINT teacher_notice_resend_message_state_pkey PRIMARY KEY,
    matched_outbox_id pg_catalog.text,
    latest_event_id pg_catalog.text NOT NULL,
    latest_event_type pg_catalog.text NOT NULL CONSTRAINT teacher_notice_resend_message_state_type_ck CHECK (
      latest_event_type IN ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.failed', 'email.suppressed', 'email.complained')
    ),
    latest_occurred_at pg_catalog.timestamptz NOT NULL,
    latest_occurred_at_ns pg_catalog.numeric(24, 0) NOT NULL CONSTRAINT teacher_notice_resend_message_state_ns_ck CHECK (latest_occurred_at_ns >= 0),
    latest_priority pg_catalog.int2 NOT NULL CONSTRAINT teacher_notice_resend_message_state_priority_ck CHECK (latest_priority BETWEEN 0 AND 100),
    updated_at pg_catalog.timestamptz NOT NULL,
    CONSTRAINT teacher_notice_resend_message_state_event_fk FOREIGN KEY (latest_event_id)
      REFERENCES public.teacher_notice_resend_webhook_events(event_id)
  )`,
  `CREATE UNIQUE INDEX teacher_notice_resend_message_state_outbox_uq
    ON public.teacher_notice_resend_message_state (matched_outbox_id)
    WHERE matched_outbox_id IS NOT NULL`,
  `CREATE TABLE public.teacher_notice_resend_webhook_schema_migrations (
    singleton pg_catalog.bool CONSTRAINT teacher_notice_resend_webhook_schema_migrations_pkey PRIMARY KEY DEFAULT TRUE,
    version pg_catalog.int4 NOT NULL DEFAULT 3 CONSTRAINT teacher_notice_resend_webhook_schema_version_ck CHECK (version = 3),
    applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
  )`,
  `COMMENT ON TABLE public.teacher_notice_resend_webhook_schema_migrations
    IS 'mais-resend-teacher-notice-webhook-schema-v3'`,
  `INSERT INTO public.teacher_notice_resend_webhook_schema_migrations (singleton, version)
    VALUES (TRUE, 3)`
] as const;

export const teacherNoticeResendWebhookPostgresSchemaV2Statements =
  teacherNoticeResendWebhookPostgresSchemaStatements
    .filter((statement) => !statement.includes(
      "teacher_notice_resend_webhook_events_unmatched_received_idx"
    ))
    .map((statement) => statement
      .replace("DEFAULT 3", "DEFAULT 2")
      .replace("CHECK (version = 3)", "CHECK (version = 2)")
      .replace("webhook-schema-v3", "webhook-schema-v2")
      .replace("VALUES (TRUE, 3)", "VALUES (TRUE, 2)"));

const pgTextOpclass = {
  schema: "pg_catalog", name: "text_ops", inputType: "text", accessMethod: "btree", isDefault: true
};
const pgUuidOpclass = {
  schema: "pg_catalog", name: "uuid_ops", inputType: "uuid", accessMethod: "btree", isDefault: true
};
const pgNumericOpclass = {
  schema: "pg_catalog", name: "numeric_ops", inputType: "numeric", accessMethod: "btree", isDefault: true
};
const pgSmallintOpclass = {
  schema: "pg_catalog", name: "int2_ops", inputType: "smallint", accessMethod: "btree", isDefault: true
};
const pgTimestampOpclass = {
  schema: "pg_catalog", name: "timestamptz_ops", inputType: "timestamp with time zone", accessMethod: "btree", isDefault: true
};
const pgBooleanOpclass = {
  schema: "pg_catalog", name: "bool_ops", inputType: "boolean", accessMethod: "btree", isDefault: true
};
const pgDefaultCollation = { schema: "pg_catalog", name: "default" };

const supportedEventTypesPg =
  "ARRAY['email.sent'::text, 'email.delivered'::text, 'email.delivery_delayed'::text, 'email.bounced'::text, 'email.failed'::text, 'email.suppressed'::text, 'email.complained'::text]";

export const teacherNoticeResendWebhookExpectedPostgresCatalog = {
  relations: [
    { name: "teacher_notice_resend_message_state", kind: "r", persistence: "p", rowSecurity: false, forceRowSecurity: false },
    { name: "teacher_notice_resend_webhook_events", kind: "r", persistence: "p", rowSecurity: false, forceRowSecurity: false },
    { name: "teacher_notice_resend_webhook_schema_migrations", kind: "r", persistence: "p", rowSecurity: false, forceRowSecurity: false }
  ],
  columns: [
    { relation: "teacher_notice_resend_message_state", name: "provider_message_id", position: 1, type: "uuid", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "matched_outbox_id", position: 2, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "latest_event_id", position: 3, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "latest_event_type", position: 4, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "latest_occurred_at", position: 5, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "latest_occurred_at_ns", position: 6, type: "numeric(24,0)", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "latest_priority", position: 7, type: "smallint", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_message_state", name: "updated_at", position: 8, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "event_id", position: 1, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "provider_message_id", position: 2, type: "uuid", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "event_type", position: 3, type: "text", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "occurred_at", position: 4, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "occurred_at_ns", position: 5, type: "numeric(24,0)", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "priority", position: 6, type: "smallint", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "received_at", position: 7, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "matched_outbox_id", position: 8, type: "text", notNull: false, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "retention_expires_at", position: 9, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "singleton", position: 1, type: "boolean", notNull: true, defaultExpression: "true" },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "version", position: 2, type: "integer", notNull: true, defaultExpression: "3" },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "applied_at", position: 3, type: "timestamp with time zone", notNull: true, defaultExpression: "clock_timestamp()" }
  ],
  constraints: [
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_event_fk", type: "f", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_resend_webhook_events_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["latest_event_id"], referencedRelation: "public.teacher_notice_resend_webhook_events", referencedColumns: ["event_id"], updateAction: "a", deleteAction: "a", matchType: "s", expression: null },
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_ns_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(latest_occurred_at_ns >= (0)::numeric)" },
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_pkey", type: "p", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_resend_message_state_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["provider_message_id"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_priority_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "((latest_priority >= 0) AND (latest_priority <= 100))" },
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_type_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: `(latest_event_type = ANY (${supportedEventTypesPg}))` },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_ns_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(occurred_at_ns >= (0)::numeric)" },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_pkey", type: "p", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_resend_webhook_events_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["event_id"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_priority_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "((priority >= 0) AND (priority <= 100))" },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_type_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: `(event_type = ANY (${supportedEventTypesPg}))` },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "teacher_notice_resend_webhook_schema_migrations_pkey", type: "p", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: "teacher_notice_resend_webhook_schema_migrations_pkey", relationOidMatches: true, backingIndexOidMatches: true, keyColumns: ["singleton"], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: null },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "teacher_notice_resend_webhook_schema_version_ck", type: "c", validated: true, deferrable: false, initiallyDeferred: false, backingIndexName: null, relationOidMatches: true, backingIndexOidMatches: true, keyColumns: [], referencedRelation: null, referencedColumns: [], updateAction: null, deleteAction: null, matchType: null, expression: "(version = 3)" }
  ],
  indexes: [
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_outbox_uq", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: false, immediate: true, partial: true, predicate: "(matched_outbox_id IS NOT NULL)", keyColumns: ["matched_outbox_id"], indOptions: [0], opclasses: [pgTextOpclass], collations: [pgDefaultCollation] },
    { relation: "teacher_notice_resend_message_state", name: "teacher_notice_resend_message_state_pkey", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: true, immediate: true, partial: false, predicate: null, keyColumns: ["provider_message_id"], indOptions: [0], opclasses: [pgUuidOpclass], collations: [null] },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_pkey", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: true, immediate: true, partial: false, predicate: null, keyColumns: ["event_id"], indOptions: [0], opclasses: [pgTextOpclass], collations: [pgDefaultCollation] },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_provider_order_idx", accessMethod: "btree", valid: true, ready: true, live: true, unique: false, primary: false, immediate: true, partial: false, predicate: null, keyColumns: ["provider_message_id", "occurred_at_ns", "priority", "event_id"], indOptions: [0, 0, 0, 0], opclasses: [pgUuidOpclass, pgNumericOpclass, pgSmallintOpclass, pgTextOpclass], collations: [null, null, null, pgDefaultCollation] },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_retention_idx", accessMethod: "btree", valid: true, ready: true, live: true, unique: false, primary: false, immediate: true, partial: false, predicate: null, keyColumns: ["retention_expires_at"], indOptions: [0], opclasses: [pgTimestampOpclass], collations: [null] },
    { relation: "teacher_notice_resend_webhook_events", name: "teacher_notice_resend_webhook_events_unmatched_received_idx", accessMethod: "btree", valid: true, ready: true, live: true, unique: false, primary: false, immediate: true, partial: true, predicate: "(matched_outbox_id IS NULL)", keyColumns: ["received_at"], indOptions: [0], opclasses: [pgTimestampOpclass], collations: [null] },
    { relation: "teacher_notice_resend_webhook_schema_migrations", name: "teacher_notice_resend_webhook_schema_migrations_pkey", accessMethod: "btree", valid: true, ready: true, live: true, unique: true, primary: true, immediate: true, partial: false, predicate: null, keyColumns: ["singleton"], indOptions: [0], opclasses: [pgBooleanOpclass], collations: [null] }
  ],
  integrity: {
    relationOidCount: 3,
    columnCount: 20,
    constraintCount: 11,
    indexCount: 7,
    unexpectedIndexCount: 0,
    userTriggerCount: 0,
    ruleCount: 0,
    inheritanceCount: 0,
    constraintRelationOidsMatch: true,
    constraintBackingIndexOidsMatch: true,
    indexRelationOidsMatch: true
  },
  markerComment: "mais-resend-teacher-notice-webhook-schema-v3",
  markerRows: [{ singleton: true, version: 3 }]
} as const;

export const teacherNoticeResendWebhookExpectedPostgresCatalogV2 = {
  ...teacherNoticeResendWebhookExpectedPostgresCatalog,
  columns: teacherNoticeResendWebhookExpectedPostgresCatalog.columns.map((column) =>
    column.relation === "teacher_notice_resend_webhook_schema_migrations" &&
    column.name === "version"
      ? { ...column, defaultExpression: "2" }
      : column
  ),
  constraints: teacherNoticeResendWebhookExpectedPostgresCatalog.constraints.map(
    (constraint) => constraint.name ===
      "teacher_notice_resend_webhook_schema_version_ck"
      ? { ...constraint, expression: "(version = 2)" }
      : constraint
  ),
  indexes: teacherNoticeResendWebhookExpectedPostgresCatalog.indexes.filter(
    (index) => index.name !==
      "teacher_notice_resend_webhook_events_unmatched_received_idx"
  ),
  integrity: {
    ...teacherNoticeResendWebhookExpectedPostgresCatalog.integrity,
    indexCount: 6
  },
  markerComment: "mais-resend-teacher-notice-webhook-schema-v2",
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

export function attestTeacherNoticeResendWebhookPostgresCatalog(value: unknown): boolean {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(canonicalCatalogValue(value)) ===
      JSON.stringify(canonicalCatalogValue(teacherNoticeResendWebhookExpectedPostgresCatalog))
  );
}

function attestTeacherNoticeResendWebhookPostgresCatalogV2(value: unknown): boolean {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(canonicalCatalogValue(value)) === JSON.stringify(
      canonicalCatalogValue(teacherNoticeResendWebhookExpectedPostgresCatalogV2)
    )
  );
}

async function teacherNoticeResendWebhookPostgresOwnRelationCount(
  sql: PostgresExecutor
): Promise<number> {
  const rows = await sql<Array<{ relation_count: number }>>`
    SELECT pg_catalog.count(*)::pg_catalog.int4 AS relation_count
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_resend_webhook_events',
        'teacher_notice_resend_message_state',
        'teacher_notice_resend_webhook_schema_migrations'
      )
  `;
  return rows[0]?.relation_count ?? 0;
}

function isOutboxCatalogRelation(name: string): boolean {
  return name === "teacher_notice_email_outbox" ||
    name === "teacher_notice_email_outbox_schema_migrations";
}

function sortPostgresCatalogEntries<T extends { relation?: string; name: string; position?: number }>(
  entries: T[],
  relationOrder: readonly string[]
): T[] {
  const position = new Map(relationOrder.map((name, index) => [name, index]));
  return entries.sort((left, right) => {
    const relationDifference =
      (position.get(left.relation ?? left.name) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(right.relation ?? right.name) ?? Number.MAX_SAFE_INTEGER);
    if (relationDifference !== 0) return relationDifference;
    if (left.position !== undefined || right.position !== undefined) {
      return (left.position ?? 0) - (right.position ?? 0);
    }
    return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
  });
}

type PostgresCatalogRelation = {
  name: string;
  kind: string;
  persistence: string;
  rowSecurity: boolean;
  forceRowSecurity: boolean;
};
type PostgresCatalogColumn = {
  relation: string; name: string; position: number; type: string;
  notNull: boolean; defaultExpression: string | null;
};
type PostgresCatalogConstraint = {
  relation: string; name: string; type: string; validated: boolean; deferrable: boolean;
  initiallyDeferred: boolean; backingIndexName: string | null; relationOidMatches: boolean;
  backingIndexOidMatches: boolean; keyColumns: string[]; referencedRelation: string | null;
  referencedColumns: string[]; updateAction: string | null; deleteAction: string | null;
  matchType: string | null; expression: string | null;
};
type PostgresCatalogIndex = {
  relation: string; name: string; accessMethod: string; valid: boolean; ready: boolean;
  live: boolean; unique: boolean; primary: boolean; immediate: boolean; partial: boolean;
  predicate: string | null; keyColumns: string[]; indOptions: number[];
  opclasses: Array<Record<string, unknown>>; collations: Array<Record<string, unknown> | null>;
  relationOidMatches: boolean;
};

async function readTeacherNoticeResendWebhookPostgresCatalogs(sql: PostgresExecutor) {
  const relations = await sql<PostgresCatalogRelation[]>`
    SELECT relation.relname AS name,
      relation.relkind::pg_catalog.text AS kind,
      relation.relpersistence::pg_catalog.text AS persistence,
      relation.relrowsecurity AS "rowSecurity",
      relation.relforcerowsecurity AS "forceRowSecurity"
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS relation_namespace
      ON relation_namespace.oid = relation.relnamespace
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_outbox',
        'teacher_notice_email_outbox_schema_migrations',
        'teacher_notice_resend_message_state',
        'teacher_notice_resend_webhook_events',
        'teacher_notice_resend_webhook_schema_migrations'
      )
  `;
  const outboxRelationCount = relations.filter((entry) => isOutboxCatalogRelation(entry.name)).length;
  if (outboxRelationCount !== 2) return null;
  const webhookRelationCount = relations.length - outboxRelationCount;

  const columns = await sql<PostgresCatalogColumn[]>`
    SELECT relation.relname AS relation, attribute.attname AS name,
      attribute.attnum::pg_catalog.int4 AS position,
      pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS type,
      attribute.attnotnull AS "notNull",
      pg_catalog.pg_get_expr(attribute_default.adbin, attribute_default.adrelid, false)
        AS "defaultExpression"
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS relation_namespace
      ON relation_namespace.oid = relation.relnamespace
    JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
    LEFT JOIN pg_catalog.pg_attrdef AS attribute_default
      ON attribute_default.adrelid = relation.oid AND attribute_default.adnum = attribute.attnum
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_outbox',
        'teacher_notice_email_outbox_schema_migrations',
        'teacher_notice_resend_message_state',
        'teacher_notice_resend_webhook_events',
        'teacher_notice_resend_webhook_schema_migrations'
      )
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  `;

  const constraints = await sql<PostgresCatalogConstraint[]>`
    SELECT relation.relname AS relation, constraint_record.conname AS name,
      constraint_record.contype::pg_catalog.text AS type,
      constraint_record.convalidated AS validated,
      constraint_record.condeferrable AS deferrable,
      constraint_record.condeferred AS "initiallyDeferred",
      backing_index.relname AS "backingIndexName",
      constraint_record.conrelid = relation.oid AS "relationOidMatches",
      CASE
        WHEN constraint_record.contype IN ('p', 'u') THEN
          constraint_record.conindid <> 0 AND backing_index_record.indrelid = relation.oid
        WHEN constraint_record.contype = 'f' THEN
          constraint_record.conindid <> 0 AND backing_index_record.indrelid = constraint_record.confrelid
        ELSE constraint_record.conindid = 0
      END AS "backingIndexOidMatches",
      CASE WHEN constraint_record.contype IN ('p', 'u', 'f') THEN COALESCE((
        SELECT pg_catalog.jsonb_agg(attribute.attname ORDER BY key_record.position)
        FROM pg_catalog.unnest(constraint_record.conkey)
          WITH ORDINALITY AS key_record(attnum, position)
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = relation.oid AND attribute.attnum = key_record.attnum
      ), '[]'::pg_catalog.jsonb) ELSE '[]'::pg_catalog.jsonb END AS "keyColumns",
      CASE WHEN constraint_record.contype = 'f'
        THEN pg_catalog.format('%I.%I', referenced_namespace.nspname, referenced_relation.relname)
        ELSE NULL END AS "referencedRelation",
      CASE WHEN constraint_record.contype = 'f' THEN COALESCE((
        SELECT pg_catalog.jsonb_agg(attribute.attname ORDER BY key_record.position)
        FROM pg_catalog.unnest(constraint_record.confkey)
          WITH ORDINALITY AS key_record(attnum, position)
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = constraint_record.confrelid AND attribute.attnum = key_record.attnum
      ), '[]'::pg_catalog.jsonb) ELSE '[]'::pg_catalog.jsonb END AS "referencedColumns",
      CASE WHEN constraint_record.contype = 'f'
        THEN constraint_record.confupdtype::pg_catalog.text ELSE NULL END AS "updateAction",
      CASE WHEN constraint_record.contype = 'f'
        THEN constraint_record.confdeltype::pg_catalog.text ELSE NULL END AS "deleteAction",
      CASE WHEN constraint_record.contype = 'f'
        THEN constraint_record.confmatchtype::pg_catalog.text ELSE NULL END AS "matchType",
      CASE WHEN constraint_record.contype = 'c'
        THEN pg_catalog.pg_get_expr(constraint_record.conbin, constraint_record.conrelid, false)
        ELSE NULL END AS expression
    FROM pg_catalog.pg_constraint AS constraint_record
    JOIN pg_catalog.pg_class AS relation ON relation.oid = constraint_record.conrelid
    JOIN pg_catalog.pg_namespace AS relation_namespace
      ON relation_namespace.oid = relation.relnamespace
    LEFT JOIN pg_catalog.pg_class AS backing_index ON backing_index.oid = constraint_record.conindid
    LEFT JOIN pg_catalog.pg_index AS backing_index_record
      ON backing_index_record.indexrelid = constraint_record.conindid
    LEFT JOIN pg_catalog.pg_class AS referenced_relation
      ON referenced_relation.oid = constraint_record.confrelid
    LEFT JOIN pg_catalog.pg_namespace AS referenced_namespace
      ON referenced_namespace.oid = referenced_relation.relnamespace
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_outbox',
        'teacher_notice_email_outbox_schema_migrations',
        'teacher_notice_resend_message_state',
        'teacher_notice_resend_webhook_events',
        'teacher_notice_resend_webhook_schema_migrations'
      )
  `;

  const indexes = await sql<PostgresCatalogIndex[]>`
    SELECT table_class.relname AS relation, index_class.relname AS name,
      access_method.amname AS "accessMethod", index_record.indisvalid AS valid,
      index_record.indisready AS ready, index_record.indislive AS live,
      index_record.indisunique AS "unique", index_record.indisprimary AS "primary",
      index_record.indimmediate AS immediate, index_record.indpred IS NOT NULL AS partial,
      pg_catalog.pg_get_expr(index_record.indpred, index_record.indrelid, false) AS predicate,
      COALESCE((
        SELECT pg_catalog.jsonb_agg(attribute.attname ORDER BY key_record.position)
        FROM pg_catalog.unnest(index_record.indkey) WITH ORDINALITY AS key_record(attnum, position)
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = table_class.oid AND attribute.attnum = key_record.attnum
        WHERE key_record.position <= index_record.indnkeyatts
      ), '[]'::pg_catalog.jsonb) AS "keyColumns",
      COALESCE((
        SELECT pg_catalog.jsonb_agg(option_record.option_value ORDER BY option_record.position)
        FROM pg_catalog.unnest(index_record.indoption)
          WITH ORDINALITY AS option_record(option_value, position)
      ), '[]'::pg_catalog.jsonb) AS "indOptions",
      COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'schema', operator_namespace.nspname,
          'name', operator_class.opcname,
          'inputType', pg_catalog.format_type(operator_class.opcintype, NULL),
          'accessMethod', operator_access_method.amname,
          'isDefault', operator_class.opcdefault
        ) ORDER BY operator_record.position)
        FROM pg_catalog.unnest(index_record.indclass)
          WITH ORDINALITY AS operator_record(opclass_oid, position)
        JOIN pg_catalog.pg_opclass AS operator_class
          ON operator_class.oid = operator_record.opclass_oid
        JOIN pg_catalog.pg_namespace AS operator_namespace
          ON operator_namespace.oid = operator_class.opcnamespace
        JOIN pg_catalog.pg_am AS operator_access_method
          ON operator_access_method.oid = operator_class.opcmethod
      ), '[]'::pg_catalog.jsonb) AS opclasses,
      COALESCE((
        SELECT pg_catalog.jsonb_agg(
          CASE WHEN collation_record.collation_oid = 0 THEN NULL
          ELSE pg_catalog.jsonb_build_object(
            'schema', collation_namespace.nspname, 'name', index_collation.collname
          ) END ORDER BY collation_record.position
        )
        FROM pg_catalog.unnest(index_record.indcollation)
          WITH ORDINALITY AS collation_record(collation_oid, position)
        LEFT JOIN pg_catalog.pg_collation AS index_collation
          ON index_collation.oid = collation_record.collation_oid
        LEFT JOIN pg_catalog.pg_namespace AS collation_namespace
          ON collation_namespace.oid = index_collation.collnamespace
      ), '[]'::pg_catalog.jsonb) AS collations,
      index_record.indrelid = table_class.oid AS "relationOidMatches"
    FROM pg_catalog.pg_class AS table_class
    JOIN pg_catalog.pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
    JOIN pg_catalog.pg_index AS index_record ON index_record.indrelid = table_class.oid
    JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_record.indexrelid
    JOIN pg_catalog.pg_namespace AS index_namespace ON index_namespace.oid = index_class.relnamespace
    JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_class.relam
    WHERE table_namespace.nspname = 'public' AND index_namespace.nspname = 'public'
      AND table_class.relname IN (
        'teacher_notice_email_outbox',
        'teacher_notice_email_outbox_schema_migrations',
        'teacher_notice_resend_message_state',
        'teacher_notice_resend_webhook_events',
        'teacher_notice_resend_webhook_schema_migrations'
      )
  `;

  const integrityRows = await sql<Array<{
    userTriggerCount: number; ruleCount: number; inheritanceCount: number;
  }>>`
    WITH target_relations AS (
      SELECT relation.oid
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS relation_namespace
        ON relation_namespace.oid = relation.relnamespace
      WHERE relation_namespace.nspname = 'public'
        AND relation.relname IN (
          'teacher_notice_email_outbox',
          'teacher_notice_email_outbox_schema_migrations',
          'teacher_notice_resend_message_state',
          'teacher_notice_resend_webhook_events',
          'teacher_notice_resend_webhook_schema_migrations'
        )
    )
    SELECT
      (SELECT pg_catalog.count(*)::pg_catalog.int4 FROM pg_catalog.pg_trigger AS trigger_record
        WHERE trigger_record.tgrelid IN (SELECT oid FROM target_relations)
          AND NOT trigger_record.tgisinternal) AS "userTriggerCount",
      (SELECT pg_catalog.count(*)::pg_catalog.int4 FROM pg_catalog.pg_rewrite AS rule_record
        WHERE rule_record.ev_class IN (SELECT oid FROM target_relations)) AS "ruleCount",
      (SELECT pg_catalog.count(*)::pg_catalog.int4 FROM pg_catalog.pg_inherits AS inheritance_record
        WHERE inheritance_record.inhrelid IN (SELECT oid FROM target_relations)
          OR inheritance_record.inhparent IN (SELECT oid FROM target_relations)) AS "inheritanceCount"
  `;

  const outboxMarkerRows = await sql<Array<{ singleton: boolean; version: number }>>`
    SELECT singleton, version
    FROM public.teacher_notice_email_outbox_schema_migrations
    ORDER BY singleton, version
  `;
  const webhookMarkerRows = webhookRelationCount === 3
    ? await sql<Array<{ singleton: boolean; version: number }>>`
        SELECT singleton, version
        FROM public.teacher_notice_resend_webhook_schema_migrations
        ORDER BY singleton, version
      `
    : [];
  const comments = await sql<Array<{ outbox: string | null; webhook: string | null }>>`
    SELECT
      pg_catalog.obj_description(
        pg_catalog.to_regclass('public.teacher_notice_email_outbox_schema_migrations'), 'pg_class'
      ) AS outbox,
      pg_catalog.obj_description(
        pg_catalog.to_regclass('public.teacher_notice_resend_webhook_schema_migrations'), 'pg_class'
      ) AS webhook
  `;

  const relationOrder = {
    outbox: ["teacher_notice_email_outbox", "teacher_notice_email_outbox_schema_migrations"],
    webhook: [
      "teacher_notice_resend_message_state",
      "teacher_notice_resend_webhook_events",
      "teacher_notice_resend_webhook_schema_migrations"
    ]
  } as const;
  const buildCatalog = (outbox: boolean) => {
    const selectedRelations = relations.filter((entry) => isOutboxCatalogRelation(entry.name) === outbox);
    const selectedColumns = columns.filter((entry) => isOutboxCatalogRelation(entry.relation) === outbox);
    const selectedConstraints = constraints.filter((entry) => isOutboxCatalogRelation(entry.relation) === outbox);
    const selectedIndexes = indexes.filter((entry) => isOutboxCatalogRelation(entry.relation) === outbox);
    const expectedNames = new Set<string>((outbox
      ? teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.indexes
      : teacherNoticeResendWebhookExpectedPostgresCatalog.indexes).map((entry) => entry.name));
    const integrity = integrityRows[0] ?? { userTriggerCount: -1, ruleCount: -1, inheritanceCount: -1 };
    return {
      relations: sortPostgresCatalogEntries(selectedRelations, outbox ? relationOrder.outbox : relationOrder.webhook),
      columns: sortPostgresCatalogEntries(selectedColumns, outbox ? relationOrder.outbox : relationOrder.webhook),
      constraints: sortPostgresCatalogEntries(selectedConstraints, outbox ? relationOrder.outbox : relationOrder.webhook),
      indexes: sortPostgresCatalogEntries(selectedIndexes.map(({ relationOidMatches: _matches, ...entry }) => entry), outbox ? relationOrder.outbox : relationOrder.webhook),
      integrity: {
        relationOidCount: selectedRelations.length,
        columnCount: selectedColumns.length,
        constraintCount: selectedConstraints.length,
        indexCount: selectedIndexes.length,
        unexpectedIndexCount: selectedIndexes.filter((entry) => !expectedNames.has(entry.name)).length,
        userTriggerCount: integrity.userTriggerCount,
        ruleCount: integrity.ruleCount,
        inheritanceCount: integrity.inheritanceCount,
        constraintRelationOidsMatch: selectedConstraints.every((entry) => entry.relationOidMatches),
        constraintBackingIndexOidsMatch: selectedConstraints.every((entry) => entry.backingIndexOidMatches),
        indexRelationOidsMatch: selectedIndexes.every((entry) => entry.relationOidMatches)
      },
      markerComment: outbox ? comments[0]?.outbox ?? null : comments[0]?.webhook ?? null,
      markerRows: outbox ? outboxMarkerRows : webhookMarkerRows
    };
  };
  return {
    outbox: buildCatalog(true),
    webhook: webhookRelationCount === 3 ? buildCatalog(false) : null
  };
}

async function hasTeacherNoticeEmailOutboxPostgresDependency(sql: PostgresExecutor): Promise<boolean> {
  const catalogs = await readTeacherNoticeResendWebhookPostgresCatalogs(sql);
  return Boolean(catalogs && attestTeacherNoticeEmailOutboxV2PostgresCatalog(catalogs.outbox));
}

export async function attestTeacherNoticeResendWebhookPostgresSchema(
  sql: PostgresExecutor
): Promise<boolean> {
  const catalogs = await readTeacherNoticeResendWebhookPostgresCatalogs(sql);
  return Boolean(
    catalogs &&
    attestTeacherNoticeEmailOutboxV2PostgresCatalog(catalogs.outbox) &&
    catalogs.webhook !== null &&
    attestTeacherNoticeResendWebhookPostgresCatalog(catalogs.webhook)
  );
}

async function attestTeacherNoticeResendWebhookPostgresSchemaV2(
  sql: PostgresExecutor
): Promise<boolean> {
  const catalogs = await readTeacherNoticeResendWebhookPostgresCatalogs(sql);
  return Boolean(
    catalogs &&
    attestTeacherNoticeEmailOutboxV2PostgresCatalog(catalogs.outbox) &&
    catalogs.webhook !== null &&
    attestTeacherNoticeResendWebhookPostgresCatalogV2(catalogs.webhook)
  );
}

export async function inspectTeacherNoticeResendWebhookPostgresSchema(
  sql: PostgresExecutor
): Promise<{
  outboxDependencyExact: boolean;
  webhookState: "empty" | "upgradeable" | "exact" | "partial";
}> {
  const relationCount = await teacherNoticeResendWebhookPostgresOwnRelationCount(sql);
  const catalogs = await readTeacherNoticeResendWebhookPostgresCatalogs(sql);
  const outboxDependencyExact = Boolean(
    catalogs && attestTeacherNoticeEmailOutboxV2PostgresCatalog(catalogs.outbox)
  );
  if (relationCount === 0) {
    return { outboxDependencyExact, webhookState: "empty" };
  }
  if (relationCount !== 3 || !catalogs || catalogs.webhook === null) {
    return { outboxDependencyExact, webhookState: "partial" };
  }
  if (
    outboxDependencyExact &&
    attestTeacherNoticeResendWebhookPostgresCatalog(catalogs.webhook)
  ) {
    return { outboxDependencyExact, webhookState: "exact" };
  }
  if (
    outboxDependencyExact &&
    attestTeacherNoticeResendWebhookPostgresCatalogV2(catalogs.webhook)
  ) {
    return { outboxDependencyExact, webhookState: "upgradeable" };
  }
  return { outboxDependencyExact, webhookState: "partial" };
}

async function configureTeacherNoticeResendWebhookPostgresTransaction(
  sql: PostgresExecutor
): Promise<void> {
  await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
  await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
  await sql.unsafe("SET LOCAL statement_timeout = '5000ms'");
  await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '5000ms'");
}

async function configureTeacherNoticeResendWebhookPostgresMaintenanceTransaction(
  sql: PostgresExecutor
): Promise<void> {
  await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
  await sql.unsafe("SET LOCAL lock_timeout = '1000ms'");
  await sql.unsafe("SET LOCAL statement_timeout = '1000ms'");
  await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '2000ms'");
}

export async function migrateTeacherNoticeResendWebhookPostgresSchema(
  client: postgres.Sql
): Promise<void> {
  await runTeacherNoticeResendWebhookAtomicMigration<postgres.TransactionSql>({
    begin: async (operation) => {
      await client.begin(async (sql) => {
        await configureTeacherNoticeResendWebhookPostgresTransaction(sql);
        await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
          pg_catalog.hashtextextended(${teacherNoticeEmailOutboxPostgresAdvisoryDependency}, 0))`;
        await sql`SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(${teacherNoticeResendWebhookPostgresAdvisoryNamespace}, 0))`;
        for (const statement of teacherNoticeResendWebhookPostgresMigrationDependencyLockStatements) {
          await sql.unsafe(statement);
        }
        if (!await hasTeacherNoticeEmailOutboxPostgresDependency(sql)) {
          throw new Error("Frozen teacher notice outbox v2 integration dependency is not installed.");
        }
        await operation(sql);
      });
    },
    inspect: async (sql) => {
      const relationCount = await teacherNoticeResendWebhookPostgresOwnRelationCount(sql);
      if (relationCount === 0) return "empty";
      if (relationCount !== 3) return "partial";
      await sql`LOCK TABLE public.teacher_notice_resend_webhook_events IN SHARE MODE`;
      await sql`LOCK TABLE public.teacher_notice_resend_message_state IN SHARE MODE`;
      await sql`LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE`;
      return (await inspectTeacherNoticeResendWebhookPostgresSchema(sql)).webhookState;
    },
    migrate: async (sql) => {
      for (const statement of teacherNoticeResendWebhookPostgresSchemaStatements) {
        await sql.unsafe(statement);
      }
    },
    upgrade: async (sql) => {
      await sql.unsafe(`CREATE INDEX teacher_notice_resend_webhook_events_unmatched_received_idx
        ON public.teacher_notice_resend_webhook_events (received_at)
        WHERE matched_outbox_id IS NULL`);
      await sql.unsafe(`ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
        DROP CONSTRAINT teacher_notice_resend_webhook_schema_version_ck`);
      await sql.unsafe(`ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
        ALTER COLUMN version SET DEFAULT 3`);
      await sql.unsafe(`UPDATE public.teacher_notice_resend_webhook_schema_migrations
        SET version = 3, applied_at = pg_catalog.clock_timestamp()
        WHERE singleton = TRUE AND version = 2`);
      await sql.unsafe(`ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations
        ADD CONSTRAINT teacher_notice_resend_webhook_schema_version_ck
        CHECK (version = 3)`);
      await sql.unsafe(`COMMENT ON TABLE public.teacher_notice_resend_webhook_schema_migrations
        IS 'mais-resend-teacher-notice-webhook-schema-v3'`);
    },
    attest: attestTeacherNoticeResendWebhookPostgresSchema
  });
}

function pgStoredEnvelope(row: {
  latest_event_id: string;
  latest_event_type: TeacherNoticeResendWebhookEventType;
  latest_occurred_at: string;
  latest_occurred_at_ns: string;
  latest_priority: number;
}): TeacherNoticeResendWebhookEnvelope {
  return {
    eventId: row.latest_event_id,
    type: row.latest_event_type,
    occurredAt: new Date(row.latest_occurred_at).toISOString(),
    occurredAtNs: String(row.latest_occurred_at_ns),
    priority: Number(row.latest_priority),
    providerMessageId: "00000000-0000-4000-8000-000000000000"
  };
}

async function persistTeacherNoticeResendWebhookEventPostgresInsideTransaction(
  sql: postgres.TransactionSql,
  event: TeacherNoticeResendWebhookEnvelope
): Promise<PersistResult> {
  const clock = await sql<Array<{ received_at: string; retention_expires_at: string }>>`
    SELECT
      pg_catalog.clock_timestamp() AS received_at,
      pg_catalog.clock_timestamp() + pg_catalog.make_interval(days => 400) AS retention_expires_at
  `;
  const receivedAt = new Date(clock[0]!.received_at).toISOString();
  const retentionExpiresAt = new Date(clock[0]!.retention_expires_at).toISOString();
  const matches = await sql<Array<{ id: string }>>`
    SELECT id FROM public.teacher_notice_email_outbox
    WHERE provider_message_id = ${event.providerMessageId}
    ORDER BY id
    LIMIT 2
    FOR SHARE
  `;
  if (matches.length > 1) throw new Error("Ambiguous provider message contact was rejected.");
  const matchedOutboxId = matches[0]?.id ?? null;
  const inserted = await sql<Array<{ event_id: string }>>`
    INSERT INTO public.teacher_notice_resend_webhook_events (
      event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
      priority, received_at, matched_outbox_id, retention_expires_at
    ) VALUES (
      ${event.eventId}, ${event.providerMessageId}::pg_catalog.uuid, ${event.type},
      ${event.occurredAt}::pg_catalog.timestamptz, ${event.occurredAtNs}::pg_catalog.numeric,
      ${event.priority}, ${receivedAt}::pg_catalog.timestamptz, ${matchedOutboxId},
      ${retentionExpiresAt}::pg_catalog.timestamptz
    )
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  const existingRows = await sql<StoredEvent[]>`
    SELECT event_id, provider_message_id::pg_catalog.text AS provider_message_id,
      event_type, occurred_at::pg_catalog.text AS occurred_at,
      occurred_at_ns::pg_catalog.text AS occurred_at_ns, priority, matched_outbox_id
    FROM public.teacher_notice_resend_webhook_events
    WHERE event_id = ${event.eventId}
  `;
  const existing = existingRows[0];
  if (!existing || !sameStoredEvent({
    ...existing,
    occurred_at: new Date(existing.occurred_at).toISOString(),
    priority: Number(existing.priority)
  }, event)) {
    throw new Error("Conflicting replay for a durable Resend webhook event was rejected.");
  }
  const replayed = inserted.length === 0;
  if (matchedOutboxId !== null && existing.matched_outbox_id === null) {
    await sql`
      UPDATE public.teacher_notice_resend_webhook_events
      SET matched_outbox_id = ${matchedOutboxId}
      WHERE event_id = ${event.eventId} AND matched_outbox_id IS NULL
    `;
  } else if (
    matchedOutboxId !== null && existing.matched_outbox_id !== null &&
    existing.matched_outbox_id !== matchedOutboxId
  ) {
    throw new Error("Conflicting outbox match for a durable Resend webhook event was rejected.");
  }
  if (matchedOutboxId === null) return { status: "unmatched" };

  const states = await sql<Array<{
    latest_event_id: string;
    latest_event_type: TeacherNoticeResendWebhookEventType;
    latest_occurred_at: string;
    latest_occurred_at_ns: string;
    latest_priority: number;
  }>>`
    SELECT latest_event_id, latest_event_type,
      latest_occurred_at::pg_catalog.text AS latest_occurred_at,
      latest_occurred_at_ns::pg_catalog.text AS latest_occurred_at_ns,
      latest_priority
    FROM public.teacher_notice_resend_message_state
    WHERE provider_message_id = ${event.providerMessageId}::pg_catalog.uuid
    FOR UPDATE
  `;
  const newer = !states[0] || compareTeacherNoticeResendWebhookEvents(pgStoredEnvelope(states[0]), event) < 0;
  if (newer) {
    await sql`
      INSERT INTO public.teacher_notice_resend_message_state (
        provider_message_id, matched_outbox_id, latest_event_id, latest_event_type,
        latest_occurred_at, latest_occurred_at_ns, latest_priority, updated_at
      ) VALUES (
        ${event.providerMessageId}::pg_catalog.uuid, ${matchedOutboxId}, ${event.eventId}, ${event.type},
        ${event.occurredAt}::pg_catalog.timestamptz, ${event.occurredAtNs}::pg_catalog.numeric,
        ${event.priority}, ${receivedAt}::pg_catalog.timestamptz
      )
      ON CONFLICT (provider_message_id) DO UPDATE SET
        matched_outbox_id = EXCLUDED.matched_outbox_id,
        latest_event_id = EXCLUDED.latest_event_id,
        latest_event_type = EXCLUDED.latest_event_type,
        latest_occurred_at = EXCLUDED.latest_occurred_at,
        latest_occurred_at_ns = EXCLUDED.latest_occurred_at_ns,
        latest_priority = EXCLUDED.latest_priority,
        updated_at = EXCLUDED.updated_at
    `;
  }
  if (replayed) return { status: "replayed" };
  return { status: newer ? "applied" : "stale" };
}

export async function persistTeacherNoticeResendWebhookEventPostgres(
  client: postgres.Sql,
  event: TeacherNoticeResendWebhookEnvelope
): Promise<PersistResult> {
  return client.begin((sql) => runTeacherNoticeResendWebhookPostgresAttestedTransaction({
    sql,
    configure: configureTeacherNoticeResendWebhookPostgresTransaction,
    lockOutboxSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeEmailOutboxPostgresAdvisoryDependency}, 0))`;
    },
    lockWebhookSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeResendWebhookPostgresAdvisoryNamespace}, 0))`;
    },
    lockProviderMessage: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          ${`${teacherNoticeResendWebhookPostgresAdvisoryNamespace}:${event.providerMessageId}`}, 0
        ))`;
    },
    lockRelations: async (transactionSql) => {
      for (const statement of teacherNoticeResendWebhookPostgresRuntimeRelationLockStatements) {
        await transactionSql.unsafe(statement);
      }
    },
    attest: attestTeacherNoticeResendWebhookPostgresSchema,
    operation: (transactionSql) =>
      persistTeacherNoticeResendWebhookEventPostgresInsideTransaction(transactionSql, event)
  }));
}

async function latestPostgresEventForProvider(
  sql: postgres.TransactionSql,
  providerMessageId: string
) {
  const rows = await sql<Array<{
    event_id: string;
    event_type: TeacherNoticeResendWebhookEventType;
    occurred_at: string;
    occurred_at_ns: string;
    priority: number;
    matched_outbox_id: string;
  }>>`
    SELECT event_id, event_type,
      occurred_at::pg_catalog.text AS occurred_at,
      occurred_at_ns::pg_catalog.text AS occurred_at_ns,
      priority, matched_outbox_id
    FROM public.teacher_notice_resend_webhook_events
    WHERE provider_message_id = ${providerMessageId}::pg_catalog.uuid
      AND matched_outbox_id IS NOT NULL
    ORDER BY occurred_at_ns DESC, priority DESC,
      event_id COLLATE pg_catalog."C" DESC
    LIMIT 1
    FOR UPDATE
  `;
  return rows[0];
}

async function upsertPostgresStateForProvider(
  sql: postgres.TransactionSql,
  providerMessageId: string,
  matchedOutboxId: string,
  databaseNow: string
): Promise<number> {
  const latest = await latestPostgresEventForProvider(sql, providerMessageId);
  if (!latest) return 0;
  const changed = await sql<Array<{ provider_message_id: string }>>`
    INSERT INTO public.teacher_notice_resend_message_state (
      provider_message_id, matched_outbox_id, latest_event_id, latest_event_type,
      latest_occurred_at, latest_occurred_at_ns, latest_priority, updated_at
    ) VALUES (
      ${providerMessageId}::pg_catalog.uuid, ${matchedOutboxId}, ${latest.event_id},
      ${latest.event_type}, ${latest.occurred_at}::pg_catalog.timestamptz,
      ${latest.occurred_at_ns}::pg_catalog.numeric, ${latest.priority},
      ${databaseNow}::pg_catalog.timestamptz
    )
    ON CONFLICT (provider_message_id) DO UPDATE SET
      matched_outbox_id = EXCLUDED.matched_outbox_id,
      latest_event_id = EXCLUDED.latest_event_id,
      latest_event_type = EXCLUDED.latest_event_type,
      latest_occurred_at = EXCLUDED.latest_occurred_at,
      latest_occurred_at_ns = EXCLUDED.latest_occurred_at_ns,
      latest_priority = EXCLUDED.latest_priority,
      updated_at = EXCLUDED.updated_at
    WHERE public.teacher_notice_resend_message_state.matched_outbox_id IS DISTINCT FROM EXCLUDED.matched_outbox_id
      OR public.teacher_notice_resend_message_state.latest_event_id IS DISTINCT FROM EXCLUDED.latest_event_id
      OR public.teacher_notice_resend_message_state.latest_event_type IS DISTINCT FROM EXCLUDED.latest_event_type
      OR public.teacher_notice_resend_message_state.latest_occurred_at IS DISTINCT FROM EXCLUDED.latest_occurred_at
      OR public.teacher_notice_resend_message_state.latest_occurred_at_ns IS DISTINCT FROM EXCLUDED.latest_occurred_at_ns
      OR public.teacher_notice_resend_message_state.latest_priority IS DISTINCT FROM EXCLUDED.latest_priority
    RETURNING provider_message_id::pg_catalog.text AS provider_message_id
  `;
  return changed.length;
}

async function reconcilePostgresProvider(
  sql: postgres.TransactionSql,
  providerMessageId: string,
  eventIds: string[],
  databaseNow: string
): Promise<{ eventsMatched: number; stateUpserted: number }> {
  if (eventIds.length === 0) return { eventsMatched: 0, stateUpserted: 0 };
  const matches = await sql<Array<{ id: string }>>`
    SELECT id
    FROM public.teacher_notice_email_outbox
    WHERE provider_message_id = ${providerMessageId}
    ORDER BY id COLLATE pg_catalog."C"
    LIMIT 2
    FOR SHARE
  `;
  if (matches.length !== 1) {
    if (matches.length > 1) throw new Error("Ambiguous provider message contact was rejected.");
    return { eventsMatched: 0, stateUpserted: 0 };
  }
  const matchedOutboxId = matches[0]!.id;
  const conflicts = await sql<Array<{ matched_outbox_id: string }>>`
    SELECT matched_outbox_id
    FROM public.teacher_notice_resend_webhook_events
    WHERE provider_message_id = ${providerMessageId}::pg_catalog.uuid
      AND matched_outbox_id IS NOT NULL
      AND matched_outbox_id <> ${matchedOutboxId}
    LIMIT 1
    FOR UPDATE
  `;
  if (conflicts.length > 0) {
    throw new Error("Conflicting outbox match for durable Resend webhook events was rejected.");
  }
  const matched = await sql<Array<{ event_id: string }>>`
    UPDATE public.teacher_notice_resend_webhook_events
    SET matched_outbox_id = ${matchedOutboxId}
    WHERE provider_message_id = ${providerMessageId}::pg_catalog.uuid
      AND matched_outbox_id IS NULL
      AND event_id IN ${sql(eventIds)}
    RETURNING event_id
  `;
  const stateUpserted = await upsertPostgresStateForProvider(
    sql,
    providerMessageId,
    matchedOutboxId,
    databaseNow
  );
  return { eventsMatched: matched.length, stateUpserted };
}

export async function maintainTeacherNoticeResendWebhookPostgres(
  client: postgres.Sql,
  options: TeacherNoticeResendWebhookMaintenanceOptions = {}
): Promise<TeacherNoticeResendWebhookMaintenanceResult> {
  const reconciliationLimit = options.reconciliationLimit ?? 100;
  const retentionLimit = options.retentionLimit ?? 100;
  assertMaintenanceLimit(reconciliationLimit, "reconciliationLimit");
  assertMaintenanceLimit(retentionLimit, "retentionLimit");
  const ensureTimeRemaining = createMaintenanceDeadlineGuard(options);
  ensureTimeRemaining();
  return client.begin((sql) => runTeacherNoticeResendWebhookPostgresAttestedTransaction({
    sql,
    configure: configureTeacherNoticeResendWebhookPostgresMaintenanceTransaction,
    lockOutboxSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeEmailOutboxPostgresAdvisoryDependency}, 0))`;
    },
    lockWebhookSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeResendWebhookPostgresAdvisoryNamespace}, 0))`;
    },
    lockProviderMessage: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
          ${`${teacherNoticeResendWebhookPostgresAdvisoryNamespace}:maintenance`}, 0
        ))`;
    },
    lockRelations: async (transactionSql) => {
      for (const statement of teacherNoticeResendWebhookPostgresRuntimeRelationLockStatements) {
        await transactionSql.unsafe(statement);
      }
    },
    attest: attestTeacherNoticeResendWebhookPostgresSchema,
    beforeStep: ensureTimeRemaining,
    operation: async (transactionSql) => {
      ensureTimeRemaining();
      const clock = await transactionSql<Array<{ database_now: string }>>`
        SELECT pg_catalog.clock_timestamp() AS database_now
      `;
      ensureTimeRemaining();
      const databaseNow = new Date(clock[0]!.database_now).toISOString();
      const selectedEvents = await transactionSql<Array<{
        event_id: string;
        provider_message_id: string;
      }>>`
        SELECT event.event_id,
          event.provider_message_id::pg_catalog.text AS provider_message_id
        FROM public.teacher_notice_resend_webhook_events AS event
        JOIN public.teacher_notice_email_outbox AS outbox
          ON outbox.provider_message_id = event.provider_message_id::pg_catalog.text
        WHERE event.matched_outbox_id IS NULL
        ORDER BY event.provider_message_id, event.occurred_at_ns,
          event.priority, event.event_id COLLATE pg_catalog."C"
        LIMIT ${reconciliationLimit}
        FOR UPDATE OF event SKIP LOCKED
      `;
      ensureTimeRemaining();
      const eventsByProvider = new Map<string, string[]>();
      for (const event of selectedEvents) {
        const eventIds = eventsByProvider.get(event.provider_message_id) ?? [];
        eventIds.push(event.event_id);
        eventsByProvider.set(event.provider_message_id, eventIds);
      }
      let eventsMatched = 0;
      let statesUpserted = 0;
      for (const [providerMessageId, eventIds] of eventsByProvider) {
        ensureTimeRemaining();
        const reconciled = await reconcilePostgresProvider(
          transactionSql,
          providerMessageId,
          eventIds,
          databaseNow
        );
        eventsMatched += reconciled.eventsMatched;
        statesUpserted += reconciled.stateUpserted;
        ensureTimeRemaining();
      }
      ensureTimeRemaining();
      const moreReconciliation = await transactionSql<Array<{ present: number }>>`
        SELECT 1::pg_catalog.int4 AS present
        FROM public.teacher_notice_resend_webhook_events AS event
        JOIN public.teacher_notice_email_outbox AS outbox
          ON outbox.provider_message_id = event.provider_message_id::pg_catalog.text
        WHERE event.matched_outbox_id IS NULL
        LIMIT 1
      `;
      ensureTimeRemaining();
      const expired = await transactionSql<Array<{
        event_id: string;
        provider_message_id: string;
      }>>`
        SELECT event_id, provider_message_id::pg_catalog.text AS provider_message_id
        FROM public.teacher_notice_resend_webhook_events
        WHERE retention_expires_at <= ${databaseNow}::pg_catalog.timestamptz
        ORDER BY retention_expires_at, event_id COLLATE pg_catalog."C"
        LIMIT ${retentionLimit}
        FOR UPDATE SKIP LOCKED
      `;
      ensureTimeRemaining();
      const affectedProviders = [...new Set(expired.map((entry) => entry.provider_message_id))]
        .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
      let statesDeleted = 0;
      for (const providerMessageId of affectedProviders) {
        ensureTimeRemaining();
        const removed = await transactionSql<Array<{ provider_message_id: string }>>`
          DELETE FROM public.teacher_notice_resend_message_state
          WHERE provider_message_id = ${providerMessageId}::pg_catalog.uuid
          RETURNING provider_message_id::pg_catalog.text AS provider_message_id
        `;
        statesDeleted += removed.length;
        ensureTimeRemaining();
      }
      let eventsDeleted = 0;
      for (const expiredEvent of expired) {
        ensureTimeRemaining();
        const removed = await transactionSql<Array<{ event_id: string }>>`
          DELETE FROM public.teacher_notice_resend_webhook_events
          WHERE event_id = ${expiredEvent.event_id}
          RETURNING event_id
        `;
        eventsDeleted += removed.length;
        ensureTimeRemaining();
      }
      for (const providerMessageId of affectedProviders) {
        ensureTimeRemaining();
        const remaining = await latestPostgresEventForProvider(transactionSql, providerMessageId);
        if (remaining) {
          await upsertPostgresStateForProvider(
            transactionSql,
            providerMessageId,
            remaining.matched_outbox_id,
            databaseNow
          );
        }
        ensureTimeRemaining();
      }
      ensureTimeRemaining();
      const moreRetention = await transactionSql<Array<{ present: number }>>`
        SELECT 1::pg_catalog.int4 AS present
        FROM public.teacher_notice_resend_webhook_events
        WHERE retention_expires_at <= ${databaseNow}::pg_catalog.timestamptz
        LIMIT 1
      `;
      ensureTimeRemaining();
      return {
        reconciledProviders: eventsByProvider.size,
        eventsMatched,
        statesUpserted,
        eventsDeleted,
        statesDeleted,
        hasMoreReconciliation: moreReconciliation.length > 0,
        hasMoreRetention: moreRetention.length > 0
      };
    }
  }));
}

export type TeacherNoticeResendWebhookDeliverySafe = {
  deliveryStatus: string;
  lastEventAt: string;
};

export async function readTeacherNoticeResendWebhookDeliverySafePostgres(
  client: postgres.Sql,
  outboxId: string
): Promise<TeacherNoticeResendWebhookDeliverySafe | null> {
  if (typeof outboxId !== "string" || outboxId.length < 1 || outboxId.length > 200) {
    throw new Error("Teacher notice outbox identifier is invalid.");
  }
  return client.begin((sql) => runTeacherNoticeResendWebhookPostgresAttestedTransaction({
    sql,
    configure: configureTeacherNoticeResendWebhookPostgresTransaction,
    lockOutboxSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeEmailOutboxPostgresAdvisoryDependency}, 0))`;
    },
    lockWebhookSchema: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${teacherNoticeResendWebhookPostgresAdvisoryNamespace}, 0))`;
    },
    lockProviderMessage: async (transactionSql) => {
      await transactionSql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(
          ${`${teacherNoticeResendWebhookPostgresAdvisoryNamespace}:read:${outboxId}`}, 0
        ))`;
    },
    lockRelations: async (transactionSql) => {
      for (const statement of teacherNoticeResendWebhookPostgresReadRelationLockStatements) {
        await transactionSql.unsafe(statement);
      }
    },
    attest: attestTeacherNoticeResendWebhookPostgresSchema,
    operation: async (transactionSql) => {
      const rows = await transactionSql<Array<{
        latest_event_type: string;
        latest_occurred_at: string;
      }>>`
        SELECT latest_event_type,
          latest_occurred_at::pg_catalog.text AS latest_occurred_at
        FROM public.teacher_notice_resend_message_state
        WHERE matched_outbox_id = ${outboxId}
      `;
      const row = rows[0];
      return row
        ? {
            deliveryStatus: row.latest_event_type.slice("email.".length).replaceAll("_", "-"),
            lastEventAt: new Date(row.latest_occurred_at).toISOString()
          }
        : null;
    }
  }));
}

const sqliteOwnTableNames = [
  "teacher_notice_resend_webhook_events",
  "teacher_notice_resend_message_state",
  "teacher_notice_resend_webhook_schema_migrations"
] as const;

function sqliteSchemaStatements(schema: string): string[] {
  return schema
    .split(/;\s*(?=(?:CREATE|INSERT)\b|$)/giu)
    .map((statement) => statement.trim())
    .filter((statement) => /^CREATE\b/iu.test(statement));
}

function expectedTeacherNoticeResendWebhookSqliteObjectsForSchema(schema: string) {
  const objects = sqliteSchemaStatements(schema).map((statement) => {
    const relation = /^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/iu.exec(statement);
    if (relation) return {
      type: "table",
      name: relation[1],
      table: relation[1],
      sql: normalizeTeacherNoticeSqliteSchemaSql(statement)
    };
    const index = /^CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s+ON\s+(\w+)/iu.exec(statement);
    if (!index) throw new Error("Webhook SQLite schema contains an unsupported statement.");
    return {
      type: "index",
      name: index[1],
      table: index[2],
      sql: normalizeTeacherNoticeSqliteSchemaSql(statement)
    };
  });
  objects.push(
    {
      type: "index",
      name: "sqlite_autoindex_teacher_notice_resend_message_state_1",
      table: "teacher_notice_resend_message_state",
      sql: null
    },
    {
      type: "index",
      name: "sqlite_autoindex_teacher_notice_resend_webhook_events_1",
      table: "teacher_notice_resend_webhook_events",
      sql: null
    }
  );
  return objects.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

function expectedTeacherNoticeResendWebhookSqliteObjects() {
  return expectedTeacherNoticeResendWebhookSqliteObjectsForSchema(
    teacherNoticeResendWebhookSqliteSchema
  );
}

function expectedTeacherNoticeResendWebhookSqliteObjectsV2() {
  return expectedTeacherNoticeResendWebhookSqliteObjectsForSchema(
    teacherNoticeResendWebhookSqliteSchemaV2
  );
}

function sqliteIndexKeys(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA index_xinfo('${name}')`).all() as Array<{
    name: string | null;
    desc: number;
    coll: string | null;
    key: number;
  }>).filter((row) => row.key === 1).map((row) => [row.name, row.desc, row.coll]);
}

function sqliteTableColumns(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA table_xinfo('${name}')`).all() as Array<{
    name: string; type: string; notnull: number; dflt_value: string | null;
    pk: number; hidden: number;
  }>).map((row) => [row.name, row.type, row.notnull, row.dflt_value, row.pk, row.hidden]);
}

function sqliteIndexList(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA index_list('${name}')`).all() as Array<{
    name: string; unique: number; origin: string; partial: number;
  }>).map((row) => [row.name, row.unique, row.origin, row.partial])
    .sort((left, right) => String(left[0]) < String(right[0]) ? -1 : String(left[0]) > String(right[0]) ? 1 : 0);
}

function attestTeacherNoticeResendWebhookSqliteSchemaVersion(
  storage: DatabaseSync,
  options: {
    version: 2 | 3;
    expectedObjects: ReturnType<typeof expectedTeacherNoticeResendWebhookSqliteObjects>;
    includesUnmatchedReceivedIndex: boolean;
  }
): boolean {
  try {
    if (!attestTeacherNoticeEmailOutboxV2SqliteDependency(storage)) return false;
    const placeholders = sqliteOwnTableNames.map(() => "?").join(", ");
    const objects = (storage.prepare(`
      SELECT type, name, tbl_name AS "table", sql
      FROM sqlite_master
      WHERE name IN (${placeholders}) OR tbl_name IN (${placeholders})
      ORDER BY name
    `).all(...sqliteOwnTableNames, ...sqliteOwnTableNames) as Array<{
      type: string;
      name: string;
      table: string;
      sql: string | null;
    }>).map((row) => ({ ...row, sql: normalizeTeacherNoticeSqliteSchemaSql(row.sql) }));
    if (JSON.stringify(objects) !== JSON.stringify(options.expectedObjects)) return false;

    const marker = storage.prepare(
      "SELECT singleton, version FROM teacher_notice_resend_webhook_schema_migrations"
    ).all() as Array<{ singleton: number; version: number }>;
    if (
      marker.length !== 1 ||
      marker[0]?.singleton !== 1 ||
      marker[0]?.version !== options.version
    ) return false;
    if (JSON.stringify(sqliteTableColumns(storage, "teacher_notice_resend_webhook_events")) !==
      JSON.stringify([
        ["event_id", "TEXT", 0, null, 1, 0],
        ["provider_message_id", "TEXT", 1, null, 0, 0],
        ["event_type", "TEXT", 1, null, 0, 0],
        ["occurred_at", "TEXT", 1, null, 0, 0],
        ["occurred_at_ns", "TEXT", 1, null, 0, 0],
        ["priority", "INTEGER", 1, null, 0, 0],
        ["received_at", "TEXT", 1, null, 0, 0],
        ["matched_outbox_id", "TEXT", 0, null, 0, 0],
        ["retention_expires_at", "TEXT", 1, null, 0, 0]
      ])) return false;
    if (JSON.stringify(sqliteTableColumns(storage, "teacher_notice_resend_message_state")) !==
      JSON.stringify([
        ["provider_message_id", "TEXT", 0, null, 1, 0],
        ["matched_outbox_id", "TEXT", 0, null, 0, 0],
        ["latest_event_id", "TEXT", 1, null, 0, 0],
        ["latest_event_type", "TEXT", 1, null, 0, 0],
        ["latest_occurred_at", "TEXT", 1, null, 0, 0],
        ["latest_occurred_at_ns", "TEXT", 1, null, 0, 0],
        ["latest_priority", "INTEGER", 1, null, 0, 0],
        ["updated_at", "TEXT", 1, null, 0, 0]
      ])) return false;
    if (JSON.stringify(sqliteTableColumns(storage, "teacher_notice_resend_webhook_schema_migrations")) !==
      JSON.stringify([
        ["singleton", "INTEGER", 0, null, 1, 0],
        ["version", "INTEGER", 1, null, 0, 0],
        ["applied_at", "TEXT", 1, null, 0, 0]
      ])) return false;
    const expectedEventIndexes: Array<[string, number, string, number]> = [
      ["sqlite_autoindex_teacher_notice_resend_webhook_events_1", 1, "pk", 0],
      ["teacher_notice_resend_webhook_events_provider_order_idx", 0, "c", 0],
      ["teacher_notice_resend_webhook_events_retention_idx", 0, "c", 0]
    ];
    if (options.includesUnmatchedReceivedIndex) {
      expectedEventIndexes.push([
        "teacher_notice_resend_webhook_events_unmatched_received_idx",
        0,
        "c",
        1
      ]);
    }
    if (JSON.stringify(sqliteIndexList(storage, "teacher_notice_resend_webhook_events")) !==
      JSON.stringify(expectedEventIndexes)) return false;
    if (JSON.stringify(sqliteIndexList(storage, "teacher_notice_resend_message_state")) !==
      JSON.stringify([
        ["sqlite_autoindex_teacher_notice_resend_message_state_1", 1, "pk", 0],
        ["teacher_notice_resend_message_state_outbox_uq", 1, "c", 1]
      ])) return false;
    if (sqliteIndexList(storage, "teacher_notice_resend_webhook_schema_migrations").length !== 0) return false;
    const foreignKeys = (storage.prepare(
      "PRAGMA foreign_key_list('teacher_notice_resend_message_state')"
    ).all() as Array<Record<string, unknown>>).map((row) => [
      row.table, row.from, row.to, row.on_update, row.on_delete, row.match
    ]);
    if (JSON.stringify(foreignKeys) !== JSON.stringify([[
      "teacher_notice_resend_webhook_events",
      "latest_event_id",
      "event_id",
      "NO ACTION",
      "NO ACTION",
      "NONE"
    ]])) return false;
    const commonIndexesMatch = (
      JSON.stringify(sqliteIndexKeys(storage, "sqlite_autoindex_teacher_notice_resend_webhook_events_1")) ===
        JSON.stringify([["event_id", 0, "BINARY"]]) &&
      JSON.stringify(sqliteIndexKeys(storage, "teacher_notice_resend_webhook_events_provider_order_idx")) ===
        JSON.stringify([["provider_message_id", 0, "BINARY"], ["occurred_at_ns", 0, "BINARY"], ["priority", 0, "BINARY"], ["event_id", 0, "BINARY"]]) &&
      JSON.stringify(sqliteIndexKeys(storage, "teacher_notice_resend_webhook_events_retention_idx")) ===
        JSON.stringify([["retention_expires_at", 0, "BINARY"]]) &&
      JSON.stringify(sqliteIndexKeys(storage, "sqlite_autoindex_teacher_notice_resend_message_state_1")) ===
        JSON.stringify([["provider_message_id", 0, "BINARY"]]) &&
      JSON.stringify(sqliteIndexKeys(storage, "teacher_notice_resend_message_state_outbox_uq")) ===
        JSON.stringify([["matched_outbox_id", 0, "BINARY"]])
    );
    if (!commonIndexesMatch) return false;
    return !options.includesUnmatchedReceivedIndex ||
      JSON.stringify(sqliteIndexKeys(
        storage,
        "teacher_notice_resend_webhook_events_unmatched_received_idx"
      )) === JSON.stringify([["received_at", 0, "BINARY"]]);
  } catch {
    return false;
  }
}

export function attestTeacherNoticeResendWebhookSqliteSchema(storage: DatabaseSync): boolean {
  return attestTeacherNoticeResendWebhookSqliteSchemaVersion(storage, {
    version: 3,
    expectedObjects: expectedTeacherNoticeResendWebhookSqliteObjects(),
    includesUnmatchedReceivedIndex: true
  });
}

function attestTeacherNoticeResendWebhookSqliteSchemaV2(storage: DatabaseSync): boolean {
  return attestTeacherNoticeResendWebhookSqliteSchemaVersion(storage, {
    version: 2,
    expectedObjects: expectedTeacherNoticeResendWebhookSqliteObjectsV2(),
    includesUnmatchedReceivedIndex: false
  });
}

export function migrateTeacherNoticeResendWebhookSqliteSchema(storage: DatabaseSync): void {
  storage.exec("BEGIN IMMEDIATE");
  try {
    if (!attestTeacherNoticeEmailOutboxV2SqliteDependency(storage)) {
      throw new Error("Frozen teacher notice outbox v2 integration dependency is not installed.");
    }
    const relationCount = Number((storage.prepare(`
      SELECT count(*) AS count
      FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name IN (
          'teacher_notice_resend_webhook_events',
          'teacher_notice_resend_message_state',
          'teacher_notice_resend_webhook_schema_migrations'
        )
    `).get() as { count: number }).count);
    if (relationCount === sqliteOwnTableNames.length) {
      if (attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
        storage.exec("COMMIT");
        return;
      }
      if (!attestTeacherNoticeResendWebhookSqliteSchemaV2(storage)) {
        throw new Error("Teacher notice Resend webhook partial or malformed schema was rejected.");
      }
      storage.exec(`
        CREATE INDEX teacher_notice_resend_webhook_events_unmatched_received_idx
          ON teacher_notice_resend_webhook_events (received_at)
          WHERE matched_outbox_id IS NULL;
        ALTER TABLE teacher_notice_resend_webhook_schema_migrations
          RENAME TO teacher_notice_resend_webhook_schema_migrations_v2_upgrade;
        CREATE TABLE teacher_notice_resend_webhook_schema_migrations (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          version INTEGER NOT NULL CHECK (version = 3),
          applied_at TEXT NOT NULL
        );
        INSERT INTO teacher_notice_resend_webhook_schema_migrations
          (singleton, version, applied_at)
        VALUES (1, 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        DROP TABLE teacher_notice_resend_webhook_schema_migrations_v2_upgrade;
      `);
      if (!attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
        throw new Error("Teacher notice Resend webhook schema v3 upgrade could not be attested.");
      }
      storage.exec("COMMIT");
      return;
    }
    if (relationCount !== 0) {
      throw new Error("Teacher notice Resend webhook partial or malformed schema was rejected.");
    }
    storage.exec(teacherNoticeResendWebhookSqliteSchema);
    if (!attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
      throw new Error("Teacher notice Resend webhook schema v3 could not be attested.");
    }
    storage.exec("COMMIT");
  } catch (error) {
    try {
      storage.exec("ROLLBACK");
    } catch {
      // Preserve the migration or attestation error.
    }
    throw error;
  }
}

function assertTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value)) || !/^\d{4}-\d{2}-\d{2}T/u.test(value)) {
    throw new Error("Teacher notice Resend webhook timestamp is invalid.");
  }
}

function storedEnvelope(row: StoredState): TeacherNoticeResendWebhookEnvelope {
  return {
    eventId: row.latest_event_id,
    type: row.latest_event_type,
    occurredAt: row.latest_occurred_at,
    occurredAtNs: row.latest_occurred_at_ns,
    priority: row.latest_priority,
    providerMessageId: "00000000-0000-4000-8000-000000000000"
  };
}

function sameStoredEvent(row: StoredEvent, event: TeacherNoticeResendWebhookEnvelope): boolean {
  return (
    row.event_id === event.eventId &&
    row.provider_message_id === event.providerMessageId &&
    row.event_type === event.type &&
    row.occurred_at === event.occurredAt &&
    row.occurred_at_ns === event.occurredAtNs &&
    row.priority === event.priority
  );
}

export type TeacherNoticeResendWebhookMaintenanceResult = {
  reconciledProviders: number;
  eventsMatched: number;
  statesUpserted: number;
  eventsDeleted: number;
  statesDeleted: number;
  hasMoreReconciliation: boolean;
  hasMoreRetention: boolean;
};

export type TeacherNoticeResendWebhookMaintenanceOptions = {
  reconciliationLimit?: number;
  retentionLimit?: number;
  deadlineAt?: number;
  monotonicNow?: () => number;
};

export class TeacherNoticeResendWebhookMaintenanceDeadlineError extends Error {
  constructor() {
    super("Teacher notice Resend webhook maintenance deadline reserve was reached.");
    this.name = "TeacherNoticeResendWebhookMaintenanceDeadlineError";
  }
}

function createMaintenanceDeadlineGuard(
  options: TeacherNoticeResendWebhookMaintenanceOptions
): () => void {
  if (options.deadlineAt === undefined) return () => {};
  if (!Number.isFinite(options.deadlineAt) || options.deadlineAt < 0) {
    throw new Error("Teacher notice Resend webhook maintenance deadline is invalid.");
  }
  const monotonicNow = options.monotonicNow ?? (() => globalThis.performance.now());
  return () => {
    const current = monotonicNow();
    if (!Number.isFinite(current) || current < 0) {
      throw new Error("Teacher notice Resend webhook maintenance clock is invalid.");
    }
    if (options.deadlineAt! - current <= teacherNoticeResendWebhookMaintenanceReserveMs) {
      throw new TeacherNoticeResendWebhookMaintenanceDeadlineError();
    }
  };
}

function assertMaintenanceLimit(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) {
    throw new Error(`${name} must be an integer between 1 and 1000.`);
  }
}

export function runTeacherNoticeResendWebhookSqliteMaintenanceTransaction<Result>(
  storage: DatabaseSync,
  operation: (transactionStorage: DatabaseSync) => Result
): Result {
  storage.exec("BEGIN IMMEDIATE");
  try {
    if (!attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
      throw new Error("Teacher notice Resend webhook schema v3 migration is required.");
    }
    const result = operation(storage);
    storage.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      storage.exec("ROLLBACK");
    } catch {
      // Preserve the maintenance or attestation error.
    }
    throw error;
  }
}

function latestSqliteEventForProvider(
  storage: DatabaseSync,
  providerMessageId: string
): (StoredEvent & { received_at: string }) | undefined {
  const rows = storage.prepare(`
    SELECT event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
      priority, matched_outbox_id, received_at
    FROM teacher_notice_resend_webhook_events
    WHERE provider_message_id = ? AND matched_outbox_id IS NOT NULL
  `).all(providerMessageId) as Array<StoredEvent & { received_at: string }>;
  return rows.reduce<(StoredEvent & { received_at: string }) | undefined>((latest, row) => {
    if (!latest) return row;
    const left = {
      eventId: latest.event_id,
      occurredAtNs: latest.occurred_at_ns,
      priority: latest.priority
    };
    const right = {
      eventId: row.event_id,
      occurredAtNs: row.occurred_at_ns,
      priority: row.priority
    };
    return compareTeacherNoticeResendWebhookEvents(left, right) < 0 ? row : latest;
  }, undefined);
}

function upsertSqliteStateForProvider(
  storage: DatabaseSync,
  providerMessageId: string,
  matchedOutboxId: string,
  updatedAt: string
): number {
  const latest = latestSqliteEventForProvider(storage, providerMessageId);
  if (!latest) return 0;
  const current = storage.prepare(`
    SELECT matched_outbox_id, latest_event_id, latest_event_type, latest_occurred_at,
      latest_occurred_at_ns, latest_priority
    FROM teacher_notice_resend_message_state
    WHERE provider_message_id = ?
  `).get(providerMessageId) as (StoredState & { matched_outbox_id: string }) | undefined;
  if (
    current?.matched_outbox_id === matchedOutboxId &&
    current.latest_event_id === latest.event_id &&
    current.latest_event_type === latest.event_type &&
    current.latest_occurred_at === latest.occurred_at &&
    current.latest_occurred_at_ns === latest.occurred_at_ns &&
    current.latest_priority === latest.priority
  ) return 0;
  storage.prepare(`
    INSERT INTO teacher_notice_resend_message_state (
      provider_message_id, matched_outbox_id, latest_event_id, latest_event_type,
      latest_occurred_at, latest_occurred_at_ns, latest_priority, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_message_id) DO UPDATE SET
      matched_outbox_id = excluded.matched_outbox_id,
      latest_event_id = excluded.latest_event_id,
      latest_event_type = excluded.latest_event_type,
      latest_occurred_at = excluded.latest_occurred_at,
      latest_occurred_at_ns = excluded.latest_occurred_at_ns,
      latest_priority = excluded.latest_priority,
      updated_at = excluded.updated_at
  `).run(
    providerMessageId,
    matchedOutboxId,
    latest.event_id,
    latest.event_type,
    latest.occurred_at,
    latest.occurred_at_ns,
    latest.priority,
    updatedAt
  );
  return 1;
}

function reconcileSqliteProvider(
  storage: DatabaseSync,
  providerMessageId: string,
  eventIds: string[],
  updatedAt: string
): { eventsMatched: number; stateUpserted: number } {
  if (eventIds.length === 0) return { eventsMatched: 0, stateUpserted: 0 };
  const matches = storage.prepare(`
    SELECT id FROM teacher_notice_email_outbox
    WHERE provider_message_id = ?
    ORDER BY id COLLATE BINARY
    LIMIT 2
  `).all(providerMessageId) as Array<{ id: string }>;
  if (matches.length !== 1) {
    if (matches.length > 1) throw new Error("Ambiguous provider message contact was rejected.");
    return { eventsMatched: 0, stateUpserted: 0 };
  }
  const matchedOutboxId = matches[0]!.id;
  const conflict = storage.prepare(`
    SELECT matched_outbox_id
    FROM teacher_notice_resend_webhook_events
    WHERE provider_message_id = ? AND matched_outbox_id IS NOT NULL
      AND matched_outbox_id <> ?
    LIMIT 1
  `).get(providerMessageId, matchedOutboxId);
  if (conflict) {
    throw new Error("Conflicting outbox match for durable Resend webhook events was rejected.");
  }
  const eventPlaceholders = eventIds.map(() => "?").join(", ");
  const eventsMatched = Number(storage.prepare(`
    UPDATE teacher_notice_resend_webhook_events
    SET matched_outbox_id = ?
    WHERE provider_message_id = ? AND matched_outbox_id IS NULL
      AND event_id IN (${eventPlaceholders})
  `).run(matchedOutboxId, providerMessageId, ...eventIds).changes);
  const stateUpserted = upsertSqliteStateForProvider(
    storage,
    providerMessageId,
    matchedOutboxId,
    updatedAt
  );
  return { eventsMatched, stateUpserted };
}

function purgeTeacherNoticeResendWebhookTombstonesSqliteInsideTransaction(
  storage: DatabaseSync,
  now: string,
  limit: number,
  beforeStep: () => void = () => {}
): { eventsDeleted: number; statesDeleted: number; hasMore: boolean } {
  beforeStep();
  const expired = storage.prepare(`
    SELECT event_id, provider_message_id
    FROM teacher_notice_resend_webhook_events
    WHERE retention_expires_at <= ?
    ORDER BY retention_expires_at COLLATE BINARY, event_id COLLATE BINARY
    LIMIT ?
  `).all(now, limit) as Array<{ event_id: string; provider_message_id: string }>;
  beforeStep();
  if (expired.length === 0) {
    return { eventsDeleted: 0, statesDeleted: 0, hasMore: false };
  }
  const providerIds = [...new Set(expired.map((entry) => entry.provider_message_id))]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const providerPlaceholders = providerIds.map(() => "?").join(", ");
  beforeStep();
  const statesDeleted = Number(storage.prepare(`
    DELETE FROM teacher_notice_resend_message_state
    WHERE provider_message_id IN (${providerPlaceholders})
  `).run(...providerIds).changes);
  beforeStep();
  const eventPlaceholders = expired.map(() => "?").join(", ");
  beforeStep();
  const eventsDeleted = Number(storage.prepare(`
    DELETE FROM teacher_notice_resend_webhook_events
    WHERE event_id IN (${eventPlaceholders})
  `).run(...expired.map((entry) => entry.event_id)).changes);
  beforeStep();
  for (const providerMessageId of providerIds) {
    beforeStep();
    const remaining = storage.prepare(`
      SELECT matched_outbox_id
      FROM teacher_notice_resend_webhook_events
      WHERE provider_message_id = ? AND matched_outbox_id IS NOT NULL
      ORDER BY event_id COLLATE BINARY
      LIMIT 1
    `).get(providerMessageId) as { matched_outbox_id: string } | undefined;
    if (remaining) {
      upsertSqliteStateForProvider(storage, providerMessageId, remaining.matched_outbox_id, now);
    }
    beforeStep();
  }
  beforeStep();
  const hasMore = Boolean(storage.prepare(`
    SELECT 1 FROM teacher_notice_resend_webhook_events
    WHERE retention_expires_at <= ? LIMIT 1
  `).get(now));
  beforeStep();
  return { eventsDeleted, statesDeleted, hasMore };
}

export async function maintainTeacherNoticeResendWebhookSqlite(
  dbPath: string,
  options: TeacherNoticeResendWebhookMaintenanceOptions & { now?: string } = {}
): Promise<TeacherNoticeResendWebhookMaintenanceResult> {
  const now = options.now ?? new Date().toISOString();
  const reconciliationLimit = options.reconciliationLimit ?? 100;
  const retentionLimit = options.retentionLimit ?? 100;
  assertTimestamp(now);
  assertMaintenanceLimit(reconciliationLimit, "reconciliationLimit");
  assertMaintenanceLimit(retentionLimit, "retentionLimit");
  const ensureTimeRemaining = createMaintenanceDeadlineGuard(options);
  ensureTimeRemaining();
  const storage = new DatabaseSync(dbPath);
  storage.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  try {
    ensureTimeRemaining();
    return runTeacherNoticeResendWebhookSqliteMaintenanceTransaction(storage, (transactionStorage) => {
      ensureTimeRemaining();
      const selectedEvents = transactionStorage.prepare(`
        SELECT event.event_id, event.provider_message_id
        FROM teacher_notice_resend_webhook_events AS event
        JOIN teacher_notice_email_outbox AS outbox
          ON outbox.provider_message_id = event.provider_message_id
        WHERE event.matched_outbox_id IS NULL
        ORDER BY event.provider_message_id COLLATE BINARY,
          length(event.occurred_at_ns), event.occurred_at_ns COLLATE BINARY,
          event.priority, event.event_id COLLATE BINARY
        LIMIT ?
      `).all(reconciliationLimit) as Array<{ event_id: string; provider_message_id: string }>;
      ensureTimeRemaining();
      const eventsByProvider = new Map<string, string[]>();
      for (const event of selectedEvents) {
        const eventIds = eventsByProvider.get(event.provider_message_id) ?? [];
        eventIds.push(event.event_id);
        eventsByProvider.set(event.provider_message_id, eventIds);
      }
      let eventsMatched = 0;
      let statesUpserted = 0;
      for (const [providerMessageId, eventIds] of eventsByProvider) {
        ensureTimeRemaining();
        const reconciled = reconcileSqliteProvider(
          transactionStorage,
          providerMessageId,
          eventIds,
          now
        );
        eventsMatched += reconciled.eventsMatched;
        statesUpserted += reconciled.stateUpserted;
        ensureTimeRemaining();
      }
      ensureTimeRemaining();
      const hasMoreReconciliation = Boolean(transactionStorage.prepare(`
        SELECT 1
        FROM teacher_notice_resend_webhook_events AS event
        JOIN teacher_notice_email_outbox AS outbox
          ON outbox.provider_message_id = event.provider_message_id
        WHERE event.matched_outbox_id IS NULL
        LIMIT 1
      `).get());
      ensureTimeRemaining();
      const retention = purgeTeacherNoticeResendWebhookTombstonesSqliteInsideTransaction(
        transactionStorage,
        now,
        retentionLimit,
        ensureTimeRemaining
      );
      ensureTimeRemaining();
      return {
        reconciledProviders: eventsByProvider.size,
        eventsMatched,
        statesUpserted,
        eventsDeleted: retention.eventsDeleted,
        statesDeleted: retention.statesDeleted,
        hasMoreReconciliation,
        hasMoreRetention: retention.hasMore
      };
    });
  } finally {
    storage.close();
  }
}

function persistInsideSqliteTransaction(
  storage: DatabaseSync,
  event: TeacherNoticeResendWebhookEnvelope,
  receivedAt: string
): PersistResult {
  assertTimestamp(receivedAt);
  if (!attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
    throw new Error("Teacher notice Resend webhook schema v3 migration is required.");
  }

  const matches = storage.prepare(
    "SELECT id FROM teacher_notice_email_outbox WHERE provider_message_id = ? ORDER BY id LIMIT 2"
  ).all(event.providerMessageId) as Array<{ id: string }>;
  if (matches.length > 1) throw new Error("Ambiguous provider message contact was rejected.");
  const matchedOutboxId = matches[0]?.id ?? null;

  const existing = storage.prepare(`
    SELECT event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
      priority, matched_outbox_id
    FROM teacher_notice_resend_webhook_events
    WHERE event_id = ?
  `).get(event.eventId) as StoredEvent | undefined;
  let replayed = false;
  if (existing) {
    if (!sameStoredEvent(existing, event)) {
      throw new Error("Conflicting replay for a durable Resend webhook event was rejected.");
    }
    replayed = true;
    if (matchedOutboxId !== null && existing.matched_outbox_id === null) {
      storage.prepare(`
        UPDATE teacher_notice_resend_webhook_events
        SET matched_outbox_id = ?
        WHERE event_id = ? AND matched_outbox_id IS NULL
      `).run(matchedOutboxId, event.eventId);
    } else if (
      matchedOutboxId !== null &&
      existing.matched_outbox_id !== null &&
      existing.matched_outbox_id !== matchedOutboxId
    ) {
      throw new Error("Conflicting outbox match for a durable Resend webhook event was rejected.");
    }
  } else {
    storage.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events (
        event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
        priority, received_at, matched_outbox_id, retention_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.eventId,
      event.providerMessageId,
      event.type,
      event.occurredAt,
      event.occurredAtNs,
      event.priority,
      receivedAt,
      matchedOutboxId,
      new Date(Date.parse(receivedAt) + teacherNoticeResendWebhookRetentionMs).toISOString()
    );
  }

  if (matchedOutboxId === null) return { status: "unmatched" };

  const current = storage.prepare(`
    SELECT latest_event_id, latest_event_type, latest_occurred_at,
      latest_occurred_at_ns, latest_priority
    FROM teacher_notice_resend_message_state
    WHERE provider_message_id = ?
  `).get(event.providerMessageId) as StoredState | undefined;
  const newer = !current || compareTeacherNoticeResendWebhookEvents(storedEnvelope(current), event) < 0;
  if (newer) {
    storage.prepare(`
      INSERT INTO teacher_notice_resend_message_state (
        provider_message_id, matched_outbox_id, latest_event_id, latest_event_type,
        latest_occurred_at, latest_occurred_at_ns, latest_priority, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_message_id) DO UPDATE SET
        matched_outbox_id = excluded.matched_outbox_id,
        latest_event_id = excluded.latest_event_id,
        latest_event_type = excluded.latest_event_type,
        latest_occurred_at = excluded.latest_occurred_at,
        latest_occurred_at_ns = excluded.latest_occurred_at_ns,
        latest_priority = excluded.latest_priority,
        updated_at = excluded.updated_at
    `).run(
      event.providerMessageId,
      matchedOutboxId,
      event.eventId,
      event.type,
      event.occurredAt,
      event.occurredAtNs,
      event.priority,
      receivedAt
    );
  }
  if (replayed) return { status: "replayed" };
  return { status: newer ? "applied" : "stale" };
}

export async function persistTeacherNoticeResendWebhookEventSqlite(
  dbPath: string,
  event: TeacherNoticeResendWebhookEnvelope,
  receivedAt = new Date().toISOString()
): Promise<PersistResult> {
  const storage = new DatabaseSync(dbPath);
  storage.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  let transactionOpen = false;
  try {
    storage.exec("BEGIN IMMEDIATE");
    transactionOpen = true;
    const result = persistInsideSqliteTransaction(storage, event, receivedAt);
    storage.exec("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        storage.exec("ROLLBACK");
      } catch {
        // Preserve the persistence error.
      }
    }
    throw error;
  } finally {
    storage.close();
  }
}

export function readTeacherNoticeResendWebhookDeliverySafeSqlite(
  dbPath: string,
  outboxId: string
): TeacherNoticeResendWebhookDeliverySafe | null {
  const storage = new DatabaseSync(dbPath, { readOnly: true });
  try {
    if (!attestTeacherNoticeResendWebhookSqliteSchema(storage)) {
      throw new Error("Teacher notice Resend webhook schema v3 migration is required.");
    }
    const row = storage.prepare(`
      SELECT latest_event_type, latest_occurred_at
      FROM teacher_notice_resend_message_state
      WHERE matched_outbox_id = ?
    `).get(outboxId) as { latest_event_type: string; latest_occurred_at: string } | undefined;
    return row
      ? {
          deliveryStatus: row.latest_event_type.slice("email.".length).replaceAll("_", "-"),
          lastEventAt: row.latest_occurred_at
        }
      : null;
  } finally {
    storage.close();
  }
}

export function purgeTeacherNoticeResendWebhookTombstonesSqlite(
  storage: DatabaseSync,
  now: string,
  limit = 100
): { eventsDeleted: number; statesDeleted: number } {
  assertTimestamp(now);
  assertMaintenanceLimit(limit, "retentionLimit");
  return runTeacherNoticeResendWebhookSqliteMaintenanceTransaction(storage, (transactionStorage) => {
    const result = purgeTeacherNoticeResendWebhookTombstonesSqliteInsideTransaction(
      transactionStorage,
      now,
      limit
    );
    return { eventsDeleted: result.eventsDeleted, statesDeleted: result.statesDeleted };
  });
}
