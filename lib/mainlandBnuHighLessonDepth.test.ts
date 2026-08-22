import assert from "node:assert/strict";
import test from "node:test";
import {
  mainlandBnuHighLessonSeeds,
  mainlandBnuHighReviewedWorkedExamples
} from "@/data/mainlandBnuHighLessons";
import {
  mainlandBnuHighQuestionGenerationMetadata,
  mainlandBnuHighQuestions
} from "@/data/mainlandBnuHighQuestions";
import { stripHjbGeneratorPromptPrefix, toTraditionalHjbText } from "@/data/hjbQuestionLocalization";
import { validateRestoredTranslation } from "@/scripts/china-lesson-english-translation-validation";

const requiredConceptEvidence: Record<string, { en: string; zhHans: string }> = {
  "bnu-high-s4-对数运算与对数函数": { en: "a ≠ 1", zhHans: "x > 0" },
  "bnu-high-s4-复数": { en: "i² = −1", zhHans: "共轭复数" },
  "bnu-high-s4-概率": { en: "sample space", zhHans: "等可能结果" },
  "bnu-high-s4-函数": { en: "exactly one output", zhHans: "定义域和值域" },
  "bnu-high-s4-函数应用": { en: "variables, units, domain", zhHans: "现实限制" },
  "bnu-high-s4-立体几何初步": { en: "not appearance in a sketch", zhHans: "不能只凭示意图" },
  "bnu-high-s4-平面向量及其应用": { en: "a·b = |a||b|cos θ", zhHans: "非零向量" },
  "bnu-high-s4-三角函数": { en: "period 2π/|ω|", zhHans: "相位移动" },
  "bnu-high-s4-三角恒等变换": { en: "sum, difference, and double-angle", zhHans: "所在象限" },
  "bnu-high-s4-数学建模活动-二": { en: "estimate measurement error", zhHans: "估计测量误差" },
  "bnu-high-s4-数学建模活动-一": { en: "A complete modeling cycle", zhHans: "依赖简化假设" },
  "bnu-high-s4-统计": { en: "association", zhHans: "因果关系" },
  "bnu-high-s4-预备知识": { en: "sufficient-and-necessary", zhHans: "取值限制" },
  "bnu-high-s4-指数运算与指数函数": { en: "a > 0 and a ≠ 1", zhHans: "增长或衰减" },
  "bnu-high-s5-概率": { en: "binomial distribution", zhHans: "各次独立" },
  "bnu-high-s5-计数原理": { en: "whether order matters", zhHans: "元素能否重复" },
  "bnu-high-s5-空间向量与立体几何": { en: "excluding zero-vector", zhHans: "排除零向量" },
  "bnu-high-s5-数学建模活动-三": { en: "test sensitivity", zhHans: "假设变化" },
  "bnu-high-s5-统计案例": { en: "correlation from causation", zhHans: "显著性水平" },
  "bnu-high-s5-圆锥曲线": { en: "quadratic and discriminant", zhHans: "交点个数" },
  "bnu-high-s5-直线与圆": { en: "vertical lines separately", zhHans: "斜率不存在" },
  "bnu-high-s6-导数及其应用": { en: "checking endpoints", zhHans: "检查端点" },
  "bnu-high-s6-高三数列与导数综合复习": { en: "discrete index n", zhHans: "区分离散指标" },
  "bnu-high-s6-数列": { en: "positive integers", zhHans: "归纳递推步骤" }
};

const expectedWorkedAnchors = {
  "bnu-high-s4-对数运算与对数函数": ["authored-novel-variant", "bnu-high-ds-v1-s4-116", "m = 4"],
  "bnu-high-s4-复数": ["authored-novel-variant", "bnu-high-ds-v1-s4-440", "实部为 6"],
  "bnu-high-s4-概率": ["authored-novel-variant", "bnu-high-ds-v1-s4-224", "概率为 4/9"],
  "bnu-high-s4-函数": ["exact-approved-source", "bnu-high-ds-v1-s4-044", "f(3) = 2 × 3 - 1 = 5"],
  "bnu-high-s4-函数应用": ["authored-novel-variant", "bnu-high-ds-v1-s4-152", "y = 18 + 4 × 7 = 46"],
  "bnu-high-s4-立体几何初步": ["exact-approved-source", "bnu-high-ds-v1-s4-474", "V = 4 × 6 × 2 = 48"],
  "bnu-high-s4-平面向量及其应用": ["exact-approved-source", "bnu-high-ds-v1-s4-335", "a·b = 4 × 2 + 3 × 1 = 11"],
  "bnu-high-s4-三角函数": ["authored-novel-variant", "bnu-high-ds-v1-s4-296", "|-4| = 4"],
  "bnu-high-s4-三角恒等变换": ["authored-novel-variant", "bnu-high-ds-v1-s4-404", "15/17"],
  "bnu-high-s4-数学建模活动-二": ["authored-novel-variant", "bnu-high-ds-v1-s4-371", "12 + 1.5 = 13.5 米"],
  "bnu-high-s4-数学建模活动-一": ["authored-novel-variant", "bnu-high-ds-v1-s4-260", "V(6) = 100 - 8 × 6 = 52"],
  "bnu-high-s4-统计": ["authored-novel-variant", "bnu-high-ds-v1-s4-188", "15 - 6 = 9"],
  "bnu-high-s4-预备知识": ["exact-approved-source", "bnu-high-ds-v1-s4-008", "x = 5"],
  "bnu-high-s4-指数运算与指数函数": ["authored-novel-variant", "bnu-high-ds-v1-s4-080", "3^7"],
  "bnu-high-s5-概率": ["authored-novel-variant", "bnu-high-ds-v1-s5-368", "10/32 = 5/16"],
  "bnu-high-s5-计数原理": ["authored-novel-variant", "bnu-high-ds-v1-s5-296", "= 165"],
  "bnu-high-s5-空间向量与立体几何": ["exact-approved-source", "bnu-high-ds-v1-s5-152", "a·b = 5 × 4 + 3 × 2 + 3 × 2 = 32"],
  "bnu-high-s5-数学建模活动-三": ["exact-approved-source", "bnu-high-ds-v1-s5-224", "y = 25 + 3 × 3 = 34"],
  "bnu-high-s5-统计案例": ["authored-novel-variant", "bnu-high-ds-v1-s5-440", "2.4 × 2 = 4.8"],
  "bnu-high-s5-圆锥曲线": ["exact-approved-source", "bnu-high-ds-v1-s5-080", "c² = 16 - 9 = 7"],
  "bnu-high-s5-直线与圆": ["exact-approved-source", "bnu-high-ds-v1-s5-008", "6÷2=3"],
  "bnu-high-s6-导数及其应用": ["exact-approved-source", "bnu-high-ds-v1-s6-236", "f′(2) = 4 × 2 + 2 = 10"],
  "bnu-high-s6-高三数列与导数综合复习": ["exact-approved-source", "bnu-high-ds-v1-s6-460", "f′(6) = 8 × 6 + 2 = 50"],
  "bnu-high-s6-数列": ["exact-approved-source", "bnu-high-ds-v1-s6-011", "a_9 = a_1 + (9 - 1)d = 3 + 8 × 2 = 19"]
} as const;

const independentlyRecomputedWorkedResults: Record<keyof typeof expectedWorkedAnchors, number> = {
  "bnu-high-s4-对数运算与对数函数": Math.log(81) / Math.log(3),
  "bnu-high-s4-复数": 2 + 4,
  "bnu-high-s4-概率": 4 / (4 + 5),
  "bnu-high-s4-函数": 2 * 3 - 1,
  "bnu-high-s4-函数应用": 18 + 4 * 7,
  "bnu-high-s4-立体几何初步": 4 * 6 * 2,
  "bnu-high-s4-平面向量及其应用": 4 * 2 + 3 * 1,
  "bnu-high-s4-三角函数": Math.abs(-4),
  "bnu-high-s4-三角恒等变换": Math.sqrt(1 - (8 / 17) ** 2),
  "bnu-high-s4-数学建模活动-二": 12 * Math.tan(Math.PI / 4) + 1.5,
  "bnu-high-s4-数学建模活动-一": 100 - 8 * 6,
  "bnu-high-s4-统计": 15 - 6,
  "bnu-high-s4-预备知识": (22 - 2) / 4,
  "bnu-high-s4-指数运算与指数函数": 4 + 3,
  "bnu-high-s5-概率": (10 * (1 / 2) ** 5),
  "bnu-high-s5-计数原理": (11 * 10 * 9) / (3 * 2 * 1),
  "bnu-high-s5-空间向量与立体几何": 5 * 4 + 3 * 2 + 3 * 2,
  "bnu-high-s5-数学建模活动-三": 25 + 3 * 3,
  "bnu-high-s5-统计案例": 2.4 * 2,
  "bnu-high-s5-圆锥曲线": 16 - 9,
  "bnu-high-s5-直线与圆": (4 - (-2)) / (5 - 3),
  "bnu-high-s6-导数及其应用": 4 * 2 + 2,
  "bnu-high-s6-高三数列与导数综合复习": 8 * 6 + 2,
  "bnu-high-s6-数列": 3 + (9 - 1) * 2
};

const expectedWorkedResultValues: Record<keyof typeof expectedWorkedAnchors, number> = {
  "bnu-high-s4-对数运算与对数函数": 4,
  "bnu-high-s4-复数": 6,
  "bnu-high-s4-概率": 4 / 9,
  "bnu-high-s4-函数": 5,
  "bnu-high-s4-函数应用": 46,
  "bnu-high-s4-立体几何初步": 48,
  "bnu-high-s4-平面向量及其应用": 11,
  "bnu-high-s4-三角函数": 4,
  "bnu-high-s4-三角恒等变换": 15 / 17,
  "bnu-high-s4-数学建模活动-二": 13.5,
  "bnu-high-s4-数学建模活动-一": 52,
  "bnu-high-s4-统计": 9,
  "bnu-high-s4-预备知识": 5,
  "bnu-high-s4-指数运算与指数函数": 7,
  "bnu-high-s5-概率": 5 / 16,
  "bnu-high-s5-计数原理": 165,
  "bnu-high-s5-空间向量与立体几何": 32,
  "bnu-high-s5-数学建模活动-三": 34,
  "bnu-high-s5-统计案例": 4.8,
  "bnu-high-s5-圆锥曲线": 7,
  "bnu-high-s5-直线与圆": 3,
  "bnu-high-s6-导数及其应用": 10,
  "bnu-high-s6-高三数列与导数综合复习": 50,
  "bnu-high-s6-数列": 19
};

function normalizedWorkedFingerprint(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s，。；：、,.!?！？“”"'（）()\[\]{}]/gu, "");
}

test("every BNU high lesson teaches topic-specific mathematical conditions", () => {
  assert.equal(mainlandBnuHighLessonSeeds.length, 24);
  assert.deepEqual(
    mainlandBnuHighLessonSeeds.map((seed) => seed.topicId).sort(),
    Object.keys(requiredConceptEvidence).sort(),
    "the depth contract must cover the complete BNU high lesson inventory"
  );

  mainlandBnuHighLessonSeeds.forEach((seed) => {
    const concept = seed.blocks.find((block) => block.type === "concept")?.content;
    const evidence = requiredConceptEvidence[seed.topicId];
    assert.ok(concept, `${seed.topicId} needs a concept block`);
    assert.ok(concept.en.length >= 170, `${seed.topicId} English concept is too shallow`);
    assert.ok((concept.zhHans ?? "").length >= 65, `${seed.topicId} Simplified Chinese concept is too shallow`);
    assert.ok(concept.en.includes(evidence.en), `${seed.topicId} lacks its English condition boundary`);
    assert.ok(concept.zhHans?.includes(evidence.zhHans), `${seed.topicId} lacks its Chinese condition boundary`);
    assert.doesNotMatch(concept.en, /(?:study .+ by connecting|BNUP|QA|RAG)/iu);
    assert.doesNotMatch(concept.zhHans ?? "", /本课围绕《[^》]+》学习：先确认定义或规则/u);
  });
});

test("BNU high line-and-circle worked example is independently solved and disjoint from its checkpoint", () => {
  const topicId = "bnu-high-s5-直线与圆";
  const sourceQuestionId = "bnu-high-ds-v1-s5-008";
  const checkpointIds = [
    "bnu-high-ds-v1-s5-003",
    "bnu-high-ds-v1-s5-007",
    "bnu-high-ds-v1-s5-001",
    "bnu-high-ds-v1-s5-005",
    "bnu-high-ds-v1-s5-009",
    "bnu-high-ds-v1-s5-002",
    "bnu-high-ds-v1-s5-004",
    "bnu-high-ds-v1-s5-006"
  ];
  const zhHans = "例：直线经过点 A(3, -2) 和 B(5, 4)，求这条直线的斜率。解：两点的 x 坐标不同，斜率存在。由斜率公式，k=(4-(-2))÷(5-3)=6÷2=3。";
  const zh = "例：直線經過點 A(3, -2) 和 B(5, 4)，求這條直線的斜率。解：兩點的 x 坐標不同，斜率存在。由斜率公式，k=(4-(-2))÷(5-3)=6÷2=3。";
  const en = "Example: A line passes through points A(3, -2) and B(5, 4). Find its slope. Solution: The two points have different x-coordinates, so the slope is defined. Using the slope formula, k=(4-(-2))÷(5-3)=6÷2=3.";
  const seed = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
  const source = mainlandBnuHighQuestions.find((question) => question.id === sourceQuestionId);
  assert.ok(seed && source);
  assert.deepEqual(seed.practiceQuestionIds, checkpointIds);
  assert.ok(!seed.practiceQuestionIds?.includes(sourceQuestionId));
  assert.equal(source.topicId, topicId);
  assert.equal(source.answer, "3");
  const coordinateMatch = (source.prompt.zhHans ?? source.prompt.zh).match(/A\(([-\d.]+),\s*([-\d.]+)\).*B\(([-\d.]+),\s*([-\d.]+)\)/u);
  assert.ok(coordinateMatch);
  const [, x1, y1, x2, y2] = coordinateMatch.map(Number);
  assert.equal((y2 - y1) / (x2 - x1), 3);

  const worked = seed.blocks.find((block) => block.type === "worked-example")?.content;
  assert.deepEqual(worked, { en, zh, zhHans });
  checkpointIds.slice(0, 5).forEach((questionId) => {
    const prompt = mainlandBnuHighQuestions.find((question) => question.id === questionId)?.prompt.zhHans;
    assert.ok(prompt);
    assert.ok(!zhHans.includes(prompt), `worked example must not disclose ${questionId}`);
  });
  assert.equal(validateRestoredTranslation({ id: "bnu-high-line-circle-worked", source: zhHans, contexts: [topicId] }, en), en);
});

test("every BNU high worked example is reviewed, trilingual, and disjoint from its complete checkpoint", () => {
  assert.equal(mainlandBnuHighLessonSeeds.length, 24);
  assert.deepEqual(
    Object.keys(mainlandBnuHighReviewedWorkedExamples).sort(),
    mainlandBnuHighLessonSeeds.map((seed) => seed.topicId).sort(),
    "the reviewed worked-example manifest must cover all 24 lessons"
  );
  assert.equal(
    Object.values(mainlandBnuHighReviewedWorkedExamples).filter((reviewed) => reviewed.mode === "exact-approved-source").length,
    11,
    "exact approved-source worked examples"
  );
  assert.equal(
    Object.values(mainlandBnuHighReviewedWorkedExamples).filter((reviewed) => reviewed.mode === "authored-novel-variant").length,
    13,
    "authored novel variants"
  );
  assert.equal(
    new Set(
      Object.values(mainlandBnuHighReviewedWorkedExamples).map((reviewed) => normalizedWorkedFingerprint(reviewed.zhHans))
    ).size,
    24,
    "Simplified Chinese worked examples must be substantively unique"
  );
  assert.equal(
    new Set(
      Object.values(mainlandBnuHighReviewedWorkedExamples).map((reviewed) => normalizedWorkedFingerprint(reviewed.en))
    ).size,
    24,
    "English worked examples must be substantively unique"
  );
  mainlandBnuHighLessonSeeds.forEach((seed) => {
    const topicId = seed.topicId as keyof typeof expectedWorkedAnchors;
    const expected = expectedWorkedAnchors[topicId];
    const reviewed = mainlandBnuHighReviewedWorkedExamples[topicId];
    assert.ok(expected && reviewed, `${seed.topicId} reviewed contract`);
    assert.equal(reviewed.mode, expected[0], `${seed.topicId} reviewed mode`);
    const anchorId = reviewed.mode === "exact-approved-source" ? reviewed.sourceQuestionId : reviewed.templateAnchorId;
    assert.equal(anchorId, expected[1], `${seed.topicId} reviewed source or template anchor`);
    const anchor = mainlandBnuHighQuestions.find((question) => question.id === anchorId);
    const anchorMetadata = mainlandBnuHighQuestionGenerationMetadata[anchorId];
    assert.ok(anchor && anchorMetadata, `${seed.topicId} approved anchor ${anchorId}`);
    assert.equal(anchor.topicId, seed.topicId, `${seed.topicId} anchor topic`);
    assert.equal(anchorMetadata.sourceDistanceStatus, "passed-auto-source-scan", `${anchorId} source-distance QA`);
    assert.equal(anchorMetadata.mathQaStatus, "pass", `${anchorId} math QA`);
    assert.equal(anchorMetadata.terminologyQaStatus, "pass", `${anchorId} terminology QA`);
    assert.equal(anchorMetadata.manualQaStatus, "approved", `${anchorId} manual QA`);
    assert.ok(!seed.practiceQuestionIds?.includes(anchorId), `${seed.topicId} anchor must be outside all eight checkpoints`);

    const worked = seed.blocks.find((block) => block.type === "worked-example")?.content;
    assert.ok(worked, `${seed.topicId} needs a worked example`);
    assert.equal(worked.en, reviewed.en, `${seed.topicId} reviewed English content`);
    assert.equal(worked.zhHans, reviewed.zhHans, `${seed.topicId} reviewed Simplified Chinese content`);
    assert.ok(worked.zhHans?.includes(expected[2]), `${seed.topicId} independently checked result evidence`);
    assert.doesNotMatch(worked.en, /\p{Script=Han}/u, `${seed.topicId} English worked example`);
    assert.equal(worked.zh, toTraditionalHjbText(worked.zhHans ?? worked.zh), `${seed.topicId} Traditional parity`);
    assert.equal(
      validateRestoredTranslation(
        { id: `${seed.topicId}-worked`, source: worked.zhHans ?? worked.zh, contexts: [seed.topicId] },
        worked.en
      ),
      worked.en,
      `${seed.topicId} English formula fidelity`
    );
    assert.equal(seed.practiceQuestionIds?.length, 8, `${seed.topicId} complete checkpoint quota`);
    seed.practiceQuestionIds?.forEach((questionId) => {
      const question = mainlandBnuHighQuestions.find((candidate) => candidate.id === questionId);
      assert.ok(question, `${seed.topicId} missing checkpoint ${questionId}`);
      const prompt = stripHjbGeneratorPromptPrefix(question.prompt.zhHans ?? question.prompt.zh);
      assert.ok(
        !worked.zhHans?.includes(prompt),
        `${seed.topicId} worked example must not copy checkpoint prompt ${questionId}`
      );
    });
    if (reviewed.mode === "authored-novel-variant") {
      const anchorPrompt = stripHjbGeneratorPromptPrefix(anchor.prompt.zhHans ?? anchor.prompt.zh);
      assert.ok(!worked.zhHans?.includes(anchorPrompt), `${seed.topicId} authored variant must not copy its template anchor`);
      mainlandBnuHighQuestions
        .filter((question) => question.topicId === seed.topicId)
        .forEach((question) => {
          const approvedPrompt = stripHjbGeneratorPromptPrefix(question.prompt.zhHans ?? question.prompt.zh);
          assert.ok(
            !worked.zhHans?.includes(approvedPrompt),
            `${seed.topicId} authored variant must be novel against approved question ${question.id}`
          );
        });
    } else {
      assert.equal(
        Number(anchor.answer),
        expectedWorkedResultValues[topicId],
        `${seed.topicId} exact approved-source canonical answer`
      );
    }
    assert.ok(
      Math.abs(independentlyRecomputedWorkedResults[topicId] - expectedWorkedResultValues[topicId]) < 1e-10,
      `${seed.topicId} independently recomputed result`
    );
  });
});
