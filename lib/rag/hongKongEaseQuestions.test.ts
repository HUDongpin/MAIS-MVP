import assert from "node:assert/strict";
import test from "node:test";
import { hongKongEaseQuestionPatternCards } from "../../data/rag/hongKongEaseQuestions";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongMathEvidencePack } from "./hongKongMath";
import {
  buildHongKongEaseQuestionEvidencePack,
  findHongKongEaseQuestionRawSourceArtifacts,
  getHongKongEaseQuestionPatternCards
} from "./hongKongEaseQuestions";

test("EASE shared image queries retrieve the corpus image inventory card", () => {
  const cards = getHongKongEaseQuestionPatternCards({
    grade: "S5",
    conceptIds: ["ease-shared-bank", "question-image", "visual-question-routing"],
    requiresImageAssets: true,
    intent: "generate-question",
    limit: 4
  });

  assert.equal(cards[0]?.id, "hk-ease-shared-corpus-image-inventory");
  assert.ok(cards.length > 0);
  assert.ok(cards.every((card) => card.publisher === "HK_EASE_SHARED"));
  assert.ok(cards.some((card) => card.assetKinds.includes("question-image")));
});

test("EASE shared senior queries retrieve DSE structured-response patterns", () => {
  const cards = getHongKongEaseQuestionPatternCards({
    grade: "S6",
    topicId: "structured-response",
    conceptIds: ["multi-step-reasoning", "method-selection", "checking-reasonableness"],
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 4
  });

  assert.equal(cards[0]?.id, "hk-ease-shared-dse-structured-response");
  assert.ok(cards.every((card) => card.curriculumTrack === "HK"));
  assert.ok(cards.every((card) => card.grades.includes("S6") || card.stage === "cross-stage"));
});

test("combined HK evidence shares EASE question/image patterns across UP and EPH profiles", () => {
  const upPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    conceptIds: ["ease-shared-bank", "question-image", "visual-question-routing"],
    requiresImageAssets: true,
    intent: "generate-question",
    limit: 5
  });
  const ephPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    conceptIds: ["ease-shared-bank", "question-image", "visual-question-routing"],
    requiresImageAssets: true,
    intent: "generate-question",
    limit: 5
  });

  assert.ok(upPack.questionPatternCards.some((card) => card.id === "hk-ease-shared-corpus-image-inventory"));
  assert.ok(ephPack.questionPatternCards.some((card) => card.id === "hk-ease-shared-corpus-image-inventory"));
  assert.ok(upPack.questionPatternCards.every((card) => card.publisher === "HK_EASE_SHARED"));
  assert.ok(ephPack.questionPatternCards.every((card) => card.publisher === "HK_EASE_SHARED"));
  assert.ok(upPack.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.ok(ephPack.textbookCards.every((card) => card.publisher === "HK_EPH_MIF"));
  assert.match(upPack.evidenceText, /EASE shared question\/image layer/);
  assert.match(ephPack.evidenceText, /EASE shared question\/image layer/);
  assert.match(upPack.evidenceText, /publisher-neutral layer is shared/);
  assert.match(ephPack.evidenceText, /publisher-neutral layer is shared/);
});

test("EASE shared layer stays out of primary HK queries", () => {
  const cards = getHongKongEaseQuestionPatternCards({
    grade: "P5",
    conceptIds: ["question-image"],
    requiresImageAssets: true,
    intent: "generate-question",
    limit: 4
  });

  assert.deepEqual(cards, []);
});

test("EASE topic-specific queries do not qualify on grade or intent alone", () => {
  const cards = getHongKongEaseQuestionPatternCards({
    grade: "S6",
    topicId: "missing-topic-with-grade-match",
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 8
  });

  assert.deepEqual(cards, []);
});

test("EASE safe cards and evidence pack avoid raw source artifacts", () => {
  const forbiddenPatterns = [
    /questionText/i,
    /standardAnswer/i,
    /originName/i,
    /source\s+page/i,
    /page\s+locator/i,
    /OCR/i,
    /worked\s+example/i,
    /answer\s+key/i,
    /\/Users\//i,
    /Downloads/i,
    /p\.\s*\d+/i,
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i
  ];
  const cardText = JSON.stringify(hongKongEaseQuestionPatternCards);
  const evidence = buildHongKongEaseQuestionEvidencePack({
    grade: "S5",
    conceptIds: ["question-image"],
    requiresImageAssets: true,
    intent: "generate-question",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongEaseQuestionPatternCards.length, 8);
  assert.deepEqual(findHongKongEaseQuestionRawSourceArtifacts({ cards: hongKongEaseQuestionPatternCards, evidence }), []);
  assert.ok(hongKongEaseQuestionPatternCards.every((card) => card.publisher === "HK_EASE_SHARED"));
});
