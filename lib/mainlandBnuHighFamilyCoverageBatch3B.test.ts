import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chinaAnswerBindingContracts, answerBindingsForChinaQuestion } from "../data/chinaAnswerBindingContracts";
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
    id: "bnu-high-ds-v1-s5-288",
    topicId: "bnu-high-s5-计数原理",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "combination-with-exclusion",
    prompt: "某学习小组从4名男生和2名女生中任选3人参加竞赛，要求至少有1名女生。共有多少种不同的选法？____。",
    promptZh: "某學習小組從4名男生和2名女生中任選3人參加比賽，要求至少有1名女生。共有多少種不同的選法？____。",
    promptEn: "A 3-person competition team is selected from 4 boys and 2 girls, and at least 1 girl must be included. How many different teams can be formed? ____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "16",
    accepted: ["16", "16种", "16種", "16 ways", "C(6,3)-C(4,3)=16"],
    rejected: ["20", "4", "12", "C(6,3)=20", "16米", "16%"],
    explanation: "不限制时有C(6,3)=20种；全是男生有C(4,3)=4种。用补集计数，所求为20-4=16种。",
    explanationZh: "不加限制時有C(6,3)=20種；全是男生有C(4,3)=4種。用補集計數，所求為20-4=16種。",
    explanationEn: "There are C(6,3)=20 unrestricted teams. Of these, C(4,3)=4 contain only boys. By complementary counting, 20-4=16 teams satisfy the requirement."
  },
  {
    id: "bnu-high-ds-v1-s5-294",
    topicId: "bnu-high-s5-计数原理",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "multiset-permutation",
    prompt: "把字母A、A、B、B、C排成一列，共有多少种不同的排列？____。",
    promptZh: "把字母A、A、B、B、C排成一列，共有多少種不同的排列？____。",
    promptEn: "Arrange the letters A, A, B, B, and C. How many distinct row arrangements are possible? ____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "30",
    accepted: ["30", "30种", "30種", "30 arrangements", "5!/(2!2!)=30"],
    rejected: ["120", "60", "20", "5!=120", "30米", "30%"],
    explanation: "若5个字母都不同，会有5!种排列；两个A和两个B各造成2!次重复，所以不同排列数为5!/(2!2!)=30。",
    explanationZh: "若5個字母都不同，會有5!種排列；兩個A和兩個B各造成2!次重複，所以不同排列數為5!/(2!2!)=30。",
    explanationEn: "If all 5 letters were distinct, there would be 5! arrangements. The repetitions A,A and B,B each create a factor of 2! in overcounting, so the number of distinct arrangements is 5!/(2!2!)=30."
  },
  {
    id: "bnu-high-ds-v1-s5-145",
    topicId: "bnu-high-s5-空间向量与立体几何",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "line-plane-angle",
    prompt: "直线l的一个方向向量为d=(1,1,√2)，平面α的一个法向量为n=(0,0,1)。直线l与平面α所成的锐角是（ ）。",
    promptZh: "直線l的一個方向向量為d=(1,1,√2)，平面α的一個法向量為n=(0,0,1)。直線l與平面α所成的銳角是（ ）。",
    promptEn: "A direction vector of line l is d=(1,1,√2), and a normal vector of plane α is n=(0,0,1). What is the acute angle between line l and plane α?",
    options: ["30°", "45°", "60°", "90°"],
    optionsZh: ["30°", "45°", "60°", "90°"],
    optionsEn: ["30°", "45°", "60°", "90°"],
    answer: "45°",
    accepted: ["45°", "45度", "45 degrees", "B", "B. 45°"],
    rejected: ["30°", "60°", "90°", "135°", "45 cm"],
    explanation: "设线面角为θ，则sinθ=|d·n|/(|d||n|)=√2/2，所以θ=45°。",
    explanationZh: "設線面角為θ，則sinθ=|d·n|/(|d||n|)=√2/2，所以θ=45°。",
    explanationEn: "Let θ be the angle between the line and the plane. Then sinθ=|d·n|/(|d||n|)=√2/2, so θ=45°."
  },
  {
    id: "bnu-high-ds-v1-s5-149",
    topicId: "bnu-high-s5-空间向量与立体几何",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "vector-linear-dependence",
    prompt: "已知空间向量a=(1,0,1)，b=(0,1,1)，c=(1,1,2)。判断a、b、c是否线性相关，并写出一个能说明结论的向量关系。请按“结论；向量关系”作答。",
    promptZh: "已知空間向量a=(1,0,1)，b=(0,1,1)，c=(1,1,2)。判斷a、b、c是否線性相關，並寫出一個能說明結論的向量關係。請按「結論；向量關係」作答。",
    promptEn: "Given the spatial vectors a=(1,0,1), b=(0,1,1), and c=(1,1,2), determine whether a, b, and c are linearly dependent and state a vector relation that justifies your conclusion. Answer in the form “conclusion; vector relation.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "线性相关；c=a+b",
    accepted: ["线性相关；c=a+b", "线性相关；a+b=c", "線性相關；c=a+b", "線性相關；a+b=c", "linearly dependent; c=a+b", "The vectors are linearly dependent; c=a+b"],
    rejected: ["线性相关", "c=a+b", "a+b=c", "线性无关", "线性相关；c=a-b", "4", "b=4"],
    explanation: "因为a+b=(1,1,2)=c，所以a、b、c线性相关。关系c=a+b直接说明其中一个向量可由另外两个向量线性表示。",
    explanationZh: "因為a+b=(1,1,2)=c，所以a、b、c線性相關。關係c=a+b直接說明其中一個向量可由另外兩個向量線性表示。",
    explanationEn: "Because a+b=(1,1,2)=c, the vectors a, b, and c are linearly dependent. The relation c=a+b expresses one vector as a linear combination of the other two."
  },
  {
    id: "bnu-high-ds-v1-s6-002",
    topicId: "bnu-high-s6-数列",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "arithmetic-sum",
    prompt: "等差数列{aₙ}的首项a₁=3，公差d=2。求前10项和S₁₀。",
    promptZh: "等差數列{aₙ}的首項a₁=3，公差d=2。求前10項和S₁₀。",
    promptEn: "An arithmetic sequence {aₙ} has first term a₁=3 and common difference d=2. Find the sum S₁₀ of its first 10 terms.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "120",
    accepted: ["120", "S₁₀=120", "S10=120", "The sum is 120"],
    rejected: ["21", "105", "240", "S₁₀=105", "120米"],
    explanation: "由等差数列前n项和公式，S₁₀=10/2×[2×3+(10-1)×2]=5×24=120。",
    explanationZh: "由等差數列前n項和公式，S₁₀=10/2×[2×3+(10-1)×2]=5×24=120。",
    explanationEn: "Using the n-term sum formula for an arithmetic sequence, S₁₀=10/2×[2×3+(10-1)×2]=5×24=120."
  },
  {
    id: "bnu-high-ds-v1-s6-006",
    topicId: "bnu-high-s6-数列",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "geometric-nth-term",
    prompt: "等比数列{aₙ}的首项a₁=3，公比q=-2，则a₅=____。",
    promptZh: "等比數列{aₙ}的首項a₁=3，公比q=-2，則a₅=____。",
    promptEn: "A geometric sequence {aₙ} has first term a₁=3 and common ratio q=-2. Then a₅=____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "48",
    accepted: ["48", "a₅=48", "a5=48", "a_5=48"],
    rejected: ["-48", "24", "96", "a₅=-48", "48米"],
    explanation: "由等比数列通项公式，a₅=a₁q⁴=3×(-2)⁴=48。",
    explanationZh: "由等比數列通項公式，a₅=a₁q⁴=3×(-2)⁴=48。",
    explanationEn: "Using the nth-term formula for a geometric sequence, a₅=a₁q⁴=3×(-2)⁴=48."
  },
  {
    id: "bnu-high-ds-v1-s5-009",
    topicId: "bnu-high-s5-直线与圆",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "point-line-distance",
    prompt: "点P(1,2)到直线3x+4y-10=0的距离为____。",
    promptZh: "點P(1,2)到直線3x+4y-10=0的距離為____。",
    promptEn: "The distance from point P(1,2) to the line 3x+4y-10=0 is ____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "1/5",
    accepted: ["1/5", "0.2", "d=1/5", "d=0.2"],
    rejected: ["1", "5", "1/25", "-1/5", "1/5米", "d=1"],
    explanation: "由点到直线的距离公式，d=|3×1+4×2-10|/√(3²+4²)=1/5。",
    explanationZh: "由點到直線的距離公式，d=|3×1+4×2-10|/√(3²+4²)=1/5。",
    explanationEn: "Using the point-to-line distance formula, d=|3×1+4×2-10|/√(3²+4²)=1/5."
  },
  {
    id: "bnu-high-ds-v1-s6-455",
    topicId: "bnu-high-s6-高三数列与导数综合复习",
    type: "multiple-choice",
    difficulty: "Exam",
    taskFamily: "function-difference-sequence",
    prompt: "已知函数f(x)=x²，定义数列aₙ=f(n+1)-f(n)（n∈N*）。则aₙ=（ ）。",
    promptZh: "已知函數f(x)=x²，定義數列aₙ=f(n+1)-f(n)（n∈N*）。則aₙ=（ ）。",
    promptEn: "Let f(x)=x², and define the sequence aₙ=f(n+1)-f(n) (n∈N*). Then aₙ=( ).",
    options: ["2n+1", "2n", "n²+1", "2n-1"],
    optionsZh: ["2n+1", "2n", "n²+1", "2n-1"],
    optionsEn: ["2n+1", "2n", "n²+1", "2n-1"],
    answer: "2n+1",
    accepted: ["2n+1", "aₙ=2n+1", "a_n=2n+1", "A", "A. 2n+1"],
    rejected: ["2n", "n²+1", "2n-1", "2(n+1)", "B"],
    explanation: "由定义，aₙ=f(n+1)-f(n)=(n+1)²-n²=2n+1。",
    explanationZh: "由定義，aₙ=f(n+1)-f(n)=(n+1)²-n²=2n+1。",
    explanationEn: "By the definition, aₙ=f(n+1)-f(n)=(n+1)²-n²=2n+1."
  }
];

const targetIds = new Set(contracts.map(({ id }) => id));
const translationSourceKeys = new Set(contracts.flatMap(({ prompt, explanation }) => [prompt, explanation]));
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
const englishDictionary = JSON.parse(readFileSync(new URL("../data/chinaLessonEnglishTranslations.json", import.meta.url), "utf8")) as Record<string, string>;
const traditionalDictionary = JSON.parse(readFileSync(new URL("../data/chinaLessonTraditionalTranslations.json", import.meta.url), "utf8")) as Record<string, string>;
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

function sortedNonTargetDictionaryEntries(dictionary: Record<string, string>) {
  return Object.entries(dictionary)
    .filter(([source]) => !translationSourceKeys.has(source))
    .sort(([left], [right]) => left.localeCompare(right, "zh-Hans"));
}

function familyDistribution(limit: number) {
  const familyById = new Map(familyManifest.rows.map(({ id, taskFamily }) => [id, taskFamily]));
  const counts = mainlandBnuHighLessonSeeds.map((lesson) => (
    new Set((lesson.practiceQuestionIds ?? []).slice(0, limit).map((id) => familyById.get(id))).size
  ));
  return Object.fromEntries([...new Set(counts)].sort((a, b) => a - b).map((count) => [count, counts.filter((value) => value === count).length]));
}

test("BNU high Batch 3B stores eight exact rows while preserving the prior 89 and every non-target input", () => {
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.equal(manifest.overrides.length, 98);
  assert.equal(new Set(manifest.overrides.map(({ id }) => id)).size, 98);
  assert.equal(sha256(manifest.overrides.slice(0, 89)), "455acfe7b03f34a89d85da6a1887f59d026e80a8992056e621fed29147fb92e8");
  assert.deepEqual(manifest.overrides.slice(89, 97).map(({ id }) => id), contracts.map(({ id }) => id));

  assert.equal(generationPlan.length, 1_500);
  assert.equal(new Set(generationPlan.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(generationPlan), "be19b5926eac3f3ef2143722cadf731ad7d6fd17138dd2d96b017ebca15a281c");
  assert.equal(sha256(generationPlan.filter(({ id }) => !targetIds.has(id))), "ccb40a20bee92bed7a09d6a6c5e0bace10f1a3cd5d585dd061b9b4b5edff5cf7");
  assert.equal(generationPlanCsv, renderGenerationPlanCsv(generationPlan));

  assert.equal(familyManifest.expectedQuestionCount, 1_500);
  assert.equal(familyManifest.rows.length, 1_500);
  assert.equal(new Set(familyManifest.rows.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(familyManifest.rows.filter(({ id }) => !targetIds.has(id))), "54492550f39cb97f5df315e69e30fb6f5495d5a6f0a1cb4823e27e9fba806c7d");
  assert.equal(sha256(coordinationRows.filter(({ id }) => !targetIds.has(id))), "4e0105b35e09cbd58be72487e9d7dc4eaa5cffe26596d588b21d8e58ed1d740e");
  assert.equal(sha256(productionRows.filter(({ id }) => !targetIds.has(id))), "4e0105b35e09cbd58be72487e9d7dc4eaa5cffe26596d588b21d8e58ed1d740e");
  assert.deepEqual(productionRows, coordinationRows);
  assert.deepEqual(jsonlRows, coordinationRows);

  assert.equal(sha256(sortedNonTargetDictionaryEntries(englishDictionary)), "9bc84e93bea4af9825587c8f544750124590e8a46076f0767f2115f169cbbcdd");
  assert.equal(sha256(sortedNonTargetDictionaryEntries(traditionalDictionary)), "beef7b47a2e1a1fd023903b32db4ae9dcee8267d3e6098c4bbed5a6a5925d509");
  assert.equal(sha256(Object.entries(chinaAnswerBindingContracts).filter(([id]) => id !== "bnu-high-ds-v1-s5-149")), "5482b0e6d7a5d966ed1a177a96d52ce8ee2f751599a30f2d904ba17d5298b4ab");

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

test("BNU high Batch 3B exposes exact trilingual text and rejects every reviewed wrong or partial answer", () => {
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
  assert.equal(translationPairs, 24);
  assert.equal(acceptedCalls, 38);
  assert.equal(rejectedCalls, 45);
  assert.equal(contracts.filter(({ answer }) => answer.includes("；")).length, 1);
  assert.deepEqual(answerBindingsForChinaQuestion("bnu-high-ds-v1-s5-149"), []);
});

test("BNU high Batch 3B math oracles and two three-language MC keys are independently reproducible", () => {
  const choose = (n: number, k: number) => {
    let value = 1;
    for (let index = 1; index <= k; index += 1) value = value * (n - index + 1) / index;
    return value;
  };
  assert.equal(choose(6, 3) - choose(4, 3), 16);
  assert.equal(120 / (2 * 2), 30);
  assert.ok(Math.abs(Math.asin(Math.SQRT2 / 2) * 180 / Math.PI - 45) < 1e-12);
  assert.deepEqual([1 + 0, 0 + 1, 1 + 1], [1, 1, 2]);
  assert.equal(10 / 2 * (2 * 3 + 9 * 2), 120);
  assert.equal(3 * (-2) ** 4, 48);
  assert.equal(Math.abs(3 * 1 + 4 * 2 - 10) / Math.hypot(3, 4), 1 / 5);
  [1, 2, 5, 11].forEach((n) => assert.equal((n + 1) ** 2 - n ** 2, 2 * n + 1));

  const mcIndices = new Map([
    ["bnu-high-ds-v1-s5-145", 1],
    ["bnu-high-ds-v1-s6-455", 0]
  ]);
  for (const [id, expectedIndex] of mcIndices) {
    const runtime = runtimeById.get(id);
    assert.ok(runtime);
    for (const language of ["en", "zh", "zhHans"] as const) {
      const hits: boolean[] = (runtime.options ?? []).map((option) => questionAnswerMatches(gradingPayload(runtime), option[language] ?? option.zh));
      assert.equal(hits.filter(Boolean).length, 1, `${id}/${language} unique`);
      assert.equal(hits.findIndex(Boolean), expectedIndex, `${id}/${language} index`);
    }
  }
});

test("BNU high Batch 3B raises every lesson checkpoint to at least five families without touching worked anchors", () => {
  const expected = new Map<string, { ids: string[]; families: string[]; anchor: string }>([
    ["bnu-high-s5-计数原理", { ids: ["bnu-high-ds-v1-s5-290", "bnu-high-ds-v1-s5-293", "bnu-high-ds-v1-s5-288", "bnu-high-ds-v1-s5-291", "bnu-high-ds-v1-s5-294"], families: ["choose-2", "restricted-arrangement", "combination-with-exclusion", "binomial-coefficient", "multiset-permutation"], anchor: "bnu-high-ds-v1-s5-296" }],
    ["bnu-high-s5-空间向量与立体几何", { ids: ["bnu-high-ds-v1-s5-147", "bnu-high-ds-v1-s5-151", "bnu-high-ds-v1-s5-145", "bnu-high-ds-v1-s5-149", "bnu-high-ds-v1-s5-153"], families: ["point-plane-distance", "plane-normal-vector", "line-plane-angle", "vector-linear-dependence", "3d-dot-product"], anchor: "bnu-high-ds-v1-s5-152" }],
    ["bnu-high-s6-数列", { ids: ["bnu-high-ds-v1-s6-004", "bnu-high-ds-v1-s6-008", "bnu-high-ds-v1-s6-002", "bnu-high-ds-v1-s6-006", "bnu-high-ds-v1-s6-010"], families: ["geometric-sum", "recurrence", "arithmetic-sum", "geometric-nth-term", "arithmetic-nth-term"], anchor: "bnu-high-ds-v1-s6-011" }],
    ["bnu-high-s5-直线与圆", { ids: ["bnu-high-ds-v1-s5-003", "bnu-high-ds-v1-s5-007", "bnu-high-ds-v1-s5-001", "bnu-high-ds-v1-s5-005", "bnu-high-ds-v1-s5-009"], families: ["vertical-line-equation", "circle-standard-equation", "two-point-slope", "line-circle-position", "point-line-distance"], anchor: "bnu-high-ds-v1-s5-008" }],
    ["bnu-high-s6-高三数列与导数综合复习", { ids: ["bnu-high-ds-v1-s6-452", "bnu-high-ds-v1-s6-454", "bnu-high-ds-v1-s6-456", "bnu-high-ds-v1-s6-451", "bnu-high-ds-v1-s6-455"], families: ["arithmetic-sum", "polynomial-derivative-value", "sequence-recurrence", "derivative-sequence-synthesis", "function-difference-sequence"], anchor: "bnu-high-ds-v1-s6-460" }]
  ]);
  const familyById = new Map(familyManifest.rows.map(({ id, taskFamily }) => [id, taskFamily]));
  const protectedLessonRows = mainlandBnuHighLessonSeeds
    .filter(({ topicId }) => topicId !== "bnu-high-s6-高三数列与导数综合复习")
    .map(({ topicId, practiceQuestionIds }) => ({ topicId, practiceQuestionIds }));
  assert.equal(sha256(protectedLessonRows), "3d9041a16a9d7e0c1c1c0cbfb7414470100583f958b1c91825ed7c9219d31788");

  for (const [topicId, contract] of expected) {
    const lesson = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
    assert.ok(lesson);
    assert.equal(lesson.practiceQuestionIds?.length, 8);
    assert.deepEqual(lesson.practiceQuestionIds?.slice(0, 5), contract.ids);
    assert.deepEqual(contract.ids.map((id) => familyById.get(id)), contract.families);
    assert.equal(new Set(contract.families).size, 5);
    assert.equal(new Set((lesson.practiceQuestionIds ?? []).map((id) => familyById.get(id))).size, 5);
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
