# PR #306 最终 T2 的 A23 独立审核记录

审核者：/root/pr306_gate_a23（A23）。审核时间：2026-10-30T15:28:44.461Z。

结论：批准下列实际不可变 T2 的精确普通代码 required-check 准入，结果为 approved-for-exact-pr306-required-check，范围为 exact-pr306-provider-company-policy-required-check-only。未发现剩余 P1/P2 问题。本记录由独立 A23 审核者在实际 T2 提交后重新撰写；原 T1 报告仅作为历史记录保留，未被复用为最终 T2 或未来 E 的批准。

| 绑定对象 | 独立核验值 |
| --- | --- |
| 基线 B | 4532f5a3e2d8c91ad387e3875925fba8a5091b86 |
| 源码 S | dd0c4a51d7e6cd23d734da3f7f8e292d7e426042 |
| S 树 | ff3dd1ea83b47cc61bdb79bdaa1b43be3c7d7db5 |
| B→S 57 路径清单 SHA-256 | d1785da97c30aeed268bdef4d08b6e89fcd5566d3c5e7f0008af021a4c08af56 |
| 初始工具 T1 | 6bf3c1d444c56be7fbb14fc7ee1e89521578f43c |
| T1 树 | 4563be973471ccd14660793f02b83200103b06af |
| S→T1 四路径清单 SHA-256 | 108c6d4d9c8a6e4b866febdcb1f2628318bd04be8f23f67144da0e8ab8b73d16 |
| 最终工具 T2 | 935d602f44d078f6b7b879d9c04dc4100866156d |
| T2 树 | acb219f1f8d81788c643615f3c5184cc8d8575a4 |
| S→T2 六路径清单 SHA-256 | 903b7dc8caa1182c2c00cd2e168d2b098c738aa07837c05f1e3e074a2130d515 |
| clean-S 检查原始 JSON SHA-256 | 3caf16cdb3f5d9e15b21d51254c67b84f618adc7b1d16806930fd437bc615591 |

我从实际 Git 对象重新读取父链、树、文件模式、blob 身份与原始字节 SHA-256，并独立重算以上清单。T2 的唯一父提交为 T1，T1 的唯一父提交为 S；审核时 HEAD 为 T2，工作树干净。S→T2 的六条路径恰为：

- .github/workflows/promotion-shadow.yml
- components/visualizations/signature/audit-teennumbers.mjs
- docs/pr306-reviewed-code-gate.md
- scripts/promotion-reviewed-code-pr306.mjs
- scripts/promotion-reviewed-code-pr306.test.mjs
- tests/e2e/reported-bug-source-regressions.test.ts

全部 57 条冻结源码路径在 T2 中仍与 S 原始字节相同。T1→T2 仅修改五条既定工具/测试路径；工作流自 T1 起未变，仍可从 S 通过既定选择器、可接受模式和条件检查/上传步骤精确重建。

两处新增测试修正与现有行为一致，未放宽数值或安全要求。语音源码断言要求 providerAllowed 与已配置密钥同时成立，并增加安全告警先于区域拒绝、区域许可先于密钥就绪拒绝的顺序要求；既有本地预检、告警及合成前拒绝断言保留。Teen Numbers 审计只替换两条过时的 React-only 导入断言，现要求精确的 React、useAiProviderRegion、permittedBrowserSpeechVoice 三条导入和区域策略调用/无可用许可声音时退出；所有数值、布局断言及 46,855 检查总数保持不变。

检查器固定 T1 的父提交、树及清单，要求最终 T2 直接继承 T1并符合完整六路径分区，要求 E 直接继承实际审核的 T2 且只新增七条证据路径。两位审核者身份、源码/工具/检查/报告哈希及审核时间继续严格绑定；旧 T1 决定的 toolingCommit 不匹配 T2，不能批准 T2。精确 PR #306、仓库、base/head、父链、严格 JSON、失败即拒绝、环境白名单、私有新输出目录及执行前后物化/当前提交复核均保留。T2 中尚无未来 E 的七条记录，本文不声称 E 已通过。

证据按实际执行阶段区分。clean-S 检查原始 JSON 仍为 3caf16cdb3f5d9e15b21d51254c67b84f618adc7b1d16806930fd437bc615591，所有五组 stdout/stderr 原始哈希匹配；重新解析得 TypeScript 输出为空，provider-policy 49、auth-admission 169、parent-safe-boundary 7、historical-activation 17 个测试全部通过且名称摘要一致。上述旧证据未被改写为两处工具修正的执行证明。

新增 TOOLING_COMMANDS 单独绑定最终工具检查：保留的 source-regressions 结果为 26/26 通过，名称摘要 e400541262f5b1ddbfadce6a47f86ee328117583455fbf3db9a7e24753f4db08，stdout SHA-256 c8d847ae56fa2766a9ec6ed7135909bd8581f2a9bec94498243358322be6f7ab；Teen Numbers 审计输出精确为 46855 checks, 0 failures，stdout SHA-256 4d42c0c5f124e8f2dee7fcb1ce7e4f289a5e27446e57229d45edea9452952e9e，两者 stderr 均为空。父代理执行的最终 45 项门禁日志原始 SHA-256 为 55a9fd1ac2df2030dc7373958a23160ee7f44d22c6317fff861ecbb273e310dc；A23 独立解析为 45/45 通过，无失败、取消、跳过或 TODO，名称摘要 fcf6ac7452db8f0ae0e8ad752e7407c5ffc167cbed0239da9d9dca03b9d094f8，日志耗时 228724.019583 毫秒。A23 核验并消费这些保留日志，未再次运行整个套件，也未把合成提交/审核夹具当作实际批准。

原 T1 审核 JSON 的 SHA-256 仍为 4f99802a6e9752f2e7ca4771e886c5b285998055d5e608bbe3c892d1d4b34b08，Markdown 仍为 de298547074e3a52065d04138779f6a3c229ed96ee3b9d884a83b3fefc55f800。二者保持原样。本次新记录使用独立路径和新的实际 T2 绑定。从 B 到 T2，PR305 检查器/admission/reviews、原生 PR304/activation 证据、历史图形清单及历史失败记录未改变，也未转移历史 Shadow 权限。

本决定只支持精确普通代码 required-check 准入。historicalPromotionRevalidated、liveAllowed、previewAllowed、deployAllowed、wholePackAccepted、historicalAuthorityTransferred 六项全部为 false。E 与精确最终头提交上的真实 CI 尚待验证；本审核不构成原生 Shadow/receipt/currentness、内容终审、整包验收、真实供应商或环境验收、合并或部署批准。本次未进行网络、真实供应商、数据库、凭据或仓库写入操作；仅撰写新的 A23 决定及本中文报告。
