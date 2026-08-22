import assert from "node:assert/strict";
import test from "node:test";
import { hongKongUpJuniorEnglishSafeCards } from "../../data/rag/hongKongUpJuniorEnglish";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongMathEvidencePack } from "./hongKongMath";
import {
  buildHongKongUpJuniorEvidencePack,
  findHongKongUpJuniorRawSourceArtifacts,
  getHongKongUpJuniorSafeCards
} from "./hongKongUpJunior";

test("UP junior English S1-S3 textbook queries retrieve grade and volume safe cards", () => {
  const queries = [
    {
      grade: "S1" as const,
      volume: "1A" as const,
      conceptIds: ["operation-order", "integer-sense"],
      expected: "hk-up-junior-en-1a-arithmetic-directed-number-readiness"
    },
    {
      grade: "S1" as const,
      volume: "1B" as const,
      conceptIds: ["ratio", "percentage"],
      expected: "hk-up-junior-en-1b-ratio-rate-percent"
    },
    {
      grade: "S2" as const,
      volume: "2A" as const,
      topicId: "coordinates",
      conceptIds: ["straight-line-graph", "gradient"],
      expected: "hk-up-junior-en-2a-coordinate-graphs"
    },
    {
      grade: "S2" as const,
      volume: "2B" as const,
      topicId: "probability-s2",
      conceptIds: ["sample-space"],
      expected: "hk-up-junior-en-2b-probability-data"
    },
    {
      grade: "S3" as const,
      volume: "3A" as const,
      topicId: "identities-square-patterns",
      conceptIds: ["perfect-square-identity", "difference-of-squares"],
      expected: "hk-up-junior-en-3a-identities-square-patterns"
    },
    {
      grade: "S3" as const,
      volume: "3B" as const,
      topicId: "arc-length-sector-area",
      conceptIds: ["arc-length", "sector-area"],
      expected: "hk-up-junior-en-3b-arc-length-sector-area"
    }
  ];

  for (const query of queries) {
    const cards = getHongKongUpJuniorSafeCards({
      grade: query.grade,
      volume: query.volume,
      sourceLanguage: "en",
      ...(query.topicId ? { topicId: query.topicId } : {}),
      conceptIds: query.conceptIds,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected UP junior English cards for ${query.grade} ${query.volume}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceLanguage === "en"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => card.volume === query.volume));
  }
});

test("combined HK evidence routes language en to UP junior English textbook cards", () => {
  const pack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S2",
    textbookVolume: "2A",
    language: "en",
    topicId: "coordinates",
    conceptIds: ["coordinate-plane", "straight-line-graph"],
    intent: "generate-question",
    difficultyBand: "core",
    limit: 4
  });

  assert.equal(pack.textbookCards[0]?.id, "hk-up-junior-en-2a-coordinate-graphs");
  assert.ok(pack.textbookCards.every((card) => !("sourceLanguage" in card) || card.sourceLanguage === "en"));
  assert.equal(pack.examPatternCards.length, 0);
  assert.match(pack.evidenceText, /UP junior S1-S3 English textbook publisher layer/);
  assert.match(pack.evidenceText, /UP junior English textbook card/);
  assert.doesNotMatch(pack.evidenceText, /UP junior Chinese textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE UP textbook card/);
  assert.doesNotMatch(pack.evidenceText, /DSE exam pattern card/);
});

test("UP junior English textbook layer stays separate from resource-pattern routing", () => {
  const pack = buildHongKongMathEvidencePack({
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    grade: "S2",
    textbookVolume: "2B",
    materialKind: "challenge-practice",
    language: "en",
    conceptIds: ["linear-modeling", "coordinate-conditions"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-up-junior-en-challenge-practice"));
  assert.ok(pack.textbookCards.some((card) => card.id.startsWith("hk-up-junior-en-")));
  assert.ok(pack.textbookCards.some((card) => "sourceLanguage" in card && card.sourceLanguage === "en"));
  assert.ok(pack.textbookCards.every((card) => !("sourceLanguage" in card) || card.sourceLanguage === "en"));
  assert.match(pack.evidenceText, /UP junior resource layer/);
  assert.match(pack.evidenceText, /UP junior English resource-pattern evidence pack/);
  assert.doesNotMatch(pack.evidenceText, /UP junior Chinese resource-pattern evidence pack/);
  assert.match(pack.evidenceText, /UP junior S1-S3 English textbook publisher layer/);
});

test("UP junior English safe cards and evidence pack avoid source-copying artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i,
    /p\.\s*\d+/i,
    /OCR/i,
    /source\s+page/i,
    /page\s+locator/i,
    /screenshot/i,
    /worked\s+example/i,
    /question\s*(?:number|no\.|#)/i,
    /standard\s+answer/i,
    /\/Users\//i,
    /Downloads/i,
    /香港des/i,
    /培生数学与生活第三版.*英文版\.pdf/i
  ];
  const cardText = JSON.stringify(hongKongUpJuniorEnglishSafeCards);
  const evidence = buildHongKongUpJuniorEvidencePack({
    grade: "S1",
    volume: "1A",
    sourceLanguage: "en",
    conceptIds: ["integer-sense"],
    intent: "generate-lesson",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongUpJuniorEnglishSafeCards.length, 18);
  assert.deepEqual(findHongKongUpJuniorRawSourceArtifacts({ cards: hongKongUpJuniorEnglishSafeCards, evidence }), []);
  assert.ok(hongKongUpJuniorEnglishSafeCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.ok(hongKongUpJuniorEnglishSafeCards.every((card) => card.sourceLanguage === "en"));
});
