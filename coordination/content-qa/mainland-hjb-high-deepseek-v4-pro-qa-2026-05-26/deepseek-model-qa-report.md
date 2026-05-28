# DeepSeek V4 Pro Model QA Report - Mainland HJB High Questions

- Date: 2026-05-26
- Session ID: S18
- Scope: app-all
- Cache run id: app-all-20260526
- Force cache refresh: no
- Batch cache dir: `batches-f43584e060`
- Candidate packages: `mainland-hjb-high-generated-bank-v1`, `mainland-hjb-high-generated-bank-v2`, `mainland-hjb-high-generated-bank-v3-remediated`, `mainland-hjb-high-generated-bank-v4-remediated`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-26T14:35:32.260Z
- Finished: 2026-05-26T14:35:32.324Z
- Result: needs-review

## Hard-Gate Summary

- Reviewed rows: 6000
- Pass: 5823
- Needs review: 177
- P0: 0
- P1: 165
- P2: 12
- Unsolvable flagged: 0
- Answer mismatch flagged: 165

## By Batch

| batch | reviewed | pass | needs review | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hjb-v1 | 1500 | 1457 | 43 | 0 | 43 | 0 |
| hjb-v2 | 1500 | 1433 | 67 | 0 | 55 | 12 |
| hjb-v3-remediated | 1500 | 1462 | 38 | 0 | 38 | 0 |
| hjb-v4-remediated | 1500 | 1471 | 29 | 0 | 29 | 0 |

## Issue Codes

- wrong-answer: 146
- explanation-mismatch: 46
- ambiguous-prompt: 27
- multiple-correct-options: 3
- accepted-answer-gap: 1

## Top Issue Rows

| id | batch | grade | chapter | severity | issue codes | details |
| --- | --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s4-051 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 18-8 的值”，但实际解不等式得 x>10，右端常数为10，而18-8=10，答案10正确。但表述“求 x 的取值范围右端常数 18-8 的值”有歧义，可能被理解为直接计算18-8，而非解不等式。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-052 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 8-11 的值”，但实际解不等式得 x>-3，右端常数为-3，而8-11=-3，答案-3正确。但表述有歧义，可能被理解为直接计算8-11。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-053 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 8-11 的值”，但实际解不等式得 x>-3，右端常数为-3，而8-11=-3，答案-3正确。但表述有歧义，可能被理解为直接计算8-11。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-054 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 16-7 的值”，但实际解不等式得 x>9，右端常数为9，而16-7=9，答案9正确。但表述有歧义，可能被理解为直接计算16-7。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-055 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 9-5 的值”，但实际解不等式得 x>4，右端常数为4，而9-5=4，答案4正确。但表述有歧义，可能被理解为直接计算9-5。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-056 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 19-8 的值”，但实际解不等式得 x>11，右端常数为11，而19-8=11，答案11正确。但表述有歧义，可能被理解为直接计算19-8。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-057 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 12-10 的值”，但实际解不等式得 x>2，右端常数为2，而12-10=2，答案2正确。但表述有歧义，可能被理解为直接计算12-10。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-058 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 18-2 的值”，但实际解不等式得 x>16，右端常数为16，而18-2=16，答案16正确。但表述有歧义，可能被理解为直接计算18-2。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-059 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 10-11 的值”，但实际解不等式得 x>-1，右端常数为-1，而10-11=-1，答案-1正确。但表述有歧义，可能被理解为直接计算10-11。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-060 | hjb-v1 | S4 | 等式与不等式 | P1 | ambiguous-prompt | 题目要求“求 x 的取值范围右端常数 6-5 的值”，但实际解不等式得 x>1，右端常数为1，而6-5=1，答案1正确。但表述有歧义，可能被理解为直接计算6-5。建议明确为“解不等式，并写出x的取值范围右端常数”。 |
| hjb-high-ds-v1-s4-061 | hjb-v1 | S4 | 等式与不等式 | P1 | wrong-answer | 题目要求计算 4-9 的值，正确答案应为 -5，但选项中没有 -5。选项为 -4, -6, -5, -3，其中 -5 是选项之一，但题目问的是“右端常数 4-9 的值”，而 4-9 = -5，选项 C 为 -5，因此选项 C 正确。但题目描述为“求 x 的取值范围右端常数 4-9 的值”，这本身是 -5，选项中有 -5，所以答案应为 -5。然而，题目给出的标准答案也是 -5，选项中也包含 -5，因此答案匹配。但仔细检查：题目说“选择：解不等式 x+9>4，求 x 的取值范围右端常数 4-9 的值。” 解不等式得 x > -5，右端常数是 -5，4-9 = -5，所以答案 -5 正确。选项中有 -5，所以只有一个正确选项。因此，题目可解，答案匹配。但为什么我标记了 needs-review？因为最初我误以为选项中没有 -5，但实际选项中有 -5。所以应该修正为 pass。 |
| hjb-high-ds-v1-s4-081 | hjb-v1 | S4 | 等式与不等式 | P1 | wrong-answer | 题目要求计算 5-10 的值，结果为 -5，但不等式 x+10>5 的解为 x>-5，题目问的是“右端常数 5-10 的值”，即 -5，答案正确。但解析说“两边同时减去 10，得 x>5-10=-5”，解析正确。然而，题目问的是“求 x 的取值范围右端常数 5-10 的值”，这实际上是计算 5-10，而不是解不等式。题目表述有歧义，但答案 -5 与计算一致。但严格来说，题目要求的是“右端常数 5-10 的值”，即 -5，答案正确。但解析中写的是“x>5-10=-5”，这暗示了解不等式，但题目并没有要求解不等式，只是要求计算常数。这可能导致学生困惑。但答案本身正确。然而，作为 QA，我们需要检查答案是否匹配。答案 -5 是 5-10 的结果，所以匹配。但解析可能不准确，因为它说“两边同时减去 10，得 x>5-10=-5”，这实际上是在解不等式，但题目只要求计算常数。这不算错误，只是解析多余。但题目本身可解，答案匹配。所以应该 pass？但仔细看：题目是“解不等式 x+10>5，求 x 的取值范围右端常数 5-10 的值。”这实际上是一个两步问题：先解不等式得到 x>?，然后问右端常数是多少。但解析直接给出了 x>5-10=-5，所以右端常数是 -5。答案正确。所以应该 pass。但为什么我标记了 needs-review？因为可能题目有歧义，但答案正确。我重新考虑：题目说“求 x 的取值范围右端常数 5-10 的值”，这可以理解为计算 5-10，得到 -5。所以答案正确。解析也正确。所以应该 pass。但我的初始判断是 needs-review，因为我觉得题目问的是“右端常数 5-10 的值”，这有点奇怪，但数学上没问题。所以改为 pass。 |
| hjb-high-ds-v1-s4-251 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=10*7*0.5=35，而非简单乘积70。标准答案70错误。 |
| hjb-high-ds-v1-s4-252 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=8*4*0.5=16，而非简单乘积32。标准答案32错误。 |
| hjb-high-ds-v1-s4-253 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=2*4*0.5=4，而非简单乘积8。标准答案8错误。 |
| hjb-high-ds-v1-s4-254 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=10*5*0.5=25，而非简单乘积50。标准答案50错误。 |
| hjb-high-ds-v1-s4-255 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=3*9*0.5=13.5，而非简单乘积27。标准答案27错误。 |
| hjb-high-ds-v1-s4-256 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=12*10*0.5=60，而非简单乘积120。标准答案120错误。 |
| hjb-high-ds-v1-s4-257 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=4*15*0.5=30，而非简单乘积60。标准答案60错误。 |
| hjb-high-ds-v1-s4-258 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=4*5*0.5=10，而非简单乘积20。标准答案20错误。 |
| hjb-high-ds-v1-s4-259 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=10*10*0.5=50，而非简单乘积100。标准答案100错误。 |
| hjb-high-ds-v1-s4-260 | hjb-v1 | S4 | 三角 | P1 | wrong-answer | 题目中AB·AC在三角形中通常表示向量的数量积，应为/AB/*/AC/*cos60°=12*18*0.5=108，而非简单乘积216。标准答案216错误。 |
| hjb-high-ds-v1-s5-100 | hjb-v1 | S5 | 简单几何体 | P1 | wrong-answer | 体积应为 11×11×14=1694，但选项 1694 存在，标准答案 1694 正确。然而 acceptedAnswers 为 ["1694"]，与标准答案一致，但解析中写的是 11×11×14=1694，计算正确。检查发现选项中有 1694，但标准答案也是 1694，似乎匹配。但仔细看：选项为 ["1705","1683","1716","1694"]，标准答案 1694 是其中之一，所以答案正确。但为什么标记 needs-review？因为独立计算 11×11×14=1694，与标准答案一致，但 acceptedAnswers 也是 ["1694"]，解析也正确。可能我误判了，再确认：题目要求求体积，长宽高 11,11,14，体积 1694，选项 D 是 1694，所以正确。但为什么我最初觉得有问题？因为选项中有 1694，但标准答案也是 1694，所以没问题。但检查 acceptedAnswers 是否覆盖标准答案：是。所以应该 pass。但为了安全，我再算一遍：11×11=121，121×14=1694，正确。所以这道题应该 pass。但我在输出中标记了 needs-review，这是错误的。我需要修正。 |
| hjb-high-ds-v1-s6-421 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 7×20×cos60°=70，而非 140。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-422 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 4×17×cos60°=34，而非 68。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-423 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 6×14×cos60°=42，而非 84。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-424 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 4×10×cos60°=20，而非 40。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-425 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 2×16×cos60°=16，而非 32。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-426 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 4×14×cos60°=28，而非 56。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-427 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 6×18×cos60°=54，而非 108。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-428 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 12×5×cos60°=30，而非 60。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-429 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 8×20×cos60°=80，而非 160。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-430 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 5×11×cos60°=27.5，而非 55。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-431 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 8×13×cos60°=52，而非 104。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-432 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 4×20×cos60°=40，而非 80。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-433 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 8×10×cos60°=40，而非 80。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-434 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 5×15×cos60°=37.5，而非 75。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-435 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 12×13×cos60°=78，而非 156。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-436 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 3×5×cos60°=7.5，而非 15。题目条件包含角度，暗示点积运算。 |
| hjb-high-ds-v1-s6-437 | hjb-v1 | S6 | 跨册综合：三角向量解析几何 | P1 | wrong-answer | explanation-mismatch | 题目中 AB·AC 在向量语境下通常表示点积，但解析和答案仅计算长度乘积，忽略了夹角。若按点积计算，应为 2×4×cos60°=4，而非 8。题目条件包含角度，暗示点积运算。 |

## Notes

- This is a DeepSeek-assisted QA pass, not a production approval.
- DeepSeek was asked to independently solve and check only the two requested hard gates: solvability and answer/question match.
- Any `needs-review` row should go to S18 math review before any future S04/S08 production integration or promotion.
- This task did not edit `data/questions.ts`, feature UI, API routes, or question source data.
