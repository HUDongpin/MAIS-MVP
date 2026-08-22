import assert from "node:assert/strict";
import test from "node:test";
import versionManifest from "../data/historical/hongKongQuestionVersionManifest.json";
import {
  activeHongKongQuestionIdByHistoricalId,
  questions,
  retiredHongKongQuestionIds
} from "../data/questions";

import {
  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,
  historicalHongKongQuestionForId,
  historicalHongKongQuestions,
  questionMaterialFingerprint,
  versionMateriallyChangedHongKongQuestions
} from "./hongKongQuestionVersioning";
import type { Question } from "../types";

function historicalFixture(): Question {
  const question = historicalHongKongQuestions[0];
  assert.ok(question, "locked HK history snapshot must not be empty");
  return structuredClone(question);
}

test("the HK question-history snapshot is locked to the integration baseline", () => {
  assert.equal(HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT, "3f8f12c4d3fd2efe938d1b07cab6289315f108dd");
  assert.equal(historicalHongKongQuestions.length, 989);
  const sample = historicalFixture();
  assert.deepEqual(historicalHongKongQuestionForId(sample.id), sample);
});

test("materially changed same-ID HK questions receive a new active ID and retire the old ID", () => {
  const historical = historicalFixture();
  const changed: Question = {
    ...historical,
    prompt: { ...historical.prompt, en: `${historical.prompt.en} Corrected.` }
  };

  const result = versionMateriallyChangedHongKongQuestions([changed]);
  assert.equal(result.questions[0]?.id, `${historical.id}-v2`);
  assert.equal(result.activeIdByHistoricalId.get(historical.id), `${historical.id}-v2`);
  assert.equal(result.retiredHistoricalIds.has(historical.id), true);
  assert.equal(
    questionMaterialFingerprint(historicalHongKongQuestionForId(historical.id) as Question),
    questionMaterialFingerprint(historical),
    "versioning must not mutate the historical question object"
  );
});

test("unchanged current questions keep their IDs while removed historical IDs are retired", () => {
  const retained = historicalFixture();
  const result = versionMateriallyChangedHongKongQuestions([retained]);

  assert.equal(result.questions[0]?.id, retained.id);
  assert.equal(result.activeIdByHistoricalId.has(retained.id), false);
  assert.equal(result.retiredHistoricalIds.has(retained.id), false);
  assert.ok(
    historicalHongKongQuestions.some(
      (question) => question.id !== retained.id && result.retiredHistoricalIds.has(question.id)
    ),
    "every absent baseline ID must be retired from the active catalog"
  );
});

test("non-HK questions are never versioned by the HK history contract", () => {
  const historical = historicalFixture();
  const nonHk = {
    ...historical,
    id: "non-hk-versioning-fixture",
    curriculumTrack: "US_CA_MATH" as const,
    prompt: { en: "Changed", zh: "Changed" }
  };
  const result = versionMateriallyChangedHongKongQuestions([nonHk]);
  assert.equal(result.questions[0]?.id, nonHk.id);
  assert.equal(result.activeIdByHistoricalId.size, 0);
});

test("the compact server manifest exactly matches the generated live versioning result", () => {
  const runtimeMap = Object.fromEntries(
    [...activeHongKongQuestionIdByHistoricalId.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
  const runtimeRetired = [...retiredHongKongQuestionIds].sort((left, right) => left.localeCompare(right));

  assert.deepEqual(versionManifest.activeIdByHistoricalId, runtimeMap);
  assert.deepEqual(versionManifest.retiredHistoricalIds, runtimeRetired);

  const activeIds = new Set(questions.map((question) => question.id));
  for (const [historicalId, activeId] of Object.entries(runtimeMap)) {
    assert.ok(historicalHongKongQuestionForId(historicalId), `${historicalId}: missing locked historical object`);
    assert.equal(activeIds.has(historicalId), false, `${historicalId}: retired ID leaked into active questions`);
    assert.equal(activeIds.has(activeId), true, `${historicalId}: missing mapped active ID ${activeId}`);
  }
});
