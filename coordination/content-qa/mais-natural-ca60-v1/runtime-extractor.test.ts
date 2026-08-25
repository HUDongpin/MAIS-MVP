import assert from "node:assert/strict";
import test from "node:test";

import {
  CALIFORNIA_RUNTIME_GRADES_V1,
  extractCaliforniaRuntimeInventoryV1,
  type CaliforniaRuntimeSourceAdapterV1,
  type RuntimeQuestionLikeV1,
} from "./runtime-extractor";

const localized = (value: string) => ({ en: value, zh: `ZH ${value}`, zhHans: `ZH-HANS ${value}` });

function question(id: string, grade: string, overrides: Partial<RuntimeQuestionLikeV1> = {}): RuntimeQuestionLikeV1 {
  return {
    id,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: `topic-${grade}`,
    grade,
    topicId: `topic-${grade}`,
    topic: localized(`Topic ${grade}`),
    difficulty: "Medium",
    type: "short-answer",
    prompt: localized(`Prompt ${id}`),
    answer: "4",
    acceptedAnswers: ["4"],
    explanation: localized("Explanation"),
    ...overrides,
  };
}

function publicProjection(source: RuntimeQuestionLikeV1) {
  const {
    answer: _answer,
    acceptedAnswers: _acceptedAnswers,
    explanation: _explanation,
    ...visible
  } = source;
  return visible;
}

function fixtureAdapter(overrides: {
  rawQuestions?: RuntimeQuestionLikeV1[];
  convertedQuestions?: RuntimeQuestionLikeV1[];
  publicByGrade?: Map<string, ReturnType<typeof publicProjection>[]>;
} = {}): CaliforniaRuntimeSourceAdapterV1 {
  const convertedQuestions = overrides.convertedQuestions
    ?? CALIFORNIA_RUNTIME_GRADES_V1.map((grade, index) => question(`item-${index + 1}`, grade));
  const rawQuestions = overrides.rawQuestions ?? structuredClone(convertedQuestions);
  const publicByGrade = overrides.publicByGrade ?? new Map(CALIFORNIA_RUNTIME_GRADES_V1.map((grade) => [
    grade,
    convertedQuestions.filter((item) => item.grade === grade).map(publicProjection),
  ]));
  const invocationGrades: string[] = [];
  return {
    invocationGrades,
    async getRawQuestions() {
      return structuredClone(rawQuestions);
    },
    async getConvertedQuestions() {
      return structuredClone(convertedQuestions);
    },
    async getPublicQuestions(grade) {
      invocationGrades.push(grade);
      return structuredClone(publicByGrade.get(grade) ?? []);
    },
    async getTopicCatalog(grade) {
      const rows = publicByGrade.get(grade) ?? [];
      return {
        totalQuestions: rows.length,
        topics: rows.map((row) => ({
          topicId: row.topicId,
          grade: row.grade,
          topic: row.topic,
          questionCount: 1,
        })),
      };
    },
    async getQuestionForAttempt(itemId) {
      return structuredClone(convertedQuestions.find((item) => item.id === itemId) ?? null);
    },
    getGenerationMetadata(itemId) {
      return { batch: "fixture-batch", sourceIds: ["fixture-source"], itemId };
    },
  };
}

test("runtime extraction invokes all 13 frozen grade projections exactly once and preserves order", async () => {
  const adapter = fixtureAdapter();
  const result = await extractCaliforniaRuntimeInventoryV1({ adapter });
  assert.deepEqual(adapter.invocationGrades, [...CALIFORNIA_RUNTIME_GRADES_V1]);
  assert.equal(result.gradeProjectionInvocations.length, 13);
  assert.deepEqual(result.gradeProjectionInvocations.map((entry) => entry.grade), [...CALIFORNIA_RUNTIME_GRADES_V1]);
  assert.equal(result.rawSourceItemCount, 13);
  assert.equal(result.convertedItemCount, 13);
  assert.equal(result.runtimeVisibleItemCount, 13);
  assert.equal(result.itemRecords.length, 13);
  assert.equal(result.freezeEligible, true);
  assert.deepEqual(result.frameFailureLedger, []);
  assert.equal(result.providerRequestCount, 0);
});

test("duplicate IDs in raw source or grade projections hard-fail instead of first-wins collapse", async () => {
  const duplicateRaw = [question("same-id", "K"), question("same-id", "P1")];
  await assert.rejects(
    extractCaliforniaRuntimeInventoryV1({ adapter: fixtureAdapter({ rawQuestions: duplicateRaw, convertedQuestions: duplicateRaw }) }),
    /duplicate.*same-id|same-id.*duplicate/iu,
  );

  const adapter = fixtureAdapter();
  const source = question("cross-grade-id", "K");
  const publicByGrade = new Map<string, ReturnType<typeof publicProjection>[]>(
    CALIFORNIA_RUNTIME_GRADES_V1.map((grade) => [grade, []]),
  );
  publicByGrade.set("K", [publicProjection(source)]);
  publicByGrade.set("P1", [publicProjection({ ...source, grade: "P1" })]);
  await assert.rejects(
    extractCaliforniaRuntimeInventoryV1({ adapter: fixtureAdapter({
      rawQuestions: [source],
      convertedQuestions: [source],
      publicByGrade,
    }) }),
    /duplicate.*cross-grade-id|cross-grade-id.*duplicate/iu,
  );
});

test("missing answer, options, or explanation is retained as reviewable content rather than excluded", async () => {
  const incomplete = question("incomplete-item", "K", {
    type: "multiple-choice",
    answer: undefined,
    acceptedAnswers: undefined,
    explanation: undefined,
    options: undefined,
  });
  const adapter = fixtureAdapter({ rawQuestions: [incomplete], convertedQuestions: [incomplete] });
  const result = await extractCaliforniaRuntimeInventoryV1({ adapter });
  assert.equal(result.runtimeVisibleItemCount, 1);
  assert.equal(result.itemRecords.length, 1);
  assert.equal(result.itemRecords[0].materialPresence.answer, false);
  assert.equal(result.itemRecords[0].materialPresence.options, false);
  assert.equal(result.itemRecords[0].materialPresence.explanation, false);
  assert.equal(result.itemRecords[0].retainedForDefectReview, true);
  assert.equal(result.itemRecords[0].exclusionCode, null);
});

test("route parity mismatch blocks freeze and records a closed failure instead of dropping the item", async () => {
  const converted = [question("route-drift", "K")];
  const publicByGrade = new Map<string, ReturnType<typeof publicProjection>[]>(
    CALIFORNIA_RUNTIME_GRADES_V1.map((grade) => [grade, []]),
  );
  publicByGrade.set("K", [publicProjection({ ...converted[0], prompt: localized("Drifted public prompt") })]);
  const result = await extractCaliforniaRuntimeInventoryV1({
    adapter: fixtureAdapter({ rawQuestions: converted, convertedQuestions: converted, publicByGrade }),
  });
  assert.equal(result.freezeEligible, false);
  assert.equal(result.itemRecords.length, 1);
  assert.equal(result.frameFailureLedger.length, 1);
  assert.equal(result.frameFailureLedger[0].code, "PUBLIC_FIELD_MISMATCH");
  assert.equal(result.frameFailureLedger[0].itemId, "route-drift");
});

test("serialization failure is counted in the runtime population and blocks freeze", async () => {
  const invalid = question("bad-unicode", "K", { prompt: localized("bad\ud800") });
  const result = await extractCaliforniaRuntimeInventoryV1({
    adapter: fixtureAdapter({ rawQuestions: [invalid], convertedQuestions: [invalid] }),
  });
  assert.equal(result.runtimeVisibleItemCount, 1);
  assert.equal(result.itemRecords.length, 1);
  assert.equal(result.freezeEligible, false);
  assert.equal(result.frameFailureLedger[0].code, "SERIALIZATION_FAILED");
  assert.match(result.frameFailureLedger[0].redactedDetailHash, /^[0-9a-f]{64}$/u);
  assert.equal(Object.hasOwn(result.frameFailureLedger[0], "rawError"), false);
});
