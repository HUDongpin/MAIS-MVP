import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import type { GradeId, Question } from "@/types";

const retiredHistoricalQuestionIds = ["graph-p4-angles-straight-line"] as const;

function testQuestion(id: string): Question {
  return {
    id,
    curriculumTrack: "HK",
    curriculumProfile: defaultCurriculumProfile,
    region: defaultCurriculumProfile.region,
    publisher: defaultCurriculumProfile.publisher,
    grade: "P2",
    topicId: "p2-length-data",
    topic: { en: "Length and data", zh: "長度與數據" },
    difficulty: "Low",
    type: "fill-in",
    prompt: { en: "What is 2 + 2?", zh: "2 + 2 是多少？" },
    answer: "4",
    explanation: { en: "2 + 2 = 4.", zh: "2 + 2 = 4。" }
  };
}

test("questionStore serves grade-filtered public questions from a cached lightweight catalog", async () => {
  const store = await import("./questionStore");

  const first = await store.getPublicQuestionsFromStore({
    grade: "S2",
    curriculumProfile: defaultCurriculumProfile
  });
  const second = await store.getPublicQuestionsFromStore({
    grade: "S2",
    curriculumProfile: defaultCurriculumProfile
  });

  assert.equal(first, second);
  assert.ok(first.length > 0);
  assert.ok(first.every((question) => question.grade === "S2"));
  assert.ok(first.every((question) => !("answer" in question)));
  assert.ok(first.every((question) => !("explanation" in question)));

  const firstCatalog = await store.getQuestionTopicCatalogFromStore({
    grade: "S2",
    curriculumProfile: defaultCurriculumProfile
  });
  const secondCatalog = await store.getQuestionTopicCatalogFromStore({
    grade: "S2",
    curriculumProfile: defaultCurriculumProfile
  });

  assert.equal(firstCatalog, secondCatalog);
  assert.equal(firstCatalog.totalQuestions, first.length);
  assert.ok(firstCatalog.topics.length > 0);
});

test("questionStore stays decoupled from authenticated app_state storage", async () => {
  const source = await readFile(join(process.cwd(), "lib/server/questionStore.ts"), "utf8");

  // The constraint is that the authenticated store must not be in this module's STATIC import
  // graph — that is what would drag app_state onto a public, hot path. A guarded
  // `await import(...)` does not, and the curated question aggregate is loaded exactly that way
  // (see optionalQuestionModule) so HK S3-S6 questions still reach free selection.
  // Matching bare identifiers could not tell the two apart and failed on the lazy form.
  const staticImports = source
    .split("\n")
    .filter((line) => /^\s*import\b/.test(line))
    .join("\n");

  assert.doesNotMatch(
    staticImports,
    /userStore|requireAuthenticatedUser|readDatabase|mutateDatabase|app_state/,
    "the authenticated store must never be statically imported here"
  );
  assert.doesNotMatch(
    source,
    /^\s*import\s[^\n]*@\/data\/questions/m,
    "the curated question aggregate must stay lazily loaded"
  );
});

test("the active question hot path imports only the compact HK retirement manifest", async () => {
  const [storeSource, contractSource, retirementSource] = await Promise.all([
    readFile(join(process.cwd(), "lib/server/questionStore.ts"), "utf8"),
    readFile(join(process.cwd(), "lib/server/questionResponseContracts.ts"), "utf8"),
    readFile(join(process.cwd(), "lib/hongKongQuestionRetirement.ts"), "utf8")
  ]);
  const staticClosureSource = [storeSource, contractSource, retirementSource].join("\n");

  assert.doesNotMatch(
    staticClosureSource,
    /from\s+["']@\/data\/questions["']|hongKongQuestions-3f8f12c4\.json/,
    "active question and grading modules must not statically import the aggregate bank or 877 KB history snapshot"
  );
  assert.match(
    retirementSource,
    /hongKongQuestionVersionManifest\.json/,
    "active retirement lookup must use the compact generated manifest"
  );
});

test("questionStore denies retired active submissions while preserving immutable historical resolution", async () => {
  const store = await import("./questionStore");
  const hooks = store.__questionStoreTestHooks as typeof store.__questionStoreTestHooks & {
    seedSourceQuestions(
      profile: typeof defaultCurriculumProfile,
      grade: GradeId | undefined,
      questions: Question[]
    ): void;
  };
  const activeQuestion = testQuestion("graph-s1-angles-straight-line");
  const retiredQuestions = retiredHistoricalQuestionIds.map(testQuestion);
  const sourceQuestions = [...retiredQuestions, activeQuestion];

  hooks.clearCaches();
  try {
    hooks.seedSourceQuestions(defaultCurriculumProfile, "P2", sourceQuestions);
    hooks.seedSourceQuestions(defaultCurriculumProfile, undefined, sourceQuestions);

    const publicQuestions = await store.getPublicQuestionsFromStore({
      grade: "P2",
      curriculumProfile: defaultCurriculumProfile
    });
    const reducedQuestions = await store.getReducedChoicePublicQuestionsFromStore({
      grade: "P2",
      curriculumProfile: defaultCurriculumProfile
    }, 2);
    const catalog = await store.getQuestionTopicCatalogFromStore({
      grade: "P2",
      curriculumProfile: defaultCurriculumProfile
    });
    const activeAttemptQuestions = await Promise.all(retiredHistoricalQuestionIds.map((questionId) =>
      store.getQuestionForAttemptFromStore(questionId, defaultCurriculumProfile)
    ));
    const historicalQuestions = await Promise.all(retiredHistoricalQuestionIds.map((questionId) =>
      store.getHistoricalQuestionForAttemptFromStore(questionId, defaultCurriculumProfile)
    ));
    const remappedActiveQuestions = await Promise.all(retiredHistoricalQuestionIds.map((questionId) =>
      store.getActiveQuestionForHistoricalIdFromStore(questionId, defaultCurriculumProfile)
    ));

    assert.deepEqual(publicQuestions.map((question) => question.id), [activeQuestion.id]);
    assert.deepEqual(reducedQuestions.map((question) => question.id), [activeQuestion.id]);
    assert.equal(catalog.totalQuestions, 1);
    assert.deepEqual(activeAttemptQuestions, retiredHistoricalQuestionIds.map(() => null));
    assert.deepEqual(historicalQuestions.map((question) => question?.id), retiredHistoricalQuestionIds);
    assert.deepEqual(remappedActiveQuestions.map((question) => question?.id), [activeQuestion.id]);
  } finally {
    hooks.clearCaches();
  }
});
