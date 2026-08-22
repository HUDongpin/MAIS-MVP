import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mainlandHjbPrimaryQuestions } from "../../../data/mainlandHjbPrimaryQuestions.ts";
import { questionAnswerMatches } from "../../../lib/server/answerMatching.ts";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(packageDir, "../../..");
const productionPackPath = path.join(
  rootDir,
  "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json"
);
const manifestPath = path.join(packageDir, "a18-primary-runtime-closure-corrections.mjs");

const targetIds = [
  "hjb-primary-ds-v1-p1-125",
  "hjb-primary-ds-v1-p1-128",
  "hjb-primary-ds-v1-p2-028",
  "hjb-primary-ds-v1-p2-064",
  "hjb-primary-ds-v1-p2-120",
  "hjb-primary-ds-v1-p2-124",
  "hjb-primary-ds-v1-p2-138",
  "hjb-primary-ds-v1-p2-201",
  "hjb-primary-ds-v1-p3-011",
  "hjb-primary-ds-v1-p3-040",
  "hjb-primary-ds-v1-p3-108",
  "hjb-primary-ds-v1-p3-237",
  "hjb-primary-ds-v1-p3-249",
  "hjb-primary-ds-v1-p4-048",
  "hjb-primary-ds-v1-p4-099",
  "hjb-primary-ds-v1-p4-147",
  "hjb-primary-ds-v1-p4-188",
  "hjb-primary-ds-v1-p4-199",
  "hjb-primary-ds-v1-p4-236",
  "hjb-primary-ds-v1-p5-036",
  "hjb-primary-ds-v1-p5-099",
  "hjb-primary-ds-v1-p5-105",
  "hjb-primary-ds-v1-p5-106",
  "hjb-primary-ds-v1-p5-125",
  "hjb-primary-ds-v1-p5-126",
  "hjb-primary-ds-v1-p5-148",
  "hjb-primary-ds-v1-p6-052",
  "hjb-primary-ds-v1-p6-205",
  "hjb-primary-ds-v1-p6-207",
  "hjb-primary-ds-v1-p6-213"
];

const batchNumberById = new Map([
  ["hjb-primary-ds-v1-p1-125", "025"],
  ["hjb-primary-ds-v1-p1-128", "026"],
  ["hjb-primary-ds-v1-p2-028", "056"],
  ["hjb-primary-ds-v1-p2-064", "063"],
  ["hjb-primary-ds-v1-p2-120", "074"],
  ["hjb-primary-ds-v1-p2-124", "075"],
  ["hjb-primary-ds-v1-p2-138", "078"],
  ["hjb-primary-ds-v1-p2-201", "091"],
  ["hjb-primary-ds-v1-p3-011", "103"],
  ["hjb-primary-ds-v1-p3-040", "108"],
  ["hjb-primary-ds-v1-p3-108", "122"],
  ["hjb-primary-ds-v1-p3-237", "148"],
  ["hjb-primary-ds-v1-p3-249", "150"],
  ["hjb-primary-ds-v1-p4-048", "160"],
  ["hjb-primary-ds-v1-p4-099", "170"],
  ["hjb-primary-ds-v1-p4-147", "180"],
  ["hjb-primary-ds-v1-p4-188", "188"],
  ["hjb-primary-ds-v1-p4-199", "190"],
  ["hjb-primary-ds-v1-p4-236", "198"],
  ["hjb-primary-ds-v1-p5-036", "208"],
  ["hjb-primary-ds-v1-p5-099", "220"],
  ["hjb-primary-ds-v1-p5-105", "221"],
  ["hjb-primary-ds-v1-p5-106", "222"],
  ["hjb-primary-ds-v1-p5-125", "225"],
  ["hjb-primary-ds-v1-p5-126", "226"],
  ["hjb-primary-ds-v1-p5-148", "230"],
  ["hjb-primary-ds-v1-p6-052", "261"],
  ["hjb-primary-ds-v1-p6-205", "291"],
  ["hjb-primary-ds-v1-p6-207", "292"],
  ["hjb-primary-ds-v1-p6-213", "293"]
]);

const expectedMcIndex = new Map([
  ["hjb-primary-ds-v1-p2-028", 2],
  ["hjb-primary-ds-v1-p2-064", 3],
  ["hjb-primary-ds-v1-p2-124", 0],
  ["hjb-primary-ds-v1-p2-201", 0],
  ["hjb-primary-ds-v1-p3-040", 1],
  ["hjb-primary-ds-v1-p3-237", 1],
  ["hjb-primary-ds-v1-p3-249", 1],
  ["hjb-primary-ds-v1-p4-199", 2],
  ["hjb-primary-ds-v1-p5-106", 2],
  ["hjb-primary-ds-v1-p5-148", 1],
  ["hjb-primary-ds-v1-p6-052", 0],
  ["hjb-primary-ds-v1-p6-205", 3],
  ["hjb-primary-ds-v1-p6-213", 0]
]);

const requiredAliases = new Map([
  ["hjb-primary-ds-v1-p1-125", ["分拆减数", "分拆减数法", "平十", "平十法"]],
  ["hjb-primary-ds-v1-p1-128", ["连减", "连减法", "分拆减数", "分拆减数法", "平十", "平十法"]]
]);

const requiredCanonicalAnswers = new Map([
  ["hjb-primary-ds-v1-p1-125", "平十法"],
  ["hjb-primary-ds-v1-p1-128", "平十法"]
]);

const requiredExplanationPatterns = new Map([
  ["hjb-primary-ds-v1-p4-147", [/科技书和故事书共有240本/u, /故事书.*科技书.*3倍/u, /240÷4=60/u]],
  ["hjb-primary-ds-v1-p5-099", [/平均138下/u, /超过130下/u, /5人中有4人/u]],
  ["hjb-primary-ds-v1-p6-207", [/2×3\+1=7≠5/u, /3×3-4=5/u, /4×3-3=9≠8/u, /5×3\+2=17≠18/u]]
]);

const requiredPromptPatterns = new Map([
  ["hjb-primary-ds-v1-p5-099", [/130下/u, /整体较好/u, /参考线/u]]
]);

const rejectedResponses = new Map([
  ["hjb-primary-ds-v1-p2-120", ["对", "左北右南"]],
  ["hjb-primary-ds-v1-p2-138", ["65厘米"]],
  ["hjb-primary-ds-v1-p3-011", ["724", "十位多6，个位少6"]],
  ["hjb-primary-ds-v1-p3-108", ["3段", "1/4", "3段；1/4", "3段，其中一段是原来绳子的1/4"]],
  ["hjb-primary-ds-v1-p4-048", ["小明", "3/8>2/8", "小明；3/8>2/8"]],
  ["hjb-primary-ds-v1-p4-099", ["130°", "小圆", "130°；小圆"]],
  ["hjb-primary-ds-v1-p4-188", ["第5条刻度线"]],
  ["hjb-primary-ds-v1-p4-236", ["3.54", "3.56"]],
  ["hjb-primary-ds-v1-p5-036", ["35", "105", "科技书35本", "故事书105本", "35本；105本"]],
  ["hjb-primary-ds-v1-p5-099", ["138", "138下", "整体较好", "平均138下"]],
  ["hjb-primary-ds-v1-p5-105", ["9", "平均9个", "星期五、星期六、星期日", "星期三、星期五、星期六、星期日"]],
  ["hjb-primary-ds-v1-p5-125", ["5千克", "20千克", "日平均5千克", "本周约换20千克再生纸"]],
  ["hjb-primary-ds-v1-p5-126", ["146.33", "146.33下", "整体水平", "146下"]]
]);

const csvColumns = [
  "id", "batch", "grade", "semester", "topicId", "unitTitle", "volume", "conceptIds", "difficulty", "type",
  "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans", "evidenceCardIds",
  "assessmentPatternCardIds", "paperPatternCardIds", "sourceDistanceStatus", "mathQaStatus", "terminologyQaStatus",
  "manualQaStatus", "reviewNotes"
];
const learnerFields = ["promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function mapById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function learnerSurface(row) {
  return Object.fromEntries(learnerFields.map((field) => [field, row[field]]));
}

function runtimeZhHansSurface(question) {
  return {
    promptZhHans: question.prompt.zhHans,
    optionsZhHans: (question.options ?? []).map((option) => option.zhHans),
    answer: question.answer,
    explanationZhHans: question.explanation.zhHans
  };
}

function csvEscape(value) {
  const valueText = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/gu, " ");
  return /[",\n\r]/u.test(valueText) ? `"${valueText.replace(/"/gu, '""')}"` : valueText;
}

function gradingQuestionFromRuntime(question) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

const jsonlRows = fs.readFileSync(path.join(packageDir, "questions.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
const coordinationRows = readJson(path.join(packageDir, "question-pack.json")).questions;
const productionRows = readJson(productionPackPath).questions;
const jsonlById = mapById(jsonlRows);
const coordinationById = mapById(coordinationRows);
const productionById = mapById(productionRows);
const runtimeById = mapById(mainlandHjbPrimaryQuestions);
const csvLines = fs.readFileSync(path.join(packageDir, "questions.csv"), "utf8").trimEnd().split("\n");

for (const id of targetIds) {
  test(`${id} persists the reviewed zhHans correction in every durable layer`, () => {
    const jsonl = jsonlById.get(id);
    const coordination = coordinationById.get(id);
    const production = productionById.get(id);
    const runtime = runtimeById.get(id);
    assert.ok(jsonl, `${id} JSONL row`);
    assert.ok(coordination, `${id} coordination pack row`);
    assert.ok(production, `${id} production mirror row`);
    assert.ok(runtime, `${id} runtime row`);

    const batchNumber = batchNumberById.get(id);
    const batchRows = readJson(path.join(packageDir, `batches/batch-${batchNumber}.json`)).questions;
    const batch = batchRows.find((row) => row.id === id);
    assert.ok(batch, `${id} batch-${batchNumber}`);

    assert.deepEqual(learnerSurface(coordination), learnerSurface(jsonl), `${id} coordination↔JSONL`);
    assert.deepEqual(learnerSurface(production), learnerSurface(jsonl), `${id} production↔JSONL`);
    assert.deepEqual(learnerSurface(batch), learnerSurface(jsonl), `${id} batch↔JSONL`);
    assert.deepEqual(
      {
        promptZhHans: jsonl.promptZhHans,
        optionsZhHans: jsonl.optionsZhHans,
        answer: jsonl.answer,
        explanationZhHans: jsonl.explanationZhHans
      },
      runtimeZhHansSurface(runtime),
      `${id} durable zhHans↔runtime`
    );
    assert.ok(jsonl.acceptedAnswers.includes(jsonl.answer), `${id} canonical included in aliases`);
    const requiredCanonicalAnswer = requiredCanonicalAnswers.get(id);
    if (requiredCanonicalAnswer !== undefined) {
      assert.equal(jsonl.answer, requiredCanonicalAnswer, `${id} reviewed canonical terminology`);
      assert.equal(runtime.answer, requiredCanonicalAnswer, `${id} runtime canonical terminology`);
    }
    for (const alias of requiredAliases.get(id) ?? []) {
      assert.ok(jsonl.acceptedAnswers.includes(alias), `${id} durable alias ${alias}`);
    }
    for (const pattern of requiredExplanationPatterns.get(id) ?? []) {
      assert.match(jsonl.explanationZhHans, pattern, `${id} complete durable explanation`);
    }
    for (const pattern of requiredPromptPatterns.get(id) ?? []) {
      assert.match(jsonl.promptZhHans, pattern, `${id} explicit grading premise`);
    }

    const expectedCsvLine = csvColumns.map((column) => csvEscape(jsonl[column])).join(",");
    assert.equal(csvLines.find((line) => line.startsWith(`${id},`)), expectedCsvLine, `${id} CSV↔JSONL`);

    const expectedIndex = expectedMcIndex.get(id);
    if (expectedIndex !== undefined) {
      assert.equal(jsonl.optionsZhHans.indexOf(jsonl.answer), expectedIndex, `${id} canonical MC index`);
      const grading = gradingQuestionFromRuntime(runtime);
      const hits = (runtime.options ?? []).map((option) => questionAnswerMatches(grading, option.zhHans));
      assert.deepEqual(hits, [0, 1, 2, 3].map((index) => index === expectedIndex), `${id} unique true MC option`);
    }

    const grading = gradingQuestionFromRuntime(runtime);
    for (const partial of rejectedResponses.get(id) ?? []) {
      assert.equal(questionAnswerMatches(grading, partial), false, `${id} rejects incomplete response ${partial}`);
    }
  });
}

test("the curated generator correction manifest is reproducible and excludes the p3-235 false positive", async () => {
  assert.equal(fs.existsSync(manifestPath), true, "missing curated correction manifest");
  const manifest = await import(pathToFileURL(manifestPath).href);
  assert.deepEqual([...manifest.hjbPrimaryA18CorrectionIds].sort(), [...targetIds].sort());
  assert.equal(manifest.hjbPrimaryA18CorrectionIds.includes("hjb-primary-ds-v1-p3-235"), false);
  assert.equal(Object.hasOwn(manifest.hjbPrimaryA18Corrections, "hjb-primary-ds-v1-p3-235"), false);
  const replayed = manifest.applyHjbPrimaryA18Corrections(jsonlRows);
  for (const id of targetIds) {
    assert.deepEqual(learnerSurface(mapById(replayed).get(id)), learnerSurface(jsonlById.get(id)), `${id} idempotent replay`);
  }
  const generatorSource = fs.readFileSync(path.join(packageDir, "generate-with-deepseek.mjs"), "utf8");
  assert.match(generatorSource, /applyHjbPrimaryA18Corrections/u);
  assert.match(generatorSource, /syncHjbPrimaryA18TargetBatches/u);
});

test("hjb-primary-ds-v1-p3-235 stays unchanged and outside every correction target", () => {
  const id = "hjb-primary-ds-v1-p3-235";
  const expected = {
    promptZhHans: "学校举行跳绳比赛，记录了三（2）班四名同学一分钟跳绳的次数：小杰跳了142下，小文跳了135下，小宇跳了148下，小琪跳了139下。下面哪个结论是正确的？",
    optionsZhHans: ["小宇跳得最多，是148下", "小杰比小文多跳6下", "小琪跳得最少，是139下", "小宇比小琪多跳8下"],
    answer: "小宇跳得最多，是148下",
    acceptedAnswers: ["小宇跳得最多，是148下"],
    explanationZhHans: "比较数据：148>142>139>135，所以小宇跳得最多。小杰比小文多7下，小文跳得最少，小宇比小琪多9下。"
  };
  assert.equal(targetIds.includes(id), false);
  assert.deepEqual(learnerSurface(jsonlById.get(id)), expected);
  assert.deepEqual(learnerSurface(coordinationById.get(id)), expected);
  assert.deepEqual(learnerSurface(productionById.get(id)), expected);
  const batch = readJson(path.join(packageDir, "batches/batch-147.json")).questions.find((row) => row.id === id);
  assert.deepEqual(learnerSurface(batch), expected);
  const runtime = runtimeById.get(id);
  const hits = runtime.options.map((option) => questionAnswerMatches(gradingQuestionFromRuntime(runtime), option.zhHans));
  assert.deepEqual(hits, [true, false, false, false]);
});
