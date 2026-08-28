import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

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

test("practice attempt fast path returns answer feedback when row persistence is unavailable", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      const result = await submitQuestionAttemptFast({
        userId: "debug-user",
        questionId: "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p5-5-oa-expressions-patterns-q01",
        selectedAnswer: "no",
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
    timeout: 10_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /"correct":true/);
});
