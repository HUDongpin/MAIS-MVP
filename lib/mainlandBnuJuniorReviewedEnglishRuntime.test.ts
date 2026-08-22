import assert from "node:assert/strict";
import test from "node:test";
import {
  chinaLessonEnglishTranslation,
  withChinaQuestionEnglishTranslations
} from "../data/chinaLessonEnglishTranslations";
import { mainlandBnuJuniorQuestions } from "../data/mainlandBnuJuniorQuestions";
import { questions } from "../data/questions";
import {
  cjkPattern,
  englishSurfaceLanguageFindings,
  hasGeneratedTermTokenPrefix,
  validateRestoredTranslation
} from "../scripts/china-lesson-english-translation-validation";
import type { LocalizedText, Question } from "../types";

const reviewedQuestionIds = [
  "bnu-junior-ds-v1-s1-014",
  "bnu-junior-ds-v1-s1-017",
  "bnu-junior-ds-v1-s1-019",
  "bnu-junior-ds-v1-s1-026",
  "bnu-junior-ds-v1-s1-028",
  "bnu-junior-ds-v1-s1-040",
  "bnu-junior-ds-v1-s1-138",
  "bnu-junior-ds-v1-s1-230",
  "bnu-junior-ds-v1-s1-276",
  "bnu-junior-ds-v1-s1-278",
  "bnu-junior-ds-v1-s1-281",
  "bnu-junior-ds-v1-s1-284",
  "bnu-junior-ds-v1-s1-287",
  "bnu-junior-ds-v1-s1-292",
  "bnu-junior-ds-v1-s1-293",
  "bnu-junior-ds-v1-s1-311",
  "bnu-junior-ds-v1-s1-312",
  "bnu-junior-ds-v1-s1-315",
  "bnu-junior-ds-v1-s1-317",
  "bnu-junior-ds-v1-s1-320",
  "bnu-junior-ds-v1-s1-327",
  "bnu-junior-ds-v1-s1-328",
  "bnu-junior-ds-v1-s1-332",
  "bnu-junior-ds-v1-s1-336",
  "bnu-junior-ds-v1-s1-434",
  "bnu-junior-ds-v1-s1-440",
  "bnu-junior-ds-v1-s1-450",
  "bnu-junior-ds-v1-s1-456",
  "bnu-junior-ds-v1-s1-485",
  "bnu-junior-ds-v1-s2-012",
  "bnu-junior-ds-v1-s2-013",
  "bnu-junior-ds-v1-s2-031",
  "bnu-junior-ds-v1-s2-066",
  "bnu-junior-ds-v1-s2-069",
  "bnu-junior-ds-v1-s2-132",
  "bnu-junior-ds-v1-s2-136",
  "bnu-junior-ds-v1-s2-156",
  "bnu-junior-ds-v1-s2-160",
  "bnu-junior-ds-v1-s2-192",
  "bnu-junior-ds-v1-s2-237",
  "bnu-junior-ds-v1-s2-240",
  "bnu-junior-ds-v1-s2-243",
  "bnu-junior-ds-v1-s2-244",
  "bnu-junior-ds-v1-s2-247",
  "bnu-junior-ds-v1-s2-248",
  "bnu-junior-ds-v1-s2-250",
  "bnu-junior-ds-v1-s2-252",
  "bnu-junior-ds-v1-s2-263",
  "bnu-junior-ds-v1-s2-264",
  "bnu-junior-ds-v1-s2-273",
  "bnu-junior-ds-v1-s2-285",
  "bnu-junior-ds-v1-s2-287",
  "bnu-junior-ds-v1-s2-291",
  "bnu-junior-ds-v1-s2-294",
  "bnu-junior-ds-v1-s2-296",
  "bnu-junior-ds-v1-s2-297",
  "bnu-junior-ds-v1-s2-299",
  "bnu-junior-ds-v1-s2-300",
  "bnu-junior-ds-v1-s2-303",
  "bnu-junior-ds-v1-s2-335",
  "bnu-junior-ds-v1-s2-362",
  "bnu-junior-ds-v1-s2-366",
  "bnu-junior-ds-v1-s2-381",
  "bnu-junior-ds-v1-s2-382",
  "bnu-junior-ds-v1-s2-446",
  "bnu-junior-ds-v1-s2-454",
  "bnu-junior-ds-v1-s2-481",
  "bnu-junior-ds-v1-s2-487",
  "bnu-junior-ds-v1-s2-489",
  "bnu-junior-ds-v1-s2-490",
  "bnu-junior-ds-v1-s2-493",
  "bnu-junior-ds-v1-s3-009",
  "bnu-junior-ds-v1-s3-018",
  "bnu-junior-ds-v1-s3-023",
  "bnu-junior-ds-v1-s3-027",
  "bnu-junior-ds-v1-s3-031",
  "bnu-junior-ds-v1-s3-033",
  "bnu-junior-ds-v1-s3-035",
  "bnu-junior-ds-v1-s3-036",
  "bnu-junior-ds-v1-s3-037",
  "bnu-junior-ds-v1-s3-039",
  "bnu-junior-ds-v1-s3-049",
  "bnu-junior-ds-v1-s3-065",
  "bnu-junior-ds-v1-s3-068",
  "bnu-junior-ds-v1-s3-122",
  "bnu-junior-ds-v1-s3-131",
  "bnu-junior-ds-v1-s3-134",
  "bnu-junior-ds-v1-s3-177",
  "bnu-junior-ds-v1-s3-178",
  "bnu-junior-ds-v1-s3-231",
  "bnu-junior-ds-v1-s3-237",
  "bnu-junior-ds-v1-s3-244",
  "bnu-junior-ds-v1-s3-267",
  "bnu-junior-ds-v1-s3-346",
  "bnu-junior-ds-v1-s3-349",
  "bnu-junior-ds-v1-s3-419",
  "bnu-junior-ds-v1-s3-421",
  "bnu-junior-ds-v1-s3-437"
] as const;

const reviewedIdSet = new Set<string>(reviewedQuestionIds);
const englishCjkPunctuationPattern = /[，。；：！？、【】〔〕《》〈〉「」『』（）［］｛｝＝＋－％\u3000]/u;
const malformedNaturalEnglishPattern = /\b(?:degrees degrees|meters meters|metres metres|items items|cubes cubes)\b/iu;

type ReviewedSurface = {
  field: "prompt" | `option[${number}]` | "explanation";
  value: LocalizedText;
};

function reviewedSurfaces(question: Question): ReviewedSurface[] {
  return [
    { field: "prompt", value: question.prompt },
    ...(question.options ?? []).map((value, index) => ({
      field: `option[${index}]` as const,
      value
    })),
    { field: "explanation", value: question.explanation }
  ];
}

function simplifiedSource(value: LocalizedText) {
  return value.zhHans?.trim() || value.zh.trim();
}

function chineseSurfaceSnapshot(question: Question) {
  const pick = (value: LocalizedText) => ({ zh: value.zh, zhHans: value.zhHans });
  return {
    prompt: pick(question.prompt),
    options: question.options?.map(pick),
    explanation: pick(question.explanation)
  };
}

function countBy<T extends string>(values: T[]) {
  return Object.fromEntries(
    Array.from(new Set(values))
      .sort()
      .map((value) => [value, values.filter((candidate) => candidate === value).length])
  );
}

test("reviewed BNU junior English runtime has the exact 98-question inventory", () => {
  assert.equal(reviewedQuestionIds.length, 98);
  assert.equal(reviewedIdSet.size, 98, "reviewed IDs must be unique");

  const runtime = questions.filter((question) => reviewedIdSet.has(question.id));
  assert.equal(runtime.length, 98, "all reviewed IDs must resolve exactly once in production runtime");
  assert.deepEqual(new Set(runtime.map((question) => question.id)), reviewedIdSet);
  assert.ok(runtime.every((question) => question.publisher === "MAINLAND_BNU"));
  assert.deepEqual(countBy(runtime.map((question) => question.grade)), { S1: 29, S2: 42, S3: 27 });
  assert.deepEqual(countBy(runtime.map((question) => question.type)), {
    "fill-in": 37,
    "multiple-choice": 26,
    "short-answer": 35
  });
});

test("all 300 reviewed runtime surfaces contain natural English without CJK or generated fallbacks", () => {
  const runtime = questions.filter((question) => reviewedIdSet.has(question.id));
  const surfaces = runtime.flatMap((question) =>
    reviewedSurfaces(question).map((surface) => ({ ...surface, questionId: question.id }))
  );
  const prompts = runtime.map((question) => question.prompt);
  const options = runtime.flatMap((question) => question.options ?? []);
  const explanations = runtime.map((question) => question.explanation);

  assert.equal(prompts.length, 98);
  assert.equal(options.length, 104);
  assert.equal(explanations.length, 98);
  assert.equal(surfaces.length, 300);

  runtime.forEach((question) => {
    assert.match(question.prompt.en, /[A-Za-z]/u, `${question.id}: prompt must contain student-facing English prose`);
    assert.match(question.explanation.en, /[A-Za-z]/u, `${question.id}: explanation must contain English prose`);
    if (question.type !== "multiple-choice") return;
    assert.equal(question.options?.length, 4, `${question.id}: reviewed MC must retain four options`);
    assert.equal(
      new Set(question.options?.map((option) => option.en.trim())).size,
      4,
      `${question.id}: English MC options must remain unique`
    );
  });

  surfaces.forEach(({ questionId, field, value }) => {
    const label = `${questionId}:${field}`;
    assert.ok(value.en.trim(), `${label}: English must be nonempty`);
    assert.doesNotMatch(value.en, cjkPattern, `${label}: English must not contain CJK text`);
    assert.equal(hasGeneratedTermTokenPrefix(value.en), false, `${label}: English must not contain a term-* fallback`);
    assert.deepEqual(englishSurfaceLanguageFindings(value.en), [], `${label}: English contains a known pseudo-English pattern`);
    assert.doesNotMatch(value.en, englishCjkPunctuationPattern, `${label}: English must use English punctuation`);
    assert.doesNotMatch(value.en, malformedNaturalEnglishPattern, `${label}: English contains a duplicated count/unit noun`);
  });
});

test("all dictionary-backed reviewed runtime fields preserve numeric, math, unit, and geometry tokens", () => {
  const runtime = questions.filter((question) => reviewedIdSet.has(question.id));
  const mappedSources = new Set<string>();
  const counts = { prompt: 0, option: 0, explanation: 0 };

  runtime.forEach((question) => {
    reviewedSurfaces(question).forEach(({ field, value }) => {
      const source = simplifiedSource(value);
      const mapped = chinaLessonEnglishTranslation(source);
      if (!mapped) return;

      assert.equal(value.en, mapped, `${question.id}:${field}: runtime must use the reviewed dictionary value`);
      assert.equal(
        validateRestoredTranslation({ id: `${question.id}:${field}`, source, contexts: [field] }, value.en),
        value.en,
        `${question.id}:${field}: reviewed translation must preserve protected content`
      );
      mappedSources.add(source);
      if (field === "prompt") counts.prompt += 1;
      else if (field === "explanation") counts.explanation += 1;
      else counts.option += 1;
    });
  });

  assert.deepEqual(counts, { prompt: 72, option: 42, explanation: 0 });
  assert.equal(counts.prompt + counts.option + counts.explanation, 114);
  assert.equal(mappedSources.size, 102);
});

test("the BNU/HJB English overlay leaves reviewed zh and zhHans surfaces unchanged", () => {
  const direct = mainlandBnuJuniorQuestions.filter((question) => reviewedIdSet.has(question.id));
  assert.equal(direct.length, 98);

  direct.forEach((question) => {
    const before = chineseSurfaceSnapshot(question);
    const after = withChinaQuestionEnglishTranslations(question);
    assert.deepEqual(
      chineseSurfaceSnapshot(after),
      before,
      `${question.id}: English translation overlay must not mutate zh or zhHans`
    );
  });
});
