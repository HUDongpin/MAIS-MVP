import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  localizedValue,
  reviewPages,
  type ReviewPage
} from "../scripts/review-china-lesson-page-content";
import {
  getMainlandHjbPrimaryLessonIllustration,
  mainlandHjbPrimaryLessonIllustrations
} from "@/data/mainlandHjbPrimaryLessonIllustrations";
import { questionAnswerMatches } from "./server/answerMatching";
import type { LocalizedText, Question } from "@/types";

const primaryPages = reviewPages("zhHans", "hjb-primary");
const juniorPages = reviewPages("zhHans", "hjb-junior");
const allPages = [...primaryPages, ...juniorPages];
const allDisplayedQuestions = allPages.flatMap((page) => page.practice);
const allEnglishPages = [
  ...reviewPages("en", "hjb-primary"),
  ...reviewPages("en", "hjb-junior")
];

function simplified(value: LocalizedText) {
  return localizedValue(value, "zhHans");
}

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function pageIdMatrix(pages: ReviewPage[]) {
  return pages.map((page) => ({
    topicId: page.topic.id,
    questionIds: page.practice.map((question) => question.id)
  }));
}

function answerSurface(pages: ReviewPage[]) {
  return pages.flatMap((page) => page.practice.map((question) => ({
    topicId: page.topic.id,
    id: question.id,
    type: question.type,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers ?? []
  })));
}

const rawHjbSourceFiles = [
  "data/mainlandHjbPrimaryTopics.ts",
  "data/mainlandHjbJuniorTopics.ts",
  "data/mainlandHjbPrimaryQuestions.ts",
  "data/mainlandHjbJuniorQuestions.ts",
  "data/mainlandHjbPrimaryLessons.ts",
  "data/mainlandHjbJuniorLessons.ts",
  "data/mainlandHjbPrimaryLessonIllustrations.ts",
  "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/mainland-hjb-junior-lessons-v1/lessons.json"
] as const;

function rawSourceHashes() {
  return Object.fromEntries(rawHjbSourceFiles.map((filePath) => [
    filePath,
    createHash("sha256").update(readFileSync(path.join(process.cwd(), filePath))).digest("hex")
  ]));
}

function retainedIllustrationBytesHash() {
  const retainedAssets = primaryPages.flatMap((page) =>
    (["concept", "worked-example"] as const)
      .map((slot) => getMainlandHjbPrimaryLessonIllustration(page.topic.id, slot))
      .filter((illustration) => illustration !== null)
      .map((illustration) => ({
        id: illustration.id,
        bytesSha256: createHash("sha256")
          .update(readFileSync(path.join(process.cwd(), "public", illustration.src.slice(1))))
          .digest("hex")
      }))
  );
  assert.equal(retainedAssets.length, 94);
  return sha256(retainedAssets);
}

function gradeCounts(pages: ReviewPage[]) {
  return Object.fromEntries(
    [...Map.groupBy(pages, (page) => page.topic.grade).entries()]
      .map(([grade, gradePages]) => [grade, gradePages.length])
  );
}

function displayedQuestion(id: string) {
  const question = allDisplayedQuestions.find((candidate) => candidate.id === id);
  assert.ok(question, `${id} must remain on a reviewed lesson page`);
  return question;
}

function displayedPracticePayload(page: ReviewPage) {
  return page.payload.displayedPractice as Array<{
    id: string;
    gradingSemantics: {
      acceptedDisplayedOptionIndexes: number[];
      acceptedDisplayedOptionCount: number;
      runtimeSelectionChecks: Array<{ acceptedByProductionGrader: boolean }>;
    };
  }>;
}

function learnerFacingEnglishSurface(page: ReviewPage) {
  const payload = page.payload as {
    topic: Record<string, unknown>;
    lessonPage: Record<string, unknown>;
    displayedPractice: Array<Record<string, unknown>>;
  };

  return {
    topic: payload.topic,
    lessonPage: payload.lessonPage,
    displayedPractice: payload.displayedPractice.map((question) => ({
      topic: question.topic,
      prompt: question.prompt,
      options: question.options,
      explanationShownAfterAttempt: question.explanationShownAfterAttempt,
      correctAnswerShownAfterWrongAttempt: question.correctAnswerShownAfterWrongAttempt,
      diagram: question.diagram,
      assets: question.assets
    }))
  };
}

function stringLeaves(value: unknown, location = "payload"): Array<{ location: string; value: string }> {
  if (typeof value === "string") return [{ location, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => stringLeaves(item, `${location}[${index}]`));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => stringLeaves(item, `${location}.${key}`));
}

test("HJB primary and junior inventory is exactly 92 pages with five displayed questions per page", () => {
  assert.equal(primaryPages.length, 70);
  assert.equal(juniorPages.length, 22);
  assert.deepEqual(gradeCounts(primaryPages), { P1: 13, P2: 11, P3: 13, P4: 11, P5: 8, P6: 14 });
  assert.deepEqual(gradeCounts(juniorPages), { S1: 9, S2: 8, S3: 5 });
  assert.ok(allPages.every((page) => page.practice.length === 5));
  assert.equal(primaryPages.flatMap((page) => page.practice).length, 350);
  assert.equal(juniorPages.flatMap((page) => page.practice).length, 110);
  assert.equal(new Set(allPages.map((page) => page.topic.id)).size, 92);
  assert.equal(new Set(allDisplayedQuestions.map((question) => question.id)).size, 460);
});

test("learner-facing English HJB lesson payload excludes internal compatibility and MAIS review labels", () => {
  const internalEnglishLabelPattern = /(?:compatibility strand|MAIS transition review|\bMAIS\b)/iu;

  assert.equal(allEnglishPages.length, 92);
  for (const page of allEnglishPages) {
    for (const leaf of stringLeaves(learnerFacingEnglishSurface(page))) {
      assert.doesNotMatch(
        leaf.value,
        internalEnglishLabelPattern,
        `${page.topic.id}/${leaf.location} must remain learner-facing`
      );
    }
  }
});

test("HJB reviewed IDs, answers, raw sources, and retained visual bytes stay fingerprint-locked", () => {
  assert.deepEqual({
    primaryIdMatrix: sha256(pageIdMatrix(primaryPages)),
    juniorIdMatrix: sha256(pageIdMatrix(juniorPages)),
    primaryAnswerSurface: sha256(answerSurface(primaryPages)),
    juniorAnswerSurface: sha256(answerSurface(juniorPages)),
    rawSources: rawSourceHashes(),
    retainedIllustrationBytes: retainedIllustrationBytesHash()
  }, {
    primaryIdMatrix: "435498b5d878b18432f41411abdebef02797e1ba51d78d8d49f8dc2edef4c3da",
    juniorIdMatrix: "e6c8d0f2fe2cec82498d7ec036ed473ccf2c053706245d6271b1f772b19f7db8",
    primaryAnswerSurface: "ab4eae8b5dc5f04b446d1e0fdd75f990f6880844b1cb1a3fdb512f386d0535f9",
    juniorAnswerSurface: "794544be44366babd6252da5a447baebca29cda35ab38c0e40f97ad2288bcef3",
    rawSources: {
      "data/mainlandHjbPrimaryTopics.ts": "d099b6dc3cbd475dc3c28e1e28b602c3bb42ae2600a7a7dea47f9fc880151fc6",
      "data/mainlandHjbJuniorTopics.ts": "d679f0a805a9ac8a3b176511f5537bce1c0f3b1359e06c237d6b9dea30700c23",
      "data/mainlandHjbPrimaryQuestions.ts": "b998f1710b4903a09f3329a5e56dfd64b2b80f1c759417f7934e1f0c4d4754a4",
      "data/mainlandHjbJuniorQuestions.ts": "b662a1d5ad19b62b051c0e21646a4878bc3d91d510b14096402c47ccd9166b9e",
      "data/mainlandHjbPrimaryLessons.ts": "baf5c465f41cd004da0dff4f6ccce6b5b7e3c27430392cc1754b6a5fd2203e05",
      "data/mainlandHjbJuniorLessons.ts": "649e0940e758848316a0a8e2f54ffa6803b6575981ab61e2ca83f2b5e5def270",
      "data/mainlandHjbPrimaryLessonIllustrations.ts": "132f465ae0f14a4c2317c49b5fde36cb456312abc80ecbbcdb7793dde0d04ebe",
      "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json": "915ea8c89f7d92e405ee5dbf6c3ecf170e8091dfc8573770172feb09dc30d04b",
      "data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json": "c338cd5ab0885a887605ce3cbb8feb2055811d3f8c4bea0bfb9e564ea67b1d74",
      "data/generated-content/mainland-hjb-junior-lessons-v1/lessons.json": "1041a129da8f68646e547e7151554627366adfe01122f82b6ca2c5b5658aa4c8"
    },
    retainedIllustrationBytes: "61c8fac2236145bc23d6cd3a845ceca9d33263fbdd2ef429dcb63b3fb5f5205f"
  });
});

test("every displayed HJB multiple-choice card accepts exactly one clicked option under the production matcher", () => {
  for (const page of allPages) {
    const payloadById = new Map(displayedPracticePayload(page).map((item) => [item.id, item]));
    for (const question of page.practice) {
      if (question.type !== "multiple-choice") continue;
      const gradingQuestion = {
        answer: question.answer,
        accepted_answers: question.acceptedAnswers,
        options: question.options
      };
      const acceptedIndexes = (question.options ?? [])
        .map((option, optionIndex) => questionAnswerMatches(gradingQuestion, simplified(option)) ? optionIndex : -1)
        .filter((optionIndex) => optionIndex >= 0);
      assert.deepEqual(acceptedIndexes.length, 1, `${question.id} must accept exactly one submitted option`);

      const payloadQuestion = payloadById.get(question.id);
      assert.ok(payloadQuestion, `${question.id} must be represented in the whole-page review payload`);
      assert.equal(payloadQuestion.gradingSemantics.acceptedDisplayedOptionCount, 1, `${question.id} payload count`);
      assert.deepEqual(payloadQuestion.gradingSemantics.acceptedDisplayedOptionIndexes, acceptedIndexes, `${question.id} payload indexes`);
      assert.equal(
        payloadQuestion.gradingSemantics.runtimeSelectionChecks.filter((check) => check.acceptedByProductionGrader).length,
        1,
        `${question.id} runtime selection checks`
      );
    }
  }
});

test("displayed HJB questions contain unique choices, clean prompts, safe aliases, and complete feedback", () => {
  const unsafeAliasPattern = /(?:term-[a-f0-9]+(?:-[a-f0-9]+)*|[\u0000-\u001f\u007f])/iu;
  const embeddedOptionBlockPattern = /(?:^|\n)\s*A[.．、]\s*[\s\S]+(?:\n|；|;)\s*B[.．、]/u;

  for (const question of allDisplayedQuestions) {
    const prompt = simplified(question.prompt);
    const explanation = simplified(question.explanation);
    assert.ok(prompt.trim(), `${question.id} prompt`);
    assert.ok(question.answer.trim(), `${question.id} canonical answer`);
    assert.ok(explanation.trim(), `${question.id} explanation`);
    assert.doesNotMatch(prompt, embeddedOptionBlockPattern, `${question.id} prompt must not duplicate structured options`);
    assert.doesNotMatch(prompt, /(?:^|\n)变式\s*\d+/u, `${question.id} must not expose an authoring-only variant label`);
    for (const alias of question.acceptedAnswers ?? []) {
      assert.doesNotMatch(alias, unsafeAliasPattern, `${question.id} unsafe accepted answer`);
    }

    if (question.type === "multiple-choice") {
      const options = question.options?.map(simplified) ?? [];
      assert.ok(options.length >= 2, `${question.id} multiple-choice options`);
      assert.equal(new Set(options.map((option) => option.normalize("NFKC").replace(/\s+/gu, ""))).size, options.length, `${question.id} unique options`);
    }
  }
});

test("reviewed HJB lesson blocks are substantive, student-facing, and structurally complete", () => {
  const expectedTypes = ["concept", "worked-example", "checklist", "extension", "teacher-guide"];
  const internalTextPattern = /(?:term-[a-f0-9]+|pending-s18|production-integrated|passed-safe-rag|reviewStatus|integrationStatus|MAIS-authored|用 MAIS 原创情境|在 MAIS 版本中|所有例子都使用新编数值)/iu;

  for (const page of allPages) {
    assert.deepEqual(page.seed.blocks.map((block) => block.type), expectedTypes, `${page.topic.id} block sequence`);
    for (const block of page.seed.blocks) {
      assert.ok(simplified(block.title).trim(), `${page.topic.id}/${block.idSuffix} title`);
      const content = block.content ? simplified(block.content) : "";
      const items = block.items?.map(simplified) ?? [];
      assert.ok(content.trim() || items.some((item) => item.trim()), `${page.topic.id}/${block.idSuffix} body`);
      assert.doesNotMatch([content, ...items].join("\n"), internalTextPattern, `${page.topic.id}/${block.idSuffix} internal text`);
    }
  }

  for (const page of primaryPages) {
    const workedExample = page.seed.blocks.find((block) => block.type === "worked-example");
    assert.ok(workedExample?.content);
    assert.doesNotMatch(simplified(workedExample.content), /(?:^|\s)[A-F][.．、]\s*[A-F][.．、]/u, `${page.topic.id} duplicate option labels`);
  }

  for (const page of juniorPages) {
    const concept = page.seed.blocks.find((block) => block.type === "concept");
    const workedExample = page.seed.blocks.find((block) => block.type === "worked-example");
    assert.ok(concept?.content);
    assert.ok(workedExample?.content);
    const conceptText = simplified(concept.content);
    const workedText = simplified(workedExample.content);
    assert.ok(conceptText.length >= 50, `${page.topic.id} reviewed concept must be substantive`);
    assert.match(workedText, /例题：/u, `${page.topic.id} worked example`);
    assert.match(workedText, /小检查 1：/u, `${page.topic.id} checkpoint 1`);
    assert.match(workedText, /小检查 2：/u, `${page.topic.id} checkpoint 2`);
    assert.ok((workedText.match(/答案：/gu) ?? []).length >= 3, `${page.topic.id} worked responses`);
    assert.doesNotMatch(conceptText, /面对一个新的数学任务|先看清题目给了什么/u, `${page.topic.id} generic placeholder concept`);
  }
});

test("HJB primary runtime suppresses exactly the 46 illustrations that failed visual domain or grade-fit QA", () => {
  const suppressedTopicIds = new Set([
    "hjb-primary-p1-upper-solids-introduction",
    "hjb-primary-p1-upper-review",
    "hjb-primary-p1-lower-length-measurement",
    "hjb-primary-p1-lower-body-rulers-math-square",
    "hjb-primary-p1-lower-review",
    "hjb-primary-p2-upper-school-position-direction",
    "hjb-primary-p2-upper-within-100-add-sub",
    "hjb-primary-p2-upper-classification",
    "hjb-primary-p2-upper-math-square-review",
    "hjb-primary-p2-lower-math-square-review",
    "hjb-primary-p3-upper-review-place-value-operations",
    "hjb-primary-p3-upper-time-measurement",
    "hjb-primary-p3-upper-math-square-review",
    "hjb-primary-p3-lower-math-square-review",
    "hjb-primary-p4-upper-review-operations-fractions",
    "hjb-primary-p4-upper-fraction-extension",
    "hjb-primary-p4-upper-four-operations-problem-solving",
    "hjb-primary-p4-upper-review-integration",
    "hjb-primary-p4-lower-review-operation-properties",
    "hjb-primary-p4-lower-review-integration",
    "hjb-primary-p6-upper-divisibility",
    "hjb-primary-p6-upper-fractions",
    "hjb-primary-p6-lower-rational-numbers"
  ]);
  assert.equal(mainlandHjbPrimaryLessonIllustrations.length, 140);
  assert.equal(suppressedTopicIds.size, 23);

  const runtimeIllustrations = primaryPages.flatMap((page) =>
    (["concept", "worked-example"] as const).map((slot) => ({
      topicId: page.topic.id,
      slot,
      illustration: getMainlandHjbPrimaryLessonIllustration(page.topic.id, slot)
    }))
  );
  assert.equal(runtimeIllustrations.length, 140);
  assert.equal(runtimeIllustrations.filter((item) => item.illustration === null).length, 46);
  assert.equal(runtimeIllustrations.filter((item) => item.illustration !== null).length, 94);

  for (const item of runtimeIllustrations) {
    assert.equal(
      item.illustration === null,
      suppressedTopicIds.has(item.topicId),
      `${item.topicId}/${item.slot} suppression verdict`
    );
  }
});

test("targeted HJB mathematical and response-contract remediations remain in place", () => {
  assert.match(simplified(displayedQuestion("hjb-primary-ds-v1-p1-175").prompt), /6时半/u);
  assert.equal(simplified(displayedQuestion("hjb-primary-ds-v1-p2-187").options?.[3] as LocalizedText), "D. 4010");
  assert.match(simplified(displayedQuestion("hjb-primary-ds-v1-p6-091").options?.[1] as LocalizedText), /^B\..*4π/u);

  const coachBudget = displayedQuestion("hjb-junior-ds-v2-s1-252");
  assert.match(simplified(coachBudget.prompt), /240名[\s\S]*5辆[\s\S]*1400元/u);
  assert.equal(coachBudget.answer, "3");
  const integerRange = displayedQuestion("hjb-junior-ds-v2-s1-379");
  assert.deepEqual(
    [integerRange.answer, ...(integerRange.acceptedAnswers ?? [])].filter((answer) => /^[5-9]$/u.test(answer)),
    ["5", "6", "7", "8", "9"]
  );
  assert.ok(!(displayedQuestion("hjb-junior-ds-v2-s3-168").acceptedAnswers ?? []).some((answer) => answer.trim() === "x≥50"));
  assert.match(simplified(displayedQuestion("hjb-junior-ds-v2-s3-404").explanation), /1\.36/u);
  assert.doesNotMatch(simplified(displayedQuestion("hjb-junior-ds-v2-s3-404").explanation), /1\.56/u);

  assert.match(displayedQuestion("hjb-primary-ds-v1-p2-006").answer, /验算/u);
  assert.match(displayedQuestion("hjb-primary-ds-v1-p2-078").answer, /方法一[\s\S]*方法二/u);
  assert.match(displayedQuestion("hjb-primary-ds-v1-p5-006").answer, /估算[\s\S]*计算/u);
  assert.match(displayedQuestion("hjb-primary-ds-v1-p5-009").answer, /估算[\s\S]*合理/u);
  assert.doesNotMatch(displayedQuestion("hjb-primary-ds-v1-p5-096").answer, /合理即可/u);
  assert.match(displayedQuestion("hjb-primary-ds-v1-p5-096").answer, /因为|说明|数据/u);
  assert.match(displayedQuestion("hjb-primary-ds-v1-p6-165").answer, /因为/u);
  assert.match(displayedQuestion("hjb-junior-ds-v2-s1-318").answer, /因为/u);
  assert.match(displayedQuestion("hjb-junior-ds-v2-s2-315").answer, /平移向量/u);
});
