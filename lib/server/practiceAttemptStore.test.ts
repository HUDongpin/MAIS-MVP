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
  assert.match(ddl, /practice_attempts_topic_created_at_idx/);
  assert.match(ddl, /learning_events_user_topic_created_at_idx/);
});

test("practice attempt fast path stays decoupled from full snapshot storage", async () => {
  const source = await readFile(join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");

  assert.doesNotMatch(source, /userStore|requireAuthenticatedUser|readDatabase|mutateDatabase|app_state|FOR UPDATE/i);
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
    timeout: 30_000
  });

  assert.equal(
    result.status,
    0,
    `status=${String(result.status)} signal=${String(result.signal)} error=${result.error?.stack ?? "none"}\n${result.stdout}\n${result.stderr}`
  );
  assert.match(result.stdout, /"correct":true/);
});

test("practice attempt fast path returns a localized display answer without raw CJK in English", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      const result = await submitQuestionAttemptFast({
        userId: "localized-feedback-user",
        questionId: "bnu-primary-ds-v1-p1-074",
        selectedAnswer: "right",
        durationSeconds: 1
      });
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
      HK_MATH_STORAGE_PROVIDER: "memory",
      POSTGRES_URL: ""
    },
    timeout: 30_000
  });

  assert.equal(
    result.status,
    0,
    `status=${String(result.status)} signal=${String(result.signal)} error=${result.error?.stack ?? "none"}\n${result.stdout}\n${result.stderr}`
  );
  const feedback = JSON.parse(result.stdout) as { correct: boolean; correctAnswer?: { en: string; zh: string; zhHans?: string } };
  assert.equal(feedback.correct, false);
  assert.deepEqual(feedback.correctAnswer, { en: "Left", zh: "左邊", zhHans: "左边" });
  assert.doesNotMatch(feedback.correctAnswer?.en ?? "", /[\u3400-\u9fff]/u);
});

test("practice attempt fast path rejects explicit wrong units and accepts equivalent conversions", () => {
  const script = `
    import("./lib/server/practiceAttemptStore.ts").then(async ({ submitQuestionAttemptFast }) => {
      const wrong = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "pep-primary-p2-u-fi-091",
        selectedAnswer: "39 km",
        durationSeconds: 1
      });
      const converted = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "pep-primary-p2-u-fi-091",
        selectedAnswer: "0.39 m",
        durationSeconds: 1
      });
      const bare = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "pep-primary-p2-u-fi-091",
        selectedAnswer: "39",
        durationSeconds: 1
      });
      const threeDayWrong = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "hjb-primary-ds-v1-p4-072",
        selectedAnswer: "3 cm",
        durationSeconds: 1
      });
      const threeDayBare = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "hjb-primary-ds-v1-p4-072",
        selectedAnswer: "3",
        durationSeconds: 1
      });
      const sixthDayWrong = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "hjb-primary-ds-v1-p5-236",
        selectedAnswer: "6 cm",
        durationSeconds: 1
      });
      const sixthDayBare = await submitQuestionAttemptFast({
        userId: "unit-contract-user",
        questionId: "hjb-primary-ds-v1-p5-236",
        selectedAnswer: "6",
        durationSeconds: 1
      });
      const placeValueBare = await submitQuestionAttemptFast({
        userId: "binding-contract-user",
        questionId: "pep-primary-p2-l-fi-158",
        selectedAnswer: "4",
        durationSeconds: 1
      });
      const placeValueWrongBinding = await submitQuestionAttemptFast({
        userId: "binding-contract-user",
        questionId: "pep-primary-p2-l-fi-158",
        selectedAnswer: "wrong=4",
        durationSeconds: 1
      });
      const placeValueVariableBinding = await submitQuestionAttemptFast({
        userId: "binding-contract-user",
        questionId: "pep-primary-p2-l-fi-158",
        selectedAnswer: "y=4",
        durationSeconds: 1
      });
      const equationBinding = await submitQuestionAttemptFast({
        userId: "binding-contract-user",
        questionId: "pep-junior-v2-s1-k02-fi-009",
        selectedAnswer: "x=4",
        durationSeconds: 1
      });
      const equationWrongBinding = await submitQuestionAttemptFast({
        userId: "binding-contract-user",
        questionId: "pep-junior-v2-s1-k02-fi-009",
        selectedAnswer: "y=4",
        durationSeconds: 1
      });
      process.stdout.write(JSON.stringify({
        wrong,
        converted,
        bare,
        threeDayWrong,
        threeDayBare,
        sixthDayWrong,
        sixthDayBare,
        placeValueBare,
        placeValueWrongBinding,
        placeValueVariableBinding,
        equationBinding,
        equationWrongBinding
      }));
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
      HK_MATH_STORAGE_PROVIDER: "memory",
      POSTGRES_URL: ""
    },
    timeout: 30_000
  });

  assert.equal(
    result.status,
    0,
    `status=${String(result.status)} signal=${String(result.signal)} error=${result.error?.stack ?? "none"}\n${result.stdout}\n${result.stderr}`
  );
  const attempts = JSON.parse(result.stdout) as {
    wrong: { correct: boolean };
    converted: { correct: boolean };
    bare: { correct: boolean };
    threeDayWrong: { correct: boolean };
    threeDayBare: { correct: boolean };
    sixthDayWrong: { correct: boolean };
    sixthDayBare: { correct: boolean };
    placeValueBare: { correct: boolean };
    placeValueWrongBinding: { correct: boolean };
    placeValueVariableBinding: { correct: boolean };
    equationBinding: { correct: boolean };
    equationWrongBinding: { correct: boolean };
  };
  assert.equal(attempts.wrong.correct, false);
  assert.equal(attempts.converted.correct, true);
  assert.equal(attempts.bare.correct, true);
  assert.equal(attempts.threeDayWrong.correct, false);
  assert.equal(attempts.threeDayBare.correct, true);
  assert.equal(attempts.sixthDayWrong.correct, false);
  assert.equal(attempts.sixthDayBare.correct, true);
  assert.equal(attempts.placeValueBare.correct, true);
  assert.equal(attempts.placeValueWrongBinding.correct, false);
  assert.equal(attempts.placeValueVariableBinding.correct, false);
  assert.equal(attempts.equationBinding.correct, true);
  assert.equal(attempts.equationWrongBinding.correct, false);
});
