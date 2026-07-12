import assert from "node:assert/strict";
import test from "node:test";
import { hongKongUpJuniorSafeCards } from "../../data/rag/hongKongUpJunior";
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
      topicId: "quadratic-patterns",
      conceptIds: ["quadratic-equation", "zero-product"],
      expected: "hk-up-junior-3a-quadratics-functions"
    },
    {
      grade: "S3" as const,
      volume: "3B" as const,
      topicId: "circles",
      conceptIds: ["circle-geometry", "angle-relation"],
      expected: "hk-up-junior-3b-circles-angle-geometry"
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

test("UP junior retrieval keeps S1-S3 textbook volumes separated from DSE UP cards", () => {
  const s3Cards = getHongKongUpJuniorSafeCards({
    grade: "S3",
    volume: "3B",
    conceptIds: ["circle-geometry"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 4
  });
  const combinedJunior = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S3",
    textbookVolume: "3B",
    topicId: "circles",
    conceptIds: ["circle-geometry", "angle-relation"],
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

  assert.equal(s3Cards[0]?.id, "hk-up-junior-3b-circles-angle-geometry");
  assert.ok(combinedJunior.textbookCards.some((card) => card.id === "hk-up-junior-3b-circles-angle-geometry"));
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
