import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  attestTeacherNoticeEmailCronHeartbeatPostgresCatalog,
  attestTeacherNoticeEmailCronHeartbeatSqliteSchema,
  migrateTeacherNoticeEmailCronHeartbeatSqliteSchema,
  recordTeacherNoticeEmailCronHeartbeatFailedSqlite,
  recordTeacherNoticeEmailCronHeartbeatStartedSqlite,
  recordTeacherNoticeEmailCronHeartbeatSucceededSqlite,
  runTeacherNoticeEmailCronHeartbeatAtomicMigration,
  runTeacherNoticeEmailCronHeartbeatPostgresAttestedTransaction,
  teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog,
  teacherNoticeEmailCronHeartbeatPostgresSchemaStatements,
  teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements,
  teacherNoticeEmailCronHeartbeatSchemaVersion,
  teacherNoticeEmailCronHeartbeatSqliteSchemaV1
} from "./teacherNoticeEmailCronHeartbeatPersistence";

const releaseA = "a".repeat(40);
const releaseB = "b".repeat(40);
const runA = "00000000-0000-4000-8000-000000000001";
const runB = "00000000-0000-4000-8000-000000000002";

function heartbeatRow(storage: DatabaseSync) {
  return storage.prepare(`
    SELECT run_id, release_sha, status, started_at, completed_at, updated_at
    FROM teacher_notice_email_cron_heartbeat
    WHERE singleton = 1
  `).get() as {
    run_id: string;
    release_sha: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    updated_at: string;
  } | undefined;
}

test("heartbeat SQLite schema v2 migration is strict, atomic, and idempotent", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    assert.equal(attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage), false);
    migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage);
    assert.equal(teacherNoticeEmailCronHeartbeatSchemaVersion, 2);
    assert.equal(attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage), true);
    assert.doesNotThrow(() => migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage));

    storage.exec("ALTER TABLE teacher_notice_email_cron_heartbeat ADD COLUMN payload TEXT");
    assert.equal(attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage), false);
    assert.throws(
      () => migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage),
      /partial or malformed/u
    );
  } finally {
    storage.close();
  }

  const partial = new DatabaseSync(":memory:");
  try {
    partial.exec("CREATE TABLE teacher_notice_email_cron_heartbeat (singleton INTEGER)");
    assert.throws(
      () => migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(partial),
      /partial or malformed/u
    );
    assert.equal(
      (partial.prepare(`
        SELECT count(*) AS count FROM sqlite_master
        WHERE name = 'teacher_notice_email_cron_heartbeat_schema_migrations'
      `).get() as { count: number }).count,
      0
    );
  } finally {
    partial.close();
  }
});

test("heartbeat SQLite migration upgrades an exact v1 database and preserves a current failure", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    storage.exec(teacherNoticeEmailCronHeartbeatSqliteSchemaV1);
    storage.exec(`
      INSERT INTO teacher_notice_email_cron_heartbeat (
        singleton, run_id, release_sha, status, started_at, completed_at, updated_at
      ) VALUES (
        1, '${runA}', '${releaseA}', 'failed',
        '2026-08-24T11:58:00.000Z', '2026-08-24T11:59:00.000Z',
        '2026-08-24T11:59:00.000Z'
      )
    `);

    migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage);

    assert.equal(attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage), true);
    assert.deepEqual({ ...storage.prepare(`
      SELECT status, completed_at, last_failed_at
      FROM teacher_notice_email_cron_heartbeat WHERE singleton = 1
    `).get() as Record<string, unknown> }, {
      status: "failed",
      completed_at: "2026-08-24T11:59:00.000Z",
      last_failed_at: "2026-08-24T11:59:00.000Z"
    });
    assert.equal((storage.prepare(`
      SELECT version FROM teacher_notice_email_cron_heartbeat_schema_migrations
      WHERE singleton = 1
    `).get() as { version: number }).version, 2);
  } finally {
    storage.close();
  }
});

test("heartbeat SQLite transitions are candidate-bound and stale runs cannot overwrite a newer run", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage);
    recordTeacherNoticeEmailCronHeartbeatStartedSqlite(storage, {
      releaseSha: releaseA,
      runId: runA
    });
    const started = heartbeatRow(storage);
    assert.equal(started?.status, "started");
    assert.equal(started?.release_sha, releaseA);
    assert.equal(started?.run_id, runA);
    assert.equal(started?.completed_at, null);
    assert.ok(Number.isFinite(Date.parse(started?.started_at ?? "")));

    recordTeacherNoticeEmailCronHeartbeatStartedSqlite(storage, {
      releaseSha: releaseB,
      runId: runB
    });
    assert.throws(
      () => recordTeacherNoticeEmailCronHeartbeatSucceededSqlite(storage, {
        releaseSha: releaseA,
        runId: runA
      }),
      /no longer current/u
    );
    assert.equal(heartbeatRow(storage)?.run_id, runB);
    assert.equal(heartbeatRow(storage)?.status, "started");

    recordTeacherNoticeEmailCronHeartbeatFailedSqlite(storage, {
      releaseSha: releaseB,
      runId: runB
    });
    const failed = heartbeatRow(storage);
    assert.equal(failed?.status, "failed");
    assert.ok(Number.isFinite(Date.parse(failed?.completed_at ?? "")));
    assert.equal(failed?.completed_at, failed?.updated_at);
  } finally {
    storage.close();
  }
});

test("heartbeat SQLite success requires a previously persisted matching started run", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage);
    assert.throws(
      () => recordTeacherNoticeEmailCronHeartbeatSucceededSqlite(storage, {
        releaseSha: releaseA,
        runId: runA
      }),
      /no longer current/u
    );
    recordTeacherNoticeEmailCronHeartbeatStartedSqlite(storage, {
      releaseSha: releaseA,
      runId: runA
    });
    recordTeacherNoticeEmailCronHeartbeatSucceededSqlite(storage, {
      releaseSha: releaseA,
      runId: runA
    });
    assert.equal(heartbeatRow(storage)?.status, "succeeded");
  } finally {
    storage.close();
  }
});

test("heartbeat SQLite durably retains the last failure across a newer successful run", () => {
  const storage = new DatabaseSync(":memory:");
  try {
    migrateTeacherNoticeEmailCronHeartbeatSqliteSchema(storage);
    recordTeacherNoticeEmailCronHeartbeatStartedSqlite(storage, {
      releaseSha: releaseA,
      runId: runA
    });
    recordTeacherNoticeEmailCronHeartbeatFailedSqlite(storage, {
      releaseSha: releaseA,
      runId: runA
    });
    const failedAt = (storage.prepare(`
      SELECT last_failed_at FROM teacher_notice_email_cron_heartbeat
      WHERE singleton = 1
    `).get() as { last_failed_at: string }).last_failed_at;
    assert.ok(Number.isFinite(Date.parse(failedAt)));

    recordTeacherNoticeEmailCronHeartbeatStartedSqlite(storage, {
      releaseSha: releaseB,
      runId: runB
    });
    recordTeacherNoticeEmailCronHeartbeatSucceededSqlite(storage, {
      releaseSha: releaseB,
      runId: runB
    });
    const latest = storage.prepare(`
      SELECT status, last_failed_at FROM teacher_notice_email_cron_heartbeat
      WHERE singleton = 1
    `).get() as { last_failed_at: string; status: string };
    assert.equal(latest.status, "succeeded");
    assert.equal(latest.last_failed_at, failedAt);
  } finally {
    storage.close();
  }
});

test("heartbeat PostgreSQL catalog attestation is exact and schema statements are candidate-bound", () => {
  assert.equal(
    attestTeacherNoticeEmailCronHeartbeatPostgresCatalog(
      teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog
    ),
    true
  );
  const drift = structuredClone(
    teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog
  ) as unknown as {
    columns: Array<Record<string, unknown>>;
  };
  drift.columns[1]!.notNull = false;
  assert.equal(attestTeacherNoticeEmailCronHeartbeatPostgresCatalog(drift), false);

  const source = teacherNoticeEmailCronHeartbeatPostgresSchemaStatements.join("\n");
  assert.match(source, /release_sha/u);
  assert.match(source, /started[\s\S]*succeeded[\s\S]*failed/u);
  assert.match(source, /last_failed_at/u);
  assert.equal(
    teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog.constraints.filter(
      (constraint) => constraint.name.endsWith("singleton_ck")
    ).length,
    2
  );
  assert.equal(
    teacherNoticeEmailCronHeartbeatExpectedPostgresCatalog.integrity.constraintCount,
    7
  );
  assert.match(source, /CHECK \(singleton\)/u);
  assert.match(source, /schema-v2/u);
  assert.doesNotMatch(source, /error|recipient|student|guardian|email_address/iu);

  const upgradeSource = teacherNoticeEmailCronHeartbeatPostgresV1ToV2Statements
    .join("\n");
  assert.match(upgradeSource, /ADD COLUMN last_failed_at/u);
  assert.match(upgradeSource, /WHERE status = 'failed'/u);
  assert.match(upgradeSource, /CHECK \(version = 2\)/u);
  assert.doesNotMatch(upgradeSource, /DROP TABLE|TRUNCATE/u);
});

test("heartbeat PostgreSQL migration inspects under one atomic transaction and rejects partial state", async () => {
  const events: string[] = [];
  await runTeacherNoticeEmailCronHeartbeatAtomicMigration({
    begin: async (operation) => {
      events.push("begin");
      await operation({} as never);
      events.push("commit");
    },
    inspect: async () => {
      events.push("inspect");
      return "empty";
    },
    migrate: async () => {
      events.push("migrate");
    },
    attest: async () => {
      events.push("attest");
      return true;
    }
  });
  assert.deepEqual(events, ["begin", "inspect", "migrate", "attest", "commit"]);

  const upgradeEvents: string[] = [];
  await runTeacherNoticeEmailCronHeartbeatAtomicMigration({
    begin: async (operation) => {
      upgradeEvents.push("begin");
      await operation({} as never);
      upgradeEvents.push("commit");
    },
    inspect: async () => {
      upgradeEvents.push("inspect-v1");
      return "v1";
    },
    migrate: async (_sql, state) => {
      assert.equal(state, "v1");
      upgradeEvents.push("upgrade-v1-to-v2");
    },
    attest: async () => {
      upgradeEvents.push("attest-v2");
      return true;
    }
  });
  assert.deepEqual(upgradeEvents, [
    "begin",
    "inspect-v1",
    "upgrade-v1-to-v2",
    "attest-v2",
    "commit"
  ]);

  await assert.rejects(
    runTeacherNoticeEmailCronHeartbeatAtomicMigration({
      begin: async (operation) => operation({} as never),
      inspect: async () => "partial",
      migrate: async () => {
        throw new Error("must not migrate partial state");
      },
      attest: async () => true
    }),
    /partial or malformed/u
  );
});

test("heartbeat PostgreSQL runtime uses advisory-before-relation lock order and attests before mutation", async () => {
  const events: string[] = [];
  const result = await runTeacherNoticeEmailCronHeartbeatPostgresAttestedTransaction({
    sql: {} as never,
    configure: async () => {
      events.push("configure");
    },
    lockSchema: async () => {
      events.push("advisory");
    },
    lockRelations: async () => {
      events.push("relations");
    },
    attest: async () => {
      events.push("attest");
      return true;
    },
    operation: async () => {
      events.push("mutation");
      return "persisted";
    }
  });
  assert.equal(result, "persisted");
  assert.deepEqual(events, ["configure", "advisory", "relations", "attest", "mutation"]);
});
