import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import postgres from "postgres";

const practiceAttemptPostgresIntegrationUrl =
  process.env.MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL?.trim() || "";

function postgresUrlForDatabase(baseUrl: string, database: string) {
  const isolated = new URL(baseUrl);
  assert.ok(["postgres:", "postgresql:"].includes(isolated.protocol));
  assert.ok(["127.0.0.1", "localhost"].includes(isolated.hostname), "integration fixtures require a local disposable test database");
  assert.match(isolated.pathname, /^\/mais_[a-z0-9_]*(?:tests?|ci)$/u);
  assert.match(database, /^u224_r5_(?:store|route)_[a-f0-9]{32}$/u);
  isolated.pathname = `/${database}`;
  isolated.search = "";
  isolated.hash = "";
  return isolated.href;
}

const requiredTables = [
  "practice_attempts",
  "mistake_book_items",
  "adaptive_skill_states",
  "learning_events",
  "learning_event_clears",
  "reward_point_ledger"
];

test("practice attempt fast path defines dedicated Postgres row tables without snapshot locks", async () => {
  const store = await import("./practiceAttemptStore");
  const ddl = store.__practiceAttemptStoreTestHooks.postgresStudentActivitySchemaSql().join("\n");

  for (const table of requiredTables) {
    assert.match(ddl, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "i"));
  }

  assert.doesNotMatch(ddl, /app_state|FOR UPDATE/i);
  assert.equal(typeof store.submitQuestionAttemptFast, "function");
  assert.equal(
    typeof store.__practiceAttemptStoreTestHooks.closePostgresClient,
    "function",
    "isolated PostgreSQL integration children must close their task-owned client",
  );
  assert.equal(typeof store.appendLearningEventsFast, "function");
  assert.equal(typeof store.clearLearningEventsFast, "function");
  assert.equal(
    typeof store.ensurePostgresStudentActivityTables,
    "function",
    "parent and other scoped Postgres readers need one reusable cold-schema readiness gate"
  );
  assert.match(ddl, /practice_attempts_topic_created_at_idx/);
  assert.match(ddl, /learning_events_user_topic_created_at_idx/);
});

test("practice attempt fast path stays decoupled from full snapshot storage", async () => {
  const source = await readFile(join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");

  assert.doesNotMatch(source, /userStore|requireAuthenticatedUser|readDatabase|mutateDatabase|app_state|FOR UPDATE/i);
});

test("student activity schema readiness is transaction-bounded and retries after failure", async () => {
  const source = await readFile(join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const readinessStart = source.indexOf("export async function ensurePostgresStudentActivityTables()");
  const readinessEnd = source.indexOf("function normalizedDurationSeconds", readinessStart);
  const readinessSource = source.slice(readinessStart, readinessEnd);

  assert.notEqual(readinessStart, -1);
  assert.notEqual(readinessEnd, -1);
  assert.match(readinessSource, /sql\.begin\(async \(migrationSql\) => \{/);
  assert.match(readinessSource, /set_config\(\s*'lock_timeout',[\s\S]*true\s*\)/);
  assert.match(readinessSource, /set_config\(\s*'statement_timeout',[\s\S]*true\s*\)/);
  assert.match(readinessSource, /migrationSql\.unsafe\(statement\)/);
  assert.match(readinessSource, /attempt\.catch\(\(\) => \{[\s\S]*postgresActivityReady = null/);
});

test("practice attempt persistence policy fails closed outside an explicit durable store", async () => {
  const store = await import("./practiceAttemptStore");
  assert.equal(typeof store.practiceAttemptPersistenceMode, "function");
  assert.equal(store.practiceAttemptPersistenceMode({ HK_MATH_STORAGE_PROVIDER: "sqlite" }), "local");
  assert.equal(
    store.practiceAttemptPersistenceMode({
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    }),
    "unavailable",
  );
  assert.equal(
    store.practiceAttemptPersistenceMode({ HK_MATH_STORAGE_PROVIDER: "postgres", POSTGRES_URL: "" }),
    "unavailable",
  );
  assert.equal(
    store.practiceAttemptPersistenceMode({
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: "postgres://fixture.invalid/db",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    }),
    "postgres",
  );
});

test("practice attempt fast path rejects when authority status cannot be verified", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      try {
        await submitQuestionAttemptFast({ userId: "debug-user", questionId: "us-ca-g6-g12-v2-p6-c01-q01", selectedAnswer: "24", durationSeconds: 1 });
        throw new Error("Unverifiable authority must not return graded feedback.");
      } catch (error) {
        if (!String(error?.message).includes("ECONNREFUSED")) throw error;
        process.stdout.write("authority-unavailable-rejected");
      }
    }).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
    cwd: process.cwd(), encoding: "utf8", timeout: 10_000,
    env: { ...process.env, HK_MATH_POSTGRES_MAX_CONNECTIONS: "1", HK_MATH_STORAGE_PROVIDER: "postgres", POSTGRES_URL: "postgres://user:pass@127.0.0.1:1/db" }
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /authority-unavailable-rejected/);
});

test(
  "real PostgreSQL practice attempts commit, read back, roll back, and expose ready schema",
  { skip: !practiceAttemptPostgresIntegrationUrl },
  async (t) => {
    const database = `u224_r5_store_${randomUUID().replaceAll("-", "")}`;
    const isolatedUrl = postgresUrlForDatabase(practiceAttemptPostgresIntegrationUrl, database);
    const admin = postgres(practiceAttemptPostgresIntegrationUrl, {
      connect_timeout: 10,
      max: 1,
      prepare: false,
    });
    try {
      await admin.unsafe(`CREATE DATABASE "${database}"`);
    } catch {
      await admin.end({ timeout: 1 }).catch(() => {});
      assert.fail("Could not create the isolated practice-attempt PostgreSQL database; details redacted.");
    }
    t.after(async () => {
      try {
        // No FORCE: leaked child clients fail cleanup visibly instead of being killed.
        await admin.unsafe(`DROP DATABASE "${database}"`);
      } finally {
        await admin.end({ timeout: 1 });
      }
    });

    const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-store-postgres-"));
    t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
    const script = `
      import postgres from "postgres";
      import {
        __practiceAttemptStoreTestHooks,
        ensurePostgresStudentActivityTables,
        submitQuestionAttemptFast
      } from "./lib/server/practiceAttemptStore.ts";

      const verifier = postgres(process.env.POSTGRES_URL, { max: 1, prepare: false });
      try {
        // Account admission and writes intentionally use canonical public tables.
        await verifier.unsafe("CREATE TABLE public.auth_users (id TEXT PRIMARY KEY)");
        await verifier\`INSERT INTO public.auth_users (id) VALUES ('u224-real-commit'), ('u224-real-rollback'), ('u224-real-deleted')\`;
        await Promise.all([
          ensurePostgresStudentActivityTables(),
          ensurePostgresStudentActivityTables()
        ]);
        const tables = await verifier\`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name
        \`;
        const photoColumn = await verifier\`
          SELECT data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'practice_attempts'
            AND column_name = 'answer_work_photos'
        \`;
        const indexes = await verifier\`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
          ORDER BY indexname
        \`;

        const committed = await submitQuestionAttemptFast({
          userId: "u224-real-commit",
          questionId: "q1",
          selectedAnswer: "5",
          durationSeconds: 7,
          curriculumTrack: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
        });
        const committedAttempt = await verifier\`
          SELECT question_id, selected_answer, is_correct, duration_seconds
          FROM public.practice_attempts
          WHERE user_id = 'u224-real-commit'
        \`;
        const committedEvents = await verifier\`
          SELECT type, source, question_id
          FROM public.learning_events
          WHERE user_id = 'u224-real-commit'
        \`;

        // Correct grading alone cannot admit a never-created or erased account.
        const unknownAccount = await submitQuestionAttemptFast({
          userId: "u224-real-missing", questionId: "q1", selectedAnswer: "5",
          curriculumTrack: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
        });
        await verifier\`DELETE FROM public.auth_users WHERE id = 'u224-real-deleted'\`;
        const deletedAccount = await submitQuestionAttemptFast({
          userId: "u224-real-deleted", questionId: "q1", selectedAnswer: "5",
          curriculumTrack: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
        });
        const deniedCounts = {};
        for (const table of ["practice_attempts", "mistake_book_items", "adaptive_skill_states", "learning_events", "reward_point_ledger"]) {
          const column = table === "reward_point_ledger" ? "student_id" : "user_id";
          const rows = await verifier.unsafe(
            \`SELECT COUNT(*)::int AS count FROM public.\${table} WHERE \${column} IN ('u224-real-missing', 'u224-real-deleted')\`
          );
          deniedCounts[table] = rows[0].count;
        }

        await verifier.unsafe("CREATE SEQUENCE public.rollback_fixture_hits");
        await verifier.unsafe(\`
          CREATE FUNCTION public.reject_u224_learning_event() RETURNS trigger
          LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM pg_catalog.nextval('public.rollback_fixture_hits');
            RAISE EXCEPTION 'u224 rollback fixture';
          END;
          $$
        \`);
        await verifier.unsafe(\`
          CREATE TRIGGER reject_u224_learning_event
          BEFORE INSERT ON public.learning_events
          FOR EACH ROW EXECUTE FUNCTION public.reject_u224_learning_event()
        \`);
        const rolledBack = await submitQuestionAttemptFast({
          userId: "u224-real-rollback",
          questionId: "q1",
          selectedAnswer: "4",
          durationSeconds: 9,
          curriculumTrack: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
        });
        const triggerHits = await verifier\`SELECT is_called FROM public.rollback_fixture_hits\`;
        const rollbackCounts = {};
        for (const table of [
          "practice_attempts",
          "mistake_book_items",
          "adaptive_skill_states",
          "learning_events"
        ]) {
          const rows = await verifier.unsafe(
            \`SELECT COUNT(*)::int AS count FROM public.\${table} WHERE user_id = 'u224-real-rollback'\`
          );
          rollbackCounts[table] = rows[0].count;
        }
        process.stdout.write(JSON.stringify({
          committed,
          committedAttempt,
          committedEvents,
          unknownAccount,
          deletedAccount,
          deniedCounts,
          indexes: indexes.map((row) => row.indexname),
          photoColumn,
          rolledBack,
          rollbackTriggerReached: triggerHits[0].is_called,
          rollbackCounts,
          tables: tables.map((row) => row.table_name)
        }));
      } catch {
        process.stderr.write("isolated practice-attempt PostgreSQL child failed; details redacted\\n");
        process.exitCode = 1;
      } finally {
        await verifier.end({ timeout: 1 }).catch(() => {});
        await __practiceAttemptStoreTestHooks.closePostgresClient().catch(() => {});
      }
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TMPDIR: temporaryRoot,
        LANG: process.env.LANG ?? "C.UTF-8",
        LC_ALL: process.env.LC_ALL ?? "C.UTF-8",
        NODE_ENV: "test",
        NODE_OPTIONS: "",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        HK_MATH_DB_PATH: join(temporaryRoot, "unused-local-fallback.sqlite"),
        HK_MATH_ENABLE_DEMO_USER: "false",
        MAINLAND_PEP_CONTENT_ENABLED: "true",
        POSTGRES_URL: isolatedUrl,
      },
      timeout: 30_000,
    });
    assert.equal(result.status, 0, "Isolated practice-attempt PostgreSQL child failed; details redacted.");
    const output = JSON.parse(result.stdout);
    assert.equal(output.committed.persisted, true);
    assert.equal(output.committed.correct, true);
    assert.deepEqual(output.committedAttempt, [{
      question_id: "q1",
      selected_answer: "5",
      is_correct: true,
      duration_seconds: 7,
    }]);
    assert.deepEqual(output.committedEvents, [{
      type: "answer-correct",
      source: "practice",
      question_id: "q1",
    }]);
    assert.equal(output.unknownAccount.correct, true);
    assert.equal(output.unknownAccount.persisted, false);
    assert.equal(output.deletedAccount.correct, true);
    assert.equal(output.deletedAccount.persisted, false);
    assert.deepEqual(output.deniedCounts, {
      practice_attempts: 0, mistake_book_items: 0, adaptive_skill_states: 0,
      learning_events: 0, reward_point_ledger: 0,
    });
    assert.equal(output.rollbackTriggerReached, true, "rollback must reach the real public trigger after account admission");
    assert.equal(output.rolledBack.correct, false);
    assert.equal(output.rolledBack.persisted, false);
    assert.deepEqual(output.rollbackCounts, {
      adaptive_skill_states: 0,
      learning_events: 0,
      mistake_book_items: 0,
      practice_attempts: 0,
    });
    assert.deepEqual(output.photoColumn, [{ data_type: "jsonb" }]);
    for (const table of requiredTables) assert.ok(output.tables.includes(table), `${table} must exist`);
    assert.ok(output.indexes.includes("practice_attempts_topic_created_at_idx"));
    assert.ok(output.indexes.includes("learning_events_user_topic_created_at_idx"));
  },
);
