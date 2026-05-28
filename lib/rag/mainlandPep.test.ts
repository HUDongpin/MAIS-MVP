import assert from "node:assert/strict";
import test from "node:test";
import { mainlandPepHighExamPatternCards } from "../../data/rag/mainlandPepHighExamPatterns";
import { mainlandPepHighRagCards } from "../../data/rag/mainlandPepHigh";
import { mainlandJuniorZhongkaoExamPatternCards } from "../../data/rag/mainlandJuniorZhongkaoExamPatterns";
import { mainlandPepJuniorExamPatternCards } from "../../data/rag/mainlandPepJuniorExamPatterns";
import { mainlandPepJuniorPaperPatternCards } from "../../data/rag/mainlandPepJuniorPaperPatterns";
import { mainlandPepJuniorRagCards } from "../../data/rag/mainlandPepJunior";
import { mainlandPepPrimaryExamPatternCards } from "../../data/rag/mainlandPepPrimaryExamPatterns";
import { mainlandPepPrimaryRagCards } from "../../data/rag/mainlandPepPrimary";
import { getMainlandPepHighRagCards } from "./mainlandPepHigh";
import {
  buildMainlandPepJuniorPaperEvidencePack as buildUnifiedMainlandPepJuniorPaperEvidencePack,
  buildMainlandPepPrimaryExamEvidencePack as buildUnifiedMainlandPepPrimaryExamEvidencePack,
  getMainlandPepEvidencePack,
  getMainlandPepJuniorExamPatternCards as getUnifiedMainlandPepJuniorExamPatternCards,
  getMainlandPepJuniorPaperPatternCards as getUnifiedMainlandPepJuniorPaperPatternCards,
  getMainlandPepPrimaryExamPatternCards as getUnifiedMainlandPepPrimaryExamPatternCards,
  getMainlandPepRagCards,
  getMainlandPepSecondaryExamPatternCards as getUnifiedMainlandPepSecondaryExamPatternCards
} from "./mainlandPep";
import {
  buildMainlandPepJuniorExamEvidencePack,
  buildMainlandPepJuniorExamGenerationEvidencePack,
  getMainlandPepJuniorExamPatternCards
} from "./mainlandPepJuniorExamPatterns";
import {
  buildMainlandJuniorZhongkaoExamEvidencePack,
  getMainlandJuniorZhongkaoExamPatternCards
} from "./mainlandJuniorZhongkaoExamPatterns";
import {
  buildMainlandPepJuniorPaperEvidencePack,
  buildMainlandPepJuniorPaperGenerationEvidencePack,
  getMainlandPepJuniorPaperPatternCards
} from "./mainlandPepJuniorPaperPatterns";
import {
  buildMainlandPepPrimaryExamEvidencePack,
  buildMainlandPepPrimaryExamGenerationEvidencePack,
  getMainlandPepPrimaryExamPatternCards
} from "./mainlandPepPrimaryExamPatterns";

test("primary MAINLAND_PEP queries retrieve grade-appropriate safe cards", () => {
  const queries = [
    { grade: "P1" as const, conceptIds: ["20以内加减法"], expectedAny: ["pep-primary-p1-upper-number-sense-within-20", "pep-primary-p1-lower-within-100-add-sub"] },
    { grade: "P2" as const, conceptIds: ["乘法口诀"], expected: "pep-primary-p2-upper-multiplication-facts" },
    { grade: "P3" as const, conceptIds: ["分数初步"], expected: "pep-primary-p3-upper-multidigit-operations-fractions" },
    { grade: "P4" as const, conceptIds: ["大数认识"], expected: "pep-primary-p4-upper-large-numbers-angles" },
    { grade: "P5" as const, conceptIds: ["小数", "方程"], expected: "pep-primary-p5-upper-decimals-equations-polygons" },
    { grade: "P6" as const, conceptIds: ["百分数", "比例"], expectedAny: ["pep-primary-p6-upper-percent-position-data", "pep-primary-p6-lower-proportion-negative-review"] }
  ];

  for (const query of queries) {
    const cards = getMainlandPepRagCards({
      grade: query.grade,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 3
    });

    assert.ok(cards.length > 0, `Expected cards for ${query.grade}`);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_PEP"));
    assert.ok(cards.every((card) => card.stage === "primary"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    if ("expected" in query) {
      assert.equal(cards[0]?.id, query.expected);
    } else {
      assert.ok(query.expectedAny.includes(cards[0]?.id ?? ""));
    }
  }
});

test("senior secondary MAINLAND_PEP queries return compatibility high-school cards only", () => {
  const s4Cards = getMainlandPepRagCards({
    grade: "S4",
    conceptIds: ["trigonometric-graphs"],
    intent: "generate-question",
    limit: 4
  });
  assert.ok(s4Cards.length > 0);
  assert.ok(s4Cards.every((card) => card.stage === "senior-secondary"));
  assert.ok(s4Cards.every((card) => card.legacyCurriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.ok(s4Cards.every((card) => card.grade === "S4"));

  const s6Cards = getMainlandPepRagCards({
    grade: "S6",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s6Cards.length > 0);
  assert.ok(s6Cards.every((card) => card.stage === "senior-secondary"));
  assert.ok(s6Cards.every((card) => card.grade === "S6"));
});

test("junior secondary MAINLAND_PEP queries retrieve S1-S3 safe cards only", () => {
  const queries = [
    { grade: "S1" as const, conceptIds: ["有理数"], expected: "pep-junior-s1-upper-rational-numbers" },
    { grade: "S1" as const, conceptIds: ["一元一次方程"], expected: "pep-junior-s1-upper-expressions-linear-equations" },
    { grade: "S2" as const, conceptIds: ["三角形"], expected: "pep-junior-s2-upper-triangles-congruence" },
    { grade: "S2" as const, conceptIds: ["一次函数"], expected: "pep-junior-s2-lower-linear-functions-data" },
    { grade: "S3" as const, conceptIds: ["二次函数"], expected: "pep-junior-s3-upper-quadratics-circle-probability" },
    { grade: "S3" as const, conceptIds: ["圆"], expected: "pep-junior-s3-upper-quadratics-circle-probability" }
  ];

  for (const query of queries) {
    const cards = getMainlandPepRagCards({
      grade: query.grade,
      conceptIds: query.conceptIds,
      intent: "tutor-explain",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected junior cards for ${query.grade}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_PEP"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => !card.legacyCurriculumTrack));
  }
});

test("MAINLAND_PEP_HIGH compatibility wrapper preserves high-school retrieval behavior", () => {
  const compatibilityCards = getMainlandPepHighRagCards({
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 3
  });

  assert.ok(compatibilityCards.length > 0);
  assert.equal(compatibilityCards[0]?.id, "pep-high-derivatives-applications");
  assert.ok(compatibilityCards.every((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH"));
});

test("junior cards and evidence packs avoid source-copying artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /例题/i,
    /教材原文/i,
    /见图/i,
    /扫描页/i,
    /答案如下/i,
    /OCR\s*text/i,
    /source locators/i
  ];
  const juniorCardText = JSON.stringify(mainlandPepJuniorRagCards);
  const juniorEvidence = getMainlandPepEvidencePack({
    grade: "S3",
    conceptIds: ["二次函数", "圆"],
    intent: "generate-question",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(juniorCardText, pattern);
    assert.doesNotMatch(juniorEvidence, pattern);
  }

  mainlandPepJuniorRagCards.forEach((card) => {
    assert.equal(card.publisher, "MAINLAND_PEP");
    assert.equal(card.stage, "junior-secondary");
    assert.equal(card.sourceKind, "safe-abstraction");
    assert.ok(["S1", "S2", "S3"].includes(card.grade));
    assert.ok(card.prohibitedReuseNotes.some((note) => /Do not copy, rewrite, translate/.test(note)));
    assert.ok(card.safeSummary.length > 40);
    assert.ok(card.generationGuidance.length >= 2);
  });
});

test("S1-S3 junior paper-pattern queries retrieve focused upper and lower safe cards", () => {
  const queries = [
    { grade: "S1" as const, semester: "upper" as const, conceptIds: ["有理数"], expected: "pep-junior-s1-upper-paper-rational-number-operations" },
    { grade: "S1" as const, semester: "upper" as const, conceptIds: ["一元一次方程"], expected: "pep-junior-s1-upper-paper-linear-equation-modeling" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["相交线"], expected: "pep-junior-s1-lower-paper-lines-parallel-angles" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["平面直角坐标系"], expected: "pep-junior-s1-lower-paper-coordinate-plane" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["二元一次方程组"], expected: "pep-junior-s1-lower-paper-linear-systems" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["不等式"], expected: "pep-junior-s1-lower-paper-inequalities" },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["数据"], expected: "pep-junior-s1-lower-paper-data-collection" },
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["全等三角形"], expected: "pep-junior-s2-upper-paper-congruence-proof" },
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["分式"], expected: "pep-junior-s2-upper-paper-algebraic-fractions" },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["二次根式"], expected: "pep-junior-s2-lower-paper-quadratic-radicals" },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["一次函数"], expected: "pep-junior-s2-lower-paper-linear-functions" },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["数据分析"], expected: "pep-junior-s2-lower-paper-data-analysis" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["一元二次方程"], expected: "pep-junior-s3-upper-paper-quadratic-equations" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["二次函数"], expected: "pep-junior-s3-upper-paper-quadratic-functions" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["圆"], expected: "pep-junior-s3-upper-paper-circle-geometry" },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["概率"], expected: "pep-junior-s3-upper-paper-probability-introduction" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["反比例函数"], expected: "pep-junior-s3-lower-paper-inverse-functions" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["相似"], expected: "pep-junior-s3-lower-paper-similarity" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["锐角三角函数"], expected: "pep-junior-s3-lower-paper-right-triangle-trigonometry" },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["投影"], expected: "pep-junior-s3-lower-paper-projection-views" }
  ];

  for (const query of queries) {
    const cards = getMainlandPepJuniorPaperPatternCards({
      grade: query.grade,
      semester: query.semester,
      conceptIds: query.conceptIds,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected ${query.grade} paper-pattern cards for ${query.semester} ${query.conceptIds.join(",")}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_PEP"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grade === query.grade));
    assert.ok(cards.every((card) => card.semester === query.semester));
  }
});

test("junior paper-pattern helper stays inside requested grade and respects semester", () => {
  const upperCards = getMainlandPepJuniorPaperPatternCards({
    grade: "S1",
    semester: "upper",
    conceptIds: ["有理数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(upperCards[0]?.id, "pep-junior-s1-upper-paper-rational-number-operations");
  assert.ok(upperCards.every((card) => card.semester === "upper"));

  const lowerWithUpperConcept = getMainlandPepJuniorPaperPatternCards({
    grade: "S1",
    semester: "lower",
    conceptIds: ["有理数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(!lowerWithUpperConcept.some((card) => card.id === "pep-junior-s1-upper-paper-rational-number-operations"));

  const s2UpperCards = getMainlandPepJuniorPaperPatternCards({
    grade: "S2",
    semester: "upper",
    conceptIds: ["三角形"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s2UpperCards.length > 0);
  assert.ok(s2UpperCards.every((card) => card.grade === "S2" && card.semester === "upper"));
  assert.ok(!s2UpperCards.some((card) => card.grade === "S1"));

  const s3UpperCards = getMainlandPepJuniorPaperPatternCards({
    grade: "S3",
    semester: "upper",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(s3UpperCards[0]?.id, "pep-junior-s3-upper-paper-quadratic-functions");
  assert.ok(s3UpperCards.every((card) => card.grade === "S3" && card.semester === "upper"));
  assert.ok(!s3UpperCards.some((card) => card.grade === "S1" || card.grade === "S2"));

  const s3LowerWithUpperConcept = getMainlandPepJuniorPaperPatternCards({
    grade: "S3",
    semester: "lower",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(!s3LowerWithUpperConcept.some((card) => card.id === "pep-junior-s3-upper-paper-quadratic-functions"));

  for (const grade of ["P1", "S4"] as const) {
    const cards = getMainlandPepEvidencePack({
      grade,
      semester: grade === "S4" ? "upper" : undefined,
      conceptIds: ["有理数", "相交线"],
      intent: "exam-practice",
      limit: 4
    });
    assert.equal(cards.juniorPaperPatternCards.length, 0);
  }
});

test("unified junior paper-pattern helper matches standalone helper", () => {
  const queries = [
    { grade: "S1" as const, semester: "upper" as const, conceptIds: ["有理数"], intent: "exam-practice" as const, limit: 4 },
    { grade: "S1" as const, semester: "upper" as const, conceptIds: ["一元一次方程"], intent: "diagnose-mistake" as const, limit: 4 },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["不等式"], intent: "assessment-design" as const, limit: 4 },
    { grade: "S1" as const, semester: "lower" as const, conceptIds: ["数据"], intent: "generate-question" as const, limit: 4 },
    { grade: "S2" as const, semester: "upper" as const, conceptIds: ["三角形"], intent: "exam-practice" as const, limit: 4 },
    { grade: "S2" as const, semester: "lower" as const, conceptIds: ["一次函数"], intent: "diagnose-mistake" as const, limit: 4 },
    { grade: "S3" as const, semester: "upper" as const, conceptIds: ["二次函数"], intent: "exam-practice" as const, limit: 4 },
    { grade: "S3" as const, semester: "lower" as const, conceptIds: ["锐角三角函数"], intent: "assessment-design" as const, limit: 4 }
  ];

  for (const query of queries) {
    const unifiedCards = getUnifiedMainlandPepJuniorPaperPatternCards(query);
    const helperCards = getMainlandPepJuniorPaperPatternCards(query);
    assert.deepEqual(
      unifiedCards.map((card) => card.id),
      helperCards.map((card) => card.id)
    );

    const unifiedPack = buildUnifiedMainlandPepJuniorPaperEvidencePack(query);
    const helperPack = buildMainlandPepJuniorPaperEvidencePack(query);
    assert.deepEqual(
      unifiedPack.cards.map((card) => card.id),
      helperPack.cards.map((card) => card.id)
    );
  }
});

test("junior paper-pattern evidence builders combine curriculum and pattern layers safely", () => {
  const paperPack = buildMainlandPepJuniorPaperEvidencePack({
    grade: "S2",
    semester: "lower",
    conceptIds: ["一次函数"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(paperPack.publisher, "MAINLAND_PEP");
  assert.equal(paperPack.stage, "junior-secondary");
  assert.equal(paperPack.cards[0]?.id, "pep-junior-s2-lower-paper-linear-functions");
  assert.match(paperPack.evidenceText, /Junior paper pattern/);

  const generationPack = buildMainlandPepJuniorPaperGenerationEvidencePack({
    grade: "S2",
    semester: "upper",
    conceptIds: ["分式"],
    intent: "generate-question",
    limit: 4
  });
  assert.ok(generationPack.curriculumCards.some((card) => card.grade === "S2" && card.semester === "upper"));
  assert.ok(generationPack.paperPatternCards.some((card) => card.id === "pep-junior-s2-upper-paper-algebraic-fractions"));
  assert.match(generationPack.evidenceText, /Curriculum layer:/);
  assert.match(generationPack.evidenceText, /Junior paper-pattern layer:/);
});

test("junior paper-pattern evidence avoids source-material artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /原题/i,
    /原文/i,
    /含答案/i,
    /解析版/i,
    /答案如下/i,
    /OCR/i,
    /entryPath/i,
    /sourceArchive/i,
    /扫描页/i,
    /截图/i,
    /见图/i
  ];
  const cardText = JSON.stringify(mainlandPepJuniorPaperPatternCards);
  const evidence = getMainlandPepEvidencePack({
    grade: "S3",
    semester: "lower",
    conceptIds: ["反比例函数", "相似", "锐角三角函数"],
    intent: "exam-practice",
    limit: 5
  }).evidenceText;

  assert.ok(mainlandPepJuniorPaperPatternCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(mainlandPepJuniorPaperPatternCards.every((card) => card.stage === "junior-secondary"));
  assert.equal(mainlandPepJuniorPaperPatternCards.length, 36);
  assert.equal(mainlandPepJuniorPaperPatternCards.filter((card) => card.grade === "S1").length, 12);
  assert.equal(mainlandPepJuniorPaperPatternCards.filter((card) => card.grade === "S2").length, 12);
  assert.equal(mainlandPepJuniorPaperPatternCards.filter((card) => card.grade === "S3").length, 12);
  assert.ok(mainlandPepJuniorPaperPatternCards.every((card) => card.sourceKind === "junior-paper-pattern"));

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.match(evidence, /Junior S1-S3 paper-pattern cards are aggregated safe abstractions/);
  assert.match(evidence, /Junior paper-pattern layer:/);
});

test("junior S1-S3 exam-pattern queries retrieve focused zhongkao safe cards", () => {
  const queries = [
    { grade: "S1" as const, conceptIds: ["有理数"], expected: "pep-junior-exam-number-sense-real-numbers" },
    { grade: "S2" as const, conceptIds: ["一次函数"], expected: "pep-junior-exam-linear-functions-graphs" },
    { grade: "S3" as const, conceptIds: ["二次函数"], expected: "pep-junior-exam-quadratic-equations-functions" },
    { grade: "S3" as const, conceptIds: ["圆"], expected: "pep-junior-exam-circle-geometry" },
    { grade: "S3" as const, conceptIds: ["相似", "锐角三角函数"], expected: "pep-junior-exam-similarity-right-triangle-trig" }
  ];

  for (const query of queries) {
    const cards = getMainlandPepJuniorExamPatternCards({
      grade: query.grade,
      conceptIds: query.conceptIds,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected junior exam-pattern cards for ${query.grade}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_PEP"));
    assert.ok(cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(cards.every((card) => card.grades.includes(query.grade)));
    assert.ok(cards.every((card) => card.semesters.includes("full-year") || card.semesters.includes("upper") || card.semesters.includes("lower")));
  }
});

test("shared Mainland junior zhongkao layer backs PEP compatibility cards without publisher duplication", () => {
  const sharedCards = getMainlandJuniorZhongkaoExamPatternCards({
    grade: "S3",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const pepCards = getMainlandPepJuniorExamPatternCards({
    grade: "S3",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  const sharedEvidence = buildMainlandJuniorZhongkaoExamEvidencePack({
    grade: "S3",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 2
  }).evidenceText;

  assert.equal(mainlandJuniorZhongkaoExamPatternCards.length, mainlandPepJuniorExamPatternCards.length);
  assert.deepEqual(sharedCards.map((card) => card.id), pepCards.map((card) => card.id));
  assert.ok(sharedCards.every((card) => !("publisher" in card)));
  assert.ok(pepCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(mainlandJuniorZhongkaoExamPatternCards.every((card) => card.yearRange === "2021-2025"));
  assert.match(sharedEvidence, /shared Mainland junior zhongkao/i);
  assert.match(sharedEvidence, /PEP, BNU, HJB/);
});

test("junior exam-pattern unified helper matches the standalone helper", () => {
  const queries = [
    { grade: "S1" as const, conceptIds: ["有理数"], intent: "exam-practice" as const, limit: 4 },
    { grade: "S2" as const, conceptIds: ["三角形"], intent: "diagnose-mistake" as const, limit: 4 },
    { grade: "S3" as const, conceptIds: ["圆"], intent: "exam-practice" as const, limit: 4 },
    { grade: "S3" as const, conceptIds: ["动点"], intent: "assessment-design" as const, limit: 4 }
  ];

  for (const query of queries) {
    const unifiedCards = getUnifiedMainlandPepJuniorExamPatternCards(query);
    const helperCards = getMainlandPepJuniorExamPatternCards(query);
    assert.deepEqual(
      unifiedCards.map((card) => card.id),
      helperCards.map((card) => card.id)
    );
  }
});

test("junior exam evidence builders combine curriculum and pattern layers safely", () => {
  const examPack = buildMainlandPepJuniorExamEvidencePack({
    grade: "S3",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 3
  });
  assert.ok(examPack.cards.some((card) => card.id === "pep-junior-exam-quadratic-equations-functions"));
  assert.match(examPack.evidenceText, /Junior exam pattern/);

  const generationPack = buildMainlandPepJuniorExamGenerationEvidencePack({
    grade: "S3",
    conceptIds: ["圆"],
    intent: "generate-question",
    limit: 4
  });
  assert.ok(generationPack.curriculumCards.some((card) => card.id === "pep-junior-s3-upper-quadratics-circle-probability"));
  assert.ok(generationPack.examPatternCards.some((card) => card.id === "pep-junior-exam-circle-geometry"));
  assert.match(generationPack.evidenceText, /Curriculum layer:/);
  assert.match(generationPack.evidenceText, /Exam-pattern layer:/);
});

test("primary cards and evidence packs avoid source-copying artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /例题/i,
    /教材原文/i,
    /见图/i,
    /扫描页/i,
    /答案如下/i,
    /OCR\s*text/i
  ];
  const primaryCardText = JSON.stringify(mainlandPepPrimaryRagCards);
  const primaryEvidence = getMainlandPepEvidencePack({
    grade: "P2",
    conceptIds: ["乘法口诀"],
    intent: "generate-question",
    limit: 2
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(primaryCardText, pattern);
    assert.doesNotMatch(primaryEvidence, pattern);
  }

  mainlandPepPrimaryRagCards.forEach((card) => {
    assert.equal(card.publisher, "MAINLAND_PEP");
    assert.equal(card.sourceKind, "safe-abstraction");
    assert.ok(card.prohibitedReuseNotes.some((note) => /Do not copy, rewrite, translate/.test(note)));
    assert.ok(card.safeSummary.length > 40);
    assert.ok(card.generationGuidance.length >= 2);
  });
});

test("P1 and P2 primary paper-pattern queries retrieve focused upper and lower assessment cards", () => {
  const p1UpperWithin20 = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "upper",
    conceptIds: ["20以内加减法"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(p1UpperWithin20[0]?.id, "pep-primary-p1-upper-exam-within-20-addition");
  assert.ok(p1UpperWithin20.every((card) => card.grade === "P1" && card.semester === "upper"));

  const p1LowerRegrouping = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "lower",
    conceptIds: ["退位减法"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(p1LowerRegrouping[0]?.id, "pep-primary-p1-lower-exam-within-20-regrouping-subtraction");

  const p1LowerWithin100 = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "lower",
    conceptIds: ["100以内"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(p1LowerWithin100[0]?.id, "pep-primary-p1-lower-exam-within-100-place-value");

  const p1Money = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "lower",
    conceptIds: ["人民币"],
    intent: "assessment-design",
    limit: 2
  });
  assert.equal(p1Money[0]?.id, "pep-primary-p1-lower-exam-money-data-context");

  const upperMultiplication = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["乘法口诀"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(upperMultiplication[0]?.id, "pep-primary-p2-upper-paper-multiplication-arrays");
  assert.ok(upperMultiplication.every((card) => card.grade === "P2" && card.semester === "upper"));

  const upperLength = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "upper",
    conceptIds: ["长度单位"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(upperLength[0]?.id, "pep-primary-p2-upper-paper-length-measurement");
  assert.ok(upperLength.every((card) => card.grade === "P2" && card.semester === "upper"));

  const lowerDivision = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "lower",
    conceptIds: ["表内除法"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(lowerDivision[0]?.id, "pep-primary-p2-lower-paper-division-facts");

  const lowerWithin10000 = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "lower",
    conceptIds: ["万以内数"],
    intent: "assessment-design",
    limit: 2
  });
  assert.equal(lowerWithin10000[0]?.id, "pep-primary-p2-lower-paper-within-10000-number-add-sub");

  const lowerRemainder = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "lower",
    conceptIds: ["有余数除法"],
    intent: "diagnose-mistake",
    limit: 2
  });
  assert.equal(lowerRemainder[0]?.id, "pep-primary-p2-lower-paper-remainder-division");
});

test("P3 primary paper-pattern queries retrieve upper and lower assessment cards", () => {
  const upperFractions = getMainlandPepPrimaryExamPatternCards({
    grade: "P3",
    semester: "upper",
    conceptIds: ["分数初步"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(upperFractions[0]?.id, "pep-primary-p3-upper-paper-fraction-introduction");
  assert.ok(upperFractions.every((card) => card.grade === "P3" && card.semester === "upper"));

  const upperPerimeter = getMainlandPepPrimaryExamPatternCards({
    grade: "P3",
    semester: "upper",
    conceptIds: ["周长"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(upperPerimeter[0]?.id, "pep-primary-p3-upper-paper-perimeter-rectangles");

  const lowerArea = getMainlandPepPrimaryExamPatternCards({
    grade: "P3",
    semester: "lower",
    conceptIds: ["面积"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(lowerArea[0]?.id, "pep-primary-p3-lower-paper-area-perimeter");
  assert.ok(lowerArea.every((card) => card.grade === "P3" && card.semester === "lower"));

  const lowerMultiplication = getMainlandPepPrimaryExamPatternCards({
    grade: "P3",
    semester: "lower",
    conceptIds: ["两位数乘两位数"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(lowerMultiplication[0]?.id, "pep-primary-p3-lower-paper-two-digit-multiplication");
});

test("P4 primary paper-pattern queries retrieve upper and lower assessment cards", () => {
  const upperLargeNumbers = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["大数认识"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(upperLargeNumbers[0]?.id, "pep-primary-p4-upper-paper-large-numbers-rounding");
  assert.ok(upperLargeNumbers.every((card) => card.grade === "P4" && card.semester === "upper"));

  const upperAngles = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["角的度量"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(upperAngles[0]?.id, "pep-primary-p4-upper-paper-angle-lines-quadrilaterals");

  const upperOptimization = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "upper",
    conceptIds: ["优化"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(upperOptimization[0]?.id, "pep-primary-p4-upper-paper-statistics-optimization");

  const lowerOperations = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "lower",
    conceptIds: ["运算定律"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(lowerOperations[0]?.id, "pep-primary-p4-lower-paper-four-operations-laws");
  assert.ok(lowerOperations.every((card) => card.grade === "P4" && card.semester === "lower"));

  const lowerDecimals = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "lower",
    conceptIds: ["小数加减法"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(lowerDecimals[0]?.id, "pep-primary-p4-lower-paper-decimal-add-sub");

  const lowerTriangleMotion = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "lower",
    conceptIds: ["三角形"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(lowerTriangleMotion[0]?.id, "pep-primary-p4-lower-paper-triangle-geometry-motion");

  const lowerAverage = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "lower",
    conceptIds: ["平均数"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(lowerAverage[0]?.id, "pep-primary-p4-lower-paper-average-statistics-problem-solving");
});

test("P5 primary paper-pattern queries retrieve upper and lower assessment cards", () => {
  const upperDecimals = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["小数乘法"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(upperDecimals[0]?.id, "pep-primary-p5-upper-paper-decimal-operations");
  assert.ok(upperDecimals.every((card) => card.grade === "P5" && card.semester === "upper"));

  const upperEquations = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["简易方程"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(upperEquations[0]?.id, "pep-primary-p5-upper-paper-simple-equations");

  const upperArea = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "upper",
    conceptIds: ["多边形面积"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(upperArea[0]?.id, "pep-primary-p5-upper-paper-polygon-area");

  const lowerFactors = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "lower",
    conceptIds: ["因数倍数"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(lowerFactors[0]?.id, "pep-primary-p5-lower-paper-factors-multiples");
  assert.ok(lowerFactors.every((card) => card.grade === "P5" && card.semester === "lower"));

  const lowerFractionAddSub = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "lower",
    conceptIds: ["分数加减"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(lowerFractionAddSub[0]?.id, "pep-primary-p5-lower-paper-fraction-add-subtract");

  const lowerVolume = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "lower",
    conceptIds: ["长方体正方体体积"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(lowerVolume[0]?.id, "pep-primary-p5-lower-paper-cuboid-cube-volume");
});

test("P6 primary paper-pattern queries retrieve upper and lower assessment cards", () => {
  const upperFractionRatio = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "upper",
    conceptIds: ["分数乘除", "比"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(upperFractionRatio[0]?.id, "pep-primary-p6-upper-paper-fraction-ratio-operations");
  assert.ok(upperFractionRatio.every((card) => card.grade === "P6" && card.semester === "upper"));

  const upperCircle = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "upper",
    conceptIds: ["圆面积"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(upperCircle[0]?.id, "pep-primary-p6-upper-paper-circle-geometry");

  const upperFinal = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "upper",
    materialKind: "midterm-final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(upperFinal[0]?.id, "pep-primary-p6-upper-paper-integrated-midterm-final");

  const lowerNegativePercent = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["负数", "折扣"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(lowerNegativePercent[0]?.id, "pep-primary-p6-lower-paper-negative-percent");
  assert.ok(lowerNegativePercent.every((card) => card.grade === "P6" && card.semester === "lower"));

  const lowerSolidGeometry = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["圆柱", "圆锥"],
    intent: "diagnose-mistake",
    limit: 3
  });
  assert.equal(lowerSolidGeometry[0]?.id, "pep-primary-p6-lower-paper-cylinder-cone-geometry");

  const lowerProportion = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["比例尺"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(lowerProportion[0]?.id, "pep-primary-p6-lower-paper-proportion-scale");

  const lowerReasoning = getMainlandPepPrimaryExamPatternCards({
    grade: "P6",
    semester: "lower",
    conceptIds: ["抽屉原理"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(lowerReasoning[0]?.id, "pep-primary-p6-lower-paper-drawer-principle");
});

test("primary material-kind and assessment-family filters affect ranking without crossing semester", () => {
  const p1UpperFinal = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(p1UpperFinal[0]?.id, "pep-primary-p1-upper-exam-midterm-final-structure");
  assert.ok(p1UpperFinal.every((card) => card.grade === "P1" && card.semester === "upper"));

  const p1LowerMidterm = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    semester: "lower",
    assessmentFamily: "midterm",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(p1LowerMidterm[0]?.id, "pep-primary-p1-lower-exam-within-20-regrouping-subtraction");
  assert.ok(p1LowerMidterm.every((card) => card.grade === "P1" && card.semester === "lower"));

  const upperFinal = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "upper",
    materialKind: "midterm-final",
    difficultyBand: "core",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(upperFinal[0]?.id, "pep-primary-p2-upper-paper-midterm-final-integrated");
  assert.ok(upperFinal.every((card) => card.grade === "P2" && card.semester === "upper"));

  const lowerProblemSolving = getMainlandPepPrimaryExamPatternCards({
    grade: "P2",
    semester: "lower",
    materialKind: "problem-solving",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(lowerProblemSolving[0]?.id, "pep-primary-p2-lower-paper-problem-solving-tiered-review");
  assert.ok(lowerProblemSolving.every((card) => card.grade === "P2" && card.semester === "lower"));

  const p4UpperIntegrated = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(p4UpperIntegrated[0]?.id, "pep-primary-p4-upper-paper-integrated-review-error-extension");
  assert.ok(p4UpperIntegrated.every((card) => card.grade === "P4" && card.semester === "upper"));

  const p4LowerProblemSolving = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    semester: "lower",
    materialKind: "problem-solving",
    difficultyBand: "exam",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(p4LowerProblemSolving[0]?.id, "pep-primary-p4-lower-paper-average-statistics-problem-solving");
  assert.ok(p4LowerProblemSolving.every((card) => card.grade === "P4" && card.semester === "lower"));

  const p5UpperIntegrated = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "upper",
    assessmentFamily: "final",
    difficultyBand: "exam",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(p5UpperIntegrated[0]?.id, "pep-primary-p5-upper-paper-integrated-review-error-extension");
  assert.ok(p5UpperIntegrated.every((card) => card.grade === "P5" && card.semester === "upper"));

  const p5LowerReview = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    semester: "lower",
    materialKind: "midterm-final",
    difficultyBand: "exam",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(p5LowerReview[0]?.id, "pep-primary-p5-lower-paper-geometry-movement-data-review");
  assert.ok(p5LowerReview.every((card) => card.grade === "P5" && card.semester === "lower"));
});

test("primary exam-pattern evidence avoids source-material artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /原题/i,
    /含答案/i,
    /答案如下/i,
    /OCR\s*text/i,
    /entryPath/i,
    /sourceArchive/i,
    /扫描页/i,
    /截图/i
  ];
  const cardText = JSON.stringify(mainlandPepPrimaryExamPatternCards);
  const evidence = buildMainlandPepPrimaryExamEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["表内除法"],
    intent: "assessment-design",
    limit: 3
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.equal(mainlandPepPrimaryExamPatternCards.length, 62);
  assert.equal(mainlandPepPrimaryExamPatternCards.filter((card) => card.grade === "P1").length, 10);
  mainlandPepPrimaryExamPatternCards.forEach((card) => {
    assert.equal(card.publisher, "MAINLAND_PEP");
    assert.equal(card.stage, "primary");
    assert.equal(card.sourceKind, "exam-practice-pattern");
    assert.ok(card.materialKinds.length > 0);
    assert.ok(card.unitTitles.length > 0);
    assert.ok(card.prohibitedReuseNotes.some((note) => /Do not/.test(note)));
    assert.ok(card.patternSummary.length > 60);
    assert.ok(card.generationGuidance.length >= 2);
  });
});

test("primary exam-pattern layer stays separated from other grades and high-school RAG", () => {
  const p1AreaCards = getMainlandPepPrimaryExamPatternCards({
    grade: "P1",
    conceptIds: ["面积"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p1AreaCards.every((card) => card.grade === "P1"));
  assert.ok(!p1AreaCards.some((card) => card.grade === "P3"));

  const p4Cards = getMainlandPepPrimaryExamPatternCards({
    grade: "P4",
    conceptIds: ["面积"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p4Cards.every((card) => card.grade === "P4"));
  assert.ok(!p4Cards.some((card) => card.grade === "P3" || card.grade === "P5"));

  const p5AreaCards = getMainlandPepPrimaryExamPatternCards({
    grade: "P5",
    conceptIds: ["面积"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p5AreaCards.every((card) => card.grade === "P5"));
  assert.ok(!p5AreaCards.some((card) => card.grade === "P3"));

  const s4Cards = getMainlandPepPrimaryExamPatternCards({
    grade: "S4",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(s4Cards.length, 0);

  const combinedPack = buildMainlandPepPrimaryExamGenerationEvidencePack({
    grade: "P2",
    semester: "lower",
    conceptIds: ["表内除法"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(combinedPack.publisher, "MAINLAND_PEP");
  assert.equal(combinedPack.stage, "primary");
  assert.ok(combinedPack.curriculumCards.length > 0);
  assert.ok(combinedPack.curriculumCards.every((card) => card.stage === "primary"));
  assert.equal(combinedPack.examPatternCards[0]?.id, "pep-primary-p2-lower-paper-division-facts");
  assert.match(combinedPack.evidenceText, /Curriculum layer:/);
  assert.match(combinedPack.evidenceText, /Assessment-pattern layer:/);
  assert.doesNotMatch(combinedPack.evidenceText, /MAINLAND_PEP_HIGH/);

  const p3CombinedPack = buildMainlandPepPrimaryExamGenerationEvidencePack({
    grade: "P3",
    semester: "lower",
    conceptIds: ["面积"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(p3CombinedPack.curriculumCards.some((card) => card.id === "pep-primary-p3-lower-area-decimal-data"));
  assert.equal(p3CombinedPack.examPatternCards[0]?.id, "pep-primary-p3-lower-paper-area-perimeter");
  assert.match(p3CombinedPack.evidenceText, /Curriculum layer:/);
  assert.match(p3CombinedPack.evidenceText, /Assessment-pattern layer:/);

  const p4CombinedPack = buildMainlandPepPrimaryExamGenerationEvidencePack({
    grade: "P4",
    semester: "lower",
    conceptIds: ["小数加减法"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(p4CombinedPack.curriculumCards.some((card) => card.id === "pep-primary-p4-lower-decimal-operations-average"));
  assert.equal(p4CombinedPack.examPatternCards[0]?.id, "pep-primary-p4-lower-paper-decimal-add-sub");
  assert.match(p4CombinedPack.evidenceText, /Curriculum layer:/);
  assert.match(p4CombinedPack.evidenceText, /Assessment-pattern layer:/);

  const p5CombinedPack = buildMainlandPepPrimaryExamGenerationEvidencePack({
    grade: "P5",
    semester: "lower",
    conceptIds: ["长方体正方体体积"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(p5CombinedPack.curriculumCards.some((card) => card.id === "pep-primary-p5-lower-fractions-factors-volume"));
  assert.equal(p5CombinedPack.examPatternCards[0]?.id, "pep-primary-p5-lower-paper-cuboid-cube-volume");
  assert.match(p5CombinedPack.evidenceText, /Curriculum layer:/);
  assert.match(p5CombinedPack.evidenceText, /Assessment-pattern layer:/);

  const p6CombinedPack = buildMainlandPepPrimaryExamGenerationEvidencePack({
    grade: "P6",
    semester: "lower",
    conceptIds: ["比例尺"],
    intent: "assessment-design",
    limit: 4
  });
  assert.ok(p6CombinedPack.curriculumCards.some((card) => card.id === "pep-primary-p6-lower-proportion-negative-review"));
  assert.equal(p6CombinedPack.examPatternCards[0]?.id, "pep-primary-p6-lower-paper-proportion-scale");
  assert.match(p6CombinedPack.evidenceText, /Curriculum layer:/);
  assert.match(p6CombinedPack.evidenceText, /Assessment-pattern layer:/);
});

test("unified Mainland PEP entrypoint matches the primary exam-pattern helper", () => {
  const queries = [
    { grade: "P1" as const, semester: "upper" as const, conceptIds: ["20以内加减法"], intent: "exam-practice" as const, limit: 4 },
    { grade: "P1" as const, semester: "lower" as const, conceptIds: ["人民币"], intent: "assessment-design" as const, limit: 4 },
    { grade: "P2" as const, semester: "upper" as const, conceptIds: ["乘法口诀"], intent: "exam-practice" as const, limit: 4 },
    { grade: "P2" as const, semester: "lower" as const, conceptIds: ["表内除法"], intent: "assessment-design" as const, limit: 4 },
    { grade: "P3" as const, semester: "upper" as const, conceptIds: ["分数初步"], intent: "exam-practice" as const, limit: 4 },
    { grade: "P3" as const, semester: "lower" as const, conceptIds: ["面积"], intent: "assessment-design" as const, limit: 4 },
    { grade: "P4" as const, semester: "lower" as const, conceptIds: ["平均数"], intent: "exam-practice" as const, limit: 4 },
    { grade: "P5" as const, semester: "lower" as const, conceptIds: ["长方体正方体体积"], intent: "exam-practice" as const, limit: 4 },
    { grade: "P6" as const, semester: "lower" as const, conceptIds: ["比例尺"], intent: "assessment-design" as const, limit: 4 },
    { grade: "S4" as const, conceptIds: ["derivatives"], intent: "exam-practice" as const, limit: 4 }
  ];

  for (const query of queries) {
    const unifiedCards = getUnifiedMainlandPepPrimaryExamPatternCards(query);
    const helperCards = getMainlandPepPrimaryExamPatternCards(query);
    assert.deepEqual(
      unifiedCards.map((card) => card.id),
      helperCards.map((card) => card.id)
    );

    const unifiedPack = buildUnifiedMainlandPepPrimaryExamEvidencePack(query);
    const helperPack = buildMainlandPepPrimaryExamEvidencePack(query);
    assert.deepEqual(
      unifiedPack.cards.map((card) => card.id),
      helperPack.cards.map((card) => card.id)
    );
  }
});

test("primary and high-school RAG layers stay separated by grade", () => {
  const primaryPack = getMainlandPepEvidencePack({
    grade: "P1",
    conceptIds: ["20以内加减法"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.ok(primaryPack.cards.length > 0);
  assert.ok(primaryPack.cards.every((card) => card.stage === "primary"));
  assert.ok(primaryPack.primaryExamPatternCards.length > 0);
  assert.ok(primaryPack.primaryExamPatternCards.every((card) => card.grade === "P1"));
  assert.ok(!primaryPack.primaryExamPatternCards.some((card) => card.grade === "P3"));
  assert.equal(primaryPack.juniorPaperPatternCards.length, 0);
  assert.equal(primaryPack.juniorExamPatternCards.length, 0);
  assert.equal(primaryPack.secondaryExamPatternCards.length, 0);
  assert.doesNotMatch(primaryPack.evidenceText, /MAINLAND_PEP_HIGH/);

  const p2Pack = getMainlandPepEvidencePack({
    grade: "P2",
    conceptIds: ["乘法口诀"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p2Pack.cards.length > 0);
  assert.ok(p2Pack.primaryExamPatternCards.some((card) => card.id === "pep-primary-p2-upper-paper-multiplication-arrays"));
  assert.match(p2Pack.evidenceText, /Primary paper pattern/);

  const p3Pack = getMainlandPepEvidencePack({
    grade: "P3",
    conceptIds: ["分数初步"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p3Pack.cards.some((card) => card.id === "pep-primary-p3-upper-multidigit-operations-fractions"));
  assert.ok(p3Pack.primaryExamPatternCards.some((card) => card.id === "pep-primary-p3-upper-paper-fraction-introduction"));
  assert.ok(p3Pack.primaryExamPatternCards.every((card) => card.grade === "P3"));
  assert.match(p3Pack.evidenceText, /Primary paper pattern/);

  const p4Pack = getMainlandPepEvidencePack({
    grade: "P4",
    conceptIds: ["大数认识"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p4Pack.cards.some((card) => card.id === "pep-primary-p4-upper-large-numbers-angles"));
  assert.ok(p4Pack.primaryExamPatternCards.some((card) => card.id === "pep-primary-p4-upper-paper-large-numbers-rounding"));
  assert.ok(p4Pack.primaryExamPatternCards.every((card) => card.grade === "P4"));
  assert.match(p4Pack.evidenceText, /Primary paper pattern/);

  const p5Pack = getMainlandPepEvidencePack({
    grade: "P5",
    conceptIds: ["分数加减"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p5Pack.cards.some((card) => card.id === "pep-primary-p5-lower-fractions-factors-volume"));
  assert.ok(p5Pack.primaryExamPatternCards.some((card) => card.id === "pep-primary-p5-lower-paper-fraction-add-subtract"));
  assert.ok(p5Pack.primaryExamPatternCards.every((card) => card.grade === "P5"));
  assert.match(p5Pack.evidenceText, /Primary paper pattern/);

  const p6Pack = getMainlandPepEvidencePack({
    grade: "P6",
    conceptIds: ["比例"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(p6Pack.cards.some((card) => card.id === "pep-primary-p6-lower-proportion-negative-review"));
  assert.ok(p6Pack.primaryExamPatternCards.some((card) => card.id === "pep-primary-p6-lower-paper-proportion-scale"));
  assert.ok(p6Pack.primaryExamPatternCards.every((card) => card.grade === "P6"));
  assert.match(p6Pack.evidenceText, /Primary paper pattern/);

  const juniorPack = getMainlandPepEvidencePack({
    grade: "S3",
    conceptIds: ["二次函数"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(juniorPack.cards.length > 0);
  assert.ok(juniorPack.cards.every((card) => card.stage === "junior-secondary"));
  assert.equal(juniorPack.primaryExamPatternCards.length, 0);
  assert.ok(juniorPack.juniorPaperPatternCards.length > 0);
  assert.ok(juniorPack.juniorPaperPatternCards.every((card) => card.stage === "junior-secondary"));
  assert.ok(juniorPack.juniorPaperPatternCards.every((card) => card.grade === "S3"));
  assert.ok(juniorPack.juniorExamPatternCards.length > 0);
  assert.ok(juniorPack.juniorExamPatternCards.every((card) => card.stage === "junior-secondary"));
  assert.ok(juniorPack.juniorExamPatternCards.every((card) => card.grades.includes("S3")));
  assert.equal(juniorPack.secondaryExamPatternCards.length, 0);
  assert.match(juniorPack.evidenceText, /Junior exam-pattern layer:/);
  assert.doesNotMatch(juniorPack.evidenceText, /MAINLAND_PEP_HIGH/);

  const highPack = getMainlandPepEvidencePack({
    grade: "S5",
    conceptIds: ["conic-geometry"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(highPack.cards.length > 0);
  assert.ok(highPack.cards.every((card) => card.stage === "senior-secondary"));
  assert.equal(highPack.primaryExamPatternCards.length, 0);
  assert.equal(highPack.juniorPaperPatternCards.length, 0);
  assert.equal(highPack.juniorExamPatternCards.length, 0);
  assert.ok(highPack.secondaryExamPatternCards.length > 0);
  assert.ok(highPack.secondaryExamPatternCards.every((card) => card.stage === "senior-secondary"));
  assert.ok(highPack.secondaryExamPatternCards.every((card) => card.grades.includes("S5")));
  assert.ok(highPack.cards.every((card) => card.legacyCurriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.match(highPack.evidenceText, /Secondary exam-pattern layer:/);
  assert.ok(mainlandPepHighRagCards.length >= highPack.cards.length);
});

test("unified Mainland PEP evidence pack surfaces S1-S3 junior exam-pattern cards", () => {
  const queries = [
    { grade: "S1" as const, conceptIds: ["有理数"], expected: "pep-junior-exam-number-sense-real-numbers" },
    { grade: "S2" as const, conceptIds: ["一次函数"], expected: "pep-junior-exam-linear-functions-graphs" },
    { grade: "S3" as const, conceptIds: ["二次函数"], expected: "pep-junior-exam-quadratic-equations-functions" },
    { grade: "S3" as const, conceptIds: ["圆"], expected: "pep-junior-exam-circle-geometry" },
    { grade: "S3" as const, conceptIds: ["相似", "锐角三角函数"], expected: "pep-junior-exam-similarity-right-triangle-trig" }
  ];

  for (const query of queries) {
    const pack = getMainlandPepEvidencePack({
      grade: query.grade,
      conceptIds: query.conceptIds,
      intent: "exam-practice",
      limit: 4
    });

    assert.ok(pack.cards.length > 0, `Expected junior curriculum cards for ${query.grade}`);
    assert.ok(pack.cards.every((card) => card.stage === "junior-secondary"));
    assert.ok(pack.juniorExamPatternCards.some((card) => card.id === query.expected));
    assert.ok(pack.juniorExamPatternCards.every((card) => card.grades.includes(query.grade)));
    assert.equal(pack.primaryExamPatternCards.length, 0);
    assert.ok(pack.juniorPaperPatternCards.length > 0);
    assert.ok(pack.juniorPaperPatternCards.every((card) => card.grade === query.grade));
    assert.equal(pack.secondaryExamPatternCards.length, 0);
    assert.match(pack.evidenceText, /Junior exam pattern/);
  }
});

test("unified Mainland PEP evidence pack surfaces S4-S6 secondary exam-pattern cards", () => {
  const s4Pack = getMainlandPepEvidencePack({
    grade: "S4",
    conceptIds: ["trigonometric-graphs"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s4Pack.cards.some((card) => card.id === "pep-high-trigonometric-functions"));
  assert.ok(s4Pack.secondaryExamPatternCards.some((card) => card.id === "pep-high-exam-trigonometric-graphs"));
  assert.ok(s4Pack.secondaryExamPatternCards.every((card) => card.grades.includes("S4")));
  assert.equal(s4Pack.primaryExamPatternCards.length, 0);
  assert.equal(s4Pack.juniorPaperPatternCards.length, 0);
  assert.equal(s4Pack.juniorExamPatternCards.length, 0);
  assert.match(s4Pack.evidenceText, /Secondary exam pattern/);

  const s5Pack = getMainlandPepEvidencePack({
    grade: "S5",
    conceptIds: ["space-vectors"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s5Pack.cards.some((card) => card.id === "pep-high-space-vectors-solid-geometry"));
  assert.ok(s5Pack.secondaryExamPatternCards.some((card) => card.id === "pep-high-exam-space-vectors-geometry"));
  assert.ok(s5Pack.secondaryExamPatternCards.every((card) => card.grades.includes("S5")));
  assert.equal(s5Pack.primaryExamPatternCards.length, 0);
  assert.equal(s5Pack.juniorPaperPatternCards.length, 0);
  assert.equal(s5Pack.juniorExamPatternCards.length, 0);

  const s6DerivativePack = getMainlandPepEvidencePack({
    grade: "S6",
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s6DerivativePack.cards.some((card) => card.id === "pep-high-derivatives-applications"));
  assert.ok(s6DerivativePack.secondaryExamPatternCards.some((card) => card.id === "pep-high-exam-derivatives-optimization"));
  assert.ok(s6DerivativePack.secondaryExamPatternCards.every((card) => card.grades.includes("S6")));
  assert.equal(s6DerivativePack.primaryExamPatternCards.length, 0);
  assert.equal(s6DerivativePack.juniorPaperPatternCards.length, 0);
  assert.equal(s6DerivativePack.juniorExamPatternCards.length, 0);

  const s6ProbabilityPack = getMainlandPepEvidencePack({
    grade: "S6",
    conceptIds: ["conditional-probability", "linear-regression"],
    intent: "diagnose-mistake",
    limit: 5
  });
  assert.ok(s6ProbabilityPack.secondaryExamPatternCards.some((card) => card.id === "pep-high-exam-conditional-probability-models"));
  assert.ok(s6ProbabilityPack.secondaryExamPatternCards.some((card) => card.id === "pep-high-exam-regression-independence"));
  assert.ok(s6ProbabilityPack.secondaryExamPatternCards.every((card) => card.stage === "senior-secondary"));
});

test("secondary exam-pattern unified helper returns safe grade-semester metadata", () => {
  const s4Cards = getUnifiedMainlandPepSecondaryExamPatternCards({
    grade: "S4",
    semester: "upper",
    conceptIds: ["trigonometric-graphs"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(s4Cards[0]?.id, "pep-high-exam-trigonometric-graphs");
  assert.ok(s4Cards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(s4Cards.every((card) => card.stage === "senior-secondary"));
  assert.ok(s4Cards.every((card) => card.legacyCurriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.ok(s4Cards.every((card) => card.grades.includes("S4")));
  assert.ok(s4Cards.every((card) => card.semesters.includes("upper")));

  const s6Cards = getUnifiedMainlandPepSecondaryExamPatternCards({
    grade: "S6",
    semester: "full-year",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(s6Cards[0]?.id, "pep-high-exam-derivatives-optimization");
  assert.ok(s6Cards.every((card) => card.grades.includes("S6")));
  assert.ok(s6Cards.every((card) => card.semesters.includes("full-year")));
});

test("unified Mainland PEP junior exam evidence avoids source-material artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /中考\s*真题/i,
    /官方\s*解析/i,
    /原题/i,
    /原文/i,
    /含答案/i,
    /答案如下/i,
    /OCR/i,
    /entryPath/i,
    /sourceArchive/i,
    /扫描页/i,
    /截图/i,
    /见图/i
  ];
  const cardText = JSON.stringify(mainlandPepJuniorExamPatternCards);
  const evidence = getMainlandPepEvidencePack({
    grade: "S3",
    conceptIds: ["二次函数", "圆"],
    intent: "exam-practice",
    limit: 5
  }).evidenceText;

  assert.ok(mainlandPepJuniorExamPatternCards.length >= 12);
  assert.ok(mainlandPepJuniorExamPatternCards.length <= 18);
  assert.ok(mainlandPepJuniorExamPatternCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(mainlandPepJuniorExamPatternCards.every((card) => card.stage === "junior-secondary"));
  assert.ok(mainlandPepJuniorExamPatternCards.every((card) => card.grades.some((grade) => ["S1", "S2", "S3"].includes(grade))));
  assert.ok(mainlandPepJuniorExamPatternCards.every((card) => card.sourceKind === "zhongkao-paper-pattern" || card.sourceKind === "zhongkao-solution-pattern"));

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.match(evidence, /Junior S1-S3 exam-pattern cards are aggregated safe abstractions/);
  assert.match(evidence, /Junior exam-pattern layer:/);
});

test("unified Mainland PEP secondary evidence avoids source-material artifacts", () => {
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /高考\s*真题/i,
    /官方\s*解析/i,
    /原题/i,
    /原文/i,
    /含答案/i,
    /答案如下/i,
    /OCR\s*text/i,
    /entryPath/i,
    /sourceArchive/i,
    /扫描页/i,
    /截图/i,
    /见图/i
  ];
  const cardText = JSON.stringify(mainlandPepHighExamPatternCards);
  const evidence = getMainlandPepEvidencePack({
    grade: "S6",
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 4
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.match(evidence, /Do not quote or reconstruct/);
  assert.match(evidence, /Secondary S4-S6 exam-pattern cards are aggregated safe abstractions/);
});
