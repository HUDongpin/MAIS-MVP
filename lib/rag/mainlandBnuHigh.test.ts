import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mainlandBnuHighCoverageGaps, mainlandBnuHighRagCards } from "../../data/rag/mainlandBnuHigh";
import {
  mainlandBnuHighAssessmentCoverageGaps,
  mainlandBnuHighAssessmentPatternCards
} from "../../data/rag/mainlandBnuHighAssessmentPatterns";
import { getMainlandHjbHighRagCards } from "./mainlandHjbHigh";
import { getMainlandPepHighRagCards } from "./mainlandPepHigh";
import { getMainlandBnuHighAssessmentPatternCards } from "./mainlandBnuHighAssessmentPatterns";
import { buildMainlandBnuHighEvidencePack, getMainlandBnuHighRagCards, isMainlandBnuHighGrade } from "./mainlandBnuHigh";

test("BNU high-school safe cards cover the four owner-provided volumes", () => {
  const countsByVolume = mainlandBnuHighRagCards.reduce((counts, card) => {
    counts.set(card.volume, (counts.get(card.volume) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  assert.equal(mainlandBnuHighRagCards.length, 23);
  assert.equal(countsByVolume.get("必修 第一册"), 8);
  assert.equal(countsByVolume.get("必修 第二册"), 6);
  assert.equal(countsByVolume.get("选择性必修 第一册"), 7);
  assert.equal(countsByVolume.get("选择性必修 第二册"), 2);
  assert.ok(mainlandBnuHighRagCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(mainlandBnuHighRagCards.every((card) => card.stage === "senior-secondary"));
  assert.ok(mainlandBnuHighRagCards.every((card) => card.sourceKind === "safe-abstraction"));
  assert.ok(mainlandBnuHighCoverageGaps.length > 0);
});

test("BNU high-school queries retrieve focused safe cards", () => {
  const derivativeCards = getMainlandBnuHighRagCards({
    grade: "S6",
    semester: "upper",
    chapter: "导数及其应用",
    conceptIds: ["derivatives", "optimization"],
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(derivativeCards[0]?.id, "bnu-high-s6-selective-2-derivatives");
  assert.ok(derivativeCards.every((card) => card.publisher === "MAINLAND_BNU"));

  const trigCards = getMainlandBnuHighRagCards({
    grade: "S4",
    semester: "lower",
    chapter: "三角函数",
    conceptIds: ["trigonometric-graphs"],
    intent: "generate-question",
    limit: 4
  });
  assert.equal(trigCards[0]?.id, "bnu-high-s4-lower-trigonometric-functions");
  assert.ok(trigCards.every((card) => card.volume === "必修 第二册"));

  const statisticsCards = getMainlandBnuHighRagCards({
    grade: "S4",
    semester: "upper",
    conceptIds: ["sampling", "frequency-distribution"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(statisticsCards[0]?.id, "bnu-high-s4-upper-statistics");
});

test("BNU high-school retrieval stays isolated from PEP and HJB high-school layers", () => {
  const bnuCards = getMainlandBnuHighRagCards({
    grade: "S5",
    chapter: "圆锥曲线",
    conceptIds: ["ellipse", "line-conic-intersection"],
    intent: "exam-practice",
    limit: 4
  });
  const hjbCards = getMainlandHjbHighRagCards({
    grade: "S5",
    chapter: "圆锥曲线",
    conceptIds: ["ellipse", "line-conic-intersection"],
    intent: "exam-practice",
    limit: 4
  });
  const pepCards = getMainlandPepHighRagCards({
    chapter: "圆锥曲线",
    conceptIds: ["ellipse", "line-conic-intersection"],
    intent: "exam-practice",
    limit: 4
  });

  assert.equal(bnuCards[0]?.id, "bnu-high-s5-selective-1-conics");
  assert.ok(bnuCards.every((card) => card.publisher === "MAINLAND_BNU"));
  assert.ok(hjbCards.every((card) => card.publisher === "MAINLAND_HJB"));
  assert.ok(pepCards.every((card) => card.id.startsWith("pep-high-")));
  assert.ok(isMainlandBnuHighGrade("S4"));
  assert.ok(!isMainlandBnuHighGrade("S3"));
});

test("BNU high-school assessment pattern queries retrieve publisher-specific cards", () => {
  const trigUnitCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    semester: "lower",
    chapter: "三角函数",
    conceptIds: ["trigonometric-graphs"],
    assessmentFamily: "unit-test",
    intent: "assessment-design",
    limit: 4
  });
  assert.equal(trigUnitCards[0]?.id, "bnu-high-s4-lower-assessment-unit-trigonometric-functions");
  assert.ok(trigUnitCards.every((card) => card.publisher === "MAINLAND_BNU"));

  const finalCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S4",
    semester: "lower",
    unitTitle: "期末",
    assessmentFamily: "final",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(finalCards[0]?.id, "bnu-high-s4-lower-assessment-final-integrated-s4-lower");
  assert.ok(finalCards.every((card) => card.publisher === "MAINLAND_BNU"));

  const conicCards = getMainlandBnuHighAssessmentPatternCards({
    grade: "S5",
    chapter: "圆锥曲线",
    conceptIds: ["line-conic-intersection"],
    assessmentFamily: "unit-test",
    difficultyBand: "challenge",
    intent: "exam-practice",
    limit: 4
  });
  assert.equal(conicCards[0]?.id, "bnu-high-s5-assessment-conics-unit-synthesis");
  assert.ok(conicCards.every((card) => card.publisher === "MAINLAND_BNU"));

  assert.ok(mainlandBnuHighAssessmentPatternCards.length >= 46);
  assert.ok(mainlandBnuHighAssessmentCoverageGaps.length > 0);
});

test("BNU high-school evidence pack gates assessment layers by intent", () => {
  const tutorPack = buildMainlandBnuHighEvidencePack({
    grade: "S6",
    conceptIds: ["derivatives", "optimization"],
    intent: "tutor-explain",
    limit: 4
  });
  assert.equal(tutorPack.publisher, "MAINLAND_BNU");
  assert.equal(tutorPack.assessmentPatternCards.length, 0);
  assert.equal(tutorPack.examPatternCards.length, 0);
  assert.match(tutorPack.evidenceText, /BNU high-school textbook layer/);
  assert.doesNotMatch(tutorPack.evidenceText, /BNU high assessment-pattern layer/);
  assert.doesNotMatch(tutorPack.evidenceText, /Shared Mainland senior-secondary exam-pattern layer/);

  const examPack = buildMainlandBnuHighEvidencePack({
    grade: "S4",
    semester: "lower",
    conceptIds: ["trigonometric-functions", "trigonometric-graphs"],
    chapter: "三角函数",
    intent: "exam-practice",
    limit: 5
  });
  assert.ok(examPack.cards.some((card) => card.id === "bnu-high-s4-lower-trigonometric-functions"));
  assert.ok(examPack.assessmentPatternCards.some((card) => card.id === "bnu-high-s4-lower-assessment-unit-trigonometric-functions"));
  assert.equal(examPack.examPatternCards.length, 0);
  assert.match(examPack.evidenceText, /Layer 2 is BNU senior-secondary assessment-pattern guidance/);
  assert.match(examPack.evidenceText, /No shared PEP or HJB exam-pattern cards are injected/);
  assert.match(examPack.evidenceText, /chapter 3/);
  assert.doesNotMatch(examPack.evidenceText, /Shared Mainland senior-secondary exam-pattern layer/);
});

test("BNU high-school assessment layer is enabled only for assessment-like intents", () => {
  const baseQuery = {
    grade: "S4" as const,
    semester: "upper" as const,
    chapter: "函数",
    conceptIds: ["function-definition", "monotonicity"],
    limit: 4
  };
  const assessmentLikeIntents = ["exam-practice", "assessment-design", "generate-question", "diagnose-mistake"] as const;
  const nonAssessmentIntents = ["tutor-explain", "generate-lesson"] as const;

  for (const intent of assessmentLikeIntents) {
    const pack = buildMainlandBnuHighEvidencePack({ ...baseQuery, intent });
    assert.ok(pack.assessmentPatternCards.length > 0, `Expected BNU assessment layer for ${intent}`);
    assert.ok(pack.assessmentPatternCards.every((card) => card.publisher === "MAINLAND_BNU"));
    assert.equal(pack.examPatternCards.length, 0);
  }

  for (const intent of nonAssessmentIntents) {
    const pack = buildMainlandBnuHighEvidencePack({ ...baseQuery, intent });
    assert.equal(pack.assessmentPatternCards.length, 0);
    assert.equal(pack.examPatternCards.length, 0);
  }
});

test("AI Tutor route checks BNU high evidence before PEP or HJB fallback", () => {
  const routeSource = readFileSync("app/api/ai-tutor/route.ts", "utf-8");
  const bnuBranchIndex = routeSource.indexOf('curriculumProfile?.publisher === "MAINLAND_BNU"');
  const hjbBranchIndex = routeSource.indexOf('curriculumProfile?.publisher === "MAINLAND_HJB"');
  const pepFallbackIndex = routeSource.lastIndexOf("getMainlandPepEvidencePack");

  assert.ok(bnuBranchIndex > 0);
  assert.ok(hjbBranchIndex > bnuBranchIndex);
  assert.ok(pepFallbackIndex > bnuBranchIndex);
  assert.match(routeSource, /buildMainlandBnuHighEvidencePack/);
  assert.match(routeSource, /isMainlandBnuHighGrade/);
});

test("BNU high-school safe cards and evidence avoid source-material artifacts", () => {
  const forbiddenPatterns = [
    /\.docx/i,
    /\.pptx/i,
    /\.pdf/i,
    /\.zip/i,
    /\/Users\//i,
    /Downloads/i,
    /第\s*\d+\s*页/i,
    /p\.\s*\d+/i,
    /原卷版/i,
    /解析版/i,
    /原题/i,
    /原文/i,
    /答案/i,
    /OCR/i,
    /source\s*path/i,
    /sourceArchive/i,
    /sourceMember/i,
    /source\s*locator/i,
    /source\s*file/i,
    /hash/i,
    /embedding/i,
    /vector\s*payload/i,
    /扫描页/i,
    /截图/i
  ];
  const cardText = JSON.stringify([mainlandBnuHighRagCards, mainlandBnuHighAssessmentPatternCards, mainlandBnuHighCoverageGaps]);
  const evidence = buildMainlandBnuHighEvidencePack({
    grade: "S4",
    semester: "upper",
    conceptIds: ["statistics", "probability-foundations"],
    intent: "exam-practice",
    limit: 5
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }

  assert.match(evidence, /Do not quote or reconstruct/);
  assert.match(evidence, /Keep Beijing Normal University Press, PEP, and HJB publisher layers separate/);
});
