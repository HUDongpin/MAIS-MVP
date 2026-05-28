import assert from "node:assert/strict";
import test from "node:test";
import {
  mainlandBnuHighAssessmentCoverageGaps,
  mainlandBnuHighAssessmentPatternCards,
  mainlandBnuHighS4LowerAssessmentPatternCards
} from "../../data/rag/mainlandBnuHighAssessmentPatterns";
import {
  buildMainlandBnuHighAssessmentPatternEvidencePack,
  getMainlandBnuHighAssessmentPatternCards
} from "./mainlandBnuHighAssessmentPatterns";

test("BNU high S4 upper assessment-pattern queries retrieve unit midterm and final slots", () => {
  const cases = [
    {
      query: { chapter: "指数运算与指数函数", conceptIds: ["exponential-functions"], assessmentFamily: "unit-test" as const },
      expected: "bnu-high-s4-upper-exponential-unit-pattern"
    },
    {
      query: { unitTitle: "期中", assessmentFamily: "midterm" as const, materialKind: "midterm-final" as const },
      expected: "bnu-high-s4-upper-midterm-function-properties-review"
    },
    {
      query: { unitTitle: "期末", assessmentFamily: "final" as const, materialKind: "midterm-final" as const },
      expected: "bnu-high-s4-upper-final-full-volume-review"
    }
  ];

  for (const testCase of cases) {
    const cards = getMainlandBnuHighAssessmentPatternCards({
      grade: "S4",
      semester: "upper",
      intent: "assessment-design",
      limit: 5,
      ...testCase.query
    });

    assert.equal(cards[0]?.id, testCase.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.grades.includes("S4")));
    assert.ok(cards.every((card) => card.semesters.includes("upper")));
    assert.ok(cards.every((card) => card.volumeScope === "compulsory-1"));
  }

  const unitTop = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    semester: "upper",
    assessmentFamily: "unit-test",
    intent: "assessment-design",
    limit: 1
  })[0]?.id;
  const midtermTop = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    semester: "upper",
    assessmentFamily: "midterm",
    materialKind: "midterm-final",
    intent: "assessment-design",
    limit: 1
  })[0]?.id;
  const finalTop = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    semester: "upper",
    assessmentFamily: "final",
    materialKind: "midterm-final",
    intent: "assessment-design",
    limit: 1
  })[0]?.id;

  assert.notEqual(unitTop, midtermTop);
  assert.notEqual(midtermTop, finalTop);
  assert.notEqual(unitTop, finalTop);
});

test("BNU high S4 lower assessment-pattern queries retrieve the fixed safe slots", () => {
  const cases = [
    {
      query: { chapter: "三角函数", conceptIds: ["trigonometric-graphs"], assessmentFamily: "unit-test" as const },
      expected: "bnu-high-s4-lower-assessment-unit-trigonometric-functions"
    },
    {
      query: { chapter: "平面向量及其应用", conceptIds: ["dot-product"], assessmentFamily: "topic-review" as const },
      expected: "bnu-high-s4-lower-assessment-review-plane-vectors-applications"
    },
    {
      query: { chapter: "复数", conceptIds: ["complex-plane"], assessmentFamily: "unit-test" as const },
      expected: "bnu-high-s4-lower-assessment-unit-complex-numbers"
    },
    {
      query: { chapter: "立体几何初步", conceptIds: ["solid-geometry"], assessmentFamily: "unit-test" as const },
      expected: "bnu-high-s4-lower-assessment-unit-solid-geometry-introduction"
    },
    {
      query: { unitTitle: "期中", assessmentFamily: "midterm" as const, materialKind: "midterm-final" as const },
      expected: "bnu-high-s4-lower-assessment-midterm-integrated-s4-lower"
    },
    {
      query: { unitTitle: "期末", assessmentFamily: "final" as const, materialKind: "midterm-final" as const },
      expected: "bnu-high-s4-lower-assessment-final-integrated-s4-lower"
    }
  ];

  for (const testCase of cases) {
    const cards = getMainlandBnuHighAssessmentPatternCards({
      grade: "S4",
      semester: "lower",
      intent: "assessment-design",
      limit: 5,
      ...testCase.query
    });

    assert.equal(cards[0]?.id, testCase.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.grades.includes("S4")));
    assert.ok(cards.every((card) => card.semesters.includes("lower")));
    assert.ok(cards.every((card) => !card.id.startsWith("pep-") && !card.id.includes("hjb")));
  }

  assert.equal(mainlandBnuHighS4LowerAssessmentPatternCards.length, 11);
  assert.deepEqual(
    mainlandBnuHighS4LowerAssessmentPatternCards.map((card) => card.id),
    [
      "bnu-high-s4-lower-assessment-unit-trigonometric-functions",
      "bnu-high-s4-lower-assessment-review-trigonometric-functions",
      "bnu-high-s4-lower-assessment-unit-plane-vectors-applications",
      "bnu-high-s4-lower-assessment-review-plane-vectors-applications",
      "bnu-high-s4-lower-assessment-unit-trig-identities-transformations",
      "bnu-high-s4-lower-assessment-review-trig-identities-transformations",
      "bnu-high-s4-lower-assessment-unit-complex-numbers",
      "bnu-high-s4-lower-assessment-review-complex-numbers",
      "bnu-high-s4-lower-assessment-unit-solid-geometry-introduction",
      "bnu-high-s4-lower-assessment-midterm-integrated-s4-lower",
      "bnu-high-s4-lower-assessment-final-integrated-s4-lower"
    ]
  );
});

test("BNU high S5 assessment-pattern chapter queries retrieve focused cards", () => {
  const queries = [
    { chapter: "直线与圆", conceptIds: ["line-equations"], difficultyBand: "core" as const, expected: "bnu-high-s5-assessment-lines-circles-unit-core" },
    { chapter: "圆锥曲线", conceptIds: ["line-conic-intersection"], difficultyBand: "challenge" as const, expected: "bnu-high-s5-assessment-conics-unit-synthesis" },
    { chapter: "空间向量", conceptIds: ["space-vectors"], difficultyBand: "core" as const, expected: "bnu-high-s5-assessment-space-vectors-unit-core" },
    { chapter: "计数原理", conceptIds: ["counting-principles"], difficultyBand: "core" as const, expected: "bnu-high-s5-assessment-counting-unit-core" },
    { chapter: "概率", conceptIds: ["sample-space"], difficultyBand: "core" as const, expected: "bnu-high-s5-assessment-probability-unit-core" },
    { chapter: "统计案例", conceptIds: ["statistical-case-study"], difficultyBand: "core" as const, expected: "bnu-high-s5-assessment-statistics-case-unit" }
  ];

  for (const query of queries) {
    const cards = getMainlandBnuHighAssessmentPatternCards({
      grade: "S5",
      semester: "full-year",
      chapter: query.chapter,
      conceptIds: query.conceptIds,
      assessmentFamily: "unit-test",
      intent: "assessment-design",
      difficultyBand: query.difficultyBand,
      limit: 4
    });

    assert.ok(cards.length > 0, `Expected BNU high S5 card for ${query.chapter}`);
    assert.equal(cards[0]?.id, query.expected);
    assert.ok(cards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.ok(cards.every((card) => card.grades.includes("S5")));
    assert.ok(cards.every((card) => card.semesters.includes("full-year")));
    assert.ok(cards.every((card) => card.volumeScope === "selective-compulsory-1"));
  }
});

test("BNU high S5 special-topic and term assessment queries retrieve review cards", () => {
  const permutationCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S5",
    unitTitle: "排列组合",
    conceptIds: ["permutations-combinations"],
    assessmentFamily: "topic-review",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(permutationCards[0]?.id, "bnu-high-s5-assessment-permutation-combination-topic-review");

  const binomialCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S5",
    unitTitle: "二项式定理",
    conceptIds: ["binomial-theorem"],
    assessmentFamily: "topic-review",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(binomialCards[0]?.id, "bnu-high-s5-assessment-binomial-theorem-topic-review");

  const midtermCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S5",
    unitTitle: "期中",
    assessmentFamily: "midterm",
    materialKind: "midterm-final",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(midtermCards[0]?.id, "bnu-high-s5-assessment-midterm-integrated");

  const finalCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S5",
    unitTitle: "期末",
    assessmentFamily: "final",
    materialKind: "midterm-final",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(finalCards[0]?.id, "bnu-high-s5-assessment-final-integrated");
});

test("BNU high S5 assessment-pattern retrieval treats semesters as full-year evidence", () => {
  const baseQuery = {
    grade: "S5" as const,
    chapter: "圆锥曲线",
    conceptIds: ["line-conic-intersection"],
    assessmentFamily: "unit-test" as const,
    difficultyBand: "challenge" as const,
    intent: "assessment-design" as const,
    limit: 4
  };
  const upperIds = getMainlandBnuHighAssessmentPatternCards({ ...baseQuery, semester: "upper" }).map((card) => card.id);
  const lowerIds = getMainlandBnuHighAssessmentPatternCards({ ...baseQuery, semester: "lower" }).map((card) => card.id);
  const fullYearIds = getMainlandBnuHighAssessmentPatternCards({ ...baseQuery, semester: "full-year" }).map((card) => card.id);

  assert.deepEqual(upperIds, lowerIds);
  assert.deepEqual(lowerIds, fullYearIds);
  assert.ok(fullYearIds.includes("bnu-high-s5-assessment-conics-unit-synthesis"));

  const s4Cards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    chapter: "圆锥曲线",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(s4Cards.length, 0);
});

test("BNU high S5 assessment evidence pack includes coverage gap and reuse restrictions", () => {
  const pack = buildMainlandBnuHighAssessmentPatternEvidencePack({
    grade: "S5",
    semester: "upper",
    chapter: "计数原理",
    conceptIds: ["binomial-theorem"],
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(pack.curriculumTrack, "MAINLAND_PEP_HIGH");
  assert.equal(pack.publisher, "MAINLAND_BNU");
  assert.ok(pack.cards.some((card) => card.id === "bnu-high-s5-assessment-binomial-theorem-topic-review"));
  assert.deepEqual(pack.coverageGaps, mainlandBnuHighAssessmentCoverageGaps);
  assert.match(pack.evidenceText, /Do not quote, paraphrase, translate, reconstruct/);
  assert.match(pack.evidenceText, /full-year rather than upper\/lower split/);
  assert.match(pack.evidenceText, /Coverage gap:/);
});

test("BNU high S4 lower assessment evidence pack includes chapter 3 gap and reuse restrictions", () => {
  const pack = buildMainlandBnuHighAssessmentPatternEvidencePack({
    grade: "S4",
    semester: "lower",
    chapter: "三角函数",
    conceptIds: ["trigonometric-functions"],
    intent: "exam-practice",
    limit: 5
  });

  assert.equal(pack.curriculumTrack, "MAINLAND_PEP_HIGH");
  assert.equal(pack.publisher, "MAINLAND_BNU");
  assert.ok(pack.cards.some((card) => card.id === "bnu-high-s4-lower-assessment-unit-trigonometric-functions"));
  assert.ok(pack.coverageGaps.some((gap) => /chapter 3/.test(gap)));
  assert.match(pack.evidenceText, /Do not quote, paraphrase, translate, reconstruct/);
  assert.match(pack.evidenceText, /Coverage gap:/);
  assert.doesNotMatch(pack.evidenceText, /Shared Mainland senior-secondary exam-pattern layer/);
});

test("BNU high assessment safe cards and evidence avoid source-material artifacts", () => {
  const forbiddenPatterns = [
    /\.docx/i,
    /\.zip/i,
    /原卷版/i,
    /解析版/i,
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /题号/i,
    /答案为/i
  ];
  const cardText = JSON.stringify(mainlandBnuHighAssessmentPatternCards);
  const evidence = buildMainlandBnuHighAssessmentPatternEvidencePack({
    grade: "S4",
    semester: "lower",
    unitTitle: "期末",
    intent: "exam-practice",
    limit: 3
  }).evidenceText;

  assert.ok(mainlandBnuHighAssessmentPatternCards.length >= 46);
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  mainlandBnuHighAssessmentPatternCards.forEach((card) => {
    assert.ok(card.prohibitedReuseNotes.some((note) => /Do not/.test(note)));
  });
});
