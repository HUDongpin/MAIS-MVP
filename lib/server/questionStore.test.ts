import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { defaultCurriculumProfile } from "@/lib/curriculumProfile";

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

test("multiple-choice options are served in a shuffled but stable order", async () => {
  const store = await import("./questionStore");
  const { questions: seedQuestions } = await import("@/data/questions");
  const { answerMatches } = await import("./answerMatching");

  const served = await store.getPublicQuestionsFromStore({
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" } as never
  });
  const multipleChoice = served.filter((question) => question.type === "multiple-choice");
  assert.ok(multipleChoice.length > 0, "expected Hong Kong multiple-choice questions");

  const seedById = new Map(seedQuestions.map((question) => [question.id, question]));
  const keyPositions = new Map<number, number>();

  for (const question of multipleChoice) {
    const seed = seedById.get(question.id);
    assert.ok(seed, `missing seed question for ${question.id}`);

    // Shuffling must never add, drop or alter an option: only their order.
    const servedTexts = (question.options ?? []).map((option) => option.zh ?? option.en).sort();
    const seedTexts = (seed.options ?? []).map((option) => option.zh ?? option.en).sort();
    assert.deepEqual(servedTexts, seedTexts, `option set changed for ${question.id}`);

    const accepted = [seed.answer, ...(seed.acceptedAnswers ?? [])];
    const index = (question.options ?? []).findIndex((option) =>
      accepted.some((answer) =>
        [option.en, option.zh].filter(Boolean).some((text) => answerMatches(answer, text as string))
      )
    );
    assert.ok(index >= 0, `correct option missing after shuffle for ${question.id}`);
    keyPositions.set(index, (keyPositions.get(index) ?? 0) + 1);
  }

  // Authored order put the key first in 117 of 194 Hong Kong items, so always
  // tapping the first option scored 60%. A seeded shuffle must bring that back
  // toward chance rather than leaving a slot that pays off.
  const firstSlotShare = (keyPositions.get(0) ?? 0) / multipleChoice.length;
  assert.ok(
    firstSlotShare < 0.35,
    `first option still holds the answer ${(firstSlotShare * 100).toFixed(1)}% of the time`
  );

  // Order must not move under a learner between fetches.
  const refetched = await store.getPublicQuestionsFromStore({
    curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" } as never
  });
  const refetchedById = new Map(refetched.map((question) => [question.id, question]));
  for (const question of multipleChoice) {
    assert.deepEqual(
      refetchedById.get(question.id)?.options,
      question.options,
      `option order changed between fetches for ${question.id}`
    );
  }
});
