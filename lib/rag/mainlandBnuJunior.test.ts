import assert from "node:assert/strict";
import test from "node:test";
import { mainlandBnuJuniorAssessmentPatternCards } from "../../data/rag/mainlandBnuJuniorAssessmentPatterns";
import { mainlandBnuJuniorRagCards } from "../../data/rag/mainlandBnuJunior";
import { mainlandHjbJuniorRagCards } from "../../data/rag/mainlandHjbJunior";
import { mainlandPepJuniorRagCards } from "../../data/rag/mainlandPepJunior";
import {
  buildMainlandBnuJuniorAssessmentPatternEvidencePack,
  buildMainlandBnuJuniorGenerationEvidencePack,
  getMainlandBnuJuniorAssessmentPatternCards,
  isMainlandBnuJuniorAssessmentFamily,
  isMainlandBnuJuniorAssessmentGrade,
  isMainlandBnuJuniorAssessmentMaterialKind
} from "./mainlandBnuJuniorAssessmentPatterns";
import {
  buildMainlandBnuJuniorEvidencePack,
  getMainlandBnuJuniorRagCards,
  isMainlandBnuJuniorGrade
} from "./mainlandBnuJunior";
import { getMainlandHjbJuniorRagCards } from "./mainlandHjbJunior";
import { getMainlandPepRagCards } from "./mainlandPep";

test("BNU junior S1 upper queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["丰富的图形世界"], expected: "bnu-junior-s1-upper-spatial-figures" },
    { conceptIds: ["有理数"], expected: "bnu-junior-s1-upper-rational-numbers" },
    { conceptIds: ["整式"], expected: "bnu-junior-s1-upper-algebraic-expressions" },
    { conceptIds: ["基本平面图形"], expected: "bnu-junior-s1-upper-plane-figures" },
    { conceptIds: ["一元一次方程"], expected: "bnu-junior-s1-upper-linear-equations" },
    { conceptIds: ["数据的收集与整理"], expected: "bnu-junior-s1-upper-data-collection" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorRagCards({
      grade: "S1",
      semester: "upper",
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 upper card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "safe-abstraction"));
    assert.ok(cards.every((card) => card.grade === "S1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU junior S1 lower queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["整式的乘除"], expected: "bnu-junior-s1-lower-polynomial-multiply-divide" },
    { conceptIds: ["相交线与平行线"], expected: "bnu-junior-s1-lower-intersecting-parallel-lines" },
    { conceptIds: ["三角形"], expected: "bnu-junior-s1-lower-triangles" },
    { conceptIds: ["变量之间的关系"], expected: "bnu-junior-s1-lower-variable-relationships" },
    { conceptIds: ["轴对称"], expected: "bnu-junior-s1-lower-axis-symmetry" },
    { conceptIds: ["概率初步"], expected: "bnu-junior-s1-lower-probability-introduction" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorRagCards({
      grade: "S1",
      semester: "lower",
      conceptIds: query.conceptIds,
      intent: "generate-lesson",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 lower card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "safe-abstraction"));
    assert.ok(cards.every((card) => card.grade === "S1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU junior S1 upper assessment-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["丰富的图形世界"], expected: "bnu-junior-s1-upper-assessment-spatial-figures-unit" },
    { conceptIds: ["有理数及其运算"], expected: "bnu-junior-s1-upper-assessment-rational-numbers-unit" },
    { conceptIds: ["整式及其加减"], expected: "bnu-junior-s1-upper-assessment-algebraic-expressions-unit" },
    { conceptIds: ["基本平面图形"], expected: "bnu-junior-s1-upper-assessment-plane-figures-unit" },
    { conceptIds: ["一元一次方程"], expected: "bnu-junior-s1-upper-assessment-linear-equations-unit" },
    { conceptIds: ["数据的收集与整理"], expected: "bnu-junior-s1-upper-assessment-data-collection-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S1",
      semester: "upper",
      conceptIds: query.conceptIds,
      intent: "assessment-design",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 upper assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S1"));
    assert.ok(cards.every((card) => card.semester === "upper"));
  }
});

test("BNU junior S1 upper assessment-pattern queries retrieve term-review card", () => {
  for (const unitTitle of ["期中", "期末", "综合"]) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S1",
      semester: "upper",
      unitTitle,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 upper integrated assessment card for ${unitTitle}`);
    assert.equal(cards[0]?.id, "bnu-junior-s1-upper-assessment-midterm-final-integrated");
    assert.equal(cards[0]?.sourceKind, "review-pattern");
    assert.ok(cards[0]?.assessmentFamilies.includes("midterm"));
    assert.ok(cards[0]?.assessmentFamilies.includes("final"));
    assert.ok(cards[0]?.materialKinds.includes("midterm-final"));
  }
});

test("BNU junior S1 lower assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["整式的乘除"], expected: "bnu-junior-s1-lower-assessment-polynomial-multiply-divide-unit" },
    { conceptIds: ["相交线与平行线"], expected: "bnu-junior-s1-lower-assessment-intersecting-parallel-lines-unit" },
    { conceptIds: ["概率初步"], expected: "bnu-junior-s1-lower-assessment-probability-introduction-unit" },
    { conceptIds: ["三角形"], expected: "bnu-junior-s1-lower-assessment-triangles-unit" },
    { conceptIds: ["轴对称"], expected: "bnu-junior-s1-lower-assessment-axis-symmetry-unit" },
    { conceptIds: ["变量之间的关系"], expected: "bnu-junior-s1-lower-assessment-variable-relationships-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S1",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "assessment-design",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 lower assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
  }
});

test("BNU junior S1 lower assessment-pattern queries retrieve month, midterm, final, and challenge cards", () => {
  const queries = [
    {
      unitTitle: "月考",
      expected: "bnu-junior-s1-lower-assessment-monthly-1-to-2-integrated",
      family: "monthly" as const,
      materialKind: "monthly-assessment" as const
    },
    {
      unitTitle: "第一至三章",
      conceptIds: ["probability-introduction"],
      expected: "bnu-junior-s1-lower-assessment-midterm-1-to-3-integrated",
      family: "midterm" as const,
      materialKind: "midterm-final" as const
    },
    {
      unitTitle: "期中综合扩展",
      conceptIds: ["triangles"],
      expected: "bnu-junior-s1-lower-assessment-midterm-1-to-4-integrated",
      family: "midterm" as const,
      materialKind: "midterm-final" as const
    },
    {
      unitTitle: "期末",
      expected: "bnu-junior-s1-lower-assessment-final-1-to-6-integrated",
      family: "final" as const,
      materialKind: "midterm-final" as const
    },
    {
      unitTitle: "高阶综合",
      expected: "bnu-junior-s1-lower-assessment-challenge-review",
      family: "topic-review" as const,
      materialKind: "review" as const
    }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S1",
      semester: "lower",
      unitTitle: query.unitTitle,
      conceptIds: "conceptIds" in query ? query.conceptIds : undefined,
      assessmentFamily: query.family,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S1 lower review card for ${query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.equal(cards[0]?.sourceKind, "review-pattern");
    assert.ok(cards[0]?.assessmentFamilies.includes(query.family));
    assert.ok(cards[0]?.materialKinds.includes(query.materialKind));
  }
});

test("BNU junior S2 upper assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["勾股定理"], expected: "bnu-junior-s2-upper-assessment-pythagorean-theorem-unit" },
    { conceptIds: ["实数"], expected: "bnu-junior-s2-upper-assessment-real-numbers-unit" },
    { conceptIds: ["位置与坐标"], expected: "bnu-junior-s2-upper-assessment-position-coordinates-unit" },
    { conceptIds: ["一次函数"], expected: "bnu-junior-s2-upper-assessment-linear-functions-unit" },
    { conceptIds: ["二元一次方程组"], expected: "bnu-junior-s2-upper-assessment-linear-systems-unit" },
    { conceptIds: ["数据的分析"], expected: "bnu-junior-s2-upper-assessment-data-analysis-unit" },
    { conceptIds: ["平行线的证明"], expected: "bnu-junior-s2-upper-assessment-parallel-lines-proof-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S2",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "generate-question",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S2 upper assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S2"));
    assert.ok(cards.every((card) => card.semester === "upper"));
    assert.ok(cards.every((card) => card.assessmentFamilies.includes("unit-test")));
  }
});

test("BNU junior S2 upper assessment-pattern queries retrieve topic-review midterm and final cards", () => {
  const topicReviewCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "upper",
    assessmentFamily: "topic-review",
    intent: "assessment-design",
    limit: 4
  });
  const midtermCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "upper",
    assessmentFamily: "midterm",
    intent: "assessment-design",
    limit: 4
  });
  const finalCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "upper",
    assessmentFamily: "final",
    intent: "exam-practice",
    limit: 4
  });
  const evidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["一次函数", "平行线的证明"],
    intent: "exam-practice",
    limit: 6
  });
  const tutorEvidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["一次函数"],
    intent: "tutor-explain",
    limit: 4
  });

  assert.equal(topicReviewCards[0]?.id, "bnu-junior-s2-upper-assessment-monthly-midterm-final-integrated");
  assert.equal(midtermCards[0]?.id, "bnu-junior-s2-upper-assessment-monthly-midterm-final-integrated");
  assert.equal(finalCards[0]?.id, "bnu-junior-s2-upper-assessment-monthly-midterm-final-integrated");
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s2-upper-assessment-linear-functions-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s2-upper-assessment-parallel-lines-proof-unit"));
  assert.match(evidence.evidenceText, /BNU junior assessment-pattern layer:/);
  assert.equal(tutorEvidence.assessmentPatternCards.length, 0);
  assert.doesNotMatch(tutorEvidence.evidenceText, /BNU junior assessment-pattern layer:/);
});

test("BNU junior S2 lower assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["三角形的证明及其应用"], expected: "bnu-junior-s2-lower-assessment-triangle-proof-unit" },
    { conceptIds: ["不等式与不等式组"], expected: "bnu-junior-s2-lower-assessment-inequalities-unit" },
    { conceptIds: ["图形的平移与旋转"], expected: "bnu-junior-s2-lower-assessment-transformations-unit" },
    { conceptIds: ["因式分解"], expected: "bnu-junior-s2-lower-assessment-factorization-unit" },
    { conceptIds: ["分式与分式方程"], expected: "bnu-junior-s2-lower-assessment-algebraic-fractions-unit" },
    { conceptIds: ["平行四边形"], expected: "bnu-junior-s2-lower-assessment-parallelograms-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S2",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "generate-question",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S2 lower assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S2"));
    assert.ok(cards.every((card) => card.semester === "lower"));
    assert.ok(cards.every((card) => card.assessmentFamilies.includes("unit-test")));
  }
});

test("BNU junior S2 lower assessment-pattern queries retrieve midterm and final review cards", () => {
  const midtermCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "lower",
    unitTitle: "八年级下册期中综合",
    assessmentFamily: "midterm",
    intent: "assessment-design",
    limit: 4
  });
  const finalCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "lower",
    unitTitle: "八年级下册期末综合",
    assessmentFamily: "final",
    intent: "exam-practice",
    limit: 4
  });
  const evidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "lower",
    conceptIds: ["三角形的证明及其应用", "不等式与不等式组", "期末"],
    intent: "generate-question",
    limit: 6
  });
  const tutorEvidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "lower",
    conceptIds: ["分式方程"],
    intent: "tutor-explain",
    limit: 4
  });

  assert.equal(midtermCards[0]?.id, "bnu-junior-s2-lower-assessment-midterm-integrated");
  assert.equal(finalCards[0]?.id, "bnu-junior-s2-lower-assessment-final-integrated");
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s2-lower-assessment-triangle-proof-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s2-lower-assessment-inequalities-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s2-lower-assessment-final-integrated"));
  assert.match(evidence.evidenceText, /BNU junior assessment-pattern layer:/);
  assert.equal(tutorEvidence.assessmentPatternCards.length, 0);
  assert.doesNotMatch(tutorEvidence.evidenceText, /BNU junior assessment-pattern layer:/);
});

test("BNU junior S3 upper assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["特殊平行四边形"], expected: "bnu-junior-s3-upper-assessment-special-parallelograms-unit" },
    { conceptIds: ["一元二次方程"], expected: "bnu-junior-s3-upper-assessment-quadratic-equations-unit" },
    { conceptIds: ["概率的进一步认识"], expected: "bnu-junior-s3-upper-assessment-probability-advanced-unit" },
    { conceptIds: ["图形的相似"], expected: "bnu-junior-s3-upper-assessment-similar-figures-unit" },
    { conceptIds: ["投影与视图"], expected: "bnu-junior-s3-upper-assessment-projection-views-unit" },
    { conceptIds: ["反比例函数"], expected: "bnu-junior-s3-upper-assessment-inverse-proportion-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S3",
      semester: "upper",
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "generate-question",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S3 upper assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S3"));
    assert.ok(cards.every((card) => card.semester === "upper"));
    assert.ok(cards.every((card) => card.assessmentFamilies.includes("unit-test")));
  }
});

test("BNU junior S3 upper assessment-pattern queries retrieve monthly midterm and final review cards", () => {
  const monthlyCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "upper",
    unitTitle: "1-3章综合",
    intent: "exam-practice",
    limit: 4
  });
  const midtermCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "upper",
    unitTitle: "1-4章综合",
    assessmentFamily: "midterm",
    intent: "assessment-design",
    limit: 4
  });
  const finalCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "upper",
    unitTitle: "九年级上册期末综合",
    assessmentFamily: "final",
    intent: "exam-practice",
    limit: 4
  });
  const crossVolumeCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "upper",
    unitTitle: "下册前置综合",
    intent: "assessment-design",
    includeNeedsS18MappingReview: true,
    limit: 4
  });
  const evidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["一元二次方程", "反比例函数", "期末"],
    intent: "exam-practice",
    limit: 6
  });
  const tutorEvidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["反比例函数"],
    intent: "tutor-explain",
    limit: 4
  });

  assert.equal(monthlyCards[0]?.id, "bnu-junior-s3-upper-assessment-monthly-1-to-3-integrated");
  assert.equal(midtermCards[0]?.id, "bnu-junior-s3-upper-assessment-midterm-1-to-4-integrated");
  assert.equal(finalCards[0]?.id, "bnu-junior-s3-upper-assessment-final-full-volume-integrated");
  assert.equal(crossVolumeCards[0]?.id, "bnu-junior-s3-upper-assessment-final-cross-volume-extension");
  assert.ok(crossVolumeCards[0]?.needsS18MappingReview);
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-upper-assessment-quadratic-equations-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-upper-assessment-inverse-proportion-unit"));
  assert.match(evidence.evidenceText, /BNU junior assessment-pattern layer:/);
  assert.equal(tutorEvidence.assessmentPatternCards.length, 0);
  assert.doesNotMatch(tutorEvidence.evidenceText, /BNU junior assessment-pattern layer:/);
});

test("BNU junior S3 lower assessment-pattern queries retrieve unit cards", () => {
  const queries = [
    { conceptIds: ["直角三角形的边角关系"], expected: "bnu-junior-s3-lower-assessment-right-triangle-trig-unit" },
    { conceptIds: ["二次函数"], expected: "bnu-junior-s3-lower-assessment-quadratic-functions-unit" },
    { conceptIds: ["圆"], expected: "bnu-junior-s3-lower-assessment-circle-unit" },
    { conceptIds: ["统计与概率"], expected: "bnu-junior-s3-lower-assessment-statistics-probability-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S3",
      semester: "lower",
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "generate-question",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior S3 lower assessment card for ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "school-assessment-pattern"));
    assert.ok(cards.every((card) => card.grade === "S3"));
    assert.ok(cards.every((card) => card.semester === "lower"));
    assert.ok(cards.every((card) => card.assessmentFamilies.includes("unit-test")));
  }
});

test("BNU junior S3 lower assessment-pattern queries retrieve monthly midterm and stage review cards", () => {
  const monthlyCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "lower",
    unitTitle: "月考",
    assessmentFamily: "monthly",
    intent: "exam-practice",
    limit: 4
  });
  const midtermCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "lower",
    unitTitle: "第一章至第二章期中",
    assessmentFamily: "midterm",
    intent: "assessment-design",
    limit: 4
  });
  const stageCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "lower",
    unitTitle: "九年级下册全册综合",
    assessmentFamily: "comprehensive",
    intent: "exam-practice",
    limit: 4
  });
  const zhongkaoCandidateCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "lower",
    unitTitle: "中考模拟",
    assessmentFamily: "topic-review",
    intent: "exam-practice",
    limit: 4
  });
  const upperTermCards = getMainlandBnuJuniorAssessmentPatternCards({
    grade: "S3",
    semester: "lower",
    unitTitle: "九年级上学期期末",
    intent: "exam-practice",
    limit: 4
  });
  const evidence = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["二次函数", "圆", "统计与概率"],
    intent: "exam-practice",
    limit: 6
  });

  assert.equal(monthlyCards[0]?.id, "bnu-junior-s3-lower-assessment-monthly-midterm-integrated");
  assert.ok(monthlyCards[0]?.materialKinds.includes("monthly-assessment"));
  assert.equal(midtermCards[0]?.id, "bnu-junior-s3-lower-assessment-monthly-midterm-integrated");
  assert.equal(stageCards[0]?.id, "bnu-junior-s3-lower-assessment-stage-integrated");
  assert.deepEqual(zhongkaoCandidateCards, []);
  assert.deepEqual(upperTermCards, []);
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-lower-assessment-quadratic-functions-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-lower-assessment-circle-unit"));
  assert.ok(evidence.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-lower-assessment-statistics-probability-unit"));
  assert.match(evidence.evidenceText, /BNU junior assessment-pattern layer:/);
});

test("BNU junior S2-S3 textbook queries retrieve safe cards", () => {
  const queries = [
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["勾股定理"], expected: "bnu-junior-s2-upper-pythagorean-theorem" },
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["平行线的证明"], expected: "bnu-junior-s2-upper-parallel-lines-proof" },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["分式方程"], expected: "bnu-junior-s2-lower-algebraic-fractions-equations" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["特殊平行四边形"], expected: "bnu-junior-s3-upper-special-parallelograms" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["一元二次方程"], expected: "bnu-junior-s3-upper-quadratic-equations" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["概率"], expected: "bnu-junior-s3-upper-probability-advanced" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["图形相似"], expected: "bnu-junior-s3-upper-similar-figures" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["投影"], expected: "bnu-junior-s3-upper-projection-views" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["反比例函数"], expected: "bnu-junior-s3-upper-inverse-proportion" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["锐角三角函数"], expected: "bnu-junior-s3-lower-right-triangle-trigonometry" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["二次函数"], expected: "bnu-junior-s3-lower-quadratic-functions" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["圆"], expected: "bnu-junior-s3-lower-circle" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["统计与概率"], expected: "bnu-junior-s3-lower-statistics-probability" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuJuniorRagCards({
      grade: query.grade,
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU junior cards for ${query.grade} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.sourceKind === "safe-abstraction"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("BNU junior evidence uses shared zhongkao patterns only for assessment-like intents", () => {
  const tutorPack = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["二次函数"],
    intent: "tutor-explain",
    limit: 4
  });
  const assessmentPack = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["一次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const designPack = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["一元二次方程"],
    intent: "assessment-design",
    limit: 4
  });

  assert.equal(tutorPack.publisher, "MAINLAND_BNU");
  assert.equal(tutorPack.stage, "junior-secondary");
  assert.ok(tutorPack.cards.length > 0);
  assert.equal(tutorPack.zhongkaoExamPatternCards.length, 0);
  assert.doesNotMatch(tutorPack.evidenceText, /Shared Mainland zhongkao exam-pattern layer/);

  assert.ok(assessmentPack.cards.length > 0);
  assert.ok(assessmentPack.assessmentPatternCards.length > 0);
  assert.ok(assessmentPack.zhongkaoExamPatternCards.length > 0);
  assert.ok(designPack.assessmentPatternCards.some((card) => card.id === "bnu-junior-s3-upper-assessment-quadratic-equations-unit"));
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.ok(designPack.zhongkaoExamPatternCards.length > 0);
  assert.match(assessmentPack.evidenceText, /shared Mainland junior zhongkao pattern layer/);
  assert.match(assessmentPack.evidenceText, /BNU junior assessment-pattern layer/);
  assert.match(assessmentPack.evidenceText, /callers must explicitly request publisher MAINLAND_BNU/);
});

test("BNU junior assessment and generation evidence packs keep source-distance guardrails", () => {
  const assessmentPack = buildMainlandBnuJuniorAssessmentPatternEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["一次函数", "二元一次方程组", "平行线的证明", "八年级上册综合"],
    intent: "assessment-design",
    limit: 8
  });
  const generationPack = buildMainlandBnuJuniorGenerationEvidencePack({
    grade: "S2",
    semester: "upper",
    unitTitle: "期末",
    intent: "generate-question",
    limit: 8
  });
  const combinedText = [
    JSON.stringify(mainlandBnuJuniorAssessmentPatternCards),
    assessmentPack.evidenceText,
    generationPack.evidenceText
  ].join("\n");

  assert.equal(assessmentPack.publisher, "MAINLAND_BNU");
  assert.equal(assessmentPack.stage, "junior-secondary");
  assert.ok(assessmentPack.cards.length > 0);
  assert.ok(generationPack.curriculumCards.length > 0);
  assert.ok(generationPack.assessmentPatternCards.length > 0);
  assert.ok(generationPack.zhongkaoExamPatternCards.length > 0);
  assert.match(assessmentPack.evidenceText, /original MAIS assessment support/);
  assert.match(generationPack.evidenceText, /Generate only new MAIS-authored/);

  const forbiddenPatterns = [
    /\/Users\//,
    new RegExp("Down" + "loads"),
    new RegExp("file" + "Name"),
    new RegExp("source" + "Path"),
    /sha256/i,
    /hash/i,
    /pageCount/i,
    /第\s*\d+\s*页/,
    /p\.\s*\d+/i,
    /OCR\s*text/i,
    /PDF\s*body\s*text/i,
    /embedding payload/i,
    /答案如下/,
    /参考答案/,
    /参考解析/,
    new RegExp("原" + "卷版"),
    new RegExp("解" + "析版"),
    /原题/,
    /原文/,
    /答题纸/,
    /答题卡/,
    /考试版/,
    /教材原文/
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combinedText, pattern);
  }
});

test("BNU junior assessment layer has supported coverage with expected guards", () => {
  assert.ok(mainlandBnuJuniorAssessmentPatternCards.length >= 52);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S1" && card.semester === "upper").length, 7);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S1" && card.semester === "lower").length, 11);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S2" && card.semester === "upper").length, 8);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S2" && card.semester === "lower").length, 8);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S3" && card.semester === "upper").length, 12);
  assert.equal(mainlandBnuJuniorAssessmentPatternCards.filter((card) => card.grade === "S3" && card.semester === "lower").length, 6);
  assert.ok(mainlandBnuJuniorAssessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(mainlandBnuJuniorAssessmentPatternCards.every((card) => card.stage === "junior-secondary"));
  assert.ok(mainlandBnuJuniorAssessmentPatternCards.some((card) => card.sourceKind === "review-pattern"));
  assert.ok(mainlandBnuJuniorAssessmentPatternCards.every((card) => card.prohibitedReuseNotes.some((note) => /Generate fresh MAIS-authored/.test(note))));
  assert.deepEqual(
    new Set(mainlandBnuJuniorAssessmentPatternCards.flatMap((card) => card.assessmentFamilies)),
    new Set(["unit-test", "monthly", "midterm", "final", "comprehensive", "topic-review"])
  );
  assert.deepEqual(
    new Set(mainlandBnuJuniorAssessmentPatternCards.flatMap((card) => card.materialKinds)),
    new Set(["unit-test", "monthly-assessment", "topic-practice", "paper", "midterm-final", "comprehensive-assessment", "review"])
  );
  assert.ok(
    getMainlandBnuJuniorAssessmentPatternCards({
      grade: "S1",
      semester: "lower",
      conceptIds: ["三角形"],
      intent: "exam-practice"
    }).length > 0
  );
  assert.equal(isMainlandBnuJuniorAssessmentGrade("S1"), true);
  assert.equal(isMainlandBnuJuniorAssessmentGrade("S2"), true);
  assert.equal(isMainlandBnuJuniorAssessmentGrade("S3"), true);
  assert.equal(isMainlandBnuJuniorAssessmentGrade("S4"), false);
  assert.equal(isMainlandBnuJuniorAssessmentMaterialKind("unit-test"), true);
  assert.equal(isMainlandBnuJuniorAssessmentMaterialKind("monthly-assessment"), true);
  assert.equal(isMainlandBnuJuniorAssessmentMaterialKind("sync-practice"), false);
  assert.equal(isMainlandBnuJuniorAssessmentFamily("monthly"), true);
  assert.equal(isMainlandBnuJuniorAssessmentFamily("mock"), false);
  assert.equal(isMainlandBnuJuniorAssessmentFamily("cross-volume-review"), false);
});

test("BNU junior retrieval keeps publisher layers isolated from PEP and HJB", () => {
  const bnuCards = getMainlandBnuJuniorRagCards({
    grade: "S3",
    semester: "upper",
    conceptIds: ["一元二次方程"],
    intent: "tutor-explain",
    limit: 4
  });
  const hjbCards = getMainlandHjbJuniorRagCards({
    grade: "S3",
    semester: "upper",
    conceptIds: ["二次函数"],
    intent: "tutor-explain",
    limit: 4
  });
  const pepCards = getMainlandPepRagCards({
    grade: "S3",
    semester: "upper",
    conceptIds: ["二次函数"],
    intent: "tutor-explain",
    limit: 4
  });

  assert.ok(bnuCards.length > 0);
  assert.ok(bnuCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbCards.length > 0);
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(mainlandBnuJuniorRagCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(mainlandHjbJuniorRagCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(mainlandPepJuniorRagCards.every((card) => card.publisher === "MAINLAND_PEP"));
});

test("BNU junior coverage includes S1 cards while preserving existing S2-S3 safe cards", () => {
  assert.ok(mainlandBnuJuniorRagCards.length >= 34);
  assert.deepEqual(
    new Set(mainlandBnuJuniorRagCards.map((card) => `${card.grade}-${card.semester}`)),
    new Set(["S1-upper", "S1-lower", "S2-upper", "S2-lower", "S3-upper", "S3-lower"])
  );
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S1" && card.semester === "upper").length, 6);
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S1" && card.semester === "lower").length, 6);
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S2" && card.semester === "upper").length, 7);
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S2" && card.semester === "lower").length, 6);
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S3" && card.semester === "upper").length, 6);
  assert.equal(mainlandBnuJuniorRagCards.filter((card) => card.grade === "S3" && card.semester === "lower").length, 4);
  assert.ok(mainlandBnuJuniorRagCards.every((card) => card.stage === "junior-secondary"));
  assert.ok(mainlandBnuJuniorRagCards.every((card) => card.sourceKind === "safe-abstraction"));
  assert.ok(mainlandBnuJuniorRagCards.every((card) => card.prohibitedReuseNotes.some((note) => /Do not reproduce/.test(note))));

  assert.equal(isMainlandBnuJuniorGrade("S1"), true);
  assert.equal(isMainlandBnuJuniorGrade("S3"), true);
  assert.equal(isMainlandBnuJuniorGrade("S4"), false);
  assert.equal(isMainlandBnuJuniorGrade("P6"), false);
});

test("BNU junior evidence pack carries reuse guardrails without source artifacts", () => {
  const pack = buildMainlandBnuJuniorEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["锐角三角函数", "二次函数", "圆"],
    intent: "generate-question",
    limit: 5
  });
  const assessmentPack = buildMainlandBnuJuniorAssessmentPatternEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["一次函数", "二元一次方程组", "平行线的证明", "八年级上册综合"],
    intent: "assessment-design",
    limit: 8
  });
  const assessmentGenerationPack = buildMainlandBnuJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["期中", "期末", "一次函数", "平行线的证明"],
    intent: "generate-question",
    limit: 8
  });
  const cardText = JSON.stringify([mainlandBnuJuniorRagCards, mainlandBnuJuniorAssessmentPatternCards]);
  const combinedText = `${cardText}\n${pack.evidenceText}\n${assessmentPack.evidenceText}\n${assessmentGenerationPack.evidenceText}`;

  assert.equal(pack.publisher, "MAINLAND_BNU");
  assert.equal(pack.stage, "junior-secondary");
  assert.ok(pack.cards.length > 0);
  assert.match(pack.evidenceText, /Use this evidence only to create original MAIS/);
  assert.match(pack.evidenceText, /S1-S3 textbook sequencing/);
  assert.doesNotMatch(pack.evidenceText, /S1 upper\/lower textbook sequencing/);
  assert.ok(mainlandBnuJuniorRagCards.every((card) => card.prohibitedReuseNotes.some((note) => /Generate new MAIS-authored/.test(note))));

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
    /原题/,
    /原文/,
    /答题纸/,
    /答题卡/,
    /考试版/,
    /教材原文/
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(combinedText, pattern);
  }
});
