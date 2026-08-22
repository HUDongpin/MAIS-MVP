import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
// These are real imports, not source-text probes: loading this canonical test
// entrypoint registers each focused suite with node:test, while the exported
// identifiers give one fail-closed topology ledger.
import {
  HONG_KONG_DISPLAYED74_HISTORY_PROVENANCE_SUITE_ID
} from "./hongKongDisplayed74HistoryProvenance.test";
import {
  HONG_KONG_DISPLAYED74_CONTENT_CONTRACT_SUITE_ID
} from "./hongKongDisplayed74ContentContract.test";
import {
  HONG_KONG_DISPLAYED74_FIGURE_HISTORY_SUITE_ID
} from "./hongKongDisplayed74FigureHistoryContract.test";
import {
  HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_SUITE_ID
} from "./server/hongKongDisplayed74ResponseContracts.test";
import {
  HONG_KONG_QUESTION_VERSIONING_CONTRACT_SUITE_ID
} from "./hongKongQuestionVersioning.test";
import {
  HONG_KONG_HISTORICAL_QUESTION_PROJECTION_CONTRACT_SUITE_ID
} from "./server/hongKongHistoricalQuestionProjection.test";
import {
  assertHongKongDisplayed74FocusedTestLedger
} from "./hongKongDisplayed74FocusedTestLedger";
import {
  HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID
} from "./hongKongResidual47RepairContract.test";
import {
  assertHongKongResidual47FocusedTestLedger
} from "./hongKongResidual47FocusedTestLedger";
import {
  HONG_KONG_EASE_RESPONSE_CONTRACT_SUITE_ID
} from "./server/hongKongEaseResponseContracts.test";
import {
  HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256,
  HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,
  hongKongEasePracticeQuestionGenerationMetadata,
  hongKongEasePracticeQuestions,
  independentHongKongEasePracticeAnswer
} from "../data/hongKongEasePracticeQuestions";
import independentHongKongEaseOracleJson from "../data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json";
import exact3OracleOverlayJson from "../data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json";
import questionPackJson from "../data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
import declaredSimpleLedgerJson from "../coordination/content-qa/authoritative/hk-ease-701-independent-oracle/declared-simple-ledger.json";
import { productionLessonByTopicId } from "../data/lessons";
import { activeHongKongQuestionIdByHistoricalId, questions } from "../data/questions";
import { topics } from "../data/topics";
import { contentMatchesCurriculumProfile } from "./curriculumProfile";
import { selectLessonPracticeQuestions } from "./practiceQuestionDeduping";
import { questionAnswerMatches } from "./server/answerMatching";
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
  expectedUnitedStatesFloridaMiddleSchoolQuestionCount,
  hkIndependentAnswersById
} from "./questionBankSolvability";

const expectedDisplayed74FocusedSuiteIds = [
  "hk-displayed74-history-provenance-v1",
  "hk-displayed74-content-contract-v1",
  "hk-displayed74-figure-history-contract-v1",
  "hk-displayed74-response-contract-v1",
  "hk-question-versioning-contract-v1",
  "hk-historical-question-projection-contract-v1"
] as const;

const registeredDisplayed74FocusedSuiteIds = [
  HONG_KONG_DISPLAYED74_HISTORY_PROVENANCE_SUITE_ID,
  HONG_KONG_DISPLAYED74_CONTENT_CONTRACT_SUITE_ID,
  HONG_KONG_DISPLAYED74_FIGURE_HISTORY_SUITE_ID,
  HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_SUITE_ID,
  HONG_KONG_QUESTION_VERSIONING_CONTRACT_SUITE_ID,
  HONG_KONG_HISTORICAL_QUESTION_PROJECTION_CONTRACT_SUITE_ID
] as const;

function shellWords(command: string) {
  return command.trim().split(/\s+/).filter(Boolean);
}

function directNodeTestEntries(command: string) {
  const words = shellWords(command);
  const entries: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    if (words[index] !== "node" || words[index + 1] !== "--test") continue;
    for (let cursor = index + 2; cursor < words.length && words[cursor] !== "&&"; cursor += 1) {
      if (words[cursor].endsWith(".test.js")) entries.push(words[cursor]);
    }
  }
  return entries;
}

function npmRunTargets(command: string) {
  const words = shellWords(command);
  const targets: string[] = [];
  for (let index = 0; index < words.length - 2; index += 1) {
    if (words[index] === "npm" && words[index + 1] === "run") targets.push(words[index + 2]);
  }
  return targets;
}

test("canonical question-bank command registers every displayed-74 repair contract test exactly once", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  assert.deepEqual(
    [...registeredDisplayed74FocusedSuiteIds].sort(),
    [...expectedDisplayed74FocusedSuiteIds].sort(),
    "the canonical module graph must load the exact six displayed-74 repair suites"
  );
  assert.equal(
    new Set(registeredDisplayed74FocusedSuiteIds).size,
    expectedDisplayed74FocusedSuiteIds.length
  );
  assertHongKongDisplayed74FocusedTestLedger(registeredDisplayed74FocusedSuiteIds);
  assert.equal(
    HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID,
    "hk-residual47-repair-contract-v1"
  );
  assertHongKongResidual47FocusedTestLedger(
    HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID
  );
  assert.equal(
    HONG_KONG_EASE_RESPONSE_CONTRACT_SUITE_ID,
    "hong-kong-ease-response-contracts-exact7-v1"
  );

  const evidenceRunnerEntry = "coordination/content-qa/hk-question-bank-evidence-runner.mjs";
  const focusedDirectEntrySuffixes = [
    "/lib/hongKongDisplayed74HistoryProvenance.test.js",
    "/lib/hongKongDisplayed74ContentContract.test.js",
    "/lib/hongKongDisplayed74FigureHistoryContract.test.js",
    "/lib/server/hongKongDisplayed74ResponseContracts.test.js",
    "/lib/hongKongQuestionVersioning.test.js",
    "/lib/server/hongKongHistoricalQuestionProjection.test.js",
    "/lib/hongKongResidual47RepairContract.test.js",
    "/lib/server/hongKongEaseResponseContracts.test.js"
  ];
  const isFocusedDirectEntry = (entry: string) =>
    focusedDirectEntrySuffixes.some((suffix) => `/${entry}`.endsWith(suffix));
  const questionBankEntries = directNodeTestEntries(scripts["test:question-bank"] ?? "");
  assert.equal(
    shellWords(scripts["test:question-bank"] ?? "")
      .filter((entry) => entry === evidenceRunnerEntry).length,
    1,
    "test:question-bank must execute the unique evidence runner exactly once"
  );
  assert.equal(
    scripts["test:question-bank"],
    `node ${evidenceRunnerEntry}`,
    "test:question-bank must not retain a direct CLI or fixed shared .tmp bypass"
  );
  assert.deepEqual(questionBankEntries, [], "test:question-bank must not launch direct test workers");

  const evidenceRunnerOwners = Object.entries(scripts)
    .filter(([, command]) => shellWords(command).includes(evidenceRunnerEntry))
    .map(([scriptName]) => scriptName);
  assert.deepEqual(evidenceRunnerOwners, ["test:question-bank"]);
  const directFocusedOwners = Object.entries(scripts)
    .flatMap(([scriptName, command]) => directNodeTestEntries(command)
      .filter(isFocusedDirectEntry)
      .map((entry) => `${scriptName}:${entry}`));
  assert.deepEqual(directFocusedOwners, [], "no package script may launch a focused suite as a second worker");

  assert.equal(
    npmRunTargets(scripts.check ?? "").filter((target) => target === "test:question-bank").length,
    1,
    "default check must reach the displayed-74 gate through test:question-bank exactly once"
  );
  assert.equal(npmRunTargets(scripts["qa:full-question-bank"] ?? "").includes("test:question-bank"), false);
  assert.equal(npmRunTargets(scripts["test:question-figure"] ?? "").includes("test:question-bank"), false);
  assert.equal(shellWords(scripts["qa:full-question-bank"] ?? "").includes(evidenceRunnerEntry), false);
  assert.equal(shellWords(scripts["test:question-figure"] ?? "").includes(evidenceRunnerEntry), false);
  assert.equal(Object.values(scripts).some((command) => command.includes(".tmp/question-bank-tests")), false);
  assert.equal(Object.values(scripts).some((command) => command.includes(".tmp/question-bank-db")), false);
});

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
  assert.equal(report.summary.batchCounts["hk-ease-practice-v2"], expectedHongKongEasePracticeQuestionCount);
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

test("Hong Kong EASE Practice V2 exposes the exact fail-closed candidate and separate independent oracle", () => {
  type IndependentOracleBuilder = {
    buildHongKongEaseIndependentOracle: () => unknown;
    validateHongKongEaseIndependentCandidate: (candidate: unknown) => unknown;
    HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH: Readonly<Record<string, string>>;
    HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH: Readonly<Record<string, string>>;
  };
  type IndependentOracleRow = {
    index: number;
    baseId: string;
    independentCalculationAnswer: string;
    independentlyReviewedAnswer: string;
    independentCalculationPurpose: string;
    differsFromReviewedAnswer: boolean;
    calculationIsStrictNegative: boolean;
    rowSpecificDerivation: boolean;
    independentDerivation: string | null;
    reviewMethodClassification: string;
    acceptedAnswerFormCount: number;
    acceptedAnswersSha256: string;
    questionObjectSha256: string;
    reviewArtifact: string;
  };
  const independentOracle = independentHongKongEaseOracleJson as {
    schemaVersion: string;
    candidateSha256: string;
    reviewedQuestionCount: number;
    mathPassCount: number;
    canonicalAnswerReviewCount: number;
    acceptedAnswerFormsReviewed: number;
    calculationDifferenceCount: number;
    strictNegativeCalculationCount: number;
    rowSpecificDerivationCount: number;
    reviewMethodClassificationCount: number;
    multipleChoiceReviewCount: number;
    acceptedAnswerFormCount: number;
    declaredSimpleQuestionCount: number;
    evidenceArtifacts: Array<{ path: string; sha256: string }>;
    questions: IndependentOracleRow[];
  };
  let independentOracleBuilder: IndependentOracleBuilder | undefined;

  assert.equal(independentOracle.schemaVersion, "hk-ease-independent-answer-oracle-v3");
  assert.equal(
    createHash("sha256")
      .update(
        readFileSync(
          join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json")
        )
      )
      .digest("hex"),
    HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,
    "the package-bound independent oracle bytes drifted"
  );
  assert.equal(independentOracle.candidateSha256, "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2");
  assert.equal(independentOracle.reviewedQuestionCount, 701);
  assert.equal(independentOracle.mathPassCount, 701);
  assert.equal(independentOracle.canonicalAnswerReviewCount, 701);
  assert.equal(independentOracle.acceptedAnswerFormsReviewed, 1896);
  assert.equal(independentOracle.calculationDifferenceCount, 165);
  assert.equal(independentOracle.strictNegativeCalculationCount, 62);
  assert.equal(independentOracle.rowSpecificDerivationCount, 234);
  assert.equal(independentOracle.reviewMethodClassificationCount, 467);
  assert.equal(independentOracle.multipleChoiceReviewCount, 90);
  assert.equal(independentOracle.acceptedAnswerFormCount, 1896);
  assert.equal(independentOracle.declaredSimpleQuestionCount, 357);
  assert.equal(independentOracle.questions.length, 701);
  assert.equal(new Set(independentOracle.questions.map((row) => row.baseId)).size, 701);
  assert.equal(
    independentOracle.questions.filter(
      (row) => row.independentCalculationAnswer !== row.independentlyReviewedAnswer
    ).length,
    165,
    "compact independent calculations must remain distinct from full production-format answers where the task requires method, units, or explanation"
  );
  assert.equal(
    JSON.stringify(independentOracle).includes("productionResponse"),
    false,
    "the independent oracle must not carry a productionResponse field that can be mistaken for independently derived evidence"
  );
  for (const [index, row] of independentOracle.questions.entries()) {
    assert.equal(row.index, index);
    assert.match(row.baseId, /^hk-ease-\d+$/);
    assert.ok(row.independentCalculationAnswer.trim(), `${row.baseId}: missing independent calculation`);
    assert.ok(row.independentlyReviewedAnswer.trim(), `${row.baseId}: missing independently reviewed answer`);
    assert.equal(row.independentCalculationPurpose, "mathematical-cross-check-not-grading-submission");
    if (index < 234) {
      assert.equal(row.rowSpecificDerivation, true);
      assert.ok(row.independentDerivation?.trim(), `${row.baseId}: missing row-specific derivation`);
      assert.equal(row.reviewMethodClassification, "row-specific-independent-derivation");
    } else {
      assert.equal(row.rowSpecificDerivation, false);
      assert.equal(row.independentDerivation, null);
      assert.ok(row.reviewMethodClassification.trim(), `${row.baseId}: missing review-method classification`);
      assert.equal(/row-specific.*derivation/i.test(row.reviewMethodClassification), false);
    }
    assert.match(row.reviewArtifact, /^semantic-shard-[abc]$/);
  }

  assert.doesNotThrow(() => {
    independentOracleBuilder = require("./hongKongEaseIndependentOracle") as IndependentOracleBuilder;
  }, "the package must include a self-contained builder for the independent EASE oracle");
  assert.ok(independentOracleBuilder);
  assert.deepEqual(
    independentOracleBuilder.buildHongKongEaseIndependentOracle(),
    independentOracle,
    "the checked-in oracle must be exactly reproducible from the package-local independent review evidence"
  );
  assert.deepEqual(
    Object.fromEntries(independentOracle.evidenceArtifacts.map((artifact) => [artifact.path, artifact.sha256])),
    independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH
  );
  for (const [relativePath, expectedSha256] of Object.entries(
    independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH
  )) {
    assert.equal(
      createHash("sha256").update(readFileSync(join(
          process.cwd(),
          independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[relativePath] ?? relativePath
        ))).digest("hex"),
      expectedSha256,
      `${relativePath}: independent evidence bytes drifted`
    );
  }

  const exact3Overlay = exact3OracleOverlayJson as {
    schemaVersion: string;
    status: string;
    orderedBaseIds: string[];
    rowCount: number;
    aggregateExpectations: {
      acceptedAnswerFormsReviewed: number;
      calculationDifferenceCount: number;
      strictNegativeCalculationCount: number;
    };
    questions: Array<{ baseId: string; independentlyReviewedAnswer: string }>;
  };
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json")))
      .digest("hex"),
    HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256
  );
  assert.equal(exact3Overlay.schemaVersion, "hk-ease-exact3-phase2b-independent-answer-oracle-overlay-supplement-v2");
  assert.equal(exact3Overlay.status, "candidate-overlay-approved-not-live-promotion");
  assert.deepEqual(exact3Overlay.orderedBaseIds, ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  assert.equal(exact3Overlay.rowCount, 3);
  assert.equal(exact3Overlay.aggregateExpectations.acceptedAnswerFormsReviewed, 1912);
  assert.equal(exact3Overlay.aggregateExpectations.calculationDifferenceCount, 167);
  assert.equal(exact3Overlay.aggregateExpectations.strictNegativeCalculationCount, 64);
  const exact3OverlayById = new Map(
    exact3Overlay.questions.map((row) => [row.baseId, row])
  );

  const declaredSimpleLedger = declaredSimpleLedgerJson as {
    entries: Array<{
      baseId: string;
      typedNegativeResponse: string;
      typedNegativeKind: string;
      independentlyWrongBasis: string;
    }>;
  };
  const candidateQuestions = (questionPackJson as unknown as {
    questions: Array<{
      id: string;
      answer: string;
      acceptedAnswers: string[];
      optionsEn: string[];
      optionsZh: string[];
    }>;
  }).questions;
  const candidateById = new Map(candidateQuestions.map((question) => [question.id, question]));
  assert.equal(declaredSimpleLedger.entries.length, 357);
  for (const entry of declaredSimpleLedger.entries) {
    const question = candidateById.get(entry.baseId);
    assert.ok(question, `${entry.baseId}: missing declared-simple candidate`);
    assert.ok(entry.typedNegativeKind.trim(), `${entry.baseId}: missing typed-negative kind`);
    assert.ok(entry.independentlyWrongBasis.trim(), `${entry.baseId}: missing independent wrongness basis`);
    assert.equal(/^_*incorrect_*$/i.test(entry.typedNegativeResponse.trim()), false);
    assert.equal(question.acceptedAnswers.includes(entry.typedNegativeResponse), false);
    assert.equal(
      questionAnswerMatches(
        {
          id: activeHongKongQuestionIdByHistoricalId.get(entry.baseId) ?? entry.baseId,
          answer: question.answer,
          accepted_answers: question.acceptedAnswers,
          options: question.optionsEn.map((en, index) => ({ en, zh: question.optionsZh[index] ?? "" }))
        },
        entry.typedNegativeResponse
      ),
      false,
      `${entry.baseId}: typed mathematical/structural negative must fail production grading`
    );
  }
  assert.equal(
    declaredSimpleLedger.entries.find((entry) => entry.baseId === "hk-ease-177")?.typedNegativeResponse,
    "Only I and II"
  );
  assert.equal(
    declaredSimpleLedger.entries.find((entry) => entry.baseId === "hk-ease-568")?.typedNegativeResponse,
    "Only I and III"
  );

  const v3PreimageLogicalPath = "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
  const v3PreimagePhysicalPath =
    independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[v3PreimageLogicalPath] ??
    v3PreimageLogicalPath;
  const immutableV3QuestionPackJson = JSON.parse(
    readFileSync(join(process.cwd(), v3PreimagePhysicalPath), "utf8")
  );
  const cloneCandidate = () => structuredClone(immutableV3QuestionPackJson) as unknown as {
    questions: Array<Record<string, unknown> & {
      id: string;
      answer: string;
      acceptedAnswers: string[];
      optionsEn: string[];
      promptEn: string;
      explanationEn: string;
    }>;
  };
  const expectCandidateMutationToFail = (
    expected: { code: string; baseId: string | null; field: string | null },
    mutate: (candidate: ReturnType<typeof cloneCandidate>) => void
  ) => {
    const candidate = cloneCandidate();
    mutate(candidate);
    let failure: unknown;
    try {
      independentOracleBuilder?.validateHongKongEaseIndependentCandidate(candidate);
    } catch (error) {
      failure = error;
    }
    assert.ok(failure instanceof Error, `${expected.code}: mutation did not fail`);
    const typedFailure = failure as Error & { code?: string; baseId?: string | null; field?: string | null };
    assert.equal(typedFailure.code, expected.code);
    assert.equal(typedFailure.baseId, expected.baseId);
    assert.equal(typedFailure.field, expected.field);
  };
  expectCandidateMutationToFail({ code: "ANSWER_DRIFT", baseId: "hk-ease-10629", field: "answer" }, (candidate) => {
    candidate.questions[0].answer = "246";
  });
  expectCandidateMutationToFail(
    { code: "ACCEPTED_ANSWER_DRIFT", baseId: "hk-ease-10629", field: "acceptedAnswers" },
    (candidate) => {
    candidate.questions[0].acceptedAnswers.push("999999");
    }
  );
  expectCandidateMutationToFail(
    { code: "OPTION_DRIFT", baseId: "hk-ease-10589", field: "optionsEn/optionsZh" },
    (candidate) => {
    const question = candidate.questions.find((row) => row.id === "hk-ease-10589");
    assert.ok(question);
    question.optionsEn[0] = "Square B";
    }
  );
  expectCandidateMutationToFail({ code: "PROMPT_DRIFT", baseId: "hk-ease-10629", field: "promptEn" }, (candidate) => {
    candidate.questions[0].promptEn += " Wrong extra condition.";
  });
  expectCandidateMutationToFail({ code: "UNIT_OR_DIMENSION_DRIFT", baseId: "hk-ease-10565", field: "answer" }, (candidate) => {
    const question = candidate.questions.find((row) => row.id === "hk-ease-10565");
    assert.ok(question);
    question.answer = "36 kg";
  });
  expectCandidateMutationToFail({ code: "METHOD_OR_FORMAT_DRIFT", baseId: "hk-ease-54", field: "answer" }, (candidate) => {
    const question = candidate.questions.find((row) => row.id === "hk-ease-54");
    assert.ok(question);
    question.answer = "H.C.F. = 4; L.C.M. = 120";
  });
  expectCandidateMutationToFail({ code: "QUESTION_PAYLOAD_DRIFT", baseId: null, field: "questions" }, (candidate) => {
    candidate.questions[0].explanationEn += " Unreviewed text.";
  });
  assert.throws(
    () => independentHongKongEasePracticeAnswer({ id: "hk-ease-999999-v2" } as never),
    /missing HK EASE independent-oracle metadata/
  );

  assert.equal(hongKongEasePracticeQuestions.length, expectedHongKongEasePracticeQuestionCount);
  assert.equal(Object.keys(hongKongEasePracticeQuestionGenerationMetadata).length, expectedHongKongEasePracticeQuestionCount);

  const ids = new Set(hongKongEasePracticeQuestions.map((question) => question.id));
  assert.equal(ids.size, hongKongEasePracticeQuestions.length);

  for (const [index, question] of hongKongEasePracticeQuestions.entries()) {
    const metadata = hongKongEasePracticeQuestionGenerationMetadata[question.id];
    const oracleRow = independentOracle.questions[index];
    const exact3OverlayRow = exact3OverlayById.get(question.id);
    const expectedReviewedAnswer = exact3OverlayRow?.independentlyReviewedAnswer ?? oracleRow?.independentlyReviewedAnswer;
    assert.ok(metadata, `${question.id} should have EASE QA metadata`);
    assert.equal(oracleRow?.baseId, question.id);
    assert.equal(expectedReviewedAnswer, question.answer);
    assert.equal(question.curriculumTrack, "HK");
    assert.equal(question.region, "HK");
    assert.equal(question.publisher, undefined);
    assert.equal(question.questionAssets, undefined);
    assert.equal(metadata.sourceDistanceStatus, "repaired-from-ease-source-v2-pending-final-source-distance-review");
    assert.equal(metadata.mathQaStatus, "pending-cross-review");
    assert.equal(metadata.answerQaStatus, "pending-production-grader-validation");
    assert.equal(metadata.assetQaStatus, "text-only");
    assert.equal(metadata.manualQaStatus, "candidate-a18-independent-semantic-review-v2");
    assert.equal(
      metadata.independentOracleStatus,
      "approved-for-integration-review-semantic-content-boundary+exact3-independent-overlay-v2"
    );
    assert.equal(metadata.independentlyReviewedAnswer, expectedReviewedAnswer);
    assert.ok(metadata.independentCalculationAnswer.trim());
    assert.equal(metadata.independentCalculationAnswer, oracleRow.independentCalculationAnswer);
    assert.ok(
      question.acceptedAnswers?.includes(metadata.independentlyReviewedAnswer) ||
        question.answer === metadata.independentlyReviewedAnswer
    );
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }));
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_EPH_MIF" }));
  }
});

test("all 51 HK lessons display five unique questions covered by the independent oracle", () => {
  const hkTopics = topics.filter((topic) => topic.curriculumTrack === "HK");
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const auditRowById = new Map(
    buildFullQuestionBankSolvabilityAudit("2026-08-09").rows
      .filter((row) => row.curriculumTrack === "HK")
      .map((row) => [row.questionId, row])
  );
  const independentAnswers = hkIndependentAnswersById();
  const displayedQuestionIds: string[] = [];

  assert.equal(hkTopics.length, 51);

  for (const topic of hkTopics) {
    const lesson = productionLessonByTopicId.get(topic.id);
    assert.ok(lesson, `${topic.id}: missing production lesson`);

    const lessonQuestions = lesson.practiceQuestionIds?.length
      ? lesson.practiceQuestionIds.map((questionId) => {
          const question = questionById.get(questionId);
          assert.ok(question, `${topic.id}: linked question ${questionId} is missing`);
          return question;
        })
      : questions.filter((question) => question.curriculumTrack === "HK" && question.topicId === topic.id);
    const selectedQuestions = selectLessonPracticeQuestions(lessonQuestions);

    assert.equal(selectedQuestions.length, 5, `${topic.id}: expected five displayed questions`);

    for (const question of selectedQuestions) {
      assert.ok(question, `${topic.id}: linked question is missing`);
      displayedQuestionIds.push(question.id);
      assert.equal(question.curriculumTrack, "HK", `${question.id}: wrong curriculum track`);
      assert.equal(question.topicId, topic.id, `${question.id}: wrong topic binding`);
      assert.ok(independentAnswers.has(question.id), `${question.id}: missing independent answer`);
      assert.equal(auditRowById.get(question.id)?.status, "pass", `${question.id}: independent audit is not green`);
    }
  }

  assert.equal(displayedQuestionIds.length, 51 * 5);
  assert.equal(new Set(displayedQuestionIds).size, 51 * 5, "displayed HK question IDs must be globally unique");
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
