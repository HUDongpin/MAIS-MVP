import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
// Type-only, so it is erased before runtime and does not load the module ahead
// of the scratch-directory environment set up below.
import type { SqliteHotOverlayDatabase } from "./sqliteHotRows";

// The store resolves its SQLite location lazily on first use, so pointing the
// whole file at a scratch directory here keeps these tests off the developer's
// real .local snapshot.
const sqliteScratchDirectory = mkdtempSync(join(tmpdir(), "mais-hot-rows-"));
delete process.env.HK_MATH_DB_PATH;
delete process.env.HK_MATH_STORAGE_PROVIDER;
delete process.env.POSTGRES_URL;
delete process.env.HK_MATH_DISABLE_SQLITE_HOT_ROWS;
process.env.HK_MATH_DB_DIR = sqliteScratchDirectory;

process.on("exit", () => {
  rmSync(sqliteScratchDirectory, { recursive: true, force: true });
});

const requiredTables = [
  "practice_attempts",
  "mistake_book_items",
  "adaptive_skill_states",
  "learning_events",
  "learning_event_clears",
  "reward_point_ledger"
];

const practiceQuestionId = "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p5-5-oa-expressions-patterns-q01";
const practiceQuestionAnswer = "no";
const practiceQuestionTopicId = "us-ca-math-p5-5-oa-expressions-patterns";

function emptyOverlayDatabase(): SqliteHotOverlayDatabase {
  return {
    attempts: [],
    mistakes: [],
    adaptive_skill_state: [],
    learning_events: [],
    learning_event_clears: [],
    reward_point_ledger: []
  };
}

test("practice attempt fast path defines dedicated Postgres row tables without snapshot locks", async () => {
  const store = await import("./practiceAttemptStore");
  const ddl = store.__practiceAttemptStoreTestHooks.postgresStudentActivitySchemaSql().join("\n");

  for (const table of requiredTables) {
    assert.match(ddl, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "i"));
  }

  assert.doesNotMatch(ddl, /app_state|FOR UPDATE/i);
  assert.equal(typeof store.submitQuestionAttemptFast, "function");
  assert.equal(typeof store.appendLearningEventsFast, "function");
  assert.equal(typeof store.clearLearningEventsFast, "function");
  assert.match(ddl, /practice_attempts_topic_created_at_idx/);
  assert.match(ddl, /learning_events_user_topic_created_at_idx/);
});

test("practice attempt fast path defines the same row tables for SQLite", async () => {
  const hotRows = await import("./sqliteHotRows");
  const ddl = hotRows.__sqliteHotRowsTestHooks.schemaSql().join("\n");

  for (const table of requiredTables) {
    assert.match(ddl, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "i"));
  }

  assert.doesNotMatch(ddl, /app_state/i);
  assert.match(ddl, /student_activity_hot_row_state/);
});

test("practice attempt fast path stays decoupled from full snapshot storage", async () => {
  const source = await readFile(join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");

  assert.doesNotMatch(source, /userStore|requireAuthenticatedUser|readDatabase|mutateDatabase|app_state|FOR UPDATE/i);
});

test("the fast path claims row persistence in SQLite mode and keeps the legacy question fallback", async () => {
  const store = await import("./practiceAttemptStore");

  assert.equal(store.practiceAttemptFastPathPersistsRows(), true);
  assert.equal(store.learningEventFastPathPersistsRows(), true);
  // SQLite snapshots still hold questions no code-based source exports, so a
  // fast-path lookup miss must fall back instead of returning 404.
  assert.equal(store.practiceAttemptFastPathNeedsLegacyQuestionFallback(), true);
});

test("practice attempt fast path returns answer feedback when row persistence is unavailable", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      const result = await submitQuestionAttemptFast({
        userId: "debug-user",
        questionId: "${practiceQuestionId}",
        selectedAnswer: "${practiceQuestionAnswer}",
        durationSeconds: 1
      });
      if (!result?.correct) throw new Error("Expected the exact US-CA lesson answer to grade as correct.");
      process.stdout.write(JSON.stringify(result));
    }).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      HK_MATH_POSTGRES_MAX_CONNECTIONS: "1",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: "postgres://user:pass@127.0.0.1:1/db"
    },
    timeout: 60_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /"correct":true/);
});

test("SQLite fast path writes attempt, mistake, adaptive, learning event and reward rows", () => {
  const scratchDirectory = mkdtempSync(join(tmpdir(), "mais-hot-rows-e2e-"));
  const script = `
    const { DatabaseSync } = await import("node:sqlite");
    const { submitQuestionAttemptFast, appendLearningEventsFast, clearLearningEventsFast, readLearningEventsFastForUsers } =
      await import("./lib/server/practiceAttemptStore.ts");

    const questionId = ${JSON.stringify(practiceQuestionId)};
    const correctAnswer = ${JSON.stringify(practiceQuestionAnswer)};
    const wrongAnswer = "definitely-wrong";

    const submit = (userId, selectedAnswer) =>
      submitQuestionAttemptFast({ userId, questionId, selectedAnswer, durationSeconds: 2 });

    const wrongFeedback = await submit("mistake-user", wrongAnswer);
    await submit("mistake-user", wrongAnswer);

    // Five clean correct attempts on one topic clear the practice-accuracy
    // reward bar; the sixth must not mint a second ledger row.
    for (let index = 0; index < 6; index += 1) {
      await submit("reward-user", correctAnswer);
    }

    const masteredFeedback = await submit("mistake-user", correctAnswer);

    const event = (id, timestamp) => ({
      id,
      type: "answer-correct",
      source: "practice",
      grade: "P5",
      topicId: ${JSON.stringify(practiceQuestionTopicId)},
      questionId,
      durationSeconds: 3,
      timestamp
    });

    const appendedFirst = await appendLearningEventsFast("events-user", [
      event("event-1", "2026-01-02T00:00:00.000Z"),
      event("event-2", "2026-01-03T00:00:00.000Z")
    ]);
    const appendedDuplicate = await appendLearningEventsFast("events-user", [event("event-1", "2026-01-02T00:00:00.000Z")]);
    const readBack = await readLearningEventsFastForUsers(["events-user"], "2026-01-01T00:00:00.000Z");
    const cleared = await clearLearningEventsFast("events-user", "2026-01-04T00:00:00.000Z");
    const afterClearRead = await readLearningEventsFastForUsers(["events-user"], "2026-01-01T00:00:00.000Z");
    // Events at or before the clear cutoff must stay dropped.
    const appendedAfterClear = await appendLearningEventsFast("events-user", [event("event-3", "2026-01-03T12:00:00.000Z")]);
    const appendedNewer = await appendLearningEventsFast("events-user", [event("event-4", "2026-01-05T00:00:00.000Z")]);

    const database = new DatabaseSync(process.env.HK_MATH_DB_DIR + "/hk-math-db.sqlite", { readOnly: true });
    const scalar = (sql, ...args) => Object.values(database.prepare(sql).get(...args) ?? {})[0];

    process.stdout.write(JSON.stringify({
      wrongCorrect: wrongFeedback?.correct,
      masteredCorrect: masteredFeedback?.correct,
      mistakeAttempts: scalar("SELECT COUNT(*) FROM practice_attempts WHERE user_id = 'mistake-user'"),
      mistakeWrongAttempts: scalar("SELECT wrong_attempts FROM mistake_book_items WHERE user_id = 'mistake-user'"),
      mistakeMastered: scalar("SELECT mastered FROM mistake_book_items WHERE user_id = 'mistake-user'"),
      adaptiveRows: scalar("SELECT COUNT(*) FROM adaptive_skill_states WHERE user_id = 'mistake-user'"),
      adaptiveAttemptCount: scalar("SELECT attempt_count FROM adaptive_skill_states WHERE user_id = 'mistake-user'"),
      attemptLearningEvents: scalar("SELECT COUNT(*) FROM learning_events WHERE user_id = 'mistake-user'"),
      wrongLearningEvents: scalar("SELECT COUNT(*) FROM learning_events WHERE user_id = 'mistake-user' AND type = 'answer-wrong'"),
      rewardRows: scalar("SELECT COUNT(*) FROM reward_point_ledger WHERE student_id = 'reward-user'"),
      rewardAmount: scalar("SELECT amount FROM reward_point_ledger WHERE student_id = 'reward-user'"),
      rewardAttempts: scalar("SELECT COUNT(*) FROM practice_attempts WHERE user_id = 'reward-user'"),
      appendedFirst,
      appendedDuplicate,
      readBackCount: readBack.length,
      cleared,
      afterClearCount: afterClearRead.length,
      appendedAfterClear,
      appendedNewer
    }));
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      HK_MATH_DB_DIR: scratchDirectory
    },
    timeout: 120_000
  });

  try {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;

    assert.equal(parsed.wrongCorrect, false);
    assert.equal(parsed.masteredCorrect, true);
    assert.equal(parsed.mistakeAttempts, 3);
    assert.equal(parsed.mistakeWrongAttempts, 2, "a repeated wrong answer bumps wrong_attempts");
    assert.equal(parsed.mistakeMastered, 1, "a correct answer masters the existing mistake");
    assert.equal(parsed.adaptiveRows, 1);
    assert.equal(parsed.adaptiveAttemptCount, 3);
    assert.equal(parsed.attemptLearningEvents, 3);
    assert.equal(parsed.wrongLearningEvents, 2);
    assert.equal(parsed.rewardAttempts, 6);
    assert.equal(parsed.rewardRows, 1, "the practice-accuracy reward dedupes on source_key");
    assert.equal(parsed.rewardAmount, 30);

    assert.equal(parsed.appendedFirst, 2);
    assert.equal(parsed.appendedDuplicate, 0, "learning events dedupe on id");
    assert.equal(parsed.readBackCount, 2);
    assert.equal(parsed.cleared, true);
    assert.equal(parsed.afterClearCount, 0);
    assert.equal(parsed.appendedAfterClear, 0, "events at or before the clear cutoff stay dropped");
    assert.equal(parsed.appendedNewer, 1);
  } finally {
    rmSync(scratchDirectory, { recursive: true, force: true });
  }
});

test("the SQLite read overlay merges hot rows into a new object", async () => {
  const hotRows = await import("./sqliteHotRows");
  hotRows.runSqliteHotRowTransaction((database) => {
    database
      .prepare(`
        INSERT INTO practice_attempts (
          id, user_id, question_id, selected_answer, is_correct, duration_seconds,
          grade, topic_id, curriculum_track, curriculum_region, textbook_publisher, created_at, answer_work_photos
        )
        VALUES ('overlay-attempt-1', 'overlay-user', 'q-1', 'yes', 1, 4, 'P5', 't-1', 'US_CA_MATH', 'US', 'US_CA_MATH', '2026-02-01T00:00:00.000Z', NULL)
      `)
      .run();
    database
      .prepare(`
        INSERT INTO mistake_book_items (
          user_id, question_id, last_selected_answer, correct_answer, wrong_attempts, first_wrong_at, last_attempt_at, mastered
        )
        VALUES ('overlay-user', 'q-1', 'no', 'yes', 1, '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', 0)
      `)
      .run();
    database
      .prepare(`
        INSERT INTO adaptive_skill_states (
          user_id, skill_id, p_mastery, attempt_count, correct_streak, wrong_streak,
          last_practiced_at, next_review_at, hint_count, misconception_tags, updated_at
        )
        VALUES ('overlay-user', 't-1', 0.62, 1, 1, 0, '2026-02-01T00:00:00.000Z', '2026-02-02T00:00:00.000Z', 0, '["needs-review"]', '2026-02-01T00:00:00.000Z')
      `)
      .run();
    database
      .prepare(`
        INSERT INTO reward_point_ledger (id, student_id, amount, reason, label_en, label_zh, source_key, created_at)
        VALUES ('overlay-reward-1', 'overlay-user', 30, 'practice-accuracy', 'en', 'zh', 'practice-accuracy:overlay-user:t-1:2026-02-01', '2026-02-01T00:00:00.000Z')
      `)
      .run();
  });

  const base = emptyOverlayDatabase();
  const merged = hotRows.overlaySqliteHotRows(base);

  assert.notEqual(merged, base, "the overlay must return a new object");
  assert.equal(base.attempts.length, 0, "the cached snapshot parse must not be mutated in place");
  assert.equal(merged.attempts.length, 1);
  assert.equal(merged.attempts[0].id, "overlay-attempt-1");
  assert.equal(merged.attempts[0].is_correct, true);
  assert.equal(merged.mistakes.length, 1);
  assert.equal(merged.adaptive_skill_state.length, 1);
  assert.deepEqual(merged.adaptive_skill_state[0].misconception_tags, ["needs-review"]);
  assert.equal(merged.reward_point_ledger.length, 1);

  // Same base object, unchanged hot-row version: the merged view is reused so
  // downstream index caches stay warm.
  assert.equal(hotRows.overlaySqliteHotRows(base), merged);
});

test("the SQLite read overlay is idempotent once the snapshot absorbs the hot rows", async () => {
  const hotRows = await import("./sqliteHotRows");

  // Simulates what a snapshot mutation writes back: the merged view, which now
  // contains the same rows as the hot tables.
  const absorbed = hotRows.overlaySqliteHotRows(emptyOverlayDatabase());
  const reMerged = hotRows.overlaySqliteHotRows(absorbed);

  assert.equal(reMerged.attempts.length, 1, "attempts dedupe by id");
  assert.equal(reMerged.mistakes.length, 1, "mistakes dedupe by user and question");
  assert.equal(reMerged.adaptive_skill_state.length, 1, "adaptive states dedupe by user and skill");
  assert.equal(reMerged.reward_point_ledger.length, 1, "reward ledger dedupes by id");

  // A ledger row that only differs by id still collapses on source_key.
  const withDuplicateSourceKey = hotRows.overlaySqliteHotRows({
    ...emptyOverlayDatabase(),
    reward_point_ledger: [
      {
        id: "snapshot-reward-1",
        student_id: "overlay-user",
        amount: 30,
        reason: "practice-accuracy",
        label_en: "en",
        label_zh: "zh",
        source_key: "practice-accuracy:overlay-user:t-1:2026-02-01",
        created_at: "2026-02-01T00:00:00.000Z"
      }
    ]
  });
  assert.equal(withDuplicateSourceKey.reward_point_ledger.length, 1, "reward ledger dedupes on source_key");
});

test("the SQLite read overlay prefers the newer mistake and adaptive rows", async () => {
  const hotRows = await import("./sqliteHotRows");

  const merged = hotRows.overlaySqliteHotRows({
    ...emptyOverlayDatabase(),
    mistakes: [
      {
        user_id: "overlay-user",
        question_id: "q-1",
        last_selected_answer: "stale",
        correct_answer: "yes",
        wrong_attempts: 9,
        first_wrong_at: "2025-01-01T00:00:00.000Z",
        last_attempt_at: "2025-01-01T00:00:00.000Z",
        mastered: true
      }
    ],
    adaptive_skill_state: [
      {
        user_id: "overlay-user",
        skill_id: "t-1",
        p_mastery: 0.1,
        attempt_count: 99,
        correct_streak: 0,
        wrong_streak: 9,
        last_practiced_at: "2025-01-01T00:00:00.000Z",
        next_review_at: "2025-01-02T00:00:00.000Z",
        hint_count: 0,
        misconception_tags: [],
        updated_at: "2025-01-01T00:00:00.000Z"
      }
    ]
  });

  assert.equal(merged.mistakes.length, 1);
  assert.equal(merged.mistakes[0].last_selected_answer, "no", "the newer hot mistake row wins");
  assert.equal(merged.adaptive_skill_state.length, 1);
  assert.equal(merged.adaptive_skill_state[0].attempt_count, 1, "the newer hot adaptive row wins");
});

test("deleting a mistake removes the hot row so the overlay cannot resurrect it", async () => {
  const hotRows = await import("./sqliteHotRows");

  assert.equal(hotRows.overlaySqliteHotRows(emptyOverlayDatabase()).mistakes.length, 1);
  hotRows.deleteSqliteHotMistake("overlay-user", "q-1");
  assert.equal(
    hotRows.overlaySqliteHotRows(emptyOverlayDatabase()).mistakes.length,
    0,
    "a deleted mistake must not come back through the overlay"
  );
});

test("the SQLite read overlay honours learning event clears", async () => {
  const hotRows = await import("./sqliteHotRows");

  hotRows.runSqliteHotRowTransaction((database) => {
    database
      .prepare(`
        INSERT INTO learning_events (id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at)
        VALUES ('cleared-event', 'clear-user', 'answer-correct', 'practice', 'P5', 't-1', 'q-1', 3, '2026-03-01T00:00:00.000Z')
      `)
      .run();
  });
  assert.equal(
    hotRows.overlaySqliteHotRows(emptyOverlayDatabase()).learning_events.some((event) => event.id === "cleared-event"),
    true
  );

  hotRows.clearSqliteHotLearningEventsForUser("clear-user", "2026-03-02T00:00:00.000Z");

  const merged = hotRows.overlaySqliteHotRows({
    ...emptyOverlayDatabase(),
    // A snapshot copy of the same event must also disappear behind the cutoff.
    learning_events: [
      {
        id: "cleared-event",
        user_id: "clear-user",
        type: "answer-correct",
        source: "practice",
        grade: "P5",
        topic_id: "t-1",
        created_at: "2026-03-01T00:00:00.000Z"
      }
    ]
  });

  assert.equal(merged.learning_events.some((event) => event.id === "cleared-event"), false);
  assert.equal(merged.learning_event_clears.length, 1);
  assert.equal(merged.learning_event_clears[0].cleared_at, "2026-03-02T00:00:00.000Z");
});
