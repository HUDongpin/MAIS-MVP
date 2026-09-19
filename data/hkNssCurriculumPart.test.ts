import assert from "node:assert/strict";
import test from "node:test";
import { hongKongMathEdBRagCards } from "@/data/rag/hongKongMathEdB";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";

/**
 * NSS Mathematics is a Compulsory Part every candidate sits, plus an Extended
 * Part that is Module 1 or Module 2 and is elected by a minority. Differentiation
 * and integration are Extended Part only.
 *
 * Before this was labelled, `differentiation-intro` (S5) and `calculus` (S6) sat
 * in the S4-S6 core sequence with no marking, and `differentiation-intro` was
 * additionally listed in the EDB card's compulsory topic ids — so every S6
 * learner was served Module content as core, and the retrieval layer was told
 * Compulsory Part material may contain calculus.
 */

const EXTENDED_TOPIC_IDS = ["differentiation-intro", "calculus"];

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

test("the S6 statistics topic promises only what its items assess", () => {
  // Its items compute a standard score, which is Compulsory Part. The previous
  // description promised normal distribution and sampling, which are Module 1,
  // and used 常態分佈 — a term the HK glossary rejects.
  const statistics = hkSeniorTopics.find((topic) => topic.id === "statistics-s6");
  assert.ok(statistics);
  assert.equal(statistics.nssPart, undefined, "standard scores are Compulsory Part");
  assert.doesNotMatch(statistics.description.en, /sampling/i);
  assert.doesNotMatch(statistics.description.zh, /常態分佈|抽樣/);

  const items = questions.filter((question) => question.topicId === "statistics-s6");
  assert.ok(items.length > 0, "expected statistics-s6 questions");
});
