import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import postgres from "postgres";

const practiceAttemptPostgresIntegrationUrl =
  process.env.MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL?.trim() || "";

function postgresUrlForSchema(baseUrl: string, schema: string) {
  const scoped = new URL(baseUrl);
  scoped.searchParams.set("options", `-csearch_path=${schema}`);
  return scoped.href;
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

test("practice attempt fast path marks feedback unpersisted when row persistence is unavailable", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      const result = await submitQuestionAttemptFast({
        userId: "debug-user",
        questionId: "us-ca-g6-g12-v2-p6-c01-q01",
        selectedAnswer: "24",
        durationSeconds: 1
      });
      if (!result?.correct) throw new Error("Expected the exact US-CA lesson answer to grade as correct.");
      if (result.persisted !== false) throw new Error("Expected failed row persistence to be acknowledged explicitly.");
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
    timeout: 10_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /"correct":true/);
  assert.match(result.stdout, /"persisted":false/);
});

test(
  "real PostgreSQL practice attempts commit, read back, roll back, and expose ready schema",
  { skip: !practiceAttemptPostgresIntegrationUrl },
  async (t) => {
    const schema = `u224_r5_store_${randomUUID().replaceAll("-", "")}`;
    const admin = postgres(practiceAttemptPostgresIntegrationUrl, {
      connect_timeout: 10,
      max: 1,
      prepare: false,
    });
    try {
      await admin.unsafe(`CREATE SCHEMA "${schema}"`);
    } catch {
      await admin.end({ timeout: 1 }).catch(() => {});
      assert.fail("Could not create the isolated practice-attempt PostgreSQL schema; details redacted.");
    }
    t.after(async () => {
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
      await admin.end({ timeout: 1 }).catch(() => {});
    });

    const scopedUrl = postgresUrlForSchema(practiceAttemptPostgresIntegrationUrl, schema);
    const script = `
      import postgres from "postgres";
      import {
        __practiceAttemptStoreTestHooks,
        ensurePostgresStudentActivityTables,
        submitQuestionAttemptFast
      } from "./lib/server/practiceAttemptStore.ts";

      const verifier = postgres(process.env.POSTGRES_URL, { max: 1, prepare: false });
      try {
        await Promise.all([
          ensurePostgresStudentActivityTables(),
          ensurePostgresStudentActivityTables()
        ]);
        const tables = await verifier\`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = current_schema()
          ORDER BY table_name
        \`;
        const photoColumn = await verifier\`
          SELECT data_type
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'practice_attempts'
            AND column_name = 'answer_work_photos'
        \`;
        const indexes = await verifier\`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = current_schema()
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
          FROM practice_attempts
          WHERE user_id = 'u224-real-commit'
        \`;
        const committedEvents = await verifier\`
          SELECT type, source, question_id
          FROM learning_events
          WHERE user_id = 'u224-real-commit'
        \`;

        await verifier.unsafe(\`
          CREATE FUNCTION reject_u224_learning_event() RETURNS trigger
          LANGUAGE plpgsql AS $$
          BEGIN
            RAISE EXCEPTION 'u224 rollback fixture';
          END;
          $$
        \`);
        await verifier.unsafe(\`
          CREATE TRIGGER reject_u224_learning_event
          BEFORE INSERT ON learning_events
          FOR EACH ROW EXECUTE FUNCTION reject_u224_learning_event()
        \`);
        const rolledBack = await submitQuestionAttemptFast({
          userId: "u224-real-rollback",
          questionId: "q1",
          selectedAnswer: "4",
          durationSeconds: 9,
          curriculumTrack: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }
        });
        const rollbackCounts = {};
        for (const table of [
          "practice_attempts",
          "mistake_book_items",
          "adaptive_skill_states",
          "learning_events"
        ]) {
          const rows = await verifier.unsafe(
            \`SELECT COUNT(*)::int AS count FROM \${table} WHERE user_id = 'u224-real-rollback'\`
          );
          rollbackCounts[table] = rows[0].count;
        }
        process.stdout.write(JSON.stringify({
          committed,
          committedAttempt,
          committedEvents,
          indexes: indexes.map((row) => row.indexname),
          photoColumn,
          rolledBack,
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
        TMPDIR: process.env.TMPDIR ?? "",
        LANG: process.env.LANG ?? "C.UTF-8",
        LC_ALL: process.env.LC_ALL ?? "C.UTF-8",
        NODE_ENV: "test",
        NODE_OPTIONS: "",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        MAINLAND_PEP_CONTENT_ENABLED: "true",
        POSTGRES_URL: scopedUrl,
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
