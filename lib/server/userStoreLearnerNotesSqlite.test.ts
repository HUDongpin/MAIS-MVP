import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("learner notes round-trip through the configured MAIS SQLite snapshot", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-learner-notes-"));

  try {
    Object.assign(process.env, { NODE_ENV: "test" });
    process.env.HK_MATH_ENABLE_DEMO_USER = "true";
    process.env.HK_MATH_DB_DIR = dbDir;
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;

    const store = await import("./userStore");
    const roadmap = await store.getRoadmapData(null, "P1", "HK");
    const lesson = roadmap.lessons[0];
    assert.ok(lesson, "seeded roadmap should provide a stable lesson anchor");

    const created = await store.createLearnerNote({
      ownerId: "student-peter",
      title: "SQLite note",
      body: "A private persisted note.",
      tags: ["persistence"],
      anchor: {
        type: "lesson",
        lessonSlug: lesson.slug,
        topicId: lesson.topicId
      }
    });
    assert.equal(created.status, "created");
    if (created.status !== "created") return;

    await stat(path.join(dbDir, "hk-math-db.sqlite"));
    const listed = await store.listLearnerNotes({ ownerId: "student-peter", lessonSlug: lesson.slug });
    assert.equal(listed?.total, 1);
    assert.equal(listed?.notes[0]?.body, "A private persisted note.");

    const updated = await store.updateLearnerNote({
      ownerId: "student-peter",
      noteId: created.note.id,
      expectedVersion: created.note.version,
      body: "A private persisted note, updated.",
      source: "learner"
    });
    assert.equal(updated.status, "updated");
    if (updated.status !== "updated") return;

    const revisions = await store.listLearnerNoteRevisions("student-peter", created.note.id);
    assert.deepEqual(revisions?.map((revision) => revision.version), [1, 2]);

    const erased = await store.deleteLearnerNote({
      ownerId: "student-peter",
      noteId: created.note.id,
      expectedVersion: updated.note.version,
      erase: true
    });
    assert.equal(erased.status, "erased");
    assert.equal((await store.listLearnerNotes({ ownerId: "student-peter" }))?.total, 0);
  } finally {
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
