# A23 独立审查：legacy successor activation C1d（九文件审计别名修复）

- 审查身份与会话：`/root/a23_successor_design_review`。
- 审查时间：`2026-09-28T12:40:34.000Z`。
- 决定：**approved-for-required-check-integration**，只批准下述 C1d 精确代码字节进入后续独立 activation marker、证据提交及可审查 PR。此决定不表示当前 GitHub required checks 已通过，也不授权 live、整包内容接受、合并或部署。
- 本报告的预定逐字节复制位置：`coordination/integration/legacy-successor/activation/a23-review.md`。本作者源文件位于 primary checkout 的 `coordination/release-intake/2026-09-28-A23-legacy-successor-activation-v4-review.md`。

## 冻结身份与精确范围

我只读复核 `/Users/dongpinhu/.codex/worktrees/g4/MAIS-MVP`：HEAD `3218740bb421d835c22265cf16cb865d4c0f1d70` 是存储提交 `5b1445e32f72156e1effa27ae31c3e08ec4d0fab` 的直接子提交；checkout 干净。该提交的差分恰好是下列九个路径，所有 Git blob 均为常规 `100644`，工作文件字节逐个等于 Git blob。按路径排序的 `[path,mode,rawSha256]` 独立重算 codeDigest 为 `b276144694d56bb969aa29970fb79e9abac131ec71bd36e92377467215abe983`。

| C1d 精确路径 | Raw SHA-256 |
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

## 审计、原生证据和门禁边界

旧 #267 head 的 `promotion-shadow-gate` 曾成功，但独立 `validate` 因当前题包的 `38,000` 与 `38,000 dollars` 两个已批准别名报出两条 `correction-alias-mismatch` P1；其余八条为 P2。该失败属于旧 head，必须保留原意。C1d 只在当前头审计脚本的纠错别名比较处调用新纯函数：它只对完整、常规三位分组的数值别名去逗号，随后仍交给原 `numericCorrectionAnswer`；错误分组、错误数值和原有非分组解析继续按旧规则拒绝或比较。`package.json` 与 CI `validate` 工作流未改，原有 `npm run audit:us-math-items` 将运行当前头审计脚本。

该审计脚本同时属于原生 v1.1 的冻结 `SOURCE_PATHS`／`BUNDLE_PATHS`。我核对释放提交 `611eacd502547cb75355de66e216a3785634f159` 中旧审计 raw SHA 为 `8ce651dee106622caf42b2212de7ee4d78fb05d0c1f41943e977bba9a03212be`；C1d 当前头 raw SHA 则为 `5015c0dc…`。新 required-check 的 `CODE_PATHS` 精确纳入当前头审计脚本、新别名函数及其测试；决策的 `auditAuthority` 明示旧冻结哈希、新当前头哈希与 `current-head-ci-only` 范围。原生执行继续固定在 `ff709c0141ef8660604a20340b1c476bf2941f60`，冻结 checker bundle digest `37da13…`、attempt009 Manifest 与已存储 Receipt 不改。**旧 Receipt 只证明冻结的旧审计源字节，不证明 C1d 新审计脚本通过。**

我独立核对当前题包 raw `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766` 与已存储 canonical Receipt raw `dc6495b8ff09a4d1369a9780fe112572dd368dabda08ae3f5e036044d94ff32c` 均未改变。旧 v2.6 public CLI、历史 Manifest／Receipt／Closure／Registry、原生 v1.1 模块及旧 workflow 的 v2 步骤仍保持原义；successor 选择由 marker 的真实 Git 追加历史、精确代码集、审查记录和当前头绑定控制。允许未来复用此 activation 的仅为限定文档与独立测试路径；若存在此类后续路径，`currentHeadObservation` 会重新执行 runtime policy 与 canonical legacy audit 投影比较。它不把结构投影当成任意 runtime 源字节审查，因此 runtime、配置、workflow、冻结源与 promotion 路径仍不能作为后续复用路径。

## 验证与剩余限制

本 A23 会话在 g4 候选上独立执行：新 activation／审计测试合计 12／12 通过；旧 Promotion v2 suite 107／107 通过；`npm run audit:us-math-items` 退出码 0，结论 P0=0、P1=0、P2=8。随后仅修正新 pathset 测试原本误称“排除所有冻结 source”的标题与断言，使其明确记录唯一当前头审计例外；我重新读取该最终测试原始字节，并独立重跑该文件 8／8 通过。最终 C1d 九文件在本代码审查范围内 P0=0、P1=0、P2=0。没有在本会话重新运行昂贵原生 Shadow 或 Receipt replay，也没有 C1d 精确 head 的 GitHub required-check PASS 可供本报告认领。

新 marker 必须由 C1d 的真实独立 A11／A23 报告和闭合决定逐字节引用，并在单独提交中首次添加；旧 C2／#267 marker 与审查记录不能改写或复用。当前外部 branch protection 仍存在候选可控制 workflow、缺少独立受保护审查的 P1；本代码决定未关闭该外部问题。AR 题包仍是 22 条有限纠错、1478 条未变的 non-live／de-reached successor，不构成 1500 题整包接受。#262 的旧 `fc6c244…` head 不是此 `4f677…` 题包，不能由本记录解除阻断；#201 继续保持 OPEN。

本批准仅绑定 C1d `3218740bb421d835c22265cf16cb865d4c0f1d70` 及上列 codeDigest。任何代码字节或路径集变化都需要重新独立审查、重算 digest 与建立新 marker。
