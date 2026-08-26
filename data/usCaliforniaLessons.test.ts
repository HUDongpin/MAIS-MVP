import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { ccssLessonAssignments, hasCcssLessonAssignment } from "./ccssLessonAssignments";
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
  californiaCcssTextbookPracticeQuestionCount,
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
const ccssTextbookPracticeIdPattern = /^ccss-textbook-practice-v1-/;

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

test("unapproved California K-5 textbook lessons and 492-question package remain de-reached", () => {
  assert.equal(californiaK5TextbookLessonSeeds.length, 0);
  assert.equal(expectedUnitedStatesCaliforniaK5QuestionCount, 0);

  const californiaK5PracticeQuestions = usCaliforniaQuestions.filter((question) => californiaK5Grades.has(question.grade));
  const knowledgePointPracticeQuestions = californiaK5PracticeQuestions.filter((question) =>
    liveKnowledgePointPracticeIdPattern.test(question.id)
  );
  const ccssTextbookPracticeQuestions = californiaK5PracticeQuestions.filter((question) =>
    ccssTextbookPracticeIdPattern.test(question.id)
  );

  assert.equal(knowledgePointPracticeQuestions.length, 0);
  // The separately hand-checked CCSS bank remains live: 810 total questions,
  // with 336 on K-G5 topics and the remainder on G6-G12 chapter topics.
  assert.equal(californiaCcssTextbookPracticeQuestionCount, 810);
  assert.equal(ccssTextbookPracticeQuestions.length, 336);
  assert.equal(californiaK5PracticeQuestions.length, ccssTextbookPracticeQuestions.length);
  assert.ok(ccssTextbookPracticeQuestions.every((question) => californiaK5Grades.has(question.grade)));
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

test("de-reached California K-5 textbook copy cannot re-enter the live lesson seed", () => {
  assert.deepEqual(californiaK5TextbookLessonSeeds, []);
  assert.equal(
    usCaliforniaLessonSeeds.some((lesson) =>
      /^us-ca-math-(?:k|p[1-5])-/.test(lesson.topicId) &&
      lesson.blocks.some((block) =>
        blockedGenericK5ConceptPatterns.some((pattern) => pattern.test(block.content?.en ?? ""))
      )
    ),
    false
  );
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

test("California assigned topics carry a teacher guide with full CCSS standard text", () => {
  // Phase 2 augmentation: the teacher guide lists every standard the topic's
  // interactive lessons develop, with the full text from data/ccss and an
  // attribution to the lesson(s) that develop it.
  californiaK5TextbookLessonSeeds.forEach((lesson) => {
    if (!hasCcssLessonAssignment(lesson.topicId)) return;
    const guide = lesson.blocks.find((block) => block.type === "teacher-guide");
    assert.ok(guide, `${lesson.topicId} has a teacher guide`);
    assert.match(guide.title.en, /Standards developed/i);
    assert.ok((guide.items?.length ?? 0) > 0, `${lesson.topicId} teacher guide lists standards`);
    guide.items?.forEach((item) => {
      assert.match(
        item.en,
        /^(K|[1-5])\.[A-Z]+\.[A-Z]{1,2}\.\d+ — .{20,}/,
        `${lesson.topicId}: teacher-guide item should carry the standard id and its full text — got "${item.en.slice(0, 60)}"`
      );
      assert.match(item.en, /\(.+\)$/, `${lesson.topicId}: teacher-guide item should attribute the developing lesson(s)`);
    });
  });
});

test("California worked examples put answers and reasoning on separate lines", () => {
  const issues: string[] = [];

  usCaliforniaLessonSeeds.forEach((lesson) => {
    // Assigned topics have no generated worked example — the ported CCSS
    // lesson body carries the worked reasoning and Math Check instead.
    if (hasCcssLessonAssignment(lesson.topicId)) return;
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

test("de-reached Grade 1 Add Subtract candidate is absent while its static illustration remains inert", () => {
  const lesson = californiaK5TextbookLessonSeeds.find(
    (seed) => seed.topicId === "us-ca-math-p1-1-oa-add-subtract"
  );
  assert.equal(lesson, undefined);

  // The asset may remain on disk, but no de-reached candidate lesson may make
  // it live. A later integration needs a fresh promotion record.
  assert.equal(ccssLessonAssignments["us-ca-math-p1-1-oa-add-subtract"]?.primary, "add-subtract-stories");

  const illustration = getUsCaliforniaLessonIllustration(
    "us-ca-math-p1-1-oa-add-subtract",
    "worked-example"
  );
  assert.ok(illustration);
  assert.equal(illustration.slot, "worked-example");
  assert.match(illustration.src, /lena-7-plus-4-stickers-worked-example\.svg$/);
  assert.ok(
    existsSync(path.join(process.cwd(), "public", illustration.src.slice(1))),
    "worked-example illustration SVG should exist under public/"
  );
});

test("California Grade 1 H/L micro-lessons remain source specs but are not live seeds or topics", () => {
  assert.deepEqual(
    californiaElementaryMicroLessonSpecs.map((lesson) => lesson.knowledgePointCode),
    requestedGrade1KnowledgePointCodes
  );
  assert.equal(californiaElementaryMicroLessonSeeds.length, 0);
  assert.equal(californiaElementaryMicroLessonTopics.length, 0);
  assert.equal(californiaElementaryMicroLessonCoverageRecords.length, 0);
  assert.ok(
    californiaElementaryMicroLessonSpecs.every((spec) =>
      !usCaliforniaLessonSeeds.some((seed) => seed.topicId === spec.topicId) &&
      !usCaliforniaQuestions.some((question) => question.topicId === spec.topicId)
    )
  );
});

test("de-reached Kindergarten candidate is absent while the hand-built CCSS replacement remains live", () => {
  const lesson = californiaK5TextbookLessonSeeds.find((seed) => seed.topicId === "us-ca-math-k-k-cc-cardinality-compare");
  assert.equal(lesson, undefined);

  const approvedReplacement = usCaliforniaLessonSeeds.find(
    (seed) => seed.topicId === "us-ca-math-k-k-cc-cardinality-compare"
  );
  assert.ok(approvedReplacement);
  assert.equal(ccssLessonAssignments["us-ca-math-k-k-cc-cardinality-compare"]?.primary, "counting-ten-frame");
  const interactiveBlock = approvedReplacement.blocks.find((block) => block.type === "interactive-lesson");
  assert.equal(interactiveBlock?.interactiveLessonConfig?.ccssLessonSlug, "counting-ten-frame");
  assert.match(interactiveBlock?.content?.en ?? "", /last number you say/i);
});
