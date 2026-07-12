import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { californiaKnowledgePointForTopic } from "./usCaliforniaKnowledgePoints";
import { getUsCaliforniaLessonIllustration } from "./usCaliforniaLessonIllustrations";
import {
  californiaElementaryMicroLessonCoverageRecords,
  californiaElementaryMicroLessonSeeds,
  californiaK5TextbookLessonSeeds,
  usCaliforniaLessonSeeds
} from "./usCaliforniaLessons";
import { californiaElementaryMicroLessonSpecs } from "./usCaliforniaMicroLessons";
import {
  californiaElementaryMicroLessonTopics,
  usCaliforniaTopics,
  usCaliforniaTopicById
} from "./usCaliforniaTopics";
import {
  expectedUnitedStatesCaliforniaK5QuestionCount,
  usCaliforniaQuestions
} from "./usCaliforniaQuestions";

const blockedWorkedExamplePatterns = [
  /Try this approved California checkpoint/i,
  /Activity\s+\d+\s*:\s*DeepSeek practice\s*:/i
];
const blockedGeneratedQuestionPromptPatterns = [
  /^(?:Activity|Practice activity)\s*\d+\s*:/i,
  /^活動\s*\d+\s*[:：]/,
  /^活动\s*\d+\s*[:：]/,
  /^練習活動\s*\d+\s*[:：]/,
  /^练习活动\s*\d+\s*[:：]/,
  /DeepSeek\s*(?:practice|練習|练习)?/i,
  /深度求索\s*(?:練習|练习)?/
];
const blockedGenericK5ConceptPatterns = [
  /Addition and subtraction stories tell how a quantity changes/i,
  /Draw the story first so each number has a job/i,
  /Addition can join parts or find a missing whole/i,
  /Use counters, ten-frames, number lines, and equations/i,
  /Start with a quick notice-and-wonder/i,
  /Students describe the quantities/i,
  /before calculating/i,
  /In this MAIS lesson, students move/i,
  /concrete examples to a symbolic or written explanation/i,
  /standard identifiers/i,
  /alignment metadata/i,
  /\bIXL\b/i,
  /\bDeepSeek\b/i
];

const californiaK5Grades = new Set(["K", "P1", "P2", "P3", "P4", "P5"]);
const liveKnowledgePointPracticeIdPattern = /^us-ca-k5-knowledge-point-practice-v1-/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const requestedGrade1KnowledgePointCodes = [
  "1-H.1",
  "1-H.2",
  "1-H.3",
  "1-H.4",
  "1-H.5",
  "1-H.6",
  "1-L.1",
  "1-L.2",
  "1-L.3",
  "1-L.4",
  "1-L.5",
  "1-L.6"
];

const ixlSourceTitles = [
  "Addition word problems with pictures - sums up to 10",
  "Write addition sentences for word problems with pictures - sums up to 10",
  "Build cube trains to solve addition word problems - sums up to 10",
  "Addition word problems - sums up to 10",
  "Model and write addition sentences for word problems - sums up to 10",
  "Addition sentences for word problems - sums up to 10",
  "Subtraction word problems with pictures - up to 10",
  "Write subtraction sentences for word problems with pictures - up to 10",
  "Use cube trains to solve subtraction word problems - up to 10",
  "Subtraction word problems - up to 10",
  "Model and write subtraction sentences for word problems - up to 10",
  "Subtraction sentences for \"take apart\" word problems - up to 10"
];

test("California K-5 textbook lessons and 492-question knowledge-point practice are live", () => {
  assert.equal(californiaK5TextbookLessonSeeds.length, 29);
  assert.equal(expectedUnitedStatesCaliforniaK5QuestionCount, 492);

  const californiaK5PracticeQuestions = usCaliforniaQuestions.filter((question) => californiaK5Grades.has(question.grade));
  const californiaK5PracticeQuestionById = new Map(californiaK5PracticeQuestions.map((question) => [question.id, question]));
  assert.equal(californiaK5PracticeQuestions.length, 492);
  assert.ok(
    californiaK5PracticeQuestions.every((question) => question.id.startsWith("us-ca-k5-knowledge-point-practice-v1-")),
    "K-5 live practice should use the S18 QA-passed knowledge-point package"
  );
  assert.deepEqual(
    californiaK5PracticeQuestions.reduce<Record<string, number>>((counts, question) => {
      counts[question.grade] = (counts[question.grade] ?? 0) + 1;
      return counts;
    }, {}),
    {
      K: 72,
      P1: 192,
      P2: 48,
      P3: 60,
      P4: 60,
      P5: 60
    }
  );

  const gradeCounts = californiaK5TextbookLessonSeeds.reduce<Record<string, number>>((counts, lesson) => {
    const [, gradeSlug] = lesson.topicId.match(/^us-ca-math-([a-z0-9]+)-/) ?? [];
    counts[gradeSlug ?? "missing"] = (counts[gradeSlug ?? "missing"] ?? 0) + 1;
    assert.equal(lesson.practiceQuestionIds?.length, 8);
    assert.ok(
      lesson.practiceQuestionIds?.every((questionId) => {
        const question = californiaK5PracticeQuestionById.get(questionId);
        return question?.topicId === lesson.topicId && liveKnowledgePointPracticeIdPattern.test(questionId);
      }),
      `${lesson.topicId} should link live topic-matched knowledge-point practice`
    );
    assert.doesNotMatch(lesson.title.en, /Textbook Lesson/i);
    return counts;
  }, {});

  assert.deepEqual(gradeCounts, {
    k: 6,
    p1: 4,
    p2: 4,
    p3: 5,
    p4: 5,
    p5: 5
  });
});

test("California lesson titles use MAIS knowledge-point codes instead of module wrappers", () => {
  const displayTitles = new Set<string>();

  usCaliforniaLessonSeeds.forEach((lesson) => {
    const topic = usCaliforniaTopicById.get(lesson.topicId);
    assert.ok(topic, `${lesson.topicId} has a live topic`);
    const knowledgePoint = californiaKnowledgePointForTopic(lesson.topicId, topic.grade, lesson.title.en);
    const expectedTitle = `${knowledgePoint.code} ${knowledgePoint.title}`;

    assert.equal(lesson.title.en, expectedTitle);
    assert.equal(topic.title.en, expectedTitle);
    assert.match(knowledgePoint.code, /^(K|\d{1,2})-[A-Z]\.\d+$/);
    assert.doesNotMatch(knowledgePoint.code, /^(K|\d+)\.(CC|OA|NBT|NF|MD|G|RP|NS|EE|SP|F)/);
    assert.doesNotMatch(lesson.title.en, /Textbook Lesson|Lesson Module/i);
    assert.doesNotMatch(topic.title.en, /Textbook Lesson|Lesson Module/i);
    assert.equal(displayTitles.has(expectedTitle), false, `duplicate CA knowledge-point title: ${expectedTitle}`);
    displayTitles.add(expectedTitle);
  });
});

test("California K-5 textbook concept explanations are unit-specific student-facing copy", () => {
  const conceptTexts = new Set<string>();

  californiaK5TextbookLessonSeeds.forEach((lesson) => {
    const conceptBlock = lesson.blocks.find((block) => block.type === "concept");
    assert.ok(conceptBlock?.content?.en, `${lesson.topicId} has concept explanation content`);

    const content = conceptBlock.content.en;
    const sentenceCount = content.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean).length;
    const wordCount = content.match(/[A-Za-z0-9()]+(?:[-'][A-Za-z0-9()]+)*/g)?.length ?? 0;

    blockedGenericK5ConceptPatterns.forEach((pattern) => {
      assert.doesNotMatch(content, pattern, `${lesson.topicId} should not expose generic guideline/source wording`);
    });
    assert.ok(wordCount >= 40, `${lesson.topicId} concept explanation is substantive`);
    assert.ok(sentenceCount >= 4, `${lesson.topicId} concept explanation has multiple student-facing sentences`);
    assert.equal(conceptTexts.has(content), false, `${lesson.topicId} concept explanation should be unique`);
    conceptTexts.add(content);
  });

  assert.equal(conceptTexts.size, 29);
});

test("California K-5 worked examples use near-transfer values instead of repeating concept examples", () => {
  const issues: string[] = [];

  californiaK5TextbookLessonSeeds.forEach((lesson) => {
    const conceptBlock = lesson.blocks.find((block) => block.type === "concept");
    const workedExample = lesson.blocks.find((block) => block.type === "worked-example");
    const concept = conceptBlock?.content?.en ?? "";
    const worked = workedExample?.content?.en ?? "";

    const conceptEquations = concept.match(/\b\d+(?:\.\d+)?\s*(?:\+|−|-|×|x|÷|\*)\s*\d+(?:\.\d+)?\s*=\s*\d+(?:\.\d+)?\b/g) ?? [];
    conceptEquations.forEach((equation) => {
      if (worked.includes(equation)) {
        issues.push(`${lesson.topicId}: repeats concept equation ${equation}`);
      }
    });

    Array.from(concept.matchAll(/\b(?:If\s+)?(\d+)\s+and\s+(\d+)\s+make\s+(\d+)\b/gi)).forEach(
      ([phrase, left, right, total]) => {
        const sameOrderEquation = new RegExp(`\\b${escapeRegExp(left)}\\s*\\+\\s*${escapeRegExp(right)}\\s*=\\s*${escapeRegExp(total)}\\b`);
        const reverseOrderEquation = new RegExp(`\\b${escapeRegExp(right)}\\s*\\+\\s*${escapeRegExp(left)}\\s*=\\s*${escapeRegExp(total)}\\b`);

        if (worked.includes(phrase) || sameOrderEquation.test(worked) || reverseOrderEquation.test(worked)) {
          issues.push(`${lesson.topicId}: repeats concept part-whole example ${phrase}`);
        }
      }
    );

    Array.from(concept.matchAll(/\bIn\s+(\d{2,3}),\s+the\s+\d\s+means\b/gi)).forEach(
      ([phrase, value]) => {
        if (worked.includes(phrase) || new RegExp(`\\b${escapeRegExp(value)}\\b`).test(worked)) {
          issues.push(`${lesson.topicId}: repeats concept place-value example ${value}`);
        }
      }
    );
  });

  assert.deepEqual(issues, []);
});

test("California live topic IDs are unique so lesson blocks render once", () => {
  const duplicateTopicIds = Array.from(
    usCaliforniaTopics.reduce<Map<string, number>>((counts, topic) => {
      counts.set(topic.id, (counts.get(topic.id) ?? 0) + 1);
      return counts;
    }, new Map())
  )
    .filter(([, count]) => count > 1)
    .map(([topicId, count]) => `${topicId} x${count}`)
    .sort();

  assert.deepEqual(duplicateTopicIds, []);
  assert.equal(usCaliforniaTopicById.size, usCaliforniaTopics.length);
});

test("California worked examples hide generator and QA wrapper labels", () => {
  const issues: string[] = [];

  usCaliforniaLessonSeeds.forEach((lesson) => {
    const workedExample = lesson.blocks.find((block) => block.type === "worked-example");
    const contentFields = [
      workedExample?.content?.en ?? "",
      workedExample?.content?.zh ?? "",
      workedExample?.content?.zhHans ?? ""
    ];

    contentFields.forEach((content) => {
      blockedWorkedExamplePatterns.forEach((pattern) => {
        if (pattern.test(content)) {
          issues.push(`${lesson.topicId}: ${pattern}`);
        }
      });
    });
  });

  assert.deepEqual(issues, []);
});

test("California practice questions hide generated activity wrapper labels", () => {
  const issues: string[] = [];

  usCaliforniaQuestions.forEach((question) => {
    const promptFields = [
      question.prompt.en,
      question.prompt.zh,
      question.prompt.zhHans ?? ""
    ];

    promptFields.forEach((prompt) => {
      blockedGeneratedQuestionPromptPatterns.forEach((pattern) => {
        if (pattern.test(prompt)) {
          issues.push(`${question.id}: ${pattern}`);
        }
      });
    });
  });

  assert.deepEqual(issues, []);
});

test("California worked examples put answers and reasoning on separate lines", () => {
  const issues: string[] = [];

  usCaliforniaLessonSeeds.forEach((lesson) => {
    const workedExample = lesson.blocks.find((block) => block.type === "worked-example");
    const englishContent = workedExample?.content?.en ?? "";
    const lines = englishContent.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const answerLineIndex = lines.findIndex((line) => /^Answer:\s+\S/.test(line));
    const reasoningLineIndex = lines.findIndex((line) => /^Reasoning:\s+\S/.test(line));
    const hasBlankLineLayout = /\n\nAnswer:\s+\S[\s\S]*?\.\n\nReasoning:\s+\S/.test(englishContent);

    if (answerLineIndex < 0 || reasoningLineIndex !== answerLineIndex + 1 || !hasBlankLineLayout) {
      issues.push(`${lesson.topicId}: answer/reasoning lines are not separated`);
    }
  });

  assert.deepEqual(issues, []);
});

test("California Grade 1 Add Subtract worked example has an exact sticker illustration", () => {
  const lesson = californiaK5TextbookLessonSeeds.find(
    (seed) => seed.topicId === "us-ca-math-p1-1-oa-add-subtract"
  );
  const workedExample = lesson?.blocks.find((block) => block.type === "worked-example");
  const illustration = getUsCaliforniaLessonIllustration(
    "us-ca-math-p1-1-oa-add-subtract",
    "worked-example"
  );

  const concept = lesson?.blocks.find((block) => block.type === "concept");

  assert.ok(concept?.content?.en.includes("8 + 3 = 11"));
  assert.ok(workedExample?.content?.en.includes("Lena has 7 stickers and gets 4 more"));
  assert.ok(workedExample?.content?.en.includes("7 + 4 = 11"));
  assert.doesNotMatch(workedExample?.content?.en ?? "", /8 \+ 3 = 11/);
  assert.ok(illustration);
  assert.equal(illustration.slot, "worked-example");
  assert.equal(illustration.width, 1600);
  assert.equal(illustration.height, 900);
  assert.match(illustration.src, /lena-7-plus-4-stickers-worked-example\.svg$/);
  assert.match(illustration.alt.en, /7 stickers/i);
  assert.match(illustration.alt.en, /4 more/i);
  assert.match(illustration.alt.en, /11 stickers/i);
  assert.match(illustration.caption.en, /7 \+ 4 = 11/);
  assert.ok(
    existsSync(path.join(process.cwd(), "public", illustration.src.slice(1))),
    "worked-example illustration SVG should exist under public/"
  );
});

test("California Grade 1 H/L micro-lessons are individual MAIS knowledge points", () => {
  assert.deepEqual(
    californiaElementaryMicroLessonSpecs.map((lesson) => lesson.knowledgePointCode),
    requestedGrade1KnowledgePointCodes
  );
  assert.equal(californiaElementaryMicroLessonSeeds.length, 12);
  assert.equal(californiaElementaryMicroLessonTopics.length, 12);
  assert.equal(californiaElementaryMicroLessonCoverageRecords.length, 12);

  californiaElementaryMicroLessonSpecs.forEach((spec, index) => {
    const seed = californiaElementaryMicroLessonSeeds[index];
    const topic = californiaElementaryMicroLessonTopics[index];
    const coverage = californiaElementaryMicroLessonCoverageRecords[index];
    const studentText = [
      seed.title.en,
      seed.description.en,
      topic.title.en,
      topic.description.en,
      ...seed.blocks.flatMap((block) => [
        block.title.en,
        block.content?.en ?? "",
        ...(block.items?.map((item) => item.en) ?? [])
      ])
    ].join("\n");

    assert.equal(seed.topicId, spec.topicId);
    assert.equal(topic.id, spec.topicId);
    assert.equal(topic.grade, "P1");
    assert.equal(seed.practiceQuestionIds?.length, 8);
    assert.ok(
      seed.practiceQuestionIds?.every((questionId) => {
        const question = usCaliforniaQuestions.find((candidate) => candidate.id === questionId);
        return question?.topicId === spec.topicId && liveKnowledgePointPracticeIdPattern.test(questionId);
      }),
      `${spec.topicId} should link live topic-matched knowledge-point practice`
    );
    assert.equal(coverage.topicId, spec.topicId);
    assert.deepEqual(coverage.practiceQuestionIds, seed.practiceQuestionIds);
    assert.ok(coverage.standardIds.every((standardId) => standardId.startsWith("1.OA.")));
    assert.match(seed.title.en, new RegExp(`^${spec.knowledgePointCode.replace(".", "\\.")}\\s`));
    assert.doesNotMatch(studentText, /\bIXL\b/i);
    assert.doesNotMatch(studentText, /word problems with pictures/i);
    assert.doesNotMatch(studentText, /sums up to 10/i);
    assert.doesNotMatch(studentText, /up to 10/i);
    ixlSourceTitles.forEach((sourceTitle) => {
      assert.notEqual(seed.title.en, sourceTitle);
      assert.doesNotMatch(studentText, new RegExp(sourceTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    });
  });
});

test("California Kindergarten cardinality compare lesson uses comparison rather than joining addition", () => {
  const lesson = californiaK5TextbookLessonSeeds.find((seed) => seed.topicId === "us-ca-math-k-k-cc-cardinality-compare");
  assert.ok(lesson, "K-B.1 cardinality compare lesson exists");

  const workedExample = lesson.blocks.find((block) => block.type === "worked-example");
  const workedText = workedExample?.content?.en ?? "";

  assert.match(workedText, /which group has more/i);
  assert.match(workedText, /match/i);
  assert.match(workedText, /more/i);
  assert.doesNotMatch(workedText, /how many counters are there in all/i);
  assert.doesNotMatch(workedText, /\b6\s*\+\s*2\s*=\s*8\b/);
});
