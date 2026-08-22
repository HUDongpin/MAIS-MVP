import independentOracleJson from "./generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json";
import exact3OracleOverlayJson from "./generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json";
import questionPackJson from "./generated-content/hk-ease-practice-bank-v2/question-pack.json";
import responseContractsJson from "./generated-content/hk-ease-practice-bank-v2/response-contracts.json";
import { isSupportedDifficultyRecord, mapDifficultyToActive } from "@/lib/difficulty";
import type { Difficulty, DifficultyRecord, GradeId, Question, QuestionType } from "@/types";

export const HONG_KONG_EASE_V2_QUESTION_PACK_SHA256 =
  "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf" as const;
export const HONG_KONG_EASE_V3_ORACLE_PREIMAGE_QUESTION_PACK_SHA256 =
  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2" as const;
export const HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256 =
  "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62" as const;
export const HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256 =
  "3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c" as const;
export const HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT = 701 as const;

type GeneratedHongKongEasePracticeQuestion = {
  id: string;
  batch: "hk-ease-practice-v2";
  sourceId: string;
  sourceGrade: number;
  grade: GradeId;
  topicId: string;
  topicTitleZh: string;
  topicTitleEn: string;
  mtrId: string | null;
  knowledgePointIds: string[];
  difficulty: DifficultyRecord;
  difficultyLevel: number;
  type: Exclude<QuestionType, "graph">;
  promptZh: string;
  promptEn: string;
  optionsZh: string[];
  optionsEn: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZh: string;
  explanationEn: string;
  sourceDistanceStatus: string;
  mathQaStatus: string;
  answerQaStatus: string;
  assetQaStatus: "text-only";
  manualQaStatus: string;
  qa: {
    questionId: string;
    sourceQuestionType: "MCQ" | "FRQ";
    originName: string | null;
    locale: string | null;
    standardAnswer: string;
    solvabilityStatus: string;
    answerMatchStatus: string;
    severity: string;
    reason: string;
    recommendedAction: string;
  };
};

type IndependentOracleRow = {
  index: number;
  baseId: string;
  independentCalculationAnswer: string;
  independentlyReviewedAnswer: string;
  independentCalculationPurpose: "mathematical-cross-check-not-grading-submission";
  differsFromReviewedAnswer: boolean;
  calculationIsStrictNegative: boolean;
  rowSpecificDerivation: boolean;
  independentDerivation: string | null;
  reviewMethodClassification: string;
  acceptedAnswerFormCount: number;
  acceptedAnswersSha256: string;
  questionObjectSha256: string;
  mathStatus: "pass";
  reviewer: string;
  reviewArtifact: string;
};

export type HongKongEasePracticeQuestionGenerationMetadata = {
  batch: "hk-ease-practice-v2";
  sourceId: string;
  sourceGrade: number;
  grade: GradeId;
  topicId: string;
  mtrId: string | null;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  sourceQuestionType: "MCQ" | "FRQ";
  originName: string | null;
  sourceDistanceStatus: string;
  mathQaStatus: string;
  answerQaStatus: string;
  assetQaStatus: "text-only";
  manualQaStatus: string;
  independentlyReviewedAnswer: string;
  independentCalculationAnswer: string;
  independentDerivation: string | null;
  reviewMethodClassification: string;
  rowSpecificDerivation: boolean;
  independentOracleStatus: string;
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: expected an object.`);
  return value as Record<string, unknown>;
}

function objectTreeHasKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => objectTreeHasKey(item, key));
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  return Object.hasOwn(object, key) || Object.values(object).some((item) => objectTreeHasKey(item, key));
}

function nonBlankString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}: expected a non-blank string.`);
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  return nonBlankString(value, label);
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label}: expected an array.`);
  return value.map((item, index) => nonBlankString(item, `${label}[${index}]`));
}

function exactString(value: unknown, expected: string, label: string) {
  if (value !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}.`);
  return expected;
}

function booleanValue(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label}: expected a boolean.`);
  return value;
}

function positiveInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`${label}: expected a positive integer.`);
  return value as number;
}

function parseGeneratedQuestion(value: unknown, index: number): GeneratedHongKongEasePracticeQuestion {
  const label = `HK EASE v2 question[${index}]`;
  const question = record(value, label);
  const id = nonBlankString(question.id, `${label}.id`);
  if (!/^hk-ease-\d+$/.test(id)) throw new Error(`${id}: expected an unversioned HK EASE base ID.`);
  exactString(question.batch, "hk-ease-practice-v2", `${id}.batch`);
  const sourceId = nonBlankString(question.sourceId, `${id}.sourceId`);
  if (id !== `hk-ease-${sourceId}`) throw new Error(`${id}: source ID does not match the question ID.`);

  const sourceGrade = question.sourceGrade;
  if (!Number.isInteger(sourceGrade) || ![3, 4, 5, 7].includes(sourceGrade as number)) {
    throw new Error(`${id}: unsupported EASE source grade.`);
  }
  const grade = nonBlankString(question.grade, `${id}.grade`) as GradeId;
  if (!(["P3", "P4", "P5", "S1"] as const).includes(grade as "P3" | "P4" | "P5" | "S1")) {
    throw new Error(`${id}: unsupported mapped HK grade.`);
  }
  if (!isSupportedDifficultyRecord(question.difficulty)) throw new Error(`${id}: unsupported difficulty record.`);
  const difficultyLevel = question.difficultyLevel;
  if (!Number.isInteger(difficultyLevel) || (difficultyLevel as number) < 1 || (difficultyLevel as number) > 3) {
    throw new Error(`${id}: difficultyLevel must be an integer from 1 to 3.`);
  }

  const type = nonBlankString(question.type, `${id}.type`) as Exclude<QuestionType, "graph">;
  if (!(["multiple-choice", "fill-in", "short-answer"] as const).includes(type)) {
    throw new Error(`${id}: unsupported question type.`);
  }
  const optionsEn = Array.isArray(question.optionsEn)
    ? question.optionsEn.map((item, optionIndex) => nonBlankString(item, `${id}.optionsEn[${optionIndex}]`))
    : (() => { throw new Error(`${id}.optionsEn: expected an array.`); })();
  const optionsZh = Array.isArray(question.optionsZh)
    ? question.optionsZh.map((item, optionIndex) => nonBlankString(item, `${id}.optionsZh[${optionIndex}]`))
    : (() => { throw new Error(`${id}.optionsZh: expected an array.`); })();
  if (optionsEn.length !== optionsZh.length) throw new Error(`${id}: bilingual option arrays differ in length.`);
  if (type === "multiple-choice" && optionsEn.length < 2) throw new Error(`${id}: multiple-choice question has fewer than two options.`);
  if (type !== "multiple-choice" && optionsEn.length) throw new Error(`${id}: non-choice question retained options.`);

  const answer = nonBlankString(question.answer, `${id}.answer`);
  const acceptedAnswers = stringArray(question.acceptedAnswers, `${id}.acceptedAnswers`);
  if (!acceptedAnswers.includes(answer)) throw new Error(`${id}: accepted answers omit the canonical answer.`);
  if (new Set(acceptedAnswers).size !== acceptedAnswers.length) throw new Error(`${id}: duplicate accepted answers.`);
  if ("questionAssets" in question) throw new Error(`${id}: text-only EASE package unexpectedly contains question assets.`);

  const qa = record(question.qa, `${id}.qa`);
  exactString(qa.questionId, sourceId, `${id}.qa.questionId`);
  const sourceQuestionType = nonBlankString(qa.sourceQuestionType, `${id}.qa.sourceQuestionType`);
  if (sourceQuestionType !== "MCQ" && sourceQuestionType !== "FRQ") throw new Error(`${id}: unsupported source question type.`);

  return {
    id,
    batch: "hk-ease-practice-v2",
    sourceId,
    sourceGrade: sourceGrade as number,
    grade,
    topicId: nonBlankString(question.topicId, `${id}.topicId`),
    topicTitleZh: nonBlankString(question.topicTitleZh, `${id}.topicTitleZh`),
    topicTitleEn: nonBlankString(question.topicTitleEn, `${id}.topicTitleEn`),
    mtrId: nullableString(question.mtrId, `${id}.mtrId`),
    knowledgePointIds: stringArray(question.knowledgePointIds, `${id}.knowledgePointIds`),
    difficulty: question.difficulty,
    difficultyLevel: difficultyLevel as number,
    type,
    promptZh: nonBlankString(question.promptZh, `${id}.promptZh`),
    promptEn: nonBlankString(question.promptEn, `${id}.promptEn`),
    optionsZh,
    optionsEn,
    answer,
    acceptedAnswers,
    explanationZh: nonBlankString(question.explanationZh, `${id}.explanationZh`),
    explanationEn: nonBlankString(question.explanationEn, `${id}.explanationEn`),
    sourceDistanceStatus: nonBlankString(question.sourceDistanceStatus, `${id}.sourceDistanceStatus`),
    mathQaStatus: nonBlankString(question.mathQaStatus, `${id}.mathQaStatus`),
    answerQaStatus: nonBlankString(question.answerQaStatus, `${id}.answerQaStatus`),
    assetQaStatus: exactString(question.assetQaStatus, "text-only", `${id}.assetQaStatus`) as "text-only",
    manualQaStatus: nonBlankString(question.manualQaStatus, `${id}.manualQaStatus`),
    qa: {
      questionId: sourceId,
      sourceQuestionType,
      originName: nullableString(qa.originName, `${id}.qa.originName`),
      locale: nullableString(qa.locale, `${id}.qa.locale`),
      standardAnswer: nonBlankString(qa.standardAnswer, `${id}.qa.standardAnswer`),
      solvabilityStatus: nonBlankString(qa.solvabilityStatus, `${id}.qa.solvabilityStatus`),
      answerMatchStatus: nonBlankString(qa.answerMatchStatus, `${id}.qa.answerMatchStatus`),
      severity: nonBlankString(qa.severity, `${id}.qa.severity`),
      reason: nonBlankString(qa.reason, `${id}.qa.reason`),
      recommendedAction: nonBlankString(qa.recommendedAction, `${id}.qa.recommendedAction`)
    }
  };
}

function parseIndependentOracle(value: unknown) {
  const oracle = record(value, "HK EASE v2 independent oracle");
  exactString(oracle.schemaVersion, "hk-ease-independent-answer-oracle-v3", "HK EASE v2 oracle schemaVersion");
  exactString(oracle.candidateSha256, HONG_KONG_EASE_V3_ORACLE_PREIMAGE_QUESTION_PACK_SHA256, "HK EASE V3 oracle preimage candidateSha256");
  if (
    oracle.reviewedQuestionCount !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT ||
    oracle.mathPassCount !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT ||
    oracle.canonicalAnswerReviewCount !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT ||
    oracle.acceptedAnswerFormsReviewed !== 1896 ||
    oracle.calculationDifferenceCount !== 165 ||
    oracle.strictNegativeCalculationCount !== 62 ||
    oracle.rowSpecificDerivationCount !== 234 ||
    oracle.reviewMethodClassificationCount !== 467 ||
    oracle.multipleChoiceReviewCount !== 90 ||
    oracle.acceptedAnswerFormCount !== 1896 ||
    oracle.declaredSimpleQuestionCount !== 357
  ) {
    throw new Error("HK EASE v2 oracle independent-review coverage drifted.");
  }
  const status = nonBlankString(oracle.status, "HK EASE v2 oracle status");
  if (!Array.isArray(oracle.questions) || oracle.questions.length !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT) {
    throw new Error("HK EASE v2 oracle must contain exactly 701 rows.");
  }
  const rows = oracle.questions.map((value, index): IndependentOracleRow => {
    const row = record(value, `HK EASE v2 oracle[${index}]`);
    if (row.index !== index) throw new Error(`HK EASE v2 oracle[${index}]: index drift.`);
    exactString(row.mathStatus, "pass", `HK EASE v2 oracle[${index}].mathStatus`);
    const rowSpecificDerivation = booleanValue(
      row.rowSpecificDerivation,
      `HK EASE v2 oracle[${index}].rowSpecificDerivation`
    );
    const independentDerivation = row.independentDerivation === null
      ? null
      : nonBlankString(row.independentDerivation, `HK EASE v2 oracle[${index}].independentDerivation`);
    const reviewMethodClassification = nonBlankString(
      row.reviewMethodClassification,
      `HK EASE v2 oracle[${index}].reviewMethodClassification`
    );
    if (
      (index < 234 &&
        (!rowSpecificDerivation || !independentDerivation || reviewMethodClassification !== "row-specific-independent-derivation")) ||
      (index >= 234 &&
        (rowSpecificDerivation || independentDerivation !== null || /row-specific.*derivation/i.test(reviewMethodClassification)))
    ) {
      throw new Error(`HK EASE v2 oracle[${index}]: derivation/classification boundary drifted.`);
    }
    return {
      index,
      baseId: nonBlankString(row.baseId, `HK EASE v2 oracle[${index}].baseId`),
      independentCalculationAnswer: nonBlankString(row.independentCalculationAnswer, `HK EASE v2 oracle[${index}].independentCalculationAnswer`),
      independentlyReviewedAnswer: nonBlankString(
        row.independentlyReviewedAnswer,
        `HK EASE v2 oracle[${index}].independentlyReviewedAnswer`
      ),
      independentCalculationPurpose: exactString(
        row.independentCalculationPurpose,
        "mathematical-cross-check-not-grading-submission",
        `HK EASE v2 oracle[${index}].independentCalculationPurpose`
      ) as "mathematical-cross-check-not-grading-submission",
      differsFromReviewedAnswer: booleanValue(row.differsFromReviewedAnswer, `HK EASE v2 oracle[${index}].differsFromReviewedAnswer`),
      calculationIsStrictNegative: booleanValue(
        row.calculationIsStrictNegative,
        `HK EASE v2 oracle[${index}].calculationIsStrictNegative`
      ),
      rowSpecificDerivation,
      independentDerivation,
      reviewMethodClassification,
      acceptedAnswerFormCount: positiveInteger(
        row.acceptedAnswerFormCount,
        `HK EASE v2 oracle[${index}].acceptedAnswerFormCount`
      ),
      acceptedAnswersSha256: nonBlankString(row.acceptedAnswersSha256, `HK EASE v2 oracle[${index}].acceptedAnswersSha256`),
      questionObjectSha256: nonBlankString(row.questionObjectSha256, `HK EASE v2 oracle[${index}].questionObjectSha256`),
      mathStatus: "pass",
      reviewer: nonBlankString(row.reviewer, `HK EASE v2 oracle[${index}].reviewer`),
      reviewArtifact: nonBlankString(row.reviewArtifact, `HK EASE v2 oracle[${index}].reviewArtifact`)
    };
  });
  return { status, rows };
}


const exact3OverlayExpectedIds = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;
const exact3OverlayExpectedIndices = [187, 188, 693] as const;
const exact3OverlayExpectedAcceptedHashes = {
  "hk-ease-10481": "ee40735aa81fc6ffa6f0bd4e71d9da27921cc29e49df55f9a205cf0e955ca398",
  "hk-ease-10496": "288cd547d53abdc352154c2980c6228204260b866ad5766b0d024834ec96cc69",
  "hk-ease-1041": "44b4b472092326c4d1e560d4eb902ca5a73f7b2ba79677e2a64d62e6da61fb94"
} as const;
const exact3OverlayExpectedQuestionHashes = {
  "hk-ease-10481": "c5f21c907bf74408e75a0ca2237d72d4c859f3cec43b1d4c1b143322b5d1e4f7",
  "hk-ease-10496": "04dee736b973cd14cf93a23840b8f4c7301a9db0ec2a0517d1b2382657981bf8",
  "hk-ease-1041": "8f7255c66067c2c1b777a4733cea48ad8f5267ebebbc15d51b2b8e62965d2f6e"
} as const;

function exactJson(value: unknown, expected: unknown, label: string) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error(label + ": exact JSON drift.");
}

function applyHongKongEaseExact3OracleOverlay(
  preimage: ReturnType<typeof parseIndependentOracle>,
  overlayValue: unknown,
  questions: GeneratedHongKongEasePracticeQuestion[]
) {
  const overlay = record(overlayValue, "HK EASE exact3 oracle overlay");
  exactString(
    overlay.schemaVersion,
    "hk-ease-exact3-phase2b-independent-answer-oracle-overlay-supplement-v2",
    "HK EASE exact3 overlay schemaVersion"
  );
  exactString(
    overlay.status,
    "candidate-overlay-approved-not-live-promotion",
    "HK EASE exact3 overlay status"
  );
  const sourceBindings = record(overlay.sourceBindings, "HK EASE exact3 overlay sourceBindings");
  const oldOracleBinding = record(
    sourceBindings.oldV3OracleImmutablePreimage,
    "HK EASE exact3 overlay old oracle binding"
  );
  exactString(
    oldOracleBinding.sha256,
    HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,
    "HK EASE exact3 overlay old oracle SHA"
  );
  if (oldOracleBinding.livePathFallbackAllowed !== false) {
    throw new Error("HK EASE exact3 overlay may not reinterpret live bytes as its V3 preimage.");
  }
  const packBinding = record(
    sourceBindings.normalizedBaseQuestionPackCandidate,
    "HK EASE exact3 overlay pack binding"
  );
  exactString(
    packBinding.sha256,
    HONG_KONG_EASE_V2_QUESTION_PACK_SHA256,
    "HK EASE exact3 overlay pack SHA"
  );
  exactJson(overlay.orderedBaseIds, exact3OverlayExpectedIds, "HK EASE exact3 overlay ordered IDs");
  exactJson(overlay.sourceIndicesZeroBased, exact3OverlayExpectedIndices, "HK EASE exact3 overlay indices");
  if (
    overlay.rowCount !== 3 ||
    overlay.rowsPayloadSha256 !== "53029136ba4f0b57a590bd6c1c54df3eff4aef3483cc6e15c68067a6098b79d3" ||
    overlay.appliedOracleQuestionsPayloadSha256 !== "82717bfa8594a9656c360b9a2131aa5cf7884719ac09fff0d10003bb2936ee2c" ||
    overlay.unchanged698OracleRowsPayloadSha256 !== "ece239d954002246ab497dd9579d9ea70bc03675dcf022edc7a8947f75eb02ed" ||
    !Array.isArray(overlay.questions) ||
    overlay.questions.length !== 3
  ) {
    throw new Error("HK EASE exact3 oracle overlay payload contract drifted.");
  }
  const aggregate = record(overlay.aggregateExpectations, "HK EASE exact3 overlay aggregates");
  if (
    aggregate.reviewedQuestionCount !== 701 ||
    aggregate.mathPassCount !== 701 ||
    aggregate.canonicalAnswerReviewCount !== 701 ||
    aggregate.acceptedAnswerFormsReviewed !== 1912 ||
    aggregate.acceptedAnswerFormCount !== 1912 ||
    aggregate.calculationDifferenceCount !== 167 ||
    aggregate.strictNegativeCalculationCount !== 64 ||
    aggregate.rowSpecificDerivationCount !== 234 ||
    aggregate.reviewMethodClassificationCount !== 467 ||
    aggregate.multipleChoiceReviewCount !== 90 ||
    aggregate.declaredSimpleQuestionCount !== 357
  ) {
    throw new Error("HK EASE exact3 oracle overlay aggregate contract drifted.");
  }
  const preservedFields = [
    "index", "baseId", "independentCalculationAnswer", "independentCalculationPurpose",
    "rowSpecificDerivation", "independentDerivation", "reviewMethodClassification",
    "mathStatus", "reviewer", "reviewArtifact"
  ] as const;
  const rows = preimage.rows.map((row) => ({ ...row }));
  for (const [overlayPosition, expectedBaseId] of exact3OverlayExpectedIds.entries()) {
    const sourceIndex = exact3OverlayExpectedIndices[overlayPosition];
    const candidate = record(overlay.questions[overlayPosition], expectedBaseId + " overlay row");
    const oldRow = preimage.rows[sourceIndex];
    const question = questions[sourceIndex];
    if (!oldRow || !question || oldRow.baseId !== expectedBaseId || question.id !== expectedBaseId) {
      throw new Error(expectedBaseId + ": exact3 overlay index/base join drifted.");
    }
    for (const field of preservedFields) {
      exactJson(candidate[field], oldRow[field], expectedBaseId + ": preserved oracle field " + field);
    }
    if (
      candidate.index !== sourceIndex ||
      candidate.baseId !== expectedBaseId ||
      candidate.independentlyReviewedAnswer !== question.answer ||
      candidate.differsFromReviewedAnswer !== true ||
      candidate.calculationIsStrictNegative !== (expectedBaseId !== "hk-ease-1041") ||
      candidate.acceptedAnswerFormCount !== question.acceptedAnswers.length ||
      candidate.acceptedAnswersSha256 !== exact3OverlayExpectedAcceptedHashes[expectedBaseId] ||
      candidate.questionObjectSha256 !== exact3OverlayExpectedQuestionHashes[expectedBaseId]
    ) {
      throw new Error(expectedBaseId + ": exact3 overlay reviewed-field binding drifted.");
    }
    rows[sourceIndex] = candidate as unknown as IndependentOracleRow;
  }
  if (
    rows.reduce((sum, row) => sum + row.acceptedAnswerFormCount, 0) !== 1912 ||
    rows.filter((row) => row.differsFromReviewedAnswer).length !== 167 ||
    rows.filter((row) => row.calculationIsStrictNegative).length !== 64 ||
    rows.filter((row) => row.rowSpecificDerivation).length !== 234
  ) {
    throw new Error("HK EASE exact3 applied oracle coverage drifted.");
  }
  return {
    status: preimage.status + "+exact3-independent-overlay-v2",
    rows
  };
}

const pack = record(questionPackJson, "HK EASE v2 question pack");
const packMetadata = record(pack.metadata, "HK EASE v2 question-pack metadata");
exactString(packMetadata.batch, "hk-ease-practice-v2", "HK EASE v2 question-pack batch");
if (packMetadata.approvedQuestionCount !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT) {
  throw new Error("HK EASE v2 question-pack count contract drifted from 701.");
}
if (!Array.isArray(pack.questions) || pack.questions.length !== HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT) {
  throw new Error("HK EASE v2 question pack must contain exactly 701 questions.");
}
const generatedQuestions = pack.questions.map(parseGeneratedQuestion);
if (new Set(generatedQuestions.map((question) => question.id)).size !== generatedQuestions.length) {
  throw new Error("HK EASE v2 question pack contains duplicate question IDs.");
}

const contractManifest = record(responseContractsJson, "HK EASE v2 response-contract manifest");
exactString(contractManifest.candidateSha256, HONG_KONG_EASE_V2_QUESTION_PACK_SHA256, "HK EASE v2 response-contract candidateSha256");
exactString(
  contractManifest.candidateQuestionIdSha256,
  "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a",
  "HK EASE v2 response-contract candidateQuestionIdSha256"
);
exactString(
  contractManifest.auditSha256,
  "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",
  "HK EASE v2 response-contract auditSha256"
);
exactString(
  contractManifest.aliasTriageSha256,
  "7d18dadbae0e222d3d8db1dd8029bb8389565124121389e18fc8e205601638ce",
  "HK EASE v2 response-contract aliasTriageSha256"
);
if (
  contractManifest.schemaVersion !== 1 ||
  contractManifest.status !== "candidate-pending-independent-review" ||
  contractManifest.failClosedPolicy !== "reject-no-generic-fallback" ||
  contractManifest.strictContractCount !== 344 ||
  contractManifest.positiveProbeCount !== 584 ||
  contractManifest.negativeProbeCount !== 581 ||
  contractManifest.reviewedExactSurfaceQuestionCount !== 56 ||
  contractManifest.reviewedExactSurfaceFormCount !== 136 ||
  !Array.isArray(contractManifest.entries) ||
  contractManifest.entries.length !== 344 ||
  objectTreeHasKey(contractManifest, "auditedAcceptedSurfaceForms")
) {
  throw new Error("HK EASE v2 strict response-contract manifest is incomplete or not fail-closed.");
}

const independentOraclePreimage = parseIndependentOracle(independentOracleJson);
const independentOracle = applyHongKongEaseExact3OracleOverlay(
  independentOraclePreimage,
  exact3OracleOverlayJson,
  generatedQuestions
);
const oracleById = new Map(independentOracle.rows.map((row) => [row.baseId, row]));
for (const [index, question] of generatedQuestions.entries()) {
  const oracle = oracleById.get(question.id);
  if (!oracle || oracle.index !== index) throw new Error(`${question.id}: missing index-bound independent oracle row.`);
  if (oracle.independentlyReviewedAnswer !== question.answer) {
    throw new Error(`${question.id}: independently reviewed answer drifted from the production canonical answer.`);
  }
}

function localized(en: string, zh: string) {
  return { en, zh };
}

function optionsFor(question: GeneratedHongKongEasePracticeQuestion) {
  if (question.type !== "multiple-choice") return undefined;
  return question.optionsEn.map((optionEn, index) => localized(optionEn, question.optionsZh[index]));
}

function toQuestion(question: GeneratedHongKongEasePracticeQuestion): Question {
  return {
    id: question.id,
    curriculumTrack: "HK",
    region: "HK",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: localized(question.topicTitleEn, question.topicTitleZh),
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localized(question.promptEn, question.promptZh),
    options: optionsFor(question),
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: localized(question.explanationEn, question.explanationZh)
  };
}

function metadataForQuestion(question: GeneratedHongKongEasePracticeQuestion): HongKongEasePracticeQuestionGenerationMetadata {
  const oracle = oracleById.get(question.id);
  if (!oracle) throw new Error(`${question.id}: independent oracle row disappeared during metadata mapping.`);
  return {
    batch: question.batch,
    sourceId: question.sourceId,
    sourceGrade: question.sourceGrade,
    grade: question.grade,
    topicId: question.topicId,
    mtrId: question.mtrId,
    type: question.type,
    difficulty: mapDifficultyToActive(question.difficulty),
    sourceQuestionType: question.qa.sourceQuestionType,
    originName: question.qa.originName,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: question.mathQaStatus,
    answerQaStatus: question.answerQaStatus,
    assetQaStatus: question.assetQaStatus,
    manualQaStatus: question.manualQaStatus,
    independentlyReviewedAnswer: oracle.independentlyReviewedAnswer,
    independentCalculationAnswer: oracle.independentCalculationAnswer,
    independentDerivation: oracle.independentDerivation,
    reviewMethodClassification: oracle.reviewMethodClassification,
    rowSpecificDerivation: oracle.rowSpecificDerivation,
    independentOracleStatus: independentOracle.status
  };
}

export const hongKongEasePracticeQuestions: Question[] = generatedQuestions.map(toQuestion);

export const hongKongEasePracticeQuestionGenerationMetadata: Record<string, HongKongEasePracticeQuestionGenerationMetadata> =
  Object.fromEntries(generatedQuestions.map((question) => [question.id, metadataForQuestion(question)]));

export const expectedHongKongEasePracticeQuestionCount = HONG_KONG_EASE_V2_EXPECTED_QUESTION_COUNT;

function easeBaseId(questionId: string) {
  const match = questionId.match(/^(hk-ease-\d+)(?:-v\d+)?$/);
  return match?.[1] ?? questionId;
}

export function independentHongKongEasePracticeAnswer(question: Question) {
  const metadata = hongKongEasePracticeQuestionGenerationMetadata[easeBaseId(question.id)];
  if (!metadata) {
    throw new Error(`${question.id}: missing HK EASE independent-oracle metadata.`);
  }
  return metadata.independentlyReviewedAnswer;
}
