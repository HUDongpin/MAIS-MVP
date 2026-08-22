import assert from "node:assert/strict";
import test from "node:test";

import { mainlandBnuPrimaryQuestions } from "@/data/mainlandBnuPrimaryQuestions";
import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { Question } from "@/types";

const finalOnlyIds = [
  // BNU primary: every former compound blocker is deliberately narrowed to
  // the deterministic quantity/decision that the production matcher grades.
  "bnu-primary-ds-v1-p2-200", "bnu-primary-ds-v2-p2-011", "bnu-primary-ds-v2-p2-015",
  "bnu-primary-ds-v1-p2-012", "bnu-primary-ds-v1-p2-108", "bnu-primary-ds-v1-p3-168",
  "bnu-primary-ds-v2-p3-168", "bnu-primary-ds-v1-p3-171", "bnu-primary-ds-v2-p3-171",
  "bnu-primary-ds-v1-p3-177", "bnu-primary-ds-v1-p3-105", "bnu-primary-ds-v2-p3-116",
  "bnu-primary-ds-v1-p3-108", "bnu-primary-ds-v2-p3-114", "bnu-primary-ds-v2-p3-129",
  "bnu-primary-ds-v2-p3-015", "bnu-primary-ds-v1-p3-047", "bnu-primary-ds-v1-p3-051",
  "bnu-primary-ds-v1-p3-060", "bnu-primary-ds-v1-p3-063", "bnu-primary-ds-v2-p3-039",
  "bnu-primary-ds-v1-p4-153", "bnu-primary-ds-v1-p4-159", "bnu-primary-ds-v1-p4-180",
  "bnu-primary-ds-v2-p4-180", "bnu-primary-ds-v1-p4-188", "bnu-primary-ds-v1-p4-177",
  "bnu-primary-ds-v2-p4-177", "bnu-primary-ds-v2-p4-208", "bnu-primary-ds-v1-p4-171",
  "bnu-primary-ds-v1-p4-084", "bnu-primary-ds-v2-p4-093", "bnu-primary-ds-v2-p4-096",
  "bnu-primary-ds-v2-p4-030", "bnu-primary-ds-v2-p4-021", "bnu-primary-ds-v1-p4-027",
  "bnu-primary-ds-v1-p4-132", "bnu-primary-ds-v2-p5-168", "bnu-primary-ds-v1-p5-123",
  "bnu-primary-ds-v2-p5-123", "bnu-primary-ds-v1-p5-126", "bnu-primary-ds-v1-p5-156",
  "bnu-primary-ds-v1-p5-162", "bnu-primary-ds-v2-p5-162", "bnu-primary-ds-v1-p5-153",
  "bnu-primary-ds-v1-p5-159", "bnu-primary-ds-v1-p5-165", "bnu-primary-ds-v1-p5-015",
  "bnu-primary-ds-v1-p5-012", "bnu-primary-ds-v2-p5-054", "bnu-primary-ds-v2-p5-057",
  "bnu-primary-ds-v1-p5-051", "bnu-primary-ds-v2-p5-051", "bnu-primary-ds-v2-p5-060",
  "bnu-primary-ds-v1-p5-108", "bnu-primary-ds-v1-p5-111", "bnu-primary-ds-v2-p6-204",
  "bnu-primary-ds-v2-p6-210", "bnu-primary-ds-v1-p6-240", "bnu-primary-ds-v1-p6-075",
  "bnu-primary-ds-v1-p6-078", "bnu-primary-ds-v2-p6-030", "bnu-primary-ds-v2-p6-021",
  "bnu-primary-ds-v2-p6-027", "bnu-primary-ds-v2-p6-024", "bnu-primary-ds-v2-p6-045",
  "bnu-primary-ds-v1-p6-123", "bnu-primary-ds-v1-p6-126", "bnu-primary-ds-v2-p6-057",
  "bnu-primary-ds-v1-p6-072", "bnu-primary-ds-v2-p6-072", "bnu-primary-ds-v2-p6-060",
  "bnu-primary-ds-v2-p6-093", "bnu-primary-ds-v2-p6-099", "bnu-primary-ds-v2-p6-102",
  "bnu-primary-ds-v2-p6-105", "bnu-primary-ds-v2-p6-108", "bnu-primary-ds-v2-p6-144",

  // HJB primary.
  "hjb-primary-ds-v1-p1-123", "hjb-primary-ds-v1-p1-131", "hjb-primary-ds-v1-p2-009",
  "hjb-primary-ds-v1-p2-012", "hjb-primary-ds-v1-p2-018", "hjb-primary-ds-v1-p2-021",
  "hjb-primary-ds-v1-p2-042", "hjb-primary-ds-v1-p2-129", "hjb-primary-ds-v1-p2-132",
  "hjb-primary-ds-v1-p3-003", "hjb-primary-ds-v1-p3-018", "hjb-primary-ds-v1-p3-048",
  "hjb-primary-ds-v1-p3-057", "hjb-primary-ds-v1-p3-072", "hjb-primary-ds-v1-p3-075",
  "hjb-primary-ds-v1-p3-078", "hjb-primary-ds-v1-p3-108", "hjb-primary-ds-v1-p3-117",
  "hjb-primary-ds-v1-p3-120", "hjb-primary-ds-v1-p3-162", "hjb-primary-ds-v1-p4-012",
  "hjb-primary-ds-v1-p4-066", "hjb-primary-ds-v1-p4-087", "hjb-primary-ds-v1-p4-114",
  "hjb-primary-ds-v1-p4-135", "hjb-primary-ds-v1-p4-226", "hjb-primary-ds-v1-p5-003",
  "hjb-primary-ds-v1-p5-036", "hjb-primary-ds-v1-p5-177",
  "hjb-primary-ds-v1-p6-027", "hjb-primary-ds-v1-p6-033", "hjb-primary-ds-v1-p6-087",
  "hjb-primary-ds-v1-p6-090", "hjb-primary-ds-v1-p6-149", "hjb-primary-ds-v1-p6-168",
  "hjb-primary-ds-v1-p6-177",

  // HJB junior, excluding the fifteen deliberately structured
  // simplify-then-evaluate contracts below.
  "hjb-junior-ds-v2-s1-102", "hjb-junior-ds-v2-s1-105", "hjb-junior-ds-v2-s1-117",
  "hjb-junior-ds-v2-s1-120", "hjb-junior-ds-v2-s1-294", "hjb-junior-ds-v2-s1-306",
  "hjb-junior-ds-v2-s1-327", "hjb-junior-ds-v2-s1-351", "hjb-junior-ds-v2-s1-357",
  "hjb-junior-ds-v2-s1-372", "hjb-junior-ds-v2-s2-045", "hjb-junior-ds-v2-s2-057",
  "hjb-junior-ds-v2-s2-123", "hjb-junior-ds-v2-s2-150", "hjb-junior-ds-v2-s2-213",
  "hjb-junior-ds-v2-s2-252", "hjb-junior-ds-v2-s2-258", "hjb-junior-ds-v2-s2-267",
  "hjb-junior-ds-v2-s2-270", "hjb-junior-ds-v2-s2-281", "hjb-junior-ds-v2-s2-297",
  "hjb-junior-ds-v2-s2-357", "hjb-junior-ds-v2-s3-027", "hjb-junior-ds-v2-s3-312",
  "hjb-junior-ds-v2-s3-360", "hjb-junior-ds-v2-s3-363", "hjb-junior-ds-v2-s3-375",
] as const;

const structuredSimplifyContracts = {
  "hjb-junior-ds-v2-s1-003": ["ab+3；-3", "ab+3", "-3"],
  "hjb-junior-ds-v2-s1-015": ["-5x²y；-10", "-5x²y", "-10"],
  "hjb-junior-ds-v2-s1-033": ["x²-2；-1", "x²-2", "-1"],
  "hjb-junior-ds-v2-s1-045": ["3x²y+4xy；4", "3x²y+4xy", "4"],
  "hjb-junior-ds-v2-s1-153": ["1；1", "1", "1"],
  "hjb-junior-ds-v2-s1-156": ["1；1", "1", "1"],
  "hjb-junior-ds-v2-s1-159": ["x；3", "x", "3"],
  "hjb-junior-ds-v2-s1-162": ["1；1", "1", "1"],
  "hjb-junior-ds-v2-s1-168": ["(x+3)/(x-3)；7", "(x+3)/(x-3)", "7"],
  "hjb-junior-ds-v2-s1-174": ["x；3", "x", "3"],
  "hjb-junior-ds-v2-s1-177": ["(x+2)/(x-2)；5", "(x+2)/(x-2)", "5"],
  "hjb-junior-ds-v2-s1-183": ["1；1", "1", "1"],
  "hjb-junior-ds-v2-s1-189": ["1；1", "1", "1"],
  "hjb-junior-ds-v2-s1-192": ["(x+2)/x；5/3", "(x+2)/x", "5/3"],
  "hjb-junior-ds-v2-s2-105": ["|x-2|/(x-2)-|x+1|/(x+1)；0", "|x-2|/(x-2)-|x+1|/(x+1)", "0"],
} as const;

const structuredHjbPrimaryContracts = {
  "hjb-primary-ds-v1-p5-027": {
    complete: "估算3.6米；准确3.6米",
    partials: ["3.6", "3.6米", "估算3.6米", "准确3.6米"],
  },
  "hjb-primary-ds-v1-p6-204": {
    complete: "x+3x=120；x=30；90本",
    alternatives: ["3x+x=120；x=30；90本"],
    partials: ["90", "90本", "x=30；90本", "x+3x=120；90本"],
  },
} as const;

const questions = [
  ...mainlandBnuPrimaryQuestions,
  ...mainlandHjbPrimaryQuestions,
  ...mainlandHjbJuniorQuestions,
];
const byId = new Map(questions.map((question) => [question.id, question]));
const ungradedDirective = /(?:计算|思考|推理|完整|主要|解题|验算|竖式|证明|求证|列式|列出方程|方程组|估算).{0,12}(?:过程|步骤|理由|依据|方法|解答|计算|求解)|(?:说明|写出|寫出).{0,12}(?:理由|依据|方法|过程)|为什么|為什麼/u;

function gradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options,
    prompt: question.prompt,
  };
}

test("owned Mainland compound blockers do not demand an ungraded free-form process", () => {
  assert.equal(finalOnlyIds.length, 141);
  for (const id of finalOnlyIds) {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    if (!question) continue;
    const prompt = question.prompt.zhHans ?? question.prompt.zh;
    assert.doesNotMatch(prompt, ungradedDirective, `${id}: ${prompt}`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), question.answer), true, `${id} canonical`);
  }
});

test("HJB primary estimation and equation objectives use complete deterministic contracts", () => {
  const estimate = byId.get("hjb-primary-ds-v1-p5-027");
  assert.ok(estimate);
  if (estimate) {
    const contract = structuredHjbPrimaryContracts["hjb-primary-ds-v1-p5-027"];
    const prompt = estimate.prompt.zhHans ?? estimate.prompt.zh;
    assert.match(prompt, /8\.64.*9/u);
    assert.match(prompt, /2\.4.*2\.5/u);
    assert.match(prompt, /估算长度.*准确长度/u);
    assert.equal(estimate.answer, contract.complete);
    assert.equal(questionAnswerMatches(gradingQuestion(estimate), estimate.answer), true);
    for (const partial of contract.partials) {
      assert.equal(questionAnswerMatches(gradingQuestion(estimate), partial), false, `${estimate.id}: ${partial}`);
    }
  }

  const equation = byId.get("hjb-primary-ds-v1-p6-204");
  assert.ok(equation);
  if (equation) {
    const contract = structuredHjbPrimaryContracts["hjb-primary-ds-v1-p6-204"];
    const prompt = equation.prompt.zhHans ?? equation.prompt.zh;
    assert.match(prompt, /依次填写.*方程.*x.*科技书/u);
    assert.equal(equation.answer, contract.complete);
    assert.equal(questionAnswerMatches(gradingQuestion(equation), equation.answer), true);
    for (const alternative of contract.alternatives) {
      assert.equal(questionAnswerMatches(gradingQuestion(equation), alternative), true, `${equation.id}: ${alternative}`);
    }
    for (const partial of contract.partials) {
      assert.equal(questionAnswerMatches(gradingQuestion(equation), partial), false, `${equation.id}: ${partial}`);
    }
  }
});

test("HJB junior simplify-then-evaluate contracts require both deterministic fields", () => {
  assert.equal(Object.keys(structuredSimplifyContracts).length, 15);
  for (const [id, [complete, simplifiedOnly, valueOnly]] of Object.entries(structuredSimplifyContracts)) {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    if (!question) continue;
    const prompt = question.prompt.zhHans ?? question.prompt.zh;
    assert.match(prompt, /按“化简结果；代入值”/u, id);
    assert.equal(question.answer, complete, `${id} canonical pair`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), complete), true, `${id} full response`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), simplifiedOnly), false, `${id} simplified-only partial`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), valueOnly), false, `${id} value-only partial`);
  }
});
