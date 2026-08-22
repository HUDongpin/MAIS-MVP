import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  mainlandBnuHighLessonSeeds,
  mainlandBnuHighReviewedWorkedExamples
} from "../data/mainlandBnuHighLessons";
import { chinaLessonEnglishTranslation } from "../data/chinaLessonEnglishTranslations";
import { chinaLessonTraditionalTranslation } from "../data/chinaLessonTraditionalTranslations";
import { questions } from "../data/questions";
import { validateRestoredTranslation } from "../scripts/china-lesson-english-translation-validation";
import { mapDifficultyToActive } from "./difficulty";
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

type Contract = {
  id: string;
  topicId: string;
  type: "multiple-choice" | "fill-in" | "short-answer";
  difficulty: "Foundation" | "Core" | "Exam";
  taskFamily: string;
  prompt: string;
  promptZh: string;
  promptEn: string;
  options: string[];
  optionsZh: string[];
  optionsEn: string[];
  answer: string;
  accepted: string[];
  rejected: string[];
  explanation: string;
  explanationZh: string;
  explanationEn: string;
};

const contracts: Contract[] = [
  {
    id: "bnu-high-ds-v1-s4-434",
    topicId: "bnu-high-s4-复数",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "complex-multiplication",
    prompt: "计算复数(2+i)(3-2i)。",
    promptZh: "計算複數(2+i)(3-2i)。",
    promptEn: "Compute the complex number (2+i)(3-2i).",
    options: [], optionsZh: [], optionsEn: [],
    answer: "8-i",
    accepted: ["8-i", "8−i", "8-1i", "8 - i"],
    rejected: ["8", "8+i", "4-i", "8-2i"],
    explanation: "展开并利用i²=-1，(2+i)(3-2i)=6-4i+3i-2i²=6-i+2=8-i。",
    explanationZh: "展開並利用i²=-1，(2+i)(3-2i)=6-4i+3i-2i²=6-i+2=8-i。",
    explanationEn: "Expand and use i²=-1: (2+i)(3-2i)=6-4i+3i-2i²=6-i+2=8-i."
  },
  {
    id: "bnu-high-ds-v1-s4-435",
    topicId: "bnu-high-s4-复数",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "complex-conjugate",
    prompt: "复数z=3-4i的共轭复数是____。",
    promptZh: "複數z=3-4i的共軛複數是____。",
    promptEn: "The complex conjugate of z=3-4i is ____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "3+4i",
    accepted: ["3+4i", "3 + 4i", "conj(z)=3+4i"],
    rejected: ["3-4i", "-3+4i", "4+3i", "5"],
    explanation: "共轭复数保持实部不变，并把虚部的符号改为相反数，所以3-4i的共轭复数是3+4i。",
    explanationZh: "共軛複數保持實部不變，並把虛部的符號改為相反數，所以3-4i的共軛複數是3+4i。",
    explanationEn: "A complex conjugate keeps the real part and reverses the sign of the imaginary part, so the conjugate of 3-4i is 3+4i."
  },
  {
    id: "bnu-high-ds-v1-s4-469",
    topicId: "bnu-high-s4-立体几何初步",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "skew-lines-in-cube",
    prompt: "在正方体ABCD-A₁B₁C₁D₁中，下列哪一对棱所在的直线互为异面直线？",
    promptZh: "在正方體ABCD-A₁B₁C₁D₁中，下列哪一對稜所在的直線互為異面直線？",
    promptEn: "In cube ABCD-A₁B₁C₁D₁, which pair of lines containing the listed edges are skew?",
    options: ["AB与CD", "AB与A₁B₁", "AB与CC₁", "AB与BC"],
    optionsZh: ["AB與CD", "AB與A₁B₁", "AB與CC₁", "AB與BC"],
    optionsEn: ["Lines AB and CD", "Lines AB and A₁B₁", "Lines AB and CC₁", "Lines AB and BC"],
    answer: "AB与CC₁",
    accepted: ["AB与CC₁", "AB與CC₁", "Lines AB and CC₁", "C", "C. AB与CC₁"],
    rejected: ["AB与CD", "AB与A₁B₁", "AB与BC", "平行"],
    explanation: "AB与CD、A₁B₁均平行，AB与BC相交；AB与CC₁既不相交也不平行，且不共面，所以互为异面直线。",
    explanationZh: "AB與CD、A₁B₁均平行，AB與BC相交；AB與CC₁既不相交也不平行，且不共面，所以互為異面直線。",
    explanationEn: "AB is parallel to both CD and A₁B₁, and AB intersects BC. The lines AB and CC₁ neither intersect nor are parallel, and they are not coplanar, so they are skew."
  },
  {
    id: "bnu-high-ds-v1-s4-470",
    topicId: "bnu-high-s4-立体几何初步",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "pyramid-volume",
    prompt: "一个棱锥的底面面积为24，高为5。求这个棱锥的体积。",
    promptZh: "一個稜錐的底面面積為24，高為5。求這個稜錐的體積。",
    promptEn: "A pyramid has base area 24 and perpendicular height 5. Find its volume.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "40",
    accepted: ["40", "40立方单位", "40立方單位", "40 cubic units"],
    rejected: ["120", "60", "29", "40平方单位"],
    explanation: "棱锥体积V=(1/3)Sh=(1/3)×24×5=40。",
    explanationZh: "稜錐體積V=(1/3)Sh=(1/3)×24×5=40。",
    explanationEn: "The volume of a pyramid is V=(1/3)Sh=(1/3)×24×5=40."
  },
  {
    id: "bnu-high-ds-v1-s4-327",
    topicId: "bnu-high-s4-平面向量及其应用",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "vector-linear-combination",
    prompt: "已知向量a=(2,-1)，b=(-3,4)，则2a-b=____。",
    promptZh: "已知向量a=(2,-1)，b=(-3,4)，則2a-b=____。",
    promptEn: "Given vectors a=(2,-1) and b=(-3,4), 2a-b=____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "(7,-6)",
    accepted: ["(7,-6)", "(7, -6)", "2a-b=(7,-6)", "⟨7,-6⟩"],
    rejected: ["(1,3)", "(-7,6)", "(7,6)", "7", "-6"],
    explanation: "2a-b=2(2,-1)-(-3,4)=(4,-2)-(-3,4)=(7,-6)。",
    explanationZh: "2a-b=2(2,-1)-(-3,4)=(4,-2)-(-3,4)=(7,-6)。",
    explanationEn: "2a-b=2(2,-1)-(-3,4)=(4,-2)-(-3,4)=(7,-6)."
  },
  {
    id: "bnu-high-ds-v1-s4-329",
    topicId: "bnu-high-s4-平面向量及其应用",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "vector-magnitude",
    prompt: "已知向量a=(-3,4)，求|a|。",
    promptZh: "已知向量a=(-3,4)，求|a|。",
    promptEn: "Given the vector a=(-3,4), find |a|.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "5",
    accepted: ["5", "|a|=5"],
    rejected: ["7", "1", "25", "(-3,4)"],
    explanation: "|a|=√[(-3)²+4²]=√25=5。",
    explanationZh: "|a|=√[(-3)²+4²]=√25=5。",
    explanationEn: "|a|=√[(-3)²+4²]=√25=5."
  },
  {
    id: "bnu-high-ds-v1-s4-289",
    topicId: "bnu-high-s4-三角函数",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "trigonometric-range",
    prompt: "函数y=2sin x-1的值域是（ ）。",
    promptZh: "函數y=2sin x-1的值域是（ ）。",
    promptEn: "What is the range of the function y=2sin x-1?",
    options: ["[-3,1]", "[-2,2]", "[-1,3]", "[-2,1]"],
    optionsZh: ["[-3,1]", "[-2,2]", "[-1,3]", "[-2,1]"],
    optionsEn: ["[-3,1]", "[-2,2]", "[-1,3]", "[-2,1]"],
    answer: "[-3,1]",
    accepted: ["[-3,1]", "[-3, 1]", "A", "A. [-3,1]"],
    rejected: ["[-2,2]", "[-1,3]", "[-2,1]", "(-3,1)", "-3", "1"],
    explanation: "因为-1≤sin x≤1，所以-2≤2sin x≤2，进而-3≤2sin x-1≤1，值域为[-3,1]。",
    explanationZh: "因為-1≤sin x≤1，所以-2≤2sin x≤2，進而-3≤2sin x-1≤1，值域為[-3,1]。",
    explanationEn: "Because -1≤sin x≤1, we have -2≤2sin x≤2 and hence -3≤2sin x-1≤1. Therefore, the range is [-3,1]."
  },
  {
    id: "bnu-high-ds-v1-s4-295",
    topicId: "bnu-high-s4-三角函数",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "trigonometric-phase-shift",
    prompt: "把函数y=sin x的图像变换为y=sin(x-π/3)的图像，需要（ ）。",
    promptZh: "把函數y=sin x的圖像變換為y=sin(x-π/3)的圖像，需要（ ）。",
    promptEn: "How should the graph of y=sin x be translated to obtain the graph of y=sin(x-π/3)?",
    options: ["向右平移π/3个单位", "向左平移π/3个单位", "向上平移π/3个单位", "向下平移π/3个单位"],
    optionsZh: ["向右平移π/3個單位", "向左平移π/3個單位", "向上平移π/3個單位", "向下平移π/3個單位"],
    optionsEn: ["Shift it right by π/3 units.", "Shift it left by π/3 units.", "Shift it up by π/3 units.", "Shift it down by π/3 units."],
    answer: "向右平移π/3个单位",
    accepted: ["向右平移π/3个单位", "向右平移π/3個單位", "Shift it right by π/3 units.", "A", "A. 向右平移π/3个单位"],
    rejected: ["向左平移π/3个单位", "向上平移π/3个单位", "向下平移π/3个单位"],
    explanation: "在y=sin x中把x替换为x-π/3，图像沿x轴向右平移π/3个单位，所以得到y=sin(x-π/3)。",
    explanationZh: "在y=sin x中把x替換為x-π/3，圖像沿x軸向右平移π/3個單位，所以得到y=sin(x-π/3)。",
    explanationEn: "Replacing x with x-π/3 in y=sin x shifts the graph π/3 units to the right, giving y=sin(x-π/3)."
  },
  {
    id: "bnu-high-ds-v1-s4-397",
    topicId: "bnu-high-s4-三角恒等变换",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "tangent-addition",
    prompt: "已知tanα=1/2，tanβ=1/3，则tan(α+β)的值是（ ）。",
    promptZh: "已知tanα=1/2，tanβ=1/3，則tan(α+β)的值是（ ）。",
    promptEn: "Given tanα=1/2 and tanβ=1/3, what is tan(α+β)?",
    options: ["1", "5/6", "1/5", "5"],
    optionsZh: ["1", "5/6", "1/5", "5"],
    optionsEn: ["1", "5/6", "1/5", "5"],
    answer: "1",
    accepted: ["1", "tan(α+β)=1", "A", "A. 1"],
    rejected: ["5/6", "1/5", "5", "6/5"],
    explanation: "tan(α+β)=(tanα+tanβ)/(1-tanαtanβ)=(1/2+1/3)/(1-1/6)=1。",
    explanationZh: "tan(α+β)=(tanα+tanβ)/(1-tanαtanβ)=(1/2+1/3)/(1-1/6)=1。",
    explanationEn: "tan(α+β)=(tanα+tanβ)/(1-tanαtanβ)=(1/2+1/3)/(1-1/6)=1."
  },
  {
    id: "bnu-high-ds-v1-s4-398",
    topicId: "bnu-high-s4-三角恒等变换",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "power-reduction-identity",
    prompt: "用降幂公式把sin²x改写成含cos2x的式子。",
    promptZh: "用降冪公式把sin²x改寫成含cos2x的式子。",
    promptEn: "Use a power-reduction identity to rewrite sin²x in terms of cos2x.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "(1-cos2x)/2",
    accepted: ["(1-cos2x)/2", "(1-cos(2x))/2", "1/2(1-cos2x)", "sin²x=(1-cos2x)/2"],
    rejected: ["(1+cos2x)/2", "1-cos2x", "cos2x", "(cos2x-1)/2"],
    explanation: "由cos2x=1-2sin²x移项，得2sin²x=1-cos2x，所以sin²x=(1-cos2x)/2。",
    explanationZh: "由cos2x=1-2sin²x移項，得2sin²x=1-cos2x，所以sin²x=(1-cos2x)/2。",
    explanationEn: "Rearranging cos2x=1-2sin²x gives 2sin²x=1-cos2x, so sin²x=(1-cos2x)/2."
  }
];

const targetIds = new Set(contracts.map(({ id }) => id));
const packageRoot = new URL("../coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("reviewed-approved-row-overrides.json", packageRoot), "utf8")) as {
  expectedOverrideCount: number;
  overrides: Array<{
    id: string;
    expectedTopicId: string;
    expectedType: string;
    expectedDifficulty: string;
    taskFamily: string;
    promptZhHans: string;
    optionsZhHans: string[];
    answer: string;
    acceptedAnswers: string[];
    explanationZhHans: string;
  }>;
};
const familyManifest = JSON.parse(readFileSync(new URL("approved-question-family-manifest.json", packageRoot), "utf8")) as {
  expectedQuestionCount: number;
  rows: Array<{ id: string; topicId: string; taskFamily: string }>;
};
const generationPlanHeaders = [
  "id", "batch", "grade", "semester", "topicId", "topicTitleZhHans", "volume", "chapter", "conceptIds",
  "competencyTags", "skillTags", "misconceptionTags", "difficulty", "type", "evidenceCardIds",
  "assessmentPatternCardIds", "sourceDistanceStatus", "mathQaStatus", "terminologyQaStatus", "manualQaStatus",
  "reviewNotes"
] as const;
type GenerationPlanRow = Record<string, unknown> & { id: string; topicId: string; type: string; difficulty: string };
const generationPlan = readFileSync(new URL("generation-plan.jsonl", packageRoot), "utf8").trim().split(/\n/u)
  .map((line) => JSON.parse(line) as GenerationPlanRow);
const generationPlanCsv = readFileSync(new URL("generation-plan.csv", packageRoot), "utf8");
const coordinationRows = (JSON.parse(readFileSync(new URL("question-pack.approved.json", packageRoot), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const productionRows = (JSON.parse(readFileSync(new URL("../data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json", import.meta.url), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const jsonlRows = readFileSync(new URL("approved-questions.jsonl", packageRoot), "utf8").trim().split(/\n/u)
  .map((line) => JSON.parse(line) as ArtifactQuestion);
const runtimeById = new Map(questions.map((question) => [question.id, question]));

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function csvEscape(value: unknown) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/gu, '""').replace(/\r?\n/gu, "\\n")}"`;
}

function renderGenerationPlanCsv(rows: GenerationPlanRow[]) {
  return `${[
    generationPlanHeaders.map(csvEscape).join(","),
    ...rows.map((row) => generationPlanHeaders.map((header) => csvEscape(row[header])).join(","))
  ].join("\n")}\n`;
}

function gradingPayload(question: NonNullable<ReturnType<typeof runtimeById.get>>) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

function familyDistribution(limit: number) {
  const familyById = new Map(familyManifest.rows.map(({ id, taskFamily }) => [id, taskFamily]));
  const counts = mainlandBnuHighLessonSeeds.map((lesson) => (
    new Set((lesson.practiceQuestionIds ?? []).slice(0, limit).map((id) => familyById.get(id))).size
  ));
  return Object.fromEntries([...new Set(counts)].sort((a, b) => a - b).map((count) => [count, counts.filter((value) => value === count).length]));
}

test("BNU high Batch 3A stores ten exact rows while preserving the prior 79 and every non-target artifact", () => {
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.equal(manifest.overrides.length, 98);
  assert.equal(new Set(manifest.overrides.map(({ id }) => id)).size, 98);
  assert.equal(sha256(manifest.overrides.slice(0, 79)), "96a76341e77270223de80ce8f40a255bdb7618e5161adff987af7023d55130e1");
  assert.deepEqual(manifest.overrides.slice(79, 89).map(({ id }) => id), contracts.map(({ id }) => id));

  assert.equal(generationPlan.length, 1_500);
  assert.equal(new Set(generationPlan.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(generationPlan), "be19b5926eac3f3ef2143722cadf731ad7d6fd17138dd2d96b017ebca15a281c");
  assert.equal(sha256(generationPlan.filter(({ id }) => !targetIds.has(id))), "282b9d36cbc86ccc3f07d9afe9aa71b1b3293a93d9076bfc29efe3ad141b66fc");
  assert.equal(generationPlanCsv, renderGenerationPlanCsv(generationPlan));

  assert.equal(familyManifest.expectedQuestionCount, 1_500);
  assert.equal(familyManifest.rows.length, 1_500);
  assert.equal(new Set(familyManifest.rows.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(familyManifest.rows.filter(({ id }) => !targetIds.has(id))), "c0835047bb59e4ec52908550775ba45d83772831f2eefdedf2f103628554c1b6");
  assert.equal(sha256(coordinationRows.filter(({ id }) => !targetIds.has(id))), "d67d4683d98653bf0567a739686402964e300833fdaeb1c7359779bb736ee79b");
  assert.equal(sha256(productionRows.filter(({ id }) => !targetIds.has(id))), "d67d4683d98653bf0567a739686402964e300833fdaeb1c7359779bb736ee79b");
  assert.deepEqual(productionRows, coordinationRows);
  assert.deepEqual(jsonlRows, coordinationRows);

  const planById = new Map(generationPlan.map((row) => [row.id, row]));
  const familyById = new Map(familyManifest.rows.map((row) => [row.id, row]));
  const artifactMaps = [coordinationRows, productionRows, jsonlRows].map((rows) => new Map(rows.map((row) => [row.id, row])));
  for (const contract of contracts) {
    const plan = planById.get(contract.id);
    assert.ok(plan, `${contract.id} generation plan`);
    assert.equal(plan.topicId, contract.topicId);
    assert.equal(plan.type, contract.type);
    assert.equal(plan.difficulty, contract.difficulty);
    const reviewed = manifest.overrides.find(({ id }) => id === contract.id);
    assert.ok(reviewed, `${contract.id} reviewed row`);
    assert.equal(reviewed.expectedTopicId, contract.topicId);
    assert.equal(reviewed.expectedType, contract.type);
    assert.equal(reviewed.expectedDifficulty, contract.difficulty);
    assert.equal(reviewed.taskFamily, contract.taskFamily);
    assert.equal(reviewed.promptZhHans, contract.prompt);
    assert.deepEqual(reviewed.optionsZhHans, contract.options);
    assert.equal(reviewed.answer, contract.answer);
    assert.deepEqual(reviewed.acceptedAnswers, contract.accepted);
    assert.equal(reviewed.explanationZhHans, contract.explanation);
    assert.deepEqual(familyById.get(contract.id), { id: contract.id, topicId: contract.topicId, taskFamily: contract.taskFamily });
    for (const artifactById of artifactMaps) {
      const artifact = artifactById.get(contract.id);
      assert.ok(artifact, `${contract.id} approved artifact row`);
      assert.equal(artifact.topicId, contract.topicId);
      assert.equal(artifact.type, contract.type);
      assert.equal(artifact.difficulty, contract.difficulty);
      assert.equal(artifact.promptZhHans, `题组${contract.id.replace(/^bnu-high-ds-v1-/u, "")}：${contract.prompt}`);
      assert.deepEqual(artifact.optionsZhHans, contract.options);
      assert.equal(artifact.answer, contract.answer);
      assert.deepEqual(artifact.acceptedAnswers, contract.accepted);
      assert.equal(artifact.explanationZhHans, contract.explanation);
    }
  }
});

test("BNU high Batch 3A exposes exact trilingual text and rejects every reviewed wrong answer", () => {
  let acceptedCalls = 0;
  let rejectedCalls = 0;
  let translationPairs = 0;
  for (const contract of contracts) {
    const runtime = runtimeById.get(contract.id);
    assert.ok(runtime, `${contract.id} runtime`);
    assert.equal(runtime.topicId, contract.topicId);
    assert.equal(runtime.type, contract.type);
    assert.equal(runtime.difficulty, mapDifficultyToActive(contract.difficulty));
    assert.equal(runtime.answer, contract.answer);
    assert.equal(runtime.prompt.zhHans, contract.prompt);
    assert.equal(runtime.prompt.zh, contract.promptZh);
    assert.equal(runtime.prompt.en, contract.promptEn);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zhHans ?? option.zh), contract.options);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zh), contract.optionsZh);
    assert.deepEqual((runtime.options ?? []).map((option) => option.en), contract.optionsEn);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    assert.equal(runtime.explanation.zh, contract.explanationZh);
    assert.equal(runtime.explanation.en, contract.explanationEn);

    const localizedPairs = [
      [contract.prompt, contract.promptEn, contract.promptZh, "prompt"],
      [contract.explanation, contract.explanationEn, contract.explanationZh, "explanation"],
      ...contract.options.map((source, index) => [source, contract.optionsEn[index], contract.optionsZh[index], "option"])
    ] as const;
    for (const [source, english, traditional, context] of localizedPairs) {
      translationPairs += 1;
      assert.equal(chinaLessonEnglishTranslation(source) ?? source, english);
      assert.equal(chinaLessonTraditionalTranslation(source) ?? source, traditional);
      assert.equal(validateRestoredTranslation({ id: `${contract.id}:${context}:${translationPairs}`, source, contexts: [context] }, english), english);
      assert.doesNotMatch(english, /[\u3400-\u9fff]/u);
    }

    const payload = gradingPayload(runtime);
    assert.equal(questionAnswerMatches(payload, contract.answer), true, `${contract.id} canonical`);
    contract.accepted.forEach((answer) => {
      acceptedCalls += 1;
      assert.equal(questionAnswerMatches(payload, answer), true, `${contract.id} accepts ${answer}`);
    });
    contract.rejected.forEach((answer) => {
      rejectedCalls += 1;
      assert.equal(questionAnswerMatches(payload, answer), false, `${contract.id} rejects ${answer}`);
    });
  }
  assert.equal(translationPairs, 36);
  assert.equal(acceptedCalls, 39);
  assert.equal(rejectedCalls, 42);
  assert.equal(contracts.filter(({ answer }) => answer.includes("；")).length, 0, "Batch 3A must not introduce an untested compound-response contract");
});

test("BNU high Batch 3A math oracles and four three-language MC keys are independently reproducible", () => {
  assert.deepEqual([2 * 3 - 1 * -2, 2 * -2 + 1 * 3], [8, -1]);
  assert.equal(24 * 5 / 3, 40);
  assert.deepEqual([2 * 2 - -3, 2 * -1 - 4], [7, -6]);
  assert.equal(Math.hypot(-3, 4), 5);
  assert.deepEqual([-1 * 2 - 1, 1 * 2 - 1], [-3, 1]);
  assert.ok(Math.abs((1 / 2 + 1 / 3) / (1 - 1 / 6) - 1) < 1e-12);
  [-1.2, -0.5, 0, 0.75, 2.1].forEach((x) => {
    assert.ok(Math.abs(Math.sin(x) ** 2 - (1 - Math.cos(2 * x)) / 2) < 1e-12);
  });

  const mcIndices = new Map([
    ["bnu-high-ds-v1-s4-469", 2],
    ["bnu-high-ds-v1-s4-289", 0],
    ["bnu-high-ds-v1-s4-295", 0],
    ["bnu-high-ds-v1-s4-397", 0]
  ]);
  for (const [id, expectedIndex] of mcIndices) {
    const runtime = runtimeById.get(id);
    assert.ok(runtime);
    for (const language of ["en", "zh", "zhHans"] as const) {
      const hits: boolean[] = (runtime.options ?? []).map((option) => (
        questionAnswerMatches(gradingPayload(runtime), option[language] ?? option.zh)
      ));
      assert.equal(hits.filter(Boolean).length, 1, `${id}/${language} unique`);
      assert.equal(hits.findIndex(Boolean), expectedIndex, `${id}/${language} index`);
    }
  }
});

test("BNU high Batch 3A closes every remaining S4 first-five family gap without touching worked anchors", () => {
  const expected = new Map<string, { ids: string[]; families: string[]; anchor: string; completeDistinct: number }>([
    ["bnu-high-s4-复数", { ids: ["bnu-high-ds-v1-s4-431", "bnu-high-ds-v1-s4-432", "bnu-high-ds-v1-s4-433", "bnu-high-ds-v1-s4-434", "bnu-high-ds-v1-s4-435"], families: ["modulus", "real-part-of-sum", "imaginary-unit-operation", "complex-multiplication", "complex-conjugate"], anchor: "bnu-high-ds-v1-s4-440", completeDistinct: 5 }],
    ["bnu-high-s4-立体几何初步", { ids: ["bnu-high-ds-v1-s4-466", "bnu-high-ds-v1-s4-467", "bnu-high-ds-v1-s4-468", "bnu-high-ds-v1-s4-469", "bnu-high-ds-v1-s4-470"], families: ["cube-surface-area", "line-plane-perpendicular", "cuboid-volume", "skew-lines-in-cube", "pyramid-volume"], anchor: "bnu-high-ds-v1-s4-474", completeDistinct: 5 }],
    ["bnu-high-s4-平面向量及其应用", { ids: ["bnu-high-ds-v1-s4-326", "bnu-high-ds-v1-s4-328", "bnu-high-ds-v1-s4-325", "bnu-high-ds-v1-s4-327", "bnu-high-ds-v1-s4-329"], families: ["vector-collinearity", "vector-angle", "2d-dot-product", "vector-linear-combination", "vector-magnitude"], anchor: "bnu-high-ds-v1-s4-335", completeDistinct: 5 }],
    ["bnu-high-s4-三角函数", { ids: ["bnu-high-ds-v1-s4-290", "bnu-high-ds-v1-s4-293", "bnu-high-ds-v1-s4-289", "bnu-high-ds-v1-s4-292", "bnu-high-ds-v1-s4-295"], families: ["amplitude-identification", "unit-circle-special-angle", "trigonometric-range", "period", "trigonometric-phase-shift"], anchor: "bnu-high-ds-v1-s4-296", completeDistinct: 6 }],
    ["bnu-high-s4-三角恒等变换", { ids: ["bnu-high-ds-v1-s4-396", "bnu-high-ds-v1-s4-398", "bnu-high-ds-v1-s4-397", "bnu-high-ds-v1-s4-399", "bnu-high-ds-v1-s4-401"], families: ["pythagorean-complement", "power-reduction-identity", "tangent-addition", "double-angle-with-quadrant", "sum-difference-identity"], anchor: "bnu-high-ds-v1-s4-404", completeDistinct: 5 }]
  ]);
  const familyById = new Map(familyManifest.rows.map(({ id, taskFamily }) => [id, taskFamily]));
  for (const [topicId, contract] of expected) {
    const lesson = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
    assert.ok(lesson);
    assert.equal(lesson.practiceQuestionIds?.length, 8);
    assert.deepEqual(lesson.practiceQuestionIds?.slice(0, 5), contract.ids);
    assert.deepEqual(contract.ids.map((id) => familyById.get(id)), contract.families);
    assert.equal(new Set(contract.families).size, 5);
    assert.equal(new Set((lesson.practiceQuestionIds ?? []).map((id) => familyById.get(id))).size, contract.completeDistinct);
    const worked = mainlandBnuHighReviewedWorkedExamples[topicId as keyof typeof mainlandBnuHighReviewedWorkedExamples];
    assert.ok(worked);
    const anchor = "sourceQuestionId" in worked ? worked.sourceQuestionId : worked.templateAnchorId;
    assert.equal(anchor, contract.anchor);
    assert.equal(lesson.practiceQuestionIds?.includes(anchor), false);
    assert.equal(targetIds.has(anchor), false);
  }
  assert.deepEqual(familyDistribution(5), { 5: 24 });
  assert.deepEqual(familyDistribution(8), { 5: 22, 6: 2 });
});
