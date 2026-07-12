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

  assert.doesNotMatch(source, /userStore|requireAuthenticatedUser|readDatabase|mutateDatabase|app_state|@\/data\/questions/);
});
