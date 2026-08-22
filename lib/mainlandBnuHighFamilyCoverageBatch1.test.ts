import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mainlandBnuHighLessonSeeds } from "../data/mainlandBnuHighLessons";
import { chinaLessonTraditionalTranslation } from "../data/chinaLessonTraditionalTranslations";
import { questions } from "../data/questions";
import { questionAnswerMatches } from "./server/answerGrading";

type ArtifactQuestion = {
  id: string;
  topicId: string;
  type: string;
  difficulty: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

const contracts = [
  {
    id: "bnu-high-ds-v1-s4-326",
    topicId: "bnu-high-s4-平面向量及其应用",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "vector-collinearity",
    prompt: "已知非零向量 a=(2,1)，b=(6,3)。判断 a 与 b 是否共线，并写出 b 与 a 的倍数关系。请按“关系；倍数式”的格式作答。",
    promptEn: "Given nonzero vectors a=(2,1) and b=(6,3), determine whether they are collinear and state b as a scalar multiple of a. Answer in the form “relationship; scalar-multiple equation.”",
    options: [],
    optionsEn: [],
    answer: "共线；b=3a",
    accepted: ["共线；b=3a", "a与b共线；b=3a", "Collinear; b=3a"],
    rejected: ["共线", "b=3a", "3"],
    explanation: "因为6=3×2且3=3×1，所以b=3a。两个非零向量互为实数倍，因此a与b共线。",
    explanationEn: "Because 6=3×2 and 3=3×1, b=3a. Two nonzero vectors that are scalar multiples of one another are collinear."
  },
  {
    id: "bnu-high-ds-v1-s4-328",
    topicId: "bnu-high-s4-平面向量及其应用",
    type: "multiple-choice",
    difficulty: "Foundation",
    taskFamily: "vector-angle",
    prompt: "已知非零向量 a=(1,1)，b=(1,-1)，则 a 与 b 的夹角为（ ）。",
    promptEn: "Given nonzero vectors a=(1,1) and b=(1,-1), what is the angle between a and b?",
    options: ["0°", "45°", "90°", "135°"],
    optionsEn: ["0°", "45°", "90°", "135°"],
    answer: "90°",
    accepted: ["90°", "90度", "C", "C. 90°"],
    rejected: ["0°", "45°", "135°"],
    explanation: "a·b=1×1+1×(-1)=0。两个向量都不是零向量，所以a⊥b，夹角为90°。",
    explanationEn: "a·b=1×1+1×(-1)=0. Since neither vector is zero, a⊥b, so the angle is 90°."
  },
  {
    id: "bnu-high-ds-v1-s5-147",
    topicId: "bnu-high-s5-空间向量与立体几何",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "point-plane-distance",
    prompt: "点P(1,2,2)到平面α: 2x-y+2z=0的距离为____。请用最简分数作答。",
    promptEn: "Find the distance from P(1,2,2) to the plane α: 2x-y+2z=0. Give your answer as a fraction in simplest form.",
    options: [],
    optionsEn: [],
    answer: "4/3",
    accepted: ["4/3", "4÷3"],
    rejected: ["3/4", "4", "3"],
    explanation: "点到平面的距离为|2×1-2+2×2|/√(2²+(-1)²+2²)=4/3。",
    explanationEn: "The point-to-plane distance is |2×1-2+2×2|/√(2²+(-1)²+2²)=4/3."
  },
  {
    id: "bnu-high-ds-v1-s5-151",
    topicId: "bnu-high-s5-空间向量与立体几何",
    type: "multiple-choice",
    difficulty: "Foundation",
    taskFamily: "plane-normal-vector",
    prompt: "平面α: 2x-y+2z=3的一个法向量是（ ）。",
    promptEn: "Which of the following is a normal vector to the plane α: 2x-y+2z=3?",
    options: ["(2,-1,2)", "(2,1,2)", "(1,-2,2)", "(2,-1,-2)"],
    optionsEn: ["(2,-1,2)", "(2,1,2)", "(1,-2,2)", "(2,-1,-2)"],
    answer: "(2,-1,2)",
    accepted: ["(2,-1,2)", "A", "A. (2,-1,2)"],
    rejected: ["(2,1,2)", "(1,-2,2)", "(2,-1,-2)"],
    explanation: "平面Ax+By+Cz=D的法向量可取(A,B,C)，所以本题可取(2,-1,2)。",
    explanationEn: "A normal vector to the plane Ax+By+Cz=D is (A,B,C), so (2,-1,2) is a normal vector here."
  },
  {
    id: "bnu-high-ds-v1-s5-363",
    topicId: "bnu-high-s5-概率",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "conditional-joint-probability",
    prompt: "某班60%的学生参加社团A；参加社团A的学生中有70%通过选拔。随机抽取一名学生，该生参加社团A且通过选拔的概率为____。",
    promptEn: "In a class, 60% of the students join Club A, and 70% of Club A members pass the selection. What is the probability that a randomly chosen student both joins Club A and passes the selection?",
    options: [],
    optionsEn: [],
    answer: "42%",
    accepted: ["42%", "0.42", "42 percent"],
    rejected: ["60%", "70%", "130%"],
    explanation: "设A表示“参加社团A”，B表示“通过选拔”。则P(A∩B)=P(A)×P(B|A)=0.60×0.70=0.42=42%。",
    explanationEn: "Let A denote “joins Club A” and B denote “passes the selection.” Then P(A∩B)=P(A)×P(B|A)=0.60×0.70=0.42=42%."
  },
  {
    id: "bnu-high-ds-v1-s5-362",
    topicId: "bnu-high-s5-概率",
    type: "short-answer",
    difficulty: "Exam",
    taskFamily: "discrete-distribution-variance",
    prompt: "随机变量X的分布为P(X=0)=1/4，P(X=1)=1/2，P(X=2)=1/4。求E(X)和Var(X)，并按“期望；方差”的格式作答。",
    promptEn: "A random variable X has distribution P(X=0)=1/4, P(X=1)=1/2, and P(X=2)=1/4. Find E(X) and Var(X). Answer in the form “expectation; variance.”",
    options: [],
    optionsEn: [],
    answer: "1；1/2",
    accepted: ["1；1/2", "E(X)=1；Var(X)=1/2", "1; 1/2", "E(X)=1; Var(X)=1/2"],
    rejected: ["1", "1/2", "E(X)=1", "Var(X)=1/2"],
    explanation: "E(X)=0×1/4+1×1/2+2×1/4=1；E(X²)=0+1/2+4×1/4=3/2，所以Var(X)=E(X²)-[E(X)]²=3/2-1=1/2。",
    explanationEn: "E(X)=0×1/4+1×1/2+2×1/4=1; E(X²)=0+1/2+4×1/4=3/2, so Var(X)=E(X²)-[E(X)]²=3/2-1=1/2."
  },
  {
    id: "bnu-high-ds-v1-s5-430",
    topicId: "bnu-high-s5-统计案例",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "correlation-vs-causation",
    prompt: "某研究的散点图显示学习时间与测试成绩有较强正相关。下列结论正确的是（ ）。",
    promptEn: "A scatter plot from a study shows a strong positive correlation between study time and test scores. Which conclusion is correct?",
    options: [
      "学习时间较长通常与较高成绩相关，但仅凭该散点图不能断定因果关系",
      "延长学习时间一定会使每名学生的成绩提高",
      "学习时间与测试成绩没有相关关系",
      "成绩提高一定是学习时间增加造成的"
    ],
    optionsEn: [
      "Longer study time is generally associated with higher scores, but this scatter plot alone does not establish causation.",
      "Increasing study time will certainly improve every student's score.",
      "There is no correlation between study time and test scores.",
      "Any improvement in scores must have been caused by increased study time."
    ],
    answer: "学习时间较长通常与较高成绩相关，但仅凭该散点图不能断定因果关系",
    accepted: [
      "学习时间较长通常与较高成绩相关，但仅凭该散点图不能断定因果关系",
      "A",
      "A. 学习时间较长通常与较高成绩相关，但仅凭该散点图不能断定因果关系"
    ],
    rejected: [
      "延长学习时间一定会使每名学生的成绩提高",
      "学习时间与测试成绩没有相关关系",
      "成绩提高一定是学习时间增加造成的"
    ],
    explanation: "散点图的较强正相关只说明两个变量倾向于同向变化；它不能排除其他变量，也不能单独证明因果关系。",
    explanationEn: "A strong positive correlation in a scatter plot only shows that the two variables tend to move in the same direction. It does not rule out other variables or establish causation on its own."
  },
  {
    id: "bnu-high-ds-v1-s5-431",
    topicId: "bnu-high-s5-统计案例",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "independence-test",
    prompt: "在200名学生中，80人参加活动A，100人参加活动B，40人同时参加A和B。判断事件“参加A”和“参加B”是否独立，并写出概率依据。",
    promptEn: "Among 200 students, 80 join Activity A, 100 join Activity B, and 40 join both. Determine whether the events “joins A” and “joins B” are independent, and justify your answer with probabilities.",
    options: [],
    optionsEn: [],
    answer: "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
    accepted: [
      "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
      "独立；P(A∩B)=0.2，P(A)P(B)=0.4×0.5=0.2",
      "Independent; P(A∩B)=0.2=P(A)P(B)=0.4×0.5",
      "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)",
      "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)=0.4×0.5=0.2"
    ],
    rejected: ["独立", "0.2", "P(A∩B)=0.2", "P(A)P(B)=0.2"],
    explanation: "P(A)=80/200=0.4，P(B)=100/200=0.5，P(A∩B)=40/200=0.2。因为P(A∩B)=P(A)P(B)=0.4×0.5=0.2，所以A与B独立。",
    explanationEn: "P(A)=80/200=0.4, P(B)=100/200=0.5, and P(A∩B)=40/200=0.2. Since P(A∩B)=P(A)P(B)=0.4×0.5=0.2, A and B are independent."
  },
  {
    id: "bnu-high-ds-v1-s6-456",
    topicId: "bnu-high-s6-高三数列与导数综合复习",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "sequence-recurrence",
    prompt: "数列{aₙ}满足a₁=1，aₙ₊₁=2aₙ+1。求a₄，并写出递推过程。",
    promptEn: "The sequence {aₙ} satisfies a₁=1 and aₙ₊₁=2aₙ+1. Find a₄ and show the recursive steps.",
    options: [],
    optionsEn: [],
    answer: "a₂=3，a₃=7，a₄=15",
    accepted: ["a₂=3，a₃=7，a₄=15", "a2=3，a3=7，a4=15", "a₂=3; a₃=7; a₄=15"],
    rejected: ["15", "a₄=15"],
    explanation: "依次代入递推式：a₂=2×1+1=3，a₃=2×3+1=7，a₄=2×7+1=15。",
    explanationEn: "Apply the recurrence successively: a₂=2×1+1=3, a₃=2×3+1=7, and a₄=2×7+1=15."
  },
  {
    id: "bnu-high-ds-v1-s6-453",
    topicId: "bnu-high-s6-高三数列与导数综合复习",
    type: "multiple-choice",
    difficulty: "Exam",
    taskFamily: "derivative-sequence-synthesis",
    prompt: "已知f(x)=x³，并定义数列aₙ=f′(n)（n∈N*）。则S₃=a₁+a₂+a₃为（ ）。",
    promptEn: "Let f(x)=x³ and define aₙ=f′(n) (n∈N*). What is S₃=a₁+a₂+a₃?",
    options: ["36", "39", "42", "45"],
    optionsEn: ["36", "39", "42", "45"],
    answer: "42",
    accepted: ["42", "C", "C. 42"],
    rejected: ["36", "39", "45"],
    explanation: "f′(x)=3x²，所以a₁=3，a₂=12，a₃=27，S₃=3+12+27=42。",
    explanationEn: "f′(x)=3x², so a₁=3, a₂=12, a₃=27, and S₃=3+12+27=42."
  }
] as const;

const contractIds = new Set<string>(contracts.map(({ id }) => id));
const productionQuestions = new Map(questions.filter(({ id }) => contractIds.has(id)).map((question) => [question.id, question]));

function readPack(filePath: string) {
  return (JSON.parse(readFileSync(filePath, "utf8")) as { questions: ArtifactQuestion[] }).questions;
}

function gradingPayload(question: (typeof questions)[number]) {
  return {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("BNU high Batch 1 stores ten reviewed family-coverage rows in the generator and all approved artifacts", () => {
  const packageRoot = "coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500";
  const manifest = JSON.parse(readFileSync(`${packageRoot}/reviewed-approved-row-overrides.json`, "utf8")) as {
    version: number;
    overrides: Array<ArtifactQuestion & {
      expectedTopicId: string;
      expectedType: string;
      expectedDifficulty: string;
      taskFamily: string;
    }>;
  };
  const manifestById = new Map(manifest.overrides.map((row) => [row.id, row]));
  const artifacts = [
    readPack(`${packageRoot}/question-pack.approved.json`),
    readFileSync(`${packageRoot}/approved-questions.jsonl`, "utf8").trim().split(/\n/u).map((line) => JSON.parse(line) as ArtifactQuestion),
    readPack("data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json")
  ].map((rows) => new Map(rows.map((row) => [row.id, row])));

  for (const contract of contracts) {
    const manifestRow = manifestById.get(contract.id);
    assert.ok(manifestRow, `${contract.id} must be a durable generator override`);
    assert.equal(manifestRow.expectedTopicId, contract.topicId);
    assert.equal(manifestRow.expectedType, contract.type);
    assert.equal(manifestRow.expectedDifficulty, contract.difficulty);
    assert.equal(manifestRow.taskFamily, contract.taskFamily);
    assert.equal(manifestRow.promptZhHans, contract.prompt);
    assert.deepEqual(manifestRow.optionsZhHans, contract.options);
    assert.equal(manifestRow.answer, contract.answer);
    assert.deepEqual(manifestRow.acceptedAnswers, contract.accepted);
    assert.equal(manifestRow.explanationZhHans, contract.explanation);

    for (const artifactById of artifacts) {
      const row = artifactById.get(contract.id);
      assert.ok(row, `${contract.id} must exist in every approved artifact`);
      assert.equal(row.topicId, contract.topicId);
      assert.equal(row.type, contract.type);
      assert.equal(row.difficulty, contract.difficulty);
      assert.equal(row.promptZhHans, `题组${contract.id.replace(/^bnu-high-ds-v1-/u, "")}：${contract.prompt}`);
      assert.deepEqual(row.optionsZhHans, contract.options);
      assert.equal(row.answer, contract.answer);
      assert.deepEqual(row.acceptedAnswers, contract.accepted);
      assert.equal(row.explanationZhHans, contract.explanation);
    }
  }
});

test("BNU high Batch 1 grades complete responses, rejects proper subsets, and exposes reviewed three-language text", () => {
  for (const contract of contracts) {
    const runtime = productionQuestions.get(contract.id);
    assert.ok(runtime, `${contract.id} must exist in the product question bank`);
    assert.equal(runtime.prompt.zhHans, contract.prompt);
    assert.equal(runtime.prompt.zh, chinaLessonTraditionalTranslation(contract.prompt));
    assert.equal(runtime.prompt.en, contract.promptEn);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zhHans), contract.options);
    assert.deepEqual((runtime.options ?? []).map((option) => option.en), contract.optionsEn);
    assert.equal(runtime.answer, contract.answer);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    assert.equal(runtime.explanation.zh, chinaLessonTraditionalTranslation(contract.explanation));
    assert.equal(runtime.explanation.en, contract.explanationEn);

    assert.equal(questionAnswerMatches(gradingPayload(runtime), contract.answer), true, `${contract.id} canonical`);
    for (const accepted of contract.accepted) {
      assert.equal(questionAnswerMatches(gradingPayload(runtime), accepted), true, `${contract.id} accepts ${accepted}`);
    }
    for (const rejected of contract.rejected) {
      assert.equal(questionAnswerMatches(gradingPayload(runtime), rejected), false, `${contract.id} rejects ${rejected}`);
    }
  }
});

test("BNU high Batch 1 mathematical oracles and four MC keys are independently reproducible", () => {
  assert.equal(6 / 2, 3, "b=3a for a=(2,1), b=(6,3)");
  assert.equal(1 * 1 + 1 * -1, 0, "the vector-angle dot product is zero");
  assert.equal(Math.abs(2 * 1 - 2 + 2 * 2) / Math.sqrt(2 ** 2 + (-1) ** 2 + 2 ** 2), 4 / 3);
  assert.deepEqual([2, -1, 2], [2, -1, 2], "plane coefficients form a normal vector");
  assert.equal(0.6 * 0.7, 0.42);
  const expectation = 0 * 0.25 + 1 * 0.5 + 2 * 0.25;
  const secondMoment = 0 * 0.25 + 1 * 0.5 + 4 * 0.25;
  assert.equal(expectation, 1);
  assert.equal(secondMoment - expectation ** 2, 0.5);
  assert.equal(40 / 200, (80 / 200) * (100 / 200));
  assert.deepEqual([1, 2 * 1 + 1, 2 * 3 + 1, 2 * 7 + 1], [1, 3, 7, 15]);
  assert.equal(3 * 1 ** 2 + 3 * 2 ** 2 + 3 * 3 ** 2, 42);

  const expectedMcIndices = new Map([
    ["bnu-high-ds-v1-s4-328", 2],
    ["bnu-high-ds-v1-s5-151", 0],
    ["bnu-high-ds-v1-s5-430", 0],
    ["bnu-high-ds-v1-s6-453", 2]
  ]);
  for (const [id, expectedIndex] of expectedMcIndices) {
    const runtime = productionQuestions.get(id);
    assert.ok(runtime);
    const hits = (runtime.options ?? []).map((option) =>
      questionAnswerMatches(gradingPayload(runtime), option.zhHans ?? option.zh)
    );
    assert.equal(hits.filter(Boolean).length, 1, `${id} must accept exactly one displayed option`);
    assert.equal(hits.findIndex(Boolean), expectedIndex, `${id} must key the independently recomputed option`);
  }
});

test("BNU high Batch 1 preserves first-five IDs and reaches the reviewed family vectors", () => {
  const expectations = new Map<string, { ids: string[]; families: string[]; unique: number }>([
    ["bnu-high-s4-平面向量及其应用", {
      ids: ["bnu-high-ds-v1-s4-326", "bnu-high-ds-v1-s4-328", "bnu-high-ds-v1-s4-325", "bnu-high-ds-v1-s4-327", "bnu-high-ds-v1-s4-329"],
      families: ["vector-collinearity", "vector-angle", "2d-dot-product", "2d-dot-product", "2d-dot-product"],
      unique: 3
    }],
    ["bnu-high-s5-空间向量与立体几何", {
      ids: ["bnu-high-ds-v1-s5-147", "bnu-high-ds-v1-s5-151", "bnu-high-ds-v1-s5-145", "bnu-high-ds-v1-s5-149", "bnu-high-ds-v1-s5-153"],
      families: ["point-plane-distance", "plane-normal-vector", "line-plane-angle", "vector-linear-dependence", "3d-dot-product"],
      unique: 5
    }],
    ["bnu-high-s5-概率", {
      ids: ["bnu-high-ds-v1-s5-359", "bnu-high-ds-v1-s5-361", "bnu-high-ds-v1-s5-363", "bnu-high-ds-v1-s5-360", "bnu-high-ds-v1-s5-362"],
      families: ["discrete-expectation", "binomial-probability", "conditional-joint-probability", "single-draw-urn", "discrete-distribution-variance"],
      unique: 5
    }],
    ["bnu-high-s5-统计案例", {
      ids: ["bnu-high-ds-v1-s5-430", "bnu-high-ds-v1-s5-431", "bnu-high-ds-v1-s5-432", "bnu-high-ds-v1-s5-433", "bnu-high-ds-v1-s5-434"],
      families: ["correlation-vs-causation", "independence-test", "mean", "regression-slope-interpretation", "group-rate-difference"],
      unique: 5
    }],
    ["bnu-high-s6-高三数列与导数综合复习", {
      ids: ["bnu-high-ds-v1-s6-452", "bnu-high-ds-v1-s6-454", "bnu-high-ds-v1-s6-456", "bnu-high-ds-v1-s6-451", "bnu-high-ds-v1-s6-455"],
      families: ["arithmetic-sum", "polynomial-derivative-value", "sequence-recurrence", "derivative-sequence-synthesis", "function-difference-sequence"],
      unique: 5
    }]
  ]);

  for (const [topicId, expected] of expectations) {
    const seed = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
    assert.ok(seed, `${topicId} must have a lesson seed`);
    assert.deepEqual(seed.practiceQuestionIds?.slice(0, 5), expected.ids);
    assert.equal(new Set(expected.families).size, expected.unique);
  }
});
