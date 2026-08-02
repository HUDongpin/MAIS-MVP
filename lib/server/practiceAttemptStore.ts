import { randomUUID } from "crypto";
import postgres from "postgres";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import { getQuestionForAttemptFromStore } from "@/lib/server/questionStore";
import {
  runSqliteHotRowTransaction,
  sqliteBoolean,
  sqliteHotRowWritesEnabled,
  ensureSqliteHotRowTables
} from "@/lib/server/sqliteHotRows";
import type { StoredMediaObjectReference } from "@/lib/server/mediaObjectStore";
import type { AttemptFeedback, CurriculumProfile, CurriculumTrack, LearningAnalyticsEvent, Question } from "@/types";

type CurriculumScope = CurriculumTrack | CurriculumProfile | undefined | null;
type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

type SubmitQuestionAttemptFastInput = {
  userId: string;
  questionId: string;
  selectedAnswer: string;
  durationSeconds?: number;
  curriculumTrack?: CurriculumScope;
  answerWorkPhotos?: StoredMediaObjectReference[];
};

const configuredStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER?.trim().toLowerCase();
const postgresUrl = process.env.POSTGRES_URL?.trim() || null;
const configuredPostgresMaxConnections = Number(process.env.HK_MATH_POSTGRES_MAX_CONNECTIONS ?? 10);
const postgresMaxConnections = Number.isFinite(configuredPostgresMaxConnections)
  ? Math.max(1, Math.min(20, Math.round(configuredPostgresMaxConnections)))
  : 10;

let postgresClient: postgres.Sql | null = null;
let postgresActivityReady: Promise<void> | null = null;

const postgresStudentActivitySchemaStatements = [
  `CREATE TABLE IF NOT EXISTS practice_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    duration_seconds INTEGER,
    grade TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    curriculum_track TEXT NOT NULL,
    curriculum_region TEXT,
    textbook_publisher TEXT,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  // Existing deployments already have practice_attempts; the column has to be
  // added separately or their tables never gain it (CREATE TABLE IF NOT EXISTS
  // is a no-op there). Stores governed media-object REFERENCES only — never
  // image bytes, which stay in the encrypted media object store.
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS answer_work_photos JSONB`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_user_created_at_idx
    ON practice_attempts(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_user_topic_created_at_idx
    ON practice_attempts(user_id, topic_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_topic_created_at_idx
    ON practice_attempts(topic_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_question_created_at_idx
    ON practice_attempts(question_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS mistake_book_items (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    last_selected_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    wrong_attempts INTEGER NOT NULL,
    first_wrong_at TIMESTAMPTZ NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    mastered BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, question_id)
  )`,
  `CREATE INDEX IF NOT EXISTS mistake_book_items_user_last_attempt_idx
    ON mistake_book_items(user_id, mastered, last_attempt_at DESC)`,
  `CREATE INDEX IF NOT EXISTS mistake_book_items_question_last_attempt_idx
    ON mistake_book_items(question_id, last_attempt_at DESC)`,
  `CREATE TABLE IF NOT EXISTS adaptive_skill_states (
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    p_mastery NUMERIC NOT NULL DEFAULT 0.5,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    wrong_streak INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    hint_count INTEGER NOT NULL DEFAULT 0,
    misconception_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, skill_id)
  )`,
  `CREATE INDEX IF NOT EXISTS adaptive_skill_states_user_updated_idx
    ON adaptive_skill_states(user_id, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS learning_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    grade TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    question_id TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS learning_events_user_created_at_idx
    ON learning_events(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS learning_events_user_topic_created_at_idx
    ON learning_events(user_id, topic_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS learning_events_topic_created_at_idx
    ON learning_events(topic_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS learning_event_clears (
    user_id TEXT PRIMARY KEY,
    cleared_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reward_point_ledger (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_zh TEXT NOT NULL,
    note TEXT,
    awarded_by TEXT,
    redemption_id TEXT,
    source_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reward_point_ledger_student_created_at_idx
    ON reward_point_ledger(student_id, created_at DESC)`
];

function postgresRowsEnabled() {
  return configuredStorageProvider === "postgres" && Boolean(postgresUrl);
}

// Local/dev SQLite gets the same hot-row treatment as production Postgres so a
// Check Answer click never rewrites the multi-megabyte snapshot blob.
function sqliteRowsEnabled() {
  return !postgresRowsEnabled() && sqliteHotRowWritesEnabled();
}

export function practiceAttemptFastPathPersistsRows() {
  return postgresRowsEnabled() || sqliteRowsEnabled();
}

/**
 * The SQLite snapshot still holds questions that no code-based question source
 * exports (generated banks wired into topics only, retired live-question ids —
 * 1,596 of 25,352 snapshot questions today, 540 of them reachable from lesson
 * practice blocks). On Postgres those questions do not exist, so a lookup miss
 * is a genuine 404; on SQLite the caller must retry through the snapshot store
 * before giving up.
 */
export function practiceAttemptFastPathNeedsLegacyQuestionFallback() {
  return !postgresRowsEnabled();
}

export const learningEventFastPathPersistsRows = practiceAttemptFastPathPersistsRows;

function getPostgresClient() {
  if (postgresClient) return postgresClient;
  if (!postgresUrl) throw new Error("POSTGRES_URL is required for practice attempt rows.");

  postgresClient = postgres(postgresUrl, {
    max: postgresMaxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });
  return postgresClient;
}

async function ensurePostgresStudentActivityTables() {
  if (!postgresActivityReady) {
    const sql = getPostgresClient();
    postgresActivityReady = (async () => {
      for (const statement of postgresStudentActivitySchemaStatements) {
        await sql.unsafe(statement);
      }
    })();
  }

  return postgresActivityReady;
}

function normalizedDurationSeconds(durationSeconds?: number) {
  return typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? Math.round(durationSeconds)
    : null;
}

function profileFields(question: Question) {
  return {
    curriculumTrack: question.curriculumTrack,
    curriculumRegion: question.region ?? question.curriculumProfile?.region ?? null,
    textbookPublisher: question.publisher ?? question.curriculumProfile?.publisher ?? null
  };
}

function nextReviewIso(now: string, correct: boolean) {
  const base = new Date(now);
  const delayMs = correct ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  return new Date(base.getTime() + delayMs).toISOString();
}

function dayWindow(now: string) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    dayKey: start.toISOString().slice(0, 10),
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function attemptFeedback(question: Question, selectedAnswer: string): AttemptFeedback {
  const correct = questionAnswerMatches(
    {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    },
    selectedAnswer
  );

  return {
    correct,
    explanation: question.explanation,
    correctAnswer: correct ? undefined : question.answer
  };
}

function analyticsEventDurationSeconds(event: LearningAnalyticsEvent) {
  return typeof event.durationSeconds === "number" && Number.isFinite(event.durationSeconds) && event.durationSeconds > 0
    ? Math.round(event.durationSeconds)
    : null;
}

function eventIsAfterClear(event: LearningAnalyticsEvent, clearedAt: string | null) {
  if (!clearedAt) return true;
  return new Date(event.timestamp).getTime() > new Date(clearedAt).getTime();
}

function learningEventRowValues(userId: string, event: LearningAnalyticsEvent) {
  return {
    id: event.id,
    user_id: userId,
    type: event.type,
    source: event.source,
    grade: event.grade,
    topic_id: event.topicId,
    question_id: event.questionId ?? null,
    duration_seconds: analyticsEventDurationSeconds(event),
    created_at: event.timestamp
  };
}

function appendLearningEventsToSqlite(userId: string, events: LearningAnalyticsEvent[]) {
  return runSqliteHotRowTransaction((database) => {
    const clearRow = database
      .prepare("SELECT cleared_at FROM learning_event_clears WHERE user_id = ? LIMIT 1")
      .get(userId) as { cleared_at?: unknown } | undefined;
    const clearedAt = typeof clearRow?.cleared_at === "string" ? clearRow.cleared_at : null;
    const insert = database.prepare(`
      INSERT INTO learning_events (
        id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);

    let inserted = 0;
    events
      .filter((event) => eventIsAfterClear(event, clearedAt))
      .forEach((event) => {
        const row = learningEventRowValues(userId, event);
        const result = insert.run(
          row.id,
          row.user_id,
          row.type,
          row.source,
          row.grade,
          row.topic_id,
          row.question_id,
          row.duration_seconds,
          row.created_at
        );
        inserted += Number(result.changes ?? 0);
      });

    return inserted;
  });
}

export async function appendLearningEventsFast(
  userId: string,
  events: LearningAnalyticsEvent[]
): Promise<number | null> {
  if (sqliteRowsEnabled()) {
    if (!events.length) return 0;
    return appendLearningEventsToSqlite(userId, events);
  }
  if (!postgresRowsEnabled()) return null;
  if (!events.length) return 0;

  await ensurePostgresStudentActivityTables();
  const sql = getPostgresClient();
  const clearRows = await sql<{ cleared_at: string }[]>`
    SELECT cleared_at
    FROM learning_event_clears
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const clearedAt = clearRows[0]?.cleared_at ?? null;
  const rows = events
    .filter((event) => eventIsAfterClear(event, clearedAt))
    .map((event) => ({
      id: event.id,
      user_id: userId,
      type: event.type,
      source: event.source,
      grade: event.grade,
      topic_id: event.topicId,
      question_id: event.questionId ?? null,
      duration_seconds: analyticsEventDurationSeconds(event),
      created_at: event.timestamp
    }));

  if (!rows.length) return 0;

  const inserted = await sql`
    INSERT INTO learning_events ${sql(rows, "id", "user_id", "type", "source", "grade", "topic_id", "question_id", "duration_seconds", "created_at")}
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ` as Array<{ id: string }>;

  return inserted.length;
}

export async function clearLearningEventsFast(userId: string, clearedAt = new Date().toISOString()) {
  if (sqliteRowsEnabled()) {
    runSqliteHotRowTransaction((database) => {
      database.prepare("DELETE FROM learning_events WHERE user_id = ?").run(userId);
      database
        .prepare(`
          INSERT INTO learning_event_clears (user_id, cleared_at)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET cleared_at = excluded.cleared_at
        `)
        .run(userId, clearedAt);
    });
    return true;
  }
  if (!postgresRowsEnabled()) return false;

  await ensurePostgresStudentActivityTables();
  await getPostgresClient().begin(async (sql) => {
    await sql`
      DELETE FROM learning_events
      WHERE user_id = ${userId}
    `;
    await sql`
      INSERT INTO learning_event_clears (user_id, cleared_at)
      VALUES (${userId}, ${clearedAt})
      ON CONFLICT (user_id) DO UPDATE SET
        cleared_at = excluded.cleared_at
    `;
  });

  return true;
}

export type FastLearningEventRow = {
  id: string;
  user_id: string;
  type: LearningAnalyticsEvent["type"];
  source: LearningAnalyticsEvent["source"];
  grade: LearningAnalyticsEvent["grade"];
  topic_id: string;
  question_id?: string;
  duration_seconds?: number;
  created_at: string;
};

// Live teacher reads (e.g. the "who needs me now" roster) need the freshest
// learning events, which on the Postgres hot path live in the rows table rather
// than the app-state snapshot. Returns [] when the fast path is off, so the
// caller can fall back to the cold snapshot on its own.
export async function readLearningEventsFastForUsers(
  userIds: string[],
  sinceIso: string
): Promise<FastLearningEventRow[]> {
  if (sqliteRowsEnabled()) {
    if (!userIds.length) return [];
    const database = ensureSqliteHotRowTables();
    const placeholders = userIds.map(() => "?").join(", ");
    const rows = database
      .prepare(`
        SELECT id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at
        FROM learning_events
        WHERE user_id IN (${placeholders})
          AND created_at >= ?
        ORDER BY created_at ASC
      `)
      .all(...userIds, sinceIso) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      type: row.type as LearningAnalyticsEvent["type"],
      source: row.source as LearningAnalyticsEvent["source"],
      grade: row.grade as LearningAnalyticsEvent["grade"],
      topic_id: String(row.topic_id),
      question_id: typeof row.question_id === "string" ? row.question_id : undefined,
      duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : undefined,
      created_at: String(row.created_at)
    }));
  }
  if (!postgresRowsEnabled()) return [];
  if (!userIds.length) return [];

  await ensurePostgresStudentActivityTables();
  const sql = getPostgresClient();
  const rows = await sql<Array<{
    id: string;
    user_id: string;
    type: LearningAnalyticsEvent["type"];
    source: LearningAnalyticsEvent["source"];
    grade: LearningAnalyticsEvent["grade"];
    topic_id: string;
    question_id: string | null;
    duration_seconds: number | null;
    created_at: string;
  }>>`
    SELECT id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at
    FROM learning_events
    WHERE user_id IN ${sql(userIds)}
      AND created_at >= ${sinceIso}
    ORDER BY created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    source: row.source,
    grade: row.grade,
    topic_id: row.topic_id,
    question_id: row.question_id ?? undefined,
    duration_seconds: row.duration_seconds ?? undefined,
    created_at: row.created_at
  }));
}

async function writeMistakeRow(sql: PostgresExecutor, input: {
  userId: string;
  question: Question;
  selectedAnswer: string;
  correct: boolean;
  now: string;
}) {
  if (input.correct) {
    await sql`
      UPDATE mistake_book_items
      SET mastered = TRUE,
          last_attempt_at = ${input.now}
      WHERE user_id = ${input.userId}
        AND question_id = ${input.question.id}
    `;
    return;
  }

  await sql`
    INSERT INTO mistake_book_items (
      user_id,
      question_id,
      last_selected_answer,
      correct_answer,
      wrong_attempts,
      first_wrong_at,
      last_attempt_at,
      mastered
    )
    VALUES (
      ${input.userId},
      ${input.question.id},
      ${input.selectedAnswer},
      ${input.question.answer},
      1,
      ${input.now},
      ${input.now},
      FALSE
    )
    ON CONFLICT (user_id, question_id) DO UPDATE SET
      last_selected_answer = excluded.last_selected_answer,
      correct_answer = excluded.correct_answer,
      wrong_attempts = mistake_book_items.wrong_attempts + 1,
      last_attempt_at = excluded.last_attempt_at,
      mastered = FALSE
  `;
}

async function writeAdaptiveSkillState(sql: PostgresExecutor, input: {
  userId: string;
  question: Question;
  correct: boolean;
  now: string;
}) {
  const skillId = input.question.canonicalTopicId ?? input.question.topicId;
  const initialMastery = input.correct ? 0.62 : 0.38;
  const masteryDelta = input.correct ? 0.08 : -0.12;
  const correctStreak = input.correct ? 1 : 0;
  const wrongStreak = input.correct ? 0 : 1;
  const misconceptionTags = input.correct ? [] : ["needs-review"];

  await sql`
    INSERT INTO adaptive_skill_states (
      user_id,
      skill_id,
      p_mastery,
      attempt_count,
      correct_streak,
      wrong_streak,
      last_practiced_at,
      next_review_at,
      hint_count,
      misconception_tags,
      updated_at
    )
    VALUES (
      ${input.userId},
      ${skillId},
      ${initialMastery},
      1,
      ${correctStreak},
      ${wrongStreak},
      ${input.now},
      ${nextReviewIso(input.now, input.correct)},
      0,
      ${misconceptionTags},
      ${input.now}
    )
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      p_mastery = LEAST(0.99, GREATEST(0.01, adaptive_skill_states.p_mastery + ${masteryDelta})),
      attempt_count = adaptive_skill_states.attempt_count + 1,
      correct_streak = ${input.correct ? sql`adaptive_skill_states.correct_streak + 1` : sql`0`},
      wrong_streak = ${input.correct ? sql`0` : sql`adaptive_skill_states.wrong_streak + 1`},
      last_practiced_at = excluded.last_practiced_at,
      next_review_at = excluded.next_review_at,
      misconception_tags = excluded.misconception_tags,
      updated_at = excluded.updated_at
  `;
}

async function maybeWritePracticeAccuracyReward(sql: PostgresExecutor, input: {
  userId: string;
  question: Question;
  now: string;
}) {
  const window = dayWindow(input.now);
  const rows = await sql<{ attempt_count: number; correct_count: number }[]>`
    SELECT
      COUNT(*)::int AS attempt_count,
      COUNT(*) FILTER (WHERE is_correct)::int AS correct_count
    FROM practice_attempts
    WHERE user_id = ${input.userId}
      AND topic_id = ${input.question.topicId}
      AND created_at >= ${window.start}
      AND created_at < ${window.end}
  `;
  const attemptCount = Number(rows[0]?.attempt_count ?? 0);
  const correctCount = Number(rows[0]?.correct_count ?? 0);
  if (attemptCount < 5 || correctCount / attemptCount < 0.8) return;

  const sourceKey = `practice-accuracy:${input.userId}:${input.question.topicId}:${window.dayKey}`;
  await sql`
    INSERT INTO reward_point_ledger (
      id,
      student_id,
      amount,
      reason,
      label_en,
      label_zh,
      source_key,
      created_at
    )
    VALUES (
      ${`reward-ledger-${randomUUID()}`},
      ${input.userId},
      30,
      ${"practice-accuracy"},
      ${`Strong ${input.question.topic.en} practice accuracy`},
      ${`${input.question.topic.zh}練習準確率表現良好`},
      ${sourceKey},
      ${input.now}
    )
    ON CONFLICT (source_key) DO NOTHING
  `;
}

async function persistQuestionAttempt(input: {
  userId: string;
  question: Question;
  selectedAnswer: string;
  correct: boolean;
  durationSeconds: number | null;
  now: string;
  answerWorkPhotos?: StoredMediaObjectReference[];
}) {
  await ensurePostgresStudentActivityTables();
  const profile = profileFields(input.question);

  await getPostgresClient().begin(async (sql) => {
    await sql`
      INSERT INTO practice_attempts (
        id,
        user_id,
        question_id,
        selected_answer,
        is_correct,
        duration_seconds,
        grade,
        topic_id,
        curriculum_track,
        curriculum_region,
        textbook_publisher,
        created_at,
        answer_work_photos
      )
      VALUES (
        ${randomUUID()},
        ${input.userId},
        ${input.question.id},
        ${input.selectedAnswer},
        ${input.correct},
        ${input.durationSeconds},
        ${input.question.grade},
        ${input.question.topicId},
        ${profile.curriculumTrack},
        ${profile.curriculumRegion},
        ${profile.textbookPublisher},
        ${input.now},
        ${input.answerWorkPhotos?.length ? sql.json(input.answerWorkPhotos) : null}
      )
    `;

    await writeMistakeRow(sql, input);
    await writeAdaptiveSkillState(sql, input);

    await sql`
      INSERT INTO learning_events (
        id,
        user_id,
        type,
        source,
        grade,
        topic_id,
        question_id,
        duration_seconds,
        created_at
      )
      VALUES (
        ${randomUUID()},
        ${input.userId},
        ${input.correct ? "answer-correct" : "answer-wrong"},
        ${"practice"},
        ${input.question.grade},
        ${input.question.topicId},
        ${input.question.id},
        ${input.durationSeconds},
        ${input.now}
      )
    `;

    if (input.correct) {
      await maybeWritePracticeAccuracyReward(sql, {
        userId: input.userId,
        question: input.question,
        now: input.now
      });
    }
  });
}

type PersistQuestionAttemptInput = {
  userId: string;
  question: Question;
  selectedAnswer: string;
  correct: boolean;
  durationSeconds: number | null;
  now: string;
  answerWorkPhotos?: StoredMediaObjectReference[];
};

function writeSqliteMistakeRow(database: ReturnType<typeof ensureSqliteHotRowTables>, input: PersistQuestionAttemptInput) {
  if (input.correct) {
    database
      .prepare(`
        UPDATE mistake_book_items
        SET mastered = 1,
            last_attempt_at = ?
        WHERE user_id = ?
          AND question_id = ?
      `)
      .run(input.now, input.userId, input.question.id);
    return;
  }

  database
    .prepare(`
      INSERT INTO mistake_book_items (
        user_id,
        question_id,
        last_selected_answer,
        correct_answer,
        wrong_attempts,
        first_wrong_at,
        last_attempt_at,
        mastered
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, 0)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        last_selected_answer = excluded.last_selected_answer,
        correct_answer = excluded.correct_answer,
        wrong_attempts = mistake_book_items.wrong_attempts + 1,
        last_attempt_at = excluded.last_attempt_at,
        mastered = 0
    `)
    .run(
      input.userId,
      input.question.id,
      input.selectedAnswer,
      input.question.answer,
      input.now,
      input.now
    );
}

function writeSqliteAdaptiveSkillState(
  database: ReturnType<typeof ensureSqliteHotRowTables>,
  input: PersistQuestionAttemptInput
) {
  const skillId = input.question.canonicalTopicId ?? input.question.topicId;
  const initialMastery = input.correct ? 0.62 : 0.38;
  const masteryDelta = input.correct ? 0.08 : -0.12;
  const correctStreak = input.correct ? 1 : 0;
  const wrongStreak = input.correct ? 0 : 1;
  const misconceptionTags = input.correct ? [] : ["needs-review"];

  database
    .prepare(`
      INSERT INTO adaptive_skill_states (
        user_id,
        skill_id,
        p_mastery,
        attempt_count,
        correct_streak,
        wrong_streak,
        last_practiced_at,
        next_review_at,
        hint_count,
        misconception_tags,
        updated_at
      )
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET
        p_mastery = MIN(0.99, MAX(0.01, adaptive_skill_states.p_mastery + ${masteryDelta})),
        attempt_count = adaptive_skill_states.attempt_count + 1,
        correct_streak = ${input.correct ? "adaptive_skill_states.correct_streak + 1" : "0"},
        wrong_streak = ${input.correct ? "0" : "adaptive_skill_states.wrong_streak + 1"},
        last_practiced_at = excluded.last_practiced_at,
        next_review_at = excluded.next_review_at,
        misconception_tags = excluded.misconception_tags,
        updated_at = excluded.updated_at
    `)
    .run(
      input.userId,
      skillId,
      initialMastery,
      correctStreak,
      wrongStreak,
      input.now,
      nextReviewIso(input.now, input.correct),
      JSON.stringify(misconceptionTags),
      input.now
    );
}

function maybeWriteSqlitePracticeAccuracyReward(
  database: ReturnType<typeof ensureSqliteHotRowTables>,
  input: { userId: string; question: Question; now: string }
) {
  const window = dayWindow(input.now);
  const row = database
    .prepare(`
      SELECT
        COUNT(*) AS attempt_count,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct_count
      FROM practice_attempts
      WHERE user_id = ?
        AND topic_id = ?
        AND created_at >= ?
        AND created_at < ?
    `)
    .get(input.userId, input.question.topicId, window.start, window.end) as
      | { attempt_count?: unknown; correct_count?: unknown }
      | undefined;
  const attemptCount = Number(row?.attempt_count ?? 0);
  const correctCount = Number(row?.correct_count ?? 0);
  if (attemptCount < 5 || correctCount / attemptCount < 0.8) return;

  const sourceKey = `practice-accuracy:${input.userId}:${input.question.topicId}:${window.dayKey}`;
  database
    .prepare(`
      INSERT INTO reward_point_ledger (
        id,
        student_id,
        amount,
        reason,
        label_en,
        label_zh,
        source_key,
        created_at
      )
      VALUES (?, ?, 30, 'practice-accuracy', ?, ?, ?, ?)
      ON CONFLICT(source_key) DO NOTHING
    `)
    .run(
      `reward-ledger-${randomUUID()}`,
      input.userId,
      `Strong ${input.question.topic.en} practice accuracy`,
      `${input.question.topic.zh}練習準確率表現良好`,
      sourceKey,
      input.now
    );
}

function persistSqliteQuestionAttempt(input: PersistQuestionAttemptInput) {
  const profile = profileFields(input.question);

  runSqliteHotRowTransaction((database) => {
    database
      .prepare(`
        INSERT INTO practice_attempts (
          id,
          user_id,
          question_id,
          selected_answer,
          is_correct,
          duration_seconds,
          grade,
          topic_id,
          curriculum_track,
          curriculum_region,
          textbook_publisher,
          created_at,
          answer_work_photos
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        input.userId,
        input.question.id,
        input.selectedAnswer,
        sqliteBoolean(input.correct),
        input.durationSeconds,
        input.question.grade,
        input.question.topicId,
        profile.curriculumTrack,
        profile.curriculumRegion,
        profile.textbookPublisher,
        input.now,
        input.answerWorkPhotos?.length ? JSON.stringify(input.answerWorkPhotos) : null
      );

    writeSqliteMistakeRow(database, input);
    writeSqliteAdaptiveSkillState(database, input);

    database
      .prepare(`
        INSERT INTO learning_events (
          id,
          user_id,
          type,
          source,
          grade,
          topic_id,
          question_id,
          duration_seconds,
          created_at
        )
        VALUES (?, ?, ?, 'practice', ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        input.userId,
        input.correct ? "answer-correct" : "answer-wrong",
        input.question.grade,
        input.question.topicId,
        input.question.id,
        input.durationSeconds,
        input.now
      );

    if (input.correct) {
      maybeWriteSqlitePracticeAccuracyReward(database, {
        userId: input.userId,
        question: input.question,
        now: input.now
      });
    }
  });
}

export async function submitQuestionAttemptFast({
  userId,
  questionId,
  selectedAnswer,
  durationSeconds,
  curriculumTrack,
  answerWorkPhotos
}: SubmitQuestionAttemptFastInput): Promise<AttemptFeedback | null> {
  const question = await getQuestionForAttemptFromStore(
    questionId,
    curriculumTrack,
    { allowAnyCurriculumWhenScopeMissing: true }
  );
  if (!question) return null;

  const feedback = attemptFeedback(question, selectedAnswer);

  const attemptInput: PersistQuestionAttemptInput = {
    userId,
    question,
    selectedAnswer,
    correct: feedback.correct,
    durationSeconds: normalizedDurationSeconds(durationSeconds),
    now: new Date().toISOString(),
    answerWorkPhotos
  };

  if (postgresRowsEnabled()) {
    try {
      await persistQuestionAttempt(attemptInput);
    } catch {
      console.warn("Practice attempt row persistence failed; returning answer feedback without a saved attempt row.");
    }
  } else if (sqliteRowsEnabled()) {
    try {
      persistSqliteQuestionAttempt(attemptInput);
    } catch {
      console.warn("Practice attempt row persistence failed; returning answer feedback without a saved attempt row.");
    }
  }

  return feedback;
}

export const __practiceAttemptStoreTestHooks = {
  postgresStudentActivitySchemaSql() {
    return [...postgresStudentActivitySchemaStatements];
  }
};
