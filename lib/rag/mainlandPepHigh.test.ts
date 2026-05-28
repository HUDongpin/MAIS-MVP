import assert from "node:assert/strict";
import test from "node:test";
import { mainlandPepHighExamPatternCards } from "../../data/rag/mainlandPepHighExamPatterns";
import { mainlandPepHighRagCards } from "../../data/rag/mainlandPepHigh";
import { buildMainlandPepHighEvidencePack, getMainlandPepHighRagCards } from "./mainlandPepHigh";
import {
  buildMainlandPepHighExamGenerationEvidencePack,
  getMainlandPepHighExamPatternCards,
  getMainlandPepSecondaryExamPatternCards
} from "./mainlandPepHighExamPatterns";

test("derivative application queries return derivative cards first", () => {
  const cards = getMainlandPepHighRagCards({
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 3
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "pep-high-derivatives-applications");
  assert.ok(cards.every((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH"));
});

test("trigonometric graph queries do not retrieve probability or geometry chapters", () => {
  const cards = getMainlandPepHighRagCards({
    chapter: "三角函数",
    conceptIds: ["trigonometric-graphs"],
    intent: "generate-question",
    limit: 5
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "pep-high-trigonometric-functions");
  assert.ok(cards.every((card) => !["概率", "立体几何初步", "空间向量与立体几何"].includes(card.chapter)));
});

test("expanded archive-derived curriculum queries retrieve focused safe cards", () => {
  const inequality = getMainlandPepHighRagCards({
    conceptIds: ["basic-inequality", "optimization"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(inequality[0]?.id, "pep-high-basic-inequality-optimization");

  const triangle = getMainlandPepHighRagCards({
    chapter: "解三角形",
    conceptIds: ["sine-theorem", "cosine-theorem"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(triangle[0]?.id, "pep-high-sine-cosine-theorems");

  const conditional = getMainlandPepHighRagCards({
    conceptIds: ["conditional-probability", "hypergeometric-distribution"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(conditional[0]?.id, "pep-high-conditional-probability-distributions");
});

test("narrow curriculum RAG queries filter low-relevance tail cards", () => {
  const derivativeCards = getMainlandPepHighRagCards({
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 12
  });
  assert.ok(derivativeCards.length > 0);
  assert.ok(derivativeCards.length < 12);
  assert.ok(derivativeCards.every((card) => card.conceptIds.some((conceptId) => ["derivatives", "optimization"].includes(conceptId))));

  const trigCards = getMainlandPepHighRagCards({
    chapter: "三角函数",
    conceptIds: ["trigonometric-graphs"],
    intent: "generate-question",
    limit: 12
  });
  assert.ok(trigCards.length > 0);
  assert.ok(trigCards.length < 12);
  assert.ok(trigCards.every((card) => card.chapter.includes("三角") || card.conceptIds.includes("trigonometric-graphs")));
});

test("exam difficulty query prioritizes exam-oriented cards", () => {
  const cards = getMainlandPepHighRagCards({
    intent: "exam-practice",
    difficultyBand: "exam",
    limit: 6
  });

  assert.equal(cards.length, 6);
  assert.ok(cards.every((card) => card.difficultyBand === "exam"));
});

test("safe cards and evidence pack avoid source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    new RegExp(joined("高考", "真题")),
    new RegExp(joined("官方", "解析")),
    new RegExp(joined("原", "文")),
    new RegExp(joined("截", "图")),
    new RegExp(joined("见", "图"))
  ];
  const cardText = JSON.stringify([...mainlandPepHighRagCards, ...mainlandPepHighExamPatternCards]);
  const evidence = buildMainlandPepHighEvidencePack({
    conceptIds: ["derivatives"],
    intent: "generate-lesson",
    limit: 2
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  [...mainlandPepHighRagCards, ...mainlandPepHighExamPatternCards].forEach((card) => {
    assert.ok(card.prohibitedReuseNotes.some((note) => /Do not/.test(note)));
  });
  assert.equal(mainlandPepHighRagCards.length, 28);
});

test("derivative exam-pattern query returns derivative strategy and excludes unrelated families", () => {
  const cards = getMainlandPepHighExamPatternCards({
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "pep-high-exam-derivatives-optimization");
  assert.ok(cards.every((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.ok(cards.every((card) => !["概率", "空间向量与立体几何"].includes(card.chapter)));
});

test("trigonometric exam-pattern query avoids statistics cards", () => {
  const cards = getMainlandPepHighExamPatternCards({
    conceptIds: ["trigonometric-graphs"],
    chapter: "三角函数",
    intent: "generate-question",
    limit: 5
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "pep-high-exam-trigonometric-graphs");
  assert.ok(cards.every((card) => !["统计", "成对数据的统计分析"].includes(card.chapter)));
});

test("expanded exam-pattern queries retrieve archive abstraction cards", () => {
  const derivative = getMainlandPepHighExamPatternCards({
    conceptIds: ["tangent-line", "implicit-zero", "function-inequalities"],
    intent: "exam-practice",
    limit: 3
  });
  assert.equal(derivative[0]?.id, "pep-high-exam-derivative-tangent-inequality");

  const counting = getMainlandPepHighExamPatternCards({
    conceptIds: ["permutations-combinations", "case-analysis"],
    intent: "generate-question",
    limit: 3
  });
  assert.equal(counting[0]?.id, "pep-high-exam-counting-method-taxonomy");

  const regression = getMainlandPepHighExamPatternCards({
    conceptIds: ["linear-regression", "independence-test"],
    intent: "diagnose-mistake",
    difficultyBand: "exam",
    limit: 3
  });
  assert.equal(regression[0]?.id, "pep-high-exam-regression-independence");
});

test("narrow exam-pattern RAG queries filter low-relevance tail cards", () => {
  const conics = getMainlandPepHighExamPatternCards({
    conceptIds: ["parabola-conic", "line-conic-intersection"],
    chapter: "圆锥曲线",
    intent: "exam-practice",
    limit: 12
  });
  assert.ok(conics.length > 0);
  assert.ok(conics.length < 12);
  assert.ok(conics.every((card) => card.chapter.includes("圆锥") || card.conceptIds.includes("parabola-conic")));

  const vectors = getMainlandPepHighExamPatternCards({
    conceptIds: ["space-vectors"],
    chapter: "空间向量",
    intent: "exam-practice",
    limit: 12
  });
  assert.ok(vectors.length > 0);
  assert.ok(vectors.length < 12);
  assert.ok(vectors.every((card) => card.chapter.includes("空间向量") || card.conceptIds.includes("space-vectors")));
});

test("exam family filter affects ranking without crossing curriculum track", () => {
  const cards = getMainlandPepHighExamPatternCards({
    examFamily: "全国Ⅰ卷",
    intent: "exam-practice",
    limit: 6
  });

  assert.equal(cards.length, 6);
  assert.ok(cards.every((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.ok(cards.some((card) => card.examFamilies.includes("全国Ⅰ卷")));
});

test("secondary exam-pattern metadata filters S4-S6 grade and semester aggregations", () => {
  const s4UpperCards = getMainlandPepSecondaryExamPatternCards({
    grade: "S4",
    semester: "upper",
    conceptIds: ["trigonometric-graphs"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(s4UpperCards[0]?.id, "pep-high-exam-trigonometric-graphs");
  assert.ok(s4UpperCards.every((card) => card.publisher === "MAINLAND_PEP"));
  assert.ok(s4UpperCards.every((card) => card.stage === "senior-secondary"));
  assert.ok(s4UpperCards.every((card) => card.legacyCurriculumTrack === "MAINLAND_PEP_HIGH"));
  assert.ok(s4UpperCards.every((card) => card.grades.includes("S4")));
  assert.ok(s4UpperCards.every((card) => card.semesters.includes("upper")));

  const s5UpperCards = getMainlandPepSecondaryExamPatternCards({
    grade: "S5",
    semester: "upper",
    conceptIds: ["space-vectors", "parabola-conic"],
    intent: "exam-practice",
    limit: 4
  });
  assert.ok(s5UpperCards.some((card) => card.id === "pep-high-exam-space-vectors-geometry"));
  assert.ok(s5UpperCards.some((card) => card.id === "pep-high-exam-conics-analytic-geometry"));
  assert.ok(s5UpperCards.every((card) => card.grades.includes("S5")));

  const s6FullYearCards = getMainlandPepSecondaryExamPatternCards({
    grade: "S6",
    semester: "full-year",
    conceptIds: ["derivatives", "linear-regression"],
    intent: "diagnose-mistake",
    limit: 6
  });
  assert.ok(s6FullYearCards.some((card) => card.id === "pep-high-exam-derivatives-optimization"));
  assert.ok(s6FullYearCards.some((card) => card.id === "pep-high-exam-regression-independence"));
  assert.ok(s6FullYearCards.every((card) => card.grades.includes("S6")));
  assert.ok(s6FullYearCards.every((card) => card.semesters.includes("full-year")));
});

test("combined generation pack retrieves curriculum before exam-pattern guidance", () => {
  const pack = buildMainlandPepHighExamGenerationEvidencePack({
    conceptIds: ["derivatives"],
    intent: "exam-practice",
    limit: 3
  });

  assert.equal(pack.curriculumTrack, "MAINLAND_PEP_HIGH");
  assert.ok(pack.curriculumCards.length > 0);
  assert.ok(pack.examPatternCards.length > 0);
  assert.match(pack.evidenceText, /Curriculum layer:/);
  assert.match(pack.evidenceText, /Exam-pattern layer:/);
  assert.equal(mainlandPepHighExamPatternCards.length, 19);
});
