import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after } from "node:test";

// The store resolves its database directory once, at module load, so the env var
// has to be set before the first `import("./userStore")` anywhere in this file.
const databaseDirectory = mkdtempSync(path.join(tmpdir(), "mais-snapshot-compaction-"));
process.env.HK_MATH_DB_DIR = databaseDirectory;
const databasePath = path.join(databaseDirectory, "hk-math-db.sqlite");

after(() => {
  rmSync(databaseDirectory, { recursive: true, force: true });
});

type StoredSnapshot = {
  payload: Record<string, unknown[]>;
  bytes: number;
  updatedAt: string;
};

function readStoredSnapshot(): StoredSnapshot {
  const storage = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = storage
      .prepare("SELECT payload, length(payload) AS bytes, updated_at FROM app_state WHERE id = 'primary'")
      .get() as { payload: string; bytes: number; updated_at: string };
    return { payload: JSON.parse(row.payload), bytes: Number(row.bytes), updatedAt: String(row.updated_at) };
  } finally {
    storage.close();
  }
}

// Writing straight to the row (with a fresh updated_at, which is what the store's
// read cache validates against) is how a snapshot written by an older build — or
// by a concurrently running process — reaches the load path.
function writeStoredSnapshot(payload: unknown) {
  const storage = new DatabaseSync(databasePath);
  try {
    storage
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 'primary'")
      .run(JSON.stringify(payload), new Date(Date.now() + 1000).toISOString());
  } finally {
    storage.close();
  }
}

const storeModule = import("./userStore");
const seedQuestionsModule = import("@/data/questions");

test("a snapshot written by the store carries no curriculum that data/ already ships", async () => {
  const store = await storeModule;
  // Any authenticated read initialises and persists the snapshot.
  await store.getDashboardData("student-peter", "S1");

  const { payload } = readStoredSnapshot();
  const { questions: seedQuestions } = await seedQuestionsModule;
  const seedQuestionIds = new Set(seedQuestions.map((question) => question.id));
  const storedQuestions = (payload.questions ?? []) as { id: string }[];

  assert.ok(seedQuestionIds.size > 0, "the static question bank should not be empty");
  assert.deepEqual(
    storedQuestions.filter((question) => seedQuestionIds.has(question.id)).map((question) => question.id),
    [],
    "seed-bank questions must not be duplicated into the persisted snapshot"
  );
  for (const collection of ["topics", "lessons", "lesson_blocks"]) {
    assert.deepEqual(payload[collection] ?? [], [], `${collection} should be rehydrated from data/, not persisted`);
  }
});

test("seed curriculum is still readable through the public API after being stripped", async () => {
  const store = await storeModule;
  const lesson = await store.getLessonBySlug(null, "p1-counting-number-bonds");

  assert.ok(lesson, "a seed lesson must resolve even though it is absent from the stored payload");
  assert.ok(Array.isArray(lesson.blocks) && lesson.blocks.length > 0, "seed lesson blocks must rehydrate");
});

test("a legacy fat snapshot is compacted on load without dropping non-seed records", async () => {
  const store = await storeModule;
  const { questions: seedQuestions } = await seedQuestionsModule;
  const before = readStoredSnapshot();

  // Rebuild the pre-compaction shape: the seed bank inlined alongside a record
  // that has no static source (a teacher-authored question, or a generated pack
  // that data/ no longer exports — the live database holds 1,596 of these).
  const authoredQuestion = {
    id: "teacher-authored-compaction-probe",
    curriculum_track: "HK",
    curriculum_region: "HK",
    canonical_topic_id: "integers",
    topic_id: "integers",
    grade: "S1",
    difficulty: "Low",
    type: "short-answer",
    prompt_en: "Authored probe",
    prompt_zh: "Authored probe",
    answer: "1"
  };
  const inlinedSeedQuestions = seedQuestions.slice(0, 50).map((question) => ({
    id: question.id,
    curriculum_track: "HK",
    curriculum_region: "HK",
    canonical_topic_id: question.topicId,
    topic_id: question.topicId,
    grade: question.grade,
    difficulty: question.difficulty,
    type: question.type,
    prompt_en: "stale copy",
    prompt_zh: "stale copy",
    answer: question.answer
  }));

  writeStoredSnapshot({
    ...before.payload,
    questions: [...(before.payload.questions ?? []), ...inlinedSeedQuestions, authoredQuestion]
  });

  // Compare the curriculum collections, not the whole payload: an authenticated
  // read also seeds this user's lesson_progress rows, which moves total bytes for
  // reasons that have nothing to do with compaction.
  const curriculumBytes = (snapshot: StoredSnapshot) =>
    ["questions", "topics", "lessons", "lesson_blocks"]
      .reduce((total, key) => total + JSON.stringify(snapshot.payload[key] ?? []).length, 0);

  const fat = readStoredSnapshot();
  assert.ok(curriculumBytes(fat) > curriculumBytes(before), "the legacy snapshot should carry more curriculum");

  // Loading it must rewrite it slim.
  await store.getDashboardData("student-peter", "S1");

  const after = readStoredSnapshot();
  const storedIds = new Set(((after.payload.questions ?? []) as { id: string }[]).map((question) => question.id));
  const seedQuestionIds = new Set(seedQuestions.map((question) => question.id));

  assert.ok(
    storedIds.has(authoredQuestion.id),
    "a question with no static source must survive compaction — the snapshot is its only home"
  );
  assert.deepEqual(
    [...storedIds].filter((id) => seedQuestionIds.has(id)),
    [],
    "the inlined seed copies must be stripped back out on load"
  );
  assert.ok(
    curriculumBytes(after) < curriculumBytes(fat),
    "loading a legacy snapshot must rewrite it with the seed curriculum stripped"
  );
  assert.notEqual(after.updatedAt, fat.updatedAt, "the compacted form must actually be persisted");
});
