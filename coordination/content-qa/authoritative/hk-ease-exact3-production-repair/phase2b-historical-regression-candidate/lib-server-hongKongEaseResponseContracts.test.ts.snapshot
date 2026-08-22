import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import questionPackJson from "../../data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
import responseAuditJson from "../../data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json";
import responseManifestJson from "../../data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
import simpleResponseManifestJson from "../../data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";
import hongKongQuestionVersionManifestJson from "../../data/historical/hongKongQuestionVersionManifest.json";
import { questionAnswerMatches } from "./answerMatching";
import {
  HONG_KONG_EASE_SIMPLE_RESPONSE_MANIFEST_SHA256,
  hongKongEaseResponseContractDecision,
  hongKongEaseReviewedSimpleResponseDecision,
  isReviewedSimpleHongKongEaseResponseQuestion,
  isStrictHongKongEaseResponseQuestion,
  reviewedSimpleHongKongEaseResponseEntries,
  validateHongKongEaseReviewedSimpleResponseManifest,
  type ReviewedSimpleResponseManifest
} from "./hongKongEaseResponseContracts";

export const HONG_KONG_EASE_RESPONSE_CONTRACT_SUITE_ID =
  "hong-kong-ease-response-contracts-exact7-v1" as const;
export const HONG_KONG_EASE_RESPONSE_CONTRACT_TEST_NAMES = [
  "the compact EASE response manifest is complete, unique, and fail-closed",
  "all 776 raw and 744 normalized-unique aliases plus 15 fraction-policy positives pass through production grading",
  "all 3236 normalized-unique per-kind independently wrong simple EASE adversarial probes fail closed through production grading",
  "all 584 positive EASE contract probes and all 1912 stored accepted forms pass through production grading",
  "all 581 negative EASE contract probes fail closed through production grading",
  "worked method contracts accept complete audited reasoning and reject corrupt or contradictory work",
  "only the exact active EASE generation inherits its contract and every other known generation fails closed"
] as const;
export const HONG_KONG_EASE_RESPONSE_CONTRACT_TEST_NAME_SHA256 =
  "e6704e246a807d176edcea4dde99c9fc834d4400ee1cee1d6f1a675a47b7107b" as const;

const [
  manifestTestName,
  simplePositiveTestName,
  simpleNegativeTestName,
  positiveProbeTestName,
  negativeProbeTestName,
  workedMethodTestName,
  activeGenerationTestName
] = HONG_KONG_EASE_RESPONSE_CONTRACT_TEST_NAMES;

type Probe = { input: string; expected: "accept" | "reject" };
type AuditEntry = {
  baseId: string;
  positiveProbes: Probe[];
  negativeProbes: Probe[];
};
type CandidateQuestion = {
  id: string;
  answer: string;
  acceptedAnswers: string[];
  optionsEn: string[];
  optionsZh: string[];
};

type Contract = {
  kind: string;
  params: Record<string, unknown>;
};

const responseAudit = responseAuditJson as { entries: AuditEntry[] };
const simpleResponseManifest = simpleResponseManifestJson as unknown as ReviewedSimpleResponseManifest;
const responseManifest = responseManifestJson as {
  schemaVersion: number;
  status: string;
  candidateSha256: string;
  candidateQuestionIdSha256: string;
  auditSha256: string;
  aliasTriageSha256: string;
  failClosedPolicy: string;
  strictContractCount: number;
  positiveProbeCount: number;
  negativeProbeCount: number;
  reviewedExactSurfaceQuestionCount: number;
  reviewedExactSurfaceFormCount: number;
  entries: Array<Contract & { baseId: string }>;
};
const questionPack = questionPackJson as { questions: CandidateQuestion[] };
const questionById = new Map(questionPack.questions.map((question) => [question.id, question]));
const activeIdByHistoricalId = (hongKongQuestionVersionManifestJson as {
  activeIdByHistoricalId: Record<string, string>;
}).activeIdByHistoricalId;

function activeQuestionId(baseId: string) {
  return activeIdByHistoricalId[baseId] ?? baseId;
}

function gradingPayload(question: CandidateQuestion) {
  return {
    id: activeQuestionId(question.id),
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.optionsEn.map((en, index) => ({ en, zh: question.optionsZh[index] ?? "" }))
  };
}

function fileSha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test(manifestTestName, () => {
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(HONG_KONG_EASE_RESPONSE_CONTRACT_TEST_NAMES))
      .digest("hex"),
    HONG_KONG_EASE_RESPONSE_CONTRACT_TEST_NAME_SHA256
  );
  assert.equal(responseManifest.schemaVersion, 1);
  assert.equal(responseManifest.status, "candidate-pending-independent-review");
  assert.equal(responseManifest.candidateSha256, "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf");
  assert.equal(responseManifest.candidateQuestionIdSha256, "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a");
  assert.equal(responseManifest.auditSha256, "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a");
  assert.equal(responseManifest.aliasTriageSha256, "7d18dadbae0e222d3d8db1dd8029bb8389565124121389e18fc8e205601638ce");
  assert.equal(responseManifest.failClosedPolicy, "reject-no-generic-fallback");
  assert.equal(responseManifest.strictContractCount, 344);
  assert.equal(responseManifest.positiveProbeCount, 584);
  assert.equal(responseManifest.negativeProbeCount, 581);
  assert.equal(responseManifest.reviewedExactSurfaceQuestionCount, 56);
  assert.equal(responseManifest.reviewedExactSurfaceFormCount, 136);
  assert.equal(
    fileSha256(join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/question-pack.json")),
    responseManifest.candidateSha256
  );
  assert.equal(
    fileSha256(join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json")),
    responseManifest.auditSha256
  );
  assert.equal(
    createHash("sha256")
      .update(`${questionPack.questions.map((question) => question.id).join("\n")}\n`)
      .digest("hex"),
    responseManifest.candidateQuestionIdSha256
  );
  assert.equal(responseManifest.entries.length, 344);
  assert.equal(new Set(responseManifest.entries.map((entry) => entry.baseId)).size, 344);
  assert.deepEqual(
    responseManifest.entries.map((entry) => entry.baseId),
    responseAudit.entries.map((entry) => entry.baseId)
  );

  const reviewedQuestionIds = new Set<string>();
  let reviewedForms = 0;
  const walk = (contract: Contract, baseId: string) => {
    assert.equal(Object.hasOwn(contract.params, "auditedAcceptedSurfaceForms"), false);
    if (contract.kind === "reviewed-exact-surface-forms") {
      assert.equal(contract.params.reviewArtifactSha256, responseManifest.aliasTriageSha256);
      assert.equal(contract.params.classification, "A-mathematically-valid");
      assert.ok(Array.isArray(contract.params.acceptedSurfaceForms));
      const forms = contract.params.acceptedSurfaceForms as unknown[];
      assert.ok(forms.length > 0);
      assert.ok(forms.every((form) => typeof form === "string" && form.normalize("NFC").trim()));
      assert.equal(new Set(forms.map((form) => (form as string).normalize("NFC").trim())).size, forms.length);
      reviewedQuestionIds.add(baseId);
      reviewedForms += forms.length;
    }
    if (contract.kind === "all-of" || contract.kind === "any-of") {
      assert.ok(Array.isArray(contract.params.contracts));
      for (const nested of contract.params.contracts as Contract[]) walk(nested, baseId);
    }
  };
  for (const entry of responseManifest.entries) walk(entry, entry.baseId);
  assert.equal(reviewedQuestionIds.size, 56);
  assert.equal(reviewedForms, 136);

  assert.equal(
    fileSha256(join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json")),
    HONG_KONG_EASE_SIMPLE_RESPONSE_MANIFEST_SHA256
  );
  const simpleById = validateHongKongEaseReviewedSimpleResponseManifest(simpleResponseManifest);
  const strictIds = new Set(responseManifest.entries.map((entry) => entry.baseId));
  assert.equal(simpleById.size, 357);
  assert.equal([...simpleById.keys()].filter((baseId) => strictIds.has(baseId)).length, 0);
  assert.equal(new Set([...strictIds, ...simpleById.keys()]).size, 701);
  assert.equal(simpleResponseManifest.reviewedSurfaceCount, 776);
  assert.equal(simpleResponseManifest.normalizedUniqueReviewedSurfaceCount, 744);
  assert.equal(simpleResponseManifest.adversarialProbeCount, 3236);
  assert.equal(simpleResponseManifest.normalizedUniqueAdversarialProbeCount, 3236);
  assert.equal(simpleResponseManifest.fractionPolicyPositiveProbeCount, 15);
  assert.deepEqual(simpleResponseManifest.questionTypeCounts, {
    "fill-in": 275,
    "multiple-choice": 80,
    "short-answer": 2
  });
  assert.deepEqual(simpleResponseManifest.taxonomy.counts, {
    "mc-equation": 1,
    "mc-number-pair": 1,
    "mc-scalar": 39,
    "mc-text-or-classification": 39,
    "structured-response": 2,
    "text-boolean": 9,
    "text-direction": 8,
    "text-label": 5,
    "text-qualitative-equality": 3,
    "text-relation-symbol": 16,
    "unitless-decimal": 57,
    "unitless-fraction": 14,
    "unitless-integer": 157,
    "unitless-mixed-number": 4,
    "unitless-ordered-chain": 2
  });
  assert.equal(simpleResponseManifest.taxonomy.multipleChoiceEvidence.languageDifferentCorrectOptionCount, 38);
  assert.equal(simpleResponseManifest.taxonomy.multipleChoiceEvidence.identicalCorrectOptionCount, 42);
  assert.equal(simpleResponseManifest.taxonomy.multipleChoiceEvidence.correctIndexLetterAliasCount, 53);
  assert.equal(simpleResponseManifest.taxonomy.multipleChoiceEvidence.noCorrectIndexLetterAliasCount, 27);
  assert.equal(simpleResponseManifest.taxonomy.multipleChoiceEvidence.wrongIndexAliasCollisionCount, 0);
  assert.deepEqual(simpleResponseManifest.taxonomy.objectCountDimensionIds, [
    "hk-ease-10633", "hk-ease-10640", "hk-ease-10654", "hk-ease-10393",
    "hk-ease-10398", "hk-ease-10416", "hk-ease-10417", "hk-ease-10426",
    "hk-ease-10428", "hk-ease-10438", "hk-ease-10455", "hk-ease-10477",
    "hk-ease-10480", "hk-ease-919"
  ]);
  assert.deepEqual(simpleResponseManifest.taxonomy.fractionRepresentationPolicy, {
    ids: ["hk-ease-10641", "hk-ease-10642", "hk-ease-10643", "hk-ease-10652", "hk-ease-10653"],
    reductionPolicy: "equivalent-fractions-accepted-reduction-not-required",
    decimalPercentBareScalarZeroDenominatorWrongValueRejected: true
  });

  const entryById = new Map(simpleResponseManifest.entries.map((entry) => [entry.baseId, entry]));
  const hasProbeKind = (baseId: string, kind: string) =>
    entryById.get(baseId)?.adversarialProbes.some((probe) => probe.kind === kind);
  for (const baseId of simpleResponseManifest.taxonomy.objectCountDimensionIds) {
    assert.equal(hasProbeKind(baseId, "object-count-wrong-entity-unit-or-dimension"), true, baseId);
  }
  for (const baseId of simpleResponseManifest.taxonomy.fractionRepresentationPolicy.ids) {
    assert.equal(hasProbeKind(baseId, "decimal-instead-of-requested-fraction"), true, baseId);
    assert.equal(hasProbeKind(baseId, "percent-instead-of-requested-fraction"), true, baseId);
    assert.equal(hasProbeKind(baseId, "bare-scalar-instead-of-requested-fraction"), true, baseId);
    assert.equal(hasProbeKind(baseId, "zero-denominator-fraction"), true, baseId);
    assert.equal(hasProbeKind(baseId, "wrong-value-fraction"), true, baseId);
  }
  for (const baseId of simpleResponseManifest.taxonomy.idsByKind["unitless-ordered-chain"]) {
    for (const kind of [
      "ordered-chain-missing-value",
      "ordered-chain-reversed-values",
      "ordered-chain-duplicate-value",
      "ordered-chain-reversed-symbols",
      "ordered-chain-unrequested-unit"
    ]) assert.equal(hasProbeKind(baseId, kind), true, `${baseId}:${kind}`);
  }
  for (const baseId of simpleResponseManifest.taxonomy.idsByKind["mc-scalar"]) {
    assert.equal(hasProbeKind(baseId, "numeric-choice-same-value-wrong-unit-or-dimension"), true, baseId);
    assert.equal(hasProbeKind(baseId, "multiple-choice-free-text-wrapper-bypass"), true, baseId);
  }
  for (const baseId of simpleResponseManifest.taxonomy.idsByKind["unitless-integer"]) {
    const probes = entryById.get(baseId)?.adversarialProbes ?? [];
    for (const token of [" cm", " kg", " cm²", " cm³", " mL", " km/h", "%", "°", "HK$"]) {
      assert.equal(
        probes.some((probe) => probe.input.includes(token)),
        true,
        `${baseId}: missing scalar adversarial family ${token}`
      );
    }
  }
  for (const baseId of simpleResponseManifest.taxonomy.idsByKind["unitless-decimal"]) {
    const entry = entryById.get(baseId);
    assert.ok(entry, baseId);
    const reviewedHasFraction = entry.reviewedSurfaces.some((surface) => /(?:\\frac|\d+\s*\/\s*\d+)/.test(surface));
    assert.equal(
      reviewedHasFraction || hasProbeKind(baseId, "fraction-instead-of-required-decimal"),
      true,
      `${baseId}: decimal row lacks an explicit reviewed-or-rejected fraction decision`
    );
  }
  for (const kind of [
    "equation-choice-collapsed-to-rhs",
    "equation-choice-altered-left-hand-side",
    "equation-choice-reversed-unlisted-choice",
    "equation-choice-false-relation"
  ]) assert.equal(hasProbeKind("hk-ease-10422", kind), true, kind);

  const mutate = (
    expected: { code: string; baseId: string | null; field: string | null },
    change: (candidate: ReviewedSimpleResponseManifest) => void
  ) => {
    const candidate = structuredClone(simpleResponseManifest);
    change(candidate);
    let failure: unknown;
    try {
      validateHongKongEaseReviewedSimpleResponseManifest(candidate, { requireCanonicalPayload: false });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure instanceof Error, `${expected.code}: manifest mutation did not fail`);
    const typedFailure = failure as Error & {
      code?: string;
      baseId?: string | null;
      field?: string | null;
    };
    assert.equal(typedFailure.code, expected.code);
    assert.equal(typedFailure.baseId, expected.baseId);
    assert.equal(typedFailure.field, expected.field);
  };
  const firstEntryId = simpleResponseManifest.entries[0].baseId;
  mutate(
    { code: "SIMPLE_MANIFEST_HEADER_DRIFT", baseId: null, field: "reviewedSimpleQuestionCount" },
    (candidate) => { candidate.reviewedSimpleQuestionCount = 356; }
  );
  mutate(
    { code: "SIMPLE_TAXONOMY_DRIFT", baseId: null, field: "taxonomy" },
    (candidate) => { candidate.taxonomy.counts["unitless-integer"] -= 1; }
  );
  mutate(
    { code: "SIMPLE_ENTRY_POLICY_DRIFT", baseId: firstEntryId, field: "policy" },
    (candidate) => { candidate.entries[0].policy = "reviewed-text-surfaces"; }
  );
  mutate(
    { code: "SIMPLE_REVIEWED_SURFACE_HASH_DRIFT", baseId: firstEntryId, field: "reviewedSurfaces" },
    (candidate) => { candidate.entries[0].reviewedSurfaces[0] += " mutated"; }
  );
  mutate(
    { code: "SIMPLE_ADVERSARIAL_PROBE_HASH_DRIFT", baseId: firstEntryId, field: "adversarialProbes" },
    (candidate) => { candidate.entries[0].adversarialProbes[0].input += " mutated"; }
  );
});

test(simplePositiveTestName, () => {
  let simpleReviewedSurfaces = 0;
  let fractionPolicyPositiveProbes = 0;
  for (const [baseId, entry] of reviewedSimpleHongKongEaseResponseEntries()) {
    const question = questionById.get(baseId);
    assert.ok(question, `${baseId}: missing simple candidate question`);
    for (const surface of entry.reviewedSurfaces) {
      simpleReviewedSurfaces += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), surface),
        true,
        `${baseId}: should accept independently reviewed simple surface ${JSON.stringify(surface)}`
      );
    }
    for (const surface of entry.fractionRepresentationPolicy?.positiveProbes ?? []) {
      fractionPolicyPositiveProbes += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), surface),
        true,
        `${baseId}: should accept fraction-policy positive ${JSON.stringify(surface)}`
      );
    }
  }
  assert.equal(simpleReviewedSurfaces, 776);
  assert.equal(fractionPolicyPositiveProbes, 15);
});

test(simpleNegativeTestName, () => {
  let simpleAdversarialProbes = 0;
  for (const [baseId, entry] of reviewedSimpleHongKongEaseResponseEntries()) {
    const question = questionById.get(baseId);
    assert.ok(question, `${baseId}: missing simple candidate question`);
    for (const probe of entry.adversarialProbes) {
      simpleAdversarialProbes += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), probe.input),
        false,
        `${baseId}: should reject ${probe.kind} ${JSON.stringify(probe.input)}`
      );
    }
  }
  assert.equal(simpleAdversarialProbes, 3236);
});

test(positiveProbeTestName, () => {
  let probes = 0;
  for (const entry of responseAudit.entries) {
    const question = questionById.get(entry.baseId);
    assert.ok(question, `${entry.baseId}: missing candidate question`);
    for (const probe of entry.positiveProbes) {
      probes += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), probe.input),
        true,
        `${entry.baseId}: should accept ${JSON.stringify(probe.input)}`
      );
    }
  }
  assert.equal(probes, 584);

  let storedAcceptedForms = 0;
  for (const question of questionPack.questions) {
    for (const accepted of question.acceptedAnswers) {
      storedAcceptedForms += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), accepted),
        true,
        `${question.id}: should accept stored independently reviewed form ${JSON.stringify(accepted)}`
      );
    }
  }
  assert.equal(storedAcceptedForms, 1912);
});

test(negativeProbeTestName, () => {
  let probes = 0;
  for (const entry of responseAudit.entries) {
    const question = questionById.get(entry.baseId);
    assert.ok(question, `${entry.baseId}: missing candidate question`);
    for (const probe of entry.negativeProbes) {
      probes += 1;
      assert.equal(
        questionAnswerMatches(gradingPayload(question), probe.input),
        false,
        `${entry.baseId}: should reject ${JSON.stringify(probe.input)}`
      );
    }
  }
  assert.equal(probes, 581);
});

test(workedMethodTestName, () => {
  const propertyQuestion = questionById.get("hk-ease-10391");
  assert.ok(propertyQuestion);
  const propertyPayload = gradingPayload(propertyQuestion);
  for (const response of [
    "1700",
    "25×17×4=25×4×17=(25×4)×17=100×17=1700 (commutative property)",
    "25×17×4=25×4×17=(25×4)×18=100×17=1700 (commutative and associative properties)",
    "25×17×4=25×4×17=(25×4)×17=100×17=1700 (commutative and associative properties); 1700=1600"
  ]) {
    assert.equal(questionAnswerMatches(propertyPayload, response), false, `hk-ease-10391 should reject ${JSON.stringify(response)}`);
  }

  const lcmQuestion = questionById.get("hk-ease-2679");
  assert.ok(lcmQuestion);
  const lcmPayload = gradingPayload(lcmQuestion);
  for (const response of [
    "210",
    "30=2×3×6;42=2×3×7;LCM=210",
    "30=2×3×5;LCM=210",
    "30=2×3×5;42=2×3×7;LCM=2×3×7=210",
    "30=2×3×5;42=2×3×7;LCM=2×3×5×7=211",
    "30=2×3×5;42=2×3×7;LCM=210;HCF=6",
    "Working/reason: 30 = 2 × 3 × 5 and 42 = 2 × 3 × 7. Taking the highest power of each prime gives L.C.M. = 2 × 3 × 5 × 7 = 210. Final response: 211"
  ]) {
    assert.equal(questionAnswerMatches(lcmPayload, response), false, `hk-ease-2679 should reject ${JSON.stringify(response)}`);
  }

  const appleQuestion = questionById.get("hk-ease-10393");
  assert.ok(appleQuestion);
  const applePayload = gradingPayload(appleQuestion);
  for (const accepted of ["1680", "1,680", "1680 apples", "1680 個", "1680個"]) {
    assert.equal(questionAnswerMatches(applePayload, accepted), true, `hk-ease-10393 should accept ${accepted}`);
  }
  for (const rejected of ["1680 cm", "1680 cm^2", "1680 kg", "1680 mL", "1679 apples"]) {
    assert.equal(questionAnswerMatches(applePayload, rejected), false, `hk-ease-10393 should reject ${rejected}`);
  }
});

test(activeGenerationTestName, () => {
  const question = questionById.get("hk-ease-10645");
  assert.ok(question);

  const adversarialPayload = {
    ...gradingPayload(question),
    accepted_answers: [...question.acceptedAnswers, "2/6"],
    options: [{ en: "2/6", zh: "2/6" }]
  };

  const activeQuestion: typeof adversarialPayload = {
    ...adversarialPayload,
    id: activeQuestionId(question.id)
  };
  assert.equal(questionAnswerMatches(activeQuestion, "1/3"), true);
  assert.equal(questionAnswerMatches(activeQuestion, "2/6"), false);
  assert.equal(hongKongEaseResponseContractDecision(activeQuestion.id, "2/6"), false);

  assert.equal(hongKongEaseResponseContractDecision(question.id, "2/6"), false);
  assert.equal(hongKongEaseResponseContractDecision(`${question.id}-v99`, "2/6"), false);
  assert.equal(hongKongEaseResponseContractDecision(`not-${question.id}-v2`, "2/6"), null);
  assert.equal(
    questionAnswerMatches({ ...adversarialPayload, id: `${question.id}-v99` }, "2/6"),
    false,
    "an inactive or future suffix must not fall through to generic accepted-answer grading"
  );

  for (const candidate of questionPack.questions) {
    const activeId = activeQuestionId(candidate.id);
    assert.equal(
      Number(isStrictHongKongEaseResponseQuestion(activeId)) +
        Number(isReviewedSimpleHongKongEaseResponseQuestion(activeId)),
      1,
      `${candidate.id}: active generation must belong to exactly one EASE response-contract partition`
    );
    assert.equal(
      hongKongEaseResponseContractDecision(candidate.id, candidate.answer) ??
        hongKongEaseReviewedSimpleResponseDecision(candidate.id, candidate.answer),
      false,
      `${candidate.id}: retired base generation must fail closed`
    );
    assert.equal(
      hongKongEaseResponseContractDecision(`${candidate.id}-v99`, candidate.answer) ??
        hongKongEaseReviewedSimpleResponseDecision(`${candidate.id}-v99`, candidate.answer),
      false,
      `${candidate.id}: future generation must fail closed`
    );
    const siblingId = activeId.endsWith("-v2") ? `${candidate.id}-v3` : `${candidate.id}-v2`;
    if (siblingId !== activeId) {
      assert.equal(
        hongKongEaseResponseContractDecision(siblingId, candidate.answer) ??
          hongKongEaseReviewedSimpleResponseDecision(siblingId, candidate.answer),
        false,
        `${candidate.id}: inactive sibling generation must fail closed`
      );
    }
  }
});
