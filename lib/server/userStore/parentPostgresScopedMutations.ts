import type {
  ParentMessageMutationScope,
  ParentMessagePersistenceDatabase
} from "@/lib/server/userStore/parentMessagePersistence";
import type {
  ParentNoticeMutationScope,
  ParentNoticePersistenceDatabase
} from "@/lib/server/userStore/parentNoticePersistence";

type JsonRecord = Record<string, unknown>;

export interface ParentPostgresSql {
  <T extends readonly JsonRecord[] = JsonRecord[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  json(value: unknown): unknown;
}

export type ParentPostgresClient = ParentPostgresSql & {
  begin<T>(operation: (transaction: ParentPostgresSql) => Promise<T>): Promise<T>;
};

type ParentPostgresStateIdentity = {
  id: string;
  tenantId: string;
  stateKind: string;
  schemaVersion: number;
};

type ParentPostgresScopedMutationAdapterDependencies = {
  ensureSchema: () => Promise<void>;
  getClient: () => ParentPostgresClient;
  state: ParentPostgresStateIdentity;
};

type ScopedRow = Record<string, unknown>;

function arrayField<T>(row: ScopedRow, field: string): T[] {
  const value = row[field];
  if (!Array.isArray(value)) {
    throw new Error(`Parent Postgres scoped state field ${field} is unavailable.`);
  }
  return value as T[];
}

function assertScopedSchema(row: ScopedRow, area: "message" | "notice") {
  if (row.schema_valid !== true) {
    throw new Error(`Parent ${area} Postgres scoped state schema is unavailable.`);
  }
}

function isActiveParentRecord(
  record: { id: string; role: string },
  parentId: string
) {
  const disabledAt = (record as { disabled_at?: unknown }).disabled_at;
  return record.id === parentId &&
    record.role === "parent" &&
    (disabledAt === undefined || disabledAt === null || disabledAt === "");
}

function unfilteredMessageDatabaseFromRow(row: ScopedRow): ParentMessagePersistenceDatabase {
  return {
    users: arrayField(row, "users"),
    student_profiles: arrayField(row, "student_profiles"),
    guardian_links: arrayField(row, "guardian_links"),
    class_enrollments: arrayField(row, "class_enrollments"),
    teacher_classes: arrayField(row, "teacher_classes"),
    school_memberships: arrayField(row, "school_memberships"),
    teacher_reports: arrayField(row, "teacher_reports"),
    teacher_messages: arrayField(row, "teacher_messages"),
    teacher_message_entries: arrayField(row, "teacher_message_entries")
  };
}

function messageDatabaseFromRow(
  row: ScopedRow,
  scope: ParentMessageMutationScope
): ParentMessagePersistenceDatabase {
  const database = unfilteredMessageDatabaseFromRow(row);
  if (scope.kind === "create") {
    const teacherClasses = database.teacher_classes.filter((record) => record.id === scope.classId);
    const reports = (database.teacher_reports ?? []).filter((record) => (
      scope.reportId !== null && record.id === scope.reportId
    ));
    const threads = database.teacher_messages.filter((record) => (
      record.guardian_id === scope.parentId &&
      record.parent_idempotency_key_hash === scope.idempotencyKeyHash
    ));
    const threadIds = new Set(threads.map((record) => record.id));
    const entries = database.teacher_message_entries.filter((record) => threadIds.has(record.thread_id));
    const teacherIds = new Set([
      ...teacherClasses.map((record) => record.teacher_id),
      ...reports.map((record) => record.generated_by).filter((id): id is string => Boolean(id)),
      ...threads.map((record) => record.teacher_id)
    ]);
    const profileIds = new Set([
      scope.parentId,
      scope.studentId,
      ...teacherIds,
      ...entries.map((record) => record.sender_id)
    ]);
    return {
      users: database.users.filter((record) => (
        record.id === scope.parentId
          ? isActiveParentRecord(record, scope.parentId)
          : teacherIds.has(record.id)
      )),
      student_profiles: (database.student_profiles ?? []).filter((record) => profileIds.has(record.user_id)),
      guardian_links: database.guardian_links.filter((record) => (
        record.parent_id === scope.parentId && record.student_id === scope.studentId
      )),
      class_enrollments: database.class_enrollments.filter((record) => (
        record.class_id === scope.classId && record.student_id === scope.studentId
      )),
      teacher_classes: teacherClasses,
      school_memberships: (database.school_memberships ?? []).filter((record) => (
        record.class_id === scope.classId && teacherIds.has(record.user_id)
      )),
      teacher_reports: reports,
      teacher_messages: threads,
      teacher_message_entries: entries
    };
  }

  const threads = database.teacher_messages.filter((record) => (
    record.id === scope.threadId && record.guardian_id === scope.parentId
  ));
  const threadIds = new Set(threads.map((record) => record.id));
  const studentIds = new Set(threads.map((record) => record.student_id));
  const classIds = new Set(threads.flatMap((record) => record.class_id ? [record.class_id] : []));
  const teacherIds = new Set(threads.map((record) => record.teacher_id));
  const entries = database.teacher_message_entries.filter((record) => threadIds.has(record.thread_id));
  const profileIds = new Set([
    scope.parentId,
    ...studentIds,
    ...teacherIds,
    ...entries.map((record) => record.sender_id)
  ]);
  return {
    users: database.users.filter((record) => (
      record.id === scope.parentId
        ? isActiveParentRecord(record, scope.parentId)
        : teacherIds.has(record.id)
    )),
    student_profiles: (database.student_profiles ?? []).filter((record) => profileIds.has(record.user_id)),
    guardian_links: database.guardian_links.filter((record) => (
      record.parent_id === scope.parentId && studentIds.has(record.student_id)
    )),
    class_enrollments: database.class_enrollments.filter((record) => (
      classIds.has(record.class_id) && studentIds.has(record.student_id)
    )),
    teacher_classes: database.teacher_classes.filter((record) => classIds.has(record.id)),
    school_memberships: (database.school_memberships ?? []).filter((record) => (
      Boolean(record.class_id) &&
      classIds.has(record.class_id as string) &&
      teacherIds.has(record.user_id)
    )),
    teacher_reports: [],
    teacher_messages: threads,
    teacher_message_entries: entries
  };
}

function unfilteredNoticeDatabaseFromRow(row: ScopedRow): ParentNoticePersistenceDatabase {
  return {
    users: arrayField(row, "users"),
    student_profiles: arrayField(row, "student_profiles"),
    guardian_links: arrayField(row, "guardian_links"),
    teacher_classes: arrayField(row, "teacher_classes"),
    teacher_notice_delivery_attempts: arrayField(row, "teacher_notice_delivery_attempts"),
    teacher_notice_recipients: arrayField(row, "teacher_notice_recipients"),
    teacher_notices: arrayField(row, "teacher_notices"),
    teacher_review_lessons: arrayField(row, "teacher_review_lessons")
  };
}

function noticeDatabaseFromRow(
  row: ScopedRow,
  scope: ParentNoticeMutationScope
): ParentNoticePersistenceDatabase {
  const database = unfilteredNoticeDatabaseFromRow(row);
  const recipients = database.teacher_notice_recipients.filter((record) => (
    record.id === scope.recipientId && record.guardian_id === scope.parentId
  ));
  const studentIds = new Set(recipients.map((record) => record.student_id));
  const noticeIds = new Set(recipients.map((record) => record.notice_id));
  return {
    users: database.users.filter((record) => isActiveParentRecord(record, scope.parentId)),
    student_profiles: [],
    guardian_links: database.guardian_links.filter((record) => (
      record.parent_id === scope.parentId && studentIds.has(record.student_id)
    )),
    teacher_classes: [],
    teacher_notice_delivery_attempts: [],
    teacher_notice_recipients: recipients,
    teacher_notices: database.teacher_notices.filter((record) => noticeIds.has(record.id)),
    teacher_review_lessons: []
  };
}

function serialized(value: unknown) {
  return JSON.stringify(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertSame(label: string, before: unknown, after: unknown) {
  if (serialized(before) !== serialized(after)) {
    throw new Error(`Parent Postgres scoped mutation changed forbidden ${label}.`);
  }
}

function assertSynchronousMutation(value: unknown) {
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  ) {
    throw new Error("Parent Postgres scoped mutations must not await provider or transport I/O.");
  }
}

function messageOtherCollections(database: ParentMessagePersistenceDatabase) {
  return {
    users: database.users,
    student_profiles: database.student_profiles,
    guardian_links: database.guardian_links,
    class_enrollments: database.class_enrollments,
    teacher_classes: database.teacher_classes,
    school_memberships: database.school_memberships,
    teacher_reports: database.teacher_reports
  };
}

function noticeOtherCollections(database: ParentNoticePersistenceDatabase) {
  return {
    users: database.users,
    student_profiles: database.student_profiles,
    guardian_links: database.guardian_links,
    teacher_classes: database.teacher_classes,
    teacher_notice_delivery_attempts: database.teacher_notice_delivery_attempts,
    teacher_review_lessons: database.teacher_review_lessons
  };
}

async function lockParentStateRow(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity
) {
  const rows = await sql<Array<{ id: string }>>`
    /* parent_state_scope_lock */
    SELECT state.id
    FROM app_state AS state
    WHERE state.id = ${state.id}
      AND state.tenant_id = ${state.tenantId}
      AND state.state_kind = ${state.stateKind}
      AND state.schema_version = ${state.schemaVersion}
    FOR UPDATE
  `;
  if (rows.length !== 1) {
    throw new Error("Parent Postgres state marker is unavailable.");
  }
}

async function loadCreateScope(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: Extract<ParentMessageMutationScope, { kind: "create" }>
) {
  const reportId = scope.reportId ?? "";
  const rows = await sql<ScopedRow[]>`
    /* parent_message_create_scope */
    WITH scoped_state AS (
      SELECT state.payload AS scoped_payload
      FROM app_state AS state
      WHERE state.id = ${state.id}
        AND state.tenant_id = ${state.tenantId}
        AND state.state_kind = ${state.stateKind}
        AND state.schema_version = ${state.schemaVersion}
    ),
    class_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_classes') AS records(record)
      WHERE record->>'id' = ${scope.classId}
    ),
    report_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_reports') AS records(record)
      WHERE record->>'id' = ${reportId}
    ),
    thread_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_messages') AS records(record)
      WHERE record->>'guardian_id' = ${scope.parentId}
        AND record->>'parent_idempotency_key_hash' = ${scope.idempotencyKeyHash}
    ),
    relevant_teacher_ids AS (
      SELECT record->>'teacher_id' AS teacher_id FROM class_records
      UNION
      SELECT record->>'generated_by' AS teacher_id FROM report_records
      UNION
      SELECT record->>'teacher_id' AS teacher_id FROM thread_records
    ),
    entry_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_message_entries') AS records(record)
      WHERE record->>'thread_id' IN (SELECT record->>'id' FROM thread_records)
    )
    SELECT
      (
        jsonb_typeof(scoped_state.scoped_payload->'users') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'student_profiles') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'guardian_links') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'class_enrollments') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_classes') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'school_memberships') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_reports') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_messages') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_message_entries') = 'array'
      ) AS schema_valid,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'users') AS records(record)
        WHERE (
            record->>'id' = ${scope.parentId}
            AND record->>'role' = 'parent'
            AND COALESCE(record->>'disabled_at', '') = ''
          )
          OR (
            record->>'id' <> ${scope.parentId}
            AND record->>'id' IN (SELECT teacher_id FROM relevant_teacher_ids)
          )
      ), '[]'::jsonb) AS users,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'student_profiles') AS records(record)
        WHERE record->>'user_id' IN (
          SELECT ${scope.parentId}::text
          UNION SELECT ${scope.studentId}::text
          UNION SELECT teacher_id FROM relevant_teacher_ids
          UNION SELECT record->>'sender_id' FROM entry_records
        )
      ), '[]'::jsonb) AS student_profiles,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'guardian_links') AS records(record)
        WHERE record->>'parent_id' = ${scope.parentId}
          AND record->>'student_id' = ${scope.studentId}
      ), '[]'::jsonb) AS guardian_links,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'class_enrollments') AS records(record)
        WHERE record->>'class_id' = ${scope.classId}
          AND record->>'student_id' = ${scope.studentId}
      ), '[]'::jsonb) AS class_enrollments,
      COALESCE((SELECT jsonb_agg(record) FROM class_records), '[]'::jsonb) AS teacher_classes,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'school_memberships') AS records(record)
        WHERE record->>'class_id' = ${scope.classId}
          AND record->>'user_id' IN (SELECT teacher_id FROM relevant_teacher_ids)
      ), '[]'::jsonb) AS school_memberships,
      COALESCE((SELECT jsonb_agg(record) FROM report_records), '[]'::jsonb) AS teacher_reports,
      COALESCE((SELECT jsonb_agg(record) FROM thread_records), '[]'::jsonb) AS teacher_messages,
      COALESCE((SELECT jsonb_agg(record) FROM entry_records), '[]'::jsonb) AS teacher_message_entries
    FROM scoped_state
  `;
  if (rows.length !== 1) {
    throw new Error("Parent message Postgres state marker is unavailable.");
  }
  assertScopedSchema(rows[0], "message");
  return messageDatabaseFromRow(rows[0], scope);
}

async function loadReplyScope(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: Extract<ParentMessageMutationScope, { kind: "reply" }>
) {
  const rows = await sql<ScopedRow[]>`
    /* parent_message_reply_scope */
    WITH scoped_state AS (
      SELECT state.payload AS scoped_payload
      FROM app_state AS state
      WHERE state.id = ${state.id}
        AND state.tenant_id = ${state.tenantId}
        AND state.state_kind = ${state.stateKind}
        AND state.schema_version = ${state.schemaVersion}
    ),
    thread_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_messages') AS records(record)
      WHERE record->>'id' = ${scope.threadId}
        AND record->>'guardian_id' = ${scope.parentId}
    ),
    entry_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_message_entries') AS records(record)
      WHERE record->>'thread_id' IN (SELECT record->>'id' FROM thread_records)
    ),
    thread_context AS (
      SELECT
        record->>'student_id' AS student_id,
        record->>'class_id' AS class_id,
        record->>'teacher_id' AS teacher_id
      FROM thread_records
    )
    SELECT
      (
        jsonb_typeof(scoped_state.scoped_payload->'users') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'student_profiles') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'guardian_links') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'class_enrollments') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_classes') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'school_memberships') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_reports') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_messages') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_message_entries') = 'array'
      ) AS schema_valid,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'users') AS records(record)
        WHERE (
            record->>'id' = ${scope.parentId}
            AND record->>'role' = 'parent'
            AND COALESCE(record->>'disabled_at', '') = ''
          )
          OR (
            record->>'id' <> ${scope.parentId}
            AND record->>'id' IN (SELECT teacher_id FROM thread_context)
          )
      ), '[]'::jsonb) AS users,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'student_profiles') AS records(record)
        WHERE record->>'user_id' = ${scope.parentId}
          OR record->>'user_id' IN (SELECT student_id FROM thread_context)
          OR record->>'user_id' IN (SELECT teacher_id FROM thread_context)
          OR record->>'user_id' IN (SELECT record->>'sender_id' FROM entry_records)
      ), '[]'::jsonb) AS student_profiles,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'guardian_links') AS records(record)
        WHERE record->>'parent_id' = ${scope.parentId}
          AND record->>'student_id' IN (SELECT student_id FROM thread_context)
      ), '[]'::jsonb) AS guardian_links,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'class_enrollments') AS records(record)
        WHERE (record->>'class_id', record->>'student_id') IN (
          SELECT class_id, student_id FROM thread_context
        )
      ), '[]'::jsonb) AS class_enrollments,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'teacher_classes') AS records(record)
        WHERE record->>'id' IN (SELECT class_id FROM thread_context)
      ), '[]'::jsonb) AS teacher_classes,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'school_memberships') AS records(record)
        WHERE (record->>'class_id', record->>'user_id') IN (
          SELECT class_id, teacher_id FROM thread_context
        )
      ), '[]'::jsonb) AS school_memberships,
      '[]'::jsonb AS teacher_reports,
      COALESCE((SELECT jsonb_agg(record) FROM thread_records), '[]'::jsonb) AS teacher_messages,
      COALESCE((SELECT jsonb_agg(record ORDER BY record->>'created_at', record->>'id') FROM entry_records), '[]'::jsonb) AS teacher_message_entries
    FROM scoped_state
  `;
  if (rows.length !== 1) {
    throw new Error("Parent message Postgres state marker is unavailable.");
  }
  assertScopedSchema(rows[0], "message");
  return messageDatabaseFromRow(rows[0], scope);
}

async function loadMessageScope(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: ParentMessageMutationScope
) {
  return scope.kind === "create"
    ? loadCreateScope(sql, state, scope)
    : loadReplyScope(sql, state, scope);
}

async function loadAckScope(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: ParentNoticeMutationScope
) {
  const rows = await sql<ScopedRow[]>`
    /* parent_notice_ack_scope */
    WITH scoped_state AS (
      SELECT state.payload AS scoped_payload
      FROM app_state AS state
      WHERE state.id = ${state.id}
        AND state.tenant_id = ${state.tenantId}
        AND state.state_kind = ${state.stateKind}
        AND state.schema_version = ${state.schemaVersion}
    ),
    recipient_records AS (
      SELECT record
      FROM scoped_state,
        LATERAL jsonb_array_elements(scoped_state.scoped_payload->'teacher_notice_recipients') AS records(record)
      WHERE record->>'id' = ${scope.recipientId}
        AND record->>'guardian_id' = ${scope.parentId}
    ),
    recipient_context AS (
      SELECT record->>'student_id' AS student_id, record->>'notice_id' AS notice_id
      FROM recipient_records
    )
    SELECT
      (
        jsonb_typeof(scoped_state.scoped_payload->'users') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'guardian_links') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_notice_recipients') = 'array'
        AND jsonb_typeof(scoped_state.scoped_payload->'teacher_notices') = 'array'
      ) AS schema_valid,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'users') AS records(record)
        WHERE record->>'id' = ${scope.parentId}
          AND record->>'role' = 'parent'
          AND COALESCE(record->>'disabled_at', '') = ''
      ), '[]'::jsonb) AS users,
      '[]'::jsonb AS student_profiles,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'guardian_links') AS records(record)
        WHERE record->>'parent_id' = ${scope.parentId}
          AND record->>'student_id' IN (SELECT student_id FROM recipient_context)
      ), '[]'::jsonb) AS guardian_links,
      '[]'::jsonb AS teacher_classes,
      '[]'::jsonb AS teacher_notice_delivery_attempts,
      COALESCE((SELECT jsonb_agg(record) FROM recipient_records), '[]'::jsonb) AS teacher_notice_recipients,
      COALESCE((
        SELECT jsonb_agg(record)
        FROM jsonb_array_elements(scoped_state.scoped_payload->'teacher_notices') AS records(record)
        WHERE record->>'id' IN (SELECT notice_id FROM recipient_context)
      ), '[]'::jsonb) AS teacher_notices,
      '[]'::jsonb AS teacher_review_lessons
    FROM scoped_state
  `;
  if (rows.length !== 1) {
    throw new Error("Parent notice Postgres state marker is unavailable.");
  }
  assertScopedSchema(rows[0], "notice");
  return noticeDatabaseFromRow(rows[0], scope);
}

async function upsertMessageProjection(
  sql: ParentPostgresSql,
  thread: ParentMessagePersistenceDatabase["teacher_messages"][number]
) {
  await sql`
    /* parent_message_projection_upsert */
    INSERT INTO projection_teacher_messages (
      id,
      teacher_id,
      class_id,
      student_id,
      status,
      priority,
      last_message_at,
      record
    ) VALUES (
      ${thread.id},
      ${thread.teacher_id},
      ${thread.class_id ?? null},
      ${thread.student_id},
      ${thread.status},
      ${thread.priority},
      ${thread.last_message_at},
      ${sql.json(thread)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      teacher_id = excluded.teacher_id,
      class_id = excluded.class_id,
      student_id = excluded.student_id,
      status = excluded.status,
      priority = excluded.priority,
      last_message_at = excluded.last_message_at,
      record = excluded.record
  `;
}

async function patchCreatedMessage(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: Extract<ParentMessageMutationScope, { kind: "create" }>,
  thread: ParentMessagePersistenceDatabase["teacher_messages"][number],
  entry: ParentMessagePersistenceDatabase["teacher_message_entries"][number]
) {
  const rows = await sql<Array<{ id: string }>>`
    /* parent_message_state_patch */
    UPDATE app_state AS state
    SET payload = jsonb_set(
          jsonb_set(
            state.payload,
            '{teacher_messages}',
            jsonb_build_array(${sql.json(thread)}::jsonb) || (state.payload->'teacher_messages'),
            FALSE
          ),
          '{teacher_message_entries}',
          (state.payload->'teacher_message_entries') || jsonb_build_array(${sql.json(entry)}::jsonb),
          FALSE
        ),
        revision = revision + 1,
        updated_at = ${thread.last_message_at}
    WHERE state.id = ${state.id}
      AND state.tenant_id = ${state.tenantId}
      AND state.state_kind = ${state.stateKind}
      AND state.schema_version = ${state.schemaVersion}
      AND jsonb_typeof(state.payload->'teacher_messages') = 'array'
      AND jsonb_typeof(state.payload->'teacher_message_entries') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'users') AS records(record)
        WHERE record->>'id' = ${scope.parentId}
          AND record->>'role' = 'parent'
          AND COALESCE(record->>'disabled_at', '') = ''
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'teacher_messages') AS records(record)
        WHERE record->>'id' = ${thread.id}
          OR (
            record->>'guardian_id' = ${scope.parentId}
            AND record->>'parent_idempotency_key_hash' = ${scope.idempotencyKeyHash}
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'teacher_message_entries') AS records(record)
        WHERE record->>'id' = ${entry.id}
      )
    RETURNING state.id
  `;
  if (rows.length !== 1) {
    throw new Error("Parent message create state patch was not committed.");
  }
  await upsertMessageProjection(sql, thread);
}

async function patchMessageReply(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: Extract<ParentMessageMutationScope, { kind: "reply" }>,
  thread: ParentMessagePersistenceDatabase["teacher_messages"][number],
  entry: ParentMessagePersistenceDatabase["teacher_message_entries"][number]
) {
  const rows = await sql<Array<{ id: string }>>`
    /* parent_message_state_patch */
    UPDATE app_state AS state
    SET payload = jsonb_set(
          jsonb_set(
            state.payload,
            '{teacher_messages}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN record->>'id' = ${thread.id}
                    THEN record || jsonb_build_object(
                      'latest_message', ${thread.latest_message}::text,
                      'status', ${thread.status}::text,
                      'last_message_at', ${thread.last_message_at}::text
                    )
                  ELSE record
                END
                ORDER BY ordinal
              )
              FROM jsonb_array_elements(state.payload->'teacher_messages')
                WITH ORDINALITY AS records(record, ordinal)
            ),
            FALSE
          ),
          '{teacher_message_entries}',
          (state.payload->'teacher_message_entries') || jsonb_build_array(${sql.json(entry)}::jsonb),
          FALSE
        ),
        revision = revision + 1,
        updated_at = ${thread.last_message_at}
    WHERE state.id = ${state.id}
      AND state.tenant_id = ${state.tenantId}
      AND state.state_kind = ${state.stateKind}
      AND state.schema_version = ${state.schemaVersion}
      AND jsonb_typeof(state.payload->'teacher_messages') = 'array'
      AND jsonb_typeof(state.payload->'teacher_message_entries') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'users') AS records(record)
        WHERE record->>'id' = ${scope.parentId}
          AND record->>'role' = 'parent'
          AND COALESCE(record->>'disabled_at', '') = ''
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'teacher_messages') AS records(record)
        WHERE record->>'id' = ${scope.threadId}
          AND record->>'guardian_id' = ${scope.parentId}
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'teacher_message_entries') AS records(record)
        WHERE record->>'id' = ${entry.id}
          OR (
            record->>'thread_id' = ${scope.threadId}
            AND record->>'sender_id' = ${scope.parentId}
            AND record->>'parent_idempotency_key_hash' = ${scope.idempotencyKeyHash}
          )
      )
    RETURNING state.id
  `;
  if (rows.length !== 1) {
    throw new Error("Parent message reply state patch was not committed.");
  }
  await upsertMessageProjection(sql, thread);
}

function assertOnlyAllowedReplyThreadFieldsChanged(
  before: ParentMessagePersistenceDatabase["teacher_messages"][number],
  after: ParentMessagePersistenceDatabase["teacher_messages"][number]
) {
  const allowed = {
    ...before,
    latest_message: after.latest_message,
    status: after.status,
    last_message_at: after.last_message_at
  };
  assertSame("parent message thread fields", allowed, after);
}

function assertCreatedMessageDelta(
  scope: Extract<ParentMessageMutationScope, { kind: "create" }>,
  thread: ParentMessagePersistenceDatabase["teacher_messages"][number],
  entry: ParentMessagePersistenceDatabase["teacher_message_entries"][number]
) {
  if (
    thread.guardian_id !== scope.parentId ||
    thread.student_id !== scope.studentId ||
    thread.class_id !== scope.classId ||
    thread.parent_idempotency_key_hash !== scope.idempotencyKeyHash ||
    entry.thread_id !== thread.id ||
    entry.sender_id !== scope.parentId ||
    entry.sender_role !== "parent" ||
    entry.recipient_id !== thread.teacher_id ||
    entry.created_at !== thread.created_at
  ) {
    throw new Error("Parent message create delta escaped its authorized scope.");
  }
}

function assertReplyEntryDelta(
  scope: Extract<ParentMessageMutationScope, { kind: "reply" }>,
  thread: ParentMessagePersistenceDatabase["teacher_messages"][number],
  entry: ParentMessagePersistenceDatabase["teacher_message_entries"][number]
) {
  if (
    thread.id !== scope.threadId ||
    thread.guardian_id !== scope.parentId ||
    thread.status !== "unread" ||
    entry.thread_id !== scope.threadId ||
    entry.sender_id !== scope.parentId ||
    entry.sender_role !== "parent" ||
    entry.recipient_id !== thread.teacher_id ||
    entry.parent_idempotency_key_hash !== scope.idempotencyKeyHash ||
    entry.created_at !== thread.last_message_at
  ) {
    throw new Error("Parent message reply delta escaped its authorized scope.");
  }
}

async function persistMessageDelta(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: ParentMessageMutationScope,
  before: ParentMessagePersistenceDatabase,
  after: ParentMessagePersistenceDatabase
) {
  assertSame("parent message authorization collections", messageOtherCollections(before), messageOtherCollections(after));
  const beforeThreadIds = new Set(before.teacher_messages.map((record) => record.id));
  const beforeEntryIds = new Set(before.teacher_message_entries.map((record) => record.id));
  const addedThreads = after.teacher_messages.filter((record) => !beforeThreadIds.has(record.id));
  const addedEntries = after.teacher_message_entries.filter((record) => !beforeEntryIds.has(record.id));

  if (scope.kind === "create") {
    if (!addedThreads.length && !addedEntries.length) {
      assertSame("existing parent message threads", before.teacher_messages, after.teacher_messages);
      assertSame("existing parent message entries", before.teacher_message_entries, after.teacher_message_entries);
      return;
    }
    if (
      addedThreads.length !== 1 ||
      addedEntries.length !== 1 ||
      after.teacher_messages.length !== before.teacher_messages.length + 1 ||
      after.teacher_message_entries.length !== before.teacher_message_entries.length + 1
    ) {
      throw new Error("Parent message create produced an invalid scoped delta.");
    }
    assertSame(
      "existing parent message threads",
      before.teacher_messages,
      after.teacher_messages.filter((record) => beforeThreadIds.has(record.id))
    );
    assertSame(
      "existing parent message entries",
      before.teacher_message_entries,
      after.teacher_message_entries.filter((record) => beforeEntryIds.has(record.id))
    );
    assertCreatedMessageDelta(scope, addedThreads[0], addedEntries[0]);
    await patchCreatedMessage(sql, state, scope, addedThreads[0], addedEntries[0]);
    return;
  }

  if (!addedEntries.length) {
    assertSame("parent message threads", before.teacher_messages, after.teacher_messages);
    assertSame("parent message entries", before.teacher_message_entries, after.teacher_message_entries);
    return;
  }
  if (
    addedThreads.length ||
    addedEntries.length !== 1 ||
    after.teacher_messages.length !== before.teacher_messages.length ||
    after.teacher_message_entries.length !== before.teacher_message_entries.length + 1
  ) {
    throw new Error("Parent message reply produced an invalid scoped delta.");
  }
  const beforeTarget = before.teacher_messages.find((record) => record.id === scope.threadId);
  const afterTarget = after.teacher_messages.find((record) => record.id === scope.threadId);
  if (!beforeTarget || !afterTarget) {
    throw new Error("Parent message reply target disappeared from the scoped state.");
  }
  assertOnlyAllowedReplyThreadFieldsChanged(beforeTarget, afterTarget);
  assertSame(
    "unrelated parent message threads",
    before.teacher_messages.filter((record) => record.id !== scope.threadId),
    after.teacher_messages.filter((record) => record.id !== scope.threadId)
  );
  assertSame(
    "existing parent message entries",
    before.teacher_message_entries,
    after.teacher_message_entries.filter((record) => beforeEntryIds.has(record.id))
  );
  assertReplyEntryDelta(scope, afterTarget, addedEntries[0]);
  await patchMessageReply(sql, state, scope, afterTarget, addedEntries[0]);
}

async function patchNoticeAck(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: ParentNoticeMutationScope,
  recipient: ParentNoticePersistenceDatabase["teacher_notice_recipients"][number],
  notice: ParentNoticePersistenceDatabase["teacher_notices"][number] | undefined
) {
  const rows = await sql<Array<{ id: string }>>`
    /* parent_notice_state_patch */
    UPDATE app_state AS state
    SET payload = jsonb_set(
          jsonb_set(
            state.payload,
            '{teacher_notice_recipients}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN record->>'id' = ${recipient.id}
                    THEN record || jsonb_build_object(
                      'status', ${recipient.status}::text,
                      'acknowledged_by', ${recipient.acknowledged_by ?? null}::text,
                      'acknowledged_at', ${recipient.acknowledged_at}::text
                    )
                  ELSE record
                END
                ORDER BY ordinal
              )
              FROM jsonb_array_elements(state.payload->'teacher_notice_recipients')
                WITH ORDINALITY AS records(record, ordinal)
            ),
            FALSE
          ),
          '{teacher_notices}',
          COALESCE(
            (
              SELECT jsonb_agg(
                CASE
                  WHEN record->>'id' = ${recipient.notice_id}
                    THEN record || jsonb_build_object('updated_at', ${notice?.updated_at ?? recipient.acknowledged_at}::text)
                  ELSE record
                END
                ORDER BY ordinal
              )
              FROM jsonb_array_elements(state.payload->'teacher_notices')
                WITH ORDINALITY AS records(record, ordinal)
            ),
            state.payload->'teacher_notices'
          ),
          FALSE
        ),
        revision = revision + 1,
        updated_at = ${recipient.acknowledged_at}
    WHERE state.id = ${state.id}
      AND state.tenant_id = ${state.tenantId}
      AND state.state_kind = ${state.stateKind}
      AND state.schema_version = ${state.schemaVersion}
      AND jsonb_typeof(state.payload->'teacher_notice_recipients') = 'array'
      AND jsonb_typeof(state.payload->'teacher_notices') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'users') AS records(record)
        WHERE record->>'id' = ${scope.parentId}
          AND record->>'role' = 'parent'
          AND COALESCE(record->>'disabled_at', '') = ''
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'guardian_links') AS records(record)
        WHERE record->>'parent_id' = ${scope.parentId}
          AND record->>'student_id' = ${recipient.student_id}
          AND record->>'status' = 'active'
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(state.payload->'teacher_notice_recipients') AS records(record)
        WHERE record->>'id' = ${scope.recipientId}
          AND record->>'guardian_id' = ${scope.parentId}
      )
    RETURNING state.id
  `;
  if (rows.length !== 1) {
    throw new Error("Parent notice acknowledgement state patch was not committed.");
  }
}

function assertOnlyAllowedRecipientFieldsChanged(
  before: ParentNoticePersistenceDatabase["teacher_notice_recipients"][number],
  after: ParentNoticePersistenceDatabase["teacher_notice_recipients"][number]
) {
  assertSame("parent notice recipient fields", {
    ...before,
    status: after.status,
    acknowledged_by: after.acknowledged_by,
    acknowledged_at: after.acknowledged_at
  }, after);
}

async function persistNoticeDelta(
  sql: ParentPostgresSql,
  state: ParentPostgresStateIdentity,
  scope: ParentNoticeMutationScope,
  before: ParentNoticePersistenceDatabase,
  after: ParentNoticePersistenceDatabase
) {
  assertSame("parent notice authorization collections", noticeOtherCollections(before), noticeOtherCollections(after));
  const beforeRecipient = before.teacher_notice_recipients.find((record) => record.id === scope.recipientId);
  const afterRecipient = after.teacher_notice_recipients.find((record) => record.id === scope.recipientId);
  if (!beforeRecipient || !afterRecipient) {
    assertSame("parent notice recipients", before.teacher_notice_recipients, after.teacher_notice_recipients);
    assertSame("parent notices", before.teacher_notices, after.teacher_notices);
    return;
  }
  const recipientChanged = serialized(beforeRecipient) !== serialized(afterRecipient);
  if (!recipientChanged) {
    assertSame("parent notice recipients", before.teacher_notice_recipients, after.teacher_notice_recipients);
    assertSame("parent notices", before.teacher_notices, after.teacher_notices);
    return;
  }
  assertOnlyAllowedRecipientFieldsChanged(beforeRecipient, afterRecipient);
  if (
    afterRecipient.guardian_id !== scope.parentId ||
    afterRecipient.status !== "acknowledged" ||
    afterRecipient.acknowledged_by !== scope.parentId ||
    !afterRecipient.acknowledged_at
  ) {
    throw new Error("Parent notice acknowledgement delta escaped its authorized scope.");
  }
  assertSame(
    "unrelated parent notice recipients",
    before.teacher_notice_recipients.filter((record) => record.id !== scope.recipientId),
    after.teacher_notice_recipients.filter((record) => record.id !== scope.recipientId)
  );
  const beforeNotice = before.teacher_notices.find((record) => record.id === afterRecipient.notice_id);
  const afterNotice = after.teacher_notices.find((record) => record.id === afterRecipient.notice_id);
  if (beforeNotice && afterNotice) {
    assertSame("parent notice fields", { ...beforeNotice, updated_at: afterNotice.updated_at }, afterNotice);
    if (afterNotice.updated_at !== afterRecipient.acknowledged_at) {
      throw new Error("Parent notice acknowledgement timestamps diverged.");
    }
  } else {
    assertSame("parent notices", before.teacher_notices, after.teacher_notices);
  }
  assertSame(
    "unrelated parent notices",
    before.teacher_notices.filter((record) => record.id !== afterRecipient.notice_id),
    after.teacher_notices.filter((record) => record.id !== afterRecipient.notice_id)
  );
  await patchNoticeAck(sql, state, scope, afterRecipient, afterNotice);
}

export function createParentPostgresScopedMutationAdapter({
  ensureSchema,
  getClient,
  state
}: ParentPostgresScopedMutationAdapterDependencies) {
  const transaction = async <T>(operation: (sql: ParentPostgresSql) => Promise<T>) => {
    await ensureSchema();
    return getClient().begin(async (sql) => {
      await lockParentStateRow(sql, state);
      return operation(sql);
    });
  };

  return {
    async readMessageDatabase(scope: ParentMessageMutationScope) {
      await ensureSchema();
      return loadMessageScope(getClient(), state, scope);
    },

    async mutateMessageDatabase<T>(
      scope: ParentMessageMutationScope,
      mutate: (database: ParentMessagePersistenceDatabase) => T
    ) {
      return transaction(async (sql) => {
        const database = await loadMessageScope(sql, state, scope);
        const before = clone(database);
        const result = mutate(database);
        assertSynchronousMutation(result);
        await persistMessageDelta(sql, state, scope, before, database);
        return result;
      });
    },

    async mutateNoticeDatabase<T>(
      scope: ParentNoticeMutationScope,
      mutate: (database: ParentNoticePersistenceDatabase) => T
    ) {
      return transaction(async (sql) => {
        const database = await loadAckScope(sql, state, scope);
        const before = clone(database);
        const result = mutate(database);
        assertSynchronousMutation(result);
        await persistNoticeDelta(sql, state, scope, before, database);
        return result;
      });
    }
  };
}
