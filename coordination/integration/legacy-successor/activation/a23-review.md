# A23 独立审查：legacy successor 全局 required-check activation C1

- 真实审查会话／身份：`/root/a23_successor_design_review`（A23）。
- 审查时间：`2026-09-28T11:18:07.000Z`。
- 限定决定：**approved-for-required-check-integration，仅批准下列精确 C1 代码字节进入后续 activation evidence／reviewable PR；不宣称 GitHub 全局 gate PASS、外部防绕过、live、merge 或 deploy。**
- 本报告的预定复制路径：`coordination/integration/legacy-successor/activation/a23-review.md`；原始作者源文件保存在 primary checkout 的 `coordination/release-intake/2026-09-28-A23-legacy-successor-activation-review.md`。复制须逐字节相同。

## 1. C1 Git 冻结与审查范围

我以 literal-bound `/Volumes/Starship/MLA28` Git 目录读取 commit `fae1dd93ff05810ef19e4623b030068aa742bb26`。它是已存储 genuine attempt009 Receipt 的 `5b1445e32f72156e1effa27ae31c3e08ec4d0fab` 的直接子提交；commit diff 恰好五个指定路径，均为常规 `100644` Git blob。当前 MLA28 HEAD 为 C1 且 checkout clean。复算路径／mode／raw-hash canonical codeDigest 为 `3e95ba6271b38a311d91c76c3e0f07329051bc0fdc415ed3eb94a1c2e929fd68`。

| 精确 C1 路径 | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9944d4b6e4c8fa819a66ab5efe739a3975009cdf7a33308a448f5e46b3e4bbff` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `b75e3bf5b49ab02c8bb69fb967d55f80fee941ae3b8c83973c1eb3ba7924c0ce` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |

C1 未改 `package.json`、public `promotion:*` CLI、旧 v2.6 checker、32-file v1.1 freeze、四个已批准 source/scoring 文件，亦未改历史 Manifest／Receipt／Closure／Registry。此次不把 activation code 的新提交解释成既有 37da checker release 的成员或修改后的原生 attempt。

## 2. 版本路由、当前 head 与历史保全

我逐行审查了新 required-check verifier、workflow、旧v2 workflow断言及负向测试。旧p242／v2.6 route 保留原步骤 `run`／`uses`／`with`／`env`／`id` 语义；新增 selector 仅在真实 GitHub event head 与 literal checkout HEAD 一致、base 为 head 祖先且 marker 首次正确新增或在 base/head 原样存在时走 successor。marker 删除、修改、重新加入、未知状态都 fail closed。先前引入的整个 job 60分钟上限已撤回。

successor route 在单个同名、不可跳过的 `promotion-shadow-gate` job 中，先验证真实 C1 Git 历史与 freeze codeDigest，再绑定真实独立A11／A23会话的 decision及逐字节report、marker同一证据提交、原 execution `ff709c0141ef8660604a20340b1c476bf2941f60` 和 storage `5b1445…` 的直接父子关系、Receipt唯一新增及当前字节。它在干净 detached execution checkout运行冻结v1.1原生命令，不把PR当前head冒充原execution。新决策须校验本次native verification与fresh Shadow输出、CLI exit、canonical/fresh semantic digest、三个互异run identity、无外部副作用、`liveAllowed=false`和后置current-head proof。输出证据必须是0700独立目录中恰好六件0600常规单链接文件；缺失上传会失败。

marker成为main历史后，未改变marker的后续PR／push仍选择successor。后续变动仅限明列的文档、独立测试和release-intake Markdown，且要重新观察当前head runtime policy／canonical audit；app、components、lib、data、public、配置、promotion代码与受保护authority变化均拒绝，需新的独立审查版本。此限制正面处理“相同拓扑不证明runtime内容字节相同”的风险。

## 3. 候选、测试与真实证据层级

C1作用于修后AR candidate raw SHA-256 `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`，即A18限定22条修正／1478条未变、全1500题未接受、non-live de-reached的后继。GitHub #262当前仍是 `fc6c24446659c54f92482cffd2de6e180bbb03c2`，其源题包raw为 `b1038a0ff8fe9b3ff8077a15dafccf18197565388fb5b6904a41e87bdeae3459`；两者不可互换。C1的批准不能将旧#262 head、旧checker或旧Shadow证据变成通过。

协调者执行了冻结C1的新activation测试与旧promotion-gate回归。我独立读取其完整终端日志字节：`/private/tmp/mais-successor-activation-new-tests-c1-final.log` raw `0d9f5f851cf2440f390f122888dbff80b6f0b43e7df21a46956369cb6ab85de1`，10／10 PASS、0 fail；`/private/tmp/mais-successor-activation-v2-regression-artifact-final.log` raw `373c0e75385a98470c14e7e82ac15a266f093f8ddb5c1517d3a1f40a2b3b9989`，107／107 PASS、0 fail。这是对协调者测试执行的独立日志readback，不是由本A23重跑测试。我另独立复算C1五件Git blob／mode／digest，审阅实际测试断言与workflow，运行三个新Node文件的`node --check`及C1范围`git diff --check`，均exit0。我没有运行昂贵的原生validate／Shadow／verify、A22 build或GitHub CI。此前执行方报告attempt009本地native `verify-receipt`真实exit0/pass，A11已独立readback；那是原生Receipt证据，不是本次GitHub required-check结果。

## 4. 剩余外部 P1 与批准边界

我于本次审查实时读取GitHub：main保护要求 `validate` 与 `promotion-shadow-gate` 两个status contexts，但required approving reviews=0、code-owner review=false、rulesets=[]。因此PR控制的workflow／verifier可以在恶意或未经独立审查的PR中被改写并自报绿色；仓库内的冻结、测试和本A23报告无法单独形成外部不可绕过的required workflow。**外部保护是仍未关闭的P1 authority blocker。** 将来需单独建立并验证受保护的required workflow或等效的独立必需审查／规则集，再重新评价实际保护效果。此代码批准不授权改变GitHub设置。

当前GitHub #262仍OPEN、head fc6c244…、mergeStateStatus BLOCKED，现有 `promotion-shadow-gate` check为 FAILURE；#201仍OPEN。C1尚无本次activation marker／A11／A23 evidence commit，也没有精确新PR head的真实GitHub required-check PASS。上述步骤完成前，不可宣称全局promotion block解除、合并#262、关闭#201、live启用、整包QA接受或部署。

本A23报告只批准精确 `fae1dd93ff05810ef19e4623b030068aa742bb26`／codeDigest `3e95ba62…` 五文件字节作为下一阶段可审查代码冻结。变更任一字节，需要新的真实独立review和digest；本报告／decision不可回写来掩盖漂移。
