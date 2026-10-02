# A18 fresh review v2：AR 22 题修正与美元作答契约

## 独立判定与身份

- Reviewer role：A18；实际 canonical agent ID／review session identity：`/root/a18_pr172_copy_review`。
- `reviewedAt`：`2026-09-27T10:15:26.000Z`（本轮读取并复核时点；随后完成独立差分／评分核对）。
- 复核源：`/Volumes/Starship/MLS27` 的四文件工作字节。本 A18 未进行 Git mutation、source edit、provider 或 native Shadow 操作；源码 commit／clean release binding 由 A25／A22另行证明。
- Verdict：**`approved-for-integration-review`**，严格限于原 allowlist 22 条答案／题干修正及修后row1430的金额评分契约。P0=0、P1=0、P2=0、P3=1（年份题仍接受历时别名）。整包仍 **candidate-only**，`wholePackAccepted=false`，不存在 live approval 或晋升 Receipt。
- 此判定不覆盖其他1478题、全包课标／来源、不切换全局workflow，不表示 #262 的 required gate 已解除。

## 观察到的精确字节

| 对象 | observed SHA-256 |
| --- | --- |
| 父版题包，原提交 `4834189e63d74f0e1a27475d9968f5c88c2bc78f` | `72513886e6b52a253e598c744ae1d4a5bedfe5ebf6f8d6c544fc51904a555452` |
| v1 fresh review 所审 #262 题包 | `b1038a0ff8fe9b3ff8077a15dafccf18197565388fb5b6904a41e87bdeae3459` |
| v2 `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json` | `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766` |
| v2 `lib/fullQuestionBankSolvability.test.ts` | `c0d6e8823449d4fbb524ccc4f6145ebd48acb058601ce0cef4c3ed091f8857cd` |
| v2 `scripts/arkansas-correctness-solvers.mjs` | `6bbdf2ec6cb86f0dabd470fe60947f2bd2e6debacbd0907e287a760445f9884f` |
| `scripts/audit-us-math-item-quality.mjs`（不变） | `8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be` |
| `lib/server/answerMatching.ts`（原工作树与MLS27相同，未改通用grader） | `21cb263a87cd99e7a0465194410e7f82e5bfdb69a48cbb42d2bfaa33e321c0b0` |

相对b1038版本，逐对象比较确认只有 `questions` 数组第1430条改变；其他1499题对象及题包顶层字段一致。该条的变化仅涉及prompt、answer、acceptedAnswers、explanation、independentAnswer、independentSolution和reviewNotes，没有更改id／年级／课标等身份字段。两项配套源码差分分别为新增美元接受／拒绝回归，以及既有积分solver在明确美元输出要求下将真实积分结果舍入后乘1000；audit脚本不变。

相对原725138版本，新候选仍为22条内容修正、1478条未改，不属于baseline-only。A18从原Git blob与当前文件重新计算 `contentDelta`，结果与 `/private/tmp/mais-successor-content-delta-v2.json` 完全一致：

- `changeDigest=e1593bba0943f65daf1a8101eb31c310865ac5fabe41c7b12cff58c6092ed941`；`contentChanged=true`；`wholePackAccepted=false`。
- 当前selected积分题recordDigest=`679f1bcc30a285c3700b85b08ca9c533a2cc9220c99694c1cda35537516989c3`。
- 排序后22个changed-ID集合的fingerprint=`7bf39303177c0801aaa621e6811d8179cdbba4e77a788f5faf2a412c3b6fc27c`。
- digest计算使用当前helper的stable JSON／fingerprint作为身份编码，没有用它生成数学期望，也没有运行successor validate／Shadow／required-check操作。本内容报告不承担checker是否冻结或有权产生Receipt的判定。

## v1 真正发现与其余21题的currentness

原新鲜复核 [2026-09-27-A18-successor-22-fresh-review.md](2026-09-27-A18-successor-22-fresh-review.md) 保持原字节，其SHA-256=`4a29cb13d5aeaa1fc4c5801678956ba4c6a418f70943353cf1ee9e85690750c1`。该报告记录先依据原／最终题干独立解算、后比对候选key的完整22条结果、首根论证、七个MC唯一正确选项，以及在b1038版本实际发现的P2。保留它的`needs-repair`状态，本v2是追加修后审查，不回写原报告。

其余21 selected rows在v2中与那个新鲜独立解算的对象逐字相同，因此其数学推导、解释和原评分形式判断继续适用。按row定位，其结果为：191=8；210=28；864和896=8.2 cm；874=20√3−30；953=16 cm；1036／1042／1046／1052=13/30；1048=5/12；1157=0.76年；1163／1202=6.9月；1169／1196=8.0月；1181=6.92月；1197=6.6月；1219=0.26；1439=$1000；1476=2024。结果来自v1该真实独立推导，不取candidate的independentAnswer当oracle，也没有重复把这21条计成新覆盖的另外21题。

保留P3：row1476的`t=4`仅写出历时，未完整给出所问calendar year，仍获分；2024为正确所问量。题干删除解释要求后只能评价数值，不声称评估学生书面推导。

## 修后积分题的独立数学与语言复核

1. 量纲仍为profit rate，单位千美元／年；积分上下限1与4未变。独立反导数 `F(t)=−.5t⁴+5t³−12t²+10t`，`F(4)=40`、`F(1)=2.5`，积分为37.5千美元，即$37,500。
2. 按通常半入约定，最近千美元为$38,000。新题干明确要求美元的数值，使用12000代表$12,000作为格式示例；12000与实际积分无关，不泄露38000答案。
3. canonical38000及安全别名均表示美元金额38000，没有任何数值38的alias。解释明确区分37.5千美元、$37,500和舍入后的$38,000，不再把38的单位留给学生猜测。
4. solver从解析题干的多项式系数和边界计算反导数差值，再在明确美元输出条件下返回`Math.round(thousands)*1000`。该逻辑未硬编码38000；本A18的积分推导独立于solver。

## 本角色执行的实际grader核对

A18从MLS27读取该row，再调用现行不变的 `questionAnswerMatches({answer,accepted_answers}, input)`，没有把期望答案替换成假设对象，也没有修改通用grader。观察结果：

| 输入 | 实际结果 | A18判断 |
| --- | --- | --- |
| `38000`、`38,000 dollars`、`$38000`、`$38,000` | 全部接受 | PASS：与明确美元输出一致 |
| `38`、`38 dollars`、`$38` | 全部拒绝 | PASS：不会把38美元误判成38000美元 |
| `37.5`、`37500`、`37000` | 全部拒绝 | PASS：未舍入或不正确舍入的结果不能获分 |
| `12000`（题干示例） | 拒绝 | PASS：格式示例不是可接受答案 |
| `8.2`（无关修正值） | 拒绝 | PASS：无跨题别名污染 |
| `38 thousand dollars` | 拒绝 | **LIMIT**：数学量等价，但超出本题明确要求的美元数值表单；不能将38别名悄悄放回以支持它 |

原P2因此在此精确v2候选中解决。支持范围清楚：允许指定美元形式，未承诺通用千倍单位换算、任意自然语言金额或所有近似输出。逗号加dollars组合是显式金额别名；此特定支持不等于修改通用matcher。

协调者另提供的持久回归日志 `/private/tmp/mais-successor-dollar-green-v2.log` 为1/1 PASS，rawSHA=`1d96cb68de55ceaba44fd1953c805971532d8291fe27f569cf2b60337fd6c920`。初次comma-unit失败日志 `/private/tmp/mais-successor-dollar-green.log` 的rawSHA=`83c21c09551fb97b3edce0878dcccaa26b824e5dd4c8bd5f71eeaf449bcb2485`，保留FAIL。协调者运行不是本A18的新全题测试；上述表是本角色另行执行的同字节grader核对。

## 证据上限与交接

- 接受范围仅为这22条修正。1478条未改不是1478条已验收；existing248/1500 solver coverage、863 uncovered、389 unjudgeable保持原有限scope，不能叠加本次重复解算虚增覆盖数。
- inherited官方课标映射和provenance／source-distance债务未由本次修复解除，whole pack不获接受；本轮未重新进行外部课标／来源研究。
- v1四文件aggregate `6e049fe4…`仅继续绑定原b1038版本，不能冒称绑定修后的4f677版本；v2必须另据上述四个新raw hashes绑定source与newcontent evidence。
- 本报告可供新NON-LIVE successor的内容输入。精确closed JSON schema提供后，由本A18独立作者根据本次实际判定填写22个recordDigest，不由协调者代写内容pass，不创造Promotion Receipt或live状态。
- A23独立审查合同、de-reached／liveAllowed=false及历史chain保存；A11独立检查新checker和同字节回归；A25和A22负责Git／clean source／build及证据currentness。原全局workflow没有因本A18判定而切换，旧#262红门禁不能从本报告推导已解除。
- 未执行Shadow、provider、Git mutation或源码修改；唯一新增是此v2内容报告。原needs-repairv1及其它历史Artifact全部保留。
