# PR297 最终 A23 独立门禁审查（T2）

结论：**approved-for-exact-pr297-required-check**。范围严格为 `exact-pr297-runtime-required-check-only`。审核者 `/root/a23_pr293`，实际时间 `2026-10-27T01:45:56.159Z`。本 A23 会话未实施候选或门禁、未修改源码/Git/历史证据；已完成源码、真实提交、执行证据和 A18/A11 原字节的独立交叉核验。没有尚未修复、必须阻断这一精确接纳的发现。

本决定是对实际 S、T2 和冻结证据的 A23 贡献，允许将这些实际审查原字节纳入规定的证据提交 E，再运行精确 required check。E 尚未由本记录证明，远端 E/merge-ref/main 检查及实际合并仍须随后取得；本决定不宣称其已经成功。

## 实际绑定

| 绑定 | 独立核验值 |
| --- | --- |
| B | `b16991a6263d41642266b7b0b5f65446b11e5e1f` |
| S | `0d91ff35fd9a46a070119949ea4509fb8b46a011` |
| S tree | `f7453315bf0925d700ded5aba7e426c70ac0a3ca` |
| 完整 B→S 库存 digest | `f929d9ff7795a6d6d1cfc71bc3b60ef6f2a8f8c3d31be32c5f971784f73114ed` |
| source-inventory.json 原始 SHA-256 | `af077c19d8d1a4c795b9fb9fa049f460a584526728b3301880c782c564ee162d` |
| T2 | `89d25f1ec03757779a1e7578f4943e69bd63d786` |
| T2 tree | `bd61657fc00c063eb39365d778ed6536525d175d` |
| S→T2 库存 digest | `f7a293747ceb65eb4d1a8fc37ad2078167efa6ca03f6c787d86b590bc5548ff8` |
| source-checks 原始 SHA-256 | `4a187a9727e2bc7dfead3de555425aef0e70e6c463dfca0407914115d789b8da` |
| runtime-evidence 原始 SHA-256 | `c257505882a6f8720d6e11537ea776d2565a4cf56e993e692fe75ac9b6b56d85` |

已通过 Git 对象重新计算 B→S 全部 134 条记录的前后模式、blob ID、原始 SHA-256，与冻结 JSON 逐项相同；74 项 runtime/tooling、57 项 tests、3 项 docs 的分类仅用于描述，任何类别都没有豁免。T2 的唯一父提交是 S，恰好改变四个授权路径；其当前工作字节、提交 blob 和 100644 模式均已匹配。原 S/B 的旧 Promotion checker、workflow 路径和冻结 integration 证据保持原身份。

| T2 tooling 文件 | 原始 SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `a5a6fb17e239370cbd48846bca949f9bfb4f7345deda4b38fb3beff1958b1489` |
| `docs/pr297-reviewed-code-gate.md` | `a43300d2b63f6702299fc5b052d76a11aba4e657ca129ddcd9418c724c0d07ea` |
| `scripts/promotion-reviewed-code-pr297.mjs` | `6f9a6eb0c2ba559d86ba6af38e8df1d22f65fe9fc5b52775a27615216352ae91` |
| `scripts/promotion-reviewed-code-pr297.test.mjs` | `6f00485bf24afa9ec4b1ac11ca44d1f958669e364c877df4bcddbd251efa56d3` |

## 实现判断与两项修复

`scripts/promotion-reviewed-code-pr297.mjs:270-327` 将接纳限制为固定 B/S、实际 T 的唯一 S 父提交、四路径 tooling 清单、唯一首次新增 admission 的 E、十个此前不存在的证据路径及 E tree。PR 只接受同仓库 PR297、固定 B、head 恰为 E；main 只接受 before=B、after=M、有序父提交 [B,E] 和 E 的相同 tree。额外后继、另一 PR、移动基线、额外文件、证据改写和权限扩大均不会继承本次接受。

`expectedWorkflow` 对完整旧 S workflow 进行确定性插入。我独立重建并比较了完整结果；除新的 selector/mode/run/upload 内容外，旧 jobs、步骤、action SHA、permissions、安装命令、条件及旧入口保持原字节。新 marker 存在但校验失败时没有回退放行。

严格 JSON parser、闭合 admission/review 字段、固定 checks/runtime 原始哈希、完整源库存重算、普通 tracked blob/模式/链接检查，以及执行前后 materialization 和 HEAD 检查均保留。source-checks 与 runtime-evidence 是已逐字审查并固定哈希的输入；本 gate 对其哈希的核验不是新的 PG、HTTP 或历史 Shadow 执行。

预审发现的时间字段问题已修复：实际 T2 要求字符串、有限日期、标准 UTC ISO 往返相等及非未来时间。我用实际 `validateReview` 独立确认合法 ISO 通过，数字、数组、仅日期、无效日期归一化、不可解析日期和未来时间六类均拒绝。

随后确认的 Ubuntu TypeScript 堆预算问题也已修复。types argv 显式固定 `--max-old-space-size=6144`，对应既有 CI 的受控预算；环境仍剥离外部 NODE_OPTIONS 和生产数据库/provider/Git 注入变量。实际 27 秒 types 记录 exit 0、stdout/stderr 为空，明确写明 executionCommit 为 T1；其 TS/TSX 输入与 S 相同，T2 对比 T1 仅改变该参数、两个冻结摘要、对应测试断言和说明，不能把这次执行冒称为 T2 上另一次运行。T1 未获得本 A23 决定，也没有被本记录覆盖。

递归 TAP 消费各层编号结果、计划、诊断、标题 digest 和 root stats；嵌套 t.test 的父节点可以保持 type=test。额外七种恶意/损坏 TAP 输入已独立被拒绝，环境 allowlist 也已进行独立注入探针。最终 T2 的完整 25 项 gate-contract 日志已由实际 parser 重算为 25/25、零失败/取消/跳过；原始 SHA-256 为 `cd841db791afbe4e95f1d3131fcc516d052a37cf3ac875ef352d18674232d0c5`。时间修复 1 项及 heap/env 2 项是单独诊断覆盖，不被加算成新的总体测试数量。

## 执行证据消费

本 A23 会话没有重新执行整套测试、PG 服务、负载、浏览器或构建。已独立核对原输出哈希并用实际 checker 重算 source checks：565/565 critical units（43 明确文件）、10/10 schema、34/34 MVP，均零失败/取消/跳过；types 和 strict zhHans 分别满足空输出/exit 0 与 3511/3512、non-pack critical 0、无 pack regression 的契约。

runtime 包的 38 份原产物均已独立检查文件字节数和原始 SHA-256；18 份嵌入 JSON 的解析对象与 canonical digest 均与原件一致。记录保留执行者与消费者的区别，不以角色文件数量冒充独立身份。

- 最新原生运行使用 PostgreSQL **16.15**，14 个 store/route 测试全部通过且无 skip，原始 TAP 已独立解析。其实际提交 d48e3610394b9ebb97e3b3b318eac529aed3653d 与 S 的完整树相同。14 例包含真实提交、独立读回与 trigger rollback；部分 route 夹具保留 auth mocks，故不能称为 14 个真实认证/纯数据库用例。
- 刷新过的 course 5 例和 application 11 例使用 Node spec reporter，已按该真实格式独立检查通过标记与零失败/skip 统计，不把它们伪称为本 gate 重跑的 TAP。它们与独立 real-auth HTTP 证据一起消费。
- HTTP/build 实际源是 9b924d2559195201d6a01cde72d2423aaac9b93e，与 a6ed2c30a8258e5eb1b0051fcd697e65eec3e78a 同 tree。到 S 恰有 11 个固定测试路径差异；我独立重算并逐项比较 11,102 个非测试 Git mode/type/blob，相同。完整 S tree 与 HTTP build tree **不同**。
- 我另核对了 build manifest 的全部 3,578 个非测试源哈希与当前未变源；冻结 build 副本中 3,577 个同字节。唯一例外 tsconfig.next.json 的源/构建哈希分别为 1f39ca3df18b90924fdf68bea41304033b29cf0de5311dccb15b23cd2dee1970 / 7e8f0cb1e7f385b26bb0f333dca19f71919f8794131442220a83aca12f945ce7，只增添已披露的 .tmp/http-next/types/**/*.ts include 并重排 include，其余属性相同。实际 BUILD_ID 为 ao_TTrVRo7--I2U_Xow3t。
- 两个 worker 各一条一般连接的 2/20 人本地合成混合运行，结果/回执/构建身份/原产物哈希相互匹配。20 人结果记录 80 flows、40 跨 worker 重放、flow p95 1763.546 ms、max 1915.350 ms、最多两条应用连接，durable readback、一次性重放和该 2000 ms 门槛通过。这是消费既有执行结果，不能推断远程网络、冷启动、20 人同时 practice、真实课堂或生产性能。

## A18 与 A11 原字节交叉核验

已读取两份实际最终报告，对照其原始 SHA-256，并使用 T2 的真实 `validateReview` 验证角色、实际身份、S/T、两类库存、checks/runtime、report、时间和全部 false permissions。

| 角色 | 实际身份 | JSON SHA-256 | 报告 SHA-256 |
| --- | --- | --- | --- |
| A18 | `/root/a18_pr297` | `4671d7fcb7f4a807754d48ee4baae3687dd0a98e3558bea4dc95ebd0e5da3b1a` | `914d134a17f1906180fa2643ae4efb3c9806f3505399fb652e51ef830a5ba370` |
| A11 | `/root/root_dirty_disposition` | `d349711458af7f96760caff04639f3802230e1e9939bcdf4c94a5fbfcdbed47a` | `773765beb64ee9a245be0e6a53e7842f77e90bb3e17c82cfccec9ecae3c1374c` |

A18 只作 approved-for-integration-review：P1 一课原英文/繁体四条及新增简体两条文案，加 topic/GeometryExplorer 依赖；当前 lessons 原始哈希 d41b63a1cb2d04fbfc8c15bec036641a9cd9c91d7d5ee823f79610ef30bf3918 已由 A23 独立核对，旧 2b42 身份没有被误用。A18 的截图/AX实际查看属于该独立会话的工作，A23核对的是其内容边界与证据绑定。A11 对最终组合、测试增量、真实运行记录和新 gate 给出 approved-for-exact-pr297-required-check；两者都未声明未来 E/CI/main 或部署已经成功。

## 必须保留的限制与后续条件

旧 ffad 源上的 legacy/scoped 直接保存预算仍为 budget-not-met：mean 439.873 ms、serial max 460.262 ms、burst tail 8772.207 ms，对应 90/100/2000 ms。其 fixture 与原冻结 workload 不同，也未重新测成 S 的绿色；authority HTTP 的另一种负载成功不能清除这一失败或证明严格速度改善/回归。旧 lesson-all 仍在缺 parentalConsent 的注册夹具失败，12 pass＋1 fixture fail 不能改算全通过。S4 原型及延期功能不由此自动接纳或丢弃。

E 必须是 T2 的唯一直接子阶段，首次新增规定十份证据并原样收录各 reviewer 字节。最终原生 check 的实际完整检出、事件绑定、前后 materialization 和全部命令仍应在 E/Ubuntu job 执行。此审核没有将长 macOS checkout 上的替代字节核对称为完整 CLI check 成功；本地尚未存在的 E 不能预先获一个虚构检查结果。PR head E 与普通 CI synthetic merge SHA 仍须分别核对，最终 required checks 通过后才能进行用户另已授权的精确合并。

六项权限全部 false：historicalPromotionRevalidated、liveAllowed、previewAllowed、deployAllowed、wholePackAccepted、historicalAuthorityTransferred。没有生成/刷新 Shadow Receipt，没有改写历史 Manifest/Receipt/Closure/Registry，没有把当前运行时代码接纳转换为历史内容批准、整包接受、Preview、部署或线上验收。所有审查输出只写入 /private/tmp，未修改实现、历史、Git、凭据或生产环境。
