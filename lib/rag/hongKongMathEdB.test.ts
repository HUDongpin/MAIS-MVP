import assert from "node:assert/strict";
import test from "node:test";
import { hongKongMathEdBRagCards } from "../../data/rag/hongKongMathEdB";
import { buildHongKongMathEdBEvidencePack, getHongKongMathEdBRagCards } from "./hongKongMathEdB";
import { buildHongKongMathEvidencePack } from "./hongKongMath";

test("primary HK queries prioritize primary curriculum cards and avoid senior modules", () => {
  const cards = getHongKongMathEdBRagCards({
    grade: "P4",
    conceptIds: ["fractions", "measurement"],
    intent: "generate-question",
    limit: 5
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].stage, "primary");
  assert.ok(cards.every((card) => card.curriculumTrack === "HK"));
  assert.ok(cards.every((card) => card.stage !== "senior-secondary-m1" && card.stage !== "senior-secondary-m2"));
});

test("junior algebra and geometry queries return junior-secondary guidance", () => {
  const cards = getHongKongMathEdBRagCards({
    grade: "S2",
    conceptIds: ["linear-equations", "coordinate-method", "geometric-reasoning"],
    intent: "generate-lesson",
    limit: 5
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].stage, "junior-secondary");
  assert.ok(cards.some((card) => card.topicIds.includes("linear-equations") || card.conceptIds.includes("coordinate-method")));
  assert.ok(cards.every((card) => card.stage !== "senior-secondary-m1" && card.stage !== "senior-secondary-m2"));
});

test("senior M1 queries retrieve calculus and statistics extension card first", () => {
  const cards = getHongKongMathEdBRagCards({
    stage: "senior-secondary-m1",
    conceptIds: ["calculus", "statistics"],
    intent: "assessment-design",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "hk-edb-senior-m1-calculus-statistics");
});

test("senior M2 queries retrieve algebra and calculus extension card first", () => {
  const cards = getHongKongMathEdBRagCards({
    stage: "senior-secondary-m2",
    conceptIds: ["advanced-algebra", "calculus"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "hk-edb-senior-m2-algebra-calculus");
});

test("optional HKDSE topics require an explicitly eligible Extended Part module", () => {
  for (const topicId of ["statistics-s6", "differentiation-intro", "calculus"]) {
    const compulsory = buildHongKongMathEvidencePack({
      grade: "S6",
      stage: "senior-secondary-compulsory",
      topicId,
      intent: "tutor-explain",
      limit: 5
    });
    assert.deepEqual(compulsory.curriculumCards, [], `${topicId} leaked into compulsory curriculum evidence`);
    assert.deepEqual(compulsory.textbookCards, [], `${topicId} leaked into compulsory publisher evidence`);
    assert.deepEqual(compulsory.examPatternCards, [], `${topicId} leaked into compulsory exam evidence`);
    assert.deepEqual(compulsory.questionPatternCards, [], `${topicId} leaked into compulsory question evidence`);
  }

  const m1Statistics = buildHongKongMathEvidencePack({
    grade: "S6",
    stage: "senior-secondary-m1",
    topicId: "statistics-s6",
    intent: "tutor-explain",
    limit: 5
  });
  assert.deepEqual(m1Statistics.curriculumCards.map((card) => card.id), ["hk-edb-senior-m1-calculus-statistics"]);
  assert.deepEqual(m1Statistics.textbookCards, []);
  assert.deepEqual(m1Statistics.examPatternCards, []);
  assert.deepEqual(m1Statistics.questionPatternCards, []);

  const m2Statistics = buildHongKongMathEvidencePack({
    grade: "S6",
    stage: "senior-secondary-m2",
    topicId: "statistics-s6",
    intent: "tutor-explain",
    limit: 5
  });
  assert.deepEqual(m2Statistics.curriculumCards, []);

  for (const stage of ["senior-secondary-m1", "senior-secondary-m2"] as const) {
    for (const topicId of ["differentiation-intro", "calculus"]) {
      const pack = buildHongKongMathEvidencePack({
        grade: "S6",
        stage,
        topicId,
        intent: "tutor-explain",
        limit: 5
      });
      assert.equal(pack.curriculumCards.length, 1);
      assert.ok(pack.curriculumCards.every((card) => card.stage === stage && card.topicIds.includes(topicId)));
      assert.deepEqual(pack.textbookCards, []);
      assert.deepEqual(pack.examPatternCards, []);
      assert.deepEqual(pack.questionPatternCards, []);
    }
  }
});

test("topic-specific HK queries fail closed and senior compulsory owns quadratic-patterns and circles", () => {
  const missing = buildHongKongMathEvidencePack({
    grade: "S4",
    stage: "senior-secondary-compulsory",
    topicId: "missing-topic-with-grade-match",
    intent: "generate-question",
    limit: 5
  });
  assert.deepEqual(missing.curriculumCards, []);
  assert.deepEqual(missing.textbookCards, []);
  assert.deepEqual(missing.examPatternCards, []);
  assert.deepEqual(missing.questionPatternCards, []);

  for (const topicId of ["quadratic-patterns", "circles"]) {
    const senior = buildHongKongMathEvidencePack({
      grade: "S4",
      stage: "senior-secondary-compulsory",
      topicId,
      intent: "generate-lesson",
      limit: 8
    });
    assert.ok(senior.curriculumCards.some((card) => card.id === "hk-edb-senior-compulsory-content"));
    assert.ok(senior.curriculumCards.every((card) => card.topicIds.includes(topicId)));
    assert.ok(senior.curriculumCards.every((card) => card.stage === "senior-secondary-compulsory"));
    assert.ok(senior.textbookCards.every((card) => !card.id.startsWith("hk-up-junior-")));
    assert.ok(senior.textbookCards.every((card) => card.topicIds.includes(topicId)));
    assert.ok(senior.examPatternCards.every((card) => card.topicIds.includes(topicId)));
    assert.ok(senior.questionPatternCards.every((card) => card.topicIds.includes(topicId)));
    assert.ok(senior.questionPatternCards.every((card) => card.stage === "senior-secondary"));
  }
});

test("senior compulsory EDB cards contain no calculus claims", () => {
  const compulsory = hongKongMathEdBRagCards.filter((card) => card.stage === "senior-secondary-compulsory");
  const text = JSON.stringify(compulsory);
  assert.doesNotMatch(text, /calculus|differentiat/i);
  assert.ok(compulsory.every((card) => card.topicIds.includes("quadratic-patterns")));
  assert.ok(compulsory.every((card) => card.topicIds.includes("circles")));
});

test("learning diversity queries retrieve student support guidance", () => {
  const cards = getHongKongMathEdBRagCards({
    stage: "senior-secondary-support",
    documentPurpose: "learning-diversity-support",
    conceptIds: ["scaffolding", "diagnostic-feedback"],
    intent: "diagnose-mistake",
    limit: 3
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "hk-edb-senior-learning-diversity-support");
  assert.ok(cards[0].documentPurposes.includes("learning-diversity-support"));
});

test("HK safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i,
    /p\.\s*\d+/i,
    /OCR/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("呈", "分")),
    new RegExp(joined("真", "题")),
    new RegExp(joined("真", "題")),
    new RegExp(joined("试", "卷", "题", "干")),
    new RegExp(joined("試", "卷", "題", "幹"))
  ];
  const cardText = JSON.stringify(hongKongMathEdBRagCards);
  const evidence = buildHongKongMathEdBEvidencePack({
    stage: "primary",
    conceptIds: ["fractions"],
    intent: "generate-lesson",
    limit: 2
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongMathEdBRagCards.length, 14);
  assert.ok(hongKongMathEdBRagCards.every((card) => card.curriculumTrack === "HK"));
});

test("HK evidence packs are separate from Mainland PEP evidence", () => {
  const pack = buildHongKongMathEdBEvidencePack({
    grade: "P5",
    topicId: "p5-charts-averages",
    intent: "tutor-explain",
    limit: 3
  });

  assert.equal(pack.curriculumTrack, "HK");
  assert.ok(pack.cards.length > 0);
  assert.match(pack.evidenceText, /MAIS-safe RAG evidence pack for HK/);
  assert.doesNotMatch(pack.evidenceText, /MAINLAND_PEP_HIGH/);
});
