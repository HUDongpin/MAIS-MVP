import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createLearnerProfilePersistenceStore,
  type LearnerProfilePersistenceDatabase
} from "@/lib/server/userStore/learnerProfilePersistence";

function createTestStore(database: LearnerProfilePersistenceDatabase) {
  return createLearnerProfilePersistenceStore({
    now: () => new Date("2026-06-20T10:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("learner profile persistence owns setup answer and status normalization instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/learnerProfilePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/learnerProfilePersistence.ts"), "utf8");

  const normalizeLearnerStartSetupAnswers = helpers.normalizeLearnerStartSetupAnswers;
  const normalizeLearnerProfileStatus = helpers.normalizeLearnerProfileStatus;

  for (const [name, helper] of Object.entries({
    normalizeLearnerStartSetupAnswers,
    normalizeLearnerProfileStatus
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by learnerProfilePersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
    assert.doesNotMatch(rootSource, new RegExp(`${name} as ${name}FromLearnerProfilePersistence`));
  }

  assert.doesNotMatch(rootSource, /const validLearnerProfileStatuses\b/);
  assert.doesNotMatch(rootSource, /const validLearnerGoals\b/);
  assert.doesNotMatch(rootSource, /const validLearnerChallengeStarts\b/);
  assert.doesNotMatch(rootSource, /const validLearnerHelpStyles\b/);
  assert.doesNotMatch(rootSource, /function normalizeLearnerStartSetupAnswers\b/);
  assert.doesNotMatch(rootSource, /const learnerStartSetupVersion\b/);

  assert.deepEqual((normalizeLearnerStartSetupAnswers as (value: unknown) => unknown)({
    goal: "homework",
    challenge: "hard",
    help: "example"
  }), {
    goal: "homework",
    challenge: "hard",
    help: "example"
  });
  assert.equal((normalizeLearnerStartSetupAnswers as (value: unknown) => unknown)({
    goal: "video",
    challenge: "hard",
    help: "example"
  }), undefined);
  assert.equal((normalizeLearnerProfileStatus as (status: unknown) => string)("skipped"), "skipped");
  assert.equal((normalizeLearnerProfileStatus as (status: unknown) => string)("archived"), "not-started");
});

test("learner profile persistence owns durable learner profile record normalization", async () => {
  const helpers = await import("@/lib/server/userStore/learnerProfilePersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeLearnerProfileRecord, "function");

  const normalizeLearnerProfileRecord =
    helpers.normalizeLearnerProfileRecord as (record: Record<string, unknown>, now: string) => unknown;
  const now = "2026-06-22T03:04:05.000Z";

  assert.equal(normalizeLearnerProfileRecord({ user_id: "" }, now), null);
  assert.equal(normalizeLearnerProfileRecord({ user_id: 42 }, now), null);

  assert.deepEqual(normalizeLearnerProfileRecord({
    user_id: "student-1",
    questionnaire_version: "legacy-version",
    status: "completed",
    answers: { goal: "video", challenge: "hard", help: "example" },
    completed_at: "2026-06-20T01:00:00.000Z",
    skipped_at: "2026-06-20T02:00:00.000Z"
  }, now), {
    user_id: "student-1",
    questionnaire_version: "learner-start-v1",
    status: "not-started",
    initialized_from: "login-onboarding",
    updated_at: now
  });

  assert.deepEqual(normalizeLearnerProfileRecord({
    user_id: "student-2",
    status: "completed",
    answers: { goal: "repair", challenge: "balanced", help: "steps" },
    completed_at: "2026-06-20T01:00:00.000Z",
    skipped_at: "2026-06-20T02:00:00.000Z",
    updated_at: "2026-06-21T01:00:00.000Z"
  }, now), {
    user_id: "student-2",
    questionnaire_version: "learner-start-v1",
    status: "completed",
    answers: { goal: "repair", challenge: "balanced", help: "steps" },
    initialized_from: "login-onboarding",
    completed_at: "2026-06-20T01:00:00.000Z",
    updated_at: "2026-06-21T01:00:00.000Z"
  });

  assert.deepEqual(normalizeLearnerProfileRecord({
    user_id: "student-3",
    status: "skipped",
    answers: { goal: "exam", challenge: "easy", help: "hint" },
    skipped_at: "2026-06-20T02:00:00.000Z"
  }, now), {
    user_id: "student-3",
    questionnaire_version: "learner-start-v1",
    status: "skipped",
    answers: { goal: "exam", challenge: "easy", help: "hint" },
    initialized_from: "login-onboarding",
    skipped_at: "2026-06-20T02:00:00.000Z",
    updated_at: now
  });

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /normalizeLearnerProfileRecord as normalizeLearnerProfileRecordFromLearnerProfilePersistence/);
  assert.doesNotMatch(rootSource, /function normalizeLearnerProfileRecord\b/);
});

test("learner profile persistence returns default student profiles without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/learnerProfilePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore({
    learner_profiles: [],
    users: [
      { id: "student-1", role: "student" },
      { id: "teacher-1", role: "teacher" }
    ]
  });

  assert.deepEqual(await store.getLearnerProfile("student-1"), {
    userId: "student-1",
    questionnaireVersion: "learner-start-v1",
    status: "not-started",
    initializedFrom: "login-onboarding",
    updatedAt: "2026-06-20T10:00:00.000Z"
  });
  assert.equal(await store.getLearnerProfile("teacher-1"), null);
  assert.equal(await store.getLearnerProfile("missing-user"), null);
});

test("learner profile persistence validates completed setup and replaces the current version record", async () => {
  const database: LearnerProfilePersistenceDatabase = {
    learner_profiles: [
      {
        user_id: "student-1",
        questionnaire_version: "learner-start-v1",
        status: "skipped",
        initialized_from: "login-onboarding",
        skipped_at: "2026-06-19T10:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    users: [{ id: "student-1", role: "student" }]
  };
  const store = createTestStore(database);

  assert.equal(await store.updateLearnerProfile("student-1", { status: "completed" }), null);
  assert.equal(await store.updateLearnerProfile("student-1", {
    status: "completed",
    answers: { goal: "repair", challenge: "balanced", help: "steps" }
  }).then((profile) => profile?.completedAt), "2026-06-20T10:00:00.000Z");

  assert.equal(database.learner_profiles.length, 1);
  assert.deepEqual(database.learner_profiles[0], {
    user_id: "student-1",
    questionnaire_version: "learner-start-v1",
    status: "completed",
    answers: { goal: "repair", challenge: "balanced", help: "steps" },
    initialized_from: "login-onboarding",
    completed_at: "2026-06-20T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z"
  });
});

test("learner profile persistence accepts skipped setup without answers and rejects non-students", async () => {
  const database: LearnerProfilePersistenceDatabase = {
    learner_profiles: [],
    users: [
      { id: "student-1", role: "student" },
      { id: "parent-1", role: "parent" }
    ]
  };
  const store = createTestStore(database);

  assert.equal(await store.updateLearnerProfile("parent-1", { status: "skipped" }), null);

  const skipped = await store.updateLearnerProfile("student-1", { status: "skipped" });

  assert.equal(skipped?.status, "skipped");
  assert.equal(skipped?.skippedAt, "2026-06-20T10:00:00.000Z");
  assert.equal(skipped?.answers, undefined);
});
