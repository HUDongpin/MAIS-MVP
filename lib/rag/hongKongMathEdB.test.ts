import assert from "node:assert/strict";
import test from "node:test";
import { hongKongMathEdBRagCards } from "../../data/rag/hongKongMathEdB";
import { buildHongKongMathEdBEvidencePack, getHongKongMathEdBRagCards } from "./hongKongMathEdB";

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
