import assert from "node:assert/strict";
import test from "node:test";
import {
  hongKongEasePracticeQuestionGenerationMetadata,
  hongKongEasePracticeQuestions
} from "../data/hongKongEasePracticeQuestions";
import { mainlandPepPrimaryRagV1Questions } from "../data/mainlandPepPrimaryQuestions";
import { mainlandPepJuniorQuestions } from "../data/mainlandPepJuniorQuestions";
import { mainlandPepHighQuestions } from "../data/mainlandPepHighQuestions";
import { mainlandBnuPrimaryQuestions } from "../data/mainlandBnuPrimaryQuestions";
import { mainlandBnuJuniorQuestions } from "../data/mainlandBnuJuniorQuestions";
import { mainlandBnuHighQuestions } from "../data/mainlandBnuHighQuestions";
import { mainlandHjbPrimaryQuestions } from "../data/mainlandHjbPrimaryQuestions";
import { mainlandHjbJuniorQuestions } from "../data/mainlandHjbJuniorQuestions";
import { mainlandHjbHighQuestions } from "../data/mainlandHjbHighQuestions";
import { contentMatchesCurriculumProfile } from "./curriculumProfile";
import {
  explicitQuantityAnswerDimensions,
  explicitQuantityAnswerScalars,
  explicitQuantityAnswersEquivalent,
  normalizeAnswer,
  parseScalarAnswer,
  questionAnswerMatches
} from "./server/answerMatching";
import type { Question } from "../types";
import {
  buildFullQuestionBankSolvabilityAudit,
  expectedHkBaseQuestionCount,
  buildMainlandPepFullQuestionBankQaReport,
  expectedFullQuestionBankCount,
  expectedHongKongEasePracticeQuestionCount,
  expectedHkQuestionCount,
  expectedMainlandPepJuniorQuestionCount,
  expectedMainlandPepFullQuestionBankCount,
  expectedMainlandPepPrimaryQuestionCount,
  expectedMainlandPepHighQuestionCount,
  expectedMainlandBnuHighQuestionCount,
  expectedMainlandBnuPrimaryQuestionCount,
  expectedMainlandBnuJuniorQuestionCount,
  expectedMainlandHjbJuniorQuestionCount,
  expectedMainlandHjbPrimaryQuestionCount,
  expectedMainlandHjbHighQuestionCount,
  expectedUnitedStatesCaliforniaG6G12QuestionCount,
  expectedUnitedStatesCaliforniaK5QuestionCount,
  expectedUnitedStatesCaliforniaQuestionCount,
  expectedUnitedStatesNorthCarolinaQuestionCount,
  expectedUnitedStatesArkansasG6G12QuestionCount,
  expectedUnitedStatesArkansasK5QuestionCount,
  expectedUnitedStatesArkansasQuestionCount,
  expectedUnitedStatesFloridaMiddleSchoolQuestionCount
} from "./questionBankSolvability";

test("full question bank is independently solvable and answer-key matched", () => {
  const report = buildFullQuestionBankSolvabilityAudit("2026-05-22");

  assert.equal(report.summary.totalQuestions, expectedFullQuestionBankCount);
  assert.equal(report.summary.hkQuestions, expectedHkQuestionCount);
  assert.equal(report.summary.mainlandPepPrimaryQuestions, expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.mainlandPepJuniorQuestions, expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.mainlandPepHighQuestions, expectedMainlandPepHighQuestionCount);
  assert.equal(report.summary.mainlandBnuPrimaryQuestions, expectedMainlandBnuPrimaryQuestionCount);
  assert.equal(report.summary.mainlandBnuJuniorQuestions, expectedMainlandBnuJuniorQuestionCount);
  assert.equal(report.summary.mainlandBnuHighQuestions, expectedMainlandBnuHighQuestionCount);
  assert.equal(report.summary.mainlandHjbJuniorQuestions, expectedMainlandHjbJuniorQuestionCount);
  assert.equal(report.summary.mainlandHjbPrimaryQuestions, expectedMainlandHjbPrimaryQuestionCount);
  assert.equal(report.summary.mainlandHjbHighQuestions, expectedMainlandHjbHighQuestionCount);
  assert.equal(report.summary.unitedStatesCaliforniaQuestions, expectedUnitedStatesCaliforniaQuestionCount);
  assert.equal(report.summary.unitedStatesNorthCarolinaQuestions, expectedUnitedStatesNorthCarolinaQuestionCount);
  assert.equal(report.summary.unitedStatesArkansasQuestions, expectedUnitedStatesArkansasQuestionCount);
  assert.equal(report.summary.unitedStatesFloridaMiddleSchoolQuestions, expectedUnitedStatesFloridaMiddleSchoolQuestionCount);
  assert.equal(report.summary.batchCounts.hk, expectedHkBaseQuestionCount);
  assert.equal(report.summary.batchCounts["hk-ease-practice-v1"], expectedHongKongEasePracticeQuestionCount);
  assert.equal(report.summary.batchCounts["primary-rag-v1"], expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.batchCounts["junior-rag-v2-1200"], expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["seed-v1"], 900);
  assert.equal(report.summary.batchCounts["rag-v2"], 900);
  assert.equal(report.summary.batchCounts["rag-v3"], 1500);
  assert.equal(report.summary.batchCounts["rag-v4"], 1500);
  assert.equal(report.summary.batchCounts["bnu-primary-v1"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["bnu-primary-v2"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["bnu-junior-v1-1500"] ?? 0, expectedMainlandBnuJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["bnu-high-v1-approved"] ?? 0, expectedMainlandBnuHighQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-junior-v2-1500"] ?? 0, expectedMainlandHjbJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-primary-v1"] ?? 0, expectedMainlandHjbPrimaryQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-v1"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["hjb-v2"] ?? 0, expectedMainlandHjbHighQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-v3-remediated"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["hjb-v4-remediated"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-ca-k5-knowledge-point-practice-v1"] ?? 0, expectedUnitedStatesCaliforniaK5QuestionCount);
  assert.equal(report.summary.batchCounts["us-ca-k-g5-v3-deepseek"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-ca-g6-g12-v2"] ?? 0, expectedUnitedStatesCaliforniaG6G12QuestionCount);
  assert.equal(report.summary.batchCounts["us-ca-live-v1"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-nc-live-v1"] ?? 0, expectedUnitedStatesNorthCarolinaQuestionCount);
  assert.equal(report.summary.batchCounts["us-ar-k-g5-v1"] ?? 0, expectedUnitedStatesArkansasK5QuestionCount);
  assert.equal(report.summary.batchCounts["us-ar-g6-g12-v1"] ?? 0, expectedUnitedStatesArkansasG6G12QuestionCount);
  assert.equal(report.summary.batchCounts["us-fl-ms-v1"] ?? 0, expectedUnitedStatesFloridaMiddleSchoolQuestionCount);
  assert.equal(report.rows.length, expectedFullQuestionBankCount);
  assert.equal(report.summary.passRows, expectedFullQuestionBankCount);
  assert.equal(report.summary.failingRows, 0);
  assert.deepEqual(report.failingRows, []);
});

test("Hong Kong EASE Practice V1 exposes only S18 green text-only questions across HK publishers", () => {
  assert.equal(hongKongEasePracticeQuestions.length, expectedHongKongEasePracticeQuestionCount);
  assert.equal(Object.keys(hongKongEasePracticeQuestionGenerationMetadata).length, expectedHongKongEasePracticeQuestionCount);

  const ids = new Set(hongKongEasePracticeQuestions.map((question) => question.id));
  assert.equal(ids.size, hongKongEasePracticeQuestions.length);

  for (const question of hongKongEasePracticeQuestions) {
    const metadata = hongKongEasePracticeQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} should have EASE QA metadata`);
    assert.equal(question.curriculumTrack, "HK");
    assert.equal(question.region, "HK");
    assert.equal(question.publisher, undefined);
    assert.equal(question.questionAssets, undefined);
    assert.equal(metadata.sourceDistanceStatus, "passed-s18-ease-text-only-source-scan");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.answerQaStatus, "pass");
    assert.equal(metadata.assetQaStatus, "text-only");
    assert.equal(metadata.manualQaStatus, "approved-text-only-green-batch");
    assert.ok(metadata.independentAnswer.trim());
    assert.ok(question.acceptedAnswers?.includes(metadata.independentAnswer) || question.answer === metadata.independentAnswer);
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }));
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_EPH_MIF" }));
  }
});

test("Mainland PEP full question bank emits row-level solvability and answer-key QA verdicts", () => {
  const report = buildMainlandPepFullQuestionBankQaReport("2026-05-24");

  assert.equal(report.summary.expectedQuestions, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.totalQuestions, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.primaryQuestions, expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.juniorQuestions, expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.highQuestions, expectedMainlandPepHighQuestionCount);
  assert.equal(report.rows.length, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.passRows, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.reviewRows, 0);
  assert.equal(report.summary.p0Rows, 0);
  assert.equal(report.summary.p1Rows, 0);
  assert.equal(report.summary.p2Rows, 0);
  assert.equal(report.summary.duplicateIdCount, 0);
  assert.equal(report.summary.inventoryIssueCount, 0);
  assert.equal(report.summary.sourceStatusCounts.pass, expectedMainlandPepFullQuestionBankCount);
  assert.deepEqual(report.summary.solvableStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.answerMatchStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.qaStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.batchCounts, {
    "primary-rag-v1": expectedMainlandPepPrimaryQuestionCount,
    "junior-rag-v2-1200": expectedMainlandPepJuniorQuestionCount,
    "seed-v1": 900,
    "rag-v2": 900,
    "rag-v3": 1500,
    "rag-v4": 1500
  });
  assert.ok(report.summary.manualReviewQueueRows > 0);
  assert.ok(report.rows.every((row) => row.independentAnswer.trim()), "every Mainland PEP QA row should include an independent answer");
  assert.ok(report.rows.every((row) => row.solvableStatus === "pass" && row.answerMatchStatus === "pass"));
});

type FrozenUnitFamily =
  | "angle"
  | "area"
  | "count"
  | "currency"
  | "length"
  | "mass"
  | "percentage"
  | "speed"
  | "temperature"
  | "time"
  | "volume";

function frozenCanonicalUnitFamily(value: string): FrozenUnitFamily | null {
  const normalized = value.normalize("NFKC").trim();
  if (!/\d/u.test(normalized)) return null;
  if (/(?:%|百分之)\s*$/u.test(normalized)) return "percentage";
  if (/(?:°|度)\s*$/u.test(normalized)) return "angle";
  if (/(?:℃|°c)\s*$/iu.test(normalized)) return "temperature";
  if (/(?:hk\$|\$|¥|￥)/iu.test(normalized) || /(?:元|角|分)\s*$/u.test(normalized)) return "currency";
  if (/(?:km\/h|kmh|公里\/小时|千米\/小时|公里每小时|千米每小时)\s*$/iu.test(normalized)) return "speed";
  if (/(?:cm\^?3|cm3|cm³|m\^?3|m3|m³|ml|mL|L|毫升|升|立方厘米|立方米)\s*$/u.test(normalized)) {
    return "volume";
  }
  if (/(?:cm\^?2|cm2|cm²|m\^?2|m2|m²|平方厘米|平方釐米|平方米)\s*$/u.test(normalized)) {
    return "area";
  }
  if (/(?:cm|km|mm|m|厘米|釐米|毫米|米|千米|公里)\s*$/iu.test(normalized)) return "length";
  if (/(?:kg|g|千克|公斤|克)\s*$/iu.test(normalized)) return "mass";
  if (/(?:min|minutes?|hours?|seconds?|days?|分钟|分鐘|小时|小時|秒|天)\s*$/iu.test(normalized)) return "time";
  if (/(?:books?|cards?|students?|buttons?|blocks?|counters?|cubes?|items?|pencils?|shells?|stickers?|tiles?|units?|sides?|本(?:书)?|個|个|支|张|張|辆|輛|人|名|票|册|冊|块|塊)\s*$/iu.test(normalized)) {
    return "count";
  }
  return null;
}

const frozenUnitMutationCandidates = (scalar: number) => [
  `${scalar} cm`,
  `${scalar} km`,
  `${scalar} cm^2`,
  `${scalar} cm^3`,
  `${scalar} mL`,
  `${scalar} L`,
  `${scalar}°`,
  `${scalar}%`,
  `${scalar} minutes`,
  `${scalar} cards`,
  `HK$${scalar}`
];

test("current Mainland non-MC canonical unit risk scope rejects every genuinely incompatible explicit-unit mutation", () => {
  const packs: Record<string, Question[]> = {
    pepPrimary: mainlandPepPrimaryRagV1Questions,
    pepJunior: mainlandPepJuniorQuestions,
    pepHigh: mainlandPepHighQuestions,
    bnuPrimary: mainlandBnuPrimaryQuestions,
    bnuJunior: mainlandBnuJuniorQuestions,
    bnuHigh: mainlandBnuHighQuestions,
    hjbPrimary: mainlandHjbPrimaryQuestions,
    hjbJunior: mainlandHjbJuniorQuestions,
    hjbHigh: mainlandHjbHighQuestions
  };
  const expectedPackCounts = {
    pepPrimary: 342,
    pepJunior: 313,
    pepHigh: 0,
    bnuPrimary: 161,
    bnuJunior: 133,
    bnuHigh: 3,
    hjbPrimary: 57,
    hjbJunior: 101,
    hjbHigh: 1
  };
  const expectedFamilyCounts: Record<FrozenUnitFamily, number> = {
    length: 439,
    angle: 235,
    area: 107,
    volume: 104,
    count: 79,
    temperature: 60,
    time: 38,
    currency: 19,
    percentage: 18,
    mass: 11,
    speed: 1
  };
  const packCounts = Object.fromEntries(Object.keys(packs).map((pack) => [pack, 0]));
  const familyCounts = Object.fromEntries(
    Object.keys(expectedFamilyCounts).map((family) => [family, 0])
  ) as Record<FrozenUnitFamily, number>;
  const incompatibleAccepted: Array<{ candidate: string; id: string }> = [];
  const correctConversionProbeHits: Array<{ candidate: string; id: string }> = [];
  let eligibleQuestions = 0;
  let frozenCandidateEvaluations = 0;
  let genuineIncompatibleEvaluations = 0;

  for (const [pack, questions] of Object.entries(packs)) {
    for (const question of questions) {
      if (question.type === "multiple-choice") continue;
      const canonicalFamily = frozenCanonicalUnitFamily(question.answer);
      if (!canonicalFamily) continue;

      const storedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];
      const storedFamilies = new Set(
        storedAnswers.map(frozenCanonicalUnitFamily).filter((family): family is FrozenUnitFamily => Boolean(family))
      );
      const scalars = Array.from(new Set(
        storedAnswers.map(parseScalarAnswer).filter((scalar): scalar is number => scalar !== null)
      ));
      if (!scalars.length) continue;

      eligibleQuestions += 1;
      packCounts[pack] += 1;
      familyCounts[canonicalFamily] += 1;
      let questionMutationCount = 0;

      for (const scalar of scalars) {
        for (const candidate of frozenUnitMutationCandidates(scalar)) {
          const candidateFamily = frozenCanonicalUnitFamily(candidate);
          if (!candidateFamily || storedFamilies.has(candidateFamily)) continue;
          frozenCandidateEvaluations += 1;

          // The frozen family lexicon deliberately remains unchanged for drift
          // detection, but it omits dm³. Production quantity semantics correctly
          // recognizes 160 dm³ = 160 L and 251.2 dm³ = 251.2 L, so those are
          // positive conversion controls rather than incompatible negatives.
          if (storedAnswers.some((answer) => explicitQuantityAnswersEquivalent(candidate, answer))) {
            correctConversionProbeHits.push({ candidate, id: question.id });
            continue;
          }

          questionMutationCount += 1;
          genuineIncompatibleEvaluations += 1;
          if (questionAnswerMatches({
            id: question.id,
            answer: question.answer,
            accepted_answers: question.acceptedAnswers ?? null,
            options: question.options ?? null
          }, candidate)) {
            incompatibleAccepted.push({ candidate, id: question.id });
          }
        }
      }

      assert.ok(questionMutationCount > 0, `${question.id} should receive an incompatible explicit-unit mutation`);
    }
  }

  // The historical 1,114-row artifact retained only aggregate counts and no
  // eligible-ID/accepted-answer manifest. Pin the reproducible current scope
  // without inventing a seven-row membership migration that cannot be proven.
  assert.equal(eligibleQuestions, 1_111);
  assert.deepEqual(packCounts, expectedPackCounts);
  assert.deepEqual(familyCounts, expectedFamilyCounts);
  assert.equal(frozenCandidateEvaluations, 10_668);
  assert.equal(genuineIncompatibleEvaluations, 10_666);
  assert.deepEqual(correctConversionProbeHits, [
    { id: "bnu-primary-ds-v2-p5-167", candidate: "160 L" },
    { id: "bnu-primary-ds-v2-p6-155", candidate: "251.2 L" }
  ]);
  assert.deepEqual(incompatibleAccepted, []);
});

const mainlandRuntimeQuestionPacks: Record<string, Question[]> = {
  pepPrimary: mainlandPepPrimaryRagV1Questions,
  pepJunior: mainlandPepJuniorQuestions,
  pepHigh: mainlandPepHighQuestions,
  bnuPrimary: mainlandBnuPrimaryQuestions,
  bnuJunior: mainlandBnuJuniorQuestions,
  bnuHigh: mainlandBnuHighQuestions,
  hjbPrimary: mainlandHjbPrimaryQuestions,
  hjbJunior: mainlandHjbJuniorQuestions,
  hjbHigh: mainlandHjbHighQuestions
};

function productionGradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("compound Mainland prompts reject answers that omit a requested part or reason", () => {
  const byId = new Map(
    Object.values(mainlandRuntimeQuestionPacks).flat().map((question) => [question.id, question])
  );
  const partialControls: Record<string, string[]> = {
    "bnu-primary-ds-v2-p4-171": ["等腰三角形"],
    "bnu-primary-ds-v2-p4-086": ["16包", "16"],
    "bnu-primary-ds-v1-p5-104": ["公平", "游戏公平"],
    "bnu-primary-ds-v1-p5-119": ["大船7条"],
    "bnu-junior-ds-v1-s1-002": ["长8 cm，宽3 cm"],
    "bnu-junior-ds-v1-s1-035": ["圆形"],
    "bnu-junior-ds-v1-s1-041": ["长方体和正方体"],
    "bnu-junior-ds-v1-s1-215": ["580人"],
    "bnu-junior-ds-v1-s1-422": ["x轴"],
    "bnu-junior-ds-v1-s2-389": ["3x^2y(2x - 3y + 1)"],
    "bnu-junior-ds-v1-s3-026": ["正方形"],
    "bnu-junior-ds-v1-s3-173": ["不相似"],
    "hjb-primary-ds-v1-p3-126": ["拆分法", "将238拆成200、30和8分别乘4再相加"],
    "hjb-primary-ds-v1-p4-057": ["小明拿的更多"],
    "hjb-primary-ds-v1-p4-125": ["4平方米", "方法合理，结果在3平方米到5平方米之间均可"],
    "hjb-junior-ds-v2-s1-324": ["65°"],
    "hjb-junior-ds-v2-s1-368": ["平行"],
    "hjb-junior-ds-v2-s3-072": ["不相似"]
  };

  assert.equal(Object.keys(partialControls).length, 18);
  Object.entries(partialControls).forEach(([id, partials]) => {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    const gradingQuestion = productionGradingQuestion(question);
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${id} complete canonical`);
    partials.forEach((partial) => {
      assert.equal(questionAnswerMatches(gradingQuestion, partial), false, `${id} partial: ${partial}`);
    });
  });
});

test("all 17,700 Mainland runtime canonicals and 24,771 stored aliases remain accepted", () => {
  const expectedAliasCounts = {
    pepPrimary: 1_453,
    pepJunior: 1_172,
    pepHigh: 1_212,
    bnuPrimary: 7_316,
    bnuJunior: 3_589,
    bnuHigh: 1_773,
    hjbPrimary: 3_539,
    hjbJunior: 2_979,
    hjbHigh: 1_738
  };
  const failures: Array<{ answer: string; id: string; kind: "canonical" | "alias" }> = [];
  const aliasCounts: Record<string, number> = {};
  let questionCount = 0;
  let aliasCount = 0;

  for (const [pack, questions] of Object.entries(mainlandRuntimeQuestionPacks)) {
    aliasCounts[pack] = 0;
    for (const question of questions) {
      questionCount += 1;
      const gradingQuestion = productionGradingQuestion(question);
      if (!questionAnswerMatches(gradingQuestion, question.answer)) {
        failures.push({ answer: question.answer, id: question.id, kind: "canonical" });
      }
      for (const alias of question.acceptedAnswers ?? []) {
        aliasCount += 1;
        aliasCounts[pack] += 1;
        if (!questionAnswerMatches(gradingQuestion, alias)) {
          failures.push({ answer: alias, id: question.id, kind: "alias" });
        }
      }
    }
  }

  assert.equal(questionCount, 17_700);
  const batch3AAliasCounts = Object.fromEntries(
    [
      "bnu-high-ds-v1-s4-434", "bnu-high-ds-v1-s4-435",
      "bnu-high-ds-v1-s4-469", "bnu-high-ds-v1-s4-470",
      "bnu-high-ds-v1-s4-327", "bnu-high-ds-v1-s4-329",
      "bnu-high-ds-v1-s4-289", "bnu-high-ds-v1-s4-295",
      "bnu-high-ds-v1-s4-397", "bnu-high-ds-v1-s4-398"
    ].map((id) => {
      const question = mainlandBnuHighQuestions.find((candidate) => candidate.id === id);
      assert.ok(question, `${id} Batch 3A alias inventory`);
      return [id, question.acceptedAnswers?.length ?? 0];
    })
  );
  assert.deepEqual(batch3AAliasCounts, {
    "bnu-high-ds-v1-s4-434": 4,
    "bnu-high-ds-v1-s4-435": 3,
    "bnu-high-ds-v1-s4-469": 6,
    "bnu-high-ds-v1-s4-470": 4,
    "bnu-high-ds-v1-s4-327": 4,
    "bnu-high-ds-v1-s4-329": 2,
    "bnu-high-ds-v1-s4-289": 4,
    "bnu-high-ds-v1-s4-295": 5,
    "bnu-high-ds-v1-s4-397": 4,
    "bnu-high-ds-v1-s4-398": 4
  });
  assert.equal(Object.values(batch3AAliasCounts).reduce((sum, count) => sum + count, 0), 40);
  assert.equal(24_685 - 10 + 40, 24_715, "ten prior one-alias generated rows are replaced by forty reviewed runtime aliases");
  const batch3BAliasCounts = Object.fromEntries(
    [
      "bnu-high-ds-v1-s5-288", "bnu-high-ds-v1-s5-294",
      "bnu-high-ds-v1-s5-145", "bnu-high-ds-v1-s5-149",
      "bnu-high-ds-v1-s6-002", "bnu-high-ds-v1-s6-006",
      "bnu-high-ds-v1-s5-009", "bnu-high-ds-v1-s6-455"
    ].map((id) => {
      const question = mainlandBnuHighQuestions.find((candidate) => candidate.id === id);
      assert.ok(question, `${id} Batch 3B alias inventory`);
      return [id, question.acceptedAnswers?.length ?? 0];
    })
  );
  assert.deepEqual(batch3BAliasCounts, {
    "bnu-high-ds-v1-s5-288": 5,
    "bnu-high-ds-v1-s5-294": 5,
    "bnu-high-ds-v1-s5-145": 5,
    "bnu-high-ds-v1-s5-149": 6,
    "bnu-high-ds-v1-s6-002": 4,
    "bnu-high-ds-v1-s6-006": 4,
    "bnu-high-ds-v1-s5-009": 4,
    "bnu-high-ds-v1-s6-455": 5
  });
  assert.equal(Object.values(batch3BAliasCounts).reduce((sum, count) => sum + count, 0), 38);
  assert.equal(24_715 - 8 + 38, 24_745, "eight prior one-alias generated rows are replaced by thirty-eight reviewed runtime aliases");
  const v18ProviderFollowupAliasCounts = Object.fromEntries(
    ["bnu-high-ds-v1-s4-077", "bnu-high-ds-v1-s4-361"].map((id) => {
      const question = mainlandBnuHighQuestions.find((candidate) => candidate.id === id);
      assert.ok(question, `${id} v18 provider follow-up alias inventory`);
      return [id, question.acceptedAnswers?.length ?? 0];
    })
  );
  assert.deepEqual(v18ProviderFollowupAliasCounts, {
    "bnu-high-ds-v1-s4-077": 5,
    "bnu-high-ds-v1-s4-361": 4
  });
  assert.equal(24_745 + 3, 24_748, "the s4-077 durable cleanup is inventory-neutral and s4-361 adds three correct kilometer forms");
  const englishReviewClosureAliasCounts = Object.fromEntries(
    ["bnu-high-ds-v1-s4-146", "bnu-high-ds-v1-s4-254", "bnu-high-ds-v1-s5-003", "bnu-high-ds-v1-s5-005", "bnu-high-ds-v1-s5-077", "bnu-high-ds-v1-s5-431"].map((id) => {
      const question = mainlandBnuHighQuestions.find((candidate) => candidate.id === id);
      assert.ok(question, `${id} English-review closure alias inventory`);
      return [id, question.acceptedAnswers?.length ?? 0];
    })
  );
  assert.deepEqual(englishReviewClosureAliasCounts, {
    "bnu-high-ds-v1-s4-146": 3,
    "bnu-high-ds-v1-s4-254": 11,
    "bnu-high-ds-v1-s5-003": 6,
    "bnu-high-ds-v1-s5-005": 8,
    "bnu-high-ds-v1-s5-077": 6,
    "bnu-high-ds-v1-s5-431": 6
  });
  assert.equal(24_748 + 2 - 1, 24_749, "the prior English-review closure adds two complete aliases and rejects one malformed alias");
  assert.equal(24_749 - 1 + 1, 24_749, "the corrected HJB s3-387 contract removes one obsolete branch alias while the provider-derived BNU s5-431 form adds one complete alias");
  assert.equal(24_749 + 2, 24_751, "the PEP primary remainder contracts add two complete English response forms");
  assert.equal(24_751 + 1, 24_752, "the BNU s4-146 fare contract adds the complete English unit form");
  assert.equal(24_752 + 2, 24_754, "the BNU s4-254 model-and-prediction contract adds two complete English volume forms");
  assert.equal(24_754 + 1, 24_755, "the BNU s5-003 vertical-line contract adds the complete compact English form");
  assert.equal(24_755 - 1 + 1, 24_755, "the BNU s5-005 contract replaces one malformed generated alias with the complete bilingual relationship form");
  assert.equal(24_755 + 16, 24_771, "BNU junior English review adds sixteen complete or equivalent response aliases without accepting incomplete or inconsistent forms");
  assert.equal(aliasCount, 24_771);
  assert.deepEqual(aliasCounts, expectedAliasCounts);
  assert.deepEqual(failures, []);
});

test("all 6,523 Mainland MC keys accept exactly one displayed option through production grading", () => {
  const expectedPackCounts = {
    pepPrimary: 450,
    pepJunior: 400,
    pepHigh: 1_620,
    bnuPrimary: 1_203,
    bnuJunior: 525,
    bnuHigh: 525,
    hjbPrimary: 600,
    hjbJunior: 600,
    hjbHigh: 600
  };
  const packCounts = Object.fromEntries(Object.keys(mainlandRuntimeQuestionPacks).map((pack) => [pack, 0]));
  const languageCounts = { en: 0, zh: 0, zhHans: 0 };
  const failures: Array<{ acceptedIndexes: number[]; id: string; language: "en" | "zh" | "zhHans" }> = [];
  let multipleChoiceCount = 0;
  let languageQuestionCount = 0;

  for (const [pack, questions] of Object.entries(mainlandRuntimeQuestionPacks)) {
    for (const question of questions) {
      if (question.type !== "multiple-choice") continue;
      multipleChoiceCount += 1;
      packCounts[pack] += 1;
      const gradingQuestion = productionGradingQuestion(question);
      for (const language of ["en", "zh", "zhHans"] as const) {
        languageQuestionCount += 1;
        languageCounts[language] += 1;
        const acceptedIndexes = (question.options ?? []).flatMap((option, index) => {
          const displayed = language === "zhHans" ? option.zhHans ?? option.zh : option[language];
          return questionAnswerMatches(gradingQuestion, displayed) ? [index] : [];
        });
        if (acceptedIndexes.length !== 1) failures.push({ acceptedIndexes, id: question.id, language });
      }
    }
  }

  assert.equal(multipleChoiceCount, 6_523);
  assert.equal(languageQuestionCount, 19_569);
  assert.deepEqual(languageCounts, { en: 6_523, zh: 6_523, zhHans: 6_523 });
  assert.deepEqual(packCounts, expectedPackCounts);
  assert.deepEqual(failures, []);
});

const semanticQuantityMutationCandidates = (scalar: number) => [
  `${scalar} mm`,
  `${scalar} cm`,
  `${scalar} km`,
  `${scalar} cm^2`,
  `${scalar} m^2`,
  `${scalar} cm^3`,
  `${scalar} mL`,
  `${scalar} L`,
  `${scalar} g`,
  `${scalar} kg`,
  `${scalar} seconds`,
  `${scalar} minutes`,
  `${scalar} hours`,
  `${scalar} days`,
  `${scalar}°`,
  `${scalar}%`,
  `HK$${scalar}`,
  `￥${scalar}`,
  `${scalar} cards`,
  `${scalar} books`,
  `${scalar} ℃`,
  `${scalar} km/h`
];

test("production quantity-contract scope rejects every incompatible or unequal explicit-unit mutation", () => {
  const expectedPackCounts = {
    pepPrimary: 434,
    pepJunior: 313,
    pepHigh: 0,
    bnuPrimary: 548,
    bnuJunior: 245,
    bnuHigh: 9,
    hjbPrimary: 222,
    hjbJunior: 154,
    hjbHigh: 1
  };
  const expectedDimensionCounts = {
    count: 421,
    currency: 78,
    time: 75,
    length: 573,
    mass: 38,
    area: 208,
    angle: 273,
    volume: 137,
    temperature: 69,
    percentage: 50,
    speed: 4
  };
  const packCounts = Object.fromEntries(Object.keys(mainlandRuntimeQuestionPacks).map((pack) => [pack, 0]));
  const dimensionCounts: Record<string, number> = {};
  const failures: Array<{ candidate: string; id: string }> = [];
  const questionsWithoutNegative: string[] = [];
  const noScalar: string[] = [];
  const coveredDayIds: string[] = [];
  let eligibleQuestions = 0;
  let negativeEvaluations = 0;
  let positiveConversionControls = 0;
  let unknownSameDimensionEvaluations = 0;

  for (const [pack, questions] of Object.entries(mainlandRuntimeQuestionPacks)) {
    for (const question of questions) {
      if (question.type === "multiple-choice") continue;
      const storedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];
      const canonicalDimensions = explicitQuantityAnswerDimensions(question.answer);
      const contractDimensions = new Set(
        canonicalDimensions.length
          ? canonicalDimensions
          : storedAnswers.flatMap(explicitQuantityAnswerDimensions)
      );
      if (!contractDimensions.size) continue;

      const scalars = Array.from(new Set(storedAnswers.flatMap((answer) => [
        ...explicitQuantityAnswerScalars(answer),
        parseScalarAnswer(answer)
      ]).filter((scalar): scalar is number => scalar !== null && Number.isFinite(scalar))));
      if (!scalars.length) {
        noScalar.push(question.id);
        continue;
      }

      eligibleQuestions += 1;
      packCounts[pack] += 1;
      contractDimensions.forEach((dimension) => {
        dimensionCounts[dimension] = (dimensionCounts[dimension] ?? 0) + 1;
      });
      if (question.id === "hjb-primary-ds-v1-p4-072" || question.id === "hjb-primary-ds-v1-p5-236") {
        coveredDayIds.push(question.id);
      }

      const compatibleStoredAnswers = canonicalDimensions.length
        ? storedAnswers.filter((answer) =>
            explicitQuantityAnswerDimensions(answer).some((dimension) => contractDimensions.has(dimension))
          )
        : storedAnswers;
      let questionNegativeCount = 0;

      for (const candidate of new Set(scalars.flatMap(semanticQuantityMutationCandidates))) {
        const candidateDimensions = explicitQuantityAnswerDimensions(candidate);
        if (!candidateDimensions.length) continue;
        if (storedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(candidate))) continue;

        const overlapsContract = candidateDimensions.some((dimension) => contractDimensions.has(dimension));
        const sameDimensionStoredAnswers = compatibleStoredAnswers.filter((answer) =>
          explicitQuantityAnswerDimensions(answer).some((dimension) => candidateDimensions.includes(dimension))
        );
        if (overlapsContract && sameDimensionStoredAnswers.some((answer) =>
          explicitQuantityAnswersEquivalent(candidate, answer)
        )) {
          positiveConversionControls += 1;
          continue;
        }
        if (overlapsContract && !sameDimensionStoredAnswers.length) {
          unknownSameDimensionEvaluations += 1;
          continue;
        }

        negativeEvaluations += 1;
        questionNegativeCount += 1;
        if (questionAnswerMatches(productionGradingQuestion(question), candidate)) {
          failures.push({ candidate, id: question.id });
        }
      }

      if (!questionNegativeCount) questionsWithoutNegative.push(question.id);
    }
  }

  assert.equal(eligibleQuestions, 1_926);
  assert.deepEqual(packCounts, expectedPackCounts);
  assert.deepEqual(dimensionCounts, expectedDimensionCounts);
  assert.equal(negativeEvaluations, 42_015);
  assert.equal(positiveConversionControls, 451);
  assert.equal(unknownSameDimensionEvaluations, 0);
  assert.deepEqual(noScalar, []);
  assert.deepEqual(questionsWithoutNegative, []);
  assert.deepEqual(coveredDayIds, ["hjb-primary-ds-v1-p4-072", "hjb-primary-ds-v1-p5-236"]);
  assert.deepEqual(failures, []);
});
