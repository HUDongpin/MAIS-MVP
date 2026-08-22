import assert from "node:assert/strict";
import test from "node:test";

import v2QuestionPackJson from "@/data/generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import v2Batch001Json from "../coordination/content-qa/mainland-hjb-high-generated-bank-v2/batches/batch-001.json";
import { mainlandHjbHighLessonSeeds } from "@/data/mainlandHjbHighLessons";
import {
  mainlandHjbHighPracticeFamilyByQuestionId,
  mainlandHjbHighPracticeRemediations
} from "@/data/mainlandHjbHighPracticeRemediations";
import {
  mainlandHjbHighQuestionGenerationMetadata,
  mainlandHjbHighQuestions
} from "@/data/mainlandHjbHighQuestions";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import type { ProductionLessonSeed } from "@/data/lessons";
import type { Question } from "@/types";

const expectedRuntimeIdsByTopic = new Map<string, string[]>([
  ["hjb-high-s4-三角", ["hjb-high-ds-v2-s4-251", "hjb-high-ds-v2-s4-254", "hjb-high-ds-v2-s4-252", "hjb-high-ds-v2-s4-255", "hjb-high-ds-v2-s4-258"]],
  ["hjb-high-s4-三角函数", ["hjb-high-ds-v2-s4-314", "hjb-high-ds-v2-s4-317", "hjb-high-ds-v2-s4-315", "hjb-high-ds-v2-s4-318", "hjb-high-ds-v2-s4-321"]],
  ["hjb-high-s4-复数", ["hjb-high-ds-v2-s4-439", "hjb-high-ds-v2-s4-440", "hjb-high-ds-v2-s4-441", "hjb-high-ds-v2-s4-442", "hjb-high-ds-v2-s4-443"]],
  ["hjb-high-s4-平面向量", ["hjb-high-ds-v2-s4-377", "hjb-high-ds-v2-s4-380", "hjb-high-ds-v2-s4-378", "hjb-high-ds-v2-s4-381", "hjb-high-ds-v2-s4-384"]],
  ["hjb-high-s5-圆锥曲线", ["hjb-high-ds-v2-s5-293", "hjb-high-ds-v2-s5-296", "hjb-high-ds-v2-s5-291", "hjb-high-ds-v2-s5-294", "hjb-high-ds-v2-s5-297"]],
  ["hjb-high-s5-平面直角坐标系中的直线", ["hjb-high-ds-v2-s5-221", "hjb-high-ds-v2-s5-224", "hjb-high-ds-v2-s5-222", "hjb-high-ds-v2-s5-225", "hjb-high-ds-v2-s5-228"]],
  ["hjb-high-s5-数列", ["hjb-high-ds-v2-s5-431", "hjb-high-ds-v2-s5-432", "hjb-high-ds-v2-s5-433", "hjb-high-ds-v2-s5-434", "hjb-high-ds-v2-s5-435"]],
  ["hjb-high-s5-概率初步", ["hjb-high-ds-v2-s5-111", "hjb-high-ds-v2-s5-115", "hjb-high-ds-v2-s5-113", "hjb-high-ds-v2-s5-117", "hjb-high-ds-v2-s5-121"]],
  ["hjb-high-s5-空间向量及其应用", ["hjb-high-ds-v2-s5-362", "hjb-high-ds-v2-s5-365", "hjb-high-ds-v2-s5-363", "hjb-high-ds-v2-s5-366", "hjb-high-ds-v2-s5-369"]],
  ["hjb-high-s5-空间直线与平面", ["hjb-high-ds-v2-s5-003", "hjb-high-ds-v2-s5-007", "hjb-high-ds-v2-s5-001", "hjb-high-ds-v2-s5-005", "hjb-high-ds-v2-s5-009"]],
  ["hjb-high-s5-简单几何体", ["hjb-high-ds-v2-s5-059", "hjb-high-ds-v2-s5-063", "hjb-high-ds-v2-s5-057", "hjb-high-ds-v2-s5-061", "hjb-high-ds-v2-s5-065"]],
  ["hjb-high-s5-统计", ["hjb-high-ds-v2-s5-167", "hjb-high-ds-v2-s5-171", "hjb-high-ds-v2-s5-169", "hjb-high-ds-v2-s5-173", "hjb-high-ds-v2-s5-177"]],
  ["hjb-high-s6-三角-向量与解析几何综合", ["hjb-high-ds-v2-s6-422", "hjb-high-ds-v2-s6-425", "hjb-high-ds-v2-s6-423", "hjb-high-ds-v2-s6-426", "hjb-high-ds-v2-s6-427"]],
  ["hjb-high-s6-函数-导数与不等式综合", ["hjb-high-ds-v2-s6-401", "hjb-high-ds-v2-s6-404", "hjb-high-ds-v2-s6-402", "hjb-high-ds-v2-s6-405", "hjb-high-ds-v2-s6-408"]],
  ["hjb-high-s6-圆锥曲线综合复习", ["hjb-high-ds-v2-s6-353", "hjb-high-ds-v2-s6-356", "hjb-high-ds-v2-s6-351", "hjb-high-ds-v2-s6-354", "hjb-high-ds-v2-s6-357"]],
  ["hjb-high-s6-导数及其运用", ["hjb-high-ds-v2-s6-003", "hjb-high-ds-v2-s6-007", "hjb-high-ds-v2-s6-001", "hjb-high-ds-v2-s6-005", "hjb-high-ds-v2-s6-009"]],
  ["hjb-high-s6-成对数据的统计分析", ["hjb-high-ds-v2-s6-227", "hjb-high-ds-v2-s6-230", "hjb-high-ds-v2-s6-228", "hjb-high-ds-v2-s6-231", "hjb-high-ds-v2-s6-234"]],
  ["hjb-high-s6-数列与计数综合", ["hjb-high-ds-v2-s6-481", "hjb-high-ds-v2-s6-482", "hjb-high-ds-v2-s6-483", "hjb-high-ds-v2-s6-484", "hjb-high-ds-v2-s6-485"]],
  ["hjb-high-s6-数列综合复习", ["hjb-high-ds-v2-s6-302", "hjb-high-ds-v2-s6-305", "hjb-high-ds-v2-s6-303", "hjb-high-ds-v2-s6-306", "hjb-high-ds-v2-s6-309"]],
  ["hjb-high-s6-概率初步续", ["hjb-high-ds-v2-s6-151", "hjb-high-ds-v2-s6-155", "hjb-high-ds-v2-s6-153", "hjb-high-ds-v2-s6-157", "hjb-high-ds-v2-s6-161"]],
  ["hjb-high-s6-概率统计综合", ["hjb-high-ds-v2-s6-461", "hjb-high-ds-v2-s6-462", "hjb-high-ds-v2-s6-463", "hjb-high-ds-v2-s6-464", "hjb-high-ds-v2-s6-465"]],
  ["hjb-high-s6-空间向量综合复习", ["hjb-high-ds-v2-s6-377", "hjb-high-ds-v2-s6-380", "hjb-high-ds-v2-s6-378", "hjb-high-ds-v2-s6-381", "hjb-high-ds-v2-s6-384"]],
  ["hjb-high-s6-立体几何与空间向量综合", ["hjb-high-ds-v2-s6-441", "hjb-high-ds-v2-s6-442", "hjb-high-ds-v2-s6-443", "hjb-high-ds-v2-s6-444", "hjb-high-ds-v2-s6-445"]],
  ["hjb-high-s6-解析几何直线综合复习", ["hjb-high-ds-v2-s6-326", "hjb-high-ds-v2-s6-329", "hjb-high-ds-v2-s6-327", "hjb-high-ds-v2-s6-330", "hjb-high-ds-v2-s6-333"]],
  ["hjb-high-s6-计数原理", ["hjb-high-ds-v2-s6-079", "hjb-high-ds-v2-s6-083", "hjb-high-ds-v2-s6-077", "hjb-high-ds-v2-s6-081", "hjb-high-ds-v2-s6-085"]]
]);

const originalFamilyByTopic = new Map<string, string>([
  ["hjb-high-s4-三角", "side-length-product"],
  ["hjb-high-s4-三角函数", "minimum-positive-period"],
  ["hjb-high-s4-复数", "complex-real-part-sum"],
  ["hjb-high-s4-平面向量", "plane-vector-dot-product"],
  ["hjb-high-s5-圆锥曲线", "ellipse-focal-parameter"],
  ["hjb-high-s5-平面直角坐标系中的直线", "two-point-slope"],
  ["hjb-high-s5-数列", "arithmetic-sequence-term"],
  ["hjb-high-s5-概率初步", "equally-likely-bag-probability"],
  ["hjb-high-s5-空间向量及其应用", "space-vector-squared-magnitude"],
  ["hjb-high-s5-空间直线与平面", "rectangular-face-area"],
  ["hjb-high-s5-简单几何体", "cuboid-volume"],
  ["hjb-high-s5-统计", "arithmetic-mean"],
  ["hjb-high-s6-三角-向量与解析几何综合", "side-angle-vector-dot-product"],
  ["hjb-high-s6-函数-导数与不等式综合", "linear-function-evaluation"],
  ["hjb-high-s6-圆锥曲线综合复习", "ellipse-focal-parameter"],
  ["hjb-high-s6-导数及其运用", "derivative-evaluation"],
  ["hjb-high-s6-成对数据的统计分析", "arithmetic-mean"],
  ["hjb-high-s6-数列与计数综合", "arithmetic-sequence-term"],
  ["hjb-high-s6-数列综合复习", "arithmetic-sequence-term"],
  ["hjb-high-s6-概率初步续", "multiplication-principle-count"],
  ["hjb-high-s6-概率统计综合", "equally-likely-bag-probability"],
  ["hjb-high-s6-空间向量综合复习", "space-vector-squared-magnitude"],
  ["hjb-high-s6-立体几何与空间向量综合", "rectangular-face-area"],
  ["hjb-high-s6-解析几何直线综合复习", "two-point-slope"],
  ["hjb-high-s6-计数原理", "unordered-combination"]
]);

const independentExpectedAnswers = new Map<string, string>([
  ["hjb-high-ds-v2-s4-251", String(Math.round(Math.sqrt(5 ** 2 + 8 ** 2 - 2 * 5 * 8 * Math.cos(Math.PI / 3))))],
  ["hjb-high-ds-v2-s4-254", "1/5"],
  ["hjb-high-ds-v2-s4-314", "[-3,5]"],
  ["hjb-high-ds-v2-s4-317", "π/6,5π/6"],
  ["hjb-high-ds-v2-s4-439", String(Math.hypot(3, 4))],
  ["hjb-high-ds-v2-s4-441", "3+4i"],
  ["hjb-high-ds-v2-s4-377", String(Math.hypot(3, 4))],
  ["hjb-high-ds-v2-s4-381", String(12 / 3)],
  ["hjb-high-ds-v2-s5-293", "(-4,0),(4,0)"],
  ["hjb-high-ds-v2-s5-296", "(2,0)"],
  ["hjb-high-ds-v2-s5-221", String(Math.abs(5) / Math.hypot(3, 4))],
  ["hjb-high-ds-v2-s5-224", "4x-3y-11=0"],
  ["hjb-high-ds-v2-s5-431", String(3 * 2 ** 4)],
  ["hjb-high-ds-v2-s5-433", String(2 * (2 * (2 * 2 + 1) + 1) + 1)],
  ["hjb-high-ds-v2-s5-111", String(1 - 0.37)],
  ["hjb-high-ds-v2-s5-113", String(0.5 + 0.4 - 0.2)],
  ["hjb-high-ds-v2-s5-362", String(1 * 2 + 2 * 0 - 1 * 3)],
  ["hjb-high-ds-v2-s5-365", "8/3"],
  ["hjb-high-ds-v2-s5-003", "√2/2"],
  ["hjb-high-ds-v2-s5-005", "10/3"],
  ["hjb-high-ds-v2-s5-059", "36π"],
  ["hjb-high-ds-v2-s5-063", String(4 * 0.5 * 6 * Math.hypot(4, 3) + 6 ** 2)],
  ["hjb-high-ds-v2-s5-167", "7"],
  ["hjb-high-ds-v2-s5-171", "8/3"],
  ["hjb-high-ds-v2-s6-425", "1/2"],
  ["hjb-high-ds-v2-s6-423", "√2/2"],
  ["hjb-high-ds-v2-s6-401", "(-∞,-1]∪[1,∞)"],
  ["hjb-high-ds-v2-s6-405", String(2 * 3)],
  ["hjb-high-ds-v2-s6-353", "4/5"],
  ["hjb-high-ds-v2-s6-356", "(1,0)"],
  ["hjb-high-ds-v2-s6-003", String(4 / 2)],
  ["hjb-high-ds-v2-s6-005", "y=2x-1"],
  ["hjb-high-ds-v2-s6-227", String((6 - 2) / (3 - 1))],
  ["hjb-high-ds-v2-s6-230", String(3 * 4 + 1)],
  ["hjb-high-ds-v2-s6-481", String(1 + 2 + 4 + 8)],
  ["hjb-high-ds-v2-s6-482", String(5 * 4)],
  ["hjb-high-ds-v2-s6-302", String(1 + 2 + 4 + 8 + 16)],
  ["hjb-high-ds-v2-s6-305", String(1 + 2 * 1 + 2 * 2 + 2 * 3)],
  ["hjb-high-ds-v2-s6-155", "3/8"],
  ["hjb-high-ds-v2-s6-153", String(0.2 / 0.5)],
  ["hjb-high-ds-v2-s6-461", "3/2"],
  ["hjb-high-ds-v2-s6-463", String(10 * 0.3)],
  ["hjb-high-ds-v2-s6-377", "1/3"],
  ["hjb-high-ds-v2-s6-381", "0"],
  ["hjb-high-ds-v2-s6-441", String(2 * 3 * 4)],
  ["hjb-high-ds-v2-s6-443", "0"],
  ["hjb-high-ds-v2-s6-326", "(3,2)"],
  ["hjb-high-ds-v2-s6-329", String(Math.abs(11 - 1) / Math.hypot(3, 4))],
  ["hjb-high-ds-v2-s6-083", String(3 * 4)],
  ["hjb-high-ds-v2-s6-081", String(5 * 4)]
]);

const handwritingTypes = new Set<Question["type"]>(["fill-in", "short-answer", "graph"]);
const questionById = new Map(mainlandHjbHighQuestions.map((question) => [question.id, question]));

function runtimeQuestions(seed: ProductionLessonSeed) {
  const candidates = (seed.practiceQuestionIds ?? []).flatMap((questionId) => {
    const question = questionById.get(questionId);
    return question ? [question] : [];
  });
  const deduped = dedupePracticeQuestions(candidates) as Question[];
  const firstFive = deduped.slice(0, 5);
  if (firstFive.some((question) => handwritingTypes.has(question.type))) return firstFive;
  const handwritingQuestion = deduped.find((question) => handwritingTypes.has(question.type));
  return handwritingQuestion ? [...firstFive.slice(0, 4), handwritingQuestion] : firstFive;
}

function practiceTemplateFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/\\[()[\]]/g, "")
    .replace(/[\s，。,.!?！？：:；;、'"“”‘’()（）\[\]{}]/g, "")
    .replace(/[-+]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g, "#")
    .replace(/[a-z](?=[=<>+\-*/^]|$)/g, "v");
}

test("Mainland HJB high V2 pack keeps all 1,500 unique rows and approval metadata", () => {
  const approvedRows = v2QuestionPackJson.questions;
  const approvedIds = approvedRows.map((question) => question.id);
  const countsByGrade = Object.groupBy(approvedRows, (question) => question.grade);

  assert.equal(approvedRows.length, 1_500);
  assert.equal(new Set(approvedIds).size, 1_500);
  assert.equal(mainlandHjbHighQuestions.length, 1_500);
  // Metadata intentionally covers the four preserved 1,500-row HJB packs;
  // V2 is the one exported to current production lesson surfaces.
  assert.equal(Object.keys(mainlandHjbHighQuestionGenerationMetadata).length, 6_000);
  assert.equal(countsByGrade.S4?.length, 500);
  assert.equal(countsByGrade.S5?.length, 500);
  assert.equal(countsByGrade.S6?.length, 500);
  // All 30 HJB high lessons now carry two reviewed practice-family
  // remediations; the exact-runtime matrix below retains the original 25-row
  // rollout slice while the all-lesson gate covers the five later closures.
  assert.equal(Object.keys(mainlandHjbHighPracticeRemediations).length, 60);

  approvedRows.forEach((row) => {
    const runtime = questionById.get(row.id);
    const metadata = mainlandHjbHighQuestionGenerationMetadata[row.id];
    assert.ok(runtime, `${row.id} should remain in the runtime bank`);
    assert.equal(runtime.topicId, row.topicId);
    assert.equal(runtime.grade, row.grade);
    assert.equal(runtime.type, row.type);
    assert.equal(metadata?.topicId, row.topicId);
    assert.equal(metadata?.grade, row.grade);
    assert.equal(metadata?.type, row.type);
    assert.equal(metadata?.sourceDistanceStatus, "passed-auto-source-scan");
    assert.equal(metadata?.mathQaStatus, "pass");
    assert.equal(metadata?.terminologyQaStatus, "pass");
    assert.equal(metadata?.manualQaStatus, "approved");
    assert.equal(metadata?.independentAnswer, runtime.answer);
  });
});

test("25 remediated HJB high lessons lock the real five-question runtime path and three families", () => {
  expectedRuntimeIdsByTopic.forEach((expectedIds, topicId) => {
    const seed = mainlandHjbHighLessonSeeds.find((lesson) => lesson.topicId === topicId);
    assert.ok(seed, `${topicId} should have a production lesson`);
    const displayed = runtimeQuestions(seed);

    assert.deepEqual(displayed.map((question) => question.id), expectedIds, `${topicId} runtime IDs drifted`);
    assert.equal(displayed.length, 5);
    assert.equal(new Set(displayed.map((question) => question.id)).size, 5);
    assert.equal(new Set(displayed.map((question) => question.prompt.zhHans ?? question.prompt.zh)).size, 5);
    assert.ok(
      new Set(displayed.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh))).size >= 3,
      `${topicId} should expose at least three prompt-template families`
    );

    const baseFamily = originalFamilyByTopic.get(topicId);
    assert.ok(baseFamily, `${topicId} should declare its retained source-bank family`);
    const actualFamilies = new Set(displayed.map((question) => mainlandHjbHighPracticeFamilyByQuestionId.get(question.id) ?? baseFamily));
    const expectedCustomFamilies = expectedIds.flatMap((id) => {
      const family = mainlandHjbHighPracticeFamilyByQuestionId.get(id);
      return family ? [family] : [];
    });
    assert.deepEqual(
      [...actualFamilies].sort(),
      [...new Set([baseFamily, ...expectedCustomFamilies])].sort(),
      `${topicId} task-family contract drifted`
    );
    assert.equal(actualFamilies.size, 3, `${topicId} should expose exactly three reviewed task families`);
  });
});

test("all 30 HJB high lessons display exactly five deduped questions with at least three templates", () => {
  assert.equal(mainlandHjbHighLessonSeeds.length, 30);
  mainlandHjbHighLessonSeeds.forEach((seed) => {
    const displayed = runtimeQuestions(seed);
    assert.equal(displayed.length, 5, `${seed.topicId} should display five questions`);
    assert.equal(new Set(displayed.map((question) => question.id)).size, 5, `${seed.topicId} should display five unique IDs`);
    assert.ok(
      new Set(displayed.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh))).size >= 3,
      `${seed.topicId} should display at least three prompt templates`
    );
  });
});

test("HJB high remediation answers remain independently reproducible and accepted", () => {
  assert.equal(independentExpectedAnswers.size, 50);
  independentExpectedAnswers.forEach((expectedAnswer, questionId) => {
    const question = questionById.get(questionId);
    const remediation = mainlandHjbHighPracticeRemediations[questionId];
    assert.ok(question, `${questionId} should exist`);
    assert.ok(remediation, `${questionId} should have an explicit remediation`);
    assert.equal(question.answer, expectedAnswer, `${questionId} independent calculation should reproduce the key`);
    assert.ok(question.acceptedAnswers?.includes(question.answer), `${questionId} should accept its canonical answer`);
    assert.equal(mainlandHjbHighQuestionGenerationMetadata[questionId]?.independentAnswer, expectedAnswer);
  });
});

test("the s4-009 set-equality remediation persists the complete excluded-case proof", () => {
  const questionId = "hjb-high-ds-v2-s4-009";
  const durable = v2QuestionPackJson.questions.find((question) => question.id === questionId);
  const rawBatch = v2Batch001Json.questions.find((question) => question.id === questionId);
  const remediation = mainlandHjbHighPracticeRemediations[questionId];
  const runtime = questionById.get(questionId);
  assert.ok(durable);
  assert.ok(rawBatch);
  assert.ok(remediation);
  assert.ok(runtime);

  assert.match(durable.explanationZhHans, /若ab=1.*a²=b.*a³=1/u);
  assert.equal(rawBatch.promptZhHans, durable.promptZhHans);
  assert.equal(rawBatch.answer, durable.answer);
  assert.deepEqual(rawBatch.acceptedAnswers, durable.acceptedAnswers);
  assert.equal(rawBatch.explanationZhHans, durable.explanationZhHans);
  assert.match(remediation.explanation.zhHans ?? remediation.explanation.zh, /若ab=1.*a²=b.*a³=1/u);
  assert.match(remediation.explanation.en, /If ab=1.*a²=b.*a³=1/iu);
  assert.equal(runtime.explanation.zhHans, remediation.explanation.zhHans);
  assert.equal(runtime.explanation.en, remediation.explanation.en);
});

test("HJB high remediations are complete bilingual questions with valid multiple-choice keys", () => {
  Object.entries(mainlandHjbHighPracticeRemediations).forEach(([questionId, remediation]) => {
    const question = questionById.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.equal(question.topicId, remediation.topicId);
    assert.equal(question.type, remediation.type);

    [question.prompt, question.explanation].forEach((content) => {
      assert.ok(content.en.trim());
      assert.ok(content.zh.trim());
      assert.ok(content.zhHans?.trim());
      assert.doesNotMatch(content.en, /[\u3400-\u9fff]|term-[0-9a-f]+/iu);
    });

    if (question.type === "multiple-choice") {
      const options = question.options ?? [];
      const simplifiedOptions = options.map((option) => option.zhHans ?? option.zh);
      assert.equal(options.length, 4, `${questionId} should have four choices`);
      assert.equal(new Set(simplifiedOptions).size, 4, `${questionId} choices should be unique`);
      assert.equal(simplifiedOptions.filter((option) => option === question.answer).length, 1, `${questionId} should key exactly one choice`);
      options.forEach((option) => {
        assert.ok(option.en.trim());
        assert.ok(option.zh.trim());
        assert.ok(option.zhHans?.trim());
      });
    }
  });
});
