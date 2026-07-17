import { randomUUID } from "crypto";
import postgres from "postgres";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import { getQuestionForAttemptFromStore } from "@/lib/server/questionStore";
import type { AttemptFeedback, CurriculumProfile, CurriculumTrack, LearningAnalyticsEvent, Question } from "@/types";

type CurriculumScope = CurriculumTrack | CurriculumProfile | undefined | null;
type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

type SubmitQuestionAttemptFastInput = {
  userId: string;
  questionId: string;
  selectedAnswer: string;
  durationSeconds?: number;
  curriculumTrack?: CurriculumScope;
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

export function practiceAttemptFastPathPersistsRows() {
  return postgresRowsEnabled();
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

export async function appendLearningEventsFast(
  userId: string,
  events: LearningAnalyticsEvent[]
): Promise<number | null> {
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
        created_at
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
        ${input.now}
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

export async function submitQuestionAttemptFast({
  userId,
  questionId,
  selectedAnswer,
  durationSeconds,
  curriculumTrack
}: SubmitQuestionAttemptFastInput): Promise<AttemptFeedback | null> {
  const question = await getQuestionForAttemptFromStore(
    questionId,
    curriculumTrack,
    { allowAnyCurriculumWhenScopeMissing: true }
  );
  if (!question) return null;

  const feedback = attemptFeedback(question, selectedAnswer);

  if (postgresRowsEnabled()) {
    try {
      await persistQuestionAttempt({
        userId,
        question,
        selectedAnswer,
        correct: feedback.correct,
        durationSeconds: normalizedDurationSeconds(durationSeconds),
        now: new Date().toISOString()
      });
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
