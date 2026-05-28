# DeepSeek V4 Pro Full RAG QA - Mainland BNU High V1 Candidate

- Date: 2026-05-28
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Stage A rows: 1500
- Stage B rows: 1500
- Stage C adjudication rows: 462
- Status counts: pass 1068, fail 405, warn 27
- Severity counts: none 1078, blocker 394, major 11, minor 17
- Solvable counts: pass 1414, fail 86
- Answer-match counts: pass 1118, fail 382
- Explanation-match counts: pass 1075, fail 394, weak 31
- MC uniqueness counts: pass 455, not_applicable 979, fail 65, not_checkable 1
- Issue tag counts: math_error 357, answer_mismatch 294, explanation_contradiction 395, unsolvable 63, ambiguous_mc 45, bad_options 39, missing_condition 24, rag_fit_issue 1, accepted_answer_gap 11
- Token usage by stage: stage-a prompt 1933628, completion 273692, total 2207320; stage-b prompt 2385340, completion 202554, total 2587894; stage-c prompt 1078471, completion 130952, total 1209423

## Baseline

- Existing combined DeepSeek baseline reviewed 1500 rows.
- Baseline status counts: pass 1220, fail 266, warn 14.
- This full-RAG run separates Stage A blind solvability, Stage B answer/explanation comparison, and Stage C adjudication into separate cached records.

## QA Gate Result

DeepSeek full-RAG gate is not clear. 405 row(s) remain in the remediation queue and must be adjudicated or regenerated before manual sampling/product promotion.

## Local/Baseline Comparison

- Local remediation rows: 107
- Full-RAG issue rows: 432
- Local-only rows: 18
- Full-RAG-only vs local rows: 343
- Baseline issue rows: 280
- Baseline-only rows: 10
- Full-RAG-only vs baseline rows: 162
- Disagreement CSV: `local-vs-deepseek-disagreements.csv`

## Issue Preview

| ID | Grade | Type | Status | Severity | Source | Solvable/Answer/Explanation/MC | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bnu-high-ds-v1-s4-004` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, answer_mismatch, explanation_contradiction | 题目可解，p的解集为[1,3]，q的解集为[2,3]，p是q的真子集，故p⇒q但q⇏p，p是q的充分不必要条件。存储答案“充要条件”错误，解析虽指出p不是q的子集、q是p的子集，却错误推断为必要不充分，且与存储答案矛盾。正确选项为“充分不必要条件”。 |
| `bnu-high-ds-v1-s4-009` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 不等式 2^{x²-3x} > 1/8 等价于 x²-3x > -3，即 x²-3x+3 > 0，判别式 Δ = -3 < 0，恒成立，解集为 R，区间表示为 (-∞, +∞)。存储答案 (-∞, 1) ∪ (2, +∞) 错误，解析虽正确推导出 R 但与答案矛盾，属于严重数学错误。 |
| `bnu-high-ds-v1-s4-012` | S4 | fill-in | fail | blocker | stage-c | fail/fail/fail/not_applicable | math_error, explanation_contradiction, unsolvable | 命题 p：|x-a|<1 ⇒ a-1<x<a+1；命题 q：x²-3x+2<0 ⇒ 1<x<2。若 p 是 q 的充分不必要条件，则 p⇒q 且 q⇏p，即 (a-1, a+1) 是 (1,2) 的真子集。需满足 a-1≥1 且 a+1≤2，且等号不能同时成立，解得 a≥2 且 a≤1，矛盾，无解。存储答案 [2,3] 错误，解析推导与答案矛盾，题目条件导致无解，属于数学错误。 |
| `bnu-high-ds-v1-s4-014` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 不等式组解集应为 [-2, 2]，存储答案 [-2, 4) 错误，解析虽指出正确解集但与答案矛盾，构成严重错误。 |
| `bnu-high-ds-v1-s4-019` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | ambiguous_mc, bad_options, explanation_contradiction | 单选题存在两个正确选项：A ∈ B 和 {1} ∈ B 均正确，解析也承认 {1} ∈ B 正确，但答案仅选 A，导致多解，题目不可用。 |
| `bnu-high-ds-v1-s4-020` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | p: |x-1|≤2 解得 -1≤x≤3；q: x²-2x-3≤0 解得 -1≤x≤3。解集相同，p⇔q，应为充要条件。存储答案为“充分不必要条件”，解析虽指出错误但未修正答案，存在数学错误和答案矛盾。 |
| `bnu-high-ds-v1-s4-024` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | answer_mismatch, explanation_contradiction | 题目可解，符合预备知识范围。独立求解得 a=-1, b=1, a+b=0。存储答案为-1，与正确结果0不符；解析过程得出0但最终答案错误，存在答案不匹配和解释矛盾。 |
| `bnu-high-ds-v1-s4-032` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立解为-14。存储答案-10错误，解析中计算过程得出a=-12,b=-2，a+b=-14，但最终答案写为-10，自相矛盾。 |
| `bnu-high-ds-v1-s4-033` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合预备知识范围。独立求解得交集为[-1,2]，但存储答案[-1,5)错误，且解析中A=[-1,2]、B=(-1,5)却得出交集(-1,2]，自相矛盾，属于严重数学错误。 |
| `bnu-high-ds-v1-s4-041` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 函数为偶函数，x≥0时f(x)=x^2-2x，递增区间为[1,+∞)；由对称性，x<0时f(x)=x^2+2x，递增区间为[-1,0]。存储答案(-∞,-1]错误，解析中x≤-1递增的推理错误。正确答案为[-1,0]和[1,+∞)。 |
| `bnu-high-ds-v1-s4-043` | S4 | multiple-choice | fail | major | stage-c | pass/pass/fail/pass | explanation_contradiction | 题目可解，选项唯一，答案匹配。但解析中 x>0 时递增区间描述为 (0,2]，与正确答案 [2,+∞) 矛盾，属于解析错误。 |
| `bnu-high-ds-v1-s4-044` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目可解，符合北师大版函数章节。独立求解得 a=-1 或 a=3，但存储答案为 a=-3 或 a=3，且解析错误地认为 f(-3)=-3，实际 f(-3)=3。答案与解析均错误，须修正。 |
| `bnu-high-ds-v1-s4-045` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 函数 f(x)=(x+1)/(x-2)=1+3/(x-2) 在 [3,5] 上单调递减，值域为 [f(5), f(3)]=[4/3, 4]，m+M=16/3。存储答案 10 错误，解析中 f(5)=2 计算错误，应为 4/3。 |
| `bnu-high-ds-v1-s4-047` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目要求分段函数在R上单调递减。x≤1时f(x)=-x²+2x=-(x-1)²+1，在(-∞,1]上递减。x>1时f(x)=ax+b，需a<0。整体递减还需f(1)≥右极限，即1≥a+b。由递减性，右段斜率a必须≤左段在x=1处的导数（-2），故a≤-2。存储答案a≤-1错误，解析未正确推导a≤-2，且未考虑导数条件，导致答案与正确解矛盾。 |
| `bnu-high-ds-v1-s4-049` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, explanation_contradiction | 存储答案(0,4)错误，正确解集为(0,2)∪(2,4)。解析中合并区间时遗漏x=2处f(2)=0不满足不等式，导致解集错误。 |
| `bnu-high-ds-v1-s4-055` | S4 | multiple-choice | fail | major | stage-c | pass/pass/fail/pass | explanation_contradiction | 题目可解，答案(1/3,1)正确且唯一。解析中先解得m<1/3或m>1，后称检验得(1/3,1)，前后矛盾且未给出正确推导过程，易误导学生。 |
| `bnu-high-ds-v1-s4-056` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，正确解为f(x)=x²，f(-3)=9。存储答案15错误，解析过程混乱且最终结果与正确解矛盾，属于严重数学错误。 |
| `bnu-high-ds-v1-s4-057` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，由奇函数得 a=c=0，代入 f(1)=2 得 b=1，f(2)=10 验证一致，故 a+b+c=1。存储答案 0 错误，解析自相矛盾且最终给出错误答案。 |
| `bnu-high-ds-v1-s4-058` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | bad_options, unsolvable, explanation_contradiction | 四个选项均不满足既是偶函数又在(0,+∞)单调递增：A偶但递减；B偶但递减；C定义域不含0，非偶函数；D非奇非偶。题目无正确选项，不可解。存储答案选C，但C非偶函数，解析也承认无正确选项，自相矛盾。 |
| `bnu-high-ds-v1-s4-060` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立求解得 f(2024)=2024^2-2024+1，与存储答案 2023×2024+1 不等价。解析中累加过程错误，且与题目递推关系不符，属严重数学错误。 |
| `bnu-high-ds-v1-s4-061` | S4 | multiple-choice | warn | minor | stage-c | pass/pass/weak/pass | explanation_contradiction | 题目可解，符合教材范围。f(x)=x^3-3x是奇函数，选项C正确。解析中提及值域为R正确，但未明确说明该选项为何不选，可能引起混淆，但未影响答案唯一性。 |
| `bnu-high-ds-v1-s4-067` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | ambiguous_mc, answer_mismatch, explanation_contradiction | 函数 f(x)=x+1/x 定义域为 {x|x≠0}，关于原点对称，且 f(-x)=-f(x)，故 A 正确；由均值不等式得值域为 (-∞,-2]∪[2,+∞)，故 C 正确。单选题出现两个正确选项，违反唯一性原则。存储答案选 A，但解析承认 C 正确却选 A，自相矛盾。题目不可解。 |
| `bnu-high-ds-v1-s4-071` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 存储答案定义域错误地排除了 x=3，应为 (-∞,1] ∪ [3,+∞)；解析中称 1/(x-2) 在 (3,+∞) 上递增，实际为递减，单调性理由不成立。 |
| `bnu-high-ds-v1-s4-072` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目可解，符合北师大函数性质要求。独立求解得唯一解 a=3，存储答案“3 或 -1”错误，a=-1 代入不满足 f(a)=3。解析中 a<0 时方程 - (a²+2a)=3 解得 a=-1 有误，实际该方程无实数解。答案与解析均存在数学错误，须修正为 a=3。 |
| `bnu-high-ds-v1-s4-080` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合教材范围。独立求解得a=2,b=0，不等式解为x>log₂3。存储答案解集为(1,+∞)，与正确解不符；解析中虽得出x>log₂3，但最终答案错误，存在数学错误和答案矛盾。 |
| `bnu-high-ds-v1-s4-089` | S4 | short-answer | fail | major | stage-c | pass/fail/pass/not_applicable | answer_mismatch | 题目可解，独立求解得约13.51年，但存储答案为14，两者不一致。解析正确但答案取整未说明，导致答案不匹配。 |
| `bnu-high-ds-v1-s4-091` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, explanation_contradiction | 题目可解，由 f(m)<0 直接解得 m<log₂3-1，对应选项A。存储答案为选项B，解析中反函数推导有误且与答案矛盾，属于严重错误。 |
| `bnu-high-ds-v1-s4-092` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合北师大版指数函数应用。独立求解得总天数为70/3天，但存储答案为70，解析中计算过程矛盾且最终答案错误，属于严重错误。 |
| `bnu-high-ds-v1-s4-094` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, answer_mismatch, explanation_contradiction | 函数 f(x)=(1/3)^(x^2-2x) 的底数 1/3∈(0,1)，外层递减，故 f 的单调性与内层 u=x^2-2x 相反。u 在 (-∞,1] 递减，在 [1,+∞) 递增，因此 f 在 (-∞,1] 递增，在 [1,+∞) 递减。单调递增区间为 (-∞,1]，对应选项 A。存储答案为 B，解析中结论与推导矛盾，属于数学错误和答案不匹配。 |
| `bnu-high-ds-v1-s4-098` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合北师大版指数函数与定义域值域要求。独立求解得定义域[-1,3]，值域[1/8,1]。存储答案值域[1/4,1]错误，解析中(1/2)^2=1/4计算错误，应为1/8，导致答案与解析均错，属严重数学错误。 |
| `bnu-high-ds-v1-s4-108` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立求解得 x∈[-1-√7, -1+√7]。存储答案 [-2,3] 错误，解析中正确解得 -1-√7≤x≤-1+√7 却得出 [-2,3]，自相矛盾。 |
| `bnu-high-ds-v1-s4-111` | S4 | fill-in | fail | blocker | stage-c | fail/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction, unsolvable | 真数 x²-2x+2=(x-1)²+1≥1，无法取遍所有正实数，故无论 a 取何正值且 a≠1，值域均非 R，满足条件的 a 不存在。存储答案“(0,1)∪(1,+∞)”错误，解析虽指出值域非 R 却给出空集，但存储答案仍为错误范围，题目条件无法满足，应判为不可解。 |
| `bnu-high-ds-v1-s4-120` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目要求函数在[0,1]上是减函数，需同时满足单调性和定义域。真数2-ax>0在[0,1]恒成立，得a<2；但a=2时，x=1处真数为0，不在定义域内，故a≠2。由复合函数单调性得a>1。正确取值范围为1<a≤2。存储答案(1,2)遗漏端点2，解析未讨论a=2不可取，属于数学错误和答案不匹配。 |
| `bnu-high-ds-v1-s4-121` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, answer_mismatch, explanation_contradiction | 题目可解，定点 P(2,2) 代入幂函数得 2^b=2，解得 b=1，对应选项 B。存储答案选 A（0），解析中计算得 b=1 却错误选 A，答案与解析矛盾，且唯一正确选项为 B。 |
| `bnu-high-ds-v1-s4-130` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | ambiguous_mc, missing_condition, explanation_contradiction | 题目未指定a>1或0<a<1，f(1)=0无法确定a，导致解集不唯一。存储答案B仅对应a>1情形，忽略0<a<1时解集(0,1)，造成多解且选项不唯一，解析错误默认a>1。 |
| `bnu-high-ds-v1-s4-132` | S4 | fill-in | fail | blocker | stage-c | fail/fail/fail/not_applicable | math_error, unsolvable, explanation_contradiction | 对数函数 f(x)=log_a(2x-1) 恒过定点 P(1,0)，代入幂函数 g(x)=x^α 得 1^α=0，无解。题目条件矛盾，无法求解。存储答案 α=0 错误，解析中由 0=1^α 推出 α=0 不成立。 |
| `bnu-high-ds-v1-s4-137` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 方程可解，正确解为 x=5（x=-3 舍去）。存储答案 x=2 错误，解析过程虽正确但最终给出错误答案，与正确解矛盾。 |
| `bnu-high-ds-v1-s4-145` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, explanation_contradiction | 题目可解，符合北师大版函数应用章节。独立求解得 x>log_{1.2}3≈6.03，最小整数为6。但存储答案为7，解析中计算得 x>6.03 却错误给出7，存在数学错误和解析矛盾，必须修正。 |
| `bnu-high-ds-v1-s4-146` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | f(1)=0，零点为1，在区间(1,2)内，故k=1。存储答案0错误，解析称零点在(0,1)内与计算矛盾。 |
| `bnu-high-ds-v1-s4-153` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | f(0)=ln2-1<0，f(2)=ln4-1>0，中点1处f(1)=ln3-1>0，故零点在[0,1]。存储答案[1,2]错误，解析也指出应为[0,1]，与答案矛盾。 |
| `bnu-high-ds-v1-s4-166` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, answer_mismatch, explanation_contradiction | 函数f(x)=2^x+x-3，f(0)=-2<0，f(1)=0，零点为1。零点在区间(k,k+1)内，k∈Z，则k=0时区间为(0,1)，包含零点1；k=1时区间为(1,2)，不包含零点1。存储答案1错误，解析称零点在(1,2)内与事实矛盾。正确答案为0。 |
| `bnu-high-ds-v1-s4-170` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, missing_condition | 存储答案x∈[30,100]错误：未考虑定价通常不高于原价50元，且x=30时利润为0，实际取值范围应为(30,50]。 |
| `bnu-high-ds-v1-s4-172` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/fail | math_error, ambiguous_mc, explanation_contradiction | 题目可解，独立解为D。存储答案选A错误，解析中A正确但实际A错误，且D被错误否定，导致无正确选项，属于严重错误。 |
| `bnu-high-ds-v1-s4-175` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立计算得k=ln3/10≈0.10986，c=0.2，指数预测9倍，线性预测5倍，仅B正确。但存储答案选A且解析自相矛盾，导致无正确选项，属于严重错误。 |
| `bnu-high-ds-v1-s4-182` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 独立计算得76.5，存储答案77.0错误；解析过程算出76.5但最终给出77.0，自相矛盾。 |
| `bnu-high-ds-v1-s4-185` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | answer_mismatch, explanation_contradiction | Stage A 独立答案字段为 22.4，与存储答案 22 不一致，且 22.4 无合理依据，属于错误。按北师大版教材常用方法，第 60 百分位数应为 22，存储答案正确，但独立答案与存储答案不匹配，解释也存在矛盾，判定为 fail。 |
| `bnu-high-ds-v1-s4-197` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合BNU统计章节。独立计算得极差0.4，均值2.4，方差0.02，标准差≈0.141，四舍五入为0.14。存储答案标准差0.16错误；解析中方差0.024计算错误，导致标准差0.155，与正确值0.14矛盾。答案和解析均存在数学错误，需修正为极差0.4，标准差0.14。 |
| `bnu-high-ds-v1-s4-199` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/fail | math_error, answer_mismatch, ambiguous_mc, explanation_contradiction | 数据满足y=2x+1，既是函数关系也是正相关。选项D“函数关系”和A“正相关”均正确，但题目为单选题，导致答案不唯一。存储答案“函数关系”与独立解“正相关”不一致，解析承认函数关系但未说明正相关，存在矛盾。题目设计有歧义，应修改选项或明确意图。 |
| `bnu-high-ds-v1-s4-200` | S4 | short-answer | fail | blocker | stage-c | fail/fail/fail/not_applicable | missing_condition, rag_fit_issue, unsolvable | 题目要求计算95%置信区间，但未提供总体分布假设或标准差，且北师大版高一统计仅涉及描述统计，不包含推断统计的置信区间，超出课程范围，无法求解。存储答案和解析无效。 |
| `bnu-high-ds-v1-s4-203` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目明确要求根据频率分布直方图计算众数，众数应为频数最高组的组中值，即[80,90)的组中值85。存储答案85正确，但解析错误地使用了插值公式计算众数，得出83，与答案矛盾，且该公式不适用于本题给出的频数分布直方图。解析必须修正为直接取最高矩形中点。 |
| `bnu-high-ds-v1-s4-206` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 存储答案中甲中位数83、乙中位数82错误，正确应为甲81.5、乙83；解析计算混乱且与答案矛盾。独立解正确，乙更稳定。 |
| `bnu-high-ds-v1-s4-212` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 数据总和为3200，平均数为80.00，而非80.25。解析中总和3210错误，导致答案与解释均不匹配。 |
| `bnu-high-ds-v1-s4-213` | S4 | fill-in | fail | blocker | stage-c | fail/fail/fail/not_applicable | missing_condition, unsolvable, answer_mismatch | 分层抽样估计总体均值需各层在总体中的比例，题目未给出男女生人数，无法计算。存储答案167.2基于错误假设样本比例等于总体比例，不可接受。 |
| `bnu-high-ds-v1-s4-231` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合BNU教材范围。独立求解得A∪B={(1,3),(1,5),(3,5),(2,4)}，但存储答案错误地包含了和为奇数的组合，解析自相矛盾，属于严重数学错误，必须修正。 |
| `bnu-high-ds-v1-s4-235` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | math_error, bad_options, explanation_contradiction, unsolvable | 题目无正确选项：P(A)=3/10，P(B)=2/5，但所有选项均不匹配，且存储答案P(B)=3/5错误，解析中列举组合数矛盾，题目不可解。 |
| `bnu-high-ds-v1-s4-249` | S4 | fill-in | warn | none | stage-c | pass/pass/weak/not_applicable | - | 题目描述先随机抽班，再从该班随机抽5名学生，属于两阶段抽样，但整体上可视为整群抽样的一种。答案“整群抽样”正确，与独立解一致。解析提及“两阶段抽样”略有混淆，但不影响答案正确性，无严重问题。 |
| `bnu-high-ds-v1-s4-252` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目已知红球12个，总球20个，故白球实际为8个。频率估计：白球频率72/200=0.36，估计白球数20×0.36=7.2，四舍五入为7，但实际白球8个，频率估计应接近8，解析中四舍五入为7与答案8矛盾，且与已知条件冲突。正确答案应为8，解析错误。 |
| `bnu-high-ds-v1-s4-254` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 题目可解，RAG匹配。独立计算得a=1.0，b≈1.5，t=5时y=1.5^5=7.59375，四舍五入保留一位小数为7.6。存储答案和解析均给出7.7，与正确结果7.6矛盾，且解析内部计算7.59375后却取7.7，存在数学错误和解释矛盾。 |
| `bnu-high-ds-v1-s4-258` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, explanation_contradiction | 存储答案预测2030年人口为106万，但正确计算应为108万（80e^(0.019*15)≈108），解析中计算过程也得到106.4≈106，但实际80e^(0.019*15)≈108万，存在计算错误，导致答案与解析矛盾。 |
| `bnu-high-ds-v1-s4-260` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 存储答案预测t=30时温度为44°C，但独立解计算得29°C，解析中计算过程也得到29.4°C，却给出44°C，存在矛盾。 |
| `bnu-high-ds-v1-s4-271` | S4 | multiple-choice | fail | blocker | stage-c | pass/pass/fail/pass | math_error, explanation_contradiction | 题目可解，答案匹配，但解析中乙模型预测值计算错误（y(4)=51应为55，y(5)=66应为71，y(6)=82应为88），导致误差计算错误，解析与正确计算过程矛盾，需修正解析。 |
| `bnu-high-ds-v1-s4-277` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | math_error, ambiguous_mc, bad_options, explanation_contradiction | 利润函数L(x)=30x-2000，代入计算得L(70)=100，L(80)=400，L(100)=1000，故B、C、D均正确，A错误。单选题出现多个正确选项，违反唯一性要求，题目不可解。存储答案仅选C，与事实不符；解析承认B、C、D正确却强行选C，自相矛盾。 |
| `bnu-high-ds-v1-s4-281` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 存储答案参数计算错误：甲模型应为y=0.85x-0.9，乙模型应为y=0.0625x²+0.55；检验结果应为乙模型更准确；预测值应为9.6 m。解析中计算错误且结论矛盾，与独立求解结果不一致。 |
| `bnu-high-ds-v1-s4-283` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | math_error, bad_options, explanation_contradiction, unsolvable | 模型 y=2·1.5ˣ+1，当 x=5 时，计算得 y=2×7.59375+1=16.1875≈16.2 万辆，选项 C 为 20.2 万辆，数值错误。其他选项均明显错误，导致无正确选项，题目不可解。解析中计算过程错误且与选项矛盾。 |
| `bnu-high-ds-v1-s4-284` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 存储答案中模型②在(4,9)的误差计算错误（应为1分钟而非0），导致模型比较结论错误（模型①整体误差更小），解析中误差计算矛盾。正确答案应为模型①误差0、模型②误差1，模型①拟合更好，预测15分钟。 |
| `bnu-high-ds-v1-s4-285` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 分段函数表达式错误：x≤3时总费用应为10元，不含燃油附加费0.5x；x>3时表达式正确但答案未简化。解方程得x=8.4公里，非7公里。解析中计算过程与答案矛盾。 |
| `bnu-high-ds-v1-s4-287` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 乙模型计算错误：4.5×1.1⁴≈6.588，四舍五入为6.6万元，而非7.2万元。因此甲模型更准确，预测2025年应为9.2万元。答案与解析均错误，且解析中试图修改模型参数，与题目矛盾。 |
| `bnu-high-ds-v1-s4-289` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | ambiguous_mc, explanation_contradiction, answer_mismatch | 题目为单选题，但选项C和D均正确，不满足唯一答案要求。存储答案D错误，解析声称所有选项正确，与Stage A独立解矛盾。 |
| `bnu-high-ds-v1-s4-291` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch | Stage A 独立求解得递增区间为 [0, π/12] ∪ [7π/12, π]，存储答案为 [0, 5π/12] 和 [11π/12, π]，两者不一致。存储答案错误，需修正。 |
| `bnu-high-ds-v1-s4-295` | S4 | multiple-choice | fail | blocker | stage-c | fail/pass/weak/fail | ambiguous_mc, explanation_contradiction | y=|sin x| 的最小正周期为 π 且为偶函数，与 y=cos 2x 同时满足条件，单选题存在两个正确选项，不唯一。解析未澄清此歧义，且自身表述矛盾。 |
| `bnu-high-ds-v1-s4-300` | S4 | fill-in | fail | blocker | stage-c | fail/fail/fail/not_applicable | math_error, missing_condition, unsolvable, explanation_contradiction, answer_mismatch | 由最小正周期π得ω=2。f(x)≤f(π/3)恒成立要求f(π/3)为最大值1，即sin(2π/3+φ)=1，解得φ=-π/6+2kπ。在0<φ<π内无解（k=0得负，k=1得11π/6>π）。存储答案5π/6代入得f(π/3)=sin(3π/2)=-1，为最小值，与条件矛盾。题目条件无法满足，不可解。 |
| `bnu-high-ds-v1-s4-302` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 与-2025°终边相同的最小正角为135°，弧度表示为3π/4。存储答案7π/4（315°）错误，且解析中计算过程正确但最终给出7π/4，自相矛盾。 |
| `bnu-high-ds-v1-s4-311` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立求解得递增区间为[π/8+2kπ/3, 5π/8+2kπ/3]，与存储答案[2kπ/3-π/12, 2kπ/3+π/4]不等价，解析中端点计算错误，导致答案错误，判定为blocker。 |
| `bnu-high-ds-v1-s4-317` | S4 | short-answer | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 方程2cos(2x-π/3)=1的解为x=π/4+2kπ或x=7π/12+2kπ，在[0,2π]内得π/4,7π/12,5π/4,19π/12。存储答案13π/12错误，解析中x=π/3+kπ或kπ与最终答案矛盾，且未正确筛选区间内解。 |
| `bnu-high-ds-v1-s4-321` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，符合教材范围。但存储答案包含错误区间[π/4, π/2]，正确单调递增区间应为[0, π/12]和[5π/12, π/2]。解析中虽指出k=1时交集为[5π/12, π/2]，却错误地给出[π/4, π/2]，存在数学错误和解释矛盾，必须修正。 |
| `bnu-high-ds-v1-s4-325` | S4 | multiple-choice | fail | blocker | stage-c | fail/fail/fail/fail | math_error, answer_mismatch, bad_options, explanation_contradiction, unsolvable | 向量(1,2)与(3,-1)的点积为1，模长分别为√5和√10，cosθ=1/(√5·√10)=√2/10，θ=arccos(√2/10)≈81.87°，不是特殊角，四个选项均不正确，题目无解。解析也指出计算错误并建议修改题目，但存储答案仍为B，存在答案不匹配、选项错误和解析矛盾。 |
| `bnu-high-ds-v1-s4-331` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/pass | math_error, explanation_contradiction | 题目可解，独立解为−1/4 a+2/3 b，与选项A一致。但解析中计算错误，得出EF=1/12 a+b，与答案矛盾，且最终声称选项−1/4 a+2/3 b最接近，实际应为该选项。解析不可用，需修正。 |
| `bnu-high-ds-v1-s4-332` | S4 | short-answer | fail | blocker | stage-c | pass/fail/pass/not_applicable | answer_mismatch | 夹角为锐角需a·b>0且a与b不共线。a·b=2x-3>0得x>3/2；共线时2×3=-1×x得x=-6，但x=-6不在x>3/2内，无需排除。正确答案为x>3/2，存储答案多出x≠-6，属于多余条件，导致答案不匹配。 |
| `bnu-high-ds-v1-s4-333` | S4 | fill-in | fail | blocker | stage-c | pass/fail/fail/not_applicable | math_error, answer_mismatch, explanation_contradiction | 题目可解，独立解为7/3。存储答案5/3错误，解析中计算得7/3却强行改为5/3，自相矛盾。 |
| `bnu-high-ds-v1-s4-334` | S4 | multiple-choice | fail | blocker | stage-c | pass/fail/fail/fail | math_error, answer_mismatch, explanation_contradiction, ambiguous_mc | 题目可解，独立计算得m=−1或m=5/2，选项仅含−1，故答案应为−1。但提供的解析错误地解得m=1或2，与答案−1矛盾，且解析过程存在计算错误。选项不唯一（实际有两个解，但选项只列出一个），但根据选项仍可选出−1。解析与答案严重不符，构成阻断性错误。 |

## Notes

- The provider key was used only through local runtime configuration. No secret values are recorded in this artifact.
- RAG cards were used only as safe grade/chapter/topic fit evidence, not as an answer key.
- This QA artifact does not edit candidate questions or promote public `data/questions.ts` entries.
- Rows in `deepseek-s18-adjudication-priority.csv` should be reviewed before remediation because they include Stage C items, blocker/major rows, or model-output concern tags.
