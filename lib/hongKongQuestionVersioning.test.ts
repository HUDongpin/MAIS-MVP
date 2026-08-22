import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import versionManifest from "../data/historical/hongKongQuestionVersionManifest.json";
import displayed74PromotionManifest from "../data/historical/hongKongDisplayed74PromotionManifest.json";
import {
  activeHongKongQuestionIdByHistoricalId,
  questions,
  retiredHongKongQuestionIds
} from "../data/questions";

import {
  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,
  easeExact3V3HistoricalHongKongQuestions,
  easeV2HistoricalHongKongQuestions,
  historicalHongKongQuestionForId,
  historicalHongKongQuestions,
  questionMaterialFingerprint,
  successorHistoricalHongKongQuestions,
  versionMateriallyChangedHongKongQuestions
} from "./hongKongQuestionVersioning";
import type { Question } from "../types";
import {
  hkIndependentAnswersById,
  isExpectedAnswerRepresented
} from "./questionBankSolvability";
import { createHongKongDisplayed74Test } from "./hongKongDisplayed74FocusedTestLedger";

export const HONG_KONG_QUESTION_VERSIONING_CONTRACT_SUITE_ID =
  "hk-question-versioning-contract-v1" as const;
const test = createHongKongDisplayed74Test(HONG_KONG_QUESTION_VERSIONING_CONTRACT_SUITE_ID);

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

test("the complete prior 39847 EASE package is frozen as 699 v2 and two v3 historical generations", () => {
  assert.equal(
    HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,
    "39847b22bb9f83246cb2a55ebea78545205544248d37356be1f3ef1a1cdbee00"
  );
  assert.equal(easeV2HistoricalHongKongQuestions.length, 701);
  assert.equal(new Set(easeV2HistoricalHongKongQuestions.map((question) => question.id)).size, 701);
  assert.equal(easeV2HistoricalHongKongQuestions.filter((question) => /-v2$/.test(question.id)).length, 699);
  assert.equal(easeV2HistoricalHongKongQuestions.filter((question) => /-v3$/.test(question.id)).length, 2);
  assert.equal(
    easeV2HistoricalHongKongQuestions.filter((question) => !/-v[23]$/.test(question.id)).length,
    0
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(process.cwd(), "data/historical/hongKongQuestions-hk-ease-39847.json")))
      .digest("hex"),
    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1"
  );
  assert.equal(
    HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,
    "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b"
  );
  assert.deepEqual(
    easeExact3V3HistoricalHongKongQuestions.map((question) => question.id),
    ["hk-ease-10481-v3", "hk-ease-10496-v3", "hk-ease-1041-v3"]
  );
  for (const question of easeExact3V3HistoricalHongKongQuestions) {
    assert.deepEqual(historicalHongKongQuestionForId(question.id), question);
  }
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

test("a question already frozen through v3 advances to v4 without overwriting any historical generation", () => {
  assert.equal(successorHistoricalHongKongQuestions.length, 2);
  const frozenV2 = successorHistoricalHongKongQuestions.find((question) => question.id === "hk-ease-10672-v2");
  assert.ok(frozenV2);
  assert.deepEqual(historicalHongKongQuestionForId(frozenV2.id), frozenV2);
  const frozenV3 = easeV2HistoricalHongKongQuestions.find((question) => question.id === "hk-ease-10672-v3");
  assert.ok(frozenV3);
  assert.deepEqual(historicalHongKongQuestionForId(frozenV3.id), frozenV3);

  const changedAgain: Question = {
    ...structuredClone(frozenV3),
    id: "hk-ease-10672",
    explanation: {
      en: `${frozenV3.explanation.en} Independently reworded.`,
      zh: `${frozenV3.explanation.zh} 已獨立改寫。`
    }
  };
  const result = versionMateriallyChangedHongKongQuestions([changedAgain]);

  assert.equal(result.questions[0]?.id, "hk-ease-10672-v4");
  assert.equal(result.activeIdByHistoricalId.get("hk-ease-10672"), "hk-ease-10672-v4");
  assert.equal(result.activeIdByHistoricalId.get("hk-ease-10672-v2"), "hk-ease-10672-v4");
  assert.equal(result.activeIdByHistoricalId.get("hk-ease-10672-v3"), "hk-ease-10672-v4");
  assert.equal(result.retiredHistoricalIds.has("hk-ease-10672"), true);
  assert.equal(result.retiredHistoricalIds.has("hk-ease-10672-v2"), true);
  assert.equal(result.retiredHistoricalIds.has("hk-ease-10672-v3"), true);
  assert.equal(historicalHongKongQuestionForId("hk-ease-10672-v2")?.explanation.en, frozenV2.explanation.en);
  assert.equal(historicalHongKongQuestionForId("hk-ease-10672-v3")?.explanation.en, frozenV3.explanation.en);
});

test("the real current EASE state reuses two frozen v3 rows and promotes exactly 82 repaired rows", () => {
  const activeEase = questions.filter((question) => /^hk-ease-\d+-v\d+$/.test(question.id));
  assert.equal(activeEase.filter((question) => /-v2$/.test(question.id)).length, 614);
  assert.equal(activeEase.filter((question) => /-v3$/.test(question.id)).length, 87);
  assert.equal(activeEase.filter((question) => !/-v[23]$/.test(question.id)).length, 0);

  for (const baseId of ["hk-ease-10672", "hk-ease-1129"]) {
    const active = activeEase.find((question) => question.id === `${baseId}-v3`);
    const frozen = easeV2HistoricalHongKongQuestions.find((question) => question.id === `${baseId}-v3`);
    assert.ok(active, `${baseId}: missing active v3`);
    assert.ok(frozen, `${baseId}: missing frozen v3`);
    assert.equal(questionMaterialFingerprint(active), questionMaterialFingerprint(frozen));
  }

  const exact3BaseIds = new Set(["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  for (const baseId of exact3BaseIds) {
    const active = activeEase.find((question) => question.id === `${baseId}-v3`);
    const frozen = easeExact3V3HistoricalHongKongQuestions.find(
      (question) => question.id === `${baseId}-v3`
    );
    assert.ok(active, `${baseId}: missing exact3 active v3`);
    assert.ok(frozen, `${baseId}: missing exact3 frozen v3`);
    assert.equal(questionMaterialFingerprint(active), questionMaterialFingerprint(frozen));
  }

  const promotedBaseIds = activeEase
    .map((question) => question.id.match(/^(hk-ease-\d+)-v3$/)?.[1])
    .filter((baseId): baseId is string => Boolean(baseId))
    .filter((baseId) => baseId !== "hk-ease-10672" && baseId !== "hk-ease-1129")
    .filter((baseId) => !exact3BaseIds.has(baseId))
    .sort();
  assert.equal(promotedBaseIds.length, 82);
  assert.equal(
    createHash("sha256").update(`${promotedBaseIds.join("\n")}\n`).digest("hex"),
    "24796d8f24fcf013ab9ff3b41bbb7d5cbf506a14084db44ecd8c0108d45bde35"
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

test("all 74 promoted generations retain an independent answer, with exact active overrides winning", () => {
  const independentAnswers = hkIndependentAnswersById();
  const activeQuestionById = new Map(questions.map((question) => [question.id, question]));

  assert.equal(displayed74PromotionManifest.promotions.length, 74);
  for (const promotion of displayed74PromotionManifest.promotions) {
    const active = activeQuestionById.get(promotion.toId);
    assert.ok(active, `${promotion.fromId}: missing active successor ${promotion.toId}`);
    const independentAnswer = independentAnswers.get(promotion.toId);
    assert.ok(independentAnswer, `${promotion.toId}: missing propagated independent answer`);
    assert.equal(
      isExpectedAnswerRepresented(active, independentAnswer),
      true,
      `${promotion.toId}: independent answer no longer represents the stored answer`
    );
  }

  assert.equal(
    independentAnswers.get("supp-p5-volume-first-step-v3"),
    "Identify the volume and dimensions, then decide which quantity is unknown before choosing the operation"
  );
  assert.equal(
    independentAnswers.get("supp-p6-ratio-proportion-first-step-v3"),
    "For a mean, divide the total by the number of data values; for a broken-line graph, read the axis labels, scales, units, and data order first"
  );
  assert.equal(
    independentAnswers.get("supp-statistics-s1-first-step-v3"),
    "Identify whether the question asks for a measure of centre or spread; order the data when finding the median"
  );
});
