import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { teacherNoticeEmailOutboxSqliteSchema } from
  "./teacherNoticeEmailOutboxPersistence";
import {
  acquireTeacherNoticeOperationalPostgresReadLocks,
  createTeacherNoticeOperationalReadModel,
  readTeacherNoticeOperationalSnapshotFromAttestedPostgres,
  readTeacherNoticeOperationalSnapshotFromPostgres,
  readTeacherNoticeOperationalSnapshotFromSqlite as readTeacherNoticeOperationalSnapshotFromSqliteRaw,
  readTeacherNoticeOperationalSnapshotWithinPostgresTransaction,
  type TeacherNoticeOperationalSnapshot
} from "./teacherNoticeOperationalReadModel";
import { teacherNoticeResendWebhookSqliteSchema } from
  "./teacherNoticeResendWebhookPersistence";
import {
  migrateTeacherNoticeEmailCronHeartbeatSqliteSchema
} from "./teacherNoticeEmailCronHeartbeatPersistence";

const expectedReleaseSha = "a".repeat(40);

function readTeacherNoticeOperationalSnapshotFromSqlite(
  arguments_: Omit<
    Parameters<typeof readTeacherNoticeOperationalSnapshotFromSqliteRaw>[0],
    "expectedReleaseSha"
  > & { expectedReleaseSha?: string }
) {
  arguments_.storage.exec(`
    CREATE TABLE IF NOT EXISTS teacher_notice_email_cron_heartbeat (
      singleton INTEGER PRIMARY KEY,
      run_id TEXT NOT NULL,
      release_sha TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      last_failed_at TEXT
    )
  `);
  return readTeacherNoticeOperationalSnapshotFromSqliteRaw({
    expectedReleaseSha,
    ...arguments_
  });
}

test("SQLite operational read model returns only aggregate queue, reconciliation, and recent provider outcomes", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('pending', '2026-08-24T11:40:00.000Z', '2026-08-24T11:40:00.000Z', NULL, NULL),
      ('retryable', '2026-08-24T11:50:00.000Z', '2026-08-24T11:50:00.000Z', NULL, NULL),
      ('leased', '2026-08-24T11:55:00.000Z', '2026-08-24T11:55:00.000Z', '2026-08-24T11:59:00.000Z', NULL),
      ('provider-accepted', '2026-08-24T11:30:00.000Z', '2026-08-24T11:30:00.000Z', NULL, '2026-08-24T11:35:00.000Z'),
      ('blocked', '2026-08-24T11:20:00.000Z', '2026-08-24T11:20:00.000Z', NULL, '2026-08-24T11:30:00.000Z'),
      ('dead-letter', '2026-08-24T09:00:00.000Z', '2026-08-24T09:00:00.000Z', NULL, '2026-08-24T10:00:00.000Z');
    INSERT INTO teacher_notice_resend_webhook_events VALUES
      ('email.delivered', '2026-08-24T11:50:00.000Z', 'outbox-1'),
      ('email.bounced', '2026-08-24T11:45:00.000Z', 'outbox-2'),
      ('email.failed', '2026-08-24T10:30:00.000Z', 'outbox-3'),
      ('email.delivery_delayed', '2026-08-24T11:58:00.000Z', NULL);
  `);

  const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });

  assert.deepEqual(snapshot, {
    observedAt: "2026-08-24T12:00:00.000Z",
    scheduler: {
      candidateMatch: false,
      heartbeatAgeSeconds: null,
      heartbeatStatus: "missing",
      lastFailureAgeSeconds: null
    },
    outbox: {
      actionableCount: 2,
      counts: {
        blocked: 1,
        deadLetter: 1,
        leased: 1,
        pending: 1,
        providerAccepted: 1,
        retryable: 1
      },
      oldestActionableAgeSeconds: 1_200,
      recentTerminalCounts: { blocked: 1, deadLetter: 0 },
      staleLeaseCount: 1
    },
    providerEvents: {
      counts: {
        bounced: 1,
        complained: 0,
        delivered: 1,
        deliveryDelayed: 1,
        failed: 0,
        sent: 0,
        suppressed: 0
      },
      latestReceivedAt: "2026-08-24T11:58:00.000Z",
      windowSeconds: 3_600
    },
    webhookReconciliation: {
      oldestUnmatchedAgeSeconds: 120,
      unmatchedCount: 1
    }
  });
  assert.doesNotMatch(
    JSON.stringify(snapshot),
    /email|recipient|student|provider_message|matched_outbox|error|secret/iu
  );

  storage.close();
});

test("SQLite operational read model separates total queued rows from worker-actionable rows", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('pending', '2026-08-24T11:40:00.000Z', '2026-08-24T11:59:00.000Z', NULL, NULL),
      ('retryable', '2026-08-24T10:00:00.000Z', '2026-08-24T12:30:00.000Z', NULL, NULL);
  `);

  const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });

  assert.equal(snapshot.outbox.counts.pending, 1);
  assert.equal(snapshot.outbox.counts.retryable, 1);
  assert.equal(snapshot.outbox.actionableCount, 1);
  assert.equal(snapshot.outbox.oldestActionableAgeSeconds, 1_200);

  storage.close();
});

test("SQLite operational read model exposes only candidate match and durable heartbeat state", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    CREATE TABLE teacher_notice_email_cron_heartbeat (
      singleton INTEGER PRIMARY KEY,
      run_id TEXT NOT NULL,
      release_sha TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      last_failed_at TEXT
    );
    INSERT INTO teacher_notice_email_cron_heartbeat VALUES (
      1,
      '00000000-0000-4000-8000-000000000001',
      '${"a".repeat(40)}',
      'succeeded',
      '2026-08-24T11:58:00.000Z',
      '2026-08-24T11:59:00.000Z',
      '2026-08-24T11:59:00.000Z',
      '2026-08-24T11:50:00.000Z'
    );
  `);

  const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({
    expectedReleaseSha: "a".repeat(40),
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });

  assert.deepEqual(snapshot.scheduler, {
    candidateMatch: true,
    heartbeatAgeSeconds: 60,
    heartbeatStatus: "succeeded",
    lastFailureAgeSeconds: 600
  });
  assert.doesNotMatch(JSON.stringify(snapshot), /00000000|a{40}|releaseSha|runId/u);

  const mismatch = readTeacherNoticeOperationalSnapshotFromSqlite({
    expectedReleaseSha: "b".repeat(40),
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });
  assert.equal(mismatch.scheduler.candidateMatch, false);
  storage.close();
});

test("operational ages fail closed when a durable timestamp is materially in the future", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('pending', '2026-08-24T12:00:06.000Z', '2026-08-24T11:59:00.000Z', NULL, NULL);
  `);

  assert.throws(
    () => readTeacherNoticeOperationalSnapshotFromSqlite({
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      storage
    }),
    /future/u
  );

  storage.prepare(`
    UPDATE teacher_notice_email_outbox
    SET first_enqueued_at = '2026-08-24T12:00:05.000Z'
  `).run();
  assert.equal(readTeacherNoticeOperationalSnapshotFromSqlite({
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  }).outbox.oldestActionableAgeSeconds, 0);

  storage.close();
});

test("a future actionable timestamp cannot hide behind an older queue minimum", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('pending', '2026-08-24T11:00:00.000Z', '2026-08-24T11:59:00.000Z', NULL, NULL),
      ('retryable', '2099-01-01T00:00:00.000Z', '2026-08-24T11:59:00.000Z', NULL, NULL);
  `);

  assert.throws(
    () => readTeacherNoticeOperationalSnapshotFromSqlite({
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      storage
    }),
    /future/u
  );

  storage.close();
});

test("a future terminal timestamp cannot hide behind aggregate terminal counts", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('blocked', '2026-08-24T10:00:00.000Z', '2026-08-24T10:00:00.000Z', NULL, '2026-08-24T10:30:00.000Z'),
      ('dead-letter', '2026-08-24T10:00:00.000Z', '2026-08-24T10:00:00.000Z', NULL, '2099-01-01T00:00:00.000Z');
  `);

  assert.throws(
    () => readTeacherNoticeOperationalSnapshotFromSqlite({
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      storage
    }),
    /future/u
  );

  storage.close();
});

test("a future provider-accepted completion cannot hide behind an older terminal timestamp", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_email_outbox VALUES
      ('blocked', '2026-08-24T10:00:00.000Z', '2026-08-24T10:00:00.000Z', NULL, '2026-08-24T10:30:00.000Z'),
      ('provider-accepted', '2026-08-24T10:00:00.000Z', '2026-08-24T10:00:00.000Z', NULL, '2099-01-01T00:00:00.000Z');
  `);

  assert.throws(
    () => readTeacherNoticeOperationalSnapshotFromSqlite({
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      storage
    }),
    /future/u
  );

  storage.close();
});

test("provider outcome integrity and counts are bounded to the recent observation window", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_resend_webhook_events VALUES
      ('email.unknown-legacy', '2026-08-24T10:00:00.000Z', 'outbox-old'),
      ('email.delivered', '2026-08-24T11:50:00.000Z', 'outbox-recent');
  `);

  const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });

  assert.equal(snapshot.providerEvents.counts.delivered, 1);
  assert.equal(snapshot.providerEvents.latestReceivedAt, "2026-08-24T11:50:00.000Z");

  storage.close();
});

test("provider outcomes fail closed when the latest durable receipt is materially in the future", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
    INSERT INTO teacher_notice_resend_webhook_events VALUES
      ('email.delivered', '2026-08-24T12:00:06.000Z', 'outbox-future');
  `);

  assert.throws(
    () => readTeacherNoticeOperationalSnapshotFromSqlite({
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      storage
    }),
    /future/u
  );

  storage.close();
});

test("SQLite operational read model represents an empty durable store with zero counts and null ages", () => {
  const storage = new DatabaseSync(":memory:");
  storage.exec(`
    CREATE TABLE teacher_notice_email_outbox (
      status TEXT NOT NULL,
      first_enqueued_at TEXT NOT NULL,
      next_attempt_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT
    );
    CREATE TABLE teacher_notice_resend_webhook_events (
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      matched_outbox_id TEXT
    );
  `);

  const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    storage
  });

  assert.deepEqual(snapshot.outbox, {
    actionableCount: 0,
    counts: {
      blocked: 0,
      deadLetter: 0,
      leased: 0,
      pending: 0,
      providerAccepted: 0,
      retryable: 0
    },
    oldestActionableAgeSeconds: null,
    recentTerminalCounts: { blocked: 0, deadLetter: 0 },
    staleLeaseCount: 0
  });
  assert.deepEqual(snapshot.providerEvents, {
    counts: {
      bounced: 0,
      complained: 0,
      delivered: 0,
      deliveryDelayed: 0,
      failed: 0,
      sent: 0,
      suppressed: 0
    },
    latestReceivedAt: null,
    windowSeconds: 3_600
  });
  assert.deepEqual(snapshot.webhookReconciliation, {
    oldestUnmatchedAgeSeconds: null,
    unmatchedCount: 0
  });
  assert.deepEqual(snapshot.scheduler, {
    candidateMatch: false,
    heartbeatAgeSeconds: null,
    heartbeatStatus: "missing",
    lastFailureAgeSeconds: null
  });

  storage.close();
});

test("configured operational read model fails closed before I/O for unsupported or incomplete storage config", async () => {
  let reads = 0;
  const dependencies = {
    postgresRead: async () => {
      reads += 1;
      throw new Error("must not run");
    },
    sqliteRead: () => {
      reads += 1;
      throw new Error("must not run");
    }
  };

  await assert.rejects(
    createTeacherNoticeOperationalReadModel({
      ...dependencies,
      env: { HK_MATH_STORAGE_PROVIDER: "memory" }
    })(),
    /unsupported/u
  );
  await assert.rejects(
    createTeacherNoticeOperationalReadModel({
      ...dependencies,
      env: { HK_MATH_STORAGE_PROVIDER: "postgres", POSTGRES_URL: "   " }
    })(),
    /POSTGRES_URL/u
  );
  assert.equal(reads, 0);
});

test("configured operational read model rejects non-durable SQLite on Vercel before I/O", async () => {
  let reads = 0;
  const read = createTeacherNoticeOperationalReadModel({
    env: {
      HK_MATH_DB_PATH: path.join(tmpdir(), "teacher-notice-operational-never-open.sqlite"),
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      VERCEL: "1"
    },
    sqliteRead: () => {
      reads += 1;
      throw new Error("must not run");
    }
  });

  await assert.rejects(read(), /durable/u);
  assert.equal(reads, 0);
});

test("configured PostgreSQL operational reads do not derive observation time from the app host", async () => {
  let receivedWindow: number | undefined;
  const read = createTeacherNoticeOperationalReadModel({
    env: {
      HK_MATH_STORAGE_PROVIDER: "postgres",
      MAIS_RELEASE_SHA: expectedReleaseSha,
      POSTGRES_URL: "postgres://fixture.invalid/health"
    },
    now: () => {
      throw new Error("application clock must not be consulted for PostgreSQL observation");
    },
    postgresRead: async (_postgresUrl, arguments_) => {
      receivedWindow = arguments_.recentWindowSeconds;
      return { observedAt: "2026-08-24T12:00:00.000Z" } as never;
    }
  });

  assert.equal((await read()).observedAt, "2026-08-24T12:00:00.000Z");
  assert.equal(receivedWindow, 3_600);
});

test("configured PostgreSQL operational reads coalesce only overlapping health requests", async () => {
  let reads = 0;
  let release: (() => void) | undefined;
  const firstRead = new Promise<void>((resolve) => {
    release = resolve;
  });
  const read = createTeacherNoticeOperationalReadModel({
    env: {
      HK_MATH_STORAGE_PROVIDER: "postgres",
      MAIS_RELEASE_SHA: expectedReleaseSha,
      POSTGRES_URL: "postgres://fixture.invalid/health"
    },
    postgresRead: async () => {
      reads += 1;
      if (reads === 1) await firstRead;
      return { observedAt: `2026-08-24T12:00:0${reads}.000Z` } as never;
    }
  });

  const overlapping = [read(), read(), read()];
  await Promise.resolve();
  assert.equal(reads, 1);
  release?.();
  assert.deepEqual(
    (await Promise.all(overlapping)).map((snapshot) => snapshot.observedAt),
    [
      "2026-08-24T12:00:01.000Z",
      "2026-08-24T12:00:01.000Z",
      "2026-08-24T12:00:01.000Z"
    ]
  );

  assert.equal((await read()).observedAt, "2026-08-24T12:00:02.000Z");
  assert.equal(reads, 2);
});

test("configured PostgreSQL operational read coalescing releases a failed request", async () => {
  let reads = 0;
  const read = createTeacherNoticeOperationalReadModel({
    env: {
      HK_MATH_STORAGE_PROVIDER: "postgres",
      MAIS_RELEASE_SHA: expectedReleaseSha,
      POSTGRES_URL: "postgres://fixture.invalid/health"
    },
    postgresRead: async () => {
      reads += 1;
      if (reads === 1) throw new Error("fixture read failure");
      return { observedAt: "2026-08-24T12:00:02.000Z" } as never;
    }
  });

  await assert.rejects(read(), /fixture read failure/u);
  assert.equal((await read()).observedAt, "2026-08-24T12:00:02.000Z");
  assert.equal(reads, 2);
});

test("configured operational read model opens and attests the existing SQLite contracts read-only", async () => {
  const testSource = await readFile(path.join(
    process.cwd(),
    "lib/server/userStore/teacherNoticeOperationalReadModel.test.ts"
  ), "utf8");
  assert.doesNotMatch(
    testSource,
    /mkdtemp\(path\.join\(\s*"\/Volumes\//u,
    "operational fixtures must not depend on one developer's absolute workspace path"
  );
  assert.match(testSource, /mkdtemp\(path\.join\(\s*tmpdir\(\),/u);
  const temporaryDirectory = await mkdtemp(path.join(
    tmpdir(),
    "teacher-notice-operational-"
  ));
  try {
    const dbPath = path.join(temporaryDirectory, "operational.sqlite");
    const setup = new DatabaseSync(dbPath);
    try {
      setup.exec(teacherNoticeEmailOutboxSqliteSchema);
      setup.exec(teacherNoticeResendWebhookSqliteSchema);
      migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(setup);
    } finally {
      setup.close();
    }

    const snapshot = await createTeacherNoticeOperationalReadModel({
      env: {
        HK_MATH_DB_PATH: dbPath,
        HK_MATH_STORAGE_PROVIDER: "sqlite",
        MAIS_RELEASE_SHA: expectedReleaseSha
      },
      now: () => new Date("2026-08-24T12:00:00.000Z")
    })();

    assert.equal(snapshot.observedAt, "2026-08-24T12:00:00.000Z");
    assert.deepEqual(snapshot.outbox.counts, {
      blocked: 0,
      deadLetter: 0,
      leased: 0,
      pending: 0,
      providerAccepted: 0,
      retryable: 0
    });
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

test("PostgreSQL operational read model normalizes aggregate rows without selecting identifiers", async () => {
  const queries: string[] = [];
  const sql = async (strings: TemplateStringsArray) => {
    const source = strings.join("?");
    queries.push(source);
    if (source.includes("teacher_notice_email_outbox")) {
      return [{
        actionable: "1",
        blocked: "1",
        dead_letter: "0",
        leased: "1",
        latest_actionable_at: "2026-08-24T11:40:00.000Z",
        latest_terminal_at: "2026-08-24T11:30:00.000Z",
        oldest_actionable_at: "2026-08-24T11:40:00.000Z",
        pending: "1",
        provider_accepted: "2",
        recent_blocked: "1",
        recent_dead_letter: "0",
        retryable: "0",
        stale_lease: "1",
        unknown_status: "0"
      }];
    }
    if (source.includes("matched_outbox_id IS NULL")) {
      return [{
        latest_unmatched_at: "2026-08-24T11:58:00.000Z",
        oldest_unmatched_at: "2026-08-24T11:58:00.000Z",
        unmatched: "1"
      }];
    }
    if (source.includes("teacher_notice_email_cron_heartbeat")) {
      return [{
        candidate_matches: true,
        completed_at: "2026-08-24T11:59:30.000Z",
        heartbeat_status: "succeeded",
        last_failed_at: "2026-08-24T11:50:00.000Z",
        row_count: "1",
        started_at: "2026-08-24T11:59:00.000Z",
        updated_at: "2026-08-24T11:59:30.000Z"
      }];
    }
    return [{
      bounced: "1",
      complained: "0",
      delivered: "2",
      delivery_delayed: "0",
      failed: "0",
      latest_received_at: new Date("2026-08-24T11:59:00.000Z"),
      sent: "2",
      suppressed: "0",
      unknown_event_type: "0"
    }];
  };

  const snapshot = await readTeacherNoticeOperationalSnapshotFromPostgres({
    expectedReleaseSha,
    observedAt: new Date("2026-08-24T12:00:00.000Z"),
    recentWindowSeconds: 3_600,
    sql: sql as never
  });

  assert.equal(snapshot.outbox.oldestActionableAgeSeconds, 1_200);
  assert.equal(snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds, 120);
  assert.deepEqual(snapshot.scheduler, {
    candidateMatch: true,
    heartbeatAgeSeconds: 30,
    heartbeatStatus: "succeeded",
    lastFailureAgeSeconds: 600
  });
  assert.deepEqual(snapshot.providerEvents, {
    counts: {
      bounced: 1,
      complained: 0,
      delivered: 2,
      deliveryDelayed: 0,
      failed: 0,
      sent: 2,
      suppressed: 0
    },
    latestReceivedAt: "2026-08-24T11:59:00.000Z",
    windowSeconds: 3_600
  });
  assert.equal(queries.length, 4);
  assert.equal(queries.every((query) => query.includes("public.")), true);
  assert.equal(queries.some((query) => /recipient_id|student_id|provider_message_id/u.test(query)), false);
  const providerQuery = queries.find((query) =>
    query.includes("public.teacher_notice_resend_webhook_events") &&
    !query.includes("matched_outbox_id IS NULL")
  );
  assert.match(providerQuery ?? "", /WHERE\s+retention_expires_at\s+>=/u);
  assert.match(providerQuery ?? "", /AND\s+received_at\s+>=/u);
  const outboxQuery = queries.find((query) =>
    query.includes("public.teacher_notice_email_outbox")
  );
  assert.match(outboxQuery ?? "", /next_attempt_at\s+<=/u);
  const heartbeatQuery = queries.find((query) =>
    query.includes("public.teacher_notice_email_cron_heartbeat")
  );
  assert.match(heartbeatQuery ?? "", /\bCOALESCE\s*\(/u);
  assert.doesNotMatch(
    heartbeatQuery ?? "",
    /pg_catalog\.coalesce\s*\(/iu,
    "COALESCE is PostgreSQL SQL syntax and cannot be schema-qualified as a function"
  );
});

test("PostgreSQL operational read model rejects catalog drift before aggregate queries", async () => {
  let aggregateQueries = 0;
  const events: string[] = [];
  const sql = async () => {
    aggregateQueries += 1;
    throw new Error("aggregate must not run");
  };

  await assert.rejects(
    readTeacherNoticeOperationalSnapshotFromAttestedPostgres({
      acquireLocks: async (receivedSql) => {
        assert.equal(receivedSql, sql);
        events.push("locks");
      },
      attest: async (receivedSql) => {
        assert.equal(receivedSql, sql);
        events.push("attest");
        return false;
      },
      expectedReleaseSha,
      observedAt: new Date("2026-08-24T12:00:00.000Z"),
      recentWindowSeconds: 3_600,
      sql: sql as never
    }),
    /attested/u
  );
  assert.equal(aggregateQueries, 0);
  assert.deepEqual(events, ["locks", "attest"]);
});

test("PostgreSQL operational read model takes shared schema and relation locks before attestation", async () => {
  const events: string[] = [];
  const tagged: string[] = [];
  const unsafe: string[] = [];
  const sql = Object.assign(
    async (strings: TemplateStringsArray) => {
      const source = strings.join("?");
      tagged.push(source);
      events.push("advisory");
      return [{ acquired: true }];
    },
    {
      unsafe: async (statement: string) => {
        unsafe.push(statement);
        events.push(statement);
        return [];
      }
    }
  );

  await acquireTeacherNoticeOperationalPostgresReadLocks(sql as never);

  assert.equal(tagged.length, 3);
  assert.ok(tagged.every((query) => query.includes("pg_try_advisory_xact_lock_shared")));
  assert.deepEqual(unsafe, [
    "LOCK TABLE public.teacher_notice_email_outbox IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_message_state IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_cron_heartbeat IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations IN SHARE MODE"
  ]);
  assert.deepEqual(events, [...unsafe, "advisory", "advisory", "advisory"]);
});

test("PostgreSQL operational reads fail fast instead of deadlocking behind a migration advisory lock", async () => {
  let advisoryAttempts = 0;
  const sql = Object.assign(
    async () => {
      advisoryAttempts += 1;
      return [{ acquired: false }];
    },
    { unsafe: async () => [] }
  );

  await assert.rejects(
    acquireTeacherNoticeOperationalPostgresReadLocks(sql as never),
    /migration coordination/u
  );
  assert.equal(advisoryAttempts, 1);
});

test("PostgreSQL operational transaction configures and locks before its DB-clock snapshot", async () => {
  const events: string[] = [];
  const sql = Object.assign(
    async (strings: TemplateStringsArray) => {
      const source = strings.join("?");
      if (source.includes("pg_try_advisory_xact_lock_shared")) {
        events.push("advisory");
        return [{ acquired: true }];
      }
      if (source.includes("clock_timestamp()")) {
        events.push("db-clock");
        return [{ observed_at: new Date("2026-08-24T12:00:00.000Z") }];
      }
      throw new Error(`unexpected tagged query: ${source}`);
    },
    {
      unsafe: async (statement: string) => {
        events.push(statement);
        return [];
      }
    }
  );
  const expected: TeacherNoticeOperationalSnapshot = {
    observedAt: "2026-08-24T12:00:00.000Z",
    scheduler: {
      candidateMatch: true,
      heartbeatAgeSeconds: 30,
      heartbeatStatus: "succeeded",
      lastFailureAgeSeconds: null
    },
    outbox: {
      actionableCount: 0,
      counts: {
        blocked: 0,
        deadLetter: 0,
        leased: 0,
        pending: 0,
        providerAccepted: 0,
        retryable: 0
      },
      oldestActionableAgeSeconds: null,
      recentTerminalCounts: { blocked: 0, deadLetter: 0 },
      staleLeaseCount: 0
    },
    providerEvents: {
      counts: {
        bounced: 0,
        complained: 0,
        delivered: 0,
        deliveryDelayed: 0,
        failed: 0,
        sent: 0,
        suppressed: 0
      },
      latestReceivedAt: null,
      windowSeconds: 3_600
    },
    webhookReconciliation: {
      oldestUnmatchedAgeSeconds: null,
      unmatchedCount: 0
    }
  };

  const snapshot = await readTeacherNoticeOperationalSnapshotWithinPostgresTransaction({
    attest: async () => {
      events.push("attest");
      return true;
    },
    readSnapshot: async ({ observedAt, recentWindowSeconds, sql: receivedSql }) => {
      events.push("aggregate");
      assert.equal(receivedSql, sql);
      assert.equal(observedAt.toISOString(), expected.observedAt);
      assert.equal(recentWindowSeconds, 3_600);
      return expected;
    },
    expectedReleaseSha,
    recentWindowSeconds: 3_600,
    sql: sql as never
  });

  assert.equal(snapshot, expected);
  assert.deepEqual(events, [
    "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY",
    "SET LOCAL search_path = pg_catalog, public",
    "SET LOCAL lock_timeout = '1000ms'",
    "SET LOCAL statement_timeout = '5000ms'",
    "SET LOCAL idle_in_transaction_session_timeout = '5000ms'",
    "LOCK TABLE public.teacher_notice_email_outbox IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_outbox_schema_migrations IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_message_state IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_resend_webhook_schema_migrations IN SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_cron_heartbeat IN ROW SHARE MODE",
    "LOCK TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations IN SHARE MODE",
    "advisory",
    "advisory",
    "advisory",
    "db-clock",
    "attest",
    "aggregate"
  ]);
});

test("operational aggregation fails closed on unknown durable statuses even before health evaluation", () => {
  for (const corruptInsert of [
    `INSERT INTO teacher_notice_email_outbox VALUES
      ('unknown-status', '2026-08-24T11:50:00.000Z', '2026-08-24T11:50:00.000Z', NULL, NULL)`,
    `INSERT INTO teacher_notice_resend_webhook_events VALUES
      ('email.unknown', '2026-08-24T11:50:00.000Z', NULL)`
  ]) {
    const storage = new DatabaseSync(":memory:");
    storage.exec(`
      CREATE TABLE teacher_notice_email_outbox (
        status TEXT NOT NULL,
        first_enqueued_at TEXT NOT NULL,
        next_attempt_at TEXT NOT NULL,
        lease_expires_at TEXT,
        completed_at TEXT
      );
      CREATE TABLE teacher_notice_resend_webhook_events (
        event_type TEXT NOT NULL,
        received_at TEXT NOT NULL,
        matched_outbox_id TEXT
      );
      ${corruptInsert};
    `);

    assert.throws(
      () => readTeacherNoticeOperationalSnapshotFromSqlite({
        observedAt: new Date("2026-08-24T12:00:00.000Z"),
        recentWindowSeconds: 3_600,
        storage
      }),
      /integrity/u
    );
    storage.close();
  }
});
