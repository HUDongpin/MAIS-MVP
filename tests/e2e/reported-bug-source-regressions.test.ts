import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { mainlandBnuHighLessonSeeds } from "../../data/mainlandBnuHighLessons";
import { mainlandBnuPrimaryLessonSeeds } from "../../data/mainlandBnuPrimaryLessons";
import { mainlandHjbHighLessonSeeds } from "../../data/mainlandHjbHighLessons";
import { mainlandHjbHighQuestions } from "../../data/mainlandHjbHighQuestions";
import { mainlandHjbPrimaryLessonSeeds } from "../../data/mainlandHjbPrimaryLessons";
import { mainlandHjbPrimaryQuestions } from "../../data/mainlandHjbPrimaryQuestions";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

const hjbHighDepthTopicIds = [
  "hjb-high-s4-等式与不等式",
  "hjb-high-s4-复数",
  "hjb-high-s4-函数的概念-性质及应用",
  "hjb-high-s4-集合与逻辑",
  "hjb-high-s4-幂-指数与对数",
  "hjb-high-s4-幂函数-指数函数与对数函数",
  "hjb-high-s4-平面向量",
  "hjb-high-s4-三角",
  "hjb-high-s4-三角函数",
  "hjb-high-s5-概率初步",
  "hjb-high-s5-简单几何体",
  "hjb-high-s5-空间向量及其应用",
  "hjb-high-s5-空间直线与平面",
  "hjb-high-s5-平面直角坐标系中的直线",
  "hjb-high-s5-数列",
  "hjb-high-s5-统计",
  "hjb-high-s5-圆锥曲线",
  "hjb-high-s6-成对数据的统计分析",
  "hjb-high-s6-概率初步续",
  "hjb-high-s6-概率统计综合",
  "hjb-high-s6-导数及其运用",
  "hjb-high-s6-函数-导数与不等式综合",
  "hjb-high-s6-计数原理",
  "hjb-high-s6-解析几何直线综合复习",
  "hjb-high-s6-空间向量综合复习",
  "hjb-high-s6-三角-向量与解析几何综合",
  "hjb-high-s6-数列综合复习",
  "hjb-high-s6-立体几何与空间向量综合",
  "hjb-high-s6-数列与计数综合",
  "hjb-high-s6-圆锥曲线综合复习"
] as const;

const hjbHighDepthTopicIdSet = new Set<string>(hjbHighDepthTopicIds);

test("HJB primary source explanations preserve exact option and decimal comparisons", () => {
  const equalGroups = mainlandHjbPrimaryQuestions.find((question) => question.id === "hjb-primary-ds-v1-p2-070");
  const decimalOrdering = mainlandHjbPrimaryQuestions.find((question) => question.id === "hjb-primary-ds-v1-p4-162");

  assert.ok(equalGroups, "missing HJB primary equal-groups source row");
  assert.match(equalGroups.explanation.zhHans ?? "", /第1、2、4个选项都表示3个4或4个3/);
  assert.match(equalGroups.explanation.zhHans ?? "", /第3个选项.*不能用3×4表示/);
  assert.doesNotMatch(equalGroups.explanation.zhHans ?? "", /前三个选项都是/);

  assert.ok(decimalOrdering, "missing HJB primary decimal-ordering source row");
  assert.match(decimalOrdering.explanation.zhHans ?? "", /0\.65、0\.605和0\.6的十分位都是6/);
  assert.match(decimalOrdering.explanation.zhHans ?? "", /再比较前三个数的百分位/);
  assert.match(decimalOrdering.explanation.zhHans ?? "", /0\.65>0\.605>0\.6>0\.56>0\.065/);
  assert.doesNotMatch(decimalOrdering.explanation.zhHans ?? "", /0\.65的十分位是6最大/);
});

test("every HJB primary and high MC-derived worked example includes every localized option", () => {
  const languages = ["en", "zh", "zhHans"] as const;
  const scopes = [
    {
      label: "primary",
      lessonSeeds: mainlandHjbPrimaryLessonSeeds,
      questions: mainlandHjbPrimaryQuestions,
      expectedAnchorCount: 38,
      bespokeTopicIds: new Set<string>()
    },
    {
      label: "high",
      lessonSeeds: mainlandHjbHighLessonSeeds,
      questions: mainlandHjbHighQuestions,
      expectedAnchorCount: 0,
      bespokeTopicIds: hjbHighDepthTopicIdSet
    }
  ];

  for (const scope of scopes) {
    const anchorIds: string[] = [];

    for (const lessonSeed of scope.lessonSeeds) {
      const sourceQuestion = scope.questions.find((question) => question.topicId === lessonSeed.topicId);
      assert.ok(sourceQuestion, `${scope.label} ${lessonSeed.topicId} is missing its source-question anchor`);
      if (sourceQuestion.type !== "multiple-choice") continue;
      if (scope.bespokeTopicIds.has(lessonSeed.topicId)) continue;

      anchorIds.push(sourceQuestion.id);
      assert.ok(sourceQuestion.options?.length, `${sourceQuestion.id} is multiple-choice but has no options`);
      const workedExample = lessonSeed.blocks.find((block) => block.type === "worked-example");
      assert.ok(workedExample?.content, `${sourceQuestion.id} is missing its worked-example content`);

      for (const language of languages) {
        const workedText = workedExample.content[language] ?? workedExample.content.zh;
        for (const [optionIndex, option] of sourceQuestion.options.entries()) {
          const optionText = option[language] ?? option.zh;
          assert.ok(
            workedText.includes(optionText),
            `${sourceQuestion.id} ${language} worked example omits option ${optionIndex + 1}: ${optionText}`
          );
        }
      }
    }

    assert.equal(
      anchorIds.length,
      scope.expectedAnchorCount,
      `${scope.label} MC lesson-anchor count changed; review the complete-option regression scope`
    );
    assert.equal(new Set(anchorIds).size, anchorIds.length, `${scope.label} MC lesson anchors must be unique`);
  }
});

test("thirty HJB high depth lessons expose topic-specific concepts and complete checked examples", () => {
  const expectations = {
    "hjb-high-s4-等式与不等式": {
      conceptEn: ["equivalent only", "negative number reverses", "sign chart"],
      conceptZhHans: ["等价变形", "改变不等号方向", "符号表"],
      workedEn: ["x ≠ −2", "(−∞,−2) ∪ [1,∞)", "x = 0 gives −1/2 < 0"],
      workedZhHans: ["x ≠ −2", "(−∞,−2) ∪ [1,∞)", "x = 0，分式值为 −1/2 < 0"]
    },
    "hjb-high-s4-复数": {
      conceptEn: ["i² = −1", "z·z̄ = |z|²", "c² + d² > 0"],
      conceptZhHans: ["i² = −1", "z·z̄ = |z|²", "c² + d² > 0"],
      workedEn: ["−1 + 5i", "z = −1/2 + (5/2)i", "recovers the original numerator"],
      workedZhHans: ["−1 + 5i", "z = −1/2 + (5/2)i", "还原原分子"]
    },
    "hjb-high-s4-函数的概念-性质及应用": {
      conceptEn: ["domain is part of the function", "restricted interval", "one-to-one"],
      conceptZhHans: ["定义域是函数本身的一部分", "限定区间", "一一对应"],
      workedEn: ["f(x) = (x − 2)² − 3", "range [−3,6]", "x = 0 is excluded"],
      workedZhHans: ["f(x) = (x − 2)² − 3", "值域为 [−3,6]", "x = 0 被定义域排除"]
    },
    "hjb-high-s4-集合与逻辑": {
      conceptEn: ["De Morgan's laws", "p ⇒ q", "sufficient for q"],
      conceptZhHans: ["德摩根律", "p ⇒ q", "充分条件"],
      workedEn: ["A ∪ B = {2,3,4,5,6,7,8,10}", "(A ∪ B)ᶜ = {1,9}", "Aᶜ ∩ Bᶜ gives the same set"],
      workedZhHans: ["A ∪ B = {2,3,4,5,6,7,8,10}", "(A ∪ B)ᶜ = {1,9}", "Aᶜ ∩ Bᶜ 也得到 {1,9}"]
    },
    "hjb-high-s4-幂-指数与对数": {
      conceptEn: ["a > 0 and a ≠ 1", "argument must satisfy M > 0", "extraneous"],
      conceptZhHans: ["a > 0 且 a ≠ 1", "真数必须满足 M > 0", "增根"],
      workedEn: ["domain x > 3", "(x − 5)(x + 1)", "log₂4 + log₂2 = 2 + 1 = 3"],
      workedZhHans: ["定义域 x > 3", "(x − 5)(x + 1)", "log₂4 + log₂2 = 2 + 1 = 3"]
    },
    "hjb-high-s4-幂函数-指数函数与对数函数": {
      conceptEn: ["domain ℝ and range (0,∞)", "decrease when 0 < a < 1", "t = aˣ requires t > 0"],
      conceptZhHans: ["定义域为 ℝ、值域为 (0,∞)", "0 < a < 1 时两者递减", "必须保留 t > 0"],
      workedEn: ["(t − 1)(t − 9) ≤ 0", "0 ≤ x ≤ 2", "52/9 > 0"],
      workedZhHans: ["(t − 1)(t − 9) ≤ 0", "0 ≤ x ≤ 2", "52/9 > 0"]
    },
    "hjb-high-s4-平面向量": {
      conceptEn: ["u·v = u₁v₁ + u₂v₂", "projᵤv", "Pythagorean identity"],
      conceptZhHans: ["u·v = u₁v₁ + u₂v₂", "projᵤv", "勾股关系"],
      workedEn: ["cos θ = 5/(√5·√10) = 1/√2", "v = (2,1) + (−1,2)", "10 = |(2,1)|² + |(−1,2)|² = 5 + 5"],
      workedZhHans: ["cos θ = 5/(√5·√10) = 1/√2", "v = (2,1) + (−1,2)", "10 = |(2,1)|² + |(−1,2)|² = 5 + 5"]
    },
    "hjb-high-s4-三角": {
      conceptEn: ["sine rule", "cosine rule", "SSA"],
      conceptZhHans: ["正弦定理", "余弦定理", "大边对大角"],
      workedEn: ["49 + 25 − 35 = 39", "area = 35√3/4", "2 < √39 < 12"],
      workedZhHans: ["49 + 25 − 35 = 39", "面积为 35√3/4", "2 < √39 < 12"]
    },
    "hjb-high-s4-三角函数": {
      conceptEn: ["period 2π", "transformed angle y = kx", "original interval excludes"],
      conceptZhHans: ["周期为 2π", "复合角 y = kx", "原区间不包含的端点"],
      workedEn: ["2x ∈ [0,4π)", "2x = π/3, 2π/3, 7π/3, and 8π/3", "x ∈ {π/6, π/3, 7π/6, 4π/3}"],
      workedZhHans: ["2x ∈ [0,4π)", "2x = π/3、2π/3、7π/3、8π/3", "x ∈ {π/6, π/3, 7π/6, 4π/3}"]
    },
    "hjb-high-s5-概率初步": {
      conceptEn: ["equally likely elementary outcomes", "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)", "Mutually exclusive events"],
      conceptZhHans: ["基本结果等可能", "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)", "互斥事件"],
      workedEn: ["|A ∪ B| = 6 + 6 − 2 = 10", "P(A ∪ B) = 10/36 = 5/18", "1 − 26/36 = 10/36 = 5/18"],
      workedZhHans: ["|A ∪ B| = 6 + 6 − 2 = 10", "P(A ∪ B) = 10/36 = 5/18", "1 − 26/36 = 10/36 = 5/18"]
    },
    "hjb-high-s5-简单几何体": {
      conceptEn: ["one third", "height must be perpendicular", "square units"],
      conceptZhHans: ["三分之一", "高必须垂直于底面", "平方单位"],
      workedEn: ["V = (1/3)(36)(4) = 48", "l = √(4² + 3²) = 5", "total surface area 60 + 36 = 96"],
      workedZhHans: ["V = (1/3)(36)(4) = 48", "l = √(4² + 3²) = 5", "总表面积 60 + 36 = 96"]
    },
    "hjb-high-s5-空间向量及其应用": {
      conceptEn: ["n·(x − A) = 0", "(n·P − d)/(n·n)n", "|n·P − d|/|n|"],
      conceptZhHans: ["n·(x − A) = 0", "(n·P − d)/(n·n)n", "|n·P − d|/|n|"],
      workedEn: ["n = (1,1,1)", "H = P − (2/3)n = (1/3,1/3,1/3)", "distance is 2√3/3"],
      workedZhHans: ["n = (1,1,1)", "H = P − (2/3)n = (1/3,1/3,1/3)", "点面距离为 2√3/3"]
    },
    "hjb-high-s5-空间直线与平面": {
      conceptEn: ["two intersecting lines", "orthogonal projection", "perpendicular segment"],
      conceptZhHans: ["两条相交直线", "正射影", "垂直线段"],
      workedEn: ["sin θ = CC₁/AC₁ = 1/√3 = √3/3", "sin² θ + cos² θ = 1/3 + 2/3 = 1"],
      workedZhHans: ["sin θ = CC₁/AC₁ = 1/√3 = √3/3", "sin² θ + cos² θ = 1/3 + 2/3 = 1"]
    },
    "hjb-high-s5-平面直角坐标系中的直线": {
      conceptEn: ["n = (A,B)", "d = (B,−A)", "|Ax₀ + By₀ + C|/√(A² + B²)"],
      conceptZhHans: ["n = (A,B)", "d = (B,−A)", "|Ax₀ + By₀ + C|/√(A² + B²)"],
      workedEn: ["5t + 3 = 0", "H = (−1/5,13/5)", "3/√5 = 3√5/5"],
      workedZhHans: ["5t + 3 = 0", "H = (−1/5,13/5)", "3/√5 = 3√5/5"]
    },
    "hjb-high-s5-数列": {
      conceptEn: ["positive integers", "aₙ₊₁ = qaₙ + r", "bₙ₊₁ = qbₙ"],
      conceptZhHans: ["定义域为正整数集", "aₙ₊₁ = qaₙ + r", "bₙ₊₁ = qbₙ"],
      workedEn: ["bₙ = 4·2ⁿ⁻¹ = 2ⁿ⁺¹", "Sₙ = ∑ₖ₌₁ⁿ(2ᵏ⁺¹ − 1)", "3 + 7 + 15 + 31 + 63 = 119"],
      workedZhHans: ["bₙ = 4·2ⁿ⁻¹ = 2ⁿ⁺¹", "Sₙ = ∑ₖ₌₁ⁿ(2ᵏ⁺¹ − 1)", "3 + 7 + 15 + 31 + 63 = 119"]
    },
    "hjb-high-s5-统计": {
      conceptEn: ["sensitive to extreme observations", "v = (1/n)Σ(xᵢ − x̄)²", "does not by itself prove a causal explanation"],
      conceptZhHans: ["容易受极端值影响", "v = (1/n)Σ(xᵢ − x̄)²", "不能单独证明因果关系"],
      workedEn: ["x̄ = 40/8 = 5", "9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32", "232/8 − 25 = 29 − 25 = 4"],
      workedZhHans: ["x̄ = 40/8 = 5", "9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32", "232/8 − 25 = 29 − 25 = 4"]
    },
    "hjb-high-s5-圆锥曲线": {
      conceptEn: ["constant sum 2a", "c² = a² − b²", "equidistant from a focus and a directrix"],
      conceptZhHans: ["距离之和为常数 2a", "c² = a² − b²", "到一个焦点和一条准线距离相等"],
      workedEn: ["PF₁ = PF₂ = √(4² + 3²) = 5", "b² = a² − c² = 25 − 16 = 9", "x²/25 + y²/9 = 1 and e = 4/5"],
      workedZhHans: ["PF₁ = PF₂ = √(4² + 3²) = 5", "b² = a² − c² = 25 − 16 = 9", "x²/25 + y²/9 = 1，e = 4/5"]
    },
    "hjb-high-s6-成对数据的统计分析": {
      conceptEn: ["b = Sxy/Sxx", "residual e = y − ŷ", "does not prove causation"],
      conceptZhHans: ["b = Sxy/Sxx", "残差 e = y − ŷ", "不能证明因果关系"],
      workedEn: ["Sxx = 5", "r = 7/√(5·10) = 7/√50 ≈ 0.990", "0.5 + 1.4(2.5) = 4"],
      workedZhHans: ["Sxx = 5", "r = 7/√(5·10) = 7/√50 ≈ 0.990", "属于外推"]
    },
    "hjb-high-s6-概率初步续": {
      conceptEn: ["P(A | B) = P(A ∩ B)/P(B)", "independent exactly when", "Bayes' rule"],
      conceptZhHans: ["P(A | B) = P(A ∩ B)/P(B)", "当且仅当", "贝叶斯公式"],
      workedEn: ["P(D) = 0.60(0.02) + 0.40(0.05)", "P(B | D) = 0.40(0.05)/0.032", "3/8 + 5/8 = 1"],
      workedZhHans: ["P(D) = 0.60(0.02) + 0.40(0.05)", "P(B | D) = 0.40(0.05)/0.032", "3/8 + 5/8 = 1"]
    },
    "hjb-high-s6-概率统计综合": {
      conceptEn: ["X ~ B(n,p)", "P(X = k) = C(n,k)pᵏ(1 − p)ⁿ⁻ᵏ", "Var(X) = np(1 − p)"],
      conceptZhHans: ["X ~ B(n,p)", "P(X = k) = C(n,k)pᵏ(1 − p)ⁿ⁻ᵏ", "样本比例"],
      workedEn: ["P(X = 2) = C(20,2)(0.10)²(0.90)¹⁸ ≈ 0.2852", "P(X ≥ 1) ≈ 0.8784", "Var(X) = 20(0.10)(0.90) = 1.8"],
      workedZhHans: ["P(X = 2) = C(20,2)(0.10)²(0.90)¹⁸ ≈ 0.2852", "P(X ≥ 1) ≈ 0.8784", "长期平均值"]
    },
    "hjb-high-s6-导数及其运用": {
      conceptEn: ["feasible domain", "f'(x) = 0", "global rather than merely local"],
      conceptZhHans: ["可行域", "f'(x) = 0", "全局最优"],
      workedEn: ["0 < x < 10", "A'(x) = 20 − 4x", "A(x) = −2(x − 5)² + 50 ≤ 50"],
      workedZhHans: ["0 < x < 10", "A'(x) = 20 − 4x", "A(x) = −2(x − 5)² + 50 ≤ 50"]
    },
    "hjb-high-s6-函数-导数与不等式综合": {
      conceptEn: ["State the domain", "global minimum", "determining its sign"],
      conceptZhHans: ["先写出定义域", "全局最小值", "判断一个式子的正负"],
      workedEn: ["g'(x) = 1 − 1/x = (x − 1)/x", "global minimum is g(1) = 0", "1 − ln 2 ≈ 0.307 > 0"],
      workedZhHans: ["g'(x) = 1 − 1/x = (x − 1)/x", "全局最小值为 g(1) = 0", "1 − ln 2 ≈ 0.307 > 0"]
    },
    "hjb-high-s6-立体几何与空间向量综合": {
      conceptEn: ["sin θ = |u·n|/(|u||n|)", "u·n = 0", "satisfy both"],
      conceptZhHans: ["sin θ = |u·n|/(|u||n|)", "u·n = 0", "同时满足"],
      workedEn: ["t = 3/4", "Q = (3/2,−3/4,3/2)", "θ = arcsin(4/9) ≈ 26.4°"],
      workedZhHans: ["t = 3/4", "Q = (3/2,−3/4,3/2)", "θ = arcsin(4/9) ≈ 26.4°"]
    },
    "hjb-high-s6-数列与计数综合": {
      conceptEn: ["C(n,k)", "reversible change of variables", "bijection"],
      conceptZhHans: ["C(n,k)", "可逆的变量变换", "双射"],
      workedEn: ["bᵢ = aᵢ − (i − 1)", "C(7,4) = 35", "(1,3,5,7)"],
      workedZhHans: ["bᵢ = aᵢ − (i − 1)", "C(7,4) = 35", "没有重复计数"]
    },
    "hjb-high-s6-计数原理": {
      conceptEn: ["P(n,k)", "leading zero", "complementary count"],
      conceptZhHans: ["P(n,k)", "首位不能为 0", "补集计数"],
      workedEn: ["P(5,3) = 5·4·3 = 60", "3·5·60 = 900", "2160 − 900 = 1260"],
      workedZhHans: ["P(5,3) = 5·4·3 = 60", "3·5·60 = 900", "2160 − 900 = 1260"]
    },
    "hjb-high-s6-解析几何直线综合复习": {
      conceptEn: ["normal vector is (A,B)", "direction vector is (B,−A)", "|Ax₀ + By₀ + C|/√(A² + B²)"],
      conceptZhHans: ["法向量为 (A,B)", "方向向量可取 (B,−A)", "|Ax₀ + By₀ + C|/√(A² + B²)"],
      workedEn: ["I = (5/3,−2/3)", "12x − 9y − 26 = 0", "26/15"],
      workedZhHans: ["I = (5/3,−2/3)", "12x − 9y − 26 = 0", "26/15"]
    },
    "hjb-high-s6-空间向量综合复习": {
      conceptEn: ["Nonparallel lines that do not intersect are skew", "w·u = 0", "w·v = 0"],
      conceptZhHans: ["不平行且不相交的两条直线是异面直线", "w·u = 0", "w·v = 0"],
      workedEn: ["t − 2s = 0", "s = −1/3 and t = −2/3", "√3/3"],
      workedZhHans: ["t − 2s = 0", "s = −1/3，t = −2/3", "√3/3"]
    },
    "hjb-high-s6-三角-向量与解析几何综合": {
      conceptEn: ["cos A = (AB·AC)/(|AB||AC|)", "|det(AB,AC)|/2", "point-to-line distance"],
      conceptZhHans: ["cos A = (AB·AC)/(|AB||AC|)", "|det(AB,AC)|/2", "点线距离公式"],
      workedEn: ["cos A = 1/√10", "x + y − 4 = 0", "(1/2)(3√2)(2√2) = 6"],
      workedZhHans: ["cos A = 1/√10", "x + y − 4 = 0", "(1/2)(3√2)(2√2) = 6"]
    },
    "hjb-high-s6-数列综合复习": {
      conceptEn: ["consecutive differences", "starting index", "strict from non-strict"],
      conceptZhHans: ["相邻两项之差", "起始下标", "严格不等式与非严格不等式"],
      workedEn: ["1/[k(k + 1)] = 1/k − 1/(k + 1)", "Sₙ = (1 − 1/2)", "S₂₀ = 20/21 ≈ 0.95238"],
      workedZhHans: ["1/[k(k + 1)] = 1/k − 1/(k + 1)", "Sₙ = (1 − 1/2)", "S₂₀ = 20/21 ≈ 0.95238"]
    },
    "hjb-high-s6-圆锥曲线综合复习": {
      conceptEn: ["y² = 4px", "implicit differentiation", "repeated root"],
      conceptZhHans: ["y² = 4px", "隐函数求导", "重根"],
      workedEn: ["F = (1,0)", "y = x + 1", "(x − 1)² = 0"],
      workedZhHans: ["F = (1,0)", "y = x + 1", "(x − 1)² = 0"]
    }
  } satisfies Record<(typeof hjbHighDepthTopicIds)[number], {
    conceptEn: string[];
    conceptZhHans: string[];
    workedEn: string[];
    workedZhHans: string[];
  }>;

  assert.equal(mainlandHjbHighLessonSeeds.length, 30, "HJB high lesson inventory changed; re-audit bespoke depth coverage");
  assert.deepEqual(
    new Set(mainlandHjbHighLessonSeeds.map((seed) => seed.topicId)),
    hjbHighDepthTopicIdSet,
    "every exported HJB high production lesson must have a bespoke depth contract"
  );
  assert.equal(Object.keys(expectations).length, hjbHighDepthTopicIds.length);

  for (const topicId of hjbHighDepthTopicIds) {
    const lessonSeed = mainlandHjbHighLessonSeeds.find((seed) => seed.topicId === topicId);
    assert.ok(lessonSeed, `${topicId} is missing its lesson seed`);
    const concept = lessonSeed.blocks.find((block) => block.type === "concept");
    const workedExample = lessonSeed.blocks.find((block) => block.type === "worked-example");
    assert.ok(concept?.content, `${topicId} is missing concept content`);
    assert.ok(workedExample?.content, `${topicId} is missing worked-example content`);

    const expected = expectations[topicId];
    for (const needle of expected.conceptEn) assert.ok(concept.content.en.includes(needle), `${topicId} en concept omits ${needle}`);
    for (const needle of expected.conceptZhHans) assert.ok((concept.content.zhHans ?? "").includes(needle), `${topicId} zhHans concept omits ${needle}`);
    for (const needle of expected.workedEn) assert.ok(workedExample.content.en.includes(needle), `${topicId} en example omits ${needle}`);
    for (const needle of expected.workedZhHans) assert.ok((workedExample.content.zhHans ?? "").includes(needle), `${topicId} zhHans example omits ${needle}`);

    assert.ok(concept.content.en.length >= 240, `${topicId} en concept is still shallow`);
    assert.ok((concept.content.zhHans ?? "").length >= 100, `${topicId} zhHans concept is still shallow`);
    assert.ok(workedExample.content.en.length >= 380, `${topicId} en example lacks complete reasoning`);
    assert.ok((workedExample.content.zhHans ?? "").length >= 180, `${topicId} zhHans example lacks complete reasoning`);
    assert.match(workedExample.content.en, /Answer:[\s\S]*Check:/, `${topicId} en example needs an answer followed by a check`);
    assert.match(workedExample.content.zhHans ?? "", /答案：[\s\S]*检验：/, `${topicId} zhHans example needs an answer followed by a check`);
    assert.ok(concept.content.zh.trim().length > 0 && workedExample.content.zh.trim().length > 0, `${topicId} is missing Traditional Chinese localization`);
    assert.doesNotMatch(
      `${concept.content.en} ${concept.content.zh} ${concept.content.zhHans ?? ""} ${workedExample.content.en} ${workedExample.content.zh} ${workedExample.content.zhHans ?? ""}`,
      /term-[0-9a-f]+|study .* by connecting its definitions or rules|本[課课]圍繞《[^》]+》學習：先確認定義或規則|本课围绕《[^》]+》学习：先确认定义或规则|二轮变式/iu,
      `${topicId} still exposes generated or generic lesson prose`
    );
  }
});

test("BNU and HJB worked examples do not append a full stop after terminal question punctuation", () => {
  const lessonSeeds = [
    ...mainlandBnuPrimaryLessonSeeds,
    ...mainlandBnuHighLessonSeeds,
    ...mainlandHjbPrimaryLessonSeeds,
    ...mainlandHjbHighLessonSeeds
  ];

  for (const seed of lessonSeeds) {
    const workedExamples = seed.blocks.filter((block) => block.type === "worked-example" && block.content);
    for (const block of workedExamples) {
      for (const language of ["en", "zh", "zhHans"] as const) {
        const content = block.content?.[language] ?? block.content?.zh ?? "";
        assert.doesNotMatch(
          content,
          /[?？!！][。.]/u,
          `${seed.topicId} ${language} worked example has duplicated terminal punctuation`
        );
      }
    }
  }
});

test("login native select options keep explicit contrast in dark mode dropdowns", async () => {
  const page = await source("app/login/page.tsx");

  assert.match(page, /loginSelectOptionClassName/);
  assert.match(page, /<option key=\{publisher\} value=\{publisher\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /<option key=\{grade\.id\} value=\{grade\.id\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /bg-white text-slate-950/);
  assert.match(page, /dark:bg-slate-950 dark:text-white/);
});

test("legacy Visualization Lab route still activates the Visualization Lab nav item", async () => {
  const navbar = await source("components/layout/Navbar.tsx");

  assert.match(navbar, /activePaths: \[studentVisualizationToolsPath, "\/visualization-lab"\]/);
});

test("teacher class creation form keeps compact labels on one line", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /lg:grid-cols-\[minmax\(180px,1\.2fr\)_120px_180px_minmax\(220px,1fr\)_auto\]/);
  assert.match(view, /whitespace-nowrap/);
});

test("teacher mastery-target controls stack before cramped desktop widths", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /2xl:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(0,0\.8fr\)\]/);
  assert.match(view, /className="focus-ring min-h-11 w-full min-w-0 rounded-2xl/);
  assert.doesNotMatch(view, /lg:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(180px,0\.8fr\)\]/);
});

test("adaptive knowledge galaxy avoids horizontal overflow on personalized learning", async () => {
  const galaxy = await source("components/dashboard/AdaptiveKnowledgeGalaxy.tsx");

  assert.match(galaxy, /className="mt-7 min-w-0 overflow-hidden pb-2"/);
  assert.match(galaxy, /className="relative h-\[28rem\] min-w-0 sm:h-\[31rem\]"/);
  assert.doesNotMatch(galaxy, /mt-7 overflow-x-auto pb-2/);
  assert.doesNotMatch(galaxy, /sm:min-w-\[58rem\]/);
});

test("about Mission Setup renders a five-question preview from real question data", async () => {
  // The preview now flows through buildPracticeMissionPreviewSample (a small
  // grade-stratified sample instead of the full question bank in the RSC
  // payload); the sample builder is where the answer field must stay omitted.
  const aboutPage = await source("app/about/page.tsx");
  const setup = await source("components/practice/PracticeMissionSetupControls.tsx");
  const sample = await source("lib/practiceMissionPreviewSample.ts");

  assert.match(aboutPage, /buildPracticeMissionPreviewSample\(questions\)/);
  assert.match(aboutPage, /questionPreviewItems=\{practiceMissionPreviewItems\}/);
  assert.match(setup, /data-practice-mission-preview-card/);
  assert.match(setup, /\.slice\(0, 5\)/);
  assert.doesNotMatch(sample, /answer: question\.answer/);
  assert.doesNotMatch(aboutPage, /answer: question\.answer/);
});

test("public practice mission showcase does not present a logged-out checkpoint as in progress", async () => {
  const showcase = await source("components/practice/PersonalizedPracticeMissionShowcase.tsx");

  assert.match(showcase, /Personalized Practice Mission/);
  assert.match(showcase, /Start/);
  assert.match(showcase, /Ready/);
  assert.doesNotMatch(showcase, /In progress/);
  assert.doesNotMatch(showcase, /Round progress|Personalized set progress|aria-valuenow/);
});

test("student assignments route exposes the final heading while assignments load", async () => {
  // The heading-while-loading state now lives ONLY in StudentAssignmentsView's
  // isLoading branch (initial state, so SSR emits it directly). The former
  // route-level loading.tsx duplicated the same copy and was removed because a
  // segment-level loading file carries the hidden-segment streaming race (see
  // the loading-file test below).
  const assignmentsView = await source("components/dashboard/StudentAssignmentsView.tsx");

  const loadingStart = assignmentsView.indexOf("if (isLoading)");
  const nextBranch = assignmentsView.indexOf("if (!currentUser", loadingStart);
  assert.ok(loadingStart >= 0 && nextBranch > loadingStart);
  const loadingBranch = assignmentsView.slice(loadingStart, nextBranch);

  assert.match(loadingBranch, /My assignments/);
  assert.match(loadingBranch, /Loading assignments/);
});

test("routes without slow server data carry no segment-level loading file", () => {
  // Any segment-level loading.tsx makes Next 15.5 stream the page into a
  // hidden segment (<div hidden id="S:N"> parked at body level) and the
  // vendored React defers the visible swap: $RC only marks the boundary "$~"
  // and queues $RV behind rAF/setTimeout (~300ms nominal, seconds under CPU
  // load). Hydration plus provider updates client-render the boundary first,
  // so the document transiently holds TWO full copies of the page — Playwright
  // strict-mode "resolved to 2 elements" flakes and duplicate-id bugs.
  // None of these routes awaits server data (they SSR client shells that fetch
  // after hydration, or are pure redirects), so a route-level skeleton buys
  // nothing and only carries the race. Verified 2026-07-26 against a prod
  // build: with these files present every route below served '<template
  // id="B:' + '<div hidden id="S:' markers; without them, none did. Only
  // reintroduce a loading.tsx where the route genuinely awaits slow server
  // data, and document why next to it. app/student/lessons was the originally
  // root-caused route (PR #69); its served-HTML marker guard lives at the end
  // of the free-selection test in practice-pager.spec.ts.
  const racyLoadingFiles = [
    "app/adaptive-learning/loading.tsx",
    "app/lesson/loading.tsx",
    "app/personalized-learning/loading.tsx",
    "app/practice/loading.tsx",
    "app/student/assignments/loading.tsx",
    "app/student/lessons/loading.tsx",
    "app/student/tools/visualizations/loading.tsx",
    "app/visualization-lab/loading.tsx"
  ];

  for (const file of racyLoadingFiles) {
    assert.ok(
      !existsSync(join(process.cwd(), file)),
      `${file} reintroduces the hidden-segment streaming race on a route with no slow server data.`
    );
  }
});

test("personalized learning eagerly prepares the assignments route before the All assignments CTA is used", async () => {
  const adaptive = await source("components/dashboard/AdaptiveLearningContent.tsx");

  assert.match(adaptive, /router\.prefetch\(studentAssignmentsPath\)/);
  assert.match(adaptive, /fetch\(studentAssignmentsPath,\s*\{[\s\S]*method: "GET"[\s\S]*\}/);
  assert.match(adaptive, /<Link[\s\S]*href=\{studentAssignmentsPath\}[\s\S]*prefetch=\{true\}/);
});

test("teacher add-student mutation returns refreshed detail for immediate count updates", async () => {
  const route = await source("app/api/teacher/classes/[classId]/students/route.ts");
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(route, /getTeacherClassDetailData/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, detail \}, \{ status: 201 \}\)/);
  assert.match(view, /const \[currentDetail, setCurrentDetail\] = useState\(detail\)/);
  assert.match(view, /if \(payload\?\.detail\) setCurrentDetail\(payload\.detail\)/);
  assert.match(view, /currentDetail\.class\.studentCount/);
});

test("completed lesson progress stores full completion mastery", async () => {
  const persistence = await source("lib/server/userStore/studentActivityPersistence.ts");
  const persistenceTest = await source("lib/server/userStoreStudentActivityPersistence.test.ts");

  assert.match(persistence, /status === "completed"[\s\S]{0,120}Math\.max\(existing\?\.mastery \?\? 0, 100\)/);
  assert.match(persistenceTest, /status: "completed",\n\s+mastery: 100/);
  assert.doesNotMatch(persistence, /Math\.max\(existing\?\.mastery \?\? 0, 85\)/);
});

test("lesson place-value illustration derives tens and ones from the focus number", async () => {
  const illustration = await source("components/lesson/WorkedExampleIllustration.tsx");

  assert.match(illustration, /const numberMatch = focusText\.match\(\/\\d\+\/\)/);
  assert.match(illustration, /const focusNumber = numberMatch \? Math\.min\(99, Math\.max\(0, Number\(numberMatch\[0\]\)\)\) : 38/);
  assert.match(illustration, /const tens = Math\.floor\(focusNumber \/ 10\)/);
  assert.match(illustration, /const ones = focusNumber % 10/);
  assert.match(illustration, /Array\.from\(\{ length: tens \}/);
  assert.match(illustration, /Array\.from\(\{ length: ones \}/);
});

test("practice answer submissions persist attached work photos, not just accept them", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");
  const route = await source("app/api/attempts/route.ts");
  const store = await source("lib/server/practiceAttemptStore.ts");

  // The original version of this gate asserted only that the client SENT
  // `answerWorkPhotos` and that the route READ them. Both were true while the
  // route dropped the parsed value on the floor and nothing in lib/ ever stored
  // it — the gate was green for months against a feature that did nothing.
  // Assert the effect instead: the value has to reach the store and the column.
  assert.match(card, /answerWorkPhotos:/);
  assert.match(route, /submitQuestionAttemptFast\(\{[\s\S]{0,400}answerWorkPhotos/);
  assert.match(store, /answer_work_photos/);
  assert.match(store, /persistQuestionAttempt\(\{[\s\S]{0,400}answerWorkPhotos/);

  // Photo bytes belong in the governed media-object store (scanned, encrypted,
  // retention-bounded); practice_attempts holds references only.
  assert.match(route, /practice-work-photo\//);
  assert.doesNotMatch(store, /dataUrl/);
});

test("practice photo attachment control is localized in Chinese modes", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");

  assert.match(card, /photoAttachmentCopy/);
  assert.match(card, /zh: "加入相片"/);
  assert.match(card, /zhHans: "添加照片"/);
  assert.match(card, /<span>\{t\(photoAttachmentCopy\.addPhotos\)\}<\/span>/);
  assert.match(card, /aria-label=\{t\(photoAttachmentCopy\.addPhotos\)\}/);
  assert.doesNotMatch(card, /<span>Add photos<\/span>/);
  assert.doesNotMatch(card, /aria-label="Add photos"/);
});

test("number-line count mode disables Number B instead of exposing an inert slider", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /const comparisonDisabled = templateId === "number-line" && mode === 0/);
  assert.match(lab, /disabled=\{comparisonDisabled\}/);
});

test("equation-balance tokens declare a pan-contained fit contract", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /data-viz-fit-contract="pan-contained"/);
  assert.match(lab, /width="12"/);
  assert.match(lab, /r="6"/);
});

test("student dashboard Lesson shortcut waits for a resolved lesson target", async () => {
  const dashboard = await source("app/dashboard/page.tsx");

  assert.doesNotMatch(dashboard, /studentLessonHref \?\? studentLessonsPath/);
  assert.match(dashboard, /const lessonShortcutReady = currentUser\?\.role !== "student" \|\| Boolean\(studentLessonHref\)/);
  assert.match(dashboard, /disabled=\{!lessonShortcutReady\}/);
});

test("student roadmap uses the personalized current-grade path only for signed-in learners", async () => {
  const roadmap = await source("components/learning/LearningRoadmap.tsx");
  const studentModeIndex = roadmap.indexOf('const isStudentMode = mode === "student" && Boolean(currentUser)');
  const visibleGradesIndex = roadmap.indexOf("const visibleGrades = useMemo");
  const personalizedBranchIndex = roadmap.indexOf("if (isStudentMode)");

  assert.notEqual(studentModeIndex, -1, "Student mode should be gated by a real currentUser.");
  assert.ok(
    studentModeIndex < visibleGradesIndex && visibleGradesIndex < personalizedBranchIndex,
    "The signed-in gate should be applied before grade visibility and personalized path rendering."
  );
  assert.doesNotMatch(roadmap, /const isStudentMode = mode === "student";/);
});

test("student roadmap route shell renders roadmap pages through normal SSR and client boundaries", async () => {
  const shell = await source("components/learning/RoadmapRouteShell.tsx");
  const primaryRoute = await source("app/student/roadmap/primary/page.tsx");

  assert.doesNotMatch(shell, /^"use client";/);
  assert.doesNotMatch(shell, /next\/dynamic/);
  assert.doesNotMatch(shell, /ssr:\s*false/);
  assert.match(shell, /import \{ PrimaryRoadmapPage \} from "@\/components\/learning\/PrimaryRoadmapPage"/);
  assert.match(primaryRoute, /<RoadmapRouteShell kind="primary" \/>/);
});

test("AI Tutor voice uses the Node WebSocket client with explicit provider headers", async () => {
  const voiceRoute = await source("app/api/ai-tutor/voice/route.ts");

  assert.match(voiceRoute, /import WebSocket from "ws"/);
  assert.match(voiceRoute, /import type \{ RawData \} from "ws"/);
  assert.doesNotMatch(voiceRoute, /WebSocket as unknown/);
  assert.match(voiceRoute, /headers: \{[\s\S]*Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(voiceRoute, /socket\.on\("message"/);
  assert.match(voiceRoute, /socket\.once\("error"/);
  assert.match(voiceRoute, /socket\.terminate\(\)/);
  assert.match(voiceRoute, /resolveStudentAiTutorPolicy/);
  assert.match(voiceRoute, /consumeAiCapabilityRateLimit/);
});
