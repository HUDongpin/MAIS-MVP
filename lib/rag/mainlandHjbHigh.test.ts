import assert from "node:assert/strict";
import test from "node:test";
import { mainlandHjbHighRagCards } from "../../data/rag/mainlandHjbHigh";
import { mainlandHjbHighExamPatternCards } from "../../data/rag/mainlandHjbHighExamPatterns";
import { getMainlandHjbHighExamPatternCards } from "./mainlandHjbHighExamPatterns";
import { getMainlandPepHighRagCards } from "./mainlandPepHigh";
import { buildMainlandHjbHighEvidencePack, getMainlandHjbHighRagCards } from "./mainlandHjbHigh";

test("HJB high-school queries retrieve Shanghai Education Press textbook cards only", () => {
  const derivativeCards = getMainlandHjbHighRagCards({
    grade: "S6",
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 4
  });

  assert.equal(derivativeCards[0]?.id, "hjb-high-selective-2-derivatives");
  assert.ok(derivativeCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(derivativeCards.every((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const pepCards = getMainlandPepHighRagCards({
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.id.startsWith("pep-high-")));
});

test("HJB compulsory one assessment patterns retrieve unit, review, midterm, and final cards", () => {
  const setsUnitCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "upper",
    chapter: "集合与逻辑",
    assessmentFamily: "unit-test",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(setsUnitCards[0]?.id, "hjb-high-compulsory-1-sets-logic-unit-core");
  assert.ok(setsUnitCards.every((card) => card.volumeScope === "compulsory-1"));
  assert.ok(setsUnitCards.every((card) => card.assessmentFamilies.includes("unit-test")));

  const functionReviewCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "upper",
    chapter: "函数的概念、性质及应用",
    assessmentFamily: "topic-review",
    conceptIds: ["function-zero"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(functionReviewCards[0]?.id, "hjb-high-compulsory-1-function-concepts-applications-topic-review");
  assert.ok(functionReviewCards.every((card) => card.volumeScope === "compulsory-1"));

  const midtermCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "upper",
    assessmentFamily: "midterm",
    conceptIds: ["logarithmic-operations"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(midtermCards[0]?.id, "hjb-high-compulsory-1-midterm-chapters-1-3");
  assert.deepEqual(midtermCards[0]?.chapters, ["集合与逻辑", "等式与不等式", "幂、指数与对数"]);

  const finalCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "upper",
    assessmentFamily: "final",
    conceptIds: ["function-zero"],
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(finalCards[0]?.id, "hjb-high-compulsory-1-final-full-volume");
  assert.equal(finalCards[0]?.chapters.length, 5);
});

test("HJB compulsory two assessment patterns retrieve unit, midterm, and final cards", () => {
  const trigonometryUnitCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "lower",
    chapter: "三角",
    assessmentFamily: "unit-test",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(trigonometryUnitCards[0]?.id, "hjb-high-compulsory-2-trigonometry-unit-core");
  assert.ok(trigonometryUnitCards.every((card) => card.volumeScope === "compulsory-2"));
  assert.ok(trigonometryUnitCards.every((card) => card.assessmentFamilies.includes("unit-test")));

  const trigMidtermCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "lower",
    chapter: "三角函数",
    assessmentFamily: "midterm",
    intent: "exam-practice",
    limit: 5
  });
  assert.equal(trigMidtermCards[0]?.id, "hjb-high-compulsory-2-midterm-chapters-6-7");
  assert.ok(trigMidtermCards.every((card) => card.volumeScope === "compulsory-2"));
  assert.ok(trigMidtermCards.every((card) => card.assessmentFamilies.includes("midterm")));

  const finalCards = getMainlandHjbHighExamPatternCards({
    grade: "S4",
    semester: "lower",
    assessmentFamily: "final",
    conceptIds: ["complex-numbers", "plane-vectors"],
    intent: "assessment-design",
    limit: 6
  });
  assert.ok(finalCards.some((card) => card.id === "hjb-high-compulsory-2-final-full-volume"));
  assert.ok(finalCards.some((card) => card.id === "hjb-high-compulsory-2-final-challenge-synthesis"));
  assert.ok(finalCards.every((card) => card.volumeScope === "compulsory-2"));
});

test("HJB selective compulsory one assessment patterns retrieve unit focus and challenge cards", () => {
  const conicChallengeCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "lower",
    chapter: "圆锥曲线",
    assessmentFamily: "unit-test",
    difficultyBand: "challenge",
    intent: "assessment-design",
    limit: 4
  });

  assert.equal(conicChallengeCards[0]?.id, "hjb-high-selective-1-conics-unit-challenge");
  assert.ok(conicChallengeCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(conicChallengeCards.every((card) => card.assessmentFamilies.includes("unit-test")));
  assert.ok(conicChallengeCards.every((card) => card.volumeScope === "selective-compulsory-1"));
});

test("HJB compulsory three assessment patterns retrieve unit, midterm, final, and scoped bridge cards", () => {
  const spatialCoreCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    chapter: "空间直线与平面",
    assessmentFamily: "unit-test",
    difficultyBand: "core",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(spatialCoreCards[0]?.id, "hjb-high-compulsory-3-spatial-lines-planes-unit-core");
  assert.ok(spatialCoreCards.every((card) => card.volumeScope === "compulsory-3"));

  const spatialChallengeCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    chapter: "空间直线与平面",
    assessmentFamily: "unit-test",
    difficultyBand: "challenge",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(spatialChallengeCards[0]?.id, "hjb-high-compulsory-3-spatial-lines-planes-unit-challenge");

  const probabilityCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    chapter: "概率初步",
    assessmentFamily: "unit-test",
    conceptIds: ["probability-foundations"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(probabilityCards.some((card) => card.id === "hjb-high-compulsory-3-probability-foundations-unit-core"));
  assert.ok(probabilityCards.every((card) => card.volumeScope === "compulsory-3"));

  const statisticsCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    chapter: "统计",
    assessmentFamily: "unit-test",
    conceptIds: ["sampling", "data-distribution"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(statisticsCards.some((card) => card.id === "hjb-high-compulsory-3-statistics-unit-core"));
  assert.ok(statisticsCards.every((card) => card.volumeScope === "compulsory-3"));

  const midtermCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    assessmentFamily: "midterm",
    conceptIds: ["surface-volume"],
    intent: "exam-practice",
    limit: 5
  });
  assert.equal(midtermCards[0]?.id, "hjb-high-compulsory-3-midterm-chapters-10-11");
  assert.ok(midtermCards.every((card) => card.volumeScope === "compulsory-3"));
  assert.ok(!midtermCards.some((card) => card.id === "hjb-high-compulsory-3-space-vector-midterm-bridge"));

  const bridgeCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    assessmentFamily: "midterm",
    conceptIds: ["space-vectors"],
    intent: "exam-practice",
    limit: 5
  });
  assert.ok(bridgeCards.some((card) => card.id === "hjb-high-compulsory-3-space-vector-midterm-bridge"));
  assert.ok(bridgeCards.some((card) => card.volumeScope === "cross-volume-review"));

  const finalCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "upper",
    assessmentFamily: "final",
    conceptIds: ["probability-foundations", "sampling"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(finalCards.some((card) => card.id === "hjb-high-compulsory-3-final-full-volume-peiyou"));
  assert.ok(finalCards.every((card) => card.volumeScope === "compulsory-3"));
});

test("HJB selective compulsory two assessment patterns retrieve unit focus and challenge cards", () => {
  const derivativeChallengeCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "upper",
    chapter: "导数及其应用",
    assessmentFamily: "unit-test",
    difficultyBand: "challenge",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(derivativeChallengeCards[0]?.id, "hjb-high-selective-2-derivatives-unit-challenge");
  assert.ok(derivativeChallengeCards.every((card) => card.volumeScope === "selective-compulsory-2"));

  const probabilityCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "upper",
    chapter: "概率初步（续）",
    assessmentFamily: "unit-test",
    conceptIds: ["conditional-probability"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(probabilityCards.some((card) => card.id === "hjb-high-selective-2-probability-continuation-unit-core"));
  assert.ok(probabilityCards.every((card) => card.volumeScope === "selective-compulsory-2"));

  const bivariateCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "upper",
    chapter: "成对数据的统计分析",
    assessmentFamily: "unit-test",
    conceptIds: ["bivariate-data", "linear-regression"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(bivariateCards.some((card) => card.id === "hjb-high-selective-2-bivariate-data-unit-challenge"));
  assert.ok(bivariateCards.every((card) => card.volumeScope === "selective-compulsory-2"));
});

test("HJB midterm, final, and cross-volume review patterns stay scoped", () => {
  const midtermCards = getMainlandHjbHighExamPatternCards({
    grade: "S5",
    semester: "lower",
    assessmentFamily: "midterm",
    conceptIds: ["sequences"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(midtermCards[0]?.id, "hjb-high-selective-1-midterm-integrated");
  assert.ok(midtermCards.every((card) => card.volumeScope === "selective-compulsory-1"));

  const finalCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "full-year",
    assessmentFamily: "final",
    conceptIds: ["line-conic-intersection"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(finalCards.some((card) => card.id === "hjb-high-selective-1-lines-conics-synthesis"));
  assert.ok(finalCards.every((card) => card.publisher === "MAINLAND_HJB"));

  const reviewCards = getMainlandHjbHighExamPatternCards({
    assessmentFamily: "cross-volume-review",
    conceptIds: ["sampling", "solid-geometry"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(reviewCards[0]?.id, "hjb-high-cross-volume-probability-statistics-solid-review");
  assert.ok(reviewCards.every((card) => card.volumeScope === "cross-volume-review"));
});

test("HJB selective compulsory two midterm bridge cards do not over-count cross-volume review", () => {
  const derivativeMidtermCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "upper",
    chapter: "导数及其应用",
    assessmentFamily: "midterm",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 5
  });
  assert.equal(derivativeMidtermCards[0]?.id, "hjb-high-selective-2-derivatives-midterm-bridge");
  assert.ok(derivativeMidtermCards.every((card) => card.volumeScope === "selective-compulsory-2"));
  assert.ok(!derivativeMidtermCards.some((card) => card.id === "hjb-high-selective-2-lines-conics-midterm-bridge"));

  const conicBridgeCards = getMainlandHjbHighExamPatternCards({
    grade: "S6",
    semester: "upper",
    assessmentFamily: "cross-volume-review",
    conceptIds: ["line-conic-intersection"],
    intent: "assessment-design",
    limit: 5
  });
  assert.ok(conicBridgeCards.some((card) => card.id === "hjb-high-selective-2-conics-topic-review-bridge"));
  assert.ok(conicBridgeCards.every((card) => card.volumeScope === "cross-volume-review"));
});

test("HJB evidence pack combines textbook cards, HJB assessment patterns, and shared Mainland exam-pattern cards", () => {
  const pack = buildMainlandHjbHighEvidencePack({
    grade: "S5",
    semester: "lower",
    conceptIds: ["ellipse", "line-conic-intersection"],
    chapter: "圆锥曲线",
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(pack.publisher, "MAINLAND_HJB");
  assert.equal(pack.curriculumTrack, "MAINLAND_PEP_HIGH");
  assert.ok(pack.textbookCards.some((card) => card.id === "hjb-high-selective-1-conics"));
  assert.ok(pack.textbookCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pack.hjbExamPatternCards.some((card) => card.id === "hjb-high-selective-1-conics-unit-challenge"));
  assert.ok(pack.hjbExamPatternCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pack.examPatternCards.some((card) => card.id === "pep-high-exam-conics-analytic-geometry"));
  assert.match(pack.evidenceText, /Shanghai Education Press textbook sequencing/);
  assert.match(pack.evidenceText, /Shanghai Education Press assessment-pattern layer/);
  assert.match(pack.evidenceText, /Shared Mainland senior-secondary exam-pattern layer/);
});

test("HJB selective compulsory two evidence pack combines textbook, assessment, and shared exam layers", () => {
  const pack = buildMainlandHjbHighEvidencePack({
    grade: "S6",
    semester: "upper",
    conceptIds: ["derivatives", "optimization"],
    chapter: "导数及其应用",
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(pack.publisher, "MAINLAND_HJB");
  assert.ok(pack.textbookCards.some((card) => card.id === "hjb-high-selective-2-derivatives"));
  assert.ok(pack.hjbExamPatternCards.some((card) => card.id === "hjb-high-selective-2-derivatives-unit-challenge"));
  assert.ok(pack.hjbExamPatternCards.some((card) => card.id === "hjb-high-selective-2-derivatives-midterm-bridge"));
  assert.ok(pack.hjbExamPatternCards.every((card) => card.volumeScope === "selective-compulsory-2"));
  assert.ok(pack.examPatternCards.some((card) => card.id === "pep-high-exam-derivatives-optimization"));
  assert.match(pack.evidenceText, /selective-compulsory-two coverage completion/);
});

test("HJB compulsory two evidence pack combines textbook, assessment, and shared exam layers", () => {
  const pack = buildMainlandHjbHighEvidencePack({
    grade: "S4",
    semester: "lower",
    conceptIds: ["trigonometric-functions", "plane-vectors"],
    chapter: "三角函数",
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(pack.publisher, "MAINLAND_HJB");
  assert.ok(pack.textbookCards.some((card) => card.id === "hjb-high-compulsory-2-trigonometric-functions"));
  assert.ok(pack.hjbExamPatternCards.some((card) => card.id === "hjb-high-compulsory-2-trig-functions-unit-challenge"));
  assert.ok(pack.hjbExamPatternCards.some((card) => card.id === "hjb-high-compulsory-2-midterm-chapters-6-8"));
  assert.ok(pack.hjbExamPatternCards.every((card) => card.volumeScope === "compulsory-2"));
  assert.ok(pack.examPatternCards.length > 0);
  assert.match(pack.evidenceText, /Shanghai Education Press assessment-pattern layer/);
});

test("HJB safe cards and evidence avoid source-material artifacts", () => {
  const forbiddenPatterns = [
    /\.docx/i,
    /\.pptx/i,
    /\.pdf/i,
    /\.zip/i,
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /高考\s*真题/i,
    /官方\s*解析/i,
    /原题/i,
    /原文/i,
    /答案/i,
    /OCR/i,
    /source\s*path/i,
    /sourceArchive/i,
    /embedding/i,
    /source\s*locator/i,
    /source\s*file/i,
    /扫描页/i,
    /截图/i,
    /见图/i
  ];
  const cardText = JSON.stringify([...mainlandHjbHighRagCards, ...mainlandHjbHighExamPatternCards]);
  const evidence = buildMainlandHjbHighEvidencePack({
    grade: "S6",
    conceptIds: ["sequences", "line-conic-intersection"],
    intent: "exam-practice",
    limit: 5
  }).evidenceText;

  assert.equal(mainlandHjbHighRagCards.length, 21);
  assert.equal(mainlandHjbHighExamPatternCards.length, 63);
  assert.ok(mainlandHjbHighRagCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(mainlandHjbHighRagCards.every((card) => card.sourceKind === "textbook"));
  assert.ok(mainlandHjbHighExamPatternCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(mainlandHjbHighExamPatternCards.every((card) => card.sourceKind === "school-assessment-pattern" || card.sourceKind === "review-pattern"));
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "compulsory-1").length,
    12
  );
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "compulsory-3").length,
    9
  );
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "compulsory-2").length,
    14
  );
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "selective-compulsory-1").length,
    13
  );
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "selective-compulsory-2").length,
    9
  );
  assert.equal(
    mainlandHjbHighExamPatternCards.filter((card) => card.volumeScope === "cross-volume-review").length,
    6
  );

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.match(evidence, /Do not quote or reconstruct/);
  assert.match(evidence, /Keep Shanghai Education Press, PEP, and BNU textbook and assessment layers separate/);
});
