import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const evidenceRoot = "coordination/content-qa/authoritative/hk-ease-701-independent-oracle";
const questionPackPath = "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
const responseContractAuditPath =
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json";
const responseContractsPath =
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
const semanticShardPaths = [
  `${evidenceRoot}/semantic-shard-a.json`,
  `${evidenceRoot}/semantic-shard-b.json`,
  `${evidenceRoot}/semantic-shard-c.json`
] as const;

export const HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH: Readonly<Record<string, string>> = Object.freeze({
  [questionPackPath]:
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2.json",
  [responseContractAuditPath]:
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28.json",
  [responseContractsPath]:
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4.json"
});

export const HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH = Object.freeze({
  [questionPackPath]:
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",
  [responseContractAuditPath]:
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",
  [responseContractsPath]:
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",
  [`${evidenceRoot}/initial-independent-review.json`]:
    "09ea98dbcf6cb17a89cca692ee7760b0fcfb74dd898db316c48937d7b01ff8ea",
  [`${evidenceRoot}/declared-simple-ledger.json`]:
    "11ad86d97706a08379df4b75630bfe35e73a7e2dba257ce0e435044d03784284",
  [`${evidenceRoot}/semantic-aggregate-review.json`]:
    "df85ba687333fd57dc6aa51c81aa6051a260115e2d5989fcc5e41ebf864c9a9d",
  [`${evidenceRoot}/semantic-shard-a.json`]:
    "fa53a9255c60e71111c8b8837c33cf9cc14b539964884566fd28c2269ee24b1d",
  [`${evidenceRoot}/semantic-shard-b.json`]:
    "d291f64b2676b719053c1042183de8155e3b07acace27e7cd6ccb1eda7da1c0f",
  [`${evidenceRoot}/semantic-shard-c.json`]:
    "5fe839673194828096a1e8ed0ce36bd683f5a9347c816be4b8ddc38ef37e8261"
} as const);

const INITIAL_CANDIDATE_SHA256 =
  "7cb9cce50d90dc427789ea6f6214f777a48a59cde4c4794b4dc15a2661f5fdda";
const SEMANTIC_REVIEW_CANDIDATE_SHA256 =
  "f032dbb4b3aa58a070ae1a47e4d2ee6ddb2802e9655edc83ceba3e2e6ca77b8e";
const FINAL_CANDIDATE_SHA256 =
  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2";
const FINAL_CANDIDATE_QUESTION_PAYLOAD_SHA256 =
  "509498d2d6d5f4f64b3650e9004e2b4742bb05a3239d8fc6c000ce5a07566bd0";
const ORDERED_BASE_ID_SHA256 =
  "825c6dcfab4ce233c46844e5935f2055488ce738930d1728d28370e291067ca0";
const INDEPENDENT_CALCULATION_PAYLOAD_SHA256 =
  "27b6e9151b8a5240733f563e93b501738e5a4ac3f920e68c0a2eaf457d43df0f";
const INDEPENDENTLY_REVIEWED_ANSWER_PAYLOAD_SHA256 =
  "10c9f1f2e1bdf07dd052dff43aa08a2533df1b2a7e755bc96a9e1fe2020b9982";

type InitialReviewQuestion = {
  index: number;
  id: string;
  independentAnswer: string;
  mathStatus: string;
  reviewer: string;
  reviewArtifact: string;
};

type InitialReview = {
  schemaVersion: number;
  baseline: { candidateSha256: string };
  summary: {
    reviewedQuestions: number;
    uniqueIds: number;
    mathStatusCounts: Record<string, number>;
  };
  questions: InitialReviewQuestion[];
};

type SemanticShardRow = {
  index: number;
  id: string;
  type?: string;
  independentSolutionBasis?: string;
  observedCanonicalAnswer?: string;
  independentExpectedAnswer?: string;
  reviewBasis?: string;
  acceptedAnswers?: string[];
  acceptedAnswerFormCount?: number;
  acceptedAnswersSha256?: string;
  questionObjectSha256?: string;
  promptEn?: string;
  promptZh?: string;
  multipleChoiceAdjudication?: {
    correctOptionIndexZeroBased?: number;
    correctOptionEn?: string;
    correctOptionZh?: string;
    englishChoiceUniquelyCorrect?: boolean;
    chineseChoiceUniquelyCorrect?: boolean;
  } | null;
  checks: Record<string, unknown>;
};

type ProductionQuestionEvidence = {
  id: string;
  type: string;
  promptEn: string;
  promptZh: string;
  optionsEn: string[];
  optionsZh: string[];
  answer: string;
  acceptedAnswers: string[];
  [key: string]: unknown;
};

type DeclaredSimpleLedger = {
  schemaVersion: string;
  classification: string;
  strictQuestionCount: number;
  declaredSimpleQuestionCount: number;
  questionTypeCounts: Record<string, number>;
  entries: Array<{
    baseId: string;
    type: string;
    independentCalculationAnswer: string;
    independentlyReviewedAnswer: string;
    typedNegativeResponse: string;
    typedNegativeKind: string;
    independentlyWrongBasis: string;
  }>;
};

type ResponseContractAudit = {
  entries: Array<{
    baseId: string;
    positiveProbes?: Array<{ input: string }>;
    negativeProbes?: Array<{ input: string }>;
  }>;
};

type ResponseContractManifest = {
  entries: Array<{ baseId: string }>;
};

type SemanticShard = {
  candidateSha256?: string;
  readOnlySource?: string;
  source?: { candidateSha256?: string };
  rows: SemanticShardRow[];
};

type SemanticAggregate = {
  schemaVersion: string;
  verdict: string;
  sourceBindings: {
    questionPack: { sha256: string };
    semanticShardA: { sha256: string };
    semanticShardB: { sha256: string };
    semanticShardC: { sha256: string };
    independentAnswerOracle: { sha256: string };
  };
  coverage: {
    candidateQuestions: number;
    independentMathCanonicalAcceptedExplanationRows: number;
    acceptedAnswerForms: { total: number; allReviewed: boolean };
  };
  exactDelta: {
    preSha256: string;
    postSha256: string;
    answersAcceptedAnswersOptionsExplanationsUnchangedForAll701: boolean;
  };
  unresolvedIds: string[];
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export type HongKongEaseIndependentOracleFailureCode =
  | "EVIDENCE_CONTRACT"
  | "QUESTION_ORDER"
  | "PROMPT_DRIFT"
  | "ANSWER_DRIFT"
  | "ACCEPTED_ANSWER_DRIFT"
  | "OPTION_DRIFT"
  | "UNIT_OR_DIMENSION_DRIFT"
  | "METHOD_OR_FORMAT_DRIFT"
  | "QUESTION_PAYLOAD_DRIFT";

export class HongKongEaseIndependentOracleValidationError extends Error {
  constructor(
    public readonly code: HongKongEaseIndependentOracleFailureCode,
    public readonly baseId: string | null,
    public readonly field: string | null,
    message: string
  ) {
    super(`HK EASE independent oracle [${code}]: ${message}`);
    this.name = "HongKongEaseIndependentOracleValidationError";
  }
}

function oracleFailure(
  code: HongKongEaseIndependentOracleFailureCode,
  message: string,
  baseId: string | null = null,
  field: string | null = null
): never {
  throw new HongKongEaseIndependentOracleValidationError(code, baseId, field, message);
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) oracleFailure("EVIDENCE_CONTRACT", message);
}

function rowInvariant(
  condition: unknown,
  code: Exclude<HongKongEaseIndependentOracleFailureCode, "EVIDENCE_CONTRACT">,
  row: ProductionQuestionEvidence,
  field: string,
  message: string
): asserts condition {
  if (!condition) oracleFailure(code, message, row.id, field);
}

function nonBlank(value: unknown, label: string) {
  invariant(typeof value === "string" && Boolean(value.trim()), `${label} must be a non-blank string`);
  return value;
}

function evidenceBytes(relativePath: string) {
  const physicalPath = HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[relativePath] ?? relativePath;
  const bytes = readFileSync(join(process.cwd(), physicalPath));
  const expectedSha256 = HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH[
    relativePath as keyof typeof HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH
  ];
  invariant(expectedSha256, `${relativePath} is not an authorized evidence path`);
  invariant(sha256(bytes) === expectedSha256, `${relativePath} SHA-256 drifted`);
  return bytes;
}

function evidenceJson<T>(relativePath: string) {
  return JSON.parse(evidenceBytes(relativePath).toString("utf8")) as T;
}

function canonicalAnswerFor(row: SemanticShardRow) {
  return nonBlank(
    row.observedCanonicalAnswer ?? row.independentExpectedAnswer,
    `${row.id}.independentlyReviewedAnswer`
  );
}

function assertSemanticChecks(row: SemanticShardRow) {
  const canonicalAnswerCorrect = row.checks.canonicalAnswerCorrect ??
    (row.checks.canonicalAnswer as { pass?: unknown } | undefined)?.pass;
  const independentlySolvable = row.checks.unambiguousSolvability === true ||
    (row.checks.unambiguousSolvability as { pass?: unknown } | undefined)?.pass === true;
  const acceptedAnswersReviewed = row.checks.everyAcceptedAnswerFormMathematicallyValid === true ||
    (row.checks.acceptedAnswers as { pass?: unknown } | undefined)?.pass === true;
  invariant(canonicalAnswerCorrect === true, `${row.id} lacks an independent canonical-answer pass`);
  invariant(independentlySolvable, `${row.id} lacks an independent solvability pass`);
  invariant(acceptedAnswersReviewed, `${row.id} lacks an all-accepted-forms pass`);
}

type IndependentEvidenceBundle = {
  canonicalQuestionPack: { questions: ProductionQuestionEvidence[] };
  initial: InitialReview;
  simpleLedger: DeclaredSimpleLedger;
  aggregate: SemanticAggregate;
  shards: SemanticShard[];
  responseContractAudit: ResponseContractAudit;
  responseContracts: ResponseContractManifest;
};

function loadIndependentEvidenceBundle(): IndependentEvidenceBundle {
  const initialPath = `${evidenceRoot}/initial-independent-review.json`;
  const aggregatePath = `${evidenceRoot}/semantic-aggregate-review.json`;
  const canonicalQuestionPack = JSON.parse(
    evidenceBytes(questionPackPath).toString("utf8")
  ) as { questions: ProductionQuestionEvidence[] };
  const initial = evidenceJson<InitialReview>(initialPath);
  const simpleLedger = evidenceJson<DeclaredSimpleLedger>(`${evidenceRoot}/declared-simple-ledger.json`);
  const aggregate = evidenceJson<SemanticAggregate>(aggregatePath);
  const shards = semanticShardPaths.map((path) => evidenceJson<SemanticShard>(path));
  const responseContractAudit = JSON.parse(
    evidenceBytes(responseContractAuditPath).toString("utf8")
  ) as ResponseContractAudit;
  const responseContracts = JSON.parse(
    evidenceBytes(responseContractsPath).toString("utf8")
  ) as ResponseContractManifest;

  return {
    canonicalQuestionPack,
    initial,
    simpleLedger,
    aggregate,
    shards,
    responseContractAudit,
    responseContracts
  };
}

export function validateHongKongEaseIndependentCandidate(
  questionPack: { questions: ProductionQuestionEvidence[] },
  evidence = loadIndependentEvidenceBundle()
) {
  const {
    canonicalQuestionPack,
    initial,
    simpleLedger,
    aggregate,
    shards,
    responseContractAudit,
    responseContracts
  } = evidence;

  invariant(initial.schemaVersion === 1, "initial review schema drifted");
  invariant(initial.baseline.candidateSha256 === INITIAL_CANDIDATE_SHA256, "initial candidate binding drifted");
  invariant(initial.summary.reviewedQuestions === 701, "initial review count drifted");
  invariant(initial.summary.uniqueIds === 701, "initial unique-ID count drifted");
  invariant(initial.summary.mathStatusCounts.pass === 701, "initial math-pass count drifted");
  invariant(initial.questions.length === 701, "initial review must contain 701 questions");

  for (const [index, shard] of shards.entries()) {
    const candidateSha256 = shard.candidateSha256 ?? shard.source?.candidateSha256;
    invariant(candidateSha256 === SEMANTIC_REVIEW_CANDIDATE_SHA256, `semantic shard ${index} candidate binding drifted`);
  }
  invariant(shards[0]?.rows.length === 234, "semantic shard A row count drifted");
  invariant(shards[1]?.rows.length === 234, "semantic shard B row count drifted");
  invariant(shards[2]?.rows.length === 233, "semantic shard C row count drifted");

  invariant(aggregate.schemaVersion === "hk-ease-semantic-aggregate-review-v1", "aggregate schema drifted");
  invariant(
    aggregate.verdict === "approved-for-integration-review-semantic-content-boundary",
    "aggregate verdict is not the independently approved semantic boundary"
  );
  invariant(aggregate.sourceBindings.questionPack.sha256 === FINAL_CANDIDATE_SHA256, "aggregate final candidate drifted");
  invariant(aggregate.sourceBindings.semanticShardA.sha256 === HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH[semanticShardPaths[0]], "aggregate shard A binding drifted");
  invariant(aggregate.sourceBindings.semanticShardB.sha256 === HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH[semanticShardPaths[1]], "aggregate shard B binding drifted");
  invariant(aggregate.sourceBindings.semanticShardC.sha256 === HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH[semanticShardPaths[2]], "aggregate shard C binding drifted");
  invariant(
    aggregate.sourceBindings.independentAnswerOracle.sha256 ===
      "da330d0b3c9fe804153ff910a42c7f7c3da9c8e19b4fe4d2d9301232dfb4ccb7",
    "aggregate predecessor-oracle binding drifted"
  );
  invariant(aggregate.coverage.candidateQuestions === 701, "aggregate question count drifted");
  invariant(
    aggregate.coverage.independentMathCanonicalAcceptedExplanationRows === 701,
    "aggregate independent row coverage drifted"
  );
  invariant(aggregate.coverage.acceptedAnswerForms.total === 1896, "accepted-answer review count drifted");
  invariant(aggregate.coverage.acceptedAnswerForms.allReviewed, "not every accepted-answer form was reviewed");
  invariant(aggregate.exactDelta.preSha256 === SEMANTIC_REVIEW_CANDIDATE_SHA256, "aggregate preimage drifted");
  invariant(aggregate.exactDelta.postSha256 === FINAL_CANDIDATE_SHA256, "aggregate postimage drifted");
  invariant(
    aggregate.exactDelta.answersAcceptedAnswersOptionsExplanationsUnchangedForAll701,
    "final remediation did not preserve the independently reviewed answers"
  );
  invariant(aggregate.unresolvedIds.length === 0, "aggregate retains unresolved question IDs");

  const semanticRows = shards.flatMap((shard) => shard.rows);
  invariant(semanticRows.length === 701, "semantic shards must contain exactly 701 rows");
  invariant(questionPack.questions.length === 701, "production question pack must contain exactly 701 rows");
  invariant(
    simpleLedger.schemaVersion === "hk-ease-declared-simple-oracle-ledger-v1" &&
      simpleLedger.classification === "declared-simple-generic-grading-boundary" &&
      simpleLedger.strictQuestionCount === 344 &&
      simpleLedger.declaredSimpleQuestionCount === 357,
    "declared-simple ledger header drifted"
  );
  invariant(
    simpleLedger.questionTypeCounts["fill-in"] === 275 &&
      simpleLedger.questionTypeCounts["multiple-choice"] === 80 &&
      simpleLedger.questionTypeCounts["short-answer"] === 2,
    "declared-simple question-type distribution drifted"
  );
  const strictIds = new Set(responseContracts.entries.map((entry) => entry.baseId));
  invariant(strictIds.size === 344, "strict response-contract ID set drifted");
  const simpleById = new Map(simpleLedger.entries.map((entry) => [entry.baseId, entry]));
  invariant(simpleById.size === 357, "declared-simple ledger IDs are not exact and unique");
  const auditById = new Map(responseContractAudit.entries.map((entry) => [entry.baseId, entry]));
  let acceptedAnswerFormCount = 0;
  let multipleChoiceCount = 0;
  let rowSpecificDerivationCount = 0;
  let calculationDifferenceCount = 0;
  let strictNegativeCalculationCount = 0;

  const questions = initial.questions.map((initialRow, index) => {
    const semanticRow = semanticRows[index];
    const productionQuestion = questionPack.questions[index];
    const canonicalQuestion = canonicalQuestionPack.questions[index];
    invariant(initialRow.index === index, `initial row ${index} index drifted`);
    invariant(/^hk-ease-\d+$/.test(initialRow.id), `${initialRow.id} is not a base EASE ID`);
    invariant(initialRow.mathStatus === "pass", `${initialRow.id} lacks an independent math pass`);
    invariant(semanticRow?.index === index, `${initialRow.id} semantic index drifted`);
    invariant(semanticRow?.id === initialRow.id, `${initialRow.id} semantic ID drifted`);
    rowInvariant(
      productionQuestion?.id === initialRow.id,
      "QUESTION_ORDER",
      productionQuestion ?? ({ id: initialRow.id } as ProductionQuestionEvidence),
      "id",
      `${initialRow.id} production-pack order drifted`
    );
    rowInvariant(
      canonicalQuestion?.id === initialRow.id,
      "QUESTION_ORDER",
      productionQuestion,
      "id",
      `${initialRow.id} canonical package order drifted`
    );
    assertSemanticChecks(semanticRow);

    rowInvariant(
      productionQuestion.promptEn === canonicalQuestion.promptEn,
      "PROMPT_DRIFT",
      productionQuestion,
      "promptEn",
      `${initialRow.id} English prompt drifted from the SHA-bound candidate`
    );
    rowInvariant(
      productionQuestion.promptZh === canonicalQuestion.promptZh,
      "PROMPT_DRIFT",
      productionQuestion,
      "promptZh",
      `${initialRow.id} Chinese prompt drifted from the SHA-bound candidate`
    );
    rowInvariant(
      JSON.stringify(productionQuestion.optionsEn) === JSON.stringify(canonicalQuestion.optionsEn) &&
        JSON.stringify(productionQuestion.optionsZh) === JSON.stringify(canonicalQuestion.optionsZh),
      "OPTION_DRIFT",
      productionQuestion,
      "optionsEn/optionsZh",
      `${initialRow.id} options drifted from the SHA-bound bilingual candidate`
    );

    const independentlyReviewedAnswer = canonicalAnswerFor(semanticRow);
    if (productionQuestion.answer !== independentlyReviewedAnswer) {
      const answerFailureCode = productionQuestion.answer === initialRow.independentAnswer &&
        initialRow.independentAnswer !== independentlyReviewedAnswer
        ? "METHOD_OR_FORMAT_DRIFT"
        : /(?:cm|mm|kg|ml|km|°|%|unit|單位)/i.test(productionQuestion.answer) ||
            /(?:cm|mm|kg|ml|km|°|%|unit|單位)/i.test(independentlyReviewedAnswer)
          ? "UNIT_OR_DIMENSION_DRIFT"
          : "ANSWER_DRIFT";
      oracleFailure(
        answerFailureCode,
        `${initialRow.id} production answer differs from the independent semantic review`,
        productionQuestion.id,
        "answer"
      );
    }
    const acceptedAnswers = productionQuestion.acceptedAnswers;
    rowInvariant(
      Array.isArray(acceptedAnswers) && acceptedAnswers.length > 0,
      "ACCEPTED_ANSWER_DRIFT",
      productionQuestion,
      "acceptedAnswers",
      `${initialRow.id} has no accepted answers`
    );
    acceptedAnswerFormCount += acceptedAnswers.length;
    rowInvariant(
      JSON.stringify(acceptedAnswers) === JSON.stringify(canonicalQuestion.acceptedAnswers),
      "ACCEPTED_ANSWER_DRIFT",
      productionQuestion,
      "acceptedAnswers",
      `${initialRow.id} accepted answers drifted from the SHA-bound candidate`
    );
    if (semanticRow.acceptedAnswers) {
      rowInvariant(
        JSON.stringify(semanticRow.acceptedAnswers) === JSON.stringify(acceptedAnswers),
        "ACCEPTED_ANSWER_DRIFT",
        productionQuestion,
        "acceptedAnswers",
        `${initialRow.id} accepted answers differ from row-specific review evidence`
      );
      const acceptedCheck = semanticRow.checks.acceptedAnswers as { formsChecked?: unknown } | undefined;
      invariant(acceptedCheck?.formsChecked === acceptedAnswers.length, `${initialRow.id} accepted-form review count drifted`);
    } else {
      rowInvariant(
        semanticRow.acceptedAnswerFormCount === acceptedAnswers.length,
        "ACCEPTED_ANSWER_DRIFT",
        productionQuestion,
        "acceptedAnswers",
        `${initialRow.id} accepted-form review count drifted`
      );
      rowInvariant(
        semanticRow.acceptedAnswersSha256 === sha256(JSON.stringify(acceptedAnswers)),
        "ACCEPTED_ANSWER_DRIFT",
        productionQuestion,
        "acceptedAnswers",
        `${initialRow.id} accepted-answer payload drifted from independent evidence`
      );
      // The semantic review predates 14 independently approved prompt/title-only
      // repairs. Those rows are bound by the final pack SHA and the aggregate's
      // exact answer/accepted/options/explanation preservation assertion; never
      // claim the older whole-object fingerprint still describes the postimage.
    }

    if (productionQuestion.type === "multiple-choice") {
      multipleChoiceCount += 1;
      const adjudication = semanticRow.multipleChoiceAdjudication;
      const aChecks = semanticRow.checks.multipleChoiceOptions as Record<string, unknown> | undefined;
      const correctIndex = adjudication?.correctOptionIndexZeroBased ??
        (aChecks?.uniqueCorrectIndexZeroBased as number | undefined);
      const correctEn = adjudication?.correctOptionEn ??
        ((aChecks?.optionsEn as string[] | undefined)?.[correctIndex ?? -1]);
      const correctZh = adjudication?.correctOptionZh ??
        ((aChecks?.optionsZh as string[] | undefined)?.[correctIndex ?? -1]);
      invariant(Number.isInteger(correctIndex), `${initialRow.id} lacks an independently adjudicated MC index`);
      rowInvariant(
        correctIndex! >= 0 &&
          correctIndex! < productionQuestion.optionsEn.length &&
          productionQuestion.optionsEn.length === productionQuestion.optionsZh.length,
        "OPTION_DRIFT",
        productionQuestion,
        "optionsEn/optionsZh",
        `${initialRow.id} MC option alignment drifted`
      );
      rowInvariant(
        productionQuestion.optionsEn[correctIndex!] === correctEn &&
          productionQuestion.optionsZh[correctIndex!] === correctZh,
        "OPTION_DRIFT",
        productionQuestion,
        "optionsEn/optionsZh",
        `${initialRow.id} independently adjudicated correct MC option drifted`
      );
      invariant(
        adjudication
          ? adjudication.englishChoiceUniquelyCorrect === true && adjudication.chineseChoiceUniquelyCorrect === true
          : aChecks?.pass === true,
        `${initialRow.id} lacks an EN/ZH uniquely-correct MC adjudication`
      );
    }

    const independentCalculationAnswer = nonBlank(
      initialRow.independentAnswer,
      `${initialRow.id}.independentCalculationAnswer`
    );
    const differsFromReviewedAnswer = independentCalculationAnswer !== independentlyReviewedAnswer;
    const auditEntry = auditById.get(initialRow.id);
    const calculationIsStrictNegative = Boolean(
      differsFromReviewedAnswer &&
        auditEntry?.negativeProbes?.some((probe) => probe.input === independentCalculationAnswer)
    );
    if (differsFromReviewedAnswer) calculationDifferenceCount += 1;
    if (calculationIsStrictNegative) strictNegativeCalculationCount += 1;

    const rowSpecificDerivation = Boolean(semanticRow.independentSolutionBasis);
    if (rowSpecificDerivation) rowSpecificDerivationCount += 1;
    const reviewMethodClassification = rowSpecificDerivation
      ? "row-specific-independent-derivation"
      : nonBlank(semanticRow.reviewBasis, `${initialRow.id}.reviewMethodClassification`);

    const simpleEntry = simpleById.get(initialRow.id);
    if (strictIds.has(initialRow.id)) {
      invariant(!simpleEntry, `${initialRow.id} appears in both strict and declared-simple sets`);
    } else {
      invariant(simpleEntry, `${initialRow.id} is missing from the declared-simple ledger`);
      invariant(simpleEntry.type === productionQuestion.type, `${initialRow.id} simple-ledger type drifted`);
      invariant(
        simpleEntry.independentCalculationAnswer === independentCalculationAnswer &&
          simpleEntry.independentlyReviewedAnswer === independentlyReviewedAnswer &&
          Boolean(simpleEntry.typedNegativeResponse.trim()) &&
          Boolean(simpleEntry.typedNegativeKind.trim()) &&
          Boolean(simpleEntry.independentlyWrongBasis.trim()) &&
          !/^_*incorrect_*$/i.test(simpleEntry.typedNegativeResponse.trim()),
        `${initialRow.id} simple-ledger answer or typed-negative drifted`
      );
      const forbiddenNegativeValues = new Set([
        independentCalculationAnswer,
        independentlyReviewedAnswer,
        ...acceptedAnswers
      ]);
      if (productionQuestion.type === "multiple-choice") {
        const adjudication = semanticRow.multipleChoiceAdjudication;
        const aChecks = semanticRow.checks.multipleChoiceOptions as Record<string, unknown> | undefined;
        const correctIndex = adjudication?.correctOptionIndexZeroBased ??
          (aChecks?.uniqueCorrectIndexZeroBased as number | undefined);
        forbiddenNegativeValues.add(productionQuestion.optionsEn[correctIndex ?? -1] ?? "");
        forbiddenNegativeValues.add(productionQuestion.optionsZh[correctIndex ?? -1] ?? "");
      }
      invariant(
        !forbiddenNegativeValues.has(simpleEntry.typedNegativeResponse),
        `${initialRow.id} typed negative is independently reviewed as correct`
      );
    }

    return {
      index,
      baseId: initialRow.id,
      independentCalculationAnswer,
      independentlyReviewedAnswer,
      independentCalculationPurpose: "mathematical-cross-check-not-grading-submission" as const,
      differsFromReviewedAnswer,
      calculationIsStrictNegative,
      rowSpecificDerivation,
      independentDerivation: rowSpecificDerivation ? semanticRow.independentSolutionBasis : null,
      reviewMethodClassification,
      acceptedAnswerFormCount: acceptedAnswers.length,
      acceptedAnswersSha256: sha256(JSON.stringify(acceptedAnswers)),
      questionObjectSha256: sha256(JSON.stringify(productionQuestion)),
      mathStatus: "pass" as const,
      reviewer: nonBlank(initialRow.reviewer, `${initialRow.id}.reviewer`),
      reviewArtifact: `semantic-shard-${index < 234 ? "a" : index < 468 ? "b" : "c"}`
    };
  });

  invariant(new Set(questions.map((row) => row.baseId)).size === 701, "derived oracle IDs are not unique");
  invariant(calculationDifferenceCount === 165, "the independent calculation/full-response distinction drifted");
  invariant(strictNegativeCalculationCount === 62, "the exact strict-negative calculation relationship drifted");
  invariant(rowSpecificDerivationCount === 234, "row-specific derivation coverage drifted");
  invariant(multipleChoiceCount === 90, "bilingual MC review coverage drifted");
  invariant(acceptedAnswerFormCount === 1896, "accepted-answer form review coverage drifted");
  const payloadSha256 = sha256(JSON.stringify(questionPack.questions));
  if (payloadSha256 !== FINAL_CANDIDATE_QUESTION_PAYLOAD_SHA256) {
    const firstProductionQuestion = questionPack.questions.find((productionQuestion, index) => {
      const initialRow = initial.questions[index];
      const semanticRow = semanticRows[index];
      if (!initialRow || !semanticRow || productionQuestion.id !== initialRow.id) return true;
      const independentlyReviewedAnswer = canonicalAnswerFor(semanticRow);
      const expectedAcceptedAnswers = semanticRow.acceptedAnswers;
      const acceptedAnswersDrifted = expectedAcceptedAnswers
        ? JSON.stringify(productionQuestion.acceptedAnswers) !== JSON.stringify(expectedAcceptedAnswers)
        : semanticRow.acceptedAnswersSha256 !== sha256(JSON.stringify(productionQuestion.acceptedAnswers));
      const correctIndex = productionQuestion.type === "multiple-choice"
        ? semanticRow.multipleChoiceAdjudication?.correctOptionIndexZeroBased ??
          ((semanticRow.checks.multipleChoiceOptions as Record<string, unknown> | undefined)
            ?.uniqueCorrectIndexZeroBased as number | undefined)
        : undefined;
      const correctOptionDrifted = Number.isInteger(correctIndex) && (
        productionQuestion.optionsEn[correctIndex!] !==
          (semanticRow.multipleChoiceAdjudication?.correctOptionEn ??
            ((semanticRow.checks.multipleChoiceOptions as Record<string, unknown> | undefined)
              ?.optionsEn as string[] | undefined)?.[correctIndex!]) ||
        productionQuestion.optionsZh[correctIndex!] !==
          (semanticRow.multipleChoiceAdjudication?.correctOptionZh ??
            ((semanticRow.checks.multipleChoiceOptions as Record<string, unknown> | undefined)
              ?.optionsZh as string[] | undefined)?.[correctIndex!])
      );
      return productionQuestion.answer !== independentlyReviewedAnswer || acceptedAnswersDrifted || correctOptionDrifted;
    });
    oracleFailure(
      "QUESTION_PAYLOAD_DRIFT",
      "production question payload drifted from the approved final candidate",
      firstProductionQuestion?.id ?? null,
      "questions"
    );
  }

  const evidenceArtifacts = Object.entries(HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH)
    .map(([path, artifactSha256]) => ({ path, sha256: artifactSha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const pathSortedAggregate = evidenceArtifacts
    .map((artifact) => `${artifact.sha256}  ${artifact.path}\n`)
    .join("");
  const orderedBaseIdSha256 = sha256(JSON.stringify(questions.map((row) => row.baseId)));
  const independentCalculationPayloadSha256 = sha256(
    JSON.stringify(questions.map((row) => [row.baseId, row.independentCalculationAnswer]))
  );
  const independentlyReviewedAnswerPayloadSha256 = sha256(
    JSON.stringify(questions.map((row) => [row.baseId, row.independentlyReviewedAnswer]))
  );
  invariant(orderedBaseIdSha256 === ORDERED_BASE_ID_SHA256, "ordered base-ID payload drifted");
  invariant(
    independentCalculationPayloadSha256 === INDEPENDENT_CALCULATION_PAYLOAD_SHA256,
    "independent calculation payload drifted"
  );
  invariant(
    independentlyReviewedAnswerPayloadSha256 === INDEPENDENTLY_REVIEWED_ANSWER_PAYLOAD_SHA256,
    "independently reviewed answer payload drifted"
  );

  return {
    schemaVersion: "hk-ease-independent-answer-oracle-v3",
    status: aggregate.verdict,
    derivation:
      "initial independent calculations joined by exact index and base ID to independently reviewed semantic-shard canonical answers; shard A supplies 234 row-specific derivations, while shards B/C supply 467 explicitly weaker review-method classifications (not row-specific derivations)",
    candidateSha256: FINAL_CANDIDATE_SHA256,
    semanticReviewCandidateSha256: SEMANTIC_REVIEW_CANDIDATE_SHA256,
    reviewedQuestionCount: 701,
    mathPassCount: 701,
    canonicalAnswerReviewCount: 701,
    acceptedAnswerFormsReviewed: 1896,
    evidenceArtifacts,
    evidencePathSortedAggregateSha256: sha256(pathSortedAggregate),
    orderedBaseIdSha256,
    independentCalculationPayloadSha256,
    independentlyReviewedAnswerPayloadSha256,
    calculationDifferenceCount,
    strictNegativeCalculationCount,
    rowSpecificDerivationCount,
    reviewMethodClassificationCount: 467,
    multipleChoiceReviewCount: multipleChoiceCount,
    acceptedAnswerFormCount,
    declaredSimpleQuestionCount: simpleById.size,
    questions
  };
}

export function buildHongKongEaseIndependentOracle() {
  const questionPackBytes = evidenceBytes(questionPackPath);
  invariant(sha256(questionPackBytes) === FINAL_CANDIDATE_SHA256, "production question-pack SHA-256 drifted");
  const questionPack = JSON.parse(questionPackBytes.toString("utf8")) as {
    questions: ProductionQuestionEvidence[];
  };
  return validateHongKongEaseIndependentCandidate(questionPack);
}
