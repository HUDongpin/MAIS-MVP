import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { isValidQuestionFilter } from "@/lib/server/userStore/questionFilter";

test("question filter accepts empty and valid active filters", () => {
  assert.equal(isValidQuestionFilter(null), true);
  assert.equal(isValidQuestionFilter({}), true);
  assert.equal(
    isValidQuestionFilter({
      grade: "P5",
      difficulty: "High",
      topicId: "topic-1",
      curriculumTrack: "US_CA_MATH"
    }),
    true
  );
});

test("question filter rejects unsupported grades difficulties topics and tracks", () => {
  assert.equal(isValidQuestionFilter({ grade: "G7" }), false);
  assert.equal(isValidQuestionFilter({ difficulty: "Challenge" }), false);
  assert.equal(isValidQuestionFilter({ topicId: 42 }), false);
  assert.equal(isValidQuestionFilter({ curriculumTrack: "IB_MATH" }), false);
});

test("question filter module does not import legacy userStore", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/questionFilter.ts"), "utf8");

  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
});

test("legacy userStore delegates question filter validation to extracted module", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const isValidQuestionFilter = isValidQuestionFilterFromQuestionFilter/);
  assert.doesNotMatch(source, /export function isValidQuestionFilter/);
});
