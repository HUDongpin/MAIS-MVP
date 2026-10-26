import assert from "node:assert/strict";
import test from "node:test";
import type postgres from "postgres";
import { overlayPostgresStudentActivity, syncPostgresStudentActivity } from "@/lib/server/studentActivityPostgres";
import { normalizeRewardPointLedgerRecord } from "@/lib/server/userStore/gamificationSeedRecords";

type Row = Record<string, unknown>;
const states: Record<string, string> = {
  practice_attempts: "attempts", mistake_book_items: "mistakes", adaptive_skill_states: "adaptive_skill_state",
  learning_events: "learning_events", learning_event_clears: "learning_event_clears", reward_point_ledger: "reward_point_ledger"
};
function fixture() {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.keys(states).map((name) => [name, []]));
  const queries: string[] = [];
  const absent = new Set<string>();
  const database: { users: { id: string }[]; [key: string]: unknown } = {
    users: [{ id: "synthetic-student" }], questions: [{ id: "q", grade: "S3", topic_id: "topic", curriculum_track: "HK" }],
    attempts: [], mistakes: [], adaptive_skill_state: [], learning_events: [], learning_event_clears: [], visualization_events: [], reward_point_ledger: []
  };
  const tagged = async (chunks: TemplateStringsArray, ...values: unknown[]) => {
    const text = chunks.join("?"); queries.push(text);
    if (text.includes("to_regclass('learner_authority.control')")) return [{ present: false, namespace_present: false, anchor_present: false }];
    assert.match(text, /pg_catalog.unnest/);
    return (values[0] as string[]).filter((name) => !absent.has(name)).map((relation_name) => ({ relation_name }));
  };
  const unsafe = async (text: string, values: unknown[] = []) => {
    queries.push(text);
    if (text.startsWith("SELECT (SELECT")) return [Object.fromEntries(Object.entries(states).map(([table, state]) => [state, structuredClone(tables[table])]))];
    const insert = /^INSERT INTO public\.(\w+)/.exec(text);
    if (insert) {
      const table = insert[1];
      const keys = /ON CONFLICT \(([^)]+)\)/.exec(text)![1].split(", ");
      for (const row of JSON.parse(values[0] as string) as Row[]) {
        const index = tables[table].findIndex((existing) => keys.every((key) => existing[key] === row[key]));
        if (index < 0) tables[table].push(row);
        else if (table === "learning_event_clears") tables[table][index].cleared_at = new Date(Math.max(Date.parse(String(tables[table][index].cleared_at)), Date.parse(String(row.cleared_at)))).toISOString();
        else tables[table][index] = row;
      }
      return [];
    }
    const remove = /^DELETE FROM public\.(\w+)/.exec(text);
    assert.ok(remove); assert.match(text, /jsonb_array_elements\(/);
    const columns = /jsonb_build_array\(([^)]+)\)/.exec(text)![1].split(", ");
    const keys = JSON.parse(values[0] as string) as unknown[][];
    tables[remove[1]] = tables[remove[1]].filter((row) => keys.some((key) => columns.every((column, index) => row[column] === key[index])));
    return [];
  };
  const sql = Object.assign(tagged, { unsafe }) as unknown as postgres.TransactionSql;
  return { database, tables, sql, queries, absent };
}

test("Postgres activity overlay maps canonical users, dates, numeric mastery and governed media references", async () => {
  const f = fixture();
  f.tables.practice_attempts = [{ id: "a", user_id: "synthetic-student", question_id: "q", created_at: "2026-10-01T09:00:00Z", answer_work_photos: [{ objectKey: "synthetic-key" }] }, { id: "erased", user_id: "absent-user", created_at: "2026-10-01T09:00:00Z" }];
  f.tables.adaptive_skill_states = [{ user_id: "synthetic-student", skill_id: "topic", p_mastery: "0.62", updated_at: "2026-10-01T09:00:00Z" }];
  await overlayPostgresStudentActivity(f.sql, f.database);
  const attempts = f.database.attempts as Row[];
  assert.equal(attempts.length, 1); assert.equal(attempts[0].created_at, "2026-10-01T09:00:00.000Z");
  assert.deepEqual(attempts[0].answer_work_photos, [{ objectKey: "synthetic-key" }]);
  assert.equal((f.database.adaptive_skill_state as Row[])[0].p_mastery, 0.62);
});

test("Postgres activity overlay keeps the latest clear marker and one immutable source reward", async () => {
  const f = fixture();
  f.database.learning_event_clears = [{ user_id: "synthetic-student", cleared_at: "2026-10-01T09:02:00Z" }];
  f.tables.learning_event_clears = [{ user_id: "synthetic-student", cleared_at: "2026-10-01T09:00:00Z" }];
  f.tables.learning_events = [{ id: "old", user_id: "synthetic-student", created_at: "2026-10-01T09:01:00Z" }];
  f.database.reward_point_ledger = [{ id: "cold", student_id: "synthetic-student", source_key: "source", amount: 30, created_at: "2026-10-01T09:01:00Z" }];
  f.tables.reward_point_ledger = [{ id: "hot", student_id: "synthetic-student", source_key: "source", amount: 30, created_at: "2026-10-01T09:01:00Z" }];
  await overlayPostgresStudentActivity(f.sql, f.database);
  assert.deepEqual(f.database.learning_events, []); assert.equal((f.database.reward_point_ledger as Row[]).length, 1);
  assert.equal((f.database.reward_point_ledger as Row[])[0].id, "hot");
});

test("Postgres activity sync applies mastered/deleted mistakes without losing composite keys or a reward", async () => {
  const f = fixture();
  f.tables.mistake_book_items = [{ user_id: "synthetic-student", question_id: "q", mastered: false, last_attempt_at: "2026-10-01T09:00:00Z" }];
  f.tables.reward_point_ledger = [{ id: "hot", student_id: "synthetic-student", amount: 30, reason: "practice-accuracy", label_en: "Synthetic", label_zh: "Synthetic", source_key: "source", created_at: "2026-10-01T09:00:00Z" }];
  await overlayPostgresStudentActivity(f.sql, f.database);
  (f.database.mistakes as Row[])[0].mastered = true;
  await syncPostgresStudentActivity(f.sql, f.database);
  assert.equal(f.tables.mistake_book_items.length, 1); assert.equal(f.tables.mistake_book_items[0].mastered, true);
  f.database.mistakes = []; await syncPostgresStudentActivity(f.sql, f.database);
  assert.deepEqual(f.tables.mistake_book_items, []); assert.equal(f.tables.reward_point_ledger.length, 1);
});

test("Postgres activity overlay and sync support missing optional tables without DDL", async () => {
  const f = fixture(); Object.keys(states).forEach((name) => f.absent.add(`public.${name}`));
  await overlayPostgresStudentActivity(f.sql, f.database); await syncPostgresStudentActivity(f.sql, f.database);
  assert.equal(f.queries.some((query) => /CREATE|ALTER/.test(query)), false); assert.deepEqual(f.database.attempts, []);
});

test("Postgres activity sync treats absent reward source keys as nullable without changing accounting or explicit keys", async () => {
  const f = fixture();
  const now = "2026-10-02T14:00:00.000Z";
  const legacy = normalizeRewardPointLedgerRecord({
    id: "legacy-teacher-award", student_id: "synthetic-student", amount: 11,
    reason: "teacher-award", label_en: "Legacy praise", label_zh: "舊有獎賞"
  }, { now });
  assert.equal(legacy.source_key, "", "canonical legacy normalization has no proven source identity");
  const ledger = [
    legacy,
    { ...legacy, id: "empty-key", source_key: "", amount: 7 },
    { ...legacy, id: "space-key", source_key: " \t\n", amount: -3 },
    { ...legacy, id: "missing-key", source_key: undefined, amount: 5 },
    { ...legacy, id: "null-key", source_key: null, amount: 2 },
    { ...legacy, id: "explicit-key", source_key: "lesson-complete:synthetic-student:topic", amount: 40 },
    { ...legacy, id: "foreign-account", student_id: "absent-user", source_key: "", amount: 99 }
  ];
  f.database.reward_point_ledger = ledger;
  await syncPostgresStudentActivity(f.sql, f.database);
  for (const row of f.tables.reward_point_ledger.filter((row) => row.id !== "explicit-key")) {
    assert.equal(row.source_key, null, String(row.id));
  }
  assert.equal(f.tables.reward_point_ledger.find((row) => row.id === "explicit-key")?.source_key,
    "lesson-complete:synthetic-student:topic");
  assert.equal(f.tables.reward_point_ledger.length, 6);
  assert.equal(f.tables.reward_point_ledger.reduce((total, row) => total + Number(row.amount), 0), 62);
  assert.equal(legacy.source_key, "", "serialization does not mutate canonical in-memory records");
  await syncPostgresStudentActivity(f.sql, f.database);
  assert.equal(f.tables.reward_point_ledger.length, 6, "repeated full synchronization does not award again");
  assert.equal(f.tables.reward_point_ledger.reduce((total, row) => total + Number(row.amount), 0), 62);
});

test("Postgres activity overlay keeps whitespace-only legacy credits and debits distinct by ledger ID", async () => {
  const f = fixture();
  const base = { student_id: "synthetic-student", source_key: " \t\n\u00a0\ufeff", created_at: "2026-10-02T14:00:00Z" };
  f.database.reward_point_ledger = [{ ...base, id: "cold-credit", amount: 11 }, { ...base, id: "cold-debit", amount: -4 }];
  f.tables.reward_point_ledger = [{ ...base, id: "hot-credit", amount: 3 }];
  await overlayPostgresStudentActivity(f.sql, f.database);
  const records = f.database.reward_point_ledger as Row[];
  assert.deepEqual(records.map((row) => row.id).sort(), ["cold-credit", "cold-debit", "hot-credit"]);
  assert.equal(records.reduce((sum, row) => sum + Number(row.amount), 0), 10);
});

test("Postgres activity overlay merges a legacy ledger ID before deduplicating inferred reward sources", async () => {
  for (const source_key of [null, "", " \t\n\u00a0\ufeff"]) {
    const f = fixture();
    const now = "2026-10-02T14:00:00.000Z";
    const cold = normalizeRewardPointLedgerRecord({
      id: "reward-ledger-peter-lesson-complete", student_id: "synthetic-student", amount: 40,
      reason: "lesson-complete", label_en: "Legacy lesson", label_zh: "舊有課節", source_key: "", created_at: now
    }, { demoUserId: "synthetic-student", now });
    assert.equal(cold.source_key, "lesson-complete:synthetic-student:quadratic-functions");
    f.database.users.push({ id: "other-student" });
    f.database.reward_point_ledger = [cold, { ...cold, student_id: "other-student", amount: 7 }];
    f.tables.reward_point_ledger = [{ ...cold, source_key }];
    await overlayPostgresStudentActivity(f.sql, f.database);
    const ledger = f.database.reward_point_ledger as Row[];
    assert.equal(ledger.length, 2, JSON.stringify(source_key));
    assert.equal(ledger.filter(row => row.student_id === "synthetic-student").length, 1);
    assert.equal(ledger.filter(row => row.student_id === "synthetic-student").reduce((sum, row) => sum + Number(row.amount), 0), 40);
    assert.equal(ledger.find(row => row.student_id === "other-student")?.amount, 7);
    await overlayPostgresStudentActivity(f.sql, f.database);
    assert.equal((f.database.reward_point_ledger as Row[]).length, 2, "repeated overlay cannot double the inferred reward");
  }
});
