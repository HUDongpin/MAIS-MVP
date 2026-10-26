import type postgres from "postgres";
import { hasAuthorityInstallation } from "./learnerAuthoritySchema";
import { LearnerAuthorityError } from "./learnerAuthorityState";

type ActivitySql = postgres.Sql | postgres.TransactionSql;
type Row = Record<string, unknown>;
type ActivityDatabase = { users: { id: string }[]; [key: string]: unknown };

type ActivityTable = { name: string; state: string; subject: string; keys: string[]; columns: Record<string, string> };
const activityTables: ActivityTable[] = [
  { name: "practice_attempts", state: "attempts", subject: "user_id", keys: ["id"], columns: {
    id: "text", user_id: "text", question_id: "text", selected_answer: "text", is_correct: "bool", duration_seconds: "int4",
    grade: "text", topic_id: "text", curriculum_track: "text", curriculum_region: "text", textbook_publisher: "text", created_at: "timestamptz", answer_work_photos: "jsonb"
  } },
  { name: "mistake_book_items", state: "mistakes", subject: "user_id", keys: ["user_id", "question_id"], columns: {
    user_id: "text", question_id: "text", last_selected_answer: "text", correct_answer: "text", wrong_attempts: "int4", first_wrong_at: "timestamptz", last_attempt_at: "timestamptz", mastered: "bool"
  } },
  { name: "adaptive_skill_states", state: "adaptive_skill_state", subject: "user_id", keys: ["user_id", "skill_id"], columns: {
    user_id: "text", skill_id: "text", p_mastery: "numeric", attempt_count: "int4", correct_streak: "int4", wrong_streak: "int4", last_practiced_at: "timestamptz", next_review_at: "timestamptz", hint_count: "int4", misconception_tags: "text[]", updated_at: "timestamptz"
  } },
  { name: "learning_events", state: "learning_events", subject: "user_id", keys: ["id"], columns: {
    id: "text", user_id: "text", type: "text", source: "text", grade: "text", topic_id: "text", question_id: "text", duration_seconds: "int4", created_at: "timestamptz"
  } },
  { name: "learning_event_clears", state: "learning_event_clears", subject: "user_id", keys: ["user_id"], columns: { user_id: "text", cleared_at: "timestamptz" } },
  { name: "reward_point_ledger", state: "reward_point_ledger", subject: "student_id", keys: ["id"], columns: {
    id: "text", student_id: "text", amount: "int4", reason: "text", label_en: "text", label_zh: "text", note: "text", awarded_by: "text", redemption_id: "text", source_key: "text", created_at: "timestamptz"
  } }
];

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row));
}

function key(row: Row, columns: string[]) { return JSON.stringify(columns.map((column) => row[column])); }
function timestamp(row: Row) { return Date.parse(String(row.updated_at ?? row.last_attempt_at ?? row.created_at ?? row.cleared_at ?? "")); }

function normalizeRow(row: Row): Row {
  const result = { ...row };
  for (const name of ["created_at", "first_wrong_at", "last_attempt_at", "last_practiced_at", "next_review_at", "updated_at", "cleared_at"]) {
    if (result[name] === null || result[name] === undefined) continue;
    const date = new Date(result[name] as string | number | Date);
    if (!Number.isFinite(date.getTime())) throw new Error("Invalid PostgreSQL activity timestamp.");
    result[name] = date.toISOString();
  }
  for (const name of ["p_mastery", "attempt_count", "correct_streak", "wrong_streak", "hint_count", "wrong_attempts", "amount", "duration_seconds"]) {
    if (result[name] === null || result[name] === undefined) continue;
    const value = Number(result[name]);
    if (!Number.isFinite(value)) throw new Error("Invalid PostgreSQL activity number.");
    result[name] = value;
  }
  for (const name of ["note", "awarded_by", "redemption_id", "source_key"]) if (result[name] === null) delete result[name];
  return result;
}

async function existingTables(sql: ActivitySql) {
  const names = activityTables.map((table) => `public.${table.name}`);
  const found = await sql<Array<{ relation_name: string }>>`
    SELECT relation_name FROM pg_catalog.unnest(${names}::pg_catalog.text[]) AS names(relation_name)
    WHERE pg_catalog.to_regclass(relation_name) IS NOT NULL
  `;
  const allowed = new Set(found.map((row) => row.relation_name));
  return activityTables.filter((table) => allowed.has(`public.${table.name}`));
}

export async function overlayPostgresStudentActivity<T extends { users: { id: string }[] }>(sql: ActivitySql, database: T, options: { lossless?: boolean } = {}): Promise<T> {
  const present = await existingTables(sql);
  if (!present.length) return database;
  // One statement provides a consistent image of each atomic hot attempt.
  // No DDL is needed when a deployment has not enabled the activity tables.
  const fields = present.map((table) => `(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(activity)), '[]'::pg_catalog.jsonb) FROM public.${table.name} AS activity INNER JOIN public.auth_users AS account ON account.id = activity.${table.subject}) AS ${table.state}`);
  const result = await sql.unsafe<Row[]>(`SELECT ${fields.join(", ")}`);
  const hot = result[0] ?? {};
  const state = database as unknown as ActivityDatabase;
  const users = new Set(database.users.map((user) => user.id));
  const authoritativeOwners = new Set(options.lossless
    ? (await sql<Array<{ user_id: string }>>`SELECT user_id FROM learner_authority.accounts WHERE mode IN ('authoritative','compatibility','frozen')`).map(row => row.user_id)
    : []);
  for (const table of present) {
    if (options.lossless) {
      const cold = rows(state[table.state]);
      const identity = (row: Row) => key(row, table.name === "reward_point_ledger" ? [table.subject, ...table.keys] : table.keys);
      const slots = new Map<string, number[]>();
      cold.forEach((row, index) => { const id = identity(row); slots.set(id, [...(slots.get(id) ?? []), index]); });
      const merged = [...cold];
      for (const raw of rows(hot[table.state])) {
        if (authoritativeOwners.has(String(raw[table.subject]))) continue;
        const row = normalizeRow(raw), found = slots.get(identity(row)) ?? [];
        if (found.length > 1) {
          // No arbitrary winner may erase ordered historical duplicates. An
          // ambiguous newer hot value requires a reviewed migration decision.
          if (!found.some(index => Object.keys(row).every(column => JSON.stringify(cold[index][column] ?? null) === JSON.stringify(row[column] ?? null)))) {
            throw new LearnerAuthorityError("authority-ambiguous-legacy-activity");
          }
          continue;
        }
        if (!found.length) { merged.push(row); continue; }
        const index = found[0], existing = cold[index];
        if (!Number.isFinite(timestamp(existing)) || timestamp(row) >= timestamp(existing)
          || (table.name === "reward_point_ledger" && typeof row.source_key === "string" && Boolean(row.source_key.trim()))) {
          merged[index] = { ...existing, ...row };
        }
      }
      state[table.state] = merged;
      continue;
    }
    const merged = new Map<string, Row>();
    const acceptedHot = new Set<Row>();
    const hasRewardSourceKey = (row: Row) => table.name === "reward_point_ledger"
      && typeof row.source_key === "string" && Boolean(row.source_key.trim());
    // Canonical legacy normalization can infer a source that the same hot
    // ledger ID does not yet have. Merge that account's ID first, so changing
    // source metadata cannot turn one immutable reward into two rewards.
    const identity = (row: Row) => key(row, table.name === "reward_point_ledger"
      ? [table.subject, ...table.keys] : table.keys);
    for (const row of rows(state[table.state])) if (users.has(String(row[table.subject]))) merged.set(identity(row), row);
    for (const raw of rows(hot[table.state])) {
      const row = normalizeRow(raw);
      if (!users.has(String(row[table.subject]))) continue;
      const id = identity(row); const existing = merged.get(id);
      // Hot wins a tie. Explicit later cold mutations remain authoritative.
      if (!existing || hasRewardSourceKey(row) || !Number.isFinite(timestamp(existing)) || timestamp(row) >= timestamp(existing)) {
        merged.set(id, row);
        acceptedHot.add(row);
      }
    }
    if (table.name === "reward_point_ledger") {
      const sources = new Map<string, Row>();
      for (const row of merged.values()) {
        const id = hasRewardSourceKey(row)
          ? JSON.stringify([row.student_id, "source", row.source_key]) : identity(row);
        const existing = sources.get(id);
        // A known hot source remains authoritative over a different cold ID.
        if (!existing || acceptedHot.has(row) || !acceptedHot.has(existing)) sources.set(id, row);
      }
      state[table.state] = [...sources.values()];
    } else {
      state[table.state] = [...merged.values()];
    }
  }
  const cutoffs = new Map<string, number>();
  for (const row of rows(state.learning_event_clears)) {
    const userId = String(row.user_id), cutoff = Date.parse(String(row.cleared_at));
    cutoffs.set(userId, Math.max(cutoffs.get(userId) ?? -Infinity, cutoff));
  }
  state.learning_events = rows(state.learning_events).filter((row) => {
    const cutoff = cutoffs.get(String(row.user_id));
    return users.has(String(row.user_id)) && (cutoff === undefined || Date.parse(String(row.created_at)) > cutoff);
  });
  state.visualization_events = rows(state.visualization_events).filter((row) => {
    const cutoff = cutoffs.get(String(row.user_id));
    return users.has(String(row.user_id)) && (cutoff === undefined || Date.parse(String(row.created_at)) > cutoff);
  });
  return database;
}

// Caller holds the exclusive activity lock and global snapshot capability.
// Only present relations are synchronized: no schema creation during a read or
// snapshot write. Historical attempts whose questions were removed stay in the
// snapshot; already present hot attempts retain their original metadata.
export async function syncPostgresStudentActivity<T extends { users: { id: string }[] }>(sql: ActivitySql, database: T) {
  const state = database as unknown as ActivityDatabase;
  const active = await hasAuthorityInstallation(sql)
    ? (await sql<Array<{ user_id: string }>>`SELECT user_id FROM learner_authority.accounts WHERE mode IN ('authoritative','compatibility','frozen')`).map(row => row.user_id)
    : [];
  const activeUsers = new Set(active);
  const users = new Set(database.users.map((user) => user.id).filter(id => !activeUsers.has(id)));
  const questions = new Map(rows(state.questions).map((question) => [String(question.id), question]));
  for (const table of await existingTables(sql)) {
    const records = rows(state[table.state]).filter((row) => users.has(String(row[table.subject])));
    const prepared = records.flatMap((record) => {
      let row = record;
      if (table.name === "practice_attempts") {
        const question = questions.get(String(record.question_id));
        if (!question && (!record.grade || !record.topic_id || !record.curriculum_track)) return [];
        row = { ...record, grade: record.grade ?? question?.grade, topic_id: record.topic_id ?? question?.topic_id,
          curriculum_track: record.curriculum_track ?? question?.curriculum_track,
          curriculum_region: record.curriculum_region ?? question?.curriculum_region ?? null,
          textbook_publisher: record.textbook_publisher ?? question?.textbook_publisher ?? null,
          answer_work_photos: record.answer_work_photos ?? null };
        if (!row.grade || !row.topic_id || !row.curriculum_track) return [];
      }
      return [Object.fromEntries(Object.keys(table.columns).map((column) => {
        const value = row[column] ?? null;
        // Legacy rewards may have no proven source identity. A blank string
        // would collide with every other such reward under source_key UNIQUE;
        // SQL NULL preserves each ledger ID without weakening explicit keys.
        return [column, table.name === "reward_point_ledger" && column === "source_key"
          && typeof value === "string" && !value.trim() ? null : value];
      }))];
    });
    const columns = Object.keys(table.columns);
    if (prepared.length) {
      const definitions = columns.map((column) => `${column} pg_catalog.${table.columns[column]}`).join(", ");
      const updates = columns.filter((column) => !table.keys.includes(column)).map((column) =>
        `${column} = ${table.name === "learning_event_clears" ? `GREATEST(${table.name}.${column}, excluded.${column})` : `excluded.${column}`}`
      ).join(", ");
      await sql.unsafe(`INSERT INTO public.${table.name} (${columns.join(", ")}) SELECT ${columns.join(", ")} FROM pg_catalog.jsonb_to_recordset($1::pg_catalog.text::pg_catalog.jsonb) AS records(${definitions}) ON CONFLICT (${table.keys.join(", ")}) DO UPDATE SET ${updates}`, [JSON.stringify(prepared)]);
    }
    const keys = records.map((record) => table.keys.map((column) => record[column]));
    const expression = `pg_catalog.jsonb_build_array(${table.keys.join(", ")})`;
    await sql.unsafe(`DELETE FROM public.${table.name} WHERE NOT (${table.subject}=ANY($2::text[])) AND ${expression} NOT IN (SELECT pg_catalog.jsonb_array_elements($1::pg_catalog.text::pg_catalog.jsonb))`, [JSON.stringify(keys), active]);
  }
}
