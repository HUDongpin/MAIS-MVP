import assert from "node:assert/strict";
import test from "node:test";

import { mainlandHjbHighQuestions } from "@/data/mainlandHjbHighQuestions";
import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";
import { mainlandHjbPrimaryLessonSeeds } from "@/data/mainlandHjbPrimaryLessons";
import { mainlandHjbPrimaryQuestions } from "@/data/mainlandHjbPrimaryQuestions";
import { translateHjbTextToEnglish } from "@/data/hjbQuestionLocalization";
import { questionAnswerMatches } from "@/lib/server/answerMatching";
import type { Question } from "@/types";

const allHjbQuestions = [
  ...mainlandHjbPrimaryQuestions,
  ...mainlandHjbJuniorQuestions,
  ...mainlandHjbHighQuestions
];
const byId = new Map(allHjbQuestions.map((question) => [question.id, question]));

function requiredQuestion(id: string) {
  const question = byId.get(id);
  assert.ok(question, `Missing HJB regression question ${id}`);
  return question;
}

function gradingQuestion(question: Question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("HJB math localization converts complete superscript runs without mixed caret notation", () => {
  assert.equal(translateHjbTextToEnglish("108x¹²y⁵"), "108x^12y^5");
  assert.equal(translateHjbTextToEnglish("3a²⁴"), "3a^24");
  assert.equal(translateHjbTextToEnglish("2xᵐ⁺¹y²"), "2x^(m+1)y^2");
  assert.equal(translateHjbTextToEnglish("aⁿ⁻¹"), "a^(n-1)");
  assert.equal(translateHjbTextToEnglish("f⁻¹(x)"), "f^(-1)(x)");
});

test("HJB Primary multiplication lesson exposes natural, mathematically complete English", () => {
  const method = requiredQuestion("hjb-primary-ds-v1-p2-077");
  assert.equal(
    method.explanation.en,
    "Three rows with 6 stars in each row make 3 groups of 6, so 3×6=18. There are 18 stars altogether."
  );

  const interval = requiredQuestion("hjb-primary-ds-v1-p2-075");
  assert.equal(
    interval.prompt.en,
    "Eight flowerpots are arranged in one row along a school corridor. One flower stand is placed between each pair of adjacent flowerpots. How many flower stands are needed? Write a number sentence and answer."
  );

  const lesson = mainlandHjbPrimaryLessonSeeds.find(
    (seed) => seed.topicId === "hjb-primary-p2-upper-multiplication-facts"
  );
  assert.ok(lesson);
  const concept = lesson.blocks.find((block) => block.type === "concept");
  assert.ok(concept);
  assert.ok(concept.content);
  assert.match(
    concept.content.en,
    /A representative method is: Three rows with 6 stars in each row make 3 groups of 6, so 3×6=18\. There are 18 stars altogether\./u
  );
  assert.doesNotMatch(`${concept.content.en} ${interval.prompt.en}`, /term-[0-9a-f]+|\bparallel\b/iu);
});

test("HJB Primary worked examples localize question-specific English canonicals back to Chinese", () => {
  const lesson = mainlandHjbPrimaryLessonSeeds.find(
    (seed) => seed.topicId === "hjb-primary-p1-lower-within-100-add-sub"
  );
  const worked = lesson?.blocks.find((block) => block.type === "worked-example")?.content;
  assert.ok(worked);
  assert.match(worked.en, /Answer: 20 stickers\./u);
  assert.match(worked.zhHans ?? worked.zh, /答案：20张。/u);
  assert.match(worked.zh, /答案：20張。/u);
  assert.doesNotMatch(`${worked.zhHans} ${worked.zh}`, /stickers|picture cards/iu);
});

test("reviewed HJB multiple-choice repairs have the independently expected unique option", () => {
  const expectedIndexes: Record<string, number> = {
    "hjb-primary-ds-v1-p2-217": 1,
    "hjb-primary-ds-v1-p3-007": 2,
    "hjb-primary-ds-v1-p3-073": 3,
    "hjb-primary-ds-v1-p4-079": 0,
    "hjb-primary-ds-v1-p4-103": 2,
    "hjb-primary-ds-v1-p4-151": 1,
    "hjb-primary-ds-v1-p6-040": 2,
    "hjb-primary-ds-v1-p6-207": 1,
    "hjb-junior-ds-v2-s3-262": 0,
    "hjb-junior-ds-v2-s3-492": 0
  };

  for (const [id, expectedIndex] of Object.entries(expectedIndexes)) {
    const question = requiredQuestion(id);
    assert.equal(question.type, "multiple-choice", `${id} type`);
    assert.equal(question.options?.length, 4, `${id} options`);
    const hits = (question.options ?? []).map((option) =>
      questionAnswerMatches(gradingQuestion(question), option.zhHans ?? option.zh)
    );
    assert.deepEqual(hits, [0, 1, 2, 3].map((index) => index === expectedIndex), `${id} option hits`);
  }
});

test("reviewed HJB canonical math defects use their independently recomputed results", () => {
  const expectedAnswers: Record<string, string> = {
    "hjb-primary-ds-v1-p2-232": "44",
    "hjb-primary-ds-v1-p3-073": "601 × 2",
    "hjb-junior-ds-v2-s1-258": "80",
    "hjb-junior-ds-v2-s2-180": "8和9",
    "hjb-junior-ds-v2-s3-492": "32"
  };
  for (const [id, answer] of Object.entries(expectedAnswers)) {
    const question = requiredQuestion(id);
    assert.equal(question.answer, answer, id);
    assert.equal(questionAnswerMatches(gradingQuestion(question), answer), true, `${id} canonical`);
  }

  const rays = requiredQuestion("hjb-primary-ds-v1-p6-224");
  assert.match(rays.answer, /射线AB、射线BA、射线BC、射线CB/u);
  assert.match(rays.answer, /AC=8 cm/u);
  assert.doesNotMatch(rays.answer, /射线AC.*射线CA/u);
  assert.match(rays.explanation.zhHans ?? rays.explanation.zh, /全部4条不同的射线/u);

  const exponent = requiredQuestion("hjb-high-ds-v2-s4-009");
  assert.match(exponent.prompt.zhHans ?? exponent.prompt.zh, /a\^\{2023\}\+b\^\{2024\}/u);
  assert.doesNotMatch(exponent.prompt.zhHans ?? exponent.prompt.zh, /a²⁰²³/u);
  assert.equal(exponent.answer, "-1");
});

test("reviewed HJB unit contracts accept bare and exact contextual units while rejecting incompatible units", () => {
  const unitCases = [
    ["hjb-primary-ds-v1-p1-056", "3", "3只"],
    ["hjb-primary-ds-v1-p1-057", "4", "4个"],
    ["hjb-primary-ds-v1-p1-062", "3", "3个"],
    ["hjb-primary-ds-v1-p1-065", "7", "7个"],
    ["hjb-primary-ds-v1-p4-090", "680", "680个"],
    ["hjb-primary-ds-v1-p4-093", "28.26", "28.26平方米"],
    ["hjb-primary-ds-v1-p4-240", "232", "232本"],
    ["hjb-primary-ds-v1-p5-030", "20.6", "20.6元"],
    ["hjb-primary-ds-v1-p5-135", "40", "40人"],
    ["hjb-primary-ds-v1-p5-161", "3/5", "3/5米"],
    ["hjb-primary-ds-v1-p6-063", "28.26", "28.26平方厘米"],
    ["hjb-primary-ds-v1-p6-093", "28.26", "28.26平方厘米"],
    ["hjb-primary-ds-v1-p6-096", "19.625", "19.625平方厘米"],
    ["hjb-primary-ds-v1-p6-099", "65.94", "65.94平方米"],
    ["hjb-primary-ds-v1-p6-108", "28.26", "28.26平方米"],
    ["hjb-primary-ds-v1-p6-131", "88", "88平方分米"],
    ["hjb-primary-ds-v1-p6-135", "100.48", "100.48平方米"],
    ["hjb-junior-ds-v2-s1-258", "80", "80本"],
    ["hjb-junior-ds-v2-s1-300", "4", "4支"]
  ] as const;

  for (const [id, bare, explicit] of unitCases) {
    const question = requiredQuestion(id);
    assert.equal(questionAnswerMatches(gradingQuestion(question), bare), true, `${id} bare`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), explicit), true, `${id} explicit unit`);
    assert.equal(questionAnswerMatches(gradingQuestion(question), `${bare} cm`), false, `${id} incompatible unit`);
  }
});

test("multi-objective HJB primary prompts require every deterministic answer field", () => {
  const estimate = requiredQuestion("hjb-primary-ds-v1-p5-027");
  const estimatePrompt = estimate.prompt.zhHans ?? estimate.prompt.zh;
  assert.match(estimatePrompt, /8\.64.*9/u);
  assert.match(estimatePrompt, /2\.4.*2\.5/u);
  assert.match(estimatePrompt, /估算长度.*准确长度/u);
  assert.equal(estimate.answer, "估算3.6米；准确3.6米");
  assert.equal(questionAnswerMatches(gradingQuestion(estimate), estimate.answer), true);
  for (const partial of ["3.6", "3.6米", "估算3.6米", "准确3.6米"]) {
    assert.equal(questionAnswerMatches(gradingQuestion(estimate), partial), false, `${estimate.id}: ${partial}`);
  }

  const equation = requiredQuestion("hjb-primary-ds-v1-p6-204");
  const equationPrompt = equation.prompt.zhHans ?? equation.prompt.zh;
  assert.match(equationPrompt, /依次填写.*方程.*x.*科技书/u);
  assert.equal(equation.answer, "x+3x=120；x=30；90本");
  assert.equal(questionAnswerMatches(gradingQuestion(equation), equation.answer), true);
  assert.equal(questionAnswerMatches(gradingQuestion(equation), "3x+x=120；x=30；90本"), true);
  for (const partial of ["90", "90本", "x=30；90本", "x+3x=120；90本"]) {
    assert.equal(questionAnswerMatches(gradingQuestion(equation), partial), false, `${equation.id}: ${partial}`);
  }
});

test("single-input HJB prompts request exactly the response that is graded", () => {
  const narrowedPrompts: Record<string, RegExp> = {
    "hjb-primary-ds-v1-p2-077": /一共有多少颗/u,
    "hjb-primary-ds-v1-p2-080": /写出一个对应的乘法算式/u,
    "hjb-primary-ds-v1-p3-020": /大还是小/u,
    "hjb-primary-ds-v1-p3-216": /最受欢迎和最不受欢迎/u,
    "hjb-primary-ds-v1-p3-218": /多多少本/u,
    "hjb-primary-ds-v1-p3-220": /多多少人/u,
    "hjb-primary-ds-v1-p4-090": /一共有多少个/u,
    "hjb-primary-ds-v1-p4-147": /各有多少本/u,
    "hjb-primary-ds-v1-p5-122": /平均成绩是多少下/u,
    "hjb-junior-ds-v2-s2-174": /求这个矩形的长和宽/u
  };
  for (const [id, pattern] of Object.entries(narrowedPrompts)) {
    const prompt = requiredQuestion(id).prompt.zhHans ?? requiredQuestion(id).prompt.zh;
    assert.match(prompt, pattern, id);
    assert.doesNotMatch(
      prompt,
      /请先写出数量关系|完成统计表|列出关于x的.*方程|并写出推导过程|请列式解答|先估算再计算|列方程解应用题|列出方程并求解/u,
      id
    );
  }

  for (const id of [
    "hjb-primary-ds-v1-p1-210",
    "hjb-primary-ds-v1-p4-146",
    "hjb-primary-ds-v1-p6-126",
    "hjb-primary-ds-v1-p6-216"
  ]) {
    assert.doesNotMatch(requiredQuestion(id).prompt.zhHans ?? requiredQuestion(id).prompt.zh, /下面哪|选择/u, id);
  }
});

test("reviewed HJB explanations contain direct finished reasoning without internal correction narration", () => {
  const selfCorrectionPattern = /(?:[？?]\s*(?:检查|更正)|更正[:：]|答案却|修复前|当前作答)/u;
  for (const id of [
    "hjb-primary-ds-v1-p3-007",
    "hjb-primary-ds-v1-p6-207",
    "hjb-primary-ds-v1-p6-224",
    "hjb-junior-ds-v2-s2-210",
    "hjb-junior-ds-v2-s3-492"
  ]) {
    assert.doesNotMatch(requiredQuestion(id).explanation.zhHans ?? requiredQuestion(id).explanation.zh, selfCorrectionPattern, id);
  }

  for (const id of [
    "hjb-high-ds-v2-s4-021",
    "hjb-high-ds-v2-s4-036",
    "hjb-high-ds-v2-s4-071",
    "hjb-high-ds-v2-s4-132",
    "hjb-high-ds-v2-s4-165",
    "hjb-high-ds-v2-s4-174",
    "hjb-high-ds-v2-s4-177",
    "hjb-high-ds-v2-s4-222",
    "hjb-high-ds-v2-s4-240"
  ]) {
    assert.doesNotMatch(requiredQuestion(id).prompt.zhHans ?? requiredQuestion(id).prompt.zh, /说明理由|写出推导过程|证明/u, id);
  }
});

test("reviewed HJB explanations expose every condition and proof branch used by learner-visible lesson blocks", () => {
  const ratioBooks = requiredQuestion("hjb-primary-ds-v1-p4-147");
  const ratioExplanation = ratioBooks.explanation.zhHans ?? ratioBooks.explanation.zh;
  assert.match(ratioExplanation, /科技书和故事书共有240本/u);
  assert.match(ratioExplanation, /故事书.*科技书.*3倍/u);
  assert.match(ratioExplanation, /240÷4=60/u);

  const equationCheck = requiredQuestion("hjb-primary-ds-v1-p6-207");
  const equationExplanation = equationCheck.explanation.zhHans ?? equationCheck.explanation.zh;
  assert.match(equationExplanation, /2×3\+1=7≠5/u);
  assert.match(equationExplanation, /3×3-4=5/u);
  assert.match(equationExplanation, /4×3-3=9≠8/u);
  assert.match(equationExplanation, /5×3\+2=17≠18/u);

  const exponent = requiredQuestion("hjb-high-ds-v2-s4-009");
  const exponentExplanation = exponent.explanation.zhHans ?? exponent.explanation.zh;
  assert.match(exponentExplanation, /若ab=1.*a²=b.*a³=1/u);
  assert.match(exponentExplanation, /a=1.*两两不同矛盾/u);
  assert.match(exponent.explanation.en, /If ab=1.*a²=b.*a³=1/iu);
  assert.match(exponent.explanation.en, /a=1.*contradict/iu);
});

test("HJB primary classification review states the original groups before asking for a correction", () => {
  const question = requiredQuestion("hjb-primary-ds-v1-p1-116");
  const prompt = question.prompt.zhHans ?? question.prompt.zh;
  assert.match(prompt, /第一类①②，第二类③④，第三类⑤⑥/u);
  assert.match(prompt, /重新分成两类/u);
  assert.match(question.answer, /①②③是数和运算/u);
  assert.match(question.answer, /④⑤⑥是立体图形/u);
  assert.doesNotMatch(question.prompt.en, /term-[a-f0-9]/u);
  assert.match(question.prompt.en, /first group/i);
  assert.equal(questionAnswerMatches(gradingQuestion(question), question.answer), true);
});
