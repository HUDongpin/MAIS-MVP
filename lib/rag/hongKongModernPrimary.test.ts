import assert from "node:assert/strict";
import test from "node:test";
import { hongKongModernPrimarySafeCards } from "../../data/rag/hongKongModernPrimary";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongMathEvidencePack } from "./hongKongMath";
import {
  buildHongKongModernPrimaryEvidencePack,
  findHongKongModernPrimaryRawSourceArtifacts,
  getHongKongModernPrimarySafeCards
} from "./hongKongModernPrimary";

test("HK Modern P1 textbook queries retrieve source-distant primary safe cards", () => {
  const cards = getHongKongModernPrimarySafeCards({
    grade: "P1",
    volume: "1A",
    conceptIds: ["number-sequence", "compare-quantities"],
    intent: "generate-lesson",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0]?.id, "hk-modern-p1-number-sense-counting");
  assert.ok(cards.every((card) => card.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"));
  assert.ok(cards.every((card) => card.stage === "primary"));
  assert.ok(cards.every((card) => card.grade === "P1"));
  assert.ok(cards.every((card) => card.volumes.includes("1A")));
});

test("combined HK evidence routes Modern P1 profiles to HK Modern and not UP or EPH", () => {
  const pack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"),
    grade: "P1",
    textbookVolume: "1A",
    conceptIds: ["number-sequence", "compare-quantities"],
    intent: "generate-lesson",
    difficultyBand: "foundation",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-modern-p1-number-sense-counting"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"));
  assert.equal(pack.examPatternCards.length, 0);
  assert.match(pack.evidenceText, /HK Modern primary textbook publisher layer/);
  assert.doesNotMatch(pack.evidenceText, /UP junior .* textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE EPH textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE exam pattern card/);
});

test("HK Modern P3 textbook queries retrieve source-distant primary safe cards", () => {
  const cards = getHongKongModernPrimarySafeCards({
    grade: "P3",
    volume: "3A",
    conceptIds: ["multiplication-division-fluency", "measurement"],
    intent: "generate-lesson",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0]?.id, "hk-modern-p3-3a-number-fluency-multi-step");
  assert.ok(cards.every((card) => card.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"));
  assert.ok(cards.every((card) => card.stage === "primary"));
  assert.ok(cards.every((card) => card.grade === "P3"));
  assert.ok(cards.every((card) => card.volumes.includes("3A")));
});

test("combined HK evidence routes Modern P3 profiles to HK Modern and not UP or EPH", () => {
  const pack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"),
    grade: "P3",
    textbookVolume: "3A",
    conceptIds: ["multiplication-division-fluency", "measurement"],
    intent: "generate-lesson",
    difficultyBand: "foundation",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-modern-p3-3a-number-fluency-multi-step"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"));
  assert.equal(pack.examPatternCards.length, 0);
  assert.match(pack.evidenceText, /HK Modern primary textbook publisher layer/);
  assert.doesNotMatch(pack.evidenceText, /UP junior .* textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE EPH textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE exam pattern card/);
});

test("all eight live Modern P1/P3 topic IDs resolve only to their reviewed legacy safe-card route", () => {
  const expectedCardByTopic = new Map([
    ["p1-counting-number-bonds", "hk-modern-p1-number-sense-counting"],
    ["p1-addition-subtraction", "hk-modern-p1-addition-subtraction-readiness"],
    ["p1-shapes-patterns", "hk-modern-p1-shapes-position-patterns"],
    ["p1-measurement-time", "hk-modern-p1-measurement-time-money-data"],
    ["p3-multiplication-division", "hk-modern-p3-3b-multiplication-division-problem-solving"],
    ["p3-fractions-intro", "hk-modern-p3-3c-fractions-decimals-readiness"],
    ["p3-measurement", "hk-modern-p3-3a-measurement-time-money"],
    ["p3-geometry-patterns", "hk-modern-p3-3b-geometry-spatial-description"]
  ] as const);

  for (const [topicId, expectedCardId] of expectedCardByTopic) {
    const grade = topicId.startsWith("p1-") ? "P1" : "P3";
    const cards = getHongKongModernPrimarySafeCards({
      grade,
      topicId,
      intent: "generate-lesson",
      limit: 5
    });
    assert.deepEqual(cards.map((card) => card.id), [expectedCardId], topicId);
  }
});

test("Modern primary topic routing fails closed for unrelated or cross-topic cards", () => {
  assert.deepEqual(getHongKongModernPrimarySafeCards({
    grade: "P1",
    topicId: "p3-measurement",
    intent: "generate-lesson",
    limit: 5
  }), []);
  assert.deepEqual(getHongKongModernPrimarySafeCards({
    grade: "P3",
    topicId: "p6-speed",
    intent: "generate-lesson",
    limit: 5
  }), []);
});

test("HK Modern primary safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i,
    /p\.\s*\d+/i,
    /OCR/i,
    /source\s+page/i,
    /page\s+locator/i,
    /screenshot/i,
    /question\s*(?:number|no\.|#)/i,
    /standard\s+answer/i,
    /\/Users\//i,
    /Downloads/i,
    /[13][ABCD]\.pdf/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("例", "题")),
    new RegExp(joined("例", "題"))
  ];
  const cardText = JSON.stringify(hongKongModernPrimarySafeCards);
  const evidence = buildHongKongModernPrimaryEvidencePack({
    grade: "P1",
    volume: "1A",
    conceptIds: ["number-sequence"],
    intent: "generate-lesson",
    limit: 4
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongModernPrimarySafeCards.length, 12);
  assert.deepEqual(findHongKongModernPrimaryRawSourceArtifacts({ cards: hongKongModernPrimarySafeCards, evidence }), []);
});
