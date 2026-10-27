import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import vm from "node:vm";
import postgres from "postgres";
import ts from "typescript";
import * as accountData from "./accountDataPostgres.ts";
import * as practiceIdentity from "./practiceSubmissionIdentity.ts";
import { teacherNoticeEmailOutboxPostgresSchemaStatements } from "./userStore/teacherNoticeEmailOutboxPersistence.ts";

// Opt in only to this disposable local cluster. Never read POSTGRES_URL or a
// real application database; absent configuration makes this test a skip.
const testUrl = process.env.MAIS_PRIORITY_POSTGRES_TEST_URL;
if (testUrl) {
  const target = new URL(testUrl);
  assert.equal(target.protocol, "postgres:");
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.port, "55437");
  assert.equal(target.username, "mais_priority_test");
  assert.equal(target.password, "");
  assert.equal(target.pathname, "/mais_priority_tests");
}

function productionParts(relative, functionNames, variableNames = [], bindings = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const ast = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && functionNames.includes(node.name?.text));
  const variables = ast.statements.flatMap(node => ts.isVariableStatement(node)
    ? node.declarationList.declarations.filter(item => variableNames.includes(item.name.getText(ast))) : []);
  assert.equal(functions.length, functionNames.length);
  assert.equal(variables.length, variableNames.length);
  const selected = functions.map(node => node.getText(ast)).concat(variables.map(node => `const ${node.getText(ast)};`)).join("\n");
  const context = { exports: {}, Date, ...bindings };
  vm.runInNewContext(ts.transpileModule(selected, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText + `\nexports.parts = {${[...functionNames, ...variableNames].join(",")}};`, context);
  return context.exports.parts;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const subjectColumns = {
  practice_attempts: "user_id", mistake_book_items: "user_id", adaptive_skill_states: "user_id",
  learning_events: "user_id", learning_event_clears: "user_id", reward_point_ledger: "student_id",
  ai_tutor_message_journal: "user_id", ai_tutor_usage_journal: "user_id", ai_governance_rate_limit_events: "user_id"
};

test("real PostgreSQL account erasure, reset ordering and rollback", { skip: !testUrl, timeout: 30_000 }, async t => {
  const sql = postgres(testUrl, { max: 8, prepare: false, connect_timeout: 3, idle_timeout: 1 });
  t.after(() => sql.end({ timeout: 3 }));
  let holdAfterLock;
  const activity = productionParts("./practiceAttemptStore.ts", [
    "analyticsEventDurationSeconds", "eventIsAfterClear", "appendLearningEventsFast", "clearLearningEventsFast", "persistQuestionAttempt", "profileFields", "writeMistakeRow", "writeAdaptiveSkillState", "nextReviewIso", "dayWindow", "maybeWritePracticeAccuracyReward"
  ], ["postgresStudentActivitySchemaStatements"], {
    ...accountData, ...practiceIdentity, randomUUID,
    postgresRowsEnabled: () => true,
    ensurePostgresStudentActivityTables: async () => {},
    getPostgresClient: () => sql,
    lockExistingPostgresAccountData: async (transaction, userId) => {
      const exists = await accountData.lockExistingPostgresAccountData(transaction, userId);
      const hold = holdAfterLock;
      if (hold) { holdAfterLock = undefined; hold.acquired.resolve(); await hold.finish.promise; }
      return exists;
    }
  });
  await sql`CREATE TABLE IF NOT EXISTS public.auth_users (id text PRIMARY KEY)`;
  await sql`CREATE TABLE IF NOT EXISTS public.priority_test_snapshot (id int PRIMARY KEY, data jsonb NOT NULL)`;
  for (const statement of activity.postgresStudentActivitySchemaStatements) await sql.unsafe(statement);
  for (const table of ["ai_tutor_message_journal", "ai_tutor_usage_journal", "ai_governance_rate_limit_events"]) {
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS public.${table} (id text PRIMARY KEY, user_id text NOT NULL)`);
  }
  for (const statement of teacherNoticeEmailOutboxPostgresSchemaStatements) await sql.unsafe(statement);

  async function resetFixture() {
    await sql.unsafe(`TRUNCATE public.auth_users, public.priority_test_snapshot, public.teacher_notice_email_outbox, ${Object.keys(subjectColumns).map(table => `public.${table}`).join(", ")}`);
    await sql`INSERT INTO public.auth_users (id) VALUES ('target'), ('other')`;
    await sql`INSERT INTO public.priority_test_snapshot (id, data) VALUES (1, ${sql.json({ users: ["target", "other"] })})`;
  }

  async function seedSubjectRows() {
    const now = "2026-09-01T00:00:00.000Z";
    for (const user of ["target", "other"]) {
      const rows = {
        practice_attempts: { id: `practice-${user}`, user_id: user, question_id: "q", selected_answer: "4", is_correct: true, grade: "S3", topic_id: "topic", curriculum_track: "hk", created_at: now },
        mistake_book_items: { user_id: user, question_id: "q", last_selected_answer: "3", correct_answer: "4", wrong_attempts: 1, first_wrong_at: now, last_attempt_at: now },
        adaptive_skill_states: { user_id: user, skill_id: "topic", updated_at: now },
        learning_events: { id: `event-${user}`, user_id: user, type: "page-view", source: "lesson", grade: "S3", topic_id: "topic", created_at: now },
        learning_event_clears: { user_id: user, cleared_at: now },
        reward_point_ledger: { id: `reward-${user}`, student_id: user, amount: 10, reason: "test", label_en: "Test", label_zh: "Test", created_at: now },
        ai_tutor_message_journal: { id: `message-${user}`, user_id: user },
        ai_tutor_usage_journal: { id: `usage-${user}`, user_id: user },
        ai_governance_rate_limit_events: { id: `rate-${user}`, user_id: user }
      };
      for (const [table, row] of Object.entries(rows)) await sql`INSERT INTO ${sql(table)} ${sql(row)}`;
    }
  }

  async function seedNotice(id, status, studentId = "target", teacherId = "teacher") {
    const terminal = ["provider-accepted", "blocked", "dead-letter"].includes(status);
    const now = "2026-09-01T00:00:00.000Z";
    const row = {
      id, notice_id: `notice-${id}`, recipient_id: "guardian", recipient_fingerprint: `opaque-${id}`,
      student_id: studentId, guardian_id: "guardian", teacher_id: teacherId, queued_by_id: teacherId,
      queued_by_fingerprint: `actor-${id}`, class_id: "class", email: "synthetic@example.test", locale: "en",
      durable_delivery_key: `delivery-${id}`, content_revision: "v1", status, attempt_count: 1,
      first_enqueued_at: now, next_attempt_at: now, created_at: now, updated_at: now,
      lease_token: status === "leased" ? "test-lease" : null,
      lease_expires_at: status === "leased" ? "2030-01-01T00:00:00.000Z" : null,
      completed_at: terminal ? now : null,
      provider_message_id: status === "provider-accepted" ? `receipt-${id}` : null,
      pii_expires_at: terminal ? now : null,
      tombstone_expires_at: terminal ? "2030-01-01T00:00:00.000Z" : null
    };
    await sql`INSERT INTO public.teacher_notice_email_outbox ${sql(row)}`;
  }

  async function waitForAdvisoryWaiter() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = await sql`SELECT count(*)::int AS count FROM pg_catalog.pg_stat_activity
        WHERE datname = 'mais_priority_tests' AND wait_event = 'advisory'`;
      if (rows[0].count > 0) return;
      await delay(10);
    }
    assert.fail("Expected the competing production writer to wait on PostgreSQL's account lock");
  }

  const oldEvent = { id: "old", type: "page-view", source: "lesson", grade: "S3", topicId: "topic", timestamp: "2026-09-01T00:00:00.000Z" };

  await t.test("R34 real PostgreSQL same-identity retries commit once, bind payload and preserve account scope", async () => {
    await resetFixture();
    const input = {
      userId: "target", question: { id: "r34-question", answer: "4", grade: "S3", topicId: "r34-topic", curriculumTrack: "HK" },
      selectedAnswer: "3", correct: false, durationSeconds: 2,
      now: "2026-10-01T12:00:00.000Z", submissionId: "11111111-1111-4111-8111-111111111111",
      answerWorkPhotos: [{ objectKey: "synthetic-photo", scanStatus: "passed" }]
    };
    const results = await Promise.all(Array.from({ length: 8 }, () => activity.persistQuestionAttempt(input)));
    assert.ok(results.every(result => result.persisted));
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts WHERE user_id = 'target'`)[0].count, 1);
    assert.equal((await sql`SELECT attempt_count FROM public.adaptive_skill_states WHERE user_id = 'target'`)[0].attempt_count, 1);
    assert.equal((await sql`SELECT wrong_attempts FROM public.mistake_book_items WHERE user_id = 'target'`)[0].wrong_attempts, 1);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.learning_events WHERE user_id = 'target'`)[0].count, 1);
    const reordered = await activity.persistQuestionAttempt({ ...input, correct: true, answerWorkPhotos: [{ scanStatus: "passed", objectKey: "synthetic-photo" }] });
    assert.equal(reordered.correct, false, "A retry acknowledges the original stored verdict");
    for (const change of [{ selectedAnswer: "4" }, { question: { ...input.question, id: "r34-other" } }, { durationSeconds: 3 }, { answerWorkPhotos: [{ objectKey: "synthetic-other" }] }]) {
      await assert.rejects(activity.persistQuestionAttempt({ ...input, ...change }), error => error.code === "practice-submission-conflict");
    }
    await activity.persistQuestionAttempt({ ...input, userId: "other" });
    const rows = await sql`SELECT id, user_id FROM public.practice_attempts ORDER BY user_id`;
    assert.equal(rows.length, 2); assert.notEqual(rows[0].id, rows[1].id);
  });

  await t.test("R34 real PostgreSQL acknowledged retries cannot inflate accuracy rewards", async () => {
    await resetFixture();
    const input = {
      userId: "target", question: { id: "r34-reward", answer: "4", grade: "S3", topicId: "r34-reward-topic", curriculumTrack: "HK", topic: { en: "Synthetic", zh: "測試" } },
      selectedAnswer: "4", correct: true, durationSeconds: 2,
      now: "2026-10-01T12:00:00.000Z", submissionId: randomUUID()
    };
    await Promise.all(Array.from({ length: 8 }, () => activity.persistQuestionAttempt(input)));
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts WHERE user_id = 'target'`)[0].count, 1);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.reward_point_ledger WHERE student_id = 'target'`)[0].count, 0);
    const distinct = [input, ...Array.from({ length: 4 }, () => ({ ...input, submissionId: randomUUID() }))];
    for (const attempt of distinct.slice(1)) await activity.persistQuestionAttempt(attempt);
    for (const attempt of distinct) await activity.persistQuestionAttempt(attempt);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts WHERE user_id = 'target'`)[0].count, 5);
    const rewards = await sql`SELECT amount, source_key FROM public.reward_point_ledger WHERE student_id = 'target'`;
    assert.equal(rewards.length, 1);
    assert.equal(rewards[0].amount, 30);
    assert.equal(rewards[0].source_key, "practice-accuracy:target:r34-reward-topic:2026-10-01");
    assert.equal((await sql`SELECT attempt_count FROM public.adaptive_skill_states WHERE user_id = 'target'`)[0].attempt_count, 5);
  });

  await t.test("R34 real PostgreSQL failed post-attempt write rolls back identity and allows the same retry", async () => {
    await resetFixture();
    const input = { userId: "target", question: { id: "r34-question", answer: "4", grade: "S3", topicId: "r34-topic", curriculumTrack: "HK" }, selectedAnswer: "3", correct: false, durationSeconds: 2, now: "2026-10-01T12:00:00.000Z", submissionId: "22222222-2222-4222-8222-222222222222" };
    await sql.unsafe(`CREATE FUNCTION public.priority_r34_reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic R34 rollback'; END; $$`);
    await sql.unsafe(`CREATE TRIGGER priority_r34_reject_event BEFORE INSERT ON public.learning_events FOR EACH ROW EXECUTE FUNCTION public.priority_r34_reject_event()`);
    try {
      await assert.rejects(activity.persistQuestionAttempt(input));
      for (const table of ["practice_attempts", "mistake_book_items", "adaptive_skill_states", "learning_events"]) {
        const rows = await sql.unsafe(`SELECT count(*)::int AS count FROM public.${table} WHERE user_id = 'target'`);
        assert.equal(rows[0].count, 0, table);
      }
    } finally {
      await sql.unsafe(`DROP TRIGGER priority_r34_reject_event ON public.learning_events`);
      await sql.unsafe(`DROP FUNCTION public.priority_r34_reject_event()`);
    }
    assert.equal((await activity.persistQuestionAttempt(input)).persisted, true);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts WHERE user_id = 'target'`)[0].count, 1);
  });

  await t.test("erasure removes all nine subject stores and validates real outbox constraints", async () => {
    await resetFixture(); await seedSubjectRows();
    for (const status of ["pending", "retryable", "leased", "provider-accepted", "blocked", "dead-letter"]) await seedNotice(status, status);
    await seedNotice("actor-only", "pending", "other", "target");
    await sql.begin(async transaction => {
      await accountData.configurePostgresAccountWriteTransaction(transaction);
      await accountData.lockPostgresAccountData(transaction, "target");
      await accountData.erasePostgresAccountData(transaction, "target");
      await transaction`DELETE FROM public.auth_users WHERE id = 'target'`;
    });
    for (const [table, column] of Object.entries(subjectColumns)) {
      const rows = await sql`SELECT ${sql(column)} AS subject FROM ${sql(table)}`;
      assert.deepEqual(rows.map(row => row.subject), ["other"], table);
    }
    const notices = await sql`SELECT * FROM public.teacher_notice_email_outbox ORDER BY id`;
    for (const row of notices.filter(row => row.id !== "actor-only")) {
      assert.equal(row.status, row.id === "provider-accepted" ? "provider-accepted" : row.id === "dead-letter" ? "dead-letter" : "blocked");
      for (const key of ["recipient_id", "student_id", "guardian_id", "teacher_id", "queued_by_id", "class_id", "email", "locale", "lease_token", "lease_expires_at"]) assert.equal(row[key], null, key);
      assert.ok(row.pii_purged_at); assert.ok(row.tombstone_expires_at);
    }
    assert.equal(notices.find(row => row.id === "provider-accepted").provider_message_id, "receipt-provider-accepted");
    assert.equal(notices.find(row => row.id === "actor-only").email, "synthetic@example.test");
  });

  await t.test("snapshot-wrapper failure rolls back canonical account, hot rows, and notice purge together", async () => {
    await resetFixture(); await seedSubjectRows(); await seedNotice("rollback", "leased");
    const wrapper = productionParts("./userStore.ts", ["mutatePostgresAccountData"], [], {
      ...accountData,
      ensurePostgresStateTable: async () => {}, getPostgresClient: () => sql, databaseIndexCache: new WeakMap(),
      readPostgresDatabaseForMutation: async transaction => {
        const rows = await transaction`SELECT data FROM public.priority_test_snapshot WHERE id = 1 FOR UPDATE`;
        return { database: rows[0].data, storageCapability: {} };
      },
      writePostgresDatabaseWith: async (transaction, database) => {
        await transaction`UPDATE public.priority_test_snapshot SET data = ${transaction.json(database)} WHERE id = 1`;
        throw new Error("synthetic snapshot-write failure");
      }
    });
    await assert.rejects(wrapper.mutatePostgresAccountData("target", async (database, transaction) => {
      database.users = database.users.filter(id => id !== "target");
      await accountData.erasePostgresAccountData(transaction, "target");
      await transaction`DELETE FROM public.auth_users WHERE id = 'target'`;
    }), /synthetic snapshot-write failure/);
    for (const [table, column] of Object.entries(subjectColumns)) {
      const rows = await sql`SELECT count(*)::int AS count FROM ${sql(table)} WHERE ${sql(column)} = 'target'`;
      assert.equal(rows[0].count, 1, table);
    }
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.auth_users WHERE id = 'target'`)[0].count, 1);
    assert.deepEqual((await sql`SELECT data FROM public.priority_test_snapshot WHERE id = 1`)[0].data.users, ["target", "other"]);
    assert.equal((await sql`SELECT status FROM public.teacher_notice_email_outbox WHERE id = 'rollback'`)[0].status, "leased");
  });

  await t.test("late production append waits for account deletion and cannot resurrect the account", async () => {
    await resetFixture(); const acquired = deferred(); const finish = deferred();
    const deletion = sql.begin(async transaction => {
      await accountData.lockPostgresAccountData(transaction, "target");
      acquired.resolve(); await finish.promise;
      await accountData.erasePostgresAccountData(transaction, "target");
      await transaction`DELETE FROM public.auth_users WHERE id = 'target'`;
    });
    await acquired.promise;
    const append = activity.appendLearningEventsFast("target", [oldEvent]);
    try { await waitForAdvisoryWaiter(); } finally { finish.resolve(); }
    await deletion; assert.equal(await append, 0);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.learning_events`)[0].count, 0);
    assert.equal(await activity.clearLearningEventsFast("target"), false);
    assert.equal((await activity.persistQuestionAttempt({ userId: "target", question: {}, now: oldEvent.timestamp })).persisted, false);
  });

  await t.test("append before reset: reset waits for commit, then removes the inserted event", async () => {
    await resetFixture(); const hold = { acquired: deferred(), finish: deferred() }; holdAfterLock = hold;
    const append = activity.appendLearningEventsFast("target", [oldEvent]); await hold.acquired.promise;
    const reset = activity.clearLearningEventsFast("target");
    try { await waitForAdvisoryWaiter(); } finally { hold.finish.resolve(); }
    assert.equal(await append, 1); assert.equal(await reset, true);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.learning_events`)[0].count, 0);
  });

  await t.test("reset before append: append waits, observes the marker and rejects the old event", async () => {
    await resetFixture(); const hold = { acquired: deferred(), finish: deferred() }; holdAfterLock = hold;
    const reset = activity.clearLearningEventsFast("target"); await hold.acquired.promise;
    const append = activity.appendLearningEventsFast("target", [oldEvent]);
    try { await waitForAdvisoryWaiter(); } finally { hold.finish.resolve(); }
    assert.equal(await reset, true); assert.equal(await append, 0);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.learning_events`)[0].count, 0);
  });

  await t.test("future event, snapshot floor and repeated older reset preserve a monotonic cutoff", async () => {
    await resetFixture(); const future = { ...oldEvent, id: "future", timestamp: "2040-01-01T00:00:00.000Z" };
    assert.equal(await activity.appendLearningEventsFast("target", [future]), 1);
    const cutoff = await sql.begin(async transaction => {
      await accountData.lockPostgresAccountData(transaction, "target");
      return accountData.resetPostgresLearningEventsInTransaction(transaction, "target", undefined, "2041-01-01T00:00:00.000Z");
    });
    assert.equal(cutoff, "2041-01-01T00:00:00.000Z");
    assert.equal(await activity.clearLearningEventsFast("target", "2020-01-01T00:00:00.000Z"), true);
    assert.equal(new Date((await sql`SELECT cleared_at FROM public.learning_event_clears WHERE user_id = 'target'`)[0].cleared_at).toISOString(), cutoff);
    assert.equal(await activity.appendLearningEventsFast("target", [future]), 0);
  });
});
