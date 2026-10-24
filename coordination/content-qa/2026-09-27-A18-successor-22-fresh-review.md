# A18 fresh review：AR successor 的最终 22 题修正

## 身份、范围、当前判定

- Reviewer role：A18；实际 canonical agent ID：`/root/a18_pr172_copy_review`。
- `reviewedAt`：`2026-09-27T10:03:18Z`。本角色独立读取原题／最终题干和选项，先推导数学结果，再读取候选 answer／acceptedAnswers／explanation 作比对；未把 independentAnswer、manualQaStatus、reviewNotes 或候选 solver 当作解题 oracle。
- 精确源 HEAD：`fc6c24446659c54f92482cffd2de6e180bbb03c2`；工作树 `/Users/dongpinhu/.codex/worktrees/pr201-ar-correctness-20260924/MAIS-MVP`。旧父提交 `4834189e63d74f0e1a27475d9968f5c88c2bc78f`，通过只读 Git blob 获取其同路径题包。
- 题包路径：`data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json`；observed old raw SHA-256 `72513886e6b52a253e598c744ae1d4a5bedfe5ebf6f8d6c544fc51904a555452`；observed reviewed raw SHA-256 `b1038a0ff8fe9b3ff8077a15dafccf18197565388fb5b6904a41e87bdeae3459`。
- 精确 allowlist 与四文件 aggregate 由 `coordination/release-intake/2026-09-27-A25-ar-22-final-manifest.json` 提供，aggregate=`6e049fe445166dfe6887d0a0ad572a4f6645c41b35fffdfa6ae0a4ee66615c5b`。本轮复核前再次计算四文件 hash，均与该最终清单匹配。
- **当前 bounded verdict：`needs-repair`。** 本次数学推导与 22 条候选 key 均吻合，但选定积分题存在新增确认的 P2 作答／评分单位问题。问题修正并重新绑定前，不能对上述 b1038 字节作无条件 `approved-for-integration-review`。计数：P0=0、P1=0、P2=1、P3=1（历时表达仍作为所问年份的别名）。这不是整包 QA、Promotion 或 live approval。

| 四文件 | observed SHA-256 |
| --- | --- |
| `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json` | `b1038a0ff8fe9b3ff8077a15dafccf18197565388fb5b6904a41e87bdeae3459` |
| `lib/fullQuestionBankSolvability.test.ts` | `d34489d21cb4f835f3ea56b53fb1ce62ae70b5ca482f9233a063cc59ba3cafef` |
| `scripts/arkansas-correctness-solvers.mjs` | `8b6c3daf843b347f2e21a5e3998fcfac3291c94d6c5224cf63b70b9b71872859` |
| `scripts/audit-us-math-item-quality.mjs` | `8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be` |

## 实际独立解算方法

使用教科书数学定义、三角恒等关系、导数／定积分和独立 Python 标准库计算；没有导入 `scripts/arkansas-correctness-solvers.mjs`、没有读取 candidate independentAnswer 生成期望值。数值方程先证明此前区间没有根，再在有符号变化的区间二分 100 次；这与简单调用候选 solver 后认可其结果不同。随后逐题核对最终解释与 key，核对所有七个 multiple-choice 的唯一正确选项。

以下 row 为题包 `questions` 数组的 1-based 行号，和 A25 changed-ID 清单一一对应；本报告只记录审核所需的新推导结果，不复制完整题文。

| Row | 独立 expected answer／推导 | 最终内容比对与等价形式界限 |
| --- | --- | --- |
| 191 | 排序后第 12、13 项均为 8；median=8 | key 与解释正确。整数 8 为目标，不接受旧中位数；没有修改原数据 |
| 210 | 最终数据总和196，七日 mean=196/7=28 | 唯一 MC 选项28。原数据总和198、mean=198/7；第一条数据被修改，因此是新的题干内容，不能称答案语义未变 |
| 864 | C=70°；BC=10sin50°/sin70°=8.152074690959047…，一位小数8.2 cm | key8.2 cm正确；题干允许省略cm，shared matcher 接受 bare8.2符合该契约。解释的边角对应正确 |
| 874 | AC=5√3；CD/CB=AC/(AB+AC)；DE=10√3/(2+√3)=20√3−30≈4.641016151… | 最终 MC 只有该根式正确。相同值的根式表达是数学等价，MC并不承诺任意 free-text 根式解析 |
| 896 | 与row864同一正弦定理结果，一位小数8.2 | key／解释正确；题干明确一位小数、cm可选，不再要求评分解释文字 |
| 953 | 最终 r=10、d=6；弦长2√(100−36)=16 cm | key16及cm别名正确。原d=12大于半径，无法形成该弦；修正距离改变数学前提，不是 baseline-only |
| 1036 | 另一股12；均匀面积比 c/(a+b+c)=13/30 | 唯一 MC 正确选项13/30；新增uniform使面积比的概率解释成立 |
| 1042 | 5–12–13 三角形同理13/30 | 唯一 MC 正确选项13/30 |
| 1046 | 5–12–13 同理，最简分数13/30 | key与解释正确。题干要求最简分数；数学上等值但不最简的分数／小数是否获分属于 matcher格式能力，不能从本次数学判断推导 |
| 1048 | 另一股8；6–8–10 面积比10/(6+8+10)=5/12 | 唯一 MC 正确选项5/12 |
| 1052 | 5–12–13 面积比13/30 | 唯一 MC 正确选项13/30；删除不可由MC评分的书面方程要求，评估能力已收窄 |
| 1157 | exp(.4t)cos(πt/2)=.5；第一正根0.7593860519762017…，两位小数0.76年 | key与解释正确；接受t=0.76或明确年单位的形式，不应把旧错误近似当别名 |
| 1163 | 800+200sin(πt/6)−500exp(.05t)=0；第一根6.924992896505119…，一位小数6.9月 | key／解释正确；月份表示是elapsed months after起点，不是第7个整月 |
| 1169 | 1200+300sin(πt/6)−800exp(.02t)=0；第一根8.014292919595729…，一位小数8.0月 | key／解释正确；8与8.0数值等价，评分不能自动检查书写了尾零 |
| 1181 | 与row1163同一根；两位小数**6.92**月 | 真实根小于6.925，不能先四舍五入为6.925再二次舍入成6.93。最终解释保留足够精度，key正确 |
| 1196 | 与row1169同一根，一位小数8.0月 | key／解释正确；8.0、t≈8.0及月份单位对应同一量 |
| 1197 | 1200+300sin(πt/6)−800exp(.05t)=0；第一根6.573312872536034…，一位小数6.6月 | 最终 MC 唯一正确选项6.6 months，另外三个选项均不等价 |
| 1202 | 与row1163同一根，一位小数6.9月 | key／解释正确 |
| 1219 | residual=observed−predicted=330−200exp(.5)=0.25574585997435406…；两位小数0.26 | 正号表示实际略高于模型。key／解释正确；原接受集合含0.3，新增两位小数条件下0.3不合要求 |
| 1430 | F(t)=−.5t⁴+5t³−12t²+10t；F(4)−F(1)=40−2.5=37.5千美元；按通常半入约定最近千美元为**38千美元=$38,000** | 数学 key38（以千美元计）及解释正确，但最终题干未明确要求输出“千美元的数值”，shared matcher拒绝正确美元形式且接受$38。见P2 |
| 1439 | P′(x)=−6(x−5)(x−10)；比较x=0,5,10,20的值1000,375,500,−3000；闭区间最大值$1000 | key及解释正确；必须比较端点，不能只选局部峰值。单位明确美元 |
| 1476 | P′(t)=−6(t−1)(t−4)，P″(4)=−18<0；局部最大在t=4，所问calendar year=2024 | key／解释及新增2024接受形式正确；`t=4`仍作为别名为P3，不能称该形式明确给出了所问年份。已删除解释要求，故不评价学生书面论证 |

### 第一根与概率的独立论证

- 对三个季节／指数模型，t∈[0,6]时sin(πt/6)≥0，差函数下界分别为 `800−500exp(.3)=125.070596…`、`1200−800exp(.12)=298.002518…`、`1200−800exp(.3)=120.112953…`，均正，故不能在该区间更早相交。t∈[6,9]时cos(πt/6)≤0，差函数导数严格为负；各自已有符号变化的区间内唯一交点即第一正根。
- 对exp-cos模型，g(t)=exp(.4t)cos(πt/2)先在0至 `atan(.4/(π/2))/(π/2)=0.1587400955…` 增长，值至少1；其后至t=1严格下降到0。因此g=.5在这段有唯一第一次正解。没有把g从t=0起错误声称为始终下降。
- 对最接近斜边的几何概率，三角形内到两邻边等距的分界是角平分线；两条锐角平分线交于内心。靠斜边区域的底为c，高为inradius r，面积cr/2；全部面积r(a+b+c)/2，均匀取点下概率为c/(a+b+c)。边界等距集面积为0，不改变概率。此处未用旧错误选项当作数学证据。

## 新确认的评分 P2 与保留 P3

### P2：row1430 的作答单位契约不足

在完成数学推导后，直接读取同源 `lib/server/answerMatching.ts`，再用 `questionAnswerMatches` 对候选 answer／acceptedAnswers 做只读 evaluator replay。没有改源码、测试或题包。observed outcomes：

| 输入形式 | 当前 matcher |
| --- | --- |
| `38` | 接受 |
| `38 thousand dollars` | 接受 |
| `38000` | 拒绝 |
| `38,000 dollars` | 拒绝 |
| `$38000` | 拒绝 |
| `38 dollars` | 接受 |
| `$38` | 接受 |
| `37.5`、`37500` | 拒绝（本题要求舍入，未舍入的两个量确应拒绝） |

最终题干已经把原profit改为profit rate，以千美元／年解释，解决积分的量纲前提；但仍问总利润、按最近千美元舍入，没有明确要求答案填“千美元数值”。`$38,000` 是数学和自然语言均正确的结果，却因 key为38且matcher没有千倍单位换算而失败；`$38` 是不等价的金额却被宽松单位逻辑接受。本轮把它记为 **P2 内容／评分契约缺陷**，不以“这是candidate-only”或既有22题批准将其忽略。

最小内容修复方向：仅在此已选定题的最终题干明确要求“用千美元作单位、只输入数字”；或在允许的契约下正确支持美元与千美元形式并验证不等价单位不会误判。修改后应生成新不可变 digest，独立复核数学／语言与对应 matcher；不授权本 A18 编辑该题或通用 grader。添加一个美元别名而同时保留38美元误接受，不能称为完整消除此评分风险。

### P3：row1476 的历时别名

所问量是calendar year，但接受集允许`t=4`。这是正确临界点与2024的可换算前置信息，尚未完整写出所问年份。当前 matcher replay接受2024和t=4、拒绝裸4及相邻错误年份。保留此已知宽松别名为P3，不将其变成评估学生论证的能力；本轮无需整体重写历史题。

## 全包与后续证据边界

- 此次实际重新解算的是最终22条修正，不是1500题。1478条未改的字节比较可从本次前序语义报告复用，不意味着已验收。
- 248/1500 solver覆盖、0 mismatch、863 uncovered、389 unjudgeable是此前限定机器检查结果；本次没有重跑那个solver，也不把本次22条新鲜解算加到248上重复计数。
- inherited official-standard mapping（此前记录三章128条）、来源自引用／provenance等门禁仍未通过。本次没有查询新外部课标文献，也没有批准新的课程映射、source-distance或整个AR包。
- 此前A18在b1038字节上的有界批准是历史事实；本轮新增P2结果说明当前不能只复制旧批准生成successor evidence。保留旧review，不覆盖它，并让新决定显示此次发现及待修复版本。
- 当前checker/schema由协调者另行冻结；本报告是先于新 evidence binding 的真实内容复核。不制造或签署native promotion-pass。新schema提供后，JSON只能忠实编码该实际review verdict和精确digest，不能为了门禁GREEN把needs-repair改成approved。
- A23负责新的NON-LIVE successor合同／可达性边界；A11负责修后同字节 grading regression；A25绑定精确源码与提交；A22负责适用release evidence。旧 #201是否完全替代、整包live import、merge、deploy和历史chain清理均不是本报告判定。

本轮唯一写入是本报告；未改source、Git refs／index、旧Manifest／Receipt／Registry或任何已存QA证据。后续修订应追加新版本复核，保持本次b1038发现与审查时点可追溯。
