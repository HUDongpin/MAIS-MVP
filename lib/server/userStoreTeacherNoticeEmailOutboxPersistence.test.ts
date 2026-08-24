import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const outboxModulePromise = import("@/lib/server/userStore/teacherNoticeEmailOutboxPersistence")
  .catch(() => null) as Promise<Record<string, unknown> | null>;

const fingerprint = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

test("PostgreSQL transaction settings replace a hostile ambient search_path with the fixed safe path", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  const transactionSettings = outboxModule.teacherNoticeEmailOutboxPostgresTransactionSettings as (
    input: { lockTimeout: string; statementTimeout: string; idleTransactionTimeout?: string }
  ) => {
    searchPath: string;
    lockTimeout: string;
    statementTimeout: string;
    idleTransactionTimeout: string | null;
  };
  assert.equal(typeof transactionSettings, "function");

  const fakeSession = { searchPath: "hostile_shadow, public" };
  Object.assign(fakeSession, transactionSettings({
    lockTimeout: "1000ms",
    statementTimeout: "5000ms",
    idleTransactionTimeout: "5000ms"
  }));
  assert.deepEqual(fakeSession, {
    searchPath: "pg_catalog, public",
    lockTimeout: "1000ms",
    statementTimeout: "5000ms",
    idleTransactionTimeout: "5000ms"
  });
});

test("atomic PostgreSQL migration rolls back marker and catalog changes when same-transaction attestation fails", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  const runAtomicMigration = outboxModule.runTeacherNoticeEmailOutboxAtomicMigration as <Sql>(input: {
    begin: (operation: (sql: Sql) => Promise<void>) => Promise<void>;
    migrate: (sql: Sql) => Promise<void>;
    attest: (sql: Sql) => Promise<boolean>;
  }) => Promise<void>;
  assert.equal(typeof runAtomicMigration, "function");

  let durable = { marker: 1, comment: "v1", malformedLegacyColumn: true };
  await assert.rejects(runAtomicMigration({
    begin: async (operation: (sql: typeof durable) => Promise<void>) => {
      const transaction = structuredClone(durable);
      await operation(transaction);
      durable = transaction;
    },
    migrate: async (transaction) => {
      transaction.marker = 2;
      transaction.comment = "v2";
    },
    attest: async (transaction) => transaction.marker === 2 && !transaction.malformedLegacyColumn
  }), /could not be attested/i);
  assert.deepEqual(durable, { marker: 1, comment: "v1", malformedLegacyColumn: true });
});

test("PostgreSQL DML transaction configures, locks, attests, then mutates on one transaction handle", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  const runAttestedTransaction = outboxModule.runTeacherNoticeEmailOutboxAttestedTransaction as <Sql, Result>(input: {
    sql: Sql;
    configure: (sql: Sql) => Promise<void>;
    acquireCooperativeAdvisoryLock: (sql: Sql) => Promise<void>;
    acquireWebhookSchemaAdvisoryLock?: (sql: Sql) => Promise<void>;
    acquireProviderMessageAdvisoryLock?: (sql: Sql) => Promise<void>;
    lockOutbox: (sql: Sql) => Promise<void>;
    lockMigrationMarker: (sql: Sql) => Promise<void>;
    attest: (sql: Sql) => Promise<boolean>;
    operation: (sql: Sql) => Promise<Result>;
  }) => Promise<Result>;
  assert.equal(typeof runAttestedTransaction, "function");

  const transactionSql = { transaction: "same-physical-transaction" };
  const order: string[] = [];
  const step = (label: string, result?: boolean | string) => async (sql: typeof transactionSql) => {
    assert.equal(sql, transactionSql);
    order.push(label);
    return result;
  };
  const result = await runAttestedTransaction({
    sql: transactionSql,
    configure: step("configure") as (sql: typeof transactionSql) => Promise<void>,
    acquireCooperativeAdvisoryLock: step("outbox-advisory") as (sql: typeof transactionSql) => Promise<void>,
    acquireWebhookSchemaAdvisoryLock: step("webhook-advisory") as (sql: typeof transactionSql) => Promise<void>,
    acquireProviderMessageAdvisoryLock: step("provider-advisory") as (sql: typeof transactionSql) => Promise<void>,
    lockOutbox: step("lock-outbox") as (sql: typeof transactionSql) => Promise<void>,
    lockMigrationMarker: step("lock-marker") as (sql: typeof transactionSql) => Promise<void>,
    attest: step("attest", true) as (sql: typeof transactionSql) => Promise<boolean>,
    operation: step("dml", "committed") as (sql: typeof transactionSql) => Promise<string>
  });
  assert.equal(result, "committed");
  assert.deepEqual(order, [
    "configure",
    "outbox-advisory",
    "webhook-advisory",
    "provider-advisory",
    "lock-outbox",
    "lock-marker",
    "attest",
    "dml"
  ]);

  let mutated = false;
  await assert.rejects(runAttestedTransaction({
    sql: transactionSql,
    configure: async () => undefined,
    acquireCooperativeAdvisoryLock: async () => undefined,
    lockOutbox: async () => undefined,
    lockMigrationMarker: async () => undefined,
    attest: async () => false,
    operation: async () => {
      mutated = true;
      return "forbidden";
    }
  }), /could not be attested/i);
  assert.equal(mutated, false);
});

function fixtureDatabase() {
  return {
    users: [
      {
        id: "teacher-1",
        role: "teacher",
        email: "teacher@example.edu.hk",
        disabled_at: null
      },
      {
        id: "student-1",
        role: "student",
        email: "student@example.edu.hk",
        disabled_at: null
      },
      {
        id: "parent-1",
        role: "parent",
        email: "parent.one@example.edu.hk",
        disabled_at: null
      },
      {
        id: "foreign-parent",
        role: "parent",
        email: "foreign@example.edu.hk",
        disabled_at: null
      }
    ],
    user_settings: [
      { user_id: "parent-1", language: "zh", theme: "dark", selected_grade: "P1" },
      { user_id: "foreign-parent", language: "en", theme: "dark", selected_grade: "P2" }
    ],
    teacher_classes: [
      { id: "class-1", teacher_id: "teacher-1", name: "Class One" },
      { id: "foreign-class", teacher_id: "teacher-foreign", name: "Foreign" }
    ],
    teacher_class_collaborators: [] as Array<Record<string, unknown>>,
    school_memberships: [] as Array<Record<string, unknown>>,
    class_enrollments: [
      { id: "enrollment-1", class_id: "class-1", student_id: "student-1" },
      { id: "foreign-enrollment", class_id: "foreign-class", student_id: "foreign-student" }
    ],
    guardian_links: [
      { id: "link-1", parent_id: "parent-1", student_id: "student-1", status: "active" },
      { id: "foreign-link", parent_id: "foreign-parent", student_id: "foreign-student", status: "active" }
    ],
    teacher_notices: [
      {
        id: "notice-1",
        teacher_id: "teacher-1",
        class_id: "class-1",
        audience: "parents",
        subject_en: "Private subject",
        subject_zh: "私人標題",
        body_en: "Private body",
        body_zh: "私人內容",
        status: "draft",
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        sent_at: null
      },
      {
        id: "foreign-notice",
        teacher_id: "teacher-foreign",
        class_id: "foreign-class",
        audience: "parents",
        subject_en: "Foreign subject",
        subject_zh: "外部標題",
        body_en: "Foreign body",
        body_zh: "外部內容",
        status: "draft",
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        sent_at: null
      }
    ],
    teacher_notice_recipients: [
      {
        id: "recipient-1",
        notice_id: "notice-1",
        student_id: "student-1",
        guardian_id: "parent-1",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T00:00:00.000Z"
      },
      {
        id: "foreign-recipient",
        notice_id: "foreign-notice",
        student_id: "foreign-student",
        guardian_id: "foreign-parent",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T00:00:00.000Z"
      }
    ]
  };
}

test("teacher notice outbox exposes a dedicated executable SQLite schema outside Database JSON", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule, "teacher notice email outbox persistence module must exist");
  if (!outboxModule) return;
  assert.equal(typeof outboxModule.teacherNoticeEmailOutboxSqliteSchema, "string");
  assert.ok(Array.isArray(outboxModule.teacherNoticeEmailOutboxPostgresSchemaStatements));

  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(String(outboxModule.teacherNoticeEmailOutboxSqliteSchema));
    const columns = sqlite.prepare("PRAGMA table_info(teacher_notice_email_outbox)").all() as Array<{ name: string }>;
    assert.deepEqual(
      columns.map((column) => column.name),
      [
        "id",
        "notice_id",
        "recipient_id",
        "recipient_fingerprint",
        "student_id",
        "guardian_id",
        "teacher_id",
        "queued_by_id",
        "queued_by_fingerprint",
        "class_id",
        "email",
        "locale",
        "durable_delivery_key",
        "content_revision",
        "status",
        "attempt_count",
        "first_enqueued_at",
        "next_attempt_at",
        "lease_token",
        "lease_expires_at",
        "provider_message_id",
        "last_error_code",
        "last_http_status",
        "completed_at",
        "created_at",
        "updated_at",
        "pii_expires_at",
        "pii_purged_at",
        "tombstone_expires_at"
      ]
    );
    assert.throws(() => sqlite.prepare(`
      INSERT INTO teacher_notice_email_outbox (
        id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id, teacher_id,
        queued_by_id, queued_by_fingerprint, class_id,
        email, locale, durable_delivery_key, content_revision, status, attempt_count,
        first_enqueued_at, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "row-invalid", "notice", "recipient", fingerprint("recipient"), "student", "guardian", "teacher",
      "teacher", fingerprint("teacher"), "class",
      "parent@example.edu.hk", "invalid", "teacher-notice-email/notice", "revision",
      "pending", 0, "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z",
      "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z"
    ));

    const insertState = sqlite.prepare(`
      INSERT INTO teacher_notice_email_outbox (
        id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id, teacher_id,
        queued_by_id, queued_by_fingerprint, class_id,
        email, locale, durable_delivery_key, content_revision, status, attempt_count,
        first_enqueued_at, next_attempt_at, lease_token, lease_expires_at,
        provider_message_id, last_http_status, completed_at, created_at, updated_at,
        pii_expires_at, pii_purged_at, tombstone_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const base = [
      "row-state", "notice", "recipient", fingerprint("recipient"), "student", "guardian", "teacher",
      "teacher", fingerprint("teacher"), "class", "parent@example.edu.hk", "en",
      "teacher-notice-email/notice", "revision"
    ];
    assert.throws(() => insertState.run(
      ...base, "pending", 0, "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z",
      "00000000-0000-4000-8000-000000000001", "2026-08-23T00:02:00.000Z",
      null, null, null, "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z", null, null, null
    ), /CHECK constraint failed/i, "pending rows may not carry a lease");
    assert.throws(() => insertState.run(
      "row-accepted", ...base.slice(1), "provider-accepted", 1,
      "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z", null, null,
      null, 202, "2026-08-23T00:01:00.000Z", "2026-08-23T00:00:00.000Z",
      "2026-08-23T00:01:00.000Z", "2026-09-22T00:01:00.000Z", null,
      "2027-09-27T00:01:00.000Z"
    ), /CHECK constraint failed/i, "accepted rows require a provider identifier");
    assert.throws(() => insertState.run(
      "row-http", ...base.slice(1), "pending", 0,
      "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z", null, null, null, 200.5, null,
      "2026-08-23T00:00:00.000Z", "2026-08-23T00:00:00.000Z", null, null, null
    ), /CHECK constraint failed/i, "SQLite must reject non-integer HTTP status values");
  } finally {
    sqlite.close();
  }
});

test("SQLite exact attestation requires the partial provider-message uniqueness index and rejects a hostile same-name shape", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const schema = String(outboxModule.teacherNoticeEmailOutboxSqliteSchema);
  const attest = outboxModule.attestTeacherNoticeEmailOutboxSqliteSchema as
    ((storage: DatabaseSync) => boolean) | undefined;
  assert.equal(typeof attest, "function");

  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(schema);
    assert.equal(attest!(sqlite), true);
    const indexes = sqlite.prepare("PRAGMA index_list('teacher_notice_email_outbox')").all() as Array<{
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>;
    assert.deepEqual(
      indexes
        .map((row) => [row.name, row.unique, row.origin, row.partial])
        .sort((left, right) => String(left[0]) < String(right[0]) ? -1 : String(left[0]) > String(right[0]) ? 1 : 0),
      [
        ["sqlite_autoindex_teacher_notice_email_outbox_1", 1, "pk", 0],
        ["sqlite_autoindex_teacher_notice_email_outbox_2", 1, "u", 0],
        ["teacher_notice_email_outbox_eligible_idx", 0, "c", 0],
        ["teacher_notice_email_outbox_provider_message_uq", 1, "c", 1]
      ]
    );
    assert.deepEqual(
      (sqlite.prepare("PRAGMA index_xinfo('teacher_notice_email_outbox_provider_message_uq')").all() as Array<{
        name: string | null;
        desc: number;
        coll: string | null;
        key: number;
      }>).filter((row) => row.key === 1).map((row) => [row.name, row.desc, row.coll]),
      [["provider_message_id", 0, "BINARY"]]
    );

    sqlite.exec("DROP INDEX teacher_notice_email_outbox_provider_message_uq");
    sqlite.exec(`CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq
      ON teacher_notice_email_outbox (notice_id)
      WHERE provider_message_id IS NULL`);
    assert.equal(attest!(sqlite), false, "a same-name index with the wrong key and predicate must fail closed");
  } finally {
    sqlite.close();
  }
});

test("SQLite no-contact release restores an attested pre-claim state and stale tokens cannot restore it", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const schema = String(outboxModule.teacherNoticeEmailOutboxSqliteSchema);
  const releaseSql = outboxModule.teacherNoticeEmailOutboxSqliteNoContactReleaseSql;
  assert.equal(typeof releaseSql, "string");
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(schema);
    sqlite.prepare(`
      INSERT INTO teacher_notice_email_outbox (
        id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id, teacher_id,
        queued_by_id, queued_by_fingerprint, class_id,
        email, locale, durable_delivery_key, content_revision, status, attempt_count,
        first_enqueued_at, next_attempt_at, lease_token, lease_expires_at,
        last_error_code, last_http_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'leased', 5, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "row-release", "notice-1", "recipient-1", fingerprint("recipient-1"), "student-1", "parent-1",
      "teacher-1", "teacher-1", fingerprint("teacher-1"), "class-1",
      "parent@example.edu.hk", "en", "teacher-notice-email/notice-1", "revision-1",
      "2026-08-23T00:00:00.000Z", "2026-08-23T00:58:00.000Z",
      "lease-current", "2026-08-23T01:02:00.000Z", "rate-limited", 429,
      "2026-08-23T00:00:00.000Z", "2026-08-23T01:00:00.000Z"
    );
    const release = sqlite.prepare(String(releaseSql));
    const stale = release.run(
      "retryable", 4, "2026-08-23T00:58:00.000Z", "2026-08-23T01:00:01.000Z",
      "row-release", "lease-stale", 5
    );
    assert.equal(Number(stale.changes), 0);
    assert.deepEqual({ ...sqlite.prepare(`
      SELECT status, attempt_count, next_attempt_at, lease_token, last_error_code, last_http_status
      FROM teacher_notice_email_outbox WHERE id = 'row-release'
    `).get() }, {
      status: "leased",
      attempt_count: 5,
      next_attempt_at: "2026-08-23T00:58:00.000Z",
      lease_token: "lease-current",
      last_error_code: "rate-limited",
      last_http_status: 429
    });

    const restored = release.run(
      "retryable", 4, "2026-08-23T00:58:00.000Z", "2026-08-23T01:00:02.000Z",
      "row-release", "lease-current", 5
    );
    assert.equal(Number(restored.changes), 1);
    assert.deepEqual({ ...sqlite.prepare(`
      SELECT status, attempt_count, next_attempt_at, lease_token, lease_expires_at,
        last_error_code, last_http_status, updated_at
      FROM teacher_notice_email_outbox WHERE id = 'row-release'
    `).get() }, {
      status: "retryable",
      attempt_count: 4,
      next_attempt_at: "2026-08-23T00:58:00.000Z",
      lease_token: null,
      lease_expires_at: null,
      last_error_code: "rate-limited",
      last_http_status: 429,
      updated_at: "2026-08-23T01:00:02.000Z"
    });
  } finally {
    sqlite.close();
  }
});

test("publication prepares only the authorized guardian and a stable immutable five-field delivery", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;
  assert.equal(typeof prepare, "function");
  const database = fixtureDatabase();
  const result = prepare({
    database,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });

  assert.equal(result.status, "prepared");
  assert.equal(result.skipped, 0);
  const rows = result.rows as Array<Record<string, unknown>>;
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0]?.delivery, {
    recipientId: "recipient-1",
    email: "parent.one@example.edu.hk",
    locale: "zh-Hant",
    durableDeliveryKey: "teacher-notice-email/notice-1",
    contentRevision: rows[0]?.content_revision
  });
  assert.equal(String(rows[0]?.id).includes("foreign"), false);
  assert.equal(JSON.stringify(rows).includes("Private subject"), false);
  assert.equal(JSON.stringify(rows).includes("Private body"), false);
  assert.equal(JSON.stringify(rows).includes("foreign@example.edu.hk"), false);
  assert.equal(database.teacher_notices[0]?.status, "queued");
  assert.equal(database.teacher_notices[0]?.sent_at, null);

  const replayDatabase = fixtureDatabase();
  const replay = prepare({
    database: replayDatabase,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T02:00:00.000Z"
  }) as Record<string, unknown>;
  assert.deepEqual(
    (replay.rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id,
      contentRevision: row.content_revision,
      delivery: row.delivery
    })),
    rows.map((row) => ({ id: row.id, contentRevision: row.content_revision, delivery: row.delivery }))
  );
});

test("publication fails closed on duplicate authority IDs and skips revoked, disabled, or malformed delivery targets", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;

  const duplicate = fixtureDatabase();
  duplicate.users.push({ ...duplicate.users[2]! });
  assert.throws(() => prepare({
    database: duplicate,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  }), /conflicting|unique|duplicate/i);

  const duplicateRecipientTuple = fixtureDatabase();
  duplicateRecipientTuple.teacher_notice_recipients.push({
    ...duplicateRecipientTuple.teacher_notice_recipients[0]!,
    id: "recipient-duplicate-business-tuple"
  });
  assert.throws(() => prepare({
    database: duplicateRecipientTuple,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  }), /conflicting.*recipient/i);

  for (const mutate of [
    (database: ReturnType<typeof fixtureDatabase>) => { database.guardian_links[0]!.status = "revoked"; },
    (database: ReturnType<typeof fixtureDatabase>) => {
      (database.users[2] as Record<string, unknown>).disabled_at = "2026-08-23T00:30:00.000Z";
    },
    (database: ReturnType<typeof fixtureDatabase>) => { database.users[2]!.email = "not-an-email"; },
    (database: ReturnType<typeof fixtureDatabase>) => { database.user_settings[0]!.language = "invalid"; }
  ]) {
    const database = fixtureDatabase();
    mutate(database);
    const result = prepare({
      database,
      teacherId: "teacher-1",
      noticeId: "notice-1",
      now: "2026-08-23T01:00:00.000Z"
    });
    assert.equal(result.status, "no-eligible");
    assert.deepEqual(result.rows, []);
    assert.equal(result.skipped, 1);
    assert.equal(database.teacher_notices[0]?.status, "draft");
  }
});

test("a leased row is revalidated against current authority, email, locale, and content revision", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;
  const validate = outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean;
  assert.equal(typeof validate, "function");
  const database = fixtureDatabase();
  const publication = prepare({
    database,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  const row = (publication.rows as Array<Record<string, unknown>>)[0]!;
  assert.equal(validate({ database, row }), true);
  database.teacher_notice_recipients.push({
    ...database.teacher_notice_recipients[0]!,
    id: "recipient-duplicate-business-tuple"
  });
  assert.equal(validate({ database, row }), false);
  database.teacher_notice_recipients.pop();
  database.guardian_links[0]!.status = "revoked";
  assert.equal(validate({ database, row }), false);
  database.guardian_links[0]!.status = "active";
  database.teacher_notices[0]!.body_en = "A changed notice revision";
  assert.equal(validate({ database, row }), false);

  const destinationDatabase = fixtureDatabase();
  const originalPublication = prepare({
    database: destinationDatabase,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  const originalRow = (originalPublication.rows as Array<Record<string, unknown>>)[0]!;
  destinationDatabase.users[2]!.email = "parent.changed@example.edu.hk";
  assert.equal(validate({ database: destinationDatabase, row: originalRow }), false);
  const changedEmailPublication = prepare({
    database: destinationDatabase,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T02:00:00.000Z"
  });
  const changedEmailRow = (changedEmailPublication.rows as Array<Record<string, unknown>>)[0]!;
  assert.notEqual(changedEmailRow.content_revision, originalRow.content_revision);
  assert.notEqual(changedEmailRow.id, originalRow.id);
  assert.equal(changedEmailRow.durable_delivery_key, "teacher-notice-email/notice-1");
  assert.equal(String(changedEmailRow.content_revision).includes("parent.changed"), false);

  destinationDatabase.user_settings[0]!.language = "en";
  assert.equal(validate({ database: destinationDatabase, row: changedEmailRow }), false);
  const changedLocalePublication = prepare({
    database: destinationDatabase,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T03:00:00.000Z"
  });
  const changedLocaleRow = (changedLocalePublication.rows as Array<Record<string, unknown>>)[0]!;
  assert.notEqual(changedLocaleRow.content_revision, changedEmailRow.content_revision);
  assert.equal(String(changedLocaleRow.content_revision).includes("parent.changed"), false);
});

test("claim validation rejects acknowledged recipients and notices that are no longer queued", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;
  const validate = outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean;
  const database = fixtureDatabase();
  const publication = prepare({
    database,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  const row = (publication.rows as Array<Record<string, unknown>>)[0]!;
  assert.equal(validate({ database, row }), true);

  database.teacher_notice_recipients[0]!.status = "acknowledged";
  (database.teacher_notice_recipients[0] as Record<string, unknown>).acknowledged_at = "2026-08-23T01:30:00.000Z";
  assert.equal(validate({ database, row }), false);
  database.teacher_notice_recipients[0]!.status = "pending";
  database.teacher_notice_recipients[0]!.acknowledged_at = null;
  database.teacher_notices[0]!.status = "failed";
  assert.equal(validate({ database, row }), false);

  const studentsAudience = fixtureDatabase();
  studentsAudience.teacher_notices[0]!.audience = "students";
  studentsAudience.teacher_notice_recipients[0]!.guardian_id = "parent-1";
  const studentsPublication = prepare({
    database: studentsAudience,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  assert.equal(studentsPublication.status, "no-eligible");
  assert.equal(studentsAudience.teacher_notices[0]!.status, "draft");
  assert.equal(validate({ database: studentsAudience, row }), false);
});

test("publication never revives completed or failed notices and skips recipients that already acknowledged", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;

  for (const status of ["sent", "failed"]) {
    const database = fixtureDatabase();
    database.teacher_notices[0]!.status = status;
    const publication = prepare({ database, teacherId: "teacher-1", noticeId: "notice-1", now: "2026-08-23T01:00:00.000Z" });
    assert.deepEqual(publication, { status: "not-found" });
    assert.equal(database.teacher_notices[0]!.status, status);
  }

  const acknowledged = fixtureDatabase();
  acknowledged.teacher_notice_recipients[0]!.status = "acknowledged";
  (acknowledged.teacher_notice_recipients[0] as Record<string, unknown>).acknowledged_at = "2026-08-23T00:30:00.000Z";
  const publication = prepare({
    database: acknowledged,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  assert.equal(publication.status, "no-eligible");
  assert.deepEqual(publication.rows, []);
  assert.equal(publication.skipped, 1);
  assert.equal(acknowledged.teacher_notices[0]!.status, "draft");
});

test("notice author stays immutable while current class actors can publish and replay the same durable row", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;
  const validate = outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean;
  const now = "2026-08-23T01:00:00.000Z";

  const owner = fixtureDatabase();
  const ownerPublication = prepare({ database: owner, teacherId: "teacher-1", noticeId: "notice-1", now });
  assert.equal(ownerPublication.status, "prepared");
  const ownerRow = (ownerPublication.rows as Array<Record<string, unknown>>)[0]!;
  assert.equal(ownerRow.teacher_id, "teacher-1", "durable authority must be the stable notice author");

  for (const authority of ["active-collaborator", "teacher-membership", "admin-membership"] as const) {
    const database = fixtureDatabase();
    database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
    if (authority === "active-collaborator") {
      database.teacher_class_collaborators.push({
        id: "collaborator-1", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "active"
      });
    } else {
      database.school_memberships.push({
        id: "membership-1", class_id: "class-1", user_id: "teacher-2",
        role: authority === "admin-membership" ? "admin" : "teacher"
      });
    }
    const publication = prepare({ database, teacherId: "teacher-2", noticeId: "notice-1", now });
    assert.equal(publication.status, "prepared", authority);
    const row = (publication.rows as Array<Record<string, unknown>>)[0]!;
    assert.equal(database.teacher_notices[0]!.teacher_id, "teacher-1", `${authority} must not rewrite the author`);
    assert.equal(row.teacher_id, "teacher-1", `${authority} must persist the stable author, not the actor`);
    assert.equal(row.id, ownerRow.id, `${authority} replay must reuse the owner-created row`);
    assert.equal(row.content_revision, ownerRow.content_revision, `${authority} replay must reuse the revision`);
    assert.equal(validate({ database, row }), true, authority);

    const ownerReplay = prepare({ database, teacherId: "teacher-1", noticeId: "notice-1", now });
    assert.equal(ownerReplay.status, "prepared");
    assert.equal((ownerReplay.rows as Array<Record<string, unknown>>)[0]!.id, row.id,
      `${authority} to owner replay must remain one durable delivery`);
  }

  for (const denied of ["viewer", "inactive", "revoked", "foreign-membership"] as const) {
    const database = fixtureDatabase();
    database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
    if (denied === "foreign-membership") {
      database.school_memberships.push({
        id: "membership-1", class_id: "foreign-class", user_id: "teacher-2", role: "teacher"
      });
    } else {
      database.teacher_class_collaborators.push({
        id: "collaborator-1", class_id: "class-1", teacher_id: "teacher-2",
        role: denied === "viewer" ? "viewer" : "co-teacher",
        status: denied === "inactive" ? "inactive" : denied === "revoked" ? "revoked" : "active"
      });
    }
    assert.deepEqual(
      prepare({ database, teacherId: "teacher-2", noticeId: "notice-1", now }),
      { status: "not-found" },
      denied
    );
  }

  const actorRevokedAfterQueue = fixtureDatabase();
  actorRevokedAfterQueue.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
  actorRevokedAfterQueue.teacher_class_collaborators.push({
    id: "collaborator-1", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "active"
  });
  const coTeacherPublication = prepare({
    database: actorRevokedAfterQueue,
    teacherId: "teacher-2",
    noticeId: "notice-1",
    now
  });
  const stableRow = (coTeacherPublication.rows as Array<Record<string, unknown>>)[0]!;
  actorRevokedAfterQueue.teacher_class_collaborators[0]!.status = "revoked";
  assert.equal(validate({ database: actorRevokedAfterQueue, row: stableRow }), false,
    "revoking the actual queue actor must block delivery even while the owner remains active");

  actorRevokedAfterQueue.teacher_classes[0]!.teacher_id = "teacher-without-access";
  assert.equal(validate({ database: actorRevokedAfterQueue, row: stableRow }), false,
    "delivery must stop once no active teacher retains current class authority");

  const authorDisabledAfterQueue = fixtureDatabase();
  authorDisabledAfterQueue.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
  authorDisabledAfterQueue.teacher_class_collaborators.push({
    id: "collaborator-1", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "active"
  });
  const authorBoundPublication = prepare({
    database: authorDisabledAfterQueue,
    teacherId: "teacher-2",
    noticeId: "notice-1",
    now
  });
  const authorBoundRow = (authorBoundPublication.rows as Array<Record<string, unknown>>)[0]!;
  (authorDisabledAfterQueue.users[0] as Record<string, unknown>).disabled_at = "2026-08-23T01:01:00.000Z";
  assert.equal(validate({ database: authorDisabledAfterQueue, row: authorBoundRow }), false,
    "a disabled stable notice author must fail closed even when another class actor remains active");
});

test("claim authorization is bound to the actual queue actor, not merely any surviving class teacher", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const database = fixtureDatabase();
  database.users.push({
    id: "co-teacher-1",
    role: "teacher",
    email: "co-teacher@example.edu.hk",
    disabled_at: null
  });
  database.teacher_class_collaborators.push({
    id: "collaborator-queue-actor",
    class_id: "class-1",
    teacher_id: "co-teacher-1",
    role: "co-teacher",
    status: "active"
  });
  const publication = (outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>)({
    database,
    teacherId: "co-teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  const row = (publication.rows as Array<Record<string, unknown>>)[0]!;
  assert.equal(row.queued_by_id, "co-teacher-1");
  database.teacher_notices[0]!.status = "queued";
  assert.equal((outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean)({
    database,
    row
  }), true);

  database.teacher_class_collaborators[0]!.status = "revoked";
  assert.equal((outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean)({
    database,
    row
  }), false, "the owner remaining active must not preserve a revoked queue actor's claim");
});

test("publication and claim fail closed on semantically conflicting class authority without provider contact", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const prepare = outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>;
  const validate = outboxModule.validateTeacherNoticeEmailOutboxClaim as (input: Record<string, unknown>) => boolean;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  const now = "2026-08-23T01:00:00.000Z";
  const original = fixtureDatabase();
  const originalPublication = prepare({ database: original, teacherId: "teacher-1", noticeId: "notice-1", now });
  const row = (originalPublication.rows as Array<Record<string, unknown>>)[0]!;

  const conflicts = [
    {
      label: "active co-teacher plus active viewer",
      mutate(database: ReturnType<typeof fixtureDatabase>) {
        database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
        database.teacher_class_collaborators.push(
          { id: "collaborator-active", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "active" },
          { id: "collaborator-viewer", class_id: "class-1", teacher_id: "teacher-2", role: "viewer", status: "active" }
        );
      }
    },
    {
      label: "active plus revoked collaborator",
      mutate(database: ReturnType<typeof fixtureDatabase>) {
        database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
        database.teacher_class_collaborators.push(
          { id: "collaborator-active", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "active" },
          { id: "collaborator-revoked", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "revoked" }
        );
      }
    },
    {
      label: "teacher plus parent membership",
      mutate(database: ReturnType<typeof fixtureDatabase>) {
        database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
        database.school_memberships.push(
          { id: "membership-teacher", class_id: "class-1", user_id: "teacher-2", role: "teacher" },
          { id: "membership-parent", class_id: "class-1", user_id: "teacher-2", role: "parent" }
        );
      }
    },
    {
      label: "invalid collaborator status",
      mutate(database: ReturnType<typeof fixtureDatabase>) {
        database.users.push({ id: "teacher-2", role: "teacher", email: "teacher.2@example.edu.hk", disabled_at: null });
        database.teacher_class_collaborators.push(
          { id: "collaborator-invalid", class_id: "class-1", teacher_id: "teacher-2", role: "co-teacher", status: "unknown" }
        );
      }
    }
  ];

  for (const conflict of conflicts) {
    const publicationDatabase = fixtureDatabase();
    conflict.mutate(publicationDatabase);
    assert.throws(() => prepare({
      database: publicationDatabase,
      teacherId: "teacher-1",
      noticeId: "notice-1",
      now
    }), /conflicting|invalid.*authority/i, conflict.label);

    const claimDatabase = fixtureDatabase();
    claimDatabase.teacher_notices[0]!.status = "queued";
    conflict.mutate(claimDatabase);
    assert.equal(validate({ database: claimDatabase, row }), false, conflict.label);

    let providerCalls = 0;
    const worker = createWorker({
      now: () => new Date(now),
      claimNext: async () => validate({ database: claimDatabase, row }) ? {
        id: row.id,
        leaseToken: "00000000-0000-4000-8000-000000000010",
        attempt_count: 1,
        first_enqueued_at: row.first_enqueued_at,
        previousStatus: "pending",
        previousAttemptCount: 0,
        previousNextAttemptAt: row.next_attempt_at,
        delivery: row.delivery
      } : null,
      deliver: async () => {
        providerCalls += 1;
        throw new Error("conflicting class authority must never reach the provider");
      },
      complete: async () => true,
      releaseWithoutProviderContact: async () => true
    });
    const aggregate = await worker.runBatch(1);
    assert.equal(aggregate.claimed, 0, conflict.label);
    assert.equal(providerCalls, 0, conflict.label);
  }
});

test("central row validation enforces strict identifiers, RFC3339 timestamps, HTTP range, and every status invariant", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const validate = outboxModule.validateTeacherNoticeEmailOutboxRow as (row: Record<string, unknown>) => boolean;
  assert.equal(typeof validate, "function");
  const database = fixtureDatabase();
  const publication = (outboxModule.prepareTeacherNoticeEmailPublication as (input: Record<string, unknown>) => Record<string, unknown>)({
    database,
    teacherId: "teacher-1",
    noticeId: "notice-1",
    now: "2026-08-23T01:00:00.000Z"
  });
  const base = (publication.rows as Array<Record<string, unknown>>)[0]!;
  const lease = "00000000-0000-4000-8000-000000000010";
  const provider = "00000000-0000-4000-8000-000000000011";
  const completed = "2026-08-23T01:01:00.000Z";
  const piiExpiresAt = "2026-09-22T01:01:00.000Z";
  const tombstoneExpiresAt = "2027-09-27T01:01:00.000Z";
  const terminal = { pii_expires_at: piiExpiresAt, pii_purged_at: null, tombstone_expires_at: tombstoneExpiresAt };
  const valid = [
    { ...base, status: "pending" },
    { ...base, status: "retryable", attempt_count: 1, last_error_code: "rate-limited", last_http_status: 429 },
    { ...base, status: "leased", attempt_count: 1, lease_token: lease, lease_expires_at: "2026-08-23T01:02:00.000Z" },
    { ...base, ...terminal, status: "provider-accepted", attempt_count: 1, provider_message_id: provider, completed_at: completed },
    { ...base, ...terminal, status: "blocked", attempt_count: 1, last_error_code: "missing-configuration", completed_at: completed },
    { ...base, ...terminal, status: "dead-letter", attempt_count: 8, provider_message_id: provider, last_error_code: "quarantined-invalid-row", completed_at: completed },
    {
      ...base, ...terminal, status: "dead-letter", attempt_count: 8, completed_at: completed,
      recipient_id: null, student_id: null, guardian_id: null, teacher_id: null, queued_by_id: null,
      class_id: null, email: null, locale: null, delivery: null, pii_purged_at: piiExpiresAt
    }
  ];
  for (const [index, row] of valid.entries()) assert.equal(validate(row), true, `valid state ${index}`);

  const invalid = [
    { ...base, status: "pending", lease_token: lease, lease_expires_at: completed },
    { ...base, status: "retryable", provider_message_id: provider },
    { ...base, status: "leased", lease_token: null, lease_expires_at: completed },
    { ...base, status: "leased", lease_token: lease, lease_expires_at: null },
    { ...base, status: "leased", lease_token: lease, lease_expires_at: completed, completed_at: completed },
    { ...base, ...terminal, status: "provider-accepted", provider_message_id: null, completed_at: completed },
    { ...base, ...terminal, status: "provider-accepted", provider_message_id: provider, completed_at: null },
    { ...base, ...terminal, status: "blocked", completed_at: null },
    { ...base, ...terminal, status: "dead-letter", lease_token: lease, lease_expires_at: completed, completed_at: completed },
    { ...base, status: "dead-letter", completed_at: completed },
    { ...base, id: "bad id" },
    { ...base, created_at: "2026-08-23 01:00:00Z" },
    { ...base, last_http_status: 99 },
    { ...base, last_http_status: 600 },
    { ...base, last_http_status: 200.5 }
  ];
  for (const [index, row] of invalid.entries()) assert.equal(validate(row), false, `invalid state ${index}`);
});

test("PostgreSQL catalog readiness attests the exact raw catalog and rejects every independent drift", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const attest = outboxModule.attestTeacherNoticeEmailOutboxPostgresCatalog as (value: unknown) => boolean;
  const expected = outboxModule.teacherNoticeEmailOutboxExpectedPostgresCatalog as Record<string, any>;
  assert.equal(typeof attest, "function");
  assert.ok(expected, "module must expose the executable canonical catalog fixture");
  assert.deepEqual(expected.relations, [
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
  ]);
  assert.deepEqual(expected.integrity, {
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
  });
  assert.equal(attest(structuredClone(expected)), true);

  const rejects = (label: string, mutate: (catalog: Record<string, any>) => void) => {
    const drift = structuredClone(expected);
    mutate(drift);
    assert.equal(attest(drift), false, label);
  };
  rejects("main relation kind", (catalog) => { catalog.relations[0].kind = "v"; });
  rejects("marker relation kind", (catalog) => { catalog.relations[1].kind = "p"; });
  for (const relationName of [
    "teacher_notice_email_outbox",
    "teacher_notice_email_outbox_schema_migrations"
  ]) {
    rejects(`${relationName} unlogged`, (catalog) => {
      catalog.relations.find((relation: Record<string, unknown>) => relation.name === relationName).persistence = "u";
    });
    rejects(`${relationName} RLS enabled`, (catalog) => {
      catalog.relations.find((relation: Record<string, unknown>) => relation.name === relationName).rowSecurity = true;
    });
    rejects(`${relationName} force RLS enabled`, (catalog) => {
      catalog.relations.find((relation: Record<string, unknown>) => relation.name === relationName).forceRowSecurity = true;
    });
  }
  rejects("main column dropped", (catalog) => { catalog.columns.splice(3, 1); });
  rejects("main column type", (catalog) => {
    catalog.columns.find((column: Record<string, unknown>) => column.relation === "teacher_notice_email_outbox" && column.name === "attempt_count").type = "bigint";
  });
  rejects("main column nullability", (catalog) => {
    catalog.columns.find((column: Record<string, unknown>) => column.relation === "teacher_notice_email_outbox" && column.name === "id").notNull = false;
  });
  rejects("main column default", (catalog) => {
    catalog.columns.find((column: Record<string, unknown>) => column.relation === "teacher_notice_email_outbox" && column.name === "attempt_count").defaultExpression = "1";
  });
  rejects("marker column dropped", (catalog) => {
    const index = catalog.columns.findIndex((column: Record<string, unknown>) => column.relation === "teacher_notice_email_outbox_schema_migrations" && column.name === "version");
    catalog.columns.splice(index, 1);
  });
  rejects("marker column default", (catalog) => {
    catalog.columns.find((column: Record<string, unknown>) => column.relation === "teacher_notice_email_outbox_schema_migrations" && column.name === "singleton").defaultExpression = "false";
  });

  rejects("primary key order", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_pkey").keyColumns = ["notice_id", "id"];
  });
  rejects("delivery unique order", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_delivery_revision_uq").keyColumns.reverse();
  });
  rejects("deferrable delivery unique", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_delivery_revision_uq").deferrable = true;
  });
  rejects("initially deferred primary key", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_pkey").initiallyDeferred = true;
  });
  rejects("constraint backing index OID mismatch", (catalog) => {
    catalog.integrity.constraintBackingIndexOidsMatch = false;
  });
  rejects("index relation OID mismatch", (catalog) => {
    catalog.integrity.indexRelationOidsMatch = false;
  });
  rejects("unexpected extra index", (catalog) => {
    catalog.integrity.indexCount = 6;
    catalog.integrity.unexpectedIndexCount = 1;
  });
  rejects("unexpected user trigger", (catalog) => { catalog.integrity.userTriggerCount = 1; });
  rejects("unexpected rule", (catalog) => { catalog.integrity.ruleCount = 1; });
  for (const name of [
    "teacher_notice_email_outbox_locale_ck",
    "teacher_notice_email_outbox_status_ck",
    "teacher_notice_email_outbox_attempt_count_ck",
    "teacher_notice_email_outbox_http_status_ck",
    "teacher_notice_email_outbox_state_fields_ck"
  ]) {
    rejects(`${name} OR TRUE`, (catalog) => {
      catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === name).expression += " OR TRUE";
    });
    rejects(`${name} not validated`, (catalog) => {
      catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === name).validated = false;
    });
    rejects(`${name} dropped`, (catalog) => {
      const index = catalog.constraints.findIndex((constraint: Record<string, unknown>) => constraint.name === name);
      catalog.constraints.splice(index, 1);
    });
  }
  rejects("wrong status expression with all status words present", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_status_ck").expression =
      "status = ANY (ARRAY['pending'::text, 'leased'::text, 'retryable'::text, 'provider-accepted'::text, 'blocked'::text, 'dead-letter'::text]) OR TRUE";
  });
  rejects("marker primary key dropped", (catalog) => {
    const index = catalog.constraints.findIndex((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_schema_migrations_pkey");
    catalog.constraints.splice(index, 1);
  });
  rejects("marker singleton check weakened", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_schema_singleton_ck").expression = "singleton OR TRUE";
  });
  rejects("marker version check weakened", (catalog) => {
    catalog.constraints.find((constraint: Record<string, unknown>) => constraint.name === "teacher_notice_email_outbox_schema_version_ck").expression = "version >= 1";
  });
  rejects("marker row absent", (catalog) => { catalog.markerRows = []; });
  rejects("marker row cardinality", (catalog) => { catalog.markerRows.push({ singleton: true, version: 2 }); });
  rejects("marker row version", (catalog) => { catalog.markerRows[0].version = 1; });

  for (const [label, mutate] of [
    ["eligible index wrong AM", (index: Record<string, any>) => { index.accessMethod = "hash"; }],
    ["eligible index DESC", (index: Record<string, any>) => { index.indOptions[1] = 1; }],
    ["eligible index wrong null ordering", (index: Record<string, any>) => { index.indOptions[1] = 2; }],
    ["eligible index wrong opclass name", (index: Record<string, any>) => { index.opclasses[0].name = "text_pattern_ops"; }],
    ["eligible index shadow opclass schema", (index: Record<string, any>) => { index.opclasses[0].schema = "public"; }],
    ["eligible index wrong opclass input", (index: Record<string, any>) => { index.opclasses[0].inputType = "character varying"; }],
    ["eligible index wrong opclass AM", (index: Record<string, any>) => { index.opclasses[0].accessMethod = "hash"; }],
    ["eligible index nondefault opclass", (index: Record<string, any>) => { index.opclasses[0].isDefault = false; }],
    ["eligible index wrong text collation", (index: Record<string, any>) => { index.collations[0].name = "C"; }],
    ["eligible index shadow collation schema", (index: Record<string, any>) => { index.collations[0].schema = "public"; }],
    ["eligible index unexpected temporal collation", (index: Record<string, any>) => {
      index.collations[1] = { schema: "pg_catalog", name: "default" };
    }],
    ["eligible index wrong columns", (index: Record<string, any>) => { index.keyColumns.reverse(); }],
    ["eligible index partial", (index: Record<string, any>) => { index.partial = true; }],
    ["eligible index unique", (index: Record<string, any>) => { index.unique = true; }],
    ["eligible index invalid", (index: Record<string, any>) => { index.valid = false; }],
    ["eligible index not ready", (index: Record<string, any>) => { index.ready = false; }]
  ] as Array<[string, (index: Record<string, any>) => void]>) {
    rejects(label, (catalog) => mutate(
      catalog.indexes.find((index: Record<string, unknown>) => index.name === "teacher_notice_email_outbox_eligible_idx")
    ));
  }
  for (const [label, mutate] of [
    ["provider index wrong AM", (index: Record<string, any>) => { index.accessMethod = "hash"; }],
    ["provider index wrong key", (index: Record<string, any>) => { index.keyColumns = ["notice_id"]; }],
    ["provider index wrong predicate", (index: Record<string, any>) => { index.predicate = "(provider_message_id IS NULL)"; }],
    ["provider index not partial", (index: Record<string, any>) => { index.partial = false; }],
    ["provider index not unique", (index: Record<string, any>) => { index.unique = false; }],
    ["provider index primary", (index: Record<string, any>) => { index.primary = true; }],
    ["provider index deferred", (index: Record<string, any>) => { index.immediate = false; }],
    ["provider index invalid", (index: Record<string, any>) => { index.valid = false; }],
    ["provider index not ready", (index: Record<string, any>) => { index.ready = false; }],
    ["provider index not live", (index: Record<string, any>) => { index.live = false; }],
    ["provider index DESC", (index: Record<string, any>) => { index.indOptions[0] = 1; }],
    ["provider index wrong opclass", (index: Record<string, any>) => { index.opclasses[0].name = "text_pattern_ops"; }],
    ["provider index shadow opclass", (index: Record<string, any>) => { index.opclasses[0].schema = "public"; }],
    ["provider index wrong collation", (index: Record<string, any>) => { index.collations[0].name = "C"; }],
    ["provider index shadow collation", (index: Record<string, any>) => { index.collations[0].schema = "public"; }]
  ] as Array<[string, (index: Record<string, any>) => void]>) {
    rejects(label, (catalog) => mutate(
      catalog.indexes.find((index: Record<string, unknown>) => index.name === "teacher_notice_email_outbox_provider_message_uq")
    ));
  }
  rejects("unexpected shortcut field", (catalog) => { catalog.tableReady = true; });
});

test("delivery completion classifies accepted, retries, blocks, and dead-letters with deterministic timing", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const resolve = outboxModule.resolveTeacherNoticeEmailOutboxCompletion as (input: Record<string, unknown>) => Record<string, unknown>;
  const validateCompletion = outboxModule.validateTeacherNoticeEmailOutboxCompletion as (value: unknown) => boolean;
  assert.equal(typeof validateCompletion, "function");
  const row = {
    attempt_count: 1,
    first_enqueued_at: "2026-08-23T00:00:00.000Z"
  };

  assert.deepEqual(resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "accepted", providerMessageId: "00000000-0000-4000-8000-000000000001" }
  }), {
    status: "provider-accepted",
    providerMessageId: "00000000-0000-4000-8000-000000000001",
    nextAttemptAt: null,
    completedAt: "2026-08-23T01:00:00.000Z",
    errorCode: null,
    httpStatus: null
  });

  const retry = resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "deferred", errorCode: "rate-limited", httpStatus: 429, retryAfterSeconds: 300 }
  });
  assert.equal(retry.status, "retryable");
  assert.equal(retry.nextAttemptAt, "2026-08-23T01:05:00.000Z");

  assert.equal(resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "configuration-blocked", errorCode: "missing-configuration" }
  }).status, "blocked");
  assert.equal(resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "disabled" }
  }).errorCode, "delivery-disabled");
  assert.equal(resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "terminal-failure", errorCode: "invalid-request" }
  }).status, "dead-letter");
  assert.deepEqual(resolve({
    row,
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "accepted" }
  }), {
    status: "dead-letter",
    providerMessageId: null,
    nextAttemptAt: null,
    completedAt: "2026-08-23T01:00:00.000Z",
    errorCode: "invalid-response",
    httpStatus: null
  });
  assert.equal(validateCompletion({
    status: "provider-accepted",
    providerMessageId: "00000000-0000-4000-8000-000000000001",
    nextAttemptAt: null,
    completedAt: "2026-08-23T01:00:00.000Z",
    errorCode: null,
    httpStatus: 202
  }), true);
  assert.equal(validateCompletion({
    status: "provider-accepted",
    providerMessageId: null,
    nextAttemptAt: null,
    completedAt: "2026-08-23T01:00:00.000Z",
    errorCode: null,
    httpStatus: 202
  }), false);
  assert.equal(resolve({
    row: { ...row, attempt_count: 8 },
    now: "2026-08-23T01:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "ambiguous", errorCode: "timeout" }
  }).status, "dead-letter");
  assert.equal(resolve({
    row,
    now: "2026-08-23T23:00:00.000Z",
    result: { channel: "email", provider: "resend", status: "ambiguous", errorCode: "transport-error" }
  }).status, "dead-letter");
});

test("ordinary teacher recovery is bounded to configuration-only blocked rows and never advances retryable delivery", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const recover = outboxModule.resolveTeacherNoticeEmailOutboxRecovery as (input: Record<string, unknown>) => Record<string, unknown>;
  assert.equal(typeof recover, "function");
  const now = "2026-08-23T12:00:00.000Z";
  const base = { attempt_count: 2, first_enqueued_at: "2026-08-23T01:00:00.000Z", pii_purged_at: null };

  for (const last_error_code of ["delivery-disabled", "missing-configuration", "invalid-configuration"]) {
    assert.deepEqual(recover({
      row: { ...base, status: "blocked", last_error_code, provider_message_id: null },
      now
    }), {
      recover: true,
      resetDeliveryWindow: false
    });
  }
  for (const last_error_code of [
    null,
    "provider-quota-exceeded",
    "provider-authentication-failed",
    "sender-configuration-invalid",
    "provider-security-block",
    "provider-permission-denied"
  ]) {
    assert.deepEqual(recover({
      row: { ...base, status: "blocked", last_error_code, provider_message_id: null },
      now
    }), {
      recover: false,
      resetDeliveryWindow: false
    });
  }
  assert.deepEqual(recover({
    row: {
      ...base,
      status: "blocked",
      last_error_code: "missing-configuration",
      provider_message_id: "00000000-0000-4000-8000-000000000001"
    },
    now
  }), {
    recover: false,
    resetDeliveryWindow: false
  });
  assert.deepEqual(recover({ row: { ...base, status: "retryable" }, now }), {
    recover: false,
    resetDeliveryWindow: false
  });
  assert.deepEqual(recover({
    row: {
      ...base,
      status: "blocked",
      last_error_code: "missing-configuration",
      provider_message_id: null,
      pii_purged_at: "2026-08-23T11:59:00.000Z"
    },
    now
  }), { recover: false, resetDeliveryWindow: false });
  assert.deepEqual(recover({
    row: { ...base, status: "retryable", first_enqueued_at: "2026-08-22T13:00:00.000Z" },
    now: "2026-08-23T12:00:00.000Z"
  }), { recover: false, resetDeliveryWindow: false });
  assert.deepEqual(recover({ row: { ...base, status: "retryable", attempt_count: 8 }, now }), {
    recover: false,
    resetDeliveryWindow: false
  });
  for (const status of ["dead-letter", "provider-accepted", "pending", "leased"]) {
    assert.deepEqual(recover({ row: { ...base, status }, now }), {
      recover: false,
      resetDeliveryWindow: false
    });
  }
});

test("two workers expose only the exact adapter input, call the provider after claim commit, and CAS once", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  let transactionOpen = false;
  let claimed = false;
  let providerCalls = 0;
  let completionCalls = 0;
  const claim = {
    id: "outbox-row-1",
    leaseToken: "lease-token-1",
    attempt_count: 1,
    first_enqueued_at: "2026-08-23T00:00:00.000Z",
    previousStatus: "pending",
    previousAttemptCount: 0,
    previousNextAttemptAt: "2026-08-23T00:00:00.000Z",
    delivery: {
      recipientId: "recipient-1",
      email: "parent.one@example.edu.hk",
      locale: "en",
      durableDeliveryKey: "teacher-notice-email/notice-1",
      contentRevision: "revision-1"
    }
  };
  const dependencies = {
    now: () => new Date("2026-08-23T01:00:00.000Z"),
    claimNext: async () => {
      transactionOpen = true;
      if (claimed) {
        transactionOpen = false;
        return null;
      }
      claimed = true;
      transactionOpen = false;
      return claim;
    },
    deliver: async (input: Record<string, unknown>) => {
      assert.equal(transactionOpen, false, "provider I/O must run after the claim transaction commits");
      assert.deepEqual(Object.keys(input).sort(), [
        "contentRevision",
        "durableDeliveryKey",
        "email",
        "locale",
        "recipientId"
      ]);
      providerCalls += 1;
      return {
        channel: "email",
        provider: "resend",
        status: "accepted",
        providerMessageId: "00000000-0000-4000-8000-000000000001"
      };
    },
    complete: async (input: Record<string, unknown>) => {
      assert.equal(input.id, claim.id);
      assert.equal(input.leaseToken, claim.leaseToken);
      completionCalls += 1;
      return completionCalls === 1;
    },
    releaseWithoutProviderContact: async () => {
      throw new Error("a claim with provider budget must never be released");
    }
  };
  const firstWorker = createWorker(dependencies);
  const secondWorker = createWorker(dependencies);
  const results = await Promise.all([firstWorker.runBatch(1), secondWorker.runBatch(1)]);

  assert.equal(providerCalls, 1);
  assert.equal(completionCalls, 1);
  assert.equal(results.reduce((sum, result) => sum + result.accepted, 0), 1);
  assert.equal(results.reduce((sum, result) => sum + result.claimed, 0), 1);
});

test("worker uses a monotonic invocation deadline, does not claim without reserve, and completes its last claim", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  let monotonicMs = 0;
  let claims = 0;
  let completions = 0;
  const worker = createWorker({
    now: () => new Date("2026-08-23T01:00:00.000Z"),
    monotonicNow: () => monotonicMs,
    invocationBudgetMs: 300_000,
    claimReserveMs: 50_000,
    claimNext: async () => {
      claims += 1;
      monotonicMs += 5_000;
      return {
        id: `outbox-row-${claims}`,
        leaseToken: "00000000-0000-4000-8000-000000000010",
        attempt_count: 1,
        first_enqueued_at: "2026-08-23T00:00:00.000Z",
        previousStatus: "pending",
        previousAttemptCount: 0,
        previousNextAttemptAt: "2026-08-23T00:00:00.000Z",
        delivery: {
          recipientId: "recipient-1",
          email: "parent.one@example.edu.hk",
          locale: "en",
          durableDeliveryKey: "teacher-notice-email/notice-1",
          contentRevision: "revision-1"
        }
      };
    },
    deliver: async () => {
      monotonicMs += 240_000;
      return { channel: "email", provider: "resend", status: "accepted", providerMessageId: "00000000-0000-4000-8000-000000000001" };
    },
    complete: async () => {
      monotonicMs += 10_000;
      completions += 1;
      return true;
    },
    releaseWithoutProviderContact: async () => {
      throw new Error("the admitted claim must have enough provider budget");
    }
  });
  const result = await worker.runBatch(8);
  assert.equal(claims, 1, "remaining budget cannot admit a second provider attempt");
  assert.equal(completions, 1, "the already-claimed delivery must complete its CAS");
  assert.equal(result.accepted, 1);
  assert.ok(monotonicMs < 300_000);
});

test("worker rechecks its hard deadline after claim and lease-token releases without provider contact", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  const claim = {
    id: "outbox-row-deadline",
    leaseToken: "00000000-0000-4000-8000-000000000010",
    attempt_count: 3,
    first_enqueued_at: "2026-08-23T00:00:00.000Z",
    previousStatus: "retryable",
    previousAttemptCount: 2,
    previousNextAttemptAt: "2026-08-23T00:59:00.000Z",
    delivery: {
      recipientId: "recipient-1",
      email: "parent.one@example.edu.hk",
      locale: "en",
      durableDeliveryKey: "teacher-notice-email/notice-1",
      contentRevision: "revision-1"
    }
  };

  for (const releaseResult of [true, false]) {
    let monotonicMs = 0;
    let claims = 0;
    let providerCalls = 0;
    let completionCalls = 0;
    const releases: Array<Record<string, unknown>> = [];
    const worker = createWorker({
      now: () => new Date("2026-08-23T01:00:00.000Z"),
      monotonicNow: () => monotonicMs,
      invocationBudgetMs: 300_000,
      claimReserveMs: 2_000,
      claimNext: async () => {
        claims += 1;
        monotonicMs = 299_000;
        return claim;
      },
      releaseWithoutProviderContact: async (input: Record<string, unknown>) => {
        releases.push(input);
        return releaseResult;
      },
      deliver: async () => {
        providerCalls += 1;
        throw new Error("provider must not be contacted without the reserved budget");
      },
      complete: async () => {
        completionCalls += 1;
        return true;
      }
    });
    const result = await worker.runBatch(1);
    assert.equal(monotonicMs < 300_000, true, "release must occur before the hard boundary");
    assert.equal(claims, 1);
    assert.equal(providerCalls, 0);
    assert.equal(completionCalls, 0);
    assert.equal(releases.length, 1);
    assert.deepEqual(Object.keys(releases[0]!).sort(), [
      "deadline",
      "id",
      "leaseToken",
      "now",
      "previousAttemptCount",
      "previousNextAttemptAt",
      "previousStatus"
    ]);
    assert.equal(releases[0]!.id, claim.id);
    assert.equal(releases[0]!.leaseToken, claim.leaseToken);
    assert.equal(releases[0]!.previousStatus, "retryable");
    assert.equal(releases[0]!.previousAttemptCount, 2);
    assert.equal(releases[0]!.previousNextAttemptAt, "2026-08-23T00:59:00.000Z");
    assert.equal(result.claimed, 1);
    assert.equal(result.releasedWithoutProviderContact, releaseResult ? 1 : 0);
    assert.equal(result.releaseFailures, releaseResult ? 0 : 1,
      "a stale lease token must be visible only as a bounded aggregate");
  }
});

test("repeated no-contact deadline releases restore the exact pre-claim attempt and retry schedule", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  const state = {
    status: "retryable",
    attemptCount: 4,
    nextAttemptAt: "2026-08-23T00:58:00.000Z"
  };
  let monotonicMs = 0;
  let providerCalls = 0;
  let leaseSequence = 0;
  const worker = createWorker({
    now: () => new Date("2026-08-23T01:00:00.000Z"),
    monotonicNow: () => monotonicMs,
    invocationBudgetMs: 300_000,
    claimReserveMs: 2_000,
    claimNext: async () => {
      const previousStatus = state.status;
      const previousAttemptCount = state.attemptCount;
      const previousNextAttemptAt = state.nextAttemptAt;
      state.status = "leased";
      state.attemptCount += 1;
      monotonicMs = 299_000;
      leaseSequence += 1;
      return {
        id: "outbox-row-repeated-deadline",
        leaseToken: `lease-${leaseSequence}`,
        attempt_count: state.attemptCount,
        first_enqueued_at: "2026-08-23T00:00:00.000Z",
        previousStatus,
        previousAttemptCount,
        previousNextAttemptAt,
        delivery: {
          recipientId: "recipient-1",
          email: "parent.one@example.edu.hk",
          locale: "en",
          durableDeliveryKey: "teacher-notice-email/notice-1",
          contentRevision: "revision-1"
        }
      };
    },
    releaseWithoutProviderContact: async (input: Record<string, any>) => {
      if (input.leaseToken !== `lease-${leaseSequence}` || state.status !== "leased") return false;
      state.status = input.previousStatus;
      state.attemptCount = input.previousAttemptCount;
      state.nextAttemptAt = input.previousNextAttemptAt;
      return true;
    },
    deliver: async () => {
      providerCalls += 1;
      throw new Error("provider must not be called");
    },
    complete: async () => true
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    monotonicMs = 0;
    const aggregate = await worker.runBatch(1);
    assert.equal(aggregate.releasedWithoutProviderContact, 1);
    assert.deepEqual(state, {
      status: "retryable",
      attemptCount: 4,
      nextAttemptAt: "2026-08-23T00:58:00.000Z"
    });
  }
  assert.equal(providerCalls, 0);
});

test("worker threads one absolute deadline through a late claim and bounded no-contact release", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  let monotonicMs = 0;
  let providerCalls = 0;
  let releaseCalls = 0;
  let observedDeadline: Record<string, unknown> | undefined;
  const claim = {
    id: "outbox-row-late-claim",
    leaseToken: "00000000-0000-4000-8000-000000000030",
    attempt_count: 1,
    first_enqueued_at: "2026-08-23T00:00:00.000Z",
    previousStatus: "pending",
    previousAttemptCount: 0,
    previousNextAttemptAt: "2026-08-23T00:00:00.000Z",
    delivery: {
      recipientId: "recipient-1",
      email: "parent.one@example.edu.hk",
      locale: "en",
      durableDeliveryKey: "teacher-notice-email/notice-1",
      contentRevision: "revision-1"
    }
  };
  const worker = createWorker({
    now: () => new Date("2026-08-23T01:00:00.000Z"),
    monotonicNow: () => monotonicMs,
    invocationBudgetMs: 300_000,
    claimReserveMs: 60_000,
    claimNext: async (_now: string, deadline: Record<string, unknown>) => {
      observedDeadline = deadline;
      monotonicMs = 305_000;
      return claim;
    },
    releaseWithoutProviderContact: async (input: Record<string, unknown>) => {
      releaseCalls += 1;
      assert.equal(input.deadline, observedDeadline, "release must share the claim's absolute deadline");
      return false;
    },
    deliver: async () => {
      providerCalls += 1;
      throw new Error("a late claim must never reach the provider");
    },
    complete: async () => true
  });

  const aggregate = await worker.runBatch(1);
  assert.ok(observedDeadline);
  assert.equal(observedDeadline.deadlineAtMs, 300_000);
  assert.equal(observedDeadline.claimReserveMs, 60_000);
  assert.equal(typeof observedDeadline.monotonicNow, "function");
  assert.equal(providerCalls, 0);
  assert.equal(releaseCalls, 1);
  assert.equal(aggregate.releasedWithoutProviderContact, 0);
  assert.equal(aggregate.releaseFailures, 1);
});

test("worker stops a bounded 25-row quarantine before the pre-lease reserve is consumed", async () => {
  const outboxModule = await outboxModulePromise;
  assert.ok(outboxModule);
  if (!outboxModule) return;
  const createWorker = outboxModule.createTeacherNoticeEmailOutboxWorker as (dependencies: Record<string, unknown>) => {
    runBatch: (limit?: number) => Promise<Record<string, number>>;
  };
  let monotonicMs = 0;
  let quarantineStages = 0;
  let leaseCreations = 0;
  let providerCalls = 0;
  const worker = createWorker({
    now: () => new Date("2026-08-23T01:00:00.000Z"),
    monotonicNow: () => monotonicMs,
    invocationBudgetMs: 300_000,
    claimReserveMs: 60_000,
    claimNext: async (_now: string, deadline: {
      deadlineAtMs: number;
      claimReserveMs: number;
      monotonicNow: () => number;
    }) => {
      for (let index = 0; index < 25; index += 1) {
        if (deadline.deadlineAtMs - deadline.monotonicNow() <= deadline.claimReserveMs) return null;
        monotonicMs += 10_000;
        quarantineStages += 1;
      }
      if (deadline.deadlineAtMs - deadline.monotonicNow() <= deadline.claimReserveMs) return null;
      leaseCreations += 1;
      throw new Error("the claim must not create a lease after the reserve is consumed");
    },
    releaseWithoutProviderContact: async () => true,
    deliver: async () => {
      providerCalls += 1;
      throw new Error("the provider must not be called after a bounded quarantine stop");
    },
    complete: async () => true
  });

  const aggregate = await worker.runBatch(1);
  assert.equal(quarantineStages, 24);
  assert.equal(leaseCreations, 0);
  assert.equal(providerCalls, 0);
  assert.equal(aggregate.claimed, 0);
});
