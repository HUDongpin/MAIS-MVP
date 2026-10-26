import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import vm from "node:vm";
import { isDeepStrictEqual } from "node:util";
import postgres from "postgres";
import ts from "typescript";
import * as accountData from "./accountDataPostgres.ts";
import * as practiceIdentity from "./practiceSubmissionIdentity.ts";
import { overlayPostgresStudentActivity, syncPostgresStudentActivity } from "./studentActivityPostgres.ts";
import { completeStudentActivityMatchingAssignments, createStudentActivityPersistenceStore } from "./userStore/studentActivityPersistence.ts";
import { awardLessonCompletionReward } from "./userStore/gamificationRewardRedemptionPersistence.ts";
import { normalizeRewardPointLedgerRecord } from "./userStore/gamificationSeedRecords.ts";

// Run sequentially with accountDataPostgresIntegration.test.mjs against the
// explicitly selected disposable database.
// Never use POSTGRES_URL. Missing opt-in configuration skips all DB work.
const testUrl = process.env.MAIS_PRIORITY_POSTGRES_TEST_URL;
if (testUrl) {
  const target = new URL(testUrl);
  assert.equal(target.protocol, "postgres:");
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.port, "55437");
  assert.equal(target.username, "mais_priority_test");
  assert.equal(target.password, "");
  assert.equal(target.pathname, "/mais_priority_tests");
  assert.equal(target.search, "");
  assert.equal(target.hash, "");
}

function sourceFile(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  return { source, ast: ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true) };
}

function compileParts(relative, functionNames, variableNames = [], bindings = {}) {
  const { ast } = sourceFile(relative);
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && functionNames.includes(node.name?.text));
  const variables = ast.statements.flatMap(node => ts.isVariableStatement(node)
    ? node.declarationList.declarations.filter(item => variableNames.includes(item.name.getText(ast))) : []);
  assert.equal(functions.length, functionNames.length, `Missing production function in ${relative}`);
  assert.equal(variables.length, variableNames.length, `Missing production variable in ${relative}`);
  const selected = functions.map(node => node.getText(ast)).concat(variables.map(node => `const ${node.getText(ast)};`)).join("\n");
  const context = { exports: {}, Date, Map, Set, WeakMap, Number, ...bindings };
  vm.runInNewContext(ts.transpileModule(selected, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText + `\nexports.parts = {${[...functionNames, ...variableNames].join(",")}};`, context);
  return context.exports.parts;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, child => visit(child, callback));
}

// Extract the WHOLE authored tagged SQL template, preserving expressions,
// parameters and CTEs. It is executed by postgres-js against the actual server.
// No SQL facsimile or source-shape assertion certifies syntax/semantics here.
function authoredReadQuery(functionName, bindings) {
  const { ast } = sourceFile("./userStore.ts");
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === functionName);
  assert.ok(declaration, functionName);
  const queries = [];
  visit(declaration, node => {
    if (ts.isTaggedTemplateExpression(node)) {
      const template = node.template.getText(ast);
      if (/^`\s*WITH\s/i.test(template)) queries.push(template);
    }
  });
  assert.equal(queries.length, 1, `Expected exactly one full authored read query: ${functionName}`);
  const context = { ...bindings };
  vm.runInNewContext(ts.transpileModule(`function query(sql: any) { return sql${queries[0]}; }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, context);
  return { execute: context.query, hash: createHash("sha256").update(queries[0]).digest("hex") };
}

function authoredTableDdl() {
  const { ast } = sourceFile("./userStore.ts");
  const result = new Map();
  visit(ast, node => {
    if (!ts.isTaggedTemplateExpression(node) || !ts.isNoSubstitutionTemplateLiteral(node.template)) return;
    const statement = node.template.text;
    const match = /^\s*CREATE TABLE IF NOT EXISTS public\.(projection_\w+|app_state|auth_\w+|ai_tutor_(?:message|usage)_journal)\s*\(/i.exec(statement);
    if (match && !result.has(match[1])) result.set(match[1], statement);
  });
  assert.ok(result.has("app_state"));
  assert.ok(result.has("projection_reward_point_ledger"));
  return result;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const tables = ["practice_attempts", "mistake_book_items", "adaptive_skill_states", "learning_events", "learning_event_clears", "reward_point_ledger"];
const stamp = "2026-10-01T08:00:00.000Z";
const afterStamp = "2026-10-01T08:01:00.000Z";
const sourceKey = "practice-accuracy:target:topic:2026-10-01";
const question = { id: "q", grade: "S3", topicId: "topic", curriculumTrack: "HK", answer: "4", topic: { en: "Synthetic", zh: "測試" } };
const oldEvent = { id: "old", type: "page-view", source: "lesson", grade: "S3", topicId: "topic", timestamp: stamp };

test("real PostgreSQL authoritative student activity, coupling and fast read SQL", { skip: !testUrl, timeout: 90_000 }, async t => {
  const sql = postgres(testUrl, { max: 8, prepare: false, connect_timeout: 3, idle_timeout: 1,
    connection: { application_name: "mais-priority-student-activity-integration" } });
  t.after(() => sql.end({ timeout: 3 }));
  const constants = compileParts("./userStore.ts", [], ["stateRecordId", "stateTenantId", "stateKind", "schemaVersion"]);
  const ddl = authoredTableDdl();
  const production = compileParts("./practiceAttemptStore.ts", [
    "analyticsEventDurationSeconds", "eventIsAfterClear", "appendLearningEventsFast", "clearLearningEventsFast", "persistQuestionAttempt",
    "profileFields", "nextReviewIso", "dayWindow", "writeMistakeRow", "writeAdaptiveSkillState", "maybeWritePracticeAccuracyReward"
  ], ["postgresStudentActivitySchemaStatements"], {
    ...accountData, ...practiceIdentity, randomUUID, postgresRowsEnabled: () => true,
    ensurePostgresStudentActivityTables: async () => {}, getPostgresClient: () => sql,
    // Only timing instrumentation is replaced. The actual account helper and
    // every hot write SQL statement below are the production implementation.
    lockExistingPostgresAccountData: async (transaction, userId) => {
      const hold = hotHold; hotHold = undefined;
      if (!hold) return accountData.lockExistingPostgresAccountData(transaction, userId);
      let intercepted = false;
      const proxy = new Proxy(transaction, { apply(target, thisArg, args) {
        if (!intercepted && /SELECT EXISTS/.test(args[0]?.join?.("?"))) {
          intercepted = true;
          return (async () => {
            hold.pid = Number((await transaction`SELECT pg_catalog.pg_backend_pid() AS pid`)[0].pid);
            hold.acquired.resolve(); await hold.finish.promise;
            return Reflect.apply(target, thisArg, args);
          })();
        }
        return Reflect.apply(target, thisArg, args);
      } });
      return accountData.lockExistingPostgresAccountData(proxy, userId);
    }
  });
  let hotHold;
  for (const statement of ddl.values()) await sql.unsafe(statement);
  await sql`CREATE TABLE IF NOT EXISTS public.app_state_readiness_markers (singleton boolean PRIMARY KEY)`;
  for (const statement of production.postgresStudentActivitySchemaStatements) await sql.unsafe(statement);
  // The old companion uses minimal journal fixtures; expand those disposable
  // fixtures explicitly here. Adapter/read/write functions themselves do no DDL.
  for (const table of ["ai_tutor_message_journal", "ai_tutor_usage_journal"]) {
    await sql.unsafe(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS created_at text NOT NULL DEFAULT '${stamp}'`);
    await sql.unsafe(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS record jsonb NOT NULL DEFAULT '{}'::jsonb`);
  }
  await sql`ALTER TABLE public.ai_tutor_usage_journal ADD COLUMN IF NOT EXISTS accounted_tokens double precision NOT NULL DEFAULT 0`;

  await sql`ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student'`;
  await sql`ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS session_revision integer NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS disabled_at text`;

  const projectionParts = compileParts("./userStore.ts", [
    "postgresProjectionRecord", "postgresBulkInsertBatchSize", "upsertPostgresProjectionRows", "deleteMissingPostgresProjectionRows",
    "deleteMissingPostgresProjectionCompositeRows", "syncPostgresProjectionTablesWith"
  ], ["maxPostgresParametersPerStatement", "projectionCompositeKey"], { postgresProjectionTablesShadowSyncEnabled: () => true });
  const databaseKeys = new Set(["questions", "visualization_events", "learning_event_clears", "adaptive_skill_state",
    "guardian_links", "teacher_reports", "teacher_message_entries", "teacher_notices", "teacher_notice_recipients", "teacher_review_lessons",
    "assignment_submission_attempts", "assignment_grading_runs"]);
  const { ast: userAst } = sourceFile("./userStore.ts");
  const projectionFunction = userAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "syncPostgresProjectionTablesWith");
  visit(projectionFunction, node => {
    if (ts.isPropertyAccessExpression(node) && node.expression.getText(userAst) === "database") databaseKeys.add(node.name.text);
  });
  function emptyDatabase() {
    const database = Object.fromEntries([...databaseKeys].map(key => [key, []]));
    database.users = ["target", "other", "teacher", "parent"].map(id => ({ id, role: id === "teacher" ? "teacher" : id === "parent" ? "parent" : "student", created_at: stamp }));
    database.questions = [{ id: "q", grade: "S3", topic_id: "topic", curriculum_track: "HK" }];
    database.student_profiles = [{ user_id: "target", name: "Synthetic", grade: "S3", curriculum_track: "HK" }];
    return database;
  }
  const globalLocks = compileParts("./userStore.ts", ["lockPostgresStorageMutationRelations"]);
  const normalizationModes = [];
  const writer = compileParts("./userStore.ts", ["writePostgresDatabaseWith", "readPostgresDatabaseForMutation", "mutatePostgresAccountData", "mutateDatabase",
    "postgresLessonPayloadPatch", "postgresLessonContentSnapshot", "postgresLessonContentProjectionsMatch",
    "lessonProgressActorIsCurrent", "runPostgresLessonProgressTransaction", "mutateLessonProgressDatabase"], ["lessonProgressActorRejected"], {
    storageProvider: "postgres", postgresLessonMutationQueue: Promise.resolve(),
    readScopedPostgresLessonContext: async () => null, isDeepStrictEqual, postgresHotAuthTablesEnabled: () => true,
    clearStudentDashboardCacheForUser: () => {},
    ...constants, ...accountData, ...projectionParts, syncPostgresStudentActivity,
    ensurePostgresStateTable: async () => {}, getPostgresClient: () => sql, databaseIndexCache: new WeakMap(),
    currentPostgresStorageReadinessState: () => ({}),
    acquirePostgresStorageMutationCapability: async transaction => {
      await globalLocks.lockPostgresStorageMutationRelations(transaction);
      const rows = await transaction`SELECT revision FROM public.app_state WHERE id = ${constants.stateRecordId} FOR UPDATE`;
      const hold = globalHold; globalHold = undefined;
      if (hold) {
        hold.pid = Number((await transaction`SELECT pg_catalog.pg_backend_pid() AS pid`)[0].pid);
        hold.acquired.resolve();
      }
      return { previousRevision: Number(rows[0].revision) };
    },
    normalizeLockedPostgresState: async (transaction, deferProjectionSync = false, capture) => {
      normalizationModes.push(deferProjectionSync);
      const rows = await transaction`SELECT payload FROM public.app_state WHERE id = ${constants.stateRecordId} FOR UPDATE`;
      capture?.(rows[0].payload);
      const database = await overlayPostgresStudentActivity(transaction, rows[0].payload);
      const hold = snapshotHold; snapshotHold = undefined;
      if (hold) {
        hold.pid = Number((await transaction`SELECT pg_catalog.pg_backend_pid() AS pid`)[0].pid);
        hold.acquired.resolve(); await hold.finish.promise;
      }
      return database;
    },
    postgresDatabasePayload: database => database,
    safePostgresRevision: value => Number.isSafeInteger(Number(value)) ? Number(value) : null,
    validateCompletePostgresStorageSnapshot: () => {}, syncPostgresHotAuthTablesWith: async () => {},
    recordPostgresFullWriterTestStage: () => {}, installPostgresFullWriterFaultForIntegrationTest: async () => {},
    applyPostgresFullWriterPostReturningDriftForIntegrationTest: async () => {}, advancePostgresStorageReadinessAfterMutation: async () => {},
    captureServerError: () => {}, classifyObservedError: () => "synthetic"
  });
  let globalHold;
  let snapshotHold;
  const fixtureTables = [...ddl.keys(), "app_state_readiness_markers", ...tables];
  async function resetFixture(database = emptyDatabase()) {
    await sql.unsafe(`TRUNCATE ${[...new Set(fixtureTables)].map(table => `public.${table}`).join(", ")}`);
    // Works with the companion's minimal auth_users or the full authored auth
    // schema. All values are invented; no real credentials are loaded or used.
    const authColumns = new Set((await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_users'`).map(row => row.column_name));
    for (const user of database.users) {
      const record = { id: user.id, username: user.id, normalized_username: user.id, role: user.role,
        password_hash: "synthetic-unused", password_salt: "synthetic-unused", created_at: stamp };
      await sql`INSERT INTO public.auth_users ${sql(Object.fromEntries(Object.entries(record).filter(([key]) => authColumns.has(key))))}`;
    }
    await sql`INSERT INTO public.app_state (id, tenant_id, state_kind, schema_version, revision, payload, updated_at)
      VALUES (${constants.stateRecordId}, ${constants.stateTenantId}, ${constants.stateKind}, ${constants.schemaVersion}, 0, ${sql.json(database)}, ${stamp})`;
  }
  async function readOverlay() {
    return sql.begin(async transaction => {
      await accountData.postgresStudentActivitySharedLockQuery(transaction);
      const rows = await transaction`SELECT payload FROM public.app_state WHERE id = ${constants.stateRecordId}`;
      return overlayPostgresStudentActivity(transaction, rows[0].payload);
    });
  }
  async function attempt(correct, now = stamp, answerWorkPhotos) {
    const result = await production.persistQuestionAttempt({ userId: "target", question, correct, selectedAnswer: correct ? "4" : "3", durationSeconds: 17, now, answerWorkPhotos });
    return result.persisted;
  }
  async function seedReward({ id = "hot-reward", student = "target", amount = 30, key = sourceKey } = {}) {
    await sql`INSERT INTO public.reward_point_ledger (id, student_id, amount, reason, label_en, label_zh, source_key, created_at)
      VALUES (${id}, ${student}, ${amount}, 'practice-accuracy', 'Synthetic', '測試', ${key}, ${stamp})`;
  }
  async function advisoryModes(pid, key) {
    const rows = await sql`SELECT mode, granted FROM pg_catalog.pg_locks
      WHERE pid = ${pid} AND locktype = 'advisory'
        AND classid::bigint = ((pg_catalog.hashtextextended(${key}, 0) >> 32) & 4294967295::bigint)
        AND objid::bigint = (pg_catalog.hashtextextended(${key}, 0) & 4294967295::bigint) AND objsubid = 1`;
    return rows.map(row => ({ mode: row.mode, granted: row.granted }));
  }
  async function waitForWaiter(key) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const rows = await sql`SELECT pid, mode, granted FROM pg_catalog.pg_locks
        WHERE locktype = 'advisory' AND NOT granted
          AND classid::bigint = ((pg_catalog.hashtextextended(${key}, 0) >> 32) & 4294967295::bigint)
          AND objid::bigint = (pg_catalog.hashtextextended(${key}, 0) & 4294967295::bigint) AND objsubid = 1`;
      if (rows.length) return rows;
      await delay(5);
    }
    assert.fail(`Expected PostgreSQL advisory contention on ${key}`);
  }

  await t.test("projection no-op sync retains tuple identities, JSONB equality and separate student/topic keys", async () => {
    const database = emptyDatabase();
    database.lesson_progress = ["target", "other"].map(user_id => ({ user_id, topic_id: "topic", status: "in_progress", updated_at: stamp }));
    await resetFixture(database);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    async function identities() {
      return {
        questions: Array.from(await sql`SELECT id, ctid::text AS tuple, xmin::text AS version FROM public.projection_questions ORDER BY id`),
        progress: Array.from(await sql`SELECT user_id, topic_id, ctid::text AS tuple, xmin::text AS version FROM public.projection_lesson_progress ORDER BY user_id, topic_id`)
      };
    }
    const before = await identities();
    assert.equal(before.questions.length, 1); assert.equal(before.progress.length, 2);
    for (let repeat = 0; repeat < 3; repeat++) await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.deepEqual(await identities(), before);
    // JSON object insertion order must not manufacture a change in JSONB.
    database.questions = database.questions.map(row => Object.fromEntries(Object.entries(row).reverse()));
    database.lesson_progress = database.lesson_progress.map(row => Object.fromEntries(Object.entries(row).reverse()));
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.deepEqual(await identities(), before);
    database.lesson_progress[0].status = "completed";
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    const after = await identities();
    assert.notEqual(after.progress.find(row => row.user_id === "target").tuple, before.progress.find(row => row.user_id === "target").tuple);
    assert.deepEqual(after.progress.find(row => row.user_id === "other"), before.progress.find(row => row.user_id === "other"));
    assert.equal((await sql`SELECT status FROM public.projection_lesson_progress WHERE user_id = 'other' AND topic_id = 'topic'`)[0].status, "in_progress");
  });

  await t.test("projection no-op gates retain scalar repair, nullable transitions, JSON changes, deletion and rollback", async () => {
    const database = emptyDatabase();
    database.lesson_progress = ["target", "other"].map(user_id => ({ user_id, topic_id: "topic", status: "in_progress", updated_at: stamp }));
    await resetFixture(database); await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    // Alter ONLY the denormalized scalar, leaving its JSON record identical.
    // Every assigned column must be compared, otherwise these repairs vanish.
    for (const [table, selector, expected, columns] of [
      ["projection_questions", "id = 'q'", database.questions[0], ["grade", "topic_id", "curriculum_track", "curriculum_region", "textbook_publisher"]],
      ["projection_lesson_progress", "user_id = 'target' AND topic_id = 'topic'", database.lesson_progress[0], ["lesson_slug", "status", "updated_at"]]
    ]) for (const column of columns) {
      await sql.unsafe(`UPDATE public.${table} SET ${column} = $1 WHERE ${selector}`, ["synthetic-stale-scalar"]);
      const stale = (await sql.unsafe(`SELECT ctid::text AS tuple FROM public.${table} WHERE ${selector}`))[0].tuple;
      await projectionParts.syncPostgresProjectionTablesWith(sql, database);
      const repaired = (await sql.unsafe(`SELECT ctid::text AS tuple, ${column} AS value FROM public.${table} WHERE ${selector}`))[0];
      assert.equal(repaired.value, expected[column] ?? null, `${table}.${column}`);
      assert.notEqual(repaired.tuple, stale, `${table}.${column} repair skipped`);
    }
    Object.assign(database.questions[0], { curriculum_region: "HK", textbook_publisher: "synthetic-publisher" });
    database.lesson_progress[0].lesson_slug = "synthetic-lesson";
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.deepEqual(Array.from(await sql`SELECT curriculum_region, textbook_publisher FROM public.projection_questions WHERE id = 'q'`), [{ curriculum_region: "HK", textbook_publisher: "synthetic-publisher" }]);
    assert.equal((await sql`SELECT lesson_slug FROM public.projection_lesson_progress WHERE user_id = 'target'`)[0].lesson_slug, "synthetic-lesson");
    delete database.questions[0].curriculum_region; delete database.questions[0].textbook_publisher;
    delete database.lesson_progress[0].lesson_slug;
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    const questionTupleBeforeJson = (await sql`SELECT ctid::text AS tuple FROM public.projection_questions WHERE id = 'q'`)[0].tuple;
    const progressTupleBeforeJson = (await sql`SELECT ctid::text AS tuple FROM public.projection_lesson_progress WHERE user_id = 'target'`)[0].tuple;
    database.questions[0].text = { en: "Changed JSON only", zh: "測試" };
    database.lesson_progress[0].duration_seconds = 42;
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    const currentQuestion = (await sql`SELECT *, ctid::text AS tuple FROM public.projection_questions WHERE id = 'q'`)[0];
    const currentProgress = (await sql`SELECT *, ctid::text AS tuple FROM public.projection_lesson_progress WHERE user_id = 'target'`)[0];
    assert.notEqual(currentQuestion.tuple, questionTupleBeforeJson);
    assert.notEqual(currentProgress.tuple, progressTupleBeforeJson);
    assert.equal(currentQuestion.curriculum_region, null); assert.equal(currentQuestion.textbook_publisher, null);
    assert.deepEqual(currentQuestion.record.text, database.questions[0].text);
    assert.equal(currentProgress.lesson_slug, null); assert.equal(currentProgress.record.duration_seconds, 42);
    const changed = structuredClone(database); changed.questions[0].grade = "P1"; changed.lesson_progress[0].status = "completed";
    await assert.rejects(sql.begin(async transaction => {
      await projectionParts.syncPostgresProjectionTablesWith(transaction, changed);
      assert.equal((await transaction`SELECT grade FROM public.projection_questions WHERE id = 'q'`)[0].grade, "P1");
      throw new Error("synthetic projection rollback");
    }), /synthetic projection rollback/);
    assert.deepEqual((await sql`SELECT *, ctid::text AS tuple FROM public.projection_questions WHERE id = 'q'`)[0], currentQuestion);
    assert.deepEqual((await sql`SELECT *, ctid::text AS tuple FROM public.projection_lesson_progress WHERE user_id = 'target'`)[0], currentProgress);
    database.questions = []; database.lesson_progress = database.lesson_progress.filter(row => row.user_id === "other");
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_questions`)[0].count, 0);
    assert.deepEqual(Array.from(await sql`SELECT user_id FROM public.projection_lesson_progress`), [{ user_id: "other" }]);
  });

  await t.test("generic in-memory mutation defers projections and final full SQL atomically repairs and commits them", async () => {
    await resetFixture(); normalizationModes.length = 0;
    await attempt(true);
    await writer.mutateDatabase(database => {
      database.lesson_progress.push({ user_id: "target", topic_id: "topic", status: "completed", updated_at: stamp });
    });
    assert.deepEqual(normalizationModes, [true]);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts WHERE user_id = 'target'`)[0].count, 1);
    assert.equal((await sql`SELECT status FROM public.projection_lesson_progress WHERE user_id = 'target' AND topic_id = 'topic'`)[0].status, "completed");
    assert.equal((await sql`SELECT payload->'lesson_progress' AS progress FROM public.app_state WHERE id = 'primary'`)[0].progress[0].status, "completed");
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_questions WHERE id = 'q'`)[0].count, 1);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_attempts WHERE user_id = 'target'`)[0].count, 1);
  });

  await t.test("generic deferred mutation failure rolls back final projections, snapshot and reward changes", async () => {
    await resetFixture(); await attempt(true);
    await writer.mutateDatabase(() => {});
    const before = (await sql`SELECT revision, payload FROM public.app_state WHERE id = 'primary'`)[0];
    await assert.rejects(writer.mutateDatabase(database => {
      database.lesson_progress.push({ user_id: "target", topic_id: "topic", status: "completed", updated_at: stamp });
      database.reward_point_ledger.push({ id: "bad-deferred-reward", student_id: "target", amount: null, reason: "test", created_at: stamp });
    }));
    assert.deepEqual((await sql`SELECT revision, payload FROM public.app_state WHERE id = 'primary'`)[0], before);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_lesson_progress`)[0].count, 0);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.reward_point_ledger WHERE id = 'bad-deferred-reward'`)[0].count, 0);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_attempts WHERE user_id = 'target'`)[0].count, 1);
  });

  await t.test("actual hot attempt overlay maps all six tables, media references, timestamps and numeric mastery", async () => {
    await resetFixture();
    const photos = [{ objectKey: "synthetic/target/photo", mimeType: "image/png", byteLength: 10 }];
    assert.equal(await attempt(false, stamp, photos), true);
    const database = await readOverlay();
    assert.equal(database.attempts.length, 1);
    assert.equal(database.mistakes.length, 1);
    assert.equal(database.learning_events.length, 1);
    assert.equal(database.attempts[0].duration_seconds, 17);
    assert.equal(database.attempts[0].created_at, stamp);
    assert.deepEqual(database.attempts[0].answer_work_photos, photos);
    assert.equal(database.adaptive_skill_state[0].p_mastery, 0.38);
    assert.equal(typeof database.adaptive_skill_state[0].p_mastery, "number");
    assert.equal(database.adaptive_skill_state[0].attempt_count, 1);
    assert.deepEqual(database.adaptive_skill_state[0].misconception_tags, ["needs-review"]);
    assert.equal(database.adaptive_skill_state[0].last_practiced_at, stamp);
  });

  await t.test("canonical auth filtering removes absent owners even if stale snapshot still names them", async () => {
    await resetFixture(); await attempt(false); await seedReward();
    await sql`DELETE FROM public.auth_users WHERE id = 'target'`;
    const database = await readOverlay();
    for (const key of ["attempts", "mistakes", "adaptive_skill_state", "learning_events", "reward_point_ledger"]) assert.deepEqual(database[key], [], key);
    assert.equal(await production.appendLearningEventsFast("target", [oldEvent]), 0);
    assert.equal(await attempt(true), false);
    assert.equal(await production.clearLearningEventsFast("target"), false);
  });

  await t.test("snapshot mastered/delete operations synchronize SQL composite keys and cannot resurrect on reread", async () => {
    await resetFixture(); await attempt(false);
    await writer.mutatePostgresAccountData("target", database => { database.mistakes[0].mastered = true; database.mistakes[0].last_attempt_at = afterStamp; });
    assert.equal((await sql`SELECT mastered FROM public.mistake_book_items WHERE user_id = 'target' AND question_id = 'q'`)[0].mastered, true);
    assert.equal((await readOverlay()).mistakes[0].mastered, true);
    await writer.mutatePostgresAccountData("target", database => { database.mistakes = []; });
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.mistake_book_items`)[0].count, 0);
    assert.deepEqual((await readOverlay()).mistakes, []);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_mistake_book_items`)[0].count, 0);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts`)[0].count, 1);
  });

  await t.test("clear markers remain monotonic through sync and filter replayed learning/visualization rows", async () => {
    const database = emptyDatabase();
    database.learning_events = [{ id: "snapshot-event", user_id: "target", type: "page-view", source: "lesson", grade: "S3", topic_id: "topic", created_at: stamp }];
    database.visualization_events = [{ id: "snapshot-viz", user_id: "target", source: "lesson", topic_id: "topic", created_at: stamp }];
    await resetFixture(database);
    await production.appendLearningEventsFast("target", [{ ...oldEvent, id: "hot-event" }]);
    await writer.mutatePostgresAccountData("target", async (state, transaction) => {
      await accountData.resetPostgresLearningEventsInTransaction(transaction, "target", "2041-01-01T00:00:00.000Z");
      state.learning_events = []; state.visualization_events = [];
      state.learning_event_clears = [{ user_id: "target", cleared_at: "2041-01-01T00:00:00.000Z" }];
    });
    // Simulate an older snapshot watermark reaching sync: actual GREATEST must
    // retain the current marker; this is not a mock of PostgreSQL comparison.
    await writer.mutatePostgresAccountData("target", state => { state.learning_event_clears[0].cleared_at = "2020-01-01T00:00:00.000Z"; });
    assert.equal(new Date((await sql`SELECT cleared_at FROM public.learning_event_clears WHERE user_id = 'target'`)[0].cleared_at).toISOString(), "2041-01-01T00:00:00.000Z");
    assert.equal(await production.appendLearningEventsFast("target", [oldEvent]), 0);
    const after = await readOverlay();
    assert.deepEqual(after.learning_events, []); assert.deepEqual(after.visualization_events, []);
    assert.equal(after.learning_event_clears[0].cleared_at, "2041-01-01T00:00:00.000Z");
  });

  await t.test("actual practice reward is unique across attempts, cold duplicate IDs, sync and persisted debit", async () => {
    const database = emptyDatabase();
    database.reward_point_ledger = [{ id: "cold-reward", student_id: "target", amount: 30, reason: "practice-accuracy", label_en: "Synthetic", label_zh: "測試", source_key: sourceKey, created_at: stamp }];
    await resetFixture(database);
    for (let index = 0; index < 6; index++) assert.equal(await attempt(true), true);
    const hot = await sql`SELECT * FROM public.reward_point_ledger`;
    assert.equal(hot.length, 1); assert.equal(hot[0].source_key, sourceKey);
    assert.notEqual(hot[0].id, "cold-reward");
    await writer.mutatePostgresAccountData("target", state => {
      assert.equal(state.reward_point_ledger.length, 1); assert.equal(state.reward_point_ledger[0].id, hot[0].id);
      state.reward_point_ledger.push({ id: "debit", student_id: "target", amount: -20, reason: "reward-redemption", label_en: "Synthetic", label_zh: "測試", redemption_id: "synthetic-redemption", created_at: afterStamp });
      state.reward_redemptions.push({ id: "synthetic-redemption", student_id: "target", status: "fulfilled", requested_at: afterStamp });
    });
    assert.equal((await sql`SELECT SUM(amount)::int AS amount FROM public.reward_point_ledger WHERE student_id = 'target'`)[0].amount, 10);
    assert.equal((await readOverlay()).reward_point_ledger.reduce((sum, row) => sum + row.amount, 0), 10);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_reward_point_ledger`)[0].count, 2);
    assert.equal((await sql`SELECT record->>'redemption_id' AS id FROM public.projection_reward_point_ledger WHERE id = 'debit'`)[0].id, "synthetic-redemption");
  });

  await t.test("canonical legacy source inference cannot double a same-ID hot reward", async () => {
    for (const key of [null, "", " \t\n\u00a0\ufeff"]) {
      const database = emptyDatabase();
      const cold = normalizeRewardPointLedgerRecord({
        id: "reward-ledger-peter-lesson-complete", student_id: "target", amount: 40,
        reason: "lesson-complete", label_en: "Legacy lesson", label_zh: "舊有課節", source_key: "", created_at: stamp
      }, { demoUserId: "target", now: stamp });
      assert.equal(cold.source_key, "lesson-complete:target:quadratic-functions");
      database.reward_point_ledger = [cold];
      await resetFixture(database);
      await seedReward({ id: cold.id, amount: 40, key });
      for (let repeat = 0; repeat < 3; repeat++) {
        const overlay = await readOverlay();
        assert.equal(overlay.reward_point_ledger.length, 1, JSON.stringify(key));
        assert.equal(overlay.reward_point_ledger[0].id, cold.id);
        assert.equal(overlay.reward_point_ledger[0].amount, 40);
      }
      await writer.mutatePostgresAccountData("target", state => {
        assert.equal(state.reward_point_ledger.length, 1);
      });
      const persisted = await sql`SELECT id, amount, source_key FROM public.reward_point_ledger`;
      assert.equal(persisted.length, 1);
      assert.equal(persisted[0].amount, 40);
      assert.equal(persisted[0].source_key, null);
    }
  });

  await t.test("repeated and concurrent lesson saves preserve keyless credits/debits and award each canonical student once", async () => {
    const database = emptyDatabase();
    const lesson = { id: "lesson", slug: "synthetic-lesson", topic_id: "topic", grade: "S3",
      title_en: "Synthetic lesson", title_zh: "測試課節", description_en: "Synthetic", description_zh: "測試",
      difficulty: "standard", estimated_minutes: 5 };
    database.lessons = [lesson];
    database.topics = [{ id: "topic", grade: "S3", curriculum_track: "HK", title_en: "Synthetic", title_zh: "測試", sort_order: 0 }];
    database.lesson_progress = [];
    database.reward_point_ledger = [
      { id: "target-credit", student_id: "target", amount: 11, reason: "teacher-award" },
      { id: "target-debit", student_id: "target", amount: -4, reason: "redemption-spent", redemption_id: "target-redemption" },
      { id: "other-credit", student_id: "other", amount: 7, reason: "teacher-award" },
      { id: "other-debit", student_id: "other", amount: -2, reason: "redemption-spent", redemption_id: "other-redemption" }
    ].map(record => ({ ...record, source_key: "", label_en: "Legacy", label_zh: "舊有", created_at: stamp }));
    await resetFixture(database);
    const storeFor = userId => createStudentActivityPersistenceStore({
      now: () => new Date(afterStamp), readDatabase: readOverlay,
      mutateDatabase: mutator => writer.mutatePostgresAccountData(userId, mutator),
      afterUpdateLessonProgress: (state, { userId, lesson, firstCompletion, updatedAt }) => {
        if (firstCompletion) awardLessonCompletionReward(state, { userId, lesson, completedAt: updatedAt });
      }
    });
    const targetStore = storeFor("target");
    const otherStore = storeFor("other");
    const save = (store, userId) => store.updateLessonProgress({ userId, slug: lesson.slug, action: "complete" });
    for (let index = 0; index < 3; index++) assert.equal((await save(targetStore, "target")).status, "completed");
    const concurrent = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      index % 2 ? save(targetStore, "target") : save(otherStore, "other")));
    assert.ok(concurrent.every(result => result.status === "completed"));
    assert.equal(await save(storeFor("missing"), "missing"), null, "absent accounts gain no progress or reward");
    const rows = await sql`SELECT id, student_id, amount, source_key FROM public.reward_point_ledger ORDER BY id`;
    assert.equal(rows.length, 6);
    assert.equal(rows.filter(row => row.source_key === null).length, 4);
    assert.deepEqual(rows.filter(row => row.source_key !== null).map(row => row.source_key).sort(),
      ["lesson-complete:other:synthetic-lesson", "lesson-complete:target:synthetic-lesson"]);
    assert.equal(rows.filter(row => row.student_id === "target").reduce((sum, row) => sum + row.amount, 0), 47);
    assert.equal(rows.filter(row => row.student_id === "other").reduce((sum, row) => sum + row.amount, 0), 45);
    const persisted = (await sql`SELECT payload FROM public.app_state WHERE id = ${constants.stateRecordId}`)[0].payload;
    assert.equal(persisted.lesson_progress.length, 2);
    assert.ok(persisted.lesson_progress.every(row => row.status === "completed"));
    assert.equal(persisted.gamification_events.filter(event => event.source === "lesson-complete").length, 2);
    assert.equal(persisted.reward_point_ledger.length, 6);
    assert.equal((await readOverlay()).reward_point_ledger.reduce((sum, row) => sum + row.amount, 0), 92);
    await assert.rejects(seedReward({ id: "duplicate-explicit", key: "lesson-complete:target:synthetic-lesson" }),
      error => error.code === "23505", "nonblank source uniqueness remains enforced");
  });

  await t.test("actual full writer rolls back snapshot CAS, earlier hot sync and projections on later SQL failure", async () => {
    await resetFixture(); await attempt(false);
    const before = (await sql`SELECT revision, payload FROM public.app_state`)[0];
    await assert.rejects(writer.mutatePostgresAccountData("target", database => {
      database.mistakes[0].mastered = true;
      database.adaptive_skill_state[0].p_mastery = "not-a-number";
    }), error => error.code === "22P02");
    const after = (await sql`SELECT revision, payload FROM public.app_state`)[0];
    assert.deepEqual(after, before);
    assert.equal((await sql`SELECT mastered FROM public.mistake_book_items`)[0].mastered, false);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_attempts`)[0].count, 0);
    assert.equal((await readOverlay()).attempts.length, 1);
  });

  function lessonFixture() {
    const database = emptyDatabase();
    database.topics = [{ id: "topic", grade: "S3", curriculum_track: "HK", title_en: "Synthetic", title_zh: "測試", sort_order: 0 }];
    database.lessons = [{ id: "lesson", slug: "synthetic-lesson", topic_id: "topic", grade: "S3", title_en: "Synthetic", title_zh: "測試",
      description_en: "Synthetic", description_zh: "測試", difficulty: "standard", estimated_minutes: 5 }];
    database.lesson_blocks = [];
    database.adaptive_recommendation_cache = [];
    database.class_enrollments = [{ id: "enrollment", class_id: "class", student_id: "target", joined_at: stamp }];
    database.assignments = [{ id: "assignment", class_id: "class", content_type: "lesson", target_id: "synthetic-lesson", status: "active", created_at: stamp, updated_at: stamp }];
    database.submissions = [{ id: "submission", assignment_id: "assignment", student_id: "target", status: "not-started", score: null,
      submitted_at: null, graded_at: null, feedback_en: "", feedback_zh: "", updated_at: stamp }];
    return database;
  }
  const lessonInput = { userId: "target", slug: "synthetic-lesson", action: "complete", expectedSessionRevision: 1 };
  function lessonStore() {
    return createStudentActivityPersistenceStore({ now: () => new Date(afterStamp), readDatabase: readOverlay,
      mutateLessonProgress: writer.mutateLessonProgressDatabase,
      afterUpdateLessonProgress: (database, { userId, lesson, firstCompletion, updatedAt }) => {
        if (firstCompletion) awardLessonCompletionReward(database, { userId, lesson, completedAt: updatedAt });
        completeStudentActivityMatchingAssignments({ database, userId, contentType: "lesson", targetIds: [lesson.slug, lesson.topic_id],
          now: updatedAt, score: 100, graded: true, feedbackEn: "Synthetic", feedbackZh: "測試" });
      }
    });
  }
  async function initializeLessonFixture() {
    await resetFixture(lessonFixture());
    await writer.mutateDatabase(() => null);
  }

  await t.test("lesson current-content comparator detects missing/extra/scalar/JSON record drift with complete ID sets", async () => {
    await initializeLessonFixture();
    const database = (await sql`SELECT payload FROM public.app_state`)[0].payload;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), true);
    await sql`UPDATE public.projection_questions SET grade = 'P1' WHERE id = 'q'`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    await sql`UPDATE public.projection_topics SET record = record || '{"title_en":"stale"}'::jsonb`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    await sql`DELETE FROM public.projection_topics WHERE id = 'topic'`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    await sql`INSERT INTO public.projection_questions (id, grade, topic_id, curriculum_track, record) VALUES ('extra','S3','topic','HK','{}')`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    await sql`UPDATE public.projection_questions SET id = 'Q' WHERE id = 'q'`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    database.questions[0].id = '__proto__';
    database.questions[0].nested = { a: 1, b: 2 };
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), true);
    database.questions[0].nested = { b: 2, a: 1 };
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), true);
    await sql`UPDATE public.projection_questions SET record = pg_catalog.jsonb_set(record, '{nested,a}', '9')`;
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), false);
    database.questions = []; database.topics = [];
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    assert.equal(await writer.postgresLessonContentProjectionsMatch(sql, database), true);
  });

  await t.test("lesson admission leaves the second connection available for reads and drains a real rollback", async () => {
    const pool = postgres(testUrl, { max: 2, prepare: false, connect_timeout: 3, idle_timeout: 1,
      connection: { application_name: 'mais-priority-lesson-queue-two-connections' } });
    const entered = deferred(), finish = deferred(), failure = new Error('synthetic rollback');
    let connections = 0, secondEntered = false;
    const first = writer.runPostgresLessonProgressTransaction(() => pool.begin(async transaction => {
      connections++; await transaction`SELECT 1`; entered.resolve(); await finish.promise;
      throw failure;
    }));
    const rejected = assert.rejects(first, error => error === failure);
    await entered.promise;
    const second = writer.runPostgresLessonProgressTransaction(() => pool.begin(async transaction => {
      connections++; secondEntered = true; return transaction`SELECT 2 AS value`;
    }));
    try {
      const reads = await pool`SELECT 3 AS value`;
      assert.equal(reads[0].value, 3); assert.equal(connections, 1); assert.equal(secondEntered, false);
    } finally { finish.resolve(); }
    try {
      await rejected; assert.equal((await second)[0].value, 2); assert.equal(connections, 2);
    } finally { await pool.end({ timeout: 3 }); }
  });

  await t.test("concurrent lesson patches merge checklists, preserve learners, complete assignments and award once", async () => {
    await initializeLessonFixture(); const store = lessonStore();
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => store.updateLessonProgress({
      ...lessonInput, userId: index === 5 ? "other" : "target", checklistState: { ["check" + index]: true }, durationSeconds: 30.4
    })));
    assert.ok(results.every(result => result.status === "completed"));
    const row = (await sql`SELECT payload FROM public.app_state`)[0].payload;
    assert.equal(row.lesson_progress.length, 2);
    assert.equal(Object.keys(row.lesson_progress.find(record => record.user_id === "target").checklist_state).length, 5);
    assert.equal(row.lesson_progress.find(record => record.user_id === "target").duration_seconds, 30);
    assert.equal(row.reward_point_ledger.length, 2); assert.equal(row.gamification_events.length, 2);
    assert.equal(row.submissions[0].status, "graded"); assert.equal(row.submissions[0].score, 100);
    const rewardBefore = row.reward_point_ledger;
    await store.updateLessonProgress({ ...lessonInput, action: "update", checklistState: { later: true } });
    assert.deepEqual((await sql`SELECT payload FROM public.app_state`)[0].payload.reward_point_ledger, rewardBefore);
    const projections = await sql`SELECT record FROM public.projection_lesson_progress ORDER BY user_id`;
    assert.equal(projections.length, 2);
    assert.ok(projections.every(record => record.record.status === "completed"));
  });

  await t.test("lesson patch coupled with concurrent hot practice preserves all accepted attempts and reward rows", async () => {
    await initializeLessonFixture();
    const outcomes = await Promise.all([attempt(true), lessonStore().updateLessonProgress(lessonInput), attempt(false, afterStamp)]);
    assert.equal(outcomes[0], true); assert.equal(outcomes[2], true); assert.equal(outcomes[1].status, "completed");
    const overlay = await readOverlay(); assert.equal(overlay.attempts.length, 2);
    assert.equal(overlay.lesson_progress[0].status, "completed");
    assert.ok(overlay.reward_point_ledger.some(record => record.source_key === "lesson-complete:target:synthetic-lesson"));
  });

  await t.test("lesson rejects revoked/disabled/non-student/deleted live accounts without snapshot resurrection", async () => {
    for (const change of [transaction => transaction`UPDATE public.auth_users SET session_revision = 2 WHERE id = 'target'`,
      transaction => transaction`UPDATE public.auth_users SET disabled_at = ${afterStamp} WHERE id = 'target'`,
      transaction => transaction`UPDATE public.auth_users SET role = 'teacher' WHERE id = 'target'`,
      transaction => transaction`DELETE FROM public.auth_users WHERE id = 'target'`]) {
      await initializeLessonFixture(); const before = (await sql`SELECT payload, revision FROM public.app_state`)[0];
      await sql.begin(async transaction => { await accountData.lockPostgresAccountData(transaction, "target"); await change(transaction); });
      assert.equal(await lessonStore().updateLessonProgress(lessonInput), null);
      assert.deepEqual((await sql`SELECT payload, revision FROM public.app_state`)[0], before);
    }
  });

  await t.test("revocation holding account lock wins before waiting lesson validates its cookie revision", async () => {
    await initializeLessonFixture(); const held = deferred(), release = deferred();
    const revoke = sql.begin(async transaction => {
      await accountData.lockPostgresAccountData(transaction, "target");
      await transaction`UPDATE public.auth_users SET session_revision = 2 WHERE id = 'target'`;
      held.resolve(); await release.promise;
    });
    await held.promise; const save = lessonStore().updateLessonProgress(lessonInput);
    await delay(30); release.resolve(); await revoke;
    assert.equal(await save, null); assert.equal((await sql`SELECT payload FROM public.app_state`)[0].payload.lesson_progress.length, 0);
  });

  await t.test("missing current content projection forces full repair and preserves acknowledged lesson readback", async () => {
    await initializeLessonFixture(); await sql`DELETE FROM public.projection_topics WHERE id = 'topic'`;
    assert.equal((await lessonStore().updateLessonProgress(lessonInput)).status, "completed");
    assert.equal((await sql`SELECT id FROM public.projection_topics WHERE id = 'topic'`).length, 1);
    assert.equal((await sql`SELECT status FROM public.projection_lesson_progress WHERE user_id = 'target'`)[0].status, "completed");
  });

  await t.test("lesson patch rolls back canonical/hot/reward/projection writes on a later projection failure", async () => {
    await initializeLessonFixture();
    const before = (await sql`SELECT payload, revision FROM public.app_state`)[0];
    await sql`CREATE FUNCTION public.integration_lesson_projection_failure() RETURNS trigger LANGUAGE plpgsql AS $fixture$
      BEGIN RAISE EXCEPTION 'synthetic later projection failure'; END $fixture$`;
    await sql`CREATE TRIGGER integration_lesson_projection_failure BEFORE INSERT OR UPDATE ON public.projection_lesson_progress
      FOR EACH ROW EXECUTE FUNCTION public.integration_lesson_projection_failure()`;
    try { await assert.rejects(lessonStore().updateLessonProgress(lessonInput), error => error.code === "P0001"); }
    finally { await sql`DROP TRIGGER integration_lesson_projection_failure ON public.projection_lesson_progress`;
      await sql`DROP FUNCTION public.integration_lesson_projection_failure()`; }
    assert.deepEqual((await sql`SELECT payload, revision FROM public.app_state`)[0], before);
    assert.equal((await sql`SELECT count(*)::int AS n FROM public.reward_point_ledger`)[0].n, 0);
    assert.equal((await sql`SELECT count(*)::int AS n FROM public.projection_lesson_progress`)[0].n, 0);
    assert.equal((await sql`SELECT record->>'status' AS status FROM public.projection_submissions`)[0].status, "not-started");
  });

  await t.test("incomplete lesson patch fails exact RETURNING validation and rolls back before projection acknowledgement", async () => {
    await initializeLessonFixture(); const before = (await sql`SELECT payload, revision FROM public.app_state`)[0];
    await assert.rejects(sql.begin(async transaction => {
      await globalLocks.lockPostgresStorageMutationRelations(transaction);
      const rows = await transaction`SELECT payload, revision FROM public.app_state FOR UPDATE`;
      rows[0].payload.lesson_progress.push({ user_id: "target", topic_id: "topic", status: "completed", updated_at: afterStamp });
      await writer.writePostgresDatabaseWith(transaction, rows[0].payload, { previousRevision: Number(rows[0].revision) }, { lesson_progress: [] });
    }), /readiness is unavailable/);
    assert.deepEqual((await sql`SELECT payload, revision FROM public.app_state`)[0], before);
  });

  await t.test("actual advisory lock upgrade and exclusive-to-shared/account reentrancy", async () => {
    await resetFixture();
    await sql.begin(async transaction => {
      await accountData.configurePostgresAccountWriteTransaction(transaction);
      await globalLocks.lockPostgresStorageMutationRelations(transaction);
      await accountData.postgresStudentActivitySharedLockQuery(transaction);
      await accountData.postgresStudentActivityExclusiveLockQuery(transaction);
      await accountData.lockPostgresAccountData(transaction, "target");
      await accountData.lockPostgresAccountData(transaction, "target");
      assert.equal((await accountData.postgresAccountExistsQuery(transaction, "target"))[0].account_exists, true);
      const pid = Number((await transaction`SELECT pg_catalog.pg_backend_pid() AS pid`)[0].pid);
      const modes = await advisoryModes(pid, "mais:student-activity");
      assert.ok(modes.some(row => row.granted && row.mode === "ExclusiveLock"));
      assert.ok(modes.some(row => row.granted && row.mode === "ShareLock"));
      assert.deepEqual(await advisoryModes(pid, "mais:account-data:target"), [{ mode: "ExclusiveLock", granted: true }]);
    });
    // An isolated upgrade is supported. Cross-session upgrades are deliberately
    // absent from the protocol: hot writers never request exclusive/global.
  });

  await t.test("hot first: actual AccessShare existence read cannot deadlock behind deletion's ShareRowExclusive global locks", async () => {
    await resetFixture();
    const hold = { acquired: deferred(), finish: deferred() }; hotHold = hold;
    const hot = attempt(false); await hold.acquired.promise;
    assert.deepEqual(await advisoryModes(hold.pid, "mais:student-activity"), [{ mode: "ShareLock", granted: true }]);
    assert.deepEqual(await advisoryModes(hold.pid, "mais:account-data:target"), [{ mode: "ExclusiveLock", granted: true }]);
    const global = { acquired: deferred() }; globalHold = global;
    const deletion = writer.mutatePostgresAccountData("target", async (database, transaction) => {
      database.users = database.users.filter(user => user.id !== "target");
      for (const key of databaseKeys) if (Array.isArray(database[key]) && key !== "users") database[key] = database[key].filter(row => row.user_id !== "target" && row.student_id !== "target");
      await accountData.erasePostgresAccountData(transaction, "target");
      await transaction`DELETE FROM public.auth_users WHERE id = 'target'`;
    });
    await global.acquired.promise;
    try {
      const waiting = await waitForWaiter("mais:student-activity");
      assert.equal(waiting[0].pid, global.pid); assert.equal(waiting[0].mode, "ExclusiveLock");
      const authLocks = await sql`SELECT mode, granted FROM pg_catalog.pg_locks WHERE pid = ${global.pid} AND relation = 'public.auth_users'::regclass`;
      assert.ok(authLocks.some(row => row.granted && row.mode === "ShareRowExclusiveLock"));
    } finally { hold.finish.resolve(); }
    assert.equal(await hot, true); await deletion;
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts`)[0].count, 0);
    assert.deepEqual((await readOverlay()).attempts, []);
    assert.equal(await attempt(true), false);
  });

  await t.test("snapshot first: hot append waits for exclusive activity then preserves the committed snapshot change", async () => {
    await resetFixture();
    const hold = { acquired: deferred(), finish: deferred() }; snapshotHold = hold;
    const snapshot = writer.mutatePostgresAccountData("target", database => { database.student_profiles[0].name = "Updated Synthetic"; });
    await hold.acquired.promise;
    const hot = attempt(false);
    try {
      const waiting = await waitForWaiter("mais:student-activity");
      assert.equal(waiting[0].mode, "ShareLock");
      assert.ok((await advisoryModes(hold.pid, "mais:student-activity")).some(row => row.granted && row.mode === "ExclusiveLock"));
    } finally { hold.finish.resolve(); }
    await snapshot; assert.equal(await hot, true);
    const after = await readOverlay();
    assert.equal(after.student_profiles[0].name, "Updated Synthetic"); assert.equal(after.attempts.length, 1);
    assert.equal(after.adaptive_skill_state[0].attempt_count, 1);
  });

  await t.test("hot first: snapshot read observes accepted attempt and cannot clear a stale pre-append image", async () => {
    await resetFixture();
    const hold = { acquired: deferred(), finish: deferred() }; hotHold = hold;
    const hot = attempt(false); await hold.acquired.promise;
    const snapshot = writer.mutatePostgresAccountData("target", database => { assert.equal(database.attempts.length, 1); database.student_profiles[0].name = "After Accepted Attempt"; });
    try { await waitForWaiter("mais:student-activity"); } finally { hold.finish.resolve(); }
    assert.equal(await hot, true); await snapshot;
    assert.equal((await readOverlay()).attempts.length, 1);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts`)[0].count, 1);
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.projection_attempts`)[0].count, 1);
  });

  await t.test("missing optional relations are skipped without adapter DDL, incompatible present schema fails closed", async () => {
    await resetFixture();
    const rollback = new Error("synthetic fixture rollback");
    await assert.rejects(sql.begin(async transaction => {
      for (const table of tables) await transaction.unsafe(`ALTER TABLE public.${table} RENAME TO ${table}_synthetic_hidden`);
      let adapterDdl = false;
      const proxy = new Proxy(transaction, { apply(target, thisArg, args) {
        adapterDdl ||= /CREATE|ALTER|DROP/i.test(args[0]?.join?.("?"));
        return Reflect.apply(target, thisArg, args);
      }, get(target, property) {
        if (property === "unsafe") return (statement, values) => { adapterDdl ||= /CREATE|ALTER|DROP/i.test(statement); return target.unsafe(statement, values); };
        return Reflect.get(target, property);
      } });
      const database = emptyDatabase(); const before = structuredClone(database);
      assert.deepEqual(await overlayPostgresStudentActivity(proxy, database), before);
      await syncPostgresStudentActivity(proxy, database); assert.equal(adapterDdl, false);
      throw rollback;
    }), error => error === rollback);
    assert.equal((await sql`SELECT pg_catalog.to_regclass('public.practice_attempts') IS NOT NULL AS present`)[0].present, true);
    await assert.rejects(sql.begin(async transaction => {
      await transaction`ALTER TABLE public.practice_attempts RENAME COLUMN answer_work_photos TO synthetic_old_photos`;
      const database = emptyDatabase();
      database.attempts = [{ id: "new", user_id: "target", question_id: "q", selected_answer: "4", is_correct: true, created_at: stamp }];
      await syncPostgresStudentActivity(transaction, database);
    }), error => error.code === "42703");
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.practice_attempts`)[0].count, 0);
  });

  await t.test("full authored student dashboard/profile, parent, teacher dashboard/analytics and reward-summary SQL execute", async () => {
    const database = emptyDatabase();
    database.guardian_links = [{ id: "link", parent_id: "parent", student_id: "target", status: "active" }];
    database.teacher_classes = [{ id: "class", teacher_id: "teacher", name: "Synthetic Class", grade: "S3", updated_at: stamp }];
    database.class_enrollments = [{ id: "enrollment", class_id: "class", student_id: "target" }];
    database.topics = [{ id: "topic", grade: "S3", curriculum_track: "HK", sort_order: 0 }];
    database.reward_point_ledger = [
      { id: "cold-duplicate", student_id: "target", amount: 30, reason: "practice-accuracy", label_en: "Synthetic", label_zh: "測試", source_key: sourceKey, created_at: stamp },
      { id: "cold-debit", student_id: "target", amount: -10, reason: "reward-redemption", label_en: "Synthetic", label_zh: "測試", created_at: stamp }
    ];
    await resetFixture(database);
    await projectionParts.syncPostgresProjectionTablesWith(sql, database);
    await attempt(false); await seedReward();
    await seedReward({ id: "other-reward", student: "other", key: "other-source", amount: 99 });
    await seedReward({ id: "orphan-reward", student: "orphan", key: "orphan-source", amount: 999 });
    const cases = [
      ["getStudentDashboardDataFromPostgresProjection", { userId: "target", grade: "S3" }],
      ["readParentPostgresScopedDatabase", { parentId: "parent" }],
      ["getTeacherDashboardDataFromPostgresProjection", { userId: "teacher" }],
      ["getTeacherAnalyticsDataFromPostgresProjection", { userId: "teacher" }],
      ["getStudentGamificationSummaryFromPostgresProjection", { studentId: "target" }]
    ];
    for (const [name, parameters] of cases) {
      const query = authoredReadQuery(name, { ...constants, ...parameters });
      const rows = await query.execute(sql);
      assert.equal(rows.length, 1, name);
      const row = rows[0];
      if (name === "getStudentDashboardDataFromPostgresProjection") {
        assert.equal(row.user_record.id, "target");
        assert.equal(row.hot_attempt_records.length, 1); assert.equal(row.hot_mistake_records.length, 1); assert.equal(row.hot_learning_event_records.length, 1);
      } else {
        const rewards = row.reward_point_ledger_records;
        assert.equal(rewards.length, 2, name);
        assert.deepEqual(rewards.map(reward => reward.id).sort(), ["cold-debit", "hot-reward"]);
        assert.equal(rewards.reduce((sum, reward) => sum + reward.amount, 0), 20);
        assert.ok(rewards.every(reward => reward.student_id === "target"));
        if (name !== "getStudentGamificationSummaryFromPostgresProjection") assert.equal(row.student_profile_records[0].user_id, "target");
      }
      t.diagnostic(`executed authored ${name} SQL sha256=${query.hash}`);
    }
  });

  await t.test("authored reward reads preserve blank legacy balances across accounts and deduplicate only proven sources", async () => {
    // Include every ECMAScript trim character: SQL must not rely on a locale's
    // default space-only btrim or collapse unrelated unknown source identities.
    const blankKeys = ["", ...Array.from("\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff")];
    for (const blank of blankKeys) {
      const database = emptyDatabase();
      database.guardian_links = [{ id: "link", parent_id: "parent", student_id: "target", status: "active" }];
      database.teacher_classes = [{ id: "class", teacher_id: "teacher", name: "Synthetic", grade: "S3", updated_at: stamp }];
      database.class_enrollments = [{ id: "enrollment", class_id: "class", student_id: "target" }];
      database.reward_point_ledger = [
        { id: "legacy-credit", amount: 11, source_key: blank },
        { id: "legacy-debit", amount: -4, source_key: blank },
        { id: "cold-explicit", amount: 30, source_key: sourceKey }
      ].map(record => ({ ...record, student_id: "target", reason: "teacher-award", label_en: "Legacy", label_zh: "舊有", created_at: stamp }));
      await resetFixture(database);
      await projectionParts.syncPostgresProjectionTablesWith(sql, database);
      await seedReward();
      await seedReward({ id: "other-blank", student: "other", amount: 99, key: blank });
      const cases = [
        ["readParentPostgresScopedDatabase", { parentId: "parent" }],
        ["getTeacherDashboardDataFromPostgresProjection", { userId: "teacher" }],
        ["getTeacherAnalyticsDataFromPostgresProjection", { userId: "teacher" }],
        ["getStudentGamificationSummaryFromPostgresProjection", { studentId: "target" }]
      ];
      for (const [name, parameters] of cases) {
        const result = (await authoredReadQuery(name, { ...constants, ...parameters }).execute(sql))[0].reward_point_ledger_records;
        assert.deepEqual(result.map(row => row.id).sort(), ["hot-reward", "legacy-credit", "legacy-debit"], `${name} blank=${JSON.stringify(blank)}`);
        assert.equal(result.reduce((sum, row) => sum + row.amount, 0), 37);
        assert.ok(result.every(row => row.student_id === "target"));
      }
      // Same-student unknown identities must remain separate as well.
      await sql`DELETE FROM public.reward_point_ledger WHERE id = 'other-blank'`;
      await seedReward({ id: "target-blank", amount: 3, key: blank });
      const result = (await authoredReadQuery("getStudentGamificationSummaryFromPostgresProjection", { ...constants, studentId: "target" }).execute(sql))[0].reward_point_ledger_records;
      assert.equal(result.length, 4);
      assert.equal(result.reduce((sum, row) => sum + row.amount, 0), 40);
    }
  });
});
