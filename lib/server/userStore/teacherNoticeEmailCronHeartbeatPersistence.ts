import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

import { normalizeTeacherNoticeSqliteSchemaSql } from
  "./teacherNoticeEmailOutboxV2Dependency";

export type TeacherNoticeEmailCronHeartbeatIdentity = {
  releaseSha: string;
  runId: string;
};

export type TeacherNoticeEmailCronHeartbeatStatus =
  | "started"
  | "succeeded"
  | "failed";

export function isTeacherNoticeEmailCronHeartbeatReleaseSha(
  value: unknown
): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

export function isTeacherNoticeEmailCronHeartbeatRunId(
  value: unknown
): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      .test(value);
}

export const teacherNoticeEmailCronHeartbeatSchemaVersion = 2;
export const teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace =
  "mais-teacher-notice-email-cron-heartbeat-v1";

const heartbeatTable = "teacher_notice_email_cron_heartbeat";
const heartbeatMarkerTable = "teacher_notice_email_cron_heartbeat_schema_migrations";
const heartbeatSqliteObjectNames = [heartbeatTable, heartbeatMarkerTable] as const;

export const teacherNoticeEmailCronHeartbeatSqliteSchemaV1 = `
  CREATE TABLE teacher_notice_email_cron_heartbeat (
    singleton INTEGER PRIMARY KEY CONSTRAINT teacher_notice_email_cron_heartbeat_singleton_ck
      CHECK (singleton = 1),
    run_id TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_run_id_ck
      CHECK (length(run_id) = 36 AND run_id NOT GLOB '*[^0-9a-f-]*'),
    release_sha TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_release_sha_ck
      CHECK (length(release_sha) = 40 AND release_sha NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_status_ck
      CHECK (status IN ('started', 'succeeded', 'failed')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    CONSTRAINT teacher_notice_email_cron_heartbeat_state_ck CHECK (
      (status = 'started' AND completed_at IS NULL) OR
      (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
    )
  );
  CREATE TABLE teacher_notice_email_cron_heartbeat_schema_migrations (
    singleton INTEGER PRIMARY KEY CONSTRAINT teacher_notice_email_cron_heartbeat_schema_singleton_ck
      CHECK (singleton = 1),
    version INTEGER NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck
      CHECK (version = 1),
    applied_at TEXT NOT NULL
  );
  INSERT INTO teacher_notice_email_cron_heartbeat_schema_migrations
    (singleton, version, applied_at)
  VALUES (1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`;

export const teacherNoticeEmailCronHeartbeatSqliteSchema = `
  CREATE TABLE teacher_notice_email_cron_heartbeat (
    singleton INTEGER PRIMARY KEY CONSTRAINT teacher_notice_email_cron_heartbeat_singleton_ck
      CHECK (singleton = 1),
    run_id TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_run_id_ck
      CHECK (length(run_id) = 36 AND run_id NOT GLOB '*[^0-9a-f-]*'),
    release_sha TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_release_sha_ck
      CHECK (length(release_sha) = 40 AND release_sha NOT GLOB '*[^0-9a-f]*'),
    status TEXT NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_status_ck
      CHECK (status IN ('started', 'succeeded', 'failed')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    last_failed_at TEXT,
    CONSTRAINT teacher_notice_email_cron_heartbeat_state_ck CHECK (
      (status = 'started' AND completed_at IS NULL) OR
      (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
    )
  );
  CREATE TABLE teacher_notice_email_cron_heartbeat_schema_migrations (
    singleton INTEGER PRIMARY KEY CONSTRAINT teacher_notice_email_cron_heartbeat_schema_singleton_ck
      CHECK (singleton = 1),
    version INTEGER NOT NULL CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck
      CHECK (version = 2),
    applied_at TEXT NOT NULL
  );
  INSERT INTO teacher_notice_email_cron_heartbeat_schema_migrations
    (singleton, version, applied_at)
  VALUES (1, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`;

export const teacherNoticeEmailCronHeartbeatPostgresSchemaV1Statements = [
  `CREATE TABLE public.teacher_notice_email_cron_heartbeat (
    singleton pg_catalog.bool CONSTRAINT teacher_notice_email_cron_heartbeat_pkey
      PRIMARY KEY DEFAULT TRUE
      CONSTRAINT teacher_notice_email_cron_heartbeat_singleton_ck CHECK (singleton),
    run_id pg_catalog.text NOT NULL,
    release_sha pg_catalog.text NOT NULL,
    status pg_catalog.text NOT NULL
      CONSTRAINT teacher_notice_email_cron_heartbeat_status_ck
      CHECK (status IN ('started', 'succeeded', 'failed')),
    started_at pg_catalog.timestamptz NOT NULL,
    completed_at pg_catalog.timestamptz,
    updated_at pg_catalog.timestamptz NOT NULL,
    CONSTRAINT teacher_notice_email_cron_heartbeat_state_ck CHECK (
      (status = 'started' AND completed_at IS NULL) OR
      (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
    )
  )`,
  `CREATE TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations (
    singleton pg_catalog.bool
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_migrations_pkey
      PRIMARY KEY DEFAULT TRUE
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_singleton_ck
      CHECK (singleton),
    version pg_catalog.int4 NOT NULL DEFAULT 1
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck
      CHECK (version = 1),
    applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
  )`,
  `COMMENT ON TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    IS 'mais-teacher-notice-email-cron-heartbeat-schema-v1'`,
  `INSERT INTO public.teacher_notice_email_cron_heartbeat_schema_migrations
    (singleton, version) VALUES (TRUE, 1)`
] as const;

export const teacherNoticeEmailCronHeartbeatPostgresSchemaStatements = [
  `CREATE TABLE public.teacher_notice_email_cron_heartbeat (
    singleton pg_catalog.bool CONSTRAINT teacher_notice_email_cron_heartbeat_pkey
      PRIMARY KEY DEFAULT TRUE
      CONSTRAINT teacher_notice_email_cron_heartbeat_singleton_ck CHECK (singleton),
    run_id pg_catalog.text NOT NULL,
    release_sha pg_catalog.text NOT NULL,
    status pg_catalog.text NOT NULL
      CONSTRAINT teacher_notice_email_cron_heartbeat_status_ck
      CHECK (status IN ('started', 'succeeded', 'failed')),
    started_at pg_catalog.timestamptz NOT NULL,
    completed_at pg_catalog.timestamptz,
    updated_at pg_catalog.timestamptz NOT NULL,
    last_failed_at pg_catalog.timestamptz,
    CONSTRAINT teacher_notice_email_cron_heartbeat_state_ck CHECK (
      (status = 'started' AND completed_at IS NULL) OR
      (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
    )
  )`,
  `CREATE TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations (
    singleton pg_catalog.bool
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_migrations_pkey
      PRIMARY KEY DEFAULT TRUE
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_singleton_ck
      CHECK (singleton),
    version pg_catalog.int4 NOT NULL DEFAULT 2
      CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck
      CHECK (version = 2),
    applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
  )`,
  `COMMENT ON TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    IS 'mais-teacher-notice-email-cron-heartbeat-schema-v2'`,
  `INSERT INTO public.teacher_notice_email_cron_heartbeat_schema_migrations
    (singleton, version) VALUES (TRUE, 2)`
] as const;

export const teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements = [
  `ALTER TABLE public.teacher_notice_email_cron_heartbeat
    ADD COLUMN last_failed_at pg_catalog.timestamptz`,
  `UPDATE public.teacher_notice_email_cron_heartbeat
    SET last_failed_at = completed_at
    WHERE status = 'failed'`,
  `ALTER TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    DROP CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck`,
  `ALTER TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    ALTER COLUMN version SET DEFAULT 2`,
  `UPDATE public.teacher_notice_email_cron_heartbeat_schema_migrations
    SET version = 2, applied_at = pg_catalog.clock_timestamp()
    WHERE singleton = TRUE AND version = 1`,
  `ALTER TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    ADD CONSTRAINT teacher_notice_email_cron_heartbeat_schema_version_ck
    CHECK (version = 2)`,
  `COMMENT ON TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations
    IS 'mais-teacher-notice-email-cron-heartbeat-schema-v2'`
] as const;

const pgBooleanOpclass = {
  schema: "pg_catalog",
  name: "bool_ops",
  inputType: "boolean",
  accessMethod: "btree",
  isDefault: true
};

const teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1 = {
  relations: [
    { name: heartbeatTable, kind: "r", persistence: "p", rowSecurity: false, forceRowSecurity: false },
    { name: heartbeatMarkerTable, kind: "r", persistence: "p", rowSecurity: false, forceRowSecurity: false }
  ],
  columns: [
    { relation: heartbeatTable, name: "singleton", position: 1, type: "boolean", notNull: true, defaultExpression: "true" },
    { relation: heartbeatTable, name: "run_id", position: 2, type: "text", notNull: true, defaultExpression: null },
    { relation: heartbeatTable, name: "release_sha", position: 3, type: "text", notNull: true, defaultExpression: null },
    { relation: heartbeatTable, name: "status", position: 4, type: "text", notNull: true, defaultExpression: null },
    { relation: heartbeatTable, name: "started_at", position: 5, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: heartbeatTable, name: "completed_at", position: 6, type: "timestamp with time zone", notNull: false, defaultExpression: null },
    { relation: heartbeatTable, name: "updated_at", position: 7, type: "timestamp with time zone", notNull: true, defaultExpression: null },
    { relation: heartbeatMarkerTable, name: "singleton", position: 1, type: "boolean", notNull: true, defaultExpression: "true" },
    { relation: heartbeatMarkerTable, name: "version", position: 2, type: "integer", notNull: true, defaultExpression: "1" },
    { relation: heartbeatMarkerTable, name: "applied_at", position: 3, type: "timestamp with time zone", notNull: true, defaultExpression: "clock_timestamp()" }
  ],
  constraints: [
    {
      relation: heartbeatTable,
      name: "teacher_notice_email_cron_heartbeat_pkey",
      type: "p",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: "teacher_notice_email_cron_heartbeat_pkey",
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: ["singleton"],
      expression: null
    },
    {
      relation: heartbeatTable,
      name: "teacher_notice_email_cron_heartbeat_singleton_ck",
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
      relation: heartbeatTable,
      name: "teacher_notice_email_cron_heartbeat_state_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(((status = 'started'::text) AND (completed_at IS NULL)) OR ((status = ANY (ARRAY['succeeded'::text, 'failed'::text])) AND (completed_at IS NOT NULL)))"
    },
    {
      relation: heartbeatTable,
      name: "teacher_notice_email_cron_heartbeat_status_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text]))"
    },
    {
      relation: heartbeatMarkerTable,
      name: "teacher_notice_email_cron_heartbeat_schema_migrations_pkey",
      type: "p",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: "teacher_notice_email_cron_heartbeat_schema_migrations_pkey",
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: ["singleton"],
      expression: null
    },
    {
      relation: heartbeatMarkerTable,
      name: "teacher_notice_email_cron_heartbeat_schema_singleton_ck",
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
      relation: heartbeatMarkerTable,
      name: "teacher_notice_email_cron_heartbeat_schema_version_ck",
      type: "c",
      validated: true,
      deferrable: false,
      initiallyDeferred: false,
      backingIndexName: null,
      relationOidMatches: true,
      backingIndexOidMatches: true,
      keyColumns: [],
      expression: "(version = 1)"
    }
  ],
  indexes: [
    {
      relation: heartbeatTable,
      name: "teacher_notice_email_cron_heartbeat_pkey",
      accessMethod: "btree",
      valid: true,
      ready: true,
      live: true,
      unique: true,
      primary: true,
      immediate: true,
      partial: false,
      predicate: null,
      keyColumns: ["singleton"],
      indOptions: [0],
      opclasses: [pgBooleanOpclass],
      collations: [null]
    },
    {
      relation: heartbeatMarkerTable,
      name: "teacher_notice_email_cron_heartbeat_schema_migrations_pkey",
      accessMethod: "btree",
      valid: true,
      ready: true,
      live: true,
      unique: true,
      primary: true,
      immediate: true,
      partial: false,
      predicate: null,
      keyColumns: ["singleton"],
      indOptions: [0],
      opclasses: [pgBooleanOpclass],
      collations: [null]
    }
  ],
  integrity: {
    relationOidCount: 2,
    columnCount: 10,
    constraintCount: 7,
    indexCount: 2,
    unexpectedIndexCount: 0,
    userTriggerCount: 0,
    ruleCount: 0,
    inheritanceCount: 0,
    constraintRelationOidsMatch: true,
    constraintBackingIndexOidsMatch: true,
    indexRelationOidsMatch: true
  },
  markerComment: "mais-teacher-notice-email-cron-heartbeat-schema-v1",
  markerRows: [{ singleton: true, version: 1 }]
} as const;

export const teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog = {
  ...teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1,
  columns: [
    ...teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1.columns.slice(0, 7),
    {
      relation: heartbeatTable,
      name: "last_failed_at",
      position: 8,
      type: "timestamp with time zone",
      notNull: false,
      defaultExpression: null
    },
    ...teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1.columns
      .slice(7)
      .map((column) => column.name === "version"
        ? { ...column, defaultExpression: "2" }
        : column)
  ],
  constraints: teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1.constraints
    .map((constraint) =>
      constraint.name === "teacher_notice_email_cron_heartbeat_schema_version_ck"
        ? { ...constraint, expression: "(version = 2)" }
        : constraint
    ),
  integrity: {
    ...teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1.integrity,
    columnCount: 11
  },
  markerComment: "mais-teacher-notice-email-cron-heartbeat-schema-v2",
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

export function attestTeacherNoticeEmailCronHeartbeatPostgresCatalog(
  value: unknown
): boolean {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(canonicalCatalogValue(value)) ===
      JSON.stringify(canonicalCatalogValue(
        teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog
      ))
  );
}

function attestTeacherNoticeEmailCronHeartbeatPostgresCatalogV1(
  value: unknown
): boolean {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(canonicalCatalogValue(value)) ===
      JSON.stringify(canonicalCatalogValue(
        teacherNoticeEmailCronHeartbeatExpectedPostgresCatalogV1
      ))
  );
}

export async function runTeacherNoticeEmailCronHeartbeatAtomicMigration<Sql>({
  attest,
  begin,
  inspect,
  migrate
}: {
  attest: (sql: Sql) => Promise<boolean>;
  begin: (operation: (sql: Sql) => Promise<void>) => Promise<void>;
  inspect: (sql: Sql) => Promise<"empty" | "v1" | "exact" | "partial">;
  migrate: (sql: Sql, state: "empty" | "v1") => Promise<void>;
}): Promise<void> {
  await begin(async (sql) => {
    const state = await inspect(sql);
    if (state === "exact") return;
    if (state === "partial") {
      throw new Error(
        "Teacher notice email cron heartbeat partial or malformed schema was rejected."
      );
    }
    await migrate(sql, state);
    if (!await attest(sql)) {
      throw new Error("Teacher notice email cron heartbeat schema v2 could not be attested.");
    }
  });
}

export async function runTeacherNoticeEmailCronHeartbeatPostgresAttestedTransaction<
  Sql,
  Result
>({
  attest,
  configure,
  lockRelations,
  lockSchema,
  operation,
  sql
}: {
  attest: (sql: Sql) => Promise<boolean>;
  configure: (sql: Sql) => Promise<void>;
  lockRelations: (sql: Sql) => Promise<void>;
  lockSchema: (sql: Sql) => Promise<void>;
  operation: (sql: Sql) => Promise<Result>;
  sql: Sql;
}): Promise<Result> {
  await configure(sql);
  await lockSchema(sql);
  await lockRelations(sql);
  if (!await attest(sql)) {
    throw new Error("Teacher notice email cron heartbeat PostgreSQL schema could not be attested.");
  }
  return operation(sql);
}

type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

type PostgresCatalogRelation = {
  forceRowSecurity: boolean;
  kind: string;
  name: string;
  persistence: string;
  rowSecurity: boolean;
};

type PostgresCatalogColumn = {
  defaultExpression: string | null;
  name: string;
  notNull: boolean;
  position: number;
  relation: string;
  type: string;
};

type PostgresCatalogConstraint = {
  backingIndexName: string | null;
  backingIndexOidMatches: boolean;
  deferrable: boolean;
  expression: string | null;
  initiallyDeferred: boolean;
  keyColumns: string[];
  name: string;
  relation: string;
  relationOidMatches: boolean;
  type: string;
  validated: boolean;
};

type PostgresCatalogIndex = {
  accessMethod: string;
  collations: Array<Record<string, unknown> | null>;
  immediate: boolean;
  indOptions: number[];
  keyColumns: string[];
  live: boolean;
  name: string;
  opclasses: Array<Record<string, unknown>>;
  partial: boolean;
  predicate: string | null;
  primary: boolean;
  ready: boolean;
  relation: string;
  relationOidMatches: boolean;
  unique: boolean;
  valid: boolean;
};

const heartbeatPostgresRelationOrder = [heartbeatTable, heartbeatMarkerTable] as const;

function sortHeartbeatPostgresCatalogEntries<
  Entry extends { name: string; position?: number; relation?: string }
>(entries: Entry[]): Entry[] {
  const order = new Map<string, number>(
    heartbeatPostgresRelationOrder.map((name, index) => [name, index])
  );
  return entries.sort((left, right) => {
    const relationDifference =
      (order.get(left.relation ?? left.name) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.relation ?? right.name) ?? Number.MAX_SAFE_INTEGER);
    if (relationDifference !== 0) return relationDifference;
    if (left.position !== undefined || right.position !== undefined) {
      return (left.position ?? 0) - (right.position ?? 0);
    }
    return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
  });
}

async function readTeacherNoticeEmailCronHeartbeatPostgresCatalog(
  sql: PostgresExecutor
): Promise<unknown | null> {
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
        'teacher_notice_email_cron_heartbeat',
        'teacher_notice_email_cron_heartbeat_schema_migrations'
      )
  `;
  if (relations.length !== heartbeatPostgresRelationOrder.length) return null;

  const columns = await sql<PostgresCatalogColumn[]>`
    SELECT relation.relname AS relation,
      attribute.attname AS name,
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
      ON attribute_default.adrelid = relation.oid
      AND attribute_default.adnum = attribute.attnum
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_cron_heartbeat',
        'teacher_notice_email_cron_heartbeat_schema_migrations'
      )
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  `;

  const constraints = await sql<PostgresCatalogConstraint[]>`
    SELECT relation.relname AS relation,
      constraint_record.conname AS name,
      constraint_record.contype::pg_catalog.text AS type,
      constraint_record.convalidated AS validated,
      constraint_record.condeferrable AS deferrable,
      constraint_record.condeferred AS "initiallyDeferred",
      backing_index.relname AS "backingIndexName",
      constraint_record.conrelid = relation.oid AS "relationOidMatches",
      CASE
        WHEN constraint_record.contype IN ('p', 'u') THEN
          constraint_record.conindid <> 0 AND backing_index_record.indrelid = relation.oid
        ELSE constraint_record.conindid = 0
      END AS "backingIndexOidMatches",
      CASE WHEN constraint_record.contype IN ('p', 'u') THEN COALESCE((
        SELECT pg_catalog.jsonb_agg(attribute.attname ORDER BY key_record.position)
        FROM pg_catalog.unnest(constraint_record.conkey)
          WITH ORDINALITY AS key_record(attnum, position)
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = relation.oid AND attribute.attnum = key_record.attnum
      ), '[]'::pg_catalog.jsonb) ELSE '[]'::pg_catalog.jsonb END AS "keyColumns",
      CASE WHEN constraint_record.contype = 'c'
        THEN pg_catalog.pg_get_expr(
          constraint_record.conbin,
          constraint_record.conrelid,
          false
        ) ELSE NULL END AS expression
    FROM pg_catalog.pg_constraint AS constraint_record
    JOIN pg_catalog.pg_class AS relation ON relation.oid = constraint_record.conrelid
    JOIN pg_catalog.pg_namespace AS relation_namespace
      ON relation_namespace.oid = relation.relnamespace
    LEFT JOIN pg_catalog.pg_class AS backing_index
      ON backing_index.oid = constraint_record.conindid
    LEFT JOIN pg_catalog.pg_index AS backing_index_record
      ON backing_index_record.indexrelid = constraint_record.conindid
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_cron_heartbeat',
        'teacher_notice_email_cron_heartbeat_schema_migrations'
      )
  `;

  const indexes = await sql<PostgresCatalogIndex[]>`
    SELECT table_class.relname AS relation,
      index_class.relname AS name,
      access_method.amname AS "accessMethod",
      index_record.indisvalid AS valid,
      index_record.indisready AS ready,
      index_record.indislive AS live,
      index_record.indisunique AS "unique",
      index_record.indisprimary AS "primary",
      index_record.indimmediate AS immediate,
      index_record.indpred IS NOT NULL AS partial,
      pg_catalog.pg_get_expr(index_record.indpred, index_record.indrelid, false) AS predicate,
      COALESCE((
        SELECT pg_catalog.jsonb_agg(attribute.attname ORDER BY key_record.position)
        FROM pg_catalog.unnest(index_record.indkey)
          WITH ORDINALITY AS key_record(attnum, position)
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
            'schema', collation_namespace.nspname,
            'name', index_collation.collname
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
    JOIN pg_catalog.pg_index AS index_record
      ON index_record.indrelid = table_class.oid
    JOIN pg_catalog.pg_class AS index_class
      ON index_class.oid = index_record.indexrelid
    JOIN pg_catalog.pg_namespace AS index_namespace
      ON index_namespace.oid = index_class.relnamespace
    JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_class.relam
    WHERE table_namespace.nspname = 'public'
      AND index_namespace.nspname = 'public'
      AND table_class.relname IN (
        'teacher_notice_email_cron_heartbeat',
        'teacher_notice_email_cron_heartbeat_schema_migrations'
      )
  `;

  const integrityRows = await sql<Array<{
    inheritanceCount: number;
    ruleCount: number;
    userTriggerCount: number;
  }>>`
    WITH target_relations AS (
      SELECT relation.oid
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS relation_namespace
        ON relation_namespace.oid = relation.relnamespace
      WHERE relation_namespace.nspname = 'public'
        AND relation.relname IN (
          'teacher_notice_email_cron_heartbeat',
          'teacher_notice_email_cron_heartbeat_schema_migrations'
        )
    )
    SELECT
      (SELECT pg_catalog.count(*)::pg_catalog.int4
        FROM pg_catalog.pg_trigger AS trigger_record
        WHERE trigger_record.tgrelid IN (SELECT oid FROM target_relations)
          AND NOT trigger_record.tgisinternal) AS "userTriggerCount",
      (SELECT pg_catalog.count(*)::pg_catalog.int4
        FROM pg_catalog.pg_rewrite AS rule_record
        WHERE rule_record.ev_class IN (SELECT oid FROM target_relations)) AS "ruleCount",
      (SELECT pg_catalog.count(*)::pg_catalog.int4
        FROM pg_catalog.pg_inherits AS inheritance_record
        WHERE inheritance_record.inhrelid IN (SELECT oid FROM target_relations)
          OR inheritance_record.inhparent IN (SELECT oid FROM target_relations))
        AS "inheritanceCount"
  `;
  const markerRows = await sql<Array<{ singleton: boolean; version: number }>>`
    SELECT singleton, version
    FROM public.teacher_notice_email_cron_heartbeat_schema_migrations
    ORDER BY singleton, version
  `;
  const comments = await sql<Array<{ marker: string | null }>>`
    SELECT pg_catalog.obj_description(
      pg_catalog.to_regclass(
        'public.teacher_notice_email_cron_heartbeat_schema_migrations'
      ),
      'pg_class'
    ) AS marker
  `;
  const integrity = integrityRows[0] ?? {
    inheritanceCount: -1,
    ruleCount: -1,
    userTriggerCount: -1
  };
  const expectedIndexes = new Set<string>(
    teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog.indexes.map(
      (entry) => entry.name
    )
  );
  return {
    relations: sortHeartbeatPostgresCatalogEntries(relations),
    columns: sortHeartbeatPostgresCatalogEntries(columns),
    constraints: sortHeartbeatPostgresCatalogEntries(constraints),
    indexes: sortHeartbeatPostgresCatalogEntries(indexes.map(
      ({ relationOidMatches: _relationOidMatches, ...entry }) => entry
    )),
    integrity: {
      relationOidCount: relations.length,
      columnCount: columns.length,
      constraintCount: constraints.length,
      indexCount: indexes.length,
      unexpectedIndexCount: indexes.filter((entry) => !expectedIndexes.has(entry.name)).length,
      userTriggerCount: integrity.userTriggerCount,
      ruleCount: integrity.ruleCount,
      inheritanceCount: integrity.inheritanceCount,
      constraintRelationOidsMatch: constraints.every((entry) => entry.relationOidMatches),
      constraintBackingIndexOidsMatch: constraints.every(
        (entry) => entry.backingIndexOidMatches
      ),
      indexRelationOidsMatch: indexes.every((entry) => entry.relationOidMatches)
    },
    markerComment: comments[0]?.marker ?? null,
    markerRows
  };
}

export async function attestTeacherNoticeEmailCronHeartbeatPostgresSchema(
  sql: PostgresExecutor
): Promise<boolean> {
  return attestTeacherNoticeEmailCronHeartbeatPostgresCatalog(
    await readTeacherNoticeEmailCronHeartbeatPostgresCatalog(sql)
  );
}

export async function inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(
  sql: PostgresExecutor
): Promise<"empty" | "v1" | "exact" | "partial"> {
  const relationCount = await teacherNoticeEmailCronHeartbeatPostgresOwnRelationCount(sql);
  if (relationCount === 0) return "empty";
  if (relationCount !== heartbeatPostgresRelationOrder.length) return "partial";
  const catalog = await readTeacherNoticeEmailCronHeartbeatPostgresCatalog(sql);
  if (attestTeacherNoticeEmailCronHeartbeatPostgresCatalog(catalog)) return "exact";
  if (attestTeacherNoticeEmailCronHeartbeatPostgresCatalogV1(catalog)) return "v1";
  return "partial";
}

export const teacherNoticeEmailCronHeartbeatPostgresRuntimeRelationLockStatements = [
  "LOCK TABLE public.teacher_notice_email_cron_heartbeat IN ROW EXCLUSIVE MODE",
  "LOCK TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations IN SHARE MODE"
] as const;

export const teacherNoticeEmailCronHeartbeatPostgresReadRelationLockStatements = [
  "LOCK TABLE public.teacher_notice_email_cron_heartbeat IN ROW SHARE MODE",
  "LOCK TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations IN SHARE MODE"
] as const;

async function configureTeacherNoticeEmailCronHeartbeatPostgresTransaction(
  sql: PostgresExecutor
): Promise<void> {
  await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
  await sql.unsafe("SET LOCAL lock_timeout = '1000ms'");
  await sql.unsafe("SET LOCAL statement_timeout = '5000ms'");
  await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '5000ms'");
}

async function lockTeacherNoticeEmailCronHeartbeatPostgresSchema(
  sql: PostgresExecutor,
  shared: boolean
): Promise<void> {
  if (shared) {
    await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
      pg_catalog.hashtextextended(
        ${teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace},
        0
      ))`;
  } else {
    await sql`SELECT pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        ${teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace},
        0
      ))`;
  }
}

async function teacherNoticeEmailCronHeartbeatPostgresOwnRelationCount(
  sql: PostgresExecutor
): Promise<number> {
  const rows = await sql<Array<{ relation_count: number }>>`
    SELECT pg_catalog.count(*)::pg_catalog.int4 AS relation_count
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'teacher_notice_email_cron_heartbeat',
        'teacher_notice_email_cron_heartbeat_schema_migrations'
      )
  `;
  return rows[0]?.relation_count ?? 0;
}

export async function migrateTeacherNoticeEmailCronHeartbeatPostgresSchema(
  client: postgres.Sql
): Promise<void> {
  await runTeacherNoticeEmailCronHeartbeatAtomicMigration<postgres.TransactionSql>({
    begin: async (operation) => {
      await client.begin(async (sql) => {
        await configureTeacherNoticeEmailCronHeartbeatPostgresTransaction(sql);
        await lockTeacherNoticeEmailCronHeartbeatPostgresSchema(sql, false);
        await operation(sql);
      });
    },
    inspect: async (sql) => {
      const relationCount = await teacherNoticeEmailCronHeartbeatPostgresOwnRelationCount(sql);
      if (relationCount === 0) return "empty";
      if (relationCount !== heartbeatPostgresRelationOrder.length) return "partial";
      await sql.unsafe(
        "LOCK TABLE public.teacher_notice_email_cron_heartbeat IN SHARE MODE"
      );
      await sql.unsafe(
        "LOCK TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations IN SHARE MODE"
      );
      return inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
    },
    migrate: async (sql, state) => {
      const statements = state === "v1"
        ? teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements
        : teacherNoticeEmailCronHeartbeatPostgresSchemaStatements;
      for (const statement of statements) {
        await sql.unsafe(statement);
      }
    },
    attest: attestTeacherNoticeEmailCronHeartbeatPostgresSchema
  });
}

async function recordTeacherNoticeEmailCronHeartbeatPostgres(
  client: postgres.Sql,
  identity: TeacherNoticeEmailCronHeartbeatIdentity,
  status: TeacherNoticeEmailCronHeartbeatStatus
): Promise<void> {
  assertHeartbeatIdentity(identity);
  await client.begin((sql) =>
    runTeacherNoticeEmailCronHeartbeatPostgresAttestedTransaction({
      sql,
      configure: configureTeacherNoticeEmailCronHeartbeatPostgresTransaction,
      lockSchema: async (transactionSql) => {
        await lockTeacherNoticeEmailCronHeartbeatPostgresSchema(transactionSql, true);
      },
      lockRelations: async (transactionSql) => {
        for (const statement of
          teacherNoticeEmailCronHeartbeatPostgresRuntimeRelationLockStatements) {
          await transactionSql.unsafe(statement);
        }
      },
      attest: attestTeacherNoticeEmailCronHeartbeatPostgresSchema,
      operation: async (transactionSql) => {
        if (status === "started") {
          await transactionSql`
            INSERT INTO public.teacher_notice_email_cron_heartbeat (
              singleton, run_id, release_sha, status,
              started_at, completed_at, updated_at, last_failed_at
            ) VALUES (
              TRUE, ${identity.runId}, ${identity.releaseSha}, 'started',
              pg_catalog.clock_timestamp(), NULL, pg_catalog.clock_timestamp(), NULL
            )
            ON CONFLICT (singleton) DO UPDATE SET
              run_id = EXCLUDED.run_id,
              release_sha = EXCLUDED.release_sha,
              status = 'started',
              started_at = EXCLUDED.started_at,
              completed_at = NULL,
              updated_at = EXCLUDED.updated_at
          `;
          return;
        }
        const rows = await transactionSql<Array<{ singleton: boolean }>>`
          WITH transition AS (
            SELECT pg_catalog.clock_timestamp() AS occurred_at
          )
          UPDATE public.teacher_notice_email_cron_heartbeat AS heartbeat
          SET status = ${status},
              completed_at = transition.occurred_at,
              updated_at = transition.occurred_at,
              last_failed_at = CASE WHEN ${status} = 'failed'
                THEN transition.occurred_at ELSE heartbeat.last_failed_at END
          FROM transition
          WHERE heartbeat.singleton = TRUE
            AND heartbeat.run_id = ${identity.runId}
            AND heartbeat.release_sha = ${identity.releaseSha}
            AND heartbeat.status = 'started'
          RETURNING heartbeat.singleton
        `;
        if (rows.length !== 1 || rows[0]?.singleton !== true) {
          throw new Error("Teacher notice email cron heartbeat run is no longer current.");
        }
      }
    })
  );
}

export async function recordTeacherNoticeEmailCronHeartbeatStartedPostgres(
  client: postgres.Sql,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): Promise<void> {
  await recordTeacherNoticeEmailCronHeartbeatPostgres(client, identity, "started");
}

export async function recordTeacherNoticeEmailCronHeartbeatSucceededPostgres(
  client: postgres.Sql,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): Promise<void> {
  await recordTeacherNoticeEmailCronHeartbeatPostgres(client, identity, "succeeded");
}

export async function recordTeacherNoticeEmailCronHeartbeatFailedPostgres(
  client: postgres.Sql,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): Promise<void> {
  await recordTeacherNoticeEmailCronHeartbeatPostgres(client, identity, "failed");
}

type SqliteSchemaObject = {
  name: string;
  sql: string | null;
  table: string;
  type: string;
};

function readHeartbeatSqliteObjects(storage: DatabaseSync): SqliteSchemaObject[] {
  const placeholders = heartbeatSqliteObjectNames.map(() => "?").join(", ");
  return (storage.prepare(`
    SELECT type, name, tbl_name AS "table", sql
    FROM sqlite_master
    WHERE name IN (${placeholders}) OR tbl_name IN (${placeholders})
    ORDER BY name
  `).all(
    ...heartbeatSqliteObjectNames,
    ...heartbeatSqliteObjectNames
  ) as SqliteSchemaObject[]).map((row) => ({
    ...row,
    sql: normalizeTeacherNoticeSqliteSchemaSql(row.sql)
  }));
}

let expectedHeartbeatSqliteObjectsCache: SqliteSchemaObject[] | null = null;
let expectedHeartbeatSqliteObjectsV1Cache: SqliteSchemaObject[] | null = null;

function readExpectedHeartbeatSqliteObjects(schema: string): SqliteSchemaObject[] {
  const storage = new DatabaseSync(":memory:");
  try {
    storage.exec(schema);
    return readHeartbeatSqliteObjects(storage);
  } finally {
    storage.close();
  }
}

function expectedHeartbeatSqliteObjects(): SqliteSchemaObject[] {
  expectedHeartbeatSqliteObjectsCache ??=
    readExpectedHeartbeatSqliteObjects(teacherNoticeEmailCronHeartbeatSqliteSchema);
  return expectedHeartbeatSqliteObjectsCache;
}

function expectedHeartbeatSqliteObjectsV1(): SqliteSchemaObject[] {
  expectedHeartbeatSqliteObjectsV1Cache ??=
    readExpectedHeartbeatSqliteObjects(teacherNoticeEmailCronHeartbeatSqliteSchemaV1);
  return expectedHeartbeatSqliteObjectsV1Cache;
}

function sqliteTableColumns(storage: DatabaseSync, name: string) {
  return (storage.prepare(`PRAGMA table_xinfo('${name}')`).all() as Array<{
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
    hidden: number;
  }>).map((row) => [
    row.name,
    row.type,
    row.notnull,
    row.dflt_value,
    row.pk,
    row.hidden
  ]);
}

function attestTeacherNoticeEmailCronHeartbeatSqliteSchemaVersion(
  storage: DatabaseSync,
  version: 1 | 2
): boolean {
  try {
    if (
      JSON.stringify(readHeartbeatSqliteObjects(storage)) !==
      JSON.stringify(version === 1
        ? expectedHeartbeatSqliteObjectsV1()
        : expectedHeartbeatSqliteObjects())
    ) {
      return false;
    }
    if (
      JSON.stringify(sqliteTableColumns(storage, heartbeatTable)) !==
      JSON.stringify([
        ["singleton", "INTEGER", 0, null, 1, 0],
        ["run_id", "TEXT", 1, null, 0, 0],
        ["release_sha", "TEXT", 1, null, 0, 0],
        ["status", "TEXT", 1, null, 0, 0],
        ["started_at", "TEXT", 1, null, 0, 0],
        ["completed_at", "TEXT", 0, null, 0, 0],
        ["updated_at", "TEXT", 1, null, 0, 0],
        ...(version === 2
          ? [["last_failed_at", "TEXT", 0, null, 0, 0]]
          : [])
      ]) ||
      JSON.stringify(sqliteTableColumns(storage, heartbeatMarkerTable)) !==
      JSON.stringify([
        ["singleton", "INTEGER", 0, null, 1, 0],
        ["version", "INTEGER", 1, null, 0, 0],
        ["applied_at", "TEXT", 1, null, 0, 0]
      ])
    ) {
      return false;
    }
    const marker = storage.prepare(`
      SELECT singleton, version
      FROM teacher_notice_email_cron_heartbeat_schema_migrations
    `).all() as Array<{ singleton: number; version: number }>;
    return marker.length === 1 && marker[0]?.singleton === 1 &&
      marker[0]?.version === version;
  } catch {
    return false;
  }
}

export function attestTeacherNoticeEmailCronHeartbeatSqliteSchema(
  storage: DatabaseSync
): boolean {
  return attestTeacherNoticeEmailCronHeartbeatSqliteSchemaVersion(storage, 2);
}

function attestTeacherNoticeEmailCronHeartbeatSqliteSchemaV1(
  storage: DatabaseSync
): boolean {
  return attestTeacherNoticeEmailCronHeartbeatSqliteSchemaVersion(storage, 1);
}

function migrateTeacherNoticeEmailCronHeartbeatSqliteSchemaV1ToV2(
  storage: DatabaseSync
): void {
  storage.exec(`
    ALTER TABLE teacher_notice_email_cron_heartbeat
      RENAME TO teacher_notice_email_cron_heartbeat_v1_upgrade;
    ALTER TABLE teacher_notice_email_cron_heartbeat_schema_migrations
      RENAME TO teacher_notice_email_cron_heartbeat_schema_migrations_v1_upgrade;
    ${teacherNoticeEmailCronHeartbeatSqliteSchema}
    INSERT INTO teacher_notice_email_cron_heartbeat (
      singleton, run_id, release_sha, status, started_at, completed_at, updated_at,
      last_failed_at
    )
    SELECT singleton, run_id, release_sha, status, started_at, completed_at, updated_at,
      CASE WHEN status = 'failed' THEN completed_at ELSE NULL END
    FROM teacher_notice_email_cron_heartbeat_v1_upgrade;
    DROP TABLE teacher_notice_email_cron_heartbeat_v1_upgrade;
    DROP TABLE teacher_notice_email_cron_heartbeat_schema_migrations_v1_upgrade;
  `);
}

export function migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(
  storage: DatabaseSync
): void {
  storage.exec("BEGIN IMMEDIATE");
  try {
    const placeholders = heartbeatSqliteObjectNames.map(() => "?").join(", ");
    const relationCount = Number((storage.prepare(`
      SELECT count(*) AS count
      FROM sqlite_master
      WHERE type IN ('table', 'view') AND name IN (${placeholders})
    `).get(...heartbeatSqliteObjectNames) as { count: number }).count);
    if (relationCount === heartbeatSqliteObjectNames.length) {
      if (attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)) {
        storage.exec("COMMIT");
        return;
      }
      if (attestTeacherNoticeEmailCronHeartbeatSqliteSchemaV1(storage)) {
        migrateTeacherNoticeEmailCronHeartbeatSqliteSchemaV1ToV2(storage);
      } else {
        throw new Error(
          "Teacher notice email cron heartbeat partial or malformed schema was rejected."
        );
      }
      if (!attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)) {
        throw new Error("Teacher notice email cron heartbeat schema v2 could not be attested.");
      }
      storage.exec("COMMIT");
      return;
    }
    if (relationCount !== 0) {
      throw new Error(
        "Teacher notice email cron heartbeat partial or malformed schema was rejected."
      );
    }
    storage.exec(teacherNoticeEmailCronHeartbeatSqliteSchema);
    if (!attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)) {
      throw new Error("Teacher notice email cron heartbeat schema v2 could not be attested.");
    }
    storage.exec("COMMIT");
  } catch (error) {
    try {
      storage.exec("ROLLBACK");
    } catch {
      // Preserve the migration or attestation failure.
    }
    throw error;
  }
}

function assertHeartbeatIdentity(
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): void {
  if (
    !isTeacherNoticeEmailCronHeartbeatReleaseSha(identity.releaseSha) ||
    !isTeacherNoticeEmailCronHeartbeatRunId(identity.runId)
  ) {
    throw new Error("Teacher notice email cron heartbeat identity is invalid.");
  }
}

export function recordTeacherNoticeEmailCronHeartbeatStartedSqlite(
  storage: DatabaseSync,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): void {
  assertHeartbeatIdentity(identity);
  if (!attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)) {
    throw new Error("Teacher notice email cron heartbeat SQLite schema could not be attested.");
  }
  storage.prepare(`
    INSERT INTO teacher_notice_email_cron_heartbeat (
      singleton, run_id, release_sha, status, started_at, completed_at, updated_at,
      last_failed_at
    ) VALUES (
      1, ?, ?, 'started', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL,
      strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
    )
    ON CONFLICT(singleton) DO UPDATE SET
      run_id = excluded.run_id,
      release_sha = excluded.release_sha,
      status = 'started',
      started_at = excluded.started_at,
      completed_at = NULL,
      updated_at = excluded.updated_at
  `).run(identity.runId, identity.releaseSha);
}

function recordTeacherNoticeEmailCronHeartbeatTerminalSqlite(
  storage: DatabaseSync,
  identity: TeacherNoticeEmailCronHeartbeatIdentity,
  status: Exclude<TeacherNoticeEmailCronHeartbeatStatus, "started">
): void {
  assertHeartbeatIdentity(identity);
  if (!attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)) {
    throw new Error("Teacher notice email cron heartbeat SQLite schema could not be attested.");
  }
  const result = storage.prepare(`
    UPDATE teacher_notice_email_cron_heartbeat
    SET status = ?,
        completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        last_failed_at = CASE WHEN ? = 'failed'
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE last_failed_at END
    WHERE singleton = 1 AND run_id = ? AND release_sha = ? AND status = 'started'
  `).run(status, status, identity.runId, identity.releaseSha);
  if (Number(result.changes) !== 1) {
    throw new Error("Teacher notice email cron heartbeat run is no longer current.");
  }
}

export function recordTeacherNoticeEmailCronHeartbeatSucceededSqlite(
  storage: DatabaseSync,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): void {
  recordTeacherNoticeEmailCronHeartbeatTerminalSqlite(storage, identity, "succeeded");
}

export function recordTeacherNoticeEmailCronHeartbeatFailedSqlite(
  storage: DatabaseSync,
  identity: TeacherNoticeEmailCronHeartbeatIdentity
): void {
  recordTeacherNoticeEmailCronHeartbeatTerminalSqlite(storage, identity, "failed");
}
