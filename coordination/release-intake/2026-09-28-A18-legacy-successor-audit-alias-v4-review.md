# A18 独立内容审核：legacy successor 当前 HEAD 别名审计 C1d

- 审核身份：`/root/a18_ar_review`，A18 独立内容审核。
- 审核时间：2026-09-28T12:41:07Z。
- 精确代码冻结：`3218740bb421d835c22265cf16cb865d4c0f1d70`，唯一父提交为 Receipt storage `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`。
- A18 verdict：**`approved-for-integration-review`，仅限本报告核对的当前 HEAD 审计别名修复与 21 道 Arkansas 更正题的 56 个 accepted aliases。** 这不是九文件治理实现的 A11/A23 批准、1500 题整包内容接受、GitHub required-check 通过、Shadow 晋升、主线合并或上线授权。

## 字节和范围绑定

我从 C1d 的 Git blob 逐件读取字节，核对当前 worktree 对应文件与 blob 相同，九件均为常规 `100644`；工作树 clean。以路径排序的 `[path, mode, rawSha256]` 数组做稳定 JSON 序列化并计算 SHA-256，得到 `codeDigest=b276144694d56bb969aa29970fb79e9abac131ec71bd36e92377467215abe983`，与候选声明一致。C1d 相对 storage 的差异恰好为以下九件；`git diff --check HEAD^ HEAD` 通过。

| C1d 路径 | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `d926355fc69cb3f29850651af814b99b24d0fcdef229599e33ccda66cc08cccd` |
| `scripts/audit-us-math-item-quality.mjs` | `5015c0dcbb85efee6cf4e077875285df4aa494ee3055fc33525cf77e927fc1a2` |
| `scripts/correction-audit-alias.mjs` | `e67adc5a3b03fd38e47ff84cf5b4190cab523801156de56b3b4bce934c857550` |
| `scripts/correction-audit-alias.test.mjs` | `70b3c5a516343489929bce58668408109b189c929a0f8a49cafed45df62a1119` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9c288118eb247b72f594b2e4d5089c1c780601a96ce38065f0eaa1d3843a4cd6` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `06801406bfca5679bb540d1c1a3245e8f5610b66d79a84cfdfdb731f6867c5da` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `29463256dd1af83b5caf843202d7e56e0eb8b7213a269b8ab1bcb69eca89225b` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |
| `scripts/release-governance.test.mjs` | `9b33138536f4a55d9d11096b2473a3c499432300435311b65f56b5d2da9d74ac` |

本次内容判断只覆盖审计脚本、别名 helper、别名测试与它们所检验的既有更正题。题包 `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json` raw SHA-256 仍为 `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`；独立求解器 `scripts/arkansas-correctness-solvers.mjs` 为 `6bbdf2ec6cb86f0dabd470fe60947f2bd2e6debacbd0907e287a760445f9884f`；学生判分器 `lib/server/answerMatching.ts` 为 `21cb263a87cd99e7a0465194410e7f82e5bfdb69a48cbb42d2bfaa33e321c0b0`。三者均未进入 C1d 提交差异；我没有把本报告扩展为整包重新审核。

## 独立核查与分级

1. 已读取提交中的实际代码。审计脚本仅在 `acceptedAnswers` 的更正题别名分支调用 `numericCorrectionAuditAlias`；主答案、MC 选项仍调用原 `numericCorrectionAnswer`，与提示词独立求解值比较的 P1 容差与拒绝逻辑保持原状。helper 仅当整个别名满足常规三位逗号分组语法时去逗号，再交给冻结求解器解析；其他文本保留原解析失败结果。
2. 独立遍历冻结题包：`correctedArkansasIds` 命中 **21** 道，合计 **56** 个 `acceptedAnswers`。逐题用 `solveArkansasCorrection` 得出提示词数值，按该题精度规则比较全部别名，**0** 个不匹配。旧解析器仅有两个合法分组别名解析为 `null`；新 helper 将 `38,000`、`38,000 dollars` 解析为 38000。它们对应的 G12 利润积分题先前经 A18 按题干独立核算为 37.5 千美元，按千美元取整后的美元答案为 38000；题包与学生判分器字节未变。
3. 反例保持拦截：`38,001` 解析成 38001，仍与 38000 不同并触发原 P1 比较；`38,00`、`3,8000`、`38,000/2` 均返回 `null`，同样不会被当成正确别名。提交测试还覆盖错误分组、双逗号、前导零和非许可单位。
4. 本次独立运行 `node --test scripts/correction-audit-alias.test.mjs`：**2/2 PASS**。运行 `node scripts/audit-us-math-item-quality.mjs`：exit 0，**Findings 8（P0=0，P1=0，P2=8）**。八条 P2 全在未修改的 Arkansas K–G5 题包，是重复干扰项或仅由格式提示区分的选项；它们没有被本修复消除，也不属于这 21 道更正题的放行声明。审计输出同时显示 Arkansas G6–G12 的 248/1500 道 solver-verified；不能由 21 道定点核查推断其余题已获独立内容接受。

**本切片新增内容缺陷：P0=0、P1=0、P2=0。** 全量审计保留上述既有 P2=8；未发现新的错误别名放行或错误数值被吞掉。上述测试与代码审查支持别名修复的 A18 限定通过，不替代浏览器判分回归或整个题库的内容判断。

## 冻结审计与当前 HEAD 的权限边界

原 v1.1 checker release `611eacd502547cb75355de66e216a3785634f159` 中的审计脚本 raw SHA-256 是 `8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be`；C1d 当前审计脚本是 `5015c0dcbb85efee6cf4e077875285df4aa494ee3055fc33525cf77e927fc1a2`。我从两个 Git 对象独立复算了它们的 raw hash。新 verifier 显式要求旧冻结字节仍在原 release，当前 HEAD 审计字节与之不同，并在决定中记载 `auditAuthority.scope="current-head-ci-only"`。因此新审计只能作为当前 HEAD 的 CI 内容检查；它不改写或追溯替换原生 v1.1 checker、attempt-009 Manifest/Receipt、历史 Shadow 语义或已冻结的 candidate digest。旧 #267 HEAD 的两条 P1 是该旧审计解析器的实际失败记录，不可倒填为通过；C1d 也须以自己的精确 HEAD 接受新检查。

## 结论和后续门禁

A18 仅批准上述精确 C1d 别名审计修复进入集成审核。九文件中 workflow、successor verifier 与治理测试的整体安全性和 required-check 集成仍由独立 A11/A23 审核；其精确字节、决策与新 marker 必须与 `codeDigest` 绑定。随后还需当前 HEAD 的真实 `validate` 与 `promotion-shadow-gate`、A23 Promotion/currentness、A25 clean-slice 与 A22 release-readiness，以及任何合并、部署所需的业主授权和同 SHA 实际验证。既有外部 branch-protection 防绕过 P1 不能由本内容报告关闭。当前状态为 **non-live**；本报告不赋予 integration、preview、deploy 或 production 权限。

本 A18 作者只新增此指定源报告；没有改动候选代码、Git refs、PR、历史证据或远端状态。
