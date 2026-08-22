import { mainlandHjbHighQuestionGenerationMetadata, mainlandHjbHighQuestions } from "./mainlandHjbHighQuestions";
import { formatHjbHighVolumeTitleEn, mainlandHjbHighTopicMetadata, mainlandHjbHighTopics } from "./mainlandHjbHighTopics";
import { joinWorkedExampleAnswerAndExplanation, localizeHjbGeneratedText, toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

function text(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

type HjbHighLessonDepthOverride = {
  conceptTitle: LocalizedText;
  conceptContent: LocalizedText;
  workedExampleTitle: LocalizedText;
  workedExampleContent: LocalizedText;
};

const hjbHighLessonDepthOverrides: Record<string, HjbHighLessonDepthOverride> = {
  "hjb-high-s4-等式与不等式": {
    conceptTitle: text("Preserve the solution set in equations and inequalities", "在等式与不等式变形中保持解集不变"),
    conceptContent: text(
      "An algebraic transformation is equivalent only when it preserves exactly the same solution set. Adding the same expression to both sides is reversible, but multiplying or dividing requires a nonzero factor; in an inequality, multiplying or dividing by a negative number reverses the inequality sign. Before clearing a denominator, state every excluded value and determine the sign of any variable factor. After squaring or another non-one-to-one step, substitute candidates into the original statement. For a rational inequality, place numerator zeros and denominator zeros on a sign chart, including numerator zeros when equality is allowed and always excluding denominator zeros.",
      "代数变形只有在前后解集完全相同时才是等价变形。等式或不等式两边加上同一个式子是可逆的；乘除时必须保证因式不为 0，而且不等式两边乘或除以负数时要改变不等号方向。去分母前应先写出所有禁值，并判断含变量因式的符号；平方等非一一对应的变形之后，要把候选解代回原式。解分式不等式时，应把分子零点和分母零点放入符号表：允许取等号时可保留分子零点，但分母零点始终排除。"
    ),
    workedExampleTitle: text("Solve a rational inequality with a sign chart", "用符号表解分式不等式"),
    workedExampleContent: text(
      "Solve (x − 1)/(x + 2) ≥ 0. First state the domain: x ≠ −2. The critical values are x = −2, where the denominator is zero, and x = 1, where the numerator is zero. On (−∞,−2), both numerator and denominator are negative, so the quotient is positive. On (−2,1), the numerator is negative and the denominator is positive, so the quotient is negative. On (1,∞), both are positive, so the quotient is positive. Equality is attained at x = 1, but x = −2 is not in the domain. Answer: x ∈ (−∞,−2) ∪ [1,∞). Check: x = −3 gives 4 ≥ 0, x = 0 gives −1/2 < 0, and x = 2 gives 1/4 ≥ 0; x = −2 remains excluded because division by zero is undefined.",
      "解不等式 (x − 1)/(x + 2) ≥ 0。先写定义域：x ≠ −2。临界值为 x = −2（分母为 0）和 x = 1（分子为 0）。在区间 (−∞,−2) 上，分子、分母都为负，商为正；在 (−2,1) 上，分子为负、分母为正，商为负；在 (1,∞) 上，分子、分母都为正，商为正。x = 1 使分式等于 0，可以取到；x = −2 不在定义域内。答案：x ∈ (−∞,−2) ∪ [1,∞)。检验：取 x = −3，分式值为 4 ≥ 0；取 x = 0，分式值为 −1/2 < 0；取 x = 2，分式值为 1/4 ≥ 0。x = −2 会导致除以 0，因此仍须排除。"
    )
  },
  "hjb-high-s4-复数": {
    conceptTitle: text("Use conjugates to calculate and verify complex quotients", "用共轭复数计算并检验复数商"),
    conceptContent: text(
      "Every complex number has the form z = a + bi, where a and b are real and i² = −1. Two complex numbers are equal exactly when their real parts and imaginary parts are equal. The conjugate of z is z̄ = a − bi, its modulus is |z| = √(a² + b²), and z·z̄ = |z|². To divide by a nonzero complex number c + di, multiply numerator and denominator by c − di; the denominator becomes c² + d² > 0. Keep real and imaginary terms separate, use i² = −1 when simplifying, and verify a quotient by multiplying it by the original denominator.",
      "每个复数都可写成 z = a + bi，其中 a、b 为实数且 i² = −1。两个复数相等，当且仅当实部和虚部分别相等。z 的共轭复数为 z̄ = a − bi，模为 |z| = √(a² + b²)，并且 z·z̄ = |z|²。除以非零复数 c + di 时，可把分子、分母同乘 c − di，使分母化为 c² + d² > 0。化简时要分开实部与虚部，并用 i² = −1；求得商以后，可将它乘回原分母进行检验。"
    ),
    workedExampleTitle: text("Divide complex numbers and multiply back", "复数相除并乘回检验"),
    workedExampleContent: text(
      "Compute z = (2 + 3i)/(1 − i). The denominator is nonzero because |1 − i|² = 1² + (−1)² = 2. Multiply numerator and denominator by the conjugate 1 + i: z = (2 + 3i)(1 + i)/[(1 − i)(1 + i)]. The numerator is 2 + 2i + 3i + 3i² = −1 + 5i, while the denominator is 1 − i² = 2. Therefore z = (−1 + 5i)/2 = −1/2 + (5/2)i. Answer: z = −1/2 + (5/2)i. Check: [−1/2 + (5/2)i](1 − i) = −1/2 + (1/2)i + (5/2)i − (5/2)i² = 2 + 3i, which recovers the original numerator; hence the quotient is correct.",
      "计算 z = (2 + 3i)/(1 − i)。因为 |1 − i|² = 1² + (−1)² = 2，所以分母不为 0。把分子、分母同乘分母的共轭复数 1 + i，得 z = (2 + 3i)(1 + i)/[(1 − i)(1 + i)]。分子为 2 + 2i + 3i + 3i² = −1 + 5i，分母为 1 − i² = 2。因此 z = (−1 + 5i)/2 = −1/2 + (5/2)i。答案：z = −1/2 + (5/2)i。检验：[−1/2 + (5/2)i](1 − i) = −1/2 + (1/2)i + (5/2)i − (5/2)i² = 2 + 3i，恰好还原原分子，所以所得商正确。"
    )
  },
  "hjb-high-s4-函数的概念-性质及应用": {
    conceptTitle: text("Treat the domain as part of the function", "把定义域视为函数的一部分"),
    conceptContent: text(
      "A function assigns exactly one output to each input in its domain, so the domain is part of the function rather than an afterthought. The same algebraic rule on different domains can define different functions and different ranges. To find a range on a restricted interval, identify monotonic intervals and extrema, then compare all relevant critical points and endpoints. An inverse function exists on a domain only when the original function is one-to-one there. Whenever an equation f(x) = y is solved algebraically, every candidate must still be filtered through the stated domain and any original restrictions.",
      "函数把定义域内的每一个输入唯一地对应到一个输出，因此定义域是函数本身的一部分。相同的解析式若定义域不同，可以表示不同的函数，也可能有不同的值域。在限定区间上求值域时，要先判断单调区间和极值，再比较所有相关临界点与端点。只有函数在所取定义域上是一一对应时，反函数才存在。代数求解 f(x) = y 得到候选值后，仍须用给定定义域和原题限制进行筛选。"
    ),
    workedExampleTitle: text("Find a restricted range and reject an out-of-domain root", "求限定值域并排除定义域外的根"),
    workedExampleContent: text(
      "Let f(x) = x² − 4x + 1 with domain [1,5]. Find its range and solve f(x) = 1 on this domain. Complete the square: f(x) = (x − 2)² − 3. The parabola decreases on [1,2] and increases on [2,5], so its minimum is f(2) = −3. For the maximum, compare the endpoints: f(1) = −2 and f(5) = 6, hence the maximum is 6. Continuity gives the range [−3,6]. Next, f(x) = 1 gives x² − 4x = 0, so x(x − 4) = 0 and the algebraic candidates are x = 0 and x = 4. Only x = 4 lies in [1,5]. Answer: the range is [−3,6], and the solution of f(x) = 1 on the stated domain is x = 4. Check: f(2) = −3, f(5) = 6, and f(4) = 1; although f(0) = 1 algebraically, x = 0 is excluded by the domain.",
      "设 f(x) = x² − 4x + 1，定义域为 [1,5]。求值域，并在此定义域内解 f(x) = 1。配方得 f(x) = (x − 2)² − 3。函数在 [1,2] 上递减，在 [2,5] 上递增，所以最小值为 f(2) = −3。求最大值时比较端点：f(1) = −2，f(5) = 6，因此最大值为 6。由连续性可知值域为 [−3,6]。再解 f(x) = 1：x² − 4x = 0，即 x(x − 4) = 0，代数候选值为 x = 0、x = 4；只有 x = 4 属于 [1,5]。答案：值域为 [−3,6]，在给定定义域内方程的解为 x = 4。检验：f(2) = −3，f(5) = 6，f(4) = 1；虽然代数上 f(0) = 1，但 x = 0 被定义域排除。"
    )
  },
  "hjb-high-s4-集合与逻辑": {
    conceptTitle: text("Connect set operations with logical statements", "把集合运算与逻辑命题联系起来"),
    conceptContent: text(
      "All complements are taken relative to a stated universal set U. Union means membership in at least one set, intersection means membership in both, and Aᶜ contains exactly the elements of U not in A. De Morgan's laws are (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ and (A ∩ B)ᶜ = Aᶜ ∪ Bᶜ. A conditional statement p ⇒ q is false only when p is true and q is false; its converse q ⇒ p need not follow. If p ⇒ q, then p is sufficient for q and q is necessary for p. Venn diagrams can organize cases, but each region and boundary condition must agree with the symbolic definition.",
      "补集必须相对于已经说明的全集 U。并集表示至少属于一个集合，交集表示同时属于两个集合，Aᶜ 则由 U 中所有不属于 A 的元素组成。德摩根律为 (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ 和 (A ∩ B)ᶜ = Aᶜ ∪ Bᶜ。命题 p ⇒ q 只有在 p 真而 q 假时为假；逆命题 q ⇒ p 不一定成立。若 p ⇒ q，则 p 是 q 的充分条件，q 是 p 的必要条件。韦恩图可以帮助整理情况，但每个区域和边界仍须与符号定义一致。"
    ),
    workedExampleTitle: text("Verify De Morgan's law by listing elements", "列举元素检验德摩根律"),
    workedExampleContent: text(
      "Let U = {1,2,3,4,5,6,7,8,9,10}, let A be the even elements of U, and let B be the prime elements of U. Then A = {2,4,6,8,10} and B = {2,3,5,7}. Their union is A ∪ B = {2,3,4,5,6,7,8,10}, so (A ∪ B)ᶜ = {1,9}. To verify De Morgan's law independently, Aᶜ = {1,3,5,7,9} and Bᶜ = {1,4,6,8,9,10}; therefore Aᶜ ∩ Bᶜ = {1,9}. Answer: (A ∪ B)ᶜ = {1,9}. Check: Aᶜ ∩ Bᶜ gives the same set {1,9}, and neither 1 nor 9 is even or prime, while every other element of U is even, prime, or both. Thus the result satisfies both the element definition and De Morgan's law.",
      "设 U = {1,2,3,4,5,6,7,8,9,10}，A 为 U 中的偶数集合，B 为 U 中的质数集合。于是 A = {2,4,6,8,10}，B = {2,3,5,7}。并集 A ∪ B = {2,3,4,5,6,7,8,10}，所以 (A ∪ B)ᶜ = {1,9}。再独立检验德摩根律：Aᶜ = {1,3,5,7,9}，Bᶜ = {1,4,6,8,9,10}，从而 Aᶜ ∩ Bᶜ = {1,9}。答案：(A ∪ B)ᶜ = {1,9}。检验：Aᶜ ∩ Bᶜ 也得到 {1,9}；1 和 9 既不是偶数也不是质数，而 U 中其余每个元素都属于偶数集合、质数集合或同时属于两者。因此结果同时符合元素定义和德摩根律。"
    )
  },
  "hjb-high-s4-幂-指数与对数": {
    conceptTitle: text("State logarithm conditions before using its laws", "使用对数运算律前先写明条件"),
    conceptContent: text(
      "For a real logarithm logₐM, the base must satisfy a > 0 and a ≠ 1, and the argument must satisfy M > 0. Under these conditions, logₐ(MN) = logₐM + logₐN and logₐ(M/N) = logₐM − logₐN. The equations logₐM = c and M = aᶜ are equivalent only after the base and argument conditions are secured. When several logarithms are combined, intersect all argument restrictions before solving the resulting algebraic equation. Any algebraic root outside that domain is extraneous and must be rejected by substitution into the original logarithmic equation.",
      "实数对数 logₐM 的底数必须满足 a > 0 且 a ≠ 1，真数必须满足 M > 0。在这些条件下，logₐ(MN) = logₐM + logₐN，logₐ(M/N) = logₐM − logₐN。只有先保证底数和真数条件，方程 logₐM = c 才能与 M = aᶜ 等价。合并多个对数前，应先取所有真数限制的交集，再求解所得代数方程；不在定义域内的代数根是增根，必须用原对数方程筛除。"
    ),
    workedExampleTitle: text("Solve a logarithmic equation and filter its roots", "解对数方程并筛选根"),
    workedExampleContent: text(
      "Solve log₂(x − 1) + log₂(x − 3) = 3. The arguments must be positive, so x − 1 > 0 and x − 3 > 0; together they give the domain x > 3. Within this domain, combine the logarithms: log₂[(x − 1)(x − 3)] = 3, hence (x − 1)(x − 3) = 2³ = 8. Expanding gives x² − 4x + 3 = 8, or x² − 4x − 5 = 0 = (x − 5)(x + 1). The algebraic candidates are x = 5 and x = −1, but x = −1 violates x > 3. Answer: x = 5. Check: log₂(5 − 1) + log₂(5 − 3) = log₂4 + log₂2 = 2 + 1 = 3. Both arguments are positive, so x = 5 satisfies every original condition.",
      "解方程 log₂(x − 1) + log₂(x − 3) = 3。真数必须为正，所以 x − 1 > 0 且 x − 3 > 0，合并得到定义域 x > 3。在定义域内合并对数：log₂[(x − 1)(x − 3)] = 3，因此 (x − 1)(x − 3) = 2³ = 8。展开得 x² − 4x + 3 = 8，即 x² − 4x − 5 = 0 = (x − 5)(x + 1)。代数候选值为 x = 5、x = −1，但 x = −1 不满足 x > 3。答案：x = 5。检验：log₂(5 − 1) + log₂(5 − 3) = log₂4 + log₂2 = 2 + 1 = 3；两个真数也都为正，所以 x = 5 满足原方程的全部条件。"
    )
  },
  "hjb-high-s4-幂函数-指数函数与对数函数": {
    conceptTitle: text("Use monotonicity when translating exponential bounds", "利用单调性转化指数范围"),
    conceptContent: text(
      "For a > 0 and a ≠ 1, y = aˣ has domain ℝ and range (0,∞), while y = logₐx is its inverse with domain (0,∞) and range ℝ. Both functions increase when a > 1 and decrease when 0 < a < 1, so an inequality reverses only in the decreasing case. A power function y = xᵅ may have additional real-domain restrictions depending on the exponent. In an equation or inequality containing a^(2x) and aˣ, the substitution t = aˣ requires t > 0; solve in t first, then translate the resulting bounds back to x using the correct monotonic direction.",
      "当 a > 0 且 a ≠ 1 时，指数函数 y = aˣ 的定义域为 ℝ、值域为 (0,∞)；对数函数 y = logₐx 是它的反函数，定义域为 (0,∞)、值域为 ℝ。当 a > 1 时两者递增，当 0 < a < 1 时两者递减，因此只有在递减情形下转化不等式才要改变方向。幂函数 y = xᵅ 的实数定义域还可能随指数而变化。含有 a^(2x) 与 aˣ 的方程或不等式可令 t = aˣ，但必须保留 t > 0，再依据单调方向把 t 的范围还原为 x 的范围。"
    ),
    workedExampleTitle: text("Reduce an exponential inequality to a quadratic", "把指数不等式化为二次不等式"),
    workedExampleContent: text(
      "Solve 3^(2x) − 10·3ˣ + 9 ≤ 0. Let t = 3ˣ. Because 3ˣ > 0 and 3^(2x) = (3ˣ)², the inequality becomes t² − 10t + 9 ≤ 0, or (t − 1)(t − 9) ≤ 0. Thus 1 ≤ t ≤ 9. Since 3ˣ is strictly increasing, 1 = 3⁰ ≤ 3ˣ ≤ 3² = 9 is equivalent to 0 ≤ x ≤ 2. Answer: x ∈ [0,2]. Check: at x = 0 and x = 2 the original expression is 0; at x = 1 it is 9 − 30 + 9 = −12 ≤ 0. For an outside value x = −1, (t − 1)(t − 9) = (−2/3)(−26/3) = 52/9 > 0, consistent with its exclusion.",
      "解不等式 3^(2x) − 10·3ˣ + 9 ≤ 0。令 t = 3ˣ。因为 3ˣ > 0 且 3^(2x) = (3ˣ)²，原不等式化为 t² − 10t + 9 ≤ 0，即 (t − 1)(t − 9) ≤ 0，所以 1 ≤ t ≤ 9。由于 3ˣ 严格递增，1 = 3⁰ ≤ 3ˣ ≤ 3² = 9 等价于 0 ≤ x ≤ 2。答案：x ∈ [0,2]。检验：x = 0 和 x = 2 时原式都等于 0；取区间内部的 x = 1，原式为 9 − 30 + 9 = −12 ≤ 0。取区间外的 x = −1，有 (t − 1)(t − 9) = (−2/3)(−26/3) = 52/9 > 0，与排除该值一致。"
    )
  },
  "hjb-high-s4-平面向量": {
    conceptTitle: text("Decompose a vector with the dot product", "用点积分解平面向量"),
    conceptContent: text(
      "For vectors u = (u₁,u₂) and v = (v₁,v₂), the dot product is u·v = u₁v₁ + u₂v₂ and |u| = √(u·u). If both vectors are nonzero, u·v = |u||v|cos θ determines their included angle; u·v = 0 is the perpendicularity test. The projection of v onto a nonzero u is projᵤv = (v·u)/(u·u)u. Subtracting this projection from v leaves a component perpendicular to u. Coordinate calculations should preserve direction as well as magnitude, and a decomposition can be checked by both a zero dot product and the Pythagorean identity for squared lengths.",
      "对向量 u = (u₁,u₂)、v = (v₁,v₂)，点积为 u·v = u₁v₁ + u₂v₂，模为 |u| = √(u·u)。当两个向量都非零时，u·v = |u||v|cos θ 可确定夹角；u·v = 0 是垂直判定。v 在非零向量 u 上的投影为 projᵤv = (v·u)/(u·u)u，用 v 减去该投影后，余下分量与 u 垂直。坐标计算既要保留大小也要保留方向；向量分解可同时用点积为 0 和模平方的勾股关系检验。"
    ),
    workedExampleTitle: text("Find an angle and an orthogonal decomposition", "求夹角并作正交分解"),
    workedExampleContent: text(
      "Let u = (2,1) and v = (1,3). Find their angle and decompose v into components parallel and perpendicular to u. First, u·v = 2(1) + 1(3) = 5, |u| = √5, and |v| = √10. Hence cos θ = 5/(√5·√10) = 1/√2, so θ = 45°. The parallel component is projᵤv = (v·u)/(u·u)u = (5/5)(2,1) = (2,1). The perpendicular component is v − projᵤv = (1,3) − (2,1) = (−1,2). Answer: θ = 45°, with v = (2,1) + (−1,2). Check: (2,1)·(−1,2) = −2 + 2 = 0, and |v|² = 10 = |(2,1)|² + |(−1,2)|² = 5 + 5, confirming an orthogonal decomposition.",
      "设 u = (2,1)，v = (1,3)。求夹角，并把 v 分解为平行于 u 和垂直于 u 的两个分量。先算 u·v = 2(1) + 1(3) = 5，|u| = √5，|v| = √10，因此 cos θ = 5/(√5·√10) = 1/√2，所以 θ = 45°。平行分量为 projᵤv = (v·u)/(u·u)u = (5/5)(2,1) = (2,1)。垂直分量为 v − projᵤv = (1,3) − (2,1) = (−1,2)。答案：θ = 45°，且 v = (2,1) + (−1,2)。检验：(2,1)·(−1,2) = −2 + 2 = 0，并且 |v|² = 10 = |(2,1)|² + |(−1,2)|² = 5 + 5，确认这是正交分解。"
    )
  },
  "hjb-high-s4-三角函数": {
    conceptTitle: text("Track the transformed angle and all periodic branches", "跟踪复合角范围与全部周期分支"),
    conceptContent: text(
      "On the unit circle, sin x and cos x have period 2π, while tan x has period π and is undefined where cos x = 0. The identities sin²x + cos²x = 1 and sin 2x = 2sin x cos x can simplify equations, but they do not replace interval control. When an equation is rewritten in a transformed angle y = kx, first transform the original interval for x, list every solution branch for y in that entire interval, and only then divide by k. This prevents missing periodic solutions or introducing endpoints that the original interval excludes; every final angle should be checked in the original equation.",
      "在单位圆上，sin x 和 cos x 的周期为 2π；tan x 的周期为 π，并且在 cos x = 0 时无定义。恒等式 sin²x + cos²x = 1、sin 2x = 2sin x cos x 可以化简方程，但不能代替区间控制。把方程改写为复合角 y = kx 后，应先把 x 的原区间转化为 y 的完整区间，在其中列出每一个周期分支，最后再除以 k。这样可避免漏解，也不会误把原区间不包含的端点引入；所得每个角还应代回原方程检验。"
    ),
    workedExampleTitle: text("Solve a double-angle equation on a fixed interval", "在给定区间内解二倍角方程"),
    workedExampleContent: text(
      "Solve 2sin x cos x = √3/2 for x ∈ [0,2π). Using sin 2x = 2sin x cos x gives sin 2x = √3/2. Because x ∈ [0,2π), the transformed angle satisfies 2x ∈ [0,4π). In this full interval, sin 2x = √3/2 at 2x = π/3, 2π/3, 7π/3, and 8π/3. Dividing every value by 2 gives x = π/6, π/3, 7π/6, and 4π/3. Answer: x ∈ {π/6, π/3, 7π/6, 4π/3}. Check: at the first two angles, sin x and cos x are both positive; at the last two, both are negative. Direct substitution in all four cases gives 2sin x cos x = √3/2, and all four angles lie in [0,2π).",
      "在区间 x ∈ [0,2π) 内解方程 2sin x cos x = √3/2。利用 sin 2x = 2sin x cos x，得 sin 2x = √3/2。因为 x ∈ [0,2π)，所以复合角满足 2x ∈ [0,4π)。在这个完整区间内，sin 2x = √3/2 对应 2x = π/3、2π/3、7π/3、8π/3。各值除以 2，得 x = π/6、π/3、7π/6、4π/3。答案：x ∈ {π/6, π/3, 7π/6, 4π/3}。检验：前两个角的 sin x、cos x 都为正，后两个角的 sin x、cos x 都为负；四个角直接代入都得到 2sin x cos x = √3/2，并且都属于 [0,2π)。"
    )
  },
  "hjb-high-s4-三角": {
    conceptTitle: text("Choose a triangle law from the known data", "按已知条件选择解三角形定理"),
    conceptContent: text(
      "In a non-degenerate triangle ABC, let a, b, and c be opposite angles A, B, and C, with A + B + C = 180°. Use the sine rule a/sin A = b/sin B = c/sin C when an opposite side-angle pair is known. Use the cosine rule c² = a² + b² − 2ab cos C for SAS or SSS data. In an SSA case, a sine value may give two possible angles, so the angle sum and the rule that the larger side faces the larger angle must both be checked.",
      "在非退化三角形 ABC 中，a、b、c 分别为角 A、B、C 的对边，且 A + B + C = 180°。已知一组对边和对角时可用正弦定理 a/sin A = b/sin B = c/sin C；已知两边及夹角或三边时可用余弦定理 c² = a² + b² − 2ab cos C。遇到 SSA 条件时，同一个正弦值可能对应两个角，必须再用内角和以及“大边对大角”筛选。"
    ),
    workedExampleTitle: text("Use the cosine rule and verify the triangle", "用余弦定理解三角形并检验"),
    workedExampleContent: text(
      "Given triangle ABC with a = 7, b = 5, and included angle C = 60°, find c and the area. The cosine rule gives c² = 7² + 5² − 2(7)(5)cos 60° = 49 + 25 − 35 = 39, so c = √39. The area is (1/2)ab sin C = (1/2)(7)(5)(√3/2) = 35√3/4. Answer: c = √39 and area = 35√3/4 square units. Check: |7 − 5| < √39 < 7 + 5, so 2 < √39 < 12 satisfies the triangle inequality, and the positive area is consistent with 0° < C < 180°.",
      "已知三角形 ABC 中 a = 7，b = 5，夹角 C = 60°，求 c 和面积。由余弦定理，c² = 7² + 5² − 2(7)(5)cos 60° = 49 + 25 − 35 = 39，所以 c = √39。面积 S = (1/2)ab sin C = (1/2)(7)(5)(√3/2) = 35√3/4。答案：c = √39，面积为 35√3/4 平方单位。检验：|7 − 5| < √39 < 7 + 5，即 2 < √39 < 12，满足三角形两边之差小于第三边、两边之和大于第三边；面积为正也与 0° < C < 180° 一致。"
    )
  },
  "hjb-high-s5-概率初步": {
    conceptTitle: text("Count outcomes only after checking the probability model", "检验概率模型后再计数"),
    conceptContent: text(
      "An event is a subset of the sample space. In a finite model with equally likely elementary outcomes, P(A) equals the number of outcomes in A divided by the total number of outcomes; this counting rule is invalid when the elementary outcomes are not equally likely. For any events A and B, P(A ∪ B) = P(A) + P(B) − P(A ∩ B), and P(Aᶜ) = 1 − P(A). Mutually exclusive events have A ∩ B = ∅, whereas independent events satisfy P(A ∩ B) = P(A)P(B); these conditions are different. State the random experiment and its equally likely outcomes before applying a formula.",
      "事件是样本空间的子集。在有限且每个基本结果等可能的模型中，P(A) 等于事件 A 所含基本结果数除以基本结果总数；若基本结果并非等可能，就不能直接用这种计数公式。对任意事件 A、B，都有 P(A ∪ B) = P(A) + P(B) − P(A ∩ B)，且 P(Aᶜ) = 1 − P(A)。互斥事件满足 A ∩ B = ∅，独立事件则满足 P(A ∩ B) = P(A)P(B)，两者不能混淆。使用公式前，应先说明随机试验及其等可能结果。"
    ),
    workedExampleTitle: text("Use inclusion-exclusion for overlapping dice events", "用容斥公式计算有重叠的骰子事件"),
    workedExampleContent: text(
      "Two fair six-sided dice are rolled independently, so the 36 ordered pairs are equally likely. Let A be the event that the sum is at least 10, and let B be the event that the two dice match. Then A = {(4,6),(5,5),(6,4),(5,6),(6,5),(6,6)}, so |A| = 6. Also B = {(1,1),(2,2),(3,3),(4,4),(5,5),(6,6)}, so |B| = 6. Their overlap is A ∩ B = {(5,5),(6,6)}, with two outcomes. Therefore |A ∪ B| = 6 + 6 − 2 = 10 and P(A ∪ B) = 10/36 = 5/18. Answer: the probability of a sum of at least 10 or a double is 5/18. Check: the complement contains 36 − 10 = 26 outcomes, so 1 − 26/36 = 10/36 = 5/18; directly adding 6/36 + 6/36 without subtracting the overlap would double-count two outcomes.",
      "独立掷两枚公平的六面骰子，36 个有序数对等可能。设事件 A 为点数和至少是 10，事件 B 为两枚骰子点数相同。A = {(4,6),(5,5),(6,4),(5,6),(6,5),(6,6)}，所以 |A| = 6；B = {(1,1),(2,2),(3,3),(4,4),(5,5),(6,6)}，所以 |B| = 6。两事件的重叠部分为 A ∩ B = {(5,5),(6,6)}，共有 2 个结果。因此 |A ∪ B| = 6 + 6 − 2 = 10，P(A ∪ B) = 10/36 = 5/18。答案：点数和至少为 10 或两枚骰子点数相同的概率是 5/18。检验：补事件含有 36 − 10 = 26 个结果，所以 1 − 26/36 = 10/36 = 5/18；若直接把 6/36 与 6/36 相加而不减去交集，就会把两个结果重复计算。"
    )
  },
  "hjb-high-s5-简单几何体": {
    conceptTitle: text("Separate perpendicular height from face slant height", "区分垂直高与侧面斜高"),
    conceptContent: text(
      "A solid's volume and surface area use different geometric measurements. A prism or cylinder has volume base area times perpendicular height, while a pyramid or cone has one third of that product. The height must be perpendicular to the base; a slanted edge or a face's slant height cannot replace it. Surface area is found by adding the areas of the actual faces, without counting a shared interior face twice. For a right pyramid, a lateral face height can often be obtained from a right triangle containing the vertical height and a segment in the base. Keep square units for area and cubic units for volume.",
      "几何体的体积与表面积使用不同的几何量。棱柱或圆柱的体积等于底面积乘垂直高，棱锥或圆锥的体积则等于这个乘积的三分之一。这里的高必须垂直于底面，不能用斜棱或侧面的斜高代替。表面积应把实际外表面的面积相加，不能重复计算内部的公共面。对正棱锥，侧面斜高通常可由包含垂直高和底面内线段的直角三角形求出。面积使用平方单位，体积使用立方单位。"
    ),
    workedExampleTitle: text("Find the volume and surface area of a right square pyramid", "求正四棱锥的体积与表面积"),
    workedExampleContent: text(
      "A right square pyramid has base side length 6 and vertical height 4, with the apex directly above the base center. Find its volume and total surface area. The base area is 6² = 36, so the volume is V = (1/3)(36)(4) = 48. To find a triangular face's slant height l, join the base center to the midpoint of a base edge; this horizontal segment has length 3. Thus l = √(4² + 3²) = 5. Each lateral triangle has area (1/2)(6)(5) = 15, so the four lateral faces have area 60. Adding the base gives total surface area 60 + 36 = 96. Answer: V = 48 cubic units and total surface area = 96 square units. Check: l² − 4² = 25 − 16 = 9 = 3², confirming the face height, and the area and volume carry the required square and cubic units.",
      "一个正四棱锥的底面边长为 6，垂直高为 4，顶点在底面中心的正上方。求体积和总表面积。底面积为 6² = 36，所以体积 V = (1/3)(36)(4) = 48。求侧面三角形的斜高 l 时，连接底面中心与一条底边的中点，这条底面内线段长为 3。因此 l = √(4² + 3²) = 5。每个侧面三角形的面积为 (1/2)(6)(5) = 15，四个侧面的面积和为 60；再加上底面积，得总表面积 60 + 36 = 96。答案：V = 48 立方单位，总表面积为 96 平方单位。检验：l² − 4² = 25 − 16 = 9 = 3²，确认斜高计算正确；面积和体积也分别使用了平方单位与立方单位。"
    )
  },
  "hjb-high-s5-空间向量及其应用": {
    conceptTitle: text("Use a plane normal for projection and distance", "用平面法向量求投影与距离"),
    conceptContent: text(
      "A nonzero vector n is normal to a plane when it is perpendicular to two nonparallel directions in that plane. A plane through point A with normal n has vector equation n·(x − A) = 0. For a plane n·x = d and a point P, the signed normal displacement is (n·P − d)/(n·n)n; subtracting it from P gives the orthogonal projection H on the plane. The point-to-plane distance is |n·P − d|/|n|. A valid projection must satisfy both conditions: H lies in the plane, and PH is parallel to the normal. Coordinate work should state that n is nonzero before dividing by n·n or |n|.",
      "非零向量 n 若同时垂直于平面内两个不平行的方向，就是该平面的法向量。过点 A 且法向量为 n 的平面可写成向量方程 n·(x − A) = 0。对平面 n·x = d 和点 P，沿法向的位移向量为 (n·P − d)/(n·n)n；用 P 减去这个向量即可得到 P 在平面上的正射影 H。点到平面的距离为 |n·P − d|/|n|。正确的投影必须同时满足两个条件：H 在平面内，并且 PH 平行于法向量。坐标计算中，在除以 n·n 或 |n| 前应说明 n 非零。"
    ),
    workedExampleTitle: text("Find a plane, a projection, and a point-to-plane distance", "求平面方程、正射影与点面距离"),
    workedExampleContent: text(
      "Let A = (1,0,0), B = (0,1,0), and C = (0,0,1), and let P = (1,1,1). Find the plane ABC, the foot H of the perpendicular from P, and the distance from P to the plane. The in-plane directions are AB = (−1,1,0) and AC = (−1,0,1). The vector n = (1,1,1) is perpendicular to both, so it is a normal. Using A gives the plane x + y + z = 1. Since n·P − 1 = 3 − 1 = 2 and n·n = 3, H = P − (2/3)n = (1/3,1/3,1/3). The distance is |2|/√3 = 2√3/3. Answer: plane ABC is x + y + z = 1, H = (1/3,1/3,1/3), and the distance is 2√3/3. Check: H satisfies 1/3 + 1/3 + 1/3 = 1, and P − H = (2/3,2/3,2/3) = (2/3)n, so the segment PH is parallel to the plane normal.",
      "设 A = (1,0,0)、B = (0,1,0)、C = (0,0,1)，另有点 P = (1,1,1)。求平面 ABC 的方程、P 到该平面的垂足 H 以及点面距离。平面内两个方向为 AB = (−1,1,0)、AC = (−1,0,1)。向量 n = (1,1,1) 同时垂直于这两个方向，所以 n 是法向量。代入点 A，得平面方程 x + y + z = 1。因为 n·P − 1 = 3 − 1 = 2，n·n = 3，所以 H = P − (2/3)n = (1/3,1/3,1/3)。点面距离为 |2|/√3 = 2√3/3。答案：平面 ABC 为 x + y + z = 1，H = (1/3,1/3,1/3)，点面距离为 2√3/3。检验：H 满足 1/3 + 1/3 + 1/3 = 1，且 P − H = (2/3,2/3,2/3) = (2/3)n，所以线段 PH 平行于平面法向量。"
    )
  },
  "hjb-high-s5-平面直角坐标系中的直线": {
    conceptTitle: text("Use normal and direction vectors for coordinate lines", "用法向量与方向向量研究平面直线"),
    conceptContent: text(
      "For a line Ax + By + C = 0 with (A,B) ≠ (0,0), n = (A,B) is a normal vector and d = (B,−A) is a direction vector. This form handles vertical lines without a special slope rule. The distance from P(x₀,y₀) to the line is |Ax₀ + By₀ + C|/√(A² + B²). A perpendicular from P travels in the normal direction, so its foot H can be found by writing H = P + tn and imposing the original line equation. To verify the result, check that H satisfies the line equation and that PH is parallel to n; slope products alone are unsafe when a line is vertical.",
      "对直线 Ax + By + C = 0，其中 (A,B) ≠ (0,0)，n = (A,B) 是法向量，d = (B,−A) 是方向向量。这种表示也适用于竖直线，不必另设斜率规则。点 P(x₀,y₀) 到直线的距离为 |Ax₀ + By₀ + C|/√(A² + B²)。从 P 向直线作垂线时，垂线方向与法向量平行，因此可设 H = P + tn，再把 H 代入原直线方程求垂足。检验时应确认 H 满足直线方程，且 PH 平行于 n；遇到竖直线时，不能只依赖斜率乘积。"
    ),
    workedExampleTitle: text("Find a perpendicular foot and verify the distance", "求垂足并检验点线距离"),
    workedExampleContent: text(
      "Let l be 2x − y + 3 = 0 and let A = (1,2). Find the perpendicular foot H from A to l and the distance from A to l. A normal to l is n = (2,−1), so write H = A + tn = (1 + 2t, 2 − t). Substitution into l gives 2(1 + 2t) − (2 − t) + 3 = 0, hence 5t + 3 = 0 and t = −3/5. Therefore H = (−1/5,13/5). The distance is |t||n| = (3/5)√5 = 3√5/5. Answer: H = (−1/5,13/5), and the distance is 3√5/5. Check: 2(−1/5) − 13/5 + 3 = 0, so H lies on l; moreover AH = (−6/5,3/5) = (−3/5)(2,−1), so AH is parallel to n. The point-line formula independently gives |2(1) − 2 + 3|/√5 = 3/√5 = 3√5/5.",
      "设直线 l 为 2x − y + 3 = 0，点 A = (1,2)。求 A 到 l 的垂足 H 和点线距离。l 的一个法向量为 n = (2,−1)，所以设 H = A + tn = (1 + 2t, 2 − t)。把 H 代入 l，得 2(1 + 2t) − (2 − t) + 3 = 0，即 5t + 3 = 0，所以 t = −3/5。因此 H = (−1/5,13/5)。距离为 |t||n| = (3/5)√5 = 3√5/5。答案：H = (−1/5,13/5)，点线距离为 3√5/5。检验：2(−1/5) − 13/5 + 3 = 0，所以 H 在 l 上；并且 AH = (−6/5,3/5) = (−3/5)(2,−1)，所以 AH 平行于 n。点线距离公式也给出 |2(1) − 2 + 3|/√5 = 3/√5 = 3√5/5。"
    )
  },
  "hjb-high-s5-数列": {
    conceptTitle: text("Transform an affine recurrence into a geometric sequence", "把一次递推关系转化为等比数列"),
    conceptContent: text(
      "A sequence is a function whose inputs are positive integers. A recurrence determines a unique sequence only when enough initial values are supplied. Arithmetic and geometric formulas may be used only after their constant-difference or constant-ratio conditions are verified. For an affine recurrence aₙ₊₁ = qaₙ + r with q ≠ 1, shifting by a fixed value can remove the constant term: choose c so that bₙ = aₙ + c satisfies bₙ₊₁ = qbₙ. After finding an explicit formula, substitute n = 1 and one recurrence step to check indexing before summing terms.",
      "数列可看作定义域为正整数集的函数。递推关系只有在给出足够初始值时才能唯一确定数列；使用等差或等比公式前，必须先检验公差或公比是否保持不变。对一次递推关系 aₙ₊₁ = qaₙ + r（q ≠ 1），可通过平移消去常数项：选择常数 c，使 bₙ = aₙ + c 满足 bₙ₊₁ = qbₙ。得到通项公式后，应先代入 n = 1，并检验至少一步递推关系，确认下标无误后再求和。"
    ),
    workedExampleTitle: text("Find an explicit term and sum from a recurrence", "由递推关系求通项与前 n 项和"),
    workedExampleContent: text(
      "Let a₁ = 3 and aₙ₊₁ = 2aₙ + 1 for n ≥ 1. Find aₙ and the sum Sₙ of the first n terms, then evaluate S₅. Set bₙ = aₙ + 1. Then bₙ₊₁ = aₙ₊₁ + 1 = 2aₙ + 2 = 2bₙ, and b₁ = 4. Thus bₙ = 4·2ⁿ⁻¹ = 2ⁿ⁺¹, so aₙ = 2ⁿ⁺¹ − 1. Therefore Sₙ = ∑ₖ₌₁ⁿ(2ᵏ⁺¹ − 1) = 4(2ⁿ − 1) − n = 2ⁿ⁺² − n − 4. At n = 5, S₅ = 2⁷ − 5 − 4 = 119. Answer: aₙ = 2ⁿ⁺¹ − 1, Sₙ = 2ⁿ⁺² − n − 4, and S₅ = 119. Check: the first five terms are 3, 7, 15, 31, and 63; each satisfies aₙ₊₁ = 2aₙ + 1, and their sum is 3 + 7 + 15 + 31 + 63 = 119.",
      "已知 a₁ = 3，且对 n ≥ 1 有 aₙ₊₁ = 2aₙ + 1。求通项 aₙ、前 n 项和 Sₙ，并计算 S₅。令 bₙ = aₙ + 1，则 bₙ₊₁ = aₙ₊₁ + 1 = 2aₙ + 2 = 2bₙ，且 b₁ = 4。因此 bₙ = 4·2ⁿ⁻¹ = 2ⁿ⁺¹，所以 aₙ = 2ⁿ⁺¹ − 1。于是 Sₙ = ∑ₖ₌₁ⁿ(2ᵏ⁺¹ − 1) = 4(2ⁿ − 1) − n = 2ⁿ⁺² − n − 4。取 n = 5，得 S₅ = 2⁷ − 5 − 4 = 119。答案：aₙ = 2ⁿ⁺¹ − 1，Sₙ = 2ⁿ⁺² − n − 4，S₅ = 119。检验：前五项为 3、7、15、31、63，每一步都满足 aₙ₊₁ = 2aₙ + 1，且 3 + 7 + 15 + 31 + 63 = 119。"
    )
  },
  "hjb-high-s5-统计": {
    conceptTitle: text("Match each descriptive statistic to what it measures", "理解各描述统计量所刻画的特征"),
    conceptContent: text(
      "Statistical conclusions begin with a clearly defined population and a sampling method that avoids systematic bias. For numerical data, the mean uses every value and is sensitive to extreme observations, while the median depends on order and is more resistant. For a complete data set x₁,...,xₙ, the descriptive variance v = (1/n)Σ(xᵢ − x̄)² measures average squared deviation, and the standard deviation √v returns to the original unit. The formula v = (1/n)Σxᵢ² − x̄² is an equivalent computational check. A summary describes the observed data; it does not by itself prove a causal explanation.",
      "统计结论应从明确总体和避免系统偏差的抽样方法开始。对数值数据，平均数使用每一个观测值，因此容易受极端值影响；中位数由排序位置决定，相对稳健。把 x₁,...,xₙ 看作完整数据集时，描述性方差 v = (1/n)Σ(xᵢ − x̄)² 表示平均平方偏差，标准差 √v 则回到原数据的单位。等价公式 v = (1/n)Σxᵢ² − x̄² 可用于独立复核计算。统计摘要只描述观测到的数据，不能单独证明因果关系。"
    ),
    workedExampleTitle: text("Compute mean, median, variance, and standard deviation", "计算平均数、中位数、方差与标准差"),
    workedExampleContent: text(
      "Treat 2, 4, 4, 4, 5, 5, 7, and 9 as the complete data set and use descriptive variance with divisor n. The sum is 40 and n = 8, so the mean is x̄ = 40/8 = 5. The ordered middle values are the fourth value 4 and fifth value 5, so the median is (4 + 5)/2 = 4.5. The squared deviations from 5 sum to 9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32. Thus v = 32/8 = 4 and the standard deviation is √4 = 2. Answer: mean = 5, median = 4.5, descriptive variance = 4, and standard deviation = 2. Check: Σxᵢ² = 232, so (1/8)Σxᵢ² − x̄² = 232/8 − 25 = 29 − 25 = 4. Interpretation: the upper value 9 pulls the mean above the median, illustrating the mean's greater sensitivity to large observations.",
      "把 2、4、4、4、5、5、7、9 视为完整数据集，并采用分母为 n 的描述性方差。数据和为 40，n = 8，所以平均数 x̄ = 40/8 = 5。排序后的中间两个数是第 4 个数 4 和第 5 个数 5，因此中位数为 (4 + 5)/2 = 4.5。各数与 5 的离差平方和为 9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32，所以 v = 32/8 = 4，标准差为 √4 = 2。答案：平均数为 5，中位数为 4.5，描述性方差为 4，标准差为 2。检验：Σxᵢ² = 232，所以 (1/8)Σxᵢ² − x̄² = 232/8 − 25 = 29 − 25 = 4。解释：较大的观测值 9 使平均数高于中位数，体现了平均数对较大观测值更敏感。"
    )
  },
  "hjb-high-s5-圆锥曲线": {
    conceptTitle: text("Connect focal definitions to standard conic equations", "从焦点定义建立圆锥曲线标准方程"),
    conceptContent: text(
      "A conic equation must match its geometric definition and axis orientation. An ellipse consists of points whose distances to two foci have constant sum 2a, with a > c > 0; for x²/a² + y²/b² = 1, c² = a² − b². A hyperbola uses a constant absolute difference 2a and satisfies c² = a² + b² in its standard form. A parabola consists of points equidistant from a focus and a directrix. Before choosing a formula, identify the center or vertex, focal direction, and parameter conditions. A final point substitution checks the equation, while the focal-distance condition checks the geometry.",
      "圆锥曲线方程必须与几何定义和轴的方向一致。椭圆由到两个焦点的距离之和为常数 2a 的点组成，且 a > c > 0；对标准方程 x²/a² + y²/b² = 1，有 c² = a² − b²。双曲线使用距离之差的绝对值为常数 2a，在标准形式中满足 c² = a² + b²。抛物线由到一个焦点和一条准线距离相等的点组成。选用公式前，应先确定中心或顶点、焦点方向与参数条件；最后既要代点检验方程，也要用焦点距离条件检验几何定义。"
    ),
    workedExampleTitle: text("Build an ellipse equation from its foci and one point", "由焦点和一点建立椭圆方程"),
    workedExampleContent: text(
      "An ellipse has foci F₁ = (−4,0) and F₂ = (4,0) and passes through P = (0,3). Find its standard equation and eccentricity. Because the foci lie on the x-axis, write x²/a² + y²/b² = 1 with c = 4. At P, PF₁ = PF₂ = √(4² + 3²) = 5, so the constant distance sum is 10 = 2a and a = 5. Therefore b² = a² − c² = 25 − 16 = 9. The equation is x²/25 + y²/9 = 1, and the eccentricity is e = c/a = 4/5. Answer: x²/25 + y²/9 = 1 and e = 4/5. Check: P gives 0²/25 + 3²/9 = 1, and PF₁ + PF₂ = 5 + 5 = 10 = 2a; also a = 5 > c = 4, so the ellipse condition holds.",
      "一个椭圆的焦点为 F₁ = (−4,0)、F₂ = (4,0)，并且经过点 P = (0,3)。求标准方程和离心率。因为焦点在 x 轴上，设方程为 x²/a² + y²/b² = 1，且 c = 4。在点 P 处，PF₁ = PF₂ = √(4² + 3²) = 5，所以距离和常数为 10 = 2a，得 a = 5。因此 b² = a² − c² = 25 − 16 = 9。椭圆方程为 x²/25 + y²/9 = 1，离心率 e = c/a = 4/5。答案：x²/25 + y²/9 = 1，e = 4/5。检验：点 P 满足 0²/25 + 3²/9 = 1，且 PF₁ + PF₂ = 5 + 5 = 10 = 2a；同时 a = 5 > c = 4，满足椭圆参数条件。"
    )
  },
  "hjb-high-s5-空间直线与平面": {
    conceptTitle: text("Perpendicularity, projection, and line-plane angle", "垂直、正射影与线面角"),
    conceptContent: text(
      "To prove a line is perpendicular to a plane, it is enough to prove that the line is perpendicular to two intersecting lines in that plane; perpendicularity to only one line is insufficient. The angle between an oblique line and a plane is the acute angle between the line and its orthogonal projection on the plane. Point-to-plane and line-to-plane distances must be measured along a perpendicular segment.",
      "要证明一条直线垂直于一个平面，只需证明该直线垂直于平面内两条相交直线；只垂直于一条直线并不充分。斜线与平面所成的角，是斜线与它在该平面上的正射影所成的锐角。点到平面或直线到平面的距离必须沿垂直线段量取。"
    ),
    workedExampleTitle: text("Find a line-plane angle in a cube", "求正方体中的线面角"),
    workedExampleContent: text(
      "In cube ABCD-A₁B₁C₁D₁ with side length 2, find the angle θ between AC₁ and plane ABCD. Since CC₁ is perpendicular to both intersecting lines BC and CD in plane ABCD, CC₁ ⟂ plane ABCD; therefore AC is the orthogonal projection of AC₁. In right triangle ACC₁, AC = 2√2, CC₁ = 2, and AC₁ = √((2√2)² + 2²) = 2√3. Hence sin θ = CC₁/AC₁ = 1/√3 = √3/3. Answer: θ = arcsin(√3/3). Check: cos θ = AC/AC₁ = √6/3, and sin² θ + cos² θ = 1/3 + 2/3 = 1.",
      "在棱长为 2 的正方体 ABCD-A₁B₁C₁D₁ 中，求直线 AC₁ 与平面 ABCD 所成的角 θ。因为 CC₁ 同时垂直于平面 ABCD 内相交的直线 BC 和 CD，所以 CC₁ ⟂ 平面 ABCD，AC 就是 AC₁ 在该平面上的正射影。在直角三角形 ACC₁ 中，AC = 2√2，CC₁ = 2，AC₁ = √((2√2)² + 2²) = 2√3。因此 sin θ = CC₁/AC₁ = 1/√3 = √3/3。答案：θ = arcsin(√3/3)。检验：cos θ = AC/AC₁ = √6/3，并且 sin² θ + cos² θ = 1/3 + 2/3 = 1。"
    )
  },
  "hjb-high-s6-成对数据的统计分析": {
    conceptTitle: text("Regression describes association, not causation", "回归刻画相关关系而不是因果关系"),
    conceptContent: text(
      "For paired numerical data, inspect the scatterplot before fitting a line. When Sxx > 0, the least-squares line is ŷ = a + bx with b = Sxy/Sxx and a = ȳ − bx̄. The residual e = y − ŷ records vertical prediction error. The correlation coefficient satisfies −1 ≤ r ≤ 1 and measures linear association only; a large |r| does not prove causation, and predictions outside the observed x-range are extrapolations.",
      "分析成对数值数据时，应先观察散点图再拟合直线。当 Sxx > 0 时，最小二乘回归直线为 ŷ = a + bx，其中 b = Sxy/Sxx，a = ȳ − bx̄。残差 e = y − ŷ 表示纵向预测误差。相关系数满足 −1 ≤ r ≤ 1，只刻画线性相关程度；|r| 较大不能证明因果关系，超出已观测 x 范围的预测属于外推。"
    ),
    workedExampleTitle: text("Fit and interpret a least-squares line", "拟合并解释最小二乘回归直线"),
    workedExampleContent: text(
      "For the paired data (1,2), (2,3), (3,5), and (4,6), x̄ = 2.5 and ȳ = 4. The centered sums are Sxx = 5, Sxy = 7, and Syy = 10, so b = 7/5 = 1.4 and a = 4 − 1.4(2.5) = 0.5. Thus ŷ = 0.5 + 1.4x and r = 7/√(5·10) = 7/√50 ≈ 0.990, indicating a strong positive linear association. At x = 5, ŷ = 7.5; for the observed point (3,5), the residual is 5 − 4.7 = 0.3. Answer: the fitted line is ŷ = 0.5 + 1.4x. Check: it passes through (x̄,ȳ) because 0.5 + 1.4(2.5) = 4. Interpretation: the x = 5 prediction is just outside the observed range 1 to 4, so it should be used cautiously and does not establish causation.",
      "对成对数据 (1,2)、(2,3)、(3,5)、(4,6)，有 x̄ = 2.5，ȳ = 4。中心化平方和与乘积和为 Sxx = 5，Sxy = 7，Syy = 10，所以 b = 7/5 = 1.4，a = 4 − 1.4(2.5) = 0.5。因此 ŷ = 0.5 + 1.4x，且 r = 7/√(5·10) = 7/√50 ≈ 0.990，说明存在很强的正线性相关。取 x = 5 时，预测 ŷ = 7.5；对观测点 (3,5)，残差为 5 − 4.7 = 0.3。答案：回归直线为 ŷ = 0.5 + 1.4x。检验：它通过样本中心 (x̄,ȳ)，因为 0.5 + 1.4(2.5) = 4。解释：x = 5 已略超出观测范围 1 到 4，属于外推，应谨慎使用，也不能据此断言因果关系。"
    )
  },
  "hjb-high-s6-概率初步续": {
    conceptTitle: text("Conditional probability, independence, and Bayes' rule", "条件概率、独立性与贝叶斯公式"),
    conceptContent: text(
      "Conditional probability is P(A | B) = P(A ∩ B)/P(B), which requires P(B) > 0. Events A and B are independent exactly when P(A ∩ B) = P(A)P(B); independence is not the same as mutual exclusivity. For a complete partition H₁,...,Hₙ with positive prior probabilities, total probability finds P(E), and Bayes' rule updates each prior P(Hᵢ) to the posterior P(Hᵢ | E).",
      "条件概率 P(A | B) = P(A ∩ B)/P(B) 的前提是 P(B) > 0。事件 A 与 B 独立，当且仅当 P(A ∩ B) = P(A)P(B)；独立不能与互斥混淆。若 H₁,...,Hₙ 构成完备事件组且各先验概率为正，可先用全概率公式求 P(E)，再用贝叶斯公式把 P(Hᵢ) 更新为后验概率 P(Hᵢ | E)。"
    ),
    workedExampleTitle: text("Update a source probability after observing a defect", "观察到次品后更新来源概率"),
    workedExampleContent: text(
      "Machine A makes 60% of a factory's items with a 2% defect rate; machine B makes 40% with a 5% defect rate. Given that a randomly selected item is defective (event D), find P(B | D). By total probability, P(D) = 0.60(0.02) + 0.40(0.05) = 0.012 + 0.020 = 0.032. Bayes' rule gives P(B | D) = 0.40(0.05)/0.032 = 0.020/0.032 = 5/8 = 0.625. Answer: the probability is 62.5%. Check: P(A | D) = 0.012/0.032 = 3/8, and 3/8 + 5/8 = 1. Interpretation: B supplies only 40% of all items but 62.5% of defective items because its defect rate is higher.",
      "机器 A 生产全厂 60% 的产品，次品率为 2%；机器 B 生产 40%，次品率为 5%。已知随机抽到的产品是次品（事件 D），求 P(B | D)。由全概率公式，P(D) = 0.60(0.02) + 0.40(0.05) = 0.012 + 0.020 = 0.032。由贝叶斯公式，P(B | D) = 0.40(0.05)/0.032 = 0.020/0.032 = 5/8 = 0.625。答案：所求概率为 62.5%。检验：P(A | D) = 0.012/0.032 = 3/8，且 3/8 + 5/8 = 1。解释：B 只生产 40% 的产品，却占次品的 62.5%，原因是 B 的次品率较高。"
    )
  },
  "hjb-high-s6-概率统计综合": {
    conceptTitle: text("Check a probability model before calculating", "计算前先检验概率模型条件"),
    conceptContent: text(
      "A binomial model X ~ B(n,p) requires a fixed number n of independent trials, two outcomes per trial, and the same success probability p on every trial. Then P(X = k) = C(n,k)pᵏ(1 − p)ⁿ⁻ᵏ, E(X) = np, and Var(X) = np(1 − p). A model probability describes assumed repeated sampling; it is different from a sample proportion used to estimate an unknown p.",
      "二项分布模型 X ~ B(n,p) 要求试验次数 n 固定、各次试验相互独立、每次只有两种结果，并且成功概率 p 保持不变。此时 P(X = k) = C(n,k)pᵏ(1 − p)ⁿ⁻ᵏ，E(X) = np，Var(X) = np(1 − p)。模型概率描述既定假设下的重复抽样，不能与用来估计未知 p 的样本比例混淆。"
    ),
    workedExampleTitle: text("Use a binomial model and interpret its mean", "使用二项分布并解释均值"),
    workedExampleContent: text(
      "Assume 20 independently produced items each have defect probability 0.10, and let X be the number of defective items. Then X ~ B(20,0.10). The probability of exactly two defects is P(X = 2) = C(20,2)(0.10)²(0.90)¹⁸ ≈ 0.2852. The probability of at least one defect is P(X ≥ 1) = 1 − P(X = 0) = 1 − (0.90)²⁰ ≈ 0.8784. Also E(X) = 20(0.10) = 2 and Var(X) = 20(0.10)(0.90) = 1.8. Answer: P(X = 2) ≈ 0.2852 and P(X ≥ 1) ≈ 0.8784. Check: both probabilities lie in [0,1]. Interpretation: E(X) = 2 is a long-run average over many groups of 20, not a guarantee of exactly two defects in every group.",
      "假设独立生产的 20 件产品中，每件为次品的概率都是 0.10，令 X 表示次品件数，则 X ~ B(20,0.10)。恰有 2 件次品的概率为 P(X = 2) = C(20,2)(0.10)²(0.90)¹⁸ ≈ 0.2852。至少有 1 件次品的概率为 P(X ≥ 1) = 1 − P(X = 0) = 1 − (0.90)²⁰ ≈ 0.8784。另外，E(X) = 20(0.10) = 2，Var(X) = 20(0.10)(0.90) = 1.8。答案：P(X = 2) ≈ 0.2852，P(X ≥ 1) ≈ 0.8784。检验：两个概率都在 [0,1] 内。解释：E(X) = 2 是许多组 20 件产品的长期平均值，并不保证每一组都恰有 2 件次品。"
    )
  },
  "hjb-high-s6-函数-导数与不等式综合": {
    conceptTitle: text("Use derivative signs to control a global inequality", "用导数符号控制整体不等式"),
    conceptContent: text(
      "State the domain before differentiating. On an interval, the sign of f'(x) determines where f increases or decreases; a global inequality can often be proved by defining the difference between its two sides and locating that difference's global minimum, including endpoints or limiting behavior when needed. Never multiply or divide an inequality by an expression before determining its sign.",
      "求导前必须先写出定义域。在一个区间内，f'(x) 的符号决定 f 的增减；证明整体不等式时，可把两边之差定义为新函数，再结合端点或必要的极限寻找全局最小值。未判断一个式子的正负之前，不能直接用它乘或除不等式两边。"
    ),
    workedExampleTitle: text("Prove a logarithmic inequality by a global minimum", "用全局最小值证明对数不等式"),
    workedExampleContent: text(
      "Prove ln x ≤ x − 1 for every x > 0. Define g(x) = x − 1 − ln x on (0,∞). Then g'(x) = 1 − 1/x = (x − 1)/x. Because x > 0, g'(x) < 0 on (0,1), g'(1) = 0, and g'(x) > 0 on (1,∞). Thus g decreases to x = 1 and then increases, so its global minimum is g(1) = 0. Therefore g(x) ≥ 0, which is equivalent to ln x ≤ x − 1, with equality only at x = 1. Answer: the inequality holds for all x > 0. Check: at x = 2, x − 1 − ln x = 1 − ln 2 ≈ 0.307 > 0, consistent with the proof.",
      "证明：对任意 x > 0，都有 ln x ≤ x − 1。在定义域 (0,∞) 上令 g(x) = x − 1 − ln x，则 g'(x) = 1 − 1/x = (x − 1)/x。因为 x > 0，所以在 (0,1) 上 g'(x) < 0，在 x = 1 时 g'(1) = 0，在 (1,∞) 上 g'(x) > 0。因此 g 先减后增，全局最小值为 g(1) = 0。于是 g(x) ≥ 0，即 ln x ≤ x − 1，且仅在 x = 1 时取等号。答案：不等式对所有 x > 0 成立。检验：取 x = 2，有 x − 1 − ln x = 1 − ln 2 ≈ 0.307 > 0，与证明一致。"
    )
  },
  "hjb-high-s6-立体几何与空间向量综合": {
    conceptTitle: text("Translate spatial relations into vector equations", "把空间关系转化为向量方程"),
    conceptContent: text(
      "A line has a nonzero direction vector u, and a plane has a nonzero normal vector n. For the acute line-plane angle θ, sin θ = |u·n|/(|u||n|). Two direction vectors are perpendicular when their dot product is zero, while a line is parallel to a plane when u·n = 0 and the line is not contained in the plane. An intersection point must satisfy both the parametric line equation and the plane equation.",
      "直线有非零方向向量 u，平面有非零法向量 n。对锐角线面角 θ，有 sin θ = |u·n|/(|u||n|)。两个方向向量点积为 0 时相互垂直；若 u·n = 0 且直线不在平面内，则直线与平面平行。求交点时，所得点必须同时满足直线的参数方程和平面方程。"
    ),
    workedExampleTitle: text("Find a line-plane intersection and angle", "求直线与平面的交点和夹角"),
    workedExampleContent: text(
      "Let line l be (x,y,z) = t(2,−1,2), and let plane π be x + 2y − 2z + 3 = 0. The line direction is u = (2,−1,2), and a plane normal is n = (1,2,−2). Substituting the line into π gives 2t + 2(−t) − 2(2t) + 3 = 0, so t = 3/4 and the intersection is Q = (3/2,−3/4,3/2). Since u·n = 2 − 2 − 4 = −4 and |u| = |n| = 3, the acute line-plane angle θ satisfies sin θ = |−4|/(3·3) = 4/9. Answer: Q = (3/2,−3/4,3/2) and θ = arcsin(4/9) ≈ 26.4°. Check: Q satisfies 3/2 + 2(−3/4) − 2(3/2) + 3 = 0 and also has the form t(2,−1,2) with t = 3/4.",
      "设直线 l 的参数方程为 (x,y,z) = t(2,−1,2)，平面 π 为 x + 2y − 2z + 3 = 0。直线方向向量 u = (2,−1,2)，平面的一个法向量 n = (1,2,−2)。把直线方程代入平面方程，得 2t + 2(−t) − 2(2t) + 3 = 0，所以 t = 3/4，交点为 Q = (3/2,−3/4,3/2)。又因为 u·n = 2 − 2 − 4 = −4，且 |u| = |n| = 3，所以锐角线面角 θ 满足 sin θ = |−4|/(3·3) = 4/9。答案：Q = (3/2,−3/4,3/2)，θ = arcsin(4/9) ≈ 26.4°。检验：Q 满足 3/2 + 2(−3/4) − 2(3/2) + 3 = 0，并且在 t = 3/4 时也满足直线参数方程。"
    )
  },
  "hjb-high-s6-数列与计数综合": {
    conceptTitle: text("Use a bijection to count constrained sequences", "用双射计数受限制的数列"),
    conceptContent: text(
      "Before counting a sequence, state whether order matters, whether repetition is allowed, and whether neighboring terms have restrictions. C(n,k) counts unordered selections of k distinct objects; the product rule counts successive independent choices. For a minimum-gap condition, a reversible change of variables can turn constrained increasing terms into an ordinary combination, and the bijection is what prevents omissions or double counting.",
      "计数一个数列前，要先说明顺序是否重要、能否重复以及相邻项是否受限制。C(n,k) 用于从 n 个不同对象中无序选取 k 个，分步独立选择使用乘法原理。遇到最小间隔条件时，可用可逆的变量变换把受限递增数列化为普通组合；证明这种对应是双射，才能保证不遗漏也不重复。"
    ),
    workedExampleTitle: text("Remove a gap restriction before choosing", "先消去间隔限制再作组合"),
    workedExampleContent: text(
      "Count the integer sequences 1 ≤ a₁ < a₂ < a₃ < a₄ ≤ 10 satisfying aᵢ₊₁ − aᵢ ≥ 2. Define bᵢ = aᵢ − (i − 1). Then bᵢ₊₁ − bᵢ = aᵢ₊₁ − aᵢ − 1 ≥ 1, so 1 ≤ b₁ < b₂ < b₃ < b₄ ≤ 7. Conversely, any four distinct increasing values chosen from {1,...,7} give a valid sequence through aᵢ = bᵢ + (i − 1). This is a bijection, so the number of sequences is C(7,4) = 35. Answer: 35 sequences. Check: (b₁,b₂,b₃,b₄) = (1,2,3,4) maps to (a₁,a₂,a₃,a₄) = (1,3,5,7), which has every gap equal to 2; the inverse formula recovers the same b-values, confirming no double counting.",
      "求满足 1 ≤ a₁ < a₂ < a₃ < a₄ ≤ 10 且 aᵢ₊₁ − aᵢ ≥ 2 的整数数列个数。令 bᵢ = aᵢ − (i − 1)，则 bᵢ₊₁ − bᵢ = aᵢ₊₁ − aᵢ − 1 ≥ 1，所以 1 ≤ b₁ < b₂ < b₃ < b₄ ≤ 7。反过来，从 {1,...,7} 中任取 4 个不同的数并按递增排列，再用 aᵢ = bᵢ + (i − 1)，都得到一个符合条件的数列。这是一个双射，因此数列个数为 C(7,4) = 35。答案：共有 35 个数列。检验：(b₁,b₂,b₃,b₄) = (1,2,3,4) 对应 (a₁,a₂,a₃,a₄) = (1,3,5,7)，各相邻项之差都是 2；逆变换又能恢复原来的 b 值，所以没有重复计数。"
    )
  },
  "hjb-high-s6-导数及其运用": {
    conceptTitle: text("Optimize only after translating every constraint", "把全部约束转化后再用导数优化"),
    conceptContent: text(
      "In an optimization problem, define variables and their feasible domain before differentiating. For a differentiable function on an interval, the sign of f'(x) determines increase and decrease; an interior point with f'(x) = 0 is only a candidate, not automatically an extremum. Compare all feasible critical points with included endpoints, or examine limiting boundary behavior when the interval is open. The derivative result must be translated back to the original quantities, units, and geometric constraints. An algebraic identity or direct substitution provides an independent check that the claimed optimum is global rather than merely local.",
      "解决优化问题时，应先定义变量并写出可行域，再求导。函数在区间内可导时，f'(x) 的符号决定增减性；内部点满足 f'(x) = 0 只说明它是候选点，并不自动保证取得极值。若端点属于定义域，要把临界点与端点一起比较；若区间为开区间，则应考察边界趋势。导数结论还必须还原为原问题中的长度、面积、单位和几何约束。最后可用代数恒等变形或直接代入，独立检验所得最优值是全局最优而不是局部结果。"
    ),
    workedExampleTitle: text("Maximize a three-sided rectangular enclosure", "求靠墙长方形围栏的最大面积"),
    workedExampleContent: text(
      "A rectangular enclosure uses a straight wall as one side and 20 m of fencing for the other three sides. Let each side perpendicular to the wall have length x m and the fenced side parallel to the wall have length y m. Then 2x + y = 20, so y = 20 − 2x. Positive lengths require 0 < x < 10. The area is A(x) = xy = x(20 − 2x) = 20x − 2x², and A'(x) = 20 − 4x. Thus A'(x) > 0 for 0 < x < 5 and A'(x) < 0 for 5 < x < 10, so the global maximum occurs at x = 5. Then y = 10 and A = 50. Answer: use two 5 m sides and one 10 m side; the maximum area is 50 m². Check: A(x) = −2(x − 5)² + 50 ≤ 50 for every feasible x, with equality only at x = 5; also A approaches 0 at both boundary limits.",
      "一个长方形围栏以一段直墙作为一边，另外三边共使用 20 m 围栏。设两条垂直于墙的边各长 x m，与墙平行且需要围栏的一边长 y m，则 2x + y = 20，所以 y = 20 − 2x。边长为正要求 0 < x < 10。面积 A(x) = xy = x(20 − 2x) = 20x − 2x²，导数 A'(x) = 20 − 4x。因此在 0 < x < 5 时 A'(x) > 0，在 5 < x < 10 时 A'(x) < 0，故全局最大值在 x = 5 处取得。此时 y = 10，A = 50。答案：两条垂直边各长 5 m，平行边长 10 m，最大面积为 50 m²。检验：A(x) = −2(x − 5)² + 50 ≤ 50，对所有可行的 x 都成立，且仅在 x = 5 时取等号；当 x 趋近两个边界时，面积都趋近 0。"
    )
  },
  "hjb-high-s6-计数原理": {
    conceptTitle: text("Split restricted counts into disjoint cases", "把受限计数拆成互不重叠的情况"),
    conceptContent: text(
      "Use the product rule for successive choices and the addition rule only for disjoint cases. P(n,k) counts ordered selections of k distinct objects, while C(n,k) counts unordered selections; neither formula should be chosen before deciding whether order matters and repetition is allowed. Restrictions such as a leading zero, parity, adjacency, or repeated symbols often require a case split or complementary count. Each case must cover valid objects exactly once. A reliable check is to count a larger unrestricted set and subtract a separately counted complement, then compare the two independent totals.",
      "分步选择使用乘法原理，分类相加时各类必须互不重叠。P(n,k) 计算从 n 个不同对象中有序选取 k 个的数量，C(n,k) 计算无序选取；在判断顺序是否重要、能否重复之前，不能直接套用公式。首位不能为 0、奇偶性、相邻限制或重复限制，通常需要分类讨论或使用补集计数。每一种情况都必须恰好覆盖一部分有效对象，既不能遗漏也不能重复。可靠的复核方法是先数一个较大的无约束集合，再减去独立计算的补集，并比较两种计数结果。"
    ),
    workedExampleTitle: text("Count distinct-digit five-digit even numbers", "计算各位数字互异的五位偶数"),
    workedExampleContent: text(
      "Using digits {0,1,2,3,4,5,6} without repetition, how many five-digit even numbers can be formed? Split by the final digit. If the final digit is 0, the first digit has 6 choices and the middle three positions have P(5,3) = 5·4·3 = 60 arrangements, giving 6·60 = 360. If the final digit is 2, 4, or 6, it has 3 choices; after fixing it, the first digit has 5 nonzero choices, and the middle positions again have P(5,3) = 60 arrangements. This gives 3·5·60 = 900. The cases are disjoint, so the total is 360 + 900 = 1260. Answer: 1260 five-digit even numbers. Check: all distinct-digit five-digit numbers total 6·P(6,4) = 6·360 = 2160. Those ending in 1, 3, or 5 total 3·5·60 = 900, so the complementary even count is 2160 − 900 = 1260.",
      "用数字 {0,1,2,3,4,5,6} 组成各位数字不重复的五位偶数，共有多少个？按个位数字分类。若个位为 0，首位有 6 种选择，中间三位有 P(5,3) = 5·4·3 = 60 种排列，共 6·60 = 360 个。若个位为 2、4 或 6，个位有 3 种选择；固定个位后，首位有 5 种非零选择，中间三位仍有 P(5,3) = 60 种排列，共 3·5·60 = 900 个。两类互不重叠，所以总数为 360 + 900 = 1260。答案：共有 1260 个五位偶数。检验：所有各位互异的五位数共有 6·P(6,4) = 6·360 = 2160 个；以 1、3、5 结尾的奇数共有 3·5·60 = 900 个，因此用补集得到偶数个数 2160 − 900 = 1260。"
    )
  },
  "hjb-high-s6-解析几何直线综合复习": {
    conceptTitle: text("Coordinate intersections, perpendicularity, and distance together", "综合使用交点、垂直与距离条件"),
    conceptContent: text(
      "A line problem may combine several conditions, so satisfy them in a controlled order. Solve simultaneous line equations to locate a required intersection. For Ax + By + C = 0, the normal vector is (A,B) and a direction vector is (B,−A); two lines are perpendicular when their direction vectors have zero dot product. A line through a known point is then fixed by its direction or normal. Finally, the distance from (x₀,y₀) to Ax + By + C = 0 is |Ax₀ + By₀ + C|/√(A² + B²), provided (A,B) ≠ (0,0). Verify both the incidence condition and the intended parallel or perpendicular relation.",
      "解析几何中的直线问题常把多个条件组合在一起，因此应按顺序处理。先联立直线方程求出指定交点；对 Ax + By + C = 0，法向量为 (A,B)，方向向量可取 (B,−A)，两条直线的方向向量点积为 0 时互相垂直。确定已知点与方向或法向量后，所求直线就唯一确定。最后，点 (x₀,y₀) 到直线 Ax + By + C = 0 的距离为 |Ax₀ + By₀ + C|/√(A² + B²)，前提是 (A,B) ≠ (0,0)。结果必须同时检验点在线上以及平行或垂直关系。"
    ),
    workedExampleTitle: text("Construct a perpendicular line through an intersection", "过两线交点作垂线并求距离"),
    workedExampleContent: text(
      "Let I be the intersection of r: x + y − 1 = 0 and s: 2x − y − 4 = 0. Find the line l through I that is perpendicular to m: 3x + 4y − 7 = 0, and find the distance from the origin to l. Adding the equations for r and s gives 3x − 5 = 0, so I = (5/3,−2/3). A normal to m is (3,4), so a line perpendicular to m has direction (3,4) and may use normal (4,−3). Write l as 4x − 3y + C = 0. Substituting I gives 20/3 + 2 + C = 0, so C = −26/3 and l is 12x − 9y − 26 = 0. Its distance from the origin is 26/√(12² + (−9)²) = 26/15. Answer: l: 12x − 9y − 26 = 0, and the distance is 26/15. Check: I satisfies r, s, and l; a direction of l is (9,12) = 3(3,4), parallel to m's normal, so l ⟂ m.",
      "设 I 是直线 r: x + y − 1 = 0 与 s: 2x − y − 4 = 0 的交点。求过 I 且垂直于 m: 3x + 4y − 7 = 0 的直线 l，并求原点到 l 的距离。把 r、s 两式相加，得 3x − 5 = 0，所以 I = (5/3,−2/3)。m 的法向量为 (3,4)，因此垂直于 m 的直线可取方向向量 (3,4)，相应法向量可取 (4,−3)。设 l 为 4x − 3y + C = 0，代入 I 得 20/3 + 2 + C = 0，所以 C = −26/3，即 l: 12x − 9y − 26 = 0。原点到 l 的距离为 26/√(12² + (−9)²) = 26/15。答案：l: 12x − 9y − 26 = 0，距离为 26/15。检验：I 同时满足 r、s、l；l 的方向向量 (9,12) = 3(3,4)，与 m 的法向量平行，所以 l ⟂ m。"
    )
  },
  "hjb-high-s6-空间向量综合复习": {
    conceptTitle: text("Find the common perpendicular between skew lines", "用公垂线求异面直线距离"),
    conceptContent: text(
      "Write each spatial line in parametric vector form before comparing them. Nonparallel lines that do not intersect are skew. For points P(s) and Q(t) on two skew lines with direction vectors u and v, the shortest joining segment has vector w = Q(t) − P(s) perpendicular to both directions, so solve w·u = 0 and w·v = 0 for the parameters. This method requires nonparallel directions; parallel lines need a separate point-to-line or point-to-plane construction. After solving, check that P and Q lie on their stated lines and that both dot products are zero before taking |w| as the distance.",
      "比较空间直线前，应先把每条直线写成参数向量形式。不平行且不相交的两条直线是异面直线。若 P(s)、Q(t) 分别在两条异面直线上，方向向量为 u、v，则最短连线向量 w = Q(t) − P(s) 必须同时垂直于 u、v，因此可联立 w·u = 0、w·v = 0 求参数。这个方法要求两个方向不平行；若直线平行，则要另用点线距离或点面关系处理。求解后必须确认 P、Q 分别在原直线上，并检验两个点积都为 0，才能把 |w| 作为异面直线距离。"
    ),
    workedExampleTitle: text("Solve for the shortest connector of two skew lines", "求两条异面直线的最短连线"),
    workedExampleContent: text(
      "Let l₁ be P(s) = (s,0,s) with direction u = (1,0,1), and let l₂ be Q(t) = (0,1 + t,t) with direction v = (0,1,1). The directions are not parallel, and the line equations have no common point, so the lines are skew. Set w = Q − P = (−s,1 + t,t − s). The common perpendicular conditions are w·u = t − 2s = 0 and w·v = 1 + 2t − s = 0. From t = 2s, the second equation gives 1 + 3s = 0, so s = −1/3 and t = −2/3. Hence P = (−1/3,0,−1/3), Q = (0,1/3,−2/3), and w = (1/3,1/3,−1/3). Answer: the distance is |w| = √(1/9 + 1/9 + 1/9) = √3/3. Check: w·u = 1/3 − 1/3 = 0 and w·v = 1/3 − 1/3 = 0, so this connector is perpendicular to both lines.",
      "设直线 l₁ 上的点为 P(s) = (s,0,s)，方向向量 u = (1,0,1)；直线 l₂ 上的点为 Q(t) = (0,1 + t,t)，方向向量 v = (0,1,1)。两个方向不平行，且两直线方程没有公共点，所以它们是异面直线。令 w = Q − P = (−s,1 + t,t − s)。公垂线条件为 w·u = t − 2s = 0，w·v = 1 + 2t − s = 0。由 t = 2s，第二式化为 1 + 3s = 0，所以 s = −1/3，t = −2/3。因此 P = (−1/3,0,−1/3)，Q = (0,1/3,−2/3)，w = (1/3,1/3,−1/3)。答案：两异面直线的距离为 |w| = √(1/9 + 1/9 + 1/9) = √3/3。检验：w·u = 1/3 − 1/3 = 0，w·v = 1/3 − 1/3 = 0，所以这条连线同时垂直于两条直线。"
    )
  },
  "hjb-high-s6-三角-向量与解析几何综合": {
    conceptTitle: text("Move consistently between triangles, vectors, and line equations", "在三角形、向量与直线方程之间一致转换"),
    conceptContent: text(
      "For coordinate points A, B, and C, form vectors AB and AC before using trigonometry. Their dot product gives cos A = (AB·AC)/(|AB||AC|), while the absolute two-dimensional determinant gives both sin A = |det(AB,AC)|/(|AB||AC|) and triangle area |det(AB,AC)|/2. A side line can be written in general form, and the opposite altitude follows from the point-to-line distance formula. Preserve absolute values for unsigned area and distance, and state nondegeneracy when dividing by side lengths. Independent area calculations using two different bases are a strong consistency check.",
      "对平面坐标点 A、B、C，应先写出向量 AB、AC，再使用三角公式。点积给出 cos A = (AB·AC)/(|AB||AC|)；二维行列式的绝对值既给出 sin A = |det(AB,AC)|/(|AB||AC|)，也给出三角形面积 |det(AB,AC)|/2。把一条边写成直线的一般式后，可用点线距离公式求对应高。无向面积和距离必须保留绝对值；除以边长前还要说明三角形非退化。用不同底边分别计算面积，是检验三角、向量与解析几何结果是否一致的有效方法。"
    ),
    workedExampleTitle: text("Find an angle, area, and altitude from coordinates", "由坐标求角、面积与高"),
    workedExampleContent: text(
      "Let A = (0,0), B = (4,0), and C = (1,3). Find angle A, the area of triangle ABC, and the distance from A to line BC. We have AB = (4,0) and AC = (1,3). Thus AB·AC = 4, |AB| = 4, |AC| = √10, so cos A = 1/√10. Also det(AB,AC) = 4·3 − 0·1 = 12, hence sin A = 12/(4√10) = 3/√10 and the area is 12/2 = 6. Line BC through (4,0) and (1,3) is x + y − 4 = 0, so the distance from A is |−4|/√(1² + 1²) = 2√2. Answer: A = arccos(1/√10), area = 6 square units, and the altitude from A to BC is 2√2. Check: sin²A + cos²A = 9/10 + 1/10 = 1. Moreover |BC| = 3√2, so (1/2)(3√2)(2√2) = 6, confirming the area independently.",
      "设 A = (0,0)、B = (4,0)、C = (1,3)。求角 A、三角形 ABC 的面积以及点 A 到直线 BC 的距离。AB = (4,0)，AC = (1,3)，所以 AB·AC = 4，|AB| = 4，|AC| = √10，从而 cos A = 1/√10。又有 det(AB,AC) = 4·3 − 0·1 = 12，因此 sin A = 12/(4√10) = 3/√10，面积为 12/2 = 6。过点 (4,0)、(1,3) 的直线 BC 为 x + y − 4 = 0，所以 A 到 BC 的距离为 |−4|/√(1² + 1²) = 2√2。答案：A = arccos(1/√10)，面积为 6 平方单位，A 到 BC 的高为 2√2。检验：sin²A + cos²A = 9/10 + 1/10 = 1；另外 |BC| = 3√2，所以 (1/2)(3√2)(2√2) = 6，独立确认了面积。"
    )
  },
  "hjb-high-s6-数列综合复习": {
    conceptTitle: text("Expose cancellation before summing a sequence", "求和前先寻找裂项相消结构"),
    conceptContent: text(
      "Before applying an arithmetic or geometric sum formula, inspect the term structure. A rational term may split into consecutive differences, causing interior terms of a partial sum to cancel. Write several terms explicitly to verify the decomposition and preserve the starting index. After obtaining Sₙ, check n = 1 and one additional small value. When solving a threshold condition involving Sₙ, keep the domain n ∈ N* and distinguish strict from non-strict inequalities; the least integer must satisfy the target while the preceding integer fails it.",
      "求数列的和之前，不应先入为主地套用等差或等比公式，而要先观察通项结构。有理式通项有时可裂成相邻两项之差，使部分和的中间项相消。应先展开若干项，检验裂项公式并保留正确的起始下标。得到 Sₙ 后，要代入 n = 1 和另一个较小整数进行复核。解关于 Sₙ 的阈值条件时，还必须保留 n ∈ N*，并区分严格不等式与非严格不等式；最小整数既要满足目标，前一个整数又必须不满足。"
    ),
    workedExampleTitle: text("Use telescoping to find a threshold index", "用裂项相消求达到阈值的最小下标"),
    workedExampleContent: text(
      "Let aₙ = 1/[n(n + 1)] for n ≥ 1 and Sₙ = a₁ + ··· + aₙ. Find Sₙ and the least positive integer n for which Sₙ > 0.95. Since 1/[k(k + 1)] = 1/k − 1/(k + 1), the partial sum telescopes: Sₙ = (1 − 1/2) + (1/2 − 1/3) + ··· + (1/n − 1/(n + 1)) = 1 − 1/(n + 1) = n/(n + 1). Because n + 1 > 0, the condition n/(n + 1) > 19/20 is equivalent to 20n > 19n + 19, so n > 19. Answer: Sₙ = n/(n + 1), and the least n is 20. Check: S₂₀ = 20/21 ≈ 0.95238 > 0.95, while S₁₉ = 19/20 = 0.95 is not strictly greater; therefore 20 is minimal.",
      "设 aₙ = 1/[n(n + 1)]（n ≥ 1），Sₙ = a₁ + ··· + aₙ。求 Sₙ，并求使 Sₙ > 0.95 的最小正整数 n。因为 1/[k(k + 1)] = 1/k − 1/(k + 1)，所以部分和发生裂项相消：Sₙ = (1 − 1/2) + (1/2 − 1/3) + ··· + (1/n − 1/(n + 1)) = 1 − 1/(n + 1) = n/(n + 1)。由于 n + 1 > 0，不等式 n/(n + 1) > 19/20 等价于 20n > 19n + 19，因此 n > 19。答案：Sₙ = n/(n + 1)，最小的 n 为 20。检验：S₂₀ = 20/21 ≈ 0.95238 > 0.95，而 S₁₉ = 19/20 = 0.95，并没有严格大于 0.95，所以 20 确实是最小值。"
    )
  },
  "hjb-high-s6-圆锥曲线综合复习": {
    conceptTitle: text("Verify a conic tangent by a repeated intersection", "用重交点检验圆锥曲线切线"),
    conceptContent: text(
      "A conic's standard equation encodes its geometric parameters. For y² = 4px with p > 0, the focus is (p,0) and the directrix is x = −p. At a regular point, implicit differentiation can provide a candidate tangent slope, but division by a coordinate must respect where that coordinate is nonzero. A genuine tangent can be checked algebraically: substitute its line equation into the conic and confirm that the intersection equation has a repeated root at the stated point. The focus-directrix distance condition and point substitution supply independent checks of the conic itself.",
      "圆锥曲线的标准方程包含其几何参数。对 y² = 4px（p > 0），焦点为 (p,0)，准线为 x = −p。在正则点处，可用隐函数求导得到候选切线斜率，但除以某个坐标前必须确认该坐标不为 0。检验一条直线是否真为切线时，可把直线方程代入圆锥曲线，确认所得交点方程在指定点出现重根。焦点与准线的等距条件以及代点检验，还可从几何和代数两个角度独立复核圆锥曲线。"
    ),
    workedExampleTitle: text("Find and verify a tangent to a parabola", "求抛物线切线并作双重检验"),
    workedExampleContent: text(
      "For the parabola y² = 4x, identify the focus and directrix, then find the tangent at P = (1,2). Comparing with y² = 4px gives p = 1, so the focus is F = (1,0) and the directrix is x = −1. The point lies on the parabola because 2² = 4(1). Implicit differentiation gives 2y·y' = 4, hence y' = 2/y; at P, y' = 1. The tangent is y − 2 = x − 1, or y = x + 1. Answer: F = (1,0), directrix x = −1, and tangent y = x + 1. Check: PF = 2 and the distance from P to x = −1 is also 2. Substituting y = x + 1 into y² = 4x gives (x + 1)² = 4x, or (x − 1)² = 0, a repeated root at x = 1; therefore the line is tangent at P.",
      "对抛物线 y² = 4x，先确定焦点和准线，再求点 P = (1,2) 处的切线。与 y² = 4px 比较得 p = 1，所以焦点 F = (1,0)，准线为 x = −1。因为 2² = 4(1)，点 P 在抛物线上。隐函数求导得 2y·y' = 4，因此 y' = 2/y；在 P 处，y' = 1。切线方程为 y − 2 = x − 1，即 y = x + 1。答案：焦点 F = (1,0)，准线 x = −1，切线 y = x + 1。检验：PF = 2，点 P 到准线 x = −1 的距离也为 2。再把 y = x + 1 代入 y² = 4x，得 (x + 1)² = 4x，即 (x − 1)² = 0，在 x = 1 处出现重根，所以该直线确为 P 点处的切线。"
    )
  }
};

const approvedBatchPriority: Record<string, number> = {
  "hjb-v4-remediated": 0,
  "hjb-v3-remediated": 1,
  "hjb-v2": 2,
  "hjb-v1": 3
};

function questionIdSort(left: Question, right: Question) {
  const leftPriority = approvedBatchPriority[mainlandHjbHighQuestionGenerationMetadata[left.id]?.batch ?? ""] ?? 99;
  const rightPriority = approvedBatchPriority[mainlandHjbHighQuestionGenerationMetadata[right.id]?.batch ?? ""] ?? 99;
  return leftPriority - rightPriority || left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandHjbHighQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
  const picked = new Set<string>();

  practiceDifficultyQuotas.forEach(([difficulty, quota]) => {
    topicQuestions
      .filter((question) => question.difficulty === difficulty)
      .slice(0, quota)
      .forEach((question) => picked.add(question.id));
  });
  topicQuestions.forEach((question) => {
    if (picked.size < 8) picked.add(question.id);
  });

  return Array.from(picked).slice(0, 8);
}

function optionList(question: Question | undefined, language: "en" | "zh" | "zhHans") {
  if (!question?.options?.length) return "";
  const prompt = question.prompt[language] ?? question.prompt.zh;
  if (/(?:^|\n)\s*A[.．、]/u.test(prompt)) return "";
  const labels = ["A", "B", "C", "D", "E", "F"];
  return question.options.map((option, index) => `${labels[index]}. ${option[language] ?? option.zh}`).join(" ");
}

function lessonBlocks(topic: Topic): ProductionLessonBlock[] {
  const metadata = mainlandHjbHighTopicMetadata[topic.id];
  const depthOverride = hjbHighLessonDepthOverrides[topic.id];
  const volumeEn = formatHjbHighVolumeTitleEn(metadata.volume);
  const sampleQuestion = mainlandHjbHighQuestions.find((question) => question.topicId === topic.id);
  const samplePromptZhHans = sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh;
  const samplePromptEn = sampleQuestion?.prompt.en ?? localizeHjbGeneratedText(samplePromptZhHans).en;
  const samplePromptZh = sampleQuestion?.prompt.zh ?? toTraditionalHjbText(samplePromptZhHans);
  const sampleAnswer = sampleQuestion?.answer ?? "见课堂检查点";
  const sampleAnswerLocalized = localizeHjbGeneratedText(sampleAnswer);
  const sampleExplanationZhHans = sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先确认条件，再完成推理和复核。";
  const sampleExplanationEn = sampleQuestion?.explanation.en ?? localizeHjbGeneratedText(sampleExplanationZhHans).en;
  const sampleExplanationZh = sampleQuestion?.explanation.zh ?? toTraditionalHjbText(sampleExplanationZhHans);
  const sampleOptionsEn = optionList(sampleQuestion, "en");
  const sampleOptionsZh = optionList(sampleQuestion, "zh");
  const sampleOptionsZhHans = optionList(sampleQuestion, "zhHans");

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: depthOverride?.conceptTitle ?? text("Core concept", "核心概念"),
      content: depthOverride?.conceptContent ?? text(
        `In ${volumeEn}, study ${topic.title.en} by connecting its definitions or rules with suitable representations, a clear reasoning chain, and a final check of the conditions.`,
        `本课围绕《${topic.title.zhHans ?? topic.title.zh}》学习：先确认定义或规则，再连接合适的表示方法、关键推理和条件检验。`
      )
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: depthOverride?.workedExampleTitle ?? text("Original worked example", "原创例题精讲"),
      content: depthOverride?.workedExampleContent ?? {
        en: `${samplePromptEn}${sampleOptionsEn ? ` Options: ${sampleOptionsEn}` : ""} Answer: ${joinWorkedExampleAnswerAndExplanation(sampleAnswerLocalized.en, sampleExplanationEn, "en")}`,
        zh: `${samplePromptZh}${sampleOptionsZh ? ` 選項：${sampleOptionsZh}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswerLocalized.zh, sampleExplanationZh, "zh")}`,
        zhHans: `${samplePromptZhHans}${sampleOptionsZhHans ? ` 选项：${sampleOptionsZhHans}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswer, sampleExplanationZhHans, "zhHans")}`
      }
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("State the definition or rule being used.", "说出正在使用的定义或规则。"),
        text("Write the key intermediate step before final calculation.", "最终计算前写出关键中间步骤。"),
        text("Check the result against the question conditions.", "用题设条件复核结果。"),
        text("Explain why the final result satisfies every condition in the question.", "说明最终结果为什么满足题目中的每个条件。")
      ]
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: text("Strategy and extension", "考试策略与拓展"),
      items: [
        text("Solve one checkpoint again with a different representation.", "任选一道检查题，换一种表示方式再做一遍。"),
        text("Record one likely misconception before submitting.", "提交前记录一个容易出错的点。")
      ]
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: text("Teacher guide", "教师使用建议"),
      content: text(
        `Use the five-question checkpoint shown on this lesson page to identify readiness for more independent work on ${topic.title.en}.`,
        `先用本课页面显示的五道课堂检查题了解学生对《${topic.title.zhHans ?? topic.title.zh}》的掌握情况，再按需要安排独立练习。`
      ),
      items: [
        text("Ask students to name the rule before calculation.", "计算前先让学生说出所用规则。"),
        text("Compare one incorrect answer with the checklist.", "用检查清单复盘一个错误答案。"),
        text("Choose follow-up questions that match the same unit, grade, and learning goal.", "后续练习应与本单元、年级和学习目标一致。")
      ]
    }
  ];
}

function toProductionLessonSeed(topic: Topic): ProductionLessonSeed {
  return {
    topicId: topic.id,
    productionReady: true,
    title: topic.title,
    description: topic.description,
    estimatedMinutes: topic.minutes,
    practiceQuestionIds: selectPracticeQuestionIds(topic.id),
    blocks: lessonBlocks(topic)
  };
}

export const mainlandHjbHighLessonSeeds: ProductionLessonSeed[] = mainlandHjbHighTopics.map(toProductionLessonSeed);
