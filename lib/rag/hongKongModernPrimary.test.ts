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
