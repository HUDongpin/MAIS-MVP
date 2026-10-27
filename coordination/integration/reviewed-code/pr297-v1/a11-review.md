# PR297 最终 A11 独立审查（T2）

结论：**approved-for-exact-pr297-required-check**。本次意见只覆盖 `exact-pr297-runtime-required-check-only`。审核者为 `/root/root_dirty_disposition`（A11），实际审核时间 `2026-10-27T01:41:01.267Z`。未发现需要阻断此精确门禁的未解决问题。

| 绑定 | 经独立核对的值 |
| --- | --- |
| B | `b16991a6263d41642266b7b0b5f65446b11e5e1f` |
| S | `0d91ff35fd9a46a070119949ea4509fb8b46a011` |
| S tree | `f7453315bf0925d700ded5aba7e426c70ac0a3ca` |
| S inventory digest | `f929d9ff7795a6d6d1cfc71bc3b60ef6f2a8f8c3d31be32c5f971784f73114ed` |
| T2 | `89d25f1ec03757779a1e7578f4943e69bd63d786` |
| T2 tree | `bd61657fc00c063eb39365d778ed6536525d175d` |
| T2 inventory digest | `f7a293747ceb65eb4d1a8fc37ad2078167efa6ca03f6c787d86b590bc5548ff8` |
| source-checks raw SHA-256 | `4a187a9727e2bc7dfead3de555425aef0e70e6c463dfca0407914115d789b8da` |
| runtime-evidence raw SHA-256 | `c257505882a6f8720d6e11537ea776d2565a4cf56e993e692fe75ac9b6b56d85` |

A11对实际T2源码、测试和workflow逐项只读审查，独立用Git blob/mode/raw SHA-256重新构造134项B→S和4项S→T2清单，并核对固定三JSON。T2唯一父提交为S；四路径仅新checker、新门禁测试、说明文档及promotion-shadow工作流的限定插入。旧门禁及历史证据未借此失效或重写。

门禁拒绝错误PR/仓库/fork/ref/base/head，要求精确S→T→E形状、E仅新增指定10文件，main事件只能为有序[B,E]双父且树等于E；禁止E后空提交重用。workflow新marker存在或为链接时会进入严格selector，错误直接失败，不静默回退。严格JSON、独立身份、报告原始哈希、permissions、工作树/历史/链接检查及前后完整物化检查均在实际代码中保留。

实际最终T2完整门禁日志为25/25、0失败、0跳过、0取消，已用实际parser独立解析。时间戳1项定向测试验证未来、非字符串、非规范ISO和无效日期拒绝；heap/env2项定向测试验证固定6GB参数与不继承NODE_OPTIONS。它们是另存诊断证据，不把25+1+2伪称新增独立总体覆盖。

冻结source checks的43文件单测565/565、schema10/10、MVP34/34均零失败/跳过/取消；stdout/stderr与resultNamesDigest已核验。MVP实际通过direct Node命令执行，未冒用npm wrapper。strict zhHans为3511/3512、non-pack critical0且pack无回归。types采用固定`--max-old-space-size=6144`，与现有Ubuntu内存预算一致，仍拒绝继承NODE_OPTIONS；真实types执行27秒、exit0、stdout/stderr空。记录明确executionCommit为T1，S到该执行提交没有TS/TSX输入变化，不能将它误称T2上另一次执行。

原生PG16.15的真实store/route14/14零skip（包括commit、独立readback与触发器rollback）、fresh PG course5/application11，以及HTTP和浏览器证据由负责会话执行，A11独立消费并核对原始回执/产物哈希。两个HTTP worker各1条一般连接；20人混合运行80flows/40重放，完整flow p951763.546ms、max1915.350ms，持久化、一次性重放及2秒门槛通过，最大连接数2。该结果是本地合成指定混合场景，不是远程网络、冷启动、20人同时practice或生产证明。

运行代码证明与完整树身份保持分开：构建源9b924d与a6同tree，a6→S精确11测试变化，11102非测试Git mode/type/blob和3578源manifest哈希一致。冻结build副本3577文件同字节；唯一tsconfig.next.json是Next补入`.tmp/http-next/types/**/*.ts`及include重排，原构建脚本已显式排除该派生配置，双hash和差异保留。P1简体截图/AX和teacher8浏览器例均按此未变runtime关系绑定；旧en/zh-Hant/drag证据继续属于旧01f，不挪作新执行。

两项未通过限制必须保留：旧ffad上的legacy/scoped直接保存mean439.873ms、max460.262ms、burst8772.207ms仍未达90/100/2000ms；其新fixture与原冻结fixture不同，未重测为S绿色，也不据此宣称严格速度改善/新增退化。旧lesson-all仍在缺parentalConsent的注册夹具失败，原12pass+1fixturefail未改计全通过；相关P1另有限定浏览器证明。S4原型及延期旧基线功能也不由此门禁接纳或丢弃。

六项权限均为false：historicalPromotionRevalidated、liveAllowed、previewAllowed、deployAllowed、wholePackAccepted、historicalAuthorityTransferred。此记录不是历史Promotion重验、整包/内容推广、Preview、部署或线上验收。实际E及其远端required checks、main合并结果尚属后续证据，未在本记录中声明通过。

A11只读取实际实现与既有执行证据，未修改实现/历史/Git，未运行新的负载，也未使用外部模型。T1未被覆盖为已批准结果；其保管bundle和原测试日志保留。此次只写本Markdown及配套严格schema JSON。

关键本地核验记录的原始SHA-256：

- `/private/tmp/pr297-work/gate-contract.stdout` — `456aed29e325231e68168ab023df8dd70879a22ece7e030f0a2d372591e93ccd`
- `/private/tmp/pr297-work/gate-timestamp-fix.stdout` — `67d09c65306ff7b7b8f04ae1610a1e59677e21d660c5eac2f94ae16dbe1b9939`
- `/private/tmp/pr297-work/gate-fixed-heap.stdout` — `dfc46f20a52fc773092e4978836a53c02e40201fdb2cd04da3e6e0c59f2eb43c`
- `/private/tmp/pr297-work/final-gate-contract.stdout` — `cd841db791afbe4e95f1d3131fcc516d052a37cf3ac875ef352d18674232d0c5`
- `/private/tmp/pr297-work/types-6144.json` — `cf8de71890f487a595289f4b6975e16327386b639e00fa1dd756b415a5fe901d`
- `/private/tmp/pr297-work/types-6144.stdout` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `/private/tmp/pr297-work/types-6144.stderr` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `/private/tmp/pr297-work/tooling-T1-preserved.bundle` — `ea30f1f11ce464cfa1a279d43044be38897c54259214d4eacdc00db67f67647b`
- `/private/tmp/pr297-work/evidence-candidate/source-inventory.json` — `af077c19d8d1a4c795b9fb9fa049f460a584526728b3301880c782c564ee162d`
- `/private/tmp/pr297-work/evidence-candidate/source-checks.json` — `4a187a9727e2bc7dfead3de555425aef0e70e6c463dfca0407914115d789b8da`
- `/private/tmp/pr297-work/evidence-candidate/runtime-evidence.json` — `c257505882a6f8720d6e11537ea776d2565a4cf56e993e692fe75ac9b6b56d85`
