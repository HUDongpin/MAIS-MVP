# DeepSeek V4 Pro Solvability QA - Mainland BNU High V1 Candidate

- Date: 2026-05-27
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Status counts: pass 1220, fail 266, warn 14
- Severity counts: none 1220, blocker 262, major 8, minor 10
- Solvable counts: pass 1419, fail 81
- Answer-match counts: pass 1243, fail 257
- Explanation-match counts: pass 1198, fail 266, weak 36
- Issue tag counts: math_error 210, answer_mismatch 230, explanation_contradiction 277, bad_options 29, unsolvable 47, ambiguous_mc 14, missing_condition 14, accepted_answer_gap 2
- DeepSeek output concern counts: self_correction_language 2, status_rationale_tension 15, overlong_rationale 2
- Token usage: prompt 2103019, completion 234346, total 2337365

## QA Gate Result

DeepSeek V4 Pro flagged 280 item(s). These require S18 review or remediation before public promotion.

## Local Audit Comparison

- Local remediation rows: 107
- DeepSeek issue rows: 280
- Overlap: 80
- DeepSeek-only issue rows: 200
- Local-audit-only rows: 27
- Disagreement CSV: `deepseek-local-audit-disagreements.csv`

## Issue Preview

| ID | Grade | Type | Status | Severity | Solvable/Answer/Explanation | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bnu-high-ds-v1-s4-004` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解。p的解集为[1,3]，q的解集为[2,3]。p不是q的子集，q是p的子集，故p是q的必要不充分条件。但答案和解析前半部分错误地给出“充要条件”，解析后半部分又自我纠正为“必要不充分条件”，与答案矛盾。 |
| `bnu-high-ds-v1-s4-009` | S4 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 不等式2^{x²-3x}>1/8即2^{x²-3x}>2⁻³，底数2>1，指数函数递增，得x²-3x>-3，即x²-3x+3>0，判别式Δ=-3<0，恒成立，解集为R。题目答案(-∞,1)∪(2,+∞)错误，解析虽指出恒成立但未修正答案，自相矛盾。 |
| `bnu-high-ds-v1-s4-014` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 解不等式组：2x-1<x+3得x<4，x²-4≤0得-2≤x≤2，交集为[-2,2]。题目答案[-2,4)错误，解析虽指出应为[-2,2]但未修正答案，自相矛盾。 |
| `bnu-high-ds-v1-s4-019` | S4 | multiple-choice | fail | major | pass/pass/fail | explanation_contradiction | 题目可解，B是A的幂集，A是A的子集，故A∈B正确。但解析中称“{1}∈B”正确，而选项C为“{1} ∈ B”，解析未指出C也正确，导致多选题歧义。实际上{1}∈B也成立，但题目为单选，答案仅选A∈B，解析未说明为何不选C，存在解释矛盾。 |
| `bnu-high-ds-v1-s4-020` | S4 | short-answer | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | p：|x-1|≤2得-1≤x≤3；q：x²-2x-3≤0得-1≤x≤3，p与q等价，应为充要条件。答案“充分不必要条件”错误，解析已指出错误并修正为充要条件，但答案字段未更新。 |
| `bnu-high-ds-v1-s4-024` | S4 | fill-in | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 由解集(-1,2)知a<0，-1和2是ax²+bx+2=0的根。韦达定理：-1+2=-b/a，-1×2=2/a，解得a=-1，b=1，a+b=0。答案“-1”错误，解析已算出a+b=0，但答案字段未更新。 |
| `bnu-high-ds-v1-s4-032` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由解集知a<0，对应方程根为-1/2和1/3，韦达定理得-b/a=-1/6，2/a=-1/6，解得a=-12，b=-2，a+b=-14，但答案和解析均错误给出-10，解析中计算过程也矛盾。 |
| `bnu-high-ds-v1-s4-033` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得A=[-1,2]，B=(-1,5)，交集为(-1,2]。题目答案[-1,5)错误，解析虽正确得出(-1,2]但与答案矛盾。 |
| `bnu-high-ds-v1-s4-043` | S4 | multiple-choice | fail | blocker | pass/pass/fail | explanation_contradiction | 解析称x>0时在(0,2]递增，但正确答案包含[2,+∞)递增，解析自相矛盾且与答案不符。 |
| `bnu-high-ds-v1-s4-045` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算值域为[2,4]，m+M=6，但答案为10，解析也得出6，答案与解析矛盾且错误。 |
| `bnu-high-ds-v1-s4-055` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 偶函数在[0,+∞)减，得(-∞,0]增，f(m)>f(2m-1)等价于|m|<|2m-1|，平方解得m<1/3或m>1，无其他限制，正确解集应为(-∞,1/3)∪(1,+∞)，选项B。原答案(1/3,1)错误，解析中“检验得m∈(1/3,1)”无依据且与不等式矛盾。 |
| `bnu-high-ds-v1-s4-056` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由条件得f(0)=0，f(-x)=2x^2-f(x)，f(1)=1得f(2)=4，f(3)=9，f(-3)=2×9-9=9。原答案15错误，解析中计算混乱且最终未给出正确值。 |
| `bnu-high-ds-v1-s4-057` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由奇函数得c=0，a=0，代入f(1)=2得b=1，a+b+c=1。答案0错误，解析也指出应为1，与答案矛盾。 |
| `bnu-high-ds-v1-s4-058` | S4 | multiple-choice | fail | blocker | fail/fail/fail | bad_options, unsolvable, explanation_contradiction | 选项C y=|x|+1/x非奇非偶，不满足偶函数条件，无正确选项。解析也指出无正确选项，题目不可解。 |
| `bnu-high-ds-v1-s4-060` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由f(x+1)-f(x-1)=2x累加得f(2024)=2024×1012+1，与答案2023×2024+1不符。解析也指出不符，题目条件与答案矛盾。 |
| `bnu-high-ds-v1-s4-061` | S4 | multiple-choice | warn | major | pass/pass/weak | ambiguous_mc | f(x)是奇函数正确，但值域为R也正确，题目为单选，存在两个正确选项，造成歧义。解析承认值域为R但未处理多选问题。 |
| `bnu-high-ds-v1-s4-067` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, answer_mismatch, explanation_contradiction | 选项C正确，解析也承认C正确，但答案选A且解释称奇函数判断更直接，造成多选或无唯一正确选项，违反单选题要求。 |
| `bnu-high-ds-v1-s4-080` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由条件解得a=2,b=0正确。但解不等式f(x)>6：2^(x+1)>6，即x+1>log₂6，x>log₂6-1=log₂3≈1.585，解集应为(log₂3,+∞)，而非(1,+∞)。答案和解析均错误，需修正。 |
| `bnu-high-ds-v1-s4-092` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由10天变为1/8得半衰期T=10/3天，总天数t=7T=70/3天，非整数70。答案70错误，解析自相矛盾且最终未给出正确答案。 |
| `bnu-high-ds-v1-s4-094` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 外层底数1/3递减，内层二次函数在(-∞,1]递减，故复合函数在(-∞,1]递增。答案应为(-∞,1]，而非[1,+∞)。解析自相矛盾，最终结论错误。 |
| `bnu-high-ds-v1-s4-108` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 不等式化为2^{x^2}≤2^{-2(x-3)}，由单调性得x^2≤-2x+6，即x^2+2x-6≤0，解集为[-1-√7, -1+√7]。解析中错误得出[-2,3]，且无定义域限制，答案错误。 |
| `bnu-high-ds-v1-s4-111` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 真数u=(x-1)^2+1≥1，无法取遍所有正实数，故无论a为何正值且a≠1，值域均非R。满足条件的a不存在，答案应为∅。题目答案和解析矛盾，解析正确但答案错误。 |
| `bnu-high-ds-v1-s4-121` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 定点P(2,2)代入幂函数得2^b=2，解得b=1，对应选项B。题目答案选A.0错误，解析也错误地得出b=1却选A，自相矛盾。 |
| `bnu-high-ds-v1-s4-130` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, missing_condition, explanation_contradiction | f(1)=log_a(1)=0 恒成立，无法确定底数 a>1 还是 0<a<1。不等式 f(x)>0 的解集依赖于 a：a>1 时解集为 (1,+∞)，0<a<1 时解集为 (0,1)。题目未指定 a 范围，选项 B 和 C 均可能正确，存在歧义，不可解。解析中“通常默认 a>1”无依据，与题目条件矛盾。 |
| `bnu-high-ds-v1-s4-153` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | f(0)=ln2-1<0，f(2)=ln4-1>0，中点1处f(1)=ln3-1>0，由零点存在定理零点在[0,1]；答案[1,2]错误，解析也指出答案有误，故答案与解析均不匹配。 |
| `bnu-high-ds-v1-s4-175` | S4 | multiple-choice | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 指数模型k=ln3/10≈0.10986，A错误；线性模型c=0.2，B正确；指数模型2030年为9倍，C错误；线性模型2030年为5倍，D错误。正确答案应为B，但存储答案为A，解析也错误地认为A正确，矛盾。 |
| `bnu-high-ds-v1-s4-182` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 组中值计算得3060/40=76.5，精确到0.1为76.5，但答案给出77.0，解析也错误地得出76.5却与答案矛盾，实际应为76.5。 |
| `bnu-high-ds-v1-s4-203` | S4 | short-answer | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 众数计算得82.5，四舍五入为83，但答案给出85，与计算不符；解析中计算过程得82.5≈83，但最终答案写85，自相矛盾。 |
| `bnu-high-ds-v1-s4-206` | S4 | short-answer | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 茎叶图数据计算甲中位数81.5，乙中位数83，但答案给出甲83、乙82，与计算不符；解析中计算得甲81.5、乙83，但答案错误，自相矛盾。 |
| `bnu-high-ds-v1-s4-231` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 事件A：和为偶数，需两球同奇或同偶。奇数{1,3,5}组合(1,3),(1,5),(3,5)；偶数{2,4}组合(2,4)。A={(1,3),(1,5),(3,5),(2,4)}。事件B：积为奇数，需两球均为奇数，B={(1,3),(1,5),(3,5)}。A∪B=A。原答案错误包含(1,2)等，解析自相矛盾，需修正。 |
| `bnu-high-ds-v1-s4-235` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, bad_options, explanation_contradiction | 事件B的和大于6，正确概率为2/5，但选项和答案均为3/5，解析中计算错误且自相矛盾，无正确选项。 |
| `bnu-high-ds-v1-s4-243` | S4 | fill-in | fail | blocker | fail/fail/fail | missing_condition, unsolvable, explanation_contradiction | 题目未给出每场罚球次数，无法计算频率。解析中假设每场10次，但题目未提供此条件，导致不可解。 |
| `bnu-high-ds-v1-s4-249` | S4 | fill-in | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction, ambiguous_mc | 题目描述先抽班再在班内抽学生，属于两阶段抽样，不是整群抽样（整群抽样应对抽中群的所有个体调查）。答案“整群抽样”错误，解析也承认是两阶段抽样，自相矛盾。 |
| `bnu-high-ds-v1-s4-252` | S4 | fill-in | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 解析中计算得x≈7.2，四舍五入为7，但又说红球12个故白球应为8个，逻辑混乱。正确答案应为8个，但解析过程错误，且答案与解析不一致。 |
| `bnu-high-ds-v1-s4-254` | S4 | short-answer | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 1.5^5=7.59375，保留一位小数应为7.6，答案给出7.7错误。解析中先得7.6又改7.7，自相矛盾。 |
| `bnu-high-ds-v1-s4-260` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算t=30时温度约为29°C，但答案和解析均错误地给出44°C；解析中计算过程与结果矛盾（计算得29.4却写44），答案错误。 |
| `bnu-high-ds-v1-s4-270` | S4 | fill-in | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 解析中k≈0.0446，但答案和acceptedAnswers均写为k≈0.04，且函数表达式用0.04，与解析计算矛盾。题目要求精确到0.01，0.0446四舍五入为0.04，但解析未说明四舍五入，且acceptedAnswers包含k=0.04和k≈0.0446，存在不一致。应统一为k≈0.04，m=100e^{-0.04t}。 |
| `bnu-high-ds-v1-s4-277` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, bad_options, explanation_contradiction | 原题选项B、C、D均正确，不满足单选题唯一正确的要求。解析中虽指出矛盾并试图修改选项，但题目本身未修改，导致无唯一正确答案。 |
| `bnu-high-ds-v1-s4-281` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得甲模型更准确，预测水深5.1 m，但存储答案和解析均称乙更准且预测11.3 m，与计算矛盾，答案和解析均错误。 |
| `bnu-high-ds-v1-s4-283` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, bad_options, explanation_contradiction | 计算得x=5时y≈16.2，选项C为20.2，无正确选项；解析承认计算错误但未修正，题目不可解。 |
| `bnu-high-ds-v1-s4-284` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 存储答案称模型②误差1，但实际计算误差为0；解析中误差平方和计算有误，导致答案与独立求解不一致。 |
| `bnu-high-ds-v1-s4-285` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得x=8.4，但存储答案为7公里；解析中方程解为8.4却给出答案7，自相矛盾。 |
| `bnu-high-ds-v1-s4-287` | S4 | short-answer | fail | blocker | fail/fail/fail | math_error, missing_condition, explanation_contradiction | 乙模型y=4.5·1.1ᵗ在t=4时预测值约6.6，与答案7.2不符；解析承认错误但未修正，题目不可解。 |
| `bnu-high-ds-v1-s4-289` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, explanation_contradiction, answer_mismatch | 题目要求选择正确结论，但独立求解发现A、B、C、D均正确，存在多个正确选项，不符合单选题要求。解析声称所有选项正确并建议修改，与题目和答案矛盾。答案仅选D，但实际不止D正确。 |
| `bnu-high-ds-v1-s4-295` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, explanation_contradiction | 题目要求最小正周期为π且为偶函数，y=cos2x和y=|sin x|均满足，存在两个正确选项，不符合单选题要求。解析承认y=|sin x|也正确，但答案仅选y=cos2x，矛盾。 |
| `bnu-high-ds-v1-s4-300` | S4 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction, unsolvable | 由T=π得ω=2，f(x)≤f(π/3)恒成立要求f(π/3)为最大值1，得sin(2π/3+φ)=1，解得φ=-π/6+2kπ，在0<φ<π内无解。若改为f(x)≥f(π/3)则φ=5π/6，但原题条件矛盾，无法求解。答案5π/6与条件不符，解析中自行修改了题目条件，不可接受。 |
| `bnu-high-ds-v1-s4-302` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | -2025°+6×360°=135°=3π/4，最小正角为3π/4，答案7π/4错误，解析中虽指出错误但最终答案仍为7π/4，矛盾。 |
| `bnu-high-ds-v1-s4-317` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得解为 π/3, π, 4π/3, 2π，与给定答案 π/4, 7π/12, 13π/12, 19π/12 不符；解析中方程 cos(2x-π/3)=1/2 的解应为 2x-π/3=π/3+2kπ 或 5π/3+2kπ，而非 -π/3+2kπ，导致错误。 |
| `bnu-high-ds-v1-s4-321` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，但答案错误。正确单调递增区间为[0, π/12]和[5π/12, π/2]，而非[π/4, π/2]。解析中已指出错误但未修正答案，导致答案与解析矛盾。 |
| `bnu-high-ds-v1-s4-325` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, bad_options, explanation_contradiction | 题目可解，但计算得cosθ=√2/10，夹角非特殊角，无选项匹配。解析承认设计有误，答案B错误。 |
| `bnu-high-ds-v1-s4-331` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得EF=1/12 a + b，与给定答案−1/4 a+2/3 b不符。解析中计算混乱，最终结果与选项均不匹配，且选项无正确项。 |
| `bnu-high-ds-v1-s4-333` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算投影向量的模为7/3，与答案5/3不符。解析中计算过程得出7/3，但最后声称答案为5/3，自相矛盾。 |
| `bnu-high-ds-v1-s4-334` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction, ambiguous_mc | 独立求解得m=1或2，但选项仅含−1,1,−2,2，无正确选项。解析中计算得m=1或2，却强行选−1，矛盾。 |
| `bnu-high-ds-v1-s4-339` | S4 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction, unsolvable | 由c⊥a得x+y=0，|c|=√5得x²+y²=5，解得x=±√10/2，y=∓√10/2，答案(1,-1)或(-1,1)模为√2≠√5，解析自相矛盾，题目不可解。 |
| `bnu-high-ds-v1-s4-340` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction, unsolvable, bad_options | a+b=(1,5)，a-b=(3,1)，由c∥(a+b)且c⊥(a-b)得5x-y=0且3x+y=0，解得x=y=0，零向量方向任意，不满足平行条件，无有效解，选项均不正确。 |
| `bnu-high-ds-v1-s4-345` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得 k=17/9，但题目答案和 acceptedAnswers 均为 9/4，解析中虽纠正为 17/9 却与答案矛盾，答案错误。 |
| `bnu-high-ds-v1-s4-353` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解。独立求解：由BD=2DC得D分BC为2:1，利用定比分点向量公式AD = (1/3)AB + (2/3)AC = (1/3)a + (2/3)b。但存储答案和解析均写为AD = (1/3)a + (2/3)b，与独立答案一致。然而，解析中写“AD = (DC/BC)AB + (BD/BC)AC = (1/3)a + (2/3)b”，其中DC/BC=1/3，BD/BC=2/3，系数正确，但解析文字“由BD=2DC得BD:DC=2:1，故D分BC成比例”与公式匹配。实际上，独立答案与存储答案相同，但解析中写“AD = (1/3)a + (2/3)b”与答案一致，但解析中“AD = (DC/BC)AB + (BD/BC)AC”的系数对应关系正确。然而，我重新检查：若BD=2DC，则BD:DC=2:1，D靠近C，AD = (DC/BC)AB + (BD/BC)AC = (1/3)a + (2/3)b，正确。但解析中写“AD = (DC/BC)AB + (BD/BC)AC = (1/3)a + (2/3)b”，其中DC/BC=1/3，BD/BC=2/3，正确。但答案写为“AD = (1/3)a + (2/3)b”，与独立答案一致。为何我标记为fail？因为解析中写“AD = (DC/BC)AB + (BD/BC)AC = (1/3)a + (2/3)b”，但答案也是(1/3)a + (2/3)b，看似一致。但我在独立答案中写的是(1/3)a + (2/3)b，与存储答案相同。所以实际上答案匹配应为pass。但我之前误判了。重新审视：题目要求用a和b表示AD，a=AB，b=AC。由BD=2DC，则AD = AB + BD = a + (2/3)BC = a + (2/3)(AC - AB) = a + (2/3)(b - a) = (1/3)a + (2/3)b。所以正确答案是(1/3)a + (2/3)b。存储答案也是这个，解析也得出这个。所以答案匹配和解析匹配都应为pass。我之前的判断错误。因此，本题无问题。 |
| `bnu-high-ds-v1-s4-359` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，但存储答案错误。独立求解：E为BC中点，AE=a+1/2 b；F在CD上且CF=2FD，则DF=1/3 a，AF=b+1/3 a；EF=AF-AE=-2/3 a+1/2 b。存储答案为(1/2)a-(1/3)b，系数和符号均错。解析过程混乱且最终结果与答案不一致。 |
| `bnu-high-ds-v1-s4-361` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，但答案错误。独立求解得塔高为40√2 m，而给定答案为40 m。解析中错误计算AC=40√3，实际应为40√6，导致最终答案错误。 |
| `bnu-high-ds-v1-s4-362` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，但答案错误。独立求解得h=50√(4+√3)米，而给定答案为50√3米。解析中余弦定理列式错误，应为AB²=AC²+BC²-2·AC·BC·cos∠ACB，但∠ACB未知，无法直接使用∠CAB=60°。正确做法需先求∠ACB，再解三角形。 |
| `bnu-high-ds-v1-s4-364` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目可解，但解析计算有误。解析中余弦定理列式正确，但计算h²=6400/(4-√3)≈2822，h≈53.1米，最接近56米，答案选56米合理。但解析中h≈53.1米与选项56米有差距，且未说明为何最接近。严格来说，53.1更接近56而非69，但题目要求“最接近”，答案56米可接受。然而解析中h≈53.1米与最终答案56米不一致，存在矛盾。 |
| `bnu-high-ds-v1-s4-370` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction, bad_options | 题目条件：AB=50，仰角30°和45°，∠ACB=60°。设塔高h，则AC=√3h，BC=h。在△ABC中用余弦定理：50²=(√3h)²+h²-2·√3h·h·cos60°=3h²+h²-√3h²=(4-√3)h²，得h²=2500/(4-√3)=2500(4+√3)/13，h=50√((4+√3)/13)≈33.2。选项25√2≈35.4，25√3≈43.3，50√2≈70.7，50√3≈86.6，均不匹配。解析中错误地近似为25√2，且计算过程有误（如得出h²=2500/(4-√3)后直接近似为25√2，但实际25√2=√1250，而2500/(4-√3)≈1612，不一致）。题目不可解出选项中的值，答案错误，解析矛盾。 |
| `bnu-high-ds-v1-s4-371` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由余弦定理得BC=√(8²+6²-2·8·6·cos60°)=√(64+36-48)=√52=2√13。面积法：½·8·6·sin60°=½·2√13·h，得h=24√3/(2√13)=12√3/√13=12√39/13。答案给出24√3/7，解析中错误化简为24√3/7，实际应为12√39/13。答案与解析均错误。 |
| `bnu-high-ds-v1-s4-372` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件与370题类似：AB=50，仰角30°和45°，∠ACB=60°。设塔高h，AC=√3h，BC=h。余弦定理：50²=(4-√3)h²，h=50/√(4-√3)=50√((4+√3)/13)≈33.2。答案给出25√6≈61.2，解析中错误得出25√6，计算过程有误（如从(4-√3)h²=2500直接得h=25√6，但25√6=√3750，而2500/(4-√3)≈1612，不一致）。答案错误。 |
| `bnu-high-ds-v1-s4-374` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件：AB=30，仰角30°和45°，∠CAB=60°。设塔高h，AC=√3h，BC=h。在△ABC中用余弦定理：30²=(√3h)²+h²-2·√3h·h·cos60°=(4-√3)h²，得h²=900/(4-√3)≈900/2.268≈396.8，h≈19.9米。解析中错误近似为225，得h≈15.0，实际应为约19.9米。答案错误。 |
| `bnu-high-ds-v1-s4-375` | S4 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件：AB=20，仰角30°和45°，∠CAB=60°。设塔高h，AC=√3h，BC=h。在△ABC中，已知两边AC、AB及夹角∠CAB，用余弦定理求BC：BC²=AC²+AB²-2·AC·AB·cos60°，即h²=3h²+400-2·√3h·20·0.5=3h²+400-20√3h，整理得2h²-20√3h+400=0，解得h=20√3或h=10√3（舍去？需验证）。但解析中直接得h=20√3，且未舍去另一根。实际上方程解为h=20√3或h=10√3，需根据几何意义判断。若h=10√3≈17.32，则AC=30，BC=17.32，AB=20，满足三角形条件。但题目未明确A、B、C的相对位置，可能有多解。然而解析中直接取20√3，且答案给出20√3，但独立求解发现h=10√3也满足方程，需进一步判断。但更关键的是，解析中余弦定理应用错误：应为BC²=AC²+AB²-2·AC·AB·cos∠CAB，但∠CAB是A点处观测B与C的方向角，即∠CAB=60°，正确。但解析中写为“BC²=AC²+AB²-2·AC·AB·cos60°”，代入得h²=3h²+400-20√3h，整理得2h²-20√3h+400=0，解得h=20√3或h=10√3。若h=10√3，则AC=30，BC=10√3≈17.32，AB=20，三角形中AC最大，对应角B最大，但∠CAB=60°，可能合理。但题目未给出图形，无法确定唯一解。然而解析直接取20√3，且答案如此，但独立求解发现有两解，题目可能隐含条件使h=10√3不合理？需检查：若h=10√3，则BC=10√3，AC=30，AB=20，由余弦定理求cos∠CAB=(AC²+AB²-BC²)/(2·AC·AB)=(900+400-300)/(2·30·20)=1000/1200≈0.833，∠CAB≈33.6°，与给定60°矛盾！因此h=10√3不满足∠CAB=60°，只有h=20√3满足。所以独立求解正确，答案20√3正确。但解析中未说明舍去另一根的原因，且计算过程有跳步，但最终答案正确。然而，解析中写“整理得2h²-20√3h+400=0，解得h=20√3（舍去负根）”，实际上方程两根均为正，需舍去h=10√3，但解析未说明。因此解析不严谨，但答案正确。但独立验证：将h=20√3代入，AC=20√3*√3=60，BC=20√3，AB=20，cos∠CAB=(60²+20²-(20√3)²)/(2*60*20)=(3600+400-1200)/(2400)=2800/2400≈1.1667>1，不可能！这说明h=20√3也不满足三角形条件！计算错误：AC=√3h=√3*20√3=60，BC=h=20√3≈34.64，AB=20。用余弦定理求cos∠CAB=(AC²+AB²-BC²)/(2*AC*AB)=(3600+400-1200)/(2*60*20)=2800/2400≈1.1667>1，矛盾！因此h=20√3也不成立。实际上，方程2h²-20√3h+400=0的判别式Δ=(20√3)²-4*2*400=1200-3200=-2000<0，无实数解！解析中错误地认为有解，实际无解。因此题目条件矛盾，不可解。 |
| `bnu-high-ds-v1-s4-376` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件：AB=50，仰角30°和45°，∠CAB=75°，∠CBA=60°，则∠ACB=45°。设塔高h，AC=√3h，BC=h。在△ABC中用余弦定理：50²=(√3h)²+h²-2·√3h·h·cos45°=4h²-√6h²，得h²=2500/(4-√6)≈2500/1.5505≈1612.5，h≈40.15。选项25、35、50、70，最接近35。解析中计算得h≈40.15，但结论为最接近35，正确。但解析中写“最接近的选项为35 m”，与计算一致。然而，独立计算h≈40.15，与35差5.15，与50差9.85，确实35更近。但题目要求“最接近下列哪个值”，35是合理选择。但解析中未给出精确比较，但答案35 m正确。然而，解析中写“得h²=2500/(4-√6)≈2500/1.551≈1612，h≈40.15”，正确。但答案给出35 m，与计算一致。但需注意，选项35 m与计算值40.15有差距，但确实是最近选项。因此答案匹配。但解析中未说明为何选35，但结论正确。无问题。 |
| `bnu-high-ds-v1-s4-378` | S4 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件可解，但独立计算得CD≈12.5米，与给定答案15.0不符。解析中自相矛盾，先得12.5后称15.0，且未给出正确推导。答案错误。 |
| `bnu-high-ds-v1-s4-379` | S4 | multiple-choice | fail | blocker | fail/fail/fail | bad_options, missing_condition, explanation_contradiction | 题目假设A、B、D共线，但由仰角条件可推出矛盾，无法建立合理模型。选项A声称A、B、D共线，但实际无法求解，且解析中前后矛盾，无正确选项。 |
| `bnu-high-ds-v1-s4-380` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得h=20√(2+√3)米，与答案20√2不符。解析中余弦定理计算错误，导致答案错误。 |
| `bnu-high-ds-v1-s4-384` | S4 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件不足（未说明四边形形状），若为任意四边形，EF无法仅用a、b表示。若假设为平行四边形，则EF=a，与答案(a+b)/2不符。解析自相矛盾，答案错误。 |
| `bnu-high-ds-v1-s4-385` | S4 | multiple-choice | fail | blocker | pass/pass/fail | explanation_contradiction | 题目可解，独立求解得最低5℃在t=0,24，B正确。但解析称A、C也正确，与单选要求矛盾，且解析未指出题目本身存在多正确选项的缺陷，解释与题目不匹配。 |
| `bnu-high-ds-v1-s4-387` | S4 | fill-in | warn | minor | pass/pass/weak | explanation_contradiction | 题目可解，答案正确。但解析中向量表示有误：设AB=c, AC=b，则DE应为(b-c)/2，解析写为(b-c)/2但前面说D=c/2, E=b/2，DE=E-D=(b-c)/2，与答案一致，但答案写为(c-b)/2，符号相反，实际应为(b-c)/2。解析与答案符号不一致，但关系正确。 |
| `bnu-high-ds-v1-s4-388` | S4 | multiple-choice | fail | blocker | pass/fail/fail | ambiguous_mc, explanation_contradiction | 题目要求选一组基底，B正确，但C、D也可作为基底，题目未限定唯一答案，存在多正确选项，解析也承认C、D可行，但未指出题目缺陷。 |
| `bnu-high-ds-v1-s4-391` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, bad_options, explanation_contradiction | 按题目数据计算得h≈56.6 m，无正确选项，题目不可解。解析承认计算值与选项不符，但强行选B，答案错误。 |
| `bnu-high-ds-v1-s4-392` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, explanation_contradiction | 按题目数据解不等式得累计约6.4小时，答案8小时错误。解析承认计算不符但给出错误答案，与题目矛盾。 |
| `bnu-high-ds-v1-s4-394` | S4 | multiple-choice | fail | blocker | fail/fail/fail | ambiguous_mc, missing_condition, explanation_contradiction | 由面积得sinC=√3/2，C=60°或120°，均满足三角形内角条件，无其他限制，无法唯一确定，选择题出现两个合理选项，题目有歧义。 |
| `bnu-high-ds-v1-s4-401` | S4 | short-answer | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得 sin(α+β)=33/65，与答案-63/65不符。解析中计算过程也得到33/65，但最终强行改为-63/65，且解析末尾提出修改β范围以匹配答案，说明原题条件与答案矛盾。 |
| `bnu-high-ds-v1-s4-412` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 化简 sin(π/3+x)-sin(π/3-x) 得 2 cos(π/3) sin x = sin x，而非 √3 sin x。解析中计算过程正确但最终结论错误，答案与正确结果不符。选项应选 sin x，但答案给出 √3 sin x，属于数学错误。 |
| `bnu-high-ds-v1-s4-421` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得 sin(2α+π/3) = (-24-7√3)/50，但题目答案和解析均错误地写为 (-24+7√3)/50，解析中最后一步符号错误。选项A为 (-24+7√3)/50，选项D为 (-24-7√3)/50，正确选项应为D，但答案选A，导致答案不匹配且解析矛盾。 |
| `bnu-high-ds-v1-s4-430` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由sinA=4/5，cosB=5/13，A必为锐角（若A钝角则A+B>π），得cosA=3/5，cosC=sinAsinB-cosAcosB=33/65，选项B为33/65，但答案误设为16/65，解析中虽提及33/65却最终错误选择，答案与正确解矛盾。 |
| `bnu-high-ds-v1-s4-440` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得实部为 ±2，但题目答案为 ±1，解析过程也错误得出 ±1，实际应为 ±2。 |
| `bnu-high-ds-v1-s4-459` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, missing_condition, explanation_contradiction, unsolvable | 题目条件“在直线y=x上”与“|z-1|=|z+i|”联立得z=0，但0不在选项中；解析自行将直线改为y=-x才得到选项中的1-i，题目条件错误，无法按原题求解。 |
| `bnu-high-ds-v1-s4-471` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目条件中AE:EB=AH:HD=2:1，故EH∥BD；但CF:FB=2:1，CG:GD=3:1，比例不同，FG不平行于BD，因此EH与FG可能相交或异面，无法确定位置关系。解析中承认比例不同，却仍给出平行结论，自相矛盾。答案应为“无法确定”，原答案“平行”错误。 |
| `bnu-high-ds-v1-s4-474` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得体积为3π√55 cm³，与存储答案16π√7 cm³不符，解析也指出原答案有误，答案与解析矛盾。 |
| `bnu-high-ds-v1-s4-475` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, bad_options, explanation_contradiction, unsolvable | 独立计算得余弦值为√2/2，不在选项中，解析也承认计算有误且选项无匹配，题目不可解。 |
| `bnu-high-ds-v1-s4-476` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 由条件得BC⊥平面PAB，距离为BC=2√2，与答案2不符，解析也指出矛盾。 |
| `bnu-high-ds-v1-s4-478` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立计算得表面积为172π/3 cm²，与答案52π cm²不符，解析也指出数据需调整。 |
| `bnu-high-ds-v1-s4-489` | S4 | multiple-choice | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 等体积法计算得距离为3/2，但题目答案和解析均错误地给出√6/2，解析中计算过程也得出3/2却与答案矛盾。 |
| `bnu-high-ds-v1-s4-492` | S4 | short-answer | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 正四棱锥高为2，体积为32/3，但答案错误给出16√2/3，解析中计算过程也得出32/3却与答案矛盾。 |
| `bnu-high-ds-v1-s4-495` | S4 | multiple-choice | fail | blocker | fail/fail/fail | math_error, answer_mismatch, bad_options, unsolvable, explanation_contradiction | 给定条件下异面直线所成角余弦为9/13，不在选项中，题目无正确选项，解析也承认计算得9/13但强行匹配错误答案。 |
| `bnu-high-ds-v1-s5-015` | S5 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 独立求解得垂直平分线方程为6x-8y-15=0，而答案3x-4y-7=0错误，中点代入不满足，解析也指出答案有误，答案与解析矛盾。 |
| `bnu-high-ds-v1-s5-017` | S5 | short-answer | fail | blocker | fail/fail/fail | unsolvable, math_error, answer_mismatch, explanation_contradiction | 由条件列方程得2=34矛盾，题目数据错误，无法求解，答案和解析均无效。 |
| `bnu-high-ds-v1-s5-018` | S5 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 平行需排除重合，a=2时两直线重合，应舍去，正确答案只有a=-3，答案和解析均错误。 |
| `bnu-high-ds-v1-s5-033` | S5 | fill-in | fail | blocker | pass/pass/fail | explanation_contradiction | 题目可解，答案正确。但解析中解方程|1-k|=√5·√(k²+1)得到k=2或k=-1/2，然后错误地舍去k=-1/2，实际上k=-1/2不满足方程，正确解应为k=2，且斜率不存在时x=2也满足。解析存在计算错误和矛盾，与正确答案不符。 |
| `bnu-high-ds-v1-s5-034` | S5 | multiple-choice | fail | blocker | pass/fail/fail | answer_mismatch, explanation_contradiction | 题目可解，独立求解得直线方程为y=-1。但题目给出的答案为x=2，解析过程混乱且最终结论错误，与正确结果矛盾。选项中有y=-1，应选此项。 |
| `bnu-high-ds-v1-s5-039` | S5 | fill-in | fail | blocker | fail/fail/fail | math_error, unsolvable, explanation_contradiction | 点P(2,-1)到圆心(1,-2)距离为√2，小于半径√5，点在圆内，无法作切线。题目无解，答案和解析均错误。 |
| `bnu-high-ds-v1-s5-048` | S5 | fill-in | fail | blocker | fail/fail/fail | math_error, answer_mismatch, explanation_contradiction | 题目中圆C圆心(3,4)，直线过A(1,0)，但解析错误使用圆心(2,1)和直线方程y-1=kx，导致答案错误。正确解法：设直线y=k(x-1)，圆心到直线距离d=|2k-4|/√(k²+1)，弦长2√(4-d²)=2√3得d=1，解得k=1或1/7。答案应为1或1/7，与存储答案一致，但解析完全错误，需修正。 |
| `bnu-high-ds-v1-s5-060` | S5 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 直线过定点P(2,1)，圆心C(1,-2)，CP斜率3，弦长最短时l⊥CP，故m·3=-1，m=-1/3。答案m=-1错误，解析中虽指出错误但最终未修正，答案与解析矛盾。 |
| `bnu-high-ds-v1-s5-063` | S5 | fill-in | fail | blocker | pass/fail/fail | math_error, answer_mismatch, explanation_contradiction | 距离公式|3+8+k|/5=2得|11+k|=10，解得k=-1或k=-21，但答案和解析均错误给出1或-19，解析中甚至写k=-1或k=-21却给出错误答案，严重矛盾。 |

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- RAG cards were used only for grade/chapter/topic fit, not as an answer key.
- This QA artifact does not edit candidate questions or promote public `data/questions.ts` entries.
- Rows with `qaOutputConcernTags` need S18 human adjudication before their DeepSeek rationale is used as remediation evidence.
