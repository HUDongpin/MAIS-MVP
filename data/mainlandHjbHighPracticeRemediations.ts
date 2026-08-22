import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { LocalizedText, QuestionType } from "@/types";

export type MainlandHjbHighPracticeRemediation = {
  topicId: string;
  type: Exclude<QuestionType, "graph">;
  family: string;
  prompt: LocalizedText;
  explanation: LocalizedText;
  answer: string;
  acceptedAnswers: string[];
  options?: LocalizedText[];
};

function localized(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

function remediation(
  topicId: string,
  type: Exclude<QuestionType, "graph">,
  family: string,
  promptEn: string,
  promptZhHans: string,
  answer: string,
  explanationEn: string,
  explanationZhHans: string,
  optionValues?: string[]
): MainlandHjbHighPracticeRemediation {
  return {
    topicId,
    type,
    family,
    prompt: localized(promptEn, promptZhHans),
    explanation: localized(explanationEn, explanationZhHans),
    answer,
    acceptedAnswers: [answer],
    options: optionValues?.map((value) => localized(value, value))
  };
}

// These are narrowly scoped repairs for rows that are already selected by the
// production HJB high-school lesson seeds. IDs, topic/grade ownership, source
// provenance, difficulty, type, and all approval metadata remain unchanged.
// Each affected lesson receives two new mathematical task families while its
// other three displayed rows retain the approved bank's original family.
export const mainlandHjbHighPracticeRemediations: Record<string, MainlandHjbHighPracticeRemediation> = {
  "hjb-high-ds-v2-s4-009": {
    ...remediation(
      "hjb-high-s4-集合与逻辑", "short-answer", "set-equality-power",
      "The distinct real numbers a, b, and 1 satisfy A = {1, a, b}, B = {a, a², ab}, and A = B. Find a^{2023} + b^{2024}.",
      "实数a、b、1两两不同。已知集合A={1,a,b}，B={a,a²,ab}，且A=B。求a^{2023}+b^{2024}。",
      "-1",
      "Set equality implies {1,b}={a²,ab}. If ab=1, then a²=b, so a³=1; because a is real, a=1, contradicting the distinctness condition. Therefore a²=1, and since a≠1, a=-1. Then B={-1,1,-b} and A={1,-1,b}; equality gives b=0. Hence (-1)^{2023}+0^{2024}=-1.",
      "集合相等意味着{1,b}={a²,ab}。若ab=1，则a²=b，进而a³=1；由于a是实数，得a=1，与两两不同矛盾。因此a²=1，且a≠1，所以a=-1。此时B={-1,1,-b}，A={1,-1,b}；集合相等给出b=0。因此(-1)^{2023}+0^{2024}=-1。"
    ),
    acceptedAnswers: ["-1"]
  },
  "hjb-high-ds-v2-s4-021": {
    ...remediation(
      "hjb-high-s4-集合与逻辑", "short-answer", "set-reindexing",
      "Let A={x | x=3k+1, k∈Z} and B={x | x=3k-2, k∈Z}. Determine the relation between A and B.",
      "设A={x|x=3k+1，k∈Z}，B={x|x=3k-2，k∈Z}。判断A与B的关系。",
      "A = B",
      "Since 3k-2=3(k-1)+1 and k-1 still ranges over every integer, B describes exactly the same elements as A. Thus A=B.",
      "因为3k-2=3(k-1)+1，且k-1仍遍历所有整数，所以B与A表示同一集合，即A=B。"
    ),
    acceptedAnswers: ["A = B", "A=B"]
  },
  "hjb-high-ds-v2-s4-036": {
    ...remediation(
      "hjb-high-s4-集合与逻辑", "short-answer", "necessary-condition",
      "Let p be |x-2|<1 and q be x²-5x+6<0. Classify p as a condition for q.",
      "设p：|x-2|<1，q：x²-5x+6<0。判断p是q的什么条件。",
      "必要不充分条件",
      "The solution sets are p:(1,3) and q:(2,3). Thus q implies p, while p does not imply q; for example, x=1.5 satisfies p but not q. Hence p is necessary but not sufficient for q.",
      "p的解集是(1,3)，q的解集是(2,3)。因此q能推出p，而p不能推出q，例如x=1.5满足p但不满足q。所以p是q的必要不充分条件。"
    ),
    acceptedAnswers: ["必要不充分条件", "必要不充分", "necessary but not sufficient"]
  },
  "hjb-high-ds-v2-s4-071": remediation(
    "hjb-high-s4-等式与不等式", "fill-in", "cubic-comparison",
    "For real numbers a>b>0, compare a³-b³ with (a-b)³.",
    "已知实数a>b>0，比较a³-b³与(a-b)³的大小。",
    "a^3 - b^3 > (a - b)^3",
    "Their difference after factoring by a-b is governed by a²+ab+b²-(a-b)²=3ab>0. Since a-b>0, a³-b³>(a-b)³.",
    "两式都含正因子a-b，而a²+ab+b²-(a-b)²=3ab>0，所以a³-b³>(a-b)³。"
  ),
  "hjb-high-ds-v2-s4-132": {
    ...remediation(
      "hjb-high-s4-幂-指数与对数", "short-answer", "logarithm-expression",
      "Given log_a 2=m and log_a 3=n, express log_a(4/9) in terms of m and n.",
      "已知log_a 2=m，log_a 3=n，用m、n表示log_a(4/9)。",
      "2m - 2n",
      "log_a(4/9)=log_a 4-log_a 9=2log_a 2-2log_a 3=2m-2n.",
      "log_a(4/9)=log_a4-log_a9=2log_a2-2log_a3=2m-2n。"
    ),
    acceptedAnswers: ["2m - 2n", "2m-2n"]
  },
  "hjb-high-ds-v2-s4-165": {
    ...remediation(
      "hjb-high-s4-幂函数-指数函数与对数函数", "short-answer", "logarithm-comparison",
      "Compare log₂3 and log₃4.",
      "比较log₂3与log₃4的大小。",
      "log₂3 > log₃4",
      "Because 3>2^{3/2}=√8, log₂3>3/2. Because 4<3^{3/2}=3√3, log₃4<3/2. Therefore log₂3>log₃4.",
      "因为3>2^{3/2}=√8，所以log₂3>3/2；因为4<3^{3/2}=3√3，所以log₃4<3/2。因此log₂3>log₃4。"
    ),
    acceptedAnswers: ["log₂3 > log₃4", "log_2 3 > log_3 4"]
  },
  "hjb-high-ds-v2-s4-174": {
    ...remediation(
      "hjb-high-s4-幂函数-指数函数与对数函数", "short-answer", "function-parity-pair",
      "For f(x)=2^x+2^{-x} and g(x)=2^x-2^{-x}, state the parity of each function.",
      "已知f(x)=2^x+2^{-x}，g(x)=2^x-2^{-x}。分别判断f(x)和g(x)的奇偶性。",
      "f(x) 是偶函数，g(x) 是奇函数",
      "f(-x)=2^{-x}+2^x=f(x), so f is even. Also g(-x)=2^{-x}-2^x=-g(x), so g is odd.",
      "f(-x)=2^{-x}+2^x=f(x)，所以f是偶函数；g(-x)=2^{-x}-2^x=-g(x)，所以g是奇函数。"
    ),
    acceptedAnswers: ["f(x) 是偶函数，g(x) 是奇函数", "f为偶函数，g为奇函数", "f is even and g is odd"]
  },
  "hjb-high-ds-v2-s4-177": {
    ...remediation(
      "hjb-high-s4-幂函数-指数函数与对数函数", "short-answer", "reciprocal-log-comparison",
      "Compare log₂3 and log₃2.",
      "比较log₂3与log₃2的大小。",
      "log_2 3 > log_3 2",
      "log₂3>log₂2=1, while log₃2<log₃3=1. Hence log₂3>log₃2.",
      "log₂3>log₂2=1，而log₃2<log₃3=1，所以log₂3>log₃2。"
    ),
    acceptedAnswers: ["log_2 3 > log_3 2", "log₂3 > log₃2"]
  },
  "hjb-high-ds-v2-s4-222": {
    ...remediation(
      "hjb-high-s4-函数的概念-性质及应用", "short-answer", "cubic-function-parity",
      "Determine the parity of f(x)=x³-3x.",
      "判断函数f(x)=x³-3x的奇偶性。",
      "奇函数",
      "The domain is R, and f(-x)=-x³+3x=-(x³-3x)=-f(x). Therefore f is odd.",
      "定义域为R，且f(-x)=-x³+3x=-(x³-3x)=-f(x)，所以f是奇函数。"
    ),
    acceptedAnswers: ["奇函数", "是奇函数", "odd function"]
  },
  "hjb-high-ds-v2-s4-240": {
    ...remediation(
      "hjb-high-s4-函数的概念-性质及应用", "short-answer", "rational-function-parity",
      "Determine the parity of f(x)=x/(x²+1).",
      "判断函数f(x)=x/(x²+1)的奇偶性。",
      "奇函数",
      "The domain is R, and f(-x)=(-x)/((−x)²+1)=-x/(x²+1)=-f(x). Therefore f is odd.",
      "定义域为R，且f(-x)=(-x)/((-x)²+1)=-x/(x²+1)=-f(x)，所以f是奇函数。"
    ),
    acceptedAnswers: ["奇函数", "是奇函数", "odd function"]
  },
  "hjb-high-ds-v2-s4-251": remediation(
    "hjb-high-s4-三角", "fill-in", "cosine-law-side",
    "In triangle ABC, AB = 5, AC = 8, and angle A = 60°. Find BC.",
    "在三角形 ABC 中，AB = 5，AC = 8，且角 A = 60°。求 BC。",
    "7",
    "By the cosine rule, BC² = 5² + 8² - 2·5·8·cos 60° = 49, so BC = 7.",
    "由余弦定理，BC² = 5² + 8² - 2·5·8·cos 60° = 49，所以 BC = 7。"
  ),
  "hjb-high-ds-v2-s4-254": remediation(
    "hjb-high-s4-三角", "fill-in", "unit-circle-ratio",
    "The terminal side of angle α passes through P(-3, 4). Find sin α + cos α.",
    "角 α 的终边经过点 P(-3, 4)。求 sin α + cos α。",
    "1/5",
    "The radius is 5, so sin α = 4/5 and cos α = -3/5. Their sum is 1/5.",
    "半径为 5，所以 sin α = 4/5，cos α = -3/5，两者之和为 1/5。"
  ),

  "hjb-high-ds-v2-s4-314": remediation(
    "hjb-high-s4-三角函数", "fill-in", "trig-range",
    "Find the range of y = 4sin x + 1.",
    "求函数 y = 4sin x + 1 的值域。",
    "[-3,5]",
    "Because -1 ≤ sin x ≤ 1, multiplying by 4 and adding 1 gives -3 ≤ y ≤ 5.",
    "因为 -1 ≤ sin x ≤ 1，两边乘 4 再加 1，得到 -3 ≤ y ≤ 5。"
  ),
  "hjb-high-ds-v2-s4-317": remediation(
    "hjb-high-s4-三角函数", "fill-in", "trig-equation-interval",
    "Solve sin x = 1/2 on 0 ≤ x < 2π.",
    "在 0 ≤ x < 2π 上解方程 sin x = 1/2。",
    "π/6,5π/6",
    "Sine is 1/2 at the first- and second-quadrant reference angles, so x = π/6 or 5π/6.",
    "正弦值为 1/2 时，终边分别在第一、第二象限，所以 x = π/6 或 5π/6。"
  ),

  "hjb-high-ds-v2-s4-439": remediation(
    "hjb-high-s4-复数", "fill-in", "complex-modulus",
    "Find the modulus of z = 3 + 4i.",
    "求复数 z = 3 + 4i 的模。",
    "5",
    "|z| = √(3² + 4²) = 5.",
    "|z| = √(3² + 4²) = 5。"
  ),
  "hjb-high-ds-v2-s4-441": remediation(
    "hjb-high-s4-复数", "fill-in", "complex-conjugate",
    "Write the conjugate of z = 3 - 4i.",
    "写出复数 z = 3 - 4i 的共轭复数。",
    "3+4i",
    "A conjugate keeps the real part and reverses the sign of the imaginary part, so the result is 3 + 4i.",
    "共轭复数的实部不变，虚部变号，所以结果为 3 + 4i。"
  ),

  "hjb-high-ds-v2-s4-377": remediation(
    "hjb-high-s4-平面向量", "fill-in", "vector-magnitude",
    "Find the magnitude of vector a = (3, 4).",
    "求向量 a = (3, 4) 的模。",
    "5",
    "|a| = √(3² + 4²) = 5.",
    "|a| = √(3² + 4²) = 5。"
  ),
  "hjb-high-ds-v2-s4-381": remediation(
    "hjb-high-s4-平面向量", "fill-in", "vector-perpendicular-parameter",
    "Vectors a = (λ, 2) and b = (3, -6) are perpendicular. Find λ.",
    "向量 a = (λ, 2) 与 b = (3, -6) 垂直。求 λ。",
    "4",
    "Perpendicular vectors have dot product 0: 3λ + 2(-6) = 0, so λ = 4.",
    "垂直向量的数量积为 0：3λ + 2(-6) = 0，所以 λ = 4。"
  ),

  "hjb-high-ds-v2-s5-293": remediation(
    "hjb-high-s5-圆锥曲线", "fill-in", "ellipse-foci",
    "Find the two foci of the ellipse x²/25 + y²/9 = 1.",
    "求椭圆 x²/25 + y²/9 = 1 的两个焦点。",
    "(-4,0),(4,0)",
    "Here a² = 25 and b² = 9, so c² = 16 and c = 4. The foci are (-4, 0) and (4, 0).",
    "由 a² = 25、b² = 9，得 c² = 16，所以 c = 4，两个焦点为 (-4, 0) 和 (4, 0)。"
  ),
  "hjb-high-ds-v2-s5-296": remediation(
    "hjb-high-s5-圆锥曲线", "fill-in", "parabola-focus",
    "Find the focus of the parabola y² = 8x.",
    "求抛物线 y² = 8x 的焦点。",
    "(2,0)",
    "Comparing y² = 8x with y² = 4px gives p = 2, so the focus is (2, 0).",
    "把 y² = 8x 与 y² = 4px 比较，得 p = 2，所以焦点为 (2, 0)。"
  ),

  "hjb-high-ds-v2-s5-221": remediation(
    "hjb-high-s5-平面直角坐标系中的直线", "fill-in", "point-line-distance",
    "Find the distance from the origin to the line 3x - 4y + 5 = 0.",
    "求原点到直线 3x - 4y + 5 = 0 的距离。",
    "1",
    "The distance is |5|/√(3² + (-4)²) = 5/5 = 1.",
    "距离为 |5|/√(3² + (-4)²) = 5/5 = 1。"
  ),
  "hjb-high-ds-v2-s5-224": remediation(
    "hjb-high-s5-平面直角坐标系中的直线", "fill-in", "perpendicular-line-equation",
    "Find an equation of the line through (2, -1) perpendicular to 3x + 4y = 0.",
    "求过点 (2, -1) 且与直线 3x + 4y = 0 垂直的直线方程。",
    "4x-3y-11=0",
    "A perpendicular line may use normal vector (4, -3). Thus 4(x - 2) - 3(y + 1) = 0, or 4x - 3y - 11 = 0.",
    "所求直线可取法向量 (4, -3)，所以 4(x - 2) - 3(y + 1) = 0，即 4x - 3y - 11 = 0。"
  ),

  "hjb-high-ds-v2-s5-431": remediation(
    "hjb-high-s5-数列", "fill-in", "geometric-sequence-term",
    "A geometric sequence has first term 3 and common ratio 2. Find term 5.",
    "一个等比数列的首项为 3，公比为 2。求第 5 项。",
    "48",
    "a₅ = 3·2⁴ = 48.",
    "a₅ = 3·2⁴ = 48。"
  ),
  "hjb-high-ds-v2-s5-433": remediation(
    "hjb-high-s5-数列", "fill-in", "sequence-recurrence",
    "Given a₁ = 2 and aₙ₊₁ = 2aₙ + 1, find a₄.",
    "已知 a₁ = 2，aₙ₊₁ = 2aₙ + 1。求 a₄。",
    "23",
    "The recurrence gives a₂ = 5, a₃ = 11, and a₄ = 23.",
    "由递推关系依次得到 a₂ = 5，a₃ = 11，a₄ = 23。"
  ),

  "hjb-high-ds-v2-s5-111": remediation(
    "hjb-high-s5-概率初步", "short-answer", "complement-probability",
    "If P(A) = 0.37, find P(Aᶜ).",
    "若 P(A) = 0.37，求 P(Aᶜ)。",
    "0.63",
    "An event and its complement have total probability 1, so P(Aᶜ) = 1 - 0.37 = 0.63.",
    "事件与其对立事件的概率之和为 1，所以 P(Aᶜ) = 1 - 0.37 = 0.63。"
  ),
  "hjb-high-ds-v2-s5-113": remediation(
    "hjb-high-s5-概率初步", "fill-in", "union-probability",
    "Given P(A) = 0.5, P(B) = 0.4, and P(A ∩ B) = 0.2, find P(A ∪ B).",
    "已知 P(A) = 0.5，P(B) = 0.4，P(A ∩ B) = 0.2。求 P(A ∪ B)。",
    "0.7",
    "By inclusion-exclusion, P(A ∪ B) = 0.5 + 0.4 - 0.2 = 0.7.",
    "由容斥公式，P(A ∪ B) = 0.5 + 0.4 - 0.2 = 0.7。"
  ),

  "hjb-high-ds-v2-s5-362": remediation(
    "hjb-high-s5-空间向量及其应用", "fill-in", "space-vector-dot-product",
    "Find a·b for a = (1, 2, -1) and b = (2, 0, 3).",
    "已知 a = (1, 2, -1)，b = (2, 0, 3)。求 a·b。",
    "-1",
    "a·b = 1·2 + 2·0 + (-1)·3 = -1.",
    "a·b = 1·2 + 2·0 + (-1)·3 = -1。"
  ),
  "hjb-high-ds-v2-s5-365": remediation(
    "hjb-high-s5-空间向量及其应用", "fill-in", "point-plane-distance-3d",
    "Find the distance from P(1, 2, 3) to the plane x + 2y + 2z = 3.",
    "求点 P(1, 2, 3) 到平面 x + 2y + 2z = 3 的距离。",
    "8/3",
    "The distance is |1 + 4 + 6 - 3|/√(1² + 2² + 2²) = 8/3.",
    "距离为 |1 + 4 + 6 - 3|/√(1² + 2² + 2²) = 8/3。"
  ),

  "hjb-high-ds-v2-s5-003": remediation(
    "hjb-high-s5-空间直线与平面", "short-answer", "line-plane-angle",
    "A line has direction vector d = (1, 1, 0), and a plane has normal vector n = (1, 0, 0). Find the sine of the angle between the line and the plane.",
    "一条直线的方向向量为 d = (1, 1, 0)，一个平面的法向量为 n = (1, 0, 0)。求直线与平面所成角的正弦值。",
    "√2/2",
    "For line-plane angle θ, sin θ = |d·n|/(|d||n|) = 1/√2 = √2/2.",
    "设线面角为 θ，则 sin θ = |d·n|/(|d||n|) = 1/√2 = √2/2。"
  ),
  "hjb-high-ds-v2-s5-005": remediation(
    "hjb-high-s5-空间直线与平面", "fill-in", "point-plane-distance",
    "Find the distance from P(1, 2, 3) to the plane x + 2y + 2z = 1.",
    "求点 P(1, 2, 3) 到平面 x + 2y + 2z = 1 的距离。",
    "10/3",
    "The distance is |1 + 4 + 6 - 1|/√(1² + 2² + 2²) = 10/3.",
    "距离为 |1 + 4 + 6 - 1|/√(1² + 2² + 2²) = 10/3。"
  ),

  "hjb-high-ds-v2-s5-059": remediation(
    "hjb-high-s5-简单几何体", "fill-in", "cylinder-volume",
    "A right circular cylinder has radius 3 and height 4. Find its volume.",
    "一个圆柱的底面半径为 3，高为 4。求它的体积。",
    "36π",
    "V = πr²h = π·3²·4 = 36π.",
    "V = πr²h = π·3²·4 = 36π。"
  ),
  "hjb-high-ds-v2-s5-063": remediation(
    "hjb-high-s5-简单几何体", "short-answer", "square-pyramid-surface-area",
    "A right square pyramid has base side 6, vertical height 4, and apex above the base center. Find its total surface area.",
    "一个正四棱锥的底面边长为 6，垂直高为 4，顶点在底面中心正上方。求总表面积。",
    "96",
    "The face slant height is √(4² + 3²) = 5. Four triangular faces have area 4·(1/2)·6·5 = 60; adding the base area 36 gives 96.",
    "侧面斜高为 √(4² + 3²) = 5。四个侧面的面积和为 4·(1/2)·6·5 = 60，再加底面积 36，得到 96。"
  ),

  "hjb-high-ds-v2-s5-167": remediation(
    "hjb-high-s5-统计", "fill-in", "median",
    "Find the median of 1, 4, 7, 9, 20.",
    "求数据 1，4，7，9，20 的中位数。",
    "7",
    "The data are already ordered, and the middle of 5 values is value 3, which is 7.",
    "数据已经按从小到大排列，5 个数的中间位置是第 3 个数，所以中位数为 7。"
  ),
  "hjb-high-ds-v2-s5-171": remediation(
    "hjb-high-s5-统计", "short-answer", "population-variance",
    "Treat 1, 3, 5 as a complete data set. Find its descriptive variance using divisor n.",
    "把 1，3，5 视为完整数据集，使用分母 n 计算描述性方差。",
    "8/3",
    "The mean is 3, so the variance is [(1-3)² + (3-3)² + (5-3)²]/3 = 8/3.",
    "平均数为 3，所以方差为 [(1-3)² + (3-3)² + (5-3)²]/3 = 8/3。"
  ),

  "hjb-high-ds-v2-s6-425": remediation(
    "hjb-high-s6-三角-向量与解析几何综合", "fill-in", "vector-angle-cosine",
    "For vectors a = (1, 0) and b = (1, √3), find the cosine of their included angle.",
    "已知向量 a = (1, 0)，b = (1, √3)。求它们夹角的余弦值。",
    "1/2",
    "a·b = 1, |a| = 1, and |b| = 2, so cos θ = 1/(1·2) = 1/2.",
    "a·b = 1，|a| = 1，|b| = 2，所以 cos θ = 1/(1·2) = 1/2。"
  ),
  "hjb-high-ds-v2-s6-423": remediation(
    "hjb-high-s6-三角-向量与解析几何综合", "fill-in", "analytic-point-line-distance",
    "Find the distance from P(2, 1) to the line x - y = 0.",
    "求点 P(2, 1) 到直线 x - y = 0 的距离。",
    "√2/2",
    "The distance is |2 - 1|/√(1² + (-1)²) = 1/√2 = √2/2.",
    "距离为 |2 - 1|/√(1² + (-1)²) = 1/√2 = √2/2。"
  ),

  "hjb-high-ds-v2-s6-401": remediation(
    "hjb-high-s6-函数-导数与不等式综合", "fill-in", "derivative-sign-inequality",
    "For f(x) = x³ - 3x, find all x such that f'(x) ≥ 0.",
    "已知 f(x) = x³ - 3x。求满足 f'(x) ≥ 0 的 x 的取值范围。",
    "(-∞,-1]∪[1,∞)",
    "f'(x) = 3x² - 3. Thus f'(x) ≥ 0 is x² ≥ 1, giving x ≤ -1 or x ≥ 1.",
    "f'(x) = 3x² - 3，所以 f'(x) ≥ 0 等价于 x² ≥ 1，得到 x ≤ -1 或 x ≥ 1。"
  ),
  "hjb-high-ds-v2-s6-405": remediation(
    "hjb-high-s6-函数-导数与不等式综合", "fill-in", "tangent-slope",
    "For f(x) = x², find the slope of the tangent at x = 3.",
    "已知 f(x) = x²。求曲线在 x = 3 处的切线斜率。",
    "6",
    "f'(x) = 2x, so f'(3) = 6.",
    "f'(x) = 2x，所以 f'(3) = 6。"
  ),

  "hjb-high-ds-v2-s6-353": remediation(
    "hjb-high-s6-圆锥曲线综合复习", "fill-in", "ellipse-eccentricity",
    "Find the eccentricity of the ellipse x²/25 + y²/9 = 1.",
    "求椭圆 x²/25 + y²/9 = 1 的离心率。",
    "4/5",
    "c² = 25 - 9 = 16, so c = 4 and e = c/a = 4/5.",
    "c² = 25 - 9 = 16，所以 c = 4，e = c/a = 4/5。"
  ),
  "hjb-high-ds-v2-s6-356": remediation(
    "hjb-high-s6-圆锥曲线综合复习", "fill-in", "parabola-focus-review",
    "Find the focus of the parabola y² = 4x.",
    "求抛物线 y² = 4x 的焦点。",
    "(1,0)",
    "Comparing with y² = 4px gives p = 1, so the focus is (1, 0).",
    "与 y² = 4px 比较，得 p = 1，所以焦点为 (1, 0)。"
  ),

  "hjb-high-ds-v2-s6-003": remediation(
    "hjb-high-s6-导数及其运用", "short-answer", "stationary-minimum",
    "For f(x) = x² - 4x + 1, find the x-coordinate of its minimum point.",
    "已知 f(x) = x² - 4x + 1。求最小值点的横坐标。",
    "2",
    "f'(x) = 2x - 4. The derivative changes from negative to positive at x = 2, so the minimum occurs at x = 2.",
    "f'(x) = 2x - 4，在 x = 2 处由负变正，所以函数在 x = 2 处取得最小值。"
  ),
  "hjb-high-ds-v2-s6-005": remediation(
    "hjb-high-s6-导数及其运用", "fill-in", "tangent-line-equation",
    "Find the tangent line to y = x² at x = 1.",
    "求曲线 y = x² 在 x = 1 处的切线方程。",
    "y=2x-1",
    "At x = 1 the point is (1, 1), and y' = 2x gives slope 2. Thus y - 1 = 2(x - 1), or y = 2x - 1.",
    "当 x = 1 时，切点为 (1, 1)，且 y' = 2x 给出斜率 2。所以 y - 1 = 2(x - 1)，即 y = 2x - 1。"
  ),

  "hjb-high-ds-v2-s6-227": remediation(
    "hjb-high-s6-成对数据的统计分析", "fill-in", "paired-data-linear-slope",
    "The paired data are (1, 2), (2, 4), and (3, 6). Find the slope of their exact linear relation.",
    "成对数据为 (1, 2)，(2, 4)，(3, 6)。求它们所满足的线性关系的斜率。",
    "2",
    "Each pair satisfies y = 2x, so the slope is 2.",
    "每个数据对都满足 y = 2x，所以斜率为 2。"
  ),
  "hjb-high-ds-v2-s6-230": remediation(
    "hjb-high-s6-成对数据的统计分析", "fill-in", "regression-centroid",
    "A least-squares regression line is y = 3x + 1. If x̄ = 4, find ȳ.",
    "一条最小二乘回归直线为 y = 3x + 1。若 x̄ = 4，求 ȳ。",
    "13",
    "A least-squares regression line passes through (x̄, ȳ), so ȳ = 3·4 + 1 = 13.",
    "最小二乘回归直线经过点 (x̄, ȳ)，所以 ȳ = 3·4 + 1 = 13。"
  ),

  "hjb-high-ds-v2-s6-481": remediation(
    "hjb-high-s6-数列与计数综合", "multiple-choice", "geometric-series-sum",
    "Find the sum 1 + 2 + 4 + 8.",
    "求和 1 + 2 + 4 + 8。",
    "15",
    "This is a 4-term geometric sum: 1 + 2 + 4 + 8 = 15.",
    "这是一个有 4 项的等比数列求和：1 + 2 + 4 + 8 = 15。",
    ["12", "14", "15", "16"]
  ),
  "hjb-high-ds-v2-s6-482": remediation(
    "hjb-high-s6-数列与计数综合", "multiple-choice", "ordered-selection-count",
    "From five distinct students, choose a captain and a deputy. How many assignments are possible?",
    "从 5 名不同学生中选出 1 名队长和 1 名副队长。共有多少种选法？",
    "20",
    "The roles are different, so order matters: 5 choices for captain and 4 for deputy give 5·4 = 20.",
    "两个职务不同，顺序有影响：队长有 5 种选法，副队长有 4 种选法，共 5·4 = 20 种。",
    ["10", "15", "20", "25"]
  ),

  "hjb-high-ds-v2-s6-302": remediation(
    "hjb-high-s6-数列综合复习", "fill-in", "geometric-series-review",
    "A geometric sequence has first term 1 and common ratio 2. Find the sum of its first 5 terms.",
    "一个等比数列的首项为 1，公比为 2。求前 5 项和。",
    "31",
    "S₅ = 1 + 2 + 4 + 8 + 16 = 31.",
    "S₅ = 1 + 2 + 4 + 8 + 16 = 31。"
  ),
  "hjb-high-ds-v2-s6-305": remediation(
    "hjb-high-s6-数列综合复习", "fill-in", "nonconstant-recurrence",
    "Given a₁ = 1 and aₙ₊₁ = aₙ + 2n, find a₄.",
    "已知 a₁ = 1，aₙ₊₁ = aₙ + 2n。求 a₄。",
    "13",
    "a₂ = 3, a₃ = 7, and a₄ = 13.",
    "依次得到 a₂ = 3，a₃ = 7，a₄ = 13。"
  ),

  "hjb-high-ds-v2-s6-155": remediation(
    "hjb-high-s6-概率初步续", "fill-in", "binomial-probability",
    "A fair coin is tossed four times. Find the probability of exactly two heads.",
    "将一枚公平硬币抛掷 4 次。求恰好出现 2 次正面的概率。",
    "3/8",
    "There are C(4,2) = 6 favorable sequences with exactly 2 heads among 2⁴ = 16 equally likely sequences, so the probability is 6/16 = 3/8.",
    "在 2⁴ = 16 个等可能序列中，恰有 2 次正面的序列有 C(4,2) = 6 个，所以概率为 6/16 = 3/8。"
  ),
  "hjb-high-ds-v2-s6-153": remediation(
    "hjb-high-s6-概率初步续", "short-answer", "conditional-probability",
    "Given P(A ∩ B) = 0.2 and P(B) = 0.5, find P(A | B).",
    "已知 P(A ∩ B) = 0.2，P(B) = 0.5。求 P(A | B)。",
    "0.4",
    "P(A | B) = P(A ∩ B)/P(B) = 0.2/0.5 = 0.4.",
    "P(A | B) = P(A ∩ B)/P(B) = 0.2/0.5 = 0.4。"
  ),

  "hjb-high-ds-v2-s6-461": remediation(
    "hjb-high-s6-概率统计综合", "fill-in", "discrete-expectation",
    "A random variable X takes 0 with probability 1/4 and 2 with probability 3/4. Find E(X).",
    "随机变量 X 以 1/4 的概率取 0，以 3/4 的概率取 2。求 E(X)。",
    "3/2",
    "E(X) = 0·(1/4) + 2·(3/4) = 3/2.",
    "E(X) = 0·(1/4) + 2·(3/4) = 3/2。"
  ),
  "hjb-high-ds-v2-s6-463": remediation(
    "hjb-high-s6-概率统计综合", "fill-in", "binomial-expectation",
    "If X follows a binomial distribution with n = 10 and p = 0.3, find E(X).",
    "若 X 服从 n = 10、p = 0.3 的二项分布，求 E(X)。",
    "3",
    "For a binomial random variable, E(X) = np = 10·0.3 = 3.",
    "二项分布随机变量的期望为 E(X) = np = 10·0.3 = 3。"
  ),

  "hjb-high-ds-v2-s6-377": remediation(
    "hjb-high-s6-空间向量综合复习", "fill-in", "point-plane-distance-review",
    "Find the distance from P(1, 2, 2) to the plane x + 2y - 2z = 0.",
    "求点 P(1, 2, 2) 到平面 x + 2y - 2z = 0 的距离。",
    "1/3",
    "The distance is |1 + 4 - 4|/√(1² + 2² + (-2)²) = 1/3.",
    "距离为 |1 + 4 - 4|/√(1² + 2² + (-2)²) = 1/3。"
  ),
  "hjb-high-ds-v2-s6-381": remediation(
    "hjb-high-s6-空间向量综合复习", "fill-in", "space-vector-orthogonality",
    "Vectors a = (1, λ, 2) and b = (2, 1, -1) are perpendicular. Find λ.",
    "向量 a = (1, λ, 2) 与 b = (2, 1, -1) 垂直。求 λ。",
    "0",
    "a·b = 2 + λ - 2 = λ. Perpendicularity gives λ = 0.",
    "a·b = 2 + λ - 2 = λ。由垂直条件得到 λ = 0。"
  ),

  "hjb-high-ds-v2-s6-441": remediation(
    "hjb-high-s6-立体几何与空间向量综合", "fill-in", "rectangular-parallelepiped-volume",
    "Three mutually perpendicular edge vectors have lengths 2, 3, and 4. Find the volume of the rectangular parallelepiped they form.",
    "三条两两垂直的棱向量长度分别为 2，3，4。求它们构成长方体的体积。",
    "24",
    "For mutually perpendicular edges, the volume is the product of their lengths: 2·3·4 = 24.",
    "三条棱两两垂直，体积等于棱长之积：2·3·4 = 24。"
  ),
  "hjb-high-ds-v2-s6-443": remediation(
    "hjb-high-s6-立体几何与空间向量综合", "fill-in", "parallel-line-plane-angle",
    "A line has direction vector d = (1, 1, 0), and a plane has normal vector n = (0, 0, 1). Find the angle between the line and the plane.",
    "一条直线的方向向量为 d = (1, 1, 0)，一个平面的法向量为 n = (0, 0, 1)。求直线与平面所成的角。",
    "0",
    "Because d·n = 0, the line direction is perpendicular to the plane normal and therefore parallel to the plane. The line-plane angle is 0.",
    "因为 d·n = 0，直线方向与平面法向量垂直，所以直线平行于平面，线面角为 0。"
  ),

  "hjb-high-ds-v2-s6-326": remediation(
    "hjb-high-s6-解析几何直线综合复习", "fill-in", "line-intersection",
    "Find the intersection of the lines x + y = 5 and x - y = 1.",
    "求直线 x + y = 5 与 x - y = 1 的交点。",
    "(3,2)",
    "Adding the equations gives 2x = 6, so x = 3; then y = 2. The intersection is (3, 2).",
    "两式相加得到 2x = 6，所以 x = 3，再得 y = 2。交点为 (3, 2)。"
  ),
  "hjb-high-ds-v2-s6-329": remediation(
    "hjb-high-s6-解析几何直线综合复习", "fill-in", "parallel-line-distance",
    "Find the distance between the parallel lines 3x - 4y + 1 = 0 and 3x - 4y + 11 = 0.",
    "求平行直线 3x - 4y + 1 = 0 与 3x - 4y + 11 = 0 之间的距离。",
    "2",
    "The distance is |11 - 1|/√(3² + (-4)²) = 10/5 = 2.",
    "两平行线间的距离为 |11 - 1|/√(3² + (-4)²) = 10/5 = 2。"
  ),

  "hjb-high-ds-v2-s6-083": remediation(
    "hjb-high-s6-计数原理", "fill-in", "multiplication-principle",
    "A student has 3 shirts and 4 pairs of trousers. How many shirt-trouser outfits are possible?",
    "一名学生有 3 件上衣和 4 条裤子。共有多少种上衣与裤子的搭配？",
    "12",
    "By the multiplication principle, there are 3·4 = 12 outfits.",
    "由分步乘法计数原理，共有 3·4 = 12 种搭配。"
  ),
  "hjb-high-ds-v2-s6-081": remediation(
    "hjb-high-s6-计数原理", "short-answer", "ordered-pair-selection",
    "From five distinct students, choose a captain and a deputy. How many assignments are possible?",
    "从 5 名不同学生中选出 1 名队长和 1 名副队长。共有多少种选法？",
    "20",
    "Order matters because the roles differ: 5 choices for captain and 4 for deputy give 5·4 = 20.",
    "两个职务不同，顺序有影响：队长有 5 种选法，副队长有 4 种选法，共 5·4 = 20 种。"
  )
};

export const mainlandHjbHighPracticeFamilyByQuestionId = new Map(
  Object.entries(mainlandHjbHighPracticeRemediations).map(([questionId, value]) => [questionId, value.family])
);
