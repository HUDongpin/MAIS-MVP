import assert from "node:assert/strict";
import test from "node:test";
import { hongKongDseUpSafeCards } from "../../data/rag/hongKongDseUp";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import {
  buildHongKongDseUpEvidencePack,
  findHongKongDseUpRawSourceArtifacts,
  getHongKongDseUpSafeCards
} from "./hongKongDseUp";
import { buildHongKongMathEvidencePack } from "./hongKongMath";

test("DSE UP S4 queries retrieve algebra, functions, and coordinate geometry textbook cards", () => {
  const algebra = getHongKongDseUpSafeCards({
    grade: "S4",
    conceptIds: ["algebraic-manipulation", "quadratic-equations"],
    intent: "generate-question",
    limit: 3
  });
  const functions = getHongKongDseUpSafeCards({
    grade: "S4",
    conceptIds: ["functions", "graphs", "line-equations"],
    intent: "generate-lesson",
    limit: 3
  });
  const coordinates = getHongKongDseUpSafeCards({
    grade: "S4",
    topicId: "coordinate-geometry",
    intent: "exam-practice",
    limit: 3
  });

  assert.equal(algebra[0]?.id, "hk-dse-up-4a-algebra-foundations");
  assert.equal(functions[0]?.id, "hk-dse-up-4a-functions-coordinate-geometry");
  assert.equal(coordinates[0]?.id, "hk-dse-up-4a-functions-coordinate-geometry");
});

test("DSE UP S5 queries retrieve trigonometry, probability, and statistics textbook cards", () => {
  const trigonometry = getHongKongDseUpSafeCards({
    grade: "S5",
    conceptIds: ["trigonometric-functions", "solution-intervals"],
    intent: "generate-question",
    limit: 3
  });
  const probability = getHongKongDseUpSafeCards({
    grade: "S5",
    conceptIds: ["probability", "sample-space"],
    intent: "diagnose-mistake",
    limit: 3
  });
  const statistics = getHongKongDseUpSafeCards({
    grade: "S5",
    topicId: "data-handling",
    intent: "assessment-design",
    limit: 3
  });

  assert.equal(trigonometry[0]?.id, "hk-dse-up-5a-advanced-functions-trigonometry");
  assert.equal(probability[0]?.id, "hk-dse-up-5b-probability-statistics");
  assert.equal(statistics[0]?.id, "hk-dse-up-5b-probability-statistics");
});

test("DSE UP S6 queries retrieve calculus and final revision textbook cards", () => {
  const calculus = getHongKongDseUpSafeCards({
    grade: "S6",
    conceptIds: ["differentiation", "optimization", "tangent"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 3
  });
  const revision = getHongKongDseUpSafeCards({
    grade: "S6",
    topicId: "exam-revision",
    conceptIds: ["exam-readiness", "method-selection"],
    intent: "assessment-design",
    difficultyBand: "exam",
    limit: 3
  });

  assert.equal(calculus[0]?.id, "hk-dse-up-6a-differentiation-applications");
  assert.equal(revision[0]?.id, "hk-dse-up-6b-final-dse-revision");
});

test("combined HK evidence excludes UP and EPH publisher cards for optional topics without explicit module eligibility", () => {
  const upPack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S6",
    stage: "senior-secondary-compulsory",
    topicId: "differentiation-intro",
    conceptIds: ["differentiation", "optimization"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 4
  });
  const ephPack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    grade: "S6",
    stage: "senior-secondary-compulsory",
    topicId: "differentiation-intro",
    conceptIds: ["differentiation", "optimization"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.deepEqual(upPack.curriculumCards, []);
  assert.deepEqual(upPack.textbookCards, []);
  assert.deepEqual(upPack.examPatternCards, []);
  assert.match(upPack.evidenceText, /optional HKDSE Extended Part/);
  assert.doesNotMatch(upPack.evidenceText, /DSE EPH textbook card/);
  assert.doesNotMatch(upPack.evidenceText, /MAINLAND_PEP_HIGH/);

  assert.deepEqual(ephPack.curriculumCards, []);
  assert.deepEqual(ephPack.textbookCards, []);
  assert.deepEqual(ephPack.examPatternCards, []);
  assert.match(ephPack.evidenceText, /optional HKDSE Extended Part/);
  assert.doesNotMatch(ephPack.evidenceText, /DSE UP textbook card/);
});

test("DSE UP safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i,
    /p\.\s*\d+/i,
    /OCR/i,
    /question\s*(?:number|no\.|#)/i,
    /standard\s+answer/i,
    /source\s+page/i,
    /screenshot/i,
    /worked\s+example/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("例", "题")),
    new RegExp(joined("例", "題"))
  ];
  const cardText = JSON.stringify(hongKongDseUpSafeCards);
  const evidence = buildHongKongDseUpEvidencePack({
    grade: "S6",
    conceptIds: ["differentiation"],
    intent: "exam-practice",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongDseUpSafeCards.length, 12);
  assert.deepEqual(findHongKongDseUpRawSourceArtifacts({ cards: hongKongDseUpSafeCards, evidence }), []);
  assert.ok(hongKongDseUpSafeCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
});
