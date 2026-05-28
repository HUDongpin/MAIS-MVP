import assert from "node:assert/strict";
import test from "node:test";
import { hongKongDseEphSafeCards } from "../../data/rag/hongKongDseEph";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import {
  buildHongKongDseEphEvidencePack,
  findHongKongDseEphRawSourceArtifacts,
  getHongKongDseEphSafeCards
} from "./hongKongDseEph";
import { buildHongKongMathEvidencePack } from "./hongKongMath";

test("DSE EPH S4 queries retrieve algebra, functions, geometry, and data cards", () => {
  const algebra = getHongKongDseEphSafeCards({
    grade: "S4",
    volume: "A",
    conceptIds: ["algebraic-manipulation", "quadratic-equations"],
    intent: "generate-question",
    limit: 3
  });
  const functions = getHongKongDseEphSafeCards({
    grade: "S4",
    conceptIds: ["functions", "graphs", "slope"],
    intent: "generate-lesson",
    limit: 3
  });
  const geometry = getHongKongDseEphSafeCards({
    grade: "S4",
    volume: "B",
    topicId: "trigonometry-basics",
    intent: "exam-practice",
    limit: 3
  });
  const data = getHongKongDseEphSafeCards({
    grade: "S4",
    topicId: "data-handling",
    intent: "assessment-design",
    limit: 3
  });

  assert.equal(algebra[0]?.id, "hk-dse-eph-a-algebra-number-foundations");
  assert.equal(functions[0]?.id, "hk-dse-eph-a-functions-coordinate-readiness");
  assert.equal(geometry[0]?.id, "hk-dse-eph-b-geometry-measurement-trigonometry");
  assert.equal(data[0]?.id, "hk-dse-eph-b-data-and-connected-problem-solving");
});

test("DSE EPH S5 queries retrieve advanced functions, coordinate geometry, probability, and modelling cards", () => {
  const trigonometry = getHongKongDseEphSafeCards({
    grade: "S5",
    conceptIds: ["trigonometric-functions", "solution-intervals"],
    intent: "generate-question",
    limit: 3
  });
  const coordinates = getHongKongDseEphSafeCards({
    grade: "S5",
    topicId: "coordinate-geometry",
    conceptIds: ["circle-equations", "tangent"],
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 3
  });
  const probability = getHongKongDseEphSafeCards({
    grade: "S5",
    conceptIds: ["probability", "sample-space"],
    intent: "diagnose-mistake",
    limit: 3
  });
  const modelling = getHongKongDseEphSafeCards({
    grade: "S5",
    volume: "D",
    conceptIds: ["modeling", "parameters"],
    intent: "assessment-design",
    difficultyBand: "challenge",
    limit: 3
  });

  assert.equal(trigonometry[0]?.id, "hk-dse-eph-c-advanced-functions-trigonometry");
  assert.equal(coordinates[0]?.id, "hk-dse-eph-c-coordinate-circle-geometry");
  assert.equal(probability[0]?.id, "hk-dse-eph-d-probability-statistics");
  assert.equal(modelling[0]?.id, "hk-dse-eph-d-algebraic-modeling-synthesis");
});

test("DSE EPH S6 queries retrieve calculus and final paper readiness cards", () => {
  const calculus = getHongKongDseEphSafeCards({
    grade: "S6",
    volume: "E",
    conceptIds: ["differentiation", "optimization", "tangent"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 3
  });
  const revision = getHongKongDseEphSafeCards({
    grade: "S6",
    topicId: "exam-revision",
    conceptIds: ["exam-readiness", "method-selection"],
    intent: "assessment-design",
    difficultyBand: "exam",
    limit: 3
  });

  assert.equal(calculus[0]?.id, "hk-dse-eph-e-differentiation-applications");
  assert.equal(revision[0]?.id, "hk-dse-eph-e-final-paper-readiness");
});

test("combined HK evidence includes EPH only for the EPH profile", () => {
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
    textbookVolume: "E",
    limit: 4
  });

  assert.ok(upPack.curriculumCards.length > 0);
  assert.ok(upPack.examPatternCards.length > 0);
  assert.ok(upPack.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.match(upPack.evidenceText, /DSE UP textbook publisher layer/);
  assert.doesNotMatch(upPack.evidenceText, /DSE EPH textbook card/);

  assert.ok(ephPack.curriculumCards.length > 0);
  assert.ok(ephPack.examPatternCards.length > 0);
  assert.ok(ephPack.textbookCards.every((card) => card.publisher === "HK_EPH_MIF"));
  assert.match(ephPack.evidenceText, /DSE EPH textbook publisher layer/);
  assert.doesNotMatch(ephPack.evidenceText, /DSE UP textbook card/);
});

test("DSE EPH safe cards and evidence pack avoid source-copying artifacts", () => {
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
    /数学新思维[A-E]?\.pdf/i,
    /數學新思維[A-E]?\.pdf/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("例", "题")),
    new RegExp(joined("例", "題"))
  ];
  const cardText = JSON.stringify(hongKongDseEphSafeCards);
  const evidence = buildHongKongDseEphEvidencePack({
    grade: "S6",
    conceptIds: ["differentiation"],
    intent: "exam-practice",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongDseEphSafeCards.length, 10);
  assert.deepEqual(findHongKongDseEphRawSourceArtifacts({ cards: hongKongDseEphSafeCards, evidence }), []);
  assert.ok(hongKongDseEphSafeCards.every((card) => card.publisher === "HK_EPH_MIF"));
});
