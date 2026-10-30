**A11 最终独立审查：批准实际 T2 对应的确切 PR #306 ordinary-code required-check 准入。**

审查人：`/root/pr306_gate_a11`。审查时间：`2026-10-30T15:28:36.914Z`。范围：`exact-pr306-provider-company-policy-required-check-only`。本报告在 T2 已提交后独立撰写；审查没有遗留的 P1/P2 发现。

| 绑定对象 | 独立核对结果 |
| --- | --- |
| 基线 B | `4532f5a3e2d8c91ad387e3875925fba8a5091b86` |
| 源提交 S | `dd0c4a51d7e6cd23d734da3f7f8e292d7e426042` |
| 源树 | `ff3dd1ea83b47cc61bdb79bdaa1b43be3c7d7db5` |
| B→S 清单摘要（57 路径） | `d1785da97c30aeed268bdef4d08b6e89fcd5566d3c5e7f0008af021a4c08af56` |
| 固定中间工具提交 T1 | `6bf3c1d444c56be7fbb14fc7ee1e89521578f43c` |
| T1 树 | `4563be973471ccd14660793f02b83200103b06af` |
| S→T1 清单摘要（4 路径） | `108c6d4d9c8a6e4b866febdcb1f2628318bd04be8f23f67144da0e8ab8b73d16` |
| 最终工具提交 T2 | `935d602f44d078f6b7b879d9c04dc4100866156d` |
| T2 树 | `acb219f1f8d81788c643615f3c5184cc8d8575a4` |
| S→T2 清单摘要（6 路径） | `903b7dc8caa1182c2c00cd2e168d2b098c738aa07837c05f1e3e074a2130d515` |
| 冻结源检查原始字节 SHA-256 | `3caf16cdb3f5d9e15b21d51254c67b84f618adc7b1d16806930fd437bc615591` |
| 最终 45 项工具契约日志 SHA-256 | `55a9fd1ac2df2030dc7373958a23160ee7f44d22c6317fff861ecbb273e310dc` |

Git 证据显示 T2 的唯一父提交是固定 T1，T1 的唯一父提交是 S。审查重算了两段工具清单和源清单，并逐一核对六个工具路径以及 57 个源路径的工作区字节。工作区干净。S→T2 只包含既定四个准入工具文件，以及 source-regressions 测试和 Teen Numbers 审计；运行时源 S 未改动。工作流仍能通过对 S 的三个精确增量重建，不改写原有检查步骤或放宽其结果。

旧 T1 的 A11 JSON 与中文报告保持原样，已分别核对其原始 SHA-256 为 3412c499c4128340d04722c74fab3336d40f2a0cde702ed6e5f1828ff2ca24f2 和 be7f6dcf9ec1f1c82b53c001dbfee2006cf3c811bf7fe53c358aa131387ee86a。它们只记录当时 T1 的历史审查。本次在新目录出具新决定，绑定实际 T2；旧决定不能替代最终工具批准。

此前发现的 PR305 常量复制错误已经修复。最终代码使用 PR306，正向契约独立断言字面量 306，负向契约显式拒绝 PR305。此次追加的两项结构回归修正保留了所审既有覆盖：语音测试要求 providerAllowed 与 API key 同时满足，并要求本地职责保护、安全警示记录先于区域拒绝；Teen Numbers 审计要求精确 React 加两个第一方语音策略导入，检查区域策略的使用与不可用声音的拒绝。数值、布局断言没有修改，检查总数仍为 46,855。

源证据与工具证据分别核对。冻结 S 的 source-checks 及五项 COMMANDS 保持原字节不变；复核全部原始 stdout/stderr 摘要和 TAP 后，TypeScript 输出为空，49 项提供商、169 项认证准入、7 项家长安全边界、17 项历史激活契约均通过，无失败、取消、跳过或 TODO。

修正后的两个 TOOLING_COMMANDS 单独绑定到最终工具：source-regressions 的保留输出解析为 26/26 通过，测试名称摘要与检查器一致；其 stdout SHA-256 为 c8d847ae56fa2766a9ec6ed7135909bd8581f2a9bec94498243358322be6f7ab。Teen Numbers 的 stdout 必须精确为换行、46855 checks, 0 failures、换行，SHA-256 为 4d42c0c5f124e8f2dee7fcb1ce7e4f289a5e27446e57229d45edea9452952e9e，stderr 为空。它们不是原先在 S 上执行的冻结源检查。本审查消费并独立解析实施方保留的输出，没有把日志复核当作自己重新运行这些套件。

最终准入契约日志独立解析为 45/45 通过，无失败、取消、跳过或 TODO，耗时约 228.7 秒。契约检查固定中间提交、不能跳过 T1、确切路径分区、PR/仓库/base/head、独立身份与报告摘要、时间边界、重复或未知 JSON 字段、权限扩张以及失败输出。600 秒契约子进程、300 秒类型检查和其他 180 秒子进程上限继续保留；整体执行受 20 分钟工作流步骤限制。

检查器仍采用固定子命令参数和 process.execPath、环境变量白名单、仓库外私有且为空的规范临时目录与独占日志写入，并在执行前后保留物化及准入当前性校验。上述结论不等于操作系统级网络隔离证明。PR305 检查器、原生后继检查器、coordination/integration 历史材料和既有图示清单在 B→T2 没有变化，历史失败记录未被重新认定。

实际 E 的组装及最终 Ubuntu CI 尚待后续验证。本次没有访问真实服务商、凭据或数据库，没有执行网络、源代码修改、Git 写入、合并或部署。本决定只覆盖确切普通代码 required-check 准入，不确认原生 Shadow/currentness、整包验收、实际 OpenRouter 行为、提供商配置、Preview 或生产批准。

六项权限均为 false：historicalPromotionRevalidated、liveAllowed、previewAllowed、deployAllowed、wholePackAccepted、historicalAuthorityTransferred。
