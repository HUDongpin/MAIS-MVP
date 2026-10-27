import assert from "node:assert/strict";
import test from "node:test";
import { __userStoreScopedLessonTestHooks as hooks } from "@/lib/server/userStore";
import { createStudentActivityPersistenceStore } from "@/lib/server/userStore/studentActivityPersistence";

const now = "2026-10-03T17:00:00.000Z";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(track = "HK") {
  const empty = hooks.normalize({ users: [], student_profiles: [], user_settings: [] });
  const raw = hooks.compact(empty);
  raw.users = ["target", "foreign"].map(id => ({ id, role: "student", username: id, display_name: id,
    session_revision: 3, disabled_at: null, email: "", normalized_email: "", password_must_change: false,
    password_salt: "synthetic-salt", password_hash: "synthetic-hash", created_at: now, updated_at: now })) as any;
  const database = hooks.normalizeSeedOnly(raw);
  const lesson = database.lessons.find(record => database.topics.some(topic => topic.id === record.topic_id && topic.curriculum_track === track));
  assert.ok(lesson, track);
  const input = { userId: "target", slug: lesson.slug, action: "complete", expectedSessionRevision: 3,
    curriculumTrack: track, durationSeconds: 300, checklistState: { concept: true, example: true } } as any;
  return { database, lesson, input };
}
function store(database: any) {
  let nextId = 0;
  return createStudentActivityPersistenceStore({ readDatabase: async () => database,
    mutateDatabase: async (callback: any) => callback(database), now: () => new Date(now),
    afterUpdateLessonProgress: (db: any, details: any) => hooks.afterUpdate(db, details, () => `fixed-${++nextId}`)
  } as any);
}
async function equivalent(database: any, input: any) {
  const full = clone(database);
  const context = hooks.createContext(database, input); assert.ok(context);
  const baselineBefore = clone(database);
  const fullResult = await store(full).updateLessonProgress(input);
  const scopedResult = await store(context.database).updateLessonProgress(input);
  const merged = hooks.merge(context);
  assert.deepEqual(scopedResult, fullResult);
  assert.deepEqual(clone(merged), clone(full));
  assert.deepEqual(clone(database), baselineBefore, "scoped callback/merge must not mutate complete baseline");
  return merged;
}

test("cached seed-only normalization, compaction, completeness and every curriculum skill match the original", () => {
  const { database } = fixture();
  const raw = hooks.compactSeedOnly(database);
  const full = hooks.normalize(clone(raw)), optimized = hooks.normalizeSeedOnly(clone(raw));
  assert.deepEqual(clone(optimized), clone(full));
  assert.deepEqual(hooks.compactSeedOnly(optimized), hooks.compact(full));
  assert.equal(hooks.completeSeedOnly(raw), hooks.complete(raw));
  const scopes = new Map(optimized.topics.map(topic => [JSON.stringify([topic.grade, topic.curriculum_track]), topic]));
  for (const topic of scopes.values()) {
    assert.deepEqual(clone(hooks.skills(optimized, topic.grade, topic.curriculum_track)),
      clone(hooks.skills(full, topic.grade, topic.curriculum_track)));
  }
  for (const key of ["topics", "questions", "lessons", "lesson_blocks"] as const) {
    const invalid = clone(raw); (invalid[key] as any[]).push({ id: "custom", slug: "custom" });
    assert.throws(() => hooks.normalizeSeedOnly(invalid), /Invalid seed-only/);
    assert.equal(hooks.completeSeedOnly(invalid), false);
  }
  const incomplete = clone(raw); delete (incomplete as any).learning_events;
  assert.equal(hooks.completeSeedOnly(incomplete), false);
  assert.equal(hooks.complete(incomplete), false);
  assert.throws(() => { optimized.questions[0].answer = "changed"; }, TypeError);
  assert.equal(hooks.normalizeSeedOnly(raw).questions[0].answer, full.questions[0].answer);
});

test("demo reward normalization preserves full-hook parity for prefixes, legacy sources, synthesized events and repeats", async () => {
  const previousDemo = process.env.HK_MATH_ENABLE_DEMO_USER;
  process.env.HK_MATH_ENABLE_DEMO_USER = "true";
  try {
    for (const source_key of [undefined, null, "", "   "]) {
      const { database, input } = fixture();
      const raw = clone(hooks.compactSeedOnly(database));
      raw.reward_point_ledger.unshift({ id: "foreign-legacy", student_id: "foreign", amount: 17,
        reason: "teacher-award", label_en: "Synthetic legacy", label_zh: "Synthetic legacy",
        source_key, created_at: now } as any);
      raw.gamification_events.reverse();
      if (source_key === null) raw.gamification_events = [];
      const full = hooks.normalize(clone(raw)), normalized = hooks.normalizeSeedOnly(clone(raw));
      assert.deepEqual(clone(normalized), clone(full));
      assert.equal(hooks.completeSeedOnly(raw), hooks.complete(raw));
      assert.equal(hooks.normalizationMatches(raw, clone(hooks.compactSeedOnly(normalized))), true);
      const completed = await equivalent(normalized, input);
      assert.equal(completed.reward_point_ledger.find(record => record.id === "foreign-legacy")?.amount, 17);
      const repeatedRaw = clone(hooks.compact(completed));
      const repeatedFull = hooks.normalize(clone(repeatedRaw)), repeated = hooks.normalizeSeedOnly(repeatedRaw);
      assert.deepEqual(clone(repeated), clone(repeatedFull));
      assert.equal(hooks.normalizationMatches(repeatedRaw, clone(hooks.compactSeedOnly(repeated))), true);
      const result = await equivalent(repeated, input);
      assert.equal(result.reward_point_ledger.filter(record => record.student_id === "target").length, 1);
      assert.equal(result.reward_point_ledger.find(record => record.id === "foreign-legacy")?.amount, 17);
    }
  } finally {
    if (previousDemo === undefined) delete process.env.HK_MATH_ENABLE_DEMO_USER;
    else process.env.HK_MATH_ENABLE_DEMO_USER = previousDemo;
  }
});

test("reward reconciliation eligibility retains registration, unrelated normalization and key-set guards", () => {
  const { database } = fixture();
  const raw = clone(hooks.compactSeedOnly(database));
  const changes = [
    (record: any) => { delete record.users.find((user: any) => user.id === "target").password_must_change; },
    (record: any) => { record.student_profiles.push({ user_id: "target", name: "Synthetic", grade: "P1", curriculum_track: "HK" }); },
    (record: any) => { record.user_settings = null; },
    (record: any) => { delete record.assignments[0].count_towards_grade; },
    (record: any) => { record.teacher_messages.push({ id: "legacy-inbox", teacher_id: "teacher", student_id: "target", subject: "Synthetic", body: "Synthetic", created_at: now }); },
    (record: any) => { delete record.learning_events; },
    (record: any) => { delete record.reward_point_ledger; },
    (record: any) => { record.unknown_key = []; }
  ];
  for (const change of changes) {
    const previous = clone(raw); change(previous);
    const normalized = clone(hooks.compactSeedOnly(hooks.normalizeSeedOnly(clone(previous))));
    assert.equal(hooks.normalizationMatches(previous, normalized), false, String(change));
  }
});

test("complete and repeated/start/update lesson flows are equivalent across supported curricula", async () => {
  const source = fixture().database;
  const lessonTopics = new Set(source.lessons.map(record => record.topic_id));
  const tracks = new Set(source.topics.filter(record => lessonTopics.has(record.id)).map(record => record.curriculum_track));
  assert.ok(tracks.size >= 3);
  for (const track of tracks) {
    const { database, input } = fixture(track);
    const completed = await equivalent(database, input);
    assert.equal(completed.reward_point_ledger.filter(record => record.student_id === "target").length, 1);
    const repeated = await equivalent(completed, input);
    assert.equal(repeated.reward_point_ledger.length, completed.reward_point_ledger.length);
    await equivalent(repeated, { ...input, action: "start", durationSeconds: NaN, checklistState: { late: false } });
    await equivalent(database, { ...input, action: "update", durationSeconds: -1, checklistState: { concept: false } });
  }
});

test("slot provenance preserves duplicate/alias first-match rules, foreign rows and cache removal order", async () => {
  const { database, lesson, input } = fixture();
  const progress = (user_id: string, topic_id: string, lesson_slug: string, mastery: number) => ({ user_id, topic_id, lesson_slug,
    status: "in-progress" as const, mastery, started_at: now, completed_at: null, duration_seconds: 33, checklist_state: {}, updated_at: now });
  database.lesson_progress = [progress("foreign", lesson.topic_id, lesson.slug, 1),
    progress("target", lesson.topic_id, "historical-alias", 30), progress("foreign", "unrelated", "other", 2),
    progress("target", "different-topic", lesson.slug, 80), progress("target", lesson.topic_id, lesson.slug, 20)];
  database.adaptive_recommendation_cache = [
    { id: "foreign", user_id: "foreign", grade: lesson.grade, topic_id: null },
    { id: "all", user_id: "target", grade: lesson.grade, topic_id: null },
    { id: "selected", user_id: "target", grade: lesson.grade, topic_id: lesson.topic_id },
    { id: "unrelated", user_id: "target", grade: lesson.grade, topic_id: "unrelated" },
    { id: "other-grade", user_id: "target", grade: "S6", topic_id: null }
  ] as any;
  const merged = await equivalent(database, input);
  assert.equal(merged.lesson_progress[1].mastery, 100);
  assert.equal(merged.lesson_progress[3].mastery, 80);
  assert.equal(merged.lesson_progress[0], database.lesson_progress[0]);
  assert.equal(merged.lesson_progress[2], database.lesson_progress[2]);
  assert.deepEqual(merged.adaptive_recommendation_cache.map(record => (record as any).id), ["foreign", "unrelated", "other-grade"]);
});

test("inactive enrollments, empty assignment targets and first submissions retain existing assignment semantics", async () => {
  const { database, lesson, input } = fixture();
  database.class_enrollments = [{ student_id: "target", class_id: "inactive-class", status: "inactive" },
    { student_id: "foreign", class_id: "foreign-class", status: "active" }] as any;
  database.assignments = [
    { id: "empty-target", class_id: "inactive-class", content_type: "lesson", status: "active", target_id: "" },
    { id: "topic-target", class_id: "inactive-class", content_type: "lesson", status: "active", target_id: lesson.topic_id },
    { id: "inactive", class_id: "inactive-class", content_type: "lesson", status: "draft", target_id: lesson.slug },
    { id: "foreign", class_id: "foreign-class", content_type: "lesson", status: "active", target_id: lesson.slug }
  ] as any;
  database.submissions = [
    { id: "foreign-before", student_id: "foreign", assignment_id: "empty-target", status: "pending" },
    { id: "first", student_id: "target", assignment_id: "empty-target", status: "pending" },
    { id: "duplicate-first-id", student_id: "target", assignment_id: "empty-target", status: "pending" },
    { id: "topic", student_id: "target", assignment_id: "topic-target", status: "pending" },
    { id: "inactive", student_id: "target", assignment_id: "inactive", status: "pending" }
  ] as any;
  const merged = await equivalent(database, input);
  assert.equal(merged.submissions[1].status, "graded"); assert.equal(merged.submissions[3].status, "graded");
  assert.equal(merged.submissions[0], database.submissions[0]);
  assert.equal(merged.submissions[2].status, "pending"); assert.equal(merged.submissions[4].status, "pending");
});

test("full attempt evidence, unavailable historical practice IDs and global reward source collisions are retained", async () => {
  const { database, lesson, input } = fixture();
  const questions = database.lesson_blocks.filter(record => record.lesson_slug === lesson.slug).flatMap(record => record.practice_question_ids ?? []);
  database.lesson_blocks = database.lesson_blocks.map(record => record.lesson_slug === lesson.slug
    ? { ...record, practice_question_ids: [...(record.practice_question_ids ?? []), "unavailable-historical-question"] } : record);
  questions.push("unavailable-historical-question");
  database.attempts = [0, 1, 2].map(index => ({ id: `attempt-${index}`, user_id: "target", question_id: questions[index] ?? "unavailable",
    is_correct: true, selected_answer: "synthetic", duration_seconds: 120, created_at: now })) as any;
  database.attempts.push({ ...database.attempts[0], id: "foreign-attempt", user_id: "foreign", is_correct: false });
  database.reward_point_ledger = [{ id: "collision", student_id: "foreign", reason: "lesson-complete", amount: 40,
    source_key: `lesson-complete:target:${lesson.slug}`, created_at: now }] as any;
  const merged = await equivalent(database, input);
  assert.equal(merged.reward_point_ledger.length, 1); assert.equal(merged.gamification_events.length, 0);
  assert.ok(merged.adaptive_skill_state.length > 0);
});

test("scoped merge rejects foreign/unknown/read-only writes, reordered existing records and unowned deletes", () => {
  const changes = [
    (db: any) => { db.unknown_field = []; },
    (db: any) => { db.users = [{ id: "foreign" }]; },
    (db: any) => { db.attempts = []; },
    (db: any) => { db.lesson_progress.push({ user_id: "foreign" }); },
    (db: any) => { db.adaptive_skill_state.push({ user_id: "target", skill_id: "foreign-skill" }); },
    (db: any) => { db.submissions = []; },
    (db: any) => { db.reward_point_ledger[0].amount = 900; },
    (db: any) => { db.adaptive_recommendation_cache = []; }
  ];
  for (const change of changes) {
    const { database, input } = fixture();
    database.attempts = [{ id: "a", user_id: "target" }] as any;
    database.submissions = [{ id: "s", student_id: "target", assignment_id: "unrelated" }] as any;
    database.reward_point_ledger = [{ id: "r", student_id: "foreign", amount: 1 }] as any;
    database.adaptive_recommendation_cache = [{ user_id: "target", grade: "S6", topic_id: "unrelated" }] as any;
    const snapshot = clone(database), context = hooks.createContext(database, input); assert.ok(context);
    change(context.database);
    assert.throws(() => hooks.merge(context), /Unsupported scoped/);
    assert.deepEqual(clone(database), snapshot);
  }
});

test("canonical patch accepts coupled foreign activity clears and rejects unrelated field drift", () => {
  const { database, input } = fixture();
  database.learning_events = [{ id: "foreign-event", user_id: "foreign" }] as any;
  database.visualization_events = [{ id: "foreign-visualization", user_id: "foreign" }] as any;
  const before = clone(hooks.compactSeedOnly(database));
  const context = hooks.createContext(database, input); assert.ok(context);
  const merged = hooks.merge(context); merged.learning_events = []; merged.visualization_events = [];
  const after = clone(hooks.compactSeedOnly(merged));
  assert.deepEqual(hooks.patch(before as any, after as any), { learning_events: [], visualization_events: [] });
  const unrelated = clone(after); unrelated.forum_notifications.push({ id: "unexpected" } as any);
  assert.throws(() => hooks.patch(before as any, unrelated as any), /Unsupported scoped/);
});


test("full own event history preserves daily caps and partial/capped event appends", async () => {
  for (const rewardPoints of [200, 5000]) {
    const { database, input } = fixture();
    database.gamification_events = [{ id: "daily", student_id: "target", source: "teacher-award",
      source_key: "prior-daily", status: "awarded", xp: 5000, coins: 0, reward_points: rewardPoints,
      label_en: "Synthetic prior", label_zh: "Synthetic prior", created_at: now, flags: [] }] as any;
    const merged = await equivalent(database, input);
    assert.equal(merged.gamification_events[0].status, "capped");
    assert.equal(merged.gamification_events.at(-1), database.gamification_events[0]);
  }
});
