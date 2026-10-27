import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../userStore.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("userStore.ts", source, ts.ScriptTarget.Latest, true);
const names = ["answerLooksLikeMathExpression", "formatWorkedExampleAnswer", "lessonSlugForTopic",
  "shouldSeedLessonForTopic", "seedProductionLessonBlockRecords", "seedLessonBlockRecords"];
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(functions.length, names.length);
const compiled = ts.transpileModule(functions.map(node => node.getText(ast)).join("\n"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const topic = (id, curriculumTrack = "HK") => ({ id, curriculumTrack, grade: "P1",
  title: { en: id, zh: id }, description: { en: "Synthetic goal", zh: "測試目標" } });
const question = (id, topicId) => ({ id, topicId, answer: "2", prompt: { en: id, zh: id },
  explanation: { en: "Synthetic explanation", zh: "測試解釋" } });

function fixture(seedTopics, seedQuestions, productionLessonByTopicId = new Map()) {
  const context = { exports: {}, seedTopics, seedQuestions, productionLessonByTopicId,
    math: expression => `\\(${expression}\\)`, formatGradeLabel: grade => grade };
  vm.runInNewContext(compiled + "\nexports.seed = seedLessonBlockRecords;", context);
  return () => JSON.parse(JSON.stringify(context.exports.seed()));
}

test("lesson seeds retain question order, first anchor, empty topics and production overrides", () => {
  const topics = [topic("__proto__"), topic("other"), topic("empty"), topic("production", "US_CA_MATH"), topic("excluded", "US_CA_MATH")];
  const questions = [question("a", "__proto__"), question("x", "other"), question("b", "__proto__"),
    question("a", "__proto__"), question("unused", "unknown"), question("p", "production")];
  const production = new Map([["production", { practiceQuestionIds: ["override"], blocks: [
    { idSuffix: "concept", type: "concept", title: { en: "Production", zh: "原有課節" } }
  ] }]]);
  const before = structuredClone({ topics, questions });
  const blocks = fixture(topics, questions, production)();
  assert.deepEqual(blocks.filter(block => block.type === "practice").map(block => [block.lesson_slug, block.practice_question_ids]),
    [["__proto__", ["a", "b", "a"]], ["other", ["x"]], ["empty", []], ["production", ["override"]]]);
  assert.match(blocks.find(block => block.id === "__proto__-worked-example").content_en, /^a Answer:/);
  assert.match(blocks.find(block => block.id === "empty-worked-example").content_en, /^Use a focused empty example/);
  assert.deepEqual({ topics, questions }, before);
});

test("question-bank lookups stay linear as lesson topics increase", () => {
  const topics = Array.from({ length: 100 }, (_, i) => topic(`topic-${i}`));
  let visits = 0;
  const questions = Array.from({ length: 1000 }, (_, i) => {
    const value = question(`question-${i}`, `topic-${i % topics.length}`);
    Object.defineProperty(value, "topicId", { get() { visits++; return `topic-${i % topics.length}`; } });
    return value;
  });
  const blocks = fixture(topics, questions)();
  assert.equal(blocks.filter(block => block.type === "practice").length, topics.length);
  assert.ok(visits <= questions.length * 3, `Question topic reads exceeded the linear budget: ${visits}`);
});

test("successive lesson seed calls reflect current input without sharing practice arrays", () => {
  const topics = [topic("a"), topic("b")], questions = [question("first", "a")];
  const seed = fixture(topics, questions);
  const first = seed(); first.find(block => block.type === "practice").practice_question_ids.push("output-only");
  questions[0].topicId = "b"; questions.push(question("second", "a"));
  const second = seed();
  assert.deepEqual(second.filter(block => block.type === "practice").map(block => block.practice_question_ids), [["second"], ["first"]]);
  assert.match(second.find(block => block.id === "a-worked-example").content_en, /^second Answer:/);
});
