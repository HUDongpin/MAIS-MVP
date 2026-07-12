import assert from "node:assert/strict";
import test from "node:test";
import { hongKongUpJuniorResourcePatternCards } from "../../data/rag/hongKongUpJuniorResources";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongMathEvidencePack } from "./hongKongMath";
import {
  buildHongKongUpJuniorResourceEvidencePack,
  findHongKongUpJuniorRawSourceArtifacts,
  getHongKongUpJuniorResourcePatternCards
} from "./hongKongUpJuniorResources";

test("UP junior resource queries retrieve S1 lesson worksheet guidance", () => {
  const cards = getHongKongUpJuniorResourcePatternCards({
    grade: "S1",
    volume: "1A",
    materialKind: "lesson-worksheet",
    conceptIds: ["algebraic-language", "integer-fluency"],
    intent: "generate-lesson",
    difficultyBand: "foundation",
    limit: 3
  });

  assert.equal(cards[0]?.id, "hk-up-junior-s1-lesson-worksheet");
  assert.ok(cards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.ok(cards.every((card) => card.stage === "junior-secondary"));
  assert.ok(cards.every((card) => card.sourceLanguage === "zh"));
});

test("UP junior resource queries retrieve S2 challenge guidance", () => {
  const cards = getHongKongUpJuniorResourcePatternCards({
    grade: "S2",
    volume: "2B",
    materialKind: "challenge-practice",
    conceptIds: ["linear-modeling", "coordinate-conditions", "case-analysis"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 3
  });

  assert.equal(cards[0]?.id, "hk-up-junior-s2-challenge-practice");
  assert.ok(cards.every((card) => card.sourceLanguage === "zh"));
});

test("UP junior resource queries retrieve S3 junior DSE type guidance", () => {
  const structured = getHongKongUpJuniorResourcePatternCards({
    grade: "S3",
    materialKind: "junior-dse-type-practice",
    topicId: "structured-response",
    conceptIds: ["method-selection", "multi-step-reasoning"],
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 4
  });
  const compact = getHongKongUpJuniorResourcePatternCards({
    grade: "S3",
    materialKind: "junior-dse-type-practice",
    topicId: "multiple-choice",
    conceptIds: ["distractor-analysis", "fast-method-selection"],
    intent: "assessment-design",
    difficultyBand: "exam",
    limit: 4
  });

  assert.equal(structured[0]?.id, "hk-up-junior-dse-type-structured-readiness");
  assert.equal(compact[0]?.id, "hk-up-junior-dse-type-compact-diagnostic");
  assert.ok(structured.every((card) => card.sourceLanguage === "zh"));
  assert.ok(compact.every((card) => card.sourceLanguage === "zh"));
});

test("UP junior English resource queries retrieve exercise-resource guidance", () => {
  const s1Worksheet = getHongKongUpJuniorResourcePatternCards({
    grade: "S1",
    volume: "1A",
    sourceLanguage: "en",
    materialKind: "lesson-worksheet",
    conceptIds: ["operation-order", "integer-fluency"],
    intent: "generate-lesson",
    difficultyBand: "foundation",
    limit: 3
  });
  const s1QuestionBank = getHongKongUpJuniorResourcePatternCards({
    grade: "S1",
    sourceLanguage: "en",
    materialKind: "question-bank",
    topicId: "question-bank",
    conceptIds: ["topic-discrimination", "distractor-design"],
    intent: "assessment-design",
    difficultyBand: "core",
    limit: 3
  });
  const s2Challenge = getHongKongUpJuniorResourcePatternCards({
    grade: "S2",
    sourceLanguage: "en",
    materialKind: "challenge-practice",
    conceptIds: ["linear-modeling", "case-analysis", "constraint-checking"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 3
  });
  const s2Assessment = getHongKongUpJuniorResourcePatternCards({
    grade: "S2",
    sourceLanguage: "en",
    materialKind: "assessment-practice",
    topicId: "continuous-assessment",
    conceptIds: ["coverage-balance", "error-diagnosis"],
    intent: "assessment-design",
    difficultyBand: "exam",
    limit: 3
  });
  const s3Hkdse = getHongKongUpJuniorResourcePatternCards({
    grade: "S3",
    sourceLanguage: "en",
    materialKind: "hkdse-style-practice",
    topicId: "structured-response",
    conceptIds: ["method-selection", "multi-step-reasoning"],
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 3
  });
  const s3Tsa = getHongKongUpJuniorResourcePatternCards({
    grade: "S3",
    sourceLanguage: "en",
    materialKind: "tsa-type-practice",
    topicId: "tsa-type-practice",
    conceptIds: ["basic-competency", "diagnostic-distractors"],
    intent: "assessment-design",
    difficultyBand: "exam",
    limit: 3
  });

  assert.equal(s1Worksheet[0]?.id, "hk-up-junior-en-s1-lesson-worksheet");
  assert.equal(s1QuestionBank[0]?.id, "hk-up-junior-en-question-bank");
  assert.equal(s2Challenge[0]?.id, "hk-up-junior-en-challenge-practice");
  assert.equal(s2Assessment[0]?.id, "hk-up-junior-en-assessment-practice");
  assert.equal(s3Hkdse[0]?.id, "hk-up-junior-en-hkdse-style-practice");
  assert.equal(s3Tsa[0]?.id, "hk-up-junior-en-tsa-type-practice");

  for (const cards of [s1Worksheet, s1QuestionBank, s2Challenge, s2Assessment, s3Hkdse, s3Tsa]) {
    assert.ok(cards.length > 0);
    assert.ok(cards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceLanguage === "en"));
  }
});

test("combined HK evidence uses UP junior layer for United Prime S1-S3 queries", () => {
  const pack = buildHongKongMathEvidencePack({
    grade: "S2",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    materialKind: "challenge-practice",
    topicId: "coordinates",
    conceptIds: ["coordinate-conditions", "linear-modeling"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-up-junior-s2-challenge-practice"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.match(pack.evidenceText, /UP junior resource layer/);
  assert.doesNotMatch(pack.evidenceText, /DSE UP textbook card/);
});

test("combined HK evidence routes language en to English UP junior exercise resources", () => {
  const pack = buildHongKongMathEvidencePack({
    grade: "S1",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    materialKind: "question-bank",
    language: "en",
    topicId: "question-bank",
    conceptIds: ["topic-discrimination", "distractor-design"],
    intent: "assessment-design",
    difficultyBand: "core",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-up-junior-en-question-bank"));
  assert.ok(pack.textbookCards.some((card) => "sourceLanguage" in card && card.sourceLanguage === "en"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.match(pack.evidenceText, /UP junior English resource-pattern evidence pack/);
  assert.doesNotMatch(pack.evidenceText, /UP junior Chinese resource-pattern evidence pack/);
});

test("combined HK evidence keeps S4-S6 DSE UP textbook routing intact", () => {
  const pack = buildHongKongMathEvidencePack({
    grade: "S4",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    conceptIds: ["algebraic-manipulation", "quadratic-equations"],
    intent: "generate-question",
    difficultyBand: "foundation",
    limit: 4
  });

  assert.ok(pack.textbookCards.some((card) => card.id === "hk-dse-up-4a-algebra-foundations"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.doesNotMatch(pack.evidenceText, /UP junior resource layer/);
});

test("combined HK evidence does not route EPH profiles to UP junior resources", () => {
  const pack = buildHongKongMathEvidencePack({
    grade: "S2",
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    materialKind: "challenge-practice",
    conceptIds: ["linear-modeling", "coordinate-conditions"],
    intent: "generate-question",
    difficultyBand: "challenge",
    limit: 4
  });

  assert.ok(pack.textbookCards.every((card) => !card.id.startsWith("hk-up-junior-")));
  assert.doesNotMatch(pack.evidenceText, /UP junior resource layer/);
});

test("UP junior safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /\.docx/i,
    /LessonWS/i,
    /Challenging_/i,
    /Junior_DSE/i,
    /GuidedSB/i,
    /_TE_/i,
    /_Sol_/i,
    /__MACOSX/i,
    /Downloads/i,
    /香港des/i,
    /Question Bank Word Files/i,
    /Full Solutions to Exercises/i,
    /HKDSE-style Questions/i,
    /TSA-type Questions/i,
    /Quick Practice Solutions/i,
    /Side Features Solutions/i,
    /source\s+member/i,
    /source\s+page/i,
    /page\s+locator/i,
    /document\s+XML/i,
    /screenshot/i,
    /question\s*(?:number|no\.|#)/i,
    /standard\s+answer/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("例", "题")),
    new RegExp(joined("例", "題"))
  ];
  const cardText = JSON.stringify(hongKongUpJuniorResourcePatternCards);
  const evidence = buildHongKongUpJuniorResourceEvidencePack({
    grade: "S3",
    materialKind: "junior-dse-type-practice",
    conceptIds: ["structured-response"],
    intent: "exam-practice",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongUpJuniorResourcePatternCards.length, 19);
  assert.deepEqual(findHongKongUpJuniorRawSourceArtifacts({ cards: hongKongUpJuniorResourcePatternCards, evidence }), []);
  assert.ok(hongKongUpJuniorResourcePatternCards.every((card) => card.publisher === "HK_UNITED_PRIME_MIA"));
  assert.equal(hongKongUpJuniorResourcePatternCards.filter((card) => card.sourceLanguage === "zh").length, 8);
  assert.equal(hongKongUpJuniorResourcePatternCards.filter((card) => card.sourceLanguage === "en").length, 11);
});
