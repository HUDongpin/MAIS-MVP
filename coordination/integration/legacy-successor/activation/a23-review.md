# A23 独立审查：legacy successor required-check activation C1c（六文件治理合同）

- 真实A23审查会话／身份：`/root/a23_successor_design_review`。
- 审查完成时间：`2026-09-28T12:04:48.000Z`。
- 限定决定：**approved-for-required-check-integration，仅批准以下C1c精确代码字节进入后续真实独立activation evidence与可审查PR。** 这不是GitHub required gate PASS、branch-protection防绕过、live、merge、deploy或整包内容接受。
- 本作者报告的预定复制路径：`coordination/integration/legacy-successor/activation/a23-review.md`。原始源文件位于primary checkout的 `coordination/release-intake/2026-09-28-A23-legacy-successor-activation-v3-review.md`；复制必须保持原始字节。

## 1. C1c真实Git冻结和代码范围

我用 literal-bound `/Volumes/Starship/MLA30` Git目录读取 `e8233d9215d048d9aea9b708613cbda1692351a0`。它是存储commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab` 的直接子提交；diff恰好六个指定路径，均为常规 `100644` Git blob。实际working bytes等于各Git blob，checkout clean。对按路径排序的 `[path,mode,rawSha256]` 重新计算codeDigest为 `0eeca0605843eabe72ec424ac1fc3fdd9b99bf9e10132c1ff3acf5179ccaf74b`。

| 精确C1c路径 | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `436a1bafdc31fab8e875d5f424a3a3a7bd6dd6d7d6d7ccbd09c07c31cbef221b` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `f7fb6f6fde1be9f2b657d70e9bc2f5afb3de99b87797154118ed44b8f3f45574` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |
| `scripts/release-governance.test.mjs` | `9b33138536f4a55d9d11096b2473a3c499432300435311b65f56b5d2da9d74ac` |

此版本相对旧C1b `75d4d377…` 增加第六件治理测试，verifier的闭合 `CODE_PATHS`同步增加该路径，新test断言路径数恰为六。治理测试本身仅将旧v2 workflow三个 `if` 字面预期更新为精确 `mode == 'v2'` 条件；保留原有 `always()`、artifact闭合、semantic verifier及不可跳过job断言。新successor分支由独立workflow测试覆盖，未以删除旧门禁测试换绿。

未来head复用此activation authority的路径约束更窄：只允许限定README／docs文本、release-intake Markdown及 `tests/**/*.test/spec` 的已列扩展名；不允许runtime、配置、workflow、promotion、冻结source或治理代码变更。大小写不敏感且允许前导下划线的前缀防护拒绝 helper／fixture／setup／support 目录或测试文件名。我的纯只读 `assertFuturePaths`探针验证5件合法路径准入、9件runtime／shared／support路径拒绝；三个修改Node文件的`node --check`及`git diff --check`均exit0。代码审查在上述精确范围内 P0=0、P1=0、P2=0。

原始v2.6 public scripts、旧promotion checker／历史Manifest／Receipt／Closure／Registry、原生v1.1合同、四个candidate/scoring源文件、`package.json`／lock和已存储attempt009 Receipt均与storage commit保持原字节。修后AR candidate raw仍为 `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`；22条有限更正不构成1500题整包批准，AR保持de-reached与non-live。旧#262 `fc6c244…`／源题包`b1038a…`不能由本代码审查替代。

## 2. 本地测试readback与#266真实状态

协调者在短路径隔离checkout执行C1c测试；我独立读取完整日志字节：新activation suite10／10 PASS、0 fail，`/private/tmp/mais-activation-v3-short-new-tests-final2.log` raw `87df5d4df4fcea564b8f449714e9ade4d7d7a48d2ceb70350acc1d3854eebea9`；旧promotion-gate suite107／107 PASS、0 fail，`/private/tmp/mais-activation-v3-short-promotion-gate.log` raw `44d5602bcc1eeb1a8a9bfb096f2c2acae3fb19bd7784be9ecc7a59843fdf8be0`；release-governance suite共151项，其中140 PASS、11 SKIP、0 fail，`/private/tmp/mais-activation-v3-short-release-governance.log` raw `c200c03cf9c022006e0199f6f99928621afe76c9b4f04e31b28c0647ba3f7e79`。执行者为协调者；本A23没有重跑会写临时Git fixture的suite或原生操作。另一个长Codex路径的旧promotion suite曾因既有 `AUTHORITATIVE_PATH_UNSAFE` 路径条件失败；它没有被记成C1c短路径PASS证据。

我实时只读核对 [GitHub #266](https://github.com/HUDongpin/MAIS-MVP/pull/266)：仍为draft／OPEN／BLOCKED，head仍是旧activation C2b `e13ddc1cf162e8b699d7eda7b89668585a0e278f`。该旧head的 `promotion-shadow-gate` 为SUCCESS，但独立 `validate` 为FAILURE。失败日志定位旧 `scripts/release-governance.test.mjs` 对v2 upload-step `if` 的过时字面预期；C1c第六文件正对应该测试，不改变旧v2步骤的真实行为。**旧head的promotion成功及validate失败都保留原历史含义，不能转签C1c；当前没有C1c精确PR head的真实GitHub required-check PASS。**

## 3. 新marker顺序及外部authority边界

新C1c的codeDigest／六路径set与旧C1b `d97017…`、旧C2b marker不相同。不得改旧marker或复制旧A11／A23 decision来填新版本；需真实独立两角色新报告与decision，随后只新增marker＋两角色报告／decision的直接子证据提交，逐字节引用C1c冻结。这一步是代码后续的独立授权链，不由本报告自动完成。

我再次实时只读读取GitHub main保护：只要求 `validate` 与 `promotion-shadow-gate` contexts，required approving reviews=0，code-owner reviews=false，rulesets=[]。PR控制自己的workflow／verifier仍可在恶意或未经独立审查的改动中自报绿色。**外部branch-protection P1保持未关闭**；C1c代码冻结、A23记录、本地suite通过或旧#266 promotion成功都不能单独证明全局gate防绕过。将来需另行建立并实测受保护的required workflow或等效独立必需审查／规则集。本记录不授权改GitHub设置、merge、live或deploy。

本A23决定仅绑定精确C1c `e8233d9215d048d9aea9b708613cbda1692351a0`／codeDigest `0eeca0605843eabe72ec424ac1fc3fdd9b99bf9e10132c1ff3acf5179ccaf74b` 的六件代码。任何一字节再改，都需新review、digest与marker；不可把旧head或旧CI结果包装为新版本通过。
