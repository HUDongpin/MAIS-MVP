import assert from "node:assert/strict";
import { createHongKongDisplayed74Test } from "../hongKongDisplayed74FocusedTestLedger";

import displayed74SnapshotJson from "@/data/historical/hongKongQuestions-displayed255-preimage-20260813.json";
import { questions, retiredHongKongQuestionIds } from "@/data/questions";
import { questionAnswerMatches } from "./answerMatching";
import {
  questionResponseContractFor,
  strictQuestionResponseContractEntries
} from "./questionResponseContracts";
import type { Question } from "@/types";

export const HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_SUITE_ID =
  "hk-displayed74-response-contract-v1" as const;
const test = createHongKongDisplayed74Test(HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_SUITE_ID);

const displayed74Snapshot = displayed74SnapshotJson as typeof displayed74SnapshotJson & {
  questions: Question[];
};
const displayed74PreimageById = new Map<string, Question>(
  displayed74Snapshot.questions.map((question) => [question.id, question as Question])
);

const baseToV2Ids = new Set([
  "supp-identities-square-patterns-first-step",
  "supp-arc-length-sector-area-first-step",
  "supp-arc-length-sector-area-common-check",
  "supp-identities-square-patterns-common-check",
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-guided-example",
  "hk-s3-identities-square-patterns-1",
  "supp-identities-square-patterns-key-fact",
  "graph-p4-decimals-number-line"
]);

function expectedNextId(oldId: string) {
  return baseToV2Ids.has(oldId) ? `${oldId}-v2` : oldId.replace(/-v2$/, "-v3");
}

function repairedQuestion(oldId: string): Question {
  const expected = expectedNextId(oldId);
  const question = questions.find((candidate) => candidate.id === expected);
  assert.ok(question, `${oldId}: missing mandatory successor ${expected}`);
  assert.equal(questions.some((candidate) => candidate.id === oldId), false, `${oldId}: old generation remains active`);
  assert.equal(retiredHongKongQuestionIds.has(oldId), true, `${oldId}: old generation is not retired`);
  return question;
}

function payload(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
}

function assertResponses(oldId: string, accepted: readonly string[], rejected: readonly string[]) {
  const question = repairedQuestion(oldId);
  for (const value of accepted) {
    assert.equal(questionAnswerMatches(payload(question), value), true, `${oldId}: should accept '${value}'`);
  }
  for (const value of rejected) {
    assert.equal(questionAnswerMatches(payload(question), value), false, `${oldId}: should reject '${value}'`);
  }
}

const responseOnlyIds = [
  "supp-p3-multiplication-division-guided-example-v2",
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-key-fact-v2",
  "supp-polynomials-guided-example",
  "hk-s3-identities-square-patterns-1",
  "supp-identities-square-patterns-key-fact",
  "q10-v2",
  "supp-differentiation-intro-key-fact-v2",
  "supp-calculus-guided-example-v2",
  "supp-p5-volume-key-fact-v2",
  "graph-p4-decimals-number-line"
] as const;

test("the exact 13 strict response contracts are keyed only to active successor IDs", () => {
  const strictRegistry = new Map(strictQuestionResponseContractEntries());
  assert.equal(responseOnlyIds.length, 13);
  for (const oldId of responseOnlyIds) {
    const successorId = expectedNextId(oldId);
    assert.equal(
      strictRegistry.has(oldId),
      false,
      `${oldId}: stale strict response contract remains registered on the retired generation`
    );
    assert.equal(
      strictRegistry.has(successorId),
      true,
      `${oldId}: strict response contract is missing on active successor ${successorId}`
    );
  }
});

type QuestionDeltaPath = "prompt.en" | "prompt.zh" | "explanation.en" | "explanation.zh";

// This is the complete learner-payload delta allowlist for the 13 rows that
// enter the displayed-74 queue through the response adjudication. Grader and
// renderer policy live outside the question object; only the tank needed the
// four exact self-containment/explanation fields frozen below.
const responseOnlyQuestionDeltaContract: Readonly<Partial<Record<(typeof responseOnlyIds)[number], readonly QuestionDeltaPath[]>>> = {
  "supp-p5-volume-key-fact-v2": ["prompt.en", "prompt.zh", "explanation.en", "explanation.zh"]
};

function questionWithoutAuthorizedDeltas(question: Question, oldId: (typeof responseOnlyIds)[number]) {
  const clone = structuredClone(question) as Question;
  clone.id = oldId;
  for (const path of responseOnlyQuestionDeltaContract[oldId] ?? []) {
    const [section, language] = path.split(".") as ["prompt" | "explanation", "en" | "zh"];
    delete (clone[section] as Partial<Record<"en" | "zh", string>>)[language];
  }
  if (oldId === "graph-p4-decimals-number-line" && clone.diagram?.kind === "number-line") {
    delete clone.diagram.semanticDisclosurePolicy;
  }
  return clone;
}

test("the exact 13 response-only rows preserve their whole question object outside the shared authorized delta contract", () => {
  assert.equal(responseOnlyIds.length, 13);
  assert.equal(new Set(responseOnlyIds).size, 13);
  assert.deepEqual(Object.keys(responseOnlyQuestionDeltaContract), ["supp-p5-volume-key-fact-v2"]);
  for (const oldId of responseOnlyIds) {
    const preimage = displayed74PreimageById.get(oldId);
    assert.ok(preimage, `${oldId}: missing immutable displayed-74 preimage`);
    const successor = repairedQuestion(oldId);
    assert.deepEqual(
      questionWithoutAuthorizedDeltas(successor, oldId),
      questionWithoutAuthorizedDeltas(preimage, oldId),
      `${oldId}: unauthorized question-object drift`
    );
  }
});

test("the typed P3 guided example uses a semantic quotient-and-remainder contract bounded by divisor 4", () => {
  const oldId = "supp-p3-multiplication-division-guided-example-v2";
  const question = repairedQuestion(oldId);
  const contract = questionResponseContractFor(question.id) as unknown as Record<string, unknown>;
  assert.equal(contract.kind, "quotient-remainder");
  assert.equal(contract.quotient, 11);
  assert.equal(contract.remainder, 3);
  assert.equal(contract.divisor, 4);
  assertResponses(oldId,
    [
      "11 each, 3 remain",
      "11each,3remain",
      "11 each remainder 3",
      "11 remainder 3",
      "11R3",
      "商11餘3",
      "商 11 餘 3",
      "每人11張，餘3張",
      "每人 11 張，餘 3 張",
      "每人11張，餘下3張",
      "每人 11 張，餘下 3 張"
    ],
    [
      "10R3", "12R3", "3R11", "11R-1", "11R4", "11R5", "11", "14", "10R7",
      "11.5R3", "11R3.5", "10 each, 3 remain", "11 each, 4 remain", "商10餘3", "每人11張，餘4張"
    ]
  );
});

const algebraCases = [
  {
    id: "q2",
    positives: ["x*5", "5*x", "2x+3x", "(2+3)*x"],
    negatives: ["4x", "-5x", "5x^2", "5x+1"]
  },
  {
    id: "supp-algebra-basics-key-fact",
    positives: ["a*7", "7*a", "3a+4a", "a*(3+4)"],
    negatives: ["6a", "-7a", "7a^2", "7a+1"]
  },
  {
    id: "q18",
    positives: ["x^2+x*5+6", "6+5*x+x^2", "(x^2+5x+6)", "x^2+2x+3x+6", "6+6x-x+x^2"],
    negatives: ["(x+3)(x+2)", "(x+2)*(x+3)", "x^2+4x+6", "x^2-5x+6", "x^3+5x+6", "x^2+5x", "x^2+5x+7"]
  },
  {
    id: "supp-polynomials-key-fact-v2",
    positives: ["x^2*7", "7*x*x", "2x^2+5x^2", "(2+5)*x^2"],
    negatives: ["6x^2", "-7x^2", "7x^3", "7x^2+1"]
  },
  {
    id: "supp-polynomials-guided-example",
    positives: ["x^2+x*4", "4*x+x^2", "(x^2+4x)"],
    negatives: ["x(x+4)", "x*(x+4)", "x^2+5x", "x^2-4x", "x^3+4x", "x^2", "x^2+4x+1"]
  },
  {
    id: "hk-s3-identities-square-patterns-1",
    positives: ["a^2+a*b*2+b^2", "b^2+2*b*a+a^2", "(a^2+2ab+b^2)", "a^2+ab+ab+b^2"],
    negatives: ["(a+b)^2", "(b+a)^2", "a^2+ab+b^2", "a^2-2ab+b^2", "a^3+2ab+b^2", "a^2+b^2", "a^2+2ab+b^2+1"]
  },
  {
    id: "supp-identities-square-patterns-key-fact",
    positives: ["b*2*a", "2*b*a", "ab+ba", "(a+a)*b"],
    negatives: ["ab", "-2ab", "2a^2b", "2ab+1"]
  },
  {
    id: "q10-v2",
    positives: ["x+x", "1*x+x", "(1+1)*x"],
    negatives: ["3x", "-2x", "2x^2", "2x+1"]
  },
  {
    id: "supp-differentiation-intro-key-fact-v2",
    positives: ["x^2*3", "3*x*x", "(1+2)*x^2"],
    negatives: ["2x^2", "-3x^2", "3x^3", "3x^2+1"]
  },
  {
    id: "supp-calculus-guided-example-v2",
    positives: ["x*8", "8*x", "(4+4)*x"],
    negatives: ["7x", "-8x", "8x^2", "8x+1"]
  }
] as const;

const expandedIds = new Set([
  "q18",
  "supp-polynomials-guided-example",
  "hk-s3-identities-square-patterns-1"
]);

test("all exact ten algebra rows use polynomial equivalence and exactly three require expanded sums of monomials", () => {
  assert.equal(algebraCases.length, 10);
  const expectedContractIds = new Set(algebraCases.map(({ id }) => expectedNextId(id)));
  const expectedExpandedContractIds = new Set([...expandedIds].map(expectedNextId));
  const activeHongKongIds = new Set(
    questions.filter((question) => question.curriculumTrack === "HK").map((question) => question.id)
  );
  const polynomialEntries = strictQuestionResponseContractEntries()
    .filter(([questionId, contract]) => activeHongKongIds.has(questionId) && contract.kind === "polynomial-equivalence");
  assert.deepEqual(
    new Set(polynomialEntries.map(([questionId]) => questionId)),
    expectedContractIds,
    "the active HK polynomial-equivalence registry must contain exactly the adjudicated ten successors"
  );
  assert.deepEqual(
    new Set(polynomialEntries.filter(([, contract]) => contract.kind === "polynomial-equivalence" && contract.requireExpanded).map(([questionId]) => questionId)),
    expectedExpandedContractIds,
    "requireExpanded must apply to exactly the three Expand / 展開 prompts"
  );
  for (const algebraCase of algebraCases) {
    const question = repairedQuestion(algebraCase.id);
    const contract = questionResponseContractFor(question.id) as unknown as Record<string, unknown>;
    assert.equal(contract.kind, "polynomial-equivalence", `${algebraCase.id}: contract kind`);
    assert.equal(Boolean(contract.requireExpanded), expandedIds.has(algebraCase.id), `${algebraCase.id}: requireExpanded`);
    assertResponses(algebraCase.id, algebraCase.positives, algebraCase.negatives);
  }
});

test("polynomial parsing fails closed outside the supported polynomial domain", () => {
  for (const algebraCase of algebraCases) {
    assertResponses(algebraCase.id, [], [
      "sin(x)", "sqrt(x)", "log(x)", "x/(x+1)", "x/2", "x/0", "x^-1", "x^1.5",
      "2^x", "x++1", "x+*1", "x***2", "x..2", "(x", "x)", "x^", "x=2"
    ]);
  }
});

test("the cuboid-height row requires a convertible length unit including mm and 毫米", () => {
  const oldId = "supp-p5-volume-key-fact-v2";
  const question = repairedQuestion(oldId);
  const contract = questionResponseContractFor(question.id) as unknown as Record<string, unknown>;
  assert.equal(contract.kind, "quantity");
  assert.equal(contract.target, "4 cm");
  assert.equal(contract.unitPolicy, "convertible");
  assert.ok(contract.allowBareNumber === undefined || contract.allowBareNumber === false);
  assert.deepEqual(question.prompt, {
    en: "A cuboid tank has volume 48 cm^3, length 4 cm, and width 3 cm. What is its height? Give your answer with a length unit.",
    zh: "一個長方體水箱的體積是 48 立方厘米，長 4 厘米、闊 3 厘米。高是多少？答案須附上長度單位。"
  });
  assert.equal(question.answer, "4 cm");
  assert.deepEqual(question.acceptedAnswers, ["4cm", "4 厘米"]);
  assert.deepEqual(question.explanation, {
    en: "Here height is unknown. From V = lwh, divide the volume by the base area: h = 48 ÷ (4 × 3) = 4 cm.",
    zh: "這題的未知量是高。由 V = lwh，用體積除以底面積：h = 48 ÷（4 × 3）= 4 厘米。"
  });
  assertResponses(oldId, ["4 cm", "4cm", "0.04 m", "40 mm", "40 毫米"], ["4", "0.04 cm", "4 cm^2", "4 cm^3", "12 cm"]);
});

test("the P4 number-line row requires an ordinary decimal numeral equal to 3.7", () => {
  const oldId = "graph-p4-decimals-number-line";
  const question = repairedQuestion(oldId);
  const contract = questionResponseContractFor(question.id) as unknown as Record<string, unknown>;
  assert.equal(contract.kind, "decimal-numeral");
  assert.equal(contract.value, 3.7);
  assertResponses(oldId, ["3.7", "3.70", "3.700"], ["37/10", "3 7/10", "370%", "3.7e0"]);
});

test("the three NOT-DEFECT rows do not inherit broad aliases or the typed quotient parser", () => {
  const cases = [
    {
      id: "pq-p2-multiplication-foundations-1-v2",
      accepted: ["3 × 4"],
      rejected: ["4 × 3", "4*3"]
    },
    {
      id: "supp-p2-multiplication-foundations-key-fact-v2",
      accepted: ["4 × 6", "4*6", "4乘以6"],
      rejected: ["6 × 4", "6*4", "6乘以4"]
    },
    {
      id: "pq-p3-multiplication-division-2-v2",
      accepted: ["10 full groups, 3 remain", "10 組，餘 3 粒"],
      rejected: ["10R3", "商10餘3", "10 full groups, 4 remain"]
    }
  ] as const;
  assert.equal(cases.length, 3);
  for (const notDefect of cases) {
    const question = questions.find((candidate) => candidate.id === notDefect.id);
    assert.ok(question, `${notDefect.id}: NOT-DEFECT row must remain active`);
    assert.equal(retiredHongKongQuestionIds.has(notDefect.id), false, `${notDefect.id}: NOT-DEFECT row was retired`);
    assert.equal(questionResponseContractFor(question.id).kind, "generic-equivalence", `${notDefect.id}: inherited a broad strict alias`);
    for (const selected of notDefect.accepted) {
      assert.equal(questionAnswerMatches(payload(question), selected), true, `${notDefect.id}: rejected exact positive '${selected}'`);
    }
    for (const selected of notDefect.rejected) {
      assert.equal(questionAnswerMatches(payload(question), selected), false, `${notDefect.id}: accepted forbidden representation '${selected}'`);
    }
  }
});
