import assert from "node:assert/strict";
import test from "node:test";
import { hongKongUpJuniorSafeCards } from "../../data/rag/hongKongUpJunior";
import { hongKongUpJuniorEnglishSafeCards } from "../../data/rag/hongKongUpJuniorEnglish";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongMathEvidencePack } from "./hongKongMath";
import {
  buildHongKongUpJuniorEvidencePack,
  findHongKongUpJuniorRawSourceArtifacts,
  getHongKongUpJuniorSafeCards
} from "./hongKongUpJunior";

test("UP junior S1-S3 textbook queries retrieve grade and volume safe cards", () => {
  const queries = [
    {
      grade: "S1" as const,
      volume: "1A" as const,
      conceptIds: ["operation-order", "integer-sense"],
      expected: "hk-up-junior-1a-arithmetic-directed-number-readiness"
    },
    {
      grade: "S1" as const,
      volume: "1B" as const,
      conceptIds: ["ratio", "percentage"],
      expected: "hk-up-junior-1b-ratio-rate-percent"
    },
    {
      grade: "S2" as const,
      volume: "2A" as const,
      topicId: "coordinates",
      conceptIds: ["straight-line-graph", "gradient"],
      expected: "hk-up-junior-2a-coordinate-graphs"
    },
    {
      grade: "S2" as const,
      volume: "2B" as const,
      topicId: "probability-s2",
      conceptIds: ["sample-space"],
      expected: "hk-up-junior-2b-probability-data"
    },
    {
      grade: "S3" as const,
      volume: "3A" as const,
      topicId: "identities-square-patterns",
      conceptIds: ["perfect-square-identity", "difference-of-squares"],
      expected: "hk-up-junior-3a-identities-square-patterns"
    },
    {
      grade: "S3" as const,
      volume: "3B" as const,
      topicId: "arc-length-sector-area",
      conceptIds: ["arc-length", "sector-area"],
      expected: "hk-up-junior-3b-arc-length-sector-area"
    }
  ];

  for (const query of queries) {
    const cards = getHongKongUpJuniorSafeCards({
      grade: query.grade,
      volume: query.volume,
      ...(query.topicId ? { topicId: query.topicId } : {}),
      conceptIds: query.conceptIds,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected UP junior cards for ${query.grade} ${query.volume}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceLanguage === "zh"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => card.volume === query.volume));
  }
});

test("UP junior S3 routing removes senior topic ids and exposes bilingual identity and sector cards", () => {
  for (const sourceLanguage of ["zh", "en"] as const) {
    const oldQuadratics = getHongKongUpJuniorSafeCards({
      grade: "S3",
      volume: "3A",
      sourceLanguage,
      topicId: "quadratic-patterns",
      intent: "generate-lesson",
      limit: 5
    });
    const oldCircles = getHongKongUpJuniorSafeCards({
      grade: "S3",
      volume: "3B",
      sourceLanguage,
      topicId: "circles",
      intent: "generate-lesson",
      limit: 5
    });
    const identities = getHongKongUpJuniorSafeCards({
      grade: "S3",
      volume: "3A",
      sourceLanguage,
      topicId: "identities-square-patterns",
      intent: "generate-lesson",
      limit: 5
    });
    const sectors = getHongKongUpJuniorSafeCards({
      grade: "S3",
      volume: "3B",
      sourceLanguage,
      topicId: "arc-length-sector-area",
      intent: "generate-lesson",
      limit: 5
    });

    assert.deepEqual(oldQuadratics, []);
    assert.deepEqual(oldCircles, []);
    assert.ok(identities.length > 0);
    assert.ok(sectors.length > 0);
    assert.equal(identities[0]?.id, sourceLanguage === "en" ? "hk-up-junior-en-3a-identities-square-patterns" : "hk-up-junior-3a-identities-square-patterns");
    assert.equal(sectors[0]?.id, sourceLanguage === "en" ? "hk-up-junior-en-3b-arc-length-sector-area" : "hk-up-junior-3b-arc-length-sector-area");
    assert.ok(identities.every((card) => card.topicIds.includes("identities-square-patterns")));
    assert.ok(sectors.every((card) => card.topicIds.includes("arc-length-sector-area")));
  }

  const allCards = [...hongKongUpJuniorSafeCards, ...hongKongUpJuniorEnglishSafeCards];
  const identityCards = allCards.filter((card) => card.id.endsWith("-identities-square-patterns"));
  const sectorCards = allCards.filter((card) => card.id.endsWith("-arc-length-sector-area"));
  const identityText = JSON.stringify(identityCards);
  const sectorText = JSON.stringify(sectorCards);

  assert.equal(identityCards.length, 2);
  assert.match(identityText, /area model/i);
  assert.match(identityText, /\(a\+b\)\^2/);
  assert.match(identityText, /\(a-b\)\^2/);
  assert.match(identityText, /a\^2-b\^2/);
  assert.match(identityText, /expand/i);
  assert.match(identityText, /factoris/i);
  assert.match(identityText, /identity sign/i);
  assert.doesNotMatch(identityText, /parabola|vertex|root/i);

  assert.equal(sectorCards.length, 2);
  assert.match(sectorText, /s=\(theta\/360\)\*2pi r/i);
  assert.match(sectorText, /A=\(theta\/360\)\*pi r\^2/i);
  assert.match(sectorText, /degrees/i);
  assert.match(sectorText, /exact pi/i);
  assert.match(sectorText, /approximation/i);
  assert.match(sectorText, /length units/i);
  assert.match(sectorText, /area units/i);
  assert.match(sectorText, /theta=360/i);
  assert.match(sectorText, /full circle/i);
  assert.doesNotMatch(sectorText, /cyclic|tangent|inscribed.angle/i);
});

test("combined S3 HK retrieval rejects the senior-owned legacy topic ids", () => {
  for (const topicId of ["quadratic-patterns", "circles"]) {
    const pack = buildHongKongMathEvidencePack({
      curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
      grade: "S3",
      topicId,
      intent: "tutor-explain",
      limit: 8
    });

    assert.deepEqual(pack.curriculumCards, []);
    assert.deepEqual(pack.textbookCards, []);
    assert.deepEqual(pack.examPatternCards, []);
    assert.deepEqual(pack.questionPatternCards, []);
  }
});

test("UP junior retrieval keeps S1-S3 textbook volumes separated from DSE UP cards", () => {
  const s3Cards = getHongKongUpJuniorSafeCards({
    grade: "S3",
    volume: "3B",
    topicId: "arc-length-sector-area",
    conceptIds: ["arc-length", "sector-area"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 4
  });
  const combinedJunior = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S3",
    textbookVolume: "3B",
    topicId: "arc-length-sector-area",
    conceptIds: ["arc-length", "sector-area"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 4
  });
  const combinedSenior = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S4",
    textbookVolume: "4A",
    conceptIds: ["algebraic-manipulation", "quadratic-equations"],
    intent: "generate-question",
    difficultyBand: "foundation",
    limit: 4
  });

  assert.equal(s3Cards[0]?.id, "hk-up-junior-3b-arc-length-sector-area");
  assert.ok(combinedJunior.textbookCards.some((card) => card.id === "hk-up-junior-3b-arc-length-sector-area"));
  assert.ok(combinedJunior.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.ok(combinedJunior.textbookCards.every((card) => !("sourceLanguage" in card) || card.sourceLanguage === "zh"));
  assert.equal(combinedJunior.examPatternCards.length, 0);
  assert.match(combinedJunior.evidenceText, /UP junior S1-S3 Chinese textbook publisher layer/);
  assert.doesNotMatch(combinedJunior.evidenceText, /DSE UP textbook card/);
  assert.doesNotMatch(combinedJunior.evidenceText, /DSE exam pattern card/);

  assert.ok(combinedSenior.textbookCards.some((card) => card.id === "hk-dse-up-4a-algebra-foundations"));
  assert.ok(combinedSenior.examPatternCards.length > 0);
  assert.match(combinedSenior.evidenceText, /DSE UP textbook publisher layer/);
  assert.doesNotMatch(combinedSenior.evidenceText, /UP junior textbook card/);
});

test("combined HK evidence does not route EPH profiles to UP junior textbook cards", () => {
  const pack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    grade: "S2",
    textbookVolume: "2A",
    topicId: "coordinates",
    conceptIds: ["coordinate-plane", "straight-line-graph"],
    intent: "generate-question",
    difficultyBand: "core",
    limit: 4
  });

  assert.ok(pack.textbookCards.every((card) => !card.id.startsWith("hk-up-junior-")));
  assert.doesNotMatch(pack.evidenceText, /UP junior S1-S3 textbook publisher layer/);
});

test("combined HK evidence keeps default and zh UP junior textbook queries on the Chinese layer", () => {
  const defaultPack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S1",
    textbookVolume: "1A",
    conceptIds: ["integer-sense"],
    intent: "generate-lesson",
    limit: 3
  });
  const zhPack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S1",
    textbookVolume: "1A",
    language: "zh",
    conceptIds: ["integer-sense"],
    intent: "generate-lesson",
    limit: 3
  });

  assert.equal(defaultPack.textbookCards[0]?.id, "hk-up-junior-1a-arithmetic-directed-number-readiness");
  assert.equal(zhPack.textbookCards[0]?.id, "hk-up-junior-1a-arithmetic-directed-number-readiness");
  assert.ok(defaultPack.textbookCards.every((card) => !("sourceLanguage" in card) || card.sourceLanguage === "zh"));
  assert.ok(zhPack.textbookCards.every((card) => !("sourceLanguage" in card) || card.sourceLanguage === "zh"));
  assert.match(defaultPack.evidenceText, /UP junior S1-S3 Chinese textbook publisher layer/);
  assert.doesNotMatch(defaultPack.evidenceText, /UP junior S1-S3 English textbook publisher layer/);
});

test("UP junior safe cards and evidence pack avoid source-copying artifacts", () => {
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
    /培生初中数学中文版/i,
    /培生初中數學中文版/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("例", "题")),
    new RegExp(joined("例", "題"))
  ];
  const cardText = JSON.stringify(hongKongUpJuniorSafeCards);
  const evidence = buildHongKongUpJuniorEvidencePack({
    grade: "S1",
    volume: "1A",
    conceptIds: ["integer-sense"],
    intent: "generate-lesson",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongUpJuniorSafeCards.length, 18);
  assert.deepEqual(findHongKongUpJuniorRawSourceArtifacts({ cards: hongKongUpJuniorSafeCards, evidence }), []);
  assert.ok(hongKongUpJuniorSafeCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.ok(hongKongUpJuniorSafeCards.every((card) => card.sourceLanguage === "zh"));
});
