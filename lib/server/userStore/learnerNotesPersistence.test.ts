import assert from "node:assert/strict";
import test from "node:test";
import {
  createLearnerNotesPersistenceStore,
  learnerNoteEtag,
  learnerNoteVersionFromIfMatch,
  normalizeLearnerNoteRecords,
  type LearnerNotesPersistenceDatabase
} from "./learnerNotesPersistence";

function testStore() {
  const database: LearnerNotesPersistenceDatabase = {
    users: [
      { id: "learner-a", role: "student" },
      { id: "learner-b", role: "student" },
      { id: "teacher-a", role: "teacher" }
    ],
    lessons: [{ slug: "linear-equations", topic_id: "topic-linear" }],
    lesson_blocks: [{ id: "block-balance", lesson_slug: "linear-equations", type: "concept" }],
    learner_notes: []
  };
  let tick = 0;
  const store = createLearnerNotesPersistenceStore({
    createId: () => "fixed-id",
    now: () => new Date(Date.UTC(2026, 7, 27, 9, tick++)),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
  return { database, store };
}

const anchor = {
  type: "text-quote" as const,
  lessonSlug: "linear-equations",
  topicId: "topic-linear",
  blockId: "block-balance",
  blockType: "concept",
  selectedText: "same operation",
  surroundingText: "Apply the same operation to both sides.",
  sourceRevision: "lesson-revision-1"
};

test("private note CRUD, revisions and optimistic concurrency remain owner scoped", async () => {
  const { store } = testStore();
  const created = await store.createLearnerNote({
    ownerId: "learner-a",
    title: "Balance",
    body: "Apply the same operation to both sides.",
    tags: ["equation", "Equation", "week 1"],
    anchor
  });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;
  assert.equal(created.note.visibility, "private");
  assert.equal(created.note.version, 1);
  assert.deepEqual(created.note.tags, ["equation", "week 1"]);
  assert.equal(created.note.anchor.status, "active");

  assert.equal(await store.getLearnerNote("learner-b", created.note.id), null);
  assert.equal(await store.getLearnerNote("teacher-a", created.note.id), null);
  assert.deepEqual(await store.listLearnerNotes({ ownerId: "learner-b", query: "operation" }), { notes: [], results: [], total: 0 });

  const updated = await store.updateLearnerNote({
    ownerId: "learner-a",
    noteId: created.note.id,
    expectedVersion: 1,
    body: "Use inverse operations and verify by substitution.",
    source: "ai-accepted"
  });
  assert.equal(updated.status, "updated");
  if (updated.status !== "updated") return;
  assert.equal(updated.note.version, 2);

  const stale = await store.updateLearnerNote({
    ownerId: "learner-a",
    noteId: created.note.id,
    expectedVersion: 1,
    body: "stale overwrite"
  });
  assert.deepEqual(stale, { status: "conflict", currentVersion: 2 });
  const revisions = await store.listLearnerNoteRevisions("learner-a", created.note.id);
  assert.equal(revisions?.length, 2);
  assert.deepEqual(revisions?.map((revision) => revision.source), ["learner", "ai-accepted"]);
});

test("search filters ownership, deletion and lesson scope before ranking or excerpting", async () => {
  const { database, store } = testStore();
  const own = await store.createLearnerNote({ ownerId: "learner-a", title: "Inverse operation", body: "Subtract three from both sides.", tags: ["equation"], anchor });
  assert.equal(own.status, "created");
  database.learner_notes.push({
    ...database.learner_notes[0],
    id: "learner-note-private-b",
    owner_id: "learner-b",
    title: "Secret inverse operation",
    body: "Do not leak this neighboring note.",
    revisions: []
  });

  const search = await store.listLearnerNotes({ ownerId: "learner-a", query: "inverse", lessonSlug: "linear-equations" });
  assert.equal(search?.total, 1);
  assert.equal(search?.results?.[0]?.matchedFields.includes("title"), true);
  assert.doesNotMatch(search?.results?.[0]?.excerpt ?? "", /neighboring/u);

  if (own.status !== "created") return;
  const deleted = await store.deleteLearnerNote({ ownerId: "learner-a", noteId: own.note.id, expectedVersion: own.note.version });
  assert.equal(deleted.status, "deleted");
  assert.equal((await store.listLearnerNotes({ ownerId: "learner-a", query: "inverse" }))?.total, 0);
  assert.equal(await store.getLearnerNote("learner-a", own.note.id), null);
  assert.ok(await store.getLearnerNote("learner-a", own.note.id, { includeDeleted: true }));

  if (deleted.status !== "deleted") return;
  const erased = await store.deleteLearnerNote({ ownerId: "learner-a", noteId: own.note.id, expectedVersion: deleted.note.version, erase: true });
  assert.deepEqual(erased, { status: "erased" });
  assert.equal(await store.listLearnerNoteRevisions("learner-a", own.note.id), null);
});

test("anchors become orphaned without deleting notes when lesson content changes", async () => {
  const { database, store } = testStore();
  const created = await store.createLearnerNote({ ownerId: "learner-a", body: "Keep this note.", anchor });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;
  database.lesson_blocks = [];
  const note = await store.getLearnerNote("learner-a", created.note.id);
  assert.equal(note?.anchor.status, "orphaned");
  assert.equal(note?.body, "Keep this note.");
});

test("malicious markup remains inert plain note text and normalization never changes owner", async () => {
  const { database, store } = testStore();
  const created = await store.createLearnerNote({ ownerId: "learner-a", body: "<script>globalThis.pwned=true</script>", anchor });
  assert.equal(created.status, "created");
  assert.equal((globalThis as { pwned?: boolean }).pwned, undefined);
  const normalized = normalizeLearnerNoteRecords(database.learner_notes, "2026-08-27T10:00:00.000Z");
  assert.equal(normalized[0]?.owner_id, "learner-a");
  assert.equal(normalized[0]?.body, "<script>globalThis.pwned=true</script>");
});

test("ETag parser accepts only the exact note and positive version", () => {
  const etag = learnerNoteEtag("learner-note-1", 7);
  assert.equal(learnerNoteVersionFromIfMatch(etag, "learner-note-1"), 7);
  assert.equal(learnerNoteVersionFromIfMatch(etag, "learner-note-2"), null);
  assert.equal(learnerNoteVersionFromIfMatch("*", "learner-note-1"), null);
  assert.equal(learnerNoteVersionFromIfMatch(null, "learner-note-1"), null);
});
