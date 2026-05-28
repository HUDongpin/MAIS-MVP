import assert from "node:assert/strict";
import test from "node:test";
import { mainlandHjbPrimaryAssessmentPatternCards } from "../../data/rag/mainlandHjbPrimaryAssessmentPatterns";
import { mainlandHjbPrimaryRagCards } from "../../data/rag/mainlandHjbPrimary";
import { isMainlandHjbHighGrade, isMainlandHjbJuniorGrade } from "./mainlandHjbJunior";
import { getMainlandPepRagCards } from "./mainlandPep";
import {
  buildMainlandHjbPrimaryEvidencePack,
  getMainlandHjbPrimaryRagCards,
  isMainlandHjbPrimaryGrade
} from "./mainlandHjbPrimary";
import {
  buildMainlandHjbPrimaryAssessmentPatternEvidencePack,
  getMainlandHjbPrimaryAssessmentPatternCards
} from "./mainlandHjbPrimaryAssessmentPatterns";

test("HJB primary P1 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["数学学习习惯"], expected: "hjb-primary-p1-upper-school-math-habits" },
    { conceptIds: ["立体图形"], expected: "hjb-primary-p1-upper-solids-introduction" },
    { conceptIds: ["10以内数"], expected: "hjb-primary-p1-upper-within-10-number-sense" },
    { conceptIds: ["10以内加减法"], expected: "hjb-primary-p1-upper-within-10-add-sub" },
    { conceptIds: ["20以内数"], expected: "hjb-primary-p1-upper-within-20-number-add-sub" },
    { conceptIds: ["上册复习"], expected: "hjb-primary-p1-upper-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P1",
      semester: "upper",
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P1 cards for upper ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P1 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["20以内退位减法"], expected: "hjb-primary-p1-lower-within-20-regrouping" },
    { conceptIds: ["100以内数"], expected: "hjb-primary-p1-lower-within-100-number-sense" },
    { conceptIds: ["100以内加减法"], expected: "hjb-primary-p1-lower-within-100-add-sub" },
    { conceptIds: ["时间初步认识"], expected: "hjb-primary-p1-lower-time-introduction" },
    { conceptIds: ["长度测量"], expected: "hjb-primary-p1-lower-length-measurement" },
    { conceptIds: ["身体尺"], expected: "hjb-primary-p1-lower-body-rulers-math-square" },
    { conceptIds: ["复习"], expected: "hjb-primary-p1-lower-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P1",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P1 cards for lower ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P1 upper assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["数学学习习惯"], expected: "hjb-primary-p1-upper-assessment-school-readiness" },
    { conceptIds: ["认识图形"], expected: "hjb-primary-p1-upper-assessment-solid-shapes" },
    { conceptIds: ["10以内数"], expected: "hjb-primary-p1-upper-assessment-within-10-number-sense" },
    { conceptIds: ["10以内加减法"], expected: "hjb-primary-p1-upper-assessment-within-10-add-sub" },
    { conceptIds: ["20以内数"], expected: "hjb-primary-p1-upper-assessment-within-20-number-sense" },
    { conceptIds: ["20以内加减法"], expected: "hjb-primary-p1-upper-assessment-within-20-add-sub" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P1",
      semester: "upper",
      conceptIds: query.conceptIds,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P1 upper assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P1 upper assessment-family filters retrieve focused cards", () => {
  const unitCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "unit-test",
    conceptIds: ["认识图形"],
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(unitCards[0]?.id, "hjb-primary-p1-upper-assessment-solid-shapes");

  const midtermCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "midterm",
    conceptIds: ["期中"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(midtermCards[0]?.id, "hjb-primary-p1-upper-assessment-midterm-integrated");

  const finalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "final",
    conceptIds: ["期末", "口算"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(finalCards[0]?.id, "hjb-primary-p1-upper-assessment-final-oral-calculation-integrated");
});

test("HJB primary P1 lower assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["20以内退位减法"], expected: "hjb-primary-p1-lower-assessment-within-20-regrouping" },
    { conceptIds: ["100以内数"], expected: "hjb-primary-p1-lower-assessment-within-100-number-sense" },
    { conceptIds: ["时间初步认识"], expected: "hjb-primary-p1-lower-assessment-time-introduction" },
    { conceptIds: ["100以内加减法"], expected: "hjb-primary-p1-lower-assessment-within-100-add-sub" },
    { conceptIds: ["长度测量"], expected: "hjb-primary-p1-lower-assessment-length-measurement" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P1",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P1 lower assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P1 lower assessment-family filters retrieve focused cards", () => {
  const unitCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    assessmentFamily: "unit-test",
    conceptIds: ["长度测量"],
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(unitCards[0]?.id, "hjb-primary-p1-lower-assessment-length-measurement");

  const midtermCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    assessmentFamily: "midterm",
    conceptIds: ["期中", "1-4单元"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(midtermCards[0]?.id, "hjb-primary-p1-lower-assessment-midterm-1-to-4-integrated");

  const finalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    assessmentFamily: "final",
    conceptIds: ["期末", "综合"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(finalCards[0]?.id, "hjb-primary-p1-lower-assessment-final-integrated");

  const finalByConceptCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    conceptIds: ["期末", "综合"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(finalByConceptCards[0]?.id, "hjb-primary-p1-lower-assessment-final-integrated");
});

test("HJB primary P1 assessment-pattern layer integrates with evidence pack only for assessment-like intents", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P1",
    semester: "upper",
    conceptIds: ["10以内数"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p1-upper-within-10-number-sense");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P1",
    semester: "upper",
    conceptIds: ["期末", "口算"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p1-upper-assessment-final-oral-calculation-integrated"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);

  const tutorLowerPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P1",
    semester: "lower",
    conceptIds: ["100以内数"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorLowerPack.assessmentPatternCards.length, 0);
  assert.equal(tutorLowerPack.cards[0]?.id, "hjb-primary-p1-lower-within-100-number-sense");

  const examLowerPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P1",
    semester: "lower",
    conceptIds: ["期末", "综合"],
    intent: "exam-practice",
    limit: 5
  });
  assert.ok(examLowerPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p1-lower-assessment-final-integrated"));
  assert.match(examLowerPack.evidenceText, /Primary assessment-pattern layer:/);
});

test("HJB primary P2 upper and lower queries retrieve safe cards", () => {
  const queries = [
    { semester: "upper" as const, conceptIds: ["100以内加减法"], expected: "hjb-primary-p2-upper-within-100-add-sub" },
    { semester: "upper" as const, conceptIds: ["人民币"], expected: "hjb-primary-p2-upper-money-shopping" },
    { semester: "upper" as const, conceptIds: ["方向"], expected: "hjb-primary-p2-upper-school-position-direction" },
    { semester: "upper" as const, conceptIds: ["表内乘法"], expected: "hjb-primary-p2-upper-multiplication-facts" },
    { semester: "upper" as const, conceptIds: ["分类"], expected: "hjb-primary-p2-upper-classification" },
    { semester: "upper" as const, conceptIds: ["数学广场"], expected: "hjb-primary-p2-upper-math-square-review" },
    { semester: "lower" as const, conceptIds: ["表内除法"], expected: "hjb-primary-p2-lower-division-facts" },
    { semester: "lower" as const, conceptIds: ["时间"], expected: "hjb-primary-p2-lower-time" },
    { semester: "lower" as const, conceptIds: ["万以内数"], expected: "hjb-primary-p2-lower-within-10000-number-sense" },
    { semester: "lower" as const, conceptIds: ["两三位数加减"], expected: "hjb-primary-p2-lower-two-three-digit-add-sub" },
    { semester: "lower" as const, conceptIds: ["数学广场"], expected: "hjb-primary-p2-lower-math-square-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P2",
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P2 cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB primary P2 upper assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["100以内加减法"], expected: "hjb-primary-p2-upper-assessment-within-100-add-sub-unit" },
    { conceptIds: ["人民币", "购物"], expected: "hjb-primary-p2-upper-assessment-money-shopping-unit" },
    { conceptIds: ["表内乘法"], expected: "hjb-primary-p2-upper-assessment-multiplication-facts-unit" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p2-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p2-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P2",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P2 upper assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P2 upper assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P2",
    semester: "upper",
    conceptIds: ["表内乘法"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p2-upper-multiplication-facts");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P2",
    semester: "upper",
    conceptIds: ["期末", "表内乘法"],
    intent: "exam-practice",
    limit: 5
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p2-upper-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p2-upper-assessment-multiplication-facts-unit"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P2 lower assessment-pattern queries retrieve unit, diagnostic, and exam cards", () => {
  const queries = [
    { conceptIds: ["表内除法"], expected: "hjb-primary-p2-lower-assessment-division-facts" },
    { conceptIds: ["时间"], expected: "hjb-primary-p2-lower-assessment-time" },
    { conceptIds: ["万以内数"], expected: "hjb-primary-p2-lower-assessment-within-10000-number-sense" },
    { conceptIds: ["两三位数加减"], expected: "hjb-primary-p2-lower-assessment-two-three-digit-add-sub" },
    { conceptIds: ["专项诊断", "填空"], expected: "hjb-primary-p2-lower-assessment-oral-fill-application-diagnostics" },
    { conceptIds: ["数学广场"], expected: "hjb-primary-p2-lower-assessment-math-square-review" },
    { conceptIds: ["期中", "1-3单元"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p2-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末", "全册复习"], assessmentFamily: "final" as const, expected: "hjb-primary-p2-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P2",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 5
    });

    assert.ok(cards.length > 0, `Expected HJB P2 lower assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P2 lower assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["表内除法"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p2-lower-division-facts");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["期末", "两三位数加减"],
    intent: "exam-practice",
    limit: 6
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p2-lower-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p2-lower-assessment-two-three-digit-add-sub"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P3 upper and lower queries retrieve safe cards", () => {
  const queries = [
    { semester: "upper" as const, conceptIds: ["复习与提高"], expected: "hjb-primary-p3-upper-review-place-value-operations" },
    { semester: "upper" as const, conceptIds: ["乘与除"], expected: "hjb-primary-p3-upper-multiplication-division-extension" },
    { semester: "upper" as const, conceptIds: ["时间"], expected: "hjb-primary-p3-upper-time-measurement" },
    { semester: "upper" as const, conceptIds: ["一位数乘"], expected: "hjb-primary-p3-upper-one-digit-multiplication" },
    { semester: "upper" as const, conceptIds: ["长方形正方形"], expected: "hjb-primary-p3-upper-rectangle-square-geometry" },
    { semester: "upper" as const, conceptIds: ["几分之一"], expected: "hjb-primary-p3-upper-fraction-introduction" },
    { semester: "upper" as const, conceptIds: ["数学广场"], expected: "hjb-primary-p3-upper-math-square-review" },
    { semester: "lower" as const, conceptIds: ["复习与提高"], expected: "hjb-primary-p3-lower-review-multiplication-division" },
    { semester: "lower" as const, conceptIds: ["两位数乘除"], expected: "hjb-primary-p3-lower-two-digit-multiplication-division" },
    { semester: "lower" as const, conceptIds: ["小数"], expected: "hjb-primary-p3-lower-decimal-introduction" },
    { semester: "lower" as const, conceptIds: ["面积"], expected: "hjb-primary-p3-lower-area-measurement" },
    { semester: "lower" as const, conceptIds: ["统计"], expected: "hjb-primary-p3-lower-data-statistics" },
    { semester: "lower" as const, conceptIds: ["数学广场"], expected: "hjb-primary-p3-lower-math-square-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P3",
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P3 cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB primary P3 upper assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["复习与提高"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-review-operations" },
    { conceptIds: ["一位数乘"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-one-digit-multiplication" },
    { conceptIds: ["年、月、日"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-time-calendar" },
    { conceptIds: ["一位数除"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-one-digit-division" },
    { conceptIds: ["周长"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-rectangle-square-perimeter" },
    { conceptIds: ["几分之一"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p3-upper-assessment-fraction-introduction" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p3-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p3-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P3",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P3 upper assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P3 upper assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P3",
    semester: "upper",
    conceptIds: ["一位数乘"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p3-upper-one-digit-multiplication");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P3",
    semester: "upper",
    conceptIds: ["期末", "周长", "几分之一"],
    intent: "exam-practice",
    limit: 6
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-rectangle-square-perimeter"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-fraction-introduction"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P3 lower assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["复习与提高"], expected: "hjb-primary-p3-lower-assessment-review-multiplication-division" },
    { conceptIds: ["两位数乘除"], expected: "hjb-primary-p3-lower-assessment-two-digit-multiplication-division" },
    { conceptIds: ["小数"], expected: "hjb-primary-p3-lower-assessment-decimal-introduction" },
    { conceptIds: ["面积"], expected: "hjb-primary-p3-lower-assessment-area-measurement" },
    { conceptIds: ["统计"], expected: "hjb-primary-p3-lower-assessment-data-statistics" },
    { conceptIds: ["数学广场"], expected: "hjb-primary-p3-lower-assessment-math-square-review" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p3-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p3-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P3",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P3 lower assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P3 lower assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P3",
    semester: "lower",
    conceptIds: ["面积"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p3-lower-area-measurement");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P3",
    semester: "lower",
    conceptIds: ["期末", "面积", "统计"],
    intent: "exam-practice",
    limit: 6
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-area-measurement"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-data-statistics"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P4 upper assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["复习与提高"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-upper-assessment-review-operations-fractions" },
    { conceptIds: ["大数", "四舍五入"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-upper-assessment-large-numbers-measurement" },
    { conceptIds: ["分数大小比较"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-upper-assessment-fraction-extension" },
    { conceptIds: ["整数四则运算"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-upper-assessment-four-operations-problem-solving" },
    { conceptIds: ["圆", "角"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-upper-assessment-geometry-circle-lines-angles" },
    { conceptIds: ["整理与提高"], assessmentFamily: "comprehensive" as const, expected: "hjb-primary-p4-upper-assessment-review-integration" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p4-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p4-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P4",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P4 upper assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P4 upper assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P4",
    semester: "upper",
    conceptIds: ["整数四则运算"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p4-upper-four-operations-problem-solving");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P4",
    semester: "upper",
    conceptIds: ["期末", "整数四则运算", "圆"],
    intent: "exam-practice",
    limit: 6
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-four-operations-problem-solving"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-geometry-circle-lines-angles"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P4 lower assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["四则运算"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-lower-assessment-review-operation-properties" },
    { conceptIds: ["小数"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-lower-assessment-decimals-meaning-add-sub" },
    { conceptIds: ["折线统计图"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-lower-assessment-line-statistics" },
    { conceptIds: ["垂直", "平行"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p4-lower-assessment-vertical-parallel-lines" },
    { conceptIds: ["整理与提高"], assessmentFamily: "comprehensive" as const, expected: "hjb-primary-p4-lower-assessment-review-integration" },
    { conceptIds: ["应用题", "错因诊断"], assessmentFamily: "topic-drill" as const, expected: "hjb-primary-p4-lower-assessment-stage-application-diagnostics" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p4-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p4-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P4",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P4 lower assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P4 lower assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["小数"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p4-lower-decimals-meaning-add-sub");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["期末", "小数", "折线统计图", "垂直"],
    intent: "exam-practice",
    limit: 8
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-decimals-meaning-add-sub"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-line-statistics"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-vertical-parallel-lines"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P5 upper assessment-pattern queries retrieve unit and exam cards", () => {
  const queries = [
    { conceptIds: ["小数乘除法"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p5-upper-assessment-decimal-operations-unit" },
    { conceptIds: ["简易方程"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p5-upper-assessment-equations-relationships-unit" },
    { conceptIds: ["面积"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p5-upper-assessment-plane-figure-area-unit" },
    { conceptIds: ["平均数", "统计"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p5-upper-assessment-data-average-unit" },
    { conceptIds: ["估算", "专项诊断"], assessmentFamily: "topic-drill" as const, expected: "hjb-primary-p5-upper-assessment-calculation-estimation-diagnostics" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p5-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "hjb-primary-p5-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P5",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB P5 upper assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("HJB primary P5 upper assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P5",
    semester: "upper",
    conceptIds: ["小数乘除法"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p5-upper-decimal-operations");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P5",
    semester: "upper",
    conceptIds: ["期末", "小数乘除法", "简易方程", "面积", "平均数"],
    intent: "exam-practice",
    limit: 8
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-decimal-operations-unit"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-equations-relationships-unit"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-plane-figure-area-unit"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P4 upper and lower queries retrieve safe cards", () => {
  const queries = [
    { semester: "upper" as const, conceptIds: ["复习与提高"], expected: "hjb-primary-p4-upper-review-operations-fractions" },
    { semester: "upper" as const, conceptIds: ["大数", "四舍五入"], expected: "hjb-primary-p4-upper-large-numbers-measurement" },
    { semester: "upper" as const, conceptIds: ["分数大小比较"], expected: "hjb-primary-p4-upper-fraction-extension" },
    { semester: "upper" as const, conceptIds: ["整数四则运算"], expected: "hjb-primary-p4-upper-four-operations-problem-solving" },
    { semester: "upper" as const, conceptIds: ["圆", "角"], expected: "hjb-primary-p4-upper-geometry-circle-lines-angles" },
    { semester: "lower" as const, conceptIds: ["四则运算"], expected: "hjb-primary-p4-lower-review-operation-properties" },
    { semester: "lower" as const, conceptIds: ["小数"], expected: "hjb-primary-p4-lower-decimals-meaning-add-sub" },
    { semester: "lower" as const, conceptIds: ["折线统计图"], expected: "hjb-primary-p4-lower-line-statistics" },
    { semester: "lower" as const, conceptIds: ["垂直", "平行"], expected: "hjb-primary-p4-lower-vertical-parallel-lines" },
    { semester: "lower" as const, conceptIds: ["小数与近似数"], expected: "hjb-primary-p4-lower-review-integration" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P4",
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P4 cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB primary P5 upper and lower queries retrieve safe cards", () => {
  const queries = [
    { semester: "upper" as const, conceptIds: ["小数乘除法"], expected: "hjb-primary-p5-upper-decimal-operations" },
    { semester: "upper" as const, conceptIds: ["简易方程"], expected: "hjb-primary-p5-upper-equations-relationships" },
    { semester: "upper" as const, conceptIds: ["面积"], expected: "hjb-primary-p5-upper-plane-figure-area" },
    { semester: "upper" as const, conceptIds: ["平均数"], expected: "hjb-primary-p5-upper-data-average" },
    { semester: "lower" as const, conceptIds: ["因数倍数"], expected: "hjb-primary-p5-lower-factors-multiples" },
    { semester: "lower" as const, conceptIds: ["分数"], expected: "hjb-primary-p5-lower-fractions-equivalence-operations" },
    { semester: "lower" as const, conceptIds: ["长方体正方体"], expected: "hjb-primary-p5-lower-cuboid-cube" },
    { semester: "lower" as const, conceptIds: ["统计"], expected: "hjb-primary-p5-lower-statistics-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P5",
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB primary P5 cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB primary P6 upper and lower queries retrieve safe cards", () => {
  const queries = [
    { semester: "upper" as const, conceptIds: ["数的整除"], expected: "hjb-primary-p6-upper-divisibility" },
    { semester: "upper" as const, conceptIds: ["分数"], expected: "hjb-primary-p6-upper-fractions" },
    { semester: "upper" as const, conceptIds: ["比和比例"], expected: "hjb-primary-p6-upper-ratio-proportion" },
    { semester: "upper" as const, conceptIds: ["圆", "扇形"], expected: "hjb-primary-p6-upper-circle-sector" },
    { semester: "lower" as const, conceptIds: ["有理数"], expected: "hjb-primary-p6-lower-rational-numbers" },
    { semester: "lower" as const, conceptIds: ["简单的代数式"], expected: "hjb-primary-p6-lower-simple-algebraic-expressions" },
    { semester: "lower" as const, conceptIds: ["一元一次方程"], expected: "hjb-primary-p6-lower-linear-equations-inequalities" },
    { semester: "lower" as const, conceptIds: ["线段", "角"], expected: "hjb-primary-p6-lower-segments-angles" },
    { semester: "lower" as const, conceptIds: ["长方体"], expected: "hjb-primary-p6-lower-cuboid" },
    { semester: "lower" as const, conceptIds: ["比与比例"], expected: "hjb-primary-p6-lower-ratio-proportion" },
    { semester: "lower" as const, conceptIds: ["圆与扇形"], expected: "hjb-primary-p6-lower-circle-sector" },
    { semester: "lower" as const, conceptIds: ["可能性", "统计图表"], expected: "hjb-primary-p6-lower-probability-statistics" },
    { semester: "lower" as const, conceptIds: ["圆柱", "圆锥"], expected: "hjb-primary-p6-lower-cylinder-cone" },
    { semester: "lower" as const, conceptIds: ["二元一次方程组"], expected: "hjb-primary-p6-lower-linear-systems" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryRagCards({
      grade: "P6",
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 3
    });

    assert.ok(cards.length > 0, `Expected HJB primary P6 cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB primary P6 six-up assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["有理数"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-six-up-assessment-rational-numbers-unit" },
    { conceptIds: ["简单的代数式"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-six-up-assessment-simple-algebraic-expressions-unit" },
    { conceptIds: ["一元一次方程"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-six-up-assessment-linear-equations-unit" },
    { conceptIds: ["线段", "角"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-six-up-assessment-segments-angles-unit" },
    { conceptIds: ["期中", "有理数", "代数式"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p6-six-up-assessment-midterm-integrated" },
    { conceptIds: ["期末", "有理数", "一元一次方程", "线段与角"], assessmentFamily: "final" as const, expected: "hjb-primary-p6-six-up-assessment-final-integrated" },
    { conceptIds: ["易错", "压轴", "诊断"], assessmentFamily: "topic-drill" as const, expected: "hjb-primary-p6-six-up-assessment-diagnostic-challenge-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P6",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 5
    });

    assert.ok(cards.length > 0, `Expected HJB P6 six-up assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});


test("HJB primary P6 lower 2024 assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["比与比例"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-lower-assessment-ratio-proportion" },
    { conceptIds: ["圆与扇形"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-lower-assessment-circle-sector" },
    { conceptIds: ["可能性", "统计图表"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-lower-assessment-probability-statistics" },
    { conceptIds: ["圆柱", "圆锥"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-lower-assessment-cylinder-cone" },
    { conceptIds: ["二元一次方程组"], assessmentFamily: "unit-test" as const, expected: "hjb-primary-p6-lower-assessment-linear-systems" },
    { conceptIds: ["月考", "阶段检测"], assessmentFamily: "comprehensive" as const, expected: "hjb-primary-p6-lower-assessment-stage-integrated" },
    { conceptIds: ["期中", "5-7章"], assessmentFamily: "midterm" as const, expected: "hjb-primary-p6-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末", "全册综合"], assessmentFamily: "final" as const, expected: "hjb-primary-p6-lower-assessment-final-integrated" },
    { conceptIds: ["专题", "挑战"], assessmentFamily: "topic-drill" as const, expected: "hjb-primary-p6-lower-assessment-challenge-topic-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: "P6",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 5
    });

    assert.ok(cards.length > 0, `Expected HJB P6 lower assessment cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("HJB primary P6 six-up assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["简单的代数式"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p6-lower-simple-algebraic-expressions");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "有理数", "简单的代数式", "一元一次方程", "线段与角"],
    intent: "exam-practice",
    limit: 8
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-final-integrated"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-rational-numbers-unit"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-simple-algebraic-expressions-unit"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});

test("HJB primary P6 lower assessment-pattern layer integrates with evidence pack", () => {
  const tutorPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["比与比例"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.cards[0]?.id, "hjb-primary-p6-lower-ratio-proportion");

  const examPack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "比与比例", "圆柱", "二元一次方程组"],
    intent: "exam-practice",
    limit: 8
  });

  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-ratio-proportion"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-cylinder-cone"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-linear-systems"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer:/);
  assert.match(examPack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
});


test("HJB primary routing stays separate from HJB junior and high helpers", () => {
  assert.equal(isMainlandHjbPrimaryGrade("P1"), true);
  assert.equal(isMainlandHjbPrimaryGrade("P2"), true);
  assert.equal(isMainlandHjbPrimaryGrade("P3"), true);
  assert.equal(isMainlandHjbPrimaryGrade("P4"), true);
  assert.equal(isMainlandHjbPrimaryGrade("P5"), true);
  assert.equal(isMainlandHjbPrimaryGrade("P6"), true);
  assert.equal(isMainlandHjbPrimaryGrade("S1"), false);
  assert.equal(isMainlandHjbJuniorGrade("P2"), false);
  assert.equal(isMainlandHjbJuniorGrade("P3"), false);
  assert.equal(isMainlandHjbJuniorGrade("P6"), false);
  assert.equal(isMainlandHjbHighGrade("P2"), false);
  assert.equal(isMainlandHjbHighGrade("P3"), false);
  assert.equal(isMainlandHjbHighGrade("P6"), false);

  const primaryCards = getMainlandHjbPrimaryRagCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["比与比例"],
    intent: "generate-lesson",
    limit: 4
  });
  assert.ok(primaryCards.length > 0);
  assert.equal(primaryCards[0]?.id, "hjb-primary-p6-lower-ratio-proportion");
  assert.ok(primaryCards.every((card) => card.stage === "primary" && card.grade === "P6"));
});

test("HJB P1 primary retrieval stays separated from PEP primary retrieval", () => {
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P1",
    conceptIds: ["10以内加减法"],
    intent: "generate-question",
    limit: 3
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P1",
    conceptIds: ["10以内加减法"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbCards[0]?.id, "hjb-primary-p1-upper-within-10-add-sub");
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepCards.some((card) => card.id.startsWith("hjb-primary-")));

  const hjbLowerCards = getMainlandHjbPrimaryRagCards({
    grade: "P1",
    conceptIds: ["100以内加减法"],
    intent: "generate-question",
    limit: 3
  });
  const pepLowerCards = getMainlandPepRagCards({
    grade: "P1",
    conceptIds: ["100以内加减法"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbLowerCards[0]?.id, "hjb-primary-p1-lower-within-100-add-sub");
  assert.ok(hjbLowerCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepLowerCards.length > 0);
  assert.ok(pepLowerCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepLowerCards.some((card) => card.id.startsWith("hjb-primary-")));
});

test("HJB assessment-pattern routing covers supported primary targets and stays separated from unsupported grades", () => {
  const p1FinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    conceptIds: ["期末"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p1FinalCards.some((card) => card.id === "hjb-primary-p1-upper-assessment-final-oral-calculation-integrated"));

  const p1LowerFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    conceptIds: ["期末", "综合"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p1LowerFinalCards.some((card) => card.id === "hjb-primary-p1-lower-assessment-final-integrated"));

  const p2FinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["期末", "表内乘法"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p2FinalCards.some((card) => card.id === "hjb-primary-p2-upper-assessment-final-integrated"));

  const p2LowerFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P2",
    semester: "lower",
    conceptIds: ["期末", "表内除法"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p2LowerFinalCards.some((card) => card.id === "hjb-primary-p2-lower-assessment-final-integrated"));

  const p3UpperFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P3",
    semester: "upper",
    conceptIds: ["期末", "分数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p3UpperFinalCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-final-integrated"));

  const p3LowerFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P3",
    semester: "lower",
    conceptIds: ["期末", "面积"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p3LowerFinalCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-final-integrated"));

  const p4UpperFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["期末", "整数四则运算"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p4UpperFinalCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-final-integrated"));

  const p4LowerFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P4",
    semester: "lower",
    conceptIds: ["期末", "小数", "折线统计图"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p4LowerFinalCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-final-integrated"));

  const p5UpperFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["期末", "小数乘除法", "面积"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p5UpperFinalCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-final-integrated"));

  const p6SixUpFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "有理数", "一元一次方程", "线段与角"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p6SixUpFinalCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-final-integrated"));

  const p6LowerFinalCards = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "圆柱", "二元一次方程组"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p6LowerFinalCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-final-integrated"));


  for (const grade of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
    const cards = getMainlandHjbPrimaryAssessmentPatternCards({
      grade: grade as never,
      semester: "upper",
      conceptIds: ["期末", "10以内数"],
      intent: "exam-practice",
      limit: 4
    });
    assert.equal(cards.length, 0, `Expected no HJB supported assessment-pattern cards for ${grade}`);
  }
});

test("HJB P2 primary retrieval stays separated from PEP primary retrieval", () => {
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P2",
    conceptIds: ["表内乘法"],
    intent: "generate-question",
    limit: 3
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P2",
    conceptIds: ["表内乘法"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbCards[0]?.id, "hjb-primary-p2-upper-multiplication-facts");
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepCards.some((card) => card.id.startsWith("hjb-primary-")));

  const hjbLowerCards = getMainlandHjbPrimaryRagCards({
    grade: "P2",
    conceptIds: ["表内除法"],
    intent: "generate-question",
    limit: 3
  });
  const pepLowerCards = getMainlandPepRagCards({
    grade: "P2",
    conceptIds: ["表内除法"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbLowerCards[0]?.id, "hjb-primary-p2-lower-division-facts");
  assert.ok(hjbLowerCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepLowerCards.length > 0);
  assert.ok(pepLowerCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepLowerCards.some((card) => card.id.startsWith("hjb-primary-")));
});

test("HJB P3 primary retrieval stays separated from PEP primary retrieval", () => {
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P3",
    conceptIds: ["小数"],
    intent: "generate-question",
    limit: 3
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P3",
    conceptIds: ["小数"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbCards[0]?.id, "hjb-primary-p3-lower-decimal-introduction");
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepCards.some((card) => card.id.startsWith("hjb-primary-")));
});

test("HJB P4 primary retrieval stays separated from PEP primary retrieval", () => {
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P4",
    conceptIds: ["小数"],
    intent: "generate-question",
    limit: 3
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P4",
    conceptIds: ["小数"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbCards[0]?.id, "hjb-primary-p4-lower-decimals-meaning-add-sub");
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepCards.some((card) => card.id.startsWith("hjb-primary-")));
});

test("HJB P5 primary retrieval stays separated from PEP primary retrieval", () => {
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P5",
    conceptIds: ["小数乘除法"],
    intent: "generate-question",
    limit: 3
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P5",
    conceptIds: ["小数"],
    intent: "generate-question",
    limit: 3
  });

  assert.equal(hjbCards[0]?.id, "hjb-primary-p5-upper-decimal-operations");
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!pepCards.some((card) => card.id.startsWith("hjb-primary-")));
});

test("HJB primary evidence pack carries reuse guardrails without source artifacts", () => {
  const pack = buildMainlandHjbPrimaryEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["小数", "折线统计图", "垂直"],
    intent: "generate-question",
    limit: 4
  });
  const cardText = JSON.stringify(mainlandHjbPrimaryRagCards);
  const combinedText = `${cardText}\n${pack.evidenceText}`;

  assert.equal(pack.publisher, "MAINLAND_HJB");
  assert.equal(pack.stage, "primary");
  assert.ok(pack.cards.length > 0);
  assert.match(pack.evidenceText, /Do not quote or reconstruct protected textbook examples/);
  assert.match(pack.evidenceText, /Use this evidence only to create original MAIS/);
  assert.match(pack.evidenceText, /callers must explicitly request publisher MAINLAND_HJB/);
  assert.ok(mainlandHjbPrimaryRagCards.every((card) => card.sourceKind === "safe-abstraction"));
  assert.ok(mainlandHjbPrimaryRagCards.every((card) => card.prohibitedReuseNotes.some((note) => /Do not reproduce/.test(note))));

  const forbiddenPatterns = [
    /\/Users\//,
    /Downloads/,
    /【赠送】/,
    /sourcePath/,
    /sha256/i,
    /pageCount/i,
    /第\s*\d+\s*页/,
    /p\.\s*\d+/i,
    /OCR\s*text/i,
    /PDF\s*body\s*text/i,
    /source locators/i,
    /embedding payload/i,
    /答案如下/,
    /原卷版/,
    /解析版/,
    /答题纸/,
    /期中期末/,
    /单元测试\//,
    /六年级数学上册/,
    /教材原文/
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combinedText, pattern);
  }
});

test("HJB primary assessment-pattern evidence avoids source-material artifacts", () => {
  const pack = buildMainlandHjbPrimaryAssessmentPatternEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["期中", "期末", "表内除法", "两三位数加减"],
    intent: "exam-practice",
    limit: 8
  });
  const cardText = JSON.stringify(mainlandHjbPrimaryAssessmentPatternCards);
  const combinedText = `${cardText}\n${pack.evidenceText}`;

  assert.equal(pack.publisher, "MAINLAND_HJB");
  assert.equal(pack.stage, "primary");
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.length >= 74);
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.every((card) => card.stage === "primary"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p1-lower-assessment-within-20-regrouping"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p1-lower-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p2-upper-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p2-upper-assessment-within-100-add-sub-unit"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p2-lower-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p2-lower-assessment-division-facts"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-one-digit-multiplication"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p3-upper-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p3-lower-assessment-area-measurement"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-large-numbers-measurement"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p4-upper-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-decimals-meaning-add-sub"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p4-lower-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-decimal-operations-unit"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p5-upper-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-rational-numbers-unit"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-simple-algebraic-expressions-unit"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-six-up-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-ratio-proportion"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-final-integrated"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.some((card) => card.id === "hjb-primary-p6-lower-assessment-challenge-topic-review"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.every((card) => isMainlandHjbPrimaryGrade(card.grade)));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.every((card) => card.semester === "upper" || card.semester === "lower"));
  assert.ok(mainlandHjbPrimaryAssessmentPatternCards.every((card) => card.sourceKind === "exam-practice-pattern"));
  assert.ok(pack.cards.every((card) => card.grade === "P2" && card.publisher === "MAINLAND_HJB"));

  const forbiddenPatterns = [
    /entryPath/,
    /memberName/,
    /archiveName/,
    /fileName/,
    /sourceArchive/,
    /sourcePath/,
    /\/Users\//,
    /Downloads/,
    /A3/,
    /A4/,
    /原卷版/,
    /解析版/,
    /答题纸/,
    /参考解析/,
    /期中期末/,
    /单元测试\//,
    /六年级数学上册/,
    /答案如下/,
    /原题/,
    /\.docx?/i,
    /\.wps/i,
    /OCR/i,
    /sha256/i,
    /pageCount/i,
    /第\s*\d+\s*页/,
    /p\.\s*\d+/i
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combinedText, pattern);
  }
});
