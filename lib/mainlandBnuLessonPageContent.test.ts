import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import juniorLessonPackJson from "../data/generated-content/mainland-bnu-junior-lessons-v1/lessons.json";
import { mainlandBnuJuniorLessonSeeds } from "../data/mainlandBnuJuniorLessons";
import { mainlandBnuJuniorQuestions } from "../data/mainlandBnuJuniorQuestions";
import { mainlandBnuJuniorTopicMetadata } from "../data/mainlandBnuJuniorTopics";
import { mainlandBnuPrimaryLessonSeeds } from "../data/mainlandBnuPrimaryLessons";
import { mainlandBnuPrimaryQuestions } from "../data/mainlandBnuPrimaryQuestions";
import { mainlandBnuPrimaryTopicMetadata } from "../data/mainlandBnuPrimaryTopics";
import { toSafeMainlandSimplifiedText } from "../data/hjbQuestionLocalization";
import { dedupePracticeQuestions } from "./practiceQuestionDeduping";
import type { ProductionLessonSeed } from "../data/lessons";
import type { Question } from "@/types";

const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);
const internalLabelPattern = /(?:MAIS 自主设计|S18|\bQA\b|审核(?:记录|标签)|修复后|原答案|原解析|候选包|生成器|term-[0-9a-f]+)/iu;
const unsafeAliasPattern = /(?:term-[0-9a-f]+|\bnot is\b|\bis not is\b|\bright, times\b|, times\b)/iu;

type LessonPage = {
  seed: ProductionLessonSeed;
  questions: Question[];
};

function displayedPracticeQuestions(questionIds: string[] | undefined, questionBank: Question[]) {
  const questionById = new Map(questionBank.map((question) => [question.id, question]));
  const candidates = (questionIds ?? [])
    .map((questionId) => questionById.get(questionId))
    .filter((question): question is Question => Boolean(question));
  const deduped = dedupePracticeQuestions(candidates) as Question[];
  const selected = deduped.slice(0, lessonPracticeQuestionLimit);

  if (selected.some((question) => handwritingCapableQuestionTypes.has(question.type))) return selected;
  const handwritingQuestion = deduped.find((question) => handwritingCapableQuestionTypes.has(question.type));
  return handwritingQuestion
    ? [...selected.slice(0, lessonPracticeQuestionLimit - 1), handwritingQuestion]
    : selected;
}

function lessonPages(seeds: ProductionLessonSeed[], questionBank: Question[]): LessonPage[] {
  return seeds.map((seed) => ({
    seed,
    questions: displayedPracticeQuestions(seed.practiceQuestionIds, questionBank)
  }));
}

function countByType(questions: Question[]) {
  return questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.type] = (counts[question.type] ?? 0) + 1;
    return counts;
  }, {});
}

function simplifiedBlockText(seed: ProductionLessonSeed) {
  return seed.blocks.flatMap((block) => [
    block.title.zhHans ?? "",
    block.content?.zhHans ?? "",
    ...(block.items ?? []).map((item) => item.zhHans ?? "")
  ]);
}

function sourcePayload(pages: LessonPage[]) {
  return pages.map(({ seed, questions }) => ({
    topicId: seed.topicId,
    title: seed.title.zhHans,
    description: seed.description.zhHans,
    blocks: seed.blocks.map((block) => ({
      idSuffix: block.idSuffix,
      type: block.type,
      title: block.title.zhHans,
      content: block.content?.zhHans ?? null,
      items: block.items?.map((item) => item.zhHans) ?? null
    })),
    questions: questions.map((question) => ({
      id: question.id,
      grade: question.grade,
      topicId: question.topicId,
      type: question.type,
      prompt: question.prompt.zhHans,
      options: question.options?.map((option) => option.zhHans) ?? null,
      answer: question.answer,
      explanation: question.explanation.zhHans
    }))
  }));
}

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertPageContract(
  pages: LessonPage[],
  expectedPageCount: number,
  expectedQuestionCount: number,
  topicMetadata: Record<string, { grade: string }>
) {
  assert.equal(pages.length, expectedPageCount);
  const displayedQuestions = pages.flatMap((page) => page.questions);
  assert.equal(displayedQuestions.length, expectedQuestionCount);
  assert.equal(new Set(displayedQuestions.map((question) => question.id)).size, expectedQuestionCount);

  pages.forEach(({ seed, questions }) => {
    assert.equal(questions.length, lessonPracticeQuestionLimit, `${seed.topicId} must render exactly five practice questions`);
    assert.equal(seed.blocks.length, 5, `${seed.topicId} must render the five approved lesson blocks`);
    assert.ok(seed.title.zhHans?.trim(), `${seed.topicId} needs a Simplified Chinese title`);
    assert.ok(seed.description.zhHans?.trim(), `${seed.topicId} needs a Simplified Chinese description`);
    assert.ok(topicMetadata[seed.topicId], `${seed.topicId} needs topic metadata`);

    simplifiedBlockText(seed).filter(Boolean).forEach((value) => {
      assert.equal(internalLabelPattern.test(value), false, `${seed.topicId} exposes an internal authoring label: ${value}`);
      assert.equal(toSafeMainlandSimplifiedText(value), value, `${seed.topicId} contains non-Simplified lesson text: ${value}`);
    });

    questions.forEach((question) => {
      assert.equal(question.topicId, seed.topicId, `${question.id} is on the wrong lesson page`);
      assert.equal(question.grade, topicMetadata[seed.topicId].grade, `${question.id} is at the wrong grade`);
      assert.ok(question.prompt.zhHans?.trim(), `${question.id} needs a Simplified Chinese prompt`);
      assert.ok(question.answer.trim(), `${question.id} needs a canonical answer`);
      assert.ok(question.explanation.zhHans?.trim(), `${question.id} needs a worked explanation`);
      assert.ok(question.acceptedAnswers?.includes(question.answer), `${question.id} must accept its canonical answer`);
      assert.equal(internalLabelPattern.test(`${question.prompt.zhHans}\n${question.explanation.zhHans}`), false, `${question.id} exposes remediation metadata`);
      assert.equal((question.acceptedAnswers ?? []).some((alias) => unsafeAliasPattern.test(alias)), false, `${question.id} exposes a heuristic alias`);

      if (question.type === "multiple-choice") {
        const options = (question.options ?? []).map((option) => (option.zhHans ?? option.zh).trim());
        assert.equal(options.length, 4, `${question.id} must have four options`);
        assert.equal(new Set(options).size, 4, `${question.id} must have four distinct options`);
        assert.equal(options.filter((option) => option === question.answer).length, 1, `${question.id} must have one keyed option`);
      } else {
        assert.equal(question.options?.length ?? 0, 0, `${question.id} has options incompatible with ${question.type}`);
      }
    });
  });
}

test("BNU primary and junior LessonView inventory is the exact audited 132-page, 660-question runtime selection", () => {
  const primaryPages = lessonPages(mainlandBnuPrimaryLessonSeeds, mainlandBnuPrimaryQuestions);
  const juniorPages = lessonPages(mainlandBnuJuniorLessonSeeds, mainlandBnuJuniorQuestions);

  assertPageContract(primaryPages, 97, 485, mainlandBnuPrimaryTopicMetadata);
  assertPageContract(juniorPages, 35, 175, mainlandBnuJuniorTopicMetadata);
  assert.deepEqual(countByType(primaryPages.flatMap((page) => page.questions)), {
    "multiple-choice": 211,
    "fill-in": 170,
    "short-answer": 104
  });
  assert.deepEqual(countByType(juniorPages.flatMap((page) => page.questions)), {
    "short-answer": 62,
    "fill-in": 51,
    "multiple-choice": 62
  });
  assert.equal(
    sha256(sourcePayload(primaryPages)),
    "a022011f75645d0a131acd0e9fbf75b7d02b49731aba121ccc5ca4e819ad3436",
    "BNU primary displayed-source inventory changed and needs complete re-audit"
  );
  assert.equal(
    sha256(sourcePayload(juniorPages)),
    "61272cced9a5ab70673890faeaa92bade0a7903c1e8cfd919dd264fee46f0856",
    "BNU junior displayed-source inventory changed and needs complete re-audit"
  );
});

test("every BNU primary representative worked example is one of the five independently audited displayed questions", () => {
  const primaryPages = lessonPages(mainlandBnuPrimaryLessonSeeds, mainlandBnuPrimaryQuestions);

  primaryPages.forEach(({ seed, questions }) => {
    const representative = mainlandBnuPrimaryQuestions.find((question) => question.topicId === seed.topicId);
    assert.ok(representative, `${seed.topicId} needs a representative question`);
    assert.ok(questions.some((question) => question.id === representative?.id), `${seed.topicId} representative example is outside the audited five`);
    const workedExample = seed.blocks.find((block) => block.type === "worked-example")?.content?.zhHans ?? "";
    assert.ok(workedExample.includes(representative?.answer ?? ""), `${seed.topicId} worked example must display its answer`);
    assert.ok(workedExample.includes(representative?.explanation.zhHans ?? ""), `${seed.topicId} worked example must display its explanation`);
    assert.equal(/(?:^|\s)[A-F][.．、]\s*[A-F][.．、]/u.test(workedExample), false, `${seed.topicId} duplicates option labels`);
  });
});

test("every BNU primary concept method is a non-checkpoint near-transfer example while all eight checkpoint IDs stay frozen", () => {
  const checkpointPayload = mainlandBnuPrimaryLessonSeeds.map((seed) => ({
    topicId: seed.topicId,
    practiceQuestionIds: seed.practiceQuestionIds
  }));

  assert.equal(mainlandBnuPrimaryLessonSeeds.length, 97);
  assert.equal(
    checkpointPayload.reduce((count, seed) => count + (seed.practiceQuestionIds?.length ?? 0), 0),
    776,
    "every BNU primary lesson must retain its exact eight-question checkpoint"
  );
  assert.equal(
    sha256(checkpointPayload),
    "112a50ec7aa43ef415a2f7c4286c3dc8f81c8550439937eb93a930be270fe152",
    "BNU primary checkpoint IDs or ordering changed"
  );

  const languages = ["en", "zh", "zhHans"] as const;
  mainlandBnuPrimaryLessonSeeds.forEach((seed) => {
    const workedQuestion = mainlandBnuPrimaryQuestions.find((question) => question.topicId === seed.topicId);
    const concept = seed.blocks.find((block) => block.type === "concept")?.content;
    const workedExample = seed.blocks.find((block) => block.type === "worked-example")?.content;
    const checkpointIds = new Set(seed.practiceQuestionIds ?? []);

    assert.ok(workedQuestion, `${seed.topicId} needs its frozen worked-example question`);
    assert.ok(concept, `${seed.topicId} needs concept content`);
    assert.ok(workedExample, `${seed.topicId} needs worked-example content`);

    languages.forEach((language) => {
      const workedExplanation = workedQuestion.explanation[language] ?? workedQuestion.explanation.zh;
      assert.ok(
        !(concept[language] ?? concept.zh).includes(workedExplanation),
        `${seed.topicId} ${language} concept repeats the worked-example explanation`
      );
      assert.ok(
        (workedExample[language] ?? workedExample.zh).includes(workedExplanation),
        `${seed.topicId} ${language} worked example lost its checked explanation`
      );
    });

    const conceptMethodQuestion = mainlandBnuPrimaryQuestions.find((question) => (
      question.topicId === seed.topicId &&
      question.id !== workedQuestion.id &&
      !checkpointIds.has(question.id) &&
      languages.every((language) => {
        const explanation = question.explanation[language] ?? question.explanation.zh;
        return (concept[language] ?? concept.zh).includes(explanation);
      })
    ));

    assert.ok(
      conceptMethodQuestion,
      `${seed.topicId} concept method must come from a distinct non-checkpoint question`
    );
  });
});

test("BNU primary decimal-multiplication concept uses an actual multiplication method", () => {
  const topicId = "bnu-primary-p4-lower-decimal-multiplication";
  const seed = mainlandBnuPrimaryLessonSeeds.find((candidate) => candidate.topicId === topicId);
  const methodQuestion = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v1-p4-181");
  assert.ok(seed);
  assert.ok(methodQuestion);
  assert.equal(methodQuestion.topicId, topicId);
  assert.equal(seed.practiceQuestionIds?.includes(methodQuestion.id), false, "the concept source must remain outside checkpoints");

  const concept = seed.blocks.find((block) => block.type === "concept")?.content;
  assert.ok(concept);
  (["en", "zh", "zhHans"] as const).forEach((language) => {
    assert.ok(
      (concept[language] ?? concept.zh).includes(methodQuestion.explanation[language] ?? methodQuestion.explanation.zh),
      `${language} concept should use the reviewed p4-181 method`
    );
  });
  assert.match(concept.zhHans ?? concept.zh, /0\.8×5=4\.0/u);
  assert.match(concept.zhHans ?? concept.zh, /1\.5×3=4\.5/u);
  assert.doesNotMatch(concept.zhHans ?? concept.zh, /÷|除法/u);
});

test("BNU source regressions keep repaired geometry, domain conditions, and explanations mathematically explicit", () => {
  const primaryTriangle = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v2-p1-192");
  assert.ok(primaryTriangle);
  assert.equal(primaryTriangle?.answer, "平行四边形");
  assert.deepEqual(primaryTriangle?.acceptedAnswers, ["平行四边形", "平行四邊形", "parallelogram"]);
  assert.match(primaryTriangle?.explanation.zhHans ?? "", /旋转180°.*两组对边分别平行且相等/u);

  const fourCubeViews = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v1-p3-018");
  assert.ok(fourCubeViews);
  assert.equal(
    fourCubeViews?.prompt.zhHans,
    "用4个相同的小正方体搭图形：底层3个横着排成一行，再在中间那个上面放1个。请描述从前面和从上面看到的形状。"
  );
  assert.equal(fourCubeViews?.answer, "从前面看下排3个、上排中间1个；从上面看横排3个");
  assert.deepEqual(fourCubeViews?.acceptedAnswers, [
    "从前面看下排3个、上排中间1个；从上面看横排3个",
    "從前面看下排3個、上排中間1個；從上面看橫排3個",
    "From the front, there are 3 in the lower row and 1 in the middle of the upper row; from above, there are 3 in a row"
  ]);
  assert.equal(
    fourCubeViews?.explanation.zhHans,
    "三个底层正方体形成横排，上层正方体投影在中间位置；从上面看，上层与中间底层重合，所以仍是横排3个。"
  );
  assert.doesNotMatch(
    `${fourCubeViews?.prompt.zhHans ?? ""}\n${fourCubeViews?.explanation.zhHans ?? ""}`,
    /正面看(?:是)?横着排成一行的2个正方形/u
  );

  const juniorById = new Map(mainlandBnuJuniorQuestions.map((question) => [question.id, question]));
  const exponentDivision = juniorById.get("bnu-junior-ds-v1-s1-257");
  assert.match(exponentDivision?.prompt.zhHans ?? "", /a≠0/u);
  assert.match(exponentDivision?.explanation.zhHans ?? "", /除式.*不能为 0/u);

  const parallelProofIds = [235, 236, 238, 239, 242].map((number) => `bnu-junior-ds-v1-s2-${number}`);
  parallelProofIds.forEach((questionId) => {
    assert.match(juniorById.get(questionId)?.prompt.zhHans ?? "", /点A、C位于直线EF的同一侧/u, `${questionId} needs an explicit diagram orientation`);
  });
  assert.equal(juniorById.get("bnu-junior-ds-v1-s2-235")?.answer, "①");
  assert.equal(juniorById.get("bnu-junior-ds-v1-s2-238")?.answer, "2个");
  assert.equal(juniorById.get("bnu-junior-ds-v1-s2-242")?.answer, "选择条件①和②或③和④。①和②给出同旁内角互补，可得AB∥CD；③和④给出同位角相等，也可得AB∥CD。");

  assert.match(juniorById.get("bnu-junior-ds-v1-s2-311")?.prompt.zhHans ?? "", /x、y均为非负整数/u);
  assert.match(juniorById.get("bnu-junior-ds-v1-s2-425")?.explanation.zhHans ?? "", /x≠-2、0、2/u);

  const foldedRectangle = juniorById.get("bnu-junior-ds-v1-s3-010");
  assert.match(foldedRectangle?.prompt.zhHans ?? "", /AB=6，BC=8/u);
  assert.equal(foldedRectangle?.answer, "3");
  assert.match(foldedRectangle?.explanation.zhHans ?? "", /DE=3/u);

  const repairedExplanationIds = [
    "bnu-junior-ds-v1-s1-257",
    "bnu-junior-ds-v1-s1-339",
    ...parallelProofIds,
    "bnu-junior-ds-v1-s2-281",
    "bnu-junior-ds-v1-s2-425",
    "bnu-junior-ds-v1-s2-463",
    "bnu-junior-ds-v1-s3-010",
    "bnu-junior-ds-v1-s3-062",
    "bnu-junior-ds-v1-s3-406"
  ];
  repairedExplanationIds.forEach((questionId) => {
    const explanation = juniorById.get(questionId)?.explanation.zhHans ?? "";
    assert.ok(explanation.trim(), `${questionId} needs a complete current explanation`);
    assert.equal(/修复后|原答案|原解析|审核|DeepSeek|QA/iu.test(explanation), false, `${questionId} exposes stale remediation prose`);
  });
});

test("all 35 displayed BNU junior concept lessons use topic-specific mathematical language", () => {
  type SourceLesson = {
    id: string;
    metadata: { topicId: string };
    studentLesson: { zhHans: { conceptExplanation: string; glossary: Array<{ term: string }> } };
  };
  const sourceLessons = (juniorLessonPackJson as { lessons: SourceLesson[] }).lessons;
  const firstLessonByTopic = new Map<string, SourceLesson>();
  sourceLessons.forEach((lesson) => {
    if (!firstLessonByTopic.has(lesson.metadata.topicId) || /-lesson-1$/.test(lesson.id)) {
      firstLessonByTopic.set(lesson.metadata.topicId, lesson);
    }
  });

  assert.equal(firstLessonByTopic.size, 35);
  const expectedGlossaryTerms: Record<string, string[]> = {
    "bnu-junior-s1-lower-intersecting-parallel-lines": ["对顶角", "邻补角", "同位角", "平行线判定"],
    "bnu-junior-s2-upper-parallel-lines-proof": ["同位角", "内错角", "同旁内角", "平行线判定"],
    "bnu-junior-s2-lower-triangle-proof-applications": ["全等三角形", "SSS 判定", "对应边", "等腰三角形"],
    "bnu-junior-s2-lower-parallelograms": ["平行四边形", "对边", "对角线互相平分", "平行四边形判定"],
    "bnu-junior-s3-upper-similar-figures": ["相似图形", "对应边", "相似比", "AA 判定"]
  };

  Object.entries(expectedGlossaryTerms).forEach(([topicId, terms]) => {
    const sourceLesson = firstLessonByTopic.get(topicId);
    assert.ok(sourceLesson, `${topicId} needs a displayed source lesson`);
    assert.deepEqual(sourceLesson?.studentLesson.zhHans.glossary.map((entry) => entry.term), terms);
    assert.equal(/学习要区分“看起来像”|写出“.+”中一个图形对象/u.test(sourceLesson?.studentLesson.zhHans.conceptExplanation ?? ""), false);
  });
});
