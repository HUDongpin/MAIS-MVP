import assert from "node:assert/strict";
import test from "node:test";
import { mainlandBnuPrimaryAssessmentPatternCards } from "../../data/rag/mainlandBnuPrimaryAssessmentPatterns";
import { mainlandBnuPrimaryRagCards } from "../../data/rag/mainlandBnuPrimary";
import { getMainlandHjbPrimaryAssessmentPatternCards } from "./mainlandHjbPrimaryAssessmentPatterns";
import { getMainlandHjbPrimaryRagCards } from "./mainlandHjbPrimary";
import { getMainlandPepPrimaryExamPatternCards } from "./mainlandPepPrimaryExamPatterns";
import { getMainlandPepRagCards } from "./mainlandPep";
import {
  buildMainlandBnuPrimaryAssessmentPatternEvidencePack,
  getMainlandBnuPrimaryAssessmentPatternCards
} from "./mainlandBnuPrimaryAssessmentPatterns";
import {
  buildMainlandBnuPrimaryEvidencePack,
  getMainlandBnuPrimaryRagCards,
  isMainlandBnuPrimaryGrade
} from "./mainlandBnuPrimary";

test("BNU primary P1 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["生活中的数"], expected: "bnu-primary-p1-upper-life-number-sense" },
    { conceptIds: ["比较"], expected: "bnu-primary-p1-upper-comparison" },
    { conceptIds: ["10以内加减法"], expected: "bnu-primary-p1-upper-within-10-add-sub" },
    { conceptIds: ["分类"], expected: "bnu-primary-p1-upper-classification" },
    { conceptIds: ["位置"], expected: "bnu-primary-p1-upper-position-order" },
    { conceptIds: ["认识图形"], expected: "bnu-primary-p1-upper-solid-shapes" },
    { conceptIds: ["20以内加减法"], expected: "bnu-primary-p1-upper-within-20-add-sub" },
    { conceptIds: ["认识钟表"], expected: "bnu-primary-p1-upper-clock-introduction" },
    { conceptIds: ["上册复习"], expected: "bnu-primary-p1-upper-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P1",
      semester: "upper",
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P1 upper cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P1 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["20以内退位减法"], expected: "bnu-primary-p1-lower-within-20-regrouping" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p1-lower-observe-objects" },
    { conceptIds: ["100以内数"], expected: "bnu-primary-p1-lower-within-100-number-sense" },
    { conceptIds: ["有趣的图形"], expected: "bnu-primary-p1-lower-plane-shapes" },
    { conceptIds: ["100以内加减法"], expected: "bnu-primary-p1-lower-within-100-add-sub-nonregrouping" },
    { conceptIds: ["100以内综合加减"], expected: "bnu-primary-p1-lower-within-100-add-sub-integrated" },
    { conceptIds: ["数学好玩"], expected: "bnu-primary-p1-lower-math-play-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P1",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P1 lower cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P2 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["100以内加减法"], expected: "bnu-primary-p2-upper-add-sub-review" },
    { conceptIds: ["人民币"], expected: "bnu-primary-p2-upper-shopping-money" },
    { conceptIds: ["乘法意义"], expected: "bnu-primary-p2-upper-multiplication-introduction" },
    { conceptIds: ["图形变化"], expected: "bnu-primary-p2-upper-shape-transformations" },
    { conceptIds: ["2到5乘法"], expected: "bnu-primary-p2-upper-multiplication-facts-2-to-5" },
    { conceptIds: ["测量"], expected: "bnu-primary-p2-upper-measurement" },
    { conceptIds: ["除法意义"], expected: "bnu-primary-p2-upper-division-introduction" },
    { conceptIds: ["6到9乘法"], expected: "bnu-primary-p2-upper-multiplication-facts-6-to-9" },
    { unitTitle: "除法与整理复习", expected: "bnu-primary-p2-upper-division-facts-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P2",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "generate-question",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P2 upper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P2 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["余数直观"], expected: "bnu-primary-p2-lower-division-strengthening" },
    { conceptIds: ["方向与位置"], expected: "bnu-primary-p2-lower-direction-position" },
    { conceptIds: ["万以内数"], expected: "bnu-primary-p2-lower-large-numbers" },
    { conceptIds: ["单位换算"], expected: "bnu-primary-p2-lower-measurement" },
    { conceptIds: ["三位数加减"], expected: "bnu-primary-p2-lower-three-digit-add-sub" },
    { conceptIds: ["认识图形"], expected: "bnu-primary-p2-lower-plane-shapes" },
    { conceptIds: ["时分秒"], expected: "bnu-primary-p2-lower-time" },
    { conceptIds: ["调查与记录"], expected: "bnu-primary-p2-lower-data-recording-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P2",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "diagnose-mistake",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P2 lower cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P3 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["混合运算"], expected: "bnu-primary-p3-upper-mixed-operations" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p3-upper-observe-objects" },
    { conceptIds: ["三位数加减"], expected: "bnu-primary-p3-upper-three-digit-add-sub" },
    { conceptIds: ["乘除关系"], expected: "bnu-primary-p3-upper-multiplication-division-fluency" },
    { conceptIds: ["周长"], expected: "bnu-primary-p3-upper-perimeter" },
    { conceptIds: ["多位数乘一位数"], expected: "bnu-primary-p3-upper-multi-digit-multiplication" },
    { conceptIds: ["年 月 日"], expected: "bnu-primary-p3-upper-calendar-time" },
    { conceptIds: ["认识小数"], expected: "bnu-primary-p3-upper-decimal-introduction" },
    { unitTitle: "数学好玩及整理复习", expected: "bnu-primary-p3-upper-math-play-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P3",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P3 upper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P3 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["有余数除法"], expected: "bnu-primary-p3-lower-division" },
    { conceptIds: ["图形运动"], expected: "bnu-primary-p3-lower-shape-motion" },
    { conceptIds: ["两位数乘两位数"], expected: "bnu-primary-p3-lower-two-digit-multiplication" },
    { conceptIds: ["千克克吨"], expected: "bnu-primary-p3-lower-mass-units" },
    { conceptIds: ["面积单位"], expected: "bnu-primary-p3-lower-area" },
    { conceptIds: ["认识分数"], expected: "bnu-primary-p3-lower-fraction-introduction" },
    { conceptIds: ["数据表示"], expected: "bnu-primary-p3-lower-data-representation" },
    { unitTitle: "数学好玩及整理复习", expected: "bnu-primary-p3-lower-math-play-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P3",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "diagnose-mistake",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P3 lower cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P4 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["认识更大的数"], expected: "bnu-primary-p4-upper-large-numbers" },
    { conceptIds: ["线与角"], expected: "bnu-primary-p4-upper-lines-angles" },
    { conceptIds: ["三位数乘两位数"], expected: "bnu-primary-p4-upper-multiplication" },
    { conceptIds: ["运算律"], expected: "bnu-primary-p4-upper-operation-laws" },
    { conceptIds: ["方向与位置"], expected: "bnu-primary-p4-upper-direction-position" },
    { conceptIds: ["除数是两位数"], expected: "bnu-primary-p4-upper-division" },
    { conceptIds: ["生活中的负数"], expected: "bnu-primary-p4-upper-negative-numbers" },
    { conceptIds: ["可能性"], expected: "bnu-primary-p4-upper-probability" },
    { unitTitle: "数学好玩及整理复习", expected: "bnu-primary-p4-upper-math-play-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P4",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P4 upper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P4 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["小数加减法"], expected: "bnu-primary-p4-lower-decimal-meaning-add-sub" },
    { conceptIds: ["认识三角形和四边形"], expected: "bnu-primary-p4-lower-triangles-quadrilaterals" },
    { conceptIds: ["小数乘法"], expected: "bnu-primary-p4-lower-decimal-multiplication" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p4-lower-observe-objects" },
    { conceptIds: ["认识方程"], expected: "bnu-primary-p4-lower-equations" },
    { conceptIds: ["数据的表示和分析"], expected: "bnu-primary-p4-lower-data-representation-analysis" },
    { unitTitle: "数学好玩及整理复习", expected: "bnu-primary-p4-lower-math-play-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P4",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "diagnose-mistake",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P4 lower cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P5 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["小数除法"], expected: "bnu-primary-p5-upper-decimal-division" },
    { conceptIds: ["轴对称"], expected: "bnu-primary-p5-upper-symmetry-translation" },
    { conceptIds: ["倍数与因数"], expected: "bnu-primary-p5-upper-multiples-factors" },
    { conceptIds: ["多边形面积"], expected: "bnu-primary-p5-upper-polygon-area" },
    { conceptIds: ["分数意义"], expected: "bnu-primary-p5-upper-fraction-meaning" },
    { conceptIds: ["组合图形面积"], expected: "bnu-primary-p5-upper-composite-area" },
    { conceptIds: ["可能性"], expected: "bnu-primary-p5-upper-probability" },
    { unitTitle: "数学好玩与总复习", expected: "bnu-primary-p5-upper-review-activity" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P5",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P5 upper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P5 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["分数加减法"], expected: "bnu-primary-p5-lower-fraction-add-sub" },
    { conceptIds: ["表面积"], expected: "bnu-primary-p5-lower-cuboid-introduction" },
    { conceptIds: ["分数乘法"], expected: "bnu-primary-p5-lower-fraction-multiplication" },
    { conceptIds: ["体积单位"], expected: "bnu-primary-p5-lower-cuboid-volume" },
    { conceptIds: ["分数除法"], expected: "bnu-primary-p5-lower-fraction-division" },
    { conceptIds: ["确定位置"], expected: "bnu-primary-p5-lower-position" },
    { conceptIds: ["方程解决问题"], expected: "bnu-primary-p5-lower-equations" },
    { conceptIds: ["数据表示分析"], expected: "bnu-primary-p5-lower-data-analysis" },
    { unitTitle: "数学好玩与总复习", expected: "bnu-primary-p5-lower-review-activity" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P5",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "diagnose-mistake",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P5 lower cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P6 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["圆周长"], expected: "bnu-primary-p6-upper-circles" },
    { conceptIds: ["分数混合运算"], expected: "bnu-primary-p6-upper-fraction-mixed-operations" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p6-upper-observe-objects" },
    { conceptIds: ["百分数"], expected: "bnu-primary-p6-upper-percentage-meaning" },
    { conceptIds: ["数据处理"], expected: "bnu-primary-p6-upper-data-processing" },
    { conceptIds: ["比值"], expected: "bnu-primary-p6-upper-ratio" },
    { conceptIds: ["百分数应用"], expected: "bnu-primary-p6-upper-percentage-applications" },
    { unitTitle: "数学好玩与总复习", expected: "bnu-primary-p6-upper-review-activity" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P6",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P6 upper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P6 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["圆柱"], expected: "bnu-primary-p6-lower-cylinders-cones" },
    { conceptIds: ["比例尺"], expected: "bnu-primary-p6-lower-proportion" },
    { conceptIds: ["图形运动"], expected: "bnu-primary-p6-lower-geometric-motion" },
    { conceptIds: ["反比例"], expected: "bnu-primary-p6-lower-direct-inverse-proportion" },
    { conceptIds: ["数学好玩"], expected: "bnu-primary-p6-lower-math-play" },
    { conceptIds: ["小升初衔接"], expected: "bnu-primary-p6-lower-final-review" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryRagCards({
      grade: "P6",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "diagnose-mistake",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P6 lower cards for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary retrieval stays separated from PEP and HJB primary retrieval", () => {
  const bnuCards = getMainlandBnuPrimaryRagCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["乘法口诀"],
    intent: "generate-question",
    limit: 4
  });
  const hjbCards = getMainlandHjbPrimaryRagCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["表内乘法"],
    intent: "generate-question",
    limit: 4
  });
  const pepCards = getMainlandPepRagCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["乘法口诀"],
    intent: "generate-question",
    limit: 4
  });

  assert.ok(bnuCards.length > 0);
  assert.ok(hjbCards.length > 0);
  assert.ok(pepCards.length > 0);
  assert.ok(bnuCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!bnuCards.some((card) => card.id.startsWith("pep-primary-") || card.id.startsWith("hjb-primary-")));
  assert.ok(!hjbCards.some((card) => card.id.startsWith("bnu-primary-")));
  assert.ok(!pepCards.some((card) => card.id.startsWith("bnu-primary-")));

  const bnuP4Cards = getMainlandBnuPrimaryRagCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["大数", "运算律"],
    intent: "generate-question",
    limit: 4
  });
  const hjbP4Cards = getMainlandHjbPrimaryRagCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["大数", "四则运算"],
    intent: "generate-question",
    limit: 4
  });
  const pepP4Cards = getMainlandPepRagCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["大数认识", "角度"],
    intent: "generate-question",
    limit: 4
  });

  assert.ok(bnuP4Cards.length > 0);
  assert.ok(hjbP4Cards.length > 0);
  assert.ok(pepP4Cards.length > 0);
  assert.ok(bnuP4Cards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbP4Cards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepP4Cards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!bnuP4Cards.some((card) => card.id.startsWith("pep-primary-") || card.id.startsWith("hjb-primary-")));
  assert.ok(!hjbP4Cards.some((card) => card.id.startsWith("bnu-primary-")));
  assert.ok(!pepP4Cards.some((card) => card.id.startsWith("bnu-primary-")));

  const bnuP5Cards = getMainlandBnuPrimaryRagCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["多边形面积", "分数意义"],
    intent: "generate-question",
    limit: 4
  });
  const hjbP5Cards = getMainlandHjbPrimaryRagCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["多边形面积", "分数意义"],
    intent: "generate-question",
    limit: 4
  });
  const pepP5Cards = getMainlandPepRagCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["多边形面积", "分数意义"],
    intent: "generate-question",
    limit: 4
  });

  assert.ok(bnuP5Cards.length > 0);
  assert.ok(hjbP5Cards.length > 0);
  assert.ok(pepP5Cards.length > 0);
  assert.ok(bnuP5Cards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbP5Cards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepP5Cards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(!bnuP5Cards.some((card) => card.id.startsWith("pep-primary-") || card.id.startsWith("hjb-primary-")));
  assert.ok(!hjbP5Cards.some((card) => card.id.startsWith("bnu-primary-")));
  assert.ok(!pepP5Cards.some((card) => card.id.startsWith("bnu-primary-")));
});

test("BNU primary P1 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["生活中的数"], expected: "bnu-primary-p1-upper-assessment-school-readiness-number-sense" },
    { conceptIds: ["5以内加减"], expected: "bnu-primary-p1-upper-assessment-within-5-add-sub" },
    { conceptIds: ["分类标准"], expected: "bnu-primary-p1-upper-assessment-classification" },
    { conceptIds: ["10以内加减法"], expected: "bnu-primary-p1-upper-assessment-within-10-add-sub" },
    { conceptIds: ["立体图形"], expected: "bnu-primary-p1-upper-assessment-solid-shapes" },
    { unitTitle: "1-2单元月考", expected: "bnu-primary-p1-upper-assessment-monthly-1-to-2-integrated" },
    { conceptIds: ["期中"], expected: "bnu-primary-p1-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], expected: "bnu-primary-p1-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P1",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P1 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["20以内数与加法"], expected: "bnu-primary-p1-lower-assessment-within-20-addition" },
    { conceptIds: ["图形大变身"], expected: "bnu-primary-p1-lower-assessment-shape-transformation" },
    { conceptIds: ["20以内数与减法"], expected: "bnu-primary-p1-lower-assessment-within-20-subtraction" },
    { conceptIds: ["100以内数"], expected: "bnu-primary-p1-lower-assessment-within-100-number-sense" },
    { conceptIds: ["100以内加减法"], expected: "bnu-primary-p1-lower-assessment-within-100-add-sub" },
    { conceptIds: ["平面图形"], expected: "bnu-primary-p1-lower-assessment-plane-shapes" },
    { unitTitle: "1-2单元月考", expected: "bnu-primary-p1-lower-assessment-monthly-1-to-2-integrated" },
    { unitTitle: "5-6单元月考", expected: "bnu-primary-p1-lower-assessment-monthly-5-to-6-integrated" },
    { conceptIds: ["期中"], expected: "bnu-primary-p1-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], expected: "bnu-primary-p1-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P1",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P1 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P2 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["100以内加减法"], expected: "bnu-primary-p2-upper-assessment-within-100-add-sub-unit" },
    { conceptIds: ["测量"], expected: "bnu-primary-p2-upper-assessment-measurement-unit" },
    { conceptIds: ["乘法意义"], expected: "bnu-primary-p2-upper-assessment-multiplication-introduction-unit" },
    { conceptIds: ["2到5乘法"], expected: "bnu-primary-p2-upper-assessment-multiplication-facts-2-to-5-unit" },
    { conceptIds: ["除法意义"], expected: "bnu-primary-p2-upper-assessment-division-introduction-unit" },
    { conceptIds: ["图形运动"], expected: "bnu-primary-p2-upper-assessment-shape-motion-unit" },
    { conceptIds: ["6到9乘法"], expected: "bnu-primary-p2-upper-assessment-multiplication-facts-6-to-9-unit" },
    { conceptIds: ["乘除法应用"], expected: "bnu-primary-p2-upper-assessment-multiplication-division-application-unit" },
    { unitTitle: "1-2单元月考", expected: "bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p2-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p2-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P2",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P2 upper assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P2 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["余数直观"], expected: "bnu-primary-p2-lower-assessment-division-strengthening" },
    { conceptIds: ["方向与位置"], expected: "bnu-primary-p2-lower-assessment-direction-position" },
    { conceptIds: ["万以内数"], expected: "bnu-primary-p2-lower-assessment-large-numbers" },
    { conceptIds: ["单位换算"], expected: "bnu-primary-p2-lower-assessment-measurement" },
    { conceptIds: ["三位数加减"], expected: "bnu-primary-p2-lower-assessment-three-digit-add-sub" },
    { conceptIds: ["认识图形"], expected: "bnu-primary-p2-lower-assessment-plane-shapes" },
    { conceptIds: ["时分秒"], expected: "bnu-primary-p2-lower-assessment-time" },
    { conceptIds: ["调查与记录"], expected: "bnu-primary-p2-lower-assessment-data-recording" },
    { unitTitle: "月考阶段综合", expected: "bnu-primary-p2-lower-assessment-monthly-stage-integrated" },
    { conceptIds: ["期中"], expected: "bnu-primary-p2-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], expected: "bnu-primary-p2-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P2",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P2 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P2"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P3 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["混合运算"], expected: "bnu-primary-p3-upper-assessment-mixed-operations-unit" },
    { conceptIds: ["测量"], expected: "bnu-primary-p3-upper-assessment-measurement-two-unit" },
    { conceptIds: ["大数加与减"], expected: "bnu-primary-p3-upper-assessment-large-number-add-sub-unit" },
    { conceptIds: ["生活中的空间"], expected: "bnu-primary-p3-upper-assessment-living-space-unit" },
    { conceptIds: ["角与直角"], expected: "bnu-primary-p3-upper-assessment-plane-shapes-unit" },
    { conceptIds: ["乘除法应用"], expected: "bnu-primary-p3-upper-assessment-multiplication-division-application-two-unit" },
    { conceptIds: ["认识小数"], expected: "bnu-primary-p3-upper-assessment-decimal-introduction-unit" },
    { conceptIds: ["调查与记录"], expected: "bnu-primary-p3-upper-assessment-data-recording-unit" },
    { unitTitle: "期末题型特训", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p3-upper-assessment-final-topic-drill" },
    { unitTitle: "期末综合", assessmentFamily: "final" as const, expected: "bnu-primary-p3-upper-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P3",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P3 upper assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P3 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["除法"], expected: "bnu-primary-p3-lower-assessment-division-unit" },
    { conceptIds: ["图形运动"], expected: "bnu-primary-p3-lower-assessment-shape-motion-unit" },
    { conceptIds: ["两位数乘两位数"], expected: "bnu-primary-p3-lower-assessment-two-digit-multiplication-unit" },
    { conceptIds: ["千克克吨"], expected: "bnu-primary-p3-lower-assessment-mass-units-unit" },
    { conceptIds: ["面积"], expected: "bnu-primary-p3-lower-assessment-area-unit" },
    { conceptIds: ["认识分数"], expected: "bnu-primary-p3-lower-assessment-fraction-introduction-unit" },
    { conceptIds: ["数据表示"], expected: "bnu-primary-p3-lower-assessment-data-representation-unit" },
    { unitTitle: "月考阶段综合", expected: "bnu-primary-p3-lower-assessment-monthly-stage-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p3-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p3-lower-assessment-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P3",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P3 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P3"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P4 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["认识更大的数"], expected: "bnu-primary-p4-upper-assessment-large-numbers-unit" },
    { conceptIds: ["线与角"], expected: "bnu-primary-p4-upper-assessment-lines-angles-unit" },
    { conceptIds: ["三位数乘两位数"], expected: "bnu-primary-p4-upper-assessment-multiplication-unit" },
    { conceptIds: ["运算律"], expected: "bnu-primary-p4-upper-assessment-operation-laws-unit" },
    { conceptIds: ["方向与位置"], expected: "bnu-primary-p4-upper-assessment-direction-position-unit" },
    { conceptIds: ["除数是两位数"], expected: "bnu-primary-p4-upper-assessment-division-unit" },
    { conceptIds: ["生活中的负数"], expected: "bnu-primary-p4-upper-assessment-negative-numbers-unit" },
    { conceptIds: ["可能性"], expected: "bnu-primary-p4-upper-assessment-probability-unit" },
    { unitTitle: "第一次月考综合", expected: "bnu-primary-p4-upper-assessment-monthly-1-to-2-integrated" },
    { unitTitle: "第二次月考综合", expected: "bnu-primary-p4-upper-assessment-monthly-3-to-4-integrated" },
    { unitTitle: "第三次月考综合", expected: "bnu-primary-p4-upper-assessment-monthly-5-to-6-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p4-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p4-upper-assessment-final-integrated" },
    { unitTitle: "期末专项与素养训练", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p4-upper-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P4",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P4 upper assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P4 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["小数加减法"], expected: "bnu-primary-p4-lower-assessment-decimal-meaning-add-sub-unit" },
    { conceptIds: ["认识三角形和四边形"], expected: "bnu-primary-p4-lower-assessment-triangles-quadrilaterals-unit" },
    { conceptIds: ["小数乘法"], expected: "bnu-primary-p4-lower-assessment-decimal-multiplication-unit" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p4-lower-assessment-observe-objects-unit" },
    { conceptIds: ["认识方程"], expected: "bnu-primary-p4-lower-assessment-equations-unit" },
    { conceptIds: ["数据的表示和分析"], expected: "bnu-primary-p4-lower-assessment-data-representation-analysis-unit" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p4-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p4-lower-assessment-final-integrated" },
    { unitTitle: "期末专项复习", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p4-lower-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P4",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P4 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P4"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P5 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["小数除法"], expected: "bnu-primary-p5-upper-assessment-decimal-division-unit" },
    { conceptIds: ["轴对称"], expected: "bnu-primary-p5-upper-assessment-symmetry-translation-unit" },
    { conceptIds: ["倍数与因数"], expected: "bnu-primary-p5-upper-assessment-multiples-factors-unit" },
    { conceptIds: ["多边形面积"], expected: "bnu-primary-p5-upper-assessment-polygon-area-unit" },
    { conceptIds: ["分数意义"], expected: "bnu-primary-p5-upper-assessment-fraction-meaning-unit" },
    { conceptIds: ["组合图形面积"], expected: "bnu-primary-p5-upper-assessment-composite-area-unit" },
    { conceptIds: ["可能性"], expected: "bnu-primary-p5-upper-assessment-probability-unit" },
    { unitTitle: "月考阶段综合", expected: "bnu-primary-p5-upper-assessment-monthly-stage-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p5-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p5-upper-assessment-final-integrated" },
    { unitTitle: "期末专项与素养训练", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p5-upper-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P5",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P5 upper assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P5 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["分数加减法"], expected: "bnu-primary-p5-lower-assessment-fraction-add-sub-unit" },
    { conceptIds: ["表面积"], expected: "bnu-primary-p5-lower-assessment-cuboid-introduction-unit" },
    { conceptIds: ["分数乘法"], expected: "bnu-primary-p5-lower-assessment-fraction-multiplication-unit" },
    { conceptIds: ["体积单位"], expected: "bnu-primary-p5-lower-assessment-cuboid-volume-unit" },
    { conceptIds: ["分数除法"], expected: "bnu-primary-p5-lower-assessment-fraction-division-unit" },
    { conceptIds: ["确定位置"], expected: "bnu-primary-p5-lower-assessment-position-unit" },
    { conceptIds: ["方程解决问题"], expected: "bnu-primary-p5-lower-assessment-equations-unit" },
    { conceptIds: ["数据表示分析"], expected: "bnu-primary-p5-lower-assessment-data-analysis-unit" },
    { unitTitle: "月考综合", expected: "bnu-primary-p5-lower-assessment-monthly-stage-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p5-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p5-lower-assessment-final-integrated" },
    { unitTitle: "期末专项与素养训练", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p5-lower-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P5",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P5 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P5"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary P6 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["圆周长"], expected: "bnu-primary-p6-upper-assessment-circles-unit" },
    { conceptIds: ["分数混合运算"], expected: "bnu-primary-p6-upper-assessment-fraction-mixed-operations-unit" },
    { conceptIds: ["观察物体"], expected: "bnu-primary-p6-upper-assessment-observe-objects-unit" },
    { conceptIds: ["百分数"], expected: "bnu-primary-p6-upper-assessment-percentage-meaning-unit" },
    { conceptIds: ["数据处理"], expected: "bnu-primary-p6-upper-assessment-data-processing-unit" },
    { conceptIds: ["比值"], expected: "bnu-primary-p6-upper-assessment-ratio-unit" },
    { conceptIds: ["百分数应用"], expected: "bnu-primary-p6-upper-assessment-percentage-applications-unit" },
    { unitTitle: "月考综合", expected: "bnu-primary-p6-upper-assessment-monthly-stage-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p6-upper-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p6-upper-assessment-final-integrated" },
    { unitTitle: "期末专项与素养训练", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p6-upper-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P6",
      semester: "upper",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P6 upper assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU primary P6 lower assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["圆柱", "圆锥"], expected: "bnu-primary-p6-lower-assessment-cylinders-cones-unit" },
    { conceptIds: ["比例尺"], expected: "bnu-primary-p6-lower-assessment-proportion-unit" },
    { conceptIds: ["图形运动"], expected: "bnu-primary-p6-lower-assessment-geometric-motion-unit" },
    { conceptIds: ["正比例", "反比例"], expected: "bnu-primary-p6-lower-assessment-direct-inverse-proportion-unit" },
    { unitTitle: "1-2单元月度综合", expected: "bnu-primary-p6-lower-assessment-monthly-1-to-2-integrated" },
    { unitTitle: "3-4单元月度综合", expected: "bnu-primary-p6-lower-assessment-monthly-3-to-4-integrated" },
    { conceptIds: ["期中"], assessmentFamily: "midterm" as const, expected: "bnu-primary-p6-lower-assessment-midterm-integrated" },
    { conceptIds: ["期末"], assessmentFamily: "final" as const, expected: "bnu-primary-p6-lower-assessment-final-integrated" },
    { unitTitle: "小升初衔接", assessmentFamily: "topic-drill" as const, expected: "bnu-primary-p6-lower-assessment-final-topic-drill" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuPrimaryAssessmentPatternCards({
      grade: "P6",
      semester: "lower",
      conceptIds: query.conceptIds,
      unitTitle: query.unitTitle,
      assessmentFamily: query.assessmentFamily,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU primary P6 lower assessment cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === "P6"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU primary assessment-pattern filters affect ranking without crossing publisher", () => {
  const bnuFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuLowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "lower",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP2LowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P2",
    semester: "lower",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP3UpperFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P3",
    semester: "upper",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP3LowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P3",
    semester: "lower",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP4UpperFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P4",
    semester: "upper",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP4LowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P4",
    semester: "lower",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP5UpperFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P5",
    semester: "upper",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP5LowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P5",
    semester: "lower",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP6UpperFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P6",
    semester: "upper",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const bnuP6LowerFinal = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "P6",
    semester: "lower",
    unitTitle: "期末综合",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const hjbFinal = getMainlandHjbPrimaryAssessmentPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const pepFinal = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  const secondary = getMainlandBnuPrimaryAssessmentPatternCards({
    grade: "S4" as never,
    conceptIds: ["函数"],
    intent: "exam-practice",
    limit: 4
  });

  assert.equal(bnuFinal[0]?.id, "bnu-primary-p1-upper-assessment-final-integrated");
  assert.ok(bnuFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuLowerFinal[0]?.id, "bnu-primary-p1-lower-assessment-final-integrated");
  assert.ok(bnuLowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP2LowerFinal[0]?.id, "bnu-primary-p2-lower-assessment-final-integrated");
  assert.ok(bnuP2LowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP3UpperFinal[0]?.id, "bnu-primary-p3-upper-assessment-final-integrated");
  assert.ok(bnuP3UpperFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP3LowerFinal[0]?.id, "bnu-primary-p3-lower-assessment-final-integrated");
  assert.ok(bnuP3LowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP4UpperFinal[0]?.id, "bnu-primary-p4-upper-assessment-final-integrated");
  assert.ok(bnuP4UpperFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP4LowerFinal[0]?.id, "bnu-primary-p4-lower-assessment-final-integrated");
  assert.ok(bnuP4LowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP5UpperFinal[0]?.id, "bnu-primary-p5-upper-assessment-final-integrated");
  assert.ok(bnuP5UpperFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP5LowerFinal[0]?.id, "bnu-primary-p5-lower-assessment-final-integrated");
  assert.ok(bnuP5LowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP6UpperFinal[0]?.id, "bnu-primary-p6-upper-assessment-final-integrated");
  assert.ok(bnuP6UpperFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.equal(bnuP6LowerFinal[0]?.id, "bnu-primary-p6-lower-assessment-final-integrated");
  assert.ok(bnuP6LowerFinal.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbFinal.length > 0);
  assert.ok(hjbFinal.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepFinal.length > 0);
  assert.ok(pepFinal.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.equal(secondary.length, 0);
});

test("BNU primary evidence pack includes assessment layer only for assessment-like intents", () => {
  const tutorPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P1",
    semester: "lower",
    conceptIds: ["期中"],
    intent: "tutor-explain",
    limit: 4
  });
  const examPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P1",
    semester: "lower",
    conceptIds: ["期末"],
    intent: "exam-practice",
    limit: 4
  });
  const p2ExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P2",
    semester: "upper",
    conceptIds: ["期末"],
    intent: "exam-practice",
    limit: 4
  });
  const p2LowerExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["期末"],
    intent: "exam-practice",
    limit: 4
  });
  const p3ExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P3",
    semester: "upper",
    conceptIds: ["期末", "测量", "小数"],
    intent: "exam-practice",
    limit: 5
  });
  const p3LowerExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P3",
    semester: "lower",
    conceptIds: ["期末", "面积", "认识分数"],
    intent: "exam-practice",
    limit: 5
  });
  const p4UpperExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P4",
    semester: "upper",
    conceptIds: ["期末", "除法", "生活中的负数", "可能性"],
    intent: "exam-practice",
    limit: 5
  });
  const p4LowerExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["期末", "小数乘法", "认识方程", "数据表示"],
    intent: "exam-practice",
    limit: 5
  });
  const p5UpperExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P5",
    semester: "upper",
    conceptIds: ["期末", "小数除法", "多边形面积", "分数意义"],
    intent: "exam-practice",
    limit: 5
  });
  const p5LowerExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P5",
    semester: "lower",
    conceptIds: ["期末", "分数除法", "方程解决问题", "数据表示"],
    intent: "exam-practice",
    limit: 5
  });
  const p6UpperExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "upper",
    conceptIds: ["期末", "圆周长", "分数混合运算", "百分数应用", "比值"],
    intent: "exam-practice",
    limit: 5
  });
  const p6UpperAssessmentPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "upper",
    conceptIds: ["期末专项与素养训练", "圆", "百分数", "比"],
    intent: "assessment-design",
    limit: 5
  });
  const p6UpperTutorPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "upper",
    conceptIds: ["期末", "圆", "百分数"],
    intent: "tutor-explain",
    limit: 5
  });
  const p6LowerExamPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "圆柱", "比例", "正比例"],
    intent: "exam-practice",
    limit: 5
  });
  const p6LowerAssessmentPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["小升初衔接", "圆柱", "比例"],
    intent: "assessment-design",
    limit: 5
  });
  const p6LowerTutorPack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["期末", "圆柱", "比例"],
    intent: "tutor-explain",
    limit: 5
  });

  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.doesNotMatch(tutorPack.evidenceText, /Primary assessment-pattern layer/);
  assert.equal(p6UpperTutorPack.assessmentPatternCards.length, 0);
  assert.doesNotMatch(p6UpperTutorPack.evidenceText, /Primary assessment-pattern layer/);
  assert.equal(p6LowerTutorPack.assessmentPatternCards.length, 0);
  assert.doesNotMatch(p6LowerTutorPack.evidenceText, /Primary assessment-pattern layer/);
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p1-lower-assessment-final-integrated"));
  assert.ok(p2ExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p2-upper-assessment-final-integrated"));
  assert.ok(p2LowerExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p2-lower-assessment-final-integrated"));
  assert.ok(p3ExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p3-upper-assessment-final-integrated"));
  assert.ok(p3LowerExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p3-lower-assessment-final-integrated"));
  assert.ok(p4UpperExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p4-upper-assessment-final-integrated"));
  assert.ok(p4LowerExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p4-lower-assessment-final-integrated"));
  assert.ok(p5UpperExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p5-upper-assessment-final-integrated"));
  assert.ok(p5LowerExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p5-lower-assessment-final-integrated"));
  assert.ok(p6UpperExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p6-upper-assessment-final-integrated"));
  assert.ok(p6UpperAssessmentPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p6-upper-assessment-final-topic-drill"));
  assert.ok(p6LowerExamPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p6-lower-assessment-final-integrated"));
  assert.ok(p6LowerAssessmentPack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p6-lower-assessment-final-topic-drill"));
  assert.match(examPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p2ExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p2LowerExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p3ExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p3LowerExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p4UpperExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p4LowerExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p5UpperExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p5LowerExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p6UpperExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p6UpperAssessmentPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p6LowerExamPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(p6LowerAssessmentPack.evidenceText, /Primary assessment-pattern layer/);
  assert.match(examPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p2ExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p2LowerExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p3ExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p3LowerExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p4UpperExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p4LowerExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p5UpperExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p5LowerExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p6UpperExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p6UpperAssessmentPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p6LowerExamPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.match(p6LowerAssessmentPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
});

test("BNU primary evidence pack includes P2 lower assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P2",
      semester: "lower",
      conceptIds: ["期末", "三位数加减", "调查与记录"],
      intent,
      limit: 6
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P2 lower assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p2-lower-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P2"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /BNU primary assessment pattern/);
  }
});

test("BNU primary evidence pack includes P3 upper assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P3",
      semester: "upper",
      conceptIds: ["期末", "混合运算", "测量", "认识小数", "调查与记录"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P3 upper assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p3-upper-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P3"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P1-P3 assessment-pattern guidance/);
  }
});

test("BNU primary evidence pack includes P3 lower assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P3",
      semester: "lower",
      conceptIds: ["期末", "面积", "认识分数", "数据表示"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P3 lower assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p3-lower-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P3"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P1-P3 assessment-pattern guidance/);
  }
});

test("BNU primary evidence pack includes P4 upper assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P4",
      semester: "upper",
      conceptIds: ["期末", "除法", "生活中的负数", "可能性"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P4 upper assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p4-upper-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P4"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.semester === "upper"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P1-P4 upper source papers/);
  }
});

test("BNU primary evidence pack includes P4 lower assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P4",
      semester: "lower",
      conceptIds: ["期末", "小数乘法", "认识方程", "数据表示"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P4 lower assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p4-lower-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P4"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P1-P4 lower source papers/);
  }
});

test("BNU primary evidence pack includes P5 upper assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P5",
      semester: "upper",
      conceptIds: ["期末", "小数除法", "多边形面积", "分数意义", "可能性"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P5 upper assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p5-upper-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P5"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.semester === "upper"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P5 upper source papers/);
  }
});

test("BNU primary evidence pack includes P5 lower assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P5",
      semester: "lower",
      conceptIds: ["期末", "分数除法", "方程解决问题", "数据表示"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P5 lower assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p5-lower-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P5"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.semester === "lower"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P5 lower source papers/);
  }
});

test("BNU primary evidence pack includes P6 upper assessment layer for assessment-like intents", () => {
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuPrimaryEvidencePack({
      grade: "P6",
      semester: "upper",
      conceptIds: ["期末", "圆周长", "分数混合运算", "百分数应用", "比值", "数据处理"],
      intent,
      limit: 7
    });

    assert.ok(pack.assessmentPatternCards.length > 0, `Expected P6 upper assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.some((card) => card.id === "bnu-primary-p6-upper-assessment-final-integrated"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.grade === "P6"));
    assert.ok(pack.assessmentPatternCards.every((card) => card.semester === "upper"));
    assert.match(pack.evidenceText, /Primary assessment-pattern layer/);
    assert.match(pack.evidenceText, /currently available Beijing Normal University Press assessment-pattern guidance/);
    assert.doesNotMatch(pack.evidenceText, /P6 upper source papers/);
  }
});

test("BNU primary assessment-pattern evidence avoids source-material artifacts", () => {
  const forbiddenPatterns = [
    /\/Users\//,
    new RegExp("Down" + "loads"),
    new RegExp("source" + "Path"),
    new RegExp("entry" + "Path"),
    new RegExp("file" + "Name"),
    /sha256/i,
    /第\s*\d+\s*页/,
    /p\.\s*\d+/i,
    /OCR\s*text/i,
    /source locators/i,
    new RegExp("embedding " + "payload", "i"),
    /答案如下/,
    /参考答案/,
    /参考解析/,
    new RegExp("原" + "卷版"),
    new RegExp("解" + "析版"),
    /答题纸/,
    /答题卡/,
    /考试版/,
    new RegExp("source " + "member names", "i"),
    new RegExp("source " + "file names", "i")
  ];
  const cardText = JSON.stringify(mainlandBnuPrimaryAssessmentPatternCards);
  const evidence = [
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P1",
      semester: "lower",
      conceptIds: ["期中", "期末", "100以内加减法"],
      intent: "assessment-design",
      limit: 5
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P2",
      semester: "upper",
      conceptIds: ["期中", "期末", "乘法口诀", "测量"],
      intent: "assessment-design",
      limit: 5
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P2",
      semester: "lower",
      conceptIds: ["期中", "期末", "三位数加减", "调查与记录"],
      intent: "assessment-design",
      limit: 5
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P3",
      semester: "upper",
      conceptIds: ["期末", "混合运算", "测量", "小数", "调查与记录"],
      intent: "assessment-design",
      limit: 6
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P3",
      semester: "lower",
      conceptIds: ["期中", "期末", "面积", "认识分数", "数据表示"],
      intent: "assessment-design",
      limit: 6
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P4",
      semester: "upper",
      conceptIds: ["期中", "期末", "除法", "负数", "可能性"],
      intent: "assessment-design",
      limit: 7
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P4",
      semester: "lower",
      conceptIds: ["期中", "期末", "小数乘法", "认识方程", "数据表示"],
      intent: "assessment-design",
      limit: 6
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P5",
      semester: "upper",
      conceptIds: ["期中", "期末", "小数除法", "多边形面积", "分数意义"],
      intent: "assessment-design",
      limit: 7
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P5",
      semester: "lower",
      conceptIds: ["期中", "期末", "分数除法", "方程解决问题", "数据表示"],
      intent: "assessment-design",
      limit: 7
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P6",
      semester: "upper",
      conceptIds: ["期中", "期末", "圆周长", "分数混合运算", "百分数应用", "比值", "数据处理"],
      intent: "assessment-design",
      limit: 8
    }).evidenceText,
    buildMainlandBnuPrimaryAssessmentPatternEvidencePack({
      grade: "P6",
      semester: "lower",
      conceptIds: ["期中", "期末", "圆柱", "比例", "图形运动", "正比例", "小升初衔接"],
      intent: "assessment-design",
      limit: 8
    }).evidenceText
  ].join("\n");

  assert.equal(mainlandBnuPrimaryAssessmentPatternCards.length, 126);
  assert.ok(mainlandBnuPrimaryAssessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(mainlandBnuPrimaryAssessmentPatternCards.every((card) => card.stage === "primary"));
  assert.ok(mainlandBnuPrimaryAssessmentPatternCards.every((card) => card.sourceKind === "exam-practice-pattern"));
  assert.deepEqual(
    new Set(mainlandBnuPrimaryAssessmentPatternCards.map((card) => `${card.grade}-${card.semester}`)),
    new Set(["P1-upper", "P1-lower", "P2-upper", "P2-lower", "P3-upper", "P3-lower", "P4-upper", "P4-lower", "P5-upper", "P5-lower", "P6-upper", "P6-lower"])
  );
  assert.ok(mainlandBnuPrimaryAssessmentPatternCards.every((card) => card.prohibitedReuseNotes.some((note) => /Do not copy/.test(note))));

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
});

test("BNU primary evidence pack carries reuse guardrails without source artifacts", () => {
  const pack = buildMainlandBnuPrimaryEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["小数乘法", "认识方程", "数据表示"],
    intent: "generate-question",
    limit: 4
  });
  const cardText = JSON.stringify(mainlandBnuPrimaryRagCards);
  const combinedText = `${cardText}\n${pack.evidenceText}`;

  assert.equal(pack.publisher, "MAINLAND_BNU");
  assert.equal(pack.stage, "primary");
  assert.ok(pack.cards.length > 0);
  assert.match(pack.evidenceText, /Use this evidence only to create original MAIS/);
  assert.match(pack.evidenceText, /primary textbook sequencing/);
  assert.match(pack.evidenceText, /P1-P6 primary textbook sequencing/);
  assert.doesNotMatch(pack.evidenceText, /P1-P5 primary textbook sequencing/);
  assert.doesNotMatch(pack.evidenceText, /P1-P3 primary textbook sequencing/);
  assert.match(pack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
  assert.ok(mainlandBnuPrimaryRagCards.length >= 95);
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => card.stage === "primary"));
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => card.sourceKind === "safe-abstraction"));
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => isMainlandBnuPrimaryGrade(card.grade)));
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => card.semester === "upper" || card.semester === "lower"));
  assert.ok(mainlandBnuPrimaryRagCards.every((card) => card.prohibitedReuseNotes.some((note) => /Do not reproduce/.test(note))));

  const gradeSemesterSlots = new Set(mainlandBnuPrimaryRagCards.map((card) => `${card.grade}-${card.semester}`));
  assert.deepEqual(gradeSemesterSlots, new Set(["P1-upper", "P1-lower", "P2-upper", "P2-lower", "P3-upper", "P3-lower", "P4-upper", "P4-lower", "P5-upper", "P5-lower", "P6-upper", "P6-lower"]));

  const forbiddenPatterns = [
    /\/Users\//,
    new RegExp("Down" + "loads"),
    new RegExp("赠" + "送"),
    new RegExp("高清" + "教材"),
    new RegExp("file" + "Name"),
    new RegExp("source" + "Path"),
    /sha256/i,
    /hash/i,
    /pageCount/i,
    /第\s*\d+\s*页/,
    /p\.\s*\d+/i,
    /OCR\s*text/i,
    /PDF\s*body\s*text/i,
    /source locators/i,
    new RegExp("embedding " + "payload", "i"),
    /答案如下/,
    /参考答案/,
    /参考解析/,
    new RegExp("原" + "卷版"),
    new RegExp("解" + "析版"),
    /答题纸/,
    /答题卡/,
    /考试版/,
    /教材原文/
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combinedText, pattern);
  }
});

test("BNU primary grade helper is future-compatible with primary grades only", () => {
  assert.equal(isMainlandBnuPrimaryGrade("P1"), true);
  assert.equal(isMainlandBnuPrimaryGrade("P2"), true);
  assert.equal(isMainlandBnuPrimaryGrade("P3"), true);
  assert.equal(isMainlandBnuPrimaryGrade("P4"), true);
  assert.equal(isMainlandBnuPrimaryGrade("P5"), true);
  assert.equal(isMainlandBnuPrimaryGrade("P6"), true);
  assert.equal(isMainlandBnuPrimaryGrade("S1"), false);
  assert.equal(isMainlandBnuPrimaryGrade("S6"), false);
});
