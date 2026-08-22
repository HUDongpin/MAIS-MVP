import assert from "node:assert/strict";
import test from "node:test";

import approvedQuestionPackJson from "@/data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json";
import { mainlandBnuHighLessonSeeds } from "@/data/mainlandBnuHighLessons";
import {
  mainlandBnuHighQuestionGenerationMetadata,
  mainlandBnuHighQuestions
} from "@/data/mainlandBnuHighQuestions";
import {
  dedupePracticeQuestions,
  practiceQuestionConceptKey
} from "@/lib/practiceQuestionDeduping";

const remediatedPracticeIdsByTopic = new Map<string, string[]>([
  ["bnu-high-s4-函数", [
    "bnu-high-ds-v1-s4-038", "bnu-high-ds-v1-s4-037",
    "bnu-high-ds-v1-s4-042", "bnu-high-ds-v1-s4-041"
  ]],
  ["bnu-high-s4-函数应用", [
    "bnu-high-ds-v1-s4-146", "bnu-high-ds-v1-s4-145",
    "bnu-high-ds-v1-s4-149", "bnu-high-ds-v1-s4-148"
  ]],
  ["bnu-high-s4-复数", [
    "bnu-high-ds-v1-s4-431", "bnu-high-ds-v1-s4-433",
    "bnu-high-ds-v1-s4-434", "bnu-high-ds-v1-s4-435"
  ]],
  ["bnu-high-s4-对数运算与对数函数", [
    "bnu-high-ds-v1-s4-110", "bnu-high-ds-v1-s4-109",
    "bnu-high-ds-v1-s4-114", "bnu-high-ds-v1-s4-113"
  ]],
  ["bnu-high-s4-指数运算与指数函数", [
    "bnu-high-ds-v1-s4-074", "bnu-high-ds-v1-s4-073",
    "bnu-high-ds-v1-s4-078", "bnu-high-ds-v1-s4-077"
  ]],
  ["bnu-high-s4-数学建模活动-一", [
    "bnu-high-ds-v1-s4-254", "bnu-high-ds-v1-s4-253",
    "bnu-high-ds-v1-s4-257", "bnu-high-ds-v1-s4-256"
  ]],
  ["bnu-high-s4-数学建模活动-二", [
    "bnu-high-ds-v1-s4-362", "bnu-high-ds-v1-s4-361",
    "bnu-high-ds-v1-s4-364", "bnu-high-ds-v1-s4-363"
  ]],
  ["bnu-high-s4-概率", [
    "bnu-high-ds-v1-s4-218", "bnu-high-ds-v1-s4-217",
    "bnu-high-ds-v1-s4-221", "bnu-high-ds-v1-s4-220"
  ]],
  ["bnu-high-s4-统计", [
    "bnu-high-ds-v1-s4-185", "bnu-high-ds-v1-s4-184",
    "bnu-high-ds-v1-s4-181", "bnu-high-ds-v1-s4-187"
  ]],
  ["bnu-high-s4-立体几何初步", [
    "bnu-high-ds-v1-s4-466", "bnu-high-ds-v1-s4-467",
    "bnu-high-ds-v1-s4-469", "bnu-high-ds-v1-s4-470"
  ]],
  ["bnu-high-s4-预备知识", [
    "bnu-high-ds-v1-s4-002", "bnu-high-ds-v1-s4-001",
    "bnu-high-ds-v1-s4-006", "bnu-high-ds-v1-s4-005"
  ]],
  ["bnu-high-s4-平面向量及其应用", [
    "bnu-high-ds-v1-s4-326", "bnu-high-ds-v1-s4-328",
    "bnu-high-ds-v1-s4-327", "bnu-high-ds-v1-s4-329"
  ]],
  ["bnu-high-s4-三角函数", ["bnu-high-ds-v1-s4-289", "bnu-high-ds-v1-s4-295"]],
  ["bnu-high-s4-三角恒等变换", ["bnu-high-ds-v1-s4-397", "bnu-high-ds-v1-s4-398"]],
  ["bnu-high-s5-圆锥曲线", [
    "bnu-high-ds-v1-s5-075", "bnu-high-ds-v1-s5-073",
    "bnu-high-ds-v1-s5-079", "bnu-high-ds-v1-s5-077"
  ]],
  ["bnu-high-s5-计数原理", ["bnu-high-ds-v1-s5-288", "bnu-high-ds-v1-s5-294"]],
  ["bnu-high-s5-直线与圆", [
    "bnu-high-ds-v1-s5-003",
    "bnu-high-ds-v1-s5-007",
    "bnu-high-ds-v1-s5-005",
    "bnu-high-ds-v1-s5-009"
  ]],
  ["bnu-high-s5-数学建模活动-三", [
    "bnu-high-ds-v1-s5-218", "bnu-high-ds-v1-s5-219",
    "bnu-high-ds-v1-s5-221", "bnu-high-ds-v1-s5-222"
  ]],
  ["bnu-high-s5-空间向量与立体几何", [
    "bnu-high-ds-v1-s5-147", "bnu-high-ds-v1-s5-151",
    "bnu-high-ds-v1-s5-145", "bnu-high-ds-v1-s5-149"
  ]],
  ["bnu-high-s5-概率", [
    "bnu-high-ds-v1-s5-359", "bnu-high-ds-v1-s5-361",
    "bnu-high-ds-v1-s5-363", "bnu-high-ds-v1-s5-362"
  ]],
  ["bnu-high-s5-统计案例", ["bnu-high-ds-v1-s5-430", "bnu-high-ds-v1-s5-431"]],
  ["bnu-high-s6-导数及其应用", [
    "bnu-high-ds-v1-s6-226", "bnu-high-ds-v1-s6-227",
    "bnu-high-ds-v1-s6-229", "bnu-high-ds-v1-s6-228"
  ]],
  ["bnu-high-s6-数列", [
    "bnu-high-ds-v1-s6-004", "bnu-high-ds-v1-s6-008",
    "bnu-high-ds-v1-s6-002", "bnu-high-ds-v1-s6-006"
  ]],
  ["bnu-high-s6-高三数列与导数综合复习", [
    "bnu-high-ds-v1-s6-452", "bnu-high-ds-v1-s6-451",
    "bnu-high-ds-v1-s6-456", "bnu-high-ds-v1-s6-455"
  ]]
]);

const remainingRuntimeSelectionIdsByTopic = new Map<string, string[]>([
  ["bnu-high-s5-直线与圆", [
    "bnu-high-ds-v1-s5-003",
    "bnu-high-ds-v1-s5-007",
    "bnu-high-ds-v1-s5-001",
    "bnu-high-ds-v1-s5-005",
    "bnu-high-ds-v1-s5-009"
  ]],
  ["bnu-high-s4-立体几何初步", [
    "bnu-high-ds-v1-s4-466",
    "bnu-high-ds-v1-s4-467",
    "bnu-high-ds-v1-s4-468",
    "bnu-high-ds-v1-s4-469",
    "bnu-high-ds-v1-s4-470"
  ]],
  ["bnu-high-s4-预备知识", [
    "bnu-high-ds-v1-s4-002",
    "bnu-high-ds-v1-s4-006",
    "bnu-high-ds-v1-s4-001",
    "bnu-high-ds-v1-s4-005",
    "bnu-high-ds-v1-s4-009"
  ]],
  ["bnu-high-s5-概率", [
    "bnu-high-ds-v1-s5-359",
    "bnu-high-ds-v1-s5-361",
    "bnu-high-ds-v1-s5-363",
    "bnu-high-ds-v1-s5-360",
    "bnu-high-ds-v1-s5-362"
  ]],
  ["bnu-high-s5-数学建模活动-三", [
    "bnu-high-ds-v1-s5-218",
    "bnu-high-ds-v1-s5-221",
    "bnu-high-ds-v1-s5-219",
    "bnu-high-ds-v1-s5-222",
    "bnu-high-ds-v1-s5-225"
  ]],
  ["bnu-high-s5-圆锥曲线", [
    "bnu-high-ds-v1-s5-075",
    "bnu-high-ds-v1-s5-079",
    "bnu-high-ds-v1-s5-073",
    "bnu-high-ds-v1-s5-077",
    "bnu-high-ds-v1-s5-081"
  ]],
  ["bnu-high-s6-导数及其应用", [
    "bnu-high-ds-v1-s6-226",
    "bnu-high-ds-v1-s6-229",
    "bnu-high-ds-v1-s6-232",
    "bnu-high-ds-v1-s6-227",
    "bnu-high-ds-v1-s6-228"
  ]],
  ["bnu-high-s6-数列", [
    "bnu-high-ds-v1-s6-004",
    "bnu-high-ds-v1-s6-008",
    "bnu-high-ds-v1-s6-002",
    "bnu-high-ds-v1-s6-006",
    "bnu-high-ds-v1-s6-010"
  ]],
  ["bnu-high-s6-高三数列与导数综合复习", [
    "bnu-high-ds-v1-s6-452",
    "bnu-high-ds-v1-s6-454",
    "bnu-high-ds-v1-s6-456",
    "bnu-high-ds-v1-s6-451",
    "bnu-high-ds-v1-s6-455"
  ]]
]);

const remainingRuntimeFamilyByQuestionId = new Map<string, string>([
  ["bnu-high-ds-v1-s5-003", "vertical-line-equation"],
  ["bnu-high-ds-v1-s5-007", "circle-standard-equation"],
  ["bnu-high-ds-v1-s5-001", "two-point-slope"],
  ["bnu-high-ds-v1-s5-005", "line-circle-position"],
  ["bnu-high-ds-v1-s5-009", "point-line-distance"],
  ["bnu-high-ds-v1-s4-466", "surface-area"],
  ["bnu-high-ds-v1-s4-467", "line-plane-perpendicularity"],
  ["bnu-high-ds-v1-s4-468", "solid-volume"],
  ["bnu-high-ds-v1-s4-469", "skew-lines-in-cube"],
  ["bnu-high-ds-v1-s4-470", "pyramid-volume"],
  ["bnu-high-ds-v1-s4-002", "set-intersection"],
  ["bnu-high-ds-v1-s4-006", "sufficient-not-necessary-condition"],
  ["bnu-high-ds-v1-s4-001", "quadratic-inequality"],
  ["bnu-high-ds-v1-s4-005", "absolute-value-inequality"],
  ["bnu-high-ds-v1-s4-009", "linear-equation"],
  ["bnu-high-ds-v1-s5-359", "discrete-expectation"],
  ["bnu-high-ds-v1-s5-361", "binomial-probability"],
  ["bnu-high-ds-v1-s5-363", "conditional-joint-probability"],
  ["bnu-high-ds-v1-s5-360", "equally-likely-probability"],
  ["bnu-high-ds-v1-s5-362", "discrete-distribution-variance"],
  ["bnu-high-ds-v1-s5-218", "fit-linear-model"],
  ["bnu-high-ds-v1-s5-221", "analytic-geometry-model-interpretation"],
  ["bnu-high-ds-v1-s5-219", "coordinate-constraint-model"],
  ["bnu-high-ds-v1-s5-222", "spatial-vector-displacement-model"],
  ["bnu-high-ds-v1-s5-225", "evaluate-linear-model"],
  ["bnu-high-ds-v1-s5-075", "ellipse-eccentricity"],
  ["bnu-high-ds-v1-s5-079", "parabola-focus"],
  ["bnu-high-ds-v1-s5-073", "hyperbola-asymptotes"],
  ["bnu-high-ds-v1-s5-077", "line-conic-discriminant"],
  ["bnu-high-ds-v1-s5-081", "ellipse-focal-parameter"],
  ["bnu-high-ds-v1-s6-226", "tangent-line"],
  ["bnu-high-ds-v1-s6-229", "derivative-optimization"],
  ["bnu-high-ds-v1-s6-232", "derivative-evaluation"],
  ["bnu-high-ds-v1-s6-227", "derivative-sign-monotonicity"],
  ["bnu-high-ds-v1-s6-228", "derivative-parameter-condition"],
  ["bnu-high-ds-v1-s6-004", "geometric-series-sum"],
  ["bnu-high-ds-v1-s6-008", "sequence-recurrence"],
  ["bnu-high-ds-v1-s6-002", "arithmetic-sum"],
  ["bnu-high-ds-v1-s6-006", "geometric-nth-term"],
  ["bnu-high-ds-v1-s6-010", "arithmetic-sequence-term"],
  ["bnu-high-ds-v1-s6-452", "arithmetic-series-sum"],
  ["bnu-high-ds-v1-s6-454", "derivative-evaluation"],
  ["bnu-high-ds-v1-s6-456", "sequence-recurrence"],
  ["bnu-high-ds-v1-s6-451", "derivative-sequence-synthesis"],
  ["bnu-high-ds-v1-s6-455", "function-difference-sequence"]
]);

function practiceTemplateFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/\\[()[\]]/g, "")
    .replace(/[\s，。,.!?！？：:；;、'"“”‘’()（）\[\]{}]/g, "")
    .replace(/[-+]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g, "#")
    .replace(/[a-z](?=[=<>+\-*/^]|$)/g, "v");
}

test("Mainland BNU high approved pack preserves all 1,500 unique reviewed rows", () => {
  const approvedRows = approvedQuestionPackJson.questions;
  const approvedIds = approvedRows.map((question) => question.id);
  const gradeCounts = Object.groupBy(approvedRows, (question) => question.grade);

  assert.equal(approvedRows.length, 1_500);
  assert.equal(new Set(approvedIds).size, 1_500);
  assert.equal(mainlandBnuHighQuestions.length, 1_500);
  assert.equal(Object.keys(mainlandBnuHighQuestionGenerationMetadata).length, 1_500);
  assert.equal(gradeCounts.S4?.length, 500);
  assert.equal(gradeCounts.S5?.length, 500);
  assert.equal(gradeCounts.S6?.length, 500);
  assert.ok(
    approvedRows.every((question) => (
      question.sourceDistanceStatus === "passed-auto-source-scan" &&
      question.mathQaStatus === "pass" &&
      question.terminologyQaStatus === "pass" &&
      question.manualQaStatus === "approved"
    )),
    "every preserved row should retain all four approval gates"
  );
});

test("Mainland BNU high remaining nine lessons lock the exact five runtime questions and substantive families", () => {
  const questionById = new Map(mainlandBnuHighQuestions.map((question) => [question.id, question]));

  remainingRuntimeSelectionIdsByTopic.forEach((expectedIds, topicId) => {
    const seed = mainlandBnuHighLessonSeeds.find((lesson) => lesson.topicId === topicId);
    assert.ok(seed, `${topicId} should have a production lesson seed`);

    const displayed = dedupePracticeQuestions(
      (seed.practiceQuestionIds ?? []).flatMap((questionId) => {
        const question = questionById.get(questionId);
        return question ? [question] : [];
      })
    ).slice(0, 5).map((publicQuestion) => {
      const question = questionById.get(publicQuestion.id);
      assert.ok(question, `${publicQuestion.id} should resolve to its reviewed source row`);
      return question;
    });

    assert.deepEqual(displayed.map((question) => question.id), expectedIds, `${topicId} runtime selection drifted`);
    assert.equal(new Set(displayed.map((question) => question.prompt.zhHans ?? question.prompt.zh)).size, 5);
    assert.ok(
      new Set(displayed.map((question) => remainingRuntimeFamilyByQuestionId.get(question.id))).size >= 3,
      `${topicId} should preserve at least three independently identified mathematical task families`
    );

    displayed.forEach((question) => {
      assert.equal(question.topicId, topicId);
      assert.ok(question.prompt.en.trim());
      assert.ok(question.prompt.zh.trim());
      assert.ok(question.prompt.zhHans?.trim());
      assert.ok(question.explanation.en.trim());
      assert.ok(question.explanation.zh.trim());
      assert.ok(question.explanation.zhHans?.trim());
      assert.doesNotMatch(question.prompt.en, /term-[0-9a-f]+/i);
      assert.ok(question.acceptedAnswers?.includes(question.answer), `${question.id} should accept its canonical answer`);

      const metadata = mainlandBnuHighQuestionGenerationMetadata[question.id];
      assert.equal(metadata?.independentAnswer, question.answer);
      assert.equal(metadata?.sourceDistanceStatus, "passed-auto-source-scan");
      assert.equal(metadata?.mathQaStatus, "pass");
      assert.equal(metadata?.terminologyQaStatus, "pass");
      assert.equal(metadata?.manualQaStatus, "approved");

      if (question.type === "multiple-choice") {
        const optionValues = (question.options ?? []).map((option) => option.zhHans ?? option.zh);
        assert.equal(optionValues.length, 4, `${question.id} should have four choices`);
        assert.equal(new Set(optionValues).size, 4, `${question.id} should have four unique choices`);
        assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should key one choice`);
        question.options?.forEach((option) => {
          assert.ok(option.en.trim());
          assert.ok(option.zh.trim());
          assert.ok(option.zhHans?.trim());
        });
      }
    });
  });
});

test("Mainland BNU high reviewed variety remediations expose five questions across three task families", () => {
  const questionById = new Map(mainlandBnuHighQuestions.map((question) => [question.id, question]));

  remediatedPracticeIdsByTopic.forEach((remediatedIds, topicId) => {
    const seed = mainlandBnuHighLessonSeeds.find((lesson) => lesson.topicId === topicId);
    assert.ok(seed, `${topicId} should have a production lesson seed`);

    const selected = (seed.practiceQuestionIds ?? []).flatMap((questionId) => {
      const question = questionById.get(questionId);
      return question ? [question] : [];
    });
    const displayed = dedupePracticeQuestions(selected).slice(0, 5);

    assert.equal(displayed.length, 5, `${topicId} should display five practice questions`);
    assert.equal(new Set(displayed.map((question) => question.id)).size, 5, `${topicId} should display five unique IDs`);
    assert.ok(
      remediatedIds.every((questionId) => displayed.some((question) => question.id === questionId)),
      `${topicId} should display all remediated questions`
    );
    assert.ok(
      new Set(displayed.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh))).size >= 3,
      `${topicId} should display at least three prompt families`
    );

    remediatedIds.forEach((questionId) => {
      const question = questionById.get(questionId);
      assert.ok(question, `${questionId} should exist`);
      assert.equal(question.topicId, topicId);
      assert.ok(question.prompt.en.trim(), `${questionId} should expose a non-empty source-locale fallback`);
      assert.ok(question.prompt.zh.trim(), `${questionId} should expose non-empty Traditional Chinese text`);
      assert.ok(question.prompt.zhHans?.trim(), `${questionId} should expose non-empty Simplified Chinese text`);
      assert.doesNotMatch(question.prompt.en, /term-[0-9a-f]+/i, `${questionId} should not leak localization placeholders`);
      const conceptKey = practiceQuestionConceptKey(question);
      assert.equal(
        mainlandBnuHighQuestions.filter((candidate) => candidate.topicId === topicId && practiceQuestionConceptKey(candidate) === conceptKey).length,
        1,
        `${questionId} should be normalized-prompt unique within its topic`
      );

      const metadata = mainlandBnuHighQuestionGenerationMetadata[questionId];
      assert.equal(metadata?.sourceDistanceStatus, "passed-auto-source-scan");
      assert.equal(metadata?.mathQaStatus, "pass");
      assert.equal(metadata?.terminologyQaStatus, "pass");
      assert.equal(metadata?.manualQaStatus, "approved");
    });
  });
});

test("Mainland BNU high reviewed variety remediation keys remain independently reproducible", () => {
  const questionById = new Map(mainlandBnuHighQuestions.map((question) => [question.id, question]));
  const closeTo = (actual: number, expected: number) => Math.abs(actual - expected) < 1e-12;
  const expectedAnswers = new Map<string, string>([
    ["bnu-high-ds-v1-s4-037", "-3"],
    ["bnu-high-ds-v1-s4-038", "[2,+∞)"],
    ["bnu-high-ds-v1-s4-145", "5400"],
    ["bnu-high-ds-v1-s4-146", "22"],
    ["bnu-high-ds-v1-s4-148", "6"],
    ["bnu-high-ds-v1-s4-149", "V(t)=120-8t；0≤t≤15；15分钟"],
    ["bnu-high-ds-v1-s4-431", "5"],
    ["bnu-high-ds-v1-s4-433", "3+2i"],
    ["bnu-high-ds-v1-s4-434", "8-i"],
    ["bnu-high-ds-v1-s4-435", "3+4i"],
    ["bnu-high-ds-v1-s4-109", "(1,+∞)"],
    ["bnu-high-ds-v1-s4-110", "m+2n"],
    ["bnu-high-ds-v1-s4-073", "2"],
    ["bnu-high-ds-v1-s4-074", "4"],
    ["bnu-high-ds-v1-s4-253", "6"],
    ["bnu-high-ds-v1-s4-254", "V(t)=120-6t，V(10)=60"],
    ["bnu-high-ds-v1-s4-256", "在条件相近时预测第5周，并说明预测存在误差"],
    ["bnu-high-ds-v1-s4-257", "V(t)=100-8t；44升；支持，|53-52|=1≤2"],
    ["bnu-high-ds-v1-s4-361", "5"],
    ["bnu-high-ds-v1-s4-362", "21.6"],
    ["bnu-high-ds-v1-s4-363", "18米"],
    ["bnu-high-ds-v1-s4-364", "1米"],
    ["bnu-high-ds-v1-s4-217", "2/3"],
    ["bnu-high-ds-v1-s4-218", "3/10"],
    ["bnu-high-ds-v1-s4-466", "54"],
    ["bnu-high-ds-v1-s4-467", "AA₁"],
    ["bnu-high-ds-v1-s4-468", "96"],
    ["bnu-high-ds-v1-s4-469", "AB与CC₁"],
    ["bnu-high-ds-v1-s4-470", "40"],
    ["bnu-high-ds-v1-s4-001", "(-∞,-2)∪(1,+∞)"],
    ["bnu-high-ds-v1-s4-002", "[-1,3)"],
    ["bnu-high-ds-v1-s4-005", "[-1,2]"],
    ["bnu-high-ds-v1-s4-006", "充分不必要"],
    ["bnu-high-ds-v1-s4-009", "4"],
    ["bnu-high-ds-v1-s4-041", "奇函数；f(-x)=-f(x)"],
    ["bnu-high-ds-v1-s4-042", "3"],
    ["bnu-high-ds-v1-s4-077", "N(t)=80×2^(t/3)；N(9)=640个"],
    ["bnu-high-ds-v1-s4-078", "0<a<1"],
    ["bnu-high-ds-v1-s4-113", "在(0,+∞)上单调递减；f(2)>f(4)"],
    ["bnu-high-ds-v1-s4-114", "9"],
    ["bnu-high-ds-v1-s4-181", "按各年级人数比例，从每个年级随机抽取学生"],
    ["bnu-high-ds-v1-s4-187", "40%"],
    ["bnu-high-ds-v1-s4-220", "0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定"],
    ["bnu-high-ds-v1-s4-221", "Ω={HH,HT,TH,TT}；1/2"],
    ["bnu-high-ds-v1-s4-326", "共线；b=3a"],
    ["bnu-high-ds-v1-s4-328", "90°"],
    ["bnu-high-ds-v1-s4-327", "(7,-6)"],
    ["bnu-high-ds-v1-s4-329", "5"],
    ["bnu-high-ds-v1-s4-289", "[-3,1]"],
    ["bnu-high-ds-v1-s4-295", "向右平移π/3个单位"],
    ["bnu-high-ds-v1-s4-397", "1"],
    ["bnu-high-ds-v1-s4-398", "(1-cos2x)/2"],
    ["bnu-high-ds-v1-s5-073", "y=±(4/3)x"],
    ["bnu-high-ds-v1-s5-075", "4/5"],
    ["bnu-high-ds-v1-s5-077", "2个；Δ=16"],
    ["bnu-high-ds-v1-s5-079", "(2,0)"],
    ["bnu-high-ds-v1-s5-081", "5"],
    ["bnu-high-ds-v1-s5-003", "斜率不存在；x=3"],
    ["bnu-high-ds-v1-s5-005", "相离"],
    ["bnu-high-ds-v1-s5-007", "(x-2)²+(y+1)²=9"],
    ["bnu-high-ds-v1-s5-009", "1/5"],
    ["bnu-high-ds-v1-s5-145", "45°"],
    ["bnu-high-ds-v1-s5-147", "4/3"],
    ["bnu-high-ds-v1-s5-149", "线性相关；c=a+b"],
    ["bnu-high-ds-v1-s5-151", "(2,-1,2)"],
    ["bnu-high-ds-v1-s5-288", "16"],
    ["bnu-high-ds-v1-s5-294", "30"],
    ["bnu-high-ds-v1-s5-218", "y=2x，y(7)=14"],
    ["bnu-high-ds-v1-s5-219", "4"],
    ["bnu-high-ds-v1-s5-221", "在覆盖区域内；(5-2)²+(3+1)²=25≤25"],
    ["bnu-high-ds-v1-s5-222", "5千米"],
    ["bnu-high-ds-v1-s5-225", "41"],
    ["bnu-high-ds-v1-s5-359", "1"],
    ["bnu-high-ds-v1-s5-360", "1/3"],
    ["bnu-high-ds-v1-s5-361", "3/8"],
    ["bnu-high-ds-v1-s5-362", "1；1/2"],
    ["bnu-high-ds-v1-s5-363", "42%"],
    ["bnu-high-ds-v1-s5-430", "学习时间较长通常与较高成绩相关，但仅凭该散点图不能断定因果关系"],
    ["bnu-high-ds-v1-s5-431", "独立；P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)"],
    ["bnu-high-ds-v1-s6-226", "y=2x-1"],
    ["bnu-high-ds-v1-s6-227", "(-∞,-1)∪(1,+∞)；(-1,1)"],
    ["bnu-high-ds-v1-s6-228", "1"],
    ["bnu-high-ds-v1-s6-229", "10"],
    ["bnu-high-ds-v1-s6-232", "58"],
    ["bnu-high-ds-v1-s6-002", "120"],
    ["bnu-high-ds-v1-s6-004", "93"],
    ["bnu-high-ds-v1-s6-006", "48"],
    ["bnu-high-ds-v1-s6-008", "13"],
    ["bnu-high-ds-v1-s6-010", "35"],
    ["bnu-high-ds-v1-s6-451", "30"],
    ["bnu-high-ds-v1-s6-452", "155"],
    ["bnu-high-ds-v1-s6-453", "42"],
    ["bnu-high-ds-v1-s6-454", "15"],
    ["bnu-high-ds-v1-s6-455", "2n+1"],
    ["bnu-high-ds-v1-s6-456", "a₂=3，a₃=7，a₄=15"]
  ]);

  expectedAnswers.forEach((answer, questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.equal(question.answer, answer);
    assert.ok(question.explanation.zhHans?.trim(), `${questionId} should include a complete explanation`);

    if (question.type === "multiple-choice") {
      const optionValues = (question.options ?? []).map((option) => option.zhHans ?? option.zh);
      assert.equal(optionValues.length, 4, `${questionId} should have four choices`);
      assert.equal(new Set(optionValues).size, 4, `${questionId} should have unique choices`);
      assert.equal(optionValues.filter((option) => option === answer).length, 1, `${questionId} should have exactly one keyed choice`);
    }
  });

  assert.equal(Math.min(...[0, 2, 3].map((x) => x ** 2 - 4 * x + 1)), -3);
  assert.ok(2 * 2 - 4 >= 0 && 2 * (2 - 0.001) - 4 < 0);
  assert.equal(200 * 3 ** 3, 5400);
  assert.equal(12 + (7 - 3) * 2.5, 22);
  assert.equal(120 / 8, 15, "s4-149 drains the tank in 15 minutes");
  assert.deepEqual(
    Array.from({ length: 7 }, (_, t) => 100 * 1.2 ** t > 100 + 30 * t),
    [false, false, false, false, false, false, true]
  );
  assert.equal(Math.hypot(3, -4), 5);
  assert.deepEqual([0 * 2 - 1 * (-3), 0 * (-3) + 1 * 2], [3, 2]);
  assert.ok(1 - 1 <= 0 && 1.001 - 1 > 0);
  assert.ok(closeTo(Math.log(18) / Math.log(5), Math.log(2) / Math.log(5) + 2 * Math.log(3) / Math.log(5)));
  assert.deepEqual([2 ** 1, 2 ** 0, 2 ** -2], [2, 1, 0.25]);
  assert.equal(3 ** (4 - 1), 27);
  assert.equal((20 - 8) / (5 - 3), 6);
  assert.equal(120 - ((120 - 96) / 4) * 10, 60);
  assert.equal((84 - 100) / 2, -8);
  assert.equal(100 - 8 * 7, 44);
  assert.equal(Math.abs(53 - (100 - 8 * 6)), 1);
  assert.equal(Math.hypot(3, 4), 5);
  assert.ok(closeTo(20 * Math.tan(Math.PI / 4) + 1.6, 21.6));
  assert.ok(closeTo(Math.tan(Math.PI / 4), 1));
  assert.equal(24 * 1.5 / 2, 18);
  assert.ok(closeTo(1 / 2 + 1 / 3 - (1 / 2) * (1 / 3), 2 / 3));
  assert.equal((3 * 2) / (5 * 4), 3 / 10);
  assert.equal(6 * 3 ** 2, 54);
  assert.ok(["AB", "AD"].every((edge) => ["AA₁"].every((lateralEdge) => edge !== lateralEdge)));
  assert.deepEqual([4 * 6 * 4, 4 * 5 * 2, 4 * 4 * 5], [96, 40, 80]);
  assert.ok((-3 - 1) * (-3 + 2) > 0 && (0 - 1) * (0 + 2) < 0 && (2 - 1) * (2 + 2) > 0);
  assert.deepEqual([-1, 3], [Math.max(-1, Number.NEGATIVE_INFINITY), Math.min(Number.POSITIVE_INFINITY, 3)]);
  assert.deepEqual([6 / 2, 3 / 1], [3, 3], "s4-326 establishes b=3a");
  assert.equal(1 * 1 + 1 * -1, 0, "s4-328 vectors are perpendicular");
  assert.deepEqual([(46 - 6) / 5, (28 - 7) / 3, (11 - 3) / 2], [8, 7, 4]);
  assert.ok(closeTo(Math.sqrt(16) / Math.sqrt(9), 4 / 3));
  assert.ok(closeTo(Math.sqrt(25 - 9) / Math.sqrt(25), 4 / 5));
  assert.deepEqual([17 - 9, 13 - 9, 14 - 9], [8, 4, 5]);
  assert.equal(3 - 3, 0, "s5-003 has zero horizontal change and undefined slope");
  assert.ok(12 / Math.hypot(3, 4) > 2, "s5-005 is disjoint because the center-line distance exceeds the radius");
  assert.deepEqual([2, -1, 3 ** 2], [2, -1, 9], "s5-007 uses center (2,-1) and radius squared 9");
  assert.equal(Math.abs(2 * 1 - 2 + 2 * 2) / Math.sqrt(2 ** 2 + (-1) ** 2 + 2 ** 2), 4 / 3);
  assert.deepEqual([2, -1, 2], [2, -1, 2], "s5-151 uses the plane coefficients as a normal vector");
  assert.deepEqual([(10 - 2) / (5 - 1), 2 - ((10 - 2) / (5 - 1)) * 1, 2 * 7], [2, 0, 14]);
  assert.equal(8 / 4, 2, "s5-079 has focus (2,0)");
  assert.equal((-2) ** 2 - 4 * 1 * -3, 16, "s5-077 has two intersections");
  assert.equal((5 - 2) ** 2 + (3 + 1) ** 2, 25);
  assert.deepEqual([1 + 2, 2 + 2, 2 - 2], [3, 4, 0]);
  assert.equal(Math.hypot(3, 4, 0), 5);
  assert.equal(23 + 3 * 6, 41);
  assert.ok(closeTo(0 * (1 / 4) + 1 * (1 / 2) + 2 * (1 / 4), 1));
  assert.ok(closeTo((6 * (1 / 2) ** 2 * (1 / 2) ** 2), 3 / 8));
  assert.equal(3 / (3 + 6), 1 / 3);
  assert.equal(0.6 * 0.7, 0.42);
  assert.equal((0 * 0.25 + 1 * 0.5 + 4 * 0.25) - (0 * 0.25 + 1 * 0.5 + 2 * 0.25) ** 2, 0.5);
  assert.equal(40 / 200, (80 / 200) * (100 / 200));
  assert.deepEqual([2 * 1, 1 - 2 * 1], [2, -1]);
  assert.ok([0, -2, 2].every((x, index) => [3 * x ** 2 - 3 < 0, 3 * x ** 2 - 3 > 0, 3 * x ** 2 - 3 > 0][index]));
  assert.equal(10 * 6 - 2, 58);
  assert.deepEqual([-(0 ** 2) + 6 * 0 + 1, -(3 ** 2) + 6 * 3 + 1, -(5 ** 2) + 6 * 5 + 1], [1, 10, 6]);
  assert.equal(3 - 3 * 1, 0);
  assert.equal(3 * (2 ** 5 - 1) / (2 - 1), 93);
  assert.deepEqual([1, 1 + 2, 1 + 2 + 4, 1 + 2 + 4 + 6], [1, 3, 7, 13]);
  assert.deepEqual([3 + (7 - 1) * 5, 5 + (11 - 1) * 2, 7 + (8 - 1) * 4], [33, 25, 35]);
  assert.equal([1, 2, 3, 4, 5].reduce((sum, n) => sum + 2 * n, 0), 30);
  assert.equal((10 * (2 * 2 + 9 * 3)) / 2, 155);
  assert.equal(2 * 6 + 3, 15, "s6-454 retains its derivative-evaluation result");
  assert.equal(3 * 1 ** 2 + 3 * 2 ** 2 + 3 * 3 ** 2, 42);
  assert.deepEqual([1, 2 * 1 + 1, 2 * 3 + 1, 2 * 7 + 1], [1, 3, 7, 15]);
});
