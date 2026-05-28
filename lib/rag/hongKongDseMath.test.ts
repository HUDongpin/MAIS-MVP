import assert from "node:assert/strict";
import test from "node:test";
import { hongKongDseMathExamPatternCards } from "../../data/rag/hongKongDseMathExamPatterns";
import { curriculumProfileForPublisher } from "../curriculumProfile";
import { buildHongKongDseMathEvidencePack, getHongKongDseMathExamPatternCards } from "./hongKongDseMath";
import { buildHongKongMathEvidencePack } from "./hongKongMath";

test("DSE Paper 2 queries prioritize multiple-choice distractor pattern cards", () => {
  const cards = getHongKongDseMathExamPatternCards({
    grade: "S6",
    paperComponent: "paper-2",
    conceptIds: ["distractor-analysis", "estimation"],
    intent: "generate-question",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "hk-dse-paper-2-multiple-choice-distractors");
  assert.ok(cards.every((card) => card.curriculumTrack === "HK"));
  assert.ok(cards.every((card) => card.paperComponents.includes("paper-2")));
});

test("DSE Paper 1 queries prioritize structured response pattern cards", () => {
  const cards = getHongKongDseMathExamPatternCards({
    grade: "S5",
    paperComponent: "paper-1",
    conceptIds: ["structured-response", "multi-step-reasoning"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "hk-dse-paper-1-structured-response");
});

test("DSE concept queries retrieve function, coordinate geometry, statistics, and differentiation cards", () => {
  const functions = getHongKongDseMathExamPatternCards({
    grade: "S6",
    conceptIds: ["functions", "graphs", "transformations"],
    intent: "generate-lesson",
    limit: 3
  });
  const coordinates = getHongKongDseMathExamPatternCards({
    grade: "S6",
    conceptIds: ["line-equations", "circle-equations", "locus"],
    intent: "generate-question",
    limit: 3
  });
  const statistics = getHongKongDseMathExamPatternCards({
    grade: "S6",
    conceptIds: ["probability", "sample-space", "data-representation"],
    intent: "diagnose-mistake",
    limit: 3
  });
  const differentiation = getHongKongDseMathExamPatternCards({
    grade: "S6",
    conceptIds: ["differentiation", "optimization", "tangent"],
    intent: "exam-practice",
    difficultyBand: "challenge",
    limit: 3
  });

  assert.equal(functions[0].id, "hk-dse-functions-graphs");
  assert.equal(coordinates[0].id, "hk-dse-coordinate-geometry");
  assert.equal(statistics[0].id, "hk-dse-statistics-probability");
  assert.equal(differentiation[0].id, "hk-dse-differentiation-applications");
});

test("combined HK evidence pack includes curriculum and DSE exam-pattern guidance", () => {
  const pack = buildHongKongMathEvidencePack({
    grade: "S6",
    stage: "senior-secondary-compulsory",
    topicId: "functions",
    conceptIds: ["functions", "graphs"],
    paperComponent: "paper-1",
    intent: "exam-practice",
    difficultyBand: "exam",
    language: "zh",
    limit: 4
  });

  assert.equal(pack.curriculumTrack, "HK");
  assert.ok(pack.curriculumCards.length > 0);
  assert.ok(pack.examPatternCards.length > 0);
  assert.match(pack.evidenceText, /combined HK mathematics evidence pack/);
  assert.match(pack.evidenceText, /DSE exam-pattern layer/);
  assert.doesNotMatch(pack.evidenceText, /MAINLAND_PEP_HIGH/);
});

test("DSE topic-practice paper queries retrieve publisher-neutral drill cards", () => {
  const paper1 = getHongKongDseMathExamPatternCards({
    grade: "S5",
    paperComponent: "paper-1",
    conceptIds: ["topic-practice", "paper-1-drill"],
    intent: "exam-practice",
    limit: 5
  });
  const paper2 = getHongKongDseMathExamPatternCards({
    grade: "S6",
    paperComponent: "paper-2",
    conceptIds: ["topic-practice", "paper-2-drill"],
    intent: "generate-question",
    limit: 5
  });

  assert.equal(paper1[0].id, "hk-dse-topic-practice-paper-1-structured-drill");
  assert.equal(paper2[0].id, "hk-dse-topic-practice-paper-2-mc-drill");
});

test("DSE topic-practice concept queries retrieve chapter-level safe cards", () => {
  const cases = [
    {
      expectedId: "hk-dse-topic-practice-algebra-indices-polynomials-equations",
      conceptIds: ["topic-practice", "indices", "logarithms", "polynomials"]
    },
    {
      expectedId: "hk-dse-topic-practice-functions-graphs-coordinate",
      conceptIds: ["topic-practice", "coordinate-drill", "functions", "graphs"]
    },
    {
      expectedId: "hk-dse-topic-practice-geometry-circles-locus-mensuration",
      conceptIds: ["topic-practice", "locus", "mensuration", "circle-geometry"]
    },
    {
      expectedId: "hk-dse-topic-practice-trigonometry",
      conceptIds: ["topic-practice", "trigonometric-ratio", "bearings"]
    },
    {
      expectedId: "hk-dse-topic-practice-counting-probability",
      conceptIds: ["topic-practice", "counting-principles", "permutation-combination"]
    },
    {
      expectedId: "hk-dse-topic-practice-statistics-dispersion",
      conceptIds: ["topic-practice", "dispersion", "descriptive-statistics"]
    }
  ];

  for (const { expectedId, conceptIds } of cases) {
    const cards = getHongKongDseMathExamPatternCards({
      grade: "S6",
      conceptIds,
      intent: "exam-practice",
      limit: 5
    });
    assert.equal(cards[0].id, expectedId);
  }
});

test("combined HK evidence pack includes topic-practice guidance for UP and EPH profiles", () => {
  const upPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    conceptIds: ["topic-practice", "paper-2-drill"],
    paperComponent: "paper-2",
    intent: "exam-practice",
    limit: 5
  });
  const ephPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    conceptIds: ["topic-practice", "paper-2-drill"],
    paperComponent: "paper-2",
    intent: "exam-practice",
    limit: 5
  });

  assert.ok(upPack.examPatternCards.some((card) => card.id === "hk-dse-topic-practice-paper-2-mc-drill"));
  assert.ok(ephPack.examPatternCards.some((card) => card.id === "hk-dse-topic-practice-paper-2-mc-drill"));
  assert.match(upPack.evidenceText, /Topic-practice safe cards describe chapter-level drill goals/);
  assert.match(ephPack.evidenceText, /Topic-practice safe cards describe chapter-level drill goals/);
});

test("DSE mock-paper queries retrieve full-paper rhythm guidance", () => {
  const cards = getHongKongDseMathExamPatternCards({
    grade: "S6",
    paperComponent: "paper-1",
    conceptIds: ["mock-paper", "full-paper-rhythm"],
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(cards[0].id, "hk-dse-mock-paper-1-full-paper-rhythm");
});

test("DSE mock-paper review queries retrieve solution-checking habits without source solution content", () => {
  const cards = getHongKongDseMathExamPatternCards({
    grade: "S6",
    paperComponent: "paper-1",
    conceptIds: ["mock-paper", "solution-checking", "error-diagnosis"],
    intent: "diagnose-mistake",
    limit: 5
  });
  const evidence = buildHongKongDseMathEvidencePack({
    grade: "S6",
    paperComponent: "paper-1",
    conceptIds: ["mock-paper", "solution-checking"],
    intent: "diagnose-mistake",
    limit: 3
  }).evidenceText;

  assert.equal(cards[0].id, "hk-dse-mock-paper-1-solution-checking-habits");
  assert.match(evidence, /Mock-paper safe cards describe full-paper practice goals/);
  assert.doesNotMatch(evidence, /solution\s+excerpt/i);
  assert.doesNotMatch(evidence, /solution\s+PDF/i);
  assert.doesNotMatch(evidence, /source\s+solution/i);
  assert.doesNotMatch(evidence, /worked\s+solution/i);
});

test("DSE mock-paper CE-to-DSE transition queries retrieve transition guidance", () => {
  const cards = getHongKongDseMathExamPatternCards({
    grade: "S6",
    paperComponent: "paper-1",
    conceptIds: ["mock-paper", "ce-dse-transition"],
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(cards[0].id, "hk-dse-mock-ce-to-dse-transition-patterns");
});

test("combined HK evidence pack includes mock-paper guidance for UP and EPH profiles", () => {
  const upPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_UNITED_PRIME_MIA"),
    conceptIds: ["mock-paper", "full-paper-rhythm"],
    paperComponent: "paper-1",
    intent: "exam-practice",
    limit: 5
  });
  const ephPack = buildHongKongMathEvidencePack({
    grade: "S6",
    curriculumProfile: curriculumProfileForPublisher("HK_EPH_MIF"),
    conceptIds: ["mock-paper", "full-paper-rhythm"],
    paperComponent: "paper-1",
    intent: "exam-practice",
    limit: 5
  });

  assert.ok(upPack.examPatternCards.some((card) => card.id === "hk-dse-mock-paper-1-full-paper-rhythm"));
  assert.ok(ephPack.examPatternCards.some((card) => card.id === "hk-dse-mock-paper-1-full-paper-rhythm"));
  assert.match(upPack.evidenceText, /Mock-paper safe cards describe full-paper practice goals/);
  assert.match(ephPack.evidenceText, /Mock-paper safe cards describe full-paper practice goals/);
});

test("DSE safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /\.pdf/i,
    /Oxford/i,
    /BY\s+TOPIC/i,
    /Book\s+[0-9]+/i,
    /Topic\s+[0-9]+/i,
    /All\s+Answers/i,
    /DSE\d{2}/i,
    /CE\d{2}/i,
    /P1C/i,
    /P1sol/i,
    /set\s*[0-9]+/i,
    /第\s*\d+\s*页/i,
    /第\s*\d+\s*頁/i,
    /p\.\s*\d+/i,
    /OCR/i,
    /question\s*(?:number|no\.|#)/i,
    /standard\s+answer/i,
    /solution\s+excerpt/i,
    /marking\s+scheme\s+excerpt/i,
    /source\s+page/i,
    /screenshot/i,
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("截", "圖")),
    new RegExp(joined("答", "案")),
    new RegExp(joined("解", "析")),
    new RegExp(joined("呈", "分")),
    new RegExp(joined("真", "题")),
    new RegExp(joined("真", "題")),
    new RegExp(joined("试", "卷", "题", "干")),
    new RegExp(joined("試", "卷", "題", "幹")),
    new RegExp(joined("评", "分", "细", "则")),
    new RegExp(joined("評", "分", "細", "則"))
  ];
  const cardText = JSON.stringify(hongKongDseMathExamPatternCards);
  const evidence = buildHongKongDseMathEvidencePack({
    grade: "S6",
    conceptIds: ["functions"],
    paperComponent: "paper-1",
    intent: "exam-practice",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.equal(hongKongDseMathExamPatternCards.length, 27);
  assert.ok(hongKongDseMathExamPatternCards.every((card) => card.curriculumTrack === "HK"));
});
