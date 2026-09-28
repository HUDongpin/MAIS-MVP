# A23 独立复核：legacy successor required-check activation C1b（测试环境修复）

- 真实A23审查会话／身份：`/root/a23_successor_design_review`。
- 审查完成时间：`2026-09-28T11:31:38.000Z`。
- 限定结论：**approved-for-required-check-integration，仅限下列新C1b精确代码字节可进入新的reviewable activation evidence／PR。** 本报告不批准真实GitHub gate PASS、外部防绕过、live、整包内容接受、merge或deploy。
- 本作者报告的目标复制路径：`coordination/integration/legacy-successor/activation/a23-review.md`。原始源文件为primary checkout的 `coordination/release-intake/2026-09-28-A23-legacy-successor-activation-v2-review.md`，复制须保持逐字节相同。

## 1. 新冻结绑定，不沿用旧批准

我从 literal-bound `/Volumes/Starship/MLA29` 实际Git读取新代码冻结commit `75d4d37710f7159ddaa4a6674abda1196e43b209`。它是存储commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab` 的直接子提交；提交变更仍恰好五个指定路径，所有当前文件均为常规 `100644` Git blob、working bytes等于commit blob，checkout clean。复算五个按路径排序的 `[path,mode,rawSha256]` codeDigest为 `d97017ffa1c321715b119b6a127ee305de49e705530114c8bef6f818568f29a4`，与协调者给出的新绑定一致。

| 新C1b精确路径 | Raw SHA-256 | 相对旧C1 |
| --- | --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` | 字节相同 |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9944d4b6e4c8fa819a66ab5efe739a3975009cdf7a33308a448f5e46b3e4bbff` | 字节相同 |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `0b94914e3dd333095a63e834fc09a9f3287841beea08ed1b8244c0ad112a72eb` | **仅fixture目录一行改变** |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` | 字节相同 |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` | 字节相同 |

唯一diff在新测试的“final gate enforces exactly six private regular evidence artifacts” fixture：`mkdtempSync(path.join(os.tmpdir(), ...))` 改为 `mkdtempSync(path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), ...))`。生产 `assertArtifactSet()` 本来就要求artifact目录是真实 `RUNNER_TEMP` 的子目录；测试曾在GitHub runner的系统temp建立fixture，因两者不同而正确触发 `ACTIVATION_ARTIFACT_ROOT`。本修正只对齐fixture地址，没有放宽目录、mode、链接数、真实路径或关闭的六件artifact约束。`git diff --check` exit0。

旧C1 `fae1dd93…` 的codeDigest `3e95ba6271b38a311d91c76c3e0f07329051bc0fdc415ed3eb94a1c2e929fd68` 及旧C2 `cb651023…` marker／A11／A23决定保留历史，**不能转写、复用或假装批准新C1b**。我此前独立完整审查的旧A23报告raw `b2aeb114c19a90f3973f3ceb4b4aadd2fb43776c0916ab29396f16a0ad981199` 提供四件未变代码的审查背景；本次新决定重新绑定实际五文件和新测试hash。后续仍须由真实A11／A23各自签署新C1b记录并在新marker提交中按字节引用。

## 2. 实际失败与测试证据

我只读核对 [GitHub #265](https://github.com/HUDongpin/MAIS-MVP/pull/265) 的真实状态：目前仍为draft、OPEN、BLOCKED，head仍是旧C2 `cb651023a3cd606d571aba46238a6b1b33d27a13`。精确run `36415236020` 的 `promotion-shadow-gate` 为FAILURE。其step记录显示 checkout／Node／`npm ci`／selector／successor preflight成功；旧suite107／107 PASS，新suite9／10，唯一失败为上述fixture的 `ACTIVATION_ARTIFACT_ROOT`；“Prepare frozen legacy successor execution”与“Evaluate legacy successor required check”均SKIPPED。因此该run没有新的native result，也不能被重解释成promotion PASS。最终enforcement和artifact上传也按fail-closed返回失败。

协调者在隔离MLA29对新C1b执行测试。我独立读取其完整日志字节：新suite `/private/tmp/mais-successor-activation-v2-new-tests.log` raw `fd8eb40bbc85de96da3b3c03b1504748625412a28e5685a6c21e5d9935f83910`，10／10 PASS、0 fail；旧suite `/private/tmp/mais-successor-activation-v2-old-tests.log` raw `1930c6cdbe01e1b31af65fde4b2e2b719e2c2e4c68a9dc60e5713dd1e629eade`，107／107 PASS、0 fail。测试由协调者执行；我只readback日志、复核代码／Git与差异，没有自己重跑会写临时Git fixture的测试或原生操作。本地绿灯不能替代新精确head的GitHub required-check。

## 3. 既有合同与仍需完成的门禁

四件未变代码继续使用旧C1中已独立审查的窄静态版本路由与非live证据合同：旧v2.6脚本／workflow语义、历史Manifest／Receipt／Closure／Registry和32-file原生v1.1 freeze不变；successor在干净execution checkout验证真正storage Receipt、fresh Shadow与互异replay，并比较精确候选与当前head保护路径。修后candidate仍为raw `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`、22条有限更正／1478条未变、AR保持de-reached、wholePackAccepted=false。旧#262 source head `fc6c244…`／题包 `b1038a…` 不等于这个被审查的候选。

新的代码冻结／独立审查／marker历史必须重建为新C1b链；旧C2和失败#265 run保持可审计。此时新C1b尚无自身marker、真实新PR head GitHub gate结果或global PASS。#262不合并、#201保持OPEN，既有非live和候选范围不扩大。

我再次只读查询GitHub main保护：仅要求 `validate` 与 `promotion-shadow-gate` contexts；required approving reviews=0，code-owner reviews=false，rulesets=[]。因此候选控制的workflow／verifier仍可在恶意或未经独立审查的PR中自改而自报绿色。**外部branch-protection P1仍未关闭**，不因这一行测试修复或本A23代码批准而消失。后续需单独建立并实时验证受保护的required workflow或等效独立必需审查／规则集。这里没有授权修改GitHub设置、合并或发布。

本A23结果只批准精确新C1b `75d4d377…`／codeDigest `d97017ff…` 的五文件作为下一阶段code freeze；任一字节再变须新的真实审查与digest。报告和JSON不得复制旧时间／旧C1签名来填充新C2b。
