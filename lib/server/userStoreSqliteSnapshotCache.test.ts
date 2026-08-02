import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

/**
 * Covers the SQLite snapshot-cache contract of `mutateDatabase`:
 *
 *  - consecutive mutations reuse the parsed snapshot instead of forcing a cold
 *    re-read (the re-read is dominated by `normalizeDatabase()` re-seeding and
 *    used to cost ~0.6-1.6s of blocked event loop per blob write),
 *  - a mutator that throws drops the cache, because it may have left partial
 *    edits on the snapshot that readers share,
 *  - a mutation that reports "nothing changed" skips the blob write entirely,
 *  - the student-activity hot-row overlay still composes with all of that.
 *
 * The store resolves its SQLite location lazily on first use, so pointing the
 * whole file at a scratch directory here keeps these tests off the developer's
 * real .local snapshot.
 */
const sqliteScratchDirectory = mkdtempSync(join(tmpdir(), "mais-snapshot-cache-"));
delete process.env.HK_MATH_DB_PATH;
delete process.env.HK_MATH_STORAGE_PROVIDER;
delete process.env.POSTGRES_URL;
delete process.env.HK_MATH_DISABLE_SQLITE_READ_CACHE;
delete process.env.HK_MATH_DISABLE_SQLITE_HOT_ROWS;
// The adaptive-refresh test below asserts the "no provider key configured"
// branch, which must never reach out to a real provider.
delete process.env.DEEPSEEK_API_KEY;
delete process.env.LLM_API_KEY;
process.env.HK_MATH_DB_DIR = sqliteScratchDirectory;
process.env.LESSON_PERF_DEBUG = "true";

process.on("exit", () => {
  rmSync(sqliteScratchDirectory, { recursive: true, force: true });
});

const coldSnapshotReads: string[] = [];
const originalConsoleInfo = console.info.bind(console);
console.info = (...args: unknown[]) => {
  const message = args.map((value) => String(value)).join(" ");
  if (message.includes("[lesson-perf] readDatabase(sqlite")) coldSnapshotReads.push(message);
};
process.on("exit", () => {
  console.info = originalConsoleInfo;
});

function appStateRow() {
  const storage = new DatabaseSync(join(sqliteScratchDirectory, "hk-math-db.sqlite"));
  try {
    return storage.prepare("SELECT revision, updated_at FROM app_state LIMIT 1").get() as {
      revision?: number;
      updated_at?: string;
    };
  } finally {
    storage.close();
  }
}

async function snapshotCacheHooks() {
  const store = await import("./userStore");
  return store.__userStoreSnapshotCacheTestHooks;
}

test("consecutive SQLite mutations reuse the cached snapshot instead of re-reading it", async () => {
  const { mutateDatabase, readDatabase } = await snapshotCacheHooks();

  await readDatabase();
  const coldReadsAfterBoot = coldSnapshotReads.length;

  for (let index = 0; index < 4; index += 1) {
    await mutateDatabase((database) => {
      database.learning_events.push({
        id: `snapshot-cache-event-${index}`,
        user_id: "snapshot-cache-user",
        type: "answer-correct",
        source: "practice",
        grade: "P5",
        topic_id: "snapshot-cache-topic",
        created_at: new Date().toISOString()
      });
    });
  }

  assert.equal(
    coldSnapshotReads.length,
    coldReadsAfterBoot,
    "a burst of mutations must not force a cold snapshot re-read per write"
  );

  const database = await readDatabase();
  assert.equal(
    database.learning_events.filter((event) => event.user_id === "snapshot-cache-user").length,
    4,
    "every mutation in the burst must still be persisted"
  );
});

test("a mutation that reports no change skips the snapshot write", async () => {
  const { mutateDatabase } = await snapshotCacheHooks();
  const before = appStateRow();

  const skipped = await mutateDatabase(
    () => "unchanged" as const,
    { shouldPersist: (result) => result !== "unchanged" }
  );

  assert.equal(skipped, "unchanged");
  assert.deepEqual(appStateRow(), before, "revision and updated_at must not move for a no-op mutation");

  await mutateDatabase(
    (database): "changed" | "unchanged" => {
      database.learning_events.push({
        id: "snapshot-cache-persisted-event",
        user_id: "snapshot-cache-user",
        type: "answer-correct",
        source: "practice",
        grade: "P5",
        topic_id: "snapshot-cache-topic",
        created_at: new Date().toISOString()
      });
      return "changed";
    },
    { shouldPersist: (result) => result !== "unchanged" }
  );

  assert.notEqual(appStateRow().revision, before.revision, "a real change must still bump the revision");
});

test("a failed mutation drops the cached snapshot so partial edits never leak to readers", async () => {
  const { mutateDatabase, readDatabase } = await snapshotCacheHooks();

  await readDatabase();
  const coldReadsBeforeFailure = coldSnapshotReads.length;

  await assert.rejects(
    () =>
      mutateDatabase((database) => {
        database.learning_events.push({
          id: "snapshot-cache-partial-event",
          user_id: "snapshot-cache-user",
          type: "answer-correct",
          source: "practice",
          grade: "P5",
          topic_id: "snapshot-cache-topic",
          created_at: new Date().toISOString()
        });
        throw new Error("mutator failed after a partial edit");
      }),
    /mutator failed after a partial edit/
  );

  const database = await readDatabase();
  assert.equal(
    coldSnapshotReads.length,
    coldReadsBeforeFailure + 1,
    "the failed mutation must invalidate the cache and force one fresh parse"
  );
  assert.equal(
    database.learning_events.some((event) => event.id === "snapshot-cache-partial-event"),
    false,
    "the unpersisted partial edit must not survive on the shared snapshot"
  );
});

test("hot rows written between mutations are still merged, and absorbed exactly once", async () => {
  const { mutateDatabase, readDatabase } = await snapshotCacheHooks();
  const hotRows = await import("./sqliteHotRows");

  await readDatabase();
  hotRows.runSqliteHotRowTransaction((database) => {
    database
      .prepare(`
        INSERT INTO learning_events (id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at)
        VALUES ('snapshot-cache-hot-event', 'snapshot-cache-user', 'answer-correct', 'practice', 'P5', 'snapshot-cache-topic', 'q-1', 4, '2026-04-01T00:00:00.000Z')
      `)
      .run();
  });

  const merged = await readDatabase();
  assert.equal(
    merged.learning_events.filter((event) => event.id === "snapshot-cache-hot-event").length,
    1,
    "a hot row written between mutations must be visible on the cached snapshot"
  );

  // The mutation writes the merged view back, so the row now exists on both
  // sides. The key-deduped overlay must still resolve it to a single copy.
  await mutateDatabase(() => undefined);
  const absorbed = await readDatabase();
  assert.equal(
    absorbed.learning_events.filter((event) => event.id === "snapshot-cache-hot-event").length,
    1,
    "absorbing a hot row into the snapshot must not duplicate it on the next read"
  );
});

test("a repeated adaptive refresh with no provider key configured writes the cache row once", async () => {
  const store = await import("./userStore");
  const created = await store.createStudentUser({
    name: "Adaptive Refresh Student",
    username: `adaptive-refresh-${Date.now()}`,
    password: "adaptive-password-123",
    grade: "P5",
    curriculumTrack: "HK"
  });
  assert.equal(created.status, "created");
  const userId = created.status === "created" ? created.session.user.id : "";

  const first = await store.refreshAdaptiveLearningRecommendation({ userId, grade: "P5" });
  assert.equal(first.status, "disabled", "the no-provider-key branch is the one under test");
  const afterFirstRefresh = appStateRow();

  for (let index = 0; index < 3; index += 1) {
    const repeat = await store.refreshAdaptiveLearningRecommendation({ userId, grade: "P5" });
    assert.equal(repeat.status, "disabled");
    assert.equal(repeat.error, first.error, "the early return must keep the original response shape");
  }

  assert.deepEqual(
    appStateRow(),
    afterFirstRefresh,
    "re-recording an unchanged disabled cache row must not rewrite the snapshot"
  );
});
