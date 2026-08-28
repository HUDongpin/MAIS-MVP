import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import type { TeacherNoticeResendWebhookEnvelope } from "../teacherNoticeResendWebhook";
import {
  attestTeacherNoticeResendWebhookPostgresCatalog,
  attestTeacherNoticeResendWebhookSqliteSchema,
  maintainTeacherNoticeResendWebhookPostgres,
  maintainTeacherNoticeResendWebhookSqlite,
  migrateTeacherNoticeResendWebhookSqliteSchema,
  persistTeacherNoticeResendWebhookEventSqlite,
  purgeTeacherNoticeResendWebhookTombstonesSqlite,
  readTeacherNoticeResendWebhookDeliverySafePostgres,
  readTeacherNoticeResendWebhookDeliverySafeSqlite,
  runTeacherNoticeResendWebhookSqliteMaintenanceTransaction,
  runTeacherNoticeResendWebhookAtomicMigration,
  runTeacherNoticeResendWebhookPostgresAttestedTransaction,
  teacherNoticeEmailOutboxPostgresAdvisoryDependency,
  teacherNoticeResendWebhookPostgresAdvisoryNamespace,
  teacherNoticeResendWebhookPostgresMigrationDependencyLockStatements,
  teacherNoticeResendWebhookPostgresRuntimeRelationLockStatements,
  teacherNoticeResendWebhookPostgresSchemaStatements,
  teacherNoticeResendWebhookPostgresSchemaV2Statements,
  teacherNoticeResendWebhookExpectedPostgresCatalog,
  teacherNoticeResendWebhookSqliteSchemaV2,
  TeacherNoticeResendWebhookMaintenanceDeadlineError,
  teacherNoticeResendWebhookRetentionMs,
  teacherNoticeResendWebhookSchemaVersion,
  teacherNoticeResendWebhookTombstoneContract
} from "./teacherNoticeResendWebhookPersistence";
import {
  attestTeacherNoticeEmailOutboxV2PostgresCatalog,
  teacherNoticeEmailOutboxProviderMappingIntegrationContract,
  teacherNoticeEmailOutboxV2ExpectedPostgresCatalog
} from "./teacherNoticeEmailOutboxV2Dependency";
import { teacherNoticeEmailOutboxExpectedPostgresCatalog } from "./teacherNoticeEmailOutboxPersistence";

const providerMessageId = "550e8400-e29b-41d4-a716-446655440000";

function event(
  type: TeacherNoticeResendWebhookEnvelope["type"] = "email.delivered",
  overrides: Partial<TeacherNoticeResendWebhookEnvelope> = {}
): TeacherNoticeResendWebhookEnvelope {
  return {
    eventId: "evt-delivered",
    type,
    occurredAt: "2026-08-23T01:02:03.004Z",
    occurredAtNs: "1787446923004000001",
    priority: type === "email.sent" ? 0 : type === "email.delivered" ? 20 : 30,
    providerMessageId,
    ...overrides
  };
}

function createFrozenOutboxFixture(storage: DatabaseSync) {
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
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
    CREATE INDEX teacher_notice_email_outbox_eligible_idx
      ON teacher_notice_email_outbox (status, next_attempt_at, lease_expires_at, first_enqueued_at);
    CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq
      ON teacher_notice_email_outbox (provider_message_id)
      WHERE provider_message_id IS NOT NULL;
  `);
}

function insertAcceptedOutboxFixture(
  storage: DatabaseSync,
  id: string,
  acceptedProviderMessageId: string
) {
  const timestamp = "2026-08-23T00:00:00.000Z";
  storage.prepare(`
    INSERT INTO teacher_notice_email_outbox (
      id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id,
      teacher_id, queued_by_id, queued_by_fingerprint, class_id, email, locale,
      durable_delivery_key, content_revision, status, attempt_count, first_enqueued_at,
      next_attempt_at, provider_message_id, completed_at, created_at, updated_at,
      pii_expires_at, tombstone_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provider-accepted', 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, `notice-${id}`, `recipient-${id}`, `recipient-fingerprint-${id}`,
    `student-${id}`, `guardian-${id}`, `teacher-${id}`, `teacher-${id}`,
    `queued-fingerprint-${id}`, `class-${id}`, `${id}@example.invalid`, "en",
    `delivery-${id}`, "revision-1", timestamp, timestamp, acceptedProviderMessageId,
    timestamp, timestamp, timestamp, "2026-09-22T00:00:00.000Z",
    "2027-09-22T00:00:00.000Z"
  );
}

function sqliteSchemaDigest(storage: DatabaseSync): unknown {
  return storage.prepare(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE name LIKE 'teacher_notice_%'
    ORDER BY type, name
  `).all();
}

test("schema v3 migration requires the frozen outbox and exact SQLite readiness fails closed", () => {
  const missingDependency = new DatabaseSync(":memory:");
  try {
    assert.throws(
      () => migrateTeacherNoticeResendWebhookSqliteSchema(missingDependency),
      /outbox v2 integration dependency/i
    );
    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(missingDependency), false);
    assert.equal(
      (missingDependency.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'teacher_notice_resend_%'").get() as { count: number }).count,
      0,
      "failed migration must roll back every webhook relation"
    );
  } finally {
    missingDependency.close();
  }

  const storage = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(storage);
    migrateTeacherNoticeResendWebhookSqliteSchema(storage);
    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(storage), true);
    assert.equal(teacherNoticeResendWebhookSchemaVersion, 3);
    const unmatchedIndex = storage.prepare(`
      SELECT name, partial FROM pragma_index_list('teacher_notice_resend_webhook_events')
      WHERE name = 'teacher_notice_resend_webhook_events_unmatched_received_idx'
    `).get() as { name: string; partial: number };
    assert.equal(
      unmatchedIndex.name,
      "teacher_notice_resend_webhook_events_unmatched_received_idx"
    );
    assert.equal(unmatchedIndex.partial, 1);
    const reconciliationPlan = storage.prepare(`
      EXPLAIN QUERY PLAN
      SELECT COUNT(*), MIN(received_at), MAX(received_at)
      FROM teacher_notice_resend_webhook_events
      WHERE matched_outbox_id IS NULL
    `).all() as Array<{ detail: string }>;
    assert.match(
      reconciliationPlan.map((row) => row.detail).join("\n"),
      /teacher_notice_resend_webhook_events_unmatched_received_idx/u
    );
    storage.exec("ALTER TABLE teacher_notice_resend_webhook_events ADD COLUMN payload TEXT");
    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(storage), false);
  } finally {
    storage.close();
  }
});

test("SQLite migration upgrades exact v2 to v3 without losing durable webhook events", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(storage);
    storage.exec(teacherNoticeResendWebhookSqliteSchemaV2);
    storage.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events (
        event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
        priority, received_at, matched_outbox_id, retention_expires_at
      ) VALUES (?, ?, 'email.delivered', ?, ?, 20, ?, NULL, ?)
    `).run(
      "evt-v2-preserved",
      providerMessageId,
      "2026-08-23T01:02:03.004Z",
      "1787446923004000001",
      "2026-08-23T01:02:04.000Z",
      "2027-09-27T01:02:04.000Z"
    );

    migrateTeacherNoticeResendWebhookSqliteSchema(storage);

    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(storage), true);
    assert.equal(
      (storage.prepare(`
        SELECT count(*) AS count FROM teacher_notice_resend_webhook_events
        WHERE event_id = 'evt-v2-preserved'
      `).get() as { count: number }).count,
      1
    );
    const marker = storage.prepare(`
      SELECT singleton, version
      FROM teacher_notice_resend_webhook_schema_migrations
    `).get() as { singleton: number; version: number };
    assert.equal(marker.singleton, 1);
    assert.equal(marker.version, 3);
  } finally {
    storage.close();
  }
});

test("concrete SQLite migration is exact-state idempotent and rejects partial state before mutation", () => {
  const exact = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(exact);
    migrateTeacherNoticeResendWebhookSqliteSchema(exact);
    const before = sqliteSchemaDigest(exact);
    assert.doesNotThrow(() => migrateTeacherNoticeResendWebhookSqliteSchema(exact));
    assert.deepEqual(sqliteSchemaDigest(exact), before);
  } finally {
    exact.close();
  }

  const partial = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(partial);
    partial.exec("CREATE TABLE teacher_notice_resend_webhook_events (event_id TEXT PRIMARY KEY)");
    const before = sqliteSchemaDigest(partial);
    assert.throws(
      () => migrateTeacherNoticeResendWebhookSqliteSchema(partial),
      /partial or malformed/i
    );
    assert.deepEqual(sqliteSchemaDigest(partial), before);
  } finally {
    partial.close();
  }
});

test("SQLite readiness rejects same-name index drift, triggers, and incomplete outbox v2", () => {
  const ownDrift = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(ownDrift);
    migrateTeacherNoticeResendWebhookSqliteSchema(ownDrift);
    ownDrift.exec(`
      DROP INDEX teacher_notice_resend_message_state_outbox_uq;
      CREATE UNIQUE INDEX teacher_notice_resend_message_state_outbox_uq
        ON teacher_notice_resend_message_state (latest_event_id)
        WHERE latest_event_id IS NOT NULL;
    `);
    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(ownDrift), false);
  } finally {
    ownDrift.close();
  }

  const triggerDrift = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(triggerDrift);
    migrateTeacherNoticeResendWebhookSqliteSchema(triggerDrift);
    triggerDrift.exec(`
      CREATE TRIGGER teacher_notice_resend_webhook_events_shadow
      AFTER INSERT ON teacher_notice_resend_webhook_events
      BEGIN
        UPDATE teacher_notice_resend_webhook_events SET priority = 100 WHERE event_id = NEW.event_id;
      END;
    `);
    assert.equal(attestTeacherNoticeResendWebhookSqliteSchema(triggerDrift), false);
  } finally {
    triggerDrift.close();
  }

  const outboxDrift = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(outboxDrift);
    outboxDrift.exec("DROP INDEX teacher_notice_email_outbox_provider_message_uq");
    const before = sqliteSchemaDigest(outboxDrift);
    assert.throws(
      () => migrateTeacherNoticeResendWebhookSqliteSchema(outboxDrift),
      /outbox v2 integration dependency/i
    );
    assert.deepEqual(sqliteSchemaDigest(outboxDrift), before);
  } finally {
    outboxDrift.close();
  }
});

test("matched, stale, replayed, conflicting, and later-reconciled events are deterministic", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(setup);
    insertAcceptedOutboxFixture(setup, "outbox-private-1", providerMessageId);
    migrateTeacherNoticeResendWebhookSqliteSchema(setup);
  } finally {
    setup.close();
  }

  try {
    const delivered = event();
    const [first, replay] = await Promise.all([
      persistTeacherNoticeResendWebhookEventSqlite(dbPath, delivered, "2026-08-23T01:03:00.000Z"),
      persistTeacherNoticeResendWebhookEventSqlite(dbPath, delivered, "2026-08-23T01:03:01.000Z")
    ]);
    assert.deepEqual(new Set([first.status, replay.status]), new Set(["applied", "replayed"]));

    assert.deepEqual(await persistTeacherNoticeResendWebhookEventSqlite(dbPath, event("email.sent", {
      eventId: "evt-sent-late-arrival",
      occurredAt: "2026-08-23T01:00:00.000Z",
      occurredAtNs: "1787446800000000000",
      priority: 0
    }), "2026-08-23T01:04:00.000Z"), { status: "stale" });

    await assert.rejects(
      persistTeacherNoticeResendWebhookEventSqlite(dbPath, event("email.bounced", {
        occurredAtNs: "1787446923004000001",
        priority: 30
      }), "2026-08-23T01:05:00.000Z"),
      /conflicting replay/i
    );

    const unmatchedId = "650e8400-e29b-41d4-a716-446655440000";
    const unmatched = event("email.bounced", {
      eventId: "evt-unmatched",
      providerMessageId: unmatchedId,
      priority: 30
    });
    assert.deepEqual(
      await persistTeacherNoticeResendWebhookEventSqlite(dbPath, unmatched, "2026-08-23T01:06:00.000Z"),
      { status: "unmatched" }
    );
    const reconcile = new DatabaseSync(dbPath);
    insertAcceptedOutboxFixture(reconcile, "outbox-private-2", unmatchedId);
    reconcile.close();
    assert.deepEqual(
      await persistTeacherNoticeResendWebhookEventSqlite(dbPath, unmatched, "2026-08-23T01:07:00.000Z"),
      { status: "replayed" }
    );

    const inspect = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.equal(
        (inspect.prepare("SELECT count(*) AS count FROM teacher_notice_resend_webhook_events").get() as { count: number }).count,
        3,
        "concurrent replay must create exactly one journal row"
      );
      assert.equal(
        (inspect.prepare("SELECT matched_outbox_id FROM teacher_notice_resend_webhook_events WHERE event_id = ?")
          .get("evt-unmatched") as { matched_outbox_id: string }).matched_outbox_id,
        "outbox-private-2"
      );
    } finally {
      inspect.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bounded maintenance reconciles every unmatched row without provider replay exactly once", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-maintenance-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(setup);
    migrateTeacherNoticeResendWebhookSqliteSchema(setup);
  } finally {
    setup.close();
  }

  try {
    const providerA = "650e8400-e29b-41d4-a716-446655440000";
    const providerB = "750e8400-e29b-41d4-a716-446655440000";
    await persistTeacherNoticeResendWebhookEventSqlite(dbPath, event("email.delivered", {
      eventId: "evt-a-lower",
      providerMessageId: providerA,
      occurredAtNs: "1787446923004000001",
      priority: 20
    }), "2026-08-23T01:03:00.000Z");
    await persistTeacherNoticeResendWebhookEventSqlite(dbPath, event("email.failed", {
      eventId: "evt-a-latest",
      providerMessageId: providerA,
      occurredAtNs: "1787446923004000002",
      priority: 40
    }), "2026-08-23T01:04:00.000Z");
    await persistTeacherNoticeResendWebhookEventSqlite(dbPath, event("email.bounced", {
      eventId: "evt-b",
      providerMessageId: providerB,
      occurredAtNs: "1787446923004000003",
      priority: 30
    }), "2026-08-23T01:05:00.000Z");

    const attach = new DatabaseSync(dbPath);
    try {
      insertAcceptedOutboxFixture(attach, "outbox-a", providerA);
      insertAcceptedOutboxFixture(attach, "outbox-b", providerB);
    } finally {
      attach.close();
    }

    const first = await maintainTeacherNoticeResendWebhookSqlite(dbPath, {
      now: "2026-08-23T02:00:00.000Z",
      reconciliationLimit: 1,
      retentionLimit: 1
    });
    assert.deepEqual(first, {
      reconciledProviders: 1,
      eventsMatched: 1,
      statesUpserted: 1,
      eventsDeleted: 0,
      statesDeleted: 0,
      hasMoreReconciliation: true,
      hasMoreRetention: false
    });
    const [second, racingNoOp] = await Promise.all([
      maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-23T02:00:00.000Z",
        reconciliationLimit: 1,
        retentionLimit: 1
      }),
      maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-23T02:00:00.000Z",
        reconciliationLimit: 1,
        retentionLimit: 1
      })
    ]);
    assert.equal(second.reconciledProviders + racingNoOp.reconciledProviders, 2);
    assert.equal(second.eventsMatched + racingNoOp.eventsMatched, 2);

    const inspect = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.deepEqual((inspect.prepare(`
        SELECT matched_outbox_id, latest_event_id
        FROM teacher_notice_resend_message_state
        ORDER BY provider_message_id COLLATE BINARY
      `).all() as Array<Record<string, unknown>>).map((row) => ({ ...row })), [
        { matched_outbox_id: "outbox-a", latest_event_id: "evt-a-latest" },
        { matched_outbox_id: "outbox-b", latest_event_id: "evt-b" }
      ]);
      assert.equal(
        (inspect.prepare("SELECT count(*) AS count FROM teacher_notice_resend_webhook_events WHERE matched_outbox_id IS NULL").get() as { count: number }).count,
        0
      );
    } finally {
      inspect.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("one provider is reconciled under a hard global event-row budget", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-row-budget-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const provider = "850e8400-e29b-41d4-a716-446655440000";
  const setup = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(setup);
    migrateTeacherNoticeResendWebhookSqliteSchema(setup);
    insertAcceptedOutboxFixture(setup, "outbox-budget", provider);
    const insert = setup.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events
        (event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
          priority, received_at, matched_outbox_id, retention_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `);
    setup.exec("BEGIN IMMEDIATE");
    try {
      for (let index = 0; index < 213; index += 1) {
        insert.run(
          `evt-budget-${String(index).padStart(3, "0")}`,
          provider,
          index === 212 ? "email.delivered" : "email.sent",
          "2026-08-23T01:00:00.000Z",
          `1787446800000000${String(index).padStart(3, "0")}`,
          index === 212 ? 20 : 10,
          "2026-08-23T01:00:00.000Z",
          "2027-09-27T01:00:00.000Z"
        );
      }
      setup.exec("COMMIT");
    } catch (error) {
      setup.exec("ROLLBACK");
      throw error;
    }
  } finally {
    setup.close();
  }

  try {
    const results = [];
    for (let invocation = 0; invocation < 3; invocation += 1) {
      results.push(await maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-24T00:00:00.000Z",
        reconciliationLimit: 100,
        retentionLimit: 1
      }));
    }
    assert.deepEqual(results.map((entry) => entry.eventsMatched), [100, 100, 13]);
    assert.deepEqual(results.map((entry) => entry.reconciledProviders), [1, 1, 1]);
    assert.deepEqual(results.map((entry) => entry.hasMoreReconciliation), [true, true, false]);

    const inspect = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.equal(
        (inspect.prepare(`
          SELECT count(*) AS count
          FROM teacher_notice_resend_webhook_events
          WHERE matched_outbox_id IS NULL
        `).get() as { count: number }).count,
        0
      );
      assert.deepEqual({ ...(inspect.prepare(`
        SELECT matched_outbox_id, latest_event_id, latest_event_type
        FROM teacher_notice_resend_message_state
        WHERE provider_message_id = ?
      `).get(provider) as Record<string, unknown>) }, {
        matched_outbox_id: "outbox-budget",
        latest_event_id: "evt-budget-212",
        latest_event_type: "email.delivered"
      });
    } finally {
      inspect.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("SQLite maintenance crash rolls back reconciliation and retention together", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(storage);
    migrateTeacherNoticeResendWebhookSqliteSchema(storage);
    storage.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events
        (event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
          priority, received_at, matched_outbox_id, retention_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `).run(
      "evt-crash", providerMessageId, "email.delivered", "2025-01-01T00:00:00.000Z",
      "1735689600000000000", 20, "2025-01-01T00:00:00.000Z", "2025-02-01T00:00:00.000Z"
    );
    assert.throws(() => runTeacherNoticeResendWebhookSqliteMaintenanceTransaction(
      storage,
      (transactionStorage) => {
        transactionStorage.prepare("DELETE FROM teacher_notice_resend_webhook_events").run();
        throw new Error("simulated maintenance crash");
      }
    ), /simulated maintenance crash/u);
    assert.equal(
      (storage.prepare("SELECT count(*) AS count FROM teacher_notice_resend_webhook_events").get() as { count: number }).count,
      1
    );
  } finally {
    storage.close();
  }
});

test("SQLite maintenance deadline expiry rolls back already-started reconciliation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-deadline-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(setup);
    insertAcceptedOutboxFixture(setup, "outbox-deadline", providerMessageId);
    migrateTeacherNoticeResendWebhookSqliteSchema(setup);
    setup.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events
        (event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
          priority, received_at, matched_outbox_id, retention_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `).run(
      "evt-deadline", providerMessageId, "email.delivered",
      "2026-08-23T01:00:00.000Z", "1787446800000000000", 20,
      "2026-08-23T01:00:00.000Z", "2027-09-27T01:00:00.000Z"
    );
  } finally {
    setup.close();
  }

  let clockReads = 0;
  try {
    await assert.rejects(
      maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-24T00:00:00.000Z",
        reconciliationLimit: 100,
        retentionLimit: 100,
        deadlineAt: 20_000,
        monotonicNow: () => {
          clockReads += 1;
          return clockReads < 6 ? 0 : 18_001;
        }
      }),
      TeacherNoticeResendWebhookMaintenanceDeadlineError
    );
    const inspect = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.equal((inspect.prepare(`
        SELECT matched_outbox_id
        FROM teacher_notice_resend_webhook_events
        WHERE event_id = 'evt-deadline'
      `).get() as { matched_outbox_id: string | null }).matched_outbox_id, null);
      assert.equal((inspect.prepare(`
        SELECT count(*) AS count
        FROM teacher_notice_resend_message_state
      `).get() as { count: number }).count, 0);
    } finally {
      inspect.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("provider contact is unique and the read model omits provider and event identifiers", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const storage = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(storage);
    insertAcceptedOutboxFixture(storage, "outbox-1", providerMessageId);
    assert.throws(
      () => insertAcceptedOutboxFixture(storage, "outbox-2", providerMessageId),
      /unique constraint/i
    );
    migrateTeacherNoticeResendWebhookSqliteSchema(storage);
  } finally {
    storage.close();
  }
  try {
    await persistTeacherNoticeResendWebhookEventSqlite(dbPath, event(), "2026-08-23T01:04:00.000Z");
    const safe = readTeacherNoticeResendWebhookDeliverySafeSqlite(dbPath, "outbox-1");
    assert.deepEqual(safe, {
      deliveryStatus: "delivered",
      lastEventAt: "2026-08-23T01:02:03.004Z"
    });
    assert.doesNotMatch(JSON.stringify(safe), /550e8400|evt-delivered|outbox-1/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("privacy-safe 400-day tombstone retention deletes expired journal and aggregate rows", () => {
  assert.deepEqual(teacherNoticeResendWebhookTombstoneContract, {
    retentionDays: 400,
    retainedFields: [
      "event_id", "provider_message_id", "event_type", "occurred_at", "occurred_at_ns",
      "priority", "received_at", "matched_outbox_id", "retention_expires_at"
    ],
    containsContactPii: false,
    terminalAction: "delete"
  });
  const storage = new DatabaseSync(":memory:");
  try {
    createFrozenOutboxFixture(storage);
    insertAcceptedOutboxFixture(storage, "outbox-1", providerMessageId);
    migrateTeacherNoticeResendWebhookSqliteSchema(storage);
    const oldReceivedAt = "2025-01-01T00:00:00.000Z";
    storage.prepare(`
      INSERT INTO teacher_notice_resend_webhook_events
        (event_id, provider_message_id, event_type, occurred_at, occurred_at_ns, priority, received_at, matched_outbox_id, retention_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("evt-old", providerMessageId, "email.delivered", oldReceivedAt, "1735689600000000000", 20,
      oldReceivedAt, "outbox-1", new Date(Date.parse(oldReceivedAt) + teacherNoticeResendWebhookRetentionMs).toISOString());
    storage.prepare(`
      INSERT INTO teacher_notice_resend_message_state
        (provider_message_id, matched_outbox_id, latest_event_id, latest_event_type, latest_occurred_at, latest_occurred_at_ns, latest_priority, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(providerMessageId, "outbox-1", "evt-old", "email.delivered", oldReceivedAt, "1735689600000000000", 20, oldReceivedAt);
    assert.deepEqual(purgeTeacherNoticeResendWebhookTombstonesSqlite(
      storage,
      "2026-08-24T00:00:00.000Z"
    ), { eventsDeleted: 1, statesDeleted: 1 });
  } finally {
    storage.close();
  }
});

test("concurrent SQLite retention is exact once and removes the privacy-safe read model", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-retention-"));
  const dbPath = path.join(directory, "webhook.sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    createFrozenOutboxFixture(setup);
    insertAcceptedOutboxFixture(setup, "outbox-retention", providerMessageId);
    migrateTeacherNoticeResendWebhookSqliteSchema(setup);
  } finally {
    setup.close();
  }
  try {
    await persistTeacherNoticeResendWebhookEventSqlite(
      dbPath,
      event(),
      "2025-01-01T00:00:00.000Z"
    );
    assert.deepEqual(readTeacherNoticeResendWebhookDeliverySafeSqlite(
      dbPath,
      "outbox-retention"
    ), {
      deliveryStatus: "delivered",
      lastEventAt: "2026-08-23T01:02:03.004Z"
    });
    const results = await Promise.all([
      maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-24T00:00:00.000Z",
        reconciliationLimit: 1,
        retentionLimit: 1
      }),
      maintainTeacherNoticeResendWebhookSqlite(dbPath, {
        now: "2026-08-24T00:00:00.000Z",
        reconciliationLimit: 1,
        retentionLimit: 1
      })
    ]);
    assert.equal(results.reduce((sum, result) => sum + result.eventsDeleted, 0), 1);
    assert.equal(results.reduce((sum, result) => sum + result.statesDeleted, 0), 1);
    assert.equal(
      readTeacherNoticeResendWebhookDeliverySafeSqlite(dbPath, "outbox-retention"),
      null
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("PostgreSQL schema and runtime contract use safe qualifications and per-message advisory locking", () => {
  assert.equal(teacherNoticeEmailOutboxPostgresAdvisoryDependency, "mais-teacher-notice-email-outbox-v2");
  assert.equal(teacherNoticeResendWebhookPostgresAdvisoryNamespace, "mais-resend-teacher-notice-webhook-v2");
  assert.ok(teacherNoticeResendWebhookPostgresSchemaStatements.length >= 5);
  const schema = teacherNoticeResendWebhookPostgresSchemaStatements.join("\n");
  assert.match(schema, /public\.teacher_notice_resend_webhook_events/u);
  assert.match(schema, /public\.teacher_notice_resend_message_state/u);
  assert.match(schema, /public\.teacher_notice_resend_webhook_schema_migrations/u);
  assert.match(schema, /version\s*=\s*3/u);
  assert.match(
    schema,
    /\(received_at\)\s+WHERE matched_outbox_id IS NULL/u
  );
  const schemaV2 = teacherNoticeResendWebhookPostgresSchemaV2Statements.join("\n");
  assert.match(schemaV2, /version\s*=\s*2/u);
  assert.match(schemaV2, /webhook-schema-v2/u);
  assert.doesNotMatch(schemaV2, /unmatched_received_idx/u);
  assert.doesNotMatch(schema, /raw_body|payload|subject|recipient|email_address/iu);
});

test("PostgreSQL lock order protects both exact catalogs before provider mapping DML", () => {
  assert.deepEqual(teacherNoticeResendWebhookPostgresMigrationDependencyLockStatements, [
    "LOCK TABLE public.teacher_notice_email_outbox IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE"
  ]);
  assert.deepEqual(teacherNoticeResendWebhookPostgresRuntimeRelationLockStatements, [
    "LOCK TABLE public.teacher_notice_email_outbox IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW EXCLUSIVE MODE",
    "LOCK TABLE public.teacher_notice_resend_message_state IN ROW EXCLUSIVE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE"
  ]);
  const source = readFileSync(
    path.join(process.cwd(), "lib/server/userStore/teacherNoticeResendWebhookPersistence.ts"),
    "utf8"
  );
  const transactionConfiguration = source.slice(
    source.indexOf("async function configureTeacherNoticeResendWebhookPostgresTransaction"),
    source.indexOf("export async function migrateTeacherNoticeResendWebhookPostgresSchema")
  );
  assert.match(transactionConfiguration, /SET LOCAL search_path/u);
  assert.match(transactionConfiguration, /SET LOCAL lock_timeout/u);
  assert.match(transactionConfiguration, /SET LOCAL statement_timeout/u);
  assert.match(transactionConfiguration, /SET LOCAL idle_in_transaction_session_timeout/u);
  assert.doesNotMatch(transactionConfiguration, /set_config/u);
  assert.match(source, /WHERE provider_message_id = \$\{event\.providerMessageId\}[\s\S]*?LIMIT 2\s+FOR SHARE/u);
  assert.deepEqual(teacherNoticeEmailOutboxProviderMappingIntegrationContract, {
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
  });
});

test("PostgreSQL maintenance is bounded, uses the database clock, and skips locked retention rows", () => {
  assert.equal(typeof maintainTeacherNoticeResendWebhookPostgres, "function");
  assert.equal(typeof readTeacherNoticeResendWebhookDeliverySafePostgres, "function");
  const source = readFileSync(
    path.join(process.cwd(), "lib/server/userStore/teacherNoticeResendWebhookPersistence.ts"),
    "utf8"
  );
  assert.match(source, /maintainTeacherNoticeResendWebhookPostgres[\s\S]*?pg_catalog\.clock_timestamp\(\)/u);
  assert.match(source, /retention_expires_at <= \$\{databaseNow\}[\s\S]*?LIMIT \$\{retentionLimit\}[\s\S]*?FOR UPDATE SKIP LOCKED/u);
  assert.match(source, /ORDER BY event\.provider_message_id[\s\S]*?LIMIT \$\{reconciliationLimit\}[\s\S]*?FOR UPDATE OF event SKIP LOCKED/u);
  assert.match(source, /AND event_id IN \$\{sql\(eventIds\)\}/u);
  assert.doesNotMatch(source, /GROUP BY event\.provider_message_id[\s\S]*?LIMIT \$\{reconciliationLimit\}/u);
  assert.match(source, /configureTeacherNoticeResendWebhookPostgresMaintenanceTransaction/u);
  assert.match(source, /SET LOCAL statement_timeout = '1000ms'/u);
  assert.match(source, /beforeStep: ensureTimeRemaining/u);
});

test("the frozen webhook dependency matches every authoritative outbox catalog field it shares", () => {
  const authoritativeIndexNames = new Set<string>(
    teacherNoticeEmailOutboxExpectedPostgresCatalog.indexes.map((entry) => entry.name)
  );
  const dependencySharedCatalog = {
    relations: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.relations,
    columns: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.columns,
    constraints: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.constraints.map((entry) => ({
      relation: entry.relation,
      name: entry.name,
      type: entry.type,
      validated: entry.validated,
      deferrable: entry.deferrable,
      initiallyDeferred: entry.initiallyDeferred,
      backingIndexName: entry.backingIndexName,
      relationOidMatches: entry.relationOidMatches,
      backingIndexOidMatches: entry.backingIndexOidMatches,
      keyColumns: entry.keyColumns,
      expression: entry.expression
    })),
    indexes: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.indexes
      .filter((entry) => authoritativeIndexNames.has(entry.name))
      .map((entry) => ({
        relation: entry.relation,
        name: entry.name,
        accessMethod: entry.accessMethod,
        valid: entry.valid,
        ready: entry.ready,
        live: entry.live,
        unique: entry.unique,
        primary: entry.primary,
        immediate: entry.immediate,
        partial: entry.partial,
        predicate: entry.predicate,
        keyCount: entry.keyColumns.length,
        attributeCount: entry.keyColumns.length,
        keyColumns: entry.keyColumns,
        indOptions: entry.indOptions,
        opclasses: entry.opclasses,
        collations: entry.collations
      })),
    integrity: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.integrity,
    markerComment: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.markerComment,
    markerRows: teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.markerRows
  };

  assert.deepEqual(
    dependencySharedCatalog,
    teacherNoticeEmailOutboxExpectedPostgresCatalog,
    "the webhook dependency may extend the catalog, but every shared PostgreSQL semantic must stay authoritative"
  );
});

test("PostgreSQL catalog attesters reject same-name semantic drift and incomplete outbox v2", () => {
  const stateFieldsConstraintName = "teacher_notice_email_outbox_state_fields_ck";
  const dependencyStateFieldsConstraint = teacherNoticeEmailOutboxV2ExpectedPostgresCatalog.constraints
    .find((entry) => entry.name === stateFieldsConstraintName);
  const authoritativeStateFieldsConstraint = teacherNoticeEmailOutboxExpectedPostgresCatalog.constraints
    .find((entry) => entry.name === stateFieldsConstraintName);
  assert.ok(dependencyStateFieldsConstraint);
  assert.ok(authoritativeStateFieldsConstraint);
  assert.equal(
    dependencyStateFieldsConstraint.expression,
    authoritativeStateFieldsConstraint.expression,
    "the frozen webhook dependency must match the PostgreSQL-verified outbox constraint"
  );

  assert.equal(
    attestTeacherNoticeResendWebhookPostgresCatalog(
      structuredClone(teacherNoticeResendWebhookExpectedPostgresCatalog)
    ),
    true
  );
  assert.equal(
    attestTeacherNoticeEmailOutboxV2PostgresCatalog(
      structuredClone(teacherNoticeEmailOutboxV2ExpectedPostgresCatalog)
    ),
    true
  );

  const webhookMutations = [
    (catalog: Record<string, any>) => {
      catalog.relations[0].persistence = "u";
    },
    (catalog: Record<string, any>) => {
      catalog.relations[1].rowSecurity = true;
    },
    (catalog: Record<string, any>) => {
      catalog.relations[2].forceRowSecurity = true;
    },
    (catalog: Record<string, any>) => {
      catalog.columns[0].defaultExpression = "current_user";
    },
    (catalog: Record<string, any>) => {
      catalog.constraints.find((entry: any) => entry.type === "c").expression = "true";
    },
    (catalog: Record<string, any>) => {
      catalog.constraints.find((entry: any) => entry.type === "f").referencedColumns = ["provider_message_id"];
    },
    (catalog: Record<string, any>) => {
      catalog.indexes.find((entry: any) => entry.name === "teacher_notice_resend_message_state_outbox_uq").keyColumns = ["latest_event_id"];
    },
    (catalog: Record<string, any>) => {
      catalog.integrity.userTriggerCount = 1;
    }
  ];
  for (const mutate of webhookMutations) {
    const drifted = structuredClone(teacherNoticeResendWebhookExpectedPostgresCatalog) as Record<string, any>;
    mutate(drifted);
    assert.equal(attestTeacherNoticeResendWebhookPostgresCatalog(drifted), false);
  }

  const outboxRelationMutations = [
    (catalog: Record<string, any>) => {
      catalog.relations[0].persistence = "u";
    },
    (catalog: Record<string, any>) => {
      catalog.relations[1].rowSecurity = true;
    },
    (catalog: Record<string, any>) => {
      catalog.relations[0].forceRowSecurity = true;
    }
  ];
  for (const mutate of outboxRelationMutations) {
    const drifted = structuredClone(
      teacherNoticeEmailOutboxV2ExpectedPostgresCatalog
    ) as Record<string, any>;
    mutate(drifted);
    assert.equal(attestTeacherNoticeEmailOutboxV2PostgresCatalog(drifted), false);
  }

  const missingProviderUniqueness = structuredClone(
    teacherNoticeEmailOutboxV2ExpectedPostgresCatalog
  ) as Record<string, any>;
  missingProviderUniqueness.indexes = missingProviderUniqueness.indexes.filter(
    (entry: any) => entry.name !== "teacher_notice_email_outbox_provider_message_uq"
  );
  missingProviderUniqueness.integrity.indexCount -= 1;
  assert.equal(
    attestTeacherNoticeEmailOutboxV2PostgresCatalog(missingProviderUniqueness),
    false
  );
});

test("PostgreSQL DML uses one transaction in fixed lock, exact-attest, then mutation order", async () => {
  const transaction = { id: "same-transaction" };
  const order: string[] = [];
  const step = (name: string, result?: boolean | string) => async (sql: typeof transaction) => {
    assert.equal(sql, transaction);
    order.push(name);
    return result;
  };
  const result = await runTeacherNoticeResendWebhookPostgresAttestedTransaction({
    sql: transaction,
    configure: step("configure") as (sql: typeof transaction) => Promise<void>,
    lockOutboxSchema: step("lock-outbox-schema") as (sql: typeof transaction) => Promise<void>,
    lockWebhookSchema: step("lock-webhook-schema") as (sql: typeof transaction) => Promise<void>,
    lockProviderMessage: step("lock-provider-message") as (sql: typeof transaction) => Promise<void>,
    lockRelations: step("lock-relations") as (sql: typeof transaction) => Promise<void>,
    attest: step("attest", true) as (sql: typeof transaction) => Promise<boolean>,
    operation: step("dml", "applied") as (sql: typeof transaction) => Promise<string>
  });
  assert.equal(result, "applied");
  assert.deepEqual(order, [
    "configure",
    "lock-outbox-schema",
    "lock-webhook-schema",
    "lock-provider-message",
    "lock-relations",
    "attest",
    "dml"
  ]);

  let mutated = false;
  await assert.rejects(runTeacherNoticeResendWebhookPostgresAttestedTransaction({
    sql: transaction,
    configure: async () => undefined,
    lockOutboxSchema: async () => undefined,
    lockWebhookSchema: async () => undefined,
    lockProviderMessage: async () => undefined,
    lockRelations: async () => undefined,
    attest: async () => false,
    operation: async () => {
      mutated = true;
      return "forbidden";
    }
  }), /schema v3 could not be attested/i);
  assert.equal(mutated, false);
});

test("atomic migration installs empty, upgrades v2, is idempotent at v3, and rejects partial state", async () => {
  type State = "empty" | "upgradeable" | "exact" | "partial";
  type Transaction = { state: State };
  const run = async (initial: State) => {
    let durable = initial;
    let migrated = 0;
    let upgraded = 0;
    await runTeacherNoticeResendWebhookAtomicMigration<Transaction>({
      begin: async (operation) => {
        let transaction = durable;
        await operation({
          get state() { return transaction; },
          set state(value) { transaction = value; }
        });
        durable = transaction;
      },
      inspect: async (transaction) => transaction.state,
      migrate: async (transaction) => {
        migrated += 1;
        transaction.state = "exact";
      },
      upgrade: async (transaction) => {
        upgraded += 1;
        transaction.state = "exact";
      },
      attest: async (transaction) => transaction.state === "exact"
    });
    return { durable, migrated, upgraded };
  };
  assert.deepEqual(await run("empty"), { durable: "exact", migrated: 1, upgraded: 0 });
  assert.deepEqual(await run("upgradeable"), {
    durable: "exact",
    migrated: 0,
    upgraded: 1
  });
  assert.deepEqual(await run("exact"), { durable: "exact", migrated: 0, upgraded: 0 });
  await assert.rejects(run("partial"), /partial or malformed schema/i);
});
