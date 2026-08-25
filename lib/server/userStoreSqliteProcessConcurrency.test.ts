import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workerSource = String.raw`
  import { existsSync } from "node:fs";
  import { setTimeout as delay } from "node:timers/promises";
  import {
    appendLearningEvents,
    clearLearningEventsForUser
  } from "./lib/server/userStore.ts";

  while (!existsSync(process.env.MAIS_SQLITE_TEST_BARRIER)) {
    await delay(2);
  }

  const index = Number(process.env.MAIS_SQLITE_TEST_INDEX ?? 0);
  const action = process.env.MAIS_SQLITE_TEST_ACTION;
  const userId = process.env.MAIS_SQLITE_TEST_USER_ID;
  if (action === "clear") {
    const result = await clearLearningEventsForUser(
      userId,
      "2026-08-09T12:00:00.000Z"
    );
    console.log(JSON.stringify({ action, result }));
  } else {
    const result = await appendLearningEvents(userId, [{
      id: process.env.MAIS_SQLITE_TEST_EVENT_ID,
      type: "page-view",
      source: "visualization-lab",
      timestamp: new Date(Date.UTC(2026, 7, 9, 11, 0, index)).toISOString(),
      grade: "S3",
      topicId: "sqlite-process-concurrency"
    }], Number(process.env.MAIS_SQLITE_TEST_GENERATION ?? 0));
    console.log(JSON.stringify({ action: "append", result }));
  }
`;

type WorkerInput = {
  action: "append" | "clear";
  eventId?: string;
  generation?: number;
  index: number;
};

type DurableLearningEventState = {
  learning_events?: Array<{ id: string; user_id: string }>;
  learning_event_clears?: Array<{ cleared_at?: string; generation?: number; user_id: string }>;
};

async function runWorkers({
  barrierPath,
  dbPath,
  userId,
  workers
}: {
  barrierPath: string;
  dbPath: string;
  userId: string;
  workers: WorkerInput[];
}) {
  const running = workers.map((worker) => execFileAsync(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "--eval",
    workerSource
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_SESSION_SECRET: "sqlite-process-concurrency-secret",
      HK_MATH_DB_PATH: dbPath,
      HK_MATH_ENABLE_DEMO_USER: "false",
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      MAIS_SQLITE_TEST_ACTION: worker.action,
      MAIS_SQLITE_TEST_BARRIER: barrierPath,
      MAIS_SQLITE_TEST_EVENT_ID: worker.eventId ?? "",
      MAIS_SQLITE_TEST_GENERATION: String(worker.generation ?? 0),
      MAIS_SQLITE_TEST_INDEX: String(worker.index),
      MAIS_SQLITE_TEST_USER_ID: userId,
      POSTGRES_URL: ""
    },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 90_000
  }));

  await writeFile(barrierPath, "go", "utf8");
  return Promise.all(running);
}

function readDurableState(dbPath: string): DurableLearningEventState {
  const sqlite = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    } | undefined;
    assert.ok(row, "the shared SQLite state row must exist");
    return JSON.parse(row.payload) as DurableLearningEventState;
  } finally {
    sqlite.close();
  }
}

test("SQLite payload and cache token come from one atomic state-row snapshot", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const loadStart = source.indexOf("async function loadSqliteDatabase()");
  const loadEnd = source.indexOf("async function readSqliteDatabase()", loadStart);
  const loadSource = source.slice(loadStart, loadEnd);

  assert.notEqual(loadStart, -1);
  assert.notEqual(loadEnd, -1);
  assert.match(loadSource, /SELECT payload, revision, updated_at FROM app_state WHERE id = \?/);
  assert.match(loadSource, /sqliteStateTokenForRow\(row\)/);
  assert.doesNotMatch(
    loadSource,
    /currentSqliteStateToken\(storage\)/,
    "a second token query can label an old payload with a concurrently committed new revision"
  );
  assert.match(
    loadSource,
    /return synchronizeSqliteDatabaseForRead\(storage\)/,
    "normalization and cold initialization must re-read after acquiring the cross-process write lock"
  );
  const synchronizeStart = source.indexOf("async function synchronizeSqliteDatabaseForRead");
  const synchronizeEnd = source.indexOf("async function loadSqliteDatabase()", synchronizeStart);
  const synchronizeSource = source.slice(synchronizeStart, synchronizeEnd);
  assert.notEqual(synchronizeStart, -1);
  assert.notEqual(synchronizeEnd, -1);
  assert.match(synchronizeSource, /fallbackDatabase = await sqliteMutationFallbackDatabase\(storage\)/);
  assert.match(synchronizeSource, /BEGIN IMMEDIATE/);
  assert.match(synchronizeSource, /loadSqliteDatabaseForMutation\(storage, fallbackDatabase\)/);
  assert.doesNotMatch(
    synchronizeSource.slice(synchronizeSource.indexOf("BEGIN IMMEDIATE")),
    /await\s+loadSqliteDatabaseForMutation/,
    "the writer lock must never span legacy filesystem I/O"
  );
  assert.match(synchronizeSource, /writeSqliteDatabaseRow\(storage, database\)/);
  assert.match(synchronizeSource, /COMMIT/);
  assert.match(synchronizeSource, /ROLLBACK/);
});

test("eight independent SQLite writers keep every acknowledged learning event", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-process-writers-"));
  const dbPath = path.join(directory, "app.sqlite");
  const barrierPath = path.join(directory, "start");
  const userId = "sqlite-eight-writer-student";
  const eventIds = Array.from({ length: 8 }, (_, index) => `sqlite-writer-${index}`);

  try {
    const outputs = await runWorkers({
      barrierPath,
      dbPath,
      userId,
      workers: eventIds.map((eventId, index) => ({
        action: "append",
        eventId,
        generation: 0,
        index
      }))
    });
    for (const { stdout } of outputs) {
      const result = JSON.parse(stdout.trim().split("\n").at(-1) ?? "null") as {
        result?: { acknowledgedEventIds?: string[]; status?: string };
      };
      assert.equal(result.result?.status, "ok");
      assert.equal(result.result?.acknowledgedEventIds?.length, 1);
    }

    const durable = readDurableState(dbPath);
    const durableIds = (durable.learning_events ?? [])
      .filter((event) => event.user_id === userId)
      .map((event) => event.id)
      .sort();
    assert.deepEqual(
      durableIds,
      eventIds.toSorted(),
      "a successful response from every process must correspond to every durable row"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a concurrent clear remains the generation fence after stale generation-zero writers settle", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-process-clear-"));
  const dbPath = path.join(directory, "app.sqlite");
  const setupBarrierPath = path.join(directory, "setup");
  const raceBarrierPath = path.join(directory, "race");
  const userId = "sqlite-clear-race-student";

  try {
    await runWorkers({
      barrierPath: setupBarrierPath,
      dbPath,
      userId,
      workers: [{ action: "append", eventId: "before-clear", generation: 0, index: 0 }]
    });

    await runWorkers({
      barrierPath: raceBarrierPath,
      dbPath,
      userId,
      workers: [
        { action: "clear", index: 0 },
        ...Array.from({ length: 6 }, (_, index) => ({
          action: "append" as const,
          eventId: `stale-generation-zero-${index}`,
          generation: 0,
          index: index + 1
        }))
      ]
    });

    const durable = readDurableState(dbPath);
    assert.deepEqual(
      (durable.learning_events ?? []).filter((event) => event.user_id === userId),
      [],
      "once clear commits, no stale generation-zero writer may overwrite its deletion"
    );
    assert.deepEqual(
      (durable.learning_event_clears ?? []).find((clear) => clear.user_id === userId),
      {
        user_id: userId,
        cleared_at: "2026-08-09T12:00:00.000Z",
        generation: 1
      },
      "the exact durable clear receipt must survive every stale writer"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a failed SQLite state-row write rolls back the mutation and cannot produce an ACK", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-process-rollback-"));
  const dbPath = path.join(directory, "app.sqlite");
  const setupBarrierPath = path.join(directory, "setup");
  const failureBarrierPath = path.join(directory, "failure");
  const userId = "sqlite-write-failure-student";

  try {
    await runWorkers({
      barrierPath: setupBarrierPath,
      dbPath,
      userId,
      workers: [{ action: "append", eventId: "durable-before-failure", generation: 0, index: 0 }]
    });
    const sqlite = new DatabaseSync(dbPath);
    try {
      sqlite.exec(`
        CREATE TRIGGER reject_app_state_update
        BEFORE UPDATE ON app_state
        BEGIN
          SELECT RAISE(ABORT, 'forced app_state write failure');
        END;
      `);
    } finally {
      sqlite.close();
    }

    await assert.rejects(
      () => runWorkers({
        barrierPath: failureBarrierPath,
        dbPath,
        userId,
        workers: [{ action: "append", eventId: "must-not-ack", generation: 0, index: 1 }]
      }),
      /forced app_state write failure/
    );
    assert.deepEqual(
      (readDurableState(dbPath).learning_events ?? [])
        .filter((event) => event.user_id === userId)
        .map((event) => event.id),
      ["durable-before-failure"],
      "the in-memory mutation must be rolled back with the rejected app_state write"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a warm process invalidates its SQLite cache when another process advances only the state revision", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-process-cache-"));
  const dbPath = path.join(directory, "app.sqlite");
  const readyPath = path.join(directory, "ready");
  const continuePath = path.join(directory, "continue");
  const userId = "sqlite-cache-revision-student";
  const source = String.raw`
    import { existsSync, writeFileSync } from "node:fs";
    import { setTimeout as delay } from "node:timers/promises";
    import { appendLearningEvents, getAnalyticsSummary } from "./lib/server/userStore.ts";
    const userId = process.env.MAIS_SQLITE_TEST_USER_ID;
    const result = await appendLearningEvents(userId, [{
      id: "cache-first-event",
      type: "page-view",
      source: "visualization-lab",
      timestamp: new Date().toISOString(),
      grade: "S3",
      topicId: "sqlite-cache-revision"
    }], 0);
    if (result.status !== "ok") throw new Error("cache setup failed");
    writeFileSync(process.env.MAIS_SQLITE_TEST_READY, "ready");
    while (!existsSync(process.env.MAIS_SQLITE_TEST_CONTINUE)) await delay(2);
    const summary = await getAnalyticsSummary(userId, "7d", "S3");
    console.log(JSON.stringify({ eventCount: summary.eventCount }));
  `;

  try {
    const running = execFileAsync(process.execPath, [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      source
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AUTH_SESSION_SECRET: "sqlite-cache-revision-secret",
        HK_MATH_DB_PATH: dbPath,
        HK_MATH_ENABLE_DEMO_USER: "false",
        HK_MATH_STORAGE_PROVIDER: "sqlite",
        MAIS_SQLITE_TEST_CONTINUE: continuePath,
        MAIS_SQLITE_TEST_READY: readyPath,
        MAIS_SQLITE_TEST_USER_ID: userId,
        POSTGRES_URL: ""
      },
      timeout: 90_000
    });

    for (let attempt = 0; attempt < 5_000; attempt += 1) {
      try {
        await access(readyPath);
        break;
      } catch {
        if (attempt === 4_999) throw new Error("warm cache worker did not become ready");
        await delay(2);
      }
    }
    const sqlite = new DatabaseSync(dbPath);
    try {
      const row = sqlite.prepare("SELECT payload, updated_at FROM app_state WHERE id = ?").get("primary") as {
        payload: string;
        updated_at: string;
      };
      const payload = JSON.parse(row.payload) as {
        learning_events: Array<Record<string, unknown>>;
      };
      payload.learning_events.push({
        id: "cache-second-event",
        user_id: userId,
        type: "page-view",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "sqlite-cache-revision",
        created_at: new Date().toISOString()
      });
      sqlite.prepare(`
        UPDATE app_state
        SET payload = ?, revision = revision + 1, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(payload), row.updated_at, "primary");
    } finally {
      sqlite.close();
    }
    await writeFile(continuePath, "continue", "utf8");
    const { stdout } = await running;
    const result = JSON.parse(stdout.trim().split("\n").at(-1) ?? "null") as {
      eventCount?: number;
    };
    assert.equal(
      result.eventCount,
      2,
      "revision changes must invalidate a warm cache even when updated_at is unchanged"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
