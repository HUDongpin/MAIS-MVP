import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Shared SQLite plumbing for the student-activity "hot row" fast path.
 *
 * Production (Postgres) writes every practice attempt, mistake, adaptive skill
 * state, learning event and reward ledger entry as a small dedicated row and
 * merges those rows into snapshot reads. Local/dev SQLite used to fall back to
 * rewriting the whole multi-megabyte app snapshot for each Check Answer click,
 * which cost seconds of blocking CPU per attempt. This module gives SQLite the
 * same hot-row tables plus a read overlay so the snapshot blob stays off the
 * attempt path.
 *
 * Deliberately dependency-free (no snapshot store import) so the fast path can
 * be used from modules the snapshot store itself imports.
 */

type HotRowConnection = DatabaseSync;

function defaultDatabaseDirectory() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join(tmpdir(), "hk-math-lab");
  }

  return path.join(process.cwd(), ".local");
}

let resolvedDirectory: string | null = null;
let resolvedFilePath: string | null = null;

// Resolved lazily (and memoised) rather than at module load so a process that
// points HK_MATH_DB_DIR at a scratch directory before its first store call —
// tests, one-off scripts — still lands on the same file as the snapshot store.
function resolveSqlitePaths() {
  if (resolvedDirectory && resolvedFilePath) {
    return { directory: resolvedDirectory, filePath: resolvedFilePath };
  }

  const configuredFilePath = process.env.HK_MATH_DB_PATH ? path.resolve(process.env.HK_MATH_DB_PATH) : null;
  const directory = configuredFilePath
    ? path.dirname(configuredFilePath)
    : path.resolve(process.env.HK_MATH_DB_DIR ?? defaultDatabaseDirectory());
  const filePath = configuredFilePath ?? path.join(directory, "hk-math-db.sqlite");

  resolvedDirectory = directory;
  resolvedFilePath = filePath;
  return { directory, filePath };
}

export function sqliteHotRowDatabaseDirectory() {
  return resolveSqlitePaths().directory;
}

export function sqliteHotRowDatabasePath() {
  return resolveSqlitePaths().filePath;
}

let connection: HotRowConnection | null = null;

/**
 * One process-wide handle shared with the snapshot store. A second handle would
 * contend on the same file (and on WAL writer locks) for no benefit — every
 * writer here is synchronous and short.
 */
export function openSharedSqliteConnection(): HotRowConnection {
  if (connection) return connection;

  const { directory, filePath } = resolveSqlitePaths();
  mkdirSync(directory, { recursive: true });
  const database = new DatabaseSync(filePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  connection = database;
  return database;
}

const hotRowSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS practice_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    duration_seconds INTEGER,
    grade TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    curriculum_track TEXT NOT NULL,
    curriculum_region TEXT,
    textbook_publisher TEXT,
    created_at TEXT NOT NULL,
    answer_work_photos TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_user_created_at_idx
    ON practice_attempts(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS practice_attempts_user_topic_created_at_idx
    ON practice_attempts(user_id, topic_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS mistake_book_items (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    last_selected_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    wrong_attempts INTEGER NOT NULL,
    first_wrong_at TEXT NOT NULL,
    last_attempt_at TEXT NOT NULL,
    mastered INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, question_id)
  )`,
  `CREATE INDEX IF NOT EXISTS mistake_book_items_user_last_attempt_idx
    ON mistake_book_items(user_id, mastered, last_attempt_at DESC)`,
  `CREATE TABLE IF NOT EXISTS adaptive_skill_states (
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    p_mastery REAL NOT NULL DEFAULT 0.5,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    correct_streak INTEGER NOT NULL DEFAULT 0,
    wrong_streak INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TEXT,
    next_review_at TEXT,
    hint_count INTEGER NOT NULL DEFAULT 0,
    misconception_tags TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
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
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS learning_events_user_created_at_idx
    ON learning_events(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS learning_event_clears (
    user_id TEXT PRIMARY KEY,
    cleared_at TEXT NOT NULL
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
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reward_point_ledger_student_created_at_idx
    ON reward_point_ledger(student_id, created_at DESC)`,
  // Monotonic counter bumped by every hot write. Snapshot readers use it to skip
  // rebuilding the merged view when nothing changed since the last read.
  `CREATE TABLE IF NOT EXISTS student_activity_hot_row_state (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL
  )`
];

let hotTablesReady = false;

export function ensureSqliteHotRowTables(): HotRowConnection {
  const database = openSharedSqliteConnection();
  if (hotTablesReady) return database;

  for (const statement of hotRowSchemaStatements) {
    database.exec(statement);
  }
  hotTablesReady = true;
  return database;
}

/** SQLite mode = anything other than an explicit `postgres` storage provider. */
export function sqliteHotRowsMode() {
  return process.env.HK_MATH_STORAGE_PROVIDER?.trim().toLowerCase() !== "postgres";
}

function envFlagEnabled(value: string | undefined) {
  const configured = value?.trim().toLowerCase();
  return configured === "true" || configured === "1" || configured === "yes" || configured === "on";
}

/**
 * Escape hatch: writes can be switched off without losing already-written rows,
 * because the read overlay stays on for as long as the process is in SQLite
 * mode and the next snapshot mutation absorbs whatever is already there.
 */
export function sqliteHotRowWritesEnabled() {
  if (!sqliteHotRowsMode()) return false;
  return !envFlagEnabled(process.env.HK_MATH_DISABLE_SQLITE_HOT_ROWS);
}

function bumpHotRowVersion(database: HotRowConnection) {
  database
    .prepare(`
      INSERT INTO student_activity_hot_row_state (id, version)
      VALUES ('primary', 1)
      ON CONFLICT(id) DO UPDATE SET version = student_activity_hot_row_state.version + 1
    `)
    .run();
}

export function sqliteHotRowVersion() {
  const database = ensureSqliteHotRowTables();
  const row = database
    .prepare("SELECT version FROM student_activity_hot_row_state WHERE id = 'primary'")
    .get() as { version?: unknown } | undefined;
  return typeof row?.version === "number" ? row.version : Number(row?.version ?? 0) || 0;
}

/**
 * Runs `write` inside a single SQLite transaction and bumps the hot-row version
 * so snapshot readers know to re-merge. `better-sqlite3`-style synchronous
 * writes are fine here: every statement touches a handful of tiny rows.
 */
export function runSqliteHotRowTransaction<T>(write: (database: HotRowConnection) => T): T {
  const database = ensureSqliteHotRowTables();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = write(database);
    bumpHotRowVersion(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // A failed rollback means the transaction was already closed; the original
      // error below is the one worth surfacing.
    }
    throw error;
  }
}

export function sqliteBoolean(value: boolean) {
  return value ? 1 : 0;
}

function booleanFromSqlite(value: unknown) {
  return value === 1 || value === true || value === "1";
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

type OverlayAttemptRecord = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
};

type OverlayMistakeRecord = {
  user_id: string;
  question_id: string;
  last_selected_answer: string;
  correct_answer: string;
  wrong_attempts: number;
  first_wrong_at: string;
  last_attempt_at: string;
  mastered: boolean;
};

type OverlayAdaptiveSkillStateRecord = {
  user_id: string;
  skill_id: string;
  p_mastery: number;
  attempt_count: number;
  correct_streak: number;
  wrong_streak: number;
  last_practiced_at: string | null;
  next_review_at: string | null;
  hint_count: number;
  misconception_tags: string[];
  updated_at: string;
};

type OverlayLearningEventRecord = {
  id: string;
  user_id: string;
  type: string;
  source: string;
  grade: string;
  topic_id: string;
  question_id?: string;
  duration_seconds?: number;
  created_at: string;
};

type OverlayLearningEventClearRecord = {
  user_id: string;
  cleared_at: string;
};

type OverlayVisualizationEventRecord = {
  id: string;
  user_id: string;
  topic_id: string;
  source: string;
  created_at: string;
};

type OverlayRewardPointLedgerRecord = {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  label_en: string;
  label_zh: string;
  note?: string;
  awarded_by?: string;
  redemption_id?: string;
  source_key?: string;
  created_at: string;
};

export type SqliteHotOverlayDatabase = {
  attempts: OverlayAttemptRecord[];
  mistakes: OverlayMistakeRecord[];
  adaptive_skill_state: OverlayAdaptiveSkillStateRecord[];
  learning_events: OverlayLearningEventRecord[];
  learning_event_clears: OverlayLearningEventClearRecord[];
  visualization_events: OverlayVisualizationEventRecord[];
  reward_point_ledger: OverlayRewardPointLedgerRecord[];
  questions?: Array<{
    id: string;
    grade: string;
    topic_id: string;
    curriculum_track: string;
    curriculum_region?: string | null;
    textbook_publisher?: string | null;
  }>;
};

type HotRowSnapshot = {
  attempts: OverlayAttemptRecord[];
  mistakes: OverlayMistakeRecord[];
  adaptiveSkillStates: OverlayAdaptiveSkillStateRecord[];
  learningEvents: OverlayLearningEventRecord[];
  learningEventClears: OverlayLearningEventClearRecord[];
  rewardLedger: OverlayRewardPointLedgerRecord[];
};

function readHotRowSnapshot(): HotRowSnapshot {
  const database = ensureSqliteHotRowTables();

  const attempts = (database
    .prepare("SELECT id, user_id, question_id, selected_answer, is_correct, duration_seconds, created_at, answer_work_photos FROM practice_attempts")
    .all() as Array<Record<string, unknown>>).map((row) => {
      const photos = parseJsonArray<{ objectKey: string }>(row.answer_work_photos);
      const attempt: OverlayAttemptRecord & { answer_work_photos?: { objectKey: string }[] } = {
        id: String(row.id),
        user_id: String(row.user_id),
        question_id: String(row.question_id),
        selected_answer: String(row.selected_answer),
        is_correct: booleanFromSqlite(row.is_correct),
        duration_seconds: optionalNumber(row.duration_seconds) ?? null,
        created_at: String(row.created_at)
      };
      if (photos.length) attempt.answer_work_photos = photos;
      return attempt;
    });

  const mistakes = (database
    .prepare("SELECT user_id, question_id, last_selected_answer, correct_answer, wrong_attempts, first_wrong_at, last_attempt_at, mastered FROM mistake_book_items")
    .all() as Array<Record<string, unknown>>).map((row) => ({
      user_id: String(row.user_id),
      question_id: String(row.question_id),
      last_selected_answer: String(row.last_selected_answer),
      correct_answer: String(row.correct_answer),
      wrong_attempts: optionalNumber(row.wrong_attempts) ?? 0,
      first_wrong_at: String(row.first_wrong_at),
      last_attempt_at: String(row.last_attempt_at),
      mastered: booleanFromSqlite(row.mastered)
    }));

  const adaptiveSkillStates = (database
    .prepare("SELECT user_id, skill_id, p_mastery, attempt_count, correct_streak, wrong_streak, last_practiced_at, next_review_at, hint_count, misconception_tags, updated_at FROM adaptive_skill_states")
    .all() as Array<Record<string, unknown>>).map((row) => ({
      user_id: String(row.user_id),
      skill_id: String(row.skill_id),
      p_mastery: optionalNumber(row.p_mastery) ?? 0.5,
      attempt_count: optionalNumber(row.attempt_count) ?? 0,
      correct_streak: optionalNumber(row.correct_streak) ?? 0,
      wrong_streak: optionalNumber(row.wrong_streak) ?? 0,
      last_practiced_at: optionalString(row.last_practiced_at) ?? null,
      next_review_at: optionalString(row.next_review_at) ?? null,
      hint_count: optionalNumber(row.hint_count) ?? 0,
      misconception_tags: parseJsonArray<string>(row.misconception_tags),
      updated_at: String(row.updated_at)
    }));

  const learningEvents = (database
    .prepare("SELECT id, user_id, type, source, grade, topic_id, question_id, duration_seconds, created_at FROM learning_events")
    .all() as Array<Record<string, unknown>>).map((row) => {
      const event: OverlayLearningEventRecord = {
        id: String(row.id),
        user_id: String(row.user_id),
        type: String(row.type),
        source: String(row.source),
        grade: String(row.grade),
        topic_id: String(row.topic_id),
        created_at: String(row.created_at)
      };
      const questionId = optionalString(row.question_id);
      if (questionId) event.question_id = questionId;
      const durationSeconds = optionalNumber(row.duration_seconds);
      if (typeof durationSeconds === "number") event.duration_seconds = durationSeconds;
      return event;
    });

  const learningEventClears = (database
    .prepare("SELECT user_id, cleared_at FROM learning_event_clears")
    .all() as Array<Record<string, unknown>>).map((row) => ({
      user_id: String(row.user_id),
      cleared_at: String(row.cleared_at)
    }));

  const rewardLedger = (database
    .prepare("SELECT id, student_id, amount, reason, label_en, label_zh, note, awarded_by, redemption_id, source_key, created_at FROM reward_point_ledger")
    .all() as Array<Record<string, unknown>>).map((row) => {
      const entry: OverlayRewardPointLedgerRecord = {
        id: String(row.id),
        student_id: String(row.student_id),
        amount: optionalNumber(row.amount) ?? 0,
        reason: String(row.reason),
        label_en: String(row.label_en),
        label_zh: String(row.label_zh),
        created_at: String(row.created_at)
      };
      const note = optionalString(row.note);
      if (note) entry.note = note;
      const awardedBy = optionalString(row.awarded_by);
      if (awardedBy) entry.awarded_by = awardedBy;
      const redemptionId = optionalString(row.redemption_id);
      if (redemptionId) entry.redemption_id = redemptionId;
      const sourceKey = optionalString(row.source_key);
      if (sourceKey) entry.source_key = sourceKey;
      return entry;
    });

  return { attempts, mistakes, adaptiveSkillStates, learningEvents, learningEventClears, rewardLedger };
}

function mergeById<T>(snapshotRows: T[], hotRows: T[], keyFor: (row: T) => string) {
  if (!hotRows.length) return snapshotRows;
  const merged = new Map<string, T>();
  snapshotRows.forEach((row) => merged.set(keyFor(row), row));
  hotRows.forEach((row) => merged.set(keyFor(row), row));
  return Array.from(merged.values());
}

function mergePreferringNewer<T>(
  snapshotRows: T[],
  hotRows: T[],
  keyFor: (row: T) => string,
  timestampFor: (row: T) => string
) {
  if (!hotRows.length) return snapshotRows;
  const merged = new Map<string, T>();
  snapshotRows.forEach((row) => merged.set(keyFor(row), row));
  hotRows.forEach((row) => {
    const key = keyFor(row);
    const existing = merged.get(key);
    // Ties keep the snapshot copy: snapshot mutations (mark-mastered, teacher
    // edits) are mirrored into the hot tables, so an equal timestamp means the
    // two sides already agree.
    if (!existing || timestampFor(row) > timestampFor(existing)) merged.set(key, row);
  });
  return Array.from(merged.values());
}

function clearCutoffsFor(clears: OverlayLearningEventClearRecord[]) {
  const cutoffs = new Map<string, number>();
  clears.forEach((clear) => {
    const clearedAtMs = Date.parse(clear.cleared_at);
    if (!Number.isFinite(clearedAtMs)) return;
    const existing = cutoffs.get(clear.user_id);
    if (existing === undefined || clearedAtMs > existing) cutoffs.set(clear.user_id, clearedAtMs);
  });
  return cutoffs;
}

function dedupeRewardLedger(entries: OverlayRewardPointLedgerRecord[]) {
  const seenSourceKeys = new Set<string>();
  return entries.filter((entry) => {
    if (!entry.source_key) return true;
    if (seenSourceKeys.has(entry.source_key)) return false;
    seenSourceKeys.add(entry.source_key);
    return true;
  });
}

type OverlayCacheEntry = { version: number; result: unknown };
const overlayCache = new WeakMap<object, OverlayCacheEntry>();

function buildOverlay<T extends SqliteHotOverlayDatabase>(database: T, hot: HotRowSnapshot): T {
  const learningEventClears = mergePreferringNewer(
    database.learning_event_clears ?? [],
    hot.learningEventClears,
    (clear) => clear.user_id,
    (clear) => clear.cleared_at
  );
  const cutoffs = clearCutoffsFor(learningEventClears);
  const afterClearCutoff = (userId: string, createdAt: string) => {
    const cutoff = cutoffs.get(userId);
    if (cutoff === undefined) return true;
    const createdAtMs = Date.parse(createdAt);
    return !Number.isFinite(createdAtMs) || createdAtMs > cutoff;
  };
  const mergedLearningEvents = mergeById(
    database.learning_events ?? [],
    hot.learningEvents,
    (event) => event.id
  ).filter((event) => afterClearCutoff(event.user_id, event.created_at));

  // The snapshot writer mirrored every `visualization-*` learning event into
  // `visualization_events`; the hot path only inserts the learning event, so the
  // mirror is derived here instead. Same derivation (and same record shape) as
  // the `hot_visualization_event_records` CTE production Postgres uses.
  const hotVisualizationEvents: OverlayVisualizationEventRecord[] = hot.learningEvents
    .filter((event) => event.type.startsWith("visualization-"))
    .map((event) => ({
      id: event.id,
      user_id: event.user_id,
      topic_id: event.topic_id,
      source: event.source,
      created_at: event.created_at
    }));

  return {
    ...database,
    attempts: mergeById(database.attempts ?? [], hot.attempts, (attempt) => attempt.id),
    mistakes: mergePreferringNewer(
      database.mistakes ?? [],
      hot.mistakes,
      (mistake) => `${mistake.user_id} ${mistake.question_id}`,
      (mistake) => mistake.last_attempt_at
    ),
    adaptive_skill_state: mergePreferringNewer(
      database.adaptive_skill_state ?? [],
      hot.adaptiveSkillStates,
      (state) => `${state.user_id} ${state.skill_id}`,
      (state) => state.updated_at
    ),
    learning_events: mergedLearningEvents,
    learning_event_clears: learningEventClears,
    visualization_events: mergeById(
      database.visualization_events ?? [],
      hotVisualizationEvents,
      (event) => event.id
    ).filter((event) => afterClearCutoff(event.user_id, event.created_at)),
    reward_point_ledger: dedupeRewardLedger(
      mergeById(database.reward_point_ledger ?? [], hot.rewardLedger, (entry) => entry.id)
    )
  };
}

/**
 * Merges the SQLite hot rows into a parsed snapshot so legacy readers (mistake
 * book, dashboard, progress, analytics, adaptive learning) see attempts that
 * never touched the blob.
 *
 * Always returns a NEW object when there is anything to merge — the cached
 * snapshot parse must never be mutated in place. Idempotent by construction:
 * once a snapshot mutation writes the merged view back, the same rows exist on
 * both sides and the key-based merge collapses them to one copy.
 */
export function overlaySqliteHotRows<T extends SqliteHotOverlayDatabase>(database: T): T {
  if (!sqliteHotRowsMode()) return database;

  let version: number;
  try {
    version = sqliteHotRowVersion();
  } catch {
    return database;
  }
  if (version === 0) return database;

  const cached = overlayCache.get(database);
  if (cached && cached.version === version) return cached.result as T;

  let hot: HotRowSnapshot;
  try {
    hot = readHotRowSnapshot();
  } catch {
    return database;
  }

  const nothingToMerge =
    !hot.attempts.length &&
    !hot.mistakes.length &&
    !hot.adaptiveSkillStates.length &&
    !hot.learningEvents.length &&
    !hot.learningEventClears.length &&
    !hot.rewardLedger.length;
  if (nothingToMerge) return database;

  const result = buildOverlay(database, hot);
  overlayCache.set(database, { version, result });
  return result;
}

// ---------------------------------------------------------------------------
// One-time snapshot -> hot backfill
// ---------------------------------------------------------------------------

const snapshotBackfillMarkerId = "snapshot-backfill";
// Bump when the backfill has new work to do on databases that already ran it.
// 1: seed mistakes / adaptive states / today's attempts and reward ledger.
// 2: drop bare-topic adaptive rows written before the skill-id key-space fix.
const snapshotBackfillRevision = 2;
let snapshotBackfillChecked = false;

function startOfUtcDayIso(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Mistake and adaptive rows are keyed by (user, question) / (user, skill) rather
 * than by a generated id, so the hot-path upserts only ever see the counters
 * that already live in the hot table. A row that exists only in the snapshot —
 * i.e. everything recorded before the hot path shipped — would therefore be
 * treated as brand new: a correct answer could not master it (the UPDATE matches
 * nothing) and a wrong answer would restart `wrong_attempts` at 1 and win the
 * overlay on the newer `last_attempt_at`, erasing the accumulated history.
 *
 * Copying those two sections across once, before the first overlay, puts every
 * counter-keyed row in the hot table so the ordinary upserts behave correctly.
 * `INSERT OR IGNORE` throughout: a hot row that already exists is newer than the
 * snapshot copy by construction and must never be overwritten.
 *
 * Today's practice attempts and source-keyed reward ledger rows come along too,
 * so the practice-accuracy day-window count and its `source_key` uniqueness stay
 * correct across the transition day.
 */
export function backfillSqliteHotRowsFromSnapshot(database: SqliteHotOverlayDatabase) {
  if (snapshotBackfillChecked || !sqliteHotRowsMode()) return false;

  try {
    const handle = ensureSqliteHotRowTables();
    const marker = handle
      .prepare("SELECT version FROM student_activity_hot_row_state WHERE id = ?")
      .get(snapshotBackfillMarkerId) as { version?: unknown } | undefined;
    if (Number(marker?.version ?? 0) >= snapshotBackfillRevision) {
      snapshotBackfillChecked = true;
      return false;
    }
  } catch {
    return false;
  }

  const dayStart = startOfUtcDayIso();
  const todaysAttempts = (database.attempts ?? []).filter((attempt) => attempt.created_at >= dayStart);
  const attemptQuestionIds = new Set(todaysAttempts.map((attempt) => attempt.question_id));
  const questionById = new Map(
    (database.questions ?? [])
      .filter((question) => attemptQuestionIds.has(question.id))
      .map((question) => [question.id, question])
  );

  try {
    runSqliteHotRowTransaction((handle) => {
      const insertMistake = handle.prepare(`
        INSERT OR IGNORE INTO mistake_book_items (
          user_id, question_id, last_selected_answer, correct_answer,
          wrong_attempts, first_wrong_at, last_attempt_at, mastered
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (database.mistakes ?? []).forEach((mistake) => {
        insertMistake.run(
          mistake.user_id,
          mistake.question_id,
          mistake.last_selected_answer,
          mistake.correct_answer,
          Math.max(0, Math.round(mistake.wrong_attempts ?? 0)),
          mistake.first_wrong_at,
          mistake.last_attempt_at,
          sqliteBoolean(Boolean(mistake.mastered))
        );
      });

      // Bare-topic skill ids from the first cut of the hot path. The snapshot
      // keys adaptive rows `${topicId}:${stage}`, so those rows were a second,
      // phantom key space in the merged view.
      handle.prepare("DELETE FROM adaptive_skill_states WHERE skill_id NOT LIKE '%:%'").run();

      const insertAdaptive = handle.prepare(`
        INSERT OR IGNORE INTO adaptive_skill_states (
          user_id, skill_id, p_mastery, attempt_count, correct_streak, wrong_streak,
          last_practiced_at, next_review_at, hint_count, misconception_tags, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (database.adaptive_skill_state ?? []).forEach((state) => {
        insertAdaptive.run(
          state.user_id,
          state.skill_id,
          state.p_mastery,
          Math.max(0, Math.round(state.attempt_count ?? 0)),
          Math.max(0, Math.round(state.correct_streak ?? 0)),
          Math.max(0, Math.round(state.wrong_streak ?? 0)),
          state.last_practiced_at,
          state.next_review_at,
          Math.max(0, Math.round(state.hint_count ?? 0)),
          JSON.stringify(state.misconception_tags ?? []),
          state.updated_at
        );
      });

      const insertAttempt = handle.prepare(`
        INSERT OR IGNORE INTO practice_attempts (
          id, user_id, question_id, selected_answer, is_correct, duration_seconds,
          grade, topic_id, curriculum_track, curriculum_region, textbook_publisher,
          created_at, answer_work_photos
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `);
      todaysAttempts.forEach((attempt) => {
        // grade / topic / track are NOT NULL on the hot table and are not on the
        // snapshot attempt row, so an attempt whose question is gone is skipped.
        const question = questionById.get(attempt.question_id);
        if (!question) return;
        insertAttempt.run(
          attempt.id,
          attempt.user_id,
          attempt.question_id,
          attempt.selected_answer,
          sqliteBoolean(Boolean(attempt.is_correct)),
          attempt.duration_seconds ?? null,
          question.grade,
          question.topic_id,
          question.curriculum_track,
          question.curriculum_region ?? null,
          question.textbook_publisher ?? null,
          attempt.created_at
        );
      });

      const insertLedger = handle.prepare(`
        INSERT OR IGNORE INTO reward_point_ledger (
          id, student_id, amount, reason, label_en, label_zh, note, awarded_by,
          redemption_id, source_key, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (database.reward_point_ledger ?? [])
        .filter((entry) => entry.source_key && entry.created_at >= dayStart)
        .forEach((entry) => {
          insertLedger.run(
            entry.id,
            entry.student_id,
            Math.round(entry.amount ?? 0),
            entry.reason,
            entry.label_en,
            entry.label_zh,
            entry.note ?? null,
            entry.awarded_by ?? null,
            entry.redemption_id ?? null,
            entry.source_key ?? null,
            entry.created_at
          );
        });

      handle
        .prepare(`
          INSERT INTO student_activity_hot_row_state (id, version)
          VALUES (?, ?)
          ON CONFLICT(id) DO UPDATE SET version = excluded.version
        `)
        .run(snapshotBackfillMarkerId, snapshotBackfillRevision);
    });
  } catch (error) {
    console.warn("SQLite hot-row snapshot backfill failed; retrying on the next snapshot read.", error);
    return false;
  }

  snapshotBackfillChecked = true;
  return true;
}

// ---------------------------------------------------------------------------
// Mirrors for snapshot mutations that delete or update overlaid domains
// ---------------------------------------------------------------------------

/**
 * Snapshot mutators that remove or master mistake rows must remove/update the
 * hot copy too, otherwise the overlay resurrects the deleted row on the next
 * read. Each mirror is a no-op when the hot row does not exist.
 */
export function deleteSqliteHotMistake(userId: string, questionId: string) {
  if (!sqliteHotRowsMode()) return;
  runSqliteHotRowTransaction((database) => {
    database
      .prepare("DELETE FROM mistake_book_items WHERE user_id = ? AND question_id = ?")
      .run(userId, questionId);
  });
}

export function masterSqliteHotMistake(userId: string, questionId: string, masteredAt: string) {
  if (!sqliteHotRowsMode()) return;
  runSqliteHotRowTransaction((database) => {
    database
      .prepare("UPDATE mistake_book_items SET mastered = 1, last_attempt_at = ? WHERE user_id = ? AND question_id = ?")
      .run(masteredAt, userId, questionId);
  });
}

export function clearSqliteHotMistakesForUser(userId: string) {
  if (!sqliteHotRowsMode()) return;
  runSqliteHotRowTransaction((database) => {
    database.prepare("DELETE FROM mistake_book_items WHERE user_id = ?").run(userId);
  });
}

export function clearSqliteHotLearningEventsForUser(userId: string, clearedAt: string) {
  if (!sqliteHotRowsMode()) return;
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
}

export const __sqliteHotRowsTestHooks = {
  schemaSql() {
    return [...hotRowSchemaStatements];
  },
  snapshotBackfillRevision,
  resetForTests() {
    connection?.close();
    connection = null;
    resolvedDirectory = null;
    resolvedFilePath = null;
    hotTablesReady = false;
    snapshotBackfillChecked = false;
  }
};
