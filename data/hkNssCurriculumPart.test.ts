import assert from "node:assert/strict";
import test from "node:test";
import { grades } from "@/data/grades";
import { productionLessonByTopicId } from "@/data/lessons";
import { hongKongMathEdBRagCards } from "@/data/rag/hongKongMathEdB";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";
import { hongKongNssExtendedTopicIds } from "@/lib/hkNssCurriculumPart";

/**
 * NSS Mathematics has a Compulsory Part and an optional Extended Part (M1 or
 * M2). Differentiation and integration are Extended Part only.
 *
 * Before this was labelled, `differentiation-intro` (S5) and `calculus` (S6) sat
 * in the S4-S6 sequence with no marking, and `differentiation-intro` was also
 * listed in the EDB card's compulsory topic ids. The retrieval layer could
 * therefore use Extended Part content in compulsory guidance.
 */

const EXTENDED_TOPIC_IDS: string[] = [...hongKongNssExtendedTopicIds];

const hkSeniorTopics = topics.filter(
  (topic) => topic.curriculumTrack === "HK" && ["S4", "S5", "S6"].includes(topic.grade)
);

test("calculus topics are marked Extended Part, and nothing else is", () => {
  const marked = hkSeniorTopics.filter((topic) => topic.nssPart === "extended").map((topic) => topic.id).sort();
  assert.deepEqual(marked, [...EXTENDED_TOPIC_IDS].sort());
});

test("an Extended Part topic says so where a learner will read it", () => {
  // A field nobody surfaces is not a fix: the learner has to be able to tell that
  // a topic is not Compulsory Part before spending time on it.
  for (const topicId of EXTENDED_TOPIC_IDS) {
    const topic = hkSeniorTopics.find((candidate) => candidate.id === topicId);
    assert.ok(topic, `missing topic ${topicId}`);
    assert.match(topic.title.en, /Extended Part/, `${topicId} English title must name the Extended Part`);
    assert.match(topic.description.en, /not Compulsory Part/i, `${topicId} English description must disclaim Compulsory`);
    assert.match(topic.title.zh, /延伸部分/, `${topicId} Chinese title must name 延伸部分`);
    assert.match(topic.description.zh, /並非必修部分/, `${topicId} Chinese description must disclaim 必修部分`);
  }
});

test("direct lesson and practice entry also identify the Extended Part", () => {
  for (const topicId of EXTENDED_TOPIC_IDS) {
    const lesson = productionLessonByTopicId.get(topicId);
    assert.ok(lesson, `missing lesson for ${topicId}`);
    assert.match(lesson.title.en, /Extended Part/);
    assert.match(lesson.title.zh, /延伸部分/);
    assert.match(lesson.description.en, /not Compulsory Part/i);
    assert.match(lesson.description.zh, /並非必修部分/);

    const items = questions.filter((question) => question.topicId === topicId);
    assert.ok(items.length > 0, `missing practice item for ${topicId}`);
    for (const item of items) {
      assert.match(item.topic.en, /Extended Part/);
      assert.match(item.topic.zh, /延伸部分/);
    }
  }
});

test("the S6 grade overview does not present calculus as a common core focus", () => {
  const s6 = grades.find((grade) => grade.id === "S6");
  assert.ok(s6);
  assert.doesNotMatch(s6.focus.en, /calculus/i);
  assert.doesNotMatch(s6.focus.zh, /微積分/);
});

test("no Compulsory Part EDB card claims an Extended Part topic or concept", () => {
  const compulsory = hongKongMathEdBRagCards.filter((card) => card.stage === "senior-secondary-compulsory");
  assert.ok(compulsory.length > 0, "expected senior compulsory cards");

  const claimedTopics: string[] = [];
  const claimedConcepts: string[] = [];
  for (const card of compulsory) {
    for (const topicId of card.topicIds) {
      if (EXTENDED_TOPIC_IDS.includes(topicId)) claimedTopics.push(`${card.id} -> ${topicId}`);
    }
    for (const conceptId of card.conceptIds ?? []) {
      if (/^(differentiation|integration|calculus)$/.test(conceptId)) claimedConcepts.push(`${card.id} -> ${conceptId}`);
    }
    // The summary is what steers generation, so it must not invite calculus either.
    assert.doesNotMatch(
      card.safeSummary ?? "",
      /(?<!not )introductory calculus/i,
      `${card.id} summary must not present calculus as compulsory content`
    );
  }
  assert.deepEqual(claimedTopics, []);
  assert.deepEqual(claimedConcepts, []);
});

test("Extended Part topics remain reachable through the M1 and M2 cards", () => {
  // Labelling must not orphan the content: it is still real curriculum for the
  // candidates who elect a module.
  const moduleCards = hongKongMathEdBRagCards.filter(
    (card) => card.stage === "senior-secondary-m1" || card.stage === "senior-secondary-m2"
  );
  for (const topicId of EXTENDED_TOPIC_IDS) {
    assert.ok(
      moduleCards.some((card) => card.topicIds.includes(topicId)),
      `${topicId} must still be covered by an M1 or M2 card`
    );
  }
});

test("the S6 statistics topic describes its assessed standard-score context", () => {
  // Simple normal-distribution applications and standard scores are in the
  // Compulsory Part. The current question assesses a z-score in that context;
  // this topic does not assess survey sampling.
  const statistics = hkSeniorTopics.find((topic) => topic.id === "statistics-s6");
  assert.ok(statistics);
  assert.notEqual(statistics.nssPart, "extended");
  assert.match(statistics.description.en, /standard scores/i);
  assert.match(statistics.description.en, /normal distribution/i);
  assert.match(statistics.description.zh, /標準分數/);
  assert.match(statistics.description.zh, /常態分佈/);
  assert.doesNotMatch(statistics.description.en, /sampling/i);
  assert.doesNotMatch(statistics.description.zh, /抽樣/);

  const items = questions.filter((question) => question.topicId === "statistics-s6");
  assert.ok(items.length > 0, "expected statistics-s6 questions");
  assert.ok(items.some((question) => /z.*score/i.test(question.prompt.en)));
});
