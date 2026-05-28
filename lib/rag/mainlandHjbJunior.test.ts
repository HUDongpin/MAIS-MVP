import assert from "node:assert/strict";
import test from "node:test";
import { mainlandHjbHighRagCards } from "../../data/rag/mainlandHjbHigh";
import { mainlandHjbJuniorAssessmentPatternCards } from "../../data/rag/mainlandHjbJuniorAssessmentPatterns";
import { mainlandHjbJuniorPaperPatternCards } from "../../data/rag/mainlandHjbJuniorPaperPatterns";
import { mainlandHjbJuniorRagCards } from "../../data/rag/mainlandHjbJunior";
import { getMainlandHjbHighRagCards } from "./mainlandHjbHigh";
import {
  buildMainlandHjbJuniorAssessmentEvidencePack,
  buildMainlandHjbJuniorGenerationEvidencePack,
  getMainlandHjbJuniorAssessmentPatternCards
} from "./mainlandHjbJuniorAssessmentPatterns";
import {
  buildMainlandHjbJuniorPaperEvidencePack,
  getMainlandHjbJuniorPaperPatternCards
} from "./mainlandHjbJuniorPaperPatterns";
import { getMainlandPepJuniorPaperPatternCards } from "./mainlandPepJuniorPaperPatterns";
import {
  buildMainlandHjbJuniorEvidencePack,
  getMainlandHjbJuniorRagCards,
  isMainlandHjbHighGrade,
  isMainlandHjbJuniorGrade
} from "./mainlandHjbJunior";

test("HJB junior S1-S3 textbook queries retrieve safe cards", () => {
  const queries = [
    { grade: "S1" as const, semester: "upper" as const, conceptIds: ["整式"], expected: "hjb-junior-s1-upper-polynomial-add-subtract" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["等腰三角形"], expected: "hjb-junior-s1-lower-isosceles-triangles" },
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["二次根式"], expected: "hjb-junior-s2-upper-quadratic-radicals" },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["一次函数"], expected: "hjb-junior-s2-lower-linear-functions" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["二次函数"], expected: "hjb-junior-s3-upper-quadratic-functions" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["圆"], expected: "hjb-junior-s3-lower-circle-regular-polygons" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorRagCards({
      grade: query.grade,
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB junior textbook cards for ${query.grade} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("HJB junior retrieval keeps S2/S3 separate from HJB high cards", () => {
  const s2Cards = getMainlandHjbJuniorRagCards({
    grade: "S2",
    conceptIds: ["一次函数"],
    intent: "tutor-explain",
    limit: 4
  });
  const s3Cards = getMainlandHjbJuniorRagCards({
    grade: "S3",
    conceptIds: ["圆"],
    intent: "exam-practice",
    limit: 4
  });
  const highCards = getMainlandHjbHighRagCards({
    grade: "S6",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 4
  });

  assert.equal(s2Cards[0]?.id, "hjb-junior-s2-lower-linear-functions");
  assert.equal(s3Cards[0]?.id, "hjb-junior-s3-lower-circle-regular-polygons");
  assert.ok(s2Cards.every((card) => card.publisher === "MAINLAND_HJB" && card.stage === "junior-secondary" && card.grade === "S2"));
  assert.ok(s3Cards.every((card) => card.publisher === "MAINLAND_HJB" && card.stage === "junior-secondary" && card.grade === "S3"));
  assert.ok(highCards.length > 0);
  assert.ok(highCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(highCards.every((card) => card.grades.includes("S6")));
  assert.ok(mainlandHjbHighRagCards.every((card) => !("stage" in card) || card.stage !== "junior-secondary"));
});

test("HJB grade split helpers route junior and high evidence separately", () => {
  assert.equal(isMainlandHjbJuniorGrade("S1"), true);
  assert.equal(isMainlandHjbJuniorGrade("S3"), true);
  assert.equal(isMainlandHjbJuniorGrade("S4"), false);
  assert.equal(isMainlandHjbJuniorGrade("P6"), false);
  assert.equal(isMainlandHjbHighGrade("S4"), true);
  assert.equal(isMainlandHjbHighGrade("S6"), true);
  assert.equal(isMainlandHjbHighGrade("S1"), false);
  assert.equal(isMainlandHjbHighGrade("P6"), false);
});

test("HJB junior S1 lower paper-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["一元一次不等式"], expected: "hjb-junior-s1-lower-paper-linear-inequalities" },
    { conceptIds: ["平行线"], expected: "hjb-junior-s1-lower-paper-lines-parallel-angles" },
    { conceptIds: ["三角形"], expected: "hjb-junior-s1-lower-paper-triangles" },
    { conceptIds: ["等腰三角形"], expected: "hjb-junior-s1-lower-paper-isosceles-perpendicular-bisector" },
    { unitTitle: "七年级下册期中综合", assessmentFamily: "midterm" as const, expected: "hjb-junior-s1-lower-paper-midterm-integrated" },
    { unitTitle: "七年级下册期末综合", assessmentFamily: "final" as const, expected: "hjb-junior-s1-lower-paper-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S1",
      semester: "lower",
      ...(query.conceptIds ? { conceptIds: query.conceptIds } : {}),
      ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
      ...(query.assessmentFamily ? { assessmentFamily: query.assessmentFamily } : {}),
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB S1 lower paper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === "S1"));
    assert.ok(cards.every((card) => card.semester === "lower"));
    assert.ok(cards.every((card) => card.sourceKind === "junior-paper-pattern"));
  }
});

test("HJB junior S2 upper paper-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["实数"], expected: "hjb-junior-s2-upper-paper-real-numbers-unit" },
    { conceptIds: ["二次根式"], expected: "hjb-junior-s2-upper-paper-quadratic-radicals-unit" },
    { conceptIds: ["一元二次方程"], expected: "hjb-junior-s2-upper-paper-quadratic-equations-unit" },
    { conceptIds: ["勾股定理"], expected: "hjb-junior-s2-upper-paper-right-triangles-unit" },
    { unitTitle: "八年级上册期中综合", expected: "hjb-junior-s2-upper-paper-midterm-integrated" },
    { unitTitle: "八年级上册期末综合", expected: "hjb-junior-s2-upper-paper-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S2",
      semester: "upper",
      ...(query.conceptIds ? { conceptIds: query.conceptIds } : {}),
      ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB S2 upper paper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === "S2"));
    assert.ok(cards.every((card) => card.semester === "upper"));
    assert.ok(cards.every((card) => card.sourceKind === "junior-paper-pattern"));
  }
});

test("HJB junior S2 lower paper-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["四边形"], expected: "hjb-junior-s2-lower-paper-quadrilaterals-unit" },
    { conceptIds: ["平面直角坐标系"], expected: "hjb-junior-s2-lower-paper-coordinate-plane-unit" },
    { conceptIds: ["一次函数"], expected: "hjb-junior-s2-lower-paper-linear-functions-unit" },
    { conceptIds: ["反比例函数"], expected: "hjb-junior-s2-lower-paper-inverse-functions-unit" },
    { unitTitle: "八年级下册期末综合", expected: "hjb-junior-s2-lower-paper-midterm-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S2",
      semester: "lower",
      ...(query.conceptIds ? { conceptIds: query.conceptIds } : {}),
      ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB S2 lower paper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === "S2"));
    assert.ok(cards.every((card) => card.semester === "lower"));
    assert.ok(cards.every((card) => card.sourceKind === "junior-paper-pattern"));
  }
});

test("HJB junior S3 upper paper-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["相似三角形"], expected: "hjb-junior-s3-upper-paper-similar-triangles-unit" },
    { conceptIds: ["锐角的三角比"], expected: "hjb-junior-s3-upper-paper-acute-trigonometry-unit" },
    { conceptIds: ["二次函数"], expected: "hjb-junior-s3-upper-paper-quadratic-functions-unit" },
    { unitTitle: "九年级上册期中综合", assessmentFamily: "midterm" as const, expected: "hjb-junior-s3-upper-paper-midterm-integrated" },
    { unitTitle: "九年级上册期末综合", assessmentFamily: "final" as const, expected: "hjb-junior-s3-upper-paper-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S3",
      semester: "upper",
      ...(query.conceptIds ? { conceptIds: query.conceptIds } : {}),
      ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
      ...(query.assessmentFamily ? { assessmentFamily: query.assessmentFamily } : {}),
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB S3 upper paper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === "S3"));
    assert.ok(cards.every((card) => card.semester === "upper"));
    assert.ok(cards.every((card) => card.sourceKind === "junior-paper-pattern"));
  }
});

test("HJB junior S3 lower paper-pattern queries retrieve safe cards", () => {
  const queries = [
    { conceptIds: ["圆"], expected: "hjb-junior-s3-lower-paper-circle-regular-polygons-unit" },
    { conceptIds: ["统计"], expected: "hjb-junior-s3-lower-paper-statistics-introduction-unit" },
    { unitTitle: "九年级下册期中综合", assessmentFamily: "midterm" as const, expected: "hjb-junior-s3-lower-paper-midterm-integrated" },
    { unitTitle: "九年级下册期末综合", assessmentFamily: "final" as const, expected: "hjb-junior-s3-lower-paper-final-integrated" }
  ];

  for (const query of queries) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S3",
      semester: "lower",
      ...(query.conceptIds ? { conceptIds: query.conceptIds } : {}),
      ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
      ...(query.assessmentFamily ? { assessmentFamily: query.assessmentFamily } : {}),
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected HJB S3 lower paper cards for ${query.conceptIds?.join(",") ?? query.unitTitle}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_HJB"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === "S3"));
    assert.ok(cards.every((card) => card.semester === "lower"));
    assert.ok(cards.every((card) => card.sourceKind === "junior-paper-pattern"));
  }
});

test("HJB junior paper-pattern helper respects semester and publisher isolation", () => {
  const upperCards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S2",
    semester: "upper",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });
  const lowerCards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S2",
    semester: "lower",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });
  const s3LowerCards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S3",
    semester: "lower",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const s3UpperCards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S3",
    semester: "upper",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const pepCards = getMainlandPepJuniorPaperPatternCards({
    grade: "S2",
    semester: "upper",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });

  assert.equal(upperCards[0]?.id, "hjb-junior-s2-upper-paper-quadratic-radicals-unit");
  assert.ok(!lowerCards.some((card) => card.id === "hjb-junior-s2-upper-paper-quadratic-radicals-unit"));
  assert.equal(s3UpperCards[0]?.id, "hjb-junior-s3-upper-paper-quadratic-functions-unit");
  assert.equal(s3LowerCards.length, 0);
  assert.ok(upperCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.length > 0);
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
});

test("HJB junior S1 lower paper-pattern retrieval keeps quarantined concepts out", () => {
  for (const concept of ["实数", "平方根", "平面直角坐标系", "坐标系"]) {
    const cards = getMainlandHjbJuniorPaperPatternCards({
      grade: "S1",
      semester: "lower",
      conceptIds: [concept],
      intent: "exam-practice",
      limit: 4
    });

    assert.equal(cards.length, 0, `Expected quarantined S1 lower concept to stay out of HJB paper-pattern retrieval: ${concept}`);
  }

  const s1UpperCards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S1",
    semester: "upper",
    conceptIds: ["一元一次不等式"],
    intent: "exam-practice",
    limit: 4
  });
  const s2Cards = getMainlandHjbJuniorPaperPatternCards({
    grade: "S2",
    semester: "lower",
    conceptIds: ["一元一次不等式"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(!s1UpperCards.some((card) => card.id.startsWith("hjb-junior-s1-lower-paper-")));
  assert.ok(!s2Cards.some((card) => card.id.startsWith("hjb-junior-s1-lower-paper-")));
});

test("HJB junior evidence pack includes paper-pattern layer for S1 lower", () => {
  const pack = buildMainlandHjbJuniorEvidencePack({
    grade: "S1",
    semester: "lower",
    conceptIds: ["等腰三角形"],
    intent: "exam-practice",
    limit: 4
  });
  const standalonePack = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S1",
    semester: "lower",
    conceptIds: ["等腰三角形"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(pack.cards.some((card) => card.id === "hjb-junior-s1-lower-isosceles-triangles"));
  assert.equal(pack.paperPatternCards[0]?.id, "hjb-junior-s1-lower-paper-isosceles-perpendicular-bisector");
  assert.equal(standalonePack.cards[0]?.id, "hjb-junior-s1-lower-paper-isosceles-perpendicular-bisector");
  assert.match(pack.evidenceText, /Junior paper-pattern layer:/);
  assert.match(pack.evidenceText, /Shared Mainland zhongkao exam-pattern layer:/);
  assert.match(standalonePack.evidenceText, /HJB junior paper pattern/);
});

test("HJB junior evidence pack includes paper-pattern layer for S2 upper", () => {
  const pack = buildMainlandHjbJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });
  const standalonePack = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(pack.cards.some((card) => card.id === "hjb-junior-s2-upper-quadratic-radicals"));
  assert.equal(pack.paperPatternCards[0]?.id, "hjb-junior-s2-upper-paper-quadratic-radicals-unit");
  assert.equal(standalonePack.cards[0]?.id, "hjb-junior-s2-upper-paper-quadratic-radicals-unit");
  assert.match(pack.evidenceText, /Junior paper-pattern layer:/);
  assert.match(standalonePack.evidenceText, /HJB junior paper pattern/);
});

test("HJB junior evidence pack includes paper-pattern layer for S2 lower", () => {
  const pack = buildMainlandHjbJuniorEvidencePack({
    grade: "S2",
    semester: "lower",
    conceptIds: ["一次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const standalonePack = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S2",
    semester: "lower",
    conceptIds: ["一次函数"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(pack.cards.some((card) => card.id === "hjb-junior-s2-lower-linear-functions"));
  assert.equal(pack.paperPatternCards[0]?.id, "hjb-junior-s2-lower-paper-linear-functions-unit");
  assert.equal(standalonePack.cards[0]?.id, "hjb-junior-s2-lower-paper-linear-functions-unit");
  assert.match(pack.evidenceText, /Junior paper-pattern layer:/);
  assert.match(standalonePack.evidenceText, /HJB junior paper pattern/);
});

test("HJB junior evidence pack includes paper-pattern layer for S3 upper", () => {
  const pack = buildMainlandHjbJuniorEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["相似三角形"],
    intent: "exam-practice",
    limit: 4
  });
  const standalonePack = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["相似三角形"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(pack.cards.some((card) => card.id === "hjb-junior-s3-upper-similar-triangles"));
  assert.equal(pack.paperPatternCards[0]?.id, "hjb-junior-s3-upper-paper-similar-triangles-unit");
  assert.ok(pack.zhongkaoExamPatternCards.some((card) => card.id === "pep-junior-exam-similarity-right-triangle-trig"));
  assert.equal(standalonePack.cards[0]?.id, "hjb-junior-s3-upper-paper-similar-triangles-unit");
  assert.match(pack.evidenceText, /Junior paper-pattern layer:/);
  assert.match(standalonePack.evidenceText, /HJB junior paper pattern/);
});

test("HJB junior evidence pack includes paper-pattern layer for S3 lower", () => {
  const pack = buildMainlandHjbJuniorEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["圆"],
    intent: "exam-practice",
    limit: 4
  });
  const standalonePack = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["圆"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(pack.cards.some((card) => card.id === "hjb-junior-s3-lower-circle-regular-polygons"));
  assert.equal(pack.paperPatternCards[0]?.id, "hjb-junior-s3-lower-paper-circle-regular-polygons-unit");
  assert.equal(standalonePack.cards[0]?.id, "hjb-junior-s3-lower-paper-circle-regular-polygons-unit");
  assert.match(pack.evidenceText, /Junior paper-pattern layer:/);
  assert.match(standalonePack.evidenceText, /HJB junior paper pattern/);
});

test("HJB junior S1 upper assessment pattern helper remains scoped", () => {
  const cards = getMainlandHjbJuniorAssessmentPatternCards({
    grade: "S1",
    semester: "upper",
    conceptIds: ["分式"],
    assessmentFamily: "unit-test",
    intent: "generate-question",
    limit: 4
  });
  const outOfScopeCards = getMainlandHjbJuniorAssessmentPatternCards({
    grade: "S2",
    semester: "upper",
    conceptIds: ["二次根式"],
    intent: "exam-practice",
    limit: 4
  });
  const evidence = buildMainlandHjbJuniorGenerationEvidencePack({
    grade: "S1",
    semester: "upper",
    assessmentFamily: "unit-test",
    conceptIds: ["分式"],
    intent: "generate-question",
    limit: 3
  });
  const assessmentEvidence = buildMainlandHjbJuniorAssessmentEvidencePack({
    grade: "S1",
    semester: "upper",
    conceptIds: ["分式"],
    intent: "assessment-design",
    limit: 3
  });

  assert.equal(cards[0]?.id, "hjb-junior-s1-upper-assessment-algebraic-fractions-unit");
  assert.equal(outOfScopeCards.length, 0);
  assert.equal(evidence.curriculumCards[0]?.id, "hjb-junior-s1-upper-algebraic-fractions");
  assert.equal(evidence.assessmentPatternCards[0]?.id, "hjb-junior-s1-upper-assessment-algebraic-fractions-unit");
  assert.equal(evidence.paperPatternCards.length, 0);
  assert.match(evidence.evidenceText, /Assessment-pattern layer/);
  assert.match(assessmentEvidence.evidenceText, /HJB junior assessment pattern/);
});

test("HJB junior safe cards and evidence avoid source-material artifacts", () => {
  const forbiddenPatterns = [
    /\.doc\b/i,
    /\.docx/i,
    /\.pptx/i,
    /\.pdf/i,
    /\.zip/i,
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /例题/i,
    /官方\s*解析/i,
    /解析/i,
    /原卷/i,
    /原题/i,
    /原文/i,
    /答案/i,
    /答题卡/i,
    /OCR/i,
    /entryName/i,
    /entryPath/i,
    /source\s*path/i,
    /sourceArchive/i,
    /embedding/i,
    /locator/i,
    /扫描页/i,
    /截图/i,
    /见图/i
  ];
  const cardText = JSON.stringify([
    ...mainlandHjbJuniorRagCards,
    ...mainlandHjbJuniorPaperPatternCards,
    ...mainlandHjbJuniorAssessmentPatternCards
  ]);
  const combinedEvidence = buildMainlandHjbJuniorEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["实数", "二次根式", "一元二次方程", "勾股定理"],
    intent: "exam-practice",
    limit: 8
  }).evidenceText;
  const s1CombinedEvidence = buildMainlandHjbJuniorEvidencePack({
    grade: "S1",
    semester: "lower",
    conceptIds: ["一元一次不等式", "平行线", "三角形", "等腰三角形"],
    intent: "exam-practice",
    limit: 8
  }).evidenceText;
  const s3CombinedEvidence = buildMainlandHjbJuniorEvidencePack({
    grade: "S3",
    semester: "upper",
    conceptIds: ["相似三角形", "锐角三角比", "二次函数"],
    intent: "exam-practice",
    limit: 8
  }).evidenceText;
  const s3LowerCombinedEvidence = buildMainlandHjbJuniorEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["圆", "正多边形", "统计"],
    intent: "exam-practice",
    limit: 8
  }).evidenceText;
  const paperEvidence = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["实数", "二次根式"],
    intent: "assessment-design",
    limit: 5
  }).evidenceText;
  const s1PaperEvidence = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S1",
    semester: "lower",
    unitTitle: "七年级下册期末综合",
    assessmentFamily: "final",
    intent: "assessment-design",
    limit: 5
  }).evidenceText;
  const s3PaperEvidence = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S3",
    semester: "upper",
    unitTitle: "九年级上册期末综合",
    assessmentFamily: "final",
    intent: "assessment-design",
    limit: 5
  }).evidenceText;
  const s3LowerPaperEvidence = buildMainlandHjbJuniorPaperEvidencePack({
    grade: "S3",
    semester: "lower",
    unitTitle: "九年级下册期末综合",
    assessmentFamily: "final",
    intent: "assessment-design",
    limit: 5
  }).evidenceText;
  const assessmentEvidence = buildMainlandHjbJuniorAssessmentEvidencePack({
    grade: "S1",
    semester: "upper",
    conceptIds: ["整式"],
    intent: "assessment-design",
    limit: 3
  }).evidenceText;

  assert.equal(mainlandHjbJuniorRagCards.length, 22);
  assert.equal(mainlandHjbJuniorPaperPatternCards.length, 26);
  assert.equal(mainlandHjbJuniorAssessmentPatternCards.length, 6);
  assert.equal(mainlandHjbJuniorPaperPatternCards.filter((card) => card.grade === "S1" && card.semester === "lower").length, 6);
  assert.equal(mainlandHjbJuniorPaperPatternCards.filter((card) => card.grade === "S2" && card.semester === "upper").length, 6);
  assert.equal(mainlandHjbJuniorPaperPatternCards.filter((card) => card.grade === "S2" && card.semester === "lower").length, 5);
  assert.equal(mainlandHjbJuniorPaperPatternCards.filter((card) => card.grade === "S3" && card.semester === "upper").length, 5);
  assert.equal(mainlandHjbJuniorPaperPatternCards.filter((card) => card.grade === "S3" && card.semester === "lower").length, 4);
  assert.ok(mainlandHjbJuniorPaperPatternCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(mainlandHjbJuniorPaperPatternCards.every((card) => card.sourceKind === "junior-paper-pattern"));
  assert.ok(mainlandHjbJuniorAssessmentPatternCards.every((card) => card.grade === "S1" && card.semester === "upper"));
  assert.match(combinedEvidence, /single shared zhongkao exam-pattern layer/);
  assert.match(s3CombinedEvidence, /Shared Mainland zhongkao exam-pattern layer:/);

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(combinedEvidence, pattern);
    assert.doesNotMatch(s1CombinedEvidence, pattern);
    assert.doesNotMatch(s3CombinedEvidence, pattern);
    assert.doesNotMatch(s3LowerCombinedEvidence, pattern);
    assert.doesNotMatch(paperEvidence, pattern);
    assert.doesNotMatch(s1PaperEvidence, pattern);
    assert.doesNotMatch(s3PaperEvidence, pattern);
    assert.doesNotMatch(s3LowerPaperEvidence, pattern);
    assert.doesNotMatch(assessmentEvidence, pattern);
  }

  assert.match(combinedEvidence, /Do not quote or reconstruct/);
});
